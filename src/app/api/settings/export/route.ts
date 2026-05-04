import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function getAuth() {
  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;

  const db = supabaseAdmin();
  const { data: client } = await db.from("clients").select("id, notification_email, client_email").eq("auth_user_id", user.id).maybeSingle();
  if (!client) return null;

  return { userId: user.id, email: user.email ?? "", clientId: client.id as number, notifEmail: (client.notification_email ?? client.client_email ?? user.email) as string };
}

export async function POST() {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();

  // Check for a recent pending/processing request (rate-limit: 1 per 24h)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await db
    .from("export_requests")
    .select("id, status, created_at")
    .eq("client_id", auth.clientId)
    .in("status", ["queued", "processing"])
    .gte("created_at", cutoff)
    .maybeSingle();

  if (recent) {
    return NextResponse.json({ error: "An export is already in progress. Check your email." }, { status: 429 });
  }

  const { data: req, error } = await db
    .from("export_requests")
    .insert({ client_id: auth.clientId, status: "queued" })
    .select("id, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Kick off the export inline (small accounts). For large datasets this would be a queue.
  buildAndEmailExport(auth.clientId, req.id, auth.notifEmail).catch(() => null);

  return NextResponse.json({ id: req.id, email: auth.notifEmail }, { status: 202 });
}

async function buildAndEmailExport(clientId: number, requestId: string, email: string) {
  const db = supabaseAdmin();

  await db.from("export_requests").update({ status: "processing" }).eq("id", requestId);

  try {
    // Gather all data for this client — individual awaits so a missing table doesn't abort the export
    const clientRes  = await db.from("clients").select("*").eq("id", clientId).maybeSingle();
    const convsRes   = await db.from("conversations").select("*").eq("client_id", clientId).limit(5000);
    const contactsRes = await db.from("contacts").select("*").eq("client_id", clientId).limit(5000);
    const bookingsRes = await db.from("bookings").select("*").eq("client_id", clientId).limit(5000);
    const invoicesRes = await db.from("invoices").select("*").eq("client_id", clientId).limit(2000);
    const kbRes       = await db.from("kb_articles").select("*").eq("client_id", clientId).limit(500);

    const exportData = {
      exported_at: new Date().toISOString(),
      client: clientRes.data,
      conversations: convsRes.data ?? [],
      contacts:      contactsRes.data ?? [],
      bookings:      bookingsRes.data ?? [],
      invoices:      invoicesRes.data ?? [],
      knowledge_base: kbRes.data ?? [],
    };

    const json = JSON.stringify(exportData, null, 2);

    // Upload to Supabase Storage
    const path = `exports/${clientId}/${requestId}.json`;
    await db.storage.from("exports").upload(path, json, {
      contentType: "application/json",
      upsert: true,
    });

    // Create a signed URL valid for 7 days
    const { data: signed, error: signedError } = await db.storage.from("exports").createSignedUrl(path, 7 * 24 * 60 * 60);
    if (signedError || !signed?.signedUrl) {
      await db.from("export_requests").update({ status: "failed" }).eq("id", requestId);
      return;
    }
    const downloadUrl = signed.signedUrl;

    await db.from("export_requests").update({
      status: "done",
      download_url: downloadUrl,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date().toISOString(),
    }).eq("id", requestId);

    // Email the signed URL
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && downloadUrl) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Qwikly <noreply@qwikly.co.za>",
          to: email,
          subject: "Your Qwikly data export is ready",
          html: `<p>Your data export is ready. <a href="${downloadUrl}">Download it here</a> (link expires in 7 days).</p>`,
        }),
      });
    }
  } catch {
    await db.from("export_requests").update({ status: "failed" }).eq("id", requestId);
  }
}
