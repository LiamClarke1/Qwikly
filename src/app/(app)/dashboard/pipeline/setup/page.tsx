import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getSetupState } from "@/lib/pipeline/setup-state";
import Wizard from "@/components/pipeline-setup/Wizard";
import type { CopyTemplatePreview } from "@/components/pipeline-setup/CopyStep";

export const dynamic = "force-dynamic";

// Try to import cadence templates from src/lib/outreach/cadence.ts. Fall back
// to a hardcoded preview if the module shape ever changes, so this page never
// fails to render.
import {
  ICEBREAKER_TEMPLATE,
  TLDR_TEMPLATE,
  BREAKUP_TEMPLATE,
} from "@/lib/outreach/cadence";

function buildTemplatePreviews(): CopyTemplatePreview[] {
  try {
    return [
      {
        id: "icebreaker",
        label: "Icebreaker",
        day: ICEBREAKER_TEMPLATE.day,
        subjectExample: ICEBREAKER_TEMPLATE.subjectLineHints[0] ?? "quick one, {{firstName}}",
        body: ICEBREAKER_TEMPLATE.body,
      },
      {
        id: "tldr",
        label: "TL;DR follow-up",
        day: TLDR_TEMPLATE.day,
        subjectExample: TLDR_TEMPLATE.subjectLineHints[0] ?? "re, {{businessName}}",
        body: TLDR_TEMPLATE.body,
      },
      {
        id: "breakup",
        label: "Breakup",
        day: BREAKUP_TEMPLATE.day,
        subjectExample: BREAKUP_TEMPLATE.subjectLineHints[0] ?? "closing the loop",
        body: BREAKUP_TEMPLATE.body,
      },
    ];
  } catch {
    return [
      {
        id: "icebreaker",
        label: "Icebreaker",
        day: 0,
        subjectExample: "quick one, {{firstName}}",
        body: "Hi {{firstName}},\n\nQuick note about {{businessName}}.\n\n{{senderFirstName}}",
      },
      {
        id: "tldr",
        label: "TL;DR follow-up",
        day: 3,
        subjectExample: "re, {{businessName}}",
        body: "Hi {{firstName}},\n\nShort version of my last note.\n\n{{senderFirstName}}",
      },
      {
        id: "breakup",
        label: "Breakup",
        day: 6,
        subjectExample: "closing the loop",
        body: "Hi {{firstName}},\n\nLast note from me.\n\n{{senderFirstName}}",
      },
    ];
  }
}

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
    .select("id, business_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!client) {
    redirect("/dashboard/setup");
  }

  const tenantId = (client as { id: number | string }).id;
  const state = await getSetupState(tenantId);
  const copyTemplates = buildTemplatePreviews();

  return (
    <div className="space-y-7 max-w-4xl">
      <div>
        <p className="eyebrow text-ember mb-2">Pipeline campaign setup</p>
        <h1 className="display-md text-ink leading-tight tracking-tight">
          Set up your Pipeline campaign
        </h1>
        <p className="text-body text-ink-500 mt-2">
          Five steps. Done in 30 minutes. We launch the moment you sign off.
        </p>
      </div>

      <Wizard initialState={state} copyTemplates={copyTemplates} />
    </div>
  );
}
