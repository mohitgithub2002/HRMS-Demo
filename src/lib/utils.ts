import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "•";
}

/** "XXXXXX1234" — all but the last few characters hidden. */
export function maskTail(value: string | null | undefined, visible = 4, mask = "X"): string {
  if (!value) return "";
  const clean = value.replace(/\s/g, "");
  return mask.repeat(Math.max(0, clean.length - visible)) + clean.slice(-visible);
}

/** Aadhaar is only ever shown as its last four digits. */
export function maskAadhaar(last4: string | null | undefined): string {
  return last4 ? `XXXX XXXX ${last4}` : "";
}
