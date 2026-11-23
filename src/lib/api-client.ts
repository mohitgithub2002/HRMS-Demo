"use client";

import { markApplied } from "./applied";

/** An error answer from our API: a message to show and, for forms, a message per field. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** Calls one of our endpoints and returns its data, or throws ApiError. */
export async function api<T = unknown>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
    headers: opts.body === undefined ? undefined : { "content-type": "application/json" },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  let json: { ok: boolean; data?: T; applied?: boolean; error?: { message: string; code: string; fields?: Record<string, string> } } | null = null;
  try {
    json = await res.json();
  } catch {
    // Not JSON (a proxy error page): fall through to the generic message.
  }
  if (!res.ok || !json?.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !url.includes("/auth/")) {
      window.location.href = url.startsWith("/api/platform") ? "/platform/login" : "/login?expired=1";
    }
    throw new ApiError(json?.error?.message ?? "Something went wrong. Please try again.", res.status, json?.error?.code ?? "server_error", json?.error?.fields);
  }
  if (json.applied) markApplied();
  return json.data as T;
}

/** Sends a multipart form (file uploads) with the same errors as api(). */
export async function apiForm<T = unknown>(url: string, form: FormData, method: "POST" | "PUT" = "POST"): Promise<T> {
  const res = await fetch(url, { method, body: form });
  const json = (await res.json().catch(() => null)) as { ok: boolean; data?: T; applied?: boolean; error?: { message: string; code: string; fields?: Record<string, string> } } | null;
  if (!res.ok || !json?.ok) throw new ApiError(json?.error?.message ?? "Something went wrong. Please try again.", res.status, json?.error?.code ?? "server_error", json?.error?.fields);
  if (json.applied) markApplied();
  return json.data as T;
}
