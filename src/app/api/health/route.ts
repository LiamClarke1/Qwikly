import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

interface ServiceCheck {
  name: string;
  status: "ok" | "error";
  latency_ms?: number;
  error?: string;
}

export async function GET() {
  const checks: ServiceCheck[] = [];
  const start = Date.now();

  // Database
  try {
    const t0 = Date.now();
    const db = supabaseAdmin();
    const { error } = await db.from("clients").select("id").limit(1);
    checks.push({ name: "database", status: error ? "error" : "ok", latency_ms: Date.now() - t0, error: error?.message });
  } catch (e) {
    checks.push({ name: "database", status: "error", error: String(e) });
  }

  // Twilio / WhatsApp (env var presence check only — don't make a live call)
  checks.push({
    name: "whatsapp",
    status: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? "ok" : "error",
  });

  // Email (env var presence)
  checks.push({
    name: "email",
    status: process.env.RESEND_API_KEY ? "ok" : "error",
  });

  // AI (env var presence)
  checks.push({
    name: "ai",
    status: process.env.ANTHROPIC_API_KEY ? "ok" : "error",
  });

  const allOk = checks.every((c) => c.status === "ok");
  const httpStatus = allOk ? 200 : 503;

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptime_ms: Date.now() - start,
      services: checks,
    },
    {
      status: httpStatus,
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
