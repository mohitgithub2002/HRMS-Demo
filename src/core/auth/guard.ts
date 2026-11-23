import "server-only";
import { notFound, redirect } from "next/navigation";
import type { ModuleKey } from "@/core/tenancy/modules";
import { can, type Action, type Fn } from "./access";
import { getActor, type Actor } from "./session";

/** The signed-in person, or off to the sign-in screen. */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.mustChangePassword) redirect("/welcome/password");
  return actor;
}

/** A screen that needs a right (and, optionally, a module): anyone without it gets "not found", not a hint. */
export async function requireAccess(fn: Fn, action: Action = "view", module?: ModuleKey): Promise<Actor> {
  const actor = await requireActor();
  if (module && !actor.tenant.modules.includes(module)) notFound();
  if (!can(actor, fn, action)) notFound();
  return actor;
}

export async function requireWhere(check: (a: Actor) => boolean): Promise<Actor> {
  const actor = await requireActor();
  if (!check(actor)) notFound();
  return actor;
}

/**
 * For pages: a service's "not found" (another organisation's id, a removed record) or "forbidden" becomes the plain
 * not-found page instead of the error screen — and tells nobody whether the record exists elsewhere.
 */
export async function orNotFound<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 404 || status === 403) notFound();
    throw e;
  }
}
