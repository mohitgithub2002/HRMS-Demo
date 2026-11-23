/**
 * Work an organisation needs once a day (people whose last day has passed leave the rolls, reminders go out …), started
 * from a page view. The day it last ran is kept in the database, not in the process: on a serverless host every cold
 * start is a new process, and remembering it in memory would run the jobs on nearly every visit. The jobs run one after
 * another (never all at once against a small connection pool), and the day is written only when they all succeeded,
 * so a failure is tried again on the next visit. Two visits at the same moment may both run them; every daily job is
 * safe to run twice.
 */
import { todayIST } from "@/core/dates";
import type { TenantDb } from "@/core/tenancy/scoped";
import type { Prisma } from "@/generated/prisma/client";

export async function onceADay(db: TenantDb, name: string, jobs: (() => Promise<unknown>)[], today = todayIST()): Promise<boolean> {
  const key = `jobs.${name}`;
  const row = await db.setting.findFirst({ where: { key }, select: { id: true, value: true } });
  if ((row?.value as { day?: string } | null)?.day === today) return false;
  for (const job of jobs) await job();
  const value = { day: today, at: new Date().toISOString() } as Prisma.InputJsonValue;
  if (row) await db.setting.update({ where: { id: row.id }, data: { value } });
  else await db.setting.create({ data: { key, value } as Prisma.SettingUncheckedCreateInput }).catch(() => undefined); // another visit wrote it first
  return true;
}
