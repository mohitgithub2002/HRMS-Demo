"use client";

import { KeyRound, Pencil, Power, UserPlus } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { ROLE_DEFS, rolesForLogin, SIMPLE_ROLES, type SimpleRole } from "@/core/auth/roles";
import { formatDateTime } from "@/core/dates";
import { useI18n } from "@/core/i18n/client";
import { tDynamic } from "@/i18n";
import { useAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  loginId: string;
  name: string;
  mobile: string;
  email: string;
  loginType: "ADMIN" | "HR_ACCOUNTS" | "EMPLOYEE";
  permissions: string[];
  role: SimpleRole | "OTHER";
  status: "ACTIVE" | "DISABLED";
  lastLoginAt: string | null;
  locked: boolean;
}

function RolePicker({ value, onChange, choices }: { value: SimpleRole | null; onChange: (r: SimpleRole) => void; choices: readonly SimpleRole[] }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t("users.role")}>
      {choices.map((r) => (
        <button key={r} type="button" role="radio" aria-checked={value === r} onClick={() => onChange(r)} className={cn("rounded-xl p-3 text-left ring-1 transition", value === r ? "bg-brand-50/70 ring-2 ring-brand-500 dark:bg-brand-950/40" : "bg-surface ring-line hover:ring-line-strong")}>
          <span className="block text-sm font-semibold text-ink">{tDynamic(t, `role.${r}`)}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">{tDynamic(t, `role.hint.${r}`)}</span>
        </button>
      ))}
    </div>
  );
}

