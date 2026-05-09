import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase-server";

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_WORDS = 5;
const MIN_WORDS = 2;
const MAX_CHARS = 40;
const BANNED_WORDS = ["ai", "bot", "assistant"];

export type StarterPromptsResult =
  | { ok: true; prompts: string[] }
  | { ok: false; reason: "client_not_found" | "no_kb" | "generation_failed" };

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

function validate(prompts: unknown): string[] | null {
  if (!Array.isArray(prompts)) return null;
  if (prompts.length !== 4) return null;
  const cleaned: string[] = [];
  for (const raw of prompts) {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.length > MAX_CHARS) return null;
    const words = trimmed.split(/\s+/);
    if (words.length < MIN_WORDS || words.length > MAX_WORDS) return null;
    const lower = trimmed.toLowerCase();
    if (BANNED_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(lower))) return null;
    cleaned.push(trimmed);
  }
  return cleaned;
}

function buildPrompt(businessName: string, businessType: string, kbDigest: string): string {
  return [
    `Generate exactly 4 very short questions a first-time visitor to ${businessName} (${businessType}) would naturally ask.`,
    `Each question MUST be between ${MIN_WORDS} and ${MAX_WORDS} words.`,
    "Cover four angles in this order:",
    "1. Pricing or cost",
    "2. How the service works",
    "3. Fit or availability for the visitor",
    "4. A direct call-to-action (book / quote / start)",
    "",
    'Use the visitor\'s voice. Plain words only. Avoid jargon. Avoid the words "AI", "bot", "assistant".',
    "Output a JSON array of exactly 4 strings, nothing else. No prose, no code fences.",
    "",
    'Examples for a pool-cleaning service: ["What do you charge?", "How often?", "Do you supply chemicals?", "Get a quote"]',
    "",
    "Knowledge base summary (use to make questions specific to this business):",
    kbDigest || "(no KB content available, infer from business type)",
  ].join("\n");
}

async function generateFromAnthropic(
  businessName: string,
  businessType: string,
  kbDigest: string,
  retry: boolean
): Promise<string[] | null> {
  const userPrompt = retry
    ? buildPrompt(businessName, businessType, kbDigest) +
      "\n\nIMPORTANT: each question must be at most 5 words and at least 2 words. Return exactly 4 questions."
    : buildPrompt(businessName, businessType, kbDigest);

  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: userPrompt }],
    });
    const block = res.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") return null;
    const text = block.text.trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return null;
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return validate(parsed);
  } catch (err) {
    console.error("[starter-prompts] anthropic call failed:", err);
    return null;
  }
}

async function loadKbDigest(clientId: number, authUserId: string | null): Promise<string> {
  const db = supabaseAdmin();
  const parts: string[] = [];

  const { data: articles } = await db
    .from("kb_articles")
    .select("title")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .limit(20);
  if (articles && articles.length > 0) {
    parts.push("Common Q&A topics: " + articles.map((a: { title: string }) => a.title).join("; "));
  }

  if (authUserId) {
    const { data: chunks } = await db
      .from("knowledge_chunks")
      .select("content")
      .eq("tenant_id", authUserId)
      .limit(8);
    if (chunks && chunks.length > 0) {
      const joined = (chunks as { content: string }[])
        .map((c) => c.content.slice(0, 300))
        .join("\n---\n");
      parts.push("Website / KB excerpts:\n" + joined);
    }
  }

  // Fall back to setup-scraped fields from the clients table so that
  // accounts that went through the 7-step wizard (but haven't uploaded
  // files) still get meaningful starter prompts.
  if (parts.length === 0) {
    const { data: clientRow } = await db
      .from("clients")
      .select("services_offered, common_questions, unique_selling_point")
      .eq("id", clientId)
      .maybeSingle();
    const c = clientRow as {
      services_offered?: string | null;
      common_questions?: string | null;
      unique_selling_point?: string | null;
    } | null;
    if (c?.services_offered?.trim()) parts.push("Services: " + c.services_offered.trim().slice(0, 500));
    if (c?.common_questions?.trim()) parts.push("Common questions: " + c.common_questions.trim().slice(0, 800));
    if (c?.unique_selling_point?.trim()) parts.push("What makes them different: " + c.unique_selling_point.trim().slice(0, 300));
  }

  return parts.join("\n\n").slice(0, 4000);
}

export async function getOrGenerateStarterPrompts(
  publicKey: string
): Promise<StarterPromptsResult> {
  const db = supabaseAdmin();

  const { data: client, error: clientErr } = await db
    .from("clients")
    .select("id, auth_user_id")
    .eq("public_key", publicKey)
    .maybeSingle();

  if (clientErr || !client) {
    return { ok: false, reason: "client_not_found" };
  }

  const clientId = (client as { id: number }).id;
  const authUserId = (client as { auth_user_id: string | null }).auth_user_id;

  const { data: cacheRow } = await db
    .from("clients")
    .select("starter_prompts_json, starter_prompts_generated_at")
    .eq("id", clientId)
    .maybeSingle();
  const cached = (cacheRow as { starter_prompts_json?: unknown } | null)?.starter_prompts_json;
  const cachedAt = (cacheRow as { starter_prompts_generated_at?: string | null } | null)
    ?.starter_prompts_generated_at;
  if (cached && cachedAt) {
    const age = Date.now() - new Date(cachedAt).getTime();
    if (age < CACHE_TTL_MS) {
      const validated = validate(cached);
      if (validated) return { ok: true, prompts: validated };
    }
  }

  let businessName = "this business";
  let businessType = "service";
  if (authUserId) {
    const { data: business } = await db
      .from("businesses")
      .select("name, business_type")
      .eq("user_id", authUserId)
      .maybeSingle();
    const b = business as { name?: string | null; business_type?: string | null } | null;
    if (b?.name && b.name.trim()) businessName = b.name.trim();
    if (b?.business_type && b.business_type.trim()) businessType = b.business_type.trim();
  }
  // Fall back to clients table (populated during 7-step setup wizard)
  if (businessName === "this business") {
    const { data: clientMeta } = await db
      .from("clients")
      .select("business_name, trade")
      .eq("id", clientId)
      .maybeSingle();
    const cm = clientMeta as { business_name?: string | null; trade?: string | null } | null;
    if (cm?.business_name?.trim()) businessName = cm.business_name.trim();
    if (cm?.trade?.trim()) businessType = cm.trade.trim();
  }

  const kbDigest = await loadKbDigest(clientId, authUserId);
  if (!kbDigest && businessType === "service" && businessName === "this business") {
    return { ok: false, reason: "no_kb" };
  }

  let prompts = await generateFromAnthropic(businessName, businessType, kbDigest, false);
  if (!prompts) {
    prompts = await generateFromAnthropic(businessName, businessType, kbDigest, true);
  }
  if (!prompts) {
    return { ok: false, reason: "generation_failed" };
  }

  try {
    await db
      .from("clients")
      .update({
        starter_prompts_json: prompts,
        starter_prompts_generated_at: new Date().toISOString(),
      })
      .eq("id", clientId);
  } catch (err) {
    console.warn("[starter-prompts] cache write failed (likely missing migration):", err);
  }

  return { ok: true, prompts };
}
