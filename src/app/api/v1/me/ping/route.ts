import { apiRoute } from "@/core/api/route";
import { touchSession } from "@/core/auth/session";

/** "Stay signed in": restarts the session's idle clock. */
export const POST = apiRoute(async ({ actor }) => {
  await touchSession(actor.sessionId);
  return null;
});
