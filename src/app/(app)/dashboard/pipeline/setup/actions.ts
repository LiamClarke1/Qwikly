"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  getSetupState,
  updateSetupState,
  type PipelineSetupState,
  type IcpProfile,
  type SeedListSummary,
  type DomainsConfig,
  type CopyApproval,
} from "@/lib/pipeline/setup-state";

export type ActionResult<T = PipelineSetupState> =
  | { ok: true; state: T }
  | { ok: false; error: string };

async function resolveTenantId(): Promise<{ ok: true; tenantId: number | string } | { ok: false; error: string }> {
  const cookieStore = cookies();
  const auth = createServerClient(
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
  } = await auth.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const tenantId = (client as { id?: number | string } | null)?.id;
  if (!tenantId) return { ok: false, error: "No tenant found for this account" };
  return { ok: true, tenantId };
}

function revalidate() {
  revalidatePath("/dashboard/pipeline/setup");
  revalidatePath("/dashboard/pipeline");
}

export async function setStep(step: 1 | 2 | 3 | 4 | 5): Promise<ActionResult> {
  const t = await resolveTenantId();
  if (!t.ok) return t;
  if (![1, 2, 3, 4, 5].includes(step)) return { ok: false, error: "Invalid step" };
  try {
    const next = await updateSetupState(t.tenantId, { current_step: step });
    revalidate();
    return { ok: true, state: next };
  } catch (err) {
    console.error("[pipeline-setup/setStep] failed:", err);
    return { ok: false, error: "Could not save, try again." };
  }
}

export async function saveStep1(input: IcpProfile): Promise<ActionResult> {
  const t = await resolveTenantId();
  if (!t.ok) return t;
  try {
    const next = await updateSetupState(t.tenantId, {
      icp: input,
      current_step: 2,
    });
    revalidate();
    return { ok: true, state: next };
  } catch (err) {
    console.error("[pipeline-setup/saveStep1] failed:", err);
    return { ok: false, error: "Could not save, try again." };
  }
}

export async function saveStep2(input: SeedListSummary): Promise<ActionResult> {
  const t = await resolveTenantId();
  if (!t.ok) return t;
  try {
    const next = await updateSetupState(t.tenantId, {
      seed_list: input,
      current_step: 3,
    });
    revalidate();
    return { ok: true, state: next };
  } catch (err) {
    console.error("[pipeline-setup/saveStep2] failed:", err);
    return { ok: false, error: "Could not save, try again." };
  }
}

export async function saveStep3(input: DomainsConfig): Promise<ActionResult> {
  const t = await resolveTenantId();
  if (!t.ok) return t;
  try {
    const safeCount = Math.max(2, Math.min(5, Math.round(input.count)));
    const next = await updateSetupState(t.tenantId, {
      domains: { ...input, count: safeCount },
      current_step: 4,
    });
    revalidate();
    return { ok: true, state: next };
  } catch (err) {
    console.error("[pipeline-setup/saveStep3] failed:", err);
    return { ok: false, error: "Could not save, try again." };
  }
}

export async function saveStep4(input: CopyApproval): Promise<ActionResult> {
  const t = await resolveTenantId();
  if (!t.ok) return t;
  try {
    const next = await updateSetupState(t.tenantId, {
      copy: input,
      current_step: 5,
    });
    revalidate();
    return { ok: true, state: next };
  } catch (err) {
    console.error("[pipeline-setup/saveStep4] failed:", err);
    return { ok: false, error: "Could not save, try again." };
  }
}

export async function markReady(): Promise<ActionResult> {
  const t = await resolveTenantId();
  if (!t.ok) return t;
  try {
    const current = await getSetupState(t.tenantId);
    const next = await updateSetupState(t.tenantId, {
      status: "ready",
      ready_at: new Date().toISOString(),
      current_step: 5,
    });

    // Fire the notification to Liam. Best-effort, non-blocking on failure.
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
        process.env.SITE_URL?.replace(/\/$/, "") ||
        "https://www.qwikly.co.za";
      await fetch(`${baseUrl}/api/pipeline/setup/notify`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: cookies().toString(),
        },
        body: JSON.stringify({ tenantId: t.tenantId }),
      });
    } catch (notifyErr) {
      console.error("[pipeline-setup/markReady] notify failed:", notifyErr);
    }

    void current;
    revalidate();
    return { ok: true, state: next };
  } catch (err) {
    console.error("[pipeline-setup/markReady] failed:", err);
    return { ok: false, error: "Could not mark ready, try again." };
  }
}
