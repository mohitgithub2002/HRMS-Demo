/**
 * The connection pool, tuned for the way Kosh talks to PostgreSQL.
 *
 * Every tenant query runs in its own short transaction that first sets app.tenant_id (scoped.ts), which on its own
 * costs four round trips: BEGIN, set_config, the query, COMMIT. Against a hosted database each round trip is a real
 * network trip, so this pool removes some of them without changing what runs on the server:
 *
 *  1. Always: BEGIN is held back and sent together with the statement that follows it when that statement is
 *     `SELECT set_config('app.…', $1, true)` — one ordinary simple-protocol message "BEGIN; SELECT set_config(…)". The
 *     value is an id (checked against a strict pattern before it is written into the text); anything else falls back
 *     to a separate BEGIN. The setting stays transaction-local, so this is as safe behind PgBouncer / the Neon pooler
 *     as before. A read is three round trips.
 *  2. Only with DB_PIPELINE=1 (off by default — on Vercel with Neon's pooler connections were left waiting and the
 *     pool ran dry, "timeout exceeded when trying to connect"): pg's pipeline mode sends the statement right behind
 *     the fused BEGIN without waiting, and a transaction that only ran SELECTs is committed without waiting for the
 *     answer (the connection's next user queues behind that COMMIT). A read is then one round trip. If the BEGIN
 *     failed, the statement after it fails too and the BEGIN's error is reported. Writes always wait for COMMIT.
 *
 * Not "server-only": the seed and scripts use it too.
 */
import pg from "pg";

const SET_SETTING = /^SELECT set_config\('(app\.[a-z_]+)', \$1, true\)$/;
const SAFE_VALUE = /^[A-Za-z0-9_.:-]{1,128}$/;
const READ_ONLY = /^SELECT\s/i;

interface TxState {
  /** BEGIN was asked for but not yet sent. */
  pendingBegin: boolean;
  /** Inside a transaction (BEGIN asked for, no COMMIT / ROLLBACK yet). */
  open: boolean;
  /** Every statement of the transaction so far was a SELECT. */
  readOnly: boolean;
  /** Pipelined: the answer to "BEGIN; SELECT set_config(…)" still on its way — resolves to its error, or null. */
  setup: Promise<unknown> | null;
}

type QueryConfig = { text?: unknown; values?: unknown[]; name?: unknown; rowMode?: unknown; types?: unknown };
type QueryFn = (...args: unknown[]) => Promise<unknown>;
type WrappedQuery = QueryFn & { reset: () => void };

const WRAPPED = Symbol.for("kosh.pool.wrapped");

const done = (command: string) => ({ command, rowCount: 0, oid: 0, rows: [], fields: [] });

export interface WrapOptions {
  /**
   * The connection runs in pg's pipeline mode: the fused BEGIN is not waited for, nor a read-only COMMIT (see the top
   * of this file). Without it every statement waits for its answer.
   */
  pipelined?: boolean;
  onCommitError?: (e: unknown) => void;
}

/** What the pool does to each connection's query method (exported for the unit test). */
export function wrapQuery(original: QueryFn, options: WrapOptions = {}): WrappedQuery {
  const onCommitError = options.onCommitError ?? (() => undefined);
  const state: TxState = { pendingBegin: false, open: false, readOnly: true, setup: null };
  const query = async (...args: unknown[]) => {
    const [config] = args;
    // Only the object form without a callback is what the Prisma adapter sends; everything else passes untouched.
    if (args.some((a) => typeof a === "function") || typeof config !== "object" || config === null) return original(...args);
    const q = config as QueryConfig;
    const text = typeof q.text === "string" ? q.text.trim() : "";

    if (text === "BEGIN" && !state.open) {
      state.pendingBegin = true;
      state.open = true;
      state.readOnly = true;
      return done("BEGIN");
    }

    if (state.pendingBegin) {
      state.pendingBegin = false;
      if (text === "COMMIT" || text === "ROLLBACK") {
        // Nothing ran: there is no transaction to end.
        state.open = false;
        return done(text);
      }
      const m = SET_SETTING.exec(text);
      const value = q.values?.[0];
      if (m && typeof value === "string" && SAFE_VALUE.test(value) && q.values?.length === 1 && !q.name) {
        const sent = original({ text: `BEGIN; SELECT set_config('${m[1]}', '${value}', true)`, rowMode: q.rowMode, types: q.types }).then((res) => (Array.isArray(res) ? res[res.length - 1] : res));
        if (!options.pipelined) return sent;
        // Pipeline mode: the next statement goes on the wire right behind this one, and both answers come back in
        // one round trip. If the setting failed, the transaction is aborted, so the next statement fails too — and
        // reports this error instead (below).
        state.setup = sent.then(
          () => null,
          (e: unknown) => e ?? new Error("BEGIN failed"),
        );
        return { command: "SELECT", rowCount: 1, oid: 0, rows: [[""]], fields: [] };
      }
      await original({ text: "BEGIN" });
    }

    if (state.open) {
      if (text === "COMMIT") {
        state.open = false;
        const setup = state.setup;
        state.setup = null;
        if (state.readOnly && options.pipelined) {
          original({ text: "COMMIT" }).catch(onCommitError);
          return done("COMMIT");
        }
        if (setup) return afterSetup(setup, original(...args));
      } else if (text === "ROLLBACK") {
        state.open = false;
        state.setup = null;
      } else {
        if (!READ_ONLY.test(text)) state.readOnly = false;
        if (state.setup) return afterSetup(state.setup, original(...args));
      }
    }
    return original(...args);
  };
  /** A connection handed out afresh starts outside any transaction. */
  const reset = () => {
    state.pendingBegin = false;
    state.open = false;
    state.readOnly = true;
    state.setup = null;
  };
  return Object.assign(query, { reset });
}

/** A statement sent behind a pipelined BEGIN: if the BEGIN failed, its error is the one that counts. */
async function afterSetup(setup: Promise<unknown>, statement: Promise<unknown>) {
  let result: unknown;
  try {
    result = await statement;
  } catch (e) {
    throw (await setup) ?? e;
  }
  const failed = await setup;
  if (failed) throw failed;
  return result;
}

function wrap(client: pg.PoolClient): pg.PoolClient {
  const c = client as pg.PoolClient & { [WRAPPED]?: WrappedQuery };
  if (!c[WRAPPED]) {
    const original = client.query.bind(client) as unknown as QueryFn;
    c[WRAPPED] = wrapQuery(original, { pipelined: c.pipeline === true, onCommitError: (e) => console.warn("[kosh] a read-only COMMIT failed:", (e as Error)?.message) });
    (client as unknown as { query: QueryFn }).query = c[WRAPPED];
  } else {
    c[WRAPPED].reset();
  }
  return client;
}

type ConnectCallback = (err: Error | undefined, client: pg.PoolClient | undefined, release: (release?: unknown) => void) => void;

/** pg.Pool whose connections send fewer round trips per transaction (see above). */
export class KoshPool extends pg.Pool {
  // pg.Pool.connect has a promise form (used by the Prisma adapter for transactions) and a callback form (used by
  // pool.query for single statements).
  override connect(): Promise<pg.PoolClient>;
  override connect(callback: ConnectCallback): void;
  override connect(callback?: ConnectCallback): Promise<pg.PoolClient> | void {
    if (callback) {
      return super.connect((err, client, release) => callback(err, client ? wrap(client) : client, release));
    }
    return super.connect().then(wrap);
  }
}
