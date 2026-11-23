import { apiRoute } from "@/core/api/route";
import { fileResponse } from "@/core/api/files";
import { forbidden } from "@/core/errors";
import { mimeOf } from "@/core/storage";
import { punchTemplate } from "@/modules/attendance/formats";
import { canEnterMuster } from "@/modules/attendance/service";

export const GET = apiRoute(async ({ actor }) => {
  if (!canEnterMuster(actor)) throw forbidden();
  return fileResponse(await punchTemplate(), { fileName: "punch-template.xlsx", mimeType: mimeOf("xlsx") });
});
