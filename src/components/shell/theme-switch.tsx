"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "@/core/i18n/client";
import { cn } from "@/lib/utils";

/** Light / dark, remembered in this browser (the inline script in the root layout applies it before paint). */
export function ThemeSwitch({ className }: { className?: string }) {
  const t = useT();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    // Read once after mount: the inline script has already set it on <html>.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("kosh-theme", next);
    } catch {
      // Private mode: the choice lasts for this page only.
    }
  };
  return (
    <button type="button" onClick={toggle} className={cn("grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-sunken hover:text-ink", className)} aria-label={theme === "dark" ? t("common.themeLight") : t("common.themeDark")} title={t("common.theme")}>
      {theme === "dark" ? <Sun className="size-[1.1rem]" /> : <Moon className="size-[1.1rem]" />}
    </button>
  );
}
