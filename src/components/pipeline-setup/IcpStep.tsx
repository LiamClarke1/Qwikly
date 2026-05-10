"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Card, CardHeader } from "@/components/ui/card";
import { saveStep1 } from "@/app/(app)/dashboard/pipeline/setup/actions";
import type { IcpProfile, PipelineSetupState } from "@/lib/pipeline/setup-state";

interface Props {
  initialIcp: IcpProfile;
  onAdvance: (next: PipelineSetupState) => void;
}

const COMMON_INDUSTRIES = [
  "Marketing agencies",
  "Property managers",
  "Trades and services",
  "Healthcare",
  "Legal",
  "Accounting",
  "Coaches and consultants",
  "Hospitality",
  "Education",
  "E-commerce",
];

const COMMON_TITLES = [
  "Founder",
  "CEO",
  "Owner",
  "Managing director",
  "Head of marketing",
  "Head of sales",
  "Operations manager",
  "Practice manager",
];

const COMMON_LOCATIONS = [
  "Johannesburg",
  "Pretoria",
  "Cape Town",
  "Durban",
  "Port Elizabeth",
  "Stellenbosch",
  "Sandton",
  "Centurion",
];

function chipsFromCsv(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function IcpStep({ initialIcp, onAdvance }: Props) {
  const [name, setName] = useState(initialIcp.name);
  const [industries, setIndustries] = useState<string[]>(initialIcp.industries);
  const [industriesText, setIndustriesText] = useState<string>(initialIcp.industries.join(", "));
  const [titles, setTitles] = useState<string[]>(initialIcp.job_titles);
  const [titlesText, setTitlesText] = useState<string>(initialIcp.job_titles.join(", "));
  const [sizeMin, setSizeMin] = useState<string>(
    initialIcp.company_size_min != null ? String(initialIcp.company_size_min) : "",
  );
  const [sizeMax, setSizeMax] = useState<string>(
    initialIcp.company_size_max != null ? String(initialIcp.company_size_max) : "",
  );
  const [locations, setLocations] = useState<string[]>(initialIcp.locations);
  const [locationsText, setLocationsText] = useState<string>(initialIcp.locations.join(", "));
  const [painPoint, setPainPoint] = useState(initialIcp.pain_point);
  const [valueProp, setValueProp] = useState(initialIcp.value_prop);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(list: string[], setList: (v: string[]) => void, setText: (v: string) => void, value: string) {
    const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
    setList(next);
    setText(next.join(", "));
  }

  function submit() {
    setError(null);
    const finalIndustries = industriesText.length ? chipsFromCsv(industriesText) : industries;
    const finalTitles = titlesText.length ? chipsFromCsv(titlesText) : titles;
    const finalLocations = locationsText.length ? chipsFromCsv(locationsText) : locations;

    if (!name.trim()) {
      setError("Give the ICP a one-liner name, like \"agency owners in JHB\".");
      return;
    }
    if (finalIndustries.length === 0) {
      setError("Pick at least one industry.");
      return;
    }
    if (finalTitles.length === 0) {
      setError("Pick at least one job title.");
      return;
    }
    if (!painPoint.trim()) {
      setError("Add the pain point you want to lead with.");
      return;
    }
    if (!valueProp.trim()) {
      setError("Add a value prop, even one sentence is fine.");
      return;
    }

    const payload: IcpProfile = {
      name: name.trim(),
      industries: finalIndustries,
      job_titles: finalTitles,
      company_size_min: sizeMin ? Number(sizeMin) : null,
      company_size_max: sizeMax ? Number(sizeMax) : null,
      locations: finalLocations,
      pain_point: painPoint.trim(),
      value_prop: valueProp.trim(),
    };

    startTransition(async () => {
      const res = await saveStep1(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onAdvance(res.state);
    });
  }

  return (
    <Card>
      <CardHeader
        title="Step 1, define your ICP"
        description="Who are you actually trying to reach. Be specific, this is what every email gets aimed at."
      />

      <div className="space-y-5">
        <Field label="ICP name" hint="A one-liner you will recognise later, like agency owners in JHB.">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="agency owners in JHB"
          />
        </Field>

        <Field label="Industries" hint="Comma-separated. Tap a chip to add it.">
          <Input
            value={industriesText}
            onChange={(e) => {
              setIndustriesText(e.target.value);
              setIndustries(chipsFromCsv(e.target.value));
            }}
            placeholder="Marketing agencies, Property managers"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {COMMON_INDUSTRIES.map((opt) => {
              const on = industries.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(industries, setIndustries, setIndustriesText, opt)}
                  className={
                    "px-2.5 py-1 rounded-full text-tiny border transition-colors " +
                    (on
                      ? "bg-ember/15 text-ember border-ember/40"
                      : "bg-surface-input text-fg-muted border-[var(--border)] hover:bg-surface-hover")
                  }
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Job titles" hint="Decision-makers you want to hit.">
          <Input
            value={titlesText}
            onChange={(e) => {
              setTitlesText(e.target.value);
              setTitles(chipsFromCsv(e.target.value));
            }}
            placeholder="Founder, CEO, Head of marketing"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {COMMON_TITLES.map((opt) => {
              const on = titles.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(titles, setTitles, setTitlesText, opt)}
                  className={
                    "px-2.5 py-1 rounded-full text-tiny border transition-colors " +
                    (on
                      ? "bg-ember/15 text-ember border-ember/40"
                      : "bg-surface-input text-fg-muted border-[var(--border)] hover:bg-surface-hover")
                  }
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Company size, min headcount">
            <Input
              type="number"
              min={1}
              value={sizeMin}
              onChange={(e) => setSizeMin(e.target.value)}
              placeholder="2"
            />
          </Field>
          <Field label="Company size, max headcount">
            <Input
              type="number"
              min={1}
              value={sizeMax}
              onChange={(e) => setSizeMax(e.target.value)}
              placeholder="50"
            />
          </Field>
        </div>

        <Field label="Locations" hint="Cities, regions, or countries.">
          <Input
            value={locationsText}
            onChange={(e) => {
              setLocationsText(e.target.value);
              setLocations(chipsFromCsv(e.target.value));
            }}
            placeholder="Johannesburg, Cape Town"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {COMMON_LOCATIONS.map((opt) => {
              const on = locations.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(locations, setLocations, setLocationsText, opt)}
                  className={
                    "px-2.5 py-1 rounded-full text-tiny border transition-colors " +
                    (on
                      ? "bg-ember/15 text-ember border-ember/40"
                      : "bg-surface-input text-fg-muted border-[var(--border)] hover:bg-surface-hover")
                  }
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Pain point" hint="One or two sentences. The thing they actually feel.">
          <Textarea
            value={painPoint}
            onChange={(e) => setPainPoint(e.target.value)}
            placeholder="They lose qualified leads after hours and weekends because nobody is on the phone."
            rows={3}
          />
        </Field>

        <Field label="Value prop" hint="One or two sentences. What you do for them.">
          <Textarea
            value={valueProp}
            onChange={(e) => setValueProp(e.target.value)}
            placeholder="We give them a digital assistant that replies in under 60 seconds and books the lead before they keep scrolling."
            rows={3}
          />
        </Field>

        {error && <p className="text-small text-danger">{error}</p>}

        <div className="flex justify-end pt-1">
          <Button onClick={submit} loading={pending} icon={<ArrowRight className="w-4 h-4" />}>
            Save and continue
          </Button>
        </div>
      </div>
    </Card>
  );
}
