/* Qwikly Embed Widget v1.1 — qwikly.co.za/embed.js */
(function () {
  "use strict";

  var script = document.currentScript || document.querySelector("script[data-qwikly-id]");
  var TENANT_ID = script && script.getAttribute("data-qwikly-id");
  if (!TENANT_ID) return;
  var API_BASE = (script && script.getAttribute("data-api")) || "https://qwikly.co.za";
  // data-compact opts qwikly.co.za into a roomier panel than the customer
  // default. Customer-embedded widgets (no data-compact flag) keep the
  // original 375x540 footprint so the widget never dominates a stranger's
  // page. Qwikly's own demo gets the bigger 440x660 footprint so the
  // booking picker has room to breathe.
  var COMPACT = script && script.getAttribute("data-compact") === "true";
  var PANEL_W = COMPACT ? 350 : 375;
  var PANEL_H = COMPACT ? 540 : 540;
  // Typography + control sizing harmonised across modes now, the bigger
  // panel doesn't need cramped controls. 16px input font on every device
  // also sidesteps iOS auto-zoom on focus.
  var INPUT_FONT = 16;
  var INPUT_MAXH = 88;
  var INPUT_PAD  = "10px 13px";
  var BTN_SIZE   = 40;
  var CIN_PAD    = "10px 12px 12px";
  // Optional teaser bubble next to the launcher. Used on the home page so first
  // time visitors notice the chat without having it auto-open in their face.
  var SHOW_PEEK = script && script.getAttribute("data-peek") === "true";
  var PEEK_DELAY = 5000;
  var PEEK_DURATION = 6000;

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 600px)").matches;
  var TRANSITION = prefersReduced ? "none" : "transform 0.22s ease, opacity 0.22s ease";
  var MICRO = prefersReduced ? "none" : "all 0.15s ease";

  var sessionId = sessionStorage.getItem("qwikly_sid");
  if (!sessionId) {
    sessionId = "s_" + Math.random().toString(36).slice(2, 14);
    sessionStorage.setItem("qwikly_sid", sessionId);
  }
  var conversationId = sessionStorage.getItem("qwikly_cid") || null;
  var branding = null;
  var panelOpen = false;
  var panelBuilt = false;
  var greeted = false;
  var sending = false;
  var uploading = false;
  var vpListener = null;
  var pollTimer = null;
  var lastMsgTime = null;
  var fileInput = null;

  var host = document.createElement("div");
  host.id = "qwikly-host";
  var shadow = host.attachShadow({ mode: "open" });
  document.body.appendChild(host);

  var BOLT_SVG = '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="flex-shrink:0"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';
  var SEND_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
  var ATTACH_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  var DL_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  var FILE_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  var IMG_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';

  var style = document.createElement("style");
  style.textContent = [
    ":host{all:initial;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}",
    "*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}",
    "#launcher{position:fixed;bottom:28px;right:28px;z-index:2147483647;display:flex;align-items:center;gap:9px;padding:16px 28px;border-radius:50px;background:var(--qc,#E85A2C);color:#fff;font-size:16px;font-weight:700;cursor:pointer;border:none;box-shadow:0 8px 32px rgba(232,90,44,.50);transition:" + MICRO + ";touch-action:manipulation;letter-spacing:-.01em}",
    "#launcher:hover{transform:translateY(-2px);box-shadow:0 10px 36px rgba(232,90,44,.55)}",
    "#launcher:active{transform:translateY(0);box-shadow:0 4px 16px rgba(232,90,44,.35)}",
    ".pulse{width:8px;height:8px;border-radius:50%;background:#22C55E;flex-shrink:0;animation:" + (prefersReduced ? "none" : "pulse 2s ease-in-out infinite") + "}",
    "@keyframes pulse{0%,100%{opacity:.4;transform:scale(.9)}50%{opacity:1;transform:scale(1.1)}}",
    "#panel{position:fixed;bottom:84px;right:24px;z-index:2147483646;width:" + PANEL_W + "px;height:" + PANEL_H + "px;background:#fff;border-radius:20px;box-shadow:0 24px 72px rgba(0,0,0,.18),0 4px 16px rgba(0,0,0,.08);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(20px) scale(.98);pointer-events:none;transition:" + TRANSITION + ";transform-origin:bottom right}",
    "#panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:all}",
    ".hd{padding:14px 16px;display:flex;align-items:center;gap:11px;flex-shrink:0;background:var(--qc,#E85A2C)}",
    ".hd-av{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;flex-shrink:0;letter-spacing:-.5px;color:#fff}",
    ".hd-info{flex:1;min-width:0}",
    ".hd-name{font-weight:700;font-size:13px;line-height:1.2;color:#fff}",
    ".hd-sub{font-size:11px;color:rgba(255,255,255,.8);margin-top:2px;display:flex;align-items:center;gap:4px}",
    ".hd-dot{width:6px;height:6px;border-radius:50%;background:#22C55E;flex-shrink:0}",
    ".close{background:none;border:none;color:rgba(255,255,255,.8);cursor:pointer;padding:0;opacity:.8;font-size:22px;line-height:1;flex-shrink:0;touch-action:manipulation;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:background .15s;width:44px;height:44px;min-width:44px}",
    ".close:hover{opacity:1;background:rgba(255,255,255,.15)}",
    ".msgs{flex:1;overflow-y:auto;padding:14px 12px 8px;display:flex;flex-direction:column;gap:8px;scroll-behavior:smooth;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}",
    ".msg{max-width:88%;padding:10px 14px;border-radius:18px;font-size:14px;line-height:1.55;word-break:break-word;animation:" + (prefersReduced ? "none" : "fadeUp .18s ease") + "}",
    "@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
    ".bot{background:#F3F4F6;color:#1F2937;border-radius:18px 18px 18px 4px;align-self:flex-start}",
    ".bot a{color:#2563EB;text-decoration:underline;word-break:break-all;cursor:pointer}",
    ".bot a:hover{color:#1D4ED8}",
    ".usr{background:var(--qc,#E85A2C);color:#fff;border-radius:18px 18px 4px 18px;align-self:flex-end}",
    ".typing{display:flex;gap:5px;align-items:center;padding:12px 14px;background:#F3F4F6;border-radius:18px 18px 18px 4px;align-self:flex-start;width:56px}",
    ".dot{width:6px;height:6px;border-radius:50%;background:#9CA3AF;animation:" + (prefersReduced ? "none" : "blink 1.3s ease-in-out infinite") + "}",
    ".dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}",
    "@keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}",
    ".cin{display:flex;align-items:flex-end;gap:" + (COMPACT ? 6 : 8) + "px;padding:" + CIN_PAD + ";border-top:1px solid #F1F5F9;flex-shrink:0;background:#fff}",
    ".cinp{flex:1;padding:" + INPUT_PAD + ";border:1.5px solid #E2E8F0;border-radius:" + (COMPACT ? 12 : 14) + "px;font-size:" + INPUT_FONT + "px;outline:none;resize:none;color:#1F2937;font-family:inherit;line-height:1.4;max-height:" + INPUT_MAXH + "px;overflow-y:auto;touch-action:manipulation;-webkit-text-size-adjust:100%}",
    ".cinp:focus{border-color:var(--qc,#E85A2C);box-shadow:0 0 0 3px rgba(232,90,44,.1)}",
    ".cinp:disabled{opacity:.5;cursor:not-allowed}",
    ".cinp::placeholder{color:#9CA3AF}",
    ".sndbtn{width:" + BTN_SIZE + "px;height:" + BTN_SIZE + "px;border:none;border-radius:" + (COMPACT ? 10 : 12) + "px;background:var(--qc,#E85A2C);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s;touch-action:manipulation}",
    ".sndbtn:hover{opacity:.85}",
    ".sndbtn:active{opacity:.7}",
    ".sndbtn:disabled{opacity:.35;cursor:not-allowed}",
    ".sndbtn svg{pointer-events:none}",
    ".ft{text-align:center;padding:6px;font-size:10px;color:#CBD5E1;border-top:1px solid #F8FAFC;background:#fff;flex-shrink:0}",
    // Attach button
    ".attbtn{width:" + BTN_SIZE + "px;height:" + BTN_SIZE + "px;border:none;border-radius:" + (COMPACT ? 10 : 12) + "px;background:#F1F5F9;color:#64748B;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:" + MICRO + ";touch-action:manipulation}",
    ".attbtn:hover{background:#E2E8F0;color:#1F2937}",
    ".attbtn:active{opacity:.7}",
    ".attbtn:disabled{opacity:.35;cursor:not-allowed}",
    // Document card
    ".doc-card{display:flex;align-items:center;gap:10px;padding:9px 12px;min-width:190px;max-width:100%;cursor:default}",
    ".doc-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}",
    ".usr .doc-icon{background:rgba(255,255,255,.22)}",
    ".bot .doc-icon{background:#E2E8F0}",
    ".doc-meta{flex:1;min-width:0}",
    ".doc-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3}",
    ".doc-sz{font-size:11px;opacity:.65;margin-top:2px}",
    ".doc-dl{width:30px;height:30px;border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s;touch-action:manipulation}",
    ".usr .doc-dl{background:rgba(255,255,255,.22);color:#fff}",
    ".bot .doc-dl{background:#E2E8F0;color:#374151}",
    ".doc-dl:hover{opacity:.75}",
    ".doc-dl:disabled{opacity:.35;cursor:default}",
    // Upload spinner
    "@keyframes qspin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}",
    ".qspinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:qspin .7s linear infinite}",
    ".bot .qspinner{border-color:rgba(55,65,81,.2);border-top-color:#374151}",
    // Upload error
    ".doc-err{font-size:12px;padding:8px 13px;color:#EF4444;align-self:flex-end}",
    // Peek teaser
    "#peek{position:fixed;bottom:96px;right:28px;z-index:2147483646;max-width:248px;background:#fff;color:#0F172A;border-radius:14px;padding:11px 10px 11px 14px;box-shadow:0 14px 36px rgba(15,23,42,.16),0 2px 8px rgba(15,23,42,.06);font-size:14px;line-height:1.4;font-weight:500;letter-spacing:-.01em;display:flex;align-items:center;gap:6px;opacity:0;transform:translateY(6px) scale(.96);pointer-events:none;transition:" + (prefersReduced ? "none" : "opacity .25s ease, transform .25s ease") + "}",
    "#peek.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}",
    "#peek-body{flex:1;cursor:pointer;padding:1px 0}",
    "#peek-x{background:none;border:none;color:#94A3B8;cursor:pointer;font-size:18px;line-height:1;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;flex-shrink:0;padding:0;transition:" + MICRO + "}",
    "#peek-x:hover{background:#F1F5F9;color:#475569}",
    "#peek::after{content:\"\";position:absolute;bottom:-5px;right:38px;width:12px;height:12px;background:#fff;transform:rotate(45deg);box-shadow:3px 3px 6px rgba(15,23,42,.04)}",
    // Inline booking picker
    ".bp{align-self:stretch;background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:10px;animation:" + (prefersReduced ? "none" : "fadeUp .2s ease") + "}",
    ".bp-h{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#475569}",
    ".bp-t{font-size:14px;font-weight:600;color:#0F172A;line-height:1.3}",
    ".bp-sub{font-size:12px;color:#64748B}",
    ".bp-list{display:flex;flex-direction:column;gap:6px}",
    ".bp-row{display:flex;align-items:center;gap:10px;width:100%;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:10px 12px;cursor:pointer;transition:" + MICRO + ";min-height:44px;font-family:inherit;text-align:left}",
    ".bp-row:hover{background:#F1F5F9;border-color:var(--qc,#E85A2C)}",
    ".bp-row:active{transform:scale(.99)}",
    ".bp-row-l{flex:1;font-size:13px;font-weight:600;color:#0F172A}",
    ".bp-row-m{font-size:11px;color:#64748B}",
    ".bp-row-c{font-size:18px;color:#94A3B8;line-height:1}",
    ".bp-back{align-self:flex-start;background:none;border:none;color:var(--qc,#E85A2C);font-size:12px;font-weight:600;cursor:pointer;padding:0;font-family:inherit;line-height:1.4}",
    ".bp-back:hover{opacity:.75}",
    ".bp-slots{display:flex;flex-wrap:wrap;gap:6px}",
    ".bp-slot{font-size:13px;font-weight:600;color:#0F172A;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:10px 14px;cursor:pointer;transition:" + MICRO + ";min-height:44px;min-width:72px;font-family:inherit;text-align:center}",
    ".bp-slot:hover{background:#F1F5F9;border-color:var(--qc,#E85A2C);color:var(--qc,#E85A2C)}",
    ".bp-slot:active{transform:scale(.97)}",
    ".bp-empty{font-size:13px;color:#64748B;padding:8px 0}",
    ".bp-form{display:flex;flex-direction:column;gap:10px}",
    ".bp-pick{font-size:12px;color:#475569;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:8px 10px;line-height:1.4}",
    ".bp-pick strong{color:#0F172A;font-weight:700}",
    ".bp-label{font-size:11px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.04em}",
    ".bp-input{width:100%;padding:9px 11px;border:1.5px solid #E2E8F0;border-radius:10px;font-size:16px;color:#0F172A;font-family:inherit;outline:none;transition:border-color .15s;-webkit-text-size-adjust:100%}",
    ".bp-input:focus{border-color:var(--qc,#E85A2C);box-shadow:0 0 0 3px rgba(232,90,44,.1)}",
    ".bp-input.err{border-color:#EF4444}",
    "textarea.bp-input{resize:vertical;min-height:60px;font-family:inherit}",
    ".bp-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:2px}",
    ".bp-btn{font-size:13px;font-weight:600;padding:9px 16px;border:none;border-radius:10px;cursor:pointer;transition:" + MICRO + ";font-family:inherit;min-height:40px}",
    ".bp-btn.gh{background:#F1F5F9;color:#475569}",
    ".bp-btn.gh:hover{background:#E2E8F0}",
    ".bp-btn.pr{background:var(--qc,#E85A2C);color:#fff}",
    ".bp-btn.pr:hover{opacity:.9}",
    ".bp-btn:disabled{opacity:.5;cursor:not-allowed}",
    ".bp-err{font-size:12px;color:#EF4444;line-height:1.4}",
    ".bp-ok{align-self:stretch;background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;border-radius:14px;padding:12px;font-size:13px;line-height:1.5;animation:" + (prefersReduced ? "none" : "fadeUp .2s ease") + "}",
    ".bp-ok strong{color:#064E3B}",
    ".bp-ok a{color:#065F46;text-decoration:underline;word-break:break-all}",
    // Mobile
    "@media(max-width:600px){#launcher{bottom:max(20px,calc(env(safe-area-inset-bottom) + 16px));right:max(20px,calc(env(safe-area-inset-right) + 12px));padding:14px 24px;font-size:15px}#panel{left:8px;right:8px;width:auto;bottom:max(72px,calc(env(safe-area-inset-bottom) + 68px));height:auto;max-height:60vh;border-radius:18px;transition:none}#peek{right:max(20px,calc(env(safe-area-inset-right) + 12px));bottom:max(78px,calc(env(safe-area-inset-bottom) + 74px));max-width:220px;font-size:13px}}",
    // Dark mode
    "@media(prefers-color-scheme:dark){#panel{background:#1e293b}.bot{background:#334155;color:#f1f5f9}.bot a{color:#60a5fa}.msgs{background:#1e293b}.cin{background:#1e293b;border-top-color:#334155}.cinp{background:#0f172a;border-color:#334155;color:#f1f5f9}.cinp::placeholder{color:#64748b}.ft{background:#1e293b;color:#475569;border-top-color:#334155}.attbtn{background:#334155;color:#94a3b8}.attbtn:hover{background:#475569;color:#f1f5f9}.bot .doc-icon{background:#475569}.bot .doc-dl{background:#475569;color:#f1f5f9}}",
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
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  shadow.appendChild(launcher);
  shadow.appendChild(panel);

  // Pre-warm color and label from cache so the launcher can render instantly
  // on page load instead of waiting for the branding API call.
  var _cachedLabel = null;
  try {
    var _cached = localStorage.getItem("qw_color_" + TENANT_ID);
    if (_cached) shadow.host.style.setProperty("--qc", _cached);
    _cachedLabel = localStorage.getItem("qw_label_" + TENANT_ID);
  } catch (e) {}
  launcher.innerHTML = BOLT_SVG + '<span class="pulse"></span><span>' + (_cachedLabel || "Message us") + "</span>";

  function applyBranding(b) {
    branding = b;
    var _color = b.color || "#E85A2C";
    shadow.host.style.setProperty("--qc", _color);
    try {
      localStorage.setItem("qw_color_" + TENANT_ID, _color);
      localStorage.setItem("qw_label_" + TENANT_ID, b.launcher_label || "Message us");
    } catch (e) {}
    renderLauncher();
    var nameEl = shadow.getElementById("qw-name");
    var avEl = shadow.getElementById("qw-av");
    if (nameEl) nameEl.textContent = biz();
    if (avEl) renderAvatar(avEl);

    // Re-initialize file input with correct MIME types now that branding is loaded.
    // If the panel was already built before branding arrived, fileInput may be
    // null (crash path) or pointing to a detached element (wipe path) — reset it.
    if (panelBuilt) fileInput = null;
    setupFileInput();
  }

  function renderAvatar(el) {
    // Clear whatever was in there.
    while (el.firstChild) el.removeChild(el.firstChild);

    if (branding && branding.logo) {
      // Build the <img> with DOM APIs — never via innerHTML — so an attacker
      // who controls branding.logo or branding.name cannot inject script /
      // event handlers into our shadow DOM.
      var img = document.createElement("img");
      img.src = branding.logo;
      img.alt = biz();
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";
      img.style.borderRadius = "50%";
      img.style.display = "block";
      img.style.background = "#fff";
      img.style.padding = "3px";
      img.onerror = function () {
        var parent = img.parentNode;
        if (parent) parent.textContent = biz().charAt(0).toUpperCase();
      };
      el.appendChild(img);
    } else {
      el.textContent = biz().charAt(0).toUpperCase();
    }
  }

  function renderLauncher() {
    var label = branding ? (branding.launcher_label || "Message us") : "Message us";
    launcher.innerHTML = BOLT_SVG + '<span class="pulse"></span><span>' + label + "</span>";
  }

  function biz() { return branding ? (branding.name || "Us") : "Us"; }
  function msgsEl() { return shadow.getElementById("qw-msgs"); }

  // ── File utilities ──────────────────────────────────────────────────────────

  var MIME_TO_EXT = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg,.jpeg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  };

  function mimeToAccept(types) {
    var exts = [];
    for (var i = 0; i < types.length; i++) {
      var e = MIME_TO_EXT[types[i]];
      if (e) { var parts = e.split(","); for (var j = 0; j < parts.length; j++) if (exts.indexOf(parts[j]) === -1) exts.push(parts[j]); }
    }
    return exts.join(",");
  }

  function formatBytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }

  function isImageMime(mime) {
    return mime && mime.startsWith("image/");
  }

  function getDocIcon(mime) {
    return isImageMime(mime) ? IMG_SVG : FILE_SVG;
  }

  function setupFileInput() {
    if (fileInput) return;
    var input = document.createElement("input");
    input.type = "file";
    input.style.display = "none";
    var allowed = (branding && branding.doc_allowed_types) || ["application/pdf", "image/jpeg", "image/png"];
    input.accept = mimeToAccept(allowed);
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      input.value = "";
      if (file) handleFileSelected(file);
    });
    // Append to panel so it lives inside the shadow
    panel.appendChild(input);
    fileInput = input; // assign last so a partial failure doesn't block re-runs
  }

  // ── Document card rendering ─────────────────────────────────────────────────

  function addDocCard(side, docId, filename, fileSize, pending) {
    var m = msgsEl(); if (!m) return null;
    var div = document.createElement("div");
    div.className = "msg doc-card " + side;
    if (docId) div.setAttribute("data-doc-id", docId);

    var iconDiv = document.createElement("div");
    iconDiv.className = "doc-icon";
    iconDiv.innerHTML = getDocIcon(null);

    var metaDiv = document.createElement("div");
    metaDiv.className = "doc-meta";

    var nameDiv = document.createElement("div");
    nameDiv.className = "doc-name";
    nameDiv.textContent = filename;

    var szDiv = document.createElement("div");
    szDiv.className = "doc-sz";
    szDiv.textContent = fileSize ? formatBytes(fileSize) : "";

    metaDiv.appendChild(nameDiv);
    metaDiv.appendChild(szDiv);

    var dlBtn = document.createElement("button");
    dlBtn.className = "doc-dl";
    dlBtn.setAttribute("aria-label", "Download " + filename);

    if (pending) {
      dlBtn.disabled = true;
      dlBtn.innerHTML = '<div class="qspinner"></div>';
    } else {
      dlBtn.innerHTML = DL_SVG;
      if (docId) {
        dlBtn.addEventListener("click", function () { handleDownload(docId, dlBtn); });
      }
    }

    div.appendChild(iconDiv);
    div.appendChild(metaDiv);
    div.appendChild(dlBtn);
    m.appendChild(div);
    m.scrollTop = m.scrollHeight;
    return div;
  }

  function finalizePendingCard(card, docId, fileSize, mimeType) {
    if (!card) return;
    card.setAttribute("data-doc-id", docId);
    var szDiv = card.querySelector(".doc-sz");
    if (szDiv && fileSize) szDiv.textContent = formatBytes(fileSize);
    var iconDiv = card.querySelector(".doc-icon");
    if (iconDiv) iconDiv.innerHTML = getDocIcon(mimeType);
    var dlBtn = card.querySelector(".doc-dl");
    if (dlBtn) {
      dlBtn.disabled = false;
      dlBtn.innerHTML = DL_SVG;
      dlBtn.addEventListener("click", function () { handleDownload(docId, dlBtn); });
    }
  }

  function showUploadError(msg) {
    var m = msgsEl(); if (!m) return;
    var div = document.createElement("div");
    div.className = "doc-err";
    div.textContent = msg || "Upload failed. Please try again.";
    m.appendChild(div);
    m.scrollTop = m.scrollHeight;
    setTimeout(function () { if (div.parentNode) div.parentNode.removeChild(div); }, 5000);
  }

  // ── File attach handlers ────────────────────────────────────────────────────

  function handleAttach() {
    if (uploading || sending) return;
    if (!conversationId) {
      showUploadError("Please send a message first to start a conversation.");
      return;
    }
    if (fileInput) fileInput.click();
  }

  function handleFileSelected(file) {
    var allowed = branding && branding.doc_allowed_types
      ? branding.doc_allowed_types
      : ["application/pdf", "image/jpeg", "image/png"];
    var maxMb = branding && branding.doc_max_size_mb ? branding.doc_max_size_mb : 10;

    if (file.size > maxMb * 1024 * 1024) {
      showUploadError("File is too large. Maximum size is " + maxMb + " MB.");
      return;
    }

    var attBtn = shadow.getElementById("qw-att");
    if (attBtn) attBtn.disabled = true;
    uploading = true;

    var pendingCard = addDocCard("usr", null, file.name, file.size, true);
    uploadFile(file, pendingCard);
  }

  async function uploadFile(file, pendingCard) {
    try {
      var formData = new FormData();
      formData.append("tenantId", TENANT_ID);
      formData.append("sessionId", sessionId);
      formData.append("conversationId", conversationId);
      formData.append("file", file);

      var res = await fetch(API_BASE + "/api/web/documents/upload", {
        method: "POST",
        body: formData,
      });

      var data = await res.json();

      if (!res.ok || !data.document) {
        if (pendingCard && pendingCard.parentNode) pendingCard.parentNode.removeChild(pendingCard);
        var errMsg = "Upload failed. Please try again.";
        if (res.status === 413) errMsg = "File is too large.";
        if (data.error === "file_type_not_allowed") errMsg = "That file type is not allowed.";
        if (data.error === "uploads_disabled") errMsg = "File uploads are not enabled.";
        showUploadError(errMsg);
      } else {
        var doc = data.document;
        finalizePendingCard(pendingCard, doc.id, doc.file_size, doc.file_type);
        // Update lastMsgTime so polling doesn't re-show this visitor upload
        lastMsgTime = doc.created_at || new Date().toISOString();
      }
    } catch (err) {
      if (pendingCard && pendingCard.parentNode) pendingCard.parentNode.removeChild(pendingCard);
      showUploadError("Upload failed. Please check your connection.");
    } finally {
      uploading = false;
      var attBtn = shadow.getElementById("qw-att");
      if (attBtn) attBtn.disabled = false;
    }
  }

  async function handleDownload(docId, btn) {
    if (btn) btn.disabled = true;
    try {
      var url = API_BASE + "/api/documents/" + docId + "/url?sessionId=" + encodeURIComponent(sessionId);
      var res = await fetch(url);
      if (!res.ok) throw new Error("Failed");
      var data = await res.json();
      if (data.url) {
        var a = document.createElement("a");
        a.href = data.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e) {}
    if (btn) btn.disabled = false;
  }

  // ── Polling for business-sent messages ─────────────────────────────────────

  function startPolling() {
    if (pollTimer || !conversationId) return;
    if (!lastMsgTime) lastMsgTime = new Date().toISOString();
    pollTimer = setInterval(pollMessages, 8000);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  async function pollMessages() {
    if (!conversationId || !panelOpen) return;
    try {
      var url = API_BASE + "/api/web/conversation/messages?sessionId=" + encodeURIComponent(sessionId) +
        "&conversationId=" + encodeURIComponent(conversationId) +
        "&after=" + encodeURIComponent(lastMsgTime || "");
      var res = await fetch(url);
      if (!res.ok) return;
      var data = await res.json();
      var msgs = data.messages || [];
      for (var i = 0; i < msgs.length; i++) {
        renderIncomingMessage(msgs[i]);
        lastMsgTime = msgs[i].created_at;
      }
    } catch (e) {}
  }

  function renderIncomingMessage(msg) {
    if (msg.message_type === "document" && msg.document) {
      var doc = msg.document;
      if (doc.status === "deleted") return;
      var card = addDocCard("bot", doc.id, doc.file_name, doc.file_size, false);
      var iconDiv = card && card.querySelector(".doc-icon");
      if (iconDiv) iconDiv.innerHTML = getDocIcon(doc.file_type);
    } else if (msg.content) {
      addMsg("bot", msg.content);
    }
  }

  // ── Text utilities ──────────────────────────────────────────────────────────

  var URL_RE = /(https?:\/\/[^\s<>"]+|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(?:co\.za|com|org|net|io|app)(?:\/[^\s<>"]*)?)/g;

  function linkifyInto(parent, seg) {
    var last = 0, m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(seg)) !== null) {
      if (m.index > last) parent.appendChild(document.createTextNode(seg.slice(last, m.index)));
      var a = document.createElement("a");
      a.href = m[0].startsWith("http") ? m[0] : "https://" + m[0];
      a.target = "_blank"; a.rel = "noopener noreferrer";
      a.textContent = m[0];
      parent.appendChild(a);
      last = URL_RE.lastIndex;
    }
    if (last < seg.length) parent.appendChild(document.createTextNode(seg.slice(last)));
  }

  function textToNodes(text) {
    var nodes = [];
    var parts = text.split(/\*\*(.*?)\*\*/g);
    for (var p = 0; p < parts.length; p++) {
      if (p % 2 === 1) {
        // Bolded chunk — still linkify any URLs inside it so the bold CTA
        // and its link are both honored.
        var strong = document.createElement("strong");
        linkifyInto(strong, parts[p]);
        nodes.push(strong);
      } else {
        var wrap = document.createDocumentFragment();
        linkifyInto(wrap, parts[p]);
        nodes.push(wrap);
      }
    }
    return nodes;
  }

  function addMsg(cls, text) {
    var m = msgsEl(); if (!m) return null;
    var div = document.createElement("div");
    div.className = "msg " + cls;
    if (text) { var nodes = textToNodes(text); for (var i = 0; i < nodes.length; i++) div.appendChild(nodes[i]); }
    m.appendChild(div);
    if (cls === "bot" && text) {
      anchorTop(m, div);
    } else if (cls !== "bot") {
      m.scrollTop = m.scrollHeight;
    }
    // Empty bot placeholder (streaming) is anchored on the first chunk.
    return div;
  }

  // ── Inline booking picker ───────────────────────────────────────────────────
  // The assistant emits the literal token [[booking-picker]] at the end of a
  // reply when the visitor commits to Path B. The streaming path strips that
  // token from visible text and calls renderBookingPicker(), which mounts a
  // 3-step picker (day → time → details) inside the chat thread, then posts
  // to /api/web/bookings. Backend re-checks the calendar before locking the
  // event in (slot_taken short-circuit) and sends both confirmation emails.
  var BOOKING_MARKER = /\[\[booking-picker\]\]/g;
  var bookingMounted = false;
  var pickerSlots = [];

  function renderBookingPicker() {
    if (bookingMounted) return; // never mount twice in one conversation
    var m = msgsEl(); if (!m) return;
    bookingMounted = true;

    var card = document.createElement("div");
    card.className = "bp";
    card.innerHTML =
      '<div class="bp-h">Book a setup call</div>' +
      '<div class="bp-t">Checking the calendar…</div>' +
      '<div class="bp-sub">30 min · Google Meet</div>';
    m.appendChild(card);
    requestAnimationFrame(function () { card.scrollIntoView({ behavior: "smooth", block: "end" }); });

    fetch(API_BASE + "/api/web/availability?tenantId=" + encodeURIComponent(TENANT_ID))
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (out) {
        if (!out.ok || !out.body || !out.body.ok) {
          renderPickerUnavailable(card, out.body && out.body.reason);
          return;
        }
        pickerSlots = out.body.slots || [];
        renderPickerStepDay(card);
      })
      .catch(function () { renderPickerUnavailable(card, "network"); });
  }

  function renderPickerUnavailable(card, reason) {
    var msg = "Couldn't load times right now. Email hello@qwikly.co.za and we'll book you in.";
    if (reason === "calendar_not_connected" || reason === "calendar_disconnected") {
      msg = "Booking calendar isn't connected yet. Email hello@qwikly.co.za and we'll set it up.";
    } else if (reason === "trial_expired" || reason === "paused") {
      msg = "Booking is paused right now. Email hello@qwikly.co.za and we'll sort you out.";
    }
    card.innerHTML = "";
    var h = document.createElement("div"); h.className = "bp-h"; h.textContent = "Book a setup call"; card.appendChild(h);
    var t = document.createElement("div"); t.className = "bp-t"; t.textContent = "We hit a snag."; card.appendChild(t);
    var s = document.createElement("div"); s.className = "bp-sub"; s.textContent = msg; card.appendChild(s);
  }

  // Group the flat slot list into [{ key: "Tuesday, 12 May", short: "Tue 12 May", slots: [...] }]
  function groupSlotsByDay(slots) {
    var groups = {};
    var order = [];
    for (var i = 0; i < slots.length; i++) {
      var sl = slots[i];
      // label format from the API: "Tuesday, 12 May at 14:00", split on " at " for the day part.
      var beforeAt = String(sl.label || "").split(" at ")[0].trim();
      var key = beforeAt || sl.label;
      // Build a compact form too: "Tuesday, 12 May" → "Tue 12 May" using the short_label.
      var shortBeforeSpaceTime = String(sl.short_label || "").replace(/\s+\d{1,2}:\d{2}.*$/, "").trim();
      if (!groups[key]) { groups[key] = { key: key, short: shortBeforeSpaceTime || key, slots: [] }; order.push(key); }
      groups[key].slots.push(sl);
    }
    return order.map(function (k) { return groups[k]; });
  }

  // ── Step 1: pick a day ──
  function renderPickerStepDay(card) {
    card.innerHTML = "";
    var h = document.createElement("div"); h.className = "bp-h"; h.textContent = "Pick a day"; card.appendChild(h);
    var t = document.createElement("div"); t.className = "bp-t"; t.textContent = "What works for you?"; card.appendChild(t);
    var s = document.createElement("div"); s.className = "bp-sub"; s.textContent = "30 min · Google Meet · Africa/Johannesburg"; card.appendChild(s);

    var days = groupSlotsByDay(pickerSlots);
    if (days.length === 0) {
      var empty = document.createElement("div"); empty.className = "bp-empty";
      empty.textContent = "No open days in the next week. Email hello@qwikly.co.za and we'll find one.";
      card.appendChild(empty);
      return;
    }

    var list = document.createElement("div"); list.className = "bp-list";
    for (var i = 0; i < days.length; i++) {
      (function (day) {
        var btn = document.createElement("button");
        btn.type = "button"; btn.className = "bp-row";
        var label = document.createElement("span"); label.className = "bp-row-l"; label.textContent = day.key;
        var meta = document.createElement("span"); meta.className = "bp-row-m";
        meta.textContent = day.slots.length + (day.slots.length === 1 ? " time" : " times");
        var caret = document.createElement("span"); caret.className = "bp-row-c"; caret.textContent = "›";
        btn.appendChild(label); btn.appendChild(meta); btn.appendChild(caret);
        btn.addEventListener("click", function () { renderPickerStepTime(card, day); });
        list.appendChild(btn);
      })(days[i]);
    }
    card.appendChild(list);
  }

  // ── Step 2: pick a time on the chosen day ──
  function renderPickerStepTime(card, day) {
    card.innerHTML = "";
    var back = document.createElement("button"); back.type = "button"; back.className = "bp-back";
    back.innerHTML = "&lsaquo; Back to days";
    back.addEventListener("click", function () { renderPickerStepDay(card); });
    card.appendChild(back);
    var h = document.createElement("div"); h.className = "bp-h"; h.textContent = day.key; card.appendChild(h);
    var t = document.createElement("div"); t.className = "bp-t"; t.textContent = "What time works?"; card.appendChild(t);

    var slotsRow = document.createElement("div"); slotsRow.className = "bp-slots";
    for (var k = 0; k < day.slots.length; k++) {
      (function (slot) {
        var btn = document.createElement("button");
        btn.type = "button"; btn.className = "bp-slot";
        // Pull just the HH:MM out of the label; falls back to short_label if format ever changes.
        var afterAt = String(slot.label || "").split(" at ")[1];
        btn.textContent = (afterAt && afterAt.trim()) || slot.short_label || slot.label;
        btn.addEventListener("click", function () { renderPickerStepDetails(card, day, slot); });
        slotsRow.appendChild(btn);
      })(day.slots[k]);
    }
    card.appendChild(slotsRow);
  }

  // ── Step 3: name + email + confirm ──
  function renderPickerStepDetails(card, day, slot) {
    card.innerHTML = "";
    var back = document.createElement("button"); back.type = "button"; back.className = "bp-back";
    back.innerHTML = "&lsaquo; Back to times";
    back.addEventListener("click", function () { renderPickerStepTime(card, day); });
    card.appendChild(back);

    var h = document.createElement("div"); h.className = "bp-h"; h.textContent = "Last bit"; card.appendChild(h);
    var pick = document.createElement("div"); pick.className = "bp-pick";
    pick.innerHTML = "<strong></strong>"; pick.querySelector("strong").textContent = slot.label;
    var sub = document.createElement("span"); sub.style.display = "block"; sub.style.marginTop = "2px";
    sub.style.fontSize = "11px"; sub.style.color = "#64748B"; sub.textContent = "30 min · Google Meet";
    pick.appendChild(sub);
    card.appendChild(pick);

    var helper = document.createElement("div"); helper.className = "bp-sub";
    helper.textContent = "Drop your name and email and the Meet link lands in your inbox in seconds.";
    card.appendChild(helper);

    var form = document.createElement("div"); form.className = "bp-form";

    var nameLbl = document.createElement("div"); nameLbl.className = "bp-label"; nameLbl.textContent = "Your name";
    var nameInp = document.createElement("input"); nameInp.type = "text"; nameInp.className = "bp-input";
    nameInp.autocomplete = "name"; nameInp.placeholder = "Liam";
    form.appendChild(nameLbl); form.appendChild(nameInp);

    var emailLbl = document.createElement("div"); emailLbl.className = "bp-label"; emailLbl.textContent = "Email";
    var emailInp = document.createElement("input"); emailInp.type = "email"; emailInp.className = "bp-input";
    emailInp.autocomplete = "email"; emailInp.inputMode = "email"; emailInp.placeholder = "you@example.com";
    form.appendChild(emailLbl); form.appendChild(emailInp);

    var err = document.createElement("div"); err.className = "bp-err"; err.style.display = "none"; form.appendChild(err);

    var btns = document.createElement("div"); btns.className = "bp-btns";
    var confirm = document.createElement("button"); confirm.type = "button"; confirm.className = "bp-btn pr"; confirm.textContent = "Send Meet link";
    btns.appendChild(confirm);
    form.appendChild(btns);
    card.appendChild(form);

    // Pre-fill what the chat already captured for this session, if anything.
    try {
      var saved = sessionStorage.getItem("qwikly_visitor");
      if (saved) {
        var v = JSON.parse(saved);
        if (v.name) nameInp.value = v.name;
        if (v.email) emailInp.value = v.email;
      }
    } catch (e) {}

    setTimeout(function () { (nameInp.value ? emailInp : nameInp).focus(); }, 100);

    confirm.addEventListener("click", function () {
      err.style.display = "none";
      nameInp.classList.remove("err"); emailInp.classList.remove("err");
      var name = nameInp.value.trim();
      var email = emailInp.value.trim();
      if (!name) { nameInp.classList.add("err"); err.textContent = "What's your name?"; err.style.display = "block"; nameInp.focus(); return; }
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        emailInp.classList.add("err"); err.textContent = "A real email so we can send the Meet link."; err.style.display = "block"; emailInp.focus(); return;
      }
      confirm.disabled = true; back.disabled = true; confirm.textContent = "Sending Meet link…";
      submitBooking(card, slot, name, email, "", function (e) {
        confirm.disabled = false; back.disabled = false; confirm.textContent = "Send Meet link";
        err.textContent = e || "Couldn't confirm. Try again."; err.style.display = "block";
      });
    });
  }

  function submitBooking(card, slot, name, email, notes, onError) {
    fetch(API_BASE + "/api/web/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: TENANT_ID,
        conversation_id: conversationId || undefined,
        visitor_name: name,
        visitor_email: email,
        start: slot.start,
        end: slot.end,
        notes: notes || undefined,
      }),
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); })
      .then(function (out) {
        if (!out.ok || !out.body || !out.body.ok) {
          var reason = out.body && out.body.reason;
          if (reason === "slot_taken") return onError("That slot was just taken. Tap Back and pick another.");
          if (reason === "calendar_not_connected") return onError("Booking calendar isn't connected. Email hello@qwikly.co.za.");
          return onError("Couldn't confirm. Try again or email hello@qwikly.co.za.");
        }
        // Replace the picker card with a confirmation message.
        try { sessionStorage.setItem("qwikly_visitor", JSON.stringify({ name: name, email: email })); } catch (e) {}
        var confirmBox = document.createElement("div");
        confirmBox.className = "bp-ok";
        var line1 = document.createElement("div");
        line1.innerHTML = "<strong></strong>";
        line1.querySelector("strong").textContent = "Booked, " + (slot.label || "your time");
        confirmBox.appendChild(line1);
        var line2 = document.createElement("div");
        line2.style.marginTop = "4px";
        line2.textContent = "Confirmation sent to " + email + ".";
        confirmBox.appendChild(line2);
        if (out.body.meetLink) {
          var line3 = document.createElement("div");
          line3.style.marginTop = "6px";
          var a = document.createElement("a");
          a.href = out.body.meetLink; a.target = "_blank"; a.rel = "noopener noreferrer";
          a.textContent = "Join Google Meet";
          line3.appendChild(a);
          confirmBox.appendChild(line3);
        }
        card.parentNode.replaceChild(confirmBox, card);
        var m = msgsEl(); if (m) m.scrollTop = m.scrollHeight;
      })
      .catch(function () { onError("Network error. Try again."); });
  }

  // Pin the top of a bot bubble near the top of the visible area so long
  // replies are read top-to-bottom, instead of dumping the reader at the end.
  function anchorTop(container, el) {
    requestAnimationFrame(function () {
      container.scrollTop = Math.max(0, el.offsetTop - 8);
    });
  }

  function showTyping() {
    var m = msgsEl(); if (!m || m.querySelector(".typing")) return;
    var t = document.createElement("div");
    t.className = "typing";
    t.innerHTML = "<div class='dot'></div><div class='dot'></div><div class='dot'></div>";
    m.appendChild(t); m.scrollTop = m.scrollHeight;
  }

  function removeTyping() {
    var m = msgsEl(); if (!m) return;
    var t = m.querySelector(".typing"); if (t) t.remove();
  }

  function setInputEnabled(enabled) {
    var inp = shadow.getElementById("qw-inp");
    var btn = shadow.getElementById("qw-snd");
    if (inp) inp.disabled = !enabled;
    if (btn) btn.disabled = !enabled;
  }

  // ── Panel build ─────────────────────────────────────────────────────────────

  function buildPanel() {
    var attachHtml = '<button class="attbtn" id="qw-att" aria-label="Attach file" title="Attach file">' + ATTACH_SVG + "</button>";

    panel.innerHTML =
      '<div class="hd"><div class="hd-av" id="qw-av"></div>' +
      '<div class="hd-info"><div class="hd-name" id="qw-name">' + biz() + "</div>" +
      '<div class="hd-sub"><span class="hd-dot"></span>Replies shortly</div></div>' +
      '<button class="close" id="qw-x" aria-label="Close chat">\xd7</button></div>' +
      '<div class="msgs" id="qw-msgs"></div>' +
      '<div class="cin">' + attachHtml +
      '<textarea class="cinp" id="qw-inp" placeholder="Type a message…" rows="1" autocomplete="off" autocorrect="off" autocapitalize="sentences" spellcheck="true"></textarea>' +
      '<button class="sndbtn" id="qw-snd" aria-label="Send message">' + SEND_SVG + "</button></div>" +
      '<div class="ft">Powered by <strong>Qwikly</strong></div>';

    renderAvatar(shadow.getElementById("qw-av"));
    shadow.getElementById("qw-x").addEventListener("click", closePanel);
    shadow.getElementById("qw-snd").addEventListener("click", handleSend);

    var attBtn = shadow.getElementById("qw-att");
    if (attBtn) attBtn.addEventListener("click", handleAttach);

    var inp = shadow.getElementById("qw-inp");
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    inp.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 88) + "px";
    });

    setupFileInput();
  }

  // ── Send ────────────────────────────────────────────────────────────────────

  function handleSend() {
    if (sending) return;
    var inp = shadow.getElementById("qw-inp"); if (!inp) return;
    var text = inp.value.trim(); if (!text) return;
    inp.value = ""; inp.style.height = "";
    addMsg("usr", text);
    sending = true; setInputEnabled(false); showTyping();
    streamReply(text);
  }

  async function streamReply(userMsg) {
    var m = msgsEl();
    var botDiv = null;
    var fullText = "";

    try {
      var res = await fetch(API_BASE + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          sessionId: sessionId,
          message: userMsg,
          context: { pageUrl: location.href },
        }),
      });

      removeTyping();

      if (!res.ok || !res.body) {
        addMsg("bot", "Something went wrong. Please try again.");
        sending = false; setInputEnabled(true); return;
      }

      botDiv = addMsg("bot", "");
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";

      while (true) {
        var result = await reader.read();
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split("\n");
        buffer = lines.pop() || "";

        var done = false;
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (!line.startsWith("data: ")) continue;
          var payload = line.slice(6);
          if (payload === "[DONE]") { done = true; break; }
          try {
            var parsed = JSON.parse(payload);
            if (parsed.delta) {
              fullText += parsed.delta;
              // Strip the booking-picker marker from visible text so the
              // user never sees [[booking-picker]] flash mid-stream. We
              // still detect the original token after the stream finishes.
              var displayText = fullText.replace(BOOKING_MARKER, "").trim();
              while (botDiv.firstChild) botDiv.removeChild(botDiv.firstChild);
              var nodes = textToNodes(displayText);
              for (var j = 0; j < nodes.length; j++) botDiv.appendChild(nodes[j]);
              // Re-apply each chunk: as the bubble grows, this pushes the
              // view down as far as it can go while keeping the bot's top
              // edge in sight. Browser clamps to maxScrollTop early on, then
              // honors the target once enough content streams in.
              if (m) m.scrollTop = Math.max(0, botDiv.offsetTop - 8);
            }
            if (parsed.conversation_id && !conversationId) {
              conversationId = parsed.conversation_id;
              sessionStorage.setItem("qwikly_cid", conversationId);
              lastMsgTime = new Date().toISOString();
              startPolling();
            }
          } catch (e) {}
        }
        if (done) break;
      }
    } catch (err) {
      removeTyping();
      if (!botDiv) addMsg("bot", "Something went wrong. Please try again.");
    }

    // After the stream lands, mount the inline booking picker if the
    // assistant included the [[booking-picker]] marker in its reply.
    if (BOOKING_MARKER.test(fullText)) {
      // Reset regex state since we used .test() above.
      BOOKING_MARKER.lastIndex = 0;
      renderBookingPicker();
    }

    if (!isMobile) {
      var inputEl = shadow.getElementById("qw-inp");
      if (inputEl) inputEl.focus();
    }
    sending = false; setInputEnabled(true);
  }

  // ── Keyboard / viewport ─────────────────────────────────────────────────────

  function adjustForKeyboard() {
    var vv = window.visualViewport; if (!vv) return;
    var keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    panel.style.bottom = (keyboardHeight + 68) + "px";
    panel.style.maxHeight = Math.max(vv.height - 76, 200) + "px";
  }

  // ── Open / close ────────────────────────────────────────────────────────────

  function openPanel() {
    if (panelOpen) return;
    panelOpen = true;
    if (!panelBuilt) { buildPanel(); panelBuilt = true; }
    panel.classList.add("open");
    if (isMobile && window.visualViewport) {
      vpListener = adjustForKeyboard;
      window.visualViewport.addEventListener("resize", vpListener);
      window.visualViewport.addEventListener("scroll", vpListener);
    }
    if (!greeted) {
      setInputEnabled(false); showTyping();
      setTimeout(function () {
        removeTyping();
        var greeting = branding && branding.greeting
          ? branding.greeting.replace(/\{name\}/g, "").replace(/\{business\}/g, biz()).trim()
          : "Hi! How can we help you today?";
        addMsg("bot", greeting);
        greeted = true;
        setInputEnabled(true);
        if (!isMobile) { var inp = shadow.getElementById("qw-inp"); if (inp) inp.focus(); }
      }, 600);
    } else {
      if (!isMobile) { var inp = shadow.getElementById("qw-inp"); if (inp) inp.focus(); }
    }
    if (conversationId) startPolling();
    fireEvent("launcher_opened");
  }

  function closePanel() {
    panelOpen = false;
    panel.classList.remove("open");
    stopPolling();
    if (vpListener && window.visualViewport) {
      window.visualViewport.removeEventListener("resize", vpListener);
      window.visualViewport.removeEventListener("scroll", vpListener);
      vpListener = null;
    }
    panel.style.bottom = ""; panel.style.maxHeight = "";
    if (launcher && launcher.focus) { try { launcher.focus(); } catch (_e) {} }
  }

  // Escape closes the panel from anywhere on the page when open.
  document.addEventListener("keydown", function (e) {
    if (panelOpen && (e.key === "Escape" || e.keyCode === 27)) {
      e.preventDefault();
      closePanel();
    }
  });

  // ── Analytics ───────────────────────────────────────────────────────────────

  function fireEvent(type) {
    fetch(API_BASE + "/api/web/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: TENANT_ID, visitor_id: sessionId, event_type: type, page_url: location.href }),
      keepalive: true,
    }).catch(function () {});
  }

  // ── Route guard ─────────────────────────────────────────────────────────────

  function isAppRoute(path) {
    return /^\/(dashboard|onboarding|admin|login|reset-password|sign-in)/.test(path);
  }
  function destroy() {
    stopPolling();
    if (host && host.parentNode) host.parentNode.removeChild(host);
  }
  function checkRoute() { if (isAppRoute(window.location.pathname)) destroy(); }

  (function () {
    var origPush = window.history.pushState.bind(window.history);
    window.history.pushState = function (s, t, u) { origPush(s, t, u); checkRoute(); };
    var origReplace = window.history.replaceState.bind(window.history);
    window.history.replaceState = function (s, t, u) { origReplace(s, t, u); checkRoute(); };
  })();
  window.addEventListener("popstate", checkRoute);

  window.QwiklyEmbed = { open: openPanel, close: closePanel };

  // ── Init ────────────────────────────────────────────────────────────────────

  function init() {
    checkRoute();
    if (!host.parentNode) return;
    fetch(API_BASE + "/api/embed/branding/" + TENANT_ID)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (b) { if (b) applyBranding(b); })
      .catch(function () {});
    launcher.addEventListener("click", openPanel);
    if (SHOW_PEEK) setupPeek();
    fireEvent("widget_loaded");
  }

  function setupPeek() {
    var peek = document.createElement("div");
    peek.id = "peek";
    peek.setAttribute("role", "status");
    peek.setAttribute("aria-live", "polite");
    var body = document.createElement("div");
    body.id = "peek-body";
    body.textContent = "Got a question? Chat now.";
    var x = document.createElement("button");
    x.id = "peek-x";
    x.setAttribute("aria-label", "Dismiss");
    x.innerHTML = "&times;";
    peek.appendChild(body);
    peek.appendChild(x);
    shadow.appendChild(peek);

    var hideTimer = null;
    var dismissed = false;
    function hide() {
      peek.classList.remove("open");
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    }
    function show() {
      if (dismissed || panelOpen) return;
      peek.classList.add("open");
      hideTimer = setTimeout(hide, PEEK_DURATION);
    }
    body.addEventListener("click", function () {
      dismissed = true;
      hide();
      openPanel();
    });
    x.addEventListener("click", function (e) {
      e.stopPropagation();
      dismissed = true;
      hide();
    });
    setTimeout(show, PEEK_DELAY);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
