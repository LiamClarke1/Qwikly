"use client";

// Email composer for the Qwikly Pipeline outreach tab.
//
// The Qwikly client sends from their own existing Gmail or Outlook account.
// This component never touches SMTP or a sending API. It pre-drafts the
// subject and body, then deep-links the user into their mail client of
// choice. After they hit send, they tap "Mark as sent" to flip the
// prospect status to "contacted".

import { useState, useTransition } from "react";
import { Mail, ExternalLink, CheckCircle2 } from "lucide-react";
import { setProspectStatus } from "@/app/(app)/dashboard/pipeline/board/actions";

// Most mail clients silently truncate or fail above ~2000 characters in a
// mailto body. We trim with a clear marker so the user can paste the rest if
// they need it.
const BODY_HARD_CAP = 2000;

export interface EmailComposerProps {
  initialSubject: string;
  initialBody: string;
  toEmail: string | null;
  /**
   * Optional, used by the "Mark as sent" link to flip the prospect status.
   * When omitted, the link is hidden because we have nowhere to write to.
   */
  prospectId?: string;
}

function truncateForMailto(body: string): string {
  if (body.length <= BODY_HARD_CAP) return body;
  return body.slice(0, BODY_HARD_CAP - 24).trimEnd() + "\n\n... [trimmed]";
}

function buildMailto(to: string, subject: string, body: string): string {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(truncateForMailto(body));
  return `mailto:${encodeURIComponent(to)}?subject=${s}&body=${b}`;
}

function buildGmail(to: string, subject: string, body: string): string {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(truncateForMailto(body));
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${s}&body=${b}`;
}

function buildOutlook(to: string, subject: string, body: string): string {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(truncateForMailto(body));
  return `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${s}&body=${b}`;
}

export function EmailComposer({
  initialSubject,
  initialBody,
  toEmail,
  prospectId,
}: EmailComposerProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [marked, setMarked] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const disabled = !toEmail || toEmail.trim().length === 0;

  function open(url: string) {
    if (typeof window === "undefined") return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleMarkSent() {
    if (!prospectId) return;
    setMarkError(null);
    startTransition(async () => {
      const res = await setProspectStatus(prospectId, "contacted");
      if (res.ok) {
        setMarked(true);
      } else {
        setMarkError("Could not update status, try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11.5px] font-mono uppercase tracking-wider text-ink-500">
        Send from your own email
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11.5px] font-mono uppercase tracking-wider text-ink-500">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-md bg-white border border-ink/10 text-[13.5px] text-ink p-2.5 focus:outline-none focus:border-ink/25"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11.5px] font-mono uppercase tracking-wider text-ink-500">
          Body
        </label>
        <textarea
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-md bg-white border border-ink/10 text-[13.5px] text-ink p-2.5 font-sans leading-relaxed focus:outline-none focus:border-ink/25"
        />
        {body.length > BODY_HARD_CAP ? (
          <div className="text-[11.5px] text-ink-500">
            Body is over {BODY_HARD_CAP} characters and will be trimmed when
            opening your mail client. Paste the full body in once it opens.
          </div>
        ) : null}
      </div>

      {disabled ? (
        <div className="rounded-md border border-ink/10 bg-[#FAEFD8] text-[#B8770E] text-[12.5px] p-3">
          No email on file. Verify with Hunter or use the WhatsApp tab.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => open(buildMailto(toEmail ?? "", subject, body))}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-full bg-ember text-paper px-4 py-2 text-[13px] font-medium hover:bg-ember-deep disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mail className="w-3.5 h-3.5" />
          Open in your email
        </button>
        <button
          type="button"
          onClick={() => open(buildGmail(toEmail ?? "", subject, body))}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-full bg-white border border-ink/10 text-ink px-4 py-2 text-[13px] font-medium hover:bg-[#F9F6F2] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in Gmail
        </button>
        <button
          type="button"
          onClick={() => open(buildOutlook(toEmail ?? "", subject, body))}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-full bg-white border border-ink/10 text-ink px-4 py-2 text-[13px] font-medium hover:bg-[#F9F6F2] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in Outlook web
        </button>
      </div>

      {prospectId ? (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleMarkSent}
            disabled={isPending || marked || disabled}
            className="self-start inline-flex items-center gap-1.5 text-[12.5px] text-ink-500 hover:text-ink underline underline-offset-2 disabled:no-underline disabled:cursor-not-allowed"
          >
            {marked ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1F7A3A]" />
                Marked as sent
              </>
            ) : isPending ? (
              "Marking as sent..."
            ) : (
              "Mark as sent"
            )}
          </button>
          {markError ? (
            <div className="text-[11.5px] text-[#B43A2C]">{markError}</div>
          ) : null}
        </div>
      ) : null}

      <div className="text-[11.5px] text-ink-500">
        Replies arrive in your normal inbox. Paste them into the Reply Drafter
        to get a drafted response.
      </div>
    </div>
  );
}
