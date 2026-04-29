# Connect Your Website — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Connect Your Website" channel to qwikly.co.za so trade businesses can paste one line of code into their existing site and get Qwikly's AI answering visitors, qualifying leads, and booking into Google Calendar.

**Architecture:** Purely additive — new marketing pages, a new wizard path under `/onboarding/website`, new settings tab, minor dashboard updates, and a vanilla-JS embed widget. The existing WhatsApp/Email channel logic is untouched. A separate backend repo (`qwikly-web`) is documented in Phase 6 but is a separate deployment.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, Supabase, Lucide icons. Brand: `ember` (#E85A2C), `paper` (#F4EEE4 cream), Fraunces display font, Inter body. Dashboard dark tokens: `bg-dark` (#111827), `bg-card` (#1F2937).

**Critical note:** The spec mentions `#3B82F6` blue as brand — ignore this. Actual brand is `ember` (#E85A2C) orange. Use existing Tailwind tokens throughout.

---

## File Map

### New files
```
qwikly-site/
  src/
    app/
      (landing)/
        connect-your-website/
          page.tsx                          # A1 — product page
      (app)/
        onboarding/
          website/
            layout.tsx                      # B — wizard layout
            page.tsx                        # B — wizard router
            _components/
              WizardShell.tsx               # B — shell with progress bar
              WidgetPreview.tsx             # B — live preview pane
              StepBusiness.tsx              # B — step 1
              StepWebsite.tsx               # B — step 2
              StepCustomise.tsx             # B — step 3
              StepCalendar.tsx              # B — step 4
              StepHours.tsx                 # B — step 5
              StepInstall.tsx               # B — step 6
              StepVerify.tsx                # B — step 7
              StepTest.tsx                  # B — step 8
        dashboard/
          settings/
            _components/
              WebsiteAssistantTab.tsx       # C1
    api/
      onboarding/
        advance/
          route.ts                          # API — advance wizard step
        complete/
          route.ts                          # API — mark onboarding done
        verify-install/
          route.ts                          # API — check widget on site
        site-preview/
          route.ts                          # API — fetch site metadata
    components/
      landing/
        ConnectYourWebsiteSection.tsx       # A2 — homepage section
  public/
    widget/
      widget.js                             # D — embed widget (vanilla JS)
  supabase/
    migrations/
      20260429_website_assistant.sql        # database migration
```

### Modified files
```
src/components/Navbar.tsx                   # A3 — add "For your website" link
src/app/(landing)/page.tsx                  # A2 — add ConnectYourWebsiteSection
src/app/(landing)/pricing/page.tsx          # A4 — add widget feature bullet
src/components/ComparisonTable.tsx          # A5 — add web channel row
src/app/layout.tsx                          # A6 — update SEO metadata
src/lib/use-client.ts                       # extend ClientRow with widget fields
src/app/(app)/dashboard/settings/page.tsx   # C1 — add Website Assistant tab
src/app/(app)/dashboard/conversations/page.tsx  # C2 — add Web channel filter
src/app/(app)/dashboard/page.tsx            # C3 — add web visitors KPI
```

---

## Phase 0 — Database Migration

### Task 0: SQL migration

**Files:**
- Create: `supabase/migrations/20260429_website_assistant.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/20260429_website_assistant.sql

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'email', 'web_chat'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS visitor_id TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_url TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_domain TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_color TEXT DEFAULT '#E85A2C';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_greeting TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_position TEXT DEFAULT 'bottom-right'
    CHECK (web_widget_position IN ('bottom-right', 'bottom-left'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_launcher_label TEXT DEFAULT 'Message us';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_status TEXT DEFAULT 'pending'
    CHECK (web_widget_status IN ('pending', 'verified', 'disconnected'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_verified_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_last_seen_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_domain_whitelist TEXT;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_step INT DEFAULT 1;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS working_hours JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS after_hours_mode TEXT DEFAULT 'book_next_available'
    CHECK (after_hours_mode IN ('book_next_available', 'closed_message', 'always_open'));

CREATE TABLE IF NOT EXISTS web_widget_events (
  id BIGSERIAL PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  visitor_id TEXT,
  conversation_id TEXT REFERENCES conversations(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'widget_loaded', 'launcher_opened', 'intake_started',
    'intake_submitted', 'first_message', 'slot_proposed',
    'slot_picked', 'booking_confirmed', 'conversation_ended', 'dropped'
  )),
  page_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_web_widget_events_client ON web_widget_events(client_id, created_at DESC);
```

- [ ] **Step 2: Apply via Supabase dashboard or CLI**

```bash
cd ~/qwikly-site
npx supabase db push
# OR paste manually in Supabase SQL editor if CLI not configured
```

---

## Phase 1 — Type System

### Task 1: Extend ClientRow

**Files:**
- Modify: `src/lib/use-client.ts`

- [ ] **Step 1: Add widget fields to ClientRow interface**

In `use-client.ts`, find the `ClientRow` interface and add after the `commission_rate` line:

```typescript
  // website widget fields
  web_widget_enabled?: boolean | null;
  web_widget_domain?: string | null;
  web_widget_color?: string | null;
  web_widget_greeting?: string | null;
  web_widget_position?: 'bottom-right' | 'bottom-left' | null;
  web_widget_launcher_label?: string | null;
  web_widget_status?: 'pending' | 'verified' | 'disconnected' | null;
  web_widget_verified_at?: string | null;
  web_widget_last_seen_at?: string | null;
  web_widget_domain_whitelist?: string | null;
  onboarding_step?: number | null;
  onboarding_completed_at?: string | null;
  working_hours?: Record<string, [string, string] | null> | null;
  after_hours_mode?: 'book_next_available' | 'closed_message' | 'always_open' | null;
```

Also update `useClient` to export a `refresh` function:

```typescript
export function useClient() {
  const [client, setClient] = useState<ClientRow | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .limit(1)
      .maybeSingle();
    setClient((data as ClientRow) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return { client, loading, setClient, refresh: load };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/use-client.ts
git commit -m "feat(types): extend ClientRow with web widget fields"
```

---

## Phase 2 — Marketing Surfaces

### Task 2: /connect-your-website product page

**Files:**
- Create: `src/app/(landing)/connect-your-website/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/(landing)/connect-your-website/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Code, Calendar, Bell, Zap, Shield, Globe } from "lucide-react";
import CTAButton from "@/components/CTAButton";
import FAQ from "@/components/FAQ";

export const metadata: Metadata = {
  title: "Connect Your Website | Qwikly — AI booking assistant for trade sites",
  description:
    "Paste one line of code into your Wix, Squarespace, or WordPress site. Qwikly's AI answers visitors in 30 seconds, qualifies leads, and books into your Google Calendar — automatically.",
};

const HOW_STEPS = [
  {
    icon: Code,
    num: "01",
    title: "Paste one line of code",
    body: "Works with Wix, Squarespace, WordPress, Webflow, Shopify, or any custom site. If you can edit your site, you can install Qwikly.",
  },
  {
    icon: Zap,
    num: "02",
    title: "The AI answers your visitors",
    body: "Qualifies the job, asks for area and timing, and pre-screens before anything reaches your calendar.",
  },
  {
    icon: Calendar,
    num: "03",
    title: "Bookings land in your calendar",
    body: "Real slots from your Google Calendar are offered and confirmed. You get a WhatsApp alert with full details.",
  },
];

const COMPARISON = [
  { label: "Reply speed",              form: "2–24 hrs",  chatbot: "Instant", qwikly: "30 sec" },
  { label: "Books into your calendar", form: "No",        chatbot: "No",      qwikly: "Yes" },
  { label: "Knows your services",      form: "No",        chatbot: "No",      qwikly: "Yes" },
  { label: "Trained for your trade",   form: "No",        chatbot: "No",      qwikly: "Yes" },
  { label: "24/7 availability",        form: "No",        chatbot: "Yes",     qwikly: "Yes" },
];

const PLATFORMS = ["Wix", "Squarespace", "WordPress", "Webflow", "Shopify", "Custom HTML"];

const FAQS = [
  { q: "Will it slow my site down?", a: "The widget script is under 14 KB and loads after your page. Your visitors won't notice any difference." },
  { q: "What does it look like to my visitors?", a: "A small chat launcher in the corner of your site. When clicked, it opens a clean intake form then a conversation — styled to match your brand colour." },
  { q: "Can I customise the colour to match my brand?", a: "Yes. During setup you pick any accent colour and it applies across the launcher and chat bubbles." },
  { q: "What if I don't have a developer?", a: "You don't need one. The install is a single copy-paste into your site's Custom Code settings. If you get stuck, book a free 15-minute install call and we'll do it for you." },
  { q: "Does this replace my contact form?", a: "It can sit alongside it. Most clients find the widget converts better because it qualifies and books immediately rather than waiting for a follow-up." },
  { q: "Do I still need WhatsApp?", a: "WhatsApp remains a separate channel. The widget handles visitors on your own site specifically." },
  { q: "What happens if my Google Calendar is full?", a: "The AI offers the next available slot the following business day. If after-hours mode is on, it queues overnight and offers slots first thing." },
  { q: "How do I cancel?", a: "Cancel any time from your dashboard. No contracts, no lock-in." },
];

export default function ConnectYourWebsitePage() {
  return (
    <main className="bg-paper text-ink">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6 max-w-site mx-auto">
        <div className="max-w-3xl">
          <span className="inline-block bg-ember/10 text-ember text-[0.8rem] font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6">
            New — Website Channel
          </span>
          <h1 className="font-display text-5xl md:text-6xl font-medium leading-[0.95] tracking-tight mb-6">
            Your website doesn&rsquo;t sleep.
            <br />
            <em className="not-italic text-ember">Now your replies don&rsquo;t either.</em>
          </h1>
          <p className="text-ink-500 text-xl leading-relaxed mb-10 max-w-2xl">
            Connect your existing website to a Qwikly AI assistant. Visitors get answers in 30 seconds,
            jobs get qualified, bookings go straight into your calendar — even at 11 pm.
          </p>
          <div className="flex flex-wrap gap-4">
            <CTAButton href="/signup" size="lg">
              Connect my website — free for 7 days
            </CTAButton>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 text-ink-600 hover:text-ink transition-colors text-[0.95rem] cursor-pointer"
            >
              See how it works <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-paper-deep">
        <div className="max-w-site mx-auto px-6">
          <h2 className="font-display text-4xl font-medium tracking-tight mb-14 text-center">
            Three steps to live
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="bg-paper rounded-2xl p-8 border border-line">
                  <div className="w-10 h-10 rounded-xl bg-ember/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-ember" />
                  </div>
                  <span className="text-ember text-xs font-mono font-bold tracking-widest">{step.num}</span>
                  <h3 className="font-display text-xl font-medium mt-1 mb-3">{step.title}</h3>
                  <p className="text-ink-500 leading-relaxed text-[0.95rem]">{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Comparison ─────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-site mx-auto">
        <h2 className="font-display text-4xl font-medium tracking-tight mb-12 text-center">
          Why not just use a contact form?
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-[0.9rem]">
            <thead>
              <tr className="bg-paper-deep border-b border-line">
                <th className="text-left py-4 px-6 font-medium text-ink-500 w-[35%]"></th>
                <th className="py-4 px-4 font-medium text-ink-500 text-center">Contact form</th>
                <th className="py-4 px-4 font-medium text-ink-500 text-center">Generic chatbot</th>
                <th className="py-4 px-4 font-semibold text-ember text-center">Qwikly</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? "bg-paper" : "bg-paper-deep"}>
                  <td className="py-4 px-6 text-ink-700 font-medium">{row.label}</td>
                  <td className="py-4 px-4 text-center text-ink-500">{row.form}</td>
                  <td className="py-4 px-4 text-center text-ink-500">{row.chatbot}</td>
                  <td className="py-4 px-4 text-center font-semibold text-ember">{row.qwikly}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Platform logos ─────────────────────────────────────── */}
      <section className="py-16 bg-paper-deep">
        <div className="max-w-site mx-auto px-6 text-center">
          <p className="text-ink-500 text-[0.9rem] font-medium uppercase tracking-widest mb-8">
            Install on any platform
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {PLATFORMS.map((p) => (
              <span
                key={p}
                className="px-5 py-2.5 bg-paper border border-line rounded-full text-ink-700 font-medium text-[0.9rem]"
              >
                {p}
              </span>
            ))}
          </div>
          <p className="mt-6 text-ink-500 text-sm">
            If you can edit your site, you can install Qwikly. Most people are done in 5 minutes.
          </p>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-3xl mx-auto">
        <h2 className="font-display text-4xl font-medium tracking-tight mb-12 text-center">
          Common questions
        </h2>
        <div className="space-y-0 divide-y divide-line border border-line rounded-2xl overflow-hidden">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group bg-paper">
              <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none select-none">
                <span className="font-medium text-ink text-[0.95rem]">{q}</span>
                <ArrowRight className="w-4 h-4 text-ink-400 rotate-90 group-open:-rotate-90 transition-transform duration-200 shrink-0 ml-4" />
              </summary>
              <div className="px-6 pb-5 text-ink-500 text-[0.9rem] leading-relaxed">{a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA band ───────────────────────────────────────────── */}
      <section className="py-20 bg-ink text-paper">
        <div className="max-w-site mx-auto px-6 text-center">
          <h2 className="font-display text-4xl font-medium tracking-tight mb-4">
            Get your assistant live in 10 minutes.
          </h2>
          <p className="text-paper/70 mb-8 text-lg">Free for 7 days. No credit card. One line of code.</p>
          <CTAButton href="/signup" size="lg" variant="solid">
            Connect my website
          </CTAButton>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(landing\)/connect-your-website/
git commit -m "feat(marketing): add /connect-your-website product page"
```

---

### Task 3: Navbar + Homepage section + Pricing + ComparisonTable + SEO

**Files:**
- Modify: `src/components/Navbar.tsx`
- Create: `src/components/landing/ConnectYourWebsiteSection.tsx`
- Modify: `src/app/(landing)/page.tsx`
- Modify: `src/app/(landing)/pricing/page.tsx`
- Modify: `src/components/ComparisonTable.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add navbar link**

In `src/components/Navbar.tsx`, find the `navLinks` array and add the new entry:

```typescript
const navLinks = [
  { label: "Outcomes", anchor: "#outcomes" },
  { label: "How it works", anchor: "#how-it-works" },
  { label: "For your website", href: "/connect-your-website" },
  { label: "Pricing", anchor: "#pricing" },
  { label: "FAQ", anchor: "#faq" },
];
```

Update the `NavLink` rendering to handle both anchors and full hrefs — find where `navLinks.map` renders and update:

```tsx
{navLinks.map((link) => (
  <a
    key={link.label}
    href={"href" in link ? link.href : getHref(link.anchor)}
    className="text-ink-700 hover:text-ink transition-colors duration-200 text-[0.9rem] cursor-pointer"
  >
    {link.label}
  </a>
))}
```

Also update the mobile menu map with the same pattern.

Update the `navLinks` type at the top of the file:

```typescript
const navLinks: Array<
  { label: string; anchor: string; href?: never } |
  { label: string; href: string; anchor?: never }
> = [ ... ];
```

- [ ] **Step 2: Create ConnectYourWebsiteSection**

```tsx
// src/components/landing/ConnectYourWebsiteSection.tsx
import Link from "next/link";
import { ArrowRight, Globe } from "lucide-react";

export function ConnectYourWebsiteSection() {
  return (
    <section className="py-20 px-6 bg-paper-deep">
      <div className="max-w-site mx-auto">
        <div className="rounded-3xl border border-line bg-paper p-10 md:p-14 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <span className="inline-flex items-center gap-2 bg-ember/10 text-ember text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-5">
              <Globe className="w-3.5 h-3.5" />
              Already have a website?
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-medium leading-tight tracking-tight mb-4">
              Connect it to Qwikly<br />in 5 minutes.
            </h2>
            <p className="text-ink-500 text-lg leading-relaxed mb-6 max-w-lg">
              Paste one line of code. Visitors get answers in 30 seconds.
              Bookings go in your calendar. Works with Wix, Squarespace,
              WordPress, Webflow, and any custom site.
            </p>
            <Link
              href="/connect-your-website"
              className="inline-flex items-center gap-2 text-ember font-semibold hover:underline cursor-pointer"
            >
              Connect my website <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="shrink-0 w-full md:w-64 h-48 rounded-2xl bg-paper-deep border border-line flex items-center justify-center text-ink-300">
            <Globe className="w-16 h-16" />
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Add section to homepage**

In `src/app/(landing)/page.tsx`, add import at top:

```typescript
import { ConnectYourWebsiteSection } from "@/components/landing/ConnectYourWebsiteSection";
```

Find the `#how-it-works` section closing tag and the pricing section opening, add between them:

```tsx
<ConnectYourWebsiteSection />
```

- [ ] **Step 4: Update SEO in layout.tsx**

In `src/app/layout.tsx`, find the `metadata` export and update:

```typescript
export const metadata: Metadata = {
  title: "Qwikly | AI booking on your website, WhatsApp & email",
  description:
    "Connect your website, WhatsApp, or email to a Qwikly AI assistant. Replies in 30 seconds, qualifies leads, books into your Google Calendar. One line of code. Works with Wix, Squarespace, WordPress and custom sites.",
  // ... keep existing openGraph etc
};
```

- [ ] **Step 5: Commit marketing updates**

```bash
git add src/components/Navbar.tsx src/components/landing/ConnectYourWebsiteSection.tsx \
        src/app/\(landing\)/page.tsx src/app/layout.tsx
git commit -m "feat(marketing): navbar link, homepage section, SEO update"
```

---

## Phase 3 — Onboarding Wizard

### Task 4: Wizard shell and layout

**Files:**
- Create: `src/app/(app)/onboarding/website/layout.tsx`
- Create: `src/app/(app)/onboarding/website/page.tsx`
- Create: `src/app/(app)/onboarding/website/_components/WizardShell.tsx`
- Create: `src/app/(app)/onboarding/website/_components/WidgetPreview.tsx`

- [ ] **Step 1: Create layout.tsx**

```tsx
// src/app/(app)/onboarding/website/layout.tsx
export default function WebsiteOnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 2: Create WizardShell.tsx**

```tsx
// src/app/(app)/onboarding/website/_components/WizardShell.tsx
"use client";
import Link from "next/link";
import { X, ChevronLeft } from "lucide-react";

interface WizardShellProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  children: React.ReactNode;
  onSaveLater?: () => void;
}

export function WizardShell({ currentStep, totalSteps, title, children, onSaveLater }: WizardShellProps) {
  const pct = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-bg-dark text-fg flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2 text-fg-muted hover:text-fg transition-colors text-sm cursor-pointer">
          <ChevronLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <div className="flex items-center gap-4">
          <button
            onClick={onSaveLater}
            className="text-sm text-fg-muted hover:text-fg transition-colors cursor-pointer"
          >
            Save &amp; continue later
          </button>
        </div>
      </header>

      {/* Progress */}
      <div className="px-6 pt-6 pb-2 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-1.5 flex-1 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-ember rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-fg-muted text-xs shrink-0">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          <p className="text-fg-subtle text-xs font-medium uppercase tracking-wider">{title}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-10">
        <div className="max-w-4xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create WidgetPreview.tsx**

```tsx
// src/app/(app)/onboarding/website/_components/WidgetPreview.tsx
"use client";

interface WidgetPreviewProps {
  color?: string;
  greeting?: string;
  launcherLabel?: string;
  position?: "bottom-right" | "bottom-left";
  businessName?: string;
}

export function WidgetPreview({
  color = "#E85A2C",
  greeting = "Hi! How can I help you today?",
  launcherLabel = "Message us",
  position = "bottom-right",
  businessName = "Your Business",
}: WidgetPreviewProps) {
  return (
    <div className="relative w-full h-80 bg-bg-elevated rounded-2xl overflow-hidden border border-border">
      {/* Simulated site background */}
      <div className="absolute inset-0 p-5 opacity-20 pointer-events-none">
        <div className="h-3 w-32 bg-fg-muted rounded mb-3" />
        <div className="h-2 w-full bg-fg-muted rounded mb-2" />
        <div className="h-2 w-4/5 bg-fg-muted rounded mb-2" />
        <div className="h-2 w-3/5 bg-fg-muted rounded" />
      </div>

      {/* Chat window */}
      <div className={`absolute bottom-12 ${position === "bottom-right" ? "right-4" : "left-4"} w-60 bg-white rounded-2xl shadow-xl overflow-hidden`}>
        {/* Header */}
        <div className="px-4 py-3 text-white text-xs font-semibold" style={{ background: color }}>
          {businessName}
        </div>
        {/* Messages */}
        <div className="p-3 space-y-2 bg-gray-50">
          <div className="flex">
            <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-gray-800 shadow-sm max-w-[85%]">
              {greeting}
            </div>
          </div>
        </div>
      </div>

      {/* Launcher */}
      <button
        className="absolute bottom-4 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 cursor-pointer"
        style={{
          background: color,
          [position === "bottom-right" ? "right" : "left"]: "16px",
        }}
      >
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
        {launcherLabel}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create wizard page.tsx router**

```tsx
// src/app/(app)/onboarding/website/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClient } from "@/lib/use-client";
import { supabase } from "@/lib/supabase";
import { WizardShell } from "./_components/WizardShell";
import StepBusiness from "./_components/StepBusiness";
import StepWebsite from "./_components/StepWebsite";
import StepCustomise from "./_components/StepCustomise";
import StepCalendar from "./_components/StepCalendar";
import StepHours from "./_components/StepHours";
import StepInstall from "./_components/StepInstall";
import StepVerify from "./_components/StepVerify";
import StepTest from "./_components/StepTest";

const STEPS = [
  { id: 1, title: "About your business",    Component: StepBusiness  },
  { id: 2, title: "Your website",           Component: StepWebsite   },
  { id: 3, title: "Customise the assistant",Component: StepCustomise },
  { id: 4, title: "Connect your calendar",  Component: StepCalendar  },
  { id: 5, title: "Working hours",          Component: StepHours     },
  { id: 6, title: "Install the widget",     Component: StepInstall   },
  { id: 7, title: "Verify install",         Component: StepVerify    },
  { id: 8, title: "Test conversation",      Component: StepTest      },
];

export default function OnboardingWebsite() {
  const router = useRouter();
  const { client, refresh } = useClient();
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (client?.onboarding_completed_at) {
      router.push("/dashboard?welcome=true");
      return;
    }
    if (client?.onboarding_step) {
      setCurrentStep(client.onboarding_step);
    }
  }, [client, router]);

  const advance = useCallback(async () => {
    const next = currentStep + 1;
    if (next > STEPS.length) {
      await supabase.from("clients").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", client!.id);
      router.push("/dashboard?welcome=true");
    } else {
      await supabase.from("clients").update({ onboarding_step: next }).eq("id", client!.id);
      setCurrentStep(next);
      await refresh();
    }
  }, [currentStep, client, router, refresh]);

  const back = useCallback(() => setCurrentStep((s) => Math.max(1, s - 1)), []);

  const saveLater = useCallback(async () => {
    await supabase.from("clients").update({ onboarding_step: currentStep }).eq("id", client!.id);
    router.push("/dashboard");
  }, [currentStep, client, router]);

  const step = STEPS.find((s) => s.id === currentStep);
  if (!step || !client) return null;
  const { Component } = step;

  return (
    <WizardShell currentStep={currentStep} totalSteps={STEPS.length} title={step.title} onSaveLater={saveLater}>
      <Component client={client} onAdvance={advance} onBack={back} refresh={refresh} />
    </WizardShell>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/onboarding/website/
git commit -m "feat(wizard): scaffold wizard shell, layout, WidgetPreview, page router"
```

---

### Task 5: Wizard steps 1–3

**Files:**
- Create: `src/app/(app)/onboarding/website/_components/StepBusiness.tsx`
- Create: `src/app/(app)/onboarding/website/_components/StepWebsite.tsx`
- Create: `src/app/(app)/onboarding/website/_components/StepCustomise.tsx`

The shared step props type used by all steps:

```typescript
// Each step receives these props
interface StepProps {
  client: ClientRow;
  onAdvance: () => Promise<void>;
  onBack: () => void;
  refresh: () => Promise<void>;
}
```

- [ ] **Step 1: Create StepBusiness.tsx**

```tsx
// src/app/(app)/onboarding/website/_components/StepBusiness.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ClientRow } from "@/lib/use-client";
import { Loader2 } from "lucide-react";
import { Input, Select, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TRADES = [
  "Electrician", "Plumber", "Roofer", "Solar Installer", "Pest Control",
  "Aircon", "Pool Cleaning", "Landscaper", "Garage Door", "Security",
];

interface Props { client: ClientRow; onAdvance: () => Promise<void>; onBack: () => void; refresh: () => Promise<void>; }

export default function StepBusiness({ client, onAdvance }: Props) {
  const [form, setForm] = useState({
    business_name: client.business_name ?? "",
    trade: client.trade ?? "",
    owner_name: client.owner_name ?? "",
    service_areas_text: (client.service_areas ?? []).join(", "),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.business_name || !form.trade) { setError("Business name and trade are required."); return; }
    setSaving(true);
    const { error: dbErr } = await supabase.from("clients").update({
      business_name: form.business_name,
      trade: form.trade.toLowerCase(),
      owner_name: form.owner_name,
      service_areas: form.service_areas_text.split(",").map((s) => s.trim()).filter(Boolean),
    }).eq("id", client.id);
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    await onAdvance();
  }

  return (
    <div className="pt-8 max-w-lg">
      <h1 className="text-display-1 font-semibold text-fg mb-2">Let&apos;s get your AI assistant live.</h1>
      <p className="text-fg-muted mb-8">Tell us about your business so we can set up the right assistant for you.</p>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Business name" htmlFor="business_name">
          <Input
            id="business_name"
            value={form.business_name}
            onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
            placeholder="JD Electrical"
          />
        </Field>

        <Field label="Trade" htmlFor="trade">
          <Select
            id="trade"
            value={form.trade}
            onChange={(e) => setForm((f) => ({ ...f, trade: e.target.value }))}
          >
            <option value="">Select your trade…</option>
            {TRADES.map((t) => <option key={t} value={t.toLowerCase()}>{t}</option>)}
          </Select>
        </Field>

        <Field label="Your name" htmlFor="owner_name">
          <Input
            id="owner_name"
            value={form.owner_name}
            onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
            placeholder="John"
          />
        </Field>

        <Field label="City / service area" htmlFor="areas">
          <Input
            id="areas"
            value={form.service_areas_text}
            onChange={(e) => setForm((f) => ({ ...f, service_areas_text: e.target.value }))}
            placeholder="Johannesburg, Sandton, Midrand"
          />
        </Field>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={saving} className="flex-1 justify-center">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create StepWebsite.tsx**

```tsx
// src/app/(app)/onboarding/website/_components/StepWebsite.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ClientRow } from "@/lib/use-client";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props { client: ClientRow; onAdvance: () => Promise<void>; onBack: () => void; refresh: () => Promise<void>; }

function extractDomain(url: string) {
  try { return new URL(url).hostname; } catch { return null; }
}

export default function StepWebsite({ client, onAdvance, onBack }: Props) {
  const [url, setUrl] = useState(
    client.web_widget_domain ? `https://${client.web_widget_domain}` : ""
  );
  const [checking, setChecking] = useState(false);
  const [preview, setPreview] = useState<{ title: string; reachable: boolean } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkUrl() {
    setError(null);
    if (!url) { setError("Please enter your website URL."); return; }
    let normalized = url;
    if (!normalized.startsWith("http")) normalized = `https://${normalized}`;
    const domain = extractDomain(normalized);
    if (!domain) { setError("Please enter a valid URL, e.g. https://yoursite.co.za"); return; }
    setChecking(true);
    try {
      const res = await fetch(`/api/onboarding/site-preview?url=${encodeURIComponent(normalized)}`);
      const data = await res.json();
      setPreview({ title: data.title ?? domain, reachable: data.reachable });
    } catch {
      setPreview({ title: domain, reachable: false });
    }
    setChecking(false);
  }

  async function handleConfirm() {
    setSaving(true);
    const domain = extractDomain(url.startsWith("http") ? url : `https://${url}`);
    await supabase.from("clients").update({ web_widget_domain: domain }).eq("id", client.id);
    setSaving(false);
    await onAdvance();
  }

  return (
    <div className="pt-8 max-w-lg">
      <h1 className="text-display-1 font-semibold text-fg mb-2">Where should we install your assistant?</h1>
      <p className="text-fg-muted mb-8">Enter your website URL. We&apos;ll verify we can reach it.</p>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      <Field label="Your website URL" htmlFor="url">
        <div className="flex gap-2">
          <Input
            id="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setPreview(null); setConfirmed(false); }}
            placeholder="https://yoursite.co.za"
            className="flex-1"
          />
          <Button type="button" onClick={checkUrl} disabled={checking} variant="outline">
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
          </Button>
        </div>
      </Field>

      {preview && (
        <div className="mt-4 p-4 rounded-xl border border-border bg-bg-elevated">
          <div className="flex items-start gap-3">
            {preview.reachable
              ? <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
              : <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
            }
            <div>
              <p className="text-fg font-medium text-sm">{preview.title}</p>
              <p className="text-fg-muted text-xs mt-0.5">
                {preview.reachable ? "We can reach your site." : "Couldn't reach your site — you can still continue."}
              </p>
              {!confirmed && (
                <button
                  onClick={() => setConfirmed(true)}
                  className="mt-2 text-ember text-xs font-semibold hover:underline cursor-pointer"
                >
                  Yes, this is my website
                </button>
              )}
              {confirmed && <p className="mt-2 text-success text-xs font-semibold">Confirmed</p>}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-6">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={saving || (!preview && !client.web_widget_domain)}
          className="flex-1 justify-center"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create StepCustomise.tsx**

```tsx
// src/app/(app)/onboarding/website/_components/StepCustomise.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ClientRow } from "@/lib/use-client";
import { Loader2 } from "lucide-react";
import { Input, Field, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WidgetPreview } from "./WidgetPreview";

interface Props { client: ClientRow; onAdvance: () => Promise<void>; onBack: () => void; refresh: () => Promise<void>; }

const TRADE_GREETINGS: Record<string, string> = {
  electrician: "Hi {name}! I'm {business}'s booking assistant. Sparky problem, fault, or install?",
  plumber: "Hi {name}! I'm {business}'s booking assistant. Burst pipe, leak, or install?",
  roofer: "Hi {name}! I'm {business}'s booking assistant. Roof leak or quote?",
};

export default function StepCustomise({ client, onAdvance, onBack }: Props) {
  const defaultGreeting =
    TRADE_GREETINGS[client.trade ?? ""] ??
    `Hi {name}! I'm ${client.business_name ?? "your"} booking assistant. How can I help?`;

  const [color, setColor] = useState(client.web_widget_color ?? "#E85A2C");
  const [greeting, setGreeting] = useState(client.web_widget_greeting ?? defaultGreeting);
  const [label, setLabel] = useState(client.web_widget_launcher_label ?? "Message us");
  const [position, setPosition] = useState<"bottom-right" | "bottom-left">(
    (client.web_widget_position as "bottom-right" | "bottom-left") ?? "bottom-right"
  );
  const [saving, setSaving] = useState(false);

  const resolvedGreeting = greeting
    .replace("{name}", "Sarah")
    .replace("{business}", client.business_name ?? "your business");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from("clients").update({
      web_widget_color: color,
      web_widget_greeting: greeting,
      web_widget_launcher_label: label,
      web_widget_position: position,
    }).eq("id", client.id);
    setSaving(false);
    await onAdvance();
  }

  return (
    <div className="pt-8">
      <h1 className="text-display-1 font-semibold text-fg mb-2">Make it look like yours.</h1>
      <p className="text-fg-muted mb-8">Customise how visitors see your assistant.</p>

      <div className="grid md:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Accent colour" htmlFor="color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 font-mono"
                placeholder="#E85A2C"
              />
            </div>
          </Field>

          <Field label="Greeting message" htmlFor="greeting">
            <Textarea
              id="greeting"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              rows={3}
              placeholder="Hi {name}! How can I help?"
            />
            <p className="text-fg-subtle text-xs mt-1">Use {"{name}"} to personalise for returning visitors.</p>
          </Field>

          <Field label="Launcher button text" htmlFor="label">
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Message us"
            />
          </Field>

          <Field label="Position" htmlFor="position">
            <div className="flex gap-3">
              {(["bottom-right", "bottom-left"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPosition(p)}
                  className={`flex-1 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                    position === p
                      ? "border-ember bg-ember/10 text-ember font-semibold"
                      : "border-border text-fg-muted hover:border-fg-muted"
                  }`}
                >
                  {p === "bottom-right" ? "Bottom right" : "Bottom left"}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack}>Back</Button>
            <Button type="submit" disabled={saving} className="flex-1 justify-center">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
            </Button>
          </div>
        </form>

        <div>
          <p className="text-fg-subtle text-xs font-medium uppercase tracking-wider mb-3">Live preview</p>
          <WidgetPreview
            color={color}
            greeting={resolvedGreeting}
            launcherLabel={label}
            position={position}
            businessName={client.business_name ?? "Your Business"}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/onboarding/website/_components/
git commit -m "feat(wizard): steps 1-3 (business, website, customise)"
```

---

### Task 6: Wizard steps 4–6

- [ ] **Step 1: Create StepCalendar.tsx**

```tsx
// src/app/(app)/onboarding/website/_components/StepCalendar.tsx
"use client";

import { useState } from "react";
import { ClientRow } from "@/lib/use-client";
import { Calendar, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { client: ClientRow; onAdvance: () => Promise<void>; onBack: () => void; refresh: () => Promise<void>; }

export default function StepCalendar({ client, onAdvance, onBack }: Props) {
  const [skipping, setSkipping] = useState(false);

  const isConnected = !!client.google_calendar_id;

  function connectCalendar() {
    window.location.href = `/api/auth/google?return=/onboarding/website`;
  }

  async function handleSkip() {
    setSkipping(true);
    await onAdvance();
    setSkipping(false);
  }

  return (
    <div className="pt-8 max-w-lg">
      <h1 className="text-display-1 font-semibold text-fg mb-2">Where should bookings go?</h1>
      <p className="text-fg-muted mb-8">Connect your Google Calendar so the AI can offer real slots and confirm bookings automatically.</p>

      {isConnected ? (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-success/30 bg-success/5 mb-6">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <div>
            <p className="text-fg font-medium text-sm">Google Calendar connected</p>
            <p className="text-fg-muted text-xs">{client.google_calendar_id}</p>
          </div>
        </div>
      ) : (
        <button
          onClick={connectCalendar}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border border-border bg-bg-elevated hover:bg-bg-elevated/80 transition-colors cursor-pointer mb-6"
        >
          <Calendar className="w-5 h-5 text-ember" />
          <span className="font-medium text-fg">Connect Google Calendar</span>
        </button>
      )}

      {!isConnected && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-warning/5 border border-warning/20 mb-6">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <p className="text-fg-muted text-sm">
            Your AI won&apos;t be able to book jobs until you connect a calendar. You can do this later in Settings.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        {isConnected ? (
          <Button type="button" onClick={() => onAdvance()} className="flex-1 justify-center">Continue</Button>
        ) : (
          <Button type="button" variant="outline" onClick={handleSkip} disabled={skipping} className="flex-1 justify-center">
            Connect calendar later
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create StepHours.tsx**

```tsx
// src/app/(app)/onboarding/website/_components/StepHours.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ClientRow } from "@/lib/use-client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { client: ClientRow; onAdvance: () => Promise<void>; onBack: () => void; refresh: () => Promise<void>; }

type AfterHoursMode = "book_next_available" | "closed_message" | "always_open";

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const DEFAULT_HOURS: Record<string, [string, string] | null> = {
  mon: ["07:00", "18:00"], tue: ["07:00", "18:00"], wed: ["07:00", "18:00"],
  thu: ["07:00", "18:00"], fri: ["07:00", "18:00"], sat: ["08:00", "13:00"], sun: null,
};

export default function StepHours({ client, onAdvance, onBack }: Props) {
  const [hours, setHours] = useState<Record<string, [string, string] | null>>(
    (client.working_hours as Record<string, [string, string] | null>) ?? DEFAULT_HOURS
  );
  const [afterHours, setAfterHours] = useState<AfterHoursMode>(
    (client.after_hours_mode as AfterHoursMode) ?? "book_next_available"
  );
  const [saving, setSaving] = useState(false);

  function toggleDay(day: string) {
    setHours((h) => ({ ...h, [day]: h[day] ? null : ["07:00", "18:00"] }));
  }

  function setTime(day: string, idx: 0 | 1, val: string) {
    setHours((h) => {
      const cur = h[day] ?? ["07:00", "18:00"];
      const next: [string, string] = [cur[0], cur[1]];
      next[idx] = val;
      return { ...h, [day]: next };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from("clients").update({ working_hours: hours, after_hours_mode: afterHours }).eq("id", client.id);
    setSaving(false);
    await onAdvance();
  }

  return (
    <div className="pt-8 max-w-lg">
      <h1 className="text-display-1 font-semibold text-fg mb-2">When are you available?</h1>
      <p className="text-fg-muted mb-8">Set your working hours. The AI will offer slots within these times.</p>

      <form onSubmit={handleSubmit}>
        <div className="space-y-2 mb-8">
          {DAYS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-bg-elevated">
              <button
                type="button"
                onClick={() => toggleDay(key)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${hours[key] ? "bg-ember" : "bg-bg-elevated border border-border"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${hours[key] ? "translate-x-5" : ""}`} />
              </button>
              <span className="text-fg text-sm w-24 shrink-0">{label}</span>
              {hours[key] ? (
                <div className="flex items-center gap-2 flex-1">
                  <input type="time" value={hours[key]![0]} onChange={(e) => setTime(key, 0, e.target.value)}
                    className="bg-transparent text-fg text-sm border border-border rounded-lg px-2 py-1 cursor-pointer" />
                  <span className="text-fg-muted text-xs">to</span>
                  <input type="time" value={hours[key]![1]} onChange={(e) => setTime(key, 1, e.target.value)}
                    className="bg-transparent text-fg text-sm border border-border rounded-lg px-2 py-1 cursor-pointer" />
                </div>
              ) : (
                <span className="text-fg-muted text-sm">Closed</span>
              )}
            </div>
          ))}
        </div>

        <div className="mb-8">
          <p className="text-fg font-medium text-sm mb-3">After-hours behaviour</p>
          {([
            ["book_next_available", "Take messages and book first available slot tomorrow (recommended)"],
            ["closed_message",      "Tell visitors we're closed and to come back tomorrow"],
            ["always_open",         "Always allow bookings (24/7 service)"],
          ] as [AfterHoursMode, string][]).map(([val, desc]) => (
            <label key={val} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-bg-elevated mb-2 cursor-pointer">
              <input type="radio" name="after_hours" value={val} checked={afterHours === val}
                onChange={() => setAfterHours(val)} className="mt-0.5 accent-ember" />
              <span className="text-fg text-sm">{desc}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onBack}>Back</Button>
          <Button type="submit" disabled={saving} className="flex-1 justify-center">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create StepInstall.tsx**

```tsx
// src/app/(app)/onboarding/website/_components/StepInstall.tsx
"use client";

import { useState } from "react";
import { ClientRow } from "@/lib/use-client";
import { Copy, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { client: ClientRow; onAdvance: () => Promise<void>; onBack: () => void; refresh: () => Promise<void>; }

const PLATFORMS = [
  { id: "wix",          label: "Wix"         },
  { id: "squarespace",  label: "Squarespace" },
  { id: "wordpress",    label: "WordPress"   },
  { id: "webflow",      label: "Webflow"     },
  { id: "shopify",      label: "Shopify"     },
  { id: "custom",       label: "Custom HTML" },
];

const INSTRUCTIONS: Record<string, string[]> = {
  wix: [
    "Open your Wix dashboard and click Settings in the left menu.",
    "Click Custom Code (under Advanced).",
    "Click + Add Custom Code.",
    "Paste the code snippet into the box.",
    "Set Add Code to Pages → All pages.",
    "Set Place Code in → Body — end.",
    "Click Apply. You're done.",
  ],
  squarespace: [
    "Go to your Squarespace dashboard.",
    "Click Settings → Advanced → Code Injection.",
    "Paste the snippet into the Footer section.",
    "Click Save. Publish your site.",
  ],
  wordpress: [
    "Install the Insert Headers and Footers plugin (or use your theme's header.php).",
    "Go to Settings → Insert Headers and Footers.",
    "Paste the snippet into the Scripts in Footer box.",
    "Click Save.",
  ],
  webflow: [
    "Open your Webflow project and go to Project Settings.",
    "Click the Custom Code tab.",
    "Paste the snippet into the Footer Code section.",
    "Click Save Changes, then Publish your site.",
  ],
  shopify: [
    "From your Shopify admin, go to Online Store → Themes.",
    "Click Actions → Edit Code on your active theme.",
    "Open theme.liquid and find the </body> tag.",
    "Paste the snippet just before </body>.",
    "Click Save.",
  ],
  custom: [
    "Open your site's HTML file in any editor.",
    "Find the closing </body> tag.",
    "Paste the snippet just before </body>.",
    "Save and upload to your server.",
  ],
};

export default function StepInstall({ client, onAdvance, onBack }: Props) {
  const [platform, setPlatform] = useState("wix");
  const [copied, setCopied] = useState(false);

  const snippet = `<script src="https://embed.qwikly.co.za/v1/widget.js"\n        data-client="${client.id}"\n        defer></script>`;

  function copy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="pt-8 max-w-2xl">
      <h1 className="text-display-1 font-semibold text-fg mb-2">Add this one line to your website.</h1>
      <p className="text-fg-muted mb-6">Copy the code snippet below and paste it into your site. Then come back and click Continue.</p>

      {/* Snippet */}
      <div className="relative bg-bg-elevated border border-border rounded-xl p-5 mb-6 font-mono text-sm text-fg-muted">
        <pre className="whitespace-pre-wrap break-all">{snippet}</pre>
        <button
          onClick={copy}
          className="absolute top-3 right-3 flex items-center gap-1.5 bg-ember text-white text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-ember-hover transition-colors"
        >
          {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Platform tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              platform === p.id ? "bg-ember text-white" : "bg-bg-elevated text-fg-muted hover:text-fg border border-border"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="bg-bg-elevated border border-border rounded-xl p-5 mb-6">
        <ol className="space-y-2">
          {(INSTRUCTIONS[platform] ?? []).map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-fg-muted">
              <span className="text-ember font-mono font-bold shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Concierge CTA */}
      <div className="p-4 rounded-xl border border-border bg-bg-elevated flex items-center justify-between gap-4 mb-6">
        <p className="text-fg-muted text-sm">Need help? We&apos;ll install it for you on a free 15-minute call.</p>
        <a
          href="https://cal.com/liamclarke/install"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ember text-sm font-semibold hover:underline shrink-0 cursor-pointer"
        >
          Book install call
        </a>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="button" onClick={() => onAdvance()} className="flex-1 justify-center">
          I&apos;ve pasted the code — Continue
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/onboarding/website/_components/
git commit -m "feat(wizard): steps 4-6 (calendar, hours, install)"
```

---

### Task 7: Wizard steps 7–8

- [ ] **Step 1: Create StepVerify.tsx**

```tsx
// src/app/(app)/onboarding/website/_components/StepVerify.tsx
"use client";

import { useState } from "react";
import { ClientRow } from "@/lib/use-client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { client: ClientRow; onAdvance: () => Promise<void>; onBack: () => void; refresh: () => Promise<void>; }

interface VerifyResult {
  verified: boolean;
  reason?: string;
  diagnostics?: string[];
}

export default function StepVerify({ client, onAdvance, onBack, refresh }: Props) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [attempts, setAttempts] = useState(0);

  async function checkInstall() {
    setChecking(true);
    setResult(null);
    setAttempts((a) => a + 1);
    try {
      const res = await fetch("/api/onboarding/verify-install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: client.id }),
      });
      const data: VerifyResult = await res.json();
      setResult(data);
      if (data.verified) await refresh();
    } catch {
      setResult({ verified: false, reason: "network_error" });
    }
    setChecking(false);
  }

  const DIAGNOSTIC_LABELS: Record<string, string> = {
    widget_script_not_found: "The widget script wasn't found on your page. Did you save changes in your site editor?",
    wrong_client_id: "A Qwikly widget was found but with a different client ID. Make sure you copied the code exactly.",
    script_tag_malformed: "The script tag was found but appears malformed. Try copying the snippet again.",
  };

  return (
    <div className="pt-8 max-w-lg">
      <h1 className="text-display-1 font-semibold text-fg mb-2">Let&apos;s check it&apos;s installed.</h1>
      <p className="text-fg-muted mb-8">
        We&apos;ll fetch your site and look for the widget code. Make sure you&apos;ve saved and published your changes first.
      </p>

      {result?.verified && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-success/30 bg-success/5 mb-6">
          <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
          <div>
            <p className="text-fg font-semibold text-sm">Found it!</p>
            <p className="text-fg-muted text-sm">Your widget is live on {client.web_widget_domain}.</p>
          </div>
        </div>
      )}

      {result && !result.verified && (
        <div className="p-4 rounded-xl border border-danger/30 bg-danger/5 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <XCircle className="w-5 h-5 text-danger mt-0.5 shrink-0" />
            <p className="text-fg font-semibold text-sm">Widget not found yet.</p>
          </div>
          <ul className="space-y-1.5 ml-8">
            {(result.diagnostics ?? []).map((d) => (
              <li key={d} className="text-fg-muted text-sm">• {DIAGNOSTIC_LABELS[d] ?? d}</li>
            ))}
            {!result.diagnostics?.length && (
              <>
                <li className="text-fg-muted text-sm">• Did you save changes in your site editor?</li>
                <li className="text-fg-muted text-sm">• Did you publish/republish the site?</li>
                <li className="text-fg-muted text-sm">• Is the script tag inside the &lt;body&gt;?</li>
              </>
            )}
          </ul>
          {attempts >= 3 && (
            <div className="mt-4 pt-4 border-t border-danger/20">
              <a href="https://cal.com/liamclarke/install" target="_blank" rel="noopener noreferrer"
                className="text-ember text-sm font-semibold hover:underline cursor-pointer">
                Stuck? Book a free 15-min install call
              </a>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        {result?.verified ? (
          <Button type="button" onClick={() => onAdvance()} className="flex-1 justify-center">Continue</Button>
        ) : (
          <Button type="button" onClick={checkInstall} disabled={checking} className="flex-1 justify-center">
            {checking ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Checking…</> : "Check my site"}
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create StepTest.tsx**

```tsx
// src/app/(app)/onboarding/website/_components/StepTest.tsx
"use client";

import { ClientRow } from "@/lib/use-client";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetPreview } from "./WidgetPreview";

interface Props { client: ClientRow; onAdvance: () => Promise<void>; onBack: () => void; refresh: () => Promise<void>; }

export default function StepTest({ client, onAdvance, onBack }: Props) {
  return (
    <div className="pt-8 max-w-2xl">
      <h1 className="text-display-1 font-semibold text-fg mb-2">Let&apos;s run a test booking.</h1>
      <p className="text-fg-muted mb-6">
        Interact with the widget below — this is test mode, so no real bookings are created on your calendar.
      </p>

      <div className="mb-6 p-4 rounded-xl bg-bg-elevated border border-border">
        <p className="text-fg-muted text-sm font-medium mb-2">Suggested test flow:</p>
        <ol className="space-y-1 text-fg-muted text-sm list-decimal list-inside">
          <li>Click the widget launcher below.</li>
          <li>Enter &quot;Sarah&quot; and a phone number.</li>
          <li>Describe a problem like a real customer would.</li>
          <li>Pick a booking slot when offered.</li>
        </ol>
      </div>

      <WidgetPreview
        color={client.web_widget_color ?? "#E85A2C"}
        greeting={(client.web_widget_greeting ?? "Hi! How can I help?")
          .replace("{name}", "Sarah")
          .replace("{business}", client.business_name ?? "")}
        launcherLabel={client.web_widget_launcher_label ?? "Message us"}
        position={(client.web_widget_position as "bottom-right" | "bottom-left") ?? "bottom-right"}
        businessName={client.business_name ?? "Your Business"}
      />

      <div className="mt-6 flex items-start gap-3 p-4 rounded-xl border border-success/30 bg-success/5">
        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
        <p className="text-fg-muted text-sm">
          Happy with how it looks and feels? Click &quot;Go live&quot; to finish setup.
        </p>
      </div>

      <div className="flex gap-3 mt-6">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="button" onClick={() => onAdvance()} className="flex-1 justify-center">
          Go live
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/onboarding/website/_components/
git commit -m "feat(wizard): steps 7-8 (verify, test)"
```

---

## Phase 4 — API Routes

### Task 8: Wizard API routes

**Files:**
- Create: `src/app/api/onboarding/verify-install/route.ts`
- Create: `src/app/api/onboarding/site-preview/route.ts`

- [ ] **Step 1: Create verify-install route**

```typescript
// src/app/api/onboarding/verify-install/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { client_id } = await req.json();
  if (!client_id) return NextResponse.json({ verified: false, reason: "missing_client_id" }, { status: 400 });

  const { data: client } = await supabase.from("clients").select("web_widget_domain").eq("id", client_id).maybeSingle();
  if (!client?.web_widget_domain) return NextResponse.json({ verified: false, reason: "no_domain" }, { status: 400 });

  const url = client.web_widget_domain.startsWith("http")
    ? client.web_widget_domain
    : `https://${client.web_widget_domain}`;

  let html = "";
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    html = await res.text();
  } catch {
    return NextResponse.json({ verified: false, reason: "site_unreachable" });
  }

  const hasWidget = html.includes("qwikly") && html.includes(String(client_id));
  if (hasWidget) {
    await supabase.from("clients").update({
      web_widget_status: "verified",
      web_widget_verified_at: new Date().toISOString(),
    }).eq("id", client_id);
    return NextResponse.json({ verified: true });
  }

  const diagnostics: string[] = [];
  if (!html.toLowerCase().includes("qwikly")) diagnostics.push("widget_script_not_found");
  else if (!html.includes(String(client_id))) diagnostics.push("wrong_client_id");
  else diagnostics.push("script_tag_malformed");

  return NextResponse.json({ verified: false, reason: "not_found", diagnostics });
}
```

- [ ] **Step 2: Create site-preview route**

```typescript
// src/app/api/onboarding/site-preview/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ reachable: false });

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() ?? new URL(url).hostname;
    return NextResponse.json({ reachable: true, title });
  } catch {
    return NextResponse.json({ reachable: false });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/onboarding/
git commit -m "feat(api): verify-install and site-preview onboarding routes"
```

---

## Phase 5 — Dashboard Updates

### Task 9: Settings — Website Assistant tab

**Files:**
- Create: `src/app/(app)/dashboard/settings/_components/WebsiteAssistantTab.tsx`
- Modify: `src/app/(app)/dashboard/settings/page.tsx`

- [ ] **Step 1: Create WebsiteAssistantTab.tsx**

```tsx
// src/app/(app)/dashboard/settings/_components/WebsiteAssistantTab.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ClientRow } from "@/lib/use-client";
import { CheckCircle2, AlertTriangle, Copy, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
import { Input, Field, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WidgetPreview } from "@/app/(app)/onboarding/website/_components/WidgetPreview";

interface Props { client: ClientRow; onSave: () => void; }

export function WebsiteAssistantTab({ client, onSave }: Props) {
  const [color, setColor] = useState(client.web_widget_color ?? "#E85A2C");
  const [greeting, setGreeting] = useState(client.web_widget_greeting ?? "");
  const [label, setLabel] = useState(client.web_widget_launcher_label ?? "Message us");
  const [position, setPosition] = useState<"bottom-right" | "bottom-left">(
    (client.web_widget_position as "bottom-right" | "bottom-left") ?? "bottom-right"
  );
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const snippet = `<script src="https://embed.qwikly.co.za/v1/widget.js"\n        data-client="${client.id}"\n        defer></script>`;
  const status = client.web_widget_status ?? "pending";

  function copy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function save() {
    setSaving(true);
    await supabase.from("clients").update({
      web_widget_color: color,
      web_widget_greeting: greeting,
      web_widget_launcher_label: label,
      web_widget_position: position,
    }).eq("id", client.id);
    setSaving(false);
    onSave();
  }

  return (
    <div className="space-y-8">
      {/* Status */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-bg-elevated">
        {status === "verified"
          ? <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          : <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
        }
        <div className="flex-1">
          <p className="text-fg font-medium text-sm">
            {status === "verified" ? `Live on ${client.web_widget_domain}` : "Widget not verified"}
          </p>
          {client.web_widget_verified_at && (
            <p className="text-fg-muted text-xs">Verified {new Date(client.web_widget_verified_at).toLocaleDateString()}</p>
          )}
        </div>
        <Badge variant={status === "verified" ? "success" : "warning"}>
          {status === "verified" ? "Live" : "Pending"}
        </Badge>
        <a href={`/onboarding/website`} className="text-ember text-sm font-semibold hover:underline cursor-pointer">
          Setup wizard
        </a>
      </div>

      {/* Appearance */}
      <div>
        <h3 className="text-fg font-semibold text-h2 mb-4">Appearance</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Field label="Accent colour" htmlFor="wa-color">
              <div className="flex items-center gap-3">
                <input type="color" id="wa-color" value={color} onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1 font-mono" />
              </div>
            </Field>
            <Field label="Greeting message" htmlFor="wa-greeting">
              <Textarea id="wa-greeting" value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={3}
                placeholder="Hi {name}! How can I help?" />
            </Field>
            <Field label="Launcher label" htmlFor="wa-label">
              <Input id="wa-label" value={label} onChange={(e) => setLabel(e.target.value)} />
            </Field>
            <Field label="Position" htmlFor="wa-position">
              <div className="flex gap-3">
                {(["bottom-right", "bottom-left"] as const).map((p) => (
                  <button key={p} type="button" onClick={() => setPosition(p)}
                    className={`flex-1 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                      position === p ? "border-ember bg-ember/10 text-ember font-semibold" : "border-border text-fg-muted"
                    }`}>
                    {p === "bottom-right" ? "Bottom right" : "Bottom left"}
                  </button>
                ))}
              </div>
            </Field>
            <Button onClick={save} disabled={saving} className="w-full justify-center">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
            </Button>
          </div>
          <div>
            <p className="text-fg-subtle text-xs font-medium uppercase tracking-wider mb-3">Preview</p>
            <WidgetPreview color={color} greeting={greeting.replace("{name}", "Sarah").replace("{business}", client.business_name ?? "")}
              launcherLabel={label} position={position} businessName={client.business_name ?? ""} />
          </div>
        </div>
      </div>

      {/* Install snippet */}
      <div>
        <h3 className="text-fg font-semibold text-h2 mb-4">Install code</h3>
        <div className="relative bg-bg-elevated border border-border rounded-xl p-5 font-mono text-sm text-fg-muted">
          <pre className="whitespace-pre-wrap break-all">{snippet}</pre>
          <button onClick={copy}
            className="absolute top-3 right-3 flex items-center gap-1.5 bg-ember text-white text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-accent-hover transition-colors">
            {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add tab to settings/page.tsx**

In `src/app/(app)/dashboard/settings/page.tsx`:

Find the `TABS` array definition and add:
```typescript
{ id: "website", label: "Website Assistant", icon: Globe },
```

Add `Globe` to the lucide-react imports.

Add `type TabId` to include `"website"`.

Find the tab content rendering section (where `tab === "account"` etc. are checked) and add:
```tsx
{tab === "website" && client && (
  <WebsiteAssistantTab client={client} onSave={() => refresh()} />
)}
```

Add import at top:
```typescript
import { WebsiteAssistantTab } from "./_components/WebsiteAssistantTab";
import { Globe } from "lucide-react";
```

Note: `refresh` is available via `const { client, refresh } = useClient();` — confirm this hook is used and the `refresh` function is available.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/dashboard/settings/
git commit -m "feat(dashboard): Website Assistant settings tab"
```

---

### Task 10: Conversations — Web channel filter

**Files:**
- Modify: `src/app/(app)/dashboard/conversations/page.tsx`

- [ ] **Step 1: Add Web to FILTERS and Convo type**

Find `const FILTERS` in `conversations/page.tsx` and add:
```typescript
const FILTERS = [
  { id: "all",       label: "All"       },
  { id: "whatsapp",  label: "WhatsApp"  },
  { id: "email",     label: "Email"     },
  { id: "web_chat",  label: "Web"       },
  { id: "needs",     label: "Needs reply"},
];
```

Find the `Convo` interface and update:
```typescript
interface Convo {
  // ... existing fields
  channel?: "whatsapp" | "email" | "web_chat" | null;
  page_url?: string | null;
}
```

Find the filter application logic (likely a `.filter()` or Supabase `.eq()` call) and add web_chat handling:
```typescript
// In the Supabase query or filter step, when filter === "web_chat":
.eq("channel", "web_chat")
```

Find the conversation card render and add channel badge logic. After the existing WhatsApp/email badge, handle web_chat:
```tsx
{convo.channel === "web_chat" && (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400">
    <Globe className="w-2.5 h-2.5" /> Web
  </span>
)}
{convo.channel === "email" && (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400">
    <Mail className="w-2.5 h-2.5" /> Email
  </span>
)}
```

Add `Globe` to lucide-react imports.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/dashboard/conversations/
git commit -m "feat(dashboard): web_chat channel filter and badge in conversations"
```

---

### Task 11: Overview KPI — Web visitors today

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Add web visitors KPI**

In `dashboard/page.tsx`, find the existing KPI state declarations and add:
```typescript
const [webVisitorsToday, setWebVisitorsToday] = useState(0);
const [webChatsToday, setWebChatsToday] = useState(0);
```

In the `Promise.all` data fetch, add:
```typescript
supabase.from("web_widget_events")
  .select("*", { count: "exact", head: true })
  .eq("event_type", "widget_loaded")
  .gte("created_at", startDay)
  .lt("created_at", endDay),
supabase.from("conversations")
  .select("*", { count: "exact", head: true })
  .eq("channel", "web_chat")
  .gte("created_at", startDay)
  .lt("created_at", endDay),
```

Destructure results and set state:
```typescript
setWebVisitorsToday(webVisRes.count ?? 0);
setWebChatsToday(webChatRes.count ?? 0);
```

Find the KPI cards section and add a new card:
```tsx
<Card className="p-5">
  <div className="flex items-center gap-3 mb-3">
    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
      <Globe className="w-4 h-4 text-purple-400" />
    </div>
    <span className="text-fg-muted text-small font-medium">Web visitors today</span>
  </div>
  <p className="text-display-2 font-semibold text-fg">{webVisitorsToday}</p>
  <p className="text-fg-subtle text-xs mt-1">{webChatsToday} started a chat</p>
</Card>
```

Add `Globe` to lucide-react imports.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/dashboard/page.tsx
git commit -m "feat(dashboard): web visitors today KPI card"
```

---

## Phase 6 — Widget Embed Script

### Task 12: widget.js (vanilla JS, Shadow DOM)

**Files:**
- Create: `public/widget/widget.js`

- [ ] **Step 1: Create the embed widget**

```javascript
// public/widget/widget.js
(function () {
  "use strict";

  const script = document.currentScript || document.querySelector('script[data-client]');
  if (!script) return;

  const CLIENT_ID = script.getAttribute("data-client");
  if (!CLIENT_ID) return;

  const API_BASE = "https://web.qwikly.co.za";
  const EMBED_BASE = "https://embed.qwikly.co.za";

  // Respect reduced motion
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── State machine ──────────────────────────────────────────
  let state = "collapsed"; // collapsed | intake | connecting | chat | confirmed
  let branding = null;
  let conversationId = null;
  let wsToken = null;
  let ws = null;
  let visitorId = sessionStorage.getItem("qwikly_vid") || ("vid_" + Math.random().toString(36).slice(2, 14));
  sessionStorage.setItem("qwikly_vid", visitorId);

  // ── Shadow DOM container ───────────────────────────────────
  const host = document.createElement("div");
  host.id = "qwikly-widget-host";
  const shadow = host.attachShadow({ mode: "open" });
  document.body.appendChild(host);

  // Styles injected into shadow root
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    :host { all: initial; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    #launcher {
      position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
      display: flex; align-items: center; gap: 8px;
      padding: 12px 18px; border-radius: 50px;
      background: var(--q-color, #E85A2C); color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px; font-weight: 600; cursor: pointer;
      border: none; box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      transition: ${prefersReducedMotion ? "none" : "transform 0.15s ease, box-shadow 0.15s ease"};
    }
    #launcher:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(0,0,0,0.25); }
    #launcher .pulse {
      width: 8px; height: 8px; border-radius: 50%; background: #22C55E;
      animation: ${prefersReducedMotion ? "none" : "pulse 2s ease-in-out infinite"};
    }
    @keyframes pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
    #panel {
      position: fixed; bottom: 80px; right: 20px; z-index: 2147483646;
      width: 360px; max-height: 560px;
      background: white; border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      display: flex; flex-direction: column; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transform: translateY(12px); opacity: 0; pointer-events: none;
      transition: ${prefersReducedMotion ? "none" : "transform 0.2s ease, opacity 0.2s ease"};
    }
    #panel.open { transform: translateY(0); opacity: 1; pointer-events: all; }
    .header {
      padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;
      background: var(--q-color, #E85A2C); color: white;
    }
    .header-name { font-weight: 600; font-size: 14px; }
    .close-btn { background: none; border: none; color: white; cursor: pointer; padding: 4px; opacity: 0.8; }
    .close-btn:hover { opacity: 1; }
    .body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .intake-form { display: flex; flex-direction: column; gap: 12px; }
    .intake-form h3 { font-size: 15px; font-weight: 600; color: #111827; }
    .intake-form p { font-size: 12px; color: #6B7280; }
    .field label { display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px; }
    .field input { width: 100%; padding: 10px 12px; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 14px; color: #111827; outline: none; }
    .field input:focus { border-color: var(--q-color, #E85A2C); box-shadow: 0 0 0 3px rgba(232,90,44,0.1); }
    .submit-btn {
      width: 100%; padding: 12px; border: none; border-radius: 8px;
      background: var(--q-color, #E85A2C); color: white; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: opacity 0.15s;
    }
    .submit-btn:hover { opacity: 0.9; }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .popia { font-size: 11px; color: #9CA3AF; text-align: center; line-height: 1.4; }
    .msg { max-width: 80%; padding: 10px 14px; border-radius: 16px; font-size: 13px; line-height: 1.5; }
    .msg.bot { background: #F3F4F6; color: #111827; border-radius: 16px 16px 16px 4px; align-self: flex-start; }
    .msg.user { background: var(--q-color, #E85A2C); color: white; border-radius: 16px 16px 4px 16px; align-self: flex-end; }
    .chat-input-row { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #F3F4F6; }
    .chat-input { flex: 1; padding: 10px 12px; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 13px; outline: none; resize: none; }
    .chat-input:focus { border-color: var(--q-color, #E85A2C); }
    .send-btn { padding: 10px 14px; border: none; border-radius: 8px; background: var(--q-color, #E85A2C); color: white; cursor: pointer; font-size: 13px; font-weight: 600; }
    .footer { text-align: center; padding: 8px; font-size: 10px; color: #D1D5DB; border-top: 1px solid #F9FAFB; }
    @media (max-width: 480px) {
      #panel { left: 8px; right: 8px; width: auto; bottom: 70px; }
    }
  `;
  shadow.appendChild(styleEl);

  // ── DOM elements ───────────────────────────────────────────
  const launcher = document.createElement("button");
  launcher.id = "launcher";
  launcher.setAttribute("aria-label", "Open chat");

  const panel = document.createElement("div");
  panel.id = "panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");

  shadow.appendChild(launcher);
  shadow.appendChild(panel);

  // ── Helpers ────────────────────────────────────────────────
  function applyBranding(b) {
    branding = b;
    shadow.host.style.setProperty("--q-color", b.color || "#E85A2C");
    launcher.innerHTML = `<span class="pulse"></span><span>${b.launcher_label || "Message us"}</span>`;
    if (b.position === "bottom-left") {
      launcher.style.left = "20px"; launcher.style.right = "auto";
      panel.style.left = "20px"; panel.style.right = "auto";
    }
  }

  function renderIntake() {
    state = "intake";
    panel.innerHTML = `
      <div class="header">
        <span class="header-name">${branding?.name || "Assistant"}</span>
        <button class="close-btn" id="qw-close" aria-label="Close">✕</button>
      </div>
      <div class="body">
        <div class="intake-form">
          <h3>👋 Hi there!</h3>
          <p>${branding?.greeting || "What can we help you with today?"}</p>
          <div class="field"><label for="qw-name">Your name</label><input id="qw-name" type="text" placeholder="Sarah" autocomplete="given-name" /></div>
          <div class="field"><label for="qw-phone">Phone number</label><input id="qw-phone" type="tel" placeholder="082 555 4193" autocomplete="tel" /></div>
          <button class="submit-btn" id="qw-start">Start conversation</button>
          <p class="popia">By continuing you agree to our privacy policy. We don't sell your data.</p>
        </div>
      </div>
      <div class="footer">Powered by Qwikly</div>`;
    shadow.getElementById("qw-close").addEventListener("click", closePanel);
    shadow.getElementById("qw-start").addEventListener("click", submitIntake);
  }

  function renderChat(messages = []) {
    state = "chat";
    panel.innerHTML = `
      <div class="header">
        <span class="header-name">${branding?.name || "Assistant"}</span>
        <button class="close-btn" id="qw-close" aria-label="Close">✕</button>
      </div>
      <div class="body" id="qw-messages"></div>
      <div class="chat-input-row">
        <textarea class="chat-input" id="qw-input" placeholder="Type a message…" rows="1"></textarea>
        <button class="send-btn" id="qw-send">Send</button>
      </div>
      <div class="footer">Powered by Qwikly</div>`;
    shadow.getElementById("qw-close").addEventListener("click", closePanel);
    shadow.getElementById("qw-send").addEventListener("click", sendMessage);
    shadow.getElementById("qw-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    messages.forEach((m) => appendMessage(m.role, m.content));
    connectWs();
  }

  function appendMessage(role, content) {
    const msgs = shadow.getElementById("qw-messages");
    if (!msgs) return;
    const div = document.createElement("div");
    div.className = `msg ${role === "user" ? "user" : "bot"}`;
    div.textContent = content;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  // ── Actions ────────────────────────────────────────────────
  async function submitIntake() {
    const name = shadow.getElementById("qw-name")?.value?.trim();
    const phone = shadow.getElementById("qw-phone")?.value?.trim();
    if (!name || !phone) return;
    const btn = shadow.getElementById("qw-start");
    if (btn) btn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/web/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          name,
          phone,
          visitor_id: visitorId,
          page_url: location.href,
          referrer: document.referrer,
        }),
      });
      const data = await res.json();
      if (!res.ok) { if (btn) btn.disabled = false; return; }
      conversationId = data.conversation_id;
      wsToken = data.ws_token;
      if (data.client_branding) applyBranding(data.client_branding);
      renderChat([{ role: "assistant", content: branding?.greeting || "Hi! How can I help?" }]);
    } catch {
      if (btn) btn.disabled = false;
    }
  }

  function sendMessage() {
    const input = shadow.getElementById("qw-input");
    const text = input?.value?.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
    appendMessage("user", text);
    ws.send(JSON.stringify({ type: "message", content: text }));
    if (input) input.value = "";
  }

  function connectWs() {
    if (!wsToken || !conversationId) return;
    const url = `${API_BASE.replace("https://", "wss://").replace("http://", "ws://")}/web/chat/${conversationId}`;
    ws = new WebSocket(url);
    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ type: "auth", token: wsToken }));
    });
    ws.addEventListener("message", (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "message") appendMessage("assistant", msg.content);
      } catch {}
    });
    let reconnectDelay = 1000;
    ws.addEventListener("close", () => {
      setTimeout(() => connectWs(), Math.min(reconnectDelay, 16000));
      reconnectDelay *= 2;
    });
  }

  function openPanel() {
    panel.classList.add("open");
    if (state === "collapsed") renderIntake();
    fireEvent("launcher_opened");
  }

  function closePanel() {
    panel.classList.remove("open");
    state = "collapsed";
  }

  function fireEvent(type) {
    fetch(`${API_BASE}/web/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CLIENT_ID, visitor_id: visitorId, event_type: type, page_url: location.href }),
    }).catch(() => {});
  }

  // ── Init ───────────────────────────────────────────────────
  async function init() {
    // Load branding
    try {
      const res = await fetch(`${API_BASE}/web/branding/${CLIENT_ID}`);
      if (res.ok) applyBranding(await res.json());
    } catch {}

    // Default launcher if branding failed
    if (!branding) {
      launcher.innerHTML = `<span class="pulse"></span><span>Message us</span>`;
    }

    launcher.addEventListener("click", openPanel);
    fireEvent("widget_loaded");
  }

  // ── Public API ─────────────────────────────────────────────
  window.Qwikly = {
    open: openPanel,
    close: closePanel,
    identify: (info) => {
      if (info.name) { const el = shadow.getElementById("qw-name"); if (el) el.value = info.name; }
    },
    on: (event, cb) => { document.addEventListener(`qwikly:${event}`, (e) => cb(e.detail)); },
  };

  init();
})();
```

- [ ] **Step 2: Commit**

```bash
git add public/widget/widget.js
git commit -m "feat(widget): vanilla JS Shadow DOM embed widget"
```

---

## Phase 7 — Backend Stub (qwikly-web)

> **Note:** `qwikly-web` is a new FastAPI repo at `~/qwikly-web/`. The frontend already calls `https://web.qwikly.co.za` — see the code stubs in SECTION 11 of the original build spec. This backend is deployed separately on Railway and is out of scope for this plan document. Create a separate plan: `2026-04-29-qwikly-web-backend.md` following the same structure.
>
> Key endpoints needed before widget goes live:
> - `POST /web/intake` — validates and creates conversation
> - `WSS /web/chat/{id}` — real-time messaging
> - `POST /web/event` — analytics fire-and-forget
> - `GET /web/branding/{client_id}` — widget loads branding on init
>
> The code stubs in the spec are production-ready. Copy them as the starting point.

---

## Definition of Done Checklist

```
Marketing
- [ ] /connect-your-website page live with hero, how-it-works, comparison, FAQ, CTA
- [ ] Homepage has ConnectYourWebsiteSection between how-it-works and pricing
- [ ] Navbar includes "For your website" link
- [ ] SEO metadata updated on layout.tsx

Wizard
- [ ] All 8 steps render correctly
- [ ] Progress bar reflects current step
- [ ] "Save & continue later" persists state and redirects to dashboard
- [ ] Live widget preview updates in real time (steps 3+)
- [ ] Step 7 verify-install calls API and shows diagnostic on failure
- [ ] Completing step 8 sets onboarding_completed_at and redirects with ?welcome=true

Dashboard
- [ ] Settings has "Website Assistant" tab with appearance editor and install snippet
- [ ] Conversations has Web filter and shows Web badge on web_chat convos
- [ ] Overview shows "Web visitors today" KPI card
- [ ] Onboarding wizard accessible at /onboarding/website

Widget
- [ ] widget.js loads from /widget/widget.js
- [ ] Shadow DOM prevents host CSS bleed
- [ ] Per-client theming applied at runtime from branding endpoint
- [ ] Launcher opens intake form, then transitions to chat
- [ ] WSS connects and reconnects on drop
- [ ] window.Qwikly public API works (open, close, identify, on)
- [ ] Respects prefers-reduced-motion
- [ ] Mobile: full-width minus 8px gutters on <480px

Backend (separate plan)
- [ ] qwikly-web deployed to Railway at web.qwikly.co.za
- [ ] widget.js served via CDN at embed.qwikly.co.za/v1/widget.js
```
