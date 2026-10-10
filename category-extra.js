/* category-extra.js — lazy-loaded extra tools for pdftoolsindia.com
 *
 * Eleven free, browser-only, Tamil-first tools:
 *   examphoto, cgpacalc, unitconv, vaippadu, studytimer, wordcount,
 *   sipcalc, gstcalc, discountcalc, datecalc, passgen
 *   + rupeewords, interestcalc, landconv, bmicalc, numsys, casecvt, jsonfmt, b64, textdiff, markscalc, namepicker
 *
 * Plain browser JS (no modules / build step / network). Each tool registers
 * TOOL_IMPL.<id> = { mount(body){...} }. Globals used from the host page:
 *   TOOL_IMPL, el (unused here), escapeHtml, downloadBlob, __appLang,
 *   TamilCore (optional — only for Tamil number words in vaippadu).
 * Everything is guarded so that a missing helper never breaks a tool.
 */
(function () {
  'use strict';

  /* =====================================================================
   * Shared helpers
   * ===================================================================== */

  // Is the UI in English-first mode? (Tamil is the default.)
  function isEn() {
    try { return typeof __appLang !== 'undefined' && __appLang === 'en'; } catch (e) { return false; }
  }
  // Tiny bilingual helper: Tamil first (default); English first + Tamil second when lang = en.
  function T(ta, en) { return isEn() && en ? en + ' · ' + ta : ta; }

  function esc(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  const $ = (r, s) => r.querySelector(s);
  const $$ = (r, s) => Array.from(r.querySelectorAll(s));

  // Indian digit grouping. maxd = max fraction digits, mind = min fraction digits.
  function fmt(n, maxd, mind) {
    if (!isFinite(n)) return '—';
    maxd = maxd == null ? 2 : maxd; mind = mind == null ? 0 : mind;
    if (mind > maxd) mind = maxd;
    if (Object.is(n, -0)) n = 0;
    return Number(n).toLocaleString('en-IN', { minimumFractionDigits: mind, maximumFractionDigits: maxd });
  }
  const inr0 = n => '₹ ' + fmt(n, 0, 0);
  const inr2 = n => '₹ ' + fmt(n, 2, 2);
  const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

  // Parse a numeric text input (accepts commas, Tamil digits). NaN when empty/invalid.
  function parseNum(text) {
    let s = String(text == null ? '' : text).trim();
    s = s.replace(/[௦-௯]/g, d => String('௦௧௨௩௪௫௬௭௮௯'.indexOf(d))).replace(/[,\s₹%]/g, '');
    if (s === '' || !/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return Number(s);
  }
  const pad2 = n => (n < 10 ? '0' : '') + n;
  function lsGet(k, def) {
    try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
  }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }

  // Copy text (clipboard API with a textarea fallback) and flash the button label.
  function copyText(text, btn) {
    const done = () => {
      if (!btn) return;
      const old = btn.getAttribute('data-label') || btn.textContent;
      btn.setAttribute('data-label', old);
      btn.textContent = '✓ நகலெடுக்கப்பட்டது';
      setTimeout(() => { btn.textContent = old; }, 1400);
    };
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      } catch (e) { /* ignore */ }
      done();
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else fallback();
    } catch (e) { fallback(); }
  }

  // Copy + (when the browser supports it) Share buttons. getText() returns current result text.
  function actionsEl(getText) {
    const d = document.createElement('div');
    d.className = 'cx-actions';
    d.innerHTML = '<button type="button" class="cx-btn" data-act="copy">📋 நகலெடு (Copy result)</button>' +
      (navigator.share ? '<button type="button" class="cx-btn sec" data-act="share">📤 பகிர் (Share)</button>' : '');
    $(d, '[data-act=copy]').onclick = function () { copyText(getText(), this); };
    const sh = $(d, '[data-act=share]');
    if (sh) sh.onclick = function () { try { navigator.share({ text: getText() }).catch(() => {}); } catch (e) { /* ignore */ } };
    return d;
  }

  /* ----- tiny HTML builders ----- */
  function purpose(ta, en) { return '<div class="cx-purpose">' + T(ta, en) + '</div>'; }
  function field(label, key, value, o) {
    o = o || {};
    return '<div class="cx-f ' + (o.cls || '') + '"><label>' + label + '</label>' +
      '<input type="text" inputmode="' + (o.mode || 'decimal') + '" data-k="' + key + '" value="' + esc(value == null ? '' : value) + '" autocomplete="off"' +
      (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '></div>';
  }
  function selectField(label, key, options, cur) {
    return '<div class="cx-f"><label>' + label + '</label><select data-k="' + key + '">' +
      options.map(o => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
      '</select></div>';
  }
  function tabsHtml(items, cur, attr) {
    attr = attr || 'data-tab';
    return '<div class="cx-tabs">' + items.map(it =>
      '<button type="button" class="cx-tab' + (it[0] === cur ? ' on' : '') + '" ' + attr + '="' + it[0] + '">' + it[1] + '</button>').join('') + '</div>';
  }
  function bindTabs(root, fn, attr) {
    attr = attr || 'data-tab';
    $$(root, '[' + attr + ']').forEach(b => { b.onclick = () => fn(b.getAttribute(attr)); });
  }
  function resCard(label, big, sub, raw, cls) {
    return '<div class="cx-res ' + (cls || '') + '"><div class="lbl">' + label + '</div><div class="big"' +
      (raw != null ? ' data-v="' + raw + '"' : '') + '>' + big + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
  }
  function msgHtml(t) { return '<div class="cx-msg" role="alert">' + t + '</div>'; }
  function tableHtml(rows) { // rows: [label, value, strong?, rawKey?]
    return '<table class="cx-tbl"><tbody>' + rows.map(r =>
      '<tr' + (r[2] ? ' class="strong"' : '') + '><td>' + r[0] + '</td><td' + (r[3] ? ' data-r="' + r[3] + '"' : '') + '>' + r[1] + '</td></tr>').join('') + '</tbody></table>';
  }
  const REVISE = 'உங்கள் அறிவிப்பைப் பார்த்து சரிபார்க்கவும்';

  /* ----- CSS (injected once) ----- */
  const CSS = `
  .cx-root{color:var(--ink);font-size:15px;line-height:1.5;max-width:100%;overflow-wrap:anywhere}
  .cx-root *{box-sizing:border-box;min-width:0}
  .cx-purpose{background:var(--chip);border-radius:12px;padding:10px 12px;font-size:13.5px;font-weight:600;line-height:1.55;color:var(--ink)}
  .cx-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 4px}
  .cx-tab{flex:1 1 auto;min-height:44px;padding:8px 12px;border-radius:12px;border:2px solid var(--line);background:#fff;color:var(--ink);font:800 13.5px/1.25 inherit;font-family:inherit;cursor:pointer}
  .cx-tab.on{border-color:var(--brand);background:#EAF0FF;color:var(--brand-dark)}
  .cx-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
  .cx-grid.one{grid-template-columns:1fr}
  .cx-grid.three{grid-template-columns:1fr 1fr 1fr}
  .cx-f{margin-top:12px}
  .cx-grid .cx-f{margin-top:0}
  .cx-f label{display:block;font-size:12.5px;font-weight:700;color:var(--sub);margin-bottom:4px}
  .cx-f input[type=text],.cx-f select,.cx-f textarea{width:100%;min-height:44px;border:1.5px solid var(--line);border-radius:12px;padding:8px 12px;font-size:16px;font-family:inherit;background:#fff;color:var(--ink);outline:none}
  .cx-f input:focus,.cx-f select:focus,.cx-f textarea:focus{border-color:var(--brand)}
  .cx-f input.bad{border-color:#C0392B;background:#FFF5F4}
  .cx-f input[type=range]{width:100%;min-height:44px}
  .cx-f input[type=date]{width:100%;min-height:44px;border:1.5px solid var(--line);border-radius:12px;padding:8px 12px;font-size:16px;font-family:inherit;background:#fff}
  .cx-chk{display:flex;align-items:center;gap:10px;min-height:44px;font-size:14px;font-weight:700;cursor:pointer}
  .cx-chk input{width:22px;height:22px;flex:0 0 22px}
  .cx-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
  .cx-chip{min-height:44px;min-width:48px;padding:6px 14px;border-radius:12px;border:2px solid var(--line);background:#fff;color:var(--ink);font:800 14px inherit;font-family:inherit;cursor:pointer}
  .cx-chip.on{border-color:var(--brand);background:#EAF0FF;color:var(--brand-dark)}
  .cx-res{background:linear-gradient(135deg,#28407F,#3752A6);color:#fff;border-radius:18px;padding:16px;margin-top:14px;box-shadow:0 6px 18px rgba(40,64,127,.22)}
  .cx-res.ok{background:linear-gradient(135deg,#176B45,#1E8E5A)}
  .cx-res.bad{background:linear-gradient(135deg,#9B2C20,#C0392B)}
  .cx-res .lbl{font-size:13px;font-weight:700;opacity:.92}
  .cx-res .big{font-size:30px;font-weight:900;line-height:1.2;margin-top:2px;overflow-wrap:anywhere}
  .cx-res .sub{font-size:13.5px;font-weight:600;margin-top:6px;opacity:.95}
  .cx-msg{background:#FDEDEC;border:1px solid #F5C6C2;color:#9B2C20;border-radius:12px;padding:10px 12px;font-size:13.5px;font-weight:700;margin-top:12px}
  .cx-info{background:#FFF8E6;border:1px solid #F3DFA2;color:#6B4E00;border-radius:12px;padding:10px 12px;font-size:13px;font-weight:600;margin-top:12px;line-height:1.55}
  .cx-ok{background:#F0FAF4;border:1px solid #CDEBDA;color:#175C3B;border-radius:12px;padding:10px 12px;font-size:13.5px;font-weight:700;margin-top:12px}
  .cx-tbl{width:100%;border-collapse:collapse;margin-top:12px;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:14px}
  .cx-tbl td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}
  .cx-tbl td:last-child{text-align:right;font-weight:800;white-space:normal}
  .cx-tbl tr:last-child td{border-bottom:none}
  .cx-tbl tr.strong td{background:#EAF0FF;color:var(--brand-dark);font-weight:900}
  .cx-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
  .cx-btn{min-height:46px;padding:10px 18px;border-radius:12px;border:none;background:var(--brand);color:#fff;font:800 14.5px inherit;font-family:inherit;cursor:pointer}
  .cx-btn.sec{background:var(--chip);color:var(--brand)}
  .cx-btn.big{min-height:56px;font-size:17px;padding:12px 26px}
  .cx-btn.wide{width:100%}
  .cx-btn:disabled{opacity:.45;cursor:default}
  .cx-small{font-size:12.5px;color:var(--sub);font-weight:600;line-height:1.5;margin-top:8px}
  .cx-det{margin-top:12px;border:1px solid var(--line);border-radius:12px;background:#fff;padding:2px 12px}
  .cx-det summary{min-height:44px;display:flex;align-items:center;font-weight:800;font-size:13.5px;color:var(--brand-dark);cursor:pointer}
  .cx-det div,.cx-det p{font-size:13px;line-height:1.6;padding-bottom:10px;margin:0}
  .cx-h{font-size:14px;font-weight:900;margin:16px 0 0;color:var(--brand-dark)}
  .cx-rowbox{border:1px solid var(--line);border-radius:14px;background:#fff;padding:10px;margin-top:10px}
  .cx-rowbox .cx-grid{margin-top:0}
  .cx-del{min-height:44px;width:44px;border-radius:12px;border:none;background:#FDEDEC;color:#C0392B;font-size:18px;font-weight:900;cursor:pointer}
  .cx-bar{display:flex;height:22px;border-radius:11px;overflow:hidden;background:var(--chip);margin-top:12px}
  .cx-bar i{display:block;height:100%}
  .cx-leg{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;font-weight:700;margin-top:8px}
  .cx-leg b{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}
  .cx-prev{max-width:100%;height:auto;border:1px solid var(--line);border-radius:10px;background:#EEE;display:block}
  .cx-file{display:flex;align-items:center;justify-content:center;gap:8px;min-height:64px;border:2px dashed var(--brand);border-radius:14px;background:#F5F8FF;color:var(--brand-dark);font-weight:900;font-size:15px;cursor:pointer;text-align:center;padding:10px}
  .cx-file input{position:absolute;opacity:0;width:1px;height:1px}
  .cx-big-ring{display:block;margin:12px auto 0;width:min(100%,260px);height:auto}
  .cx-stat{border:1px solid var(--line);border-radius:12px;background:#fff;padding:10px 12px}
  .cx-stat .k{font-size:12px;color:var(--sub);font-weight:800}
  .cx-stat .v{font-size:22px;font-weight:900;color:var(--brand-dark)}
  .cx-vgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:10px}
  .cx-vgrid .cx-chip{min-width:0;padding:6px 0}
  .cx-vlines{display:grid;grid-template-columns:1fr;gap:6px;margin-top:12px}
  .cx-vl{border:1px solid var(--line);border-radius:12px;background:#fff;padding:8px 14px;font-weight:900;font-size:19px;color:var(--brand-dark)}
  .cx-vl small{display:block;font-size:12.5px;color:var(--sub);font-weight:600}
  .cx-q{font-size:38px;font-weight:900;text-align:center;margin:12px 0;color:var(--brand-dark)}
  .cx-ans{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .cx-ans button{min-height:64px;border-radius:14px;border:2px solid var(--line);background:#fff;font:900 24px inherit;font-family:inherit;color:var(--ink);cursor:pointer}
  .cx-ans button.right{background:#E3F6EB;border-color:#1E8E5A;color:#136B42}
  .cx-ans button.wrong{background:#FDEDEC;border-color:#C0392B;color:#9B2C20}
  .cx-meter{height:12px;border-radius:6px;background:var(--chip);overflow:hidden;margin-top:10px}
  .cx-meter i{display:block;height:100%;border-radius:6px;transition:width .2s}
  .cx-pw{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:21px;font-weight:800;word-break:break-all;overflow-wrap:anywhere;line-height:1.45;background:#fff;color:var(--ink);border-radius:12px;padding:12px;margin-top:8px;border:1px solid rgba(255,255,255,.4)}
  .cx-daybar{display:grid;grid-template-columns:78px 1fr 64px;gap:8px;align-items:center;margin-top:8px;font-size:12.5px;font-weight:700}
  .cx-daybar .trk{height:16px;border-radius:8px;background:var(--chip);overflow:hidden}
  .cx-daybar .trk i{display:block;height:100%;background:var(--ok);border-radius:8px}
  @media (max-width:380px){.cx-res .big{font-size:26px}.cx-q{font-size:32px}}
  `;
  function injectCss() {
    if (document.getElementById('cx-style')) return;
    const s = document.createElement('style');
    s.id = 'cx-style'; s.textContent = CSS;
    document.head.appendChild(s);
  }
  function makeRoot(body) {
    injectCss();
    const root = document.createElement('div');
    root.className = 'cx-root tamil';
    body.appendChild(root);
    return root;
  }

  /* ----- date helpers (UTC arithmetic: immune to DST / time zones) ----- */
  function mkUTC(y, m0, d) { // m0 = 0-based month; handles any overflow
    const dt = new Date(0); dt.setUTCFullYear(y, m0, d); dt.setUTCHours(0, 0, 0, 0); return dt.getTime();
  }
  function partsOf(t) { const d = new Date(t); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; }
  function daysInMonth(y, m1) { return new Date(mkUTC(y, m1, 0)).getUTCDate(); } // m1 = 1-based
  function addMonthsUTC(t, n) { // month-end clamping: 31 Jan + 1 month = 28/29 Feb
    const p = partsOf(t), tot = p.y * 12 + (p.m - 1) + n;
    const y = Math.floor(tot / 12), m0 = tot - y * 12;
    return mkUTC(y, m0, Math.min(p.d, daysInMonth(y, m0 + 1)));
  }
  function isoToUTC(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    const t = mkUTC(y, mo - 1, d), p = partsOf(t);
    return (p.y === y && p.m === mo && p.d === d) ? t : null;
  }
  function utcToIso(t) { const p = partsOf(t); return String(p.y).padStart(4, '0') + '-' + pad2(p.m) + '-' + pad2(p.d); }
  function fmtDMY(t) { const p = partsOf(t); return pad2(p.d) + '-' + pad2(p.m) + '-' + String(p.y).padStart(4, '0'); }
  function todayUTC() { const n = new Date(); return mkUTC(n.getFullYear(), n.getMonth(), n.getDate()); } // local calendar date
  const WEEK_TA = ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'];
  const WEEK_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAY_MS = 86400000;

  /* ----- audio beep (guarded) ----- */
  let audioCtx = null;
  function ensureAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended' && audioCtx.resume) audioCtx.resume();
    } catch (e) { /* ignore */ }
  }
  function beep(freq, dur, vol) {
    try {
      ensureAudio();
      if (!audioCtx) return;
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = freq || 880;
      g.gain.value = vol || 0.12;
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + (dur || 0.25));
    } catch (e) { /* ignore */ }
  }

  /* =====================================================================
   * 1. examphoto — Exam Photo & Signature Resizer
   * ===================================================================== */
  TOOL_IMPL.examphoto = {
    mount(body) {
      const root = makeRoot(body);
      const st = {
        img: null, url: null, file: null, unit: 'cm', fit: 'crop', strip: false,
        token: 0, outUrl: null, blob: null, timer: null, kind: 'photo'
      };
      const today = new Date();
      root.innerHTML =
        purpose('இது எதற்கு? தேர்வு / வேலை விண்ணப்பப் படிவம் கேட்கும் அளவுக்கு (cm / px, KB) உங்கள் புகைப்படம் அல்லது கையொப்பத்தை மாற்றும். படம் உங்கள் போனிலேயே இருக்கும் — எங்கும் அனுப்பப்படாது.',
          'Resize your photo or signature to the size (cm/px and KB) an exam form asks for. Stays on your phone.') +
        '<label class="cx-file" style="margin-top:12px"><input type="file" accept="image/*" data-k="file">📷 படத்தைத் தேர்ந்தெடுக்கவும் (Choose image)</label>' +
        '<div class="cx-small" data-k="fileinfo">JPG / PNG / WebP படங்கள். (HEIC இருந்தால் முதலில் JPG ஆக மாற்றவும்.)</div>' +
        '<div class="cx-h">1) எந்த அளவு? (Preset)</div>' +
        '<div class="cx-chips"><button type="button" class="cx-chip on" data-preset="photo">🧑 புகைப்படம் ≈ 3.5×4.5 cm, ≤50 KB</button>' +
        '<button type="button" class="cx-chip" data-preset="sign">✍️ கையொப்பம் ≈ 3.5×1.5 cm, ≤20 KB</button></div>' +
        '<div class="cx-info">இவை பொதுவான அளவுகள் — உங்கள் தேர்வு அறிவிப்பில் உள்ள அளவை நிரப்பவும். (' + REVISE + '.)</div>' +
        '<div class="cx-chips"><button type="button" class="cx-chip on" data-unit="cm">சென்டிமீட்டர் (cm)</button><button type="button" class="cx-chip" data-unit="px">பிக்சல் (px)</button></div>' +
        '<div class="cx-grid">' + field('அகலம் (Width) <span data-k="u1">cm</span>', 'w', '3.5') + field('உயரம் (Height) <span data-k="u2">cm</span>', 'h', '4.5') + '</div>' +
        '<div class="cx-grid">' + field('தெளிவு (dpi)', 'dpi', '200', { cls: 'dpibox' }) + field('அதிகபட்ச அளவு (Max KB)', 'kb', '50') + '</div>' +
        '<div class="cx-small" data-k="pxinfo"></div>' +
        '<div class="cx-h">2) படத்தை எப்படி பொருத்துவது? (Fit)</div>' +
        '<div class="cx-chips"><button type="button" class="cx-chip on" data-fit="crop">✂️ நடுவில் வெட்டு (Centre-crop)</button><button type="button" class="cx-chip" data-fit="pad">⬜ வெள்ளை இடம் சேர் (Pad white)</button></div>' +
        '<label class="cx-chk" style="margin-top:6px"><input type="checkbox" data-k="strip">📅 பெயர் + தேதி பட்டை சேர் (Print date strip)</label>' +
        '<div class="cx-grid" data-k="stripbox" style="display:none">' + field('பெயர் (Name)', 'name', '', { mode: 'text', ph: 'உங்கள் பெயர்' }) +
        field('தேதி (dd-mm-yyyy)', 'date', pad2(today.getDate()) + '-' + pad2(today.getMonth() + 1) + '-' + today.getFullYear(), { mode: 'text' }) + '</div>' +
        '<div class="cx-small" data-k="stripnote" style="display:none">பட்டை நீங்கள் கொடுத்த அளவுக்குள்ளேயே (கீழ்ப் பகுதியில்) சேரும்.</div>' +
        '<div data-k="out"></div>';

      const q = k => $(root, '[data-k=' + k + ']');
      const inputNum = k => parseNum(q(k).value);

      function setChips(attr, val) { $$(root, '[' + attr + ']').forEach(b => b.classList.toggle('on', b.getAttribute(attr) === val)); }
      function schedule() { clearTimeout(st.timer); st.timer = setTimeout(run, 180); }
      function pxSize() {
        const w = inputNum('w'), h = inputNum('h'), dpi = inputNum('dpi');
        if (st.unit === 'px') return { W: Math.round(w), H: Math.round(h) };
        return { W: Math.round(w / 2.54 * dpi), H: Math.round(h / 2.54 * dpi) };
      }
      function updateInfo() {
        const s = pxSize();
        q('pxinfo').textContent = (isFinite(s.W) && isFinite(s.H) && s.W > 0 && s.H > 0)
          ? 'இறுதிப் படம்: ' + s.W + ' × ' + s.H + ' பிக்சல்' : '';
        q('u1').textContent = q('u2').textContent = st.unit;
        $(root, '.dpibox').style.display = st.unit === 'cm' ? '' : 'none';
      }
      function applyPreset(kind) {
        st.kind = kind; setChips('data-preset', kind);
        if (st.unit === 'px') { st.unit = 'cm'; setChips('data-unit', 'cm'); }
        q('w').value = '3.5'; q('h').value = kind === 'photo' ? '4.5' : '1.5';
        q('dpi').value = '200'; q('kb').value = kind === 'photo' ? '50' : '20';
        updateInfo(); schedule();
      }
      $$(root, '[data-preset]').forEach(b => { b.onclick = () => applyPreset(b.getAttribute('data-preset')); });
      $$(root, '[data-unit]').forEach(b => {
        b.onclick = () => {
          const to = b.getAttribute('data-unit');
          if (to === st.unit) return;
          const w = inputNum('w'), h = inputNum('h'), dpi = inputNum('dpi') || 200;
          if (isFinite(w) && isFinite(h)) {
            if (to === 'px') { q('w').value = Math.round(w / 2.54 * dpi); q('h').value = Math.round(h / 2.54 * dpi); }
            else { q('w').value = round2(w / dpi * 2.54); q('h').value = round2(h / dpi * 2.54); }
          }
          st.unit = to; setChips('data-unit', to); updateInfo(); schedule();
        };
      });
      $$(root, '[data-fit]').forEach(b => { b.onclick = () => { st.fit = b.getAttribute('data-fit'); setChips('data-fit', st.fit); schedule(); }; });
      q('strip').onchange = () => {
        st.strip = q('strip').checked;
        q('stripbox').style.display = q('stripnote').style.display = st.strip ? '' : 'none';
        schedule();
      };
      ['w', 'h', 'dpi', 'kb', 'name', 'date'].forEach(k => q(k).addEventListener('input', () => { updateInfo(); schedule(); }));

      q('file').onchange = function () {
        const f = this.files && this.files[0];
        if (!f) return;
        st.file = f;
        if (st.url) { try { URL.revokeObjectURL(st.url); } catch (e) { /* ignore */ } }
        st.url = URL.createObjectURL(f);
        const im = new Image();
        im.onload = () => {
          st.img = im;
          q('fileinfo').textContent = '✔ ' + f.name + ' — ' + im.naturalWidth + '×' + im.naturalHeight + ' px, ' + fmt(f.size / 1000, 1) + ' KB';
          run();
        };
        im.onerror = () => {
          st.img = null;
          q('fileinfo').innerHTML = '<span style="color:#C0392B">இந்தக் கோப்பைப் படமாகத் திறக்க முடியவில்லை. JPG / PNG / WebP பயன்படுத்தவும்.</span>';
          q('out').innerHTML = '';
        };
        im.src = st.url;
      };

      // Draw the image into a W×H canvas (white background, optional name/date strip).
      function compose(W, H) {
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
        x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
        const nm = q('name').value.trim(), dt = q('date').value.trim();
        const stripH = (st.strip && (nm || dt)) ? Math.max(10, Math.round(H * 0.14)) : 0;
        const ph = H - stripH, iw = st.img.naturalWidth, ih = st.img.naturalHeight;
        if (st.fit === 'crop') {
          const s = Math.max(W / iw, ph / ih), sw = W / s, sh = ph / s;
          x.drawImage(st.img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, W, ph);
        } else {
          const s = Math.min(W / iw, ph / ih), dw = iw * s, dh = ih * s;
          x.drawImage(st.img, 0, 0, iw, ih, (W - dw) / 2, (ph - dh) / 2, dw, dh);
        }
        if (stripH) {
          const text = [nm, dt].filter(Boolean).join('  ');
          let fs = Math.max(8, Math.round(stripH * 0.58));
          x.fillStyle = '#000'; x.textBaseline = 'middle'; x.textAlign = 'center';
          for (; fs > 6; fs -= 1) { x.font = '700 ' + fs + 'px "Noto Sans Tamil","Inter",Arial,sans-serif'; if (x.measureText(text).width <= W - 6) break; }
          x.fillText(text, W / 2, ph + stripH / 2 + 1);
        }
        return c;
      }
      const toBlob = (c, qual) => new Promise(r => c.toBlob(r, 'image/jpeg', qual));

      // Binary-search the highest JPEG quality whose file is within `limit` bytes;
      // if even the lowest quality is too big, shrink pixels by 10 % steps.
      async function fitToLimit(base, limit, tok) {
        let scale = 1, cur = base, smallest = null;
        for (let attempt = 0; attempt < 30; attempt++) {
          if (tok !== st.token) return null;
          const top = await toBlob(cur, 0.95);
          if (top.size <= limit) return { blob: top, q: 0.95, canvas: cur, scale };
          const low = await toBlob(cur, 0.05);
          smallest = { blob: low, q: 0.05, canvas: cur, scale };
          if (low.size <= limit) {
            let lo = 0.05, hi = 0.95, best = { blob: low, q: 0.05 };
            for (let i = 0; i < 9; i++) {
              const mid = (lo + hi) / 2, b = await toBlob(cur, mid);
              if (b.size <= limit) { best = { blob: b, q: mid }; lo = mid; } else hi = mid;
            }
            return { blob: best.blob, q: best.q, canvas: cur, scale };
          }
          scale *= 0.9;
          const nw = Math.round(base.width * scale), nh = Math.round(base.height * scale);
          if (nw < 24 || nh < 12) break;
          const c2 = document.createElement('canvas'); c2.width = nw; c2.height = nh;
          const x2 = c2.getContext('2d'); x2.imageSmoothingQuality = 'high'; x2.drawImage(base, 0, 0, nw, nh);
          cur = c2;
        }
        return Object.assign({ failed: true }, smallest);
      }

      async function run() {
        const out = q('out');
        if (!st.img) { out.innerHTML = '<div class="cx-small">⬆️ மேலே படத்தைத் தேர்ந்தெடுத்தால் இங்கே முடிவு தெரியும்.</div>'; return; }
        const s = pxSize(), kb = inputNum('kb');
        if (!(s.W >= 20 && s.H >= 10 && s.W <= 5000 && s.H <= 5000)) { out.innerHTML = msgHtml('அகலம், உயரத்தைச் சரியாக நிரப்பவும் (குறைந்தது 20×10 px, அதிகபட்சம் 5000 px).'); return; }
        if (!(kb >= 2 && kb <= 20000)) { out.innerHTML = msgHtml('KB அளவை 2 முதல் 20000-க்குள் நிரப்பவும்.'); return; }
        const tok = ++st.token;
        out.innerHTML = '<div class="cx-small">⏳ சுருக்குகிறது…</div>';
        const limit = Math.floor(kb * 1000); // 1 KB = 1000 bytes: the safe side for every portal
        const base = compose(s.W, s.H);
        const res = await fitToLimit(base, limit, tok);
        if (tok !== st.token || !res) return;
        st.blob = res.blob;
        if (st.outUrl) { try { URL.revokeObjectURL(st.outUrl); } catch (e) { /* ignore */ } }
        st.outUrl = URL.createObjectURL(res.blob);
        const fw = res.canvas.width, fh = res.canvas.height, sizeKB = res.blob.size / 1000;
        let html;
        if (res.failed) {
          html = resCard('இந்த அளவுக்குள் சுருக்க முடியவில்லை', fmt(sizeKB, 1) + ' KB', fw + ' × ' + fh + ' px — KB வரம்பை உயர்த்தவும் அல்லது அளவைக் குறைக்கவும்.', res.blob.size, 'bad');
        } else {
          html = resCard('முடிவு (Result) — ' + fmt(limit / 1000, 0) + ' KB வரம்புக்குள்', fmt(sizeKB, 1) + ' KB',
            'முன்: ' + fmt(st.file.size / 1000, 1) + ' KB → பின்: ' + fmt(sizeKB, 1) + ' KB<br>' + fw + ' × ' + fh + ' px · தரம் ' + Math.round(res.q * 100) + '%', res.blob.size, 'ok');
        }
        if (res.scale < 1) {
          html += '<div class="cx-info" data-k="scaled">KB வரம்புக்காக படத்தின் பிக்சல் அளவு ' + s.W + '×' + s.H + ' இலிருந்து ' + fw + '×' + fh + ' ஆகக் குறைக்கப்பட்டது. படிவம் சரியான பிக்சல் அளவைக் கேட்டால், KB வரம்பை உயர்த்தவும்.</div>';
        }
        html += '<div class="cx-h">முன்னோட்டம் (Preview)</div><img class="cx-prev" data-k="prev" alt="Result" src="' + st.outUrl + '" style="width:' + Math.min(fw, 320) + 'px">';
        html += '<div class="cx-actions"><button type="button" class="cx-btn" data-k="dl">⬇️ பதிவிறக்கு (Download JPG)</button></div>';
        out.innerHTML = html;
        $(out, '[data-k=dl]').onclick = () => {
          const nm = (st.kind === 'sign' ? 'signature' : 'photo') + '-' + fw + 'x' + fh + '.jpg';
          if (typeof downloadBlob === 'function') downloadBlob(st.blob, nm);
        };
      }
      updateInfo(); run();
    }
  };

  /* =====================================================================
   * 2. cgpacalc — Marks, Percentage & CGPA
   * ===================================================================== */
  TOOL_IMPL.cgpacalc = {
    mount(body) {
      const root = makeRoot(body);
      let tab = 'marks';
      const rows = [['தமிழ்', '85', '100'], ['ஆங்கிலம்', '78', '100'], ['கணிதம்', '92', '100'], ['அறிவியல்', '88', '100'], ['சமூக அறிவியல்', '80', '100']]
        .map(r => ({ name: r[0], marks: r[1], out: r[2] }));
      const cg = { cgpa: '8.5', mult: '9.5', pct: '80.75', mult2: '9.5' };
      const tg = { got: '330', gotOut: '400', cnt: '1', each: '100', target: '80' };

      // Grade band as commonly used (not an official board rule).
      function band(p) {
        if (p >= 90) return 'A+'; if (p >= 80) return 'A'; if (p >= 70) return 'B+';
        if (p >= 60) return 'B'; if (p >= 50) return 'C'; if (p >= 35) return 'பாஸ்'; return 'மீண்டும் முயற்சி';
      }
      function paint() {
        root.innerHTML = purpose('இது எதற்கு? மதிப்பெண்களைக் கூட்டி சதவீதம் (Percentage), CGPA, இலக்கு மதிப்பெண் ஆகியவற்றைக் கண்டுபிடிக்க.', 'Total marks, percentage, CGPA and target marks.') +
          tabsHtml([['marks', T('மதிப்பெண் %', 'Marks %')], ['cgpa', 'CGPA ↔ %'], ['target', T('இலக்கு மதிப்பெண்', 'Target')]], tab) +
          '<div data-k="body"></div>';
        bindTabs(root, t => { tab = t; paint(); });
        ({ marks: paintMarks, cgpa: paintCgpa, target: paintTarget })[tab]();
      }

      function paintMarks() {
        const b = $(root, '[data-k=body]');
        b.innerHTML = '<div data-k="rows"></div><div class="cx-actions"><button type="button" class="cx-btn sec" data-k="add">➕ பாடம் சேர் (Add subject)</button></div>' +
          '<div data-k="out"></div><div class="cx-info">எடுத்துக்காட்டு மதிப்பெண்கள் நிரப்பப்பட்டுள்ளன — உங்கள் மதிப்பெண்களை மாற்றி எழுதுங்கள்.</div>';
        const rowsEl = $(b, '[data-k=rows]');
        function drawRows() {
          rowsEl.innerHTML = rows.map((r, i) =>
            '<div class="cx-rowbox" data-i="' + i + '"><div class="cx-f"><input type="text" inputmode="text" data-f="name" value="' + esc(r.name) + '" placeholder="பாடம் (Subject)"></div>' +
            '<div class="cx-grid" style="grid-template-columns:1fr 1fr 44px;margin-top:8px;align-items:end">' +
            '<div class="cx-f"><label>மதிப்பெண் (Marks)</label><input type="text" inputmode="decimal" data-f="marks" value="' + esc(r.marks) + '"></div>' +
            '<div class="cx-f"><label>மொத்தம் (Out of)</label><input type="text" inputmode="decimal" data-f="out" value="' + esc(r.out) + '"></div>' +
            '<button type="button" class="cx-del" data-del="' + i + '" aria-label="நீக்கு">✕</button></div></div>').join('');
          $$(rowsEl, '[data-del]').forEach(btn => { btn.onclick = () => { rows.splice(+btn.getAttribute('data-del'), 1); drawRows(); calc(); }; });
          $$(rowsEl, 'input').forEach(inp => {
            inp.addEventListener('input', () => {
              const i = +inp.closest('[data-i]').getAttribute('data-i');
              rows[i][inp.getAttribute('data-f')] = inp.value; calc();
            });
          });
        }
        let lastText = '';
        function calc() {
          let tot = 0, totOut = 0, errs = [], used = 0;
          $$(rowsEl, '[data-i]').forEach((box, i) => {
            const r = rows[i], mk = parseNum(r.marks), ot = parseNum(r.out);
            const mi = $(box, '[data-f=marks]'), oi = $(box, '[data-f=out]');
            mi.classList.remove('bad'); oi.classList.remove('bad');
            if (String(r.marks).trim() === '') return; // empty row: ignored
            const nm = r.name || ('பாடம் ' + (i + 1));
            if (!isFinite(mk) || mk < 0) { mi.classList.add('bad'); errs.push(nm + ': மதிப்பெண்ணைச் சரியாக எழுதவும்.'); return; }
            if (!isFinite(ot) || ot <= 0) { oi.classList.add('bad'); errs.push(nm + ': "மொத்தம்" 0-ஐ விடப் பெரியதாக இருக்க வேண்டும்.'); return; }
            if (mk > ot) { mi.classList.add('bad'); errs.push(nm + ': மதிப்பெண் (' + mk + ') மொத்தத்தை (' + ot + ') விட அதிகம்.'); return; }
            tot += mk; totOut += ot; used++;
          });
          const out = $(b, '[data-k=out]');
          let html = errs.map(msgHtml).join('');
          if (used === 0) { out.innerHTML = html + '<div class="cx-small">மேலே மதிப்பெண்களை நிரப்பினால் முடிவு தெரியும்.</div>'; lastText = ''; return; }
          const pct = round2(tot / totOut * 100), g = band(pct);
          html += resCard(T('சதவீதம் (Percentage)', 'Percentage'), fmt(pct, 2) + ' %', 'மொத்தம்: <b>' + fmt(tot, 2) + ' / ' + fmt(totOut, 2) + '</b> (' + used + ' பாடங்கள்)', pct, pct >= 35 ? 'ok' : 'bad');
          html += tableHtml([['மொத்த மதிப்பெண் (Total)', fmt(tot, 2) + ' / ' + fmt(totOut, 2), false, 'total'], ['வகை (Grade band)', g, true, 'grade']]);
          html += '<div class="cx-small">பொதுவான வகைப்பாடு — உங்கள் வாரிய விதி வேறுபடலாம். (≥90 A+, ≥80 A, ≥70 B+, ≥60 B, ≥50 C, ≥35 பாஸ்)</div>';
          out.innerHTML = html;
          lastText = 'மொத்தம் ' + fmt(tot, 2) + '/' + fmt(totOut, 2) + ' = ' + fmt(pct, 2) + '% (' + g + ')';
        }
        $(b, '[data-k=add]').onclick = () => { rows.push({ name: '', marks: '', out: '100' }); drawRows(); calc(); };
        drawRows(); calc();
        $(b, '[data-k=out]').after(actionsEl(() => lastText));
      }

      function paintCgpa() {
        const b = $(root, '[data-k=body]');
        b.innerHTML = '<div class="cx-h">CGPA → சதவீதம்</div><div class="cx-grid">' + field('CGPA (0–10)', 'cgpa', cg.cgpa) + field('பெருக்கி (Multiplier)', 'mult', cg.mult) + '</div><div data-k="o1"></div>' +
          '<div class="cx-h">சதவீதம் → CGPA</div><div class="cx-grid">' + field('சதவீதம் (%)', 'pct', cg.pct) + field('பெருக்கி (Multiplier)', 'mult2', cg.mult2) + '</div><div data-k="o2"></div>' +
          '<div class="cx-info">பெருக்கி 9.5 என்பது CBSE பயன்படுத்தும் முறை. பல்கலைக்கழகங்கள் வேறு முறை வைத்திருக்கலாம் — ' + REVISE + ' (பெருக்கியை மாற்றலாம்).</div>';
        let t1 = '', t2 = '';
        function calc() {
          Object.keys(cg).forEach(k => { cg[k] = $(b, '[data-k=' + k + ']').value; });
          const c = parseNum(cg.cgpa), m = parseNum(cg.mult), p = parseNum(cg.pct), m2 = parseNum(cg.mult2);
          const o1 = $(b, '[data-k=o1]'), o2 = $(b, '[data-k=o2]');
          if (!isFinite(c) || !isFinite(m) || c < 0 || c > 10 || m <= 0) { o1.innerHTML = msgHtml('CGPA-ஐ 0 முதல் 10-க்குள்ளும், பெருக்கியை 0-ஐ விடப் பெரிதாகவும் எழுதவும்.'); t1 = ''; }
          else {
            const r = c * m;
            o1.innerHTML = resCard('சதவீதம் (Percentage)', fmt(round2(r), 2) + ' %', fmt(c, 2) + ' × ' + fmt(m, 2) + ' = ' + fmt(round2(r), 2) + (r > 100 ? '<br>⚠️ 100%-ஐத் தாண்டுகிறது — பெருக்கியைச் சரிபார்க்கவும்.' : ''), r, r > 100 ? 'bad' : '');
            t1 = 'CGPA ' + fmt(c, 2) + ' ≈ ' + fmt(round2(r), 2) + '% (பெருக்கி ' + fmt(m, 2) + ')';
          }
          if (!isFinite(p) || !isFinite(m2) || p < 0 || p > 100 || m2 <= 0) { o2.innerHTML = msgHtml('சதவீதத்தை 0 முதல் 100-க்குள்ளும், பெருக்கியை 0-ஐ விடப் பெரிதாகவும் எழுதவும்.'); t2 = ''; }
          else {
            const r = p / m2;
            o2.innerHTML = resCard('CGPA', fmt(round2(r), 2), fmt(p, 2) + ' ÷ ' + fmt(m2, 2) + ' = ' + fmt(round2(r), 2) + (r > 10 ? '<br>⚠️ 10-ஐத் தாண்டுகிறது — பெருக்கியைச் சரிபார்க்கவும்.' : ''), r, r > 10 ? 'bad' : '');
            t2 = fmt(p, 2) + '% ≈ CGPA ' + fmt(round2(r), 2) + ' (பெருக்கி ' + fmt(m2, 2) + ')';
          }
        }
        b.addEventListener('input', calc); calc();
        b.appendChild(actionsEl(() => [t1, t2].filter(Boolean).join('\n')));
      }

      function paintTarget() {
        const b = $(root, '[data-k=body]');
        b.innerHTML = '<div class="cx-h">இதுவரை எழுதிய பாடங்கள்</div><div class="cx-grid">' + field('பெற்ற மதிப்பெண் (Got)', 'got', tg.got) + field('அவற்றின் மொத்தம் (Out of)', 'gotOut', tg.gotOut) + '</div>' +
          '<div class="cx-h">மீதமுள்ள பாடம் / பாடங்கள்</div><div class="cx-grid">' + field('எத்தனை பாடங்கள்', 'cnt', tg.cnt) + field('ஒவ்வொன்றின் மொத்தம்', 'each', tg.each) + '</div>' +
          '<div class="cx-grid one">' + field('இலக்கு சதவீதம் (Target %)', 'target', tg.target) + '</div><div data-k="out"></div>';
        let lastText = '';
        function calc() {
          Object.keys(tg).forEach(k => { tg[k] = $(b, '[data-k=' + k + ']').value; });
          const got = parseNum(tg.got), gotOut = parseNum(tg.gotOut), cnt = parseNum(tg.cnt), each = parseNum(tg.each), target = parseNum(tg.target);
          const out = $(b, '[data-k=out]');
          if (![got, gotOut, cnt, each, target].every(isFinite) || got < 0 || gotOut <= 0 || cnt < 1 || each <= 0 || target < 0 || target > 100 || !Number.isInteger(cnt)) {
            out.innerHTML = msgHtml('எல்லாக் கட்டங்களையும் சரியாக நிரப்பவும் (பாடங்களின் எண்ணிக்கை முழு எண்; இலக்கு 0–100).'); lastText = ''; return;
          }
          if (got > gotOut) { out.innerHTML = msgHtml('பெற்ற மதிப்பெண் மொத்தத்தை விட அதிகமாக இருக்க முடியாது.'); lastText = ''; return; }
          const remOut = cnt * each, need = target / 100 * (gotOut + remOut) - got;
          const maxPct = (got + remOut) / (gotOut + remOut) * 100;
          if (need > remOut + 1e-9) {
            out.innerHTML = resCard('இலக்கை அடைய முடியாது', '😔', 'மீதமுள்ளவற்றில் முழு மதிப்பெண் எடுத்தாலும் அதிகபட்சம் <b>' + fmt(round2(maxPct), 2) + ' %</b> மட்டுமே.', null, 'bad');
            lastText = 'இலக்கு ' + target + '% சாத்தியமில்லை; அதிகபட்சம் ' + fmt(round2(maxPct), 2) + '%';
          } else if (need <= 0) {
            out.innerHTML = resCard('இலக்கை ஏற்கனவே அடைந்துவிட்டீர்கள்', '🎉', 'மீதமுள்ளவற்றில் 0 எடுத்தாலும் ' + fmt(round2(got / (gotOut + remOut) * 100), 2) + ' % கிடைக்கும்.', 0, 'ok');
            lastText = 'இலக்கு ' + target + '% ஏற்கனவே அடைந்தது';
          } else {
            const needR = Math.ceil(need * 100 - 1e-9) / 100; // round UP so the target is really reached
            out.innerHTML = resCard('மீதமுள்ளவற்றில் தேவையான மதிப்பெண்', fmt(needR, 2) + ' / ' + fmt(remOut, 2),
              (cnt > 1 ? 'ஒவ்வொரு பாடத்திலும் சராசரியாக <b>' + fmt(Math.ceil(need / cnt * 100 - 1e-9) / 100, 2) + ' / ' + fmt(each, 2) + '</b><br>' : '') +
              'அதாவது ' + fmt(round2(need / remOut * 100), 2) + ' %', needR) +
              tableHtml([['இதுவரை', fmt(got, 2) + ' / ' + fmt(gotOut, 2)], ['மொத்த மதிப்பெண் (இறுதி)', fmt(gotOut + remOut, 2)], ['இலக்கு', fmt(target, 2) + ' %']]);
            lastText = target + '% பெற மீதமுள்ளவற்றில் ' + fmt(needR, 2) + '/' + fmt(remOut, 2) + ' தேவை';
          }
        }
        b.addEventListener('input', calc); calc();
        b.appendChild(actionsEl(() => lastText));
      }
      paint();
    }
  };

  /* =====================================================================
   * 3. unitconv — Unit & Land Area Converter
   * Each unit: [id, Tamil label, short symbol, factor to the category base unit]
   * ===================================================================== */
  const UNIT_CATS = {
    len: { ta: 'நீளம்', en: 'Length', units: [
      ['mm', 'மில்லிமீட்டர்', 'mm', 0.001], ['cm', 'சென்டிமீட்டர்', 'cm', 0.01], ['m', 'மீட்டர்', 'm', 1], ['km', 'கிலோமீட்டர்', 'km', 1000],
      ['inch', 'அங்குலம்', 'inch', 0.0254], ['foot', 'அடி', 'foot', 0.3048], ['yard', 'கெஜம்', 'yard', 0.9144], ['mile', 'மைல்', 'mile', 1609.344]] },
    wt: { ta: 'எடை', en: 'Weight', units: [
      ['mg', 'மில்லிகிராம்', 'mg', 0.000001], ['g', 'கிராம்', 'g', 0.001], ['kg', 'கிலோகிராம்', 'kg', 1], ['quintal', 'குவிண்டால்', 'quintal', 100],
      ['tonne', 'டன்', 'tonne', 1000], ['ounce', 'அவுன்ஸ்', 'oz', 0.028349523125], ['pound', 'பவுண்டு', 'lb', 0.45359237]] },
    area: { ta: 'நில அளவு', en: 'Area / Land', units: [
      ['sqft', 'சதுர அடி', 'sq ft', 1], ['sqm', 'சதுர மீட்டர்', 'sq m', 10.7639104], ['sqyd', 'சதுர கெஜம்', 'sq yard', 9],
      ['cent', 'சென்ட்', 'cent', 435.6], ['ground', 'கிரவுண்ட்', 'ground', 2400], ['acre', 'ஏக்கர்', 'acre', 43560], ['hectare', 'ஹெக்டேர்', 'hectare', 107639.104]] },
    vol: { ta: 'கொள்ளளவு', en: 'Volume', units: [
      ['ml', 'மில்லிலிட்டர்', 'ml', 0.001], ['l', 'லிட்டர்', 'litre', 1], ['gal', 'கேலன் (US)', 'gallon US', 3.785411784],
      ['cup', 'கப் (US)', 'cup US', 0.2365882365], ['tbsp', 'மேசைக்கரண்டி (US)', 'tbsp US', 0.01478676478125]] },
    temp: { ta: 'வெப்பநிலை', en: 'Temperature', special: true, units: [
      ['c', 'செல்சியஸ்', '°C', 0], ['f', 'ஃபாரன்ஹீட்', '°F', 0], ['k', 'கெல்வின்', 'K', 0]] },
    speed: { ta: 'வேகம்', en: 'Speed', units: [
      ['kmh', 'கிமீ/மணி', 'km/h', 1 / 3.6], ['ms', 'மீ/வினாடி', 'm/s', 1], ['mph', 'மைல்/மணி', 'mph', 0.44704], ['knot', 'நாட்', 'knot', 1852 / 3600]] },
    time: { ta: 'நேரம்', en: 'Time', units: [
      ['sec', 'வினாடி', 'sec', 1], ['min', 'நிமிடம்', 'min', 60], ['hour', 'மணி', 'hour', 3600], ['day', 'நாள்', 'day', 86400], ['week', 'வாரம்', 'week', 604800]] }
  };
  function unitConvert(catKey, x, from, to) {
    const cat = UNIT_CATS[catKey];
    if (cat.special) {
      const c = from === 'c' ? x : from === 'f' ? (x - 32) * 5 / 9 : x - 273.15;
      return to === 'c' ? c : to === 'f' ? c * 9 / 5 + 32 : c + 273.15;
    }
    const f = id => cat.units.find(u => u[0] === id)[3];
    return x * f(from) / f(to);
  }
  function fmtSig(x, digits) {
    if (!isFinite(x)) return '—';
    if (x === 0) return '0';
    const a = Math.abs(x);
    if (a >= 1e15 || a < 1e-7) return x.toExponential(6).replace('e+', ' × 10^');
    return Number(x.toPrecision(digits || 10)).toLocaleString('en-IN', { maximumFractionDigits: 12 });
  }

  TOOL_IMPL.unitconv = {
    mount(body) {
      const root = makeRoot(body);
      const S = { cat: 'area', val: '1', from: { area: 'cent' }, to: { area: 'sqft' } };
      function paint() {
        const cat = UNIT_CATS[S.cat];
        if (!S.from[S.cat]) { S.from[S.cat] = cat.units[0][0]; S.to[S.cat] = cat.units[1][0]; }
        const opts = cat.units.map(u => [u[0], u[1]]); // short labels so the select never truncates on 360px
        root.innerHTML = purpose('இது எதற்கு? நீளம், எடை, நில அளவு (சென்ட், ஏக்கர், கிரவுண்ட்), லிட்டர், வெப்பநிலை, வேகம், நேரம் ஆகியவற்றை ஒன்றிலிருந்து மற்றொன்றாக மாற்ற.', 'Convert length, weight, land area (cent, acre, ground), volume, temperature, speed and time.') +
          '<div class="cx-chips">' + Object.keys(UNIT_CATS).map(k => '<button type="button" class="cx-chip' + (k === S.cat ? ' on' : '') + '" data-cat="' + k + '">' + UNIT_CATS[k].ta + '</button>').join('') + '</div>' +
          '<div class="cx-grid one">' + field('மதிப்பு (Value)', 'val', S.val) + '</div>' +
          '<div class="cx-grid" style="grid-template-columns:1fr 44px 1fr;align-items:end;margin-top:10px">' +
          selectField('இதிலிருந்து (From)', 'from', opts, S.from[S.cat]) +
          '<button type="button" class="cx-del" data-k="swap" style="background:var(--chip);color:var(--brand)" aria-label="மாற்று (Swap)">⇄</button>' +
          selectField('இதற்கு (To)', 'to', opts, S.to[S.cat]) + '</div>' +
          '<div data-k="out"></div><div data-k="all"></div>' +
          (S.cat === 'area' ? '<details class="cx-det"><summary>ஏன் இப்படி? (Land area factors)</summary><div>' +
            '1 ஏக்கர் = 43,560 சதுர அடி = 100 சென்ட் (அதனால் 1 சென்ட் = 435.6 சதுர அடி).<br>1 கிரவுண்ட் = 2,400 சதுர அடி.<br>1 ஹெக்டேர் = 1,07,639.104 சதுர அடி.<br>1 சதுர மீட்டர் = 10.7639104 சதுர அடி.<br>1 சதுர கெஜம் = 9 சதுர அடி.<br>' +
            '<b>குறிப்பு:</b> சில ஊர்களில் "சென்ட்" / "கிரவுண்ட்" அளவு பழக்கத்தால் சிறிது மாறுபடலாம் — பத்திரத்தில் உள்ள அளவைப் பார்க்கவும்.</div></details>' : '') +
          (S.cat === 'vol' ? '<div class="cx-small">கப் / மேசைக்கரண்டி இங்கே அமெரிக்க அளவு (1 cup = 236.59 ml). சமையலறை அளவு வேறுபடலாம்.</div>' : '');
        let last = '';
        const out = $(root, '[data-k=out]'), all = $(root, '[data-k=all]');
        function calc() {
          S.val = $(root, '[data-k=val]').value;
          S.from[S.cat] = $(root, '[data-k=from]').value; S.to[S.cat] = $(root, '[data-k=to]').value;
          const x = parseNum(S.val);
          if (!isFinite(x)) { out.innerHTML = msgHtml('எண்ணை மட்டும் எழுதவும்.'); all.innerHTML = ''; last = ''; return; }
          const fu = cat.units.find(u => u[0] === S.from[S.cat]), tu = cat.units.find(u => u[0] === S.to[S.cat]);
          const r = unitConvert(S.cat, x, fu[0], tu[0]);
          out.innerHTML = resCard(fmtSig(x) + ' ' + fu[1] + ' =', fmtSig(r) + ' ' + tu[1], fu[2] + ' → ' + tu[2], r.toPrecision(15));
          last = fmtSig(x) + ' ' + fu[2] + ' = ' + fmtSig(r) + ' ' + tu[2];
          all.innerHTML = '<div class="cx-h">எல்லா அலகுகளிலும் (All units)</div>' +
            '<table class="cx-tbl"><tbody>' + cat.units.map(u => {
              const v = unitConvert(S.cat, x, fu[0], u[0]);
              return '<tr' + (u[0] === tu[0] ? ' class="strong"' : '') + '><td>' + u[1] + ' (' + u[2] + ')</td><td data-u="' + u[0] + '" data-v="' + v.toPrecision(15) + '">' + fmtSig(v, 8) + '</td></tr>';
            }).join('') + '</tbody></table>';
        }
        $$(root, '[data-cat]').forEach(b => { b.onclick = () => { S.cat = b.getAttribute('data-cat'); paint(); }; });
        $(root, '[data-k=swap]').onclick = () => {
          const f = $(root, '[data-k=from]'), t = $(root, '[data-k=to]'), tmp = f.value; f.value = t.value; t.value = tmp; calc();
        };
        ['val', 'from', 'to'].forEach(k => { $(root, '[data-k=' + k + ']').addEventListener('input', calc); $(root, '[data-k=' + k + ']').addEventListener('change', calc); });
        calc();
        all.after(actionsEl(() => last));
      }
      paint();
    }
  };
  // exposed read-only for debugging / tests
  TOOL_IMPL.unitconv._cats = UNIT_CATS;

  /* =====================================================================
   * 4. vaippadu — Multiplication tables (வாய்ப்பாடு)
   * ===================================================================== */
  TOOL_IMPL.vaippadu = {
    mount(body) {
      const root = makeRoot(body);
      const S = { mode: 'learn', learn: 5, sel: new Set([5]), upto: 12, words: false, quiz: null };
      const BEST_KEY = 'cx_vaippadu_best';
      const wordsOk = (typeof TamilCore !== 'undefined' && TamilCore && typeof TamilCore.numberToWords === 'function');
      // Tamil words for 1..400, taken from the site's own TamilCore helper
      function tamilNumberWord(n) { try { return wordsOk ? TamilCore.numberToWords(n) : ''; } catch (e) { return ''; } }
      let timers = [];
      function clearTimers() { timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = []; }
      const rnd = n => Math.floor(Math.random() * n);
      function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

      function paint() {
        clearTimers();
        root.innerHTML = purpose('இது எதற்கு? வாய்ப்பாடு (பெருக்கல் வாய்ப்பாடு) 1 முதல் 20 வரை கற்கவும், சோதித்துக் கொள்ளவும்.', 'Learn multiplication tables 1–20 and test yourself.') +
          tabsHtml([['learn', '📖 கற்க'], ['test', '📝 சோதனை'], ['speed', '⚡ வேகச் சவால்']], S.mode, 'data-mode') +
          '<div data-k="main"></div>';
        bindTabs(root, m => { S.mode = m; S.quiz = null; paint(); }, 'data-mode');
        if (S.mode === 'learn') paintLearn(); else if (S.quiz) paintQuiz(); else paintSetup();
      }
      function chipsHtml(multi) {
        let h = '<div class="cx-vgrid">';
        for (let i = 1; i <= 20; i++) {
          const on = multi ? S.sel.has(i) : S.learn === i;
          h += '<button type="button" class="cx-chip' + (on ? ' on' : '') + '" data-n="' + i + '">' + i + '</button>';
        }
        return h + '</div>';
      }
      function optionsHtml() {
        return '<div class="cx-chips"><button type="button" class="cx-chip' + (S.upto === 12 ? ' on' : '') + '" data-upto="12">×12 வரை</button>' +
          '<button type="button" class="cx-chip' + (S.upto === 20 ? ' on' : '') + '" data-upto="20">×20 வரை</button>' +
          (S.mode === 'learn' && wordsOk ? '<button type="button" class="cx-chip' + (S.words ? ' on' : '') + '" data-words="1">🔤 தமிழ் எண் சொல்</button>' : '') + '</div>';
      }
      function bindOptions(refresh) {
        $$(root, '[data-upto]').forEach(b => { b.onclick = () => { S.upto = +b.getAttribute('data-upto'); refresh(); }; });
        const w = $(root, '[data-words]'); if (w) w.onclick = () => { S.words = !S.words; refresh(); };
      }
      function paintLearn() {
        const m = $(root, '[data-k=main]');
        let h = '<div class="cx-small">வாய்ப்பாடு எண்ணைத் தொடவும் (Pick a table):</div>' + chipsHtml(false) + optionsHtml() + '<div class="cx-vlines" data-k="lines">';
        for (let i = 1; i <= S.upto; i++) {
          const p = S.learn * i;
          h += '<div class="cx-vl" data-line="' + i + '">' + S.learn + ' × ' + i + ' = ' + p + (S.words ? '<small>' + esc(tamilNumberWord(p)) + '</small>' : '') + '</div>';
        }
        m.innerHTML = h + '</div>';
        $$(m, '[data-n]').forEach(b => { b.onclick = () => { S.learn = +b.getAttribute('data-n'); paintLearn(); }; });
        bindOptions(paintLearn);
      }
      function paintSetup() {
        const m = $(root, '[data-k=main]');
        const best = lsGet(BEST_KEY, {});
        const bv = best[S.mode];
        m.innerHTML = '<div class="cx-small">' + (S.mode === 'test' ? 'எந்த வாய்ப்பாடுகளில் சோதிக்க வேண்டும்? (பல எண்களைத் தேர்ந்தெடுக்கலாம்) — 10 கேள்விகள்.' : '60 வினாடியில் எத்தனை சரியாகச் சொல்வீர்கள்? வாய்ப்பாடுகளைத் தேர்ந்தெடுக்கவும்.') + '</div>' +
          chipsHtml(true) + '<div class="cx-chips"><button type="button" class="cx-chip" data-all="1">எல்லாம் (1–20)</button><button type="button" class="cx-chip" data-clr="1">அழி</button></div>' + optionsHtml() +
          (bv != null ? '<div class="cx-ok">🏆 சிறந்த மதிப்பெண்: ' + bv + (S.mode === 'test' ? ' / 10' : ' (60 வினாடி)') + '</div>' : '') +
          '<div class="cx-actions"><button type="button" class="cx-btn big wide" data-k="go">▶️ தொடங்கு</button></div><div data-k="warn"></div>';
        $$(m, '[data-n]').forEach(b => {
          b.onclick = () => { const n = +b.getAttribute('data-n'); if (S.sel.has(n)) S.sel.delete(n); else S.sel.add(n); paintSetup(); };
        });
        $(m, '[data-all]').onclick = () => { S.sel = new Set(Array.from({ length: 20 }, (_, i) => i + 1)); paintSetup(); };
        $(m, '[data-clr]').onclick = () => { S.sel = new Set(); paintSetup(); };
        bindOptions(paintSetup);
        $(m, '[data-k=go]').onclick = () => {
          if (!S.sel.size) { $(m, '[data-k=warn]').innerHTML = msgHtml('குறைந்தது ஒரு வாய்ப்பாட்டையாவது தேர்ந்தெடுக்கவும்.'); return; }
          ensureAudio(); startQuiz();
        };
      }
      function makeQuestion() {
        const tabs = Array.from(S.sel), a = tabs[rnd(tabs.length)], b = 1 + rnd(S.upto), c = a * b;
        const cand = [a * (b + 1), (a + 1) * b, c + 10, c + a, c + b, c + 1, c + 2];
        if (b > 1) cand.push(a * (b - 1));
        if (a > 1) cand.push((a - 1) * b);
        if (c > 10) cand.push(c - 10);
        if (c > 1) cand.push(c - 1);
        const opts = new Set();
        shuffle(cand.filter(v => v > 0 && v !== c)).forEach(v => { if (opts.size < 3) opts.add(v); });
        for (let k = c + 3; opts.size < 3; k++) if (k !== c) opts.add(k);
        return { a, b, c, opts: shuffle([c].concat(Array.from(opts))) };
      }
      function startQuiz() {
        S.quiz = { score: 0, idx: 0, total: S.mode === 'test' ? 10 : 0, cur: makeQuestion(), locked: false, ended: false, deadline: S.mode === 'speed' ? Date.now() + 60000 : 0, asked: 0 };
        paintQuiz();
      }
      function finish() {
        const Q = S.quiz; Q.ended = true; clearTimers();
        const best = lsGet(BEST_KEY, {}); const prev = best[S.mode] || 0; const isBest = Q.score > prev;
        if (isBest) { best[S.mode] = Q.score; lsSet(BEST_KEY, best); }
        paintQuiz(isBest);
      }
      function paintQuiz(isBest) {
        const m = $(root, '[data-k=main]'), Q = S.quiz;
        if (Q.ended) {
          const frac = S.mode === 'test' ? Q.score / Q.total : Math.min(1, Q.score / 20);
          const stars = frac >= 0.9 ? 3 : frac >= 0.7 ? 2 : frac >= 0.4 ? 1 : 0;
          const best = lsGet(BEST_KEY, {});
          m.innerHTML = resCard(S.mode === 'test' ? 'உங்கள் மதிப்பெண்' : '60 வினாடியில் சரியான விடைகள்', Q.score + (S.mode === 'test' ? ' / ' + Q.total : ''),
            '<span data-k="stars" style="font-size:30px">' + '⭐'.repeat(stars) + '☆'.repeat(3 - stars) + '</span>' + (isBest ? '<br>🏆 புதிய சிறந்த மதிப்பெண்!' : '') + (best[S.mode] != null ? '<br>சிறந்தது: ' + best[S.mode] : ''), Q.score, 'ok') +
            '<div class="cx-actions"><button type="button" class="cx-btn big" data-k="again">🔁 மீண்டும்</button><button type="button" class="cx-btn sec big" data-k="back">⬅️ தேர்வுக்குத் திரும்பு</button></div>';
          $(m, '[data-k=again]').onclick = () => { ensureAudio(); startQuiz(); };
          $(m, '[data-k=back]').onclick = () => { S.quiz = null; paint(); };
          return;
        }
        const c = Q.cur;
        m.innerHTML = '<div class="cx-small" style="display:flex;justify-content:space-between;font-weight:800;font-size:14px"><span data-k="prog">' +
          (S.mode === 'test' ? 'கேள்வி ' + (Q.idx + 1) + ' / ' + Q.total : '⏱️ <span data-k="left">60</span> வினாடி') + '</span><span data-k="score">✔ ' + Q.score + '</span></div>' +
          '<div class="cx-q" data-a="' + c.a + '" data-b="' + c.b + '">' + c.a + ' × ' + c.b + ' = ?</div>' +
          '<div class="cx-ans">' + c.opts.map(o => '<button type="button" data-ans="' + o + '">' + o + '</button>').join('') + '</div>' +
          '<div data-k="fb" style="min-height:70px"></div>';
        if (S.mode === 'speed') {
          const left = $(m, '[data-k=left]');
          const tick = () => {
            if (!root.isConnected) { clearTimers(); return; }
            const s = Math.max(0, Math.ceil((Q.deadline - Date.now()) / 1000));
            const el2 = $(root, '[data-k=left]'); if (el2) el2.textContent = s;
            if (Date.now() >= Q.deadline && !Q.ended) finish();
          };
          clearTimers(); timers.push(setInterval(tick, 200)); left.textContent = Math.max(0, Math.ceil((Q.deadline - Date.now()) / 1000));
        }
        $$(m, '[data-ans]').forEach(btn => {
          btn.onclick = () => {
            if (Q.locked || Q.ended) return;
            Q.locked = true;
            const v = +btn.getAttribute('data-ans'), ok = v === c.c, fb = $(m, '[data-k=fb]');
            $$(m, '[data-ans]').forEach(b2 => { if (+b2.getAttribute('data-ans') === c.c) b2.classList.add('right'); });
            if (ok) { Q.score++; btn.classList.add('right'); beep(988, 0.12); fb.innerHTML = '<div class="cx-ok" data-k="fbtxt">✔ சரி! சபாஷ்!</div>'; }
            else { btn.classList.add('wrong'); beep(220, 0.25); fb.innerHTML = '<div class="cx-msg" data-k="fbtxt">✖ தவறு. சரியான விடை: ' + c.c + '</div>'; }
            $(m, '[data-k=score]').textContent = '✔ ' + Q.score;
            const next = () => {
              if (Q.ended) return;
              Q.idx++;
              if (S.mode === 'test' && Q.idx >= Q.total) { finish(); return; }
              if (S.mode === 'speed' && Date.now() >= Q.deadline) { finish(); return; }
              Q.cur = makeQuestion(); Q.locked = false; paintQuiz();
            };
            if (S.mode === 'speed') { timers.push(setTimeout(next, ok ? 350 : 900)); }
            else if (ok) { timers.push(setTimeout(next, 1100)); }
            else { fb.insertAdjacentHTML('beforeend', '<div class="cx-actions"><button type="button" class="cx-btn" data-k="next">அடுத்தது ▶</button></div>'); $(fb, '[data-k=next]').onclick = next; }
          };
        });
      }
      paint();
    }
  };

  /* =====================================================================
   * 5. studytimer — Pomodoro study timer
   * ===================================================================== */
  TOOL_IMPL.studytimer = {
    mount(body) {
      const root = makeRoot(body);
      const LOG_KEY = 'cx_study_log';
      const S = { fm: 25, bm: 5, preset: '25', mode: 'focus', running: false, deadline: 0, remain: 25 * 60000, segStart: 0, timer: null, sound: true, orig: document.title, note: '' };
      const CIRC = 2 * Math.PI * 96;
      const segMs = mode => (mode === 'focus' ? S.fm : S.bm) * 60000;
      function localKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }

      root.innerHTML = purpose('இது எதற்கு? குறிப்பிட்ட நேரம் கவனமாகப் படிக்கவும், இடையில் சிறு ஓய்வு எடுக்கவும் (Pomodoro). இன்று எவ்வளவு படித்தீர்கள் என்றும் காட்டும்.', 'Focus for a set time, then take a short break. Logs your study time.') +
        '<div class="cx-chips" data-k="presets"><button type="button" class="cx-chip on" data-p="25">25 / 5</button><button type="button" class="cx-chip" data-p="45">45 / 10</button><button type="button" class="cx-chip" data-p="custom">✏️ நீங்களே</button></div>' +
        '<div class="cx-grid" data-k="custom" style="display:none">' + field('படிப்பு (நிமிடம்)', 'fm', '30') + field('ஓய்வு (நிமிடம்)', 'bm', '5') + '</div>' +
        '<div class="cx-grid one">' + field('எதை படிக்கிறேன்? (விருப்பம்)', 'note', '', { mode: 'text', ph: 'எ.கா. கணிதம் – அலகு 3' }) + '</div>' +
        '<svg class="cx-big-ring" viewBox="0 0 220 220" role="img" aria-label="Timer">' +
        '<circle cx="110" cy="110" r="96" fill="#fff" stroke="#E6E8EC" stroke-width="14"/>' +
        '<circle data-k="ring" cx="110" cy="110" r="96" fill="none" stroke="#3752A6" stroke-width="14" stroke-linecap="round" transform="rotate(-90 110 110)" stroke-dasharray="' + CIRC.toFixed(2) + '" stroke-dashoffset="0"/>' +
        '<text data-k="time" x="110" y="116" text-anchor="middle" font-size="46" font-weight="900" fill="#20242B" font-family="Inter,Noto Sans Tamil,sans-serif">25:00</text>' +
        '<text data-k="phase" x="110" y="150" text-anchor="middle" font-size="16" font-weight="800" fill="#6B7280" font-family="Noto Sans Tamil,Inter,sans-serif">கவனம்</text></svg>' +
        '<div class="cx-small" data-k="status" style="text-align:center;font-size:14px;font-weight:800"></div>' +
        '<div class="cx-actions" style="justify-content:center"><button type="button" class="cx-btn big" data-k="start">▶️ தொடங்கு</button><button type="button" class="cx-btn sec big" data-k="reset">↺ மீட்டமை</button></div>' +
        '<label class="cx-chk"><input type="checkbox" data-k="sound" checked>🔔 முடிவில் ஒலி / அதிர்வு</label>' +
        '<div class="cx-res ok" style="margin-top:8px"><div class="lbl">இன்று படித்த நேரம் (Today)</div><div class="big" data-k="today">0 நிமிடம்</div></div>' +
        '<div class="cx-h">கடந்த 7 நாட்கள்</div><div data-k="week"></div>' +
        '<div class="cx-small">படிப்பு நேரம் இந்த போனின் உலாவியில் மட்டும் சேமிக்கப்படும்.</div>';

      const q = k => $(root, '[data-k=' + k + ']');
      function fmtMin(sec) {
        const m = Math.floor(sec / 60);
        if (m >= 60) return Math.floor(m / 60) + ' மணி ' + (m % 60) + ' நிமிடம்';
        return m + ' நிமிடம்';
      }
      function addLog(sec) {
        if (!(sec > 0)) return;
        const log = lsGet(LOG_KEY, {}), k = localKey();
        log[k] = (log[k] || 0) + sec; lsSet(LOG_KEY, log);
      }
      function flushFocus() {
        if (S.mode === 'focus' && S.segStart) {
          const end = Math.min(Date.now(), S.deadline || Date.now());
          addLog(Math.max(0, (end - S.segStart) / 1000));
        }
        S.segStart = 0;
      }
      function renderLog() {
        const log = lsGet(LOG_KEY, {}), now = new Date(), days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          days.push({ d, k: localKey(d), s: log[localKey(d)] || 0 });
        }
        let todaySec = days[6].s;
        if (S.running && S.mode === 'focus' && S.segStart) todaySec += Math.max(0, (Date.now() - S.segStart) / 1000);
        q('today').textContent = fmtMin(todaySec);
        q('today').setAttribute('data-sec', Math.round(todaySec));
        const mx = Math.max(60, ...days.map(x => x.s));
        q('week').innerHTML = days.map(x =>
          '<div class="cx-daybar"><span>' + WEEK_TA[x.d.getDay()].slice(0, 3) + ' ' + pad2(x.d.getDate()) + '-' + pad2(x.d.getMonth() + 1) + '</span><span class="trk"><i style="width:' + (x.s / mx * 100).toFixed(1) + '%"></i></span><span>' + Math.floor(x.s / 60) + ' நிமி</span></div>').join('');
      }
      function draw() {
        const total = segMs(S.mode), rem = Math.max(0, S.remain);
        const secs = Math.ceil(rem / 1000);
        q('time').textContent = pad2(Math.floor(secs / 60)) + ':' + pad2(secs % 60);
        q('ring').setAttribute('stroke-dashoffset', (CIRC * (1 - (total ? rem / total : 0))).toFixed(2));
        q('ring').setAttribute('stroke', S.mode === 'focus' ? '#3752A6' : '#1E8E5A');
        q('phase').textContent = S.mode === 'focus' ? '📖 கவனம் (Focus)' : '☕ ஓய்வு (Break)';
        q('start').textContent = S.running ? '⏸️ நிறுத்து (Pause)' : (rem < total ? '▶️ தொடர்' : '▶️ தொடங்கு');
        if (S.running) document.title = pad2(Math.floor(secs / 60)) + ':' + pad2(secs % 60) + ' ' + (S.mode === 'focus' ? '📖' : '☕') + ' ' + S.orig;
        else document.title = S.orig;
        renderLog();
      }
      function stopTimer() { if (S.timer) { clearInterval(S.timer); S.timer = null; } }
      function status(t) { q('status').textContent = t; }
      function start() {
        ensureAudio();
        if (S.remain <= 0) S.remain = segMs(S.mode);
        S.running = true; S.deadline = Date.now() + S.remain;
        S.segStart = S.mode === 'focus' ? Date.now() : 0;
        stopTimer(); S.timer = setInterval(tick, 250);
        status(S.mode === 'focus' ? 'படியுங்கள்! 💪' : 'சிறிது ஓய்வெடுங்கள் ☕');
        draw();
      }
      function pause() {
        if (!S.running) return;
        S.remain = Math.max(0, S.deadline - Date.now());
        flushFocus(); S.running = false; stopTimer(); status('நிறுத்தப்பட்டது'); draw();
      }
      function reset() {
        flushFocus(); S.running = false; stopTimer(); S.mode = 'focus'; S.remain = segMs('focus'); status(''); draw();
      }
      function chime() {
        if (!S.sound) return;
        beep(880, 0.25); setTimeout(() => beep(1175, 0.35), 320);
        try { if (navigator.vibrate) navigator.vibrate([250, 120, 250]); } catch (e) { /* ignore */ }
      }
      function complete() {
        chime();
        if (S.mode === 'focus') {
          flushFocus();
          S.mode = 'break'; S.remain = segMs('break'); S.running = true;
          S.deadline = Date.now() + S.remain; S.segStart = 0;
          status('🎉 நன்று! இப்போது ஓய்வு நேரம்.');
        } else {
          S.mode = 'focus'; S.remain = segMs('focus'); S.running = false; S.segStart = 0; stopTimer();
          status('☕ ஓய்வு முடிந்தது. மீண்டும் படிக்கத் தயாரா?');
        }
        draw();
      }
      function tick() {
        if (!root.isConnected) { stopTimer(); S.running = false; document.title = S.orig; return; } // tool closed
        const rem = S.deadline - Date.now();
        if (rem <= 0) { S.remain = 0; complete(); } else { S.remain = rem; draw(); }
      }
      q('start').onclick = () => { S.running ? pause() : start(); };
      q('reset').onclick = reset;
      q('sound').onchange = () => { S.sound = q('sound').checked; };
      function setDurations(f, b) { reset(); S.fm = f; S.bm = b; S.remain = segMs('focus'); draw(); }
      $$(root, '[data-p]').forEach(btn => {
        btn.onclick = () => {
          const p = btn.getAttribute('data-p'); S.preset = p;
          $$(root, '[data-p]').forEach(b => b.classList.toggle('on', b === btn));
          q('custom').style.display = p === 'custom' ? '' : 'none';
          if (p === '25') setDurations(25, 5); else if (p === '45') setDurations(45, 10); else applyCustom();
        };
      });
      function applyCustom() {
        const f = parseNum(q('fm').value), b = parseNum(q('bm').value);
        if (!(f >= 1 && f <= 180 && b >= 1 && b <= 60)) { status('படிப்பு 1–180 நிமிடம், ஓய்வு 1–60 நிமிடம் எழுதவும்.'); return; }
        setDurations(f, b);
      }
      q('fm').addEventListener('input', applyCustom); q('bm').addEventListener('input', applyCustom);
      draw();
    }
  };

  /* =====================================================================
   * 6. wordcount — Word & Letter Counter
   * ===================================================================== */
  TOOL_IMPL.wordcount = {
    mount(body) {
      const root = makeRoot(body);
      const SAMPLE = 'படிப்பு நம்மை உயர்த்தும். Learning never exhausts the mind.\n\nஒவ்வொரு நாளும் சிறிது நேரம் படியுங்கள். Practice every day.';
      let undoStack = [];
      root.innerHTML = purpose('இது எதற்கு? எழுத்துக்களையும் சொற்களையும் எண்ண, படிக்க ஆகும் நேரம் தெரிந்துகொள்ள, எழுத்து வடிவத்தை (பெரிய/சிறிய எழுத்து) மாற்ற. தமிழிலும் வேலை செய்யும்.', 'Count words, letters and lines; change case; tidy text. Works for Tamil.') +
        '<div class="cx-f"><label>உங்கள் உரை (Text)</label><textarea data-k="ta" rows="6" placeholder="இங்கே தட்டச்சு செய்யவும் அல்லது ஒட்டவும்…"></textarea></div>' +
        '<div class="cx-actions" style="margin-top:8px"><button type="button" class="cx-btn sec" data-k="clear">🗑️ அழி</button><button type="button" class="cx-btn sec" data-k="undo" disabled>↩️ முன்னிலை (Undo)</button><button type="button" class="cx-btn" data-k="copy">📋 நகலெடு (Copy)</button></div>' +
        '<div class="cx-h">மாற்றுக (Tools)</div><div class="cx-chips">' +
        [['upper', 'UPPERCASE'], ['lower', 'lowercase'], ['title', 'Title Case'], ['spaces', 'கூடுதல் இடைவெளி நீக்கு'], ['empty', 'வெற்று வரிகள் நீக்கு'], ['dups', 'நகல் வரிகள் நீக்கு']]
          .map(b => '<button type="button" class="cx-chip" data-op="' + b[0] + '">' + b[1] + '</button>').join('') + '</div>' +
        '<div data-k="stats"></div><div data-k="kw"></div>';
      const ta = $(root, '[data-k=ta]');
      ta.value = SAMPLE;

      function graphemes(text) {
        const t = text.replace(/\s+/g, '');
        try {
          if (typeof Intl !== 'undefined' && Intl.Segmenter) {
            let n = 0; for (const _ of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t)) n++; return n;
          }
        } catch (e) { /* fallback below */ }
        const m = t.match(/\P{M}\p{M}*/gu); return m ? m.length : 0;
      }
      function wordsOf(text) { const t = text.trim(); return t ? t.split(/\s+/) : []; }
      function analyse(text) {
        const words = wordsOf(text);
        const chars = Array.from(text).length;
        const noSpace = Array.from(text.replace(/\s/g, '')).length;
        const lines = text === '' ? 0 : text.split(/\r\n|\r|\n/).length;
        const sentences = text.split(/[.!?…]+(?=\s|$)/).filter(s => s.trim() && /[\p{L}\p{N}]/u.test(s)).length;
        const paras = text.split(/\n\s*\n/).filter(s => s.trim()).length;
        return { words: words.length, chars, noSpace, letters: graphemes(text), lines, sentences, paras, wordList: words };
      }
      function readTime(w) {
        if (w === 0) return '0';
        const mins = w / 200;
        if (mins < 1) return 'சுமார் ' + Math.max(1, Math.round(mins * 60)) + ' வினாடி';
        return 'சுமார் ' + (mins < 10 ? fmt(Math.round(mins * 10) / 10, 1) : Math.round(mins)) + ' நிமிடம்';
      }
      function update() {
        const text = ta.value, a = analyse(text);
        const cell = (k, v, key) => '<div class="cx-stat"><div class="k">' + k + '</div><div class="v" data-s="' + key + '">' + v + '</div></div>';
        $(root, '[data-k=stats]').innerHTML = '<div class="cx-h">எண்ணிக்கை (Counts)</div><div class="cx-grid" style="margin-top:8px">' +
          cell('சொற்கள் (Words)', a.words, 'words') + cell('எழுத்துகள் (Characters)', a.chars, 'chars') +
          cell('இடைவெளி இல்லாமல்', a.noSpace, 'nospace') + cell('தமிழ்/எழுத்து உருக்கள்', a.letters, 'letters') +
          cell('வரிகள் (Lines)', a.lines, 'lines') + cell('வாக்கியங்கள்', a.sentences, 'sentences') +
          cell('பத்திகள் (Paragraphs)', a.paras, 'paras') + cell('படிக்கும் நேரம்', readTime(a.words), 'read') + '</div>' +
          '<div class="cx-small">படிக்கும் நேரம் நிமிடத்துக்கு சுமார் 200 சொற்கள் என்ற கணக்கில். "எழுத்து உருக்கள்" = இடைவெளி தவிர்த்த காட்சி எழுத்துகள் (உயிர்மெய் ஒரு எழுத்தாக).</div>';
        // keyword density: top 5 words
        const counts = new Map(); let total = 0;
        text.toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).forEach(w => { if (Array.from(w).length >= 2) { counts.set(w, (counts.get(w) || 0) + 1); total++; } });
        const top = Array.from(counts.entries()).sort((x, y) => y[1] - x[1]).slice(0, 5);
        $(root, '[data-k=kw]').innerHTML = '<div class="cx-h">அடிக்கடி வரும் சொற்கள் (Top 5 keywords)</div>' +
          (top.length ? tableHtml(top.map(([w, c]) => [esc(w), c + ' (' + fmt(c / Math.max(1, a.words) * 100, 1) + ' %)'])) : '<div class="cx-small">உரை எழுதினால் இங்கே தெரியும்.</div>');
      }
      function setText(t) {
        if (t === ta.value) return;
        undoStack.push(ta.value); if (undoStack.length > 20) undoStack.shift();
        ta.value = t; $(root, '[data-k=undo]').disabled = false; update();
      }
      const OPS = {
        upper: t => t.toUpperCase(),
        lower: t => t.toLowerCase(),
        title: t => t.toLowerCase().replace(/(^|[\s\-(\["'“‘])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()),
        spaces: t => t.split(/\r?\n/).map(l => l.replace(/[ \t ]+/g, ' ').trim()).join('\n'),
        empty: t => t.split(/\r?\n/).filter(l => l.trim() !== '').join('\n'),
        dups: t => { const seen = new Set(); return t.split(/\r?\n/).filter(l => { const k = l.trim(); if (k === '') return true; if (seen.has(k)) return false; seen.add(k); return true; }).join('\n'); }
      };
      $$(root, '[data-op]').forEach(b => { b.onclick = () => setText(OPS[b.getAttribute('data-op')](ta.value)); });
      $(root, '[data-k=clear]').onclick = () => { setText(''); ta.focus(); };
      $(root, '[data-k=undo]').onclick = function () {
        if (!undoStack.length) return;
        ta.value = undoStack.pop(); this.disabled = !undoStack.length; update();
      };
      $(root, '[data-k=copy]').onclick = function () { copyText(ta.value, this); };
      ta.addEventListener('input', update);
      update();
    }
  };

  /* =====================================================================
   * 7. sipcalc — SIP / Lumpsum / FD / RD calculator
   * Pure formulas are exposed on TOOL_IMPL.sipcalc._f for testing.
   * ===================================================================== */
  const FIN = {
    // SIP: payment at the START of each month, monthly compounding.
    sip(P, annual, years) {
      const n = Math.round(years * 12), r = annual / 12 / 100;
      const fv = r === 0 ? P * n : P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
      return { n, invested: P * n, fv };
    },
    lump(P, annual, years) { return { invested: P, fv: P * Math.pow(1 + annual / 100, years) }; },
    // FD: m = compounding periods per year; m = 0 → simple interest paid at maturity
    fd(P, annual, years, m) {
      const fv = m === 0 ? P * (1 + annual / 100 * years) : P * Math.pow(1 + annual / 100 / m, m * years);
      return { invested: P, fv };
    },
    // RD: deposit at the start of each month; interest compounded quarterly (i = rate/4).
    // A deposit that stays (n−k+1) months earns (1+i)^((n−k+1)/3). Closed form with q = (1+i)^(1/3):
    // M = D · q · (q^n − 1) / (q − 1)
    rd(D, annual, months) {
      const n = Math.round(months), i = annual / 100 / 4;
      if (i === 0) return { n, invested: D * n, fv: D * n };
      const q = Math.pow(1 + i, 1 / 3);
      return { n, invested: D * n, fv: D * q * (Math.pow(q, n) - 1) / (q - 1) };
    }
  };
  TOOL_IMPL.sipcalc = {
    mount(body) {
      const root = makeRoot(body);
      const D = {
        sip: { amt: '5000', rate: '10', yrs: '10' }, lump: { amt: '100000', rate: '10', yrs: '10' },
        fd: { amt: '100000', rate: '7', yrs: '5', comp: '4' }, rd: { amt: '5000', rate: '6.5', mon: '24' }
      };
      let mode = 'sip', inflOn = true, infl = '6';
      function paint() {
        root.innerHTML = purpose('இது எதற்கு? மாதம் மாதம் சேமித்தால் (SIP / RD) அல்லது ஒரு தொகையை முதலீடு செய்தால் (Lumpsum / FD) பின்னர் எவ்வளவு ஆகும் என்று மதிப்பிட.', 'Estimate how savings or a deposit may grow.') +
          '<div class="cx-info" data-k="notice">⚠️ இது ஒரு மதிப்பீடு மட்டுமே. பங்குச்சந்தை முதலீட்டின் வருமானம் உறுதியானது அல்ல; இது முதலீட்டு ஆலோசனை அல்ல.</div>' +
          tabsHtml([['sip', 'SIP'], ['lump', 'Lumpsum'], ['fd', 'FD'], ['rd', 'RD']], mode, 'data-mode') +
          '<div data-k="form"></div>' +
          '<label class="cx-chk"><input type="checkbox" data-k="inflon"' + (inflOn ? ' checked' : '') + '>📉 விலைவாசி உயர்வைக் கழித்துப் பார் (Inflation)</label>' +
          '<div class="cx-grid one" data-k="inflbox" style="' + (inflOn ? '' : 'display:none') + '">' + field('விலைவாசி உயர்வு ஆண்டுக்கு (%)', 'infl', infl) + '</div>' +
          '<div data-k="out"></div><div data-k="method"></div>';
        bindTabs(root, m => { mode = m; paint(); }, 'data-mode');
        const f = $(root, '[data-k=form]'), d = D[mode];
        if (mode === 'sip') f.innerHTML = '<div class="cx-grid">' + field('மாதத் தொகை ₹ (Monthly)', 'amt', d.amt) + field('எதிர்பார்க்கும் ஆண்டு வருமானம் %', 'rate', d.rate) + '</div><div class="cx-grid one">' + field('எத்தனை ஆண்டுகள்', 'yrs', d.yrs) + '</div>';
        else if (mode === 'lump') f.innerHTML = '<div class="cx-grid">' + field('முதலீடு ₹ (Amount)', 'amt', d.amt) + field('எதிர்பார்க்கும் ஆண்டு வருமானம் %', 'rate', d.rate) + '</div><div class="cx-grid one">' + field('எத்தனை ஆண்டுகள்', 'yrs', d.yrs) + '</div>';
        else if (mode === 'fd') f.innerHTML = '<div class="cx-grid">' + field('வைப்புத் தொகை ₹ (Principal)', 'amt', d.amt) + field('வட்டி % (ஆண்டுக்கு)', 'rate', d.rate) + '</div><div class="cx-grid">' + field('எத்தனை ஆண்டுகள்', 'yrs', d.yrs) +
          selectField('வட்டி சேர்க்கும் முறை', 'comp', [['4', 'காலாண்டுக்கு (Quarterly)'], ['12', 'மாதம் (Monthly)'], ['1', 'ஆண்டுக்கு (Yearly)'], ['0', 'முதிர்வில் எளிய வட்டி (Simple)']], d.comp) + '</div>';
        else f.innerHTML = '<div class="cx-grid">' + field('மாத வைப்பு ₹ (Monthly deposit)', 'amt', d.amt) + field('வட்டி % (ஆண்டுக்கு)', 'rate', d.rate) + '</div><div class="cx-grid one">' + field('எத்தனை மாதங்கள்', 'mon', d.mon) + '</div>';

        const out = $(root, '[data-k=out]');
        let last = '';
        function calc() {
          Object.keys(d).forEach(k => { const e = $(root, '[data-k=' + k + ']'); if (e) d[k] = e.value; });
          inflOn = $(root, '[data-k=inflon]').checked; infl = $(root, '[data-k=infl]').value;
          $(root, '[data-k=inflbox]').style.display = inflOn ? '' : 'none';
          const amt = parseNum(d.amt), rate = parseNum(d.rate), yrs = parseNum(d.yrs), mon = parseNum(d.mon), ir = parseNum(infl);
          const errs = [];
          if (!(amt > 0)) errs.push('தொகையை 0-ஐ விடப் பெரிதாக எழுதவும்.');
          if (!(rate >= 0 && rate <= 100)) errs.push('வட்டி / வருமான % ஐ 0 முதல் 100-க்குள் எழுதவும்.');
          if (mode === 'rd') { if (!(mon >= 1 && mon <= 600 && Number.isInteger(mon))) errs.push('மாதங்களை 1 முதல் 600-க்குள் முழு எண்ணாக எழுதவும்.'); }
          else if (!(yrs > 0 && yrs <= 60)) errs.push('ஆண்டுகளை 0-ஐ விட அதிகமாகவும் 60-க்குள்ளும் எழுதவும். (SIP-க்கு 1 மாதம் = 0.0833)');
          if (inflOn && !(ir >= 0 && ir <= 50)) errs.push('விலைவாசி உயர்வு % ஐ 0 முதல் 50-க்குள் எழுதவும்.');
          if (errs.length) { out.innerHTML = errs.map(msgHtml).join(''); last = ''; return; }
          let r, years;
          if (mode === 'sip') { r = FIN.sip(amt, rate, yrs); years = r.n / 12; }
          else if (mode === 'lump') { r = FIN.lump(amt, rate, yrs); years = yrs; }
          else if (mode === 'fd') { r = FIN.fd(amt, rate, yrs, +d.comp); years = yrs; }
          else { r = FIN.rd(amt, rate, mon); years = r.n / 12; }
          const gain = r.fv - r.invested, pctInv = r.fv > 0 ? Math.max(0, Math.min(100, r.invested / r.fv * 100)) : 100;
          let html = resCard(mode === 'fd' || mode === 'rd' ? 'முதிர்வுத் தொகை (Maturity value) ≈' : 'எதிர்கால மதிப்பு (Future value) ≈', inr0(r.fv), 'முதலீடு ' + inr0(r.invested) + ' + லாபம் ' + inr0(gain), r.fv);
          html += tableHtml([['மொத்த முதலீடு (Invested)', inr0(r.invested), false, 'inv'], ['மதிப்பீட்டு லாபம் (Est. gain)', inr0(gain), false, 'gain'], ['மொத்த மதிப்பு (Total)', inr0(r.fv), true, 'fv']]);
          html += '<div class="cx-bar" aria-label="Invested vs gain"><i style="width:' + pctInv.toFixed(1) + '%;background:#3752A6"></i><i style="width:' + (100 - pctInv).toFixed(1) + '%;background:#1E8E5A"></i></div>' +
            '<div class="cx-leg"><span><b style="background:#3752A6"></b>முதலீடு ' + pctInv.toFixed(1) + '%</span><span><b style="background:#1E8E5A"></b>லாபம் ' + (100 - pctInv).toFixed(1) + '%</span></div>';
          let realTxt = '';
          if (inflOn) {
            const real = r.fv / Math.pow(1 + ir / 100, years);
            html += '<div class="cx-ok" data-k="real">விலைவாசி ' + fmt(ir, 2) + ' % உயர்ந்தால், இந்த ' + inr0(r.fv) + ' இன் வாங்கும் சக்தி இன்றைய மதிப்பில் ≈ <b data-v="' + real + '">' + inr0(real) + '</b> மட்டுமே.</div>';
            realTxt = ' (இன்றைய மதிப்பில் ≈ ' + inr0(real) + ')';
          }
          out.innerHTML = html;
          const label = { sip: 'SIP', lump: 'Lumpsum', fd: 'FD', rd: 'RD' }[mode];
          last = label + ': முதலீடு ' + inr0(r.invested) + ', மதிப்பீட்டு மதிப்பு ' + inr0(r.fv) + realTxt + '. (மதிப்பீடு மட்டுமே; முதலீட்டு ஆலோசனை அல்ல)';
        }
        root.oninput = calc; root.onchange = calc; // assignment (not addEventListener) so repaint never stacks handlers
        const M = {
          sip: 'SIP: ஒவ்வொரு மாதத் தொடக்கத்திலும் பணம் போடுவதாகக் கொள்கிறது (payment at start of month).<br>r = ஆண்டு % ÷ 12 ÷ 100, n = ஆண்டுகள் × 12<br>FV = P × (((1+r)<sup>n</sup> − 1) ÷ r) × (1+r)',
          lump: 'Lumpsum: ஆண்டுக்கு ஒருமுறை வட்டி சேரும்.<br>FV = P × (1 + ஆண்டு%/100)<sup>ஆண்டுகள்</sup>',
          fd: 'FD: FV = P × (1 + r/m)<sup>m×ஆண்டுகள்</sup> (m = ஆண்டுக்குச் சேரும் முறை: காலாண்டு 4, மாதம் 12, ஆண்டு 1).<br>"எளிய வட்டி" தேர்ந்தால்: FV = P × (1 + r × ஆண்டுகள்).',
          rd: 'RD: வங்கிகள் பொதுவாகக் காலாண்டுக்கு ஒருமுறை வட்டி சேர்க்கும். i = ஆண்டு% ÷ 4 ÷ 100.<br>ஒவ்வொரு மாத வைப்பும் மீதமுள்ள மாதங்களுக்கு (1+i)<sup>(மாதங்கள்/3)</sup> ஆக வளரும்:<br>M = D × Σ (1+i)<sup>(n−k+1)/3</sup>, k = 1…n<br>= D × q × (q<sup>n</sup> − 1) ÷ (q − 1), q = (1+i)<sup>1/3</sup>.<br>உங்கள் வங்கியின் உண்மையான முதிர்வுத் தொகை சிறிது மாறுபடலாம்.'
        };
        $(root, '[data-k=method]').innerHTML = '<details class="cx-det"><summary>கணக்கு முறை (How it is calculated)</summary><div>' + M[mode] + '<br><br>விலைவாசி: இன்றைய மதிப்பு = FV ÷ (1 + விலைவாசி%)<sup>ஆண்டுகள்</sup>. வரி, கட்டணங்கள் சேர்க்கப்படவில்லை.</div></details>';
        calc();
        $(root, '[data-k=method]').after(actionsEl(() => last));
      }
      paint();
    }
  };
  TOOL_IMPL.sipcalc._f = FIN;

  /* =====================================================================
   * 8. gstcalc — GST calculator (works in integer paise to keep totals exact)
   * ===================================================================== */
  function gstCalc(mode, price, qty, rate) {
    const amtP = Math.round(price * qty * 100);
    let baseP, gstP, totalP;
    if (mode === 'add') { baseP = amtP; gstP = Math.round(baseP * rate / 100); totalP = baseP + gstP; }
    else { totalP = amtP; gstP = Math.round(totalP - totalP / (1 + rate / 100)); baseP = totalP - gstP; }
    const cP = Math.floor(gstP / 2);
    return { baseP, gstP, totalP, cgstP: cP, sgstP: gstP - cP };
  }
  TOOL_IMPL.gstcalc = {
    mount(body) {
      const root = makeRoot(body);
      const S = { mode: 'add', price: '1000', qty: '1', rate: '18', split: 'intra' };
      root.innerHTML = purpose('இது எதற்கு? விலையுடன் GST சேர்க்க, அல்லது GST சேர்ந்த விலையிலிருந்து GST-ஐப் பிரித்துக் காண. CGST / SGST / IGST பிரிப்பும் காட்டும்.', 'Add GST to a price or remove GST from a price; CGST/SGST/IGST split.') +
        tabsHtml([['add', 'GST சேர் (Add)'], ['remove', 'GST நீக்கு (Remove)']], S.mode, 'data-mode') +
        '<div class="cx-grid">' + field('<span data-k="plabel"></span>', 'price', S.price) + field('எண்ணிக்கை (Quantity)', 'qty', S.qty) + '</div>' +
        '<div class="cx-h">GST வீதம் % (Rate)</div><div class="cx-chips">' +
        [0, 3, 5, 12, 18, 28, 40].map(r => '<button type="button" class="cx-chip' + (S.rate === String(r) ? ' on' : '') + '" data-rate="' + r + '">' + r + '%</button>').join('') + '</div>' +
        '<div class="cx-grid one">' + field('வேறு வீதம் (Custom %)', 'rate', S.rate) + '</div>' +
        '<div class="cx-info">அரசு GST வீதங்களை அவ்வப்போது மாற்றும் — உங்கள் பொருளுக்குப் பொருந்தும் வீதத்தைத் தேர்ந்தெடுக்கவும். (' + REVISE + ')</div>' +
        tabsHtml([['intra', 'ஒரே மாநிலம் (CGST + SGST)'], ['inter', 'வேறு மாநிலம் (IGST)']], S.split, 'data-split') +
        '<div data-k="out"></div>';
      const q = k => $(root, '[data-k=' + k + ']');
      let last = '';
      function calc() {
        S.price = q('price').value; S.qty = q('qty').value; S.rate = q('rate').value;
        q('plabel').textContent = S.mode === 'add' ? 'GST இல்லாத விலை ₹ (ஒரு பொருள்)' : 'GST சேர்ந்த விலை ₹ (ஒரு பொருள்)';
        $$(root, '[data-rate]').forEach(b => b.classList.toggle('on', b.getAttribute('data-rate') === String(parseNum(S.rate))));
        const price = parseNum(S.price), qty = parseNum(S.qty), rate = parseNum(S.rate), out = q('out');
        const errs = [];
        if (!(price >= 0)) errs.push('விலையை எண்ணாக எழுதவும்.');
        if (!(qty > 0)) errs.push('எண்ணிக்கை 0-ஐ விடப் பெரிதாக இருக்க வேண்டும்.');
        if (!(rate >= 0 && rate <= 100)) errs.push('GST வீதத்தை 0 முதல் 100-க்குள் எழுதவும்.');
        if (errs.length) { out.innerHTML = errs.map(msgHtml).join(''); last = ''; return; }
        const r = gstCalc(S.mode, price, qty, rate), P = n => inr2(n / 100);
        const half = fmt(rate / 2, 2);
        const rows = [['அடிப்படை விலை (Taxable value)', P(r.baseP), false, 'base']];
        if (S.split === 'intra') { rows.push(['CGST ' + half + '%', P(r.cgstP), false, 'cgst'], ['SGST ' + half + '%', P(r.sgstP), false, 'sgst']); }
        else rows.push(['IGST ' + fmt(rate, 2) + '%', P(r.gstP), false, 'igst']);
        rows.push(['மொத்த GST (Total GST)', P(r.gstP), false, 'gst'], ['மொத்தத் தொகை (Total)', P(r.totalP), true, 'total']);
        out.innerHTML = resCard(S.mode === 'add' ? 'GST சேர்ந்த மொத்தத் தொகை' : 'GST இல்லாத அடிப்படை விலை', S.mode === 'add' ? P(r.totalP) : P(r.baseP),
          'GST: ' + P(r.gstP) + ' (' + fmt(rate, 2) + '%) · எண்ணிக்கை ' + fmt(qty, 3), (S.mode === 'add' ? r.totalP : r.baseP) / 100) +
          tableHtml(rows);
        last = (S.mode === 'add' ? 'GST சேர்த்தது' : 'GST நீக்கியது') + ' @' + fmt(rate, 2) + '%: அடிப்படை ' + P(r.baseP) + ', GST ' + P(r.gstP) +
          (S.split === 'intra' ? ' (CGST ' + P(r.cgstP) + ' + SGST ' + P(r.sgstP) + ')' : ' (IGST)') + ', மொத்தம் ' + P(r.totalP);
      }
      bindTabs(root, m => { S.mode = m; $$(root, '[data-mode]').forEach(b => b.classList.toggle('on', b.getAttribute('data-mode') === m)); calc(); }, 'data-mode');
      bindTabs(root, m => { S.split = m; $$(root, '[data-split]').forEach(b => b.classList.toggle('on', b.getAttribute('data-split') === m)); calc(); }, 'data-split');
      $$(root, '[data-rate]').forEach(b => { b.onclick = () => { q('rate').value = b.getAttribute('data-rate'); calc(); }; });
      root.addEventListener('input', calc);
      root.appendChild(actionsEl(() => last));
      calc();
    }
  };
  TOOL_IMPL.gstcalc._calc = gstCalc;

  /* =====================================================================
   * 9. discountcalc — Discount, Profit & Loss, Markup vs Margin
   * ===================================================================== */
  TOOL_IMPL.discountcalc = {
    mount(body) {
      const root = makeRoot(body);
      let tab = 'disc';
      const V = { mrp: '2000', d1: '20', d1t: 'pct', d2: '10', cp: '500', sp: '600', want: '25', cp3: '80', sp3: '100', marg: '20' };
      function paint() {
        root.innerHTML = purpose('இது எதற்கு? தள்ளுபடிக்குப் பின் எவ்வளவு கொடுக்க வேண்டும், கடை லாபம்/நஷ்டம் எத்தனை %, Markup – Margin வேறுபாடு ஆகியவற்றைக் காண.', 'Price after discount, profit/loss %, markup vs margin.') +
          tabsHtml([['disc', '🏷️ தள்ளுபடி'], ['pl', '📊 லாபம்/நஷ்டம்'], ['mm', '⚖️ Markup vs Margin']], tab) + '<div data-k="body"></div>';
        bindTabs(root, t => { tab = t; paint(); });
        ({ disc: pDisc, pl: pPL, mm: pMM })[tab]();
      }
      function bindCalc(b, keys, calc, getLast) {
        b.addEventListener('input', () => { keys.forEach(k => { const e = $(b, '[data-k=' + k + ']'); if (e) V[k] = e.value; }); calc(); });
        calc();
        b.appendChild(actionsEl(getLast));
      }

      function pDisc() {
        const b = $(root, '[data-k=body]');
        b.innerHTML = '<div class="cx-grid">' + field('விலை ₹ (MRP)', 'mrp', V.mrp) + field('தள்ளுபடி (' + (V.d1t === 'pct' ? '%' : '₹') + ')', 'd1', V.d1) + '</div>' +
          '<div class="cx-chips"><button type="button" class="cx-chip' + (V.d1t === 'pct' ? ' on' : '') + '" data-t="pct">% சதவீதம்</button><button type="button" class="cx-chip' + (V.d1t === 'amt' ? ' on' : '') + '" data-t="amt">₹ ரூபாய்</button></div>' +
          '<div class="cx-grid one">' + field('கூடுதல் தள்ளுபடி % (விருப்பம் — எ.கா. "extra 10%")', 'd2', V.d2) + '</div><div data-k="out"></div>';
        $$(b, '[data-t]').forEach(x => { x.onclick = () => { V.d1t = x.getAttribute('data-t'); pDisc(); }; });
        let last = '';
        function calc() {
          const mrp = parseNum(V.mrp), d1 = parseNum(V.d1) || 0, d2 = String(V.d2).trim() === '' ? 0 : parseNum(V.d2), out = $(b, '[data-k=out]');
          const errs = [];
          if (!(mrp >= 0)) errs.push('விலையை (MRP) எண்ணாக எழுதவும்.');
          if (String(V.d1).trim() !== '' && !isFinite(parseNum(V.d1))) errs.push('தள்ளுபடியை எண்ணாக எழுதவும்.');
          if (V.d1t === 'pct' && (d1 < 0 || d1 > 100)) errs.push('தள்ளுபடி % 0 முதல் 100-க்குள் இருக்க வேண்டும்.');
          if (V.d1t === 'amt' && (d1 < 0 || d1 > mrp)) errs.push('தள்ளுபடி ₹ விலையை விட அதிகமாக இருக்க முடியாது.');
          if (!isFinite(d2) || d2 < 0 || d2 > 100) errs.push('கூடுதல் தள்ளுபடி % 0 முதல் 100-க்குள் இருக்க வேண்டும்.');
          if (errs.length) { out.innerHTML = errs.map(msgHtml).join(''); last = ''; return; }
          const p1 = V.d1t === 'pct' ? mrp * (1 - d1 / 100) : mrp - d1, pay = p1 * (1 - d2 / 100), save = mrp - pay;
          const eff = mrp > 0 ? save / mrp * 100 : 0;
          let h = resCard('நீங்கள் கொடுக்க வேண்டியது (You pay)', inr2(pay), 'சேமிப்பு (You save): <b>' + inr2(save) + '</b> (' + fmt(eff, 2) + ' %)', pay, 'ok');
          h += tableHtml([['விலை (MRP)', inr2(mrp)], ['முதல் தள்ளுபடிக்குப் பின்', inr2(p1), false, 'p1'], ['கூடுதல் தள்ளுபடிக்குப் பின் (செலுத்த)', inr2(pay), true, 'pay'], ['மொத்தச் சேமிப்பு', inr2(save), false, 'save']]);
          if (V.d1t === 'pct' && d2 > 0 && d1 > 0) {
            h += '<div class="cx-info" data-k="compound">⚠️ ' + fmt(d1, 2) + '% + ' + fmt(d2, 2) + '% = ' + fmt(d1 + d2, 2) + '% அல்ல! இரண்டாவது தள்ளுபடி குறைந்த விலையின் மேல் கிடைக்கும். உண்மையான மொத்தத் தள்ளுபடி = <b>' + fmt(eff, 2) + ' %</b>.</div>';
          }
          out.innerHTML = h;
          last = 'MRP ' + inr2(mrp) + ' → செலுத்த ' + inr2(pay) + ' (சேமிப்பு ' + inr2(save) + ', ' + fmt(eff, 2) + '%)';
        }
        bindCalc(b, ['mrp', 'd1', 'd2'], calc, () => last);
      }

      function pPL() {
        const b = $(root, '[data-k=body]');
        b.innerHTML = '<div class="cx-grid">' + field('வாங்கிய விலை ₹ (Cost price)', 'cp', V.cp) + field('விற்ற விலை ₹ (Selling price)', 'sp', V.sp) + '</div><div data-k="out"></div>' +
          '<div class="cx-h">இலாப % வைத்து விற்பனை விலை (வாங்கிய விலை மேலே உள்ளதே)</div><div class="cx-grid one">' + field('வேண்டிய இலாபம் %', 'want', V.want) + '</div><div data-k="out2"></div>';
        let last = '';
        function calc() {
          const cp = parseNum(V.cp), sp = parseNum(V.sp), want = parseNum(V.want), out = $(b, '[data-k=out]'), out2 = $(b, '[data-k=out2]');
          let t = '';
          if (!(cp > 0) || !(sp >= 0)) { out.innerHTML = msgHtml('வாங்கிய விலை 0-ஐ விடப் பெரிதாகவும், விற்ற விலை எண்ணாகவும் இருக்க வேண்டும்.'); }
          else {
            const diff = sp - cp, pct = Math.abs(diff) / cp * 100;
            if (diff > 0) out.innerHTML = resCard('லாபம் (Profit)', inr2(diff), 'லாபம் ' + fmt(pct, 2) + ' % (வாங்கிய விலையின் மேல்)', diff, 'ok');
            else if (diff < 0) out.innerHTML = resCard('நஷ்டம் (Loss)', inr2(-diff), 'நஷ்டம் ' + fmt(pct, 2) + ' % (வாங்கிய விலையின் மேல்)', diff, 'bad');
            else out.innerHTML = resCard('லாபமும் இல்லை, நஷ்டமும் இல்லை', '₹ 0', 'Break-even', 0);
            t = 'வாங்கிய ' + inr2(cp) + ', விற்ற ' + inr2(sp) + ' → ' + (diff >= 0 ? 'லாபம் ' : 'நஷ்டம் ') + inr2(Math.abs(diff)) + ' (' + fmt(pct, 2) + '%)';
          }
          if (!(cp > 0) || !isFinite(want) || want < 0 || want > 10000) { out2.innerHTML = msgHtml('வாங்கிய விலையையும் இலாப % ஐயும் சரியாக எழுதவும்.'); }
          else {
            const sell = cp * (1 + want / 100);
            out2.innerHTML = resCard('விற்க வேண்டிய விலை (Selling price)', inr2(sell), fmt(want, 2) + ' % இலாபத்திற்கு — லாபம் ' + inr2(sell - cp), sell);
            t += (t ? '\n' : '') + inr2(cp) + ' + ' + fmt(want, 2) + '% இலாபம் → விற்பனை விலை ' + inr2(sell);
          }
          last = t;
        }
        bindCalc(b, ['cp', 'sp', 'want'], () => { calc(); }, () => last);
      }

      function pMM() {
        const b = $(root, '[data-k=body]');
        b.innerHTML = '<div class="cx-info"><b>Markup</b> = லாபம் ÷ <b>வாங்கிய விலை</b> × 100.<br><b>Margin</b> = லாபம் ÷ <b>விற்ற விலை</b> × 100. இரண்டும் வேறு; Margin எப்போதும் Markup-ஐ விடக் குறைவு.</div>' +
          '<div class="cx-grid">' + field('வாங்கிய விலை ₹ (Cost)', 'cp3', V.cp3) + field('விற்ற விலை ₹ (Selling)', 'sp3', V.sp3) + '</div><div data-k="out"></div>' +
          '<div class="cx-h">Margin % வேண்டுமெனில் விற்பனை விலை (வாங்கிய விலை மேலே உள்ளதே)</div><div class="cx-grid one">' + field('வேண்டிய Margin %', 'marg', V.marg) + '</div><div data-k="out2"></div>';
        let last = '';
        function calc() {
          const cp = parseNum(V.cp3), sp = parseNum(V.sp3), mg = parseNum(V.marg), out = $(b, '[data-k=out]'), out2 = $(b, '[data-k=out2]');
          let t = '';
          if (!(cp > 0) || !(sp > 0)) out.innerHTML = msgHtml('வாங்கிய விலையையும் விற்ற விலையையும் 0-ஐ விடப் பெரிதாக எழுதவும்.');
          else {
            const profit = sp - cp, mk = profit / cp * 100, ma = profit / sp * 100;
            out.innerHTML = resCard('Markup', fmt(mk, 2) + ' %', 'Margin: <b data-v="' + ma + '">' + fmt(ma, 2) + ' %</b> · லாபம் ' + inr2(profit), mk) +
              '<div class="cx-small">Markup ' + fmt(mk, 2) + '% = ' + inr2(profit) + ' ÷ ' + inr2(cp) + '. Margin ' + fmt(ma, 2) + '% = ' + inr2(profit) + ' ÷ ' + inr2(sp) + '.</div>';
            t = 'Cost ' + inr2(cp) + ', Selling ' + inr2(sp) + ' → Markup ' + fmt(mk, 2) + '%, Margin ' + fmt(ma, 2) + '%';
          }
          if (!(cp > 0) || !isFinite(mg) || mg < 0 || mg >= 100) out2.innerHTML = msgHtml('Margin % ஐ 0 முதல் 100-க்குள் (100 தவிர) எழுதவும்.');
          else {
            const sell = cp / (1 - mg / 100);
            out2.innerHTML = resCard('விற்பனை விலை', inr2(sell), fmt(mg, 2) + ' % Margin-க்கு — இது ' + fmt((sell - cp) / cp * 100, 2) + ' % Markup', sell);
            t += (t ? '\n' : '') + fmt(mg, 2) + '% Margin → விற்பனை விலை ' + inr2(sell);
          }
          last = t;
        }
        bindCalc(b, ['cp3', 'sp3', 'marg'], calc, () => last);
      }
      paint();
    }
  };

  /* =====================================================================
   * 10. datecalc — Date calculator (all arithmetic in UTC)
   * ===================================================================== */
  // Years-months-days between two timestamps (a <= b), month-end aware.
  function ymdBetween(a, b) {
    const pa = partsOf(a), pb = partsOf(b);
    let months = (pb.y - pa.y) * 12 + (pb.m - pa.m);
    if (addMonthsUTC(a, months) > b) months--;
    const anchor = addMonthsUTC(a, months);
    return { years: Math.floor(months / 12), months: months % 12, days: Math.round((b - anchor) / DAY_MS) };
  }
  TOOL_IMPL.datecalc = {
    mount(body) {
      const root = makeRoot(body);
      let tab = 'between', incl = false;
      const t0 = todayUTC();
      const V = { a: utcToIso(t0), b: utcToIso(t0 + 30 * DAY_MS), base: utcToIso(t0), n: '45', unit: 'days', dir: 'add', wd: utcToIso(t0), until: utcToIso(mkUTC(partsOf(t0).y + 1, 0, 1)) };
      function paint() {
        root.innerHTML = purpose('இது எதற்கு? இரண்டு தேதிகளுக்கு இடையிலான நாட்கள், ஒரு தேதியுடன் நாட்கள்/மாதங்கள் கூட்ட-கழிக்க, எந்தத் தேதியும் என்ன கிழமை, இன்னும் எத்தனை நாட்கள் என்று அறிய.', 'Days between dates, add/subtract time, weekday, days until.') +
          tabsHtml([['between', 'இடைப்பட்ட நாட்கள்'], ['add', 'கூட்டு / கழி'], ['wd', 'கிழமை'], ['until', 'இன்னும் எத்தனை நாள்']], tab) + '<div data-k="body"></div>';
        bindTabs(root, t => { tab = t; paint(); });
        ({ between: pBetween, add: pAdd, wd: pWd, until: pUntil })[tab]();
      }
      const dateField = (label, key) => '<div class="cx-f"><label>' + label + '</label><input type="date" data-k="' + key + '" value="' + V[key] + '"></div>';
      function wire(b, keys, calc, getLast) {
        b.addEventListener('input', () => { keys.forEach(k => { const e = $(b, '[data-k=' + k + ']'); if (e) V[k] = e.value; }); calc(); });
        b.addEventListener('change', () => { keys.forEach(k => { const e = $(b, '[data-k=' + k + ']'); if (e) V[k] = e.value; }); calc(); });
        calc();
        b.appendChild(actionsEl(getLast));
      }
      const bad = 'தேதியைச் சரியாகத் தேர்ந்தெடுக்கவும் (dd-mm-yyyy).';

      function pBetween() {
        const b = $(root, '[data-k=body]');
        b.innerHTML = '<div class="cx-grid">' + dateField('தொடக்கத் தேதி', 'a') + dateField('முடிவுத் தேதி', 'b') + '</div>' +
          '<label class="cx-chk"><input type="checkbox" data-k="incl"' + (incl ? ' checked' : '') + '>முடிவுத் தேதியையும் சேர்த்து எண்ணு (Include end date)</label><div data-k="out"></div>';
        let last = '';
        const calc = () => {
          incl = $(b, '[data-k=incl]').checked;
          let ta = isoToUTC(V.a), tb = isoToUTC(V.b), out = $(b, '[data-k=out]');
          if (ta == null || tb == null) { out.innerHTML = msgHtml(bad); last = ''; return; }
          let note = '';
          if (ta > tb) { const x = ta; ta = tb; tb = x; note = '<div class="cx-small">தொடக்கம் முடிவுக்குப் பின் இருந்ததால் தேதிகள் மாற்றி எடுக்கப்பட்டன.</div>'; }
          const days = Math.round((tb - ta) / DAY_MS) + (incl ? 1 : 0);
          const y = ymdBetween(ta, incl ? tb + DAY_MS : tb);
          const ymd = [y.years ? y.years + ' ஆண்டு' : '', y.months ? y.months + ' மாதம்' : '', (y.days || (!y.years && !y.months)) ? y.days + ' நாள்' : ''].filter(Boolean).join(' ');
          out.innerHTML = resCard('மொத்த நாட்கள் (Total days)', fmt(days, 0) + ' நாட்கள்', fmtDMY(ta) + ' → ' + fmtDMY(tb) + (incl ? ' (முடிவுத் தேதி உட்பட)' : ''), days) +
            tableHtml([['ஆண்டு-மாதம்-நாள்', ymd, false, 'ymd'], ['வாரங்கள் + நாட்கள்', Math.floor(days / 7) + ' வாரம் ' + (days % 7) + ' நாள்', false, 'weeks'], ['மொத்த மணி நேரம்', fmt(days * 24, 0)]]) + note;
          last = fmtDMY(ta) + ' முதல் ' + fmtDMY(tb) + ' வரை: ' + days + ' நாட்கள் (' + ymd + ')';
        };
        wire(b, ['a', 'b'], calc, () => last);
      }
      function pAdd() {
        const b = $(root, '[data-k=body]');
        b.innerHTML = dateField('தொடக்கத் தேதி', 'base') + '<div class="cx-grid">' + field('எத்தனை (N)', 'n', V.n) +
          selectField('அலகு', 'unit', [['days', 'நாட்கள்'], ['weeks', 'வாரங்கள்'], ['months', 'மாதங்கள்'], ['years', 'ஆண்டுகள்']], V.unit) + '</div>' +
          selectField('செயல்', 'dir', [['add', '➕ கூட்டு (Add)'], ['sub', '➖ கழி (Subtract)']], V.dir) + '<div data-k="out"></div>';
        let last = '';
        const calc = () => {
          const t = isoToUTC(V.base), n = parseNum(V.n), out = $(b, '[data-k=out]');
          if (t == null) { out.innerHTML = msgHtml(bad); last = ''; return; }
          if (!isFinite(n) || n < 0 || !Number.isInteger(n) || n > 100000) { out.innerHTML = msgHtml('N ஒரு முழு எண்ணாக (0 முதல் 1,00,000) இருக்க வேண்டும்.'); last = ''; return; }
          const s = V.dir === 'sub' ? -n : n;
          let r;
          if (V.unit === 'days') r = t + s * DAY_MS; else if (V.unit === 'weeks') r = t + s * 7 * DAY_MS;
          else if (V.unit === 'months') r = addMonthsUTC(t, s); else r = addMonthsUTC(t, s * 12);
          if (!isFinite(r) || Math.abs(partsOf(r).y) > 9999 || partsOf(r).y < 1) { out.innerHTML = msgHtml('முடிவு ஆண்டு 1–9999-க்கு வெளியே உள்ளது.'); last = ''; return; }
          const u = { days: 'நாட்கள்', weeks: 'வாரங்கள்', months: 'மாதங்கள்', years: 'ஆண்டுகள்' }[V.unit];
          out.innerHTML = resCard('முடிவுத் தேதி', fmtDMY(r), WEEK_TA[new Date(r).getUTCDay()] + ' (' + WEEK_EN[new Date(r).getUTCDay()] + ')', utcToIso(r)) +
            '<div class="cx-small">' + fmtDMY(t) + (V.dir === 'sub' ? ' − ' : ' + ') + n + ' ' + u + '. மாத இறுதி நாள் இல்லாவிட்டால் அந்த மாதத்தின் கடைசி நாள் எடுக்கப்படும் (எ.கா. 31 ஜன + 1 மாதம் = 28/29 பிப்).</div>';
          last = fmtDMY(t) + (V.dir === 'sub' ? ' − ' : ' + ') + n + ' ' + u + ' = ' + fmtDMY(r) + ' (' + WEEK_TA[new Date(r).getUTCDay()] + ')';
        };
        wire(b, ['base', 'n', 'unit', 'dir'], calc, () => last);
      }
      function pWd() {
        const b = $(root, '[data-k=body]');
        b.innerHTML = dateField('ஏதேனும் ஒரு தேதி', 'wd') + '<div data-k="out"></div>';
        let last = '';
        const calc = () => {
          const t = isoToUTC(V.wd), out = $(b, '[data-k=out]');
          if (t == null) { out.innerHTML = msgHtml(bad); last = ''; return; }
          const w = new Date(t).getUTCDay();
          out.innerHTML = resCard(fmtDMY(t) + ' — கிழமை', WEEK_TA[w], WEEK_EN[w], w);
          last = fmtDMY(t) + ' = ' + WEEK_TA[w] + ' (' + WEEK_EN[w] + ')';
        };
        wire(b, ['wd'], calc, () => last);
      }
      function pUntil() {
        const b = $(root, '[data-k=body]');
        b.innerHTML = dateField('எதிர்காலத் தேதி (அல்லது கடந்த தேதி)', 'until') + '<div data-k="out"></div>';
        let last = '';
        const calc = () => {
          const t = isoToUTC(V.until), out = $(b, '[data-k=out]');
          if (t == null) { out.innerHTML = msgHtml(bad); last = ''; return; }
          const today = todayUTC(), diff = Math.round((t - today) / DAY_MS);
          const y = ymdBetween(Math.min(t, today), Math.max(t, today));
          const ymd = [y.years ? y.years + ' ஆண்டு' : '', y.months ? y.months + ' மாதம்' : '', y.days ? y.days + ' நாள்' : ''].filter(Boolean).join(' ');
          if (diff > 0) out.innerHTML = resCard(fmtDMY(t) + ' வரை', 'இன்னும் ' + fmt(diff, 0) + ' நாட்கள்', (ymd ? '≈ ' + ymd + ' · ' : '') + Math.floor(diff / 7) + ' வாரம் ' + (diff % 7) + ' நாள் · ' + WEEK_TA[new Date(t).getUTCDay()], diff);
          else if (diff === 0) out.innerHTML = resCard(fmtDMY(t), 'இன்றுதான்! 🎉', WEEK_TA[new Date(t).getUTCDay()], 0, 'ok');
          else out.innerHTML = resCard(fmtDMY(t), fmt(-diff, 0) + ' நாட்களுக்கு முன்', 'அந்தத் தேதி கடந்துவிட்டது' + (ymd ? ' · ' + ymd : ''), diff, 'bad');
          last = fmtDMY(t) + ': ' + (diff > 0 ? 'இன்னும் ' + diff + ' நாட்கள்' : diff === 0 ? 'இன்றுதான்' : (-diff) + ' நாட்களுக்கு முன்');
        };
        wire(b, ['until'], calc, () => last);
      }
      paint();
    }
  };
  TOOL_IMPL.datecalc._f = { addMonthsUTC, ymdBetween, isoToUTC, utcToIso, fmtDMY };

  /* =====================================================================
   * 11. passgen — Strong password / passphrase generator
   * ===================================================================== */
  // 256 common short English words (a power of two; rejection sampling is used anyway).
  const WORDS = ('anchor apple arrow baker bamboo basket beach bench berry bird black blade blue boat bone book boot brave bread breeze brick bridge brook brush bubble button cabin cable cake camel candle canoe canyon card carpet carrot castle chair chalk cheese cherry chess chief cider circle city cliff clock cloud clover coast cobra coconut coin comet compass cookie copper coral cotton crane cricket crown crystal curry daisy dance dawn delta desert diamond dinner dolphin donkey dragon dream drift drum eagle earth echo elbow ember engine fabric falcon farm feather fence field finch flame flower flute forest frog fruit garden garlic ginger glass glider globe goat gold granite grape grass green guitar hammer hammock harbor hawk hazel heart hill honey horse house island ivory jacket jaguar jelly jewel jungle kernel kettle king kite kitten knife ladder lake lamp lantern lemon lilac lion lizard lotus magnet mango maple marble marsh meadow melon meteor mirror monkey moon mosaic mountain mouse muffin nectar needle nest night noble north ocean olive onion orange orbit otter owl paddle palace panda paper parrot peach pearl pebble pepper piano pillow pilot pine pirate planet plum pocket pond poppy pumpkin puzzle quartz queen quill rabbit radar rain raven ribbon river robin rocket rose ruby saddle sailor salt sand sapphire scarf shadow sheep shell shovel silver sketch snow spark spice spider spoon spring squirrel star stone storm sugar summer sunset swan table teapot thunder tiger timber tomato tower train tulip tunnel turtle umbrella valley velvet violin wagon walnut water whale wheat willow window winter wolf yellow zebra').split(' ');

  const SETS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower: 'abcdefghijklmnopqrstuvwxyz',
    digits: '0123456789', symbols: '!@#$%^&*()-_=+[]{}:;,.?'
  };
  // Uniform integer in [0, n) using crypto.getRandomValues + rejection sampling (no modulo bias).
  function randInt(n) {
    const lim = Math.floor(4294967296 / n) * n, buf = new Uint32Array(1);
    let x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= lim);
    return x % n;
  }
  function genPassword(len, opts) {
    const chosen = ['upper', 'lower', 'digits', 'symbols'].filter(k => opts[k]);
    if (!chosen.length) return null;
    const strip = s => opts.avoid ? s.replace(/[0O1lI]/g, '') : s;
    const sets = chosen.map(k => strip(SETS[k])), pool = sets.join('');
    for (let tries = 0; tries < 2000; tries++) { // resample until every selected type appears (keeps it uniform)
      let pw = '';
      for (let i = 0; i < len; i++) pw += pool[randInt(pool.length)];
      if (sets.every(s => Array.from(s).some(ch => pw.includes(ch)))) return { text: pw, bits: len * Math.log2(pool.length), poolSize: pool.length };
    }
    return null;
  }
  function genPassphrase(count, cap) {
    const w = [];
    for (let i = 0; i < count; i++) { let x = WORDS[randInt(WORDS.length)]; if (cap) x = x[0].toUpperCase() + x.slice(1); w.push(x); }
    return { text: w.join('-'), bits: count * Math.log2(WORDS.length) };
  }
  TOOL_IMPL.passgen = {
    mount(body) {
      const root = makeRoot(body);
      const S = { mode: 'pw', len: 16, upper: true, lower: true, digits: true, symbols: true, avoid: false, words: 5, cap: false, cur: null };
      function paint() {
        root.innerHTML = purpose('இது எதற்கு? ஊகிக்க முடியாத வலுவான கடவுச்சொல் (Password) உருவாக்க. இது உங்கள் போனிலேயே உருவாகும்; எங்கும் சேமிக்கவோ அனுப்பவோ மாட்டோம்.', 'Make a strong random password or passphrase. Nothing is stored or sent.') +
          tabsHtml([['pw', '🔑 கடவுச்சொல்'], ['phrase', '🧩 சொல்தொடர் (Passphrase)']], S.mode, 'data-mode') +
          '<div data-k="opts"></div><div data-k="out"></div>' +
          '<div class="cx-det" style="padding:12px"><b>பாதுகாப்புக் குறிப்புகள்</b><ul style="margin:6px 0 0;padding-left:20px;font-size:13px;line-height:1.7">' +
          '<li>ஒரே கடவுச்சொல்லை பல இடங்களில் பயன்படுத்தாதீர்கள்.</li><li>நினைவில் வைக்க Password Manager பயன்படுத்துங்கள்.</li><li>OTP-ஐ யாரிடமும், வங்கி ஊழியர் என்று சொன்னாலும், பகிராதீர்கள்.</li><li>முடிந்தால் 2-step verification இயக்குங்கள்.</li></ul></div>';
        bindTabs(root, m => { S.mode = m; paint(); }, 'data-mode');
        const o = $(root, '[data-k=opts]');
        if (S.mode === 'pw') {
          o.innerHTML = '<div class="cx-f"><label>நீளம் (Length): <b data-k="lenv">' + S.len + '</b></label><input type="range" min="8" max="32" step="1" value="' + S.len + '" data-k="len"></div>' +
            ['upper|பெரிய எழுத்து (A–Z)', 'lower|சிறிய எழுத்து (a–z)', 'digits|எண்கள் (0–9)', 'symbols|குறியீடுகள் (!@#$…)', 'avoid|ஒரே மாதிரி தெரியும் எழுத்துகளைத் தவிர் (0 O 1 l I)']
              .map(x => { const [k, l] = x.split('|'); return '<label class="cx-chk"><input type="checkbox" data-c="' + k + '"' + (S[k] ? ' checked' : '') + '>' + l + '</label>'; }).join('');
        } else {
          o.innerHTML = '<div class="cx-f"><label>சொற்களின் எண்ணிக்கை: <b data-k="wv">' + S.words + '</b></label><input type="range" min="4" max="6" step="1" value="' + S.words + '" data-k="words"></div>' +
            '<label class="cx-chk"><input type="checkbox" data-c="cap"' + (S.cap ? ' checked' : '') + '>ஒவ்வொரு சொல்லும் பெரிய எழுத்தில் தொடங்கட்டும்</label>' +
            '<div class="cx-small">' + WORDS.length + ' ஆங்கிலச் சொற்கள் கொண்ட பட்டியலிலிருந்து தேர்ந்தெடுத்து "-" இட்டு இணைக்கப்படும்.</div>';
        }
        $$(o, '[data-c]').forEach(c => { c.onchange = () => { S[c.getAttribute('data-c')] = c.checked; gen(); }; });
        const lr = $(o, '[data-k=len]'); if (lr) lr.oninput = () => { S.len = +lr.value; $(o, '[data-k=lenv]').textContent = S.len; gen(); };
        const wr = $(o, '[data-k=words]'); if (wr) wr.oninput = () => { S.words = +wr.value; $(o, '[data-k=wv]').textContent = S.words; gen(); };
        gen();
      }
      function strength(bits) {
        if (bits < 40) return ['மிகவும் பலவீனம்', '#C0392B', 20];
        if (bits < 60) return ['பலவீனம்', '#E8894A', 45];
        if (bits < 80) return ['நல்லது', '#D4A017', 70];
        if (bits < 100) return ['வலிமையானது', '#1E8E5A', 88];
        return ['மிக வலிமையானது', '#136B42', 100];
      }
      function gen() {
        const out = $(root, '[data-k=out]');
        const r = S.mode === 'pw' ? genPassword(S.len, S) : genPassphrase(S.words, S.cap);
        if (!r) {
          out.innerHTML = msgHtml('குறைந்தது ஒரு வகையையாவது (பெரிய/சிறிய எழுத்து, எண், குறியீடு) தேர்ந்தெடுக்கவும்.'); S.cur = null; return;
        }
        S.cur = r;
        const [label, color, w] = strength(r.bits);
        out.innerHTML = '<div class="cx-res"><div class="lbl">உங்கள் ' + (S.mode === 'pw' ? 'கடவுச்சொல்' : 'சொல்தொடர்') + '</div><div class="cx-pw" data-k="pw">' + esc(r.text) + '</div>' +
          '<div class="sub">வலிமை: <b data-k="strength">' + label + '</b> · <b data-k="bits">≈ ' + Math.round(r.bits) + ' bits</b></div>' +
          '<div class="cx-meter"><i style="width:' + w + '%;background:' + color + '"></i></div></div>' +
          '<div class="cx-actions"><button type="button" class="cx-btn" data-k="copy">📋 நகலெடு (Copy)</button><button type="button" class="cx-btn sec" data-k="regen">🔄 மறு உருவாக்கு</button></div>';
        $(out, '[data-k=copy]').onclick = function () { copyText(S.cur.text, this); };
        $(out, '[data-k=regen]').onclick = gen;
      }
      paint();
    }
  };
  TOOL_IMPL.passgen._f = { randInt, genPassword, genPassphrase, WORDS, SETS };

  /* ===== 11 more free tools (rupeewords, interestcalc, landconv, bmicalc, numsys, casecvt, jsonfmt, b64, textdiff, markscalc, namepicker) ===== */
  /* =====================================================================
   * FRAGMENT A — rupeewords, interestcalc, landconv, bmicalc, numsys
   * (to be pasted inside the category-extra.js IIFE; all new top-level
   *  names are prefixed A_)
   * ===================================================================== */

  function A_injectStyle() {
    if (document.getElementById('cx-a-style')) return;
    const s = document.createElement('style');
    s.id = 'cx-a-style';
    s.textContent =
      '.cx-a-txt{font-size:18px!important;line-height:1.55!important;font-weight:800!important}' +
      '.cx-a-val{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:18px;font-weight:800;word-break:break-all;overflow-wrap:anywhere;line-height:1.45;background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-top:6px;color:var(--ink)}' +
      '.cx-a-tbl4{width:100%;border-collapse:collapse;margin-top:12px;background:#fff;border:1px solid var(--line);font-size:12.5px}' +
      '.cx-a-tbl4 th{background:#EAF0FF;color:var(--brand-dark);padding:7px 5px;font-weight:900;text-align:right}' +
      '.cx-a-tbl4 th:first-child,.cx-a-tbl4 td:first-child{text-align:left}' +
      '.cx-a-tbl4 td{padding:7px 5px;border-top:1px solid var(--line);text-align:right;font-weight:700}';
    document.head.appendChild(s);
  }
  function A_val(root, k) { const e = $(root, '[data-k="' + k + '"]'); return e ? e.value : ''; }
  function A_wire(root, calc) {
    $$(root, 'input[data-k],select[data-k]').forEach(e => {
      e.addEventListener('input', calc);
      e.addEventListener('change', calc);
    });
  }
  function A_copyBtn(label, key) { return '<button type="button" class="cx-btn sec" data-copy="' + key + '">📋 ' + label + '</button>'; }
  function A_bindCopy(root, getters) {
    $$(root, '[data-copy]').forEach(b => {
      b.onclick = function () { const g = getters[b.getAttribute('data-copy')]; if (g) copyText(g(), this); };
    });
  }

  /* =====================================================================
   * 12. rupeewords — ரூபாய் எழுத்தில்
   * ===================================================================== */
  const A_EN1 = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const A_EN10 = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function A_enBelow100(n) { return n < 20 ? A_EN1[n] : A_EN10[Math.floor(n / 10)] + (n % 10 ? '-' + A_EN1[n % 10] : ''); }
  function A_enBelow1000(n) {
    const h = Math.floor(n / 100), r = n % 100;
    return (h ? A_EN1[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? A_enBelow100(r) : '');
  }
  // Indian system words for integer 0 <= n < 1e11 (crore count may itself be up to 9999)
  function A_enIndian(n) {
    if (n === 0) return 'Zero';
    const cr = Math.floor(n / 1e7); let rem = n % 1e7;
    const lk = Math.floor(rem / 1e5); rem %= 1e5;
    const th = Math.floor(rem / 1e3); rem %= 1e3;
    const p = [];
    if (cr) p.push(A_enIndian(cr) + ' Crore');
    if (lk) p.push(A_enBelow100(lk) + ' Lakh');
    if (th) p.push(A_enBelow100(th) + ' Thousand');
    if (rem) p.push(A_enBelow1000(rem));
    return p.join(' ');
  }

  const A_TA_ONES = ['பூஜ்யம்', 'ஒன்று', 'இரண்டு', 'மூன்று', 'நான்கு', 'ஐந்து', 'ஆறு', 'ஏழு', 'எட்டு', 'ஒன்பது', 'பத்து', 'பதினொன்று', 'பன்னிரண்டு', 'பதிமூன்று', 'பதினான்கு', 'பதினைந்து', 'பதினாறு', 'பதினேழு', 'பதினெட்டு', 'பத்தொன்பது'];
  const A_TA_TENS = [null, null, 'இருபது', 'முப்பது', 'நாற்பது', 'ஐம்பது', 'அறுபது', 'எழுபது', 'எண்பது', 'தொண்ணூறு'];
  const A_TA_HUND = [null, 'நூறு', 'இருநூறு', 'முந்நூறு', 'நானூறு', 'ஐந்நூறு', 'அறுநூறு', 'எழுநூறு', 'எண்ணூறு', 'தொள்ளாயிரம்'];
  const A_TA_SIGN = { 'இ': 'ி', 'ஈ': 'ீ', 'உ': 'ு', 'ஊ': 'ூ', 'எ': 'ெ', 'ஏ': 'ே', 'ஐ': 'ை', 'ஒ': 'ொ', 'ஓ': 'ோ', 'ஔ': 'ௌ', 'ஆ': 'ா' };
  // combining (stem) form of a number word that is followed by more words
  function A_taStem(w) {
    if (w.endsWith('ம்')) return w.slice(0, -2) + 'த்து';   // ஆயிரம் -> ஆயிரத்து
    if (w.endsWith('று')) return w.slice(0, -2) + 'ற்று';   // நூறு -> நூற்று
    if (w.endsWith('து')) return w.slice(0, -2) + 'த்து';   // இருபது -> இருபத்து
    return w;
  }
  // join a stem with the following words; merge vowels (இருபத்து+ஐந்து) or add the வல்லினம் doubling
  function A_taJoin(stem, rest, merge) {
    const f = rest.charAt(0);
    if (merge && A_TA_SIGN[f] && stem.endsWith('ு')) return stem.slice(0, -1) + A_TA_SIGN[f] + rest.slice(1);
    if ('கசதப'.indexOf(f) >= 0) return stem + f + '் ' + rest;
    return stem + ' ' + rest;
  }
  function A_taBelow100(n) { // 1..99
    if (n < 20) return A_TA_ONES[n];
    const t = Math.floor(n / 10), u = n % 10;
    return u ? A_taJoin(A_taStem(A_TA_TENS[t]), A_TA_ONES[u], true) : A_TA_TENS[t];
  }
  function A_taBelow1000(n) { // 1..999
    if (n < 100) return A_taBelow100(n);
    const h = Math.floor(n / 100), r = n % 100, w = A_TA_HUND[h];
    return r ? A_taJoin(A_taStem(w), A_taBelow100(r), true) : w;
  }
  // "ஒரு" form used before லட்சம் / கோடி (ஒன்று -> ஒரு, இருபத்தொன்று -> இருபத்தொரு)
  function A_taOru(w) { return (w.endsWith('ஒன்று') || w.endsWith('ொன்று')) ? w.slice(0, -4) + 'ரு' : w; }
  // multiplier + ஆயிரம் (இருபத்தைந்து -> இருபத்தைந்தாயிரம், இருபத்தொன்று -> இருபத்தோராயிரம்)
  function A_taThousand(m) { // 1..99
    if (m === 1) return 'ஆயிரம்';
    const w = A_taBelow100(m);
    if (w.endsWith('ொன்று')) return w.slice(0, -5) + 'ோராயிரம்';
    return w.slice(0, -1) + 'ாயிரம்';
  }
  // integer 0 <= n < 1e11 -> Tamil words
  function A_taWords(n) {
    if (!Number.isInteger(n) || n < 0 || n >= 1e11) return '';
    if (n === 0) return A_TA_ONES[0];
    const cr = Math.floor(n / 1e7); let rem = n % 1e7;
    const lk = Math.floor(rem / 1e5); rem %= 1e5;
    const th = Math.floor(rem / 1e3); rem %= 1e3;
    const segs = [];
    if (cr) segs.push({ k: 'c', w: (cr === 1 ? 'ஒரு' : A_taOru(A_taWords(cr))) + ' கோடி' });
    if (lk) segs.push({ k: 'l', w: (lk === 1 ? 'ஒரு' : A_taOru(A_taBelow100(lk))) + ' லட்சம்' });
    if (th) segs.push({ k: 't', w: A_taThousand(th) });
    if (rem) segs.push({ k: 'r', w: A_taBelow1000(rem) });
    let out = segs[segs.length - 1].w;
    for (let i = segs.length - 2; i >= 0; i--) {
      const s = segs[i];
      if (s.k === 'c') out = s.w.replace(/கோடி$/, 'கோடியே') + ' ' + out;
      else out = A_taJoin(s.w.replace(/ம்$/, 'த்து'), out, false);
    }
    return out;
  }
  // Parse amount text -> { rupees, paise } | { err }
  function A_parseAmount(text) {
    let s = String(text == null ? '' : text).trim();
    s = s.replace(/[௦-௯]/g, d => String('௦௧௨௩௪௫௬௭௮௯'.indexOf(d))).replace(/[,\s₹]/g, '').replace(/^(rs\.?|inr)/i, '');
    if (s === '') return { empty: true };
    if (/^-/.test(s)) return { err: 'neg' };
    const m = /^(\d*)(?:\.(\d*))?$/.exec(s);
    if (!m || (m[1] === '' && !m[2])) return { err: 'bad' };
    let ip = m[1].replace(/^0+(?=\d)/, ''), fp = m[2] || '';
    if (ip === '') ip = '0';
    if (fp.length > 2 && /[1-9]/.test(fp.slice(2))) return { err: 'dec' };
    fp = (fp + '00').slice(0, 2);
    if (ip.length > 11) return { err: 'big' };
    return { rupees: Number(ip), paise: Number(fp) };
  }
  function A_amountWords(rupees, paise) {
    const en = (rupees || !paise ? 'Rupees ' + A_enIndian(rupees) : '') + (paise ? (rupees ? ' and ' : '') + A_enIndian(paise) + ' Paise' : '') + ' Only';
    const ta = (rupees || !paise ? A_taWords(rupees) + ' ரூபாய்' : '') + (paise ? (rupees ? ' மற்றும் ' : '') + A_taWords(paise) + ' பைசா' : '') + ' மட்டும்';
    return { en: en, ta: ta };
  }
  TOOL_IMPL.rupeewords = {
    mount(body) {
      A_injectStyle();
      const root = makeRoot(body);
      root.innerHTML = purpose('இது எதற்கு? காசோலை, வவுச்சர், ரசீது, பத்திரங்களில் தொகையை எழுத்தில் எழுத — தமிழிலும் ஆங்கிலத்திலும் (இந்திய லட்சம்/கோடி முறை).', 'Write any rupee amount in words, Tamil and English.') +
        field(T('தொகை (₹)', 'Amount (₹)'), 'amt', '125000.50', { ph: '1,25,000.50' }) +
        '<div class="cx-small">' + T('கமா, தமிழ் எண்கள், ₹ குறியீடு — எல்லாம் ஏற்கப்படும். அதிகபட்சம் 99,99,99,99,999.99', 'Commas, Tamil digits and ₹ are fine. Max 99,99,99,99,999.99') + '</div>' +
        '<div data-k="out"></div>';
      const out = $(root, '[data-k=out]');
      let cur = { ta: '', en: '' };
      function calc() {
        try {
          const inp = $(root, '[data-k=amt]');
          const p = A_parseAmount(inp.value);
          inp.classList.remove('bad');
          if (p.empty) { out.innerHTML = ''; cur = { ta: '', en: '' }; return; }
          if (p.err) {
            inp.classList.add('bad'); cur = { ta: '', en: '' };
            out.innerHTML = msgHtml(p.err === 'neg' ? 'எதிர்மறை தொகை ஏற்கப்படாது. நேர்மறை தொகையை உள்ளிடவும்.' :
              p.err === 'big' ? 'தொகை மிகப் பெரியது. அதிகபட்சம் 99,99,99,99,999.99 வரை.' :
              p.err === 'dec' ? 'பைசா 2 இலக்கம் வரை மட்டும் (எ.கா. 125.50).' : 'சரியான தொகையை உள்ளிடவும் (எ.கா. 12500.50).');
            return;
          }
          const w = A_amountWords(p.rupees, p.paise);
          cur = w;
          const num = '₹ ' + fmt(p.rupees, 0, 0) + (p.paise ? '.' + (p.paise < 10 ? '0' : '') + p.paise : '');
          out.innerHTML = resCard(T('தமிழில்', 'In Tamil'), '<span class="cx-a-txt" data-k="ta">' + esc(w.ta) + '</span>', esc(num), null) +
            '<div class="cx-actions">' + A_copyBtn('தமிழ் நகலெடு', 'ta') + '</div>' +
            resCard('English', '<span class="cx-a-txt" data-k="en">' + esc(w.en) + '</span>', esc(num), null, 'ok') +
            '<div class="cx-actions">' + A_copyBtn('Copy English', 'en') + '</div>' +
            '<div class="cx-info">' + T('காசோலை/ஆவணத்தில் எழுதும் முன் எண்ணும் எழுத்தும் ஒன்றுதானா என்று சரிபார்க்கவும்.', 'Always re-check that figures and words match before you write them on a cheque or document.') + '</div>';
          A_bindCopy(out, { ta: () => cur.ta, en: () => cur.en });
        } catch (e) { out.innerHTML = msgHtml('தொகையைக் கணக்கிட முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'); }
      }
      A_wire(root, calc);
      calc();
    }
  };
  TOOL_IMPL.rupeewords._f = { A_enIndian, A_taWords, A_parseAmount, A_amountWords };

  /* =====================================================================
   * 13. interestcalc — வட்டிக் கணிப்பான்
   * ===================================================================== */
  function A_simple(P, rYear, tYears) { return P * rYear * tYears / 100; }
  function A_compoundAmount(P, rYear, tYears, n) { return P * Math.pow(1 + rYear / (100 * n), n * tYears); }
  function A_yearTable(P, rYear, tYears, n, maxRows) {
    const rows = [], last = Math.ceil(tYears - 1e-9), cap = Math.min(last, maxRows || 60);
    let prev = P;
    for (let k = 1; k <= cap; k++) {
      const tk = Math.min(k, tYears), close = A_compoundAmount(P, rYear, tk, n);
      rows.push({ year: tk, open: prev, interest: close - prev, close: close });
      prev = close;
    }
    return { rows: rows, truncated: last > cap };
  }
  TOOL_IMPL.interestcalc = {
    mount(body) {
      A_injectStyle();
      const root = makeRoot(body);
      root.innerHTML = purpose('இது எதற்கு? கடன்/சேமிப்புக்கான வட்டியை தனி வட்டி (Simple) மற்றும் கூட்டு வட்டி (Compound) முறையில் ஒப்பிட்டுப் பார்க்க. மீட்டர் வட்டி (₹100-க்கு மாதம் ₹…) முறையும் உண்டு.', 'Compare simple and compound interest, including "meter" style monthly rates.') +
        field(T('அசல் தொகை (₹)', 'Principal (₹)'), 'p', '100000', { ph: '1,00,000' }) +
        '<div class="cx-grid">' + field(T('வட்டி வீதம்', 'Rate'), 'r', '12', { ph: '12' }) +
        selectField(T('வீதம் எப்படி?', 'Rate basis'), 'basis', [['year', T('ஆண்டுக்கு % (per year)', '% per year')], ['month', T('₹100-க்கு மாதம் ₹ (மீட்டர்)', '₹ per 100 per month')]], 'year') + '</div>' +
        '<div class="cx-grid">' + field(T('காலம்', 'Time'), 't', '2', { ph: '2' }) +
        selectField(T('காலத்தின் அலகு', 'Unit'), 'unit', [['y', T('ஆண்டுகள்', 'Years')], ['m', T('மாதங்கள்', 'Months')], ['d', T('நாட்கள்', 'Days')]], 'y') + '</div>' +
        selectField(T('கூட்டு வட்டி — சேர்க்கும் முறை', 'Compounding'), 'freq', [['1', T('ஆண்டுக்கு ஒருமுறை', 'Yearly')], ['2', T('அரையாண்டுக்கு', 'Half-yearly')], ['4', T('காலாண்டுக்கு', 'Quarterly')], ['12', T('மாதந்தோறும்', 'Monthly')]], '1') +
        '<div data-k="out"></div>';
      const out = $(root, '[data-k=out]');
      let summary = '';
      function calc() {
        try {
          ['p', 'r', 't'].forEach(k => $(root, '[data-k=' + k + ']').classList.remove('bad'));
          const P = parseNum(A_val(root, 'p')), r = parseNum(A_val(root, 'r')), tv = parseNum(A_val(root, 't'));
          const basis = A_val(root, 'basis'), unit = A_val(root, 'unit'), n = Number(A_val(root, 'freq')) || 1;
          const bad = [];
          if (!(P > 0) || P > 1e12) bad.push('p');
          if (!(r >= 0) || r > (basis === 'month' ? 100 : 1000)) bad.push('r');
          const tMax = unit === 'y' ? 100 : unit === 'm' ? 1200 : 36500;
          if (!(tv > 0) || tv > tMax) bad.push('t');
          if (bad.length) {
            bad.forEach(k => $(root, '[data-k=' + k + ']').classList.add('bad'));
            out.innerHTML = msgHtml('எண்களைச் சரிபார்க்கவும்: அசல் தொகை 0-ஐ விட அதிகமாக இருக்க வேண்டும்; வட்டி வீதம் 0 அல்லது அதற்கு மேல்; காலம் 0-ஐ விட அதிகம் (அதிகபட்சம் 100 ஆண்டுகள்).');
            summary = ''; return;
          }
          const rYear = basis === 'month' ? r * 12 : r;
          const rMonth = basis === 'month' ? r : r / 12;
          const tY = unit === 'y' ? tv : unit === 'm' ? tv / 12 : tv / 365;
          const si = A_simple(P, rYear, tY), sTot = P + si;
          const cTot = A_compoundAmount(P, rYear, tY, n), ci = cTot - P;
          if (!isFinite(cTot) || cTot > 1e18) { out.innerHTML = msgHtml('முடிவு மிகப் பெரியது. காலம் அல்லது வீதத்தைக் குறைத்துப் பாருங்கள்.'); summary = ''; return; }
          const unitTa = unit === 'y' ? 'ஆண்டுகள்' : unit === 'm' ? 'மாதங்கள்' : 'நாட்கள்';
          const tbl = A_yearTable(P, rYear, tY, n, 60);
          let h = resCard(T('தனி வட்டி (Simple) — வட்டி', 'Simple interest'), inr2(si), T('மொத்தம் (அசல் + வட்டி): ', 'Total: ') + inr2(sTot), null) +
            resCard(T('கூட்டு வட்டி (Compound) — வட்டி', 'Compound interest'), inr2(ci), T('மொத்தம் (அசல் + வட்டி): ', 'Total: ') + inr2(cTot), null, 'ok') +
            tableHtml([
              [T('அசல் தொகை', 'Principal'), inr2(P)],
              [T('ஆண்டு வட்டி வீதம்', 'Rate per year'), fmt(rYear, 2) + ' %'],
              [T('மாத வட்டி வீதம்', 'Rate per month'), fmt(rMonth, 2) + ' %  (₹100-க்கு ₹' + fmt(rMonth, 2) + ')'],
              [T('காலம்', 'Time'), fmt(tv, 2) + ' ' + unitTa],
              [T('கூட்டு − தனி வட்டி வேறுபாடு', 'Compound − simple'), inr2(ci - si), true]
            ]);
          h += '<div class="cx-h">' + T('ஆண்டு வாரியான கூட்டு வட்டி அட்டவணை', 'Year-wise compound table') + '</div>' +
            '<table class="cx-a-tbl4"><thead><tr><th>' + T('ஆண்டு', 'Year') + '</th><th>' + T('தொடக்கம்', 'Opening') + '</th><th>' + T('வட்டி', 'Interest') + '</th><th>' + T('முடிவு', 'Closing') + '</th></tr></thead><tbody>' +
            tbl.rows.map(x => '<tr><td>' + fmt(x.year, 2) + '</td><td>' + fmt(x.open, 0, 0) + '</td><td>' + fmt(x.interest, 0, 0) + '</td><td>' + fmt(x.close, 0, 0) + '</td></tr>').join('') +
            '</tbody></table>' + (tbl.truncated ? '<div class="cx-small">முதல் 60 ஆண்டுகள் மட்டும் காட்டப்படுகிறது.</div>' : '') +
            '<div class="cx-small">தொகைகள் ₹-ல், முழு எண்ணாக வட்டமிடப்பட்டவை.</div>';
          if (rMonth > 3) {
            const eff = (Math.pow(1 + rMonth / 100, 12) - 1) * 100;
            h += '<div class="cx-info">⚠️ மாதம் 3%-க்கு மேல் (₹100-க்கு ₹3-க்கு மேல்) வட்டி என்பது செலவு மிக அதிகம். இந்த வீதம் ஆண்டுக்கு ≈ ' + fmt(rYear, 1) + '% (தனி வட்டி); மாதந்தோறும் சேர்த்தால் ≈ ' + fmt(eff, 1) + '%. கடன் வாங்கும் முன் மொத்தத் திருப்பிச் செலுத்தும் தொகையை எழுத்தில் கேட்டுப் பாருங்கள்.</div>';
          }
          h += '<div class="cx-info">ℹ️ பதிவு பெற்ற கடன் வழங்குநர்கள் (வங்கி, NBFC போன்றவை) RBI மற்றும் மாநில அரசு விதிகளைப் பின்பற்ற வேண்டும். வட்டி வீதம், கட்டணங்கள், கால அளவு ஆகியவற்றை ஒப்பந்தத்தில் தெளிவாகப் பார்த்துக் கொள்ளுங்கள். இந்தக் கருவி கணிப்புக்கு மட்டும்; சட்ட ஆலோசனை அல்ல.</div>';
          summary = 'வட்டிக் கணிப்பு: அசல் ' + inr2(P) + ', ' + fmt(rYear, 2) + '% ஆண்டுக்கு, ' + fmt(tv, 2) + ' ' + unitTa + '\nதனி வட்டி: ' + inr2(si) + ' (மொத்தம் ' + inr2(sTot) + ')\nகூட்டு வட்டி: ' + inr2(ci) + ' (மொத்தம் ' + inr2(cTot) + ')';
          out.innerHTML = h + '<div data-k="act"></div>';
          $(out, '[data-k=act]').appendChild(actionsEl(() => summary));
        } catch (e) { out.innerHTML = msgHtml('கணக்கிட முடியவில்லை. மதிப்புகளைச் சரிபார்க்கவும்.'); }
      }
      A_wire(root, calc);
      calc();
    }
  };
  TOOL_IMPL.interestcalc._f = { A_simple, A_compoundAmount, A_yearTable };

  /* =====================================================================
   * 14. landconv — நில அளவு மாற்றி
   * ===================================================================== */
  const A_SQM_FT = 10.7639104167;
  const A_LAND = [ // [key, Tamil, English, sq ft per unit]
    ['sqft', 'சதுர அடி', 'Sq ft', 1],
    ['sqm', 'சதுர மீட்டர்', 'Sq m', A_SQM_FT],
    ['sqyd', 'சதுர கஜம்', 'Sq yd', 9],
    ['cent', 'சென்ட்', 'Cent', 435.6],
    ['ground', 'மனை (Ground)', 'Ground', 2400],
    ['guntha', 'குண்டா (Guntha)', 'Guntha', 1089],
    ['acre', 'ஏக்கர்', 'Acre', 43560],
    ['hectare', 'ஹெக்டேர்', 'Hectare', 10000 * A_SQM_FT]
  ];
  function A_landFactor(key) { const u = A_LAND.find(x => x[0] === key); return u ? u[3] : NaN; }
  function A_landConvert(value, fromKey) { // -> { sqft, sqm, ... } for every unit
    const sqft = value * A_landFactor(fromKey), r = {};
    A_LAND.forEach(u => { r[u[0]] = sqft / u[3]; });
    return r;
  }
  function A_landFmt(v) { return fmt(v, Math.abs(v) < 1 ? 6 : 4, 0); }
  TOOL_IMPL.landconv = {
    mount(body) {
      A_injectStyle();
      const root = makeRoot(body);
      const opts = A_LAND.map(u => [u[0], T(u[1], u[2])]);
      root.innerHTML = purpose('இது எதற்கு? நிலம்/மனையின் அளவை சதுர அடி, சென்ட், மனை (கிரவுண்ட்), ஏக்கர், ஹெக்டேர் போன்ற அலகுகளுக்கு இடையே மாற்ற. எல்லா அலகுகளும் ஒரே நேரத்தில் தெரியும்.', 'Convert land area between all common units at once.') +
        '<div class="cx-grid">' + field(T('அளவு', 'Value'), 'v', '1', { ph: '1' }) + selectField(T('எந்த அலகிலிருந்து?', 'From unit'), 'from', opts, 'cent') + '</div>' +
        '<div data-k="out"></div>' +
        '<div class="cx-h">' + T('மனை அளவு உதவி (நீளம் × அகலம்)', 'Plot size helper (length × width)') + '</div>' +
        '<div class="cx-grid three">' + field(T('நீளம்', 'Length'), 'len', '60', { ph: '60' }) + field(T('அகலம்', 'Width'), 'wid', '40', { ph: '40' }) +
        selectField(T('அலகு', 'Unit'), 'du', [['ft', T('அடி', 'Feet')], ['m', T('மீட்டர்', 'Metres')]], 'ft') + '</div>' +
        '<div data-k="out2"></div>' +
        '<div class="cx-info">' + T('குறிப்பு: குழி, வேலி, மா, காணி போன்ற உள்ளூர் நில அளவு அலகுகள் பகுதிக்குப் பகுதி மாறுபடும். எனவே அவற்றுக்கு உங்கள் கிராம/தாலுகா பதிவேட்டில் (பட்டா, சிட்டா, FMB) சரிபார்த்துக் கொள்ளுங்கள்.', 'Local survey units like kuzhi, veli, ma and kani vary by region. Confirm with your village/taluk records.') + '</div>' +
        '<div class="cx-small">1 சதுர மீட்டர் = 10.7639104167 சதுர அடி · 1 சதுர கஜம் = 9 சதுர அடி · 1 சென்ட் = 435.6 சதுர அடி · 1 மனை = 2400 சதுர அடி · 1 ஏக்கர் = 100 சென்ட் = 43,560 சதுர அடி · 1 குண்டா = 1089 சதுர அடி · 1 ஹெக்டேர் = 10,000 சதுர மீட்டர்</div>';
      const o1 = $(root, '[data-k=out]'), o2 = $(root, '[data-k=out2]');
      let t1 = '', t2 = '';
      function table(res, fromKey) {
        return '<table class="cx-tbl"><tbody>' + A_LAND.map(u =>
          '<tr' + (u[0] === fromKey ? ' class="strong"' : '') + '><td>' + T(u[1], u[2]) + '</td><td data-r="' + u[0] + '">' + A_landFmt(res[u[0]]) + '</td></tr>').join('') + '</tbody></table>';
      }
      function text(res, head) { return head + '\n' + A_LAND.map(u => u[1] + ': ' + A_landFmt(res[u[0]])).join('\n'); }
      function calc() {
        try {
          const vEl = $(root, '[data-k=v]'), from = A_val(root, 'from'), v = parseNum(vEl.value);
          vEl.classList.remove('bad');
          if (vEl.value.trim() === '') { o1.innerHTML = ''; t1 = ''; }
          else if (!(v >= 0) || v > 1e12) { vEl.classList.add('bad'); o1.innerHTML = msgHtml('சரியான அளவை (0 அல்லது அதற்கு மேல்) உள்ளிடவும்.'); t1 = ''; }
          else {
            const res = A_landConvert(v, from);
            o1.innerHTML = table(res, from) + '<div data-k="act"></div>';
            t1 = text(res, fmt(v, 4) + ' ' + A_LAND.find(u => u[0] === from)[1] + ' =');
            $(o1, '[data-k=act]').appendChild(actionsEl(() => t1));
          }
          const lEl = $(root, '[data-k=len]'), wEl = $(root, '[data-k=wid]');
          lEl.classList.remove('bad'); wEl.classList.remove('bad');
          if (lEl.value.trim() === '' && wEl.value.trim() === '') { o2.innerHTML = ''; return; }
          const l = parseNum(lEl.value), w = parseNum(wEl.value);
          if (!(l > 0) || !(w > 0) || l > 1e7 || w > 1e7) {
            (l > 0 ? wEl : lEl).classList.add('bad');
            o2.innerHTML = msgHtml('நீளம், அகலம் இரண்டும் 0-ஐ விட அதிகமாக இருக்க வேண்டும்.'); t2 = ''; return;
          }
          const du = A_val(root, 'du'), area = l * w, res2 = A_landConvert(area, du === 'm' ? 'sqm' : 'sqft');
          o2.innerHTML = '<div class="cx-small">' + fmt(l, 2) + ' × ' + fmt(w, 2) + (du === 'm' ? ' மீ' : ' அடி') + '</div>' + table(res2, du === 'm' ? 'sqm' : 'sqft') + '<div data-k="act2"></div>';
          t2 = text(res2, 'மனை ' + fmt(l, 2) + ' × ' + fmt(w, 2) + (du === 'm' ? ' மீ' : ' அடி') + ' =');
          $(o2, '[data-k=act2]').appendChild(actionsEl(() => t2));
        } catch (e) { o1.innerHTML = msgHtml('கணக்கிட முடியவில்லை. மதிப்புகளைச் சரிபார்க்கவும்.'); }
      }
      A_wire(root, calc);
      calc();
    }
  };
  TOOL_IMPL.landconv._f = { A_LAND, A_landFactor, A_landConvert };

  /* =====================================================================
   * 15. bmicalc — BMI கணிப்பான்
   * ===================================================================== */
  function A_bmi(kg, m) { return kg / (m * m); }
  function A_bmiCat(b) { // b rounded to 1 decimal first so the label matches what is shown
    const x = Math.round(b * 10) / 10;
    if (x < 18.5) return { id: 'under', ta: 'குறைந்த எடை (Underweight)' };
    if (x < 25) return { id: 'normal', ta: 'இயல்பான எடை (Normal)' };
    if (x < 30) return { id: 'over', ta: 'அதிக எடை (Overweight)' };
    return { id: 'obese', ta: 'உடல் பருமன் (Obesity)' };
  }
  function A_healthyRange(m) { return { lo: 18.5 * m * m, hi: 24.9 * m * m }; }
  const A_lbToKg = lb => lb * 0.45359237;
  const A_kgToLb = kg => kg / 0.45359237;
  const A_ftInToCm = (ft, inch) => (ft * 12 + inch) * 2.54;
  TOOL_IMPL.bmicalc = {
    mount(body) {
      A_injectStyle();
      const root = makeRoot(body);
      root.innerHTML = purpose('இது எதற்கு? உயரம்–எடை அடிப்படையில் BMI (உடல் நிறை குறியீடு) என்ற ஒரு திரையிடல் எண்ணைப் பார்க்க. இது நோய்க்கண்டறிதல் அல்ல.', 'Quick BMI screening number from height and weight. Not a diagnosis.') +
        selectField(T('உயர அலகு', 'Height unit'), 'hu', [['cm', T('சென்டிமீட்டர் (cm)', 'Centimetres')], ['ft', T('அடி + அங்குலம்', 'Feet + inches')]], 'cm') +
        '<div data-k="hcm">' + field(T('உயரம் (cm)', 'Height (cm)'), 'cm', '170', { ph: '170' }) + '</div>' +
        '<div data-k="hft" class="cx-grid" style="display:none">' + field(T('அடி (ft)', 'Feet'), 'ft', '5', { ph: '5' }) + field(T('அங்குலம் (in)', 'Inches'), 'inch', '7', { ph: '7' }) + '</div>' +
        '<div class="cx-grid">' + field(T('எடை', 'Weight'), 'w', '70', { ph: '70' }) + selectField(T('எடை அலகு', 'Weight unit'), 'wu', [['kg', 'கிலோ (kg)'], ['lb', 'பவுண்டு (lb)']], 'kg') + '</div>' +
        field(T('வயது (விருப்பம்)', 'Age (optional)'), 'age', '', { ph: T('எ.கா. 30', 'e.g. 30'), mode: 'numeric' }) +
        '<div data-k="out"></div>' +
        '<div class="cx-info">' + T('BMI ஒரு திரையிடல் எண் மட்டுமே; நோய்க்கண்டறிதல் அல்ல. 18 வயதுக்குக் கீழே, கர்ப்ப காலத்தில், விளையாட்டு வீரர்கள்/தசை அதிகம் உள்ளவர்கள், முதியவர்களுக்கு இது சரியாகப் பொருந்தாது. உடல்நலம் குறித்த கேள்விகளுக்கு ஒரு மருத்துவரிடம் கேளுங்கள்.', 'BMI is a screening number, not a diagnosis. It does not apply well to children, pregnancy, athletes or older adults. Ask a doctor about your health.') + '</div>';
      const out = $(root, '[data-k=out]');
      let summary = '';
      function calc() {
        try {
          const hu = A_val(root, 'hu');
          $(root, '[data-k=hcm]').style.display = hu === 'cm' ? '' : 'none';
          $(root, '[data-k=hft]').style.display = hu === 'ft' ? '' : 'none';
          ['cm', 'ft', 'inch', 'w', 'age'].forEach(k => $(root, '[data-k=' + k + ']').classList.remove('bad'));
          let cm;
          if (hu === 'cm') cm = parseNum(A_val(root, 'cm'));
          else {
            const ftv = parseNum(A_val(root, 'ft')), inv = A_val(root, 'inch').trim() === '' ? 0 : parseNum(A_val(root, 'inch'));
            cm = (ftv >= 0 && inv >= 0) ? A_ftInToCm(ftv, inv) : NaN;
          }
          const wv = parseNum(A_val(root, 'w')), wu = A_val(root, 'wu');
          const kg = wu === 'lb' ? A_lbToKg(wv) : wv;
          const ageTxt = A_val(root, 'age').trim(), age = ageTxt === '' ? null : parseNum(ageTxt);
          const bad = [];
          if (!(cm >= 50 && cm <= 250)) bad.push(hu === 'cm' ? 'cm' : 'ft');
          if (!(kg >= 10 && kg <= 350)) bad.push('w');
          if (age !== null && !(age >= 0 && age <= 120)) bad.push('age');
          if (bad.length) {
            bad.forEach(k => $(root, '[data-k=' + k + ']').classList.add('bad'));
            out.innerHTML = msgHtml('சரியான மதிப்புகளை உள்ளிடவும்: உயரம் 50–250 cm, எடை 10–350 kg (≈ 22–770 lb), வயது 0–120.'); summary = ''; return;
          }
          const m = cm / 100, b = A_bmi(kg, m), cat = A_bmiCat(b), hr = A_healthyRange(m);
          const child = age !== null && age < 18;
          let h = resCard(T('உங்கள் BMI', 'Your BMI'), fmt(b, 1, 1), child ? 'BMI-ஐ மட்டும் காட்டுகிறோம்; வகைப்பாடு இல்லை.' : T('WHO வகை: ', 'WHO class: ') + cat.ta, null, !child && cat.id === 'normal' ? 'ok' : '');
          if (child) {
            h += '<div class="cx-ok">18 வயதுக்குக் குறைவானவர்களுக்கு பெரியவர்களுக்கான BMI வகைகள் பொருந்தாது. குழந்தைகள்/இளையோரின் வளர்ச்சி, வயது மற்றும் பாலினத்துக்கு ஏற்ற வளர்ச்சி வரைபடத்தில் (growth chart) பார்க்கப்படும். ஒரு மருத்துவரிடம் கேளுங்கள்.</div>';
          } else {
            h += tableHtml([
              [T('உயரம்', 'Height'), fmt(cm, 1) + ' cm  (' + Math.floor(cm / 2.54 / 12) + ' அடி ' + fmt(cm / 2.54 - Math.floor(cm / 2.54 / 12) * 12, 1) + ' அங்.)'],
              [T('எடை', 'Weight'), fmt(kg, 1) + ' kg  (' + fmt(A_kgToLb(kg), 1) + ' lb)'],
              [T('இந்த உயரத்துக்கு இயல்பான எடை வரம்பு (BMI 18.5–24.9)', 'Healthy weight range'), fmt(hr.lo, 1) + ' – ' + fmt(hr.hi, 1) + ' kg', true],
              ['', fmt(A_kgToLb(hr.lo), 0) + ' – ' + fmt(A_kgToLb(hr.hi), 0) + ' lb']
            ]);
            const x = Math.round(b * 10) / 10;
            h += '<div class="cx-info"><b>WHO பொது வரம்புகள்:</b> 18.5-க்குக் கீழ் குறைந்த எடை · 18.5–24.9 இயல்பு · 25–29.9 அதிக எடை · 30 மற்றும் மேல் உடல் பருமன்.<br><b>ஆசிய-பசிபிக் குறிப்பு:</b> ஆசியர்களுக்கு 23 (கூடுதல் ஆபத்து தொடக்கம்) மற்றும் 27.5 (உயர் ஆபத்து) ஆகியவை WHO Asia-Pacific ஆபத்துப் புள்ளிகளாகக் கருதப்படுகின்றன. உங்கள் BMI ' + fmt(b, 1, 1) + ' — ' +
              (x < 23 ? '23-க்குக் கீழ் உள்ளது.' : x < 27.5 ? '23 முதல் 27.4 வரம்பில் உள்ளது.' : '27.5-க்கு மேல் உள்ளது.') + ' இது ஒரு குறிப்பு மட்டுமே, நோய்க்கண்டறிதல் அல்ல.</div>';
          }
          h += '<div class="cx-ok">உங்கள் எடை, உணவு, உடல்நலம் குறித்த முடிவுகளுக்கு ஒரு மருத்துவரிடம் கேளுங்கள்.</div><div data-k="act"></div>';
          summary = 'BMI: ' + fmt(b, 1, 1) + (child ? '' : ' (' + cat.ta + ')') + '\nஉயரம் ' + fmt(cm, 1) + ' cm, எடை ' + fmt(kg, 1) + ' kg' + (child ? '' : '\nஇயல்பான எடை வரம்பு: ' + fmt(hr.lo, 1) + ' – ' + fmt(hr.hi, 1) + ' kg') + '\nBMI ஒரு திரையிடல் எண் மட்டுமே; மருத்துவரிடம் கேளுங்கள்.';
          out.innerHTML = h;
          $(out, '[data-k=act]').appendChild(actionsEl(() => summary));
        } catch (e) { out.innerHTML = msgHtml('கணக்கிட முடியவில்லை. மதிப்புகளைச் சரிபார்க்கவும்.'); }
      }
      A_wire(root, calc);
      calc();
    }
  };
  TOOL_IMPL.bmicalc._f = { A_bmi, A_bmiCat, A_healthyRange, A_lbToKg, A_kgToLb, A_ftInToCm };

  /* =====================================================================
   * 16. numsys — எண் முறை மாற்றி
   * ===================================================================== */
  const A_NS_MAX = 9007199254740991n; // 2^53 - 1
  const A_NS_BASES = [
    [10, 'தசமம் (Decimal)', 'அடிப்படை 10 — இலக்கங்கள் 0–9. ஒவ்வோர் இடமும் 10-இன் அடுக்கு (1, 10, 100, 1000…). அன்றாட எண்ணுமுறை.'],
    [2, 'ஈரடி (Binary)', 'அடிப்படை 2 — 0 மற்றும் 1 மட்டும். ஒவ்வோர் இடமும் 2-இன் அடுக்கு (1, 2, 4, 8…). கணினியின் அடிப்படை மொழி.'],
    [8, 'எண்மம் (Octal)', 'அடிப்படை 8 — இலக்கங்கள் 0–7. 3 பிட் = 1 இலக்கம். Linux கோப்பு அனுமதிகளில் (எ.கா. 755) பயன்படும்.'],
    [16, 'பதினறுமம் (Hexadecimal)', 'அடிப்படை 16 — 0–9, A–F (A=10 … F=15). 4 பிட் = 1 இலக்கம். நிறக் குறியீடு (#FF8800), MAC முகவரியில் பயன்படும்.']
  ];
  // parse text in a base -> { v: BigInt } | { empty } | { err: 'bad'|'big' }
  function A_nsParse(text, base) {
    let s = String(text == null ? '' : text).trim();
    s = s.replace(/[௦-௯]/g, d => String('௦௧௨௩௪௫௬௭௮௯'.indexOf(d))).replace(/[,\s_]/g, '');
    if (s === '') return { empty: true };
    if (base === 16) s = s.replace(/^0x/i, '');
    else if (base === 2) s = s.replace(/^0b/i, '');
    else if (base === 8) s = s.replace(/^0o/i, '');
    const re = base === 2 ? /^[01]+$/ : base === 8 ? /^[0-7]+$/ : base === 10 ? /^\d+$/ : /^[0-9a-f]+$/i;
    if (!re.test(s)) return { err: 'bad' };
    let v = 0n; const B = BigInt(base);
    for (const ch of s.toLowerCase()) {
      v = v * B + BigInt(parseInt(ch, 16));
      if (v > A_NS_MAX) return { err: 'big' };
    }
    return { v: v };
  }
  function A_nsToBase(v, base) { return v.toString(base).toUpperCase(); }
  function A_nsGroup(s, size) { // group digits from the right
    const out = []; for (let i = s.length; i > 0; i -= size) out.unshift(s.slice(Math.max(0, i - size), i));
    return out.join(' ');
  }
  // decimal -> binary by repeated division; first `max` steps
  function A_nsDivSteps(v, max) {
    let n = Number(v); const steps = [];
    if (n === 0) return { steps: [{ n: 0, q: 0, r: 0 }], total: 1 };
    let total = 0;
    while (n > 0) {
      const q = Math.floor(n / 2), r = n % 2;
      if (total < (max || 16)) steps.push({ n: n, q: q, r: r });
      total++; n = q;
    }
    return { steps: steps, total: total };
  }
  // binary digits -> place values (all bits when <= 16 bits, otherwise only the 1-bits)
  function A_nsPlaces(bin) {
    const L = bin.length, rows = [];
    for (let i = 0; i < L; i++) {
      const bit = bin[i] === '1' ? 1 : 0, p = L - 1 - i;
      if (bit || L <= 16) rows.push({ bit: bit, p: p, val: bit * Math.pow(2, p) });
    }
    return rows;
  }
  TOOL_IMPL.numsys = {
    mount(body) {
      A_injectStyle();
      const root = makeRoot(body);
      root.innerHTML = purpose('இது எதற்கு? தசமம், ஈரடி (Binary), எண்மம் (Octal), பதினறுமம் (Hex) எண் முறைகளுக்கு இடையே மாற்ற; மாற்றும் படிகளையும் புரிந்துகொள்ள.', 'Convert integers between decimal, binary, octal and hex, with the working shown.') +
        '<div class="cx-grid">' + field(T('எண்', 'Number'), 'n', '2025', { ph: '2025', mode: 'text' }) +
        selectField(T('இந்த எண் எந்த முறையில்?', 'Input base'), 'base', [['10', 'தசமம் (10)'], ['2', 'ஈரடி (2)'], ['8', 'எண்மம் (8)'], ['16', 'பதினறுமம் (16)']], '10') + '</div>' +
        '<div class="cx-small">' + T('0 முதல் 9,007,199,254,740,991 (2^53 − 1) வரை முழு எண்கள். 0x, 0b, கமா, இடைவெளி — ஏற்கப்படும்.', 'Whole numbers from 0 up to 2^53 − 1.') + '</div>' +
        '<div data-k="out"></div>';
      const out = $(root, '[data-k=out]');
      let vals = {};
      function calc() {
        try {
          const inp = $(root, '[data-k=n]'), base = Number(A_val(root, 'base'));
          inp.classList.remove('bad');
          const p = A_nsParse(inp.value, base);
          if (p.empty) { out.innerHTML = ''; return; }
          if (p.err) {
            inp.classList.add('bad');
            out.innerHTML = msgHtml(p.err === 'big' ? 'எண் மிகப் பெரியது. அதிகபட்சம் 9,007,199,254,740,991 (2^53 − 1).' :
              'இந்த முறைக்குப் பொருந்தாத எழுத்து உள்ளது. ' + (base === 2 ? 'ஈரடியில் 0, 1 மட்டும்.' : base === 8 ? 'எண்மத்தில் 0–7 மட்டும்.' : base === 10 ? 'தசமத்தில் 0–9 மட்டும்; எதிர்மறை/தசம புள்ளி இல்லை.' : 'பதினறுமத்தில் 0–9, A–F மட்டும்.'));
            return;
          }
          const v = p.v; vals = {};
          let h = '';
          A_NS_BASES.forEach(b => {
            const raw = A_nsToBase(v, b[0]);
            vals[b[0]] = raw;
            const shown = b[0] === 10 ? fmt(Number(v), 0, 0) : b[0] === 2 ? A_nsGroup(raw, 4) : raw;
            h += '<div class="cx-rowbox"><div class="cx-small" style="margin-top:0"><b>' + b[1] + '</b></div><div class="cx-a-val" data-v="' + b[0] + '">' + esc(shown) + '</div>' +
              '<div class="cx-small">' + b[2] + '</div><div class="cx-actions" style="margin-top:8px">' + A_copyBtn('நகலெடு', 'c' + b[0]) + '</div></div>';
          });
          const bin = vals[2], ds = A_nsDivSteps(v, 16), pl = A_nsPlaces(bin);
          h += '<div class="cx-h">தசமம் → ஈரடி: 2-ஆல் வகுக்கும் முறை</div>' +
            '<div class="cx-small" style="margin-top:4px">தசம எண்ணை 2-ஆல் தொடர்ந்து வகுத்து, ஒவ்வொரு படியிலும் மீதியை (0 அல்லது 1) எழுதுங்கள். பின் மீதிகளைக் கீழிருந்து மேலாகப் படித்தால் ஈரடி எண் கிடைக்கும்.</div>' +
            tableHtml(ds.steps.map((s, i) => [(i + 1) + '. ' + s.n + ' ÷ 2', 'ஈவு ' + s.q + ', மீதி <b>' + s.r + '</b>'])) +
            (ds.total > ds.steps.length ? '<div class="cx-small">முதல் 16 படிகள் மட்டும் காட்டப்படுகின்றன (மொத்தம் ' + ds.total + ' படிகள்). மீதிகளை கீழிருந்து மேலாகப் படித்தால்: ' + esc(bin) + '</div>' :
              '<div class="cx-ok">மீதிகளைக் கீழிருந்து மேலாகப் படித்தால்: <b>' + esc(bin) + '</b></div>');
          h += '<div class="cx-h">ஈரடி → தசமம்: இட மதிப்பு</div>' +
            '<div class="cx-small" style="margin-top:4px">ஈரடி எண் <b>' + esc(bin) + '</b> — வலமிருந்து ஒவ்வோர் இடமும் 2-இன் அடுக்கு (1, 2, 4, 8…). ' + (bin.length > 16 ? '1 உள்ள இடங்கள் மட்டும் கீழே:' : 'ஒவ்வோர் இலக்கத்தையும் அதன் இட மதிப்பால் பெருக்கிக் கூட்டுங்கள்:') + '</div>' +
            tableHtml(pl.map(r => [r.bit + ' × 2<sup>' + r.p + '</sup>', fmt(r.val, 0, 0)]).concat([['கூட்டுத்தொகை', fmt(Number(v), 0, 0), true]]));
          out.innerHTML = h;
          A_bindCopy(out, { c10: () => vals[10], c2: () => vals[2], c8: () => vals[8], c16: () => vals[16] });
        } catch (e) { out.innerHTML = msgHtml('மாற்ற முடியவில்லை. எண்ணைச் சரிபார்க்கவும்.'); }
      }
      A_wire(root, calc);
      calc();
    }
  };
  TOOL_IMPL.numsys._f = { A_nsParse, A_nsToBase, A_nsGroup, A_nsDivSteps, A_nsPlaces };


  /* =====================================================================
   * FRAGMENT B — casecvt, jsonfmt, b64, textdiff, markscalc, namepicker
   * (all new top-level names are prefixed B_)
   * ===================================================================== */

  const B_CSS = `
  .cx-root .cx-file{position:relative}
  .cx-root textarea.cxb-ta{font-family:ui-monospace,Menlo,Consolas,'Noto Sans Tamil',monospace;font-size:15px;line-height:1.5;resize:vertical;min-height:120px;display:block}
  .cxb-pre{margin:10px 0 0;padding:8px 10px;border-radius:10px;background:#fff;border:1px solid #F5C6C2;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-all;color:#333}
  .cxb-pre mark{background:#F5B7B1;color:#7B241C;border-radius:3px;padding:0 2px;font-weight:900}
  .cxb-dl{margin-top:12px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff}
  .cxb-d{display:flex;gap:6px;align-items:flex-start;padding:4px 8px;font:13px/1.5 ui-monospace,Menlo,Consolas,'Noto Sans Tamil',monospace;border-left:4px solid transparent}
  .cxb-d .n{flex:0 0 34px;text-align:right;opacity:.55;font-size:11.5px;padding-top:1px}
  .cxb-d .s{flex:0 0 12px;font-weight:900}
  .cxb-d .t{flex:1 1 auto;white-space:pre-wrap;word-break:break-word}
  .cxb-d .t:empty:before{content:'\\21B5';opacity:.4}
  .cxb-add{background:#E3F6EB;border-left-color:#1E8E5A;color:#136B42}
  .cxb-del{background:#FDEDEC;border-left-color:#C0392B;color:#9B2C20}
  .cxb-same{background:#F3F4F6;border-left-color:#C9CDD3;color:#555}
  .cxb-t{width:100%;border-collapse:collapse;margin-top:12px;background:#fff;border:1px solid var(--line);font-size:13px}
  .cxb-t th{background:var(--chip);padding:7px 6px;text-align:left;font-size:12px}
  .cxb-t td{padding:7px 6px;border-top:1px solid var(--line);vertical-align:top}
  .cxb-t td.r,.cxb-t th.r{text-align:right}
  .cxb-t tr.hi td{background:#E3F6EB}
  .cxb-t tr.lo td{background:#FFF4E0}
  .cxb-t tr.fail td{color:#9B2C20}
  .cxb-row{display:grid;grid-template-columns:1fr 1fr 44px;gap:8px;margin-top:8px;align-items:end}
  .cxb-row .cx-f{margin-top:0}
  .cxb-big{min-height:120px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:34px;font-weight:900;line-height:1.3;border-radius:18px;background:linear-gradient(135deg,#28407F,#3752A6);color:#fff;padding:16px;margin-top:14px;overflow-wrap:anywhere;word-break:break-word}
  .cxb-big.done{background:linear-gradient(135deg,#176B45,#1E8E5A);font-size:40px}
  .cxb-big.run{opacity:.85}
  .cxb-grp{border:1px solid var(--line);border-radius:14px;background:#fff;padding:10px 12px;margin-top:10px}
  .cxb-grp b{color:var(--brand-dark)}
  .cxb-grp ol{margin:6px 0 0;padding-left:24px;font-size:14.5px;line-height:1.7}
  .cxb-names{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .cxb-names span{background:var(--chip);border-radius:10px;padding:4px 10px;font-size:13.5px;font-weight:700}
  .cxb-names.done span{background:#E3F6EB;color:#136B42}
  @media (max-width:380px){.cxb-big{font-size:28px}.cxb-big.done{font-size:32px}}
  `;
  function B_root(body) {
    try {
      if (!document.getElementById('cx-b-style')) {
        const s = document.createElement('style'); s.id = 'cx-b-style'; s.textContent = B_CSS; document.head.appendChild(s);
      }
    } catch (e) { /* ignore */ }
    return makeRoot(body);
  }
  function B_safe(fn) { return function () { try { return fn.apply(this, arguments); } catch (e) { try { console.error(e); } catch (e2) { /* ignore */ } } }; }
  function B_download(text, name, mime) {
    try {
      const blob = new Blob([text], { type: mime || 'text/plain' });
      if (typeof downloadBlob === 'function') { downloadBlob(blob, name); return true; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) { /* ignore */ } }, 500);
      return true;
    } catch (e) { return false; }
  }
  function B_textStats(s) {
    s = String(s == null ? '' : s);
    return { chars: Array.from(s).length, lines: s === '' ? 0 : s.split(/\r\n|\r|\n/).length };
  }
  function B_statLine(s) { const st = B_textStats(s); return 'எழுத்துகள்: ' + fmt(st.chars, 0) + ' · வரிகள்: ' + fmt(st.lines, 0); }

  /* ===================================================================
   * 12. casecvt — எழுத்து வடிவ மாற்றி (case & line tools)
   * =================================================================== */
  let B_collator = null;
  function B_cmp(a, b) {
    if (!B_collator) {
      try { B_collator = new Intl.Collator(['ta', 'en'], { numeric: true }); } catch (e) {
        B_collator = { compare: (x, y) => (x < y ? -1 : x > y ? 1 : 0) };
      }
    }
    return B_collator.compare(a, b);
  }
  const B_lines = s => String(s == null ? '' : s).split(/\r\n|\r|\n/);
  const B_CASE = {
    upper: s => s.toUpperCase(),
    lower: s => s.toLowerCase(),
    title: s => s.toLowerCase().replace(/(^|[\s\-\/(\[{"“‘])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()),
    sentence: s => s.toLowerCase().replace(/(^|[.!?…]\s+|\n\s*)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()),
    spaces: s => B_lines(s).map(l => l.replace(/[ \t 　]+/g, ' ').trim()).join('\n'),
    joinlines: s => B_lines(s).map(l => l.trim()).filter(Boolean).join(' ').replace(/ {2,}/g, ' '),
    trimlines: s => B_lines(s).map(l => l.trim()).join('\n'),
    sort: s => B_lines(s).filter(l => l.trim() !== '').sort(B_cmp).join('\n'),
    dedupe: s => { const seen = new Set(), o = []; B_lines(s).forEach(l => { if (!seen.has(l)) { seen.add(l); o.push(l); } }); return o.join('\n'); },
    number: s => { let n = 0; return B_lines(s).map(l => (l.trim() === '' ? l : (++n) + '. ' + l)).join('\n'); }
  };
  TOOL_IMPL.casecvt = {
    mount(body) {
      const root = B_root(body);
      let out = '';
      const OPS = [
        ['upper', 'UPPERCASE'], ['lower', 'lowercase'], ['title', 'Title Case'], ['sentence', 'Sentence case'],
        ['spaces', T('கூடுதல் இடைவெளி நீக்கு', 'Remove extra spaces')],
        ['joinlines', T('வரி உடைப்பு நீக்கு (ஒரே வரி)', 'Remove line breaks')],
        ['trimlines', T('ஒவ்வொரு வரியையும் trim', 'Trim each line')],
        ['sort', T('வரிகளை A–Z வரிசைப்படுத்து', 'Sort lines A–Z')],
        ['dedupe', T('ஒரே மாதிரி வரிகளை நீக்கு', 'Remove duplicate lines')],
        ['number', T('வரி எண் சேர்', 'Add line numbers')]
      ];
      root.innerHTML = purpose('இது எதற்கு? உரையை பெரிய/சிறிய எழுத்தாக மாற்ற, இடைவெளி-வரிகளை சுத்தம் செய்ய, வரிசைப்படுத்த. தமிழ் எழுத்துகள் மாறாமல் அப்படியே இருக்கும். எல்லாம் உங்கள் போனிலேயே நடக்கும்.', 'Change case and tidy text or lines. Tamil text is left untouched.') +
        '<div class="cx-f"><label>' + T('உங்கள் உரை', 'Your text') + '</label><textarea class="cxb-ta" rows="6" data-k="in" spellcheck="false" placeholder="' + esc('இங்கே உரையை ஒட்டவும் அல்லது தட்டச்சு செய்யவும்…') + '"></textarea></div>' +
        '<div class="cx-small" data-k="instat"></div>' +
        '<div class="cx-chips" data-k="ops">' + OPS.map(o => '<button type="button" class="cx-chip" data-op="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>' +
        '<div data-k="msg"></div>' +
        '<div class="cx-f"><label>' + T('முடிவு', 'Result') + '</label><textarea class="cxb-ta" rows="6" data-k="out" readonly></textarea></div>' +
        '<div class="cx-small" data-k="outstat"></div><div data-k="act"></div>' +
        '<div class="cx-small">குறிப்பு: A–Z வரிசைப்படுத்தும்போது வெற்று வரிகள் நீக்கப்படும். பெரிய/சிறிய எழுத்து மாற்றம் ஆங்கில (லத்தீன்) எழுத்துகளுக்கே பொருந்தும்.</div>';
      const inp = $(root, '[data-k=in]'), outEl = $(root, '[data-k=out]'), msg = $(root, '[data-k=msg]');
      const act = actionsEl(() => out);
      act.insertAdjacentHTML('beforeend', '<button type="button" class="cx-btn sec" data-act="reuse">⬆ ' + T('முடிவை உள்ளீடாக்கு', 'Use result as input') + '</button><button type="button" class="cx-btn sec" data-act="clear">🗑 ' + T('அழி', 'Clear') + '</button>');
      $(root, '[data-k=act]').appendChild(act);
      const stat = () => { $(root, '[data-k=instat]').textContent = B_statLine(inp.value); $(root, '[data-k=outstat]').textContent = out ? B_statLine(out) : ''; };
      inp.addEventListener('input', B_safe(stat));
      $$(root, '[data-op]').forEach(b => {
        b.onclick = B_safe(() => {
          const op = b.getAttribute('data-op');
          if (!inp.value.trim()) { msg.innerHTML = msgHtml('முதலில் உரையை உள்ளிடவும்.'); return; }
          msg.innerHTML = '';
          out = B_CASE[op](inp.value);
          outEl.value = out;
          $$(root, '[data-op]').forEach(x => x.classList.toggle('on', x === b));
          stat();
        });
      });
      $(act, '[data-act=reuse]').onclick = B_safe(() => { if (out) { inp.value = out; stat(); } });
      $(act, '[data-act=clear]').onclick = B_safe(() => { inp.value = ''; out = ''; outEl.value = ''; msg.innerHTML = ''; $$(root, '[data-op]').forEach(x => x.classList.remove('on')); stat(); });
      stat();
    }
  };
  TOOL_IMPL.casecvt._f = { ops: B_CASE, stats: B_textStats };

  /* ===================================================================
   * 13. jsonfmt — JSON சரிபார்ப்பு & அழகாக்கு
   * =================================================================== */
  function B_lineCol(text, pos) {
    pos = Math.max(0, Math.min(pos, text.length));
    let line = 1, last = -1;
    for (let i = 0; i < pos; i++) if (text.charCodeAt(i) === 10) { line++; last = i; }
    return { line: line, col: pos - last };
  }
  function B_posOf(text, line, col) {
    let pos = 0, l = 1;
    while (l < line && pos < text.length) { if (text.charCodeAt(pos) === 10) l++; pos++; }
    return Math.min(text.length, pos + Math.max(0, col - 1));
  }
  // Strict JSON scanner used only to locate/classify an error (engine-independent). Throws {pos, code}.
  function B_jsonScan(t) {
    let i = 0; const n = t.length;
    const fail = (pos, code) => { const e = new Error(code); e.pos = pos; e.code = code; throw e; };
    const ws = () => { while (i < n) { const c = t.charCodeAt(i); if (c === 32 || c === 9 || c === 10 || c === 13) i++; else break; } };
    function str() {
      i++;
      while (i < n) {
        const c = t[i];
        if (c === '"') { i++; return; }
        if (c === '\\') {
          const d = t[i + 1];
          if (d === undefined) fail(n, 'eof');
          if ('"\\/bfnrt'.indexOf(d) >= 0) i += 2;
          else if (d === 'u') { if (!/^[0-9a-fA-F]{4}$/.test(t.substr(i + 2, 4))) fail(i, 'badescape'); i += 6; }
          else fail(i, 'badescape');
        } else if (t.charCodeAt(i) < 32) fail(i, 'ctrl');
        else i++;
      }
      fail(n, 'eof');
    }
    const numRe = /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y;
    function val(depth) {
      if (depth > 400) fail(i, 'deep');
      ws(); if (i >= n) fail(n, 'eof');
      const c = t[i];
      if (c === '{') {
        i++; ws();
        if (t[i] === '}') { i++; return; }
        for (;;) {
          ws(); if (i >= n) fail(n, 'eof');
          if (t[i] !== '"') fail(i, t[i] === '}' ? 'trailing' : t[i] === "'" ? 'squote' : 'key');
          str(); ws(); if (i >= n) fail(n, 'eof');
          if (t[i] !== ':') fail(i, 'colon');
          i++; val(depth + 1); ws(); if (i >= n) fail(n, 'eof');
          if (t[i] === ',') { i++; continue; }
          if (t[i] === '}') { i++; return; }
          fail(i, 'comma_or_end');
        }
      }
      if (c === '[') {
        i++; ws();
        if (t[i] === ']') { i++; return; }
        for (;;) {
          ws(); if (i >= n) fail(n, 'eof');
          if (t[i] === ']') fail(i, 'trailing');
          val(depth + 1); ws(); if (i >= n) fail(n, 'eof');
          if (t[i] === ',') { i++; continue; }
          if (t[i] === ']') { i++; return; }
          fail(i, 'comma_or_end');
        }
      }
      if (c === '"') { str(); return; }
      const lit = /^(true|false|null)/.exec(t.substr(i, 5));
      if (lit) { i += lit[0].length; return; }
      numRe.lastIndex = i;
      const m = numRe.exec(t);
      if (m && m[0].length) { i += m[0].length; return; }
      fail(i, c === "'" ? 'squote' : 'token');
    }
    val(0); ws();
    if (i < n) fail(i, 'extra');
  }
  const B_JSON_HINTS = {
    eof: 'JSON முடிவதற்குள் நின்றுவிட்டது — மூடும் } அல்லது ] அல்லது " விடுபட்டிருக்கலாம்.',
    trailing: 'கடைசி உருப்படிக்குப் பின் கூடுதல் காற்புள்ளி (,) உள்ளது — அதை நீக்கவும்.',
    key: 'பெயர் (key) இரட்டை மேற்கோளில் (" ") இருக்க வேண்டும்.',
    colon: 'பெயருக்குப் பின் ":" விடுபட்டுள்ளது.',
    comma_or_end: 'இரு உருப்படிகளுக்கிடையே காற்புள்ளி (,) விடுபட்டிருக்கலாம்; அல்லது மூடும் குறி தவறு.',
    squote: "ஒற்றை மேற்கோள் (') அனுமதிக்கப்படாது; இரட்டை மேற்கோள் (\") பயன்படுத்தவும்.",
    token: 'இங்கு எதிர்பாராத எழுத்து உள்ளது (JSON-ல் "உரை", எண், true, false, null, [ ], { } மட்டுமே வரும்).',
    badescape: 'உரைக்குள் தவறான \\ குறியீடு உள்ளது.',
    ctrl: 'உரைக்குள் நேரடியாகப் புதிய வரி இருக்கக்கூடாது; \\n எனப் பயன்படுத்தவும்.',
    extra: 'JSON முடிந்த பின் கூடுதல் உரை உள்ளது.',
    deep: 'அமைப்பு மிக ஆழமாக உள்ளது.'
  };
  function B_jsonParse(text) {
    const t = String(text == null ? '' : text).replace(/^﻿/, '');
    if (!t.trim()) return { ok: false, empty: true };
    try { return { ok: true, value: JSON.parse(t), text: t }; } catch (e) {
      const msg = String((e && e.message) || '');
      let pos = null, line = null, col = null, m;
      if ((m = /position (\d+)/.exec(msg))) pos = +m[1];
      else if ((m = /line (\d+) column (\d+)/.exec(msg))) { line = +m[1]; col = +m[2]; pos = B_posOf(t, line, col); }
      let code = null, spos = null;
      try { B_jsonScan(t); } catch (se) { if (se && se.code) { code = se.code; spos = se.pos; } }
      if (pos == null) pos = spos != null ? spos : t.length;
      if (spos != null && spos !== pos) code = null; // the two disagree: keep the position, drop the specific hint
      pos = Math.max(0, Math.min(pos, t.length));
      const lc = B_lineCol(t, pos);
      return { ok: false, line: lc.line, col: lc.col, pos: pos, code: code, msg: msg, text: t };
    }
  }
  function B_jsonFormat(text, indent) {
    const r = B_jsonParse(text);
    if (!r.ok) return r;
    const sp = indent === 'min' ? undefined : indent === 'tab' ? '\t' : (+indent === 4 ? 4 : 2);
    r.out = JSON.stringify(r.value, null, sp);
    return r;
  }
  function B_jsonInfo(v) {
    if (Array.isArray(v)) return 'வகை: வரிசை (Array) · உருப்படிகள்: ' + fmt(v.length, 0);
    if (v !== null && typeof v === 'object') return 'வகை: பொருள் (Object) · பெயர்கள் (keys): ' + fmt(Object.keys(v).length, 0);
    return 'வகை: ' + (v === null ? 'null' : typeof v === 'string' ? 'உரை (String)' : typeof v === 'number' ? 'எண் (Number)' : 'true/false');
  }
  function B_jsonErrHtml(r) {
    const lines = r.text.split('\n');
    let ln = (lines[r.line - 1] || '').replace(/\r$/, '');
    const c0 = r.col - 1;
    const from = Math.max(0, c0 - 40), to = Math.min(ln.length, c0 + 40);
    const ch = ln.charAt(c0);
    const ctx = (from > 0 ? '…' : '') + esc(ln.slice(from, c0)) + '<mark>' + (ch ? esc(ch) : '⏎') + '</mark>' + esc(ln.slice(c0 + 1, to)) + (to < ln.length ? '…' : '');
    return msgHtml('❌ JSON-ல் பிழை உள்ளது — வரி <b>' + r.line + '</b>, நெடுவரிசை <b>' + r.col + '</b>' +
      (r.code && B_JSON_HINTS[r.code] ? '<br>' + esc(B_JSON_HINTS[r.code]) : '')) +
      '<div class="cxb-pre">' + ctx + '</div>' +
      (r.msg ? '<div class="cx-small">Browser செய்தி: ' + esc(r.msg) + '</div>' : '');
  }
  TOOL_IMPL.jsonfmt = {
    mount(body) {
      const root = B_root(body);
      let out = '';
      root.innerHTML = purpose('இது எதற்கு? JSON உரை சரியா என்று சோதிக்க, படிக்க எளிதாக அழகாக்க (Format) அல்லது சுருக்க (Minify). பிழை இருந்தால் எந்த வரி/நெடுவரிசை என்று காட்டும். உங்கள் தரவு எங்கும் அனுப்பப்படாது.', 'Validate, pretty-print or minify JSON, with error position.') +
        '<div class="cx-f"><label>' + T('JSON உரையை ஒட்டவும்', 'Paste JSON') + '</label><textarea class="cxb-ta" rows="8" data-k="in" spellcheck="false" placeholder=\'{"பெயர்": "அருண்", "வயது": 20}\'></textarea></div>' +
        selectField(T('உள்தள்ளல் (Indent)', 'Indent'), 'indent', [['2', '2 இடைவெளி'], ['4', '4 இடைவெளி'], ['tab', 'Tab']], '2') +
        '<div class="cx-actions"><button type="button" class="cx-btn" data-op="format">✨ ' + T('அழகாக்கு (Format)', 'Format') + '</button><button type="button" class="cx-btn sec" data-op="min">📦 ' + T('சுருக்கு (Minify)', 'Minify') + '</button><button type="button" class="cx-btn sec" data-op="validate">✔ ' + T('சரிபார் (Validate)', 'Validate') + '</button></div>' +
        '<div data-k="status"></div>' +
        '<div class="cx-f"><label>' + T('முடிவு', 'Result') + '</label><textarea class="cxb-ta" rows="8" data-k="out" readonly spellcheck="false"></textarea></div>' +
        '<div data-k="act"></div>' +
        '<div class="cx-small">குறிப்பு: 9007199254740991-ஐ விடப் பெரிய எண்கள் Format செய்யும்போது துல்லியம் இழக்கலாம். JSON-ல் கருத்துரைகள் (// /* */), ஒற்றை மேற்கோள், கடைசி காற்புள்ளி அனுமதிக்கப்படாது.</div>';
      const inp = $(root, '[data-k=in]'), outEl = $(root, '[data-k=out]'), st = $(root, '[data-k=status]');
      const act = actionsEl(() => out);
      act.insertAdjacentHTML('beforeend', '<button type="button" class="cx-btn sec" data-act="dl">⬇ .json ' + T('பதிவிறக்கு', 'Download') + '</button><button type="button" class="cx-btn sec" data-act="reuse">⬆ ' + T('முடிவை உள்ளீடாக்கு', 'Use as input') + '</button>');
      $(root, '[data-k=act]').appendChild(act);
      $(act, '[data-act=dl]').onclick = B_safe(() => {
        if (!out) { st.innerHTML = msgHtml('பதிவிறக்க முடிவு எதுவும் இல்லை — முதலில் "அழகாக்கு" அல்லது "சுருக்கு" அழுத்தவும்.'); return; }
        B_download(out, 'data.json', 'application/json');
      });
      $(act, '[data-act=reuse]').onclick = B_safe(() => { if (out) inp.value = out; });
      $$(root, '[data-op]').forEach(b => {
        b.onclick = B_safe(() => {
          const op = b.getAttribute('data-op');
          const ind = $(root, '[data-k=indent]').value;
          const r = B_jsonFormat(inp.value, op === 'min' ? 'min' : ind);
          if (r.empty) { st.innerHTML = msgHtml('முதலில் JSON உரையை உள்ளிடவும்.'); return; }
          if (!r.ok) { st.innerHTML = B_jsonErrHtml(r); if (op !== 'validate') { out = ''; outEl.value = ''; } return; }
          st.innerHTML = '<div class="cx-ok">✓ சரியான JSON<br><span style="font-weight:600">' + esc(B_jsonInfo(r.value)) + '</span></div>';
          if (op !== 'validate') { out = r.out; outEl.value = out; }
        });
      });
    }
  };
  TOOL_IMPL.jsonfmt._f = { parse: B_jsonParse, scan: B_jsonScan, lineCol: B_lineCol, posOf: B_posOf, format: B_jsonFormat, info: B_jsonInfo };

  /* ===================================================================
   * 14. b64 — Base64 மாற்றி
   * =================================================================== */
  const B_B64_MAX = 3 * 1024 * 1024;
  function B_bytesToB64(bytes) {
    let s = ''; const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  }
  function B_b64Enc(str, urlSafe) {
    const b = B_bytesToB64(new TextEncoder().encode(String(str == null ? '' : str)));
    return urlSafe ? b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b;
  }
  function B_b64Dec(s) {
    let t = String(s == null ? '' : s).trim();
    const m = /^data:[^,]*;base64,/i.exec(t);
    if (m) t = t.slice(m[0].length);
    t = t.replace(/\s+/g, '');
    if (!t) return { ok: false, code: 'empty' };
    t = t.replace(/-/g, '+').replace(/_/g, '/');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(t)) return { ok: false, code: 'chars' };
    t = t.replace(/=+$/, '');
    if (t.length % 4 === 1) return { ok: false, code: 'len' };
    while (t.length % 4) t += '=';
    let bin;
    try { bin = atob(t); } catch (e) { return { ok: false, code: 'len' }; }
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    try {
      return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), bytes: bytes.length };
    } catch (e) { return { ok: false, code: 'notext', bytes: bytes.length }; }
  }
  const B_B64_ERR = {
    empty: 'மாற்ற வேண்டிய Base64 உரையை உள்ளிடவும்.',
    chars: 'இது சரியான Base64 அல்ல — A–Z, a–z, 0–9, + / (அல்லது - _) மற்றும் இறுதியில் = மட்டுமே இருக்க வேண்டும்.',
    len: 'Base64 நீளம் தவறு — உரை முழுமையாக நகலெடுக்கப்படவில்லை போலிருக்கிறது.',
    notext: 'இது படம்/கோப்பு போன்ற binary தரவு; சாதாரண (UTF-8) உரையாக மாற்ற முடியவில்லை.'
  };
  TOOL_IMPL.b64 = {
    mount(body) {
      const root = B_root(body);
      const S = { tab: 'text', url: false, out: '', fileUri: '', fileName: '', bare: false };
      function paint() {
        root.innerHTML = purpose('இது எதற்கு? உரையை Base64 ஆக மாற்ற அல்லது Base64-ஐ மீண்டும் உரையாக மாற்ற (தமிழும் சரியாக வரும்); சிறிய கோப்பை Base64 (data URI) ஆக்க. எல்லாம் உங்கள் போனிலேயே நடக்கும்.', 'Encode/decode Base64 with proper UTF-8, or turn a small file into a data URI.') +
          tabsHtml([['text', '🔤 ' + T('உரை ⇄ Base64', 'Text ⇄ Base64')], ['file', '📁 ' + T('கோப்பு → Base64', 'File → Base64')]], S.tab) +
          '<div data-k="panel"></div>';
        bindTabs(root, t => { S.tab = t; S.out = ''; paint(); });
        const p = $(root, '[data-k=panel]');
        if (S.tab === 'text') textPanel(p); else filePanel(p);
      }
      function textPanel(p) {
        p.innerHTML = '<div class="cx-f"><label>' + T('உங்கள் உரை / Base64', 'Your text / Base64') + '</label><textarea class="cxb-ta" rows="6" data-k="in" spellcheck="false" placeholder="தமிழ்"></textarea></div>' +
          '<label class="cx-chk"><input type="checkbox" data-k="url"' + (S.url ? ' checked' : '') + '>URL-safe (+ / → - _ ; = நீக்கம்)</label>' +
          '<div class="cx-actions"><button type="button" class="cx-btn" data-op="enc">⬇ ' + T('Base64 ஆக்கு (Encode)', 'Encode') + '</button><button type="button" class="cx-btn sec" data-op="dec">⬆ ' + T('உரையாக்கு (Decode)', 'Decode') + '</button></div>' +
          '<div data-k="msg"></div>' +
          '<div class="cx-f"><label>' + T('முடிவு', 'Result') + '</label><textarea class="cxb-ta" rows="6" data-k="out" readonly spellcheck="false"></textarea></div><div data-k="act"></div>';
        const inp = $(p, '[data-k=in]'), outEl = $(p, '[data-k=out]'), msg = $(p, '[data-k=msg]');
        $(p, '[data-k=url]').onchange = function () { S.url = this.checked; };
        const act = actionsEl(() => S.out);
        $(p, '[data-k=act]').appendChild(act);
        $(p, '[data-op=enc]').onclick = B_safe(() => {
          if (inp.value === '') { msg.innerHTML = msgHtml('மாற்ற வேண்டிய உரையை உள்ளிடவும்.'); return; }
          msg.innerHTML = ''; S.out = B_b64Enc(inp.value, S.url); outEl.value = S.out;
        });
        $(p, '[data-op=dec]').onclick = B_safe(() => {
          const r = B_b64Dec(inp.value);
          if (!r.ok) { msg.innerHTML = msgHtml(B_B64_ERR[r.code] || 'மாற்ற முடியவில்லை.'); S.out = ''; outEl.value = ''; return; }
          msg.innerHTML = ''; S.out = r.text; outEl.value = r.text;
        });
      }
      function filePanel(p) {
        p.innerHTML = '<div class="cx-info">⚠ கோப்பின் அளவு அதிகபட்சம் <b>3 MB</b>. அதற்கு மேற்பட்ட கோப்புகள் ஏற்கப்படாது. கோப்பு உங்கள் போனிலேயே செயலாகும்; எங்கும் பதிவேற்றப்படாது.</div>' +
          '<div class="cx-f"><label class="cx-file"><input type="file" data-k="file">📁 ' + T('கோப்பைத் தேர்ந்தெடுக்கவும்', 'Choose a file') + '</label></div>' +
          '<label class="cx-chk"><input type="checkbox" data-k="bare"' + (S.bare ? ' checked' : '') + '>data: முன்னொட்டு இல்லாமல் (Base64 மட்டும்)</label>' +
          '<div data-k="msg"></div><div data-k="info"></div>' +
          '<div class="cx-f"><label>' + T('முடிவு', 'Result') + '</label><textarea class="cxb-ta" rows="6" data-k="out" readonly spellcheck="false"></textarea></div><div data-k="act"></div>';
        const outEl = $(p, '[data-k=out]'), msg = $(p, '[data-k=msg]'), info = $(p, '[data-k=info]');
        const cur = () => (S.bare ? S.fileUri.replace(/^data:[^,]*,/, '') : S.fileUri);
        const show = () => { S.out = cur(); outEl.value = S.out; };
        const act = actionsEl(() => S.out);
        act.insertAdjacentHTML('beforeend', '<button type="button" class="cx-btn sec" data-act="dl">⬇ .txt ' + T('பதிவிறக்கு', 'Download') + '</button>');
        $(act, '[data-act=dl]').onclick = B_safe(() => { if (S.out) B_download(S.out, (S.fileName || 'file') + '.base64.txt', 'text/plain'); else msg.innerHTML = msgHtml('முதலில் கோப்பைத் தேர்ந்தெடுக்கவும்.'); });
        $(p, '[data-k=act]').appendChild(act);
        $(p, '[data-k=bare]').onchange = function () { S.bare = this.checked; if (S.fileUri) show(); };
        if (S.fileUri) { show(); }
        $(p, '[data-k=file]').onchange = B_safe(function () {
          const f = this.files && this.files[0];
          msg.innerHTML = ''; info.innerHTML = '';
          if (!f) return;
          if (f.size > B_B64_MAX) {
            S.fileUri = ''; S.out = ''; outEl.value = '';
            msg.innerHTML = msgHtml('இந்தக் கோப்பு ' + fmt(f.size / 1048576, 2) + ' MB உள்ளது; அதிகபட்ச வரம்பு 3 MB. சிறிய கோப்பைத் தேர்ந்தெடுக்கவும்.');
            return;
          }
          const fr = new FileReader();
          fr.onload = B_safe(() => {
            S.fileUri = String(fr.result || ''); S.fileName = f.name;
            show();
            info.innerHTML = '<div class="cx-ok">✓ ' + esc(f.name) + ' · ' + fmt(f.size / 1024, 1) + ' KB → Base64 நீளம் ' + fmt(S.fileUri.length, 0) + ' எழுத்துகள்</div>';
          });
          fr.onerror = () => { msg.innerHTML = msgHtml('கோப்பைப் படிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'); };
          fr.readAsDataURL(f);
        });
      }
      paint();
    }
  };
  TOOL_IMPL.b64._f = { enc: B_b64Enc, dec: B_b64Dec, MAX: B_B64_MAX };

  /* ===================================================================
   * 15. textdiff — இரு உரை ஒப்பீடு
   * =================================================================== */
  const B_DIFF_MAX = 2000;
  function B_splitLines(t) {
    t = String(t == null ? '' : t);
    if (t === '') return [];
    const a = t.split(/\r\n|\r|\n/);
    if (a.length && a[a.length - 1] === '') a.pop();
    return a;
  }
  // LCS line diff. Common prefix/suffix are trimmed, the middle uses one Uint16 table (<= 2001*2001 cells).
  function B_diffLines(A, Bv, o) {
    if (A.length > B_DIFF_MAX || Bv.length > B_DIFF_MAX) return { ok: false, code: 'toolong' };
    const key = o && o.ignore ? (s => s.replace(/\s+/g, ' ').trim().toLowerCase()) : (s => s);
    const ka = A.map(key), kb = Bv.map(key);
    let p = 0;
    while (p < ka.length && p < kb.length && ka[p] === kb[p]) p++;
    let ea = ka.length, eb = kb.length;
    while (ea > p && eb > p && ka[ea - 1] === kb[eb - 1]) { ea--; eb--; }
    const n = ea - p, m = eb - p, ops = [];
    const same = (ia, ib) => ops.push({ t: '=', s: A[ia], ia: ia + 1, ib: ib + 1 });
    const del = ia => ops.push({ t: '-', s: A[ia], ia: ia + 1 });
    const add = ib => ops.push({ t: '+', s: Bv[ib], ib: ib + 1 });
    for (let k = 0; k < p; k++) same(k, k);
    const W = m + 1, dp = new Uint16Array((n + 1) * W);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * W + j] = ka[p + i] === kb[p + j] ? dp[(i + 1) * W + j + 1] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);
      }
    }
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (ka[p + i] === kb[p + j]) { same(p + i, p + j); i++; j++; }
      else if (dp[(i + 1) * W + j] >= dp[i * W + j + 1]) { del(p + i); i++; }
      else { add(p + j); j++; }
    }
    while (i < n) { del(p + i); i++; }
    while (j < m) { add(p + j); j++; }
    for (let k = 0; k < A.length - ea; k++) same(ea + k, eb + k);
    let added = 0, removed = 0, unchanged = 0;
    ops.forEach(x => { if (x.t === '+') added++; else if (x.t === '-') removed++; else unchanged++; });
    return { ok: true, ops: ops, added: added, removed: removed, same: unchanged };
  }
  function B_diffSummary(r) {
    let s = 'இரு உரை ஒப்பீடு\nசேர்க்கப்பட்டவை (+): ' + r.added + '\nநீக்கப்பட்டவை (-): ' + r.removed + '\nமாறாதவை: ' + r.same + '\n';
    const ch = r.ops.filter(x => x.t !== '=');
    if (ch.length) s += '\n' + ch.map(x => (x.t === '+' ? '+ [புதியது:' + x.ib + '] ' : '- [பழையது:' + x.ia + '] ') + x.s).join('\n') + '\n';
    return s;
  }
  function B_diffHtml(r, onlyChanges) {
    const rows = r.ops.filter(x => !onlyChanges || x.t !== '=');
    if (!rows.length) return '';
    return '<div class="cxb-dl">' + rows.map(x => {
      const cls = x.t === '+' ? 'cxb-add' : x.t === '-' ? 'cxb-del' : 'cxb-same';
      const n = x.t === '+' ? x.ib : x.ia;
      return '<div class="cxb-d ' + cls + '"><span class="n">' + n + '</span><span class="s">' + (x.t === '=' ? '' : x.t) + '</span><span class="t">' + esc(x.s) + '</span></div>';
    }).join('') + '</div>';
  }
  TOOL_IMPL.textdiff = {
    mount(body) {
      const root = B_root(body);
      let last = null;
      root.innerHTML = purpose('இது எதற்கு? இரு உரைகளை வரி-வரியாக ஒப்பிட்டு எது சேர்க்கப்பட்டது, எது நீக்கப்பட்டது என்று காட்ட. எல்லாம் உங்கள் போனிலேயே நடக்கும்.', 'Compare two texts line by line.') +
        '<div class="cx-f"><label>' + T('முதல் உரை (பழையது)', 'Original text') + '</label><textarea class="cxb-ta" rows="6" data-k="a" spellcheck="false"></textarea></div>' +
        '<div class="cx-f"><label>' + T('இரண்டாம் உரை (புதியது)', 'Changed text') + '</label><textarea class="cxb-ta" rows="6" data-k="b" spellcheck="false"></textarea></div>' +
        '<label class="cx-chk"><input type="checkbox" data-k="ign">' + T('இடைவெளி / பெரிய-சிறிய எழுத்து வேறுபாட்டைப் புறக்கணி', 'Ignore spaces / case') + '</label>' +
        '<label class="cx-chk"><input type="checkbox" data-k="only">' + T('மாற்றங்களை மட்டும் காட்டு', 'Show only changes') + '</label>' +
        '<div class="cx-actions"><button type="button" class="cx-btn big" data-op="go">🔍 ' + T('ஒப்பிடு', 'Compare') + '</button><button type="button" class="cx-btn sec" data-op="swap">⇅ ' + T('இடம் மாற்று', 'Swap') + '</button><button type="button" class="cx-btn sec" data-op="clear">🗑 ' + T('அழி', 'Clear') + '</button></div>' +
        '<div data-k="msg"></div><div data-k="res"></div><div data-k="act"></div>' +
        '<div class="cx-small">வரம்பு: ஒவ்வொரு பக்கமும் அதிகபட்சம் ' + B_DIFF_MAX + ' வரிகள். <b>சிவப்பு</b> = நீக்கப்பட்டது, <b>பச்சை</b> = சேர்க்கப்பட்டது, <b>சாம்பல்</b> = மாறாதது.</div>';
      const ta = $(root, '[data-k=a]'), tb = $(root, '[data-k=b]'), msg = $(root, '[data-k=msg]'), res = $(root, '[data-k=res]');
      const ign = $(root, '[data-k=ign]'), only = $(root, '[data-k=only]');
      const act = actionsEl(() => (last ? B_diffSummary(last) : ''));
      $(act, '[data-act=copy]').textContent = '📋 ' + T('சுருக்கத்தை நகலெடு', 'Copy summary');
      const actHost = $(root, '[data-k=act]');
      function run() {
        msg.innerHTML = ''; res.innerHTML = ''; actHost.innerHTML = ''; last = null;
        const A = B_splitLines(ta.value), Bv = B_splitLines(tb.value);
        if (!A.length && !Bv.length) { msg.innerHTML = msgHtml('ஒப்பிட இரு உரைகளையும் உள்ளிடவும்.'); return; }
        const r = B_diffLines(A, Bv, { ignore: ign.checked });
        if (!r.ok) { msg.innerHTML = msgHtml('உரை மிகவும் நீளமாக உள்ளது — ஒவ்வொரு பக்கமும் அதிகபட்சம் ' + B_DIFF_MAX + ' வரிகள் மட்டுமே ஒப்பிட முடியும். பகுதி பகுதியாகப் பிரித்து முயற்சிக்கவும்.'); return; }
        last = r;
        const identical = r.added === 0 && r.removed === 0;
        res.innerHTML = (identical ? '<div class="cx-ok">✓ இரண்டு உரைகளும் ஒரே மாதிரி உள்ளன' + (ign.checked ? ' (இடைவெளி/எழுத்து வடிவம் புறக்கணிக்கப்பட்டது)' : '') + '.</div>' : '') +
          '<div class="cx-grid three" style="margin-top:12px"><div class="cx-stat"><div class="k">சேர்க்கப்பட்டது</div><div class="v" style="color:#136B42" data-k="cadd">+' + r.added + '</div></div>' +
          '<div class="cx-stat"><div class="k">நீக்கப்பட்டது</div><div class="v" style="color:#9B2C20" data-k="cdel">−' + r.removed + '</div></div>' +
          '<div class="cx-stat"><div class="k">மாறாதது</div><div class="v" data-k="csame">' + r.same + '</div></div></div>' +
          B_diffHtml(r, only.checked);
        actHost.appendChild(act);
      }
      $(root, '[data-op=go]').onclick = B_safe(run);
      ign.onchange = B_safe(() => { if (last) run(); });
      only.onchange = B_safe(() => { if (last) run(); });
      $(root, '[data-op=swap]').onclick = B_safe(() => { const v = ta.value; ta.value = tb.value; tb.value = v; if (last) run(); });
      $(root, '[data-op=clear]').onclick = B_safe(() => { ta.value = ''; tb.value = ''; msg.innerHTML = ''; res.innerHTML = ''; actHost.innerHTML = ''; last = null; });
    }
  };
  TOOL_IMPL.textdiff._f = { diff: B_diffLines, split: B_splitLines, summary: B_diffSummary, MAX: B_DIFF_MAX };

  /* ===================================================================
   * 16. markscalc — மதிப்பெண் கணிப்பான்
   * =================================================================== */
  const B_SCALES = {
    std: { name: 'பொது அளவுகோல் (A+ … D)', rows: [[90, 'A+'], [80, 'A'], [70, 'B+'], [60, 'B'], [50, 'C'], [35, 'D']], fail: 'மீண்டும் முயற்சி' },
    cbse: { name: 'CBSE-பாணி 9 நிலை (தோராயம்)', rows: [[91, 'A1'], [81, 'A2'], [71, 'B1'], [61, 'B2'], [51, 'C1'], [41, 'C2'], [33, 'D'], [21, 'E1']], fail: 'E2' },
    div: { name: 'வகுப்பு முறை (Distinction/First…)', rows: [[75, 'சிறப்பு நிலை (Distinction)'], [60, 'முதல் வகுப்பு'], [50, 'இரண்டாம் வகுப்பு'], [35, 'தேர்ச்சி வகுப்பு']], fail: 'மீண்டும் முயற்சி' }
  };
  function B_gradeFor(pct, scale) {
    const sc = B_SCALES[scale] || B_SCALES.std;
    const p = Math.round(pct * 1e9) / 1e9;
    for (let i = 0; i < sc.rows.length; i++) if (p >= sc.rows[i][0]) return sc.rows[i][1];
    return sc.fail;
  }
  function B_scaleText(scale) {
    const sc = B_SCALES[scale] || B_SCALES.std;
    return sc.rows.map(r => '≥' + r[0] + '% → ' + r[1]).join(', ') + ', அதற்குக் கீழ் → ' + sc.fail;
  }
  // rows: [{n, g, m}] raw strings. passPct: number (percent of each subject's max).
  function B_marksCalc(rows, passPct, scale) {
    const errors = [], subs = [];
    let blank = 0;
    if (!isFinite(passPct) || passPct < 0 || passPct > 100) return { ok: false, errors: [{ i: -1, f: 'pass', msg: 'தேர்ச்சி மதிப்பெண் சதவீதம் 0–100 இடையே இருக்க வேண்டும்.' }] };
    rows.forEach((r, i) => {
      const name = String(r.n == null ? '' : r.n).trim() || ('பாடம் ' + (i + 1));
      const gs = String(r.g == null ? '' : r.g).trim();
      const ms = String(r.m == null ? '' : r.m).trim();
      const m = ms === '' ? 100 : parseNum(ms);
      if (!(m > 0) || !isFinite(m)) { errors.push({ i: i, f: 'm', msg: name + ': அதிகபட்ச மதிப்பெண் 0-ஐ விடப் பெரிய எண்ணாக இருக்க வேண்டும்.' }); return; }
      if (gs === '') { blank++; return; }
      const g = parseNum(gs);
      if (isNaN(g)) { errors.push({ i: i, f: 'g', msg: name + ': மதிப்பெண் எண்ணாக இருக்க வேண்டும்.' }); return; }
      if (g < 0) { errors.push({ i: i, f: 'g', msg: name + ': மதிப்பெண் எதிர்மறையாக இருக்கக்கூடாது.' }); return; }
      if (g > m) { errors.push({ i: i, f: 'g', msg: name + ': மதிப்பெண் (' + fmt(g, 2) + ') அதிகபட்சத்தை (' + fmt(m, 2) + ') மீறக்கூடாது.' }); return; }
      const pct = g * 100 / m;
      subs.push({ i: i, name: name, g: g, m: m, pct: pct, pass: g * 100 >= passPct * m, grade: B_gradeFor(pct, scale) });
    });
    if (errors.length) return { ok: false, errors: errors, blank: blank };
    if (!subs.length) return { ok: false, empty: true, errors: [], blank: blank };
    const total = Math.round(subs.reduce((a, s) => a + s.g, 0) * 1e6) / 1e6;
    const maxTotal = Math.round(subs.reduce((a, s) => a + s.m, 0) * 1e6) / 1e6;
    const pct = total * 100 / maxTotal;
    let hi = null, lo = null;
    if (subs.length > 1) {
      let h = 0, l = 0;
      subs.forEach((s, k) => { if (s.pct > subs[h].pct) h = k; if (s.pct < subs[l].pct) l = k; });
      if (subs[h].pct !== subs[l].pct) { hi = subs[h].i; lo = subs[l].i; }
    }
    return { ok: true, subs: subs, total: total, maxTotal: maxTotal, pct: pct, pct2: round2(pct), grade: B_gradeFor(pct, scale), passAll: subs.every(s => s.pass), failed: subs.filter(s => !s.pass).length, hi: hi, lo: lo, blank: blank };
  }
  function B_target(total, maxTotal, targetPct) {
    if (!isFinite(targetPct) || targetPct < 0 || targetPct > 100) return { ok: false };
    const req = targetPct * maxTotal / 100;
    const more = req - total;
    if (more <= 1e-9) return { ok: true, reached: true, req: req, more: 0 };
    return { ok: true, reached: false, req: req, more: Math.ceil(more * 100 - 1e-9) / 100, impossible: more > (maxTotal - total) + 1e-9 };
  }
  function B_marksSummary(r, tg, scale) {
    let s = 'மதிப்பெண் அறிக்கை\n';
    r.subs.forEach(x => { s += x.name + ': ' + fmt(x.g, 2) + '/' + fmt(x.m, 2) + ' (' + fmt(round2(x.pct), 2, 2) + '%) ' + x.grade + (x.pass ? '' : ' — தோல்வி') + '\n'; });
    s += 'மொத்தம்: ' + fmt(r.total, 2) + '/' + fmt(r.maxTotal, 2) + '\nசதவீதம்: ' + fmt(r.pct2, 2, 2) + '%\nதரம்: ' + r.grade + '\n' + (r.passAll ? 'முடிவு: அனைத்துப் பாடங்களிலும் தேர்ச்சி' : 'முடிவு: ' + r.failed + ' பாடத்தில் தேர்ச்சி இல்லை') + '\n';
    if (tg && tg.ok) s += tg.reached ? 'இலக்கு எட்டப்பட்டது\n' : 'இலக்குக்கு மேலும் தேவை: ' + fmt(tg.more, 2) + ' மதிப்பெண்\n';
    return s;
  }
  TOOL_IMPL.markscalc = {
    mount(body) {
      const root = B_root(body);
      const MAXROWS = 20;
      const mkRows = names => names.map(n => ({ n: n, g: '', m: '100' }));
      const def = () => mkRows([1, 2, 3, 4, 5, 6].map(i => 'பாடம் ' + i));
      const S = { rows: def(), pass: '35', scale: 'std', target: '' };
      const saved = lsGet('cxMarks', null);
      try {
        if (saved && Array.isArray(saved.rows) && saved.rows.length && saved.rows.length <= MAXROWS) {
          S.rows = saved.rows.map(r => ({ n: String(r && r.n != null ? r.n : ''), g: String(r && r.g != null ? r.g : ''), m: String(r && r.m != null ? r.m : '100') }));
          if (saved.pass != null) S.pass = String(saved.pass);
          if (B_SCALES[saved.scale]) S.scale = saved.scale;
          if (saved.target != null) S.target = String(saved.target);
        }
      } catch (e) { S.rows = def(); }
      const save = () => lsSet('cxMarks', { rows: S.rows, pass: S.pass, scale: S.scale, target: S.target });
      let lastText = '';
      root.innerHTML = purpose('இது எதற்கு? பாடவாரி மதிப்பெண்களை உள்ளிட்டு மொத்தம், சதவீதம், தரம், தேர்ச்சி/தோல்வி மற்றும் இலக்கு சதவீதத்துக்கு இன்னும் எத்தனை மதிப்பெண் தேவை என்று அறிய. உள்ளிட்டவை உங்கள் போனில் மட்டும் சேமிக்கப்படும்.', 'Marks total, percentage, grade and target helper for students and teachers.') +
        '<div class="cx-chips"><button type="button" class="cx-chip" data-pre="tn">தமிழ்-ஆங்கிலம்-கணிதம்-அறிவியல்-சமூக அறிவியல்</button><button type="button" class="cx-chip" data-pre="gen">பாடம் 1–6</button></div>' +
        '<div data-k="rows"></div>' +
        '<div class="cx-actions"><button type="button" class="cx-btn sec" data-op="add">➕ ' + T('பாடம் சேர்', 'Add subject') + '</button><button type="button" class="cx-btn sec" data-op="clearm">🧹 ' + T('மதிப்பெண்களை அழி', 'Clear marks') + '</button></div>' +
        '<div class="cx-grid" style="margin-top:12px">' +
        field(T('தேர்ச்சி மதிப்பெண் (% — ஒவ்வொரு பாடத்தின் அதிகபட்சத்தில்)', 'Pass mark (% of max)'), 'pass', S.pass) +
        selectField(T('தர அளவுகோல்', 'Grade scale'), 'scale', Object.keys(B_SCALES).map(k => [k, B_SCALES[k].name]), S.scale) + '</div>' +
        field(T('இலக்கு சதவீதம் (விருப்பம்) — எ.கா. 75', 'Target % (optional)'), 'target', S.target) +
        '<div data-k="msg"></div><div data-k="res"></div><div data-k="act"></div>' +
        '<details class="cx-det"><summary>📋 ' + T('தர அளவுகோல் குறிப்பு', 'Grade scale note') + '</summary><div data-k="scalenote"></div></details>';
      const rowsEl = $(root, '[data-k=rows]'), msg = $(root, '[data-k=msg]'), res = $(root, '[data-k=res]');
      const act = actionsEl(() => lastText);
      $(root, '[data-k=act]').appendChild(act);

      function paintRows() {
        rowsEl.innerHTML = S.rows.map((r, i) =>
          '<div class="cx-rowbox"><div class="cx-f" style="margin-top:0"><label>' + T('பாடத்தின் பெயர்', 'Subject') + ' ' + (i + 1) + '</label><input type="text" inputmode="text" data-i="' + i + '" data-f="n" value="' + esc(r.n) + '" autocomplete="off"></div>' +
          '<div class="cxb-row"><div class="cx-f"><label>' + T('பெற்றது', 'Obtained') + '</label><input type="text" inputmode="decimal" data-i="' + i + '" data-f="g" value="' + esc(r.g) + '" autocomplete="off"></div>' +
          '<div class="cx-f"><label>' + T('அதிகபட்சம்', 'Max') + '</label><input type="text" inputmode="decimal" data-i="' + i + '" data-f="m" value="' + esc(r.m) + '" autocomplete="off"></div>' +
          '<button type="button" class="cx-del" data-del="' + i + '" aria-label="நீக்கு"' + (S.rows.length <= 1 ? ' disabled' : '') + '>✕</button></div></div>').join('');
        $$(rowsEl, 'input').forEach(inp => {
          inp.oninput = B_safe(() => { S.rows[+inp.getAttribute('data-i')][inp.getAttribute('data-f')] = inp.value; save(); calc(); });
        });
        $$(rowsEl, '[data-del]').forEach(b => {
          b.onclick = B_safe(() => { if (S.rows.length > 1) { S.rows.splice(+b.getAttribute('data-del'), 1); save(); paintRows(); calc(); } });
        });
        $(root, '[data-op=add]').disabled = S.rows.length >= MAXROWS;
      }
      function calc() {
        msg.innerHTML = ''; res.innerHTML = ''; lastText = '';
        $$(rowsEl, 'input').forEach(i => i.classList.remove('bad'));
        $$(root, '[data-k=pass],[data-k=target]').forEach(i => i.classList.remove('bad'));
        $(root, '[data-k=scalenote]').innerHTML = esc(B_scaleText(S.scale)) + '.<br>⚠ பள்ளி / வாரியம் / பல்கலைக்கழகத்துக்கு ஏற்ப தர அளவுகோல்கள் மாறுபடும்; இது ஒரு பொது மதிப்பீடு மட்டுமே — உங்கள் பள்ளியின் விதிகளையே இறுதியாகக் கொள்ளுங்கள். தேர்ச்சி மதிப்பெண்ணையும் அதற்கேற்ப மாற்றிக்கொள்ளலாம்.';
        const pp = S.pass.trim() === '' ? 35 : parseNum(S.pass);
        const r = B_marksCalc(S.rows, pp, S.scale);
        if (!r.ok) {
          if (r.empty) { msg.innerHTML = '<div class="cx-info">மேலே குறைந்தது ஒரு பாடத்துக்கு மதிப்பெண்ணை உள்ளிடுங்கள்.</div>'; return; }
          msg.innerHTML = msgHtml(r.errors.map(e => esc(e.msg)).join('<br>'));
          r.errors.forEach(e => {
            if (e.i >= 0) { const x = $(rowsEl, '[data-i="' + e.i + '"][data-f="' + e.f + '"]'); if (x) x.classList.add('bad'); }
            else { const x = $(root, '[data-k=pass]'); if (x) x.classList.add('bad'); }
          });
          return;
        }
        const tgIn = S.target.trim();
        let tg = null, tgHtml = '';
        if (tgIn !== '') {
          tg = B_target(r.total, r.maxTotal, parseNum(tgIn));
          if (!tg.ok) { tgHtml = msgHtml('இலக்கு சதவீதம் 0–100 இடையே உள்ள எண்ணாக இருக்க வேண்டும்.'); $(root, '[data-k=target]').classList.add('bad'); }
          else if (tg.reached) tgHtml = '<div class="cx-ok">🎯 இலக்கு ' + esc(tgIn) + '% ஏற்கெனவே எட்டப்பட்டுவிட்டது. வாழ்த்துகள்!</div>';
          else tgHtml = resCard('🎯 இலக்கு ' + esc(tgIn) + '%', '+' + fmt(tg.more, 2) + ' மதிப்பெண்', 'மொத்தம் ' + fmt(tg.req, 2) + ' / ' + fmt(r.maxTotal, 2) + ' வேண்டும்; இப்போது ' + fmt(r.total, 2) + '.' + (tg.impossible ? ' ⚠ இந்த அதிகபட்ச மொத்தத்துக்குள் இதை எட்ட முடியாது.' : ''));
        }
        const rowsH = r.subs.map(s =>
          '<tr class="' + (s.i === r.hi ? 'hi ' : '') + (s.i === r.lo ? 'lo ' : '') + (s.pass ? '' : 'fail') + '"><td>' + esc(s.name) + (s.i === r.hi ? '<br><small>🏆 அதிகம்</small>' : '') + (s.i === r.lo ? '<br><small>📉 குறைவு</small>' : '') + '</td>' +
          '<td class="r">' + fmt(s.g, 2) + '/' + fmt(s.m, 2) + '</td><td class="r">' + fmt(round2(s.pct), 2, 2) + '%</td><td>' + esc(s.grade) + '<br><small>' + (s.pass ? '✅ தேர்ச்சி' : '❌ தோல்வி') + '</small></td></tr>').join('');
        res.innerHTML = (r.blank ? '<div class="cx-info">' + r.blank + ' பாடத்துக்கு மதிப்பெண் உள்ளிடப்படவில்லை — அவை கணக்கில் சேர்க்கப்படவில்லை.</div>' : '') +
          '<div class="cx-res ' + (r.passAll ? 'ok' : 'bad') + '"><div class="lbl">மொத்தம்: <b data-k="total">' + fmt(r.total, 2) + '</b> / ' + fmt(r.maxTotal, 2) + '</div><div class="big" data-k="pct">' + fmt(r.pct2, 2, 2) + '%</div>' +
          '<div class="sub">தரம்: <b data-k="grade">' + esc(r.grade) + '</b> · ' + (r.passAll ? '✅ அனைத்துப் பாடங்களிலும் தேர்ச்சி' : '❌ ' + r.failed + ' பாடத்தில் தேர்ச்சி இல்லை (தேர்ச்சி மதிப்பெண் ' + fmt(pp, 2) + '%)') + '</div></div>' +
          '<table class="cxb-t"><thead><tr><th>பாடம்</th><th class="r">மதிப்பெண்</th><th class="r">%</th><th>தரம் / நிலை</th></tr></thead><tbody>' + rowsH + '</tbody></table>' + tgHtml;
        lastText = B_marksSummary(r, tg, S.scale);
      }
      $$(root, '[data-pre]').forEach(b => {
        b.onclick = B_safe(() => {
          const names = b.getAttribute('data-pre') === 'tn' ? ['தமிழ்', 'ஆங்கிலம்', 'கணிதம்', 'அறிவியல்', 'சமூக அறிவியல்'] : [1, 2, 3, 4, 5, 6].map(i => 'பாடம் ' + i);
          S.rows = names.map((n, i) => ({ n: n, g: S.rows[i] ? S.rows[i].g : '', m: S.rows[i] ? S.rows[i].m : '100' }));
          save(); paintRows(); calc();
        });
      });
      $(root, '[data-op=add]').onclick = B_safe(() => { if (S.rows.length < MAXROWS) { S.rows.push({ n: 'பாடம் ' + (S.rows.length + 1), g: '', m: '100' }); save(); paintRows(); calc(); } });
      $(root, '[data-op=clearm]').onclick = B_safe(() => { S.rows.forEach(r => { r.g = ''; }); save(); paintRows(); calc(); });
      $(root, '[data-k=pass]').oninput = B_safe(function () { S.pass = this.value; save(); calc(); });
      $(root, '[data-k=target]').oninput = B_safe(function () { S.target = this.value; save(); calc(); });
      $(root, '[data-k=scale]').onchange = B_safe(function () { S.scale = this.value; save(); calc(); });
      paintRows(); calc();
    }
  };
  TOOL_IMPL.markscalc._f = { calc: B_marksCalc, gradeFor: B_gradeFor, target: B_target, SCALES: B_SCALES, summary: B_marksSummary };

  /* ===================================================================
   * 17. namepicker — பெயர் சீட்டு — மாணவர் தேர்வு
   * =================================================================== */
  function B_randInt(n) {
    n = Math.floor(n);
    if (!(n > 1)) return 0;
    if (n > 4294967296) n = 4294967296;
    const lim = Math.floor(4294967296 / n) * n, buf = new Uint32Array(1);
    let x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= lim);
    return x % n;
  }
  function B_shuffle(arr) { // Fisher–Yates (returns a new array)
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = B_randInt(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  const B_NAME_MAX = 5000;
  function B_parseNames(text) { return String(text == null ? '' : text).split(/\r\n|\r|\n/).map(s => s.trim()).filter(Boolean).slice(0, B_NAME_MAX); }
  function B_remaining(names, picked) { // remove one instance per picked entry
    const cnt = new Map();
    picked.forEach(p => cnt.set(p, (cnt.get(p) || 0) + 1));
    return names.filter(n => { const c = cnt.get(n) || 0; if (c > 0) { cnt.set(n, c - 1); return false; } return true; });
  }
  // mode 'count': v groups; mode 'size': groups of about v people (balanced). Sizes differ by at most 1.
  function B_makeGroups(names, mode, v) {
    const n = names.length;
    if (!n) return { ok: false, code: 'nonames' };
    if (!isFinite(v) || v < 1 || Math.floor(v) !== v) return { ok: false, code: 'int' };
    const k = mode === 'size' ? Math.ceil(n / v) : v;
    if (k > n) return { ok: false, code: 'toomany' };
    const sh = B_shuffle(names), base = Math.floor(n / k), extra = n % k, groups = [];
    let pos = 0;
    for (let g = 0; g < k; g++) { const sz = base + (g < extra ? 1 : 0); groups.push(sh.slice(pos, pos + sz)); pos += sz; }
    return { ok: true, groups: groups, sizes: groups.map(g => g.length) };
  }
  function B_groupsText(groups) {
    return groups.map((g, i) => 'குழு ' + (i + 1) + ' (' + g.length + ')\n' + g.map((x, j) => (j + 1) + '. ' + x).join('\n')).join('\n\n');
  }
  TOOL_IMPL.namepicker = {
    mount(body) {
      const root = B_root(body);
      const S = { tab: 'pick', norepeat: false, picked: [], busy: false, timer: null, mode: 'count', num: '4', groups: null, gtext: '' };
      const saved = lsGet('cxNames', '');
      root.innerHTML = purpose('இது எதற்கு? வகுப்பில் ஒரு மாணவரை சீட்டுக் குலுக்கிப் போல் தேர்ந்தெடுக்க, அல்லது அனைவரையும் சமமான குழுக்களாகப் பிரிக்க. தேர்வு முற்றிலும் சமவாய்ப்புடன் நடக்கும். பெயர்கள் உங்கள் போனில் மட்டும் சேமிக்கப்படும்.', 'Pick a random student or split a class into fair groups.') +
        '<div class="cx-f"><label>' + T('பெயர்கள் — ஒரு வரிக்கு ஒரு பெயர்', 'Names — one per line') + '</label><textarea class="cxb-ta" rows="7" data-k="names" spellcheck="false" placeholder="' + esc('அருண்\nமீனா\nகார்த்திக்') + '"></textarea></div>' +
        '<div class="cx-small" data-k="count"></div>' +
        tabsHtml([['pick', '🎲 ' + T('ஒருவரைத் தேர்ந்தெடு', 'Pick one')], ['groups', '👥 ' + T('குழுக்கள் அமை', 'Make groups')]], S.tab) +
        '<div data-k="panel"></div>';
      const ta = $(root, '[data-k=names]');
      ta.value = typeof saved === 'string' ? saved : '';
      const names = () => B_parseNames(ta.value);
      const alive = () => { try { return root.isConnected !== false; } catch (e) { return true; } };
      function count() {
        const n = names().length;
        $(root, '[data-k=count]').textContent = n ? 'மொத்தம் ' + fmt(n, 0) + ' பெயர்கள்' : 'இன்னும் பெயர்கள் இல்லை';
      }
      ta.addEventListener('input', B_safe(() => { lsSet('cxNames', ta.value); count(); if (S.tab === 'pick') paintLists(); }));
      bindTabs(root, t => {
        if (S.busy) return;
        S.tab = t;
        $$(root, '[data-tab]').forEach(b => b.classList.toggle('on', b.getAttribute('data-tab') === t));
        paintPanel();
      });
      const panel = $(root, '[data-k=panel]');
      function paintPanel() { if (S.tab === 'pick') pickPanel(); else groupPanel(); }

      function pickPanel() {
        panel.innerHTML = '<label class="cx-chk"><input type="checkbox" data-k="nr"' + (S.norepeat ? ' checked' : '') + '>' + T('ஒருவர் மீண்டும் வராமல் தேர்ந்தெடு', 'Pick without repeating') + '</label>' +
          '<div class="cxb-big" data-k="big" aria-live="polite">❓</div>' +
          '<div class="cx-actions"><button type="button" class="cx-btn big wide" data-op="pick">🎲 ' + T('தேர்ந்தெடு!', 'Pick!') + '</button></div>' +
          '<div data-k="msg"></div><div data-k="lists"></div>';
        $(panel, '[data-k=nr]').onchange = B_safe(function () { S.norepeat = this.checked; paintLists(); });
        $(panel, '[data-op=pick]').onclick = B_safe(doPick);
        paintLists();
      }
      function paintLists() {
        const L = $(panel, '[data-k=lists]');
        if (!L) return;
        if (!S.norepeat) { L.innerHTML = ''; return; }
        const all = names(), rem = B_remaining(all, S.picked), done = S.picked.slice();
        L.innerHTML = '<div class="cx-h">மீதமுள்ளவர்கள் (<span data-k="remn">' + rem.length + '</span>)</div><div class="cxb-names">' + (rem.length ? rem.map(n => '<span>' + esc(n) + '</span>').join('') : '<span>—</span>') + '</div>' +
          (done.length ? '<div class="cx-h">தேர்வானவர்கள் (' + done.length + ')</div><div class="cxb-names done">' + done.map((n, i) => '<span>' + (i + 1) + '. ' + esc(n) + '</span>').join('') + '</div>' : '') +
          '<div class="cx-actions"><button type="button" class="cx-btn sec" data-op="reset">🔄 ' + T('மீளமை (Reset)', 'Reset') + '</button></div>';
        $(L, '[data-op=reset]').onclick = B_safe(() => { if (S.busy) return; S.picked = []; const b = $(panel, '[data-k=big]'); b.className = 'cxb-big'; b.textContent = '❓'; $(panel, '[data-k=msg]').innerHTML = ''; paintLists(); });
      }
      function doPick() {
        if (S.busy) return;
        const msg = $(panel, '[data-k=msg]'), big = $(panel, '[data-k=big]'), btn = $(panel, '[data-op=pick]');
        msg.innerHTML = '';
        const all = names();
        if (!all.length) { msg.innerHTML = msgHtml('முதலில் பெயர்களை உள்ளிடவும் (ஒரு வரிக்கு ஒரு பெயர்).'); return; }
        const pool = S.norepeat ? B_remaining(all, S.picked) : all;
        if (!pool.length) { msg.innerHTML = msgHtml('அனைவரும் தேர்வாகிவிட்டனர். "மீளமை" அழுத்தி மீண்டும் தொடங்கலாம்.'); return; }
        const chosen = pool[B_randInt(pool.length)];
        let reduce = false;
        try { reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* ignore */ }
        const finish = () => {
          S.busy = false; S.timer = null;
          if (!alive()) return;
          big.className = 'cxb-big done'; big.textContent = chosen; btn.disabled = false;
          if (S.norepeat) S.picked.push(chosen);
          paintLists();
        };
        if (reduce || pool.length === 1) { finish(); return; }
        S.busy = true; btn.disabled = true; big.className = 'cxb-big run';
        const t0 = Date.now();
        S.timer = setInterval(() => {
          if (!alive()) { clearInterval(S.timer); S.busy = false; return; }
          if (Date.now() - t0 >= 1200) { clearInterval(S.timer); finish(); return; }
          big.textContent = pool[B_randInt(pool.length)];
        }, 70);
      }

      function groupPanel() {
        panel.innerHTML = '<div class="cx-grid" style="margin-top:12px">' +
          selectField(T('பிரிக்கும் முறை', 'Split by'), 'gmode', [['count', 'குழுக்களின் எண்ணிக்கை'], ['size', 'ஒரு குழுவில் எத்தனை பேர்']], S.mode) +
          field(S.mode === 'size' ? T('ஒரு குழுவின் அளவு', 'Group size') : T('குழுக்களின் எண்ணிக்கை', 'Number of groups'), 'gnum', S.num, { mode: 'numeric' }) + '</div>' +
          '<div class="cx-actions"><button type="button" class="cx-btn big wide" data-op="mk">👥 ' + T('குழுக்கள் உருவாக்கு', 'Make groups') + '</button></div>' +
          '<div data-k="msg"></div><div data-k="out"></div><div data-k="act"></div>' +
          '<div class="cx-small">பெயர்கள் Fisher–Yates முறையில் சமவாய்ப்புடன் கலக்கப்படும்; குழுக்களின் அளவு ஒன்றுக்கு மேல் வேறுபடாது. "ஒரு குழுவில் எத்தனை பேர்" முறையில் அளவு தோராயமாகவே இருக்கும்.</div>';
        const msg = $(panel, '[data-k=msg]'), out = $(panel, '[data-k=out]'), actHost = $(panel, '[data-k=act]');
        $(panel, '[data-k=gmode]').onchange = B_safe(function () { S.mode = this.value; groupPanel(); });
        $(panel, '[data-k=gnum]').oninput = B_safe(function () { S.num = this.value; });
        const act = actionsEl(() => S.gtext);
        $(act, '[data-act=copy]').textContent = '📋 ' + T('குழுக்களை நகலெடு', 'Copy groups');
        act.insertAdjacentHTML('beforeend', '<button type="button" class="cx-btn sec" data-act="again">🔀 ' + T('மீண்டும் கலக்கு', 'Reshuffle') + '</button>');
        const go = B_safe(() => {
          msg.innerHTML = ''; out.innerHTML = ''; actHost.innerHTML = ''; S.gtext = '';
          const nm = names(), v = parseNum(S.num);
          const r = B_makeGroups(nm, S.mode, v);
          if (!r.ok) {
            msg.innerHTML = msgHtml(r.code === 'nonames' ? 'முதலில் பெயர்களை உள்ளிடவும் (ஒரு வரிக்கு ஒரு பெயர்).' : r.code === 'int' ? 'எண்ணை முழு எண்ணாக (1, 2, 3…) உள்ளிடவும்.' : 'குழுக்களின் எண்ணிக்கை பெயர்களின் எண்ணிக்கையை (' + nm.length + ') விட அதிகமாக இருக்கக்கூடாது.');
            return;
          }
          S.gtext = B_groupsText(r.groups);
          out.innerHTML = '<div class="cx-ok">' + r.groups.length + ' குழுக்கள் · அளவுகள்: ' + r.sizes.join(', ') + '</div>' +
            r.groups.map((g, i) => '<div class="cxb-grp"><b>குழு ' + (i + 1) + '</b> (' + g.length + ')<ol>' + g.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol></div>').join('');
          actHost.appendChild(act);
        });
        $(panel, '[data-op=mk]').onclick = go;
        $(act, '[data-act=again]').onclick = go;
      }
      count(); paintPanel();
    }
  };
  TOOL_IMPL.namepicker._f = { randInt: B_randInt, shuffle: B_shuffle, makeGroups: B_makeGroups, parseNames: B_parseNames, remaining: B_remaining, groupsText: B_groupsText };


  /* ===================================================================
     Instagram Helper (igtools) — caption counter + line-break keeper,
     hashtag builder, bio / name font styler, post-size cheat-sheet.
     100% on-device, no AI, free.
     =================================================================== */
  const IG_STYLES = [
    ['bold', 'Bold  𝗔𝗯𝗰', 0x1D5D4, 0x1D5EE, 0x1D7EC],
    ['italic', 'Italic  𝘈𝘣𝘤', 0x1D608, 0x1D622, 0],
    ['bolditalic', 'Bold italic  𝘼𝙗𝙘', 0x1D63C, 0x1D656, 0],
    ['mono', 'Mono  𝙰𝚋𝚌', 0x1D670, 0x1D68A, 0x1D7F6],
    ['circle', 'Circle  Ⓐⓑⓒ', 0x24B6, 0x24D0, 0],
    ['wide', 'Wide  Ａｂｃ', 0xFF21, 0xFF41, 0xFF10]
  ];
  function IG_map(str, up, lo, dg) {
    let o = '';
    for (const ch of String(str)) {
      const c = ch.codePointAt(0);
      if (c >= 65 && c <= 90 && up) o += String.fromCodePoint(up + c - 65);
      else if (c >= 97 && c <= 122 && lo) o += String.fromCodePoint(lo + c - 97);
      else if (c >= 48 && c <= 57 && dg) o += String.fromCodePoint(dg + c - 48);
      else o += ch;
    }
    return o;
  }
  function IG_tags(raw) {
    const seen = new Set(), out = [];
    String(raw).split(/[\n,;]+/).forEach(function (part) {
      const words = part.replace(/#/g, ' ').replace(/[^\p{L}\p{M}\p{N}_\s]/gu, ' ').split(/\s+/).filter(Boolean);
      if (!words.length) return;
      const tag = '#' + words.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join('');
      const k = tag.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(tag); }
    });
    return out;
  }
  function IG_count(text) {
    const tags = (String(text).match(/#[\p{L}\p{M}\p{N}_]+/gu) || []).length;
    return { chars: Array.from(String(text)).length, tags: tags, lines: text ? String(text).split('\n').length : 0 };
  }
  TOOL_IMPL.igtools = {
    mount(body) {
      const root = B_root(body);
      const SIZES = [
        [T('போஸ்ட் (நிமிர்ந்த)', 'Post (portrait)'), '1080 × 1350', '4:5'],
        [T('போஸ்ட் (சதுரம்)', 'Post (square)'), '1080 × 1080', '1:1'],
        [T('ஸ்டோரி / ரீல்', 'Story / Reel'), '1080 × 1920', '9:16'],
        [T('புரொஃபைல் படம்', 'Profile photo'), '320 × 320', '1:1']
      ];
      root.innerHTML = purpose('இது எதற்கு? Instagram caption-ல் எழுத்து/hashtag எண்ணிக்கை பார்க்க, hashtag-களை உருவாக்க, bio-வுக்கு அழகான எழுத்து வடிவம் தர, சரியான படத்தின் அளவை அறிய. எல்லாம் உங்கள் போனிலேயே நடக்கும் — இலவசம்.', 'Count caption characters and hashtags, build hashtags, style your bio text and check the right post sizes. Runs on your device — free.') +
        '<div class="cx-chips" data-k="tabs">' +
        '<button type="button" class="cx-chip on" data-tab="cap">' + T('Caption', 'Caption') + '</button>' +
        '<button type="button" class="cx-chip" data-tab="tag">#' + T('Hashtag', 'Hashtags') + '</button>' +
        '<button type="button" class="cx-chip" data-tab="bio">' + T('Bio எழுத்து', 'Bio fonts') + '</button>' +
        '<button type="button" class="cx-chip" data-tab="size">' + T('அளவுகள்', 'Sizes') + '</button></div>' +
        /* caption */
        '<div data-p="cap">' +
        '<div class="cx-f"><label>' + T('உங்கள் caption', 'Your caption') + '</label><textarea class="cxb-ta" rows="7" data-k="cin" spellcheck="false" placeholder="' + esc('இங்கே caption எழுதுங்கள் அல்லது ஒட்டுங்கள்…') + '"></textarea></div>' +
        '<div class="cx-small" data-k="cstat"></div><div data-k="cwarn"></div>' +
        '<div class="cx-actions"><button type="button" class="cx-btn" data-act="keep">⠀ ' + T('வரி இடைவெளியைக் காக்கும்படி மாற்று', 'Keep my blank lines') + '</button></div>' +
        '<div class="cx-small">' + T('Instagram சில நேரம் வெற்று வரிகளை நீக்கிவிடும். இந்த பொத்தான் கண்ணுக்குத் தெரியாத குறியை வைத்து இடைவெளியைக் காக்கும்.', 'Instagram sometimes deletes blank lines. This adds an invisible mark so your spacing stays.') + '</div>' +
        '<div class="cx-f"><label>' + T('முடிவு', 'Result') + '</label><textarea class="cxb-ta" rows="5" data-k="cout" readonly></textarea></div><div data-k="cact"></div></div>' +
        /* hashtags */
        '<div data-p="tag" style="display:none">' +
        '<div class="cx-f"><label>' + T('சொற்கள் (ஒவ்வொரு வரி அல்லது கமா)', 'Keywords (one per line or comma)') + '</label><textarea class="cxb-ta" rows="5" data-k="tin" spellcheck="false" placeholder="' + esc('chennai food\nதமிழ் கல்வி\nstudy tips') + '"></textarea></div>' +
        '<div class="cx-small" data-k="tstat"></div><div data-k="twarn"></div>' +
        '<div class="cx-f"><label>' + T('Hashtag-கள்', 'Hashtags') + '</label><textarea class="cxb-ta" rows="4" data-k="tout" readonly></textarea></div><div data-k="tact"></div></div>' +
        /* bio */
        '<div data-p="bio" style="display:none">' +
        '<div class="cx-f"><label>' + T('உங்கள் பெயர் / Bio (ஆங்கில எழுத்துகள் மாறும்)', 'Your name / bio (English letters change)') + '</label><textarea class="cxb-ta" rows="3" data-k="bin" spellcheck="false" placeholder="PDF Tools India"></textarea></div>' +
        '<div class="cx-small" data-k="bstat"></div><div data-k="blist"></div>' +
        '<div class="cx-small">' + T('தமிழ் எழுத்துகள் மாறாது. சில போன்களில் இந்த வடிவங்கள் சதுரமாகத் தெரியலாம்; Bio-வில் 150 எழுத்துகள் வரை மட்டுமே.', 'Tamil letters stay as they are. Some phones may show boxes for these styles; bio limit is 150 characters.') + '</div></div>' +
        /* sizes */
        '<div data-p="size" style="display:none"><div class="cx-small" style="margin-bottom:8px">' + T('சரியான அளவில் படம் தயாரித்தால் Instagram வெட்டாது.', 'Prepare images at these sizes so Instagram does not crop them.') + '</div>' +
        '<table class="cx-tbl" style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:6px">' + T('வகை', 'Type') + '</th><th style="text-align:left;padding:6px">px</th><th style="text-align:left;padding:6px">' + T('விகிதம்', 'Ratio') + '</th></tr></thead><tbody>' +
        SIZES.map(function (r) { return '<tr><td style="padding:6px;border-top:1px solid var(--line)">' + r[0] + '</td><td style="padding:6px;border-top:1px solid var(--line);font-weight:800">' + r[1] + '</td><td style="padding:6px;border-top:1px solid var(--line)">' + r[2] + '</td></tr>'; }).join('') +
        '</tbody></table><div class="cx-small" style="margin-top:8px">' + T('படத்தின் அளவை மாற்ற: "படம் அளவு மாற்று / Image Resize" கருவியைப் பயன்படுத்துங்கள்.', 'To change a picture’s size use the Image Resize tool.') + '</div></div>';

      const tabs = $$(root, '[data-tab]'), panels = $$(root, '[data-p]');
      tabs.forEach(function (b) {
        b.onclick = B_safe(function () {
          const k = b.getAttribute('data-tab');
          tabs.forEach(function (x) { x.classList.toggle('on', x === b); });
          panels.forEach(function (p) { p.style.display = p.getAttribute('data-p') === k ? '' : 'none'; });
        });
      });
      /* caption */
      const cin = $(root, '[data-k=cin]'), cout = $(root, '[data-k=cout]');
      let cres = '';
      const cact = actionsEl(function () { return cres; });
      $(root, '[data-k=cact]').appendChild(cact);
      const cstat = B_safe(function () {
        const c = IG_count(cin.value);
        $(root, '[data-k=cstat]').textContent = T('எழுத்துகள்', 'Characters') + ': ' + c.chars + ' / 2200 · Hashtags: ' + c.tags + ' / 30 · ' + T('வரிகள்', 'Lines') + ': ' + c.lines;
        $(root, '[data-k=cwarn]').innerHTML = (c.chars > 2200 ? msgHtml(T('Caption 2200 எழுத்துகளைத் தாண்டிவிட்டது.', 'Caption is over 2200 characters.')) : '') + (c.tags > 30 ? msgHtml(T('30-க்கு மேல் hashtag வைக்க முடியாது.', 'Instagram allows at most 30 hashtags.')) : '');
      });
      cin.addEventListener('input', cstat);
      $(root, '[data-act=keep]').onclick = B_safe(function () {
        if (!cin.value.trim()) { $(root, '[data-k=cwarn]').innerHTML = msgHtml(T('முதலில் caption-ஐ உள்ளிடவும்.', 'Enter your caption first.')); return; }
        cres = cin.value.split('\n').map(function (l) { return l.trim() === '' ? '⠀' : l; }).join('\n');
        cout.value = cres; cstat();
      });
      /* hashtags */
      const tin = $(root, '[data-k=tin]'), tout = $(root, '[data-k=tout]');
      let tres = '';
      $(root, '[data-k=tact]').appendChild(actionsEl(function () { return tres; }));
      tin.addEventListener('input', B_safe(function () {
        const list = IG_tags(tin.value);
        tres = list.slice(0, 30).join(' ');
        tout.value = tres;
        $(root, '[data-k=tstat]').textContent = list.length ? 'Hashtags: ' + Math.min(list.length, 30) + ' / 30' : '';
        $(root, '[data-k=twarn]').innerHTML = list.length > 30 ? msgHtml(T('30-க்கு மேல் இருப்பதால் முதல் 30 மட்டும் காட்டப்படுகிறது.', 'Only the first 30 are shown (Instagram limit).')) : '';
      }));
      /* bio */
      const bin = $(root, '[data-k=bin]'), blist = $(root, '[data-k=blist]');
      bin.addEventListener('input', B_safe(function () {
        blist.innerHTML = '';
        $(root, '[data-k=bstat]').textContent = bin.value ? T('எழுத்துகள்', 'Characters') + ': ' + Array.from(bin.value).length + ' / 150' : '';
        if (!bin.value.trim()) return;
        IG_STYLES.forEach(function (s) {
          const txt = IG_map(bin.value, s[2], s[3], s[4]);
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;gap:8px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:8px 10px;margin:6px 0;background:#fff';
          const span = document.createElement('div'); span.style.cssText = 'flex:1;min-width:0;word-break:break-word;font-size:15px'; span.textContent = txt;
          const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'cx-btn sec'; btn.style.cssText = 'padding:8px 12px;flex:0 0 auto'; btn.textContent = '📋';
          btn.onclick = function () { copyText(txt, btn); };
          row.appendChild(span); row.appendChild(btn); blist.appendChild(row);
        });
      }));
      cstat();
    }
  };
  TOOL_IMPL.igtools._f = { map: IG_map, tags: IG_tags, count: IG_count };

})();
