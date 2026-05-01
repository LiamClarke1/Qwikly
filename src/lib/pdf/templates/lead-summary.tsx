import React from "react";
import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";

interface Lead {
  name: string;
  email?: string | null;
  phone?: string | null;
  source: string;
  status: string;
  notes?: string | null;
  created_at: string;
}

interface LeadSummaryPDFData {
  businessName: string;
  periodLabel: string;
  leads: Lead[];
  accentColor?: string;
  totalLeads: number;
  convertedLeads: number;
}

const EMBER  = "#E85A2C";
const DARK   = "#0E0E0C";
const MUTED  = "#6A6A63";
const WHITE  = "#FFFFFF";
const LIGHT  = "#F4EEE4";
const BORDER = "#E5E7EB";

const s = StyleSheet.create({
  page: { backgroundColor: WHITE, fontFamily: "Helvetica", padding: 40, paddingBottom: 60 },
  header: { marginBottom: 32 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 4 },
  meta: { fontSize: 11, color: MUTED },
  statRow: { flexDirection: "row", gap: 12, marginTop: 20, marginBottom: 32 },
  statBox: { flex: 1, backgroundColor: LIGHT, borderRadius: 8, padding: 14 },
  statNum: { fontSize: 26, fontFamily: "Helvetica-Bold", color: DARK, lineHeight: 1 },
  statLabel: { fontSize: 9, color: MUTED, marginTop: 4 },
  tableHeader: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: DARK },
  tableHeaderText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  tableCell: { fontSize: 10, color: DARK },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 9, color: MUTED },
});

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

export function LeadSummaryPDF({ data }: { data: LeadSummaryPDFData }) {
  const accent = data.accentColor ?? EMBER;
  const conversionRate = data.totalLeads > 0
    ? Math.round((data.convertedLeads / data.totalLeads) * 100)
    : 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
            Lead summary
          </Text>
          <Text style={s.title}>{data.businessName}</Text>
          <Text style={s.meta}>{data.periodLabel}</Text>
        </View>

        {/* Stats */}
        <View style={s.statRow}>
          {[
            { n: data.totalLeads.toString(), l: "Total leads" },
            { n: data.convertedLeads.toString(), l: "Converted" },
            { n: `${conversionRate}%`, l: "Conversion rate" },
          ].map(m => (
            <View key={m.l} style={s.statBox}>
              <Text style={[s.statNum, { color: accent }]}>{m.n}</Text>
              <Text style={s.statLabel}>{m.l}</Text>
            </View>
          ))}
        </View>

        {/* Lead table */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, { flex: 1 }]}>Name</Text>
          <Text style={[s.tableHeaderText, { width: 100 }]}>Contact</Text>
          <Text style={[s.tableHeaderText, { width: 70 }]}>Source</Text>
          <Text style={[s.tableHeaderText, { width: 60 }]}>Status</Text>
          <Text style={[s.tableHeaderText, { width: 70, textAlign: "right" }]}>Date</Text>
        </View>

        {data.leads.map((lead, i) => (
          <View key={i} style={s.tableRow} wrap={false}>
            <Text style={[s.tableCell, { flex: 1, fontFamily: "Helvetica-Bold" }]}>{lead.name}</Text>
            <Text style={[s.tableCell, { width: 100, color: MUTED }]}>{lead.email ?? lead.phone ?? "-"}</Text>
            <Text style={[s.tableCell, { width: 70 }]}>{lead.source}</Text>
            <Text style={[s.tableCell, { width: 60, color: lead.status === "converted" ? "#10b981" : MUTED }]}>{lead.status}</Text>
            <Text style={[s.tableCell, { width: 70, textAlign: "right", color: MUTED }]}>{fmtDate(lead.created_at)}</Text>
          </View>
        ))}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{data.businessName} · Lead Summary · {data.periodLabel}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
