import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getActor } from "@/core/auth/session";
import { findOrg } from "@/modules/auth/service";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string; org?: string }> }) {
  if (await getActor().catch(() => null)) redirect("/");
  const sp = await searchParams;
  const code = sp.org ?? (await cookies()).get("kosh_org")?.value;
  const org = code ? await findOrg(code) : null;
  const initial = org ? { code: org.code, name: org.name, nameHi: org.nameHi, accentColor: org.accentColor, usable: org.usable } : null;
  return (
    <AuthShell accent={initial?.accentColor}>
      <LoginForm initialOrg={initial} expired={sp.expired === "1"} />
    </AuthShell>
  );
}
