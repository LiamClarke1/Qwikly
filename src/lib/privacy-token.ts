import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.PRIVACY_DELETION_SECRET || process.env.CRON_SECRET || "";

export type PrivacyDeletionPayload = {
  rid: string;
  email: string;
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

export function signPrivacyDeletionToken(payload: PrivacyDeletionPayload): string {
  if (!SECRET) throw new Error("PRIVACY_DELETION_SECRET (or CRON_SECRET) is not configured");
  const body = b64url(JSON.stringify({ ...payload, _t: "privacy_delete" }));
  const sig = b64url(createHmac("sha256", SECRET).update(body).digest());
  return `${body}.${sig}`;
}

export type PrivacyTokenResult =
  | { ok: true; payload: PrivacyDeletionPayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export function verifyPrivacyDeletionToken(token: string): PrivacyTokenResult {
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

  let payload: PrivacyDeletionPayload & { _t?: string };
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (payload._t !== "privacy_delete") return { ok: false, reason: "malformed" };
  if (Math.floor(Date.now() / 1000) > payload.x) return { ok: false, reason: "expired" };
  return { ok: true, payload };
}
