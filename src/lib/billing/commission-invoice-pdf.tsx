import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const EMBER  = "#E85A2C";
const DARK   = "#0E0E0C";
const MUTED  = "#6A6A63";
const LIGHT  = "#F4EEE4";
const WHITE  = "#FFFFFF";

export interface CommissionInvoiceData {
  invoiceNumber: string;
  issuedAt: string;
  dueAt: string | null;
  periodStart: string;
  periodEnd: string;
  businessName: string;
  billingEmail: string | null;
  commissionExVat: number;
  vatZar: number;
  totalZar: number;
  vatNumber: string;
}

const s = StyleSheet.create({
  page:              { backgroundColor: WHITE, fontFamily: "Helvetica", padding: 48, paddingBottom: 80 },
  header:            { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48 },
  logoBox:           { backgroundColor: EMBER, borderRadius: 6, paddingHorizontal: 16, paddingVertical: 8 },
  logoText:          { color: WHITE, fontFamily: "Helvetica-Bold", fontSize: 18 },
  invoiceLabel:      { fontSize: 9, color: MUTED, letterSpacing: 2, marginBottom: 4 },
  invoiceNumber:     { fontSize: 20, fontFamily: "Helvetica-Bold", color: DARK },
  divider:           { borderBottomWidth: 1, borderBottomColor: "rgba(14,14,12,0.12)", marginVertical: 24 },
  metaRow:           { flexDirection: "row", gap: 48, marginBottom: 32 },
  metaBlock:         { flex: 1 },
  metaLabel:         { fontSize: 8, color: MUTED, letterSpacing: 1.5, marginBottom: 6 },
  metaValue:         { fontSize: 13, color: DARK },
  metaValueMuted:    { fontSize: 12, color: MUTED, marginTop: 2 },
  tableHeaderRow:    { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "rgba(14,14,12,0.10)" },
  tableHeaderText:   { fontSize: 8, color: MUTED, letterSpacing: 1.5 },
  tableRow:          { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(14,14,12,0.06)" },
  tableLabel:        { fontSize: 12, color: DARK },
  tableLabelMuted:   { fontSize: 12, color: MUTED },
  tableValue:        { fontSize: 12, color: DARK },
  tableValueMuted:   { fontSize: 12, color: MUTED },
  totalRow:          { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 12, backgroundColor: LIGHT, borderRadius: 6, marginTop: 8 },
  totalLabel:        { fontSize: 14, fontFamily: "Helvetica-Bold", color: DARK },
  totalValue:        { fontSize: 18, fontFamily: "Helvetica-Bold", color: EMBER },
  footer:            { position: "absolute", bottom: 40, left: 48, right: 48 },
  footerText:        { fontSize: 9, color: MUTED, textAlign: "center" },
  footerTextSmall:   { fontSize: 9, color: MUTED, textAlign: "center", marginTop: 4 },
});

function fmtZar(n: number): string {
  return "R " + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

export function CommissionInvoicePDF({ data }: { data: CommissionInvoiceData }) {
  const periodLabel = `${fmtDate(data.periodStart)} – ${fmtDate(data.periodEnd)}`;

  return (
    <Document title={`Qwikly Invoice ${data.invoiceNumber}`}>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>Qwikly</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.invoiceLabel}>INVOICE</Text>
            <Text style={s.invoiceNumber}>{data.invoiceNumber}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Meta: billed to, period, dates */}
        <View style={s.metaRow}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>BILLED TO</Text>
            <Text style={s.metaValue}>{data.businessName}</Text>
            {data.billingEmail ? <Text style={s.metaValueMuted}>{data.billingEmail}</Text> : null}
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>PERIOD</Text>
            <Text style={s.metaValue}>{periodLabel}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>ISSUED</Text>
            <Text style={s.metaValue}>{fmtDate(data.issuedAt)}</Text>
            {data.dueAt ? (
              <>
                <Text style={[s.metaLabel, { marginTop: 12 }]}>DUE</Text>
                <Text style={s.metaValue}>{fmtDate(data.dueAt)}</Text>
              </>
            ) : null}
          </View>
        </View>

        <View style={s.divider} />

        {/* Line items */}
        <View style={s.tableHeaderRow}>
          <Text style={s.tableHeaderText}>DESCRIPTION</Text>
          <Text style={s.tableHeaderText}>AMOUNT</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={s.tableLabel}>Qwikly platform commission — {periodLabel}</Text>
          <Text style={s.tableValue}>{fmtZar(data.commissionExVat)}</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={s.tableLabelMuted}>VAT (15%)</Text>
          <Text style={s.tableValueMuted}>{fmtZar(data.vatZar)}</Text>
        </View>

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total due</Text>
          <Text style={s.totalValue}>{fmtZar(data.totalZar)}</Text>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Qwikly (Pty) Ltd — VAT No: {data.vatNumber} — billing@qwikly.co.za
          </Text>
          <Text style={s.footerTextSmall}>
            Pay by EFT or at qwikly.co.za/dashboard/billing
          </Text>
        </View>

      </Page>
    </Document>
  );
}
