// DEPRECATED: legacy 8% commission model, removed 2026-05-11.
//
// This endpoint used to generate weekly Qwikly commission invoices for
// billing_active clients by aggregating pending rows from the `commissions`
// table. The commission model is replaced by monthly subscriptions; tenant
// billing now flows through PayFast + the `subscriptions` table.
//
// The route is kept as a no-op for backwards compatibility with any external
// caller that may still POST here. It returns ok with zero generated invoices.
// Remove entirely once we confirm no caller depends on this path.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    generated: 0,
    results: [],
    deprecated: "commission_invoicing_replaced_by_subscription",
  });
}
