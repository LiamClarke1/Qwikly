"use client";

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/cn";
import CTAButton from "@/components/CTAButton";

const REPLY_DELAY_MULTIPLIERS: Record<string, number> = {
  never: 0.05,
  sometimes: 0.25,
  often: 0.5,
  always: 0.75,
};

const REPLY_LABELS = ["Never", "Sometimes", "Often", "Always"];
const REPLY_VALUES = ["never", "sometimes", "often", "always"];

function Slider({
  min, max, step = 1, value, onChange, formatValue, label,
}: {
  min: number; max: number; step?: number; value: number; onChange: (v: number) => void; formatValue?: (v: number) => string; label?: string;
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
        aria-label={label ?? (formatValue ? `Value: ${formatValue(value)}` : `Value: ${value}`)}
        className="w-full h-2 appearance-none rounded-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, #E85A2C ${pct}%, rgba(14,14,12,0.12) ${pct}%)`,
        }}
      />
      <div className="mt-2 flex justify-between text-xs text-ink-400">
        <span>{formatValue ? formatValue(min) : min}</span>
        <span className="text-ink font-semibold text-sm">{formatValue ? formatValue(value) : value}</span>
        <span>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  );
}

export function RevenueCalculator() {
  const [leads, setLeads] = useState(20);
  const [jobValue, setJobValue] = useState(3000);
  const [replyDelay, setReplyDelay] = useState(1);
  const [shown, setShown] = useState(false);

  const delayKey = REPLY_VALUES[replyDelay] as keyof typeof REPLY_DELAY_MULTIPLIERS;
  const missRate = REPLY_DELAY_MULTIPLIERS[delayKey];

  const monthlyLoss = useMemo(() => {
    const leadsPerMonth = leads * 4;
    const lostLeads = Math.round(leadsPerMonth * missRate);
    return lostLeads * jobValue;
  }, [leads, jobValue, missRate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const l = Number(params.get("calc_leads"));
    const jv = Number(params.get("calc_jobvalue"));
    const rd = Number(params.get("calc_delay"));
    if (l >= 5 && l <= 100) setLeads(l);
    if (jv >= 500 && jv <= 20000) setJobValue(jv);
    if (rd >= 0 && rd <= 3) setReplyDelay(rd);
  }, []);

  const saveToUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("calc_leads", String(leads));
    url.searchParams.set("calc_jobvalue", String(jobValue));
    url.searchParams.set("calc_delay", String(replyDelay));
    window.history.replaceState({}, "", url.toString());
    setShown(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      {/* Inputs */}
      <div className="lg:col-span-6 space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-ink">WhatsApp & email leads per week</label>
            <span className="eyebrow text-ember">{leads}</span>
          </div>
          <Slider min={5} max={100} value={leads} onChange={setLeads} label="WhatsApp and email leads per week" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-ink">Average job value</label>
            <span className="eyebrow text-ember">R{jobValue.toLocaleString()}</span>
          </div>
          <Slider
            min={500}
            max={20000}
            step={500}
            value={jobValue}
            onChange={setJobValue}
            formatValue={(v) => `R${(v / 1000).toFixed(0)}k`}
            label="Average job value in Rand"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-ink block mb-4">
            How often do you miss replying within 30 minutes?
          </label>
          <div className="flex gap-2">
            {REPLY_LABELS.map((label, i) => (
              <button
                key={label}
                onClick={() => setReplyDelay(i)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-medium cursor-pointer border transition-all duration-200",
                  replyDelay === i
                    ? "bg-ink text-paper border-ink"
                    : "bg-white/60 text-ink-600 border-ink/12 hover:border-ink/25"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={saveToUrl}
          className="btn-ember w-full justify-center"
        >
          Calculate my loss
          <svg className="btn-arrow w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Result */}
      <div className="lg:col-span-6">
        <div className={cn(
          "ed-card-ink p-8 transition-all duration-500",
          shown ? "opacity-100 translate-y-0" : "opacity-40 translate-y-2"
        )}>
          <p className="eyebrow text-paper/50 mb-4">Your estimated monthly loss</p>
          <div className="font-display text-paper leading-none">
            <span className="text-ember text-5xl">R</span>
            <span className="text-5xl num">{monthlyLoss.toLocaleString()}</span>
          </div>
          <p className="mt-3 text-paper/60 text-sm leading-relaxed">
            to slow replies. {REPLY_LABELS[replyDelay]} missing the first-reply window on {Math.round(leads * 4 * REPLY_DELAY_MULTIPLIERS[delayKey])} leads a month.
          </p>

          <div className="rule-light mt-6 mb-6" />

          <p className="text-paper/80 text-sm leading-relaxed">
            Qwikly recovers most of this for{" "}
            <strong className="text-paper">R150 per booked job</strong>. The first job it books usually pays for the whole month.
          </p>

          <div className="mt-6">
            <CTAButton size="lg" variant="solid" href="/signup" className="w-full justify-center">
              Start free trial. Pay nothing for 7 days.
            </CTAButton>
          </div>
        </div>
      </div>
    </div>
  );
}
