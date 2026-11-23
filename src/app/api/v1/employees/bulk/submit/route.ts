import { apiRoute } from "@/core/api/route";
import { formFile } from "@/core/api/files";
import { badRequest } from "@/core/errors";
import { submitBulk } from "@/modules/employees/bulk";

export const POST = apiRoute(async ({ actor, req }) => {
  const { file } = await formFile(req);
  if (!file) throw badRequest("errors.validation", { file: "validation.required" });
  if (file.size > 10 * 1024 * 1024) throw badRequest("employees.errors.fileTooBig");
  return submitBulk(actor, Buffer.from(await file.arrayBuffer()), file.name);
});
