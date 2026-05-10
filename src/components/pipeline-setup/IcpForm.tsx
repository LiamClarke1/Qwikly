"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RotateCcw, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  generateAndRedirect,
  suggestIcp,
} from "@/app/(app)/dashboard/pipeline/setup/actions";
import type { IcpDefinition } from "@/lib/pipeline/setup-state";
import type { SuggestedIcp } from "@/lib/pipeline/icp-suggester.types";

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
const SAMPLE_LEAD_CAP = 5;

function toggle<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function arraysEqualAsSets(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((x) => setA.has(x));
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

function EditedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-tiny text-ember font-mono uppercase tracking-wide">
      <Pencil className="w-3 h-3" />
      Edited
    </span>
  );
}

function friendlyErrorMessage(reason: string): string {
  if (reason === "schema_pending") {
    return "The Pipeline tables are not migrated yet. Run the migration and try again.";
  }
  return reason;
}

export default function IcpForm({ initialIcp, hasExistingIcp }: Props) {
  // The "suggested" snapshot is the baseline against which we detect edits.
  // It is null until the client either loads an existing ICP or generates
  // a fresh suggestion. With null, the form sections stay hidden so the
  // empty state is just the offer textarea and the primary button.
  const initialHasContent = hasExistingIcp || initialIcp.industries.length > 0;
  const [suggested, setSuggested] = useState<SuggestedIcp | null>(
    initialHasContent
      ? {
          offer: initialIcp.offer,
          industries: initialIcp.industries,
          titles: initialIcp.titles,
          sizeMin: initialIcp.sizeMin,
          sizeMax: initialIcp.sizeMax,
          locations: initialIcp.locations,
          intentSignals: initialIcp.intentSignals,
          dealValueZar: initialIcp.dealValueZar,
          reasoning: "",
        }
      : null,
  );

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
  const [intentSignals, setIntentSignals] = useState<string[]>(
    initialIcp.intentSignals,
  );
  const [dealValueZar, setDealValueZar] = useState<number>(
    Number.isFinite(initialIcp.dealValueZar) && initialIcp.dealValueZar > 0
      ? initialIcp.dealValueZar
      : 0,
  );

  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [suggesting, startSuggest] = useTransition();
  const [generating, startGenerate] = useTransition();
  const router = useRouter();

  const showSections = suggested !== null;

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

  // Did the client deviate from the suggestion? One badge per section.
  const edits = useMemo(() => {
    if (!suggested) {
      return {
        industries: false,
        titles: false,
        size: false,
        locations: false,
        intentSignals: false,
        dealValueZar: false,
      };
    }
    return {
      industries: !arraysEqualAsSets(industries, suggested.industries),
      titles: !arraysEqualAsSets(titles, suggested.titles),
      size: sizeMin !== suggested.sizeMin || sizeMax !== suggested.sizeMax,
      locations: !arraysEqualAsSets(locations, suggested.locations),
      intentSignals: !arraysEqualAsSets(intentSignals, suggested.intentSignals),
      dealValueZar: dealValueZar !== suggested.dealValueZar,
    };
  }, [
    suggested,
    industries,
    titles,
    sizeMin,
    sizeMax,
    locations,
    intentSignals,
    dealValueZar,
  ]);

  function applySuggestion(s: SuggestedIcp) {
    setSuggested(s);
    setOffer(s.offer || offer);
    setIndustries(s.industries);
    setTitles(s.titles);
    setSizeMin(s.sizeMin);
    setSizeMax(s.sizeMax);
    setLocations(s.locations);
    setIntentSignals(s.intentSignals);
    setDealValueZar(s.dealValueZar);
  }

  function handleSuggest() {
    setSuggestError(null);
    setGenerateError(null);

    if (offer.trim().length < 5) {
      setSuggestError("Tell us a bit more about your offer, at least a few words.");
      return;
    }

    startSuggest(async () => {
      const res = await suggestIcp(offer.trim());
      if (!res.ok) {
        setSuggestError(friendlyErrorMessage(res.reason));
        return;
      }
      applySuggestion(res.icp);
    });
  }

  function handleStartOver() {
    setSuggested(null);
    setSuggestError(null);
    setGenerateError(null);
    setIndustries([]);
    setTitles([]);
    setSizeMin(SIZE_MIN);
    setSizeMax(50);
    setLocations([]);
    setIntentSignals([]);
    setDealValueZar(0);
  }

  function handleGenerate() {
    setGenerateError(null);

    if (industries.length < 1) {
      setGenerateError("Pick at least one industry to target.");
      return;
    }
    if (titles.length < 2) {
      setGenerateError("Pick at least two job titles to target.");
      return;
    }
    if (locations.length < 1) {
      setGenerateError("Pick at least one location.");
      return;
    }
    if (!dealValueZar || dealValueZar < 1) {
      setGenerateError("Enter your average deal value in ZAR.");
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

    startGenerate(async () => {
      const res = await generateAndRedirect(payload);
      if (!res.ok) {
        setGenerateError(friendlyErrorMessage(res.reason));
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
          Tell us who you want to reach
        </h1>
        <p className="text-body text-ink-500 mt-2">
          We will pick your ICP for you. Edit anything you want before generating.
        </p>
      </div>

      <Card>
        <div className="space-y-7">
          {/* SECTION 1, always visible: the offer + suggest button. */}
          <Field
            label="What does your business do?"
            hint="One or two sentences. We use this to pick your ideal customer profile."
          >
            <Textarea
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder="We offer commercial roofing for SA property managers and body corporates."
              rows={3}
            />
          </Field>

          {suggestError && (
            <p className="text-small text-danger -mt-3">{suggestError}</p>
          )}

          {!showSections && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-1">
              <Button
                onClick={handleSuggest}
                loading={suggesting}
                size="lg"
                icon={<Sparkles className="w-4 h-4" />}
              >
                {suggesting ? "Generating suggestions, 5 to 10 seconds" : "Suggest my ICP"}
              </Button>
            </div>
          )}

          {showSections && suggesting && (
            <div className="flex items-center gap-2 text-small text-fg-muted -mt-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating suggestions, 5 to 10 seconds
            </div>
          )}

          {/* "We picked this for you" banner. */}
          {showSections && suggested && suggested.reasoning && (
            <div className="rounded-2xl border border-ember/25 bg-ember/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow text-ember mb-1.5">We picked this for you</p>
                  <p className="text-small text-ink leading-relaxed">
                    {suggested.reasoning}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="inline-flex items-center gap-1.5 text-small text-fg-muted hover:text-ember transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Start over
                </button>
              </div>
            </div>
          )}

          {/* Existing ICP, no reasoning text, still allow "Start over". */}
          {showSections && suggested && !suggested.reasoning && (
            <div className="flex items-center justify-end -mt-3">
              <button
                type="button"
                onClick={handleStartOver}
                className="inline-flex items-center gap-1.5 text-small text-fg-muted hover:text-ember transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Start over
              </button>
            </div>
          )}

          {/* SECTIONS 2 onward, only visible after a suggestion is loaded. */}
          {showSections && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Industries to target</Label>
                  {edits.industries && <EditedBadge />}
                </div>
                <p className="text-small text-fg-muted mb-3 -mt-1">
                  Pick every industry that fits. The more specific, the better the match.
                </p>
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
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Job titles to target</Label>
                  {edits.titles && <EditedBadge />}
                </div>
                <p className="text-small text-fg-muted mb-3 -mt-1">
                  Decision-makers you want to land in front of.
                </p>
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
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>{`Company size, ${sizeLabel}`}</Label>
                  {edits.size && <EditedBadge />}
                </div>
                <p className="text-small text-fg-muted mb-3 -mt-1">
                  Drag the sliders to set the headcount range. 500+ means no upper limit.
                </p>
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
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Location</Label>
                  {edits.locations && <EditedBadge />}
                </div>
                <p className="text-small text-fg-muted mb-3 -mt-1">
                  Cities in South Africa, or open it up to international.
                </p>
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
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Intent signals to look for</Label>
                  {edits.intentSignals && <EditedBadge />}
                </div>
                <p className="text-small text-fg-muted mb-3 -mt-1">
                  Optional. Prospects matching these signals get scored higher.
                </p>
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
                          onChange={() =>
                            setIntentSignals((prev) => toggle(prev, opt))
                          }
                        />
                        <span className="text-small">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Average deal value (ZAR)</Label>
                  {edits.dealValueZar && <EditedBadge />}
                </div>
                <p className="text-small text-fg-muted mb-3 -mt-1">
                  {`A rough number is fine. Currently, ${dealLabel}.`}
                </p>
                <Input
                  type="number"
                  min={1}
                  step={1000}
                  value={dealValueZar || ""}
                  onChange={(e) => setDealValueZar(Number(e.target.value))}
                  placeholder="20000"
                  className="font-mono"
                />
              </div>

              <div className="pt-2 border-t border-[var(--border)]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-5">
                  <Button
                    onClick={handleGenerate}
                    loading={generating}
                    size="lg"
                    icon={<Sparkles className="w-4 h-4" />}
                  >
                    {`Generate my ${SAMPLE_LEAD_CAP} sample leads`}
                  </Button>
                </div>
                {generateError && (
                  <p className="text-small text-danger mt-3 text-right">
                    {generateError}
                  </p>
                )}
                <p className="text-tiny text-fg-muted mt-3 text-right">
                  Test mode, {SAMPLE_LEAD_CAP} leads. Plan-based caps coming soon.
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      {showSections && (
        <p className="text-small text-fg-muted leading-relaxed">
          We score every prospect 1 to 10 based on ICP fit, contact completeness, and site quality. You only see prospects scored 7 or above.
        </p>
      )}
    </div>
  );
}
