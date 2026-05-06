# Kill Flow A, Upgrade Flow B — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/dashboard/setup` the canonical onboarding flow for every signup, add an Install + Test step at the end, delete the thin `/onboarding/website` flow entirely, and route every link/redirect to the new path.

**Architecture:** No new tables for profile data, the rich `clients` columns and the `/api/auto-fill` route already exist. We add one `profile_feedback` table for the test-simulator's flag mechanism, one `/api/onboarding/test-message` endpoint, one new wizard step, and rewire all entry points. Components shared between the deleted flow and live code (`WidgetPreview`) move to a neutral location first.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + RLS), Anthropic SDK, Tailwind, Lucide icons.

**Verification approach:** This codebase has no unit test framework. Each task ends with `npm run lint && npm run build` from the project root. Manual smoke tests are run from the dev server (`npm run dev`) at the end of each phase.

---

## File map

**New:**
- `src/components/widget-preview.tsx` (moved from old onboarding flow)
- `supabase/migrations/20260506_profile_feedback.sql`
- `src/app/api/onboarding/test-message/route.ts`
- One new step component embedded inside `src/app/(app)/dashboard/setup/page.tsx`

**Modified:**
- `src/app/(app)/signup/page.tsx` (redirect target)
- `src/app/auth/callback/route.ts` (redirect target)
- `src/app/(app)/dashboard/settings/_components/WebsiteAssistantTab.tsx` (link targets + import path)
- `src/app/(app)/dashboard/setup/page.tsx` (add Step 7, raise Step type to 7, update STEPS array, update done view to point to test step)

**Deleted:**
- `src/app/(app)/onboarding/` (the entire directory tree, including `website/`, `_components/`, `actions.ts`, `page.tsx`, layout.tsx if present)

---

## Task 1: Move WidgetPreview out of the doomed directory

`WidgetPreview` is imported by `WebsiteAssistantTab` (which we keep) and by 3 components in the doomed `/onboarding/website/` tree (which we delete). Move it first so the delete is clean.

**Files:**
- Create: `src/components/widget-preview.tsx`
- Modify: `src/app/(app)/dashboard/settings/_components/WebsiteAssistantTab.tsx:13`

- [ ] **Step 1: Read the current WidgetPreview to capture exact contents**

Run: `cat src/app/\(app\)/onboarding/website/_components/WidgetPreview.tsx`

- [ ] **Step 2: Create the new file**

Create `src/components/widget-preview.tsx` with the exact contents of the old file, no behavioural changes. The file already has `"use client";` if needed.

- [ ] **Step 3: Update the one live import**

In `src/app/(app)/dashboard/settings/_components/WebsiteAssistantTab.tsx:13`, change:

```ts
import { WidgetPreview } from "@/app/(app)/onboarding/website/_components/WidgetPreview";
```

to:

```ts
import { WidgetPreview } from "@/components/widget-preview";
```

- [ ] **Step 4: Verify build passes**

Run: `npm run lint && npm run build`
Expected: clean build, no missing import errors. Old file is still in place so old flow still compiles.

- [ ] **Step 5: Commit**

```bash
git add src/components/widget-preview.tsx src/app/\(app\)/dashboard/settings/_components/WebsiteAssistantTab.tsx
git commit -m "Move WidgetPreview to src/components, prep for Flow A removal"
```

---

## Task 2: Add `profile_feedback` table

Captures user flags from the upcoming test-simulator step (e.g. "Qwikly missed this question"). Lands now so Step 7 in Task 6 can write to it.

**Files:**
- Create: `supabase/migrations/20260506_profile_feedback.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Migration: 20260506_profile_feedback.sql
-- Captures owner feedback from the onboarding test simulator and from
-- live conversations (Phase 3). Allows the system to learn what Qwikly
-- missed or asked unnecessarily.

CREATE TABLE IF NOT EXISTS profile_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  conversation_id UUID,
  type TEXT NOT NULL CHECK (type IN ('missed', 'overasked', 'wrong_tone', 'other')),
  note TEXT,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profile_feedback_client_id_idx ON profile_feedback (client_id);

ALTER TABLE profile_feedback ENABLE ROW LEVEL SECURITY;

-- Owners can read their own feedback rows
CREATE POLICY profile_feedback_select_own ON profile_feedback
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- Owners can insert feedback for their own client
CREATE POLICY profile_feedback_insert_own ON profile_feedback
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- Service role bypasses RLS implicitly (no policy needed)
```

