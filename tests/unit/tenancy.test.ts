import { describe, expect, it } from "vitest";
import { normaliseModules } from "@/core/tenancy/modules";
import { scopeArgs } from "@/core/tenancy/scoped";
import { can, fnEnabled, type Principal } from "@/core/auth/access";

describe("the scoped client's own wall (without RLS)", () => {
  const T = "tenant-a";
  it("adds the tenant to every where", () => {
    for (const op of ["findMany", "findFirst", "findUnique", "count", "aggregate", "groupBy", "update", "updateMany", "delete", "deleteMany"]) {
      expect(scopeArgs(op, { where: { id: "x" } }, T).where).toEqual({ id: "x", tenantId: T });
    }
    expect(scopeArgs("findMany", undefined, T).where).toEqual({ tenantId: T });
  });
  it("overrides any tenant written by the caller", () => {
    expect(scopeArgs("findMany", { where: { tenantId: "other" } }, T).where).toEqual({ tenantId: T });
    expect(scopeArgs("create", { data: { name: "n", tenantId: "other" } }, T).data).toEqual({ name: "n", tenantId: T });
    expect(scopeArgs("createMany", { data: [{ a: 1 }, { a: 2, tenantId: "other" }] }, T).data).toEqual([{ a: 1, tenantId: T }, { a: 2, tenantId: T }]);
  });
  it("never lets an update move a row", () => {
    expect(scopeArgs("update", { where: { id: "x" }, data: { name: "n", tenantId: "other" } }, T).data).toEqual({ name: "n" });
  });
  it("pins upserts on both sides", () => {
    const a = scopeArgs("upsert", { where: { id: "x" }, create: { name: "n" }, update: { name: "m" } }, T);
    expect(a.where).toEqual({ id: "x", tenantId: T });
    expect(a.create).toEqual({ name: "n", tenantId: T });
  });
});

describe("modules", () => {
  it("adds what a module needs and drops unknown names", () => {
    expect(normaliseModules(["pension", "nonsense"])).toEqual(["payroll", "pension"]);
    expect(normaliseModules(["leave"])).toEqual(["attendance", "leave"]);
  });
  it("a right in a module that is off is no right", () => {
    const hr: Principal = { loginType: "HR_ACCOUNTS", permissions: ["PAYROLL"], isEmployee: false, isPensioner: false };
    expect(can(hr, "payroll", "create")).toBe(true);
    expect(can({ ...hr, modules: ["attendance"] }, "payroll", "create")).toBe(false);
    expect(fnEnabled({ modules: [] }, "employee_master")).toBe(true);
  });
});
