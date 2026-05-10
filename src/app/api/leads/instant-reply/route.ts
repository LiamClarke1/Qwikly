// POST /api/leads/instant-reply
//
// Internal endpoint, called either by a Supabase function (database webhook
// fired on row insert into `leads`) or by the chat-widget capture handler
// straight after the lead row is written. Gates on `x-qwikly-internal` so
// random traffic from the public internet cannot fan out Twilio messages on
// the tenant's bill.

import { NextRequest, NextResponse } from "next/server";
import { dispatchInstantReply } from "@/lib/instant-reply/dispatch";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const expected = process.env.QWIKLY_INTERNAL_TOKEN;
  if (!expected) {
    log("error", "instant_reply_internal_token_missing");
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }
  const provided = req.headers.get("x-qwikly-internal");
  if (provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { leadId?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const leadId = typeof payload.leadId === "string" ? payload.leadId : null;
  if (!leadId) {
    return NextResponse.json({ error: "leadId_required" }, { status: 400 });
  }

  const result = await dispatchInstantReply({ leadId });
  if (result.ok) {
    return NextResponse.json(result);
  }
  return NextResponse.json(result, { status: 200 });
}
