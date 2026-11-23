/**
 * The installation-wide register of biometric devices: serial number → organisation. A device push (/iclock) arrives
 * with nothing but its serial number, so this is how it finds its organisation. Each organisation lists its devices in
 * Settings → Office hours; saving keeps this register in step and refuses a serial another organisation holds.
 */
import { conflict } from "@/core/errors";
import { rawDb } from "./raw";

export async function syncDevices(tenantId: string, devices: { serial: string; name: string }[]) {
  const serials = devices.map((d) => d.serial);
  await rawDb().$transaction(async (tx) => {
    const taken = await tx.deviceRegistration.findMany({ where: { serial: { in: serials }, tenantId: { not: tenantId } }, select: { serial: true } });
    if (taken.length) throw conflict("settings.attendance.serialTaken", undefined, { devices: "settings.attendance.serialTaken" });
    await tx.deviceRegistration.deleteMany({ where: { tenantId, serial: { notIn: serials } } });
    for (const d of devices) {
      await tx.deviceRegistration.upsert({ where: { serial: d.serial }, create: { serial: d.serial, tenantId, name: d.name || null }, update: { name: d.name || null } });
    }
  });
}

/** The organisation a device belongs to, or null for an unknown device. */
export async function deviceTenant(serial: string): Promise<string | null> {
  const d = await rawDb().deviceRegistration.findUnique({ where: { serial } });
  if (!d) return null;
  if (!d.lastSeen || Date.now() - d.lastSeen.getTime() > 60_000) {
    await rawDb().deviceRegistration.update({ where: { serial }, data: { lastSeen: new Date() } }).catch(() => undefined);
  }
  return d.tenantId;
}
