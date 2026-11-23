"use client";

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import { takeApplied } from "@/lib/applied";
import { useT } from "@/core/i18n/client";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info" | "warning";
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [items, setItems] = useState<ToastItem[]>([]);
  const remove = useCallback((id: number) => setItems((all) => all.filter((i) => i.id !== id)), []);
  const push = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = Date.now() + Math.random();
      // The simple way of working: the entry counted at once, so "sent for approval" would be wrong.
      const text = tone === "success" && takeApplied() ? t("common.saved") : message;
      setItems((all) => [...all.slice(-3), { id, tone, message: text }]);
      setTimeout(() => remove(id), tone === "error" ? 7000 : 4500);
    },
    [remove, t],
  );
  const icons = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle };
  const colors = { success: "text-emerald-500", error: "text-rose-500", info: "text-brand-500", warning: "text-amber-500" };
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end">
        {items.map((i) => {
          const Icon = icons[i.tone];
          return (
            <div
              key={i.id}
              role={i.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-2xl border border-white/10 bg-night/95 px-4 py-3.5 text-night-ink shadow-overlay backdrop-blur"
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", colors[i.tone])} aria-hidden="true" />
              <p className="flex-1 text-sm leading-relaxed">{i.message}</p>
              <button type="button" onClick={() => remove(i.id)} className="text-night-muted hover:text-white" aria-label={t("common.close")}>
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
