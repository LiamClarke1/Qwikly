"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { saveStep2 } from "@/app/(app)/dashboard/pipeline/setup/actions";
import type { PipelineSetupState, SeedListEntry, SeedListSummary } from "@/lib/pipeline/setup-state";

interface Props {
  initialSeedList: SeedListSummary;
  onAdvance: (next: PipelineSetupState) => void;
}

const REQUIRED_COLUMNS = ["first_name", "last_name", "company", "email", "title"] as const;
type ReqCol = (typeof REQUIRED_COLUMNS)[number];

const MIN_ROWS = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ParseResult {
  rows: SeedListEntry[];
  total: number;
  warnings: string[];
}

function parseCsv(text: string): ParseResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { rows: [], total: 0, warnings: ["File looks empty."] };
  }

  const splitRow = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const headerCells = splitRow(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const colIndex: Record<ReqCol, number> = {
    first_name: -1,
    last_name: -1,
    company: -1,
    email: -1,
    title: -1,
  };
  for (const col of REQUIRED_COLUMNS) {
    const idx = headerCells.indexOf(col);
    if (idx >= 0) colIndex[col] = idx;
  }
  const missing = REQUIRED_COLUMNS.filter((c) => colIndex[c] < 0);
  if (missing.length > 0) {
    warnings.push(`Missing columns, ${missing.join(", ")}.`);
  }

  const rows: SeedListEntry[] = [];
  const seenEmails = new Set<string>();
  let totalDataRows = 0;
  let invalidEmail = 0;
  let duplicateEmail = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = splitRow(lines[i]);
    totalDataRows++;
    const get = (k: ReqCol) => (colIndex[k] >= 0 ? (cells[colIndex[k]] ?? "").trim() : "");
    const entry: SeedListEntry = {
      first_name: get("first_name"),
      last_name: get("last_name"),
      company: get("company"),
      email: get("email").toLowerCase(),
      title: get("title"),
    };
    if (!entry.email || !EMAIL_RE.test(entry.email)) {
      invalidEmail++;
      continue;
    }
    if (seenEmails.has(entry.email)) {
      duplicateEmail++;
      continue;
    }
    seenEmails.add(entry.email);
    rows.push(entry);
  }

  if (invalidEmail > 0) warnings.push(`${invalidEmail} rows skipped, invalid email.`);
  if (duplicateEmail > 0) warnings.push(`${duplicateEmail} rows skipped, duplicate email.`);

  return { rows, total: totalDataRows, warnings };
}

export default function SeedListStep({ initialSeedList, onAdvance }: Props) {
  const [seedList, setSeedList] = useState<SeedListSummary>(initialSeedList);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function chooseGenerator() {
    setSeedList({
      ...seedList,
      source: "qwikly_generator",
      total_rows: seedList.source === "qwikly_generator" ? seedList.total_rows : 0,
      valid_rows: seedList.source === "qwikly_generator" ? seedList.valid_rows : 0,
      rows: seedList.source === "qwikly_generator" ? seedList.rows : [],
      warnings: ["Prospects will pull through after the generator job finishes."],
    });
  }

  async function handleFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setSeedList({
        source: "csv_upload",
        total_rows: parsed.total,
        valid_rows: parsed.rows.length,
        rows: parsed.rows,
        warnings: parsed.warnings,
      });
    } catch {
      setError("Could not read that file. Make sure it is a plain CSV.");
    }
  }

  function submit() {
    setError(null);
    if (seedList.source === "none") {
      setError("Pick a path, generate with Qwikly or upload a CSV.");
      return;
    }
    if (seedList.source === "csv_upload" && seedList.valid_rows < MIN_ROWS) {
      setError(`Need at least ${MIN_ROWS} valid rows to continue. You have ${seedList.valid_rows}.`);
      return;
    }
    startTransition(async () => {
      const res = await saveStep2(seedList);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onAdvance(res.state);
    });
  }

  const canContinue =
    (seedList.source === "qwikly_generator") ||
    (seedList.source === "csv_upload" && seedList.valid_rows >= MIN_ROWS);

  return (
    <Card>
      <CardHeader
        title="Step 2, build the seed list"
        description="Pick one path. You need at least 50 valid prospects before you can continue."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Path A */}
        <div
          className={
            "rounded-xl border p-5 transition-colors " +
            (seedList.source === "qwikly_generator"
              ? "border-ember/40 bg-ember/5"
              : "border-[var(--border)] bg-surface-input/50 hover:bg-surface-hover")
          }
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="eyebrow text-ember">Path A</span>
          </div>
          <h3 className="text-h3 text-fg mb-1">Generate prospects with Qwikly</h3>
          <p className="text-small text-fg-muted mb-4">
            Tell Qwikly your ICP, get back a clean list. Best for ZAR-budget SMB targeting.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/pipeline/generate" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" icon={<ExternalLink className="w-4 h-4" />}>
                Open the generator
              </Button>
            </Link>
            <Button variant="ghost" onClick={chooseGenerator}>
              {seedList.source === "qwikly_generator" ? "Selected" : "Use this path"}
            </Button>
          </div>
          {seedList.source === "qwikly_generator" && (
            <p className="text-small text-ember mt-3 flex items-start gap-1.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              Qwikly will run the job and feed the prospects in.
            </p>
          )}
        </div>

        {/* Path B */}
        <div
          className={
            "rounded-xl border p-5 transition-colors " +
            (seedList.source === "csv_upload"
              ? "border-ember/40 bg-ember/5"
              : "border-[var(--border)] bg-surface-input/50 hover:bg-surface-hover")
          }
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="eyebrow text-ember">Path B</span>
          </div>
          <h3 className="text-h3 text-fg mb-1">Upload your own list (CSV)</h3>
          <p className="text-small text-fg-muted mb-4">
            Required columns, first_name, last_name, company, email, title.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <Button
            variant="secondary"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => fileRef.current?.click()}
          >
            Choose CSV file
          </Button>

          {seedList.source === "csv_upload" && (
            <div className="mt-4 space-y-2">
              <p className="text-small text-fg flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-ember" />
                <span>
                  <strong className="text-fg">{seedList.valid_rows}</strong>{" "}
                  <span className="text-fg-muted">valid rows of {seedList.total_rows} total</span>
                </span>
              </p>
              {seedList.warnings.length > 0 && (
                <ul className="space-y-1">
                  {seedList.warnings.map((w, i) => (
                    <li key={i} className="text-small text-amber-500 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}
              {seedList.valid_rows < MIN_ROWS && (
                <p className="text-small text-danger">
                  Need at least {MIN_ROWS} valid rows. Add more to continue.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-small text-danger mt-4">{error}</p>}

      <div className="flex justify-end pt-5">
        <Button
          onClick={submit}
          loading={pending}
          disabled={!canContinue}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Save and continue
        </Button>
      </div>
    </Card>
  );
}
