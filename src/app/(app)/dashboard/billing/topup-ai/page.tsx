import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { fmt } from "@/lib/money";
import { BuyAiPackButton } from "./_components/buy-button";

export const dynamic = "force-dynamic";

/**
 * AI conversation credit top-up landing page. Three flat packs (small,
 * medium, large) priced uniformly across tiers, with bonus credit on the
 * medium and large packs per the spec.
 *
 *   Small  — R100 buys R100 credit  (~135 conversations)
 *   Medium — R250 buys R280 credit  (~378 conversations, 12% bonus)
 *   Large  — R500 buys R600 credit  (~810 conversations, 20% bonus)
 *
 * Each "Buy" button POSTs `/api/payfast/topup-ai` with the pack name and
 * redirects to the returned hosted-checkout URL.
 */

interface Pack {
  pack: "small" | "medium" | "large";
  label: string;
  priceZar: number;
  creditCents: number;
  approxConversations: number;
  bonusPct: number;
  highlight?: boolean;
}

const PACKS: Pack[] = [
  {
    pack: "small",
    label: "Small pack",
    priceZar: 100,
    creditCents: 10_000,
    approxConversations: 135,
    bonusPct: 0,
  },
  {
    pack: "medium",
    label: "Medium pack",
    priceZar: 250,
    creditCents: 28_000,
    approxConversations: 378,
    bonusPct: 12,
    highlight: true,
  },
  {
    pack: "large",
    label: "Large pack",
    priceZar: 500,
    creditCents: 60_000,
    approxConversations: 810,
    bonusPct: 20,
  },
];

export default async function TopupAiPage() {
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

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        eyebrow="Billing"
        title="Top up AI credit"
        description="Add conversation credit to your wallet. Credit never expires and is consumed only when your monthly grant runs out."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PACKS.map((p) => (
          <Card
            key={p.pack}
            className={p.highlight ? "border-brand/40 bg-brand/5" : undefined}
          >
            {p.highlight && (
              <span className="absolute top-4 right-4 text-tiny font-semibold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
                Popular
              </span>
            )}
            <CardHeader title={p.label} />
            <p className="text-display-2 font-display text-fg leading-none">
              {fmt(p.priceZar)}
            </p>
            <p className="text-small text-fg-muted mt-2">
              Credit added:{" "}
              <span className="text-fg font-medium">
                R{(p.creditCents / 100).toLocaleString("en-ZA")}
              </span>
            </p>
            {p.bonusPct > 0 && (
              <p className="text-tiny text-success mt-1">
                Includes {p.bonusPct}% bonus credit
              </p>
            )}
            <p className="text-tiny text-fg-muted mt-3 leading-relaxed">
              Approx. {p.approxConversations.toLocaleString()} extra
              conversations at planning wholesale.
            </p>
            <div className="mt-5">
              <BuyAiPackButton pack={p.pack} label={`Buy ${p.label.toLowerCase()}`} />
            </div>
          </Card>
        ))}
      </div>

      <p className="text-tiny text-fg-subtle pb-2">
        Conversation credit is shared across your assistant. Purchased credit
        never expires; granted credit resets each billing period. See{" "}
        <a href="/dashboard/usage" className="text-brand hover:underline">
          Usage & credits
        </a>{" "}
        for your current balance.
      </p>
    </div>
  );
}