export function UsersTable({ rows, me }: { rows: Row[]; me: string }) {
  const { t, locale } = useI18n();
  const { run, busy, fields, setFields } = useAction();
  const [add, setAdd] = useState<{ loginId: string; name: string; mobile: string; email: string; role: SimpleRole | null } | null>(null);
  const [edit, setEdit] = useState<{ row: Row; role: SimpleRole | null } | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  async function create() {
    if (!add?.role) return setFields({ role: t("validation.required") });
    const r = await run<{ password: string }>("/api/v1/users", { ...add }, { success: false });
    if (r) {
      setAdd(null);
      setSecret(t("users.created", { password: r.password }));
    }
  }

  return (
    <Card>
      <CardHeader
        title={t("users.countActive", { n: rows.filter((r) => r.status === "ACTIVE").length })}
        actions={<Button variant="primary" icon={<UserPlus />} onClick={() => (setFields({}), setAdd({ loginId: "", name: "", mobile: "", email: "", role: null }))}>{t("users.add")}</Button>}
      />
      <Table stack>
        <THead>
          <tr>
            <Th>{t("users.name")}</Th>
            <Th>{t("users.role")}</Th>
            <Th>{t("users.mobile")}</Th>
            <Th>{t("users.lastLogin")}</Th>
            <Th>{t("users.status")}</Th>
            <Th align="right"><span className="sr-only">{t("common.actions")}</span></Th>
          </tr>
        </THead>
        <tbody>
          {rows.map((r) => (
            <Tr key={r.id} className={r.status === "DISABLED" ? "opacity-60" : undefined}>
              <Td>
                <span className="flex items-center gap-3">
                  <Avatar name={r.name} size="sm" />
                  <span>
                    <span className="block font-semibold text-ink">{r.name}{r.id === me && <span className="ml-1.5 text-xs font-normal text-muted">({t("users.you")})</span>}</span>
                    <span className="block text-xs tracking-wide text-muted">{r.loginId}</span>
                  </span>
                </span>
              </Td>
              <Td label={t("users.role")}>
                <span className="inline-flex flex-col items-end gap-1 sm:items-start">
                  <Badge tone={r.role === "ADMIN" ? "gold" : r.role === "EMPLOYEE" ? "neutral" : "brand"}>{tDynamic(t, `role.${r.role}`)}</Badge>
                  {r.role === "OTHER" && <span className="text-xs text-muted">{r.permissions.map((p) => tDynamic(t, `permission.${p}`)).join(", ")}</span>}
                </span>
              </Td>
              <Td label={t("users.mobile")} className="tabular text-muted">{r.mobile || "—"}</Td>
              <Td label={t("users.lastLogin")} className="text-muted">{r.lastLoginAt ? formatDateTime(r.lastLoginAt, locale) : t("users.never")}</Td>
              <Td label={t("users.status")}>
                <Badge tone={r.status === "ACTIVE" ? (r.locked ? "warning" : "success") : "neutral"} dot>{r.status === "ACTIVE" ? t("common.active") : t("common.off")}</Badge>
              </Td>
              <Td actions align="right">
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" icon={<Pencil />} onClick={() => (setFields({}), setEdit({ row: r, role: r.role === "OTHER" ? null : r.role }))}>{t("users.edit")}</Button>
                  <Button size="sm" variant="ghost" icon={<KeyRound />} aria-label={t("users.resetPassword")} title={t("users.resetPassword")} onClick={async () => {
                    const res = await run<{ password: string; name: string }>(`/api/v1/users/${r.id}/reset`, {}, { success: false });
                    if (res) setSecret(t("users.resetDone", { name: res.name, password: res.password }));
                  }} />
                  {r.id !== me && (
                    <Button size="sm" variant="ghost" icon={<Power />} aria-label={r.status === "ACTIVE" ? t("users.disable") : t("users.enable")} title={r.status === "ACTIVE" ? t("users.disable") : t("users.enable")} onClick={() => run(`/api/v1/users/${r.id}`, { status: r.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }, { method: "PATCH" })} />
                  )}
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>

      <Dialog open={Boolean(add)} onClose={() => setAdd(null)} title={t("users.add")} size="lg" footer={<><Button variant="ghost" onClick={() => setAdd(null)}>{t("common.cancel")}</Button><Button variant="primary" loading={busy} onClick={create}>{t("common.save")}</Button></>}>
        {add && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t("users.name")} value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} error={fields.name} required autoFocus />
              <Input label={t("users.loginId")} hint={t("users.loginIdHint")} value={add.loginId} onChange={(e) => setAdd({ ...add, loginId: e.target.value.toUpperCase() })} error={fields.loginId} required />
              <Input label={t("users.mobile")} inputMode="numeric" value={add.mobile} onChange={(e) => setAdd({ ...add, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} error={fields.mobile} />
              <Input label={t("users.email")} optionalLabel={t("common.optional")} type="email" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} error={fields.email} />
            </div>
            <div>
              <p className="mb-2 text-[0.8125rem] font-medium text-ink-2">{t("users.role")}</p>
              <RolePicker value={add.role} onChange={(role) => setAdd({ ...add, role })} choices={SIMPLE_ROLES} />
              {fields.role && <p className="mt-2 text-xs font-medium text-rose-600">{fields.role}</p>}
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.row.name ?? ""} description={edit ? `${edit.row.loginId} · ${tDynamic(t, `loginType.${edit.row.loginType}`)}` : undefined} size="lg" footer={<><Button variant="ghost" onClick={() => setEdit(null)}>{t("common.cancel")}</Button><Button variant="primary" loading={busy} disabled={!edit?.role} onClick={async () => {
        if (!edit?.role) return;
        if (await run(`/api/v1/users/${edit.row.id}`, { role: edit.role }, { method: "PATCH" }) !== undefined) setEdit(null);
      }}>{t("common.save")}</Button></>}>
        {edit && <RolePicker value={edit.role} onChange={(role) => setEdit({ ...edit, role })} choices={rolesForLogin(edit.row.loginType)} />}
        {edit && edit.role && <p className="mt-4 text-xs text-muted">{t("users.permissions")}: {ROLE_DEFS[edit.role].permissions.map((p) => tDynamic(t, `permission.${p}`)).join(", ") || "—"}</p>}
      </Dialog>

      <Dialog open={Boolean(secret)} onClose={() => setSecret(null)} title={t("users.resetPassword")} footer={<Button variant="primary" onClick={() => setSecret(null)}>{t("common.done")}</Button>}>
        <p className="text-sm leading-relaxed text-ink-2">{secret}</p>
      </Dialog>
    </Card>
  );
}
