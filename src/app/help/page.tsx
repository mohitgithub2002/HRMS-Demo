import type { Metadata } from "next";
import { getActor } from "@/core/auth/session";
import { getT } from "@/core/i18n/server";
import { tDynamic } from "@/i18n";
import { FIRST_DAY_PATH, HELP_CATEGORIES } from "@/modules/help/guide";
import { HelpCentre, type HelpData } from "./help-centre";

export const metadata: Metadata = { title: "Help Centre" };

/**
 * The Help Centre: every question about setting up and running an organisation on Kosh, answered step by step. Public
 * (nothing in it is about anyone's data), so a new organisation can read it before its first sign-in; the words are
 * resolved here in the reader's language and the page itself is interactive (help-centre.tsx).
 */
export default async function HelpPage() {
  const [{ t, locale }, actor] = await Promise.all([getT(), getActor()]);
  const tx = (key: string, vars?: Record<string, string | number>) => tDynamic(t, key, vars);
  const titleOf = new Map(HELP_CATEGORIES.flatMap((c) => c.questions.map((q) => [q.id, tx(`help.q.${q.id}.q`)] as const)));

  const data: HelpData = {
    signedIn: Boolean(actor),
    locale,
    path: [...FIRST_DAY_PATH],
    categories: HELP_CATEGORIES.map((c) => ({
      id: c.id,
      icon: c.icon,
      title: tx(`help.cat.${c.id}.title`),
      hint: tx(`help.cat.${c.id}.hint`),
      questions: c.questions.map((q) => ({
        id: q.id,
        q: tx(`help.q.${q.id}.q`),
        a: tx(`help.q.${q.id}.a`),
        steps: Array.from({ length: q.steps }, (_, i) => tx(`help.q.${q.id}.s${i + 1}`)),
        tip: q.tip ? tx(`help.q.${q.id}.tip`) : null,
        href: q.href ?? null,
        who: q.who.map((w) => tx(`help.whoLabel.${w}`)),
        related: (q.related ?? []).map((id) => ({ id, q: titleOf.get(id) ?? id })),
      })),
    })),
  };
  return <HelpCentre data={data} />;
}
