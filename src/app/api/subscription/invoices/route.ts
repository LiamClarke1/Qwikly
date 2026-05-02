import { NextResponse } from "next/server";
import { v2Auth } from "@/lib/v2-auth";
import { paystack } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await v2Auth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!auth.paystackCustomerCode) {
    return NextResponse.json({ invoices: [] });
  }

  try {
    const transactions = await paystack.transaction.list({
      customer: auth.paystackCustomerCode,
      perPage: 24,
    });

    const invoices = transactions
      .filter((t) => t.status === "success")
      .map((t) => ({
        id: String(t.id),
        issuedAt: t.paid_at ?? t.created_at,
        amountZar: Math.round(t.amount / 100),
        status: "paid" as const,
        pdfUrl: null,
      }));

    return NextResponse.json({ invoices });
  } catch (err) {
    console.error("[subscription/invoices] Paystack error:", err);
    return NextResponse.json({ invoices: [] });
  }
}
