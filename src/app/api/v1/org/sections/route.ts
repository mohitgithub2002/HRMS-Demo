import { apiRoute } from "@/core/api/route";
import { saveSection, sectionSchema } from "@/modules/org/service";

export const POST = apiRoute(async ({ actor, body }) => saveSection(actor, null, await body(sectionSchema)));
