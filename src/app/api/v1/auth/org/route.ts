import { z } from "zod";
import { publicRoute } from "@/core/api/route";
import { notFound } from "@/core/errors";
import { findOrg } from "@/modules/auth/service";

/** The organisation behind a sign-in code: its name and colour for the sign-in screen. Nothing else is told. */
export const GET = publicRoute(async ({ query }) => {
  const { code } = query(z.object({ code: z.string().trim().min(2).max(12) }));
  const org = await findOrg(code);
  if (!org) throw notFound();
  return { code: org.code, name: org.name, nameHi: org.nameHi, accentColor: org.accentColor, usable: org.usable };
});
