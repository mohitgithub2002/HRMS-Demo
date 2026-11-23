import "server-only";
/**
 * E-mail through the organisation's SMTP server (Settings → E-mail). The user name and password come from the
 * environment variables the setting names, never from the database. With no SMTP host, or in console mode, the
 * message is only logged. Every message is recorded in MessageLog. Never throws: a failed e-mail never blocks payroll.
 */
import nodemailer from "nodemailer";
import { env } from "@/core/env";
import { maskEmail } from "@/core/auth/otp";
import type { DbLike } from "@/core/tenancy/scoped";
import { getSetting } from "@/modules/settings/store";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export async function sendEmail(db: DbLike, to: string, subject: string, text: string, attachments: EmailAttachment[] = [], template = "email"): Promise<{ ok: boolean; error?: string }> {
  let result: { ok: boolean; ref?: string; error?: string };
  try {
    const cfg = await getSetting(db, "email");
    if (!cfg.smtpHost || !cfg.fromAddress || env().SMS_PROVIDER === "console") {
      console.info(`[email] to ${maskEmail(to)}: ${subject} (${attachments.length} attachment(s))`);
      result = { ok: true, ref: "console" };
    } else {
      const transport = nodemailer.createTransport({
        host: cfg.smtpHost,
        port: cfg.smtpPort,
        secure: cfg.secure,
        auth: cfg.userEnv ? { user: process.env[cfg.userEnv] ?? "", pass: process.env[cfg.passwordEnv] ?? "" } : undefined,
      });
      const info = await transport.sendMail({ from: { name: cfg.fromName, address: cfg.fromAddress }, to, subject, text, attachments });
      result = { ok: true, ref: info.messageId };
    }
  } catch (e) {
    result = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  await db.messageLog.create({ data: { channel: "EMAIL", to: maskEmail(to), template, status: result.ok ? "SENT" : "FAILED", error: result.error?.slice(0, 300) ?? null } as never });
  return result;
}
