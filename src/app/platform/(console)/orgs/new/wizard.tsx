"use client";

import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Package, PackageOpen, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/core/i18n/client";
import { DEFAULT_MODULES, MODULES, normaliseModules, type ModuleKey } from "@/core/tenancy/modules";
import { tDynamic } from "@/i18n";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const KINDS = ["CANTONMENT_BOARD", "MUNICIPAL", "GOVT_BODY", "COMPANY", "OTHER"] as const;
const PACKS = ["GOI_7CPC", "EMPTY"] as const;

interface Done {
  id: string;
  code: string;
  name: string;
  admin: { loginId: string; password: string };
}

/** Create an organisation in five short steps; nothing is saved until the last one. */
export function NewOrgWizard() {
  const { t } = useI18n();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Done | null>(null);
  const [f, setF] = useState({
    name: "",
    nameHi: "",
    shortName: "",
    code: "",
    kind: "CANTONMENT_BOARD" as (typeof KINDS)[number],
    city: "",
    state: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    status: "TRIAL" as "TRIAL" | "ACTIVE",
    trialDays: 30,
    maxUsers: 500,
    maxEmployees: 5000,
    modules: DEFAULT_MODULES as ModuleKey[],
    pack: "GOI_7CPC" as (typeof PACKS)[number],
    admin: { name: "", loginId: "ADMIN", mobile: "", email: "" },
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const setAdmin = (k: keyof typeof f.admin, v: string) => setF((x) => ({ ...x, admin: { ...x.admin, [k]: v } }));
  const modules = useMemo(() => normaliseModules(f.modules), [f.modules]);

  const steps = [t("platform.create.steps.details"), t("platform.create.steps.modules"), t("platform.create.steps.pack"), t("platform.create.steps.admin"), t("platform.create.steps.review")];
  const canNext = [
    f.name.trim().length >= 3 && /^[A-Z0-9]{2,12}$/.test(f.code),
    true,
    true,
    f.admin.name.trim().length >= 2 && /^[A-Z0-9._-]{3,30}$/.test(f.admin.loginId) && /^[6-9]\d{9}$/.test(f.admin.mobile),
    true,
  ][step];

  const toggle = (m: ModuleKey) => set("modules", f.modules.includes(m) ? f.modules.filter((x) => x !== m) : [...f.modules, m]);

  async function create() {
    setBusy(true);
    setFields({});
    try {
      const r = await api<Done>("/api/platform/orgs", { body: { ...f, modules } });
      setDone(r);
    } catch (e) {
      if (e instanceof ApiError) {
        setFields(e.fields);
        if (e.fields.code || e.fields.name) setStep(0);
        else if (Object.keys(e.fields).some((k) => k.startsWith("admin"))) setStep(3);
      }
      toast(e instanceof Error ? e.message : t("errors.generic"), "error");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const url = `${window.location.origin}/o/${done.code}`;
    const rows = [
      [t("platform.create.signInAt"), url],
      [t("platform.create.loginId"), done.admin.loginId],
      [t("platform.create.password"), done.admin.password],
    ];
    return (
      <Card className="mx-auto max-w-2xl overflow-hidden">
        <div className="bg-aurora px-6 py-8 text-center text-white sm:px-10">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Sparkles className="size-6 text-gold-300" />
          </span>
          <h2 className="mt-4 font-display text-[1.75rem] font-medium">{t("platform.create.doneTitle", { name: done.name })}</h2>
          <p className="mt-2 text-sm text-night-muted">{t("platform.create.doneIntro")}</p>
        </div>
        <CardBody className="pt-6">
          <dl className="divide-y divide-line rounded-2xl ring-1 ring-line">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="flex items-center gap-2">
                  <code className="rounded-lg bg-sunken px-2 py-1 text-sm font-medium text-ink">{v}</code>
                  <button type="button" className="grid size-8 place-items-center rounded-lg text-faint hover:bg-sunken hover:text-ink" aria-label={t("common.copy")} onClick={() => navigator.clipboard?.writeText(v).then(() => toast(t("common.copied")))}>
                    <Copy className="size-4" />
                  </button>
                </dd>
              </div>
            ))}
          </dl>
        </CardBody>
        <CardFooter>
          <LinkButton href={`/o/${done.code}`} target="_blank" variant="ghost" icon={<ExternalLink />}>{t("platform.org.signInPage")}</LinkButton>
          <LinkButton href={`/platform/orgs/${done.id}`} variant="primary">{t("platform.create.openOrg")}</LinkButton>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-3xl">
      <div className="border-b border-line px-5 py-5 sm:px-8">
        <Stepper steps={steps} current={step} />
      </div>
      <CardBody className="pt-6 sm:px-8">
        {step === 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Input containerClassName="sm:col-span-2" label={t("platform.create.name")} value={f.name} onChange={(e) => set("name", e.target.value)} required error={fields.name} autoFocus />
            <Input label={t("platform.create.nameHi")} optionalLabel={t("common.optional")} value={f.nameHi} onChange={(e) => set("nameHi", e.target.value)} lang="hi" />
            <Input label={t("platform.create.shortName")} optionalLabel={t("common.optional")} value={f.shortName} onChange={(e) => set("shortName", e.target.value)} />
            <Input label={t("platform.create.code")} hint={t("platform.create.codeHint")} value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))} required error={fields.code} className="tracking-[0.14em]" />
            <Select label={t("platform.create.kind")} value={f.kind} onChange={(e) => set("kind", e.target.value as (typeof KINDS)[number])}>
              {KINDS.map((k) => <option key={k} value={k}>{tDynamic(t, `platform.kind.${k}`)}</option>)}
            </Select>
            <Input label={t("platform.create.city")} optionalLabel={t("common.optional")} value={f.city} onChange={(e) => set("city", e.target.value)} />
            <Input label={t("platform.create.state")} optionalLabel={t("common.optional")} value={f.state} onChange={(e) => set("state", e.target.value)} />
            <Input label={t("platform.create.contactName")} optionalLabel={t("common.optional")} value={f.contactName} onChange={(e) => set("contactName", e.target.value)} />
            <Input label={t("platform.create.contactEmail")} optionalLabel={t("common.optional")} type="email" value={f.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} error={fields.contactEmail} />
            <div className="space-y-1.5 sm:col-span-2">
              <p className="text-[0.8125rem] font-medium text-ink-2">{t("platform.create.status")}</p>
              <Segmented label={t("platform.create.status")} value={f.status} onChange={(v) => set("status", v)} options={[{ value: "TRIAL", label: t("platform.status.TRIAL") }, { value: "ACTIVE", label: t("platform.status.ACTIVE") }]} />
            </div>
            {f.status === "TRIAL" && <Input type="number" min={1} max={365} label={t("platform.create.trialDays")} value={f.trialDays} onChange={(e) => set("trialDays", Number(e.target.value))} />}
            <Input type="number" min={1} label={t("platform.create.maxUsers")} value={f.maxUsers} onChange={(e) => set("maxUsers", Number(e.target.value))} />
            <Input type="number" min={1} label={t("platform.create.maxEmployees")} value={f.maxEmployees} onChange={(e) => set("maxEmployees", Number(e.target.value))} />
          </div>
        )}
        {step === 1 && (
          <div>
            <p className="mb-5 text-sm leading-relaxed text-muted">{t("platform.create.modulesIntro")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl bg-sunken p-4 ring-1 ring-line">
                <span className="mt-0.5 grid size-5 place-items-center rounded-md bg-brand-600 text-white"><Check className="size-3.5" strokeWidth={3} /></span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{t("moduleName.core")}</span>
                  <span className="block text-xs text-muted">{t("moduleName.hint.core")}</span>
                </span>
              </div>
              {MODULES.map((m) => {
                const chosen = f.modules.includes(m);
                const implied = !chosen && modules.includes(m);
                return (
                  <button key={m} type="button" onClick={() => toggle(m)} aria-pressed={chosen || implied} className={cn("flex items-start gap-3 rounded-2xl p-4 text-left ring-1 transition", chosen || implied ? "bg-brand-50/60 ring-brand-300 dark:bg-brand-950/40 dark:ring-brand-700" : "bg-surface ring-line hover:ring-line-strong")}>
                    <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md ring-1", chosen || implied ? "bg-brand-600 text-white ring-brand-600" : "bg-surface ring-line-strong")}>
                      {(chosen || implied) && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink">{tDynamic(t, `moduleName.${m}`)}</span>
                      <span className="block text-xs text-muted">{tDynamic(t, `moduleName.hint.${m}`)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {PACKS.map((p) => (
              <button key={p} type="button" onClick={() => set("pack", p)} aria-pressed={f.pack === p} className={cn("rounded-2xl p-5 text-left ring-1 transition", f.pack === p ? "bg-brand-50/60 ring-2 ring-brand-500 dark:bg-brand-950/40" : "bg-surface ring-line hover:ring-line-strong")}>
                <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-gold-50 text-brand-700 ring-1 ring-line dark:from-brand-950 dark:to-gold-900/30 dark:text-brand-300">
                  {p === "EMPTY" ? <PackageOpen className="size-5" /> : <Package className="size-5" />}
                </span>
                <span className="mt-4 block font-semibold text-ink">{tDynamic(t, `platform.pack.${p}`)}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">{tDynamic(t, `platform.pack.${p}_hint`)}</span>
              </button>
            ))}
          </div>
        )}
        {step === 3 && (
          <div>
            <p className="mb-5 text-sm leading-relaxed text-muted">{t("platform.create.adminIntro")}</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label={t("platform.create.adminName")} value={f.admin.name} onChange={(e) => setAdmin("name", e.target.value)} required error={fields["admin.name"]} autoFocus />
              <Input label={t("platform.create.adminLoginId")} value={f.admin.loginId} onChange={(e) => setAdmin("loginId", e.target.value.toUpperCase())} required error={fields["admin.loginId"]} />
              <Input label={t("platform.create.adminMobile")} inputMode="numeric" value={f.admin.mobile} onChange={(e) => setAdmin("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} required error={fields["admin.mobile"]} hint={t("validation.mobile")} />
              <Input label={t("platform.create.adminEmail")} optionalLabel={t("common.optional")} type="email" value={f.admin.email} onChange={(e) => setAdmin("email", e.target.value)} error={fields["admin.email"]} />
            </div>
          </div>
        )}
        {step === 4 && (
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {[
              [t("platform.create.name"), f.name],
              [t("platform.create.code"), f.code],
              [t("platform.create.kind"), tDynamic(t, `platform.kind.${f.kind}`)],
              [t("platform.create.status"), tDynamic(t, `platform.status.${f.status}`)],
              [t("platform.create.steps.pack"), tDynamic(t, `platform.pack.${f.pack}`)],
              [t("platform.create.adminLoginId"), `${f.admin.loginId} · ${f.admin.name}`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted">{k}</dt>
                <dd className="mt-1 text-sm font-medium text-ink">{v}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted">{t("platform.create.steps.modules")}</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {modules.map((m) => <Badge key={m} tone="brand">{tDynamic(t, `moduleName.${m}`)}</Badge>)}
              </dd>
            </div>
          </dl>
        )}
      </CardBody>
      <CardFooter className="justify-between">
        {step > 0 ? <Button variant="ghost" icon={<ArrowLeft />} onClick={() => setStep(step - 1)}>{t("common.back")}</Button> : <Link href="/platform/orgs" className="text-sm text-muted hover:text-ink">{t("common.cancel")}</Link>}
        {step < 4 ? (
          <Button variant="primary" onClick={() => setStep(step + 1)} disabled={!canNext}>
            {t("common.next")} <ArrowRight />
          </Button>
        ) : (
          <Button variant="primary" loading={busy} onClick={create}>
            {busy ? t("platform.create.creating") : t("platform.create.create")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
