# Adaptive Onboarding Remodel, Design Spec

**Date:** 2026-05-06
**Author:** Claude + Liam
**Status:** Draft, awaiting review
**Scope:** Phase 1 of 3, the onboarding wizard and the business profile it produces

---

## Why this spec exists

Qwikly today captures roughly 40% of what a real adaptive digital assistant needs to know about a business before going live. The current 5-step wizard stops at name, industry, colour, greeting, and three qualifying questions, with the most important assistant configuration paywalled behind Premium. Industry-specific greetings and questions are hardcoded into [src/app/(app)/onboarding/website/_components/StepAssistant.tsx:14-49](src/app/%28app%29/onboarding/website/_components/StepAssistant.tsx#L14-L49) as `INDUSTRY_GREETINGS` and `INDUSTRY_QUESTIONS` lookup tables.

That hardcoded approach is the explicit failure mode Liam wants removed. Qwikly cannot be a templates-per-industry engine. It must be a single adaptive assistant that learns each business individually during onboarding and reasons live in conversation from that profile.

This spec covers Phase 1: rebuild the onboarding wizard so it captures a profile rich enough to feed adaptive reasoning. Phases 2 and 3 (the runtime reasoning engine and the continuous learning loop) are scoped in separate specs.

---

## Outcome

After onboarding, every business has a structured `business_profile` record that includes:

1. **Identity:** business, industry, areas served, contact channels (auto-populated from a website scrape, edited by the owner)
2. **Services:** what they sell, with optional details on lead time, pricing model, and information needed before quoting
3. **Qualification rules:** disqualifiers, must-capture info per service, urgency definitions
4. **Voice:** tone preset, vocabulary, never-say list
5. **Handoff:** notification channels, urgency routing, business hours, after-hours behaviour

The wizard takes about 10 minutes for a typical business. The scraper does most of the typing, the owner edits and confirms.

The Premium paywall on assistant configuration is removed. Every plan gets a properly configured assistant. Premium tiers gain limits-based features (volume, advanced integrations, multiple users) instead of gating the core experience.

---

## The 7 steps

### Step 1, Connect your website

**Goal:** scrape the business's site so subsequent steps can be pre-filled.

**Input:** website URL.

**Behaviour:**
- On submit, hand the URL to the existing crawler at [src/lib/knowledge/crawl.ts](src/lib/knowledge/crawl.ts)
- Show live progress: "Reading your homepage… reading your services page… reading your contact page"
- When done, show a summary card: "Here's what I learned about your business" with detected business name, services list, areas served, contact channels, hours
- "Looks right" button advances to Step 2 with extracted data prefilled
- "Some of this is wrong" button still advances, but flags fields for the owner to fix on Step 2

**Edge cases:**
- Site is unreachable or scrape fails: surface a clear error, offer "Skip and fill in manually" path
- Site is JS-only and Jina returns thin content: fall back to manual fill but keep the URL in the profile for later re-scrape
- Owner has no website yet: skip-link option captured as a flag on the profile

**Storage:** scrape stored in `knowledge_sources` and `knowledge_chunks` (existing tables). Extracted summary stored in new `business_profile.scrape_summary` JSONB column.

---

### Step 2, Confirm your business

**Goal:** owner confirms or edits the basics extracted from the scrape.

**Fields, all pre-filled from scrape where possible:**
- Business name
- One-line "what you do" summary
- Industry (free text + suggestion from existing dropdown)
- Areas served (multi-input chips)
- Public contact channels (phone, email, WhatsApp, address)

**Validation:** business name required. Everything else optional but nudged.

**Storage:** `clients.business_name`, `clients.industry` (existing), plus new `business_profile.summary`, `business_profile.areas_served`, `business_profile.public_contacts`.

---

### Step 3, What you sell

**Goal:** capture a structured services list. This is what Qwikly uses to identify intent in live conversations.

**UI:** card list of services pre-filled from the scrape. Each service card has:

- Name (e.g. "Geyser repair")
- Optional one-liner description
- Optional collapsed advanced section with:
  - Typical lead time (free text, e.g. "2 hours for emergencies, 1-2 days for standard")
  - Pricing model (callout fee, hourly, quote on inspection, fixed price, etc.)
  - Information needed before quoting (free text, e.g. "address, photo of the leak, geyser brand and model")

**Behaviour:**
- Add, edit, reorder, remove services
- "Generate suggestions from my website" re-runs scrape extraction targeted at services
- At least one service required to advance

**Storage:** new table `business_services` with foreign key to `clients.id`. Columns: `name`, `description`, `lead_time`, `pricing_model`, `info_required` (text), `display_order`.

---

### Step 4, How you qualify a lead

**Goal:** capture the rules a real receptionist follows. This is what makes Qwikly *qualify* visitors, not just chat with them.

**Three sub-sections:**

**4a. Disqualifiers** (when to politely decline a lead)
Examples shown to inspire: "out of our service area", "needs work we don't do", "budget too low for our minimum job".
UI: text area with chip-style entries, one per line.

**4b. Must-capture information** (what every lead must provide before booking)
Pre-filled with sensible defaults (name, contact number, what they need help with). Owner adds industry-specific items: ID number, address, photos, medical aid, insurance details, proof of income, etc.
UI: editable list with toggle for "required" vs "optional" per item.

**4c. Urgency definitions** (what makes a lead urgent vs standard vs browsing)
Three free-text boxes:
- "Urgent for us means..." (e.g. "burst pipe, no electricity, severe pain, after-hours emergency")
- "Standard means..." (e.g. "needs work but can wait a day or two")
- "Just browsing means..." (e.g. "wants a quote, no specific timeline")

**Storage:** new `business_profile.qualification` JSONB with shape `{ disqualifiers: string[], must_capture: { name: string, required: boolean }[], urgency: { urgent: string, standard: string, browsing: string } }`.

---

### Step 5, Voice and personality

**Goal:** teach Qwikly how to *sound* like this business.

**Fields:**

- **Tone preset:** four options shown as cards with sample dialogue: Warm (friendly, relaxed), Direct (efficient, no-fluff), Playful (informal, light humour), Formal (polished, professional). Default selected based on industry (medical = formal, plumber = direct, salon = warm, etc.) but freely editable.
- **Greeting message:** pre-filled from a generation step that uses the scraped data + chosen tone, fully editable. No more `INDUSTRY_GREETINGS` lookup.
- **Industry vocabulary:** chips of terms detected from the scrape ("DB board", "geyser drip tray", "frown lines", "rim lock"), editable. Used to make Qwikly speak the same language as the visitor.
- **Never-say list:** owner adds things Qwikly must avoid. Pre-filled defaults by category: legal practices get "never give legal advice", medical practices get "never diagnose", contractors get "never quote without inspection". Editable.

**Storage:** new `business_profile.voice` JSONB with shape `{ tone: 'warm' | 'direct' | 'playful' | 'formal', greeting: string, vocabulary: string[], never_say: string[] }`.

---

### Step 6, Handoff and notifications

**Goal:** define where leads go and how urgent leads are routed differently from standard ones.

**Sub-sections:**

**6a. Where leads go**
- Email (default, pre-filled from Step 2)
- WhatsApp number (optional, with format validation for SA numbers)
- Calendar booking link (Calendly, Google Calendar, or custom URL)
- CRM webhook (Premium tier feature, deferred to phase 2)

Multiple channels allowed. Owner picks which is primary.

**6b. Urgency routing**
For each urgency level (urgent / standard / browsing), owner picks:
- "Notify me immediately" (push, SMS, WhatsApp ping, email)
- "Add to queue for later"
- "Auto-schedule into my calendar"

Default sensible mapping: urgent = phone/SMS, standard = email, browsing = email digest.

**6c. Business hours**
- Days and hours open
- After-hours behaviour: "tell visitor we'll respond by [next open slot]" or "still capture lead silently" or "ask if it's urgent enough to call mobile"

**Storage:** new `business_profile.handoff` JSONB. Shape detailed in the schema section below.

---

### Step 7, Install and test

**Goal:** owner sees Qwikly working with their actual setup before going live.

**Two panels:**

**7a. Install snippet**
The existing embed code from [StepInstall.tsx](src/app/%28app%29/onboarding/website/_components/StepInstall.tsx), plus widget-detection polling.

**7b. Test simulator**
A chat panel that lets the owner type as a visitor would. Qwikly responds using the full profile they just configured. After the test conversation:
- Show what was captured (which fields populated, urgency tag assigned, where the lead would have been routed)
- Owner can flag "Qwikly missed this" or "Qwikly asked something it didn't need to" → those flags become continuous-learning input for Phase 3
- "Looks great, go live" button completes onboarding

**Storage:** test conversations saved to existing `conversations` and `messages` tables with a `is_test = true` flag. Continuous-learning flags stored in new `profile_feedback` table for Phase 3 consumption.

---

## Database changes

### New table: `business_profile`

One row per business. Stores everything the wizard captures that doesn't fit existing columns.

```sql
CREATE TABLE business_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  summary TEXT,
  areas_served TEXT[],
  public_contacts JSONB,
  scrape_summary JSONB,
  qualification JSONB,
  voice JSONB,
  handoff JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New table: `business_services`

Replaces the loose "services" mention in the scrape. Structured for Qwikly to reason about.

```sql
CREATE TABLE business_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  lead_time TEXT,
  pricing_model TEXT,
  info_required TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON business_services (client_id, display_order);
```

### New table: `profile_feedback`

For Phase 3 continuous learning. Created now to land the test simulator's flag mechanism.

```sql
CREATE TABLE profile_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  type TEXT NOT NULL CHECK (type IN ('missed', 'overasked', 'wrong_tone', 'other')),
  note TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Existing `clients` table changes

Add:
- `onboarding_step` already exists, but bump default and update logic to 7 steps
- `onboarding_skipped_website` BOOLEAN DEFAULT FALSE (for owners with no site)

Remove (deprecated, kept for one release for backwards compat):
- `web_widget_greeting` → moved to `business_profile.voice.greeting`
- `faq` → replaced by structured services + qualification

Migration writes existing `web_widget_greeting` and `faq` into `business_profile.voice` and `business_profile.qualification` respectively.

---

## Backend changes

### Server actions

Replace [src/app/(app)/onboarding/website/actions.ts](src/app/%28app%29/onboarding/website/actions.ts) with one action per step:

- `saveStep1Website(url)` → kicks off async crawl, returns scrape_summary
- `saveStep2Business(data)` → updates clients + business_profile.summary
- `saveStep3Services(services[])` → upserts business_services
- `saveStep4Qualification(rules)` → updates business_profile.qualification
- `saveStep5Voice(voice)` → updates business_profile.voice
- `saveStep6Handoff(handoff)` → updates business_profile.handoff
- `completeOnboarding()` → flips onboarding_complete, schedules welcome email

Each action validates input and returns `{ ok: true }` or `{ ok: false, error }`.

### Pre-fill generation

New endpoint: `POST /api/onboarding/extract` that takes a `client_id` and returns:
```ts
{
  business_name?: string;
  industry_guess?: string;
  one_liner?: string;
  areas_served?: string[];
  public_contacts?: { phone?, email?, whatsapp?, address? };
  services?: { name, description? }[];
  vocabulary?: string[];
  hours?: { day, open, close }[];
}
```

Implementation reads from `knowledge_chunks` (the scraped site content) and uses Anthropic Claude Sonnet 4.6 with a structured-output schema to extract fields in one pass. The same call also detects industry-specific vocabulary (e.g. "DB board", "geyser drip tray") for Step 5. This is the "magic" of Step 1, the owner pastes a URL and 30 seconds later sees their business correctly described.

### Test simulator endpoint

New endpoint: `POST /api/onboarding/test-message` that runs the existing chat pipeline against the in-progress profile (not yet committed live), returns assistant reply + a "what was captured" payload.

---

## Frontend changes

### Wizard shell update

[WizardShell.tsx:15-21](src/app/%28app%29/onboarding/website/_components/WizardShell.tsx#L15-L21) hardcodes `STEP_LABELS`. Update for new 7-step flow:

```ts
const STEP_LABELS = [
  "Connect your website",
  "Confirm your business",
  "What you sell",
  "How you qualify a lead",
  "Voice and personality",
  "Handoff and notifications",
  "Install and test",
];
```

### Step components, all new or rewritten

- `StepWebsite.tsx` (rewrite, was orphaned, now Step 1)
- `StepBusiness.tsx` (rewrite, now Step 2 with pre-fill)
- `StepServices.tsx` (new, Step 3)
- `StepQualification.tsx` (new, Step 4)
- `StepVoice.tsx` (new, Step 5)
- `StepHandoff.tsx` (new, Step 6, partly reuses StepHours.tsx and StepCalendar.tsx)
- `StepInstallTest.tsx` (new, merges StepInstall.tsx + new test simulator)

Delete: `StepAssistant.tsx`, `StepCustomise.tsx`, `StepVerify.tsx`, `StepWelcome.tsx`. Logic absorbed into the new flow. The hardcoded `INDUSTRY_GREETINGS` and `INDUSTRY_QUESTIONS` lookup tables are removed entirely.

### Page wiring

[src/app/(app)/onboarding/website/page.tsx:17-23](src/app/%28app%29/onboarding/website/page.tsx#L17-L23) updates the STEPS array.

### Billing

Billing moves out of the wizard. Separate `/onboarding/billing` page reached after the test step, optional (trial users can skip).

---

## What stays the same

- `clients` table primary keys, RLS policies, auth flow
- Knowledge base infrastructure (`knowledge_sources`, `knowledge_chunks`, embeddings)
- Widget embed snippet and detection polling
- Conversation, message, and lead pipeline (Phase 2 work touches this, not Phase 1)

---

## What's intentionally NOT in this spec

To keep Phase 1 focused, the following are deferred to follow-up specs:

- **Live reasoning engine (Phase 2):** the runtime that consumes `business_profile` and reasons in real time. The wizard *captures* the profile; the engine *uses* it. Currently the chat assistant uses the simple `web_widget_greeting` and `faq` fields. Phase 2 rewrites the runtime to consume the full profile.
- **Continuous learning loop (Phase 3):** the system that watches live conversations, surfaces gaps, and asks owners "should I have said X here?" The `profile_feedback` table lands now to capture test-simulator flags, but the active learning UI is Phase 3.
- **Premium tier reshuffle:** removing the paywall on assistant config means Premium tiers need new value drivers (advanced integrations, multi-user, higher conversation limits). Pricing/tier redesign is a separate workstream owned by Liam.
- **Multi-language support:** English only for v1.

---

## Risks and open questions

1. **Migration of existing customers.** Customers with onboarding_complete = true have data in the old shape (`web_widget_greeting`, `faq`). Migration script writes that data into the new `business_profile` shape. Existing widgets continue to work because Phase 2 isn't shipped yet. Risk: low.

2. **Pre-fill quality from scrape.** Some sites are sparse and the LLM extractor will return thin output. Acceptable: every field is editable. Worst case the wizard feels manual, not auto.

3. **Wizard length.** 7 steps is at the upper limit before drop-off. Mitigation: Step 1 is one click, Steps 2 and 3 are mostly confirming pre-filled data, Steps 4-6 are the real work, Step 7 feels rewarding because the owner sees Qwikly speak with their voice.

4. **Removing the Premium paywall on assistant config.** This is a pricing decision with revenue implications. Spec assumes Liam is OK with it given the strategic importance of every customer having a properly configured assistant. If not, paywall logic stays but the gated fields shrink to "advanced" features only (e.g. multiple custom personas per service).

5. **Orphan step components.** Files like `StepCalendar.tsx`, `StepHours.tsx`, `StepCustomise.tsx`, `StepVerify.tsx`, `StepTest.tsx`, `StepWebsite.tsx` exist but aren't wired up. We absorb what's useful, delete the rest in this PR.

---

## Testing approach

- **Unit tests:** server actions, the `/api/onboarding/extract` endpoint with fixture HTML inputs, the test-message endpoint
- **Integration test:** full wizard run-through with a known fixture site (e.g. a sample plumber landing page), asserting the resulting `business_profile` shape
- **Manual QA checklist:** included in the implementation plan, covers all 7 steps, error states, mobile responsiveness, the migration path for existing customers
- **No E2E tests for the test simulator** since it touches the live chat pipeline; manual QA only for v1

---

## Acceptance criteria

A new business signing up:
1. Lands on Step 1 (website URL) within 5 seconds of completing signup
2. Sees scraped data populate Step 2 within 30 seconds
3. Can complete all 7 steps in 8-12 minutes for a typical SMB
4. Has a complete `business_profile` row + `business_services` rows after Step 7
5. Can run a test conversation in Step 7. For Phase 1, the simulator wraps the existing chat runtime and injects the new profile fields (voice tone, vocabulary, never-say list, qualification rules, services list) into the system prompt as additional context. Full Phase 2 runtime adoption replaces this wrapper.
6. Embed snippet works and the widget appears on their site

An existing business at migration:
1. Has data migrated into `business_profile` and `business_services` automatically
2. Sees no breakage in their live widget
3. Can re-enter the wizard to fill in new fields (Steps 4-6 in particular) without losing existing data

---

## Out of scope for this PR

- Phase 2 runtime changes
- Phase 3 continuous learning UI
- Pricing tier redesign
- New marketing pages explaining the new onboarding
- Multi-language

---

## Implementation phasing within Phase 1

To keep PRs reviewable, this Phase 1 ships in 4 sub-phases:

**1.1 Database + server actions**
Migration, new tables, new server actions, extraction endpoint. No UI changes. Existing wizard still works.

**1.2 Steps 1-3 UI**
Website connect, business confirm, services list. Wired to new server actions. Uses old steps for 4-7 still.

**1.3 Steps 4-6 UI**
Qualification, voice, handoff. Old StepAssistant retired in this sub-phase.

**1.4 Step 7 + cleanup**
Install + test simulator. Old install/welcome retired. Orphan components deleted. Migration runs for existing customers.

Each sub-phase is its own PR.
