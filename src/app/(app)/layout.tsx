import { AppShell } from "@/components/shell/app-shell";
import { countInbox } from "@/core/approvals";
import { requireActor } from "@/core/auth/guard";
import { menuFor } from "@/core/auth/menu";
import { roleOf } from "@/core/auth/roles";
import { getT } from "@/core/i18n/server";
import { tDynamic } from "@/i18n";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor();
  const [{ t, locale }, approvals] = await Promise.all([getT(), countInbox(actor)]);
  const org = actor.tenant;
  return (
    <AppShell
      items={menuFor(actor)}
      counts={{ approvals }}
      user={{ name: actor.name, role: tDynamic(t, `role.${roleOf(actor.loginType, actor.permissions)}`) }}
      org={{ name: (locale === "hi" && org.nameHi) || org.shortName || org.name, code: org.code, accent: org.accentColor }}
    >
      {children}
    </AppShell>
  );
}
