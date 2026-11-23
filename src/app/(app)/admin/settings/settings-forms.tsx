"use client";

import { Banknote, Clock, FileStack, FileText, Landmark, Mail, MessageSquareText, ShieldCheck, Workflow } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Checkbox, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { useT } from "@/core/i18n/client";
import type { AllSettings } from "@/modules/settings/store";
import { BANK_FORMATS, type SettingKey } from "@/modules/settings/schema";
import { useAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { WeekdayPicker } from "../weekday-picker";

/** One card per setting; each saves on its own so a mistake in one never blocks another. */
export function SettingsForms({ initial }: { initial: AllSettings }) {
  const t = useT();
  const { run, busy, fields } = useAction();
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState<SettingKey | null>(null);
  const patch = <K extends SettingKey>(k: K, v: Partial<AllSettings[K]>) => setS((x) => ({ ...x, [k]: { ...x[k], ...v } }));
  const st = s.statutory;
  // A saved document type keeps its code (files already use it); new rows can still change theirs.
  const savedCodes = new Set(initial.documents.types.map((x) => x.code));
  const setDocType = (i: number, v: Partial<AllSettings["documents"]["types"][number]>) => patch("documents", { types: s.documents.types.map((x, k) => (k === i ? { ...x, ...v } : x)) });
  const setSt = (v: Partial<AllSettings["statutory"]>) => patch("statutory", v);
  const save = async (k: SettingKey) => {
    setSaving(k);
    await run(`/api/v1/settings/${k}`, s[k], { method: "PUT" });
    setSaving(null);
  };
  const footer = (k: SettingKey) => (
    <CardFooter>
      <Button variant={k === "workflow" ? "primary" : "secondary"} loading={busy && saving === k} onClick={() => save(k)}>
        {t("common.save")}
      </Button>
    </CardFooter>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card id="workflow" className="xl:col-span-2 scroll-mt-24">
        <CardHeader icon={<Workflow />} title={t("settings.workflow.title")} />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          {(["simple", "two_step"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={s.workflow.mode === m} onClick={() => patch("workflow", { mode: m })} className={cn("rounded-2xl p-5 text-left ring-1 transition", s.workflow.mode === m ? "bg-brand-50/70 ring-2 ring-brand-500 dark:bg-brand-950/40" : "bg-surface ring-line hover:ring-line-strong")}>
              <span className="block font-semibold text-ink">{m === "simple" ? t("settings.workflow.simple") : t("settings.workflow.twoStep")}</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted">{m === "simple" ? t("settings.workflow.simpleHint") : t("settings.workflow.twoStepHint")}</span>
            </button>
          ))}
        </CardBody>
        {footer("workflow")}
      </Card>

      <Card id="security" className="scroll-mt-24">
        <CardHeader icon={<ShieldCheck />} title={t("settings.security.title")} />
        <CardBody className="space-y-3">
          <Switch label={t("settings.security.loginOtp")} hint={t("settings.security.loginOtpHint")} checked={s.security.loginOtp} onChange={(v) => patch("security", { loginOtp: v })} />
          <Switch label={t("settings.security.mobileOtpLogin")} checked={s.security.mobileOtpLogin} onChange={(v) => patch("security", { mobileOtpLogin: v })} />
        </CardBody>
        {footer("security")}
      </Card>

      <Card id="attendance" className="scroll-mt-24">
        <CardHeader icon={<Clock />} title={t("settings.attendance.title")} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Input type="time" label={t("settings.attendance.officeStart")} value={s.attendance.officeStart} onChange={(e) => patch("attendance", { officeStart: e.target.value })} error={fields.officeStart} />
          <Input type="number" min={0} max={120} label={t("settings.attendance.graceMinutes")} value={s.attendance.graceMinutes} onChange={(e) => patch("attendance", { graceMinutes: Number(e.target.value) })} />
          <Input type="number" min={60} max={600} label={t("settings.attendance.halfDayMinutes")} hint={t("settings.attendance.halfDayHint")} value={s.attendance.halfDayMinutes} onChange={(e) => patch("attendance", { halfDayMinutes: Number(e.target.value) })} />
          <Input type="number" min={1} max={28} label={t("settings.attendance.lockDay")} value={s.attendance.lockDay} onChange={(e) => patch("attendance", { lockDay: Number(e.target.value) })} />
          <div className="sm:col-span-2">
            <WeekdayPicker label={t("settings.attendance.weeklyOff")} value={s.attendance.weeklyOff.join(",")} onChange={(v) => patch("attendance", { weeklyOff: v ? v.split(",").map(Number) : [] })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <p className="text-[0.8125rem] font-medium text-ink-2">{t("settings.attendance.devices")}</p>
            <p className="text-xs text-muted">{t("settings.attendance.devicesHint")}</p>
            {s.attendance.devices.map((d, i) => (
              <div key={i} className="flex gap-2">
                <Input aria-label={t("settings.attendance.serial")} placeholder={t("settings.attendance.serial")} value={d.serial} onChange={(e) => patch("attendance", { devices: s.attendance.devices.map((x, j) => (j === i ? { ...x, serial: e.target.value.trim() } : x)) })} containerClassName="flex-1" />
                <Input aria-label={t("settings.attendance.deviceName")} placeholder={t("settings.attendance.deviceName")} value={d.name} onChange={(e) => patch("attendance", { devices: s.attendance.devices.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} containerClassName="flex-1" />
                <Button variant="ghost" onClick={() => patch("attendance", { devices: s.attendance.devices.filter((_, j) => j !== i) })}>{t("common.remove")}</Button>
              </div>
            ))}
            <Button size="sm" onClick={() => patch("attendance", { devices: [...s.attendance.devices, { serial: "", name: "" }] })}>{t("settings.attendance.addDevice")}</Button>
          </div>
        </CardBody>
        {footer("attendance")}
      </Card>

      <Card id="statutory" className="xl:col-span-2 scroll-mt-24">
        <CardHeader icon={<Landmark />} title={t("settings.statutory.title")} description={t("settings.statutory.hint")} />
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label={t("settings.statutory.deductorName")} value={st.deductorName} maxLength={75} onChange={(e) => setSt({ deductorName: e.target.value })} error={fields.deductorName} />
          <Input label={t("settings.statutory.tan")} value={st.tan} maxLength={10} onChange={(e) => setSt({ tan: e.target.value.toUpperCase() })} error={fields.tan} />
          <Input label={t("settings.statutory.pan")} value={st.pan} maxLength={10} onChange={(e) => setSt({ pan: e.target.value.toUpperCase() })} error={fields.pan} />
          <Input containerClassName="sm:col-span-2 lg:col-span-3" label={t("settings.statutory.address")} value={st.address} maxLength={200} onChange={(e) => setSt({ address: e.target.value })} error={fields.address} />
          <Input label={t("settings.statutory.responsibleName")} value={st.responsibleName} maxLength={75} onChange={(e) => setSt({ responsibleName: e.target.value })} />
          <Input label={t("settings.statutory.responsibleDesignation")} value={st.responsibleDesignation} maxLength={50} onChange={(e) => setSt({ responsibleDesignation: e.target.value })} />
          <Input label={t("settings.statutory.ddoCode")} value={st.ddoCode} maxLength={20} onChange={(e) => setSt({ ddoCode: e.target.value.toUpperCase() })} />
          <Input label={t("settings.statutory.ddoRegNo")} value={st.ddoRegNo} maxLength={20} onChange={(e) => setSt({ ddoRegNo: e.target.value.toUpperCase() })} />
          <Input label={t("settings.statutory.epfCode")} value={st.epfCode} maxLength={30} onChange={(e) => setSt({ epfCode: e.target.value.toUpperCase() })} />
          <Input label={t("settings.statutory.esicCode")} value={st.esicCode} maxLength={30} onChange={(e) => setSt({ esicCode: e.target.value })} />
          <div className="space-y-3 sm:col-span-2 lg:col-span-3">
            <Switch label={t("settings.statutory.metroHra")} hint={t("settings.statutory.metroHraHint")} checked={st.metroHra} onChange={(v) => setSt({ metroHra: v })} />
            <Switch label={t("settings.statutory.professionalTax")} hint={t("settings.statutory.professionalTaxHint")} checked={st.professionalTax} onChange={(v) => setSt({ professionalTax: v })} />
          </div>
          {st.professionalTax && (
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <p className="text-[0.8125rem] font-medium text-ink-2">{t("settings.statutory.ptSlabs")}</p>
              {st.ptSlabs.map((slab, i) => (
                <div key={i} className="flex items-end gap-2">
                  <Input containerClassName="flex-1" label={t("settings.statutory.ptUpTo")} inputMode="numeric" value={slab.upTo ?? ""} onChange={(e) => setSt({ ptSlabs: st.ptSlabs.map((x, j) => (j === i ? { ...x, upTo: e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, "")) } : x)) })} />
                  <Input containerClassName="flex-1" label={t("settings.statutory.ptAmount")} inputMode="numeric" value={slab.amount} onChange={(e) => setSt({ ptSlabs: st.ptSlabs.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value.replace(/\D/g, "")) } : x)) })} />
                  <Button variant="ghost" onClick={() => setSt({ ptSlabs: st.ptSlabs.filter((_, j) => j !== i) })}>{t("common.remove")}</Button>
                </div>
              ))}
              {st.ptSlabs.length < 10 && <Button size="sm" onClick={() => setSt({ ptSlabs: [...st.ptSlabs, { upTo: null, amount: 0 }] })}>{t("settings.statutory.addSlab")}</Button>}
            </div>
          )}
        </CardBody>
        {footer("statutory")}
      </Card>

      <Card id="bank" className="scroll-mt-24">
        <CardHeader icon={<Banknote />} title={t("settings.bank.title")} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Input containerClassName="sm:col-span-2" label={t("settings.bank.bankName")} value={s.bank.name} onChange={(e) => patch("bank", { name: e.target.value })} />
          <Input label={t("settings.bank.debitAccountLast4")} hint={t("settings.bank.debitAccountHint")} inputMode="numeric" maxLength={4} value={s.bank.debitAccountLast4} onChange={(e) => patch("bank", { debitAccountLast4: e.target.value.replace(/\D/g, "").slice(0, 4) })} error={fields.debitAccountLast4} />
          <Input label={t("settings.bank.ifsc")} value={s.bank.ifsc} onChange={(e) => patch("bank", { ifsc: e.target.value.toUpperCase().slice(0, 11) })} error={fields.ifsc} />
          <Select label={t("settings.bank.format")} value={s.bank.format} onChange={(e) => patch("bank", { format: e.target.value as AllSettings["bank"]["format"] })}>
            {BANK_FORMATS.map((f) => (
              <option key={f} value={f}>{t(`settings.bank.formats.${f}`)}</option>
            ))}
          </Select>
          <Select label={t("settings.bank.fileType")} value={s.bank.fileType} onChange={(e) => patch("bank", { fileType: e.target.value as AllSettings["bank"]["fileType"] })}>
            <option value="XLSX">{t("settings.bank.xlsx")}</option>
            <option value="TEXT">{t("settings.bank.text")}</option>
          </Select>
        </CardBody>
        {footer("bank")}
      </Card>

      <Card id="sms" className="scroll-mt-24">
        <CardHeader icon={<MessageSquareText />} title={t("settings.sms.title")} description={t("settings.sms.hint")} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Select label={t("settings.sms.provider")} value={s.sms.provider} onChange={(e) => patch("sms", { provider: e.target.value as "console" | "http" })}>
            <option value="console">{t("settings.sms.console")}</option>
            <option value="http">{t("settings.sms.http")}</option>
          </Select>
          <Select label={t("settings.sms.method")} value={s.sms.method} onChange={(e) => patch("sms", { method: e.target.value as "GET" | "POST" })}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </Select>
          <Input containerClassName="sm:col-span-2" label={t("settings.sms.url")} hint={t("settings.sms.urlHint")} value={s.sms.url} onChange={(e) => patch("sms", { url: e.target.value })} error={fields.url} />
          <Input label={t("settings.sms.senderId")} maxLength={6} value={s.sms.senderId} onChange={(e) => patch("sms", { senderId: e.target.value.toUpperCase() })} />
          <Input label={t("settings.sms.dltEntityId")} value={s.sms.dltEntityId} onChange={(e) => patch("sms", { dltEntityId: e.target.value })} />
          <Input containerClassName="sm:col-span-2" label={t("settings.sms.apiKeyEnv")} hint={t("settings.sms.apiKeyEnvHint")} value={s.sms.apiKeyEnv} onChange={(e) => patch("sms", { apiKeyEnv: e.target.value.toUpperCase() })} error={fields.apiKeyEnv} />
          {(["otp", "approveOtp", "payslip", "pensionSlip", "lifeCertificate", "welcome", "alert"] as const).map((k) => (
            <Input key={k} label={t(`settings.sms.template.${k}`)} value={s.sms.templates[k]} onChange={(e) => patch("sms", { templates: { ...s.sms.templates, [k]: e.target.value.trim() } })} />
          ))}
        </CardBody>
        {footer("sms")}
      </Card>

      <Card id="email" className="scroll-mt-24">
        <CardHeader icon={<Mail />} title={t("settings.email.title")} description={t("settings.email.hint")} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Input label={t("settings.email.fromName")} value={s.email.fromName} onChange={(e) => patch("email", { fromName: e.target.value })} />
          <Input type="email" label={t("settings.email.fromAddress")} value={s.email.fromAddress} onChange={(e) => patch("email", { fromAddress: e.target.value.trim() })} error={fields.fromAddress} />
          <Input label={t("settings.email.smtpHost")} value={s.email.smtpHost} onChange={(e) => patch("email", { smtpHost: e.target.value.trim() })} />
          <Input type="number" label={t("settings.email.smtpPort")} value={s.email.smtpPort} onChange={(e) => patch("email", { smtpPort: Number(e.target.value) })} />
          <Input label={t("settings.email.userEnv")} value={s.email.userEnv} onChange={(e) => patch("email", { userEnv: e.target.value.toUpperCase() })} error={fields.userEnv} />
          <Input label={t("settings.email.passwordEnv")} value={s.email.passwordEnv} onChange={(e) => patch("email", { passwordEnv: e.target.value.toUpperCase() })} error={fields.passwordEnv} />
          <div className="sm:col-span-2">
            <Switch label={t("settings.email.secure")} checked={s.email.secure} onChange={(v) => patch("email", { secure: v })} />
          </div>
        </CardBody>
        {footer("email")}
      </Card>

      <Card id="documents" className="xl:col-span-2 scroll-mt-24">
        <CardHeader icon={<FileStack />} title={t("settings.docTypes")} description={t("settings.docTypesHint")} />
        <CardBody className="space-y-2">
          <div className="hidden grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_7rem_6rem_6rem] gap-2 text-xs font-semibold uppercase tracking-wide text-muted md:grid">
            <span>{t("settings.docCode")}</span>
            <span>{t("settings.docName")}</span>
            <span>{t("settings.docNameHi")}</span>
            <span>{t("settings.docMaxMb")}</span>
            <span>{t("settings.docActive")}</span>
            <span />
          </div>
          {s.documents.types.map((d, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-xl p-3 ring-1 ring-line md:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_7rem_6rem_6rem] md:items-start md:p-0 md:ring-0">
              <Input aria-label={t("settings.docCode")} value={d.code} disabled={savedCodes.has(d.code)} onChange={(e) => setDocType(i, { code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })} className="font-mono text-sm" />
              <Input aria-label={t("settings.docName")} value={d.name} onChange={(e) => setDocType(i, { name: e.target.value })} />
              <Input aria-label={t("settings.docNameHi")} value={d.nameHi} lang="hi" onChange={(e) => setDocType(i, { nameHi: e.target.value })} />
              <Input aria-label={t("settings.docMaxMb")} type="number" min={1} max={50} value={d.maxMb} onChange={(e) => setDocType(i, { maxMb: Number(e.target.value) || 1 })} />
              <Checkbox label={t("settings.docActive")} checked={d.active} onChange={(e) => setDocType(i, { active: e.target.checked })} />
              {!savedCodes.has(d.code) ? <Button variant="ghost" onClick={() => patch("documents", { types: s.documents.types.filter((_, k) => k !== i) })}>{t("common.remove")}</Button> : <span />}
            </div>
          ))}
          {fields.types && <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{fields.types}</p>}
          <Button size="sm" onClick={() => patch("documents", { types: [...s.documents.types, { code: "", name: "", nameHi: "", maxMb: 5, active: true }] })}>{t("settings.addDocType")}</Button>
        </CardBody>
        {footer("documents")}
      </Card>

      <Card id="payslip" className="scroll-mt-24">
        <CardHeader icon={<FileText />} title={t("settings.payslip.title")} />
        <CardBody className="space-y-4">
          <Textarea label={t("settings.payslip.footer")} rows={2} value={s.payslip.footer} onChange={(e) => patch("payslip", { footer: e.target.value })} />
          <Switch label={t("settings.payslip.showLeave")} checked={s.payslip.showLeave} onChange={(v) => patch("payslip", { showLeave: v })} />
        </CardBody>
        {footer("payslip")}
      </Card>
    </div>
  );
}
