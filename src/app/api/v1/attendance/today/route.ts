import { apiRoute } from "@/core/api/route";
import { todayBoard } from "@/modules/attendance/service";

export const GET = apiRoute(async ({ actor }) => todayBoard(actor));
