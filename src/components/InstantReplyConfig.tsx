"use client";

// InstantReplyConfig
//
// Tenant-facing card for the Mission Control dashboard. Lets a business owner
// turn Instant Reply on or off, point WhatsApp alerts at the right number,
// set business hours, and fire a test message at themselves.
//
// Visual style: cream surface, Fraunces section heading, Inter body,
// terracotta primary. Matches Qwikly Mission Control.
//
// Note: this component is not wired into any page yet. The orchestrator owns
// dashboard composition.

import { useState } from "react";

type BusinessHours = { start: string; end: string };

export type InstantReplyConfigProps = {
  initialEnabled?: boolean;
  initialOwnerWhatsapp?: string;
  initialBusinessHours?: BusinessHours;
  testLeadId?: string;
  onSave?: (next: {
    enabled: boolean;
    ownerWhatsapp: string;
    businessHours: BusinessHours;
  }) => Promise<void> | void;
};

const CREAM = "#F6EFE3";
const INK = "#1A1A1A";
const MUTED = "#6B6357";
const TERRACOTTA = "#E85A2C";

export default function InstantReplyConfig({
  initialEnabled = true,
  initialOwnerWhatsapp = "",
  initialBusinessHours = { start: "08:00", end: "18:00" },
  testLeadId,
  onSave,
}: InstantReplyConfigProps) {
  const [enabled, setEnabled] = useState<boolean>(initialEnabled);
  const [ownerWhatsapp, setOwnerWhatsapp] = useState<string>(initialOwnerWhatsapp);
  const [hoursStart, setHoursStart] = useState<string>(initialBusinessHours.start);
  const [hoursEnd, setHoursEnd] = useState<string>(initialBusinessHours.end);
  const [saving, setSaving] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "ok"; channel: string }
    | { kind: "error"; reason: string }
  >({ kind: "idle" });

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave({
        enabled,
        ownerWhatsapp,
        businessHours: { start: hoursStart, end: hoursEnd },
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!testLeadId) {
      setTestStatus({ kind: "error", reason: "no_test_lead_configured" });
      return;
    }
    setTestStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/leads/instant-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: testLeadId }),
      });
      const json = (await res.json()) as
        | { ok: true; channel: string }
        | { ok: false; reason?: string };
      if ("ok" in json && json.ok) {
        setTestStatus({ kind: "ok", channel: json.channel });
      } else {
        setTestStatus({ kind: "error", reason: json.reason ?? "unknown_error" });
      }
    } catch (err) {
      setTestStatus({
        kind: "error",
        reason: err instanceof Error ? err.message : "network_error",
      });
    }
  }

  return (
    <section
      style={{
        background: CREAM,
        color: INK,
        borderRadius: 16,
        padding: 28,
        border: "1px solid rgba(26,26,26,0.08)",
        fontFamily: "Inter, system-ui, sans-serif",
        maxWidth: 560,
      }}
    >
      <header style={{ marginBottom: 18 }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: TERRACOTTA,
            fontWeight: 600,
          }}
        >
          Instant Reply 60s
        </p>
        <h2
          style={{
            margin: "6px 0 4px",
            fontFamily: "'Fraunces', 'Times New Roman', serif",
            fontWeight: 600,
            fontSize: 26,
            letterSpacing: "-0.01em",
          }}
        >
          Catch every lead the moment it lands.
        </h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: MUTED }}>
          Qwikly pings you on WhatsApp within 60 seconds of a new lead. Reply
          YES and we send the booking link straight back, no app needed.
        </p>
      </header>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 0",
          borderTop: "1px solid rgba(26,26,26,0.08)",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Instant Reply enabled</div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
            Turn off to stop owner alerts without disabling the chat widget.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          aria-pressed={enabled}
          style={{
            width: 48,
            height: 28,
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            background: enabled ? TERRACOTTA : "rgba(26,26,26,0.18)",
            position: "relative",
            transition: "background 120ms ease",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 3,
              left: enabled ? 23 : 3,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 120ms ease",
              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }}
          />
        </button>
      </div>

      <label
        style={{
          display: "block",
          padding: "14px 0",
          borderTop: "1px solid rgba(26,26,26,0.08)",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
          Owner WhatsApp number
        </div>
        <input
          type="tel"
          inputMode="tel"
          placeholder="+27 82 123 4567"
          value={ownerWhatsapp}
          onChange={(e) => setOwnerWhatsapp(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(26,26,26,0.18)",
            background: "#fff",
            fontSize: 14,
            fontFamily: "inherit",
            color: INK,
          }}
        />
        <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>
          Use the international format. We also use this for SMS fallback.
        </div>
      </label>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          padding: "14px 0",
          borderTop: "1px solid rgba(26,26,26,0.08)",
        }}
      >
        <label>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Hours start
          </div>
          <input
            type="time"
            value={hoursStart}
            onChange={(e) => setHoursStart(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(26,26,26,0.18)",
              background: "#fff",
              fontSize: 14,
              fontFamily: "inherit",
              color: INK,
            }}
          />
        </label>
        <label>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Hours end
          </div>
          <input
            type="time"
            value={hoursEnd}
            onChange={(e) => setHoursEnd(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(26,26,26,0.18)",
              background: "#fff",
              fontSize: 14,
              fontFamily: "inherit",
              color: INK,
            }}
          />
        </label>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 0 4px",
          borderTop: "1px solid rgba(26,26,26,0.08)",
        }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            background: TERRACOTTA,
            color: "#fff",
            border: "none",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={!testLeadId || testStatus.kind === "sending"}
          style={{
            background: "transparent",
            color: INK,
            border: "1px solid rgba(26,26,26,0.18)",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: testLeadId ? "pointer" : "not-allowed",
            opacity: testLeadId ? 1 : 0.5,
          }}
        >
          {testStatus.kind === "sending" ? "Sending..." : "Send test message"}
        </button>
      </div>

      {testStatus.kind === "ok" && (
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "#1F7A4D" }}>
          Test sent via {testStatus.channel}. Check your phone.
        </p>
      )}
      {testStatus.kind === "error" && (
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "#A02B1A" }}>
          Test failed: {testStatus.reason}.
        </p>
      )}
    </section>
  );
}
