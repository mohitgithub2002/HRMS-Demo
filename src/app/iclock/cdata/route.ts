import { loadTenantInfo, usableTenant } from "@/core/auth/session";
import { deviceTenant } from "@/core/tenancy/devices";
import { tenantDb } from "@/core/tenancy/scoped";
import { getRequestMeta } from "@/core/request-meta";
import { devicePush } from "@/modules/attendance/imports";

/**
 * Device sync (AT-01) for eSSL / ZKTeco devices in push ("ADMS") mode. The device asks for its options
 * with GET and sends attendance lines with POST ?table=ATTLOG. Only serial numbers registered in an organisation's
 * Settings are accepted, and the serial number decides the organisation (core/tenancy/devices.ts); anything else —
 * or a device of a paused organisation — is refused without detail.
 */
const text = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

/** The organisation's client for a registered device of a working organisation, or null. */
async function dbFor(serial: string) {
  const tenantId = await deviceTenant(serial);
  if (!tenantId) return null;
  const t = await loadTenantInfo(tenantId);
  return t && usableTenant(t.status) ? tenantDb(tenantId) : null;
}

function serialOf(req: Request) {
  const sn = new URL(req.url).searchParams.get("SN") ?? "";
  return /^[A-Za-z0-9_-]{3,40}$/.test(sn) ? sn : null;
}

export async function GET(req: Request) {
  const sn = serialOf(req);
  if (!sn) return text("Unknown device", 403);
  const db = await dbFor(sn);
  if (!db) return text("Unknown device", 403);
  // An empty push accepts or refuses the device without saving anything.
  const result = await devicePush(db, sn, "", null);
  if (!result.accepted) return text("Unknown device", 403);
  return text(
    [`GET OPTION FROM: ${sn}`, "ATTLOGStamp=None", "OPERLOGStamp=9999", "ATTPHOTOStamp=9999", "ErrorDelay=60", "Delay=30", "TransTimes=00:00;14:05", "TransInterval=1", "TransFlag=TransData AttLog", "Realtime=1", "Encrypt=None"].join("\n"),
  );
}

export async function POST(req: Request) {
  const sn = serialOf(req);
  if (!sn) return text("Unknown device", 403);
  if (Number(req.headers.get("content-length") ?? 0) > 1_000_000) return text("Too large", 413);
  const table = new URL(req.url).searchParams.get("table");
  const body = await req.text();
  const db = await dbFor(sn);
  if (!db) return text("Unknown device", 403);
  if (table !== "ATTLOG") {
    // Operation logs, photos and user lists are not needed; acknowledge so the device does not resend.
    const result = await devicePush(db, sn, "", null);
    return result.accepted ? text("OK") : text("Unknown device", 403);
  }
  const { ip } = await getRequestMeta();
  const result = await devicePush(db, sn, body, ip);
  if (!result.accepted) return text("Unknown device", 403);
  return text(`OK: ${result.received}`);
}
