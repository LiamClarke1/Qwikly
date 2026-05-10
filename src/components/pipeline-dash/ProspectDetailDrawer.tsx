"use client";

import { useEffect } from "react";
import { X, Mail, Building2, Briefcase, Tag, Globe, ShieldCheck } from "lucide-react";
import { StatusPill, prospectStatusTone } from "./StatusPill";

export interface ProspectDetail {
  id: string;
  name: string | null;
  title: string | null;
  company: string | null;
  industry: string | null;
  email: string | null;
  email_verified: boolean | null;
  status: string | null;
  source: string | null;
  enrichment?: Record<string, unknown> | null;
  recent_emails?: Array<{
    id: string;
    direction: "outbound" | "inbound";
    subject: string | null;
    snippet: string | null;
    at: string;
  }>;
  status_history?: Array<{ at: string; status: string; note?: string | null }>;
}

export function ProspectDetailDrawer({
  prospect,
  onClose,
}: {
  prospect: ProspectDetail | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (prospect) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [prospect, onClose]);

  if (!prospect) return null;

  const enrichmentEntries = prospect.enrichment
    ? Object.entries(prospect.enrichment).filter(
        ([, v]) => v !== null && v !== undefined && v !== ""
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-ink/30 backdrop-blur-[1px] animate-fade-in"
      />
      <aside
        className="w-full max-w-[520px] h-full bg-paper border-l border-ink/[0.08] shadow-pop overflow-y-auto animate-slide-in-right"
        role="dialog"
        aria-label="Prospect detail"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-ink/[0.08]">
          <div className="flex flex-col gap-1.5">
            <div className="eyebrow text-ink-500">Prospect</div>
            <h2 className="font-display text-[26px] leading-[1.15] tracking-tight text-ink">
              {prospect.name || "Unknown contact"}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill tone={prospectStatusTone(prospect.status)}>
                {(prospect.status || "new").toLowerCase()}
              </StatusPill>
              <span className="text-[12px] text-ink-500">
                Source, {prospect.source || "Manual"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-ink/[0.06] text-ink-500"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <div className="eyebrow text-ink-500">Profile</div>
            <dl className="grid grid-cols-1 gap-2 text-[13px]">
              <Field icon={<Briefcase className="w-3.5 h-3.5" />} label="Title" value={prospect.title} />
              <Field icon={<Building2 className="w-3.5 h-3.5" />} label="Company" value={prospect.company} />
              <Field icon={<Tag className="w-3.5 h-3.5" />} label="Industry" value={prospect.industry} />
              <Field
                icon={<Mail className="w-3.5 h-3.5" />}
                label="Email"
                value={
                  prospect.email ? (
                    <span className="inline-flex items-center gap-1.5 font-mono">
                      {prospect.email}
                      {prospect.email_verified ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-[#1F7A3A]" />
                      ) : null}
                    </span>
                  ) : null
                }
              />
            </dl>
          </section>

          {enrichmentEntries.length > 0 ? (
            <section className="flex flex-col gap-3">
              <div className="eyebrow text-ink-500">Enrichment</div>
              <div className="ed-card !p-4 !rounded-lg">
                <dl className="grid grid-cols-1 gap-2 text-[13px]">
                  {enrichmentEntries.map(([k, v]) => (
                    <Field
                      key={k}
                      icon={<Globe className="w-3.5 h-3.5" />}
                      label={k.replace(/_/g, " ")}
                      value={String(v)}
                    />
                  ))}
                </dl>
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-3">
            <div className="eyebrow text-ink-500">Recent emails</div>
            {prospect.recent_emails && prospect.recent_emails.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {prospect.recent_emails.map((m) => (
                  <li
                    key={m.id}
                    className="ed-card !p-4 !rounded-lg flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-[12px] text-ink-500 font-mono">
                      <span>{m.direction === "outbound" ? "Sent" : "Received"}</span>
                      <span>{new Date(m.at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-[13.5px] text-ink font-medium">
                      {m.subject || "(no subject)"}
                    </div>
                    {m.snippet ? (
                      <div className="text-[13px] text-ink-500 leading-relaxed">
                        {m.snippet}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-500">No emails yet.</p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="eyebrow text-ink-500">Status history</div>
            {prospect.status_history && prospect.status_history.length > 0 ? (
              <ol className="flex flex-col gap-2 border-l border-ink/[0.08] pl-4">
                {prospect.status_history.map((h, i) => (
                  <li key={i} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <StatusPill tone={prospectStatusTone(h.status)}>
                        {h.status.toLowerCase()}
                      </StatusPill>
                      <span className="text-[11.5px] font-mono text-ink-500">
                        {new Date(h.at).toLocaleString()}
                      </span>
                    </div>
                    {h.note ? (
                      <span className="text-[12.5px] text-ink-500">
                        {h.note}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[13px] text-ink-500">No status changes yet.</p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center gap-1.5 text-ink-500 w-[88px] shrink-0 capitalize">
        {icon}
        <span className="text-[12px]">{label}</span>
      </div>
      <div className="flex-1 text-ink text-[13px] break-words">
        {value || <span className="text-ink-400">,</span>}
      </div>
    </div>
  );
}
