import Link from "next/link";
import {
  Clock, Loader, Mail, ShieldCheck, AlertTriangle, CheckCircle2, Settings,
  Hourglass,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { CrmClientListItem } from "@/lib/crm-types";

export function NextInvoiceBadge({ c }: { c: CrmClientListItem }) {
  // Trial clients aren't billed yet, so show the trial-countdown badge in
  // place of the "next invoice" pill. Once they upgrade off trial, the rest
  // of this component takes over.
  if (c.plan === "trial") {
    if (!c.trial_ends_at) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-slate-50 text-slate-500 border-slate-200 whitespace-nowrap">
          <Hourglass className="w-3 h-3" />
          Trial (no end date)
        </span>
      );
    }
    const trialDays = Math.ceil((new Date(c.trial_ends_at).getTime() - Date.now()) / 86_400_000);
    if (trialDays < 0) {
      return <Pill icon={AlertTriangle} text="Trial ended" cls="bg-red-50 text-red-600 border-red-200" />;
    }
    if (trialDays <= 3) {
      return <Pill icon={Hourglass} text={`Trial: ${trialDays} ${trialDays === 1 ? "day" : "days"} left`} cls="bg-amber-50 text-amber-700 border-amber-200" />;
    }
    return <Pill icon={Hourglass} text={`Trial: ${trialDays} days left`} cls="bg-[#E85A2C]/10 text-[#E85A2C] border-[#E85A2C]/30" />;
  }

  const status = c.latest_billing_invoice_status;
  const days = c.next_invoice_at
    ? Math.ceil((new Date(c.next_invoice_at).getTime() - Date.now()) / 86_400_000)
    : null;

  if (!c.billing_anchor_day) {
    return (
      <Link href={`/admin/clients/${c.id}#billing`}
        className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#E85A2C] transition-colors">
        <Settings className="w-3 h-3" />
        Set billing day
      </Link>
    );
  }

  if (status === "awaiting_verification") {
    return <Pill icon={ShieldCheck} text="Verify payment" cls="bg-violet-50 text-violet-700 border-violet-200 motion-safe:animate-pulse" />;
  }
  if (status === "overdue") {
    return <Pill icon={AlertTriangle} text={`Overdue ${c.days_overdue ?? 0}d`} cls="bg-red-50 text-red-600 border-red-200" />;
  }
  if (status === "sent") {
    return <Pill icon={Mail} text="Invoice sent" cls="bg-blue-50 text-blue-700 border-blue-200" />;
  }
  if (status === "draft") {
    return <Pill icon={Loader} text="Draft to send" cls="bg-amber-50 text-amber-700 border-amber-200" />;
  }
  if (days === 0) {
    return <Pill icon={Loader} text="Generating today" cls="bg-[#E85A2C]/10 text-[#E85A2C] border-[#E85A2C]/30" />;
  }
  if (days !== null && days <= 4) {
    return <Pill icon={Clock} text={`In ${days} days`} cls="bg-amber-50 text-amber-700 border-amber-200" />;
  }
  if (status === "paid" && days !== null) {
    return <Pill icon={CheckCircle2} text={`Paid, next in ${days}d`} cls="bg-emerald-50 text-emerald-700 border-emerald-200" />;
  }
  return <Pill icon={Clock} text={days !== null ? `In ${days} days` : ""} cls="bg-slate-50 text-slate-600 border-slate-200" />;
}

function Pill({ icon: Icon, text, cls }: { icon: React.ElementType; text: string; cls: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap", cls)}>
      <Icon className="w-3 h-3" />
      {text}
    </span>
  );
}
