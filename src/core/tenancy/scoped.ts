/**
 * tenantDb(tenantId) — the only database client business code ever holds.
 *
 * Two independent walls keep one organisation's rows away from another's (docs/ARCHITECTURE.md):
 *
 *  1. Row-level security in PostgreSQL. Every query of this client runs inside a transaction that first sets
 *     app.tenant_id; the policy on every tenant table only lets those rows through, and new rows take their
 *     tenantId from the same setting.
 *  2. The client itself adds `tenantId` to every where and every data — so even a misconfigured database role
 *     (a superuser, BYPASSRLS) would still not leak.
 *
 * Shape: the client behaves like a PrismaClient for model calls ("db.employee.findMany(...)") and for
 * `db.$transaction(async (tx) => …)`. The array form of $transaction is not offered (each call already runs in its
 * own transaction); raw SQL is only available inside a $transaction, where the setting is in force.
 *
 * Not "server-only": the seed and the provisioning scripts run it too.
 */
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { rawDb } from "./raw";

/** Tables of the platform itself: no tenantId, never reachable through a tenant client. */
export const PLATFORM_MODELS = new Set<string>(["Tenant", "PlatformUser", "PlatformSession", "PlatformAudit", "Session", "OtpChallenge"]);

/** Typed as the full client so services read naturally; at run time it is the guarded proxy below. */
export type TenantDb = PrismaClient;
export type Tx = Prisma.TransactionClient;
/** Services accept either the client or an open transaction, so they can be composed. */
export type DbLike = TenantDb | Tx;

type AnyArgs = Record<string, unknown> & { where?: Record<string, unknown>; data?: unknown; create?: unknown };

function withTenant(data: unknown, tenantId: string): unknown {
  if (Array.isArray(data)) return data.map((d) => ({ ...(d as object), tenantId }));
  return { ...(data as object), tenantId };
}

/** Adds the tenant to an operation's arguments (wall 2). Exported for the unit test. */
export function scopeArgs(operation: string, rawArgs: unknown, tenantId: string): AnyArgs {
  const args: AnyArgs = { ...((rawArgs as AnyArgs) ?? {}) };
  switch (operation) {
    case "create":
    case "createMany":
    case "createManyAndReturn":
      args.data = withTenant(args.data, tenantId);
      return args;
    case "upsert":
      args.where = { ...(args.where ?? {}), tenantId };
      args.create = withTenant(args.create, tenantId);
      return args;
    default:
      // find*, count, aggregate, groupBy, update*, delete* — every one filters by tenant. A data block on an
      // update never moves a row to another tenant: the where already pins it and RLS refuses the new value.
      args.where = { ...(args.where ?? {}), tenantId };
      if ((operation === "update" || operation === "updateMany" || operation === "updateManyAndReturn") && args.data && typeof args.data === "object") {
        const d = { ...(args.data as Record<string, unknown>) };
        delete d.tenantId;
        args.data = d;
      }
      return args;
  }
}

const setTenantSql = (tenantId: string) => Prisma.sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`;

function build(tenantId: string): TenantDb {
  const base = rawDb();
  // Wall 2: the tenant in every where / data. Also refuses the platform's own tables.
  const inner = base.$extends({
    name: "kosh-tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (PLATFORM_MODELS.has(model)) throw new Error(`${model} is a platform table; use the platform client`);
          return query(scopeArgs(operation, args, tenantId) as typeof args);
        },
      },
    },
  });
  // Wall 1: every top-level call runs in a transaction that sets app.tenant_id for RLS.
  const outer = inner.$extends({
    name: "kosh-tenant-rls",
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await inner.$transaction([inner.$executeRaw(setTenantSql(tenantId)), query(args)]);
          return result;
        },
      },
    },
  });

  async function transaction<T>(fn: (tx: Tx) => Promise<T>, options?: { timeout?: number; maxWait?: number; isolationLevel?: Prisma.TransactionIsolationLevel }) {
    if (typeof fn !== "function") throw new Error("Use db.$transaction(async (tx) => …) — the array form is not available on a tenant client");
    return inner.$transaction(async (tx) => {
      await tx.$executeRaw(setTenantSql(tenantId));
      return fn(tx as unknown as Tx);
    }, { timeout: 20_000, maxWait: 10_000, ...options });
  }

  const refuseRaw = () => {
    throw new Error("Raw SQL on a tenant client runs only inside db.$transaction, where app.tenant_id is set");
  };

  return new Proxy(outer as unknown as object, {
    get(target, prop, receiver) {
      if (prop === "$transaction") return transaction;
      if (prop === "$queryRaw" || prop === "$executeRaw" || prop === "$queryRawUnsafe" || prop === "$executeRawUnsafe") return refuseRaw;
      if (prop === "$extends" || prop === "$disconnect" || prop === "$connect") return undefined;
      if (prop === "tenantId") return tenantId;
      return Reflect.get(target, prop, receiver);
    },
  }) as TenantDb;
}

const clients = new Map<string, TenantDb>();
const MAX_CACHED = 500;

/**
 * The client for one organisation. Cached per tenant (building one is cheap, but there is no need to repeat it).
 * This is the single place where a tenant could later be routed to its own database (silo model).
 */
export function tenantDb(tenantId: string): TenantDb {
  if (!tenantId) throw new Error("tenantDb needs a tenant id");
  let c = clients.get(tenantId);
  if (!c) {
    if (clients.size >= MAX_CACHED) clients.delete(clients.keys().next().value as string);
    c = build(tenantId);
    clients.set(tenantId, c);
  }
  return c;
}

/** The tenant id a client or transaction was built for — only for clients from tenantDb(). */
export function tenantOf(db: DbLike): string {
  const id = (db as unknown as { tenantId?: string }).tenantId;
  if (!id) throw new Error("Not a tenant client");
  return id;
}
