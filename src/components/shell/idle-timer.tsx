"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useT } from "@/core/i18n/client";

const IDLE_MS = 15 * 60 * 1000;
const WARN_MS = 2 * 60 * 1000;

/**
 * Sessions end after 15 minutes without activity (PRD §2 rule 7). Two minutes before, a warning offers to stay;
 * staying pings the server so its own clock restarts too.
 */
export function IdleTimer({ logoutUrl = "/api/v1/auth/logout", loginUrl = "/login?expired=1", pingUrl = "/api/v1/me/ping" }: { logoutUrl?: string; loginUrl?: string; pingUrl?: string }) {
  const t = useT();
  const last = useRef(0);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    last.current = Date.now();
    const bump = () => {
      if (left === null) last.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const id = setInterval(async () => {
      const idle = Date.now() - last.current;
      if (idle >= IDLE_MS) {
        clearInterval(id);
        await fetch(logoutUrl, { method: "POST" }).catch(() => undefined);
        window.location.href = loginUrl;
      } else if (idle >= IDLE_MS - WARN_MS) setLeft(Math.ceil((IDLE_MS - idle) / 1000));
    }, 1000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(id);
    };
  }, [left, logoutUrl, loginUrl]);

  const stay = async () => {
    last.current = Date.now();
    setLeft(null);
    await fetch(pingUrl, { method: "POST" }).catch(() => undefined);
  };

  return (
    <Dialog open={left !== null} onClose={stay} title={t("auth.stay")} footer={<Button variant="primary" onClick={stay}>{t("auth.stay")}</Button>}>
      <p className="text-sm text-ink-2">{t("auth.idleWarning", { s: left ?? 0 })}</p>
    </Dialog>
  );
}
