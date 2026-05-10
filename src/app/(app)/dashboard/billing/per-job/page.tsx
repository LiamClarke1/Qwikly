import { redirect } from "next/navigation";
import { v2Auth } from "@/lib/v2-auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { listPerJobLines } from "@/lib/billing/per-job/list";
import { PageHeader } from "@/components/ui/page";
import { PerJobSummaryCard } from "@/components/billing/PerJobSummaryCard";
import { PerJobClientView } from "./PerJobClientView";

export const dynamic = "force-dynamic";

export default async function PerJobBillingPage() {
  const auth = await v2Auth();
  if (!auth) redirect("/login");

  const db = supabaseAdmin();
  const { data: business } = await db
    .from("businesses")
    .select("per_job_addon_enabled, per_job_rate_zar")
    .eq("id", auth.businessId)
    .maybeSingle();

  const enabled = Boolean(business?.per_job_addon_enabled);
  const rateZar =
    typeof business?.per_job_rate_zar === "number" && business.per_job_rate_zar > 0
      ? business.per_job_rate_zar
      : 350;

  // Pull recent lines, narrow to current month in JS so an empty month
  // still shows the empty state instead of a stale snippet from last month.
  const lines = await listPerJobLines(auth.businessId, undefined, 200);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = now.toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  const monthLines = lines.filter(
    (l) => new Date(l.created_at) >= monthStart,
  );

  const totalAmount = monthLines.reduce((s, l) => s + l.amount_zar, 0);
  const pendingCount = monthLines.filter((l) => l.status === "pending").length;

  // Pass plain serialisable data to the client island. The client component
  // owns the toggle / dispute interactions and calls the server actions.
  const rows = monthLines.map((line) => ({
    id: line.id,
    customerName: line.booking?.customer_name ?? null,
    bookingStatus: line.booking?.status ?? null,
    bookingDate:
      line.booking?.completed_at ??
      line.booking?.booking_datetime ??
      line.created_at,
    amountZar: line.amount_zar,
    lineStatus: line.status,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title={`Pay-per-job invoices for ${monthLabel}`}
        description="These are the bookings that triggered the R350 success fee this month. Review and approve, or dispute if a booking did not actually convert."
      />

      <div className="space-y-5">
        <PerJobSummaryCard
          monthLabel={monthLabel}
          totalLines={monthLines.length}
          pendingLines={pendingCount}
          totalAmountZar={totalAmount}
        />

        <PerJobClientView
          enabled={enabled}
          rateZar={rateZar}
          rows={rows}
        />
      </div>
    </>
  );
}
