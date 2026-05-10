"use client";

import { useState } from "react";
import { EmailComposer } from "./EmailComposer";
import { WhatsAppComposer } from "./WhatsAppComposer";
import { LinkedInComposer } from "./LinkedInComposer";
import { CallScript } from "./CallScript";

type TabKey = "email" | "wa" | "li" | "call";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "email", label: "Email" },
  { key: "wa", label: "WhatsApp" },
  { key: "li", label: "LinkedIn" },
  { key: "call", label: "Call" },
];

export interface OutreachChannelsProps {
  prospectId: string;
  firstName: string | null;
  firstNameIsAuto: boolean;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  emailSubject: string;
  emailBody: string;
  whatsappBody: string;
  linkedinBody: string;
  callBullets: string[];
}

export function OutreachChannels(props: OutreachChannelsProps) {
  const [tab, setTab] = useState<TabKey>("email");
  const namePill = props.firstName || "there";

  return (
    <div className="ed-card !p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[22px] leading-tight tracking-tight text-ink">
          Outreach channels
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium ring-1 ${
            props.firstNameIsAuto
              ? "bg-[#FAEFD8] text-[#B8770E] ring-[#EFDDB6]"
              : "bg-[#E5F1E9] text-[#1F7A3A] ring-[#CDE3D5]"
          }`}
          title={props.firstNameIsAuto ? "Auto-detected name" : "Confirmed name"}
        >
          Hi, <span className="font-medium">{namePill}</span>
        </span>
      </div>

      <div className="flex gap-1 border-b border-ink/[0.08]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-ember text-ink"
                : "border-transparent text-ink-500 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-1">
        {tab === "email" ? (
          <EmailComposer
            initialSubject={props.emailSubject}
            initialBody={props.emailBody}
            toEmail={props.email}
          />
        ) : null}
        {tab === "wa" ? (
          <WhatsAppComposer phone={props.phone} initialBody={props.whatsappBody} />
        ) : null}
        {tab === "li" ? (
          <LinkedInComposer
            linkedinUrl={props.linkedinUrl}
            initialBody={props.linkedinBody}
          />
        ) : null}
        {tab === "call" ? (
          <CallScript
            prospectId={props.prospectId}
            phone={props.phone}
            bullets={props.callBullets}
          />
        ) : null}
      </div>
    </div>
  );
}
