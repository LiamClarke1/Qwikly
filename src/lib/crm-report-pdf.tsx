import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font, Svg,
  Line, Rect, G, Defs, LinearGradient, Stop, Path,
} from "@react-pdf/renderer";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReportData {
  client: {
    business_name: string;
    owner_name: string | null;
    logo_url: string | null;
    plan: string;
    mrr_zar: number;
    client_email: string | null;
    industry: string | null;
  };
  period: { start: string; end: string; label: string };
  metrics: {
    conversations_total: number;
    conversations_whatsapp: number;
    conversations_email: number;
    conversations_web: number;
    leads_captured: number;
    leads_converted: number;
    bookings_created: number;
    messages_handled_by_ai: number;
    avg_response_time_s: number;
  };
  daily: { date: string; conversations_total: number; leads_captured: number; bookings_created: number }[];
  accountManager?: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const EMBER  = "#E85A2C";
const DARK   = "#0E0E0C";
const MUTED  = "#6A6A63";
const LIGHT  = "#F4EEE4";
const WHITE  = "#FFFFFF";
const BORDER = "rgba(14,14,12,0.10)";

const s = StyleSheet.create({
  page: { backgroundColor: WHITE, fontFamily: "Helvetica", paddingBottom: 40 },
  cover: { backgroundColor: DARK, minHeight: "100%", padding: 0 },

  // Cover
  coverTop:    { backgroundColor: EMBER, padding: 40, paddingBottom: 32 },
  coverMid:    { backgroundColor: DARK, padding: 40, flex: 1 },
  coverClient: { fontSize: 28, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 6 },
  coverTitle:  { fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 32 },
  coverMonth:  { fontSize: 36, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 4 },
  coverPrepared: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 32 },

  // Sections
  section: { padding: 40, paddingTop: 32, paddingBottom: 0 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: EMBER, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 },

  // Headline metrics
  metricsGrid: { flexDirection: "row", gap: 12, marginBottom: 32 },
  metricBox:   { flex: 1, backgroundColor: LIGHT, borderRadius: 8, padding: 16 },
  metricNum:   { fontSize: 28, fontFamily: "Helvetica-Bold", color: DARK, lineHeight: 1 },
  metricLabel: { fontSize: 9, color: MUTED, marginTop: 4 },

  // Summary text
  summaryText: { fontSize: 12, color: DARK, lineHeight: 1.7, marginBottom: 32 },

  // Channel row
  channelRow:  { flexDirection: "row", gap: 10, marginBottom: 24 },
  channelBox:  { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 14 },
  channelName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: MUTED, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  channelNum:  { fontSize: 20, fontFamily: "Helvetica-Bold", color: DARK },

  // Funnel
  funnelRow:   { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  funnelLabel: { fontSize: 11, color: DARK, width: 120 },
  funnelBar:   { flex: 1, height: 20, backgroundColor: LIGHT, borderRadius: 4, overflow: "hidden" },
  funnelFill:  { height: "100%", backgroundColor: EMBER, borderRadius: 4 },
  funnelNum:   { fontSize: 11, fontFamily: "Helvetica-Bold", color: DARK, width: 40, textAlign: "right" },

  // Footer
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, height: 40, backgroundColor: DARK, flexDirection: "row", alignItems: "center", paddingHorizontal: 40, justifyContent: "space-between" },
  footerText: { fontSize: 9, color: "rgba(255,255,255,0.4)" },

  // Divider
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 24 },

  // Callout
  callout: { backgroundColor: LIGHT, borderRadius: 8, padding: 16, marginBottom: 24 },
  calloutTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 6 },
  calloutText:  { fontSize: 11, color: MUTED, lineHeight: 1.6 },

  // Closing
  closingPage: { backgroundColor: EMBER, flex: 1, padding: 40, justifyContent: "center" },
  closingTitle: { fontSize: 32, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 16 },
  closingText:  { fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.7, marginBottom: 32 },
  closingContact: { fontSize: 11, color: "rgba(255,255,255,0.6)" },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Footer({ page, client }: { page: string; client: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>Qwikly — {client} — Confidential</Text>
      <Text style={s.footerText}>{page}</Text>
    </View>
  );
}

function miniBar(data: { conversations_total: number }[], maxW: number): string {
  if (!data.length) return "";
  const max = Math.max(...data.map(d => d.conversations_total), 1);
  const w = maxW / data.length;
  return data.map((d, i) => {
    const h = (d.conversations_total / max) * 40;
    const x = i * w;
    const y = 40 - h;
    return `M${x.toFixed(1)},${y.toFixed(1)} L${x.toFixed(1)},40 L${(x + w - 2).toFixed(1)},40 L${(x + w - 2).toFixed(1)},${y.toFixed(1)} Z`;
  }).join(" ");
}

