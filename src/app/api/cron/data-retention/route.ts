import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STORAGE_BUCKET = "conversation-documents";
const CONVERSATION_RETENTION_DAYS = 24 * 30; // 24 months
const DOCUMENT_RETENTION_DAYS = 12 * 30; // 12 months
const DOC_BATCH = 200;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// Vercel Cron triggers this daily. POPIA compliance: enforce the retention
// periods stated in the privacy policy by hard-deleting data past its window.
// Soft-deleted (deleted_at IS NOT NULL) rows are also swept on this pass so
// dashboard "Delete this lead" actions and /privacy/delete-my-data confirmations
// remove data permanently within at most 24 hours.
async function run(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const legacyHeader = req.headers.get("x-cron-secret");
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    (authHeader !== `Bearer ${secret}` && legacyHeader !== secret)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const now = new Date().toISOString();

  const conversationCutoff = daysAgo(CONVERSATION_RETENTION_DAYS);
  const documentCutoff = daysAgo(DOCUMENT_RETENTION_DAYS);

  const result = {
    conversations_deleted: 0,
    messages_deleted: 0,
    documents_deleted: 0,
    storage_objects_deleted: 0,
    errors: [] as string[],
  };

  // 1) Documents past their retention window OR soft-deleted: remove storage
  //    objects first (so we don't leave orphans), then delete the rows.
  try {
    const { data: oldDocs, error: docFetchErr } = await db
      .from("conversation_documents")
      .select("id, storage_path, deleted_at, created_at")
      .or(`created_at.lt.${documentCutoff},deleted_at.not.is.null`)
      .limit(DOC_BATCH * 5);

    if (docFetchErr) {
      result.errors.push(`document fetch: ${docFetchErr.message}`);
    } else if (oldDocs && oldDocs.length > 0) {
      const paths = oldDocs.map((d) => d.storage_path).filter(Boolean) as string[];

      for (let i = 0; i < paths.length; i += DOC_BATCH) {
        const batch = paths.slice(i, i + DOC_BATCH);
        const { data: removed, error: rmErr } = await db.storage
          .from(STORAGE_BUCKET)
          .remove(batch);
        if (rmErr) {
          result.errors.push(`storage remove batch ${i}: ${rmErr.message}`);
        } else {
          result.storage_objects_deleted += removed?.length ?? 0;
        }
      }

      const ids = oldDocs.map((d) => d.id);
      const { data: deletedRows, error: docDelErr } = await db
        .from("conversation_documents")
        .delete()
        .in("id", ids)
        .select("id");
      if (docDelErr) {
        result.errors.push(`document delete: ${docDelErr.message}`);
      } else {
        result.documents_deleted = deletedRows?.length ?? 0;
      }
    }
  } catch (err) {
    result.errors.push(`documents: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2) Conversations past retention OR soft-deleted: delete the conversation
  //    row. The messages_log foreign key has ON DELETE CASCADE in the schema,
  //    so messages are removed automatically, but we explicitly count them so
  //    we can report back to the run log.
  try {
    const { data: oldConvs, error: convFetchErr } = await db
      .from("conversations")
      .select("id")
      .or(`created_at.lt.${conversationCutoff},deleted_at.not.is.null`);

    if (convFetchErr) {
      result.errors.push(`conversation fetch: ${convFetchErr.message}`);
    } else if (oldConvs && oldConvs.length > 0) {
      const convIds = oldConvs.map((c) => c.id);

      // Count messages first so we can report what we removed.
      const { count: msgCount } = await db
        .from("messages_log")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convIds);
      result.messages_deleted = msgCount ?? 0;

      // Delete messages explicitly in case ON DELETE CASCADE is missing on
      // some environments — this is a no-op if the cascade already fired.
      const { error: msgDelErr } = await db
        .from("messages_log")
        .delete()
        .in("conversation_id", convIds);
      if (msgDelErr) {
        result.errors.push(`messages delete: ${msgDelErr.message}`);
      }

      const { data: deletedConvs, error: convDelErr } = await db
        .from("conversations")
        .delete()
        .in("id", convIds)
        .select("id");
      if (convDelErr) {
        result.errors.push(`conversation delete: ${convDelErr.message}`);
      } else {
        result.conversations_deleted = deletedConvs?.length ?? 0;
      }
    }
  } catch (err) {
    result.errors.push(`conversations: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`[data-retention] ${now}`, JSON.stringify(result));

  return NextResponse.json({
    ok: result.errors.length === 0,
    ranAt: now,
    ...result,
  });
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
