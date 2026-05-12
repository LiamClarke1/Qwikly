import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { z } from "zod";
import {
  productsForPlan,
  dailyProspectQuotaForPlan,
  startingGrantZarCents,
  mrrZarCents,
  resolvePlan,
  type InboundPlanTier,
} from "@/lib/plan";
import { applySubscriptionToClient } from "@/lib/billing/apply-subscription";
import { resend, FROM } from "@/lib/resend";

export const dynamic = "force-dynamic";

const Body = z.object({
  business_name:  z.string().min(1),
  owner_name:     z.string().min(1),
  email:          z.string().email(),
  phone:          z.string().optional(),
  plan:           z.enum(["trial", "starter", "pro", "founders", "business", "enterprise"]),
  billing_cycle:  z.enum(["monthly", "annual"]).default("monthly"),
  password:       z.string().min(8).optional(),
  note:           z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", detail: parsed.error.flatten() }, { status: 400 });
  }

  const { business_name, owner_name, email, phone, plan, billing_cycle, password, note } = parsed.data;
  const db = supabaseAdmin();

  // ── 1. Create (or find) the Supabase auth user ──────────────────────────────
  // If a password is provided, create the user directly so they can log in
  // immediately with the credentials the admin set. If no password is provided,
  // fall back to inviteUserByEmail (sends a magic-link).
  let userId: string;

  if (password) {
    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { business_name, full_name: owner_name },
    });

    if (createErr) {
      if (createErr.message?.toLowerCase().includes("already")) {
        // User exists — look them up and update their password
        const { data: existing } = await db.auth.admin.listUsers();
        const found = existing?.users?.find((u) => u.email === email);
        if (!found) {
          return NextResponse.json({ error: "User already exists but could not be found." }, { status: 409 });
        }
        userId = found.id;
        // Update password for existing user
        await db.auth.admin.updateUserById(userId, { password });
      } else {
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }
    } else {
      if (!created?.user) return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
      userId = created.user.id;
    }
  } else {
    // Fallback: send magic-link invite
    const { data: invite, error: inviteErr } = await db.auth.admin.inviteUserByEmail(email, {
      data: { business_name, full_name: owner_name },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.qwikly.co.za"}/auth/callback?next=/dashboard/setup`,
    });

    if (inviteErr) {
      if (inviteErr.message?.toLowerCase().includes("already")) {
        const { data: existing } = await db.auth.admin.listUsers();
        const found = existing?.users?.find((u) => u.email === email);
        if (!found) {
          return NextResponse.json({ error: "User already exists but could not be found." }, { status: 409 });
        }
        userId = found.id;
      } else {
        return NextResponse.json({ error: inviteErr.message }, { status: 500 });
      }
    } else {
      if (!invite?.user) return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
      userId = invite.user.id;
    }
  }

  // ── 2. Businesses row ────────────────────────────────────────────────────────
  await db.from("businesses").upsert({
    user_id: userId,
    name: business_name,
    contact_email: email,
  }, { onConflict: "user_id" });

  // ── 3. Subscription period dates ─────────────────────────────────────────────
  const now = new Date();
  const periodStart = now.toISOString();
  const periodEnd = billing_cycle === "annual"
    ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString()
    : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();

  // ── 4. Clients row ───────────────────────────────────────────────────────────
  // Check if a clients row already exists for this user
  const { data: existingClient } = await db
    .from("clients")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  let clientId: number;

  const tier = resolvePlan(plan) as InboundPlanTier;
  const mrr = mrrZarCents(tier, billing_cycle);

  if (existingClient) {
    clientId = existingClient.id;
    await db.from("clients").update({
      business_name,
      owner_name,
      client_email: email,
      ...(phone ? { whatsapp_number: phone } : {}),
      plan,
      products: productsForPlan(plan),
      pipeline_daily_quota: dailyProspectQuotaForPlan(plan),
      billing_cycle,
      mrr_zar: mrr,
      crm_status: "onboarding",
      web_widget_enabled: true,
    }).eq("id", clientId);
  } else {
    const { data: newClient, error: clientErr } = await db.from("clients").insert({
      auth_user_id: userId,
      business_name,
      owner_name,
      client_email: email,
      ...(phone ? { whatsapp_number: phone } : {}),
      plan,
      products: productsForPlan(plan),
      pipeline_daily_quota: dailyProspectQuotaForPlan(plan),
      billing_cycle,
      mrr_zar: mrr,
      onboarding_step: 1,
      web_widget_enabled: true,
      crm_status: "onboarding",
    }).select("id").single();

    if (clientErr || !newClient) {
      return NextResponse.json({ error: "Failed to create client row", detail: clientErr?.message }, { status: 500 });
    }
    clientId = newClient.id;
  }

  // ── 5. Subscription row ───────────────────────────────────────────────────────
  const { data: subRow, error: subErr } = await db.from("subscriptions").upsert({
    user_id:               userId,
    client_id:             clientId,
    plan,
    billing_cycle,
    status:                "active",
    current_period_start:  periodStart,
    current_period_end:    periodEnd,
  }, { onConflict: "user_id" }).select("id").single();

  if (subErr || !subRow) {
    return NextResponse.json({ error: "Failed to create subscription", detail: subErr?.message }, { status: 500 });
  }

  // ── 6. Wire subscription FK back to client ─────────────────────────────────
  await db.from("subscriptions").update({ client_id: clientId }).eq("id", subRow.id);

  // ── 7. AI credit grant ────────────────────────────────────────────────────
  const grantCents = startingGrantZarCents(plan);
  const { error: creditErr } = await db.from("conversation_credits").upsert({
    client_id:                clientId,
    granted_balance_zar_cents: grantCents,
    granted_expires_at:        periodEnd,
    updated_at:                now.toISOString(),
  }, { onConflict: "client_id" });
  if (creditErr) {
    await db.from("conversation_credits").upsert({
      client_id:         clientId,
      balance_zar_cents: grantCents,
      updated_at:        now.toISOString(),
    }, { onConflict: "client_id" });
  }

  // ── 8. Apply entitlement ──────────────────────────────────────────────────
  try {
    await applySubscriptionToClient(subRow.id);
  } catch (err) {
    console.error("[provision] applySubscriptionToClient failed:", err);
  }

  // ── 9. Log CRM event ──────────────────────────────────────────────────────
  await db.from("crm_events").insert({
    client_id:  clientId,
    actor_id:   auth.userId,
    event_type: "plan_changed",
    payload:    { to: plan, source: "admin_provision", note: note ?? null },
  });

  // ── 10. Send welcome email ─────────────────────────────────────────────────
  // The Supabase invite already sends a magic-link email. We additionally
  // send a branded welcome note so the client knows who to contact.
  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: FROM,
        to:   [email],
        subject: `Welcome to Qwikly — your account is ready`,
        html: welcomeEmailHtml({ business_name, owner_name, plan, billing_cycle, email, hasPassword: !!password }),
      });
    } catch (err) {
      console.warn("[provision] welcome email failed:", err);
    }
  }

  return NextResponse.json({ ok: true, client_id: clientId, user_id: userId }, { status: 201 });
}

