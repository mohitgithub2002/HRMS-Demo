import "server-only";
/**
 * SMS through the organisation's gateway (Settings → SMS gateway). Message texts must match the templates registered
 * on the DLT platform, so they live here in one place; "{org}" is the organisation's name. Every message is logged in
 * the organisation's MessageLog with the number masked. Never throws: callers decide whether a failure matters
 * (it does for a code; it never blocks payroll).
 */
import { env } from "@/core/env";
import { loadTenantInfo } from "@/core/auth/session";
import { tenantOf, type DbLike } from "@/core/tenancy/scoped";
import { maskMobile } from "@/core/auth/otp";
import { getSetting } from "@/modules/settings/store";

export type SmsTemplate = "otp" | "approveOtp" | "welcome" | "alert" | "payslip" | "pensionSlip" | "lifeCertificate";

const TEXTS: Record<SmsTemplate, { en: string; hi: string }> = {
  otp: {
    en: "{otp} is your OTP to sign in to {org} HR & Payroll. It is valid for 5 minutes. Do not share it with anyone. - {org}",
    hi: "{org} एचआर और पेरोल में साइन इन के लिए आपका ओटीपी {otp} है। यह 5 मिनट तक मान्य है। इसे किसी को न बताएँ। - {org}",
  },
  approveOtp: {
    en: "{otp} is your OTP to approve {what}. Valid for 5 minutes. Do not share it. - {org}",
    hi: "{what} स्वीकृत करने के लिए आपका ओटीपी {otp} है। 5 मिनट तक मान्य। किसी को न बताएँ। - {org}",
  },
  welcome: {
    en: "Welcome to {org} HR & Payroll. Sign in at {url} with your mobile number and OTP. - {org}",
    hi: "{org} एचआर और पेरोल में आपका स्वागत है। {url} पर अपने मोबाइल नंबर और ओटीपी से साइन इन करें। - {org}",
  },
  payslip: {
    en: "Your salary slip for {month} is ready. Net pay Rs {net} sent to your bank account. See it at {url} - {org}",
    hi: "{month} की आपकी वेतन पर्ची तैयार है। शुद्ध वेतन रु {net} आपके बैंक खाते में भेजा गया। यहाँ देखें: {url} - {org}",
  },
  pensionSlip: {
    en: "Your pension for {month} is paid. Net pension Rs {net} sent to your bank account. See the slip at {url} - {org}",
    hi: "{month} की आपकी पेंशन का भुगतान हो गया। शुद्ध पेंशन रु {net} आपके बैंक खाते में भेजी गई। पर्ची यहाँ देखें: {url} - {org}",
  },
  lifeCertificate: {
    en: "Please give your life certificate by {date} through Jeevan Pramaan or at our office so that your pension continues. PPO {ppo}. - {org}",
    hi: "पेंशन जारी रखने के लिए कृपया {date} तक जीवन प्रमाण या हमारे कार्यालय में अपना जीवन प्रमाण पत्र दें। पीपीओ {ppo}। - {org}",
  },
  alert: { en: "{text} - {org}", hi: "{text} - {org}" },
};

const render = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");

export interface SmsResult {
  ok: boolean;
  ref?: string;
  error?: string;
}

export async function sendSms(db: DbLike, to: string, template: SmsTemplate, vars: Record<string, string>, lang: "en" | "hi" = "en"): Promise<SmsResult> {
  let result: SmsResult;
  try {
    const tenant = await loadTenantInfo(tenantOf(db));
    const org = (lang === "hi" && tenant?.nameHi) || tenant?.shortName || tenant?.name || "HR & Payroll";
    const text = render(TEXTS[template][lang], { ...vars, org, url: vars.url ?? env().APP_URL });
    const cfg = await getSetting(db, "sms");
    if (env().SMS_PROVIDER === "console" || cfg.provider === "console" || !cfg.url) {
      console.info(`[sms] to ${maskMobile(to)}: ${text}`);
      result = { ok: true, ref: "console" };
    } else {
      const values: Record<string, string> = {
        to: `91${to}`,
        text,
        templateId: cfg.templates[template] ?? "",
        senderId: cfg.senderId,
        entityId: cfg.dltEntityId,
        apiKey: cfg.apiKeyEnv ? (process.env[cfg.apiKeyEnv] ?? "") : "",
      };
      const url = cfg.url.replace(/\{(\w+)\}/g, (_, k: string) => encodeURIComponent(values[k] ?? ""));
      const res = await fetch(url, { method: cfg.method, signal: AbortSignal.timeout(10_000) });
      const body = (await res.text()).slice(0, 200);
      result = res.ok ? { ok: true, ref: body } : { ok: false, error: `HTTP ${res.status}: ${body}` };
    }
  } catch (e) {
    result = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  await db.messageLog.create({ data: { channel: "SMS", to: maskMobile(to), template, status: result.ok ? "SENT" : "FAILED", error: result.error?.slice(0, 300) ?? null } as never });
  return result;
}
