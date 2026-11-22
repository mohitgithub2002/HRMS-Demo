"use client";

import { Briefcase, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { useI18n } from "@/core/i18n/client";
import { tDynamic } from "@/i18n";
import { useAction } from "@/lib/use-action";
import { WeekdayPicker } from "../weekday-picker";

interface Row {
  id: string;
  code: string;
  name: string;
  nameHi: string;
  attendanceMode: "DEVICE" | "MANUAL";
  weeklyOff: string;
  isActive: boolean;
}

const EMPTY: Omit<Row, "id"> = { code: "", name: "", nameHi: "", attendanceMode: "DEVICE", weeklyOff: "", isActive: true };

export function SectionsTable({ rows }: { rows: Row[] }) {
  const { t, locale } = useI18n();
  const { run, busy, fields, setFields } = useAction();
  const [edit, setEdit] = useState<(Omit<Row, "id"> & { id?: string }) | null>(null);
  const days = (v: string) => (v ? v.split(",").map((d) => tDynamic(t, `settings.weekday.${d}`)).join(", ") : t("sections.sameAsOrg"));

  async function save() {
    if (!edit) return;
    const { id, ...body } = edit;
    const r = await run(id ? `/api/v1/org/sections/${id}` : "/api/v1/org/sections", body, { method: id ? "PUT" : "POST" });
    if (r) setEdit(null);
  }

  return (
    <Card>
      <CardHeader title={`${rows.filter((r) => r.isActive).length} ${t("sections.title").toLowerCase()}`} actions={<Button variant="primary" icon={<Plus />} onClick={() => (setFields({}), setEdit({ ...EMPTY }))}>{t("sections.add")}</Button>} />
      {rows.length === 0 ? (
        <EmptyState icon={<Briefcase />} title={t("sections.empty")} />
      ) : (
        <Table stack>
          <THead>
            <tr>
              <Th>{t("common.name")}</Th>
              <Th>{t("common.code")}</Th>
              <Th>{t("sections.mode")}</Th>
              <Th>{t("sections.weeklyOff")}</Th>
              <Th>{t("common.status")}</Th>
              <Th align="right"><span className="sr-only">{t("common.actions")}</span></Th>
            </tr>
          </THead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td>
                  <span className="block font-semibold text-ink">{locale === "hi" && r.nameHi ? r.nameHi : r.name}</span>
                  {locale !== "hi" && r.nameHi && <span className="block text-xs text-muted" lang="hi">{r.nameHi}</span>}
                </Td>
                <Td label={t("common.code")}><code className="text-xs tracking-wider">{r.code}</code></Td>
                <Td label={t("sections.mode")}>{tDynamic(t, `sections.${r.attendanceMode}`)}</Td>
                <Td label={t("sections.weeklyOff")} className="text-muted">{days(r.weeklyOff)}</Td>
                <Td label={t("common.status")}><Badge tone={r.isActive ? "success" : "neutral"} dot>{r.isActive ? t("common.active") : t("common.inactive")}</Badge></Td>
                <Td actions align="right">
                  <div className="flex justify-end">
                    <Button size="sm" variant="ghost" icon={<Pencil />} onClick={() => (setFields({}), setEdit({ ...r }))}>{t("common.edit")}</Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <Dialog
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        title={edit?.id ? edit.name : t("sections.add")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEdit(null)}>{t("common.cancel")}</Button>
            <Button variant="primary" loading={busy} onClick={save}>{t("common.save")}</Button>
          </>
        }
      >
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input containerClassName="sm:col-span-2" label={t("common.name")} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} error={fields.name} required autoFocus />
            <Input label={t("common.nameHi")} optionalLabel={t("common.optional")} value={edit.nameHi} onChange={(e) => setEdit({ ...edit, nameHi: e.target.value })} lang="hi" />
            <Input label={t("common.code")} value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} error={fields.code} required hint={t("validation.code")} />
            <Select containerClassName="sm:col-span-2" label={t("sections.mode")} value={edit.attendanceMode} onChange={(e) => setEdit({ ...edit, attendanceMode: e.target.value as Row["attendanceMode"] })}>
              <option value="DEVICE">{t("sections.DEVICE")}</option>
              <option value="MANUAL">{t("sections.MANUAL")}</option>
            </Select>
            <div className="sm:col-span-2">
              <WeekdayPicker label={t("sections.weeklyOff")} value={edit.weeklyOff} onChange={(v) => setEdit({ ...edit, weeklyOff: v })} allowEmpty={t("sections.sameAsOrg")} />
            </div>
            {edit.id && <Checkbox label={t("common.active")} checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} />}
          </div>
        )}
      </Dialog>
    </Card>
  );
}
