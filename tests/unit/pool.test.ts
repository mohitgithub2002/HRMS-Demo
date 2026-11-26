import { describe, expect, it } from "vitest";
import { wrapQuery } from "@/core/tenancy/pool";

const TENANT = "cmwscitlj00013p7dsrzvxyxb";
const setTenant = { text: "SELECT set_config('app.tenant_id', $1, true)", values: [TENANT], rowMode: "array" };
const read = { text: 'SELECT "t0"."id" FROM "public"."Employee" AS "t0" WHERE "t0"."tenantId" = $1', values: [TENANT], rowMode: "array" };
const write = { text: 'UPDATE "public"."Employee" SET "phone" = $1 WHERE "id" = $2', values: ["9", "e1"], rowMode: "array" };
const sql = (text: string) => ({ text, values: [], rowMode: "array" });

/** A fake connection: records what reaches the wire; `fail` makes a statement fail. */
function wire(fail: (text: string) => Error | null = () => null) {
  const sent: string[] = [];
  const original = async (config: unknown) => {
    const text = typeof config === "string" ? config : (config as { text: string }).text;
    sent.push(text);
    const e = fail(text);
    if (e) throw e;
    if (text.startsWith("BEGIN;")) return [{ command: "BEGIN", rowCount: 0 }, { command: "SELECT", rowCount: 1 }];
    return { command: text.split(" ")[0], rowCount: 1 };
  };
  return { sent, original };
}

describe("the connection pool's transactions", () => {
  it("sends BEGIN together with the organisation setting, as one message", async () => {
    const w = wire();
    const q = wrapQuery(w.original);
    await q(sql("BEGIN"));
    await q(setTenant);
    await q(read);
    await q(sql("COMMIT"));
    expect(w.sent).toEqual([`BEGIN; SELECT set_config('app.tenant_id', '${TENANT}', true)`, read.text, "COMMIT"]);
  });

  it("sends BEGIN on its own before anything else, and never writes an unsafe value into the text", async () => {
    const w = wire();
    const q = wrapQuery(w.original);
    await q(sql("BEGIN"));
    await q({ ...setTenant, values: ["x', true); DROP TABLE x; --"] });
    await q(sql("COMMIT"));
    expect(w.sent[0]).toBe("BEGIN");
    expect(w.sent[1]).toBe(setTenant.text);
    const w2 = wire();
    const q2 = wrapQuery(w2.original);
    await q2(sql("BEGIN"));
    await q2(write);
    await q2(sql("COMMIT"));
    expect(w2.sent).toEqual(["BEGIN", write.text, "COMMIT"]);
  });

  it("does not wait for the COMMIT of a transaction that only read, but does for one that wrote", async () => {
    const reads = wire();
    const q = wrapQuery(reads.original);
    await q(sql("BEGIN"));
    await q(setTenant);
    await q(read);
    const committed = await q(sql("COMMIT"));
    expect(committed).toMatchObject({ command: "COMMIT", rowCount: 0 });
    expect(reads.sent.at(-1)).toBe("COMMIT");

    let commitFailed = false;
    const writes = wire((t) => (t === "COMMIT" ? new Error("deferred constraint") : null));
    const q2 = wrapQuery(writes.original, { onCommitError: () => (commitFailed = true) });
    await q2(sql("BEGIN"));
    await q2(setTenant);
    await q2(write);
    await expect(q2(sql("COMMIT"))).rejects.toThrow("deferred constraint");
    expect(commitFailed).toBe(false);
  });

  it("sends nothing for a transaction in which nothing ran", async () => {
    const w = wire();
    const q = wrapQuery(w.original);
    await q(sql("BEGIN"));
    await q(sql("ROLLBACK"));
    expect(w.sent).toEqual([]);
  });

  it("pipelined: does not wait for the BEGIN, and reports its error on the statement behind it", async () => {
    const w = wire();
    const q = wrapQuery(w.original, { pipelined: true });
    await q(sql("BEGIN"));
    const set = q(setTenant);
    expect(await set).toMatchObject({ rowCount: 1 });
    await q(read);
    expect(w.sent.slice(0, 2)).toEqual([`BEGIN; SELECT set_config('app.tenant_id', '${TENANT}', true)`, read.text]);
    await q(sql("COMMIT"));

    const broken = wire((t) => (t.startsWith("BEGIN;") ? new Error("setting refused") : t === read.text ? new Error("current transaction is aborted") : null));
    const q2 = wrapQuery(broken.original, { pipelined: true });
    await q2(sql("BEGIN"));
    await q2(setTenant);
    await expect(q2(read)).rejects.toThrow("setting refused");
    await q2(sql("ROLLBACK"));
    expect(broken.sent.at(-1)).toBe("ROLLBACK");
  });

  it("starts every hand-out outside a transaction", async () => {
    const w = wire();
    const q = wrapQuery(w.original);
    await q(sql("BEGIN"));
    q.reset();
    await q(read);
    expect(w.sent).toEqual([read.text]);
  });

  it("passes the callback form (pool.query) through untouched", async () => {
    const w = wire();
    const q = wrapQuery(w.original);
    const cb = () => undefined;
    await q("SELECT 1", [], cb);
    expect(w.sent).toEqual(["SELECT 1"]);
  });
});
