/* Qwikly Website Widget v3.0 — AI powered */
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

  // ── Session state ──────────────────────────────────────────
  var visitorId = sessionStorage.getItem("qwikly_vid");
  if (!visitorId) {
    visitorId = "vid_" + Math.random().toString(36).slice(2, 14);
    sessionStorage.setItem("qwikly_vid", visitorId);
  }

  var conversationId = sessionStorage.getItem("qwikly_cid") || null;
  var history = [];   // { role, content }[]
  var branding = null;
  var panelOpen = false;
  var sending = false;

  // ── Shadow DOM ─────────────────────────────────────────────
  var host = document.createElement("div");
  host.id = "qwikly-host";
  var shadow = host.attachShadow({ mode: "open" });
  document.body.appendChild(host);

  var style = document.createElement("style");
  style.textContent = [
    ":host{all:initial;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
    "*{box-sizing:border-box;margin:0;padding:0}",
    "#launcher{position:fixed;bottom:24px;right:24px;z-index:2147483647;display:flex;align-items:center;gap:8px;padding:12px 20px;border-radius:50px;background:var(--qc,#E85A2C);color:#fff;font-size:14px;font-weight:600;cursor:pointer;border:none;box-shadow:0 4px 24px rgba(0,0,0,.22);transition:" + MICRO + "}",
    "#launcher:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.28)}",
    ".pulse{width:8px;height:8px;border-radius:50%;background:#22C55E;flex-shrink:0;animation:" + (prefersReduced ? "none" : "pulse 2s ease-in-out infinite") + "}",
    "@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}",
    "#panel{position:fixed;bottom:84px;right:24px;z-index:2147483646;width:370px;height:520px;background:#fff;border-radius:20px;box-shadow:0 20px 64px rgba(0,0,0,.2);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(18px);pointer-events:none;transition:" + TRANSITION + "}",
    "#panel.open{opacity:1;transform:translateY(0);pointer-events:all}",
    ".hd{padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;background:var(--qc,#E85A2C);color:#fff}",
    ".hd-av{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0;letter-spacing:-.5px}",
    ".hd-info{flex:1;min-width:0}",
    ".hd-name{font-weight:700;font-size:13px;line-height:1.2}",
    ".hd-sub{font-size:11px;opacity:.75;margin-top:1px}",
    ".close{background:none;border:none;color:#fff;cursor:pointer;padding:4px;opacity:.7;font-size:22px;line-height:1;flex-shrink:0}",
    ".close:hover{opacity:1}",
    ".msgs{flex:1;overflow-y:auto;padding:16px 14px 10px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}",
    ".msg{max-width:86%;padding:10px 14px;border-radius:18px;font-size:13px;line-height:1.6;word-break:break-word;animation:" + (prefersReduced ? "none" : "fadeUp .2s ease") + "}",
    "@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
    ".bot{background:#F3F4F6;color:#1F2937;border-radius:18px 18px 18px 4px;align-self:flex-start}",
    ".usr{background:var(--qc,#E85A2C);color:#fff;border-radius:18px 18px 4px 18px;align-self:flex-end}",
    ".typing{display:flex;gap:5px;align-items:center;padding:12px 14px;background:#F3F4F6;border-radius:18px 18px 18px 4px;align-self:flex-start;width:52px}",
    ".dot{width:6px;height:6px;border-radius:50%;background:#9CA3AF;animation:" + (prefersReduced ? "none" : "blink 1.3s ease-in-out infinite") + "}",
    ".dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}",
    "@keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}",
    ".cin{display:flex;align-items:flex-end;gap:8px;padding:10px 12px 12px;border-top:1px solid #F1F5F9;flex-shrink:0;background:#fff}",
    ".cinp{flex:1;padding:10px 13px;border:1.5px solid #E2E8F0;border-radius:12px;font-size:13px;outline:none;resize:none;color:#1F2937;font-family:inherit;line-height:1.45;max-height:96px;overflow-y:auto}",
    ".cinp:focus{border-color:var(--qc,#E85A2C);box-shadow:0 0 0 3px rgba(232,90,44,.09)}",
    ".cinp:disabled{opacity:.5;cursor:not-allowed}",
    ".sndbtn{width:38px;height:38px;border:none;border-radius:10px;background:var(--qc,#E85A2C);color:#fff;cursor:pointer;font-size:17px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s}",
    ".sndbtn:hover{opacity:.85}",
    ".sndbtn:disabled{opacity:.4;cursor:not-allowed}",
    ".ft{text-align:center;padding:7px;font-size:10px;color:#CBD5E1;border-top:1px solid #F8FAFC;background:#fff;flex-shrink:0}",
    "@media(max-width:480px){#panel{left:8px;right:8px;width:auto;bottom:76px;height:72vh}}",
    "#launcher.bl{left:24px;right:auto}#panel.bl{left:24px;right:auto}",
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

  // ── Helpers ────────────────────────────────────────────────
  function applyBranding(b) {
    branding = b;
    shadow.host.style.setProperty("--qc", b.color || "#E85A2C");
    renderLauncher();
    if (b.position === "bottom-left") {
      launcher.classList.add("bl");
      panel.classList.add("bl");
    }
    // Update panel header if already open
    var nameEl = shadow.getElementById("qw-name");
    var avEl = shadow.getElementById("qw-av");
    if (nameEl) nameEl.textContent = biz();
    if (avEl) avEl.textContent = biz().charAt(0).toUpperCase();
  }

  function renderLauncher() {
    var label = branding ? (branding.launcher_label || "Chat with us") : "Chat with us";
    launcher.innerHTML = '<span class="pulse"></span><span>' + label + "</span>";
  }

  function biz() { return branding ? (branding.name || "Us") : "Us"; }

  function msgs() { return shadow.getElementById("qw-msgs"); }

  function addMsg(cls, text, animate) {
    var m = msgs();
    if (!m) return;
    var div = document.createElement("div");
    div.className = "msg " + cls + (animate !== false ? " new" : "");
    div.textContent = text;
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
  function buildPanel() {
    var initial = biz().charAt(0).toUpperCase();
    panel.innerHTML =
      '<div class="hd">' +
        '<div class="hd-av" id="qw-av">' + initial + "</div>" +
        '<div class="hd-info">' +
          '<div class="hd-name" id="qw-name">' + biz() + "</div>" +
          '<div class="hd-sub">Digital assistant · Online</div>' +
        "</div>" +
        '<button class="close" id="qw-x" aria-label="Close">×</button>' +
      "</div>" +
      '<div class="msgs" id="qw-msgs"></div>' +
      '<div class="cin">' +
        '<textarea class="cinp" id="qw-inp" placeholder="Type your message…" rows="1"></textarea>' +
        '<button class="sndbtn" id="qw-snd" aria-label="Send">&#8593;</button>' +
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
      this.style.height = Math.min(this.scrollHeight, 96) + "px";
    });
  }

  // ── Send message → Claude ──────────────────────────────────
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
        history: history.slice(0, -1), // history before this message
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
          addMsg("bot", "Sorry, something went wrong. Please try again.");
          history.push({ role: "assistant", content: "Sorry, something went wrong." });
          return;
        }
        if (data.conversation_id && !conversationId) {
          conversationId = String(data.conversation_id);
          sessionStorage.setItem("qwikly_cid", conversationId);
        }
        addMsg("bot", data.reply);
        history.push({ role: "assistant", content: data.reply });
        var inputEl = shadow.getElementById("qw-inp");
        if (inputEl) inputEl.focus();
      })
      .catch(function () {
        removeTyping();
        sending = false;
        setInputEnabled(true);
        var msg = "Something went wrong — please try again.";
        addMsg("bot", msg);
        history.push({ role: "assistant", content: msg });
      });
  }

  // ── Open / close ───────────────────────────────────────────
  function openPanel() {
    if (panelOpen) return;
    panelOpen = true;
    buildPanel();
    panel.classList.add("open");

    // Greeting with typing indicator
    setInputEnabled(false);
    showTyping();
    setTimeout(function () {
      removeTyping();
      var greeting = branding && branding.greeting
        ? branding.greeting.replace(/\{name\}/g, "").replace(/\{business\}/g, biz()).trim()
        : "Hi there! I'm " + biz() + "'s digital assistant. What can I help you with today?";
      addMsg("bot", greeting);
      history.push({ role: "assistant", content: greeting });
      setInputEnabled(true);
      var inp = shadow.getElementById("qw-inp");
      if (inp) inp.focus();
    }, 900);

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
