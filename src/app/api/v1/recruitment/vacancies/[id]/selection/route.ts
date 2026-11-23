import { apiRoute } from "@/core/api/route";
import { submitSelection } from "@/modules/recruitment/service";

export const POST = apiRoute<{ id: string }>(async ({ actor, params }) => {
  const task = await submitSelection(actor, params.id);
  return { taskId: task.id };
});