- [ ] **Step 2: Apply migration to local/Supabase**

Liam runs this manually in the Supabase SQL editor (per existing project convention, see other migration filenames). The plan does NOT auto-apply.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260506_profile_feedback.sql
git commit -m "Add profile_feedback table for onboarding test simulator + Phase 3 learning"
```

---

## Task 3: Redirect signup to `/dashboard/setup`

**Files:**
- Modify: `src/app/(app)/signup/page.tsx:259`

- [ ] **Step 1: Update redirect target**

In `src/app/(app)/signup/page.tsx:259`, change:

```ts
router.push(`/onboarding/website?plan=${plan}`);
```

to:

```ts
router.push(`/dashboard/setup?plan=${plan}`);
```

- [ ] **Step 2: Verify build**

Run: `npm run lint && npm run build`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/signup/page.tsx
git commit -m "Signup: redirect new accounts to /dashboard/setup"
```

---

## Task 4: Redirect auth callback to `/dashboard/setup`

When users click their email confirmation link, the auth callback decides where they land based on whether onboarding is complete.

**Files:**
- Modify: `src/app/auth/callback/route.ts:88-90`

- [ ] **Step 1: Update redirect block**

In `src/app/auth/callback/route.ts`, replace lines 87-92:

```ts
      if (!client || !client.onboarding_completed_at) {
        const onboardingPath = plan
          ? `/onboarding/website?plan=${plan}`
          : "/onboarding/website";
        return NextResponse.redirect(new URL(onboardingPath, requestUrl.origin));
      }
```

with:

```ts
      if (!client || !client.onboarding_completed_at) {
        const onboardingPath = plan
          ? `/dashboard/setup?plan=${plan}`
          : "/dashboard/setup";
        return NextResponse.redirect(new URL(onboardingPath, requestUrl.origin));
      }
```

- [ ] **Step 2: Verify build**

Run: `npm run lint && npm run build`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "Auth callback: redirect new users to /dashboard/setup"
```

---

## Task 5: Update WebsiteAssistantTab links

Two links currently open `/onboarding/website` from the settings tab. Both must point to `/dashboard/setup`.

**Files:**
- Modify: `src/app/(app)/dashboard/settings/_components/WebsiteAssistantTab.tsx:133`
- Modify: `src/app/(app)/dashboard/settings/_components/WebsiteAssistantTab.tsx:252`

- [ ] **Step 1: Update line 133**

Change:

```tsx
onClick={() => window.open("/onboarding/website", "_blank")}
```

to:

```tsx
onClick={() => window.open("/dashboard/setup", "_blank")}
```

- [ ] **Step 2: Update line 252**

Change:

```tsx
<a href="/onboarding/website" className="text-brand hover:underline cursor-pointer">
```

to:

```tsx
<a href="/dashboard/setup" className="text-brand hover:underline cursor-pointer">
```

- [ ] **Step 3: Verify build**

Run: `npm run lint && npm run build`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/dashboard/settings/_components/WebsiteAssistantTab.tsx
git commit -m "WebsiteAssistantTab: point setup links to /dashboard/setup"
```

---

## Task 6: Add Step 7 (Install + Test) to `/dashboard/setup`

The biggest task. Existing 6 steps stay as-is. New Step 7 has two halves:

**6a: Install panel** — embed snippet (reuse logic from old `StepInstall.tsx` before deletion), with a polled "widget detected" status using the existing `web_widget_status` and `web_widget_last_seen_at` columns.

**6b: Test simulator** — a chat input that calls `/api/onboarding/test-message` (built in Task 7), shows Qwikly's reply, and after each turn surfaces three flag buttons: "Qwikly missed this", "Qwikly overasked", "Wrong tone". Flags POST to a small server action that inserts into `profile_feedback`.

