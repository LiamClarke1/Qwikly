import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-server";
import { updateSetupState, type IcpDefinition } from "@/lib/pipeline/setup-state";
import { runGeneratorAndInsert } from "@/lib/pipeline/generator/run";
import { requireOutboundAccess } from "@/lib/auth/require-outbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // First-batch generation can take 2-3 minutes

interface Body {
  icp?: IcpDefinition;
  firstBatch?: boolean;
  count?: number;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.icp) {
    return NextResponse.json({ error: "icp is required" }, { status: 400 });
  }

  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(c) {
          c.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const access = await requireOutboundAccess(user.id);
  if (!access.ok) {
    return NextResponse.json(
      { error: "outbound_access_required", plan: access.plan },
      { status: 403 },
    );
  }

  const db = supabaseAdmin();

  // Resolve clients (billing tenant). Used for cap-check + outbound product
  // gate. plan drives the cap and products gates outbound access.
  const { data: client } = await db
    .from("clients")
    .select("id, plan, products")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "no client row" }, { status: 404 });
  }

  const c = client as { id: number | string; plan: string; products: unknown };
  const products = Array.isArray(c.products) ? (c.products as string[]) : [];
  if (!products.includes("outbound")) {
    return NextResponse.json(
      { error: "outbound product not active" },
      { status: 403 },
    );
  }

  // Resolve businesses (pipeline tenant). businesses.id is the UUID used as
  // the tenant key for pipeline_prospects.business_id and as the lookup key
  // for getSetupState inside runGeneratorAndInsert. If this row is missing
  // the user has not completed inbound widget setup yet, which is required
  // before pipeline can persist anything.
  const { data: business } = await db
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!business) {
    return NextResponse.json(
      {
        error: "no_business_row",
        message:
          "Pipeline setup needs a business profile. Complete inbound widget setup first or contact support.",
      },
      { status: 412 },
    );
  }
  const businessId = (business as { id: string }).id;

  // Persist ICP keyed on businessId. setup-state.ts tries the clients JSONB
  // column first (which will miss because businessId is a UUID and
  // clients.id is BIGINT) and then falls through to the
  // pipeline_setup_state(tenant_id, state) dedicated table, which is the
  // same key runGeneratorAndInsert reads from via getSetupState(businessId).
  // Using businessId here keeps the write and the read consistent. The
  // existing dashboard server action (src/app/(app)/dashboard/pipeline/setup
  // /actions.ts) already uses businesses.id as the tenantId for the same
  // reason.
  await updateSetupState(businessId, {
    icp: body.icp,
    status: "generated",
    last_generated_at: new Date().toISOString(),
  });

  if (body.firstBatch) {
    try {
      const result = await runGeneratorAndInsert({
        clientId: c.id,
        businessId,
        plan: c.plan,
        count: body.count ?? 5,
        batchKind: "first_batch",
      });

      if (result.capReached) {
        return NextResponse.json({
          ok: true,
          prospectsCreated: 0,
          capReached: true,
          message:
            "Your monthly data budget is reached. Top up to enable your first batch.",
        });
      }

      return NextResponse.json({ ok: true, prospectsCreated: result.created });
    } catch (err: unknown) {
      console.error("[save-and-generate] generator failed", err);
      return NextResponse.json({
        ok: true,
        prospectsCreated: 0,
        warning:
          "ICP saved but first batch failed. Try refreshing your dashboard in a few minutes.",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
