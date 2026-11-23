"use client";

import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  HeartPulse,
  IdCard,
  Landmark,
  LifeBuoy,
  Leaf,
  Link2,
  Printer,
  Rocket,
  Scale,
  Search,
  Sparkles,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandWordmark } from "@/components/brand/mark";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { ThemeSwitch } from "@/components/shell/theme-switch";
import { buttonClass } from "@/components/ui/button";
import { useT } from "@/core/i18n/client";
import { cn } from "@/lib/utils";

export interface HelpItem {
  id: string;
  q: string;
  a: string;
  steps: string[];
  tip: string | null;
  href: string | null;
  who: string[];
  related: { id: string; q: string }[];
}

export interface HelpData {
  signedIn: boolean;
  locale: "en" | "hi";
  path: string[];
  categories: { id: string; icon: string; title: string; hint: string; questions: HelpItem[] }[];
}

const ICONS: Record<string, typeof Rocket> = {
  rocket: Rocket,
  building: Building2,
  users: Users,
  idcard: IdCard,
  calendar: CalendarDays,
  leaf: Leaf,
  scale: Scale,
  wallet: Wallet,
  landmark: Landmark,
  heart: HeartPulse,
  briefcase: Briefcase,
  chart: BarChart3,
  user: User,
  lifebuoy: LifeBuoy,
};

const DONE_KEY = "kosh-help-done";

/** Lower case, no accents or punctuation — so "D.A." finds "DA" and Hindi matches as typed. */
const fold = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}\p{M}\s]/gu, " ");

