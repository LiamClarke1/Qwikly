import OpenAI from "openai";
import crypto from "crypto";

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

export async function embedTexts(texts: string[]): Promise<(number[] | null)[]> {
  const client = getOpenAI();
  if (!client) return texts.map(() => null);

  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });

  return response.data.map((d) => d.embedding);
}

export async function embedQuery(text: string): Promise<number[] | null> {
  const results = await embedTexts([text]);
  return results[0];
}

export function hashContent(text: string): string {
  return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}

export function chunkText(text: string): string[] {
  const MAX = 800;
  const MIN = 40;

  // Split on paragraph breaks first
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length >= MIN);

  const chunks: string[] = [];
  for (const para of paragraphs) {
    if (para.length <= MAX) {
      chunks.push(para);
      continue;
    }
    // Split long paragraphs at sentence boundaries
    const sentences = para.match(/[^.!?]+[.!?]+/g) ?? [para];
    let current = "";
    for (const sent of sentences) {
      if ((current + sent).length > MAX && current.length >= MIN) {
        chunks.push(current.trim());
        current = sent;
      } else {
        current += " " + sent;
      }
    }
    if (current.trim().length >= MIN) chunks.push(current.trim());
  }

  return chunks;
}
