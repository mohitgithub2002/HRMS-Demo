import { z } from "zod";

const base64Key = z
  .string()
  .min(1)
  .refine((v) => Buffer.from(v, "base64").length === 32, "must be 32 bytes, base64 encoded");

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  /** Which copy this is: production, test or training copies are separate installations. */
  APP_ENV: z.enum(["development", "test", "training", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATA_ENCRYPTION_KEY: base64Key,
  BLIND_INDEX_KEY: base64Key,
  OTP_PEPPER: base64Key,
  SMS_PROVIDER: z.enum(["console", "http"]).default("console"),
  STORAGE_DRIVER: z.enum(["disk", "database"]).default(process.env.VERCEL ? "database" : "disk"),
  STORAGE_DIR: z.string().default("./storage"),
  CHROMIUM_PATH: z.string().optional(),
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Reads and checks configuration once; the app refuses to start with a missing or weak secret. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid configuration — ${problems}`);
  }
  if (parsed.data.APP_ENV === "production" && parsed.data.SMS_PROVIDER === "console") {
    throw new Error("SMS_PROVIDER=console is not allowed when APP_ENV=production");
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => env().APP_ENV === "production";
export const secureCookies = () => env().APP_URL.startsWith("https://");
/** The OTP shown on screen: only with the console SMS provider and never in production. */
export const devHelpersEnabled = () => !isProduction() && env().SMS_PROVIDER === "console";
