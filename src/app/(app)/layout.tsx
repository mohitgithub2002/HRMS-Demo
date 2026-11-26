import { AppShell } from "@/components/shell/app-shell";
import { countInbox } from "@/core/approvals";
import { cachedForPerson } from "@/core/cache";
import { requireActor } from "@/core/auth/guard";
import { menuFor } from "@/core/auth/menu";
import { canUseAsk } from "@/core/auth/access";
import { getSetting } from "@/modules/settings/store";
import { roleOf } from "@/core/auth/roles";
import { getT } from "@/core/i18n/server";
import { tDynamic } from "@/i18n";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor();
  // The inbox badge is kept for half a minute per person and cleared by any change in the organisation (core/cache.ts).
  const [{ t, locale }, approvals, askSetting] = await Promise.all([getT(), cachedForPerson(actor, "inbox.count", () => countInbox(actor), 30), getSetting(actor.db, "ask")]);
  const org = actor.tenant;
  return (
    <AppShell
      items={menuFor(actor)}
      counts={{ approvals }}
      user={{ name: actor.name, role: tDynamic(t, `role.${roleOf(actor.loginType, actor.permissions)}`) }}
      org={{ name: (locale === "hi" && org.nameHi) || org.shortName || org.name, code: org.code, accent: org.accentColor }}
      ask={canUseAsk(actor, askSetting.audience)}
    >
      {children}
    </AppShell>
  );
}
