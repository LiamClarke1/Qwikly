import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.qwikly.co.za";
const YOCO_SECRET = process.env.YOCO_SECRET_KEY ?? "";

async function getClientId(): Promise<number | null> {
  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const db = supabaseAdmin();
  const { data } = await db.from("clients").select("id").eq("auth_user_id", user.id).maybeSingle();
  return data?.id ?? null;
}

export async function POST(_req: NextRequest, { params }: { params: { invoice_id: string } }) {
  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data: billingInvoice } = await db
    .from("qwikly_billing_invoices")
    .select("id, client_id, total_zar, status")
    .eq("id", params.invoice_id)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!billingInvoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (billingInvoice.status === "paid") return NextResponse.json({ error: "Already paid" }, { status: 400 });
  if (!YOCO_SECRET) return NextResponse.json({ mode: "eft_only" });

  const amountCents = Math.round(billingInvoice.total_zar * 100);

  const yocoRes = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${YOCO_SECRET}`,
    },
    body: JSON.stringify({
      amount: amountCents,
      currency: "ZAR",
      successUrl: `${BASE_URL}/dashboard/billing?paid=1`,
      cancelUrl: `${BASE_URL}/dashboard/billing`,
      metadata: { type: "qwikly_billing", billing_invoice_id: billingInvoice.id },
    }),
  });

  if (!yocoRes.ok) return NextResponse.json({ mode: "eft_only" });

  const { redirectUrl } = await yocoRes.json();
  return NextResponse.json({ url: redirectUrl });
}