function welcomeEmailHtml({
  business_name, owner_name, plan, billing_cycle, email, hasPassword,
}: { business_name: string; owner_name: string; plan: string; billing_cycle: string; email: string; hasPassword: boolean }) {
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const loginUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
    : "https://www.qwikly.co.za/login";
  const setupUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/setup`
    : "https://www.qwikly.co.za/dashboard/setup";

  const loginInstructions = hasPassword
    ? `<p style="margin:0 0 8px;font-size:14px;color:#9CA3AF;line-height:1.6;">
         Your login details:<br>
         <strong style="color:#F4F4F5;">Email:</strong> <span style="color:#F4F4F5;">${email}</span><br>
         <strong style="color:#F4F4F5;">Password:</strong> provided by your account manager — change it any time from Settings.
       </p>`
    : `<p style="margin:0 0 8px;font-size:14px;color:#9CA3AF;line-height:1.6;">
         Check your inbox for a separate email with a link to set your password and log in.
       </p>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:28px;">
          <span style="font-size:22px;font-weight:800;color:#E85A2C;letter-spacing:-0.5px;">Qwikly</span>
        </td></tr>
        <tr><td style="background:#111318;border-radius:16px;padding:32px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;">Welcome, ${owner_name}!</p>
          <p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;line-height:1.6;">
            Your Qwikly account for <strong style="color:#F4F4F5;">${business_name}</strong> has been set up on the
            <strong style="color:#E85A2C;">${planLabel}</strong> plan (${billing_cycle}).
          </p>
          ${loginInstructions}
          <div style="margin:24px 0;">
            <a href="${loginUrl}" style="display:inline-block;background:#E85A2C;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">
              Log in to your dashboard
            </a>
          </div>
          <p style="margin:0 0 8px;font-size:14px;color:#9CA3AF;line-height:1.6;font-weight:600;color:#F4F4F5;">Next steps once you&apos;re in:</p>
          <ol style="margin:0 0 20px;padding-left:20px;font-size:13px;color:#9CA3AF;line-height:2;">
            <li>Go to <a href="${setupUrl}" style="color:#E85A2C;text-decoration:none;">Setup</a> and tell your digital assistant about your business</li>
            <li>Go to <strong style="color:#F4F4F5;">Install</strong> and paste the script tag on your website</li>
            <li>Test it — open your website and chat to your own assistant</li>
            <li>Leads will start arriving in your <strong style="color:#F4F4F5;">Leads</strong> tab</li>
          </ol>
          <p style="margin:0;font-size:13px;color:#6B7280;">
            Questions? Reply to this email — we&apos;re here to help.
          </p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4B5563;">
            Sent by <a href="https://qwikly.co.za" style="color:#E85A2C;text-decoration:none;">Qwikly</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
