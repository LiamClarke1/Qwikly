"use client";

import { useState, useMemo } from "react";
import CTAButton from "@/components/CTAButton";
import { cn } from "@/lib/cn";

// Visual clone of RevenueCalculator, accepting niche-specific defaults.
// Math: monthly missed revenue = enquiries per month * (1 - close rate) * job value.
// All numbers prefilled from the niche record are industry estimates.

interface Props {
  nicheLabel: string;
  defaultJobValue: number;
  defaultEnquiriesPerMonth: number;
  defaultCloseRate: number;
}

function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue,
  label,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
  label?: string;
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
        <span className="text-ink font-semibold text-sm">
          {formatValue ? formatValue(value) : value}
        </span>
        <span>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  );
}

export function NicheRevenueCalc({
  nicheLabel,
  defaultJobValue,
  defaultEnquiriesPerMonth,
  defaultCloseRate,
}: Props) {
  const [enquiries, setEnquiries] = useState(defaultEnquiriesPerMonth);
  const [jobValue, setJobValue] = useState(defaultJobValue);
  const [closeRate, setCloseRate] = useState(Math.round(defaultCloseRate * 100));
  const [shown, setShown] = useState(false);

  // Missed revenue assumes you currently capture only the close rate share,
  // and that Qwikly recovers the rest of the contactable enquiries.
  const monthlyLoss = useMemo(() => {
    const missed = enquiries * (1 - closeRate / 100);
    return Math.round(missed * jobValue);
  }, [enquiries, jobValue, closeRate]);

  const recovered = useMemo(() => {
    const missed = enquiries * (1 - closeRate / 100);
    return Math.round(missed * jobValue);
  }, [enquiries, jobValue, closeRate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      {/* Inputs */}
      <div className="lg:col-span-6 space-y-8">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-ink">
              Website enquiries per month
            </label>
            <span className="eyebrow text-ember">{enquiries}</span>
          </div>
          <p className="text-xs text-ink-400 mb-4">
            Prefilled with the {nicheLabel} industry estimate. Drag to match yours.
          </p>
          <Slider
            min={5}
            max={200}
            value={enquiries}
            onChange={setEnquiries}
            label="Website enquiries per month"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-ink">Average job value</label>
            <span className="eyebrow text-ember">R{jobValue.toLocaleString()}</span>
          </div>
          <p className="text-xs text-ink-400 mb-4">
            Prefilled with the {nicheLabel} industry estimate.
          </p>
          <Slider
            min={500}
            max={20000}
            step={250}
            value={jobValue}
            onChange={setJobValue}
            formatValue={(v) => `R${(v / 1000).toFixed(1)}k`}
            label="Average job value in Rand"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-ink">
              Close rate today
            </label>
            <span className="eyebrow text-ember">{closeRate}%</span>
          </div>
          <p className="text-xs text-ink-400 mb-4">
            How many enquiries you turn into a booking right now. {nicheLabel} industry estimate prefilled.
          </p>
          <Slider
            min={5}
            max={90}
            step={5}
            value={closeRate}
            onChange={setCloseRate}
            formatValue={(v) => `${v}%`}
            label="Current close rate percentage"
          />
        </div>

        <button
          onClick={() => setShown(true)}
          className="btn-ember w-full justify-center"
        >
          Show what I am leaving on the table
          <svg className="btn-arrow w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Result */}
      <div className="lg:col-span-6">
        <div
          className={cn(
            "ed-card-ink p-8 transition-all duration-500",
            shown ? "opacity-100 translate-y-0" : "opacity-40 translate-y-2"
          )}
        >
          <p className="eyebrow text-paper/50 mb-4">
            Estimated monthly revenue you are missing
          </p>
          <div className="font-display text-paper leading-none">
            <span className="text-ember text-5xl">R</span>
            <span className="text-5xl num">{monthlyLoss.toLocaleString()}</span>
          </div>
          <p className="mt-3 text-paper/60 text-sm leading-relaxed">
            Based on {enquiries} enquiries a month at R{jobValue.toLocaleString()} per job, with a {closeRate}% current close rate. Industry estimate, refine to match your books.
          </p>

          <div className="rule-light mt-6 mb-6" />

          <p className="text-paper/80 text-sm leading-relaxed">
            Qwikly captures the enquiries you currently miss and books them while you work. Recovering even a third of this is worth roughly{" "}
            <strong className="text-paper">R{Math.round(recovered / 3).toLocaleString()}</strong>{" "}
            in new revenue a month.
          </p>

          <div className="mt-6">
            <CTAButton
              size="lg"
              variant="solid"
              href="/contact"
              className="w-full justify-center"
            >
              Book a setup call
            </CTAButton>
          </div>
        </div>
      </div>
    </div>
  );
}
