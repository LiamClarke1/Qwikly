import OpenAI from "openai";
import { SupabaseClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.replace(/\n/g, " ").slice(0, 8000),
  });
  return res.data[0].embedding;
}

export async function ensureKbEmbeddings(
  supabaseAdmin: SupabaseClient,
  clientId: number
): Promise<void> {
  const { data: unembedded } = await supabaseAdmin
    .from("kb_articles")
    .select("id, title, body")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .is("embedding", null)
    .limit(30);

  if (!unembedded || unembedded.length === 0) return;

  for (const article of unembedded) {
    try {
      const embedding = await embedText(`${article.title}\n${article.body}`);
      await supabaseAdmin
        .from("kb_articles")
        .update({ embedding })
        .eq("id", article.id);
    } catch (err) {
      console.error("Failed to embed kb_article", article.id, err);
    }
  }
}

export async function searchKb(
  supabaseAdmin: SupabaseClient,
  clientId: number,
  query: string,
  limit = 5
): Promise<{ id: number; title: string; body: string; similarity: number }[]> {
  const embedding = await embedText(query);
  const { data, error } = await supabaseAdmin.rpc("match_kb_articles", {
    query_embedding: embedding,
    match_client_id: clientId,
    match_count: limit,
  });
  if (error) throw error;
  return data ?? [];
}
