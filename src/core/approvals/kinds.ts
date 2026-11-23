import "server-only";
// Each module registers its approval kinds by being imported here, one line per module as it is built.
import "@/modules/employees/approvals";
import "@/modules/attendance/approvals";
import "@/modules/leave/approvals";
import "@/modules/recruitment/approvals";
import "@/core/files/approvals";
import "@/modules/payroll/approvals";
import "@/modules/statutory/approvals";
import "@/modules/pension/approvals";
