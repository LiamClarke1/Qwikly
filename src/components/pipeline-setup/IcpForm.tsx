"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { generateAndRedirect } from "@/app/(app)/dashboard/pipeline/setup/actions";
import type { IcpDefinition } from "@/lib/pipeline/setup-state";

interface Props {
  initialIcp: IcpDefinition;
  hasExistingIcp: boolean;
}

const INDUSTRIES = [
  "Construction",
  "Professional Services",
  "SaaS",
  "Healthcare",
  "Education",
  "Financial Services",
  "Marketing",
  "Manufacturing",
  "Retail",
  "Hospitality",
  "Legal",
  "Real Estate",
] as const;

const TITLES = [
  "Owner",
  "Founder",
  "CEO",
  "COO",
  "Managing Director",
  "Head of Sales",
  "Head of Marketing",
  "Operations Manager",
  "Sales Manager",
  "Marketing Manager",
  "General Manager",
  "Practice Manager",
] as const;

const LOCATIONS = [
  "Anywhere in SA",
  "Cape Town",
  "Johannesburg",
  "Pretoria",
  "Durban",
  "Stellenbosch",
  "Port Elizabeth",
  "Bloemfontein",
  "East London",
  "Centurion",
  "Sandton",
  "International",
] as const;

const INTENT_SIGNALS = [
  "Recently hired",
  "Recently funded",
  "Hiring sales reps",
  "Tech stack change",
  "Growing fast",
  "New product launch",
] as const;

const SIZE_MIN = 5;
const SIZE_MAX = 500;

function toggle<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-1.5 rounded-full text-small border transition-colors " +
        (on
          ? "bg-ember/15 text-ember border-ember/40"
          : "bg-surface-input text-fg-muted border-[var(--border)] hover:bg-surface-hover")
      }
    >
      {children}
    </button>
  );
}

