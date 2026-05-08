import { NextRequest, NextResponse } from "next/server";
import { getOrGenerateStarterPrompts } from "@/lib/starter-prompts";
import { checkRateLimit, retryAfterSeconds } from "@/lib/rate-limit";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipOk = await checkRateLimit(`starter-prompts:ip:${ip}`, 30);
  if (!ipOk) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      { status: 429, headers: { ...CORS, "Retry-After": String(retryAfterSeconds("minute")) } }
    );
  }

  const tenantId = req.nextUrl.searchParams.get("tenant_id");
  if (!tenantId || tenantId.length < 4) {
    return NextResponse.json(
      { ok: false, reason: "invalid_tenant_id" },
      { status: 400, headers: CORS }
    );
  }

  const result = await getOrGenerateStarterPrompts(tenantId);
  return NextResponse.json(result, { headers: CORS });
}
