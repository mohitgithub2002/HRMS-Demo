import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hasKey } from "@/i18n";
import { FIRST_DAY_PATH, HELP_CATEGORIES, HELP_QUESTIONS } from "@/modules/help/guide";

/** Every page route of the app, as a URL pattern ("/employees/[id]" → "/employees/[^/]+"). */
function routes(): RegExp[] {
  const root = path.join(process.cwd(), "src/app");
  const out: string[] = [];
  const walk = (dir: string, url: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (!statSync(full).isDirectory()) {
        if (name === "page.tsx") out.push(url || "/");
        continue;
      }
      if (name === "api" || name.startsWith("_")) continue;
      // Route groups such as (app) do not appear in the address.
      walk(full, /^\(.*\)$/.test(name) ? url : `${url}/${name}`);
    }
  };
  walk(root, "");
  return out.map((r) => new RegExp(`^${r.replace(/\[[^\]]+\]/g, "[^/]+")}$`));
}

describe("the Help Centre", () => {
  it("has every question once, with its words in the dictionary and the exact number of steps", () => {
    const ids = HELP_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(90);
    for (const q of HELP_QUESTIONS) {
      expect(hasKey(`help.q.${q.id}.q`), q.id).toBe(true);
      expect(hasKey(`help.q.${q.id}.a`), q.id).toBe(true);
      for (let i = 1; i <= q.steps; i++) expect(hasKey(`help.q.${q.id}.s${i}`), `${q.id} s${i}`).toBe(true);
      expect(hasKey(`help.q.${q.id}.s${q.steps + 1}`), `${q.id} has more steps than declared`).toBe(false);
      expect(hasKey(`help.q.${q.id}.tip`), `${q.id} tip`).toBe(Boolean(q.tip));
    }
  });

  it("names and describes every topic", () => {
    for (const c of HELP_CATEGORIES) {
      expect(hasKey(`help.cat.${c.id}.title`), c.id).toBe(true);
      expect(hasKey(`help.cat.${c.id}.hint`), c.id).toBe(true);
      expect(c.questions.length, c.id).toBeGreaterThan(0);
    }
  });

  it("links only to screens that exist, and to questions that exist", () => {
    const pages = routes();
    const ids = new Set(HELP_QUESTIONS.map((q) => q.id));
    for (const q of HELP_QUESTIONS) {
      if (q.href) {
        const bare = q.href.split(/[?#]/)[0];
        expect(pages.some((r) => r.test(bare)), `${q.id} → ${q.href}`).toBe(true);
      }
      for (const r of q.related ?? []) expect(ids.has(r), `${q.id} → related ${r}`).toBe(true);
      for (const w of q.who) expect(hasKey(`help.whoLabel.${w}`), w).toBe(true);
    }
    for (const id of FIRST_DAY_PATH) expect(ids.has(id), id).toBe(true);
  });
});