**Files:**
- Modify: `src/app/(app)/dashboard/setup/page.tsx` extensively

- [ ] **Step 1: Read the current Step type and STEPS array to know exact line numbers**

Run: `grep -n "type Step\|const STEPS\|step === 6\|setStep" src/app/\(app\)/dashboard/setup/page.tsx | head -30`

- [ ] **Step 2: Widen the Step type**

Find: `type Step = 1 | 2 | 3 | 4 | 5 | 6;` (around line 87)
Replace with: `type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;`

- [ ] **Step 3: Add Step 7 to STEPS array**

Find the `STEPS` constant (around line 49). Append:

```ts
  { title: "Install & Test", subtitle: "See it work, then go live", icon: Zap },
```

(Use the `Zap` icon already imported at line 12, or import a more fitting one if preferred — `Rocket` from lucide-react is already commonly used in this codebase.)

- [ ] **Step 4: Update the step 6 "Save & continue" handler so it advances to 7 instead of completing onboarding**

Find the existing button on Step 6's "Continue" handler (search for `step === 6` and the save logic). Currently it likely calls `saveAndComplete()`. Change to call `saveAndAdvance()` which only saves form data and increments to step 7.

If a `saveAndComplete` already exists, split it: rename current to `saveCurrentForm`, leave the actual `onboarding_complete = true` flip for the new Step 7 button.

- [ ] **Step 5: Render Step 7 UI**

In the wizard `view === "wizard"` JSX block, add a `step === 7` branch. Use this exact JSX:

```tsx
{step === 7 && (
  <Step7InstallTest
    client={client}
    form={form}
    onComplete={async () => {
      // mark onboarding complete
      await supabase
        .from("clients")
        .update({
          onboarding_complete: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("auth_user_id", client.auth_user_id);
      router.push("/dashboard?welcome=true");
    }}
    onBack={back}
  />
)}
```

- [ ] **Step 6: Define the `Step7InstallTest` component**

Add this component definition above `export default function SetupPage()`:

