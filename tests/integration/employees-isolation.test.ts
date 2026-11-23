/**
 * Module 4 across organisations: the same people and the same PAN in two organisations stay two separate records;
 * nothing of one is reachable from the other — records, documents, files, encrypted numbers or duplicate checks.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import { blindIndex, decrypt, seal } from "@/core/crypto";
import { fromISODate } from "@/core/dates";
import { loadFile, saveFile } from "@/core/storage";
import { tenantDb } from "@/core/tenancy/scoped";
import { hasDb, makeTenant, wipe } from "../support/db";

async function setUp(tenantId: string) {
  const db = tenantDb(tenantId);
  const s = await db.section.create({ data: { code: "ADM", name: "Administration" } as Prisma.SectionUncheckedCreateInput });
  const p = await db.post.create({ data: { code: "LDC", name: "Clerk", payLevel: "2", group: "C" } as Prisma.PostUncheckedCreateInput });
  const pan = seal(tenantId, "pan", "ABCPE1234F");
  const e = await db.employee.create({
    data: { employeeCode: "E1", type: "PERMANENT_NPS", firstName: "Same", lastName: "Person", gender: "F", dateOfBirth: fromISODate("1990-01-01"), dateOfJoining: fromISODate("2015-01-01"), sectionId: s.id, postId: p.id, panEnc: pan.enc, panHash: pan.hash, panLast4: pan.last4 } as Prisma.EmployeeUncheckedCreateInput,
  });
  const file = await saveFile(db, { name: "order.pdf", buffer: Buffer.from("%PDF-1.4 demo"), contentType: "application/pdf" });
  return { db, e, file, pan };
}

describe.skipIf(!hasDb)("employees across organisations", () => {
  let a: Awaited<ReturnType<typeof setUp>>;
  let b: Awaited<ReturnType<typeof setUp>>;
  let ta: string;
  let tb: string;

  beforeAll(async () => {
    await wipe();
    ta = (await makeTenant("EA")).id;
    tb = (await makeTenant("EB")).id;
    a = await setUp(ta);
    b = await setUp(tb);
  });
  afterAll(wipe);

  it("the same employee code and PAN live in both, as separate records", async () => {
    expect(await a.db.employee.count()).toBe(1);
    expect(await b.db.employee.count()).toBe(1);
    expect(await a.db.employee.findUnique({ where: { id: b.e.id } })).toBeNull();
  });

  it("encrypted numbers and duplicate hashes are per organisation", () => {
    expect(a.pan.hash).not.toBe(b.pan.hash);
    expect(blindIndex(ta, "pan", "ABCPE1234F")).toBe(a.pan.hash);
    expect(decrypt(ta, a.pan.enc)).toBe("ABCPE1234F");
    // B's ciphertext cannot be opened with A's key.
    expect(() => decrypt(ta, b.pan.enc)).toThrow();
  });

  it("a file id from another organisation is not found", async () => {
    expect((await loadFile(a.db, a.file.id)).buffer.toString()).toContain("%PDF");
    await expect(loadFile(a.db, b.file.id)).rejects.toThrow();
  });

  it("child rows (family, history, service book) follow the same wall", async () => {
    await b.db.familyMember.create({ data: { employeeId: b.e.id, name: "Spouse", relation: "SPOUSE" } as Prisma.FamilyMemberUncheckedCreateInput });
    expect(await a.db.familyMember.count()).toBe(0);
    // Writing a child row for the other organisation's employee is refused.
    await expect(a.db.familyMember.create({ data: { employeeId: b.e.id, name: "x", relation: "SON" } as Prisma.FamilyMemberUncheckedCreateInput })).rejects.toThrow();
  });
});
