import { apiRoute } from "@/core/api/route";
import { fileResponse } from "@/core/api/files";
import { mimeOf } from "@/core/storage";
import { applicantTemplate } from "@/modules/recruitment/service";

export const GET = apiRoute(async ({ actor }) => fileResponse(await applicantTemplate(actor), { fileName: "DCB-applicants-template.xlsx", mimeType: mimeOf("xlsx") }));
