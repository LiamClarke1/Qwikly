import React from "react";
import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";

interface Message {
  role: "assistant" | "user" | "system";
  content: string;
  created_at: string;
}

interface TranscriptPDFData {
  conversationId: string | number;
  businessName: string;
  customerName?: string | null;
  customerPhone?: string | null;
  channel: string;
  startedAt: string;
  messages: Message[];
  accentColor?: string;
}

const EMBER = "#E85A2C";
const DARK  = "#0E0E0C";
const MUTED = "#6A6A63";
const WHITE = "#FFFFFF";
const LIGHT = "#F4EEE4";

const s = StyleSheet.create({
  page: { backgroundColor: WHITE, fontFamily: "Helvetica", padding: 40, paddingBottom: 60 },
  header: { marginBottom: 32 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 4 },
  meta: { fontSize: 11, color: MUTED, marginBottom: 2 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 16 },
  bubble: { marginBottom: 12, padding: 12, borderRadius: 8, maxWidth: "80%" },
  bubbleAssistant: { backgroundColor: LIGHT, alignSelf: "flex-start" },
  bubbleUser: { backgroundColor: "#E8F0FE", alignSelf: "flex-end" },
  bubbleLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase", color: MUTED, marginBottom: 4 },
  bubbleText: { fontSize: 11, color: DARK, lineHeight: 1.5 },
  bubbleTime: { fontSize: 8, color: MUTED, marginTop: 4 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 9, color: MUTED },
});

function fmtTime(s: string) {
  return new Date(s).toLocaleString("en-ZA", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });
}

export function TranscriptPDF({ data }: { data: TranscriptPDFData }) {
  const accent = data.accentColor ?? EMBER;
  const visible = data.messages.filter(m => m.role !== "system");

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
            Conversation transcript
          </Text>
          <Text style={s.title}>{data.customerName ?? "Customer"}</Text>
          <Text style={s.meta}>Business: {data.businessName}</Text>
          <Text style={s.meta}>Channel: {data.channel}</Text>
          {data.customerPhone && <Text style={s.meta}>Phone: {data.customerPhone}</Text>}
          <Text style={s.meta}>Started: {fmtTime(data.startedAt)}</Text>
          <Text style={s.meta}>Messages: {visible.length}</Text>
        </View>

        <View style={s.divider} />

        {/* Messages */}
        {visible.map((msg, i) => (
          <View
            key={i}
            style={[
              s.bubble,
              msg.role === "assistant" ? s.bubbleAssistant : s.bubbleUser,
            ]}
          >
            <Text style={s.bubbleLabel}>{msg.role === "assistant" ? "Qwikly Assistant" : (data.customerName ?? "Customer")}</Text>
            <Text style={s.bubbleText}>{msg.content}</Text>
            <Text style={s.bubbleTime}>{fmtTime(msg.created_at)}</Text>
          </View>
        ))}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{data.businessName} · Transcript #{data.conversationId}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
