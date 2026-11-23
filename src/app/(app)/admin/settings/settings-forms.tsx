"use client";

import { Banknote, Clock, FileText, Landmark, ShieldCheck, Workflow } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Input, Select, Switch, Textarea } from "@/components/ui/field";
import { useT } from "@/core/i18n/client";
import type { AllSettings } from "@/modules/settings/store";
import type { SettingKey } from "@/modules/settings/schema";
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

      <Card id="statutoryIds" className="scroll-mt-24">
        <CardHeader icon={<Landmark />} title={t("settings.statutoryIds.title")} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          {(["tan", "pan", "ddoCode", "ddoRegNo", "pfCode", "esicCode", "ptState"] as const).map((k) => (
            <Input key={k} label={t(`settings.statutoryIds.${k}`)} value={s.statutoryIds[k]} onChange={(e) => patch("statutoryIds", { [k]: k === "ptState" ? e.target.value : e.target.value.toUpperCase() })} error={fields[k]} />
          ))}
        </CardBody>
        {footer("statutoryIds")}
      </Card>

      <Card id="bank" className="scroll-mt-24">
        <CardHeader icon={<Banknote />} title={t("settings.bank.title")} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Input containerClassName="sm:col-span-2" label={t("settings.bank.bankName")} value={s.bank.bankName} onChange={(e) => patch("bank", { bankName: e.target.value })} />
          <Input label={t("settings.bank.accountNumber")} inputMode="numeric" value={s.bank.accountNumber} onChange={(e) => patch("bank", { accountNumber: e.target.value.replace(/\s/g, "") })} />
          <Input label={t("settings.bank.ifsc")} value={s.bank.ifsc} onChange={(e) => patch("bank", { ifsc: e.target.value.toUpperCase().slice(0, 11) })} />
          <Select containerClassName="sm:col-span-2" label={t("settings.bank.format")} value={s.bank.format} onChange={(e) => patch("bank", { format: e.target.value as AllSettings["bank"]["format"] })}>
            <option value="GENERIC">Generic (CSV)</option>
            <option value="SBI_CMP">SBI CMP</option>
            <option value="PNB">PNB</option>
            <option value="BOB">Bank of Baroda</option>
            <option value="CANARA">Canara Bank</option>
          </Select>
        </CardBody>
        {footer("bank")}
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
