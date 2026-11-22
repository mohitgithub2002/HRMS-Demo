import { cn, initials } from "@/lib/utils";

const palettes = [
  "from-brand-500 to-brand-700",
  "from-gold-400 to-gold-600",
  "from-emerald-500 to-teal-700",
  "from-rose-400 to-rose-600",
  "from-sky-500 to-indigo-600",
  "from-violet-500 to-fuchsia-600",
];

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const sum = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const sizes = { sm: "size-7 text-[0.6875rem]", md: "size-9 text-xs", lg: "size-14 text-base" };
  return (
    <span className={cn("inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-surface", palettes[sum % palettes.length], sizes[size], className)} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
