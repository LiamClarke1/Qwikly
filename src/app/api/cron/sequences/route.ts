import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email";
import { renderSequenceStepEmail } from "@/lib/email/templates/sequence-step";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const now = new Date();
  let sent = 0;
  let failed = 0;

  // Get all active enrollments with their sequence and client info
  const { data: enrollments } = await db
    .from("email_sequence_enrollments")
    .select(`
      id, sequence_id, contact_email, contact_name, enrolled_at, metadata,
      email_sequences(id, status, client_id, name,
        clients(business_name, web_widget_color),
        email_sequence_steps(id, position, delay_hours, subject, heading, body, cta_text, cta_url)
      )
    `)
    .eq("status", "active");

  if (!enrollments?.length) return NextResponse.json({ sent, failed });

  for (const enrollment of enrollments) {
    const seq = enrollment.email_sequences as unknown as Record<string, unknown> | null;
    if (!seq || seq.status !== "active") continue;

    const client = seq.clients as Record<string, string> | null;
    const steps = (seq.email_sequence_steps as Array<{
      id: string;
      position: number;
      delay_hours: number;
      subject: string;
      heading?: string;
      body: string;
      cta_text?: string;
      cta_url?: string;
    }>)?.sort((a, b) => a.position - b.position) ?? [];

    if (!steps.length) continue;

    const enrolledAt = new Date(enrollment.enrolled_at);

    for (const step of steps) {
      // Check if this step is due
      const dueAt = new Date(enrolledAt.getTime() + step.delay_hours * 3600 * 1000);
      if (dueAt > now) continue; // not yet due

      // Check if already sent (or attempted)
      const { data: existing } = await db
        .from("email_sequence_sends")
        .select("id, sent_at, failed_at")
        .eq("enrollment_id", enrollment.id)
        .eq("step_id", step.id)
        .maybeSingle();

      if (existing) continue; // already handled

      // Create the send record first (optimistic, prevents double-send)
      const { data: sendRecord } = await db
        .from("email_sequence_sends")
        .insert({ enrollment_id: enrollment.id, step_id: step.id })
        .select("id")
        .single();

      if (!sendRecord) continue;

      try {
        const businessName = client?.business_name ?? "Qwikly";
        const accentColor = client?.web_widget_color ?? "#E85A2C";

        const html = await renderSequenceStepEmail({
          businessName,
          accentColor,
          previewText: step.subject,
          heading: step.heading ?? step.subject,
          body: step.body,
          ctaText: step.cta_text ?? undefined,
          ctaUrl: step.cta_url ?? undefined,
        });

        const result = await sendEmail({
          to: enrollment.contact_email,
          subject: step.subject,
          html,
        });

        if (result.error) throw new Error(result.error);

        await db.from("email_sequence_sends").update({
          sent_at: now.toISOString(),
          resend_id: result.id ?? null,
        }).eq("id", sendRecord.id);

        sent++;
      } catch (err) {
        console.error("[sequences/cron] step send failed", {
          enrollmentId: enrollment.id,
          stepId: step.id,
          error: err instanceof Error ? err.message : String(err),
        });

        await db.from("email_sequence_sends").update({
          failed_at: now.toISOString(),
          error: err instanceof Error ? err.message : String(err),
        }).eq("id", sendRecord.id);

        failed++;
      }
    }

    // Check if all steps are completed → mark enrollment done
    const { count: remainingCount } = await db
      .from("email_sequence_steps")
      .select("id", { count: "exact", head: true })
      .eq("sequence_id", enrollment.sequence_id)
      .gt("delay_hours", Math.floor((now.getTime() - enrolledAt.getTime()) / 3600000));

    if ((remainingCount ?? 1) === 0) {
      await db.from("email_sequence_enrollments")
        .update({ status: "completed", completed_at: now.toISOString() })
        .eq("id", enrollment.id);
    }
  }

  return NextResponse.json({ sent, failed });
}