function fmtZAR(n: number) { return `R${n.toLocaleString("en-ZA")}`; }
function fmtHours(seconds: number) { return `${(seconds / 3600).toFixed(1)}h`; }

function executiveSummary(m: ReportData["metrics"], period: string, client: string): string {
  const convs  = m.conversations_total;
  const leads  = m.leads_captured;
  const books  = m.bookings_created;
  const cvRate = leads > 0 ? Math.round((m.leads_converted / leads) * 100) : 0;

  return `In ${period}, Qwikly handled ${convs.toLocaleString()} customer conversation${convs !== 1 ? "s" : ""} for ${client} across all channels. ` +
    `The digital assistant captured ${leads} lead${leads !== 1 ? "s" : ""} and ${books} booking${books !== 1 ? "s" : ""} — a ${cvRate}% lead-to-booking rate. ` +
    (m.messages_handled_by_ai > 0
      ? `A total of ${m.messages_handled_by_ai.toLocaleString()} messages were handled autonomously, freeing your team from repetitive enquiries. `
      : "") +
    `Your digital assistant is working around the clock so you don't have to.`;
}

// ─── PDF Document ─────────────────────────────────────────────────────────────
export function CrmReportPDF({ data }: { data: ReportData }) {
  const { client, period, metrics, daily, accountManager } = data;
  const name = client.business_name;

  const totalFunnel = [
    { label: "Conversations", val: metrics.conversations_total },
    { label: "Leads captured", val: metrics.leads_captured },
    { label: "Leads converted", val: metrics.leads_converted },
    { label: "Bookings made", val: metrics.bookings_created },
  ];
  const funnelMax = metrics.conversations_total || 1;
  const barPath = miniBar(daily.slice(-30), 460);
  const staffSaving = Math.round((metrics.messages_handled_by_ai * 2.5) / 60); // 2.5 min per msg → hours

  return (
    <Document>
      {/* ── Cover page ─────────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          <View style={s.coverTop}>
            <Text style={{ fontSize: 11, color: WHITE, fontFamily: "Helvetica-Bold", letterSpacing: 2, marginBottom: 40 }}>
              QWIKLY
            </Text>
            <Text style={s.coverMonth}>{period.label}</Text>
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
              Monthly Performance Report
            </Text>
          </View>
          <View style={s.coverMid}>
            <Text style={s.coverClient}>{name}</Text>
            <Text style={s.coverTitle}>{client.industry ?? client.plan ?? ""}</Text>

            {/* Mini sparkline */}
            {barPath && (
              <Svg width={460} height={44} style={{ marginBottom: 32 }}>
                <Path d={barPath} fill="rgba(232,90,44,0.3)" />
              </Svg>
            )}

            <View style={{ flexDirection: "row", gap: 40 }}>
              {[
                { label: "Conversations", val: metrics.conversations_total.toString() },
                { label: "Leads",         val: metrics.leads_captured.toString() },
                { label: "Bookings",      val: metrics.bookings_created.toString() },
              ].map(m => (
                <View key={m.label}>
                  <Text style={{ fontSize: 26, fontFamily: "Helvetica-Bold", color: EMBER }}>{m.val}</Text>
                  <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{m.label}</Text>
                </View>
              ))}
            </View>

            <Text style={s.coverPrepared}>
              Prepared for {name} · {period.start} to {period.end}
            </Text>
          </View>
        </View>
      </Page>

      {/* ── Executive summary ──────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Executive Summary</Text>
          <Text style={s.summaryText}>{executiveSummary(metrics, period.label, name)}</Text>

          <Text style={s.sectionTitle}>Headline Numbers</Text>
          <View style={s.metricsGrid}>
            {[
              { n: metrics.conversations_total.toString(), l: "Total conversations" },
              { n: metrics.leads_captured.toString(),      l: "Leads captured" },
              { n: metrics.bookings_created.toString(),    l: "Bookings made" },
            ].map(m => (
              <View key={m.l} style={s.metricBox}>
                <Text style={s.metricNum}>{m.n}</Text>
                <Text style={s.metricLabel}>{m.l}</Text>
              </View>
            ))}
          </View>
          <View style={s.metricsGrid}>
            {[
              { n: `${staffSaving}h`,                             l: "Team hours saved" },
              { n: metrics.leads_converted.toString(),            l: "Leads converted" },
              { n: metrics.messages_handled_by_ai.toString(),     l: "AI-handled messages" },
            ].map(m => (
              <View key={m.l} style={s.metricBox}>
                <Text style={s.metricNum}>{m.n}</Text>
                <Text style={s.metricLabel}>{m.l}</Text>
              </View>
            ))}
          </View>
        </View>
        <Footer page="2" client={name} />
      </Page>

      {/* ── Channel breakdown ──────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Channel Breakdown</Text>
          <View style={s.channelRow}>
            {[
              { label: "WhatsApp",  val: metrics.conversations_whatsapp, color: "#10b981" },
              { label: "Email",     val: metrics.conversations_email,    color: "#3b82f6" },
              { label: "Web Chat",  val: metrics.conversations_web,      color: "#8b5cf6" },
            ].map(ch => (
              <View key={ch.label} style={s.channelBox}>
                <Text style={s.channelName}>{ch.label}</Text>
                <Text style={[s.channelNum, { color: ch.color }]}>{ch.val}</Text>
                <Text style={{ fontSize: 9, color: MUTED, marginTop: 4 }}>conversations</Text>
              </View>
            ))}
          </View>

          <View style={s.divider} />
          <Text style={s.sectionTitle}>Lead Funnel</Text>
          {totalFunnel.map(row => (
            <View key={row.label} style={s.funnelRow}>
              <Text style={s.funnelLabel}>{row.label}</Text>
              <View style={s.funnelBar}>
                <View style={[s.funnelFill, { width: `${Math.min(100, Math.round((row.val / funnelMax) * 100))}%` }]} />
              </View>
              <Text style={s.funnelNum}>{row.val}</Text>
            </View>
          ))}

          {metrics.leads_captured > 0 && (
            <View style={[s.callout, { marginTop: 20 }]}>
              <Text style={s.calloutTitle}>Conversion rate</Text>
              <Text style={s.calloutText}>
                {Math.round((metrics.leads_converted / metrics.leads_captured) * 100)}% of captured leads were converted to bookings — your digital assistant is qualifying and committing customers before you even pick up the phone.
              </Text>
            </View>
          )}
        </View>
        <Footer page="3" client={name} />
      </Page>

      {/* ── Time savings ───────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Time & Cost Savings</Text>
          <View style={s.metricsGrid}>
            {[
              { n: `${staffSaving}h`, l: "Hours saved this month" },
              { n: fmtZAR(staffSaving * 150), l: "Equivalent staff cost saved (@ R150/hr)" },
            ].map(m => (
              <View key={m.l} style={[s.metricBox, { flex: 1 }]}>
                <Text style={[s.metricNum, { color: EMBER }]}>{m.n}</Text>
                <Text style={s.metricLabel}>{m.l}</Text>
              </View>
            ))}
          </View>
          <View style={s.callout}>
            <Text style={s.calloutTitle}>How we calculate this</Text>
            <Text style={s.calloutText}>
              {`Each message handled by your digital assistant saves approximately 2.5 minutes of staff time. This month, ${metrics.messages_handled_by_ai.toLocaleString()} messages were handled autonomously — that's ${staffSaving} hours that your team spent on higher-value work.`}
            </Text>
          </View>

          <View style={s.divider} />
          <Text style={s.sectionTitle}>What&apos;s coming next month</Text>
          <View style={s.callout}>
            <Text style={s.calloutTitle}>Recommendations from your Qwikly team</Text>
            <Text style={s.calloutText}>
              {`• Review and update your digital assistant's knowledge base to reflect any service changes.\n`}
              {`• Consider enabling web chat on your website to capture more leads outside business hours.\n`}
              {`• Your response time can be improved by reviewing the unanswered conversation logs.`}
            </Text>
          </View>
        </View>
        <Footer page="4" client={name} />
      </Page>

      {/* ── Closing page ───────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <View style={[s.closingPage]}>
          <Text style={s.closingTitle}>Thank you, {name}.</Text>
          <Text style={s.closingText}>
            {`We're proud to be part of your growth. Your digital assistant is working hard every day to make sure no enquiry goes unanswered and no lead goes cold.\n\nIf you have any questions about this report or want to discuss upgrading your plan, we're here for you.`}
          </Text>
          {accountManager && (
            <Text style={s.closingContact}>Your account manager: {accountManager}</Text>
          )}
          {client.client_email && (
            <Text style={[s.closingContact, { marginTop: 4 }]}>Contact: hello@qwikly.co.za</Text>
          )}
          <Text style={{ fontSize: 11, color: WHITE, fontFamily: "Helvetica-Bold", letterSpacing: 2, marginTop: 40 }}>QWIKLY</Text>
        </View>
      </Page>
    </Document>
  );
}
