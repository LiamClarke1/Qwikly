import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.BOOKING_LINK_SECRET || process.env.CRON_SECRET || "";

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signInvoicePayToken(invoiceId: string): string {
  if (!SECRET) throw new Error("BOOKING_LINK_SECRET (or CRON_SECRET) is not configured");
  const body = b64url(`pay:${invoiceId}`);
  const sig = b64url(createHmac("sha256", SECRET).update(body).digest());
  return `${body}.${sig}`;
}

export type InvoicePayTokenResult =
  | { ok: true; invoiceId: string }
  | { ok: false; reason: "malformed" | "bad_signature" | "no_secret" };

export function verifyInvoicePayToken(token: string): InvoicePayTokenResult {
  if (!SECRET) return { ok: false, reason: "no_secret" };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [body, sig] = parts;

  const expectedSig = b64url(createHmac("sha256", SECRET).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }

  let decoded: string;
  try {
    decoded = b64urlDecode(body).toString("utf8");
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (!decoded.startsWith("pay:")) return { ok: false, reason: "malformed" };
  const invoiceId = decoded.slice(4);
  if (!invoiceId) return { ok: false, reason: "malformed" };

  return { ok: true, invoiceId };
}
