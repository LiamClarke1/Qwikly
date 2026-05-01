import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-auth";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generatePdf, PdfTemplate } from "@/lib/pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_TEMPLATES: PdfTemplate[] = ["invoice", "crm-report", "transcript", "lead-summary"];

export async function POST(req: NextRequest) {
  // Accept admin session OR authenticated user session OR cron secret
  const cronSecret = req.headers.get("x-cron-secret");
  const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;

  if (!isCron) {
    // Try user session first
    const cookieStore = cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      const admin = await assertAdmin();
      if (!admin.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { template, data, bucket, path: storagePath } = body as {
    template: PdfTemplate;
    data: unknown;
    bucket?: string;
    path?: string;
  };

  if (!template || !VALID_TEMPLATES.includes(template)) {
    return NextResponse.json({ error: `template must be one of: ${VALID_TEMPLATES.join(", ")}` }, { status: 400 });
  }
  if (!data) return NextResponse.json({ error: "data is required" }, { status: 400 });

  try {
    const result = await generatePdf(template, data, { bucket, path: storagePath });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/pdf]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "PDF generation failed" }, { status: 500 });
  }
}
