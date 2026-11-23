import { z } from "zod";

export const orgCode = z.string().trim().min(2).max(12).regex(/^[A-Za-z0-9]+$/, "validation.code");

export const loginBody = z.union([
  z.object({ org: orgCode, loginId: z.string().trim().min(1).max(40), password: z.string().min(1).max(200) }),
  z.object({ org: orgCode, mobile: z.string().trim().regex(/^\+?\d[\d\s-]{8,14}$/, "validation.mobile") }),
]);

export const otpBody = z.object({ code: z.string().trim().regex(/^\d{6}$/, "auth.otpWrong") });

export const passwordBody = z.object({ current: z.string().min(1).max(200), next: z.string().min(8, "validation.passwordRules").max(200) });
