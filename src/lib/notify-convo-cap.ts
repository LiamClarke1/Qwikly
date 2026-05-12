import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resend, FROM } from "@/lib/resend";
import { convoPausedNotificationHtml } from "@/lib/resend";

/**
 * Fire-and-forget notification to the account owner when their assistant
 * hits the monthly conversation cap and has no credit left.
 *
 * Deduplication: the caller inserts a zero-cost api_usage row with
 * source='convo_cap_notification' before calling this, and checks for
 * that row's existence before calling — so this function is only invoked
 * once per billing period per client.
 */
export async function notifyConvoCapPaused({
  clientId,
  planName,
  conversationsIncluded,
  billingPeriod,
}: {
  clientId: number;
  planName: string;
  conversationsIncluded: number;
  billingPeriod: string; // "YYYY-MM-DD" first day of billing month
}): Promise<void> {
  try {
    const db = supabaseAdmin();

    const monthLabel = new Date(billingPeriod + "T12:00:00Z").toLocaleString("en-ZA", {
      month: "long",
      year: "numeric",
      timeZone: "Africa/Johannesburg",
    });

    // Resolve auth user and business name from the client row
    const { data: clientRow } = await db
      .from("clients")
      .select("auth_user_id, business_name")
      .eq("id", clientId)
      .maybeSingle();

    const authUserId = (clientRow as { auth_user_id?: string | null } | null)?.auth_user_id ?? null;
    const businessName = (clientRow as { business_name?: string | null } | null)?.business_name ?? "Your business";

    if (!authUserId) return;

    // Try businesses row for notification_email first, then fall back to the
    // Supabase Auth account email (guaranteed to exist for every signup).
    let recipient: string | null = null;

    const { data: bizRow } = await db
      .from("businesses")
      .select("notification_email, contact_email")
      .eq("user_id", authUserId)
      .maybeSingle();

    const notifEmail = (bizRow as { notification_email?: string | null } | null)?.notification_email;
    const contactEmail = (bizRow as { contact_email?: string | null } | null)?.contact_email;

    recipient =
      (notifEmail && notifEmail.trim()) ||
      (contactEmail && contactEmail.trim()) ||
      null;

    if (!recipient) {
      const { data: authData } = await db.auth.admin.getUserById(authUserId);
      recipient = authData?.user?.email ?? null;
    }

    if (!recipient || !process.env.RESEND_API_KEY) return;

    await resend.emails.send({
      from: FROM,
      to: [recipient],
      subject: `Your Qwikly assistant has paused for ${monthLabel}`,
      html: convoPausedNotificationHtml({
        businessName,
        planName,
        conversationsIncluded,
        monthLabel,
      }),
    });
  } catch (err) {
    console.error("[notify-convo-cap] failed:", err);
  }
}
