import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getSetupState } from "@/lib/pipeline/setup-state";
import IcpForm from "@/components/pipeline-setup/IcpForm";

export const dynamic = "force-dynamic";

export default async function PipelineSetupPage() {
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
  if (!user) redirect("/login");

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!client) {
    redirect("/dashboard/setup");
  }

  const tenantId = (client as { id: number | string }).id;
  const state = await getSetupState(tenantId);

  // We treat the ICP as "existing" if the user has previously generated a
  // prospect list. That switches the page header and copy into refresh mode.
  const hasExistingIcp = state.status === "generated" || state.last_generated_at != null;

  return <IcpForm initialIcp={state.icp} hasExistingIcp={hasExistingIcp} />;
}
