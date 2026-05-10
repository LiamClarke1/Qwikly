"use client";

import { useMemo, useState } from "react";
import { Info, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";

const PIPELINE_PRO_COST = 15000;

const DEFAULTS = {
  prospects: 1500,
  replyRate: 5,
  qualifiedRate: 40,
  showRate: 80,
  closeRate: 20,
  dealValue: 50000,
};

type FieldKey = "prospects" | "replyRate" | "qualifiedRate" | "showRate" | "closeRate" | "dealValue";

const TOOLTIPS: Record<FieldKey, string> = {
  prospects:
    "How many cold prospects we send personalized outreach to in a month. Pipeline Lite covers up to 1,500, Pipeline Pro up to 5,000.",
  replyRate:
    "Of the prospects we contact, the percent who reply. Industry average is around 0.5%. Qwikly campaigns target 4 to 15%.",
  qualifiedRate:
    "Of the people who reply, the percent who fit your ICP and want a meeting. The rest are out of scope, asking for info, or not a fit.",
  showRate:
    "Of the qualified meetings booked, the percent who actually attend the call.",
  closeRate:
    "Of the calls held, the percent who become paying clients. Higher for warm, ICP fit prospects.",
  dealValue:
    "The average revenue you earn from one new client. Use lifetime value if your retention is strong, or first contract value if you want a conservative number.",
};

function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue,
  ariaLabel,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
  ariaLabel: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        className="w-full h-2 appearance-none rounded-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, #E85A2C ${pct}%, rgba(14,14,12,0.12) ${pct}%)`,
        }}
      />
      <div className="mt-2 flex justify-between text-xs text-ink-400">
        <span>{formatValue ? formatValue(min) : min}</span>
        <span>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  );
}

function EstimateBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-ember/10 border border-ember/25">
      <span className="w-1 h-1 rounded-full bg-ember" aria-hidden />
      <span className="eyebrow text-[8px] tracking-widest text-ember">industry estimate</span>
    </span>
  );
}

function FieldHeader({
  label,
  tooltipKey,
  display,
  estimate = true,
}: {
  label: string;
  tooltipKey: FieldKey;
  display: string;
  estimate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm font-medium text-ink">{label}</label>
          <button
            type="button"
            aria-label={`What is ${label}?`}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            className="relative text-ink-500 hover:text-ember transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" strokeWidth={2} aria-hidden />
            {open && (
              <span
                role="tooltip"
                className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 z-30 px-3 py-2 rounded-xl bg-ink text-paper text-xs leading-relaxed shadow-lg text-left font-normal"
              >
                {TOOLTIPS[tooltipKey]}
              </span>
            )}
          </button>
          {estimate && <EstimateBadge />}
        </div>
      </div>
      <span className="eyebrow text-ember num">{display}</span>
    </div>
  );
}

