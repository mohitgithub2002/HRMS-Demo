import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import { approveDirectly, decide, listInbox } from "@/core/approvals";
import { collectSubmitted } from "@/core/approvals/direct";
import { createEmployee } from "@/modules/employees/service";
import { hasDb, makeTenant, wipe } from "../support/db";
import { makeActor } from "../support/actor";

const input = (sectionId: string, postId: string, first: string, pan: string, bank = `9${pan.slice(5, 9)}0000${pan.charCodeAt(2)}`) => ({
  personal: { firstName: first, lastName: "Test", gender: "F", dateOfBirth: "1994-05-12", isDisabled: false },
  job: { type: "PERMANENT_NPS", sectionId, postId, dateOfJoining: "2026-11-02", payLevel: "2", payCell: 1 },
  ids: { pan, bankAccount: bank, ifsc: "SBIN0001234" },
});

describe.skipIf(!hasDb)("employee records", () => {
  let tenantId: string;
  let sectionId: string;
  let postId: string;

  beforeAll(async () => {
    await wipe();
    const t = await makeTenant("EMP");
    tenantId = t.id;
    const a = await makeActor(tenantId, { loginId: "SETUP", loginType: "ADMIN", permissions: ["APPROVER"] });
    sectionId = (await a.db.section.create({ data: { code: "ACC", name: "Accounts" } as Prisma.SectionUncheckedCreateInput })).id;
    postId = (await a.db.post.create({ data: { code: "LDC", name: "Clerk", payLevel: "2", group: "C" } as Prisma.PostUncheckedCreateInput })).id;
  });
  afterAll(wipe);

  it("simple way: the Admin's new employee counts at once — ID issued and own login made", async () => {
    const admin = await makeActor(tenantId, { loginId: "ADM", loginType: "ADMIN", permissions: ["APPROVER", "PAY_BILL_SIGNER"], simple: true });
    const { result, taskIds } = await collectSubmitted(() => createEmployee(admin, input(sectionId, postId, "Kiran", "BBBPB1234K")));
    expect(taskIds.length).toBe(1);
    expect(await approveDirectly(admin, taskIds)).toBe(1);
    const e = await admin.db.employee.findUniqueOrThrow({ where: { id: result.id } });
    expect(e.status).toBe("ACTIVE");
    expect(e.employeeCode).toMatch(/^EMP/);
    const login = await admin.db.user.findFirst({ where: { employeeId: e.id } });
    expect(login?.loginId).toBe(e.employeeCode);
    expect(login?.loginType).toBe("EMPLOYEE");
  });

  it("two steps: HR's entry waits as a draft for a Checker, who cannot be the maker", async () => {
    const hr = await makeActor(tenantId, { loginId: "HR", loginType: "HR_ACCOUNTS", permissions: ["HR"] });
    const checker = await makeActor(tenantId, { loginId: "CHK", loginType: "HR_ACCOUNTS", permissions: ["CHECKER"] });
    const { result, taskIds } = await collectSubmitted(() => createEmployee(hr, input(sectionId, postId, "Asha", "CCCPC1234L")));
    expect(await approveDirectly(hr, taskIds)).toBe(0);
    expect((await hr.db.employee.findUniqueOrThrow({ where: { id: result.id } })).status).toBe("DRAFT");
    await expect(decide(hr, taskIds[0], "APPROVE")).rejects.toThrow();
    expect((await listInbox(checker)).map((t) => t.id)).toContain(taskIds[0]);
    await decide(checker, taskIds[0], "APPROVE");
    expect((await hr.db.employee.findUniqueOrThrow({ where: { id: result.id } })).status).toBe("ACTIVE");
  });

  it("refuses the same PAN twice in one organisation", async () => {
    const admin = await makeActor(tenantId, { loginId: "ADM2", loginType: "ADMIN", permissions: ["APPROVER"], simple: true });
    await expect(createEmployee(admin, input(sectionId, postId, "Dup", "BBBPB1234K"))).rejects.toThrow();
  });
});
