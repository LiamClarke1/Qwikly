import { SupabaseClient } from "@supabase/supabase-js";

// OpenAI embeddings removed — KB search now uses Supabase full-text search.
// No external embedding API required.

export async function ensureKbEmbeddings(
  _supabaseAdmin: SupabaseClient,
  _clientId: number
): Promise<void> {
  // No-op: embeddings are no longer used for KB search.
}

// Kept for backwards compatibility with the knowledge_chunks path in chat/route.ts.
// Returns an empty array so the caller gracefully falls back to zero chunks.
export async function embedText(_text: string): Promise<number[]> {
  return [];
}

export async function searchKb(
  supabaseAdmin: SupabaseClient,
  clientId: number,
  query: string,
  limit = 5
): Promise<{ id: number; title: string; body: string; similarity: number }[]> {
  // Extract meaningful keywords (3+ chars, skip stop words)
  const stopWords = new Set(["the", "and", "for", "with", "that", "this", "are", "you", "have", "what", "how", "can", "our", "your"]);
  const keywords = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w))
    .slice(0, 6);

  if (keywords.length === 0) {
    // Fall back to returning the first N active articles so Claude always has some context
    const { data } = await supabaseAdmin
      .from("kb_articles")
      .select("id, title, body")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .limit(limit);
    return (data ?? []).map((a) => ({ ...a, similarity: 0.5 }));
  }

  // Full-text search: OR across all keywords against title + body
  const searchTerm = keywords.join(" | ");
  const { data, error } = await supabaseAdmin
    .from("kb_articles")
    .select("id, title, body")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .or(keywords.map((k) => `title.ilike.%${k}%,body.ilike.%${k}%`).join(","))
    .limit(limit);

  if (error) {
    console.error("[searchKb] full-text search error:", error.message);
    return [];
  }

  // Score each result by how many keywords it matches
  const scored = (data ?? []).map((article) => {
    const text = `${article.title} ${article.body}`.toLowerCase();
    const hits = keywords.filter((k) => text.includes(k)).length;
    return { ...article, similarity: hits / keywords.length };
  });

  return scored.sort((a, b) => b.similarity - a.similarity);

  void searchTerm; // suppress unused warning
}
