import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { approveDirectly } from "@/core/approvals/engine";
import { collectSubmitted } from "@/core/approvals/direct";
import { getActor, type Actor } from "@/core/auth/session";
import { getPlatformActor, type PlatformActor } from "@/core/auth/platform-session";
import { AppError, RateLimitError, badRequest, forbidden, moduleOff, unauthorized } from "@/core/errors";
import { lookup } from "@/core/i18n/types";
import { getLocale, getSimple } from "@/core/i18n/server";
import { hit, LIMITS, type Limit } from "@/core/rate-limit";
import { getRequestMeta, type RequestMeta } from "@/core/request-meta";
import type { ModuleKey } from "@/core/tenancy/modules";
import { makeT, type TKey } from "@/i18n";
import { en } from "@/i18n/en";

/**
 * Every REST endpoint goes through here: the session (and with it the organisation), a same-origin check on writes,
 * rate limits per organisation and session, the organisation's modules, JSON validation and translated errors.
 */
type Params = Record<string, string>;

interface Ctx<P extends Params> {
  req: NextRequest;
  params: P;
  meta: RequestMeta;
  body<T>(schema: ZodType<T>): Promise<T>;
  query<T>(schema: ZodType<T>): T;
}

type RouteContext<P> = { params: Promise<P> };

function checkOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw forbidden("errors.badOrigin");
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw forbidden("errors.badOrigin");
  }
}

function limit(key: string, rule: Limit) {
  const result = hit(key, rule);
  if (!result.ok) throw new RateLimitError(result.retryAfterS);
}

function zodToAppError(error: ZodError): AppError {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_";
    if (fields[path]) continue;
    if (lookup(en, issue.message)) fields[path] = issue.message;
    else if (issue.code === "invalid_type" || (issue.code === "too_small" && "minimum" in issue && issue.minimum === 1)) fields[path] = "validation.required";
    else if (issue.code === "too_small") fields[path] = "validation.tooShort";
    else if (issue.code === "too_big") fields[path] = "validation.tooLong";
    else fields[path] = "validation.invalid";
  }
  return badRequest("errors.validation", fields);
}

export async function toErrorResponse(error: unknown) {
  const t = makeT(await getLocale().catch(() => "en" as const), await getSimple().catch(() => false));
  const appError = error instanceof ZodError ? zodToAppError(error) : error instanceof AppError ? error : null;
  if (!appError) {
    console.error("[api] unexpected error", error);
    return NextResponse.json({ ok: false, error: { code: "server_error", message: t("errors.generic") } }, { status: 500 });
  }
  const fields = appError.fields
    ? Object.fromEntries(Object.entries(appError.fields).map(([k, v]) => [k, lookup(en, v) ? t(v as TKey, appError.vars) : v]))
    : undefined;
  return NextResponse.json(
    { ok: false, error: { code: appError.code, message: t(appError.key, appError.vars), fields } },
    { status: appError.status, headers: appError instanceof RateLimitError ? { "Retry-After": String(appError.retryAfterS) } : undefined },
  );
}

function build<P extends Params>(req: NextRequest, params: P, meta: RequestMeta): Ctx<P> {
  return {
    req,
    params,
    meta,
    async body<T>(schema: ZodType<T>) {
      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        throw badRequest();
      }
      return schema.parse(raw);
    },
    query<T>(schema: ZodType<T>) {
      return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    },
  };
}

function noStore(res: Response) {
  if (!res.headers.has("cache-control")) res.headers.set("cache-control", "no-store");
  return res;
}

function respond(result: unknown, applied = false) {
  return noStore(result instanceof Response ? result : NextResponse.json({ ok: true, data: result ?? null, ...(applied ? { applied: true } : {}) }));
}

/** An organisation endpoint. `module`: refused when the organisation has not switched that module on. */
export function apiRoute<P extends Params = Params>(handler: (ctx: Ctx<P> & { actor: Actor }) => Promise<unknown>, opts: { module?: ModuleKey } = {}) {
  return async (req: NextRequest, context: RouteContext<P>) => {
    try {
      checkOrigin(req);
      const actor = await getActor();
      if (!actor) throw unauthorized();
      if (opts.module && !actor.tenant.modules.includes(opts.module)) throw moduleOff();
      limit(`tenant:${actor.tenantId}`, LIMITS.tenant);
      limit(`session:${actor.sessionId}`, LIMITS.session);
      const params = (await context?.params) ?? ({} as P);
      const meta = await getRequestMeta();
      const { result, taskIds } = await collectSubmitted(() => handler({ ...build(req, params, meta), actor }));
      // The simple way of working: what this person entered and may decide themselves counts at once.
      const applied = await approveDirectly(actor, taskIds);
      return respond(result, applied > 0);
    } catch (e) {
      return noStore(await toErrorResponse(e));
    }
  };
}

/** Sign-in and other endpoints open without a session. */
export function publicRoute<P extends Params = Params>(handler: (ctx: Ctx<P> & { actor: Actor | null }) => Promise<unknown>) {
  return async (req: NextRequest, context: RouteContext<P>) => {
    try {
      checkOrigin(req);
      const meta = await getRequestMeta();
      if (req.method !== "GET" && req.method !== "HEAD") limit(`public:${meta.ip ?? "unknown"}`, LIMITS.publicWrite);
      const actor = await getActor().catch(() => null);
      const params = (await context?.params) ?? ({} as P);
      return respond(await handler({ ...build(req, params, meta), actor }));
    } catch (e) {
      return noStore(await toErrorResponse(e));
    }
  };
}

/** A platform console endpoint: needs a verified platform session; `owner` = only the platform owner. */
export function platformRoute<P extends Params = Params>(handler: (ctx: Ctx<P> & { pa: PlatformActor }) => Promise<unknown>, opts: { owner?: boolean } = {}) {
  return async (req: NextRequest, context: RouteContext<P>) => {
    try {
      checkOrigin(req);
      const pa = await getPlatformActor();
      if (!pa) throw unauthorized();
      if (opts.owner && pa.role !== "OWNER") throw forbidden();
      limit(`platform:${pa.sessionId}`, LIMITS.session);
      const params = (await context?.params) ?? ({} as P);
      const meta = await getRequestMeta();
      return respond(await handler({ ...build(req, params, meta), pa }));
    } catch (e) {
      return noStore(await toErrorResponse(e));
    }
  };
}
