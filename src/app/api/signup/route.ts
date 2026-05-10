import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { trialEndsFromNow } from "@/lib/trial";
import { resend, FROM, newSignupAdminNotificationHtml } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkRateLimit(`signup:${ip}`, 5);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute and try again." }, { status: 429 });
  }

  let body: { email?: string; password?: string; businessName?: string; plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { email, password, businessName, plan: planParam } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const validPlans = ["trial", "starter", "pro", "business", "enterprise", "premium"];
  const resolvedPlan = validPlans.includes(planParam ?? "") ? planParam! : "trial";

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) =>
          s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );

  const db = supabaseAdmin();

  // Create + auto-confirm via admin API. This avoids Supabase's confirmation
  // email send (which is rate-limited on the free tier and fails as
  // "Error sending confirmation email" once the per-hour cap is hit).
  const { data: createData, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    const msg = createError.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return NextResponse.json({ error: "User already registered" }, { status: 400 });
    }
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  if (!createData.user) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  // Sign the new user in so they get a browser session and can be redirected
  // straight to /dashboard/setup without an email confirmation step.
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return NextResponse.json({ error: signInError.message }, { status: 400 });
  }

  const data = { user: createData.user, session: { token: "set-via-cookie" } };

  if (data.user) {

    const { error: bizError } = await db.from("businesses").upsert({
      user_id: data.user.id,
      name: businessName ?? "",
      contact_email: email,
    }, { onConflict: "user_id" });

    if (bizError) {
      return NextResponse.json({ error: "account_setup_failed" }, { status: 500 });
    }

    const trialEndsAt = resolvedPlan === "trial"
      ? trialEndsFromNow().toISOString()
      : null;

    const { error: subError } = await db.from("subscriptions").upsert({
      user_id: data.user.id,
      plan: resolvedPlan,
      billing_cycle: "monthly",
      status: "active",
      ...(trialEndsAt ? { trial_ends_at: trialEndsAt } : {}),
    }, { onConflict: "user_id" });

    if (subError) {
      return NextResponse.json({ error: "account_setup_failed" }, { status: 500 });
    }

    // Create a clients row if one doesn't exist, the onboarding wizard reads from this table.
    // The CRM list page also reads clients.trial_ends_at to render the trial-countdown badge.
    const { data: existingClient } = await db
      .from("clients")
      .select("id")
      .eq("auth_user_id", data.user.id)
      .maybeSingle();

    if (!existingClient) {
      await db.from("clients").insert({
        auth_user_id: data.user.id,
        business_name: businessName ?? "",
        onboarding_step: 1,
        web_widget_enabled: true,
        plan: resolvedPlan,
        ...(trialEndsAt ? { trial_ends_at: trialEndsAt } : {}),
      });
    } else if (trialEndsAt) {
      await db.from("clients").update({
        plan: resolvedPlan,
        trial_ends_at: trialEndsAt,
      }).eq("id", existingClient.id);
    }
  }

  // Notify Qwikly admin (Liam) that a new client just signed up. Awaited so
  // Vercel doesn't recycle the function before the email is sent, but wrapped
  // in try/catch so a Resend hiccup never blocks the user's signup flow.
  const adminEmail = (process.env.QWIKLY_OWN_NOTIFICATION_EMAIL ?? "").trim();
  if (adminEmail && process.env.RESEND_API_KEY) {
    try {
      const signupTime = new Date().toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      });
      await resend.emails.send({
        from: FROM,
        to: [adminEmail],
        subject: `New Qwikly signup: ${businessName?.trim() || email}`,
        html: newSignupAdminNotificationHtml({
          email,
          businessName: businessName ?? null,
          plan: resolvedPlan,
          signupTime,
        }),
      });
    } catch (err) {
      console.error("[signup] admin notification failed:", err);
    }
  }

  return NextResponse.json(
    {
      user: { id: data.user?.id, email: data.user?.email },
      needsConfirmation: !data.session,
    },
    { status: 201 }
  );
}
