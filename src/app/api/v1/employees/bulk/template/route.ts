import { apiRoute } from "@/core/api/route";
import { fileResponse } from "@/core/api/files";
import { mimeOf } from "@/core/storage";
import { buildTemplate } from "@/modules/employees/bulk";

export const GET = apiRoute(async ({ actor }) =>
  fileResponse(await buildTemplate(actor), { fileName: `${actor.tenant.code}-employee-upload-template.xlsx`, mimeType: mimeOf("xlsx") }),
);
