import type { Prisma } from "@/generated/prisma/client";
import { fromISODate } from "@/core/dates";
import { seventhCpcMatrix } from "@/modules/payroll/matrix-7cpc";
import type { PackInstaller } from "./types";

/** The 7th CPC pay matrix from 1 January 2016 — employee records need it for pay level and cell (PR-01). */
export const matrixInstaller: PackInstaller = {
  key: "pay-matrix",
  async install(tx) {
    await tx.payMatrix.create({
      data: { name: "7th CPC pay matrix", effectiveFrom: fromISODate("2016-01-01"), levels: seventhCpcMatrix() as unknown as Prisma.InputJsonValue } as Prisma.PayMatrixUncheckedCreateInput,
    });
  },
};
