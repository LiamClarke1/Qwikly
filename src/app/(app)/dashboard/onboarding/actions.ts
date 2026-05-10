"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-server";
import { setOnboardingStep, type OnboardingState } from "@/lib/onboarding/state";

export type SetStepResult =
  | { ok: true; state: OnboardingState }
  | { ok: false; error: string };

/**
 * Toggle a single onboarding step for the authed tenant. Auth check happens
 * by reading the Supabase session cookie, then resolving the matching
 * clients.id via auth_user_id, the same pattern the rest of the dashboard
 * uses.
 */
export async function setStep(step: 1 | 2 | 3 | 4 | 5, done: boolean): Promise<SetStepResult> {
  if (![1, 2, 3, 4, 5].includes(step)) {
    return { ok: false, error: "Invalid step" };
  }

  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const tenantId = (client as { id?: number | string } | null)?.id;
  if (!tenantId) return { ok: false, error: "No tenant found for this account" };

  try {
    const next = await setOnboardingStep(tenantId, step, done);
    revalidatePath("/dashboard/onboarding");
    revalidatePath("/dashboard");
    return { ok: true, state: next };
  } catch (err) {
    console.error("[onboarding/setStep] failed:", err);
    return { ok: false, error: "Could not save, try again." };
  }
}
