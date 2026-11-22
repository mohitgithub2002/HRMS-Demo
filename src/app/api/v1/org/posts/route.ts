import { apiRoute } from "@/core/api/route";
import { postSchema, savePost } from "@/modules/org/service";

export const POST = apiRoute(async ({ actor, body }) => savePost(actor, null, await body(postSchema)));
