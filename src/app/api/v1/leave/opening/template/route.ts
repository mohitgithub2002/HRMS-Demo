import { apiRoute } from "@/core/api/route";
import { fileResponse } from "@/core/api/files";
import { mimeOf } from "@/core/storage";
import { openingTemplate } from "@/modules/leave/opening";

export const GET = apiRoute(async ({ actor }) => fileResponse(await openingTemplate(actor), { fileName: "DCB-opening-leave-balances.xlsx", mimeType: mimeOf("xlsx") }));
