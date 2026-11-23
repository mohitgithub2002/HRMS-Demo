import { apiRoute } from "@/core/api/route";
import { myPayslips } from "@/modules/payroll/payslips";

export const GET = apiRoute(async ({ actor }) => myPayslips(actor));
