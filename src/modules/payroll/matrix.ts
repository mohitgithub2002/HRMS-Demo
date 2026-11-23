/**
 * The pay matrix in force on a date (PR-01). Each organisation keeps its own dated matrices; until one is stored the
 * 7th CPC table is used. Not "server-only": the seed and the payroll computation read it.
 */
import { fromISODate, todayIST, type ISODate } from "@/core/dates";
import type { DbLike } from "@/core/tenancy/scoped";
import { seventhCpcMatrix, type MatrixLevels } from "./matrix-7cpc";

export async function matrixOn(date: ISODate, db: DbLike) {
  const row = await db.payMatrix.findFirst({ where: { effectiveFrom: { lte: fromISODate(date) } }, orderBy: { effectiveFrom: "desc" } });
  return row ? { id: row.id, name: row.name, effectiveFrom: row.effectiveFrom, levels: row.levels as unknown as MatrixLevels } : null;
}

export async function matrixLevelsOn(date: ISODate, db: DbLike): Promise<MatrixLevels> {
  return (await matrixOn(date, db))?.levels ?? seventhCpcMatrix();
}

/** The matrix the screens show today (employee records, recruitment). */
export const matrixToday = (db: DbLike) => matrixLevelsOn(todayIST(), db);
