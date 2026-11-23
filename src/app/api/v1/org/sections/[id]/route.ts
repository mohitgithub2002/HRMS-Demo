import { apiRoute } from "@/core/api/route";
import { saveSection, sectionSchema } from "@/modules/org/service";

export const PUT = apiRoute<{ id: string }>(async ({ actor, params, body }) => saveSection(actor, params.id, await body(sectionSchema)));
