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
