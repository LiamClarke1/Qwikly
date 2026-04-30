import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { chunkText, embedTexts, hashContent } from "@/lib/knowledge/embed";
import { crawlUrl } from "@/lib/knowledge/crawl";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require("mammoth");

export const runtime = "nodejs";
export const maxDuration = 60;

async function getUser() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function extractTextFromFile(base64: string, mimeType: string): Promise<string> {
  const buffer = Buffer.from(base64, "base64");

  if (mimeType === "application/pdf" || mimeType === "pdf") {
    const result = await pdfParse(buffer);
    return result.text ?? "";
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "docx"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }

  // Plain text
  return buffer.toString("utf-8");
}

async function ingestChunks(
  tenantId: string,
  sourceId: string,
  text: string,
  meta: Record<string, string>
): Promise<number> {
  const db = supabaseAdmin();
  const chunks = chunkText(text);
  if (chunks.length === 0) return 0;

  // Deduplicate: check which hashes already exist
  const hashes = chunks.map(hashContent);
  const { data: existing } = await db
    .from("knowledge_chunks")
    .select("content_hash")
    .eq("tenant_id", tenantId)
    .in("content_hash", hashes);

  const existingSet = new Set((existing ?? []).map((r) => r.content_hash));
  const newChunks = chunks.filter((_, i) => !existingSet.has(hashes[i]));
  const newHashes = hashes.filter((h) => !existingSet.has(h));

  if (newChunks.length === 0) return 0;

  // Embed new chunks
  const embeddings = await embedTexts(newChunks);

  const rows = newChunks.map((content, i) => ({
    tenant_id: tenantId,
    source_id: sourceId,
    content,
    content_hash: newHashes[i],
    embedding: embeddings[i] ? `[${embeddings[i]!.join(",")}]` : null,
    metadata: { ...meta, tenantId, sourceId },
  }));

  const { error } = await db.from("knowledge_chunks").insert(rows);
  if (error) throw error;

  return newChunks.length;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  let body: {
    type: "paste" | "file" | "url" | "qa";
    content?: string;
    fileBase64?: string;
    fileType?: string;
    filename?: string;
    url?: string;
    qa?: Array<{ question: string; answer: string }>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type } = body;
  if (!["paste", "file", "url", "qa"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  // Create source record
  const { data: source, error: srcErr } = await db
    .from("knowledge_sources")
    .insert({
      tenant_id: user.id,
      type,
      original_filename: body.filename ?? null,
      source_url: body.url ?? null,
      status: "processing",
    })
    .select()
    .single();

  if (srcErr || !source) {
    return NextResponse.json({ error: "Failed to create source" }, { status: 500 });
  }

  const meta: Record<string, string> = {
    type,
    tenantId: user.id,
    sourceId: source.id,
    originalFilename: body.filename ?? "",
    createdAt: new Date().toISOString(),
  };

  try {
    let text = "";
    let storagePath: string | undefined;

    if (type === "paste") {
      if (!body.content?.trim()) throw new Error("No content provided");
      text = body.content;
    } else if (type === "file") {
      if (!body.fileBase64) throw new Error("No file provided");

      // Upload raw file to Supabase Storage
      const ext = body.filename?.split(".").pop() ?? "bin";
      storagePath = `${user.id}/${source.id}/${body.filename ?? `file.${ext}`}`;
      const fileBuffer = Buffer.from(body.fileBase64, "base64");

      const { error: uploadErr } = await db.storage
        .from("knowledge-files")
        .upload(storagePath, fileBuffer, {
          contentType: body.fileType ?? "application/octet-stream",
          upsert: true,
        });
      if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

      text = await extractTextFromFile(body.fileBase64, body.fileType ?? "txt");
      meta.originalFilename = body.filename ?? "";
      meta.storagePath = storagePath;
    } else if (type === "url") {
      if (!body.url) throw new Error("No URL provided");
      text = await crawlUrl(body.url);
      meta.sourceUrl = body.url;
    } else if (type === "qa") {
      if (!body.qa?.length) throw new Error("No Q&A pairs provided");
      text = body.qa
        .map((p) => `Q: ${p.question.trim()}\nA: ${p.answer.trim()}`)
        .join("\n\n");
    }

    const chunkCount = await ingestChunks(user.id, source.id, text, meta);

    await db
      .from("knowledge_sources")
      .update({ status: "done", chunk_count: chunkCount, storage_path: storagePath ?? null, updated_at: new Date().toISOString() })
      .eq("id", source.id);

    return NextResponse.json({ sourceId: source.id, chunkCount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await db
      .from("knowledge_sources")
      .update({ status: "error", error_message: msg, updated_at: new Date().toISOString() })
      .eq("id", source.id);

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE a source and its chunks
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sourceId = searchParams.get("sourceId");
  if (!sourceId) return NextResponse.json({ error: "sourceId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("knowledge_sources")
    .delete()
    .eq("id", sourceId)
    .eq("tenant_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// GET all sources for the current tenant
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("knowledge_sources")
    .select("id, type, original_filename, source_url, status, chunk_count, created_at")
    .eq("tenant_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sources: data ?? [] });
}
