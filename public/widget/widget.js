/* Qwikly Website Widget v2.0 */
(function () {
  "use strict";

  var script = document.currentScript || document.querySelector("script[data-client]");
  if (!script) return;
  var CLIENT_ID = script.getAttribute("data-client");
  if (!CLIENT_ID) return;
  var API_BASE = script.getAttribute("data-api") || "https://web.qwikly.co.za";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TRANSITION = prefersReduced ? "none" : "transform 0.22s ease, opacity 0.22s ease";
  var MICRO = prefersReduced ? "none" : "all 0.15s ease";

  // ── Session ────────────────────────────────────────────────
  var visitorId = sessionStorage.getItem("qwikly_vid");
  if (!visitorId) {
    visitorId = "vid_" + Math.random().toString(36).slice(2, 14);
    sessionStorage.setItem("qwikly_vid", visitorId);
  }

  // Conversation collection state
  // stages: "open" → "ask_name" → "ask_contact" → "done"
  var stage = "open";
  var collectedName = "";
  var collectedContact = "";
  var conversationId = null;
  var branding = null;
  var panelOpen = false;
  var pendingFirstMsg = "";

  // ── Shadow DOM ─────────────────────────────────────────────
  var host = document.createElement("div");
  host.id = "qwikly-host";
  var shadow = host.attachShadow({ mode: "open" });
  document.body.appendChild(host);

  var style = document.createElement("style");
  style.textContent = [
    ":host{all:initial;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
    "*{box-sizing:border-box;margin:0;padding:0}",
    "#launcher{position:fixed;bottom:20px;right:20px;z-index:2147483647;display:flex;align-items:center;gap:8px;padding:11px 18px;border-radius:50px;background:var(--qc,#E85A2C);color:#fff;font-size:14px;font-weight:600;cursor:pointer;border:none;box-shadow:0 4px 20px rgba(0,0,0,.2);transition:" + MICRO + "}",
    "#launcher:hover{transform:translateY(-2px);box-shadow:0 6px 28px rgba(0,0,0,.28)}",
    ".pulse{width:8px;height:8px;border-radius:50%;background:#22C55E;animation:" + (prefersReduced ? "none" : "pulse 2s ease-in-out infinite") + "}",
    "@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}",
    "#panel{position:fixed;bottom:80px;right:20px;z-index:2147483646;width:360px;max-height:540px;background:#fff;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.22);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(16px);pointer-events:none;transition:" + TRANSITION + "}",
    "#panel.open{opacity:1;transform:translateY(0);pointer-events:all}",
    ".hd{padding:14px 16px;display:flex;align-items:center;gap:10px;background:var(--qc,#E85A2C);color:#fff;flex-shrink:0}",
    ".hd-av{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0}",
    ".hd-info{flex:1}",
    ".hd-name{font-weight:700;font-size:13px;line-height:1.2}",
    ".hd-sub{font-size:11px;opacity:.8;margin-top:1px}",
    ".close{background:none;border:none;color:#fff;cursor:pointer;padding:4px;opacity:.75;font-size:20px;line-height:1;flex-shrink:0}",
    ".close:hover{opacity:1}",
    ".msgs{flex:1;overflow-y:auto;padding:14px 14px 8px;display:flex;flex-direction:column;gap:8px}",
    ".msg{max-width:84%;padding:10px 13px;border-radius:16px;font-size:13px;line-height:1.55;word-break:break-word}",
    ".bot{background:#F3F4F6;color:#111827;border-radius:16px 16px 16px 4px;align-self:flex-start}",
    ".usr{background:var(--qc,#E85A2C);color:#fff;border-radius:16px 16px 4px 16px;align-self:flex-end}",
    ".typing{display:flex;gap:4px;align-items:center;padding:10px 13px;background:#F3F4F6;border-radius:16px 16px 16px 4px;align-self:flex-start}",
    ".dot{width:6px;height:6px;border-radius:50%;background:#9CA3AF;animation:" + (prefersReduced ? "none" : "blink 1.2s ease-in-out infinite") + "}",
    ".dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}",
    "@keyframes blink{0%,80%,100%{opacity:.25}40%{opacity:1}}",
    ".cin{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #F3F4F6;flex-shrink:0;background:#fff}",
    ".cinp{flex:1;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;outline:none;resize:none;color:#111827;font-family:inherit;line-height:1.4}",
    ".cinp:focus{border-color:var(--qc,#E85A2C);box-shadow:0 0 0 3px rgba(232,90,44,.1)}",
    ".sndbtn{padding:9px 14px;border:none;border-radius:10px;background:var(--qc,#E85A2C);color:#fff;cursor:pointer;font-size:13px;font-weight:700;flex-shrink:0;font-family:inherit}",
    ".sndbtn:hover{opacity:.88}",
    ".ft{text-align:center;padding:6px;font-size:10px;color:#D1D5DB;border-top:1px solid #F9FAFB;background:#fff;flex-shrink:0}",
    ".done-wrap{padding:16px;text-align:center}",
    ".done-icon{font-size:32px;margin-bottom:8px}",
    ".done-title{font-size:14px;font-weight:700;color:#111827;margin-bottom:4px}",
    ".done-sub{font-size:12px;color:#6B7280;line-height:1.5}",
    "@media(max-width:480px){#panel{left:8px;right:8px;width:auto;bottom:72px;max-height:75vh}}",
    "#launcher.bl{left:20px;right:auto}#panel.bl{left:20px;right:auto}",
  ].join("");
  shadow.appendChild(style);

  var launcher = document.createElement("button");
  launcher.id = "launcher";
  launcher.setAttribute("aria-label", "Chat with us");

  var panel = document.createElement("div");
  panel.id = "panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Chat");

  shadow.appendChild(launcher);
  shadow.appendChild(panel);

  // ── Branding ───────────────────────────────────────────────
  function applyBranding(b) {
    branding = b;
    shadow.host.style.setProperty("--qc", b.color || "#E85A2C");
    renderLauncher();
    if (b.position === "bottom-left") {
      launcher.classList.add("bl");
      panel.classList.add("bl");
    }
  }

  function renderLauncher() {
    var label = branding ? (branding.launcher_label || "Message us") : "Message us";
    launcher.innerHTML = '<span class="pulse"></span><span>' + label + "</span>";
  }

  function bizName() { return branding ? (branding.name || "Us") : "Us"; }
  function bizInitial() { return bizName().charAt(0).toUpperCase(); }

  // ── Panel scaffold ─────────────────────────────────────────
  function buildPanel() {
    panel.innerHTML = [
      '<div class="hd">',
      '  <div class="hd-av">' + bizInitial() + "</div>",
      '  <div class="hd-info"><div class="hd-name">' + bizName() + '</div><div class="hd-sub">Typically replies instantly</div></div>',
      '  <button class="close" id="qw-x" aria-label="Close">×</button>',
      "</div>",
      '<div class="msgs" id="qw-msgs"></div>',
      '<div class="cin">',
      '  <textarea class="cinp" id="qw-inp" placeholder="Type your message…" rows="1"></textarea>',
      '  <button class="sndbtn" id="qw-snd">Send</button>',
      "</div>",
      '<div class="ft">Powered by <strong>Qwikly</strong></div>',
    ].join("");

    shadow.getElementById("qw-x").addEventListener("click", closePanel);
    shadow.getElementById("qw-snd").addEventListener("click", handleSend);
    shadow.getElementById("qw-inp").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
  }

  // ── Message rendering ──────────────────────────────────────
  function addMsg(cls, text, delay) {
    delay = delay || 0;
    setTimeout(function () {
      removeTyping();
      var msgs = shadow.getElementById("qw-msgs");
      if (!msgs) return;
      var div = document.createElement("div");
      div.className = "msg " + cls;
      div.textContent = text;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }, delay);
  }

  function showTyping(delay) {
    delay = delay || 0;
    setTimeout(function () {
      var msgs = shadow.getElementById("qw-msgs");
      if (!msgs || msgs.querySelector(".typing")) return;
      var t = document.createElement("div");
      t.className = "typing";
      t.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
      msgs.appendChild(t);
      msgs.scrollTop = msgs.scrollHeight;
    }, delay);
  }

  function removeTyping() {
    var t = shadow.getElementById("qw-msgs");
    if (t) {
      var typing = t.querySelector(".typing");
      if (typing) typing.remove();
    }
  }

  // ── Conversation state machine ─────────────────────────────
  function handleSend() {
    var inp = shadow.getElementById("qw-inp");
    if (!inp) return;
    var text = inp.value.trim();
    if (!text) return;
    inp.value = "";
    inp.style.height = "";

    addMsg("usr", text);

    if (stage === "open") {
      pendingFirstMsg = text;
      stage = "ask_name";
      showTyping(600);
      addMsg("bot", "Thanks for reaching out! To make sure we can follow up with you, what’s your name?", 1200);
      return;
    }

    if (stage === "ask_name") {
      collectedName = text;
      stage = "ask_contact";
      showTyping(500);
      addMsg("bot", "Nice to meet you, " + collectedName + "! What’s the best number or email to reach you on?", 1000);
      return;
    }

    if (stage === "ask_contact") {
      collectedContact = text;
      stage = "done";
      showTyping(600);
      submitLead();
      return;
    }

    if (stage === "done") {
      addMsg("bot", "We’ve already got your details — we’ll be in touch soon!", 400);
    }
  }

  function submitLead() {
    var phone = collectedContact.replace(/\D/g, "").length >= 7 ? collectedContact : "";
    var email = collectedContact.indexOf("@") > 0 ? collectedContact : "";

    fetch(API_BASE + "/web/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        name: collectedName,
        phone: phone || collectedContact,
        email: email || null,
        visitor_id: visitorId,
        page_url: location.href,
        referrer: document.referrer,
        first_message: pendingFirstMsg,
        utm_source: new URLSearchParams(location.search).get("utm_source"),
        utm_medium: new URLSearchParams(location.search).get("utm_medium"),
        utm_campaign: new URLSearchParams(location.search).get("utm_campaign"),
      }),
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        removeTyping();
        if (data && data.conversation_id) {
          conversationId = data.conversation_id;
          sessionStorage.setItem("qwikly_cid", conversationId);
        }
        addMsg("bot", "Got it! We’ve noted your enquiry and will get back to you as soon as possible. Keep an eye on your " + (collectedContact.indexOf("@") > 0 ? "inbox" : "phone") + ".");
        fireEvent("lead_captured");
      })
      .catch(function () {
        removeTyping();
        addMsg("bot", "Got it! We’ve noted your enquiry and will be in touch soon.");
      });
  }

  // ── Open / close ───────────────────────────────────────────
  function openPanel() {
    if (panelOpen) return;
    panelOpen = true;
    buildPanel();
    panel.classList.add("open");

    // Greeting after a natural pause
    var greeting = branding && branding.greeting
      ? branding.greeting.replace(/\{name\}/g, "").replace(/\{business\}/g, bizName()).trim()
      : "Hi! How can we help you today?";

    showTyping(300);
    addMsg("bot", greeting, 900);
    fireEvent("launcher_opened");
  }

  function closePanel() {
    panelOpen = false;
    panel.classList.remove("open");
  }

  // ── Events ─────────────────────────────────────────────────
  function fireEvent(type) {
    fetch(API_BASE + "/web/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CLIENT_ID, visitor_id: visitorId, event_type: type, page_url: location.href }),
      keepalive: true,
    }).catch(function () {});
  }

  // ── Init ───────────────────────────────────────────────────
  function init() {
    renderLauncher();
    fetch(API_BASE + "/web/branding/" + CLIENT_ID)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (b) { if (b) applyBranding(b); })
      .catch(function () {});
    launcher.addEventListener("click", openPanel);
    fireEvent("widget_loaded");
  }

  // ── Public API ─────────────────────────────────────────────
  window.Qwikly = {
    open: openPanel,
    close: closePanel,
    on: function (evt, cb) {
      document.addEventListener("qwikly:" + evt, function (e) { cb(e.detail); });
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
