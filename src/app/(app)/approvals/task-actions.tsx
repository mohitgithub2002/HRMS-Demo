"use client";

import { Check, CornerUpLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/core/i18n/client";
import { api } from "@/lib/api-client";

export function TaskActions({ id, mode }: { id: string; mode: "decide" | "withdraw" }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function act(decision: "APPROVE" | "REJECT" | "RETURN" | "WITHDRAW") {
    setBusy(decision);
    try {
      if (decision === "WITHDRAW") await api(`/api/v1/approvals/${id}/withdraw`, { body: {} });
      else await api(`/api/v1/approvals/${id}/decision`, { body: { decision, note: note || undefined } });
      toast(t("common.saved"));
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("errors.generic"), "error");
    } finally {
      setBusy(null);
    }
  }

  if (mode === "withdraw") {
    return (
      <div className="mt-4 flex justify-end">
        <Button size="sm" variant="ghost" loading={busy === "WITHDRAW"} onClick={() => act("WITHDRAW")}>
          {t("approvals.withdraw")}
        </Button>
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <Textarea label={t("approvals.note")} optionalLabel={t("common.optional")} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="ghost" icon={<CornerUpLeft />} loading={busy === "RETURN"} onClick={() => act("RETURN")}>
          {t("approvals.sendBack")}
        </Button>
        <Button size="sm" variant="danger" icon={<X />} loading={busy === "REJECT"} onClick={() => act("REJECT")}>
          {t("approvals.reject")}
        </Button>
        <Button size="sm" variant="primary" icon={<Check />} loading={busy === "APPROVE"} onClick={() => act("APPROVE")}>
          {t("approvals.approve")}
        </Button>
      </div>
    </div>
  );
}
