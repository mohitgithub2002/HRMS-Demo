import { apiRoute } from "@/core/api/route";
import { notFound } from "@/core/errors";
import { rerunSupplementary } from "@/modules/payroll/arrears";
import { runPayroll } from "@/modules/payroll/run";

/** "Work out again" for a draft — the regular bill from the records, a supplementary bill from what it pays. */
export const POST = apiRoute<{ id: string }>(async ({ actor, params }) => {
  const run = await actor.db.payrollRun.findFirst({ where: { id: params.id } });
  if (!run) throw notFound();
  const saved = run.kind === "SUPPLEMENTARY" ? await rerunSupplementary(actor, run.id) : await runPayroll(actor, { payGroup: run.payGroup, month: run.month });
  return { id: saved.id, version: saved.version };
});
