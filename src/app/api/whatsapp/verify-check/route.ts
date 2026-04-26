import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const { phone, code, client_id } = await req.json();
  if (!phone || !code || !client_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  const normalised = phone.replace(/\s+/g, "").startsWith("+")
    ? phone.replace(/\s+/g, "")
    : `+${phone.replace(/\D/g, "")}`;

  try {
    const result = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SID!)
      .verificationChecks.create({ to: normalised, code });

    if (result.status !== "approved") {
      return NextResponse.json({ error: "Incorrect code. Try again." }, { status: 400 });
    }

    const db = supabaseAdmin();
    await db.from("clients")
      .update({ whatsapp_number: normalised, whatsapp_verified: true })
      .eq("id", client_id);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
