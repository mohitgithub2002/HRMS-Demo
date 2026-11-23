import "server-only";
import type { DbLike } from "@/core/tenancy/scoped";
import { matrixToday } from "@/modules/payroll/matrix";

/** Sections, posts and the pay matrix in force for the employee and recruitment forms. */
export async function formOptions(db: DbLike) {
  const [sections, posts, payMatrix] = await Promise.all([
    db.section.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, nameHi: true } }),
    db.post.findMany({ where: { isActive: true }, orderBy: [{ group: "asc" }, { name: "asc" }], select: { id: true, name: true, nameHi: true, payLevel: true } }),
    matrixToday(db),
  ]);
  // nameHi is optional here; forms show the English name when there is none.
  return {
    sections: sections.map((s) => ({ ...s, nameHi: s.nameHi ?? s.name })),
    posts: posts.map((p) => ({ ...p, nameHi: p.nameHi ?? p.name })),
    payMatrix,
  };
}
