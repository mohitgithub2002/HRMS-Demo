import { apiRoute } from "@/core/api/route";
import { forbidden } from "@/core/errors";
import { askConfig, canConfigureAsk } from "@/modules/ask/config";

/** Which AI service answers and where each service's key comes from — never a key. */
export const GET = apiRoute(async ({ actor }) => {
  if (!canConfigureAsk(actor)) throw forbidden();
  return askConfig(actor.db);
});
