import { describe, expect, it } from "vitest";
import { onceADay } from "@/core/daily";
import { tenantDb } from "@/core/tenancy/scoped";
import { hasTestDb, makeBoard } from "../support/factory";

describe.skipIf(!hasTestDb)("daily jobs started from a page view", () => {
  it("run once a day per organisation, one after another, and again after a failure", async () => {
    const a = (await makeBoard()).id;
    const b = (await makeBoard()).id;
    const order: string[] = [];
    const jobs = [async () => order.push("first"), async () => order.push("second")];
    expect(await onceADay(tenantDb(a), "test", jobs, "2026-11-24")).toBe(true);
    expect(order).toEqual(["first", "second"]);
    // Same day, same organisation: nothing runs (a new process reads the day from the database).
    expect(await onceADay(tenantDb(a), "test", jobs, "2026-11-24")).toBe(false);
    // Another organisation keeps its own day.
    expect(await onceADay(tenantDb(b), "test", jobs, "2026-11-24")).toBe(true);
    // A failed run is not marked done, so the next visit tries again.
    await expect(onceADay(tenantDb(a), "test", [async () => { throw new Error("boom"); }], "2026-11-25")).rejects.toThrow("boom");
    expect(await onceADay(tenantDb(a), "test", jobs, "2026-11-25")).toBe(true);
    expect(await onceADay(tenantDb(a), "test", jobs, "2026-11-25")).toBe(false);
  });
});
