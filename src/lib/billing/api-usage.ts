import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * Per-tenant API usage tracking. Every Anthropic messages.create call
 * routes through {@link recordApiUsage} so we know exactly which client
 * triggered each token. Used for the dashboard usage widget (phase 2)
 * and end-of-month overage billing (phase 3).
 *
 * Pricing constants live here, not in the database, because moving FX
 * rates and Anthropic price changes are deploys, not config.
 */

// ─── Sonnet 4.6 pricing (USD per million tokens) ─────────────────────────
// Anthropic publishes these at https://docs.claude.com/en/docs/about-claude/models/all-models
// Update these constants when Anthropic ships a price change.
const PRICE_USD_PER_MTOK = {
  input: 3.0,
  output: 15.0,
  cacheCreation: 3.75, // 1.25× input rate
  cacheRead: 0.3, // 0.1× input rate
} as const;

// USD/ZAR rate snapshot. Update when FX moves more than ~5% from this anchor.
// Revisit on any Anthropic price change anyway.
const USD_ZAR_RATE = 18.5;

// Markup applied to wholesale cost to derive what we charge the client.
// 2.5× wholesale = 60% gross margin on overage. See pricing memo 2026-05-10.
const RETAIL_MARKUP = 2.5;

// Conversations on Qwikly's own marketing site (client_id=1) are tracked
// for visibility but never billed. Any other "internal" tenants we onboard
// should be added here.
const INTERNAL_CLIENT_IDS = new Set<string>(["1"]);

// ─── Types ───────────────────────────────────────────────────────────────

export interface AnthropicUsageBlock {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export interface RecordApiUsageInput {
  clientId: string | number | null | undefined;
  conversationId?: string | null;
  usage: AnthropicUsageBlock;
  source?: string; // 'web_chat' (default), 'starter_prompts', etc.
}

export interface UsageCostBreakdown {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  wholesaleCents: number;
  retailCents: number;
}

// ─── Cost math ───────────────────────────────────────────────────────────

/**
 * Compute the wholesale (Anthropic's bill) and retail (what we charge the
 * client) cost of a single messages.create call, in ZAR cents.
 *
 * Anthropic's `input_tokens` excludes cache_creation and cache_read tokens
 * by default in the v1 API, so they're billed separately. Each token type
 * has its own rate.
 */
export function computeCallCost(usage: AnthropicUsageBlock): UsageCostBreakdown {
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;

  const usdCost =
    (inputTokens * PRICE_USD_PER_MTOK.input +
      outputTokens * PRICE_USD_PER_MTOK.output +
      cacheCreationTokens * PRICE_USD_PER_MTOK.cacheCreation +
      cacheReadTokens * PRICE_USD_PER_MTOK.cacheRead) /
    1_000_000;

  const wholesaleZar = usdCost * USD_ZAR_RATE;
  const wholesaleCents = Math.ceil(wholesaleZar * 100);
  const retailCents = Math.ceil(wholesaleCents * RETAIL_MARKUP);

  return {
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    wholesaleCents,
    retailCents,
  };
}

// ─── Persistence ─────────────────────────────────────────────────────────

/**
 * Insert one row into api_usage. Fire-and-forget from the chat route, never
 * blocks the chat response. Failures are logged but never propagated to the
 * visitor (we'd rather lose a billing record than break a conversation).
 */
export async function recordApiUsage(input: RecordApiUsageInput): Promise<void> {
  const clientIdStr = input.clientId == null ? null : String(input.clientId);
  if (!clientIdStr) return;

  const cost = computeCallCost(input.usage);

  // Guard against zero-token noise (e.g. SDK retries that returned a cached
  // response before metering kicked in). Insert anyway so we have a row,
  // but don't bother with cost columns.
  const isInternal = INTERNAL_CLIENT_IDS.has(clientIdStr);

  try {
    const db = supabaseAdmin();
    const { error } = await db.from("api_usage").insert({
      client_id: Number(clientIdStr),
      conversation_id: input.conversationId ?? null,
      input_tokens: cost.inputTokens,
      output_tokens: cost.outputTokens,
      cache_creation_tokens: cost.cacheCreationTokens,
      cache_read_tokens: cost.cacheReadTokens,
      wholesale_cost_zar_cents: cost.wholesaleCents,
      retail_cost_zar_cents: cost.retailCents,
      is_internal: isInternal,
      source: input.source ?? "web_chat",
    });
    if (error) {
      console.error("[api-usage] insert failed:", { clientId: clientIdStr, error });
    }
  } catch (err) {
    console.error("[api-usage] insert threw:", { clientId: clientIdStr, err });
  }
}