```tsx
function Step7InstallTest({
  client,
  form,
  onComplete,
  onBack,
}: {
  client: ClientRow;
  form: FormData;
  onComplete: () => Promise<void>;
  onBack: () => void;
}) {
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [widgetVerified, setWidgetVerified] = useState(
    client.web_widget_status === "verified"
  );
  const [conversation, setConversation] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Poll for widget detection every 5 seconds
  useEffect(() => {
    if (widgetVerified) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("clients")
        .select("web_widget_status")
        .eq("id", client.id)
        .maybeSingle();
      if (data?.web_widget_status === "verified") {
        setWidgetVerified(true);
        clearInterval(interval);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [client.id, widgetVerified]);

  const snippet = `<script src="https://embed.qwikly.co.za/v1/widget.js" data-key="${client.public_key ?? ""}"></script>`;

  const copySnippet = async () => {
    await navigator.clipboard.writeText(snippet);
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 2000);
  };

  const sendTestMessage = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput("");
    setConversation((c) => [...c, { role: "user", text: userMsg }]);
    setSending(true);
    try {
      const res = await fetch("/api/onboarding/test-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: conversation,
          form, // pass the in-memory form so the test uses what they just configured, not the saved version
        }),
      });
      const data = await res.json();
      const reply = data.reply ?? "Sorry, the test failed. Try again.";
      setConversation((c) => [...c, { role: "assistant", text: reply }]);
    } catch {
      setConversation((c) => [
        ...c,
        { role: "assistant", text: "Test message failed. Check your connection and try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const flag = async (
    type: "missed" | "overasked" | "wrong_tone",
    note: string
  ) => {
    await supabase.from("profile_feedback").insert({
      client_id: client.id,
      type,
      note,
    });
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-h1 text-fg mb-2">Install & test your assistant</h2>
        <p className="text-fg-muted">
          Paste the snippet on your website, then send a test message to make sure Qwikly is asking the right things for your business.
        </p>
      </div>

      {/* Install panel */}
      <div className="rounded-2xl border border-line bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-h3 text-fg">1. Install on your site</h3>
          {widgetVerified ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-success/10 text-success text-tiny font-semibold">
              <Check className="w-3 h-3" /> Widget detected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-warning/10 text-warning text-tiny font-semibold">
              <Loader2 className="w-3 h-3 animate-spin" /> Waiting for widget…
            </span>
          )}
        </div>
        <div className="bg-ink-900 rounded-xl p-4 font-mono text-tiny text-fg overflow-x-auto">
          {snippet}
        </div>
        <button
          onClick={copySnippet}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white font-semibold text-small hover:bg-brand-hover transition-colors cursor-pointer"
        >
          {snippetCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {snippetCopied ? "Copied" : "Copy snippet"}
        </button>
      </div>

      {/* Test simulator */}
      <div className="rounded-2xl border border-line bg-white/[0.02] p-6 space-y-4">
        <h3 className="text-h3 text-fg">2. Send a test message</h3>
        <p className="text-small text-fg-muted">
          Type as a visitor would. Qwikly responds using everything you just set up.
        </p>

        <div className="bg-ink-900 rounded-xl p-4 min-h-[200px] max-h-[400px] overflow-y-auto space-y-3">
          {conversation.length === 0 && (
            <p className="text-fg-faint text-small italic">
              Try something like: "Hi, do you do emergency callouts?" or "How much for a basic service?"
            </p>
          )}
          {conversation.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-small max-w-[80%]",
                  m.role === "user"
                    ? "bg-brand text-white"
                    : "bg-white/[0.06] text-fg border border-line"
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="px-4 py-2.5 rounded-2xl bg-white/[0.06] border border-line">
                <Loader2 className="w-4 h-4 animate-spin text-fg-muted" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendTestMessage()}
            placeholder="Type a message…"
            className="flex-1 bg-white/[0.03] border border-line rounded-xl px-4 py-3 text-fg text-small placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand/60"
          />
          <button
            onClick={sendTestMessage}
            disabled={sending || !input.trim()}
            className="px-5 py-3 rounded-xl bg-brand text-white font-semibold text-small hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Send
          </button>
        </div>

        {conversation.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-line/50">
            <span className="text-tiny text-fg-muted self-center mr-1">Flag the last reply:</span>
            <button
              type="button"
              onClick={() => flag("missed", `In test conversation: ${conversation.slice(-2).map((m) => m.text).join(" / ")}`)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-line text-tiny text-fg-muted hover:text-fg hover:border-line-strong cursor-pointer"
            >
              Missed something
            </button>
            <button
              type="button"
              onClick={() => flag("overasked", `In test conversation: ${conversation.slice(-2).map((m) => m.text).join(" / ")}`)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-line text-tiny text-fg-muted hover:text-fg hover:border-line-strong cursor-pointer"
            >
              Asked too much
            </button>
            <button
              type="button"
              onClick={() => flag("wrong_tone", `In test conversation: ${conversation.slice(-2).map((m) => m.text).join(" / ")}`)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-line text-tiny text-fg-muted hover:text-fg hover:border-line-strong cursor-pointer"
            >
              Wrong tone
            </button>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="px-5 py-3 rounded-xl border border-line text-fg-muted hover:text-fg hover:border-line-strong cursor-pointer"
        >
          ← Back
        </button>
        <button
          onClick={onComplete}
          className="px-6 py-3 rounded-xl bg-brand text-white font-semibold hover:bg-brand-hover cursor-pointer inline-flex items-center gap-2"
        >
          Looks great, go live <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify build passes**

Run: `npm run lint && npm run build`
Expected: pass. If `cn`, `Copy`, `Check`, `ArrowRight`, `Loader2`, `useEffect` are missing imports, add them.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(app\)/dashboard/setup/page.tsx
git commit -m "Setup wizard: add Step 7 Install + Test simulator"
```

---

## Task 7: Build `/api/onboarding/test-message` endpoint

