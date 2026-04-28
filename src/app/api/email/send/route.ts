import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { resend, FROM, bookingConfirmationHtml, bookingReminderHtml } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, bookingId, clientId } = body;

  if (!type || !bookingId || !clientId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify session
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();

  // Verify client belongs to this user
  const { data: ownedClient } = await db
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!ownedClient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: booking } = await db
    .from("bookings")
    .select("customer_name, customer_email, job_type, area, booking_datetime")
    .eq("id", bookingId)
    .single();

  if (!booking?.customer_email) {
    return NextResponse.json({ error: "No email on booking" }, { status: 400 });
  }

  const { data: client } = await db
    .from("clients")
    .select("business_name")
    .eq("id", clientId)
    .single();

  const businessName = client?.business_name ?? "Your service provider";

  let html = "";
  let subject = "";

  if (type === "confirmation") {
    subject = `Booking confirmed — ${businessName}`;
    html = bookingConfirmationHtml({
      customerName: booking.customer_name,
      businessName,
      jobType: booking.job_type,
      area: booking.area,
      datetime: booking.booking_datetime,
    });
  } else if (type === "reminder") {
    subject = `Reminder: your appointment with ${businessName}`;
    html = bookingReminderHtml({
      customerName: booking.customer_name,
      businessName,
      jobType: booking.job_type,
      datetime: booking.booking_datetime,
    });
  } else {
    return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: booking.customer_email,
    subject,
    html,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sent: true, id: data?.id });
}
