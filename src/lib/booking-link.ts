import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.BOOKING_LINK_SECRET || process.env.CRON_SECRET || "";

export type BookingLinkPayload = {
  n: string;
  e: string;
  p?: string;
  s: string;
  d: string;
  x: number;
};

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signBookingToken(payload: BookingLinkPayload): string {
  if (!SECRET) throw new Error("BOOKING_LINK_SECRET (or CRON_SECRET) is not configured");
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", SECRET).update(body).digest());
  return `${body}.${sig}`;
}

export type BookingTokenResult =
  | { ok: true; payload: BookingLinkPayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export function verifyBookingToken(token: string): BookingTokenResult {
  if (!SECRET) return { ok: false, reason: "bad_signature" };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [body, sig] = parts;

  const expectedSig = b64url(createHmac("sha256", SECRET).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: BookingLinkPayload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8")) as BookingLinkPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (Math.floor(Date.now() / 1000) > payload.x) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, payload };
}

// ─── Reschedule token (used when a visitor declines all offered slots) ──
export type ReschedulePayload = {
  n: string;       // visitor name
  e: string;       // visitor email
  p?: string;      // visitor phone (optional)
  l: string[];     // labels of the slots originally offered
  x: number;       // expiry (unix seconds)
};

export function signRescheduleToken(payload: ReschedulePayload): string {
  if (!SECRET) throw new Error("BOOKING_LINK_SECRET (or CRON_SECRET) is not configured");
  const body = b64url(JSON.stringify({ ...payload, _t: "reschedule" }));
  const sig = b64url(createHmac("sha256", SECRET).update(body).digest());
  return `${body}.${sig}`;
}

export type RescheduleTokenResult =
  | { ok: true; payload: ReschedulePayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export function verifyRescheduleToken(token: string): RescheduleTokenResult {
  if (!SECRET) return { ok: false, reason: "bad_signature" };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [body, sig] = parts;

  const expectedSig = b64url(createHmac("sha256", SECRET).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: ReschedulePayload & { _t?: string };
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (payload._t !== "reschedule") return { ok: false, reason: "malformed" };
  if (Math.floor(Date.now() / 1000) > payload.x) return { ok: false, reason: "expired" };
  return { ok: true, payload };
}
