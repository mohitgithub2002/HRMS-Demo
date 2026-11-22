/**
 * Every organisation setting, with its shape and default. One row per key in Setting; a key never saved reads as
 * its default, so a new organisation works from the first minute. Pure module (screens, seed and tests read it).
 */
import { z } from "zod";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const weekdays = z.string().regex(/^[0-6](,[0-6])*$|^$/);

export const SETTINGS = {
  /** Settings → How work is approved. */
  workflow: z.object({ mode: z.enum(["simple", "two_step"]) }).default({ mode: "simple" }),
  /** Sign-in rules. */
  security: z
    .object({
      /** Ask for a one-time code on every sign-in (PRD §2 rule 4). Switch off only until SMS is set up. */
      loginOtp: z.boolean(),
      /** Employees and pensioners may sign in with mobile + OTP alone. */
      mobileOtpLogin: z.boolean(),
    })
    .default({ loginOtp: true, mobileOtpLogin: true }),
  /** Office hours and the attendance month (AT-03, AT-05). */
  attendance: z
    .object({
      officeStart: hhmm,
      graceMinutes: z.number().int().min(0).max(120),
      halfDayAfter: hhmm,
      officeEnd: hhmm,
      weeklyOff: weekdays,
      lockDay: z.number().int().min(1).max(28),
    })
    .default({ officeStart: "09:30", graceMinutes: 10, halfDayAfter: "11:00", officeEnd: "18:00", weeklyOff: "0", lockDay: 25 }),
  /** Statutory and bank identity of the organisation (TAN, DDO, PF, ESIC …). */
  statutoryIds: z
    .object({
      tan: z.string().max(10),
      pan: z.string().max(10),
      ddoCode: z.string().max(20),
      ddoRegNo: z.string().max(20),
      pfCode: z.string().max(30),
      esicCode: z.string().max(30),
      ptState: z.string().max(40),
    })
    .default({ tan: "", pan: "", ddoCode: "", ddoRegNo: "", pfCode: "", esicCode: "", ptState: "" }),
  /** The salary bank and its file format (PR-12). */
  bank: z
    .object({
      bankName: z.string().max(80),
      accountNumber: z.string().max(30),
      ifsc: z.string().max(11),
      format: z.enum(["GENERIC", "SBI_CMP", "PNB", "BOB", "CANARA"]),
    })
    .default({ bankName: "", accountNumber: "", ifsc: "", format: "GENERIC" }),
  /** Payslips. */
  payslip: z.object({ footer: z.string().max(300), showLeave: z.boolean() }).default({ footer: "", showLeave: true }),
  /** Ask AI: off, office staff, or everyone. */
  ask: z.object({ audience: z.enum(["off", "staff", "everyone"]) }).default({ audience: "off" }),
} as const;

export type SettingKey = keyof typeof SETTINGS;
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTINGS)[K]>;
export const SETTING_KEYS = Object.keys(SETTINGS) as SettingKey[];

export function defaultOf<K extends SettingKey>(key: K): SettingValue<K> {
  return SETTINGS[key].parse(undefined) as SettingValue<K>;
}

/** A stored value read leniently: unknown or broken values fall back to the default, field by field. */
export function readValue<K extends SettingKey>(key: K, raw: unknown): SettingValue<K> {
  const def = defaultOf(key) as Record<string, unknown>;
  const merged = raw && typeof raw === "object" ? { ...def, ...(raw as object) } : def;
  const parsed = SETTINGS[key].safeParse(merged);
  return (parsed.success ? parsed.data : def) as SettingValue<K>;
}
