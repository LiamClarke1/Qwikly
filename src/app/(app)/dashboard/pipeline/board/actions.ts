"use server";

// Server action that moves a prospect to a new status on the Pipeline board.
// Auth pattern mirrors src/app/(app)/dashboard/pipeline/generate/actions.ts:
// resolve the current Supabase user, look up the owning business row, then
// scope the update by business_id so a tenant can never touch another tenant.

import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export type ProspectStatus =
  | "new"
  | "contacted"
  | "replied"
  | "qualified"
  | "booked"
  | "dead";

const VALID_STATUSES: ReadonlyArray<ProspectStatus> = [
  "new",
  "contacted",
  "replied",
  "qualified",
  "booked",
  "dead",
];

export type SetProspectStatusResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "invalid_status"
        | "not_signed_in"
        | "no_tenant"
        | "update_failed"
        | "schema_pending";
    };

export async function setProspectStatus(
  prospectId: string,
  newStatus: ProspectStatus,
): Promise<SetProspectStatusResult> {
  if (!prospectId || typeof prospectId !== "string") {
    return { ok: false, reason: "invalid_status" };
  }
  if (!VALID_STATUSES.includes(newStatus)) {
    return { ok: false, reason: "invalid_status" };
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
  if (!user) {
    return { ok: false, reason: "not_signed_in" };
  }

  const db = supabaseAdmin();
  const { data: biz } = await db
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const businessId = (biz as { id?: string } | null)?.id ?? null;
  if (!businessId) {
    return { ok: false, reason: "no_tenant" };
  }

  const { error } = await db
    .from("pipeline_prospects")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", prospectId)
    .eq("business_id", businessId);

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "42P01") {
      return { ok: false, reason: "schema_pending" };
    }
    return { ok: false, reason: "update_failed" };
  }

  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard/pipeline/board");
  return { ok: true };
}
