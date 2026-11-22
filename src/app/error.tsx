"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/core/i18n/client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4">
      <EmptyState icon={<TriangleAlert />} title={t("errors.generic")} action={<Button variant="primary" icon={<RotateCcw />} onClick={reset}>{t("common.continue")}</Button>} />
    </div>
  );
}
