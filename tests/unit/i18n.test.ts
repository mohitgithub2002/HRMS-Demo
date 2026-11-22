import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { hi } from "@/i18n/hi";
import { makeT } from "@/i18n";

function leaves(obj: unknown, prefix = ""): string[] {
  if (typeof obj === "string") return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
}

describe("dictionaries", () => {
  it("Hindi has exactly the English keys", () => {
    const e = leaves(en).sort();
    const h = leaves(hi).sort();
    expect(h.filter((k) => !e.includes(k))).toEqual([]);
    expect(e.filter((k) => !h.includes(k))).toEqual([]);
  });

  it("keeps the same {placeholders} in both languages", () => {
    const get = (d: unknown, k: string) => k.split(".").reduce<unknown>((n, p) => (n as Record<string, unknown>)[p], d) as string;
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    const bad = leaves(en).filter((k) => vars(get(en, k)) !== vars(get(hi, k)));
    expect(bad).toEqual([]);
  });

  it("translates with variables and falls back to English", () => {
    expect(makeT("en")("home.morning", { name: "Asha" })).toBe("Good morning, Asha");
    expect(makeT("hi")("common.save")).toBe("सहेजें");
    expect(makeT("en", true)("common.sendForApproval")).toBe("Save");
  });
});
