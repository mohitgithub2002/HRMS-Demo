import { apiRoute } from "@/core/api/route";
import { fileResponse } from "@/core/api/files";
import { downloadFile } from "@/core/files/outgoing";

/** Some files are built on request (a PDF needs a headless Chrome, slow to start on a fresh Vercel instance). */
export const maxDuration = 60;

export const GET = apiRoute<{ id: string }>(async ({ actor, params }) => {
  const { buffer, file } = await downloadFile(actor, params.id);
  return fileResponse(buffer, { fileName: file.fileName, mimeType: file.mimeType });
});
