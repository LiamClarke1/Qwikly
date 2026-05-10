"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  updateSetupState,
  type IcpDefinition,
} from "@/lib/pipeline/setup-state";
import { persistProspects } from "@/app/(app)/dashboard/pipeline/generate/actions";
import {
  SA_INDUSTRIES,
  SA_LOCATIONS,
  JOB_TITLES,
  INTENT_SIGNALS,
  type GenerateProspectInput,
  type SaIndustry,
  type SaLocation,
  type JobTitle,
  type IntentSignal,
} from "@/lib/pipeline/generator/types";

export type SaveResult = { ok: true } | { ok: false; reason: string };
export type GenerateResult =
  | { ok: true; count: number }
  | { ok: false; reason: string };

async function resolveTenantId(): Promise<
  { ok: true; tenantId: number | string } | { ok: false; reason: string }
> {
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
  if (!user) return { ok: false, reason: "Not signed in" };

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const tenantId = (client as { id?: number | string } | null)?.id;
  if (!tenantId) return { ok: false, reason: "No tenant found for this account" };
  return { ok: true, tenantId };
}

function revalidate() {
  revalidatePath("/dashboard/pipeline/setup");
  revalidatePath("/dashboard/pipeline");
}

// Map the form's free-form ICP onto the generator's enum-bound input. Anything
// not on the generator's enum list is dropped silently so the generator does
// not blow up. The form's full ICP is still persisted to setup-state.
function toGeneratorInput(icp: IcpDefinition): GenerateProspectInput {
  const industries = icp.industries
    .filter((x): x is SaIndustry =>
      (SA_INDUSTRIES as readonly string[]).includes(x),
    );
  const titles = icp.titles
    .filter((x): x is JobTitle =>
      (JOB_TITLES as readonly string[]).includes(x),
    );
  let locations = icp.locations
    .filter((x): x is SaLocation =>
      (SA_LOCATIONS as readonly string[]).includes(x),
    );
  const intentSignals = icp.intentSignals
    .filter((x): x is IntentSignal =>
      (INTENT_SIGNALS as readonly string[]).includes(x),
    );

  // Generator needs at least one location, fall back to Anywhere in SA.
  if (locations.length === 0) {
    locations = ["Anywhere in SA"];
  }
  // Generator size bounds, 5 to 500.
  const sizeMin = Math.max(5, Math.min(500, Math.round(icp.sizeMin)));
  const sizeMax = Math.max(sizeMin, Math.min(500, Math.round(icp.sizeMax)));

  return {
    industries: industries.length ? industries : [...SA_INDUSTRIES],
    jobTitles: titles.length ? titles : [...JOB_TITLES],
    companySize: { min: sizeMin, max: sizeMax },
    locations,
    intentSignals,
    quantity: 100,
  };
}

export async function saveIcp(icp: IcpDefinition): Promise<SaveResult> {
  const t = await resolveTenantId();
  if (!t.ok) return t;
  try {
    await updateSetupState(t.tenantId, { icp });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("[pipeline-setup/saveIcp] failed:", err);
    return { ok: false, reason: "Could not save your ICP, try again." };
  }
}

export async function generateAndRedirect(
  icp: IcpDefinition,
): Promise<GenerateResult> {
  const t = await resolveTenantId();
  if (!t.ok) return t;

  try {
    // 1. Persist the ICP and flag the run as in-progress.
    await updateSetupState(t.tenantId, {
      icp,
      status: "refreshing",
    });

    // 2. Generate matching prospects.
    const result = await persistProspects({
      input: toGeneratorInput(icp),
      tenantId: t.tenantId,
    });

    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }

    // 3. Mark generation complete.
    await updateSetupState(t.tenantId, {
      status: "generated",
      last_generated_at: new Date().toISOString(),
    });

    // 4. Fire the internal notification so Liam knows a new ICP came in.
    //    Best-effort, non-blocking.
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
      console.error("[pipeline-setup/generateAndRedirect] notify failed:", notifyErr);
    }

    revalidate();
    return { ok: true, count: result.count };
  } catch (err) {
    console.error("[pipeline-setup/generateAndRedirect] failed:", err);
    return { ok: false, reason: "Could not generate your prospect list, try again." };
  }
}
