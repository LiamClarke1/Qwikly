import React from "react";
import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";

interface LineItem {
  description: string;
  quantity: number;
  unit_price_zar: number;
  line_total_zar: number;
}

interface InvoicePDFData {
  invoiceNumber: string;
  businessName: string;
  customerName: string;
  customerEmail?: string | null;
  issuedAt: string;
  dueAt: string;
  lineItems: LineItem[];
  subtotalZar: number;
  vatZar: number;
  totalZar: number;
  accentColor?: string;
  logoUrl?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankBranch?: string | null;
  footerText?: string | null;
  paymentTerms?: string | null;
}

const EMBER  = "#E85A2C";
const DARK   = "#0E0E0C";
const MUTED  = "#6A6A63";
const LIGHT  = "#F4EEE4";
const WHITE  = "#FFFFFF";
const BORDER = "#E5E7EB";

function fmt(n: number) { return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }); }

const s = StyleSheet.create({
  page: { backgroundColor: WHITE, fontFamily: "Helvetica", padding: 40, paddingBottom: 60 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 },
  logo: { fontSize: 20, fontFamily: "Helvetica-Bold", color: DARK },
  logoAccent: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  invoiceLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, textTransform: "uppercase", color: MUTED, marginBottom: 4 },
  invoiceNumber: { fontSize: 22, fontFamily: "Helvetica-Bold", color: DARK },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: BORDER },
  rowLabel: { fontSize: 12, color: MUTED },
  rowValue: { fontSize: 12, color: DARK, textAlign: "right" },
  tableHeader: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: DARK },
  tableHeaderText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  tableCell: { fontSize: 11, color: DARK },
  totalsBox: { backgroundColor: LIGHT, borderRadius: 8, padding: 16, marginTop: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalLabel: { fontSize: 11, color: MUTED },
  totalValue: { fontSize: 11, color: DARK },
  grandLabel: { fontSize: 14, fontFamily: "Helvetica-Bold", color: DARK },
  grandValue: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  bankBox: { backgroundColor: LIGHT, borderRadius: 8, padding: 16, marginTop: 16 },
  bankTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  bankRow: { flexDirection: "row", paddingVertical: 2 },
  bankLabel: { fontSize: 11, color: MUTED, width: 100 },
  bankValue: { fontSize: 11, color: DARK },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 9, color: MUTED },
});

export function InvoicePDF({ data }: { data: InvoicePDFData }) {
  const accent = data.accentColor ?? EMBER;

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.logo}>
              {data.businessName}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.invoiceLabel}>Tax Invoice</Text>
            <Text style={s.invoiceNumber}>{data.invoiceNumber}</Text>
          </View>
        </View>

        {/* Bill to / dates */}
        <View style={{ flexDirection: "row", gap: 40, marginBottom: 32 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Bill to</Text>
            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: DARK }}>{data.customerName}</Text>
            {data.customerEmail && <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{data.customerEmail}</Text>}
          </View>
          <View>
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { width: 80 }]}>Issued</Text>
              <Text style={[s.totalValue, { textAlign: "right" }]}>{fmtDate(data.issuedAt)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { width: 80 }]}>Due</Text>
              <Text style={[s.totalValue, { textAlign: "right", fontFamily: "Helvetica-Bold", color: accent }]}>{fmtDate(data.dueAt)}</Text>
            </View>
            {data.paymentTerms && (
              <View style={s.totalRow}>
                <Text style={[s.totalLabel, { width: 80 }]}>Terms</Text>
                <Text style={[s.totalValue, { textAlign: "right" }]}>{data.paymentTerms}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Line items */}
        <View style={s.section}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, { flex: 1 }]}>Description</Text>
            <Text style={[s.tableHeaderText, { width: 40, textAlign: "right" }]}>Qty</Text>
            <Text style={[s.tableHeaderText, { width: 80, textAlign: "right" }]}>Unit</Text>
            <Text style={[s.tableHeaderText, { width: 80, textAlign: "right" }]}>Total</Text>
          </View>
          {data.lineItems.map((li, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={[s.tableCell, { flex: 1 }]}>{li.description}</Text>
              <Text style={[s.tableCell, { width: 40, textAlign: "right", color: MUTED }]}>{li.quantity}</Text>
              <Text style={[s.tableCell, { width: 80, textAlign: "right", color: MUTED }]}>{fmt(li.unit_price_zar)}</Text>
              <Text style={[s.tableCell, { width: 80, textAlign: "right" }]}>{fmt(li.line_total_zar)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalsBox}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{fmt(data.subtotalZar)}</Text>
          </View>
          {data.vatZar > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>VAT (15%)</Text>
              <Text style={s.totalValue}>{fmt(data.vatZar)}</Text>
            </View>
          )}
          <View style={[s.totalRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER }]}>
            <Text style={s.grandLabel}>Total due</Text>
            <Text style={[s.grandValue, { color: accent }]}>{fmt(data.totalZar)}</Text>
          </View>
        </View>

        {/* Bank details */}
        {data.bankName && data.bankAccount && (
          <View style={s.bankBox}>
            <Text style={s.bankTitle}>EFT payment details</Text>
            {[
              ["Bank", data.bankName],
              ["Account", data.bankAccount],
              ...(data.bankBranch ? [["Branch", data.bankBranch]] : []),
              ["Reference", data.invoiceNumber],
            ].map(([label, value]) => (
              <View key={label} style={s.bankRow}>
                <Text style={s.bankLabel}>{label}</Text>
                <Text style={s.bankValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{data.businessName} · {data.invoiceNumber}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
