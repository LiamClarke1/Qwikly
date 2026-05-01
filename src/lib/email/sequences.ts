import { supabaseAdmin } from "@/lib/supabase-server";

export async function enrollLeadInSequences(
  clientId: number,
  email: string,
  name: string | null,
  conversationId: string | null
): Promise<void> {
  if (!email) return;

  const db = supabaseAdmin();

  // Find active sequences for this client with trigger_type = lead_captured
  const { data: sequences } = await db
    .from("email_sequences")
    .select("id")
    .eq("client_id", clientId)
    .eq("status", "active")
    .eq("trigger_type", "lead_captured");

  if (!sequences?.length) return;

  for (const seq of sequences) {
    // Avoid duplicate enrollments — one active/completed enrollment per email per sequence
    const { data: existing } = await db
      .from("email_sequence_enrollments")
      .select("id")
      .eq("sequence_id", seq.id)
      .eq("contact_email", email)
      .in("status", ["active", "completed"])
      .maybeSingle();

    if (existing) continue;

    await db.from("email_sequence_enrollments").insert({
      sequence_id: seq.id,
      contact_email: email,
      contact_name: name ?? null,
      status: "active",
      metadata: conversationId ? { conversation_id: conversationId } : null,
    });
  }
}
