/**
 * Test factory with the original's API, for organisations: makeBoard() creates a fresh organisation (its id is what the
 * ported tests call boardId); everything else is made inside it through its own tenant client.
 */
import type { Prisma } from "@/generated/prisma/client";
import type { LoginType, Permission } from "@/generated/prisma/enums";
import type { Actor } from "@/core/auth/session";
import { acrossTenants } from "@/core/tenancy/platform";
import { rawDb } from "@/core/tenancy/raw";
import { tenantDb } from "@/core/tenancy/scoped";

let counter = 0;
const uid = () => `${Date.now().toString(36)}${(counter++).toString(36)}`.toUpperCase();

export const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

export async function makeBoard(opts: { modules?: string[]; simple?: boolean } = {}) {
  const t = await rawDb().tenant.create({
    data: { code: `T${uid()}`.slice(0, 12), name: "Test Cantonment Board", nameHi: "परीक्षण छावनी परिषद", status: "ACTIVE", modules: opts.modules ?? ["recruitment", "attendance", "leave", "payroll", "loans", "statutory", "pension", "reports"] },
  });
  if (opts.simple) await tenantDb(t.id).setting.create({ data: { key: "workflow", value: { mode: "simple" } } as Prisma.SettingUncheckedCreateInput });
  return t;
}

export async function makeSection(boardId: string, code = `S${uid()}`) {
  return tenantDb(boardId).section.create({ data: { code: code.slice(0, 10), name: `Section ${code}`, nameHi: `अनुभाग ${code}` } as Prisma.SectionUncheckedCreateInput });
}

export async function makePost(boardId: string, level = "6") {
  const code = `P${uid()}`.slice(0, 10);
  return tenantDb(boardId).post.create({ data: { code, name: `Post ${code}`, nameHi: `पद ${code}`, payLevel: level, group: "C" } as Prisma.PostUncheckedCreateInput });
}

export async function makeEmployee(boardId: string, opts: { sectionId?: string; postId?: string; dob?: string; status?: "ACTIVE" | "RETIRED"; gender?: string; type?: "PERMANENT_NPS" | "PERMANENT_OPS" | "CONTRACT" | "DAILY_WAGE" } = {}) {
  const sectionId = opts.sectionId ?? (await makeSection(boardId)).id;
  const postId = opts.postId ?? (await makePost(boardId)).id;
  return tenantDb(boardId).employee.create({
    data: {
      employeeCode: `E${uid()}`,
      type: opts.type ?? "PERMANENT_NPS",
      status: opts.status ?? "ACTIVE",
      firstName: "Test",
      lastName: uid(),
      gender: opts.gender ?? "M",
      dateOfBirth: new Date(`${opts.dob ?? "1990-05-05"}T00:00:00Z`),
      dateOfJoining: new Date("2015-01-01T00:00:00Z"),
      dateOfRetirement: new Date("2050-05-31T00:00:00Z"),
      sectionId,
      postId,
    } as Prisma.EmployeeUncheckedCreateInput,
  });
}

export async function makeUser(boardId: string, loginType: LoginType, permissions: Permission[] = [], employeeId: string | null = null) {
  const id = uid();
  return tenantDb(boardId).user.create({
    data: { loginType, loginId: `U${id}`, name: `User ${id}`, mobile: `9${String(Date.now() + counter++).slice(-9)}`, permissions, employeeId, mustChangePassword: false } as Prisma.UserUncheckedCreateInput,
  });
}

/** Builds the Actor a service would receive for this user (in the way of working the organisation has set). */
export async function actorFor(userId: string): Promise<Actor> {
  const u = await acrossTenants((tx) => tx.user.findUniqueOrThrow({ where: { id: userId }, include: { employee: true } }));
  const t = await rawDb().tenant.findUniqueOrThrow({ where: { id: u.tenantId } });
  const db = tenantDb(t.id);
  const workflow = await db.setting.findFirst({ where: { key: "workflow" } });
  const onRolls = Boolean(u.employee) && ["ACTIVE", "SUSPENDED"].includes(u.employee!.status);
  return {
    tenantId: t.id,
    tenant: { id: t.id, code: t.code, name: t.name, nameHi: t.nameHi, shortName: t.shortName, status: t.status, modules: t.modules, accentColor: null, setupDone: false },
    db,
    userId: u.id,
    sessionId: "test",
    loginId: u.loginId,
    name: u.name,
    loginType: u.loginType,
    permissions: u.permissions,
    modules: t.modules,
    simple: (workflow?.value as { mode?: string } | null)?.mode === "simple",
    employeeId: u.employeeId,
    sectionId: u.employee?.sectionId ?? null,
    isEmployee: onRolls,
    isPensioner: false,
    pensionerId: null,
    language: "en",
    mustChangePassword: false,
    ip: "127.0.0.1",
    userAgent: "vitest",
  };
}