export function PipelineForecastCalculator() {
  const [prospects, setProspects] = useState(DEFAULTS.prospects);
  const [replyRate, setReplyRate] = useState(DEFAULTS.replyRate);
  const [qualifiedRate, setQualifiedRate] = useState(DEFAULTS.qualifiedRate);
  const [showRate, setShowRate] = useState(DEFAULTS.showRate);
  const [closeRate, setCloseRate] = useState(DEFAULTS.closeRate);
  const [dealValue, setDealValue] = useState(DEFAULTS.dealValue);

  const reset = () => {
    setProspects(DEFAULTS.prospects);
    setReplyRate(DEFAULTS.replyRate);
    setQualifiedRate(DEFAULTS.qualifiedRate);
    setShowRate(DEFAULTS.showRate);
    setCloseRate(DEFAULTS.closeRate);
    setDealValue(DEFAULTS.dealValue);
  };

  const computed = useMemo(() => {
    const replies = Math.round(prospects * (replyRate / 100));
    const qualified = Math.round(replies * (qualifiedRate / 100));
    const callsHeld = Math.round(qualified * (showRate / 100));
    const dealsClosed = Math.round(callsHeld * (closeRate / 100));
    const revenue = dealsClosed * dealValue;
    const roiAbsolute = revenue - PIPELINE_PRO_COST;
    const roiMultiple = revenue > 0 ? revenue / PIPELINE_PRO_COST : 0;
    const breakEvenDeals = dealValue > 0 ? Math.max(1, Math.ceil(PIPELINE_PRO_COST / dealValue)) : 1;
    return {
      replies,
      qualified,
      callsHeld,
      dealsClosed,
      revenue,
      roiAbsolute,
      roiMultiple,
      breakEvenDeals,
    };
  }, [prospects, replyRate, qualifiedRate, showRate, closeRate, dealValue]);

  const dealLabel = computed.breakEvenDeals === 1 ? "deal" : "deals";

  return (
    <div className="ed-card p-6 md:p-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Inputs */}
        <div className="lg:col-span-7 space-y-7">
          <div>
            <FieldHeader
              label="Monthly prospects sent"
              tooltipKey="prospects"
              display={prospects.toLocaleString()}
            />
            <Slider
              min={500}
              max={5000}
              step={100}
              value={prospects}
              onChange={setProspects}
              formatValue={(v) => v.toLocaleString()}
              ariaLabel="Monthly prospects sent"
            />
          </div>

          <div>
            <FieldHeader
              label="Reply rate"
              tooltipKey="replyRate"
              display={`${replyRate}%`}
            />
            <Slider
              min={1}
              max={15}
              step={1}
              value={replyRate}
              onChange={setReplyRate}
              formatValue={(v) => `${v}%`}
              ariaLabel="Reply rate"
            />
          </div>

          <div>
            <FieldHeader
              label="Qualified meeting rate"
              tooltipKey="qualifiedRate"
              display={`${qualifiedRate}%`}
            />
            <Slider
              min={20}
              max={70}
              step={1}
              value={qualifiedRate}
              onChange={setQualifiedRate}
              formatValue={(v) => `${v}%`}
              ariaLabel="Qualified meeting rate"
            />
          </div>

          <div>
            <FieldHeader
              label="Show rate"
              tooltipKey="showRate"
              display={`${showRate}%`}
            />
            <Slider
              min={50}
              max={95}
              step={1}
              value={showRate}
              onChange={setShowRate}
              formatValue={(v) => `${v}%`}
              ariaLabel="Show rate"
            />
          </div>

          <div>
            <FieldHeader
              label="Close rate"
              tooltipKey="closeRate"
              display={`${closeRate}%`}
            />
            <Slider
              min={5}
              max={40}
              step={1}
              value={closeRate}
              onChange={setCloseRate}
              formatValue={(v) => `${v}%`}
              ariaLabel="Close rate"
            />
          </div>

          <div>
            <FieldHeader
              label="Average deal value"
              tooltipKey="dealValue"
              display={`R${dealValue.toLocaleString()}`}
            />
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500 text-sm font-medium pointer-events-none">
                R
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1000}
                step={1000}
                value={dealValue}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setDealValue(Number.isFinite(v) && v >= 0 ? v : 0);
                }}
                aria-label="Average deal value in Rand"
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-ink/12 bg-white/80 text-ink text-sm font-medium focus:outline-none focus:border-ember focus:ring-2 focus:ring-ember/20 num"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 text-xs font-medium text-ink-600 hover:text-ember transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} aria-hidden />
            Reset to industry baseline
          </button>
        </div>

        {/* Outputs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="ed-card-ink p-6">
            <p className="eyebrow text-paper/50 mb-5">Your monthly forecast</p>

            <div className="space-y-4">
              <OutputRow label="Replies" value={computed.replies.toLocaleString()} />
              <OutputRow label="Qualified meetings" value={computed.qualified.toLocaleString()} />
              <OutputRow label="Calls held" value={computed.callsHeld.toLocaleString()} />
              <OutputRow label="Deals closed" value={computed.dealsClosed.toLocaleString()} highlight />
            </div>

            <div className="rule-light mt-6 mb-5" />

            <p className="text-paper/60 text-xs uppercase tracking-widest mb-2">New revenue / month</p>
            <div className="font-display text-paper leading-none mb-5">
              <span className="text-ember text-4xl md:text-5xl">R</span>
              <span className="text-4xl md:text-5xl num">{computed.revenue.toLocaleString()}</span>
            </div>

            <div className="rounded-xl bg-paper/[0.06] border border-paper/10 p-4">
              <p className="eyebrow text-paper/50 mb-2">Expected ROI vs Pipeline Pro</p>
              <p className="text-paper/85 text-sm leading-relaxed">
                Pipeline Pro costs <span className="num font-semibold">R{PIPELINE_PRO_COST.toLocaleString()}</span> per month.
                {" "}
                <span
                  className={cn(
                    "num font-semibold",
                    computed.roiAbsolute >= 0 ? "text-ember" : "text-paper"
                  )}
                >
                  {computed.roiAbsolute >= 0 ? "+" : ""}R{computed.roiAbsolute.toLocaleString()}
                </span>
                {" "}net per month, {computed.roiMultiple.toFixed(1)}x return.
              </p>
            </div>
          </div>

          <div className="ed-card-ghost p-5">
            <p className="eyebrow text-ember mb-2">Takeaway</p>
            <p className="font-display text-lg md:text-xl text-ink leading-snug">
              If your numbers hit baseline, Qwikly Pipeline pays for itself when you close{" "}
              <span className="num text-ember">{computed.breakEvenDeals}</span> {dealLabel} per month.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OutputRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={cn("text-sm", highlight ? "text-paper" : "text-paper/70")}>{label}</span>
      <span
        className={cn(
          "font-display num leading-none",
          highlight ? "text-ember text-3xl" : "text-paper text-2xl"
        )}
      >
        {value}
      </span>
    </div>
  );
}
