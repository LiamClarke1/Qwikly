import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { z } from "zod";
import { generateDraftInvoice } from "@/lib/billing/invoice-generator";

export const dynamic = "force-dynamic";

const Body = z.object({
  client_id: z.number().int().positive(),
});

/**
 * POST /api/admin/billing/generate
 *
 * Immediately generates a draft Qwikly→client subscription invoice for the
 * given client, outside the normal cron cycle. Idempotent: returns the
 * existing invoice if one was already created today.
 *
 * Used from:
 *   - The admin billing page (header "Generate invoice" button)
 *   - The Billing tab on the client detail page
 */
export async function POST(req: NextRequest) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", detail: parsed.error.flatten() }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const result = await generateDraftInvoice(sb, parsed.data.client_id);

  if (result.status === "skipped" && result.reason !== "already_invoiced_today") {
    return NextResponse.json({ error: result.reason ?? "skipped" }, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    invoice_id: result.invoice_id,
    status: result.status,
    reason: result.reason ?? null,
    warnings: result.warnings ?? [],
  }, { status: result.status === "draft" ? 201 : 200 });
}