function readDone(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(DONE_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function HelpCentre({ data }: { data: HelpData }) {
  const t = useT();
  const all = useMemo(() => data.categories.flatMap((c) => c.questions.map((q) => ({ ...q, cat: c }))), [data]);
  const byId = useMemo(() => new Map(all.map((q) => [q.id, q])), [all]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Per-device progress on the first-day path (a convenience: the page works the same without it).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDone(readDone()), []);
  const toggleDone = (id: string) =>
    setDone((d) => {
      const next = d.includes(id) ? d.filter((x) => x !== id) : [...d, id];
      try {
        localStorage.setItem(DONE_KEY, JSON.stringify(next));
      } catch {
        /* private window: progress is just not kept */
      }
      return next;
    });

  const openQuestion = useCallback((id: string, scroll = true) => {
    setOpen((o) => new Set(o).add(id));
    if (!scroll) return;
    requestAnimationFrame(() => document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  // A link to /help#q-<id> opens that answer.
  useEffect(() => {
    const fromHash = () => {
      const id = decodeURIComponent(location.hash.replace(/^#q-/, ""));
      if (id && byId.has(id)) {
        setQuery("");
        openQuestion(id);
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [byId, openQuestion]);

  // "/" jumps to the search box, as on most help sites.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const terms = fold(query).split(/\s+/).filter(Boolean);
  const results = useMemo(() => {
    if (!terms.length) return [];
    return all
      .map((q) => {
        const head = fold(q.q);
        const body = fold([q.a, ...q.steps, q.tip ?? "", q.cat.title].join(" "));
        if (!terms.every((w) => head.includes(w) || body.includes(w))) return null;
        // Questions whose title holds the words come first.
        return { q, score: terms.filter((w) => head.includes(w)).length };
      })
      .filter((x): x is { q: (typeof all)[number]; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, all]);

  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/help#q-${id}`);
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      window.history.replaceState(null, "", `#q-${id}`);
    }
  };

  const allOpen = open.size >= all.length;
  const toggleAll = () => setOpen(allOpen ? new Set() : new Set(all.map((q) => q.id)));
  const pathDone = data.path.filter((id) => done.includes(id)).length;

  const card = (q: (typeof all)[number], inResults = false) => {
    const isOpen = open.has(q.id) || (inResults && results[0]?.id === q.id && !open.size);
    return (
      <article key={q.id} id={`q-${q.id}`} className={cn("scroll-mt-24 rounded-2xl bg-surface ring-1 transition-shadow", isOpen ? "shadow-raised ring-brand-200 dark:ring-brand-800" : "shadow-card ring-line hover:ring-line-strong")}>
        <h3>
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={`a-${q.id}`}
            onClick={() => setOpen((o) => {
              const n = new Set(o);
              if (n.has(q.id)) n.delete(q.id);
              else n.add(q.id);
              return n;
            })}
            className="flex w-full items-start gap-3 px-5 py-4 text-left sm:px-6"
          >
            <CircleHelp className={cn("mt-0.5 size-5 shrink-0", isOpen ? "text-brand-600 dark:text-brand-300" : "text-faint")} aria-hidden="true" />
            <span className="min-w-0 flex-1 text-[0.9875rem] leading-snug font-semibold text-ink">{q.q}</span>
            {inResults && <span className="hidden shrink-0 rounded-full bg-sunken px-2.5 py-0.5 text-xs text-muted sm:inline">{q.cat.title}</span>}
            <ChevronDown className={cn("mt-0.5 size-5 shrink-0 text-faint transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
          </button>
        </h3>
        <div id={`a-${q.id}`} className={cn("border-t border-line px-5 pt-4 pb-5 sm:px-6", isOpen ? "block" : "hidden print:block")}>
          <p className="text-[0.9375rem] leading-relaxed text-ink-2">{q.a}</p>

          {q.steps.length > 0 && (
            <div className="mt-5">
              <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-muted uppercase">{t("help.steps")}</p>
              <ol className="mt-3 space-y-3">
                {q.steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950/60 dark:text-brand-200 dark:ring-brand-800">{i + 1}</span>
                    <span className="pt-0.5 text-[0.9375rem] leading-relaxed text-ink-2">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {q.tip && (
            <div className="mt-5 flex gap-3 rounded-xl bg-gold-50 px-4 py-3 ring-1 ring-gold-200 dark:bg-gold-900/25 dark:ring-gold-800/60">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-gold-600 dark:text-gold-300" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-ink-2">
                <span className="font-semibold text-ink">{t("help.tip")}: </span>
                {q.tip}
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">{t("help.who")}:</span>
            {q.who.map((w) => (
              <span key={w} className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-medium text-ink-2">{w}</span>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 print:hidden">
            {q.href && (
              <Link href={q.href} className={buttonClass("secondary", "sm")} title={data.signedIn ? undefined : t("help.openNeedsSignIn")}>
                {t("help.open")} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
            <button type="button" onClick={() => copyLink(q.id)} className={buttonClass("ghost", "sm")}>
              {copied === q.id ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
              {copied === q.id ? t("help.copied") : t("help.copyLink")}
            </button>
          </div>

          {q.related.length > 0 && (
            <div className="mt-5 border-t border-line pt-4 print:hidden">
              <p className="text-xs font-semibold text-muted">{t("help.related")}</p>
              <ul className="mt-2 space-y-1.5">
                {q.related.map((r) => (
                  <li key={r.id}>
                    <a
                      href={`#q-${r.id}`}
                      onClick={() => {
                        setQuery("");
                        openQuestion(r.id);
                      }}
                      className="inline-flex items-start gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
                    >
                      <ArrowRight className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      {r.q}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Header */}
      <header className="bg-aurora relative overflow-hidden text-night-ink print:bg-none print:text-ink">
        <div className="pointer-events-none absolute -top-24 -right-24 size-[420px] rounded-full border border-white/5" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 pt-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href={data.signedIn ? "/" : "/login"} aria-label="Kosh">
              <BrandWordmark invert />
            </Link>
            <div className="flex items-center gap-2 print:hidden">
              <LanguageSwitch invert />
              <ThemeSwitch className="text-night-ink hover:bg-white/10" />
              <Link href={data.signedIn ? "/" : "/login"} className="hidden rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/15 sm:inline-flex">
                {data.signedIn ? t("help.goToApp") : t("help.signIn")}
              </Link>
            </div>
          </div>
          <div className="max-w-3xl pt-12 pb-14 sm:pt-16 sm:pb-20">
            <p className="text-[0.6875rem] font-semibold tracking-[0.16em] text-gold-300 uppercase">{t("help.eyebrow")}</p>
            <h1 className="mt-3 font-display text-[2.25rem] leading-[1.08] font-medium text-white sm:text-[3rem]">{t("help.title")}</h1>
            <p className="mt-4 text-[1.0625rem] leading-relaxed text-night-muted">{t("help.subtitle")}</p>
            <div className="relative mt-8 print:hidden">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-faint" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("help.search")}
                aria-label={t("help.searchLabel")}
                className="h-14 w-full rounded-2xl border-0 bg-surface pr-12 pl-12 text-[0.9875rem] text-ink shadow-overlay ring-1 ring-white/10 placeholder:text-faint focus:ring-4 focus:ring-gold-300/40 focus:outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-sunken" aria-label={t("help.clear")}>
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {terms.length > 0 ? (
          <section aria-live="polite">
            <p className="text-sm text-muted">{results.length ? t("help.results", { count: results.length }) : t("help.noResults", { q: query })}</p>
            <div className="mt-4 space-y-3">{results.map((q) => card(q, true))}</div>
          </section>
        ) : (
          <div className="space-y-14">
            {/* First-day path */}
            <section aria-labelledby="path" className="rounded-3xl bg-surface p-5 shadow-card ring-1 ring-line sm:p-8 print:hidden">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 id="path" className="font-display text-[1.5rem] leading-tight font-medium text-ink sm:text-[1.75rem]">{t("help.pathTitle")}</h2>
                  <p className="mt-2 text-sm text-muted">{t("help.pathHint")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-36 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-gold-400 transition-all" style={{ width: `${(pathDone / data.path.length) * 100}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-ink tabular">{t("help.pathDone", { done: pathDone, total: data.path.length })}</span>
                </div>
              </div>
              <ol className="mt-6 grid gap-2 sm:grid-cols-2">
                {data.path.map((id, i) => {
                  const q = byId.get(id);
                  if (!q) return null;
                  const isDone = done.includes(id);
                  return (
                    <li key={id} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition", isDone ? "bg-emerald-50/60 ring-emerald-200 dark:bg-emerald-950/25 dark:ring-emerald-900" : "bg-surface-2 ring-line")}>
                      <button
                        type="button"
                        onClick={() => toggleDone(id)}
                        aria-pressed={isDone}
                        aria-label={`${isDone ? t("help.done") : t("help.markDone")}: ${q.q}`}
                        className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ring-1 transition", isDone ? "bg-emerald-600 text-white ring-emerald-600" : "bg-surface text-muted ring-line-strong hover:ring-brand-400")}
                      >
                        {isDone ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : i + 1}
                      </button>
                      <a
                        href={`#q-${id}`}
                        onClick={() => openQuestion(id)}
                        className={cn("min-w-0 flex-1 text-sm font-medium hover:text-brand-700 dark:hover:text-brand-300", isDone ? "text-muted line-through decoration-1" : "text-ink")}
                      >
                        {q.q}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </section>

            {/* Topics */}
            <section aria-labelledby="topics" className="print:hidden">
              <h2 id="topics" className="font-display text-[1.5rem] font-medium text-ink">{t("help.topics")}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.categories.map((c) => {
                  const Icon = ICONS[c.icon] ?? CircleHelp;
                  return (
                    <a key={c.id} href={`#t-${c.id}`} className="group flex gap-4 rounded-2xl bg-surface p-5 shadow-card ring-1 ring-line transition hover:-translate-y-0.5 hover:ring-brand-300 dark:hover:ring-brand-700">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-900">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink group-hover:text-brand-700 dark:group-hover:text-brand-300">{c.title}</span>
                        <span className="mt-1 block text-sm leading-relaxed text-muted">{c.hint}</span>
                        <span className="mt-2 block text-xs font-medium text-faint">{t("help.questionsCount", { count: c.questions.length })}</span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </section>

            {/* Index of every question */}
            <section aria-labelledby="index" className="rounded-3xl bg-surface p-5 shadow-card ring-1 ring-line sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="index" className="font-display text-[1.5rem] font-medium text-ink">{t("help.index")}</h2>
                  <p className="mt-1 text-sm text-muted">{t("help.indexHint")}</p>
                </div>
                <div className="flex gap-2 print:hidden">
                  <button type="button" onClick={toggleAll} className={buttonClass("ghost", "sm")}>{allOpen ? t("help.collapseAll") : t("help.expandAll")}</button>
                  <button type="button" onClick={() => { setOpen(new Set(all.map((q) => q.id))); setTimeout(() => window.print(), 50); }} className={buttonClass("ghost", "sm")}>
                    <Printer className="size-4" aria-hidden="true" /> {t("help.printGuide")}
                  </button>
                </div>
              </div>
              <div className="mt-6 columns-1 gap-8 md:columns-2">
                {data.categories.map((c, ci) => (
                  <div key={c.id} className="mb-6 break-inside-avoid">
                    <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-gold-600 uppercase dark:text-gold-300">
                      {ci + 1}. {c.title}
                    </p>
                    <ol className="mt-2 space-y-1">
                      {c.questions.map((q, qi) => (
                        <li key={q.id}>
                          <a href={`#q-${q.id}`} onClick={() => openQuestion(q.id)} className="flex gap-2 rounded-lg px-2 py-1 text-sm text-ink-2 hover:bg-surface-2 hover:text-brand-700 dark:hover:text-brand-300">
                            <span className="w-8 shrink-0 text-faint tabular">{ci + 1}.{qi + 1}</span>
                            <span className="min-w-0">{q.q}</span>
                          </a>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>

            {/* Every topic with its answers */}
            {data.categories.map((c, ci) => {
              const Icon = ICONS[c.icon] ?? CircleHelp;
              return (
                <section key={c.id} id={`t-${c.id}`} aria-labelledby={`h-${c.id}`} className="scroll-mt-20">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-night text-gold-300 dark:bg-white/5">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2 id={`h-${c.id}`} className="font-display text-[1.375rem] leading-tight font-medium text-ink sm:text-[1.5rem]">
                        {ci + 1}. {c.title}
                      </h2>
                      <p className="text-sm text-muted">{c.hint}</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">{c.questions.map((q) => card({ ...q, cat: c }))}</div>
                </section>
              );
            })}

            <section className="rounded-3xl bg-night p-6 text-night-ink sm:p-8 print:hidden">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <LifeBuoy className="mt-1 size-6 shrink-0 text-gold-300" aria-hidden="true" />
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-medium text-white">{t("help.stillStuck")}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-night-muted">{t("help.stillStuckHint")}</p>
                  </div>
                </div>
                <Link href={data.signedIn ? "/" : "/login"} className="rounded-xl bg-gold-400 px-4 py-2.5 text-sm font-semibold text-night hover:bg-gold-300">
                  {data.signedIn ? t("help.goToApp") : t("help.signIn")}
                </Link>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
