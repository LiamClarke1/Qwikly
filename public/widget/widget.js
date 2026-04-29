/* Qwikly Website Widget v4.0 */
(function () {
  "use strict";

  var script = document.currentScript || document.querySelector("script[data-client]");
  if (!script) return;
  var CLIENT_ID = script.getAttribute("data-client");
  if (!CLIENT_ID) return;
  var API_BASE = script.getAttribute("data-api") || "https://web.qwikly.co.za";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 600px)").matches;
  var TRANSITION = prefersReduced ? "none" : "transform 0.22s ease, opacity 0.22s ease";
  var MICRO = prefersReduced ? "none" : "all 0.15s ease";

  // ── Session state ──────────────────────────────────────────
  var visitorId = sessionStorage.getItem("qwikly_vid");
  if (!visitorId) {
    visitorId = "vid_" + Math.random().toString(36).slice(2, 14);
    sessionStorage.setItem("qwikly_vid", visitorId);
  }

  var conversationId = sessionStorage.getItem("qwikly_cid") || null;
  var history = [];
  var branding = null;
  var panelOpen = false;
  var sending = false;

  // ── Shadow DOM ─────────────────────────────────────────────
  var host = document.createElement("div");
  host.id = "qwikly-host";
  var shadow = host.attachShadow({ mode: "open" });
  document.body.appendChild(host);

  // ── Lightning bolt SVG ─────────────────────────────────────
  var BOLT_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="flex-shrink:0"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';

  var style = document.createElement("style");
  style.textContent = [
    ":host{all:initial;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}",
    "*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}",

    // ── Launcher ──
    "#launcher{position:fixed;bottom:24px;right:24px;z-index:2147483647;display:flex;align-items:center;gap:7px;padding:13px 22px;border-radius:50px;background:var(--qc,#E85A2C);color:#fff;font-size:14px;font-weight:700;cursor:pointer;border:none;box-shadow:0 6px 28px rgba(232,90,44,.45);transition:" + MICRO + ";touch-action:manipulation;letter-spacing:-.01em}",
    "#launcher:hover{transform:translateY(-2px);box-shadow:0 10px 36px rgba(232,90,44,.55)}",
    "#launcher:active{transform:translateY(0);box-shadow:0 4px 16px rgba(232,90,44,.35)}",

    // pulse dot
    ".pulse{width:8px;height:8px;border-radius:50%;background:#22C55E;flex-shrink:0;animation:" + (prefersReduced ? "none" : "pulse 2s ease-in-out infinite") + "}",
    "@keyframes pulse{0%,100%{opacity:.4;transform:scale(.9)}50%{opacity:1;transform:scale(1.1)}}",

    // ── Panel ──
    "#panel{position:fixed;bottom:84px;right:24px;z-index:2147483646;width:375px;height:540px;background:#fff;border-radius:20px;box-shadow:0 24px 72px rgba(0,0,0,.18),0 4px 16px rgba(0,0,0,.08);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(20px) scale(.98);pointer-events:none;transition:" + TRANSITION + ";transform-origin:bottom right}",
    "#panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:all}",

    // ── Header ──
    ".hd{padding:14px 16px;display:flex;align-items:center;gap:11px;flex-shrink:0;background:var(--qc,#E85A2C)}",
    ".hd-av{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;flex-shrink:0;letter-spacing:-.5px;color:#fff}",
    ".hd-info{flex:1;min-width:0}",
    ".hd-name{font-weight:700;font-size:13px;line-height:1.2;color:#fff}",
    ".hd-sub{font-size:11px;color:rgba(255,255,255,.8);margin-top:2px;display:flex;align-items:center;gap:4px}",
    ".hd-dot{width:6px;height:6px;border-radius:50%;background:#22C55E;flex-shrink:0}",
    ".close{background:none;border:none;color:rgba(255,255,255,.8);cursor:pointer;padding:6px;opacity:.8;font-size:20px;line-height:1;flex-shrink:0;touch-action:manipulation;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:background .15s}",
    ".close:hover{opacity:1;background:rgba(255,255,255,.15)}",

    // ── Messages ──
    ".msgs{flex:1;overflow-y:auto;padding:14px 12px 8px;display:flex;flex-direction:column;gap:8px;scroll-behavior:smooth;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}",
    ".msg{max-width:88%;padding:10px 14px;border-radius:18px;font-size:14px;line-height:1.55;word-break:break-word;animation:" + (prefersReduced ? "none" : "fadeUp .18s ease") + "}",
    "@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
    ".bot{background:#F3F4F6;color:#1F2937;border-radius:18px 18px 18px 4px;align-self:flex-start}",
    ".bot a{color:#2563EB;text-decoration:underline;word-break:break-all;cursor:pointer}",
    ".bot a:hover{color:#1D4ED8}",
    ".usr{background:var(--qc,#E85A2C);color:#fff;border-radius:18px 18px 4px 18px;align-self:flex-end}",

    // ── Typing indicator ──
    ".typing{display:flex;gap:5px;align-items:center;padding:12px 14px;background:#F3F4F6;border-radius:18px 18px 18px 4px;align-self:flex-start;width:56px}",
    ".dot{width:6px;height:6px;border-radius:50%;background:#9CA3AF;animation:" + (prefersReduced ? "none" : "blink 1.3s ease-in-out infinite") + "}",
    ".dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}",
    "@keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}",

    // ── Input area ──
    ".cin{display:flex;align-items:flex-end;gap:8px;padding:10px 12px 12px;border-top:1px solid #F1F5F9;flex-shrink:0;background:#fff}",
    // 16px font-size is REQUIRED to prevent iOS Safari from auto-zooming
    ".cinp{flex:1;padding:10px 13px;border:1.5px solid #E2E8F0;border-radius:14px;font-size:16px;outline:none;resize:none;color:#1F2937;font-family:inherit;line-height:1.4;max-height:88px;overflow-y:auto;touch-action:manipulation;-webkit-text-size-adjust:100%}",
    ".cinp:focus{border-color:var(--qc,#E85A2C);box-shadow:0 0 0 3px rgba(232,90,44,.1)}",
    ".cinp:disabled{opacity:.5;cursor:not-allowed}",
    ".cinp::placeholder{color:#9CA3AF}",
    ".sndbtn{width:40px;height:40px;border:none;border-radius:12px;background:var(--qc,#E85A2C);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s;touch-action:manipulation}",
    ".sndbtn:hover{opacity:.85}",
    ".sndbtn:active{opacity:.7}",
    ".sndbtn:disabled{opacity:.35;cursor:not-allowed}",
    ".sndbtn svg{pointer-events:none}",

    // ── Footer ──
    ".ft{text-align:center;padding:6px;font-size:10px;color:#CBD5E1;border-top:1px solid #F8FAFC;background:#fff;flex-shrink:0}",

    // ── Mobile ──
    // Cap height so it never fills the whole screen. 16px input already prevents zoom.
    "@media(max-width:600px){" +
      "#launcher{bottom:16px;right:16px;padding:11px 18px;font-size:13px}" +
      "#panel{left:8px;right:8px;width:auto;bottom:72px;height:min(62vh,500px);max-height:calc(100dvh - 100px);border-radius:18px}" +
    "}",
  ].join("");
  shadow.appendChild(style);

  var launcher = document.createElement("button");
  launcher.id = "launcher";
  launcher.setAttribute("aria-label", "Chat with us — reply in 30 seconds");

  var panel = document.createElement("div");
  panel.id = "panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Chat with Qwikly");

  shadow.appendChild(launcher);
  shadow.appendChild(panel);

  // ── Helpers ────────────────────────────────────────────────
  function applyBranding(b) {
    branding = b;
    shadow.host.style.setProperty("--qc", b.color || "#E85A2C");
    renderLauncher();
    var nameEl = shadow.getElementById("qw-name");
    var avEl = shadow.getElementById("qw-av");
    if (nameEl) nameEl.textContent = biz();
    if (avEl) avEl.textContent = biz().charAt(0).toUpperCase();
  }

  function renderLauncher() {
    var label = branding ? (branding.launcher_label || "Reply in 30s") : "Reply in 30s";
    launcher.innerHTML = BOLT_SVG + '<span class="pulse"></span><span>' + label + "</span>";
  }

  function biz() { return branding ? (branding.name || "Us") : "Us"; }
  function msgs() { return shadow.getElementById("qw-msgs"); }

  // ── URL → clickable links ──────────────────────────────────
  var URL_RE = /(https?:\/\/[^\s<>"]+|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(?:co\.za|com|org|net|io|app)(?:\/[^\s<>"]*)?)/g;

  function textToNodes(text) {
    var nodes = [];
    var last = 0;
    var m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text)) !== null) {
      if (m.index > last) nodes.push(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement("a");
      a.href = m[0].startsWith("http") ? m[0] : "https://" + m[0];
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = m[0];
      nodes.push(a);
      last = URL_RE.lastIndex;
    }
    if (last < text.length) nodes.push(document.createTextNode(text.slice(last)));
    return nodes;
  }

  function addMsg(cls, text) {
    var m = msgs();
    if (!m) return;
    var div = document.createElement("div");
    div.className = "msg " + cls;
    var nodes = textToNodes(text);
    for (var i = 0; i < nodes.length; i++) div.appendChild(nodes[i]);
    m.appendChild(div);
    m.scrollTop = m.scrollHeight;
  }

  function showTyping() {
    var m = msgs();
    if (!m || m.querySelector(".typing")) return;
    var t = document.createElement("div");
    t.className = "typing";
    t.innerHTML = "<div class='dot'></div><div class='dot'></div><div class='dot'></div>";
    m.appendChild(t);
    m.scrollTop = m.scrollHeight;
  }

  function removeTyping() {
    var m = msgs();
    if (!m) return;
    var t = m.querySelector(".typing");
    if (t) t.remove();
  }

  function setInputEnabled(enabled) {
    var inp = shadow.getElementById("qw-inp");
    var btn = shadow.getElementById("qw-snd");
    if (inp) inp.disabled = !enabled;
    if (btn) btn.disabled = !enabled;
  }

  // ── Panel build ────────────────────────────────────────────
  var SEND_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';

  function buildPanel() {
    var initial = biz().charAt(0).toUpperCase();
    panel.innerHTML =
      '<div class="hd">' +
        '<div class="hd-av" id="qw-av">' + initial + "</div>" +
        '<div class="hd-info">' +
          '<div class="hd-name" id="qw-name">' + biz() + "</div>" +
          '<div class="hd-sub"><span class="hd-dot"></span>Replies in 30s</div>' +
        "</div>" +
        '<button class="close" id="qw-x" aria-label="Close chat">×</button>' +
      "</div>" +
      '<div class="msgs" id="qw-msgs"></div>' +
      '<div class="cin">' +
        '<textarea class="cinp" id="qw-inp" placeholder="Type a message…" rows="1" autocomplete="off" autocorrect="off" autocapitalize="sentences" spellcheck="true"></textarea>' +
        '<button class="sndbtn" id="qw-snd" aria-label="Send message">' + SEND_SVG + "</button>" +
      "</div>" +
      '<div class="ft">Powered by <strong>Qwikly</strong></div>';

    shadow.getElementById("qw-x").addEventListener("click", closePanel);
    shadow.getElementById("qw-snd").addEventListener("click", handleSend);

    var inp = shadow.getElementById("qw-inp");
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    inp.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 88) + "px";
    });
  }

  // ── Send message ───────────────────────────────────────────
  function handleSend() {
    if (sending) return;
    var inp = shadow.getElementById("qw-inp");
    if (!inp) return;
    var text = inp.value.trim();
    if (!text) return;

    inp.value = "";
    inp.style.height = "";
    addMsg("usr", text);
    history.push({ role: "user", content: text });

    sending = true;
    setInputEnabled(false);
    showTyping();

    fetch(API_BASE + "/web/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        message: text,
        history: history.slice(0, -1),
        visitor_id: visitorId,
        page_url: location.href,
        conversation_id: conversationId,
      }),
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        removeTyping();
        sending = false;
        setInputEnabled(true);
        if (!data) {
          addMsg("bot", "Ja, something went wrong. Try again or WhatsApp us directly.");
          history.push({ role: "assistant", content: "Something went wrong." });
          return;
        }
        if (data.conversation_id && !conversationId) {
          conversationId = String(data.conversation_id);
          sessionStorage.setItem("qwikly_cid", conversationId);
        }
        addMsg("bot", data.reply);
        history.push({ role: "assistant", content: data.reply });
        // Only focus input on desktop — on mobile this pops the keyboard unexpectedly
        if (!isMobile) {
          var inputEl = shadow.getElementById("qw-inp");
          if (inputEl) inputEl.focus();
        }
      })
      .catch(function () {
        removeTyping();
        sending = false;
        setInputEnabled(true);
        addMsg("bot", "Something went wrong, please try again.");
        history.push({ role: "assistant", content: "Something went wrong." });
      });
  }

  // ── Open / close ───────────────────────────────────────────
  function openPanel() {
    if (panelOpen) return;
    panelOpen = true;
    buildPanel();
    panel.classList.add("open");

    setInputEnabled(false);
    showTyping();
    setTimeout(function () {
      removeTyping();
      var greeting = branding && branding.greeting
        ? branding.greeting.replace(/\{name\}/g, "").replace(/\{business\}/g, biz()).trim()
        : "Hey. What trade you in?";
      addMsg("bot", greeting);
      history.push({ role: "assistant", content: greeting });
      setInputEnabled(true);
      // Don't auto-focus on mobile — prevents keyboard covering the new message
      if (!isMobile) {
        var inp = shadow.getElementById("qw-inp");
        if (inp) inp.focus();
      }
    }, 700);

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
