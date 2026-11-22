"use client";

import { Pencil, Plus, Receipt } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { useI18n } from "@/core/i18n/client";
import { useAction } from "@/lib/use-action";

interface Row {
  id: string;
  code: string;
  name: string;
  nameHi: string;
  payLevel: string;
  group: string;
  retirementAge: number;
  isActive: boolean;
}

const EMPTY: Omit<Row, "id"> = { code: "", name: "", nameHi: "", payLevel: "", group: "C", retirementAge: 60, isActive: true };

export function PostsTable({ rows }: { rows: Row[] }) {
  const { t, locale } = useI18n();
  const { run, busy, fields, setFields } = useAction();
  const [edit, setEdit] = useState<(Omit<Row, "id"> & { id?: string }) | null>(null);

  async function save() {
    if (!edit) return;
    const { id, ...body } = edit;
    const r = await run(id ? `/api/v1/org/posts/${id}` : "/api/v1/org/posts", body, { method: id ? "PUT" : "POST" });
    if (r) setEdit(null);
  }

  return (
    <Card>
      <CardHeader title={`${rows.filter((r) => r.isActive).length} ${t("posts.title").toLowerCase()}`} actions={<Button variant="primary" icon={<Plus />} onClick={() => (setFields({}), setEdit({ ...EMPTY }))}>{t("posts.add")}</Button>} />
      {rows.length === 0 ? (
        <EmptyState icon={<Receipt />} title={t("posts.empty")} />
      ) : (
        <Table stack>
          <THead>
            <tr>
              <Th>{t("common.name")}</Th>
              <Th>{t("common.code")}</Th>
              <Th align="center">{t("posts.payLevel")}</Th>
              <Th align="center">{t("posts.group")}</Th>
              <Th align="center">{t("posts.retirementAge")}</Th>
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
                <Td label={t("posts.payLevel")} align="center"><Badge tone="brand">L{r.payLevel}</Badge></Td>
                <Td label={t("posts.group")} align="center">{r.group}</Td>
                <Td label={t("posts.retirementAge")} align="center" className="tabular">{r.retirementAge}</Td>
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
        title={edit?.id ? edit.name : t("posts.add")}
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
            <Input label={t("common.code")} value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} error={fields.code} required />
            <Input label={t("posts.payLevel")} value={edit.payLevel} onChange={(e) => setEdit({ ...edit, payLevel: e.target.value })} error={fields.payLevel} required />
            <Select label={t("posts.group")} value={edit.group} onChange={(e) => setEdit({ ...edit, group: e.target.value })}>
              {["A", "B", "C", "D"].map((g) => <option key={g}>{g}</option>)}
            </Select>
            <Input type="number" min={50} max={70} label={t("posts.retirementAge")} value={edit.retirementAge} onChange={(e) => setEdit({ ...edit, retirementAge: Number(e.target.value) })} error={fields.retirementAge} />
            {edit.id && <Checkbox label={t("common.active")} checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} />}
          </div>
        )}
      </Dialog>
    </Card>
  );
}
