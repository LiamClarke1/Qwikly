# Install Checklist — Getting Qwikly Live on a Customer's Site

**Time to complete:** 5 minutes, usually less.
**Tools you need:** Their site login, or screen share via Zoom/Google Meet.
**Their embed snippet:** Generate it from the Qwikly dashboard, then copy it.

---

## STEP 1 — Generate the Snippet

Log into the Qwikly dashboard as an admin. Go to the customer's account and navigate to Settings, then Web Widget. Their unique snippet looks like this:

```html
<script src="https://embed.qwikly.co.za/v1/widget.js"
        data-client="qw_XXXXXXXXXXXXXXXX"
        data-position="bottom-right"
        defer></script>
```

Copy it to your clipboard. Keep it on screen.

---

## STEP 2 — Paste by Platform

### WordPress

1. Log in to their WordPress admin at yourdomain.co.za/wp-admin
2. Go to **Appearance → Theme File Editor** (or use a plugin like **Insert Headers and Footers**)
3. If using Theme File Editor: find `footer.php`, paste the snippet just before `</body>`, save
4. If using **Insert Headers and Footers** plugin (recommended, safer): paste snippet in the "Scripts in Footer" box, save
5. Clear any caching plugin (WP Rocket, W3 Total Cache, LiteSpeed) — go to the plugin and click "Clear Cache"

---

### Wix

1. Log in to their Wix account at manage.wix.com
2. Click **Edit Site** on their site
3. In the editor, go to **Settings → Custom Code**
4. Click **Add Custom Code**
5. Paste the snippet
6. Set it to load in the **Body, End of body**
7. Apply to **All Pages**
8. Click **Apply**, then **Publish** the site

---

### Squarespace

1. Log in to their Squarespace account
2. Go to **Settings → Advanced → Code Injection**
3. Paste the snippet in the **Footer** section
4. Click **Save**
5. The site updates immediately, no separate publish step needed

---

### Shopify

1. Log in to their Shopify admin
2. Go to **Online Store → Themes**
3. Click **Actions → Edit Code** on the live theme
4. In the left panel, find and open `layout/theme.liquid`
5. Paste the snippet just before `</body>` (near the bottom of the file)
6. Click **Save**

---

### Custom HTML / Webflow / Raw Site

1. Open the main HTML file or the page template (whichever wraps every page)
2. Find `</body>` near the bottom
3. Paste the snippet directly above it
4. Save and deploy as normal

---

### "I Don't Have Site Access" — Plan B

Ask them to forward the site login to your email. Most platforms email a magic link or they can create a temporary editor account. Do not ask them to paste it themselves unless they're comfortable with code — it is faster and less error-prone to do it yourself.

If they're on a platform managed by a third-party web developer, ask for the developer's contact and offer to send the snippet directly to the developer with instructions. One email with the snippet and four sentences of context is usually enough.

---

## STEP 3 — Common Gotchas

| Issue | What to check |
|---|---|
| Widget doesn't appear after install | Clear the site cache first. On Wix and Squarespace, hard refresh (Ctrl+Shift+R / Cmd+Shift+R) and check incognito. |
| Widget appears but doesn't open | Check browser console for CSP (Content Security Policy) errors. The snippet loads from `embed.qwikly.co.za` — their CSP must allow it. |
| Widget loads but won't connect (spinner stuck) | Check their domain whitelist in Qwikly dashboard Settings → Web Widget → Allowed domain. Confirm it matches their actual domain exactly, without a trailing slash. |
| Cookie consent banner blocking widget | Most POPIA/GDPR banners don't block widgets, but some aggressive setups do. Ask them to whitelist `embed.qwikly.co.za` in their cookie banner settings. |
| Widget shows on some pages but not others | If installed in a page-specific section rather than a global footer or theme file, it will only show on that page. Re-install in the global location. |
| Two chat widgets showing (theirs + Qwikly) | They may have an existing Tawk.to, Crisp, or Intercom widget. They need to decide which one to keep. Removing their existing one is their call, not yours. |
| Widget looks broken on mobile | Usually a z-index conflict with their site header. Send a screenshot to support@qwikly.co.za with the URL and they'll fix it within 24h. |

---

## STEP 4 — Test Sequence

Run this every time, even if you're confident the install worked.

1. **Open their site in a fresh incognito window** (Chrome: Ctrl+Shift+N / Cmd+Shift+N)
2. **Confirm the Qwikly launcher appears** in the bottom-right corner. It should be a pill button labelled "Message us" with a green pulse dot.
3. **Click the launcher.** The chat panel should slide up.
4. **Enter a test name and phone number** (use your own number, e.g. "Test User" / "082 000 0000")
5. **Start a conversation.** Type something the business would normally receive, e.g. "I'd like to make a booking" or "I need a quote for [their service]"
6. **Confirm the digital assistant replies** within a few seconds with the correct greeting and follow-up question
7. **Check the business owner's email.** Within 60 seconds, a lead notification should arrive with the test conversation details
8. **Reply to the business owner** to confirm it landed and looks correct
9. **Close the test lead** in the Qwikly dashboard so it doesn't clutter their feed

If any step fails, check the gotchas above before calling it done.

---

## STEP 5 — Handoff

Once the test passes, tell the customer:

> "You're live. Whenever a visitor clicks that button on your site, they'll chat with your digital assistant and their details will come straight to your email. You don't need to do anything, it just runs."

Send them the onboarding email (see [onboarding-email-templates.md]) confirming it's live.
