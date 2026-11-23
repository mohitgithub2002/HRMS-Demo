/**
 * Every organisation setting, with its shape and default. One row per key in Setting; a key never saved reads as
 * its default, so a new organisation works from the first minute. Pure module (screens, seed and tests read it).
 */
import { z } from "zod";

/** The usual papers on a government employee's file; each organisation changes the list in Settings. */
export const DEFAULT_DOCUMENT_TYPES = [
  { code: "APPOINTMENT_ORDER", name: "Appointment order", nameHi: "नियुक्ति आदेश", maxMb: 5, active: true },
  { code: "JOINING_REPORT", name: "Joining report", nameHi: "कार्यग्रहण रिपोर्ट", maxMb: 5, active: true },
  { code: "CERTIFICATE", name: "Educational certificates", nameHi: "शैक्षिक प्रमाण पत्र", maxMb: 5, active: true },
  { code: "CASTE_CERTIFICATE", name: "Caste / category certificate", nameHi: "जाति / वर्ग प्रमाण पत्र", maxMb: 5, active: true },
  { code: "DISABILITY_CERTIFICATE", name: "Disability certificate", nameHi: "दिव्यांगता प्रमाण पत्र", maxMb: 5, active: true },
  { code: "ID_PROOF", name: "Identity proof (Aadhaar, PAN, voter ID)", nameHi: "पहचान प्रमाण (आधार, पैन, मतदाता पहचान पत्र)", maxMb: 5, active: true },
  { code: "BANK_PROOF", name: "Bank passbook / cancelled cheque", nameHi: "बैंक पासबुक / रद्द चेक", maxMb: 5, active: true },
  { code: "MEDICAL", name: "Medical fitness certificate", nameHi: "चिकित्सा फ़िटनेस प्रमाण पत्र", maxMb: 5, active: true },
  { code: "POLICE_VERIFICATION", name: "Police / character verification", nameHi: "पुलिस / चरित्र सत्यापन", maxMb: 5, active: true },
  { code: "SERVICE_ORDER", name: "Service orders (promotion, transfer, increment)", nameHi: "सेवा आदेश (पदोन्नति, स्थानांतरण, वेतनवृद्धि)", maxMb: 5, active: true },
  { code: "APAR", name: "APAR / ACR", nameHi: "एपीएआर / एसीआर", maxMb: 10, active: true },
  { code: "NOMINATION", name: "Nomination forms (GPF, gratuity, NPS)", nameHi: "नामांकन प्रपत्र (जीपीएफ, उपदान, एनपीएस)", maxMb: 5, active: true },
  { code: "SERVICE_BOOK", name: "Scanned service book", nameHi: "स्कैन की गई सेवा पुस्तिका", maxMb: 50, active: true },
  { code: "PHOTO", name: "Photograph", nameHi: "फ़ोटो", maxMb: 2, active: true },
  { code: "SIGNATURE", name: "Signature specimen", nameHi: "हस्ताक्षर नमूना", maxMb: 2, active: true },
  { code: "OTHER", name: "Other", nameHi: "अन्य", maxMb: 5, active: true },
];

