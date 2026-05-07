/* Qwikly Embed Widget v1.1 — qwikly.co.za/embed.js */
(function () {
  "use strict";

  var script = document.currentScript || document.querySelector("script[data-qwikly-id]");
  var TENANT_ID = script && script.getAttribute("data-qwikly-id");
  if (!TENANT_ID) return;
  var API_BASE = (script && script.getAttribute("data-api")) || "https://qwikly.co.za";

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
    "#panel{position:fixed;bottom:84px;right:24px;z-index:2147483646;width:375px;height:540px;background:#fff;border-radius:20px;box-shadow:0 24px 72px rgba(0,0,0,.18),0 4px 16px rgba(0,0,0,.08);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(20px) scale(.98);pointer-events:none;transition:" + TRANSITION + ";transform-origin:bottom right}",
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
    ".cin{display:flex;align-items:flex-end;gap:8px;padding:10px 12px 12px;border-top:1px solid #F1F5F9;flex-shrink:0;background:#fff}",
    ".cinp{flex:1;padding:10px 13px;border:1.5px solid #E2E8F0;border-radius:14px;font-size:16px;outline:none;resize:none;color:#1F2937;font-family:inherit;line-height:1.4;max-height:88px;overflow-y:auto;touch-action:manipulation;-webkit-text-size-adjust:100%}",
    ".cinp:focus{border-color:var(--qc,#E85A2C);box-shadow:0 0 0 3px rgba(232,90,44,.1)}",
    ".cinp:disabled{opacity:.5;cursor:not-allowed}",
    ".cinp::placeholder{color:#9CA3AF}",
    ".sndbtn{width:40px;height:40px;border:none;border-radius:12px;background:var(--qc,#E85A2C);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s;touch-action:manipulation}",
    ".sndbtn:hover{opacity:.85}",
    ".sndbtn:active{opacity:.7}",
    ".sndbtn:disabled{opacity:.35;cursor:not-allowed}",
    ".sndbtn svg{pointer-events:none}",
    ".ft{text-align:center;padding:6px;font-size:10px;color:#CBD5E1;border-top:1px solid #F8FAFC;background:#fff;flex-shrink:0}",
    // Attach button
    ".attbtn{width:40px;height:40px;border:none;border-radius:12px;background:#F1F5F9;color:#64748B;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:" + MICRO + ";touch-action:manipulation}",
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
    // Mobile
    "@media(max-width:600px){#launcher{bottom:max(20px,calc(env(safe-area-inset-bottom) + 16px));right:max(20px,calc(env(safe-area-inset-right) + 12px));padding:14px 24px;font-size:15px}#panel{left:8px;right:8px;width:auto;bottom:max(72px,calc(env(safe-area-inset-bottom) + 68px));height:auto;max-height:60vh;border-radius:18px;transition:none}}",
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

  function textToNodes(text) {
    var nodes = [];
    var parts = text.split(/\*\*(.*?)\*\*/g);
    for (var p = 0; p < parts.length; p++) {
      if (p % 2 === 1) {
        var strong = document.createElement("strong");
        strong.textContent = parts[p];
        nodes.push(strong);
      } else {
        var seg = parts[p], last = 0, m;
        URL_RE.lastIndex = 0;
        while ((m = URL_RE.exec(seg)) !== null) {
          if (m.index > last) nodes.push(document.createTextNode(seg.slice(last, m.index)));
          var a = document.createElement("a");
          a.href = m[0].startsWith("http") ? m[0] : "https://" + m[0];
          a.target = "_blank"; a.rel = "noopener noreferrer";
          a.textContent = m[0];
          nodes.push(a);
          last = URL_RE.lastIndex;
        }
        if (last < seg.length) nodes.push(document.createTextNode(seg.slice(last)));
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
    m.scrollTop = m.scrollHeight;
    return div;
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
              while (botDiv.firstChild) botDiv.removeChild(botDiv.firstChild);
              var nodes = textToNodes(fullText);
              for (var j = 0; j < nodes.length; j++) botDiv.appendChild(nodes[j]);
              if (m) m.scrollTop = m.scrollHeight;
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
    fireEvent("widget_loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
