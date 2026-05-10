"use client";

export interface QuickDetailsData {
  email: string | null;
  phone: string | null;
  website: string | null;
  suburb: string | null;
  score: number | null;
}

export function QuickDetails({ data }: { data: QuickDetailsData }) {
  return (
    <div className="ed-card !p-5 flex flex-col gap-3">
      <h3 className="font-display text-[18px] leading-tight tracking-tight text-ink">
        Quick details
      </h3>
      <dl className="flex flex-col gap-2.5 text-[13px]">
        <Row label="Email" value={data.email} mono />
        <Row label="Phone" value={data.phone} mono />
        <Row
          label="Website"
          value={
            data.website ? (
              <a
                href={normaliseUrl(data.website)}
                target="_blank"
                rel="noreferrer"
                className="text-ember hover:underline"
              >
                visit
              </a>
            ) : null
          }
        />
        <Row label="Suburb" value={data.suburb} />
        <Row
          label="Score"
          value={
            data.score !== null ? (
              <span className="font-mono num">{data.score}/10</span>
            ) : null
          }
        />
      </dl>
    </div>
  );
}

function normaliseUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "#";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  const hasValue =
    value !== null && value !== undefined && value !== "" && value !== false;
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[12px] text-ink-500 shrink-0">{label}</dt>
      <dd
        className={`text-[13px] text-ink flex-1 text-right ${
          mono ? "font-mono" : ""
        }`}
      >
        {hasValue ? value : <span className="text-ink-400">,</span>}
      </dd>
    </div>
  );
}
