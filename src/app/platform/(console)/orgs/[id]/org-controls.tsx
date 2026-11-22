"use client";

import { KeyRound, PauseCircle, PlayCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/core/i18n/client";
import { MODULES, normaliseModules, type ModuleKey } from "@/core/tenancy/modules";
import { tDynamic } from "@/i18n";
import { api } from "@/lib/api-client";

interface Props {
  owner: boolean;
  org: { id: string; status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CLOSED"; modules: string[]; maxUsers: number; maxEmployees: number; plan: string; suspendedReason: string | null };
  admins: { id: string; loginId: string; name: string; status: string; locked: boolean }[];
}

export function OrgControls({ owner, org, admins }: Props) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [modules, setModules] = useState<string[]>(org.modules);
  const [limits, setLimits] = useState({ maxUsers: org.maxUsers, maxEmployees: org.maxEmployees, plan: org.plan });
  const [busy, setBusy] = useState<string | null>(null);
  const [pause, setPause] = useState(false);
  const [reason, setReason] = useState("");
  const [reset, setReset] = useState<{ login: string; password: string } | null>(null);

  async function run(key: string, url: string, body: unknown, ok?: (r: unknown) => void) {
    setBusy(key);
    try {
      const r = await api(url, { body });
      if (ok) ok(r);
      else toast(t("common.saved"));
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("errors.generic"), "error");
    } finally {
      setBusy(null);
    }
  }

  const effective = normaliseModules(modules);
  const paused = org.status === "SUSPENDED" || org.status === "CLOSED";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t("platform.org.access")} />
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-md text-sm leading-relaxed text-muted">{paused ? org.suspendedReason : t("platform.org.suspendHint")}</p>
          {owner &&
            (paused ? (
              <Button variant="primary" icon={<PlayCircle />} loading={busy === "status"} onClick={() => run("status", `/api/platform/orgs/${org.id}/status`, { status: "ACTIVE" })}>
                {t("platform.org.resume")}
              </Button>
            ) : (
              <div className="flex gap-2">
                {org.status === "TRIAL" && <Button loading={busy === "activate"} onClick={() => run("activate", `/api/platform/orgs/${org.id}/status`, { status: "ACTIVE" })}>{t("platform.org.activate")}</Button>}
                <Button variant="danger" icon={<PauseCircle />} onClick={() => setPause(true)}>{t("platform.org.suspend")}</Button>
              </div>
            ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("platform.org.modules")} />
        <CardBody className="grid gap-2 sm:grid-cols-2">
          {MODULES.map((m) => (
            <Checkbox
              key={m}
              label={tDynamic(t, `moduleName.${m}`)}
              hint={tDynamic(t, `moduleName.hint.${m}`)}
              checked={effective.includes(m)}
              disabled={!owner || (!modules.includes(m) && effective.includes(m))}
              onChange={(e) => setModules(e.target.checked ? [...modules, m] : modules.filter((x) => x !== (m as ModuleKey)))}
            />
          ))}
        </CardBody>
        {owner && (
          <CardFooter>
            <Button variant="primary" loading={busy === "modules"} onClick={() => run("modules", `/api/platform/orgs/${org.id}/modules`, { modules: effective })}>
              {t("platform.org.saveModules")}
            </Button>
          </CardFooter>
        )}
      </Card>

      <Card>
        <CardHeader title={t("platform.org.limits")} />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Input type="number" min={1} label={t("platform.create.maxUsers")} value={limits.maxUsers} onChange={(e) => setLimits({ ...limits, maxUsers: Number(e.target.value) })} disabled={!owner} />
          <Input type="number" min={1} label={t("platform.create.maxEmployees")} value={limits.maxEmployees} onChange={(e) => setLimits({ ...limits, maxEmployees: Number(e.target.value) })} disabled={!owner} />
          <Input label={t("platform.org.plan")} value={limits.plan} onChange={(e) => setLimits({ ...limits, plan: e.target.value })} disabled={!owner} />
        </CardBody>
        {owner && (
          <CardFooter>
            <Button loading={busy === "limits"} onClick={() => run("limits", `/api/platform/orgs/${org.id}/limits`, limits)}>{t("platform.org.saveLimits")}</Button>
          </CardFooter>
        )}
      </Card>

      <Card>
        <CardHeader title={t("platform.org.resetAdmin")} description={t("platform.org.resetAdminHint")} />
        <ul className="divide-y divide-line border-t border-line">
          {admins.length === 0 && <li className="px-6 py-4 text-sm text-muted">{t("platform.org.noAdmin")}</li>}
          {admins.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
              <span>
                <span className="block text-sm font-semibold text-ink">{a.name}</span>
                <span className="block text-xs text-muted">{a.loginId}{a.locked ? " · locked" : ""}{a.status !== "ACTIVE" ? ` · ${a.status}` : ""}</span>
              </span>
              {owner && (
                <Button size="sm" icon={<KeyRound />} loading={busy === a.id} onClick={() => run(a.id, `/api/platform/orgs/${org.id}/admins/${a.id}/reset`, {}, (r) => setReset({ login: (r as { loginId: string }).loginId, password: (r as { password: string }).password }))}>
                  {t("users.resetPassword")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Dialog
        open={pause}
        onClose={() => setPause(false)}
        title={t("platform.org.suspend")}
        description={t("platform.org.suspendHint")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPause(false)}>{t("common.cancel")}</Button>
            <Button variant="danger" disabled={!reason.trim()} loading={busy === "pause"} onClick={() => run("pause", `/api/platform/orgs/${org.id}/status`, { status: "SUSPENDED", reason }, () => setPause(false))}>
              {t("platform.org.suspend")}
            </Button>
          </>
        }
      >
        <Textarea label={t("platform.org.suspendReason")} value={reason} onChange={(e) => setReason(e.target.value)} required />
      </Dialog>
      <Dialog open={Boolean(reset)} onClose={() => setReset(null)} title={t("platform.org.resetAdmin")} footer={<Button variant="primary" onClick={() => setReset(null)}>{t("common.done")}</Button>}>
        {reset && <p className="text-sm text-ink-2">{t("platform.org.resetDone", { login: reset.login, password: reset.password })}</p>}
      </Dialog>
    </div>
  );
}
