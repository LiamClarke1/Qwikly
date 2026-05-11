# Terminal 4 — Design / UX / Live Site Polish

You are working in `~/qwikly-site/.worktrees/design` on branch `fix/design-polish`.

**First command after starting Claude Code in this terminal:**
```
cd ~/qwikly-site/.worktrees/design && pwd && git branch --show-current
```

**Confirm:** branch should say `fix/design-polish`. If not, STOP.

---

## Your scope

Public marketing site, conversion polish, OG/SEO metadata, status page truthfulness.
Audit findings #19-#27 from supervisor.

## Brand rules (memory)

- NEVER use the words "AI" or "bot" anywhere on the site. Use "digital assistant" or "digital system".
- NEVER use em dash or hyphen as a separator in copy. Use commas.
- Match the existing landing page design language. Don't introduce new fonts or
  competing color palettes.
- Closing CTA questions in any chat copy MUST be wrapped in **bold**.

## Files you own

- Everything under `src/app/(landing)/**`
- `src/app/layout.tsx` (ONLY the `metadata` export — Terminal 2 owns headers, Terminal 3 owns error boundaries)
- `public/og-image.*` (create — match brand)
- `src/components/landing/**` (if it exists, otherwise components used only by landing)

## Files you must NOT touch

- `src/app/api/**` — Terminals 2 & 3
- `src/app/(app)/**` — Terminal 3
- `public/embed.js` — Terminal 2
- `next.config.mjs` — Terminals 2 & 3
- Any migration files
- `src/middleware.ts`

## Tasks (in order — design tasks can be reviewed visually so commit often)

### T4.1 — Footer email
Find `clarkeagency1@outlook.com` in the footer (likely
`src/components/landing/Footer.tsx` or similar). Replace with `hello@qwikly.co.za`.
Add a TODO comment referencing the need to set up a forwarding rule on the domain MX.

### T4.2 — OG image + metadata
File: `src/app/layout.tsx`, `metadata` export. Add:
```ts
openGraph: {
  title: 'Qwikly — Never miss a lead again',
  description: '...',
  url: 'https://www.qwikly.co.za',
  siteName: 'Qwikly',
  images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  locale: 'en_ZA',
  type: 'website',
},
twitter: {
  card: 'summary_large_image',
  title: 'Qwikly — Never miss a lead again',
  images: ['/og-image.png'],
},
```
Generate an `/og-image.png` (1200x630) using the brand colors and font. If you can't
generate an image, create an SVG and convert via a script in `scripts/`. Worst case
leave a placeholder PNG and note in STATUS.md that the design needs a final image.

### T4.3 — Hero CTA hierarchy
Currently "Start Free Trial" and "See how it works" both look equal. Make:
- "Start Free Trial" → primary, filled, larger
- "See how it works" → ghost / outline, secondary

Do NOT change the copy.

### T4.4 — Industry list
The list of 32 business categories renders twice on the homepage. Inspect the
component — if it's a marquee that loops via duplication that's intentional, add
a comment explaining. If it's an accidental duplicate, remove the second render.

### T4.5 — Social proof section
Add a new section between hero and "How it works" with:
- Heading: "Trusted by service businesses across South Africa"
- A row of 5-6 logo placeholders (use grayscale SVG silhouettes for now — supervisor will swap real ones)
- One testimonial card (placeholder copy with a clear `{TESTIMONIAL_PLACEHOLDER}` marker so supervisor can replace)

Match existing section padding and max-width.

### T4.6 — Contact page IS the demo
File: probably `src/app/(landing)/contact/page.tsx`. Currently just an email link.
Embed the actual Qwikly chat widget on this page (it's the product — let it sell
itself). The widget should auto-open after 2 seconds with a greeting like
"Got a question about Qwikly? Ask away."

The widget is at `/embed.js`. You can include it the same way customers do:
```html
<script src="/embed.js" data-tenant="<qwikly_own_tenant_id>" async></script>
```
(Tenant ID for Qwikly's own account is the one Terminal 3 is moving to env var
`QWIKLY_OWNER_CLIENT_ID`. Coordinate via STATUS.md if blocked.)

### T4.7 — Status page wired to real health
File: `src/app/(landing)/status/page.tsx`. Currently static. Make it a server
component that fetches `/api/health` and renders real uptime + last incident.
If `/api/health` doesn't return everything you need, write a stub that returns
`{ status: 'operational', last_checked: <iso>, components: {...} }` and Terminal 3
can flesh it out later (note in STATUS.md).

### T4.8 — Pricing topup row
File: probably `src/app/(landing)/pricing/page.tsx`. The pricing comparison table
currently doesn't show the R20/lead topup option that's mentioned in body copy.
Add it as a row below the tier comparison: "Extra leads beyond plan: R20/lead".

### T4.9 — Mobile mockup in hero
Replace or augment the current chat widget mockup with a phone-frame mockup showing
the widget embedded on a typical SA service business site (gym/salon/mechanic).
SVG phone frame is fine. The point is to show the widget IN CONTEXT, not floating
in space.

If this is a heavy lift, do a simpler version: just wrap the existing chat mockup
in a phone-frame border. Don't ship something that looks worse than current.

---

## Visual verification
After each visual change, start the dev server in your worktree:
```
npm run dev -- --port 3457
```
(Use port 3457 to avoid clashing with Terminals 1/3 on 3000/3456.)
Open http://localhost:3457 and check the change in browser. Verify mobile (375px),
tablet (768px), desktop (1440px). Don't claim done without looking.

## Definition of done per task
1. Implemented + visually verified in dev server.
2. Tick STATUS.md, add timestamp.
3. Commit with `design: T4.X - <one line>`.

## When all tasks done
Update STATUS.md to `READY FOR REVIEW`. Do not push or PR. Wait for supervisor.

## If stuck
Add `**Blockers:**` to your STATUS.md section and stop.
