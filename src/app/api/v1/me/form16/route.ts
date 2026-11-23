import { apiRoute } from "@/core/api/route";
import { myForm16 } from "@/modules/statutory/form16";

/** ST-07: my published Form 16s. */
export const GET = apiRoute(async ({ actor }) => myForm16(actor));
