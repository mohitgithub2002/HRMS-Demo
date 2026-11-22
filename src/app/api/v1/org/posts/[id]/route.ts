import { apiRoute } from "@/core/api/route";
import { postSchema, savePost } from "@/modules/org/service";

export const PUT = apiRoute<{ id: string }>(async ({ actor, params, body }) => savePost(actor, params.id, await body(postSchema)));
