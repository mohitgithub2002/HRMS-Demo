"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/core/i18n/client";
import { api, ApiError } from "./api-client";

/**
 * Calls an endpoint, shows "Saved" (or the error), refreshes the page's data and keeps field errors for the form.
 * Returns the answer, or undefined when it failed.
 */
export function useAction() {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function run<T = unknown>(url: string, body: unknown, opts: { method?: string; success?: string | false } = {}): Promise<T | undefined> {
    setBusy(true);
    setFields({});
    try {
      const r = await api<T>(url, { method: opts.method ?? "POST", body });
      if (opts.success !== false) toast(opts.success ?? t("common.saved"));
      router.refresh();
      return r;
    } catch (e) {
      if (e instanceof ApiError) setFields(e.fields);
      toast(e instanceof Error ? e.message : t("errors.generic"), "error");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  return { run, busy, fields, setFields };
}
