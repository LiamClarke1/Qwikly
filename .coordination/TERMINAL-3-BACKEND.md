# Terminal 3 — Backend Reliability & Build Hygiene

You are working in `~/qwikly-site/.worktrees/backend` on branch `fix/backend-reliability`.

**First command after starting Claude Code in this terminal:**
```
cd ~/qwikly-site/.worktrees/backend && pwd && git branch --show-current
```

**Confirm:** branch should say `fix/backend-reliability`. If not, STOP.

---

## Your scope

Build hygiene (TS/lint), database migrations + indexes, dashboard query perf,
error handling, observability. Audit findings #2, #9, #10, #11, #12, #13, #14,
#15, #17, #18 from supervisor.

## Files you own

- `next.config.mjs` (ONLY the `eslint` and `typescript` flags — Terminal 2 owns the headers block)
- `src/app/(app)/dashboard/**` (the dashboard pages and their data layer)
- `src/app/api/web/intake/route.ts` (zod validation only)
- `src/app/api/leads/route.ts` (Resend status surfacing only)
- `src/app/api/chat/route.ts` (ONLY the persistence retry — leave rate limiting to Terminal 2)
- `src/lib/log.ts` (create — structured logging helper)
- `src/app/global-error.tsx` (create)
- New migration files under `supabase/migrations/`
- Existing `migration-*.sql` files in repo root (you'll move these)

## Files you must NOT touch

- `public/embed.js` — Terminal 2
- `src/app/api/login/route.ts`, `src/app/api/webhooks/**`, `src/app/api/cron/**` — Terminal 2
- `src/app/(landing)/**` — Terminal 4
- `src/middleware.ts` — coordinate with supervisor

## Tasks (in order)

### T3.1 — Stop ignoring TS and lint at build
File: `next.config.mjs`. Remove (or set to false) `eslint.ignoreDuringBuilds` and
`typescript.ignoreBuildErrors`. After this, `npm run build` will fail. That's the
point — T3.2 fixes the failures.

### T3.2 — Fix the resulting errors
Run `npx tsc --noEmit` to see the full list. Supervisor saw 8 type errors and
~118 lint issues. Fix the type errors first (they're real bugs). Then fix the 2
lint errors (3 unescaped entities in JSX: setup/page.tsx:1373, leads/page.tsx:925,
pricing/page.tsx:602). For lint warnings (unused imports, mostly), run
`npx next lint --fix`.

The known runtime bug is at `src/app/(app)/dashboard/setup/page.tsx:156-157` —
Set iteration without downlevelIteration. Use `Array.from(dirtyFields).forEach(...)`.

### T3.3 — Dashboard N+1 fix
File: `src/app/(app)/dashboard/conversations/page.tsx:190-204`.
Currently fetches 100 conversations then fires 100 separate queries for last_message.
Replace with a single query. Two options:
- Postgres window function: `row_number() over (partition by conversation_id order by created_at desc)` then filter where rn=1.
- Or a Supabase RPC `get_conversations_with_last_message(account_id, limit, offset)` defined in a migration.

Pick the RPC approach — easier to keep stable and you can index for it.

### T3.4 — Missing index
Create `supabase/migrations/{YYYYMMDDHHMMSS}_idx_messages_conversation_id.sql`:
```sql
create index if not exists idx_messages_conversation_id
  on messages_log (conversation_id);
```
Also add a unique constraint on webhook idempotency since Terminal 2 left a TODO:
```sql
create unique index if not exists uq_webhook_provider_external
  on payment_webhook_events (provider, external_id);
```
(Confirm the actual table name — grep for it; if it's different, use the right name and
write the constraint accordingly.)

### T3.5 — Reorganise migrations
Move all `migration-*.sql` and `supabase-migration.sql` from the repo root into
`supabase/migrations/{YYYYMMDDHHMMSS}_{kebab-name}.sql`. Pick timestamps that
preserve current logical order. Use `git mv` so history is preserved.

DO NOT change the SQL inside them — just move and rename.

### T3.6 — Chat persistence retry
File: `src/app/api/chat/route.ts:308-376`. Currently catches DB errors and only logs.
Wrap the persist in a 3x retry with exponential backoff (200ms, 800ms, 2400ms).
If all 3 fail, log structured error AND write to a `chat_persist_dlq` table (define
in T3.4-adjacent migration) so you can replay later.

### T3.7 — Resend failure surfacing
File: `src/app/api/leads/route.ts:196-251`. The `email_status` column already exists.
Currently fire-and-forget. Change to: insert the lead, await the email send, set
`email_status` to 'sent' | 'failed' | 'pending'. Don't block the API response on
the email — use `waitUntil()` (Vercel) or a fire-and-forget that writes the status
back when it resolves/rejects.

### T3.8 — Zod on /api/web/intake
File: `src/app/api/web/intake/route.ts`. Define a zod schema for the body. Validate
that `client_id` is a string of expected shape. After parse, do a `select id from
clients where id = ? limit 1` to verify the client exists before inserting the
conversation. Return 404 if not.

### T3.9 — Magic client_id sentinel
Search for `client_id === "1"` and `client_id == "1"` across `src/`. Replace with
a check against `process.env.QWIKLY_OWNER_CLIENT_ID`. Add the env var to `.env.example`
(create if not present). Leave a comment in the code referencing the env var.

### T3.10 — Global error boundary
Create `src/app/global-error.tsx` matching the pattern of the existing
`src/app/(app)/error.tsx`, but for the root. Must declare `'use client'`,
import `Error` from React, render a minimal recovery UI with a "Reload" button.

### T3.11 — Structured logging
Create `src/lib/log.ts`:
```ts
type Level = 'info' | 'warn' | 'error';
export function log(level: Level, msg: string, data?: Record<string, unknown>) {
  console[level](JSON.stringify({ ts: new Date().toISOString(), level, msg, ...data }));
}
```
Then replace the 10 noisiest `console.error` sites in `src/app/api/` with `log('error', ...)`.
Pick the ones in the most-hit endpoints (chat, leads, conversations, webhooks).

---

## Definition of done per task
1. Task implemented in your worktree.
2. `npm run build` passes (after T3.1, this becomes a hard gate — keep it green going forward).
3. Update `.coordination/STATUS.md` — tick the box, add timestamp.
4. Commit with `backend: T3.X - <one line>`.

## When all tasks done
Update STATUS.md to `READY FOR REVIEW`. Do not push or PR. Wait for supervisor.

## If stuck
Add `**Blockers:**` to your STATUS.md section and stop.
