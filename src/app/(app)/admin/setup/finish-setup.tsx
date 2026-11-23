"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/core/i18n/client";
import { useAction } from "@/lib/use-action";

export function FinishSetup({ finished }: { finished: boolean }) {
  const t = useT();
  const { run, busy } = useAction();
  return finished ? (
    <Button variant="ghost" loading={busy} onClick={() => run("/api/v1/setup/finish", { done: false })}>{t("setup.reopen")}</Button>
  ) : (
    <Button variant="secondary" loading={busy} onClick={() => run("/api/v1/setup/finish", { done: true }, { success: t("setup.finished") })}>{t("setup.finish")}</Button>
  );
}
