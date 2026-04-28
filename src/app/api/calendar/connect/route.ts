import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getOAuthClient, SCOPES } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[calendar/connect] CRON_SECRET env var is not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const hmac = createHmac("sha256", cronSecret)
    .update(clientId)
    .digest("hex");
  const state = `${clientId}.${hmac}`;

  const auth = getOAuthClient();
  const url = auth.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(url);
}
