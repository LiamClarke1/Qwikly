// POST /api/leads/instant-reply/inbound
//
// Twilio inbound webhook. Receives the owner's reply to the instant
// notification. If the body is YES (case insensitive) or a one-letter
// shortcut, Qwikly auto-sends the booking link to the most recent captured
// lead for that owner.
//
// We verify the request signature with TWILIO_AUTH_TOKEN so spoofed POSTs
// cannot trigger outbound paid messages.

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { handleOwnerReply } from "@/lib/instant-reply/dispatch";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function twilioMl(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${body}</Message></Response>`;
}

export async function POST(req: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    log("error", "instant_reply_inbound_no_auth_token");
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url = req.nextUrl.toString();

  // Twilio posts application/x-www-form-urlencoded.
  const raw = await req.text();
  const params = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>;

  const isValid = twilio.validateRequest(authToken, signature, url, params);
  if (!isValid) {
    log("warn", "instant_reply_inbound_bad_signature", { url });
    return NextResponse.json({ error: "invalid_signature" }, { status: 403 });
  }

  const fromNumber = params.From ?? "";
  const body = params.Body ?? "";

  const result = await handleOwnerReply({ fromNumber, body });

  // Twilio expects TwiML or 200. Reply with a short ack so the owner sees a
  // confirmation in the same thread when we successfully fired the link.
  const ack = result.ok
    ? "Sent. The lead just got your booking link."
    : "Got it.";

  return new NextResponse(twilioMl(ack), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
