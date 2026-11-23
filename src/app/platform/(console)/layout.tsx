import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ConsoleShell } from "@/components/shell/console-shell";
import { getPlatformActor } from "@/core/auth/platform-session";
import { getT } from "@/core/i18n/server";
import { tDynamic } from "@/i18n";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pa = await getPlatformActor();
  if (!pa) redirect("/platform/login");
  const path = (await headers()).get("x-pathname") ?? "";
  if (pa.mustChangePassword && !path.startsWith("/platform/account")) redirect("/platform/account");
  const { t } = await getT();
  return <ConsoleShell user={{ name: pa.name, role: tDynamic(t, `platform.team.${pa.role}`), owner: pa.role === "OWNER" }}>{children}</ConsoleShell>;
}
