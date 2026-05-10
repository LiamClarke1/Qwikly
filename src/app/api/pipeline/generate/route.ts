// POST /api/pipeline/generate
//
// Internal endpoint, gated on x-qwikly-internal so only Mission Control or
// other internal callers can invoke prospect generation. Body is the same
// GenerateProspectInput that the dashboard form posts. For the production
// integration spec, see docs/pipeline-platform.md.
//
// TODO: replace stub generator with real Apollo + Hunter pipeline. Spec in
// docs/pipeline-platform.md.

import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/log";
import {
  generateProspectInputSchema,
} from "@/lib/pipeline/generator/types";
import { persistProspects } from "@/app/(app)/dashboard/pipeline/generate/actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const expected = process.env.QWIKLY_INTERNAL_TOKEN;
  if (!expected) {
    log("error", "pipeline_generate_internal_token_missing");
    return NextResponse.json(
      { ok: false, reason: "server_misconfigured" },
      { status: 500 },
    );
  }
  const provided = req.headers.get("x-qwikly-internal");
  if (provided !== expected) {
    return NextResponse.json(
      { ok: false, reason: "unauthorized" },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_json" },
      { status: 400 },
    );
  }

  // Internal callers must include tenantId explicitly, since we cannot read
  // a session cookie here.
  const body = (payload ?? {}) as { tenantId?: unknown; input?: unknown };
  const tenantIdRaw = body.tenantId;
  const tenantId =
    typeof tenantIdRaw === "string" || typeof tenantIdRaw === "number"
      ? tenantIdRaw
      : null;
  if (tenantId === null) {
    return NextResponse.json(
      { ok: false, reason: "tenantId_required" },
      { status: 400 },
    );
  }

  const parsed = generateProspectInputSchema.safeParse(body.input);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid_input" },
      { status: 400 },
    );
  }

  const result = await persistProspects({ input: parsed.data, tenantId });
  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}