export default function IcpForm({ initialIcp, hasExistingIcp }: Props) {
  const [offer, setOffer] = useState(initialIcp.offer);
  const [industries, setIndustries] = useState<string[]>(initialIcp.industries);
  const [titles, setTitles] = useState<string[]>(initialIcp.titles);
  const [sizeMin, setSizeMin] = useState<number>(
    Number.isFinite(initialIcp.sizeMin) ? initialIcp.sizeMin : SIZE_MIN,
  );
  const [sizeMax, setSizeMax] = useState<number>(
    Number.isFinite(initialIcp.sizeMax) ? initialIcp.sizeMax : 50,
  );
  const [locations, setLocations] = useState<string[]>(initialIcp.locations);
  const [intentSignals, setIntentSignals] = useState<string[]>(initialIcp.intentSignals);
  const [dealValueZar, setDealValueZar] = useState<number>(
    Number.isFinite(initialIcp.dealValueZar) && initialIcp.dealValueZar > 0
      ? initialIcp.dealValueZar
      : 20000,
  );

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const sizeLabel = useMemo(() => {
    const lo = Math.min(sizeMin, sizeMax);
    const hi = Math.max(sizeMin, sizeMax);
    const hiLabel = hi >= SIZE_MAX ? "500+" : String(hi);
    return `${lo} to ${hiLabel} employees`;
  }, [sizeMin, sizeMax]);

  const dealLabel = useMemo(
    () => `R${(dealValueZar || 0).toLocaleString("en-ZA")}`,
    [dealValueZar],
  );

  function submit() {
    setError(null);

    if (!offer.trim()) {
      setError("Tell us what you sell, even one sentence is enough.");
      return;
    }
    if (industries.length === 0) {
      setError("Pick at least one industry to target.");
      return;
    }
    if (titles.length === 0) {
      setError("Pick at least one job title to target.");
      return;
    }
    if (locations.length === 0) {
      setError("Pick at least one location.");
      return;
    }
    if (!dealValueZar || dealValueZar < 1) {
      setError("Enter your average deal value in ZAR.");
      return;
    }

    const payload: IcpDefinition = {
      offer: offer.trim(),
      industries,
      titles,
      sizeMin: Math.min(sizeMin, sizeMax),
      sizeMax: Math.max(sizeMin, sizeMax),
      locations,
      intentSignals,
      dealValueZar,
    };

    startTransition(async () => {
      const res = await generateAndRedirect(payload);
      if (!res.ok) {
        setError(res.reason);
        return;
      }
      router.push("/dashboard/pipeline");
      router.refresh();
    });
  }

  return (
    <div className="space-y-7 max-w-3xl">
      <div>
        <p className="eyebrow text-ember mb-2">Pipeline setup</p>
        <h1 className="display-md text-ink leading-tight tracking-tight font-serif">
          {hasExistingIcp ? "Update your ICP" : "Tell us who you want to reach"}
        </h1>
        <p className="text-body text-ink-500 mt-2">
          {hasExistingIcp
            ? "Refresh your prospect list. We will regenerate matching prospects automatically."
            : "We will generate the hottest matching prospects automatically. No domains, no infra, no manual setup."}
        </p>
      </div>

      <Card>
        <div className="space-y-7">
          <Field
            label="Your offer"
            hint="What do you sell, and what is the typical deal value? One to two sentences."
          >
            <Textarea
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder="We sell a digital assistant for dental practices that books new patients after hours. Average package, R8,000 per month."
              rows={3}
            />
          </Field>

          <Field
            label="Industries to target"
            hint="Pick every industry that fits. The more specific, the better the match."
          >
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((opt) => (
                <Chip
                  key={opt}
                  on={industries.includes(opt)}
                  onClick={() => setIndustries((prev) => toggle(prev, opt))}
                >
                  {opt}
                </Chip>
              ))}
            </div>
          </Field>

          <Field
            label="Job titles to target"
            hint="Decision-makers you want to land in front of."
          >
            <div className="flex flex-wrap gap-2">
              {TITLES.map((opt) => (
                <Chip
                  key={opt}
                  on={titles.includes(opt)}
                  onClick={() => setTitles((prev) => toggle(prev, opt))}
                >
                  {opt}
                </Chip>
              ))}
            </div>
          </Field>

          <Field
            label={`Company size, ${sizeLabel}`}
            hint="Drag the sliders to set the headcount range. 500+ means no upper limit."
          >
            <div className="grid grid-cols-2 gap-5 pt-1">
              <div>
                <label className="block text-tiny text-fg-muted mb-1.5 font-mono">
                  Min, {sizeMin}
                </label>
                <input
                  type="range"
                  min={SIZE_MIN}
                  max={SIZE_MAX}
                  step={5}
                  value={sizeMin}
                  onChange={(e) => setSizeMin(Number(e.target.value))}
                  className="w-full accent-ember"
                />
              </div>
              <div>
                <label className="block text-tiny text-fg-muted mb-1.5 font-mono">
                  Max, {sizeMax >= SIZE_MAX ? "500+" : sizeMax}
                </label>
                <input
                  type="range"
                  min={SIZE_MIN}
                  max={SIZE_MAX}
                  step={5}
                  value={sizeMax}
                  onChange={(e) => setSizeMax(Number(e.target.value))}
                  className="w-full accent-ember"
                />
              </div>
            </div>
          </Field>

          <Field label="Location" hint="Cities in South Africa, or open it up to international.">
            <div className="flex flex-wrap gap-2">
              {LOCATIONS.map((opt) => (
                <Chip
                  key={opt}
                  on={locations.includes(opt)}
                  onClick={() => setLocations((prev) => toggle(prev, opt))}
                >
                  {opt}
                </Chip>
              ))}
            </div>
          </Field>

          <Field
            label="Intent signals to look for"
            hint="Optional. Prospects matching these signals get scored higher."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INTENT_SIGNALS.map((opt) => {
                const on = intentSignals.includes(opt);
                return (
                  <label
                    key={opt}
                    className={
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors " +
                      (on
                        ? "bg-ember/10 border-ember/40 text-fg"
                        : "bg-surface-input border-[var(--border)] text-fg-muted hover:bg-surface-hover")
                    }
                  >
                    <input
                      type="checkbox"
                      className="accent-ember h-4 w-4"
                      checked={on}
                      onChange={() => setIntentSignals((prev) => toggle(prev, opt))}
                    />
                    <span className="text-small">{opt}</span>
                  </label>
                );
              })}
            </div>
          </Field>

          <Field
            label="Average deal value (ZAR)"
            hint={`A rough number is fine. Currently, ${dealLabel}.`}
          >
            <Input
              type="number"
              min={1}
              step={1000}
              value={dealValueZar}
              onChange={(e) => setDealValueZar(Number(e.target.value))}
              placeholder="20000"
              className="font-mono"
            />
          </Field>

          {error && <p className="text-small text-danger">{error}</p>}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-1">
            <Button
              onClick={submit}
              loading={pending}
              size="lg"
              icon={<Sparkles className="w-4 h-4" />}
            >
              Generate my prospect list
            </Button>
          </div>
        </div>
      </Card>

      <p className="text-small text-fg-muted leading-relaxed">
        We score every prospect 1 to 10 based on ICP fit, contact completeness, and site quality. You only see prospects scored 7 or above.
      </p>
    </div>
  );
}
