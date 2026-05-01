import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { supabaseAdmin } from "@/lib/supabase-server";

export type PdfTemplate = "invoice" | "crm-report" | "transcript" | "lead-summary";

interface PdfResult {
  signedUrl: string;
  storagePath: string;
}

export async function generatePdf(
  template: PdfTemplate,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  options?: { bucket?: string; path?: string }
): Promise<PdfResult> {
  const db = supabaseAdmin();
  const bucket = options?.bucket ?? "crm-files";
  const storagePath = options?.path ?? `pdf/${template}/${Date.now()}.pdf`;

  let element: React.ReactElement;

  switch (template) {
    case "crm-report": {
      const { CrmReportPDF } = await import("@/lib/pdf/templates/crm-report");
      element = React.createElement(CrmReportPDF, { data });
      break;
    }
    case "invoice": {
      const { InvoicePDF } = await import("@/lib/pdf/templates/invoice");
      element = React.createElement(InvoicePDF, { data });
      break;
    }
    case "transcript": {
      const { TranscriptPDF } = await import("@/lib/pdf/templates/transcript");
      element = React.createElement(TranscriptPDF, { data });
      break;
    }
    case "lead-summary": {
      const { LeadSummaryPDF } = await import("@/lib/pdf/templates/lead-summary");
      element = React.createElement(LeadSummaryPDF, { data });
      break;
    }
    default:
      throw new Error(`Unknown PDF template: ${template}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any);

  const { error: uploadError } = await db.storage
    .from(bucket)
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true });

  if (uploadError) throw new Error(`PDF upload failed: ${uploadError.message}`);

  const { data: signed } = await db.storage
    .from(bucket)
    .createSignedUrl(storagePath, 604800); // 7 days

  if (!signed?.signedUrl) throw new Error("Failed to create signed URL");

  return { signedUrl: signed.signedUrl, storagePath };
}