The new step in Task 6 calls this. Wraps the existing chat runtime with the in-progress profile injected as additional context.

**Files:**
- Create: `src/app/api/onboarding/test-message/route.ts`

- [ ] **Step 1: Read the existing chat route to understand prompt construction**

Run: `wc -l src/app/api/chat/route.ts src/lib/assistant-prompt.ts && head -80 src/lib/assistant-prompt.ts`

- [ ] **Step 2: Write the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface TestMessageBody {
  message: string;
  history: { role: "user" | "assistant"; text: string }[];
  form: Record<string, string>;
}

function buildSystemPrompt(form: Record<string, string>): string {
  return `You are the digital assistant for ${form.business_name || "this business"}, a ${form.trade || form.industry || "local business"} in ${form.areas || "South Africa"}.

You are NOT a generic chatbot. You are this specific business's assistant, configured by its owner. Your job is to help website visitors as a real receptionist would: warmly, efficiently, and only ever inside what this business actually does.

BUSINESS PROFILE
================
What we do: ${form.services_offered || "Not yet specified"}
What we do NOT do: ${form.services_excluded || "Not specified"}
Service areas: ${form.areas || "Not specified"}
Years in business: ${form.years_in_business || "Not specified"}
Team size: ${form.team_size || "Not specified"}

PRICING
=======
${form.charge_type || "Pricing model not specified"}
${form.callout_fee ? `Call-out fee: ${form.callout_fee}` : ""}
${form.example_prices ? `\nExample prices:\n${form.example_prices}` : ""}
${form.minimum_job ? `Minimum job: ${form.minimum_job}` : ""}
Free quotes: ${form.free_quotes || "Not specified"}

AVAILABILITY
============
Working hours: ${form.working_hours || "Not specified"}
After-hours callouts: ${form.after_hours || "Not specified"}
Emergency response: ${form.emergency_response || "Not specified"}
Booking lead time: ${form.booking_lead_time || "Not specified"}
Booking preference: ${form.booking_preference || "Not specified"}

WHAT MAKES US DIFFERENT
=======================
${form.unique_selling_point || "Not specified"}
${form.guarantees ? `Guarantees: ${form.guarantees}` : ""}
${form.certifications ? `Credentials: ${form.certifications}` : ""}

PERSONALITY
===========
Tone: ${form.ai_tone || "warm and professional"}
Language: ${form.ai_language || "English"}
Response style: ${form.ai_response_style || "balanced"}
${form.ai_greeting ? `Greeting: ${form.ai_greeting}` : ""}
${form.ai_sign_off ? `Sign-off name: ${form.ai_sign_off}` : ""}

RULES
=====
${form.ai_always_do ? `Always: ${form.ai_always_do}` : ""}
${form.ai_never_say ? `Never: ${form.ai_never_say}` : ""}
${form.ai_unhappy_customer ? `If a visitor is unhappy: ${form.ai_unhappy_customer}` : ""}

HOW YOU OPERATE
===============
Reason in real time. Do not follow a fixed script. Read each visitor's message and decide what a real receptionist for this business would ask next. Use the profile above to ground every reply.

Your goals, in order:
1. Greet warmly and read intent (urgent? quote? browsing?)
2. Qualify the lead using whatever this business needs to assess fit
3. Capture the information they will need to follow up (name, contact, what's needed)
4. Move toward a booking, quote, or callback
5. Be honest if something is outside what this business does

Never invent prices, hours, or services that aren't in the profile. If you don't know, say so and offer to have someone follow up.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TestMessageBody;
    if (!body.message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(body.form ?? {});
    const messages = [
      ...(body.history ?? []).map((m) => ({
        role: m.role,
        content: m.text,
      })),
      { role: "user" as const, content: body.message },
    ];

    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: systemPrompt,
      messages,
    });

    const reply = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run lint && npm run build`
Expected: pass.

- [ ] **Step 4: Smoke-test the endpoint manually**

Run dev server: `npm run dev`
In a second terminal:

```bash
curl -s http://localhost:3000/api/onboarding/test-message \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi, do you do emergency callouts?","history":[],"form":{"business_name":"Test Plumbing","trade":"Plumber","services_offered":"Burst pipes, geyser repairs","after_hours":"Yes","areas":"Johannesburg"}}' \
  | head -50
```

Expected: a JSON `{ "reply": "..." }` with a humanlike answer that references emergency callouts and Johannesburg.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/onboarding/test-message/route.ts
git commit -m "Add /api/onboarding/test-message for the wizard's test simulator"
```

---

## Task 8: Delete the old `/onboarding/` directory

With every reference rewritten, the old flow can be removed.

**Files:**
- Delete: `src/app/(app)/onboarding/` (entire tree)

- [ ] **Step 1: Confirm zero remaining imports from the doomed path**

Run: `grep -rn "/onboarding/website\|onboarding/website/_components\|@/app/(app)/onboarding" --include="*.ts" --include="*.tsx" src/`

Expected: no results. If any remain, fix them before deleting.

- [ ] **Step 2: Delete the directory**

Run: `git rm -r src/app/\(app\)/onboarding/`

- [ ] **Step 3: Verify build**

Run: `npm run lint && npm run build`
Expected: pass. If anything breaks here, an import was missed in Step 1, restore the file with `git restore` and fix.

- [ ] **Step 4: Commit**

```bash
git commit -m "Remove deprecated /onboarding/website flow, all entry points now go to /dashboard/setup"
```

---

## Task 9: Manual end-to-end QA

The flow only matters if a real signup works end to end. Run the dev server and walk through it as a new user.

- [ ] **Step 1: Start dev server**

Run: `npm run dev` (run in background, or in a separate terminal)

- [ ] **Step 2: Verify Supabase migration is applied**

Confirm with Liam that he ran `supabase/migrations/20260506_profile_feedback.sql` against the database.

- [ ] **Step 3: Walk a fresh signup**

In an incognito window: visit `http://localhost:3000/signup`, sign up with a fresh email, confirm via email link, and verify you land at `/dashboard/setup` (not `/onboarding/website`).

Walk through the auto-fill (use a real plumber or salon site URL), confirm steps 1-6 populate, reach Step 7. Send a test message. Click a flag. Click "Looks great, go live". Verify you land at `/dashboard?welcome=true`.

- [ ] **Step 4: Verify profile_feedback row was inserted**

In Supabase SQL editor:

```sql
select * from profile_feedback order by created_at desc limit 5;
```

Expected: at least one row from your test.

- [ ] **Step 5: Verify the old route 404s**

Visit `http://localhost:3000/onboarding/website` directly. Expected: Next.js 404.

- [ ] **Step 6: Verify settings tab links work**

In dashboard settings → Website Assistant tab, click "Open onboarding wizard" and "View onboarding". Both should open `/dashboard/setup`.

- [ ] **Step 7: Final commit if any QA fixes needed**

If any QA step exposed a bug, fix it, run `npm run lint && npm run build`, and commit with a clear message.

---

## Acceptance criteria

- A new signup lands directly on `/dashboard/setup` after email confirmation
- The setup wizard now has 7 steps, with Step 7 being Install + Test
- The test simulator at Step 7 calls `/api/onboarding/test-message` and renders Claude's reply
- Flag buttons in Step 7 write rows into `profile_feedback`
- `/onboarding/website` returns 404
- Every link in the codebase that previously pointed to `/onboarding/website` now points to `/dashboard/setup`
- `npm run build` passes clean
- A real test conversation against a populated profile feels coherent and on-brand for that business

---

## What's out of scope

- Refactoring `dashboard/setup/page.tsx` (1,905 lines, big file but works, leave for later)
- Phase 2 runtime adoption (the live chat at `/api/chat` and `/api/web/chat` still uses the old prompt construction; the test simulator is the only place using the new adaptive system prompt for now)
- Phase 3 continuous learning UI that surfaces `profile_feedback` rows back to the owner
- Pricing tier changes
- Deleting the now-unused fields on `clients` (`web_widget_greeting`, `faq`) — keep for backwards compatibility, separate cleanup later
