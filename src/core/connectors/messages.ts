/**
 * Outgoing SMS and e-mail. "console" prints the message to the server log (development and practice copies);
 * "http" posts to the provider's gateway (configured per organisation later in Settings → Messages). Every message is
 * logged in MessageLog of its organisation.
 */
import { env } from "@/core/env";

export interface OutgoingMessage {
  channel: "SMS" | "EMAIL";
  to: string;
  template: string;
  text: string;
  subject?: string;
}

export async function deliver(msg: OutgoingMessage): Promise<{ ok: boolean; error?: string }> {
  const provider = env().SMS_PROVIDER;
  if (provider === "console") {
    console.log(`[${msg.channel.toLowerCase()}] → ${msg.to} · ${msg.template} · ${msg.text}`);
    return { ok: true };
  }
  const url = process.env.MESSAGE_GATEWAY_URL;
  if (!url) return { ok: false, error: "MESSAGE_GATEWAY_URL is not set" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(process.env.MESSAGE_GATEWAY_TOKEN ? { authorization: `Bearer ${process.env.MESSAGE_GATEWAY_TOKEN}` } : {}) },
      body: JSON.stringify(msg),
    });
    return res.ok ? { ok: true } : { ok: false, error: `gateway ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "gateway unreachable" };
  }
}
