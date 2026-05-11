import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getEntitlement } from "@/lib/billing/entitlement";
import { PLAN_CONFIG, resolvePlan } from "@/lib/plan";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { fmt } from "@/lib/money";
import { BuyLeadPackButton } from "./_components/buy-button";

export const dynamic = "force-dynamic";

/**
 * Lead-pack top-up landing page. Three packs (small +10, medium +25,
 * large +50) priced at the customer's tier rate, with a 10% bonus on the
 * large pack documented in the spec (50 leads charged at 45).
 *
 * Each "Buy" button POSTs to `/api/payfast/topup-leads` with the pack size
 * and redirects to the returned hosted-checkout URL.
 */

type PackSize = "small" | "medium" | "large";

interface Pack {
  size: PackSize;
  label: string;
  leads: number;
  // Multiplier of per-lead tier rate, with the large-pack 10% bonus
  // captured as "price = 45 × rate" (instead of 50 × rate).
  effectiveLeadsForPricing: number;
  highlight?: boolean;
}

const PACKS: Pack[] = [
  { size: "small", label: "Small pack", leads: 10, effectiveLeadsForPricing: 10 },
  { size: "medium", label: "Medium pack", leads: 25, effectiveLeadsForPricing: 25, highlight: true },
  { size: "large", label: "Large pack", leads: 50, effectiveLeadsForPricing: 45 },
];

export default async function TopupLeadsPage() {
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
  if (!client) redirect("/dashboard/setup");

  const clientId = (client as { id: number }).id;
  const ent = await getEntitlement(clientId);
  const tier = resolvePlan(ent.plan);
  const ratePerLead = PLAN_CONFIG[tier].topUpPricePerLeadZar;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        eyebrow="Billing"
        title="Top up leads"
        description={`Buy an extra pack of leads for the rest of this billing period. Your tier rate is ${fmt(ratePerLead)}/lead.`}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PACKS.map((pack) => {
          const price = pack.effectiveLeadsForPricing * ratePerLead;
          const bonus = pack.leads - pack.effectiveLeadsForPricing;
          return (
            <Card
              key={pack.size}
              className={pack.highlight ? "border-brand/40 bg-brand/5" : undefined}
            >
              {pack.highlight && (
                <span className="absolute top-4 right-4 text-tiny font-semibold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
                  Popular
                </span>
              )}
              <CardHeader title={pack.label} />
              <p className="text-display-2 font-display text-fg leading-none">
                +{pack.leads.toLocaleString()}
                <span className="text-small text-fg-muted font-normal"> leads</span>
              </p>
              <p className="text-h2 text-fg mt-2">{fmt(price)}</p>
              {bonus > 0 && (
                <p className="text-tiny text-success mt-1">
                  Includes {bonus} bonus lead{bonus === 1 ? "" : "s"}
                </p>
              )}
              <p className="text-tiny text-fg-muted mt-3 leading-relaxed">
                Pack expires at the end of your current billing period. Leads
                are consumed only after your monthly cap is reached.
              </p>
              <div className="mt-5">
                <BuyLeadPackButton size={pack.size} label={`Buy ${pack.label.toLowerCase()}`} />
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-tiny text-fg-subtle pb-2">
        Looking for a bigger upgrade? Higher tiers come with a lower per-lead
        rate and bundled features — see{" "}
        <a href="/dashboard/settings/billing" className="text-brand hover:underline">
          Billing settings
        </a>
        .
      </p>
    </div>
  );
}
