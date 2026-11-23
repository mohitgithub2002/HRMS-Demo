/**
 * Seed: the first platform owner, and — outside production — two demo organisations created through exactly the
 * same provisioning path as the console, each with its own demo logins. Safe to run twice.
 *
 *   npm run db:seed
 */
import "dotenv/config";
import type { Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/core/password";
import { disconnectRaw, rawDb } from "@/core/tenancy/raw";
import { tenantDb } from "@/core/tenancy/scoped";
import { provisionTenant } from "@/platform/provision";
import { DEMO_PASSWORD, DEMO_TENANTS } from "./seed-demo";
import { DEMO_STAFF, SMC_STAFF, seedEmployees } from "./seed-employees";

async function seedOwner() {
  const email = (process.env.PLATFORM_OWNER_EMAIL ?? "owner@kosh.local").toLowerCase();
  const password = process.env.PLATFORM_OWNER_PASSWORD ?? DEMO_PASSWORD;
  const existing = await rawDb().platformUser.findUnique({ where: { email } });
  if (existing) return existing;
  const isProd = process.env.APP_ENV === "production";
  return rawDb().platformUser.create({
    data: { email, name: "Platform Owner", role: "OWNER", passwordHash: await hashPassword(password), mustChangePassword: isProd },
  });
}

async function seedTenant(demo: (typeof DEMO_TENANTS)[number], ownerId: string) {
  const existing = await rawDb().tenant.findUnique({ where: { code: demo.code } });
  if (existing) return { tenant: existing, created: false };
  const { tenant } = await provisionTenant({ ...demo.org, code: demo.code, adminPassword: DEMO_PASSWORD }, { userId: ownerId, name: "Seed" });
  const db = tenantDb(tenant.id);
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  await db.$transaction(async (tx) => {
    for (const u of demo.users) {
      await tx.user.create({ data: { ...u, passwordHash, mustChangePassword: false } as Prisma.UserUncheckedCreateInput });
    }
  });
  return { tenant, created: true };
}

async function main() {
  const owner = await seedOwner();
  console.log(`Platform owner: ${owner.email}`);
  if (process.env.APP_ENV === "production") return;
  for (const demo of DEMO_TENANTS) {
    const { tenant, created } = await seedTenant(demo, owner.id);
    const staff = demo.code === "DEMO" ? DEMO_STAFF : SMC_STAFF;
    const people = await seedEmployees(tenantDb(tenant.id), tenant.id, tenant.code, staff, demo.code === "DEMO" ? 1 : 2, DEMO_PASSWORD);
    console.log(`${created ? "Created" : "Kept"} ${tenant.name} (${tenant.code})${people ? ` with ${people} employees` : ""}`);
  }
  console.log(`Demo password for every demo login: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(disconnectRaw);
