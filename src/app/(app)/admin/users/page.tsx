import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { canManageUsers } from "@/core/auth/access";
import { requireActor } from "@/core/auth/guard";
import { roleOf } from "@/core/auth/roles";
import { getT } from "@/core/i18n/server";
import { listUsers } from "@/modules/users/service";
import { UsersTable } from "./users-table";

export const metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const actor = await requireActor();
  if (!canManageUsers(actor)) notFound();
  const { t } = await getT();
  const users = await listUsers(actor);
  return (
    <>
      <PageHeader eyebrow={t("nav.admin")} title={t("users.title")} description={t("users.subtitle")} />
      <UsersTable
        me={actor.userId}
        rows={users.map((u) => ({
          id: u.id,
          loginId: u.loginId,
          name: u.name,
          mobile: u.mobile ?? "",
          email: u.email ?? "",
          loginType: u.loginType,
          permissions: u.permissions,
          role: roleOf(u.loginType, u.permissions),
          status: u.status,
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
          locked: Boolean(u.lockedUntil && u.lockedUntil > new Date()),
        }))}
      />
    </>
  );
}
