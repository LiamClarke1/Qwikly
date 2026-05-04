"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

async function getAuthenticatedUserId(): Promise<string> {
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
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user.id;
}

export async function saveBusinessStep(payload: {
  business_name: string;
  industry: string | null;
  support_email: string | null;
  notification_email: string | null;
  notification_phone: string | null;
}): Promise<void> {
  const userId = await getAuthenticatedUserId();
  const db = supabaseAdmin();
  const { error } = await db
    .from("clients")
    .update(payload)
    .eq("auth_user_id", userId);
  if (error) throw new Error(error.message);
}

export async function saveAssistantStep(payload: {
  web_widget_color: string;
  brand_color: string;
  web_widget_greeting: string;
  faq: { q: string; a: string }[] | null;
}): Promise<void> {
  const userId = await getAuthenticatedUserId();
  const db = supabaseAdmin();
  const { error } = await db
    .from("clients")
    .update(payload)
    .eq("auth_user_id", userId);
  if (error) throw new Error(error.message);
}

export async function advanceOnboardingStep(step: number): Promise<void> {
  const userId = await getAuthenticatedUserId();
  const db = supabaseAdmin();
  const { error } = await db
    .from("clients")
    .update({ onboarding_step: step })
    .eq("auth_user_id", userId);
  if (error) throw new Error(error.message);
}

export async function completeOnboarding(): Promise<void> {
  const userId = await getAuthenticatedUserId();
  const db = supabaseAdmin();
  const { error } = await db
    .from("clients")
    .update({ onboarding_complete: true, onboarding_completed_at: new Date().toISOString() })
    .eq("auth_user_id", userId);
  if (error) throw new Error(error.message);
}
