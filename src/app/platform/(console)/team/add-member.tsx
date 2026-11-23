"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/core/i18n/client";
import { api, ApiError } from "@/lib/api-client";

export function AddMember() {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "", role: "SUPPORT" });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    try {
      const r = await api<{ password: string }>("/api/platform/team", { body: f });
      setPassword(r.password);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError) setFields(e.fields);
      toast(e instanceof Error ? e.message : t("errors.generic"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="primary" icon={<UserPlus />} onClick={() => setOpen(true)}>{t("platform.team.add")}</Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setPassword(null);
        }}
        title={t("platform.team.add")}
        footer={password ? <Button variant="primary" onClick={() => (setOpen(false), setPassword(null))}>{t("common.done")}</Button> : <Button variant="primary" loading={busy} onClick={save}>{t("common.save")}</Button>}
      >
        {password ? (
          <p className="text-sm text-ink-2">{t("platform.team.created", { password })}</p>
        ) : (
          <div className="space-y-4">
            <Input label={t("common.name")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={fields.name} required />
            <Input label={t("platform.email")} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={fields.email} required />
            <Select label={t("platform.team.role")} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} hint={f.role === "OWNER" ? t("platform.team.OWNER_hint") : t("platform.team.SUPPORT_hint")}>
              <option value="SUPPORT">{t("platform.team.SUPPORT")}</option>
              <option value="OWNER">{t("platform.team.OWNER")}</option>
            </Select>
          </div>
        )}
      </Dialog>
    </>
  );
}
