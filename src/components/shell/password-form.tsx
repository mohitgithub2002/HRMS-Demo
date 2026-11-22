"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/core/i18n/client";
import { checkPassword } from "@/core/password-policy";
import { api, ApiError } from "@/lib/api-client";

/** Current password, new password twice. Used at first sign-in, in My profile and in the platform console. */
export function PasswordForm({ endpoint, then }: { endpoint: string; then?: string }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const f: Record<string, string> = {};
    if (checkPassword(next).length) f.next = t("validation.passwordRules");
    if (next !== repeat) f.repeat = t("validation.passwordsDiffer");
    setFields(f);
    if (Object.keys(f).length) return;
    setBusy(true);
    try {
      await api(endpoint, { body: { current, next } });
      toast(t("auth.passwordChanged"));
      setCurrent("");
      setNext("");
      setRepeat("");
      if (then) {
        router.replace(then);
        router.refresh();
      }
    } catch (err) {
      if (err instanceof ApiError) setFields(err.fields);
      toast(err instanceof Error ? err.message : t("errors.generic"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input label={t("auth.currentPassword")} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={fields.current} required />
      <Input label={t("auth.newPassword")} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} hint={t("validation.passwordRules")} error={fields.next} required />
      <Input label={t("auth.repeatPassword")} type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} error={fields.repeat} required />
      <Button type="submit" variant="primary" className="w-full" size="lg" loading={busy} disabled={!current || !next || !repeat}>
        {t("auth.changePassword")}
      </Button>
    </form>
  );
}
