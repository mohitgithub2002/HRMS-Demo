import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { can, canManageUsers, isFullAdmin } from "@/core/auth/access";
import { requireActor } from "@/core/auth/guard";
import { getT } from "@/core/i18n/server";
import { listPosts } from "@/modules/org/service";
import { PostsTable } from "./posts-table";

export const metadata = { title: "Posts" };

export default async function PostsPage() {
  const actor = await requireActor();
  if (!(canManageUsers(actor) || isFullAdmin(actor) || can(actor, "employee_master", "create"))) notFound();
  const { t } = await getT();
  const rows = await listPosts(actor);
  return (
    <>
      <PageHeader eyebrow={t("nav.admin")} title={t("posts.title")} description={t("posts.subtitle")} />
      <PostsTable rows={rows.map((p) => ({ id: p.id, code: p.code, name: p.name, nameHi: p.nameHi ?? "", payLevel: p.payLevel, group: p.group, retirementAge: p.retirementAge, isActive: p.isActive }))} />
    </>
  );
}
