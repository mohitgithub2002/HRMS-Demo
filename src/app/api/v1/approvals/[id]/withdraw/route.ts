import { cancelTask } from "@/core/approvals";
import { apiRoute } from "@/core/api/route";

export const POST = apiRoute<{ id: string }>(async ({ actor, params }) => {
  await cancelTask(actor, params.id);
  return null;
});
