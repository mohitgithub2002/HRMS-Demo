"use client";

import { ArrowLeft, ArrowRight, Building2, Eye, EyeOff, KeyRound, Smartphone, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { OtpInput } from "@/components/ui/otp-input";
import { Segmented } from "@/components/ui/segmented";
import { useI18n } from "@/core/i18n/client";
import { api, ApiError } from "@/lib/api-client";

interface Org {
  code: string;
  name: string;
  nameHi: string | null;
  accentColor: string | null;
  usable: boolean;
}

type Step = { step: "otp"; to: string; devCode?: string } | { step: "done"; mustChangePassword: boolean };

/**
 * Sign-in in three short moves: which organisation (remembered, or fixed by /o/CODE), who you are, then the code
 * sent to your mobile. Employees and pensioners may skip the password and use the mobile code alone.
 */
export function LoginForm({ initialOrg, fixedOrg, expired }: { initialOrg: Org | null; fixedOrg?: boolean; expired?: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(initialOrg);
  const [orgCode, setOrgCode] = useState(initialOrg?.code ?? "");
  const [mode, setMode] = useState<"password" | "mobile">("password");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState<{ to: string; devCode?: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(expired ? t("auth.signedOutIdle") : null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const fail = (e: unknown) => {
    if (e instanceof ApiError) {
      setFields(e.fields);
      const first = Object.values(e.fields)[0];
      setError(first && Object.keys(e.fields).length === 1 ? null : e.message);
    } else setError(t("errors.generic"));
  };

  const finish = (r: Step) => {
    if (r.step === "otp") {
      setOtp({ to: r.to, devCode: r.devCode });
      setCode("");
      setCooldown(30);
      return;
    }
    router.replace(r.mustChangePassword ? "/welcome/password" : "/");
    router.refresh();
  };

  async function findOrg(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const found = await api<Org>(`/api/v1/auth/org?code=${encodeURIComponent(orgCode.trim())}`);
      if (!found.usable) setError(t("errors.orgSuspended"));
      else setOrg(found);
    } catch {
      setFields({ org: t("auth.unknownOrg") });
    } finally {
      setBusy(false);
    }
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const body = mode === "password" ? { org: org.code, loginId, password } : { org: org.code, mobile };
      finish(await api<Step>("/api/v1/auth/login", { body }));
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    if (code.length !== 6) return;
    setBusy(true);
    setError(null);
    setFields({});
    try {
      finish(await api<Step>("/api/v1/auth/otp", { body: { code } }));
    } catch (err) {
      fail(err);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      const r = await api<Step>("/api/v1/auth/otp/resend", { body: {} });
      if (r.step === "otp") setOtp({ to: r.to, devCode: r.devCode });
      setCooldown(30);
    } catch (err) {
      fail(err);
    }
  }

  const orgName = org ? (locale === "hi" && org.nameHi ? org.nameHi : org.name) : "";
  const errorBox = error && (
    <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      {error}
    </p>
  );

  // Step 1 — the organisation.
  if (!org) {
    return (
      <form onSubmit={findOrg} className="space-y-6" noValidate>
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-gold-600 dark:text-gold-300">{t("auth.welcome")}</p>
          <h2 className="mt-2 font-display text-[2rem] leading-tight font-medium text-ink">{t("common.appName")}</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{t("auth.signInSubtitle")}</p>
        </div>
        {errorBox}
        <Input
          label={t("auth.orgCode")}
          hint={t("auth.orgCodeHint")}
          value={orgCode}
          onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
          leading={<Building2 />}
          autoComplete="organization"
          autoCapitalize="characters"
          autoFocus
          required
          error={fields.org}
          className="tracking-[0.12em] uppercase"
        />
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy} disabled={orgCode.trim().length < 2}>
          {t("common.continue")}
          <ArrowRight />
        </Button>
      </form>
    );
  }

  // Step 3 — the code.
  if (otp) {
    return (
      <form onSubmit={verify} className="space-y-6" noValidate>
        <button type="button" onClick={() => setOtp(null)} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> {t("common.back")}
        </button>
        <div>
          <h2 className="font-display text-[1.75rem] leading-tight font-medium text-ink">{t("auth.otpTitle")}</h2>
          <p className="mt-2 text-[0.9375rem] text-muted">{t("auth.otpSentTo", { to: otp.to })}</p>
        </div>
        {otp.devCode && (
          <p className="rounded-xl border border-gold-200 bg-gold-50 px-3.5 py-2.5 text-sm text-gold-800 dark:border-gold-800 dark:bg-gold-900/30 dark:text-gold-200">
            {t("auth.devOtp", { code: otp.devCode })}
          </p>
        )}
        {errorBox}
        <div>
          <OtpInput value={code} onChange={setCode} label={t("auth.otp")} invalid={Boolean(fields.code)} disabled={busy} />
          {fields.code && <p className="mt-2 text-xs font-medium text-rose-600" role="alert">{fields.code}</p>}
        </div>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy} disabled={code.length !== 6}>
          {t("auth.verify")}
        </Button>
        <p className="text-center text-sm text-muted">
          {cooldown > 0 ? (
            t("auth.resendIn", { s: cooldown })
          ) : (
            <button type="button" onClick={resend} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
              {t("auth.resend")}
            </button>
          )}
        </p>
      </form>
    );
  }

  // Step 2 — who you are.
  return (
    <form onSubmit={signIn} className="space-y-6" noValidate>
      <div>
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 shadow-card">
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: org.accentColor ?? "var(--color-brand-700)" }}>
              <Building2 className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{orgName}</span>
              <span className="block text-xs tracking-[0.12em] text-muted">{org.code}</span>
            </span>
          </span>
          {!fixedOrg && (
            <button type="button" onClick={() => setOrg(null)} className="shrink-0 text-xs font-medium text-brand-700 hover:underline dark:text-brand-300">
              {t("auth.changeOrg")}
            </button>
          )}
        </div>
        <h2 className="font-display text-[1.75rem] leading-tight font-medium text-ink">{t("auth.signInTo", { org: org.code })}</h2>
      </div>
      <Segmented
        label={t("auth.signIn")}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setFields({});
          setError(null);
        }}
        className="w-full [&>button]:flex-1"
        options={[
          { value: "password", label: t("auth.withPassword") },
          { value: "mobile", label: t("auth.withMobileOtp") },
        ]}
      />
      {errorBox}
      {mode === "password" ? (
        <div className="space-y-4">
          <Input label={t("auth.loginId")} value={loginId} onChange={(e) => setLoginId(e.target.value)} leading={<UserRound />} autoComplete="username" autoCapitalize="characters" autoFocus required error={fields.loginId} />
          <Input
            label={t("auth.password")}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leading={<KeyRound />}
            autoComplete="current-password"
            required
            error={fields.password}
            trailing={
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="grid size-8 place-items-center rounded-lg text-faint hover:text-ink" aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}>
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
          />
        </div>
      ) : (
        <Input label={t("auth.mobile")} value={mobile} onChange={(e) => setMobile(e.target.value)} leading={<Smartphone />} inputMode="tel" autoComplete="tel" autoFocus required error={fields.mobile} />
      )}
      <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy} disabled={mode === "password" ? !loginId || !password : mobile.replace(/\D/g, "").length < 10}>
        {busy ? t("auth.signingIn") : mode === "password" ? t("auth.signIn") : t("auth.sendOtp")}
        {!busy && <ArrowRight />}
      </Button>
    </form>
  );
}
