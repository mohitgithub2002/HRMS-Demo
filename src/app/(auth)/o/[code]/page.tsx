import { notFound } from "next/navigation";
import { findOrg } from "@/modules/auth/service";
import { AuthShell } from "../../auth-shell";
import { LoginForm } from "../../login/login-form";

/** An organisation's own sign-in page (/o/DCB): its name and colour, no code to type. */
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const org = await findOrg((await params).code);
  return { title: org ? `Sign in · ${org.name}` : "Sign in" };
}

export default async function OrgLoginPage({ params }: { params: Promise<{ code: string }> }) {
  const org = await findOrg((await params).code);
  if (!org) notFound();
  return (
    <AuthShell accent={org.accentColor}>
      <LoginForm fixedOrg initialOrg={{ code: org.code, name: org.name, nameHi: org.nameHi, accentColor: org.accentColor, usable: org.usable }} />
    </AuthShell>
  );
}
