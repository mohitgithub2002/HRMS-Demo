import { apiRoute } from "@/core/api/route";
import { formFile } from "@/core/api/files";
import { badRequest } from "@/core/errors";
import { addProof } from "@/modules/statutory/tax";

/** ST-03: a proof attached to my declaration (PDF or photo, up to 5 MB). */
export const POST = apiRoute(async ({ actor, req }) => {
  const { file } = await formFile(req);
  if (!file) throw badRequest("errors.validation", { file: "validation.required" });
  return addProof(actor, file);
});
