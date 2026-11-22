import { platformRoute } from "@/core/api/route";

/** "Stay signed in": reading the session already restarts its idle clock. */
export const POST = platformRoute(async () => null);