export const BANK_FORMATS = ["GENERIC_CSV", "SBI_CMP", "PNB_BULK", "BOB_BULK", "CANARA_BULK"] as const;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

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
  /**
   * Office hours and the attendance month (AT-03, AT-05), and the biometric devices allowed to push punches (AT-01).
   * A device's serial number is also registered for the whole installation, so a push finds its organisation.
   */
  attendance: z
    .object({
      officeStart: hhmm,
      /** Late after office start + grace. */
      graceMinutes: z.number().int().min(0).max(120),
      /** Less than this many minutes between first and last punch is a half day. */
      halfDayMinutes: z.number().int().min(60).max(600),
      /** 0 = Sunday … 6 = Saturday. */
      weeklyOff: z.array(z.number().int().min(0).max(6)).max(3),
      /** Last month must be locked by this day of the month. */
      lockDay: z.number().int().min(1).max(28),
      devices: z
        .array(
          z.object({
            serial: z.string().trim().min(3, "validation.required").max(40).regex(/^[A-Za-z0-9_-]+$/, "validation.invalid"),
            name: z.string().trim().max(80),
          }),
        )
        .max(50),
    })
    .default({ officeStart: "09:00", graceMinutes: 15, halfDayMinutes: 240, weeklyOff: [0, 6], lockDay: 25, devices: [] }),
  /**
   * The organisation as a tax deductor and employer (TAN, PAN, DDO, EPF, ESIC), and the tax choices that differ by
   * state: HRA exemption at 50% (metro city) or 40%, and professional tax with its monthly slabs.
   */
  statutory: z
    .object({
      deductorName: z.string().trim().max(75),
      address: z.string().trim().max(200),
      tan: z.union([z.literal(""), z.string().regex(/^[A-Z]{4}\d{5}[A-Z]$/, "validation.tan")]),
      pan: z.union([z.literal(""), z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/, "validation.pan")]),
      responsibleName: z.string().trim().max(75),
      responsibleDesignation: z.string().trim().max(50),
      ddoCode: z.string().trim().max(20),
      ddoRegNo: z.string().trim().max(20),
      epfCode: z.string().trim().max(30),
      esicCode: z.string().trim().max(30),
      metroHra: z.boolean(),
      professionalTax: z.boolean(),
      /** Monthly gross up to `upTo` (null = above) → professional tax for the month. */
      ptSlabs: z.array(z.object({ upTo: z.number().min(0).nullable(), amount: z.number().min(0).max(2500) })).max(10),
    })
    .default({
      deductorName: "",
      address: "",
      tan: "",
      pan: "",
      responsibleName: "",
      responsibleDesignation: "",
      ddoCode: "",
      ddoRegNo: "",
      epfCode: "",
      esicCode: "",
      metroHra: false,
      professionalTax: false,
      // An example (Maharashtra) for an organisation that switches professional tax on.
      ptSlabs: [
        { upTo: 7500, amount: 0 },
        { upTo: 10000, amount: 175 },
        { upTo: null, amount: 200 },
      ],
    }),
  /**
   * The salary bank and its file (PR-12). Only the last four digits of the organisation's debit account are kept;
   * XLSX = the bank's columns in an Excel sheet (most bank portals take it), TEXT = the bank's CSV / text layout.
   */
  bank: z
    .object({
      name: z.string().max(100),
      format: z.enum(BANK_FORMATS),
      fileType: z.enum(["XLSX", "TEXT"]),
      debitAccountLast4: z.string().regex(/^\d{0,4}$/, "validation.invalid"),
      ifsc: z.union([z.literal(""), z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "validation.ifsc")]),
    })
    .default({ name: "", format: "GENERIC_CSV", fileType: "XLSX", debitAccountLast4: "", ifsc: "" }),
  /**
   * The SMS gateway (OTP, payslip and pension notices). The gateway's key is never stored here: the setting names an
   * environment variable that holds it. Template ids are the ones registered on the DLT platform.
   */
  sms: z
    .object({
      provider: z.enum(["console", "http"]),
      /** Gateway URL with placeholders {to} {text} {templateId} {senderId} {entityId} {apiKey}. */
      url: z.string().max(500),
      method: z.enum(["GET", "POST"]),
      senderId: z.string().max(6),
      dltEntityId: z.string().max(30),
      apiKeyEnv: z.string().max(60).regex(/^[A-Z0-9_]*$/, "validation.invalid"),
      templates: z.object({
        otp: z.string().max(30),
        approveOtp: z.string().max(30),
        welcome: z.string().max(30),
        payslip: z.string().max(30),
        pensionSlip: z.string().max(30),
        lifeCertificate: z.string().max(30),
        alert: z.string().max(30),
      }),
    })
    .default({
      provider: "console",
      url: "",
      method: "GET",
      senderId: "",
      dltEntityId: "",
      apiKeyEnv: "SMS_API_KEY",
      templates: { otp: "", approveOtp: "", welcome: "", payslip: "", pensionSlip: "", lifeCertificate: "", alert: "" },
    }),
  /** E-mail through the organisation's SMTP server; user name and password come from the environment variables named. */
  email: z
    .object({
      fromName: z.string().max(100),
      fromAddress: z.union([z.literal(""), z.string().email("validation.email")]),
      smtpHost: z.string().max(200),
      smtpPort: z.number().int().min(1).max(65535),
      secure: z.boolean(),
      userEnv: z.string().max(60).regex(/^[A-Z0-9_]*$/, "validation.invalid"),
      passwordEnv: z.string().max(60).regex(/^[A-Z0-9_]*$/, "validation.invalid"),
    })
    .default({ fromName: "", fromAddress: "", smtpHost: "", smtpPort: 587, secure: false, userEnv: "SMTP_USER", passwordEnv: "SMTP_PASSWORD" }),
  /** Payslips. */
  payslip: z.object({ footer: z.string().max(300), showLeave: z.boolean() }).default({ footer: "", showLeave: true }),
  /** Kinds of document kept on an employee's file, each with its own size limit (C7). */
  documents: z
    .object({
      types: z
        .array(
          z.object({
            code: z.string().trim().regex(/^[A-Z][A-Z0-9_]{1,29}$/, "settings.docCodeRule"),
            name: z.string().trim().min(2, "validation.tooShort").max(80),
            nameHi: z.string().trim().max(80),
            maxMb: z.number().int().min(1).max(50),
            active: z.boolean(),
          }),
        )
        .min(1)
        .max(60)
        .refine((types) => new Set(types.map((x) => x.code)).size === types.length, "settings.docCodeTwice")
        .refine((types) => types.some((x) => x.code === "OTHER" && x.active), "settings.docOtherNeeded"),
    })
    .default({ types: DEFAULT_DOCUMENT_TYPES }),
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

export type DocumentType = SettingValue<"documents">["types"][number];
export function docTypeName(types: DocumentType[], code: string, lang: "en" | "hi" = "en"): string {
  const type = types.find((x) => x.code === code);
  if (!type) return code.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
  return lang === "hi" && type.nameHi ? type.nameHi : type.name;
}
