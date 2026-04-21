import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, SCOPES } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
  }

  const auth = getOAuthClient();
  const url = auth.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: clientId,
  });

  return NextResponse.redirect(url);
}
