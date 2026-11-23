import { platformRoute } from "@/core/api/route";
import { addTeamMember, teamMemberSchema } from "@/platform/team";

export const POST = platformRoute(async ({ pa, body }) => addTeamMember(pa, await body(teamMemberSchema)), { owner: true });
