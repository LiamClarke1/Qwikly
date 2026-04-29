/* Qwikly Website Widget v1.0 — embed.qwikly.co.za/v1/widget.js */
(function () {
  "use strict";

  var script = document.currentScript || document.querySelector("script[data-client]");
  if (!script) return;
  var CLIENT_ID = script.getAttribute("data-client");
  if (!CLIENT_ID) return;

  var API_BASE = script.getAttribute("data-api") || "https://web.qwikly.co.za";
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TRANSITION = prefersReduced ? "none" : "transform 0.2s ease, opacity 0.2s ease";
  var MICRO = prefersReduced ? "none" : "all 0.15s ease";

  // Session state — no localStorage, sessionStorage only
  var visitorId = sessionStorage.getItem("qwikly_vid");
  if (!visitorId) {
    visitorId = "vid_" + Math.random().toString(36).slice(2, 14);
    sessionStorage.setItem("qwikly_vid", visitorId);
  }

  var state = "collapsed";
  var branding = null;
  var conversationId = sessionStorage.getItem("qwikly_cid");
  var wsToken = sessionStorage.getItem("qwikly_wst");
  var ws = null;
  var reconnectTimer = null;
  var reconnectDelay = 1000;

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
    "#launcher:hover{transform:translateY(-1px);box-shadow:0 6px 28px rgba(0,0,0,.28)}",
    ".pulse{width:8px;height:8px;border-radius:50%;background:#22C55E;animation:" + (prefersReduced ? "none" : "pulse 2s ease-in-out infinite") + "}",
    "@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}",
    "#panel{position:fixed;bottom:80px;right:20px;z-index:2147483646;width:360px;max-height:560px;background:#fff;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.22);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(14px);pointer-events:none;transition:" + TRANSITION + "}",
    "#panel.open{opacity:1;transform:translateY(0);pointer-events:all}",
    ".hd{padding:14px 16px;display:flex;align-items:center;justify-content:space-between;background:var(--qc,#E85A2C);color:#fff}",
    ".hd-name{font-weight:700;font-size:14px}",
    ".close{background:none;border:none;color:#fff;cursor:pointer;padding:4px;opacity:.8;font-size:18px;line-height:1}",
    ".close:hover{opacity:1}",
    ".body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:100px}",
    ".intake h3{font-size:15px;font-weight:700;color:#111827;margin-bottom:4px}",
    ".intake p.sub{font-size:13px;color:#6B7280;margin-bottom:14px;line-height:1.5}",
    ".field{margin-bottom:10px}",
    ".field label{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:4px}",
    ".field input{width:100%;padding:10px 12px;border:1.5px solid #D1D5DB;border-radius:10px;font-size:14px;color:#111827;outline:none;transition:border-color .15s}",
    ".field input:focus{border-color:var(--qc,#E85A2C);box-shadow:0 0 0 3px rgba(232,90,44,.12)}",
    ".sbtn{width:100%;padding:12px;border:none;border-radius:10px;background:var(--qc,#E85A2C);color:#fff;font-size:14px;font-weight:700;cursor:pointer;transition:opacity .15s;margin-top:4px}",
    ".sbtn:hover{opacity:.88}",
    ".sbtn:disabled{opacity:.5;cursor:not-allowed}",
    ".popia{font-size:11px;color:#9CA3AF;text-align:center;line-height:1.5;margin-top:10px}",
    ".msg{max-width:82%;padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.55}",
    ".bot{background:#F3F4F6;color:#111827;border-radius:16px 16px 16px 4px;align-self:flex-start}",
    ".usr{background:var(--qc,#E85A2C);color:#fff;border-radius:16px 16px 4px 16px;align-self:flex-end}",
    ".typing{display:flex;gap:4px;align-items:center;padding:10px 14px;background:#F3F4F6;border-radius:16px 16px 16px 4px;align-self:flex-start}",
    ".dot{width:6px;height:6px;border-radius:50%;background:#9CA3AF;animation:" + (prefersReduced ? "none" : "blink 1.2s ease-in-out infinite") + "}",
    ".dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}",
    "@keyframes blink{0%,80%,100%{opacity:.25}40%{opacity:1}}",
    ".cin{display:flex;gap:8px;padding:12px 14px;border-top:1px solid #F3F4F6}",
    ".cinp{flex:1;padding:9px 12px;border:1.5px solid #D1D5DB;border-radius:10px;font-size:13px;outline:none;resize:none;color:#111827}",
    ".cinp:focus{border-color:var(--qc,#E85A2C)}",
    ".sndbtn{padding:9px 14px;border:none;border-radius:10px;background:var(--qc,#E85A2C);color:#fff;cursor:pointer;font-size:13px;font-weight:700}",
    ".ft{text-align:center;padding:8px;font-size:10px;color:#D1D5DB;border-top:1px solid #F9FAFB;background:#fff}",
    "@media(max-width:480px){#panel{left:8px;right:8px;width:auto;bottom:72px;max-height:75vh}}",
    "#launcher.bl{left:20px;right:auto}#panel.bl{left:20px;right:auto}",
  ].join("");
  shadow.appendChild(style);

  var launcher = document.createElement("button");
  launcher.id = "launcher";
  launcher.setAttribute("aria-label", "Open chat assistant");

  var panel = document.createElement("div");
  panel.id = "panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Chat assistant");

  shadow.appendChild(launcher);
  shadow.appendChild(panel);

  // ── Helpers ────────────────────────────────────────────────
  function applyBranding(b) {
    branding = b;
    var c = b.color || "#E85A2C";
    shadow.host.style.setProperty("--qc", c);
    renderLauncher();
    if (b.position === "bottom-left") {
      launcher.classList.add("bl");
      panel.classList.add("bl");
    }
  }

  function renderLauncher() {
    launcher.innerHTML = '<span class="pulse"></span><span>' + (branding ? branding.launcher_label || "Message us" : "Message us") + "</span>";
  }

  function q(id) { return shadow.getElementById(id); }

  // ── State renderers ────────────────────────────────────────
  function renderIntake() {
    state = "intake";
    var greeting = branding ? branding.greeting || "Hi! How can we help you today?" : "Hi! How can we help you today?";
    var bizName = branding ? branding.name || "Us" : "Us";
    panel.innerHTML = [
      '<div class="hd"><span class="hd-name">' + bizName + "</span><button class='close' id='qw-x' aria-label='Close'>×</button></div>",
      '<div class="body"><div class="intake">',
      '<h3>👋 Hi there!</h3>',
      '<p class="sub">' + greeting + "</p>",
      '<div class="field"><label>Your name</label><input id="qw-name" type="text" placeholder="Sarah" autocomplete="given-name" /></div>',
      '<div class="field"><label>Mobile number</label><input id="qw-phone" type="tel" placeholder="082 555 4193" autocomplete="tel" /></div>',
      '<button class="sbtn" id="qw-go">Start conversation</button>',
      '<p class="popia">By continuing you agree to our privacy policy. We do not sell your data.</p>',
      "</div></div>",
      '<div class="ft">Powered by Qwikly</div>',
    ].join("");
    q("qw-x").addEventListener("click", closePanel);
    q("qw-go").addEventListener("click", submitIntake);
    q("qw-name").focus();
    fireEvent("intake_started");
  }

  function renderChat(messages) {
    state = "chat";
    var bizName = branding ? branding.name || "Assistant" : "Assistant";
    panel.innerHTML = [
      '<div class="hd"><span class="hd-name">' + bizName + "</span><button class='close' id='qw-x' aria-label='Close'>×</button></div>",
      '<div class="body" id="qw-msgs"></div>',
      '<div class="cin"><textarea class="cinp" id="qw-inp" placeholder="Type a message…" rows="1"></textarea><button class="sndbtn" id="qw-snd">Send</button></div>',
      '<div class="ft">Powered by Qwikly</div>',
    ].join("");
    q("qw-x").addEventListener("click", closePanel);
    q("qw-snd").addEventListener("click", sendMsg);
    q("qw-inp").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
    });
    if (messages && messages.length) {
      messages.forEach(function (m) { appendMsg(m.role === "user" ? "usr" : "bot", m.content); });
    }
    connectWs();
  }

  function appendMsg(cls, text) {
    var msgs = q("qw-msgs");
    if (!msgs) return;
    var div = document.createElement("div");
    div.className = "msg " + cls;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    var msgs = q("qw-msgs");
    if (!msgs) return;
    var t = document.createElement("div");
    t.className = "typing";
    t.id = "qw-typing";
    t.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    msgs.appendChild(t);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    var t = q("qw-typing");
    if (t) t.remove();
  }

  // ── Actions ────────────────────────────────────────────────
  function submitIntake() {
    var nameEl = q("qw-name");
    var phoneEl = q("qw-phone");
    var btn = q("qw-go");
    if (!nameEl || !phoneEl || !btn) return;
    var name = nameEl.value.trim();
    var phone = phoneEl.value.trim();
    if (!name || !phone) {
      nameEl.style.borderColor = name ? "" : "red";
      phoneEl.style.borderColor = phone ? "" : "red";
      return;
    }
    btn.disabled = true;
    btn.textContent = "Connecting…";
    fireEvent("intake_submitted");

    fetch(API_BASE + "/web/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        name: name,
        phone: phone,
        visitor_id: visitorId,
        page_url: location.href,
        referrer: document.referrer,
        utm_source: new URLSearchParams(location.search).get("utm_source"),
        utm_medium: new URLSearchParams(location.search).get("utm_medium"),
        utm_campaign: new URLSearchParams(location.search).get("utm_campaign"),
      }),
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (!data.conversation_id) { btn.disabled = false; btn.textContent = "Start conversation"; return; }
      conversationId = data.conversation_id;
      wsToken = data.ws_token;
      sessionStorage.setItem("qwikly_cid", conversationId);
      sessionStorage.setItem("qwikly_wst", wsToken);
      if (data.client_branding) applyBranding(data.client_branding);
      var hello = branding && branding.greeting ? branding.greeting : "Hi! How can I help?";
      renderChat([{ role: "assistant", content: hello }]);
      fireEvent("first_message");
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = "Try again";
    });
  }

  function sendMsg() {
    var inp = q("qw-inp");
    if (!inp) return;
    var text = inp.value.trim();
    if (!text) return;
    if (!ws || ws.readyState !== 1) return;
    appendMsg("usr", text);
    inp.value = "";
    showTyping();
    ws.send(JSON.stringify({ type: "message", content: text }));
  }

  function connectWs() {
    if (!wsToken || !conversationId) return;
    if (ws && ws.readyState < 2) return; // already open or connecting
    var wsUrl = API_BASE.replace(/^https?/, function(p) { return p === "https" ? "wss" : "ws"; }) + "/web/chat/" + conversationId;
    var receivedMessage = false;
    try {
      ws = new WebSocket(wsUrl);
    } catch (_) {
      showOfflineConfirmation();
      return;
    }
    ws.onopen = function () {
      reconnectDelay = 1000;
      ws.send(JSON.stringify({ type: "auth", token: wsToken }));
    };
    ws.onmessage = function (e) {
      try {
        var msg = JSON.parse(e.data);
        removeTyping();
        receivedMessage = true;
        if (msg.type === "message" || msg.type === "reply") {
          appendMsg("bot", msg.content);
        }
      } catch (_) {}
    };
    ws.onerror = function () { showOfflineConfirmation(); };
    ws.onclose = function () {
      if (!receivedMessage && state === "chat") {
        showOfflineConfirmation();
        return;
      }
      if (state === "chat") {
        reconnectTimer = setTimeout(connectWs, Math.min(reconnectDelay, 30000));
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      }
    };
  }

  function showOfflineConfirmation() {
    removeTyping();
    var msgs = q("qw-msgs");
    if (!msgs || msgs.querySelector(".qw-offline")) return;
    var div = document.createElement("div");
    div.className = "msg bot qw-offline";
    div.textContent = "Thanks! We've received your details and will be in touch shortly.";
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function openPanel() {
    panel.classList.add("open");
    if (state === "collapsed") {
      // If we have a live session, resume chat; else show intake
      if (conversationId && wsToken) {
        renderChat([]);
      } else {
        renderIntake();
      }
    }
    fireEvent("launcher_opened");
  }

  function closePanel() {
    panel.classList.remove("open");
    if (ws && ws.readyState < 2) {
      ws.close();
      ws = null;
    }
  }

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

    // Try to load branding from backend
    fetch(API_BASE + "/web/branding/" + CLIENT_ID)
      .then(function (r) { if (r.ok) return r.json(); })
      .then(function (b) { if (b) applyBranding(b); })
      .catch(function () {});

    launcher.addEventListener("click", openPanel);
    fireEvent("widget_loaded");
  }

  // ── Public API ─────────────────────────────────────────────
  window.Qwikly = {
    open: openPanel,
    close: closePanel,
    identify: function (info) {
      var n = q("qw-name");
      var p = q("qw-phone");
      if (n && info.name) n.value = info.name;
      if (p && info.phone) p.value = info.phone;
    },
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
