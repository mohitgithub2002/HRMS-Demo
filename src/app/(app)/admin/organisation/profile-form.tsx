"use client";

import { Building2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/field";
import { useT } from "@/core/i18n/client";
import { useAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";

const SWATCHES = ["#4740b4", "#0f766e", "#116541", "#b45309", "#9f1239", "#1d4ed8", "#6d28d9", "#334155"];

export function ProfileForm({ initial }: { initial: { code: string; name: string; nameHi: string; shortName: string; address: string; city: string; state: string; pincode: string; accentColor: string } }) {
  const t = useT();
  const { run, busy, fields } = useAction();
  const [f, setF] = useState(initial);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Card>
        <CardBody className="grid gap-5 pt-6 sm:grid-cols-2">
          <Input containerClassName="sm:col-span-2" label={t("org.name")} value={f.name} onChange={(e) => set("name", e.target.value)} error={fields.name} required />
          <Input label={t("org.nameHi")} value={f.nameHi} onChange={(e) => set("nameHi", e.target.value)} lang="hi" error={fields.nameHi} />
          <Input label={t("org.shortName")} optionalLabel={t("common.optional")} value={f.shortName} onChange={(e) => set("shortName", e.target.value)} />
          <Textarea containerClassName="sm:col-span-2" label={t("org.address")} value={f.address} onChange={(e) => set("address", e.target.value)} rows={2} />
          <Input label={t("org.city")} value={f.city} onChange={(e) => set("city", e.target.value)} />
          <Input label={t("org.state")} value={f.state} onChange={(e) => set("state", e.target.value)} />
          <Input label={t("org.pincode")} inputMode="numeric" value={f.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} error={fields.pincode} />
          <Input label={t("org.code")} value={f.code} disabled hint={t("org.codeHint")} />
        </CardBody>
        <CardFooter>
          <Button variant="primary" loading={busy} onClick={() => run("/api/v1/org/profile", { ...f, code: undefined }, { method: "PUT" })}>
            {t("common.save")}
          </Button>
        </CardFooter>
      </Card>
      <Card className="h-fit">
        <CardBody className="pt-6">
          <p className="text-sm font-semibold text-ink">{t("org.accent")}</p>
          <p className="mt-1 text-sm text-muted">{t("org.accentHint")}</p>
          <div className="mt-4 flex flex-wrap gap-2.5" role="radiogroup" aria-label={t("org.accent")}>
            {SWATCHES.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={f.accentColor === c} aria-label={c} onClick={() => set("accentColor", c)} className={cn("size-9 rounded-full ring-offset-2 ring-offset-surface transition", f.accentColor === c ? "ring-2 ring-ink" : "hover:scale-105")} style={{ background: c }} />
            ))}
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-line">
            <div className="h-1.5" style={{ background: f.accentColor || "var(--color-brand-700)" }} />
            <div className="flex items-center gap-3 p-4">
              <span className="grid size-10 place-items-center rounded-xl text-white" style={{ background: f.accentColor || "var(--color-brand-700)" }}>
                <Building2 className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{f.name || "—"}</span>
                <span className="block text-xs tracking-[0.12em] text-muted">{f.code}</span>
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
