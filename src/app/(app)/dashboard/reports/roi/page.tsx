"use client";

// Qwikly tenant ROI report. /dashboard/reports/roi.
// The single most important anti-churn surface, so the page focuses on what
// Qwikly captured, qualified, and put on the customer's calendar in real
// numbers over the last 30 days.

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useClient } from "@/lib/use-client";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/empty";
import { getRoiReport, type RoiReport } from "@/lib/reports/roi";
import { RoiKpiCard } from "@/components/reports/RoiKpiCard";
import { RoiFunnel } from "@/components/reports/RoiFunnel";
import { ResponseTimePanel } from "@/components/reports/ResponseTimePanel";
import { RecentBookingsTable } from "@/components/reports/RecentBookingsTable";
import { NextStepsCard } from "@/components/reports/NextStepsCard";

const ACCENTS = ["#E85A2C", "#3B82F6", "#22C55E", "#A855F7"];

function formatRefreshed(iso: string | null): string {
  if (!iso) return "just now";
  const d = new Date(iso);
  return d.toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function RoiReportPage() {
  const { client, loading: clientLoading } = useClient();
  const [report, setReport] = useState<RoiReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientLoading) return;
    if (!client?.id) {
      setReport(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const r = await getRoiReport(supabase, client.id, 30);
      if (!cancelled) {
        setReport(r);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client?.id, clientLoading]);

  // Loading shell
  if (loading || !report) {
    return (
      <>
        <PageHeader
          title="Your last 30 days with Qwikly"
          description="What Qwikly captured, qualified, and put on your calendar."
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-64 mb-6" />
        <Skeleton className="h-48" />
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Empty state, when the tenant has zero data of any kind.
  // ─────────────────────────────────────────────────────────────────────
  if (report.isEmpty) {
    return (
      <>
        <PageHeader
          eyebrow={`Refreshed ${formatRefreshed(report.generatedAt)}`}
          title="Your last 30 days with Qwikly"
          description="What Qwikly captured, qualified, and put on your calendar."
        />
        <Card className="!p-8">
          <div className="max-w-xl">
            <p className="font-display text-2xl text-fg leading-tight mb-3">
              Your first month of data will appear here once Qwikly starts capturing leads.
            </p>
            <p className="text-body text-fg-muted mb-5">
              In the meantime, see how this looks for Acme Plumbing, a plumber on the same plan as you.
            </p>
            <Link
              href="/case-studies/acme-plumbing"
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-ember text-white text-small font-semibold hover:bg-ember-deep transition-colors"
            >
              See Acme Plumbing&apos;s report
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={`Refreshed ${formatRefreshed(report.generatedAt)}`}
        title="Your last 30 days with Qwikly"
        description="What Qwikly captured, qualified, and put on your calendar."
      />

      {/* KPI ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <RoiKpiCard kpi={report.enquiriesCaptured} accent={ACCENTS[0]} />
        <RoiKpiCard kpi={report.qualifiedLeads} accent={ACCENTS[1]} />
        <RoiKpiCard kpi={report.jobsBooked} accent={ACCENTS[2]} />
        <RoiKpiCard kpi={report.revenueCaptured} accent={ACCENTS[3]} />
      </div>

      {/* FUNNEL + RESPONSE TIME */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <RoiFunnel levels={report.funnel} />
        <ResponseTimePanel data={report.responseTime} />
      </div>

      {/* RECENT BOOKINGS */}
      <div className="mb-6">
        <RecentBookingsTable rows={report.recentBookings} />
      </div>

      {/* NEXT STEPS */}
      <NextStepsCard suggestions={report.nextSteps} />
    </>
  );
}
