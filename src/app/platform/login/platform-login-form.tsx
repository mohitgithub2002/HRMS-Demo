"use client";

import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { OtpInput } from "@/components/ui/otp-input";
import { useT } from "@/core/i18n/client";
import { api, ApiError } from "@/lib/api-client";

type Step = { step: "otp"; to: string; devCode?: string } | { step: "done" };

export function PlatformLoginForm() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState<{ to: string; devCode?: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handle = (r: Step) => {
    if (r.step === "otp") setOtp({ to: r.to, devCode: r.devCode });
    else {
      router.replace("/platform");
      router.refresh();
    }
  };
  const fail = (e: unknown) => {
    if (e instanceof ApiError) {
      setFields(e.fields);
      setError(Object.keys(e.fields).length ? null : e.message);
    } else setError(t("errors.generic"));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFields({});
    setError(null);
    try {
      handle(otp ? await api<Step>("/api/platform/auth/otp", { body: { code } }) : await api<Step>("/api/platform/auth/login", { body: { email, password } }));
    } catch (err) {
      fail(err);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800">{error}</p>}
      {otp ? (
        <>
          <p className="text-sm text-muted">{t("auth.otpSentTo", { to: otp.to })}</p>
          {otp.devCode && <p className="rounded-xl border border-gold-200 bg-gold-50 px-3.5 py-2.5 text-sm text-gold-800">{t("auth.devOtp", { code: otp.devCode })}</p>}
          <OtpInput value={code} onChange={setCode} label={t("auth.otp")} invalid={Boolean(fields.code)} />
          {fields.code && <p className="text-xs font-medium text-rose-600" role="alert">{fields.code}</p>}
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy} disabled={code.length !== 6}>
            {t("auth.verify")}
          </Button>
        </>
      ) : (
        <>
          <Input label={t("platform.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} leading={<Mail />} autoComplete="username" autoFocus required error={fields.email} />
          <Input label={t("auth.password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} leading={<KeyRound />} autoComplete="current-password" required error={fields.password} />
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy} disabled={!email || !password}>
            {t("auth.signIn")} <ArrowRight />
          </Button>
        </>
      )}
    </form>
  );
}
