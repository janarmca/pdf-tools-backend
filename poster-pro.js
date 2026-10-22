/* poster-pro.js — advanced tools for the Tamil Poster Maker (loaded AFTER poster-core.js).
 * Adds: template categories, elements (shapes, badges, ribbons, stickers, frames), ready-made Tamil wording, text effects
 * (outline, glow, highlight, gradient, spacing, rotate), photo tools (filters, shape crop, border, flip, set as background),
 * alignment + snap guides + layers, and two OPTIONAL AI helpers that use credits (AI picture, AI wording) — everything else is free.
 * Works through window.__poster exposed by poster-core.js.
 */
(function () {
  'use strict';
  var API = 'https://pdftoolsindia.com/cfapi';
  var P, C, F;
  var $ = function (id) { return document.getElementById(id); };
  var NS = { selectable: true };

  function start() {
    P = window.__poster; if (!P || !P.canvas) return;
    C = P.canvas; F = P.F;
    buildCategoryChips();
    buildPanel();
    wireSnap();
    wireKeys();
  }

  /* ---------------------------------------------------------------- helpers */
  var u = function () { var s = P.state(); return Math.min(s.W, s.H) / 1080; };
  function addObj(o, opts) {
    var s = P.state();
    o.set(Object.assign({ left: s.W / 2 - (o.width * (o.scaleX || 1)) / 2, top: s.H * 0.38 }, opts || {}));
    C.add(o); C.setActiveObject(o); C.requestRenderAll(); refreshLayers();
    return o;
  }
  function act() { return C.getActiveObject(); }
  function isText(o) { return o && o instanceof F.Textbox; }
  function isImg(o) { return o && o instanceof F.FabricImage; }
  function changed(o) { if (o) { o.dirty = true; if (o.setCoords) o.setCoords(); } C.requestRenderAll(); C.fire('object:modified', { target: o }); refreshLayers(); }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------------------------------------------------------------- template categories */
  function buildCategoryChips() {
    var box = $('tpls'); if (!box) return;
    var cats = [['all', 'அனைத்தும்'], ['fest', '🎉 பண்டிகை'], ['business', '🏪 வணிகம்'], ['events', '🎂 நிகழ்ச்சி / வாழ்த்து'], ['notice', '📢 அறிவிப்பு / வேலை / கல்வி']];
    var row = el('<div class="chips" id="tplCats" style="margin-bottom:10px"></div>');
    cats.forEach(function (c, i) {
      var b = el('<button type="button" class="chip' + (i ? '' : ' on') + '" data-c="' + c[0] + '">' + c[1] + '</button>');
      b.onclick = function () {
        row.querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('on', x === b); });
        box.querySelectorAll('.tpl').forEach(function (t) { t.classList.toggle('hide', c[0] !== 'all' && t.dataset.cat !== c[0]); });
      };
      row.appendChild(b);
    });
    box.parentNode.insertBefore(row, box);
    var cnt = el('<div class="note" style="margin:0 0 6px">' + P.templates.filter(function (t) { return t.cat !== 'blank'; }).length + ' வடிவங்கள் — தட்டினால் போஸ்டரில் வரும்</div>'); box.parentNode.insertBefore(cnt, box);
  }

  /* ---------------------------------------------------------------- the panel */
  var TABS = [['el', '🧩 Elements'], ['tx', '🔤 எழுத்து'], ['ph', '🖼️ படம்'], ['ar', '📐 அமைப்பு'], ['ai', '✨ AI']];
  function buildPanel() {
    var card = el('<div id="proCard"><h3 id="proTitle" style="font-size:.95rem;margin:0 0 10px">🧩 Elements</h3><div class="seg" id="proTabs" style="margin-bottom:10px"></div><div id="proBody"></div></div>');
    var host = $('proHost');
    if (host) host.appendChild(card); // editor layout: the left rail picks the tab
    else { var stageCard = $('stage').closest('.card'); card.className = 'card'; stageCard.parentNode.insertBefore(card, stageCard.nextSibling); }
    var tabs = card.querySelector('#proTabs');
    TABS.forEach(function (t, i) {
      var b = el('<button type="button" data-t="' + t[0] + '"' + (i ? '' : ' class="on"') + '>' + t[1] + '</button>');
      b.onclick = function () { tabs.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); showTab(t[0]); };
      tabs.appendChild(b);
    });
    var style = document.createElement('style');
    style.textContent = '#proTabs button{font-size:.78rem;padding:9px 2px}' +
      '.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:8px}' +
      '.pgrid button{min-height:58px;border:1.5px solid var(--line);border-radius:12px;background:#fff;font:inherit;font-size:.72rem;font-weight:800;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px}' +
      '.pgrid button b{font-size:1.5rem;line-height:1}' +
      '.emo{display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:6px}.emo button{font-size:1.6rem;height:46px;border:1px solid var(--line);border-radius:10px;background:#fff;cursor:pointer}' +
      '.words button{display:block;width:100%;text-align:left;margin:0 0 6px;padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:#fff;font:inherit;font-size:.86rem;cursor:pointer}' +
      '.layer{display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid var(--line);border-radius:10px;margin-bottom:6px;background:#fff;font-size:.8rem}' +
      '.layer.on{border-color:var(--brand);background:#f6edfa}.layer span{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:pointer}.layer button{border:0;background:#eef2f7;border-radius:8px;padding:5px 7px;cursor:pointer}' +
      '.sl{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:.78rem;font-weight:800;color:#475569}.sl input{flex:1}.sl output{min-width:42px;text-align:right}' +
      '.aiout img{width:100%;border-radius:10px;margin-top:8px}';
    document.head.appendChild(style);
    showTab('el');
    C.on('selection:created', function () { if (curTab !== 'el') showTab(curTab); refreshLayers(); });
    C.on('selection:updated', function () { if (curTab !== 'el') showTab(curTab); refreshLayers(); });
    C.on('selection:cleared', function () { if (curTab === 'tx' || curTab === 'ph') showTab(curTab); refreshLayers(); });
    C.on('object:added', refreshLayers); C.on('object:removed', refreshLayers);
  }
  var curTab = 'el';
  var TITLES = { el: '🧩 Elements · வடிவங்கள், Stickers', tx: '🔤 எழுத்து · Text effects', ph: '🖼️ படம் · Photo', ar: '📐 அமைப்பு · Align & Layers', ai: '✨ AI உதவி (credits)' };
  window.__posterPro = { showTab: function (t) { showTab(t); } };
  function showTab(t) {
    curTab = t; var b = $('proBody'); b.innerHTML = '';
    var ti = $('proTitle'); if (ti) ti.textContent = TITLES[t] || '';
    var tb = $('proTabs'); if (tb) tb.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x.dataset.t === t); });
    ({ el: tabElements, tx: tabText, ph: tabPhoto, ar: tabArrange, ai: tabAI })[t](b);
  }

  /* ---------------------------------------------------------------- elements */
  var STICKERS = '🎉🎊🪔✨🌸🌺🌼💐🌾☀️🌙⭐🔥💥🎁🎈🎂🍬🍰❤️💖👍🙏👏🏆🥇📢📞📍🛒🛍️💯✅❌⚡💡📚🎓✏️🏠🚚🕉️☪️✝️🇮🇳'.match(/(\p{Extended_Pictographic}|🇮🇳)(️)?/gu) || [];
  function tabElements(b) {
    b.appendChild(el('<label>வடிவங்கள் · Shapes</label>'));
    var g = el('<div class="pgrid"></div>'); b.appendChild(g);
    var U = u();
    var shapes = [
      ['▭', 'பெட்டி', function () { return new F.Rect({ width: 420 * U, height: 220 * U, rx: 24 * U, ry: 24 * U, fill: '#7c2d9a' }); }],
      ['◯', 'வட்டம்', function () { return new F.Circle({ radius: 150 * U, fill: '#f59e0b' }); }],
      ['△', 'முக்கோணம்', function () { return new F.Triangle({ width: 300 * U, height: 260 * U, fill: '#16a34a' }); }],
      ['★', 'நட்சத்திரம்', function () { return star(5, 160 * U, 70 * U, '#facc15'); }],
      ['✹', 'Offer badge', function () { return badge('50%\nOFF', '#dc2626', '#ffffff'); }],
      ['🎗', 'Ribbon', function () { return ribbon('சிறப்பு சலுகை', '#7c2d9a', '#ffffff'); }],
      ['🏷', 'விலை Tag', function () { return priceTag('₹ 499', '#16a34a'); }],
      ['➜', 'அம்பு', function () { return new F.Path('M 0 40 L 220 40 L 220 0 L 320 70 L 220 140 L 220 100 L 0 100 Z', { fill: '#2563eb', scaleX: U, scaleY: U }); }],
      ['—', 'கோடு', function () { return new F.Rect({ width: 600 * U, height: 8 * U, fill: '#111827' }); }],
      ['♥', 'இதயம்', function () { return new F.Path('M 0 30 C -60 -20 -30 -70 0 -40 C 30 -70 60 -20 0 30 Z', { fill: '#e11d48', scaleX: 3 * U, scaleY: 3 * U }); }],
      ['💬', 'பேச்சுக் குமிழ்', function () { return bubble('இங்கே எழுதுங்கள்'); }],
      ['⬚', 'கரை (Frame)', function () { var s = P.state(); return new F.Rect({ left: s.W * 0.03, top: s.H * 0.02, width: s.W * 0.94, height: s.H * 0.96, fill: 'rgba(0,0,0,0)', stroke: '#b8860b', strokeWidth: 12 * U, rx: 20 * U, ry: 20 * U, name: 'frame' }); }, true],
      ['⁘', 'புள்ளிக் கோலம் கரை', function () { return kolamBorder(); }, true]
    ];
    shapes.forEach(function (s) {
      var bt = el('<button type="button"><b>' + s[0] + '</b>' + s[1] + '</button>');
      bt.onclick = function () { var o = s[2](); if (s[3]) { C.add(o); C.setActiveObject(o); C.requestRenderAll(); refreshLayers(); } else addObj(o); };
      g.appendChild(bt);
    });
    b.appendChild(el('<label style="margin-top:12px">Stickers</label>'));
    var e = el('<div class="emo"></div>'); b.appendChild(e);
    STICKERS.forEach(function (s) {
      var bt = el('<button type="button">' + s + '</button>');
      bt.onclick = function () { addObj(new F.Textbox(s, { width: 180 * U, fontSize: 150 * U, textAlign: 'center', fontFamily: 'Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji, sans-serif', editable: false, name: 'sticker' })); };
      e.appendChild(bt);
    });
    b.appendChild(el('<div class="note">எந்த வடிவத்தையும் தட்டி நிறம், அளவு மாற்றலாம் (மேலே “தேர்ந்தெடுத்தது” பெட்டி).</div>'));
  }
  function star(n, r1, r2, fill) { var pts = []; for (var i = 0; i < n * 2; i++) { var a = Math.PI * i / n - Math.PI / 2, r = i % 2 ? r2 : r1; pts.push({ x: Math.cos(a) * r + r1, y: Math.sin(a) * r + r1 }); } return new F.Polygon(pts, { fill: fill, objectCaching: false }); }
  function badge(txt, bg, fg) {
    var U = u(), st = star(16, 190 * U, 160 * U, bg);
    var t = new F.Textbox(txt, { width: 260 * U, fontSize: 92 * U, lineHeight: 0.95, fontWeight: 800, fontFamily: 'Baloo Thambi 2', fill: fg, textAlign: 'center', originX: 'center', originY: 'center', left: 190 * U, top: 190 * U });
    return new F.Group([st, t], { name: 'badge' });
  }
  function ribbon(txt, bg, fg) {
    var U = u(), w = 620 * U, h = 120 * U;
    var body = new F.Rect({ left: 40 * U, top: 0, width: w, height: h, fill: bg });
    var l = new F.Polygon([{ x: 0, y: 20 * U }, { x: 60 * U, y: 20 * U }, { x: 60 * U, y: h + 20 * U }, { x: 0, y: h + 20 * U }, { x: 25 * U, y: h / 2 + 20 * U }], { fill: shade(bg) });
    var r = new F.Polygon([{ x: w + 20 * U, y: 20 * U }, { x: w + 80 * U, y: 20 * U }, { x: w + 55 * U, y: h / 2 + 20 * U }, { x: w + 80 * U, y: h + 20 * U }, { x: w + 20 * U, y: h + 20 * U }], { fill: shade(bg) });
    var t = new F.Textbox(txt, { left: 40 * U, top: 18 * U, width: w, fontSize: 64 * U, fontWeight: 700, fontFamily: 'Baloo Thambi 2', fill: fg, textAlign: 'center' });
    return new F.Group([l, r, body, t], { name: 'ribbon' });
  }
  function priceTag(txt, bg) {
    var U = u();
    var tag = new F.Path('M 0 0 L 300 0 L 360 70 L 300 140 L 0 140 Z', { fill: bg, scaleX: U, scaleY: U });
    var hole = new F.Circle({ left: 300 * U, top: 58 * U, radius: 12 * U, fill: '#ffffff' });
    var t = new F.Textbox(txt, { left: 0, top: 28 * U, width: 300 * U, fontSize: 72 * U, fontWeight: 800, fontFamily: 'Baloo Thambi 2', fill: '#ffffff', textAlign: 'center' });
    return new F.Group([tag, hole, t], { name: 'pricetag' });
  }
  function bubble(txt) {
    var U = u();
    var sh = new F.Path('M 20 0 L 480 0 Q 500 0 500 20 L 500 180 Q 500 200 480 200 L 140 200 L 80 260 L 90 200 L 20 200 Q 0 200 0 180 L 0 20 Q 0 0 20 0 Z', { fill: '#ffffff', stroke: '#111827', strokeWidth: 4, scaleX: U, scaleY: U });
    var t = new F.Textbox(txt, { left: 20 * U, top: 50 * U, width: 460 * U, fontSize: 56 * U, fontWeight: 700, fontFamily: 'Hind Madurai', fill: '#111827', textAlign: 'center' });
    return new F.Group([sh, t], { name: 'bubble' });
  }
  function kolamBorder() {
    var s = P.state(), U = u(), d = '', gap = 46 * U, r = 6 * U, m = 22 * U;
    var add = function (x, y) { d += 'M ' + (x - r) + ' ' + y + ' a ' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0 a ' + r + ' ' + r + ' 0 1 0 ' + -2 * r + ' 0 '; };
    for (var x = m; x <= s.W - m; x += gap) { add(x, m); add(x, s.H - m); }
    for (var y = m + gap; y < s.H - m; y += gap) { add(m, y); add(s.W - m, y); }
    return new F.Path(d, { fill: '#c2185b', left: m - r, top: m - r, name: 'kolam', objectCaching: false });
  }
  function shade(hex) { try { var n = parseInt(String(hex).slice(1), 16); var r = Math.max(0, (n >> 16) - 40), g = Math.max(0, ((n >> 8) & 255) - 40), b = Math.max(0, (n & 255) - 40); return 'rgb(' + r + ',' + g + ',' + b + ')'; } catch (e) { return '#333'; } }

  /* ---------------------------------------------------------------- text: presets, ready wording, effects */
  var WORDS = {
    'வாழ்த்து': ['இனிய நல்வாழ்த்துகள்!', 'உங்களுக்கும் உங்கள் குடும்பத்தினருக்கும் இனிய வாழ்த்துகள்', 'அன்பும் அமைதியும் நிறைந்த நாள் அமையட்டும்', 'வாழ்க வளமுடன்!', 'எல்லா நலமும் வளமும் பெற்று வாழ வாழ்த்துகிறோம்'],
    'வணிகம்': ['மாபெரும் தள்ளுபடி விற்பனை!', 'இன்றே கடைசி நாள்!', 'சலுகை குறுகிய காலம் மட்டும்', 'இலவச டோர் டெலிவரி', 'ஒன்று வாங்கினால் ஒன்று இலவசம்', 'தரம் உறுதி · விலை குறைவு', 'GPay / PhonePe ஏற்கப்படும்', 'அனைவரும் வருக! ஆதரவு தருக!'],
    'அழைப்பு': ['அன்புடன் அழைக்கிறோம்', 'தங்கள் வருகையை எதிர்நோக்கும்', 'குடும்பத்துடன் வருகை தந்து சிறப்பிக்கவும்', 'நாள்: ____  நேரம்: ____  இடம்: ____'],
    'அறிவிப்பு': ['முக்கிய அறிவிப்பு', 'நாளை கடை விடுமுறை', 'புதிய நேரம்: காலை 9 முதல் இரவு 9 வரை', 'சேர்க்கை நடைபெறுகிறது', 'வேலைக்கு ஆட்கள் தேவை']
  };
  function tabText(b) {
    var U = u(), s = P.state();
    b.appendChild(el('<label>எழுத்து சேர் · Add text</label>'));
    var g = el('<div class="pgrid"></div>'); b.appendChild(g);
    [['H1', 'தலைப்பு', 120, 'Baloo Thambi 2', 700], ['H2', 'துணைத் தலைப்பு', 72, 'Baloo Thambi 2', 700], ['¶', 'சாதாரண வரி', 48, 'Hind Madurai', 400], ['₹', 'விலை', 110, 'Baloo Thambi 2', 800]].forEach(function (p) {
      var bt = el('<button type="button"><b>' + p[0] + '</b>' + p[1] + '</button>');
      bt.onclick = async function () { await P.ensureFont(p[3]); addObj(new F.Textbox(p[0] === '₹' ? '₹ 999' : p[1], { width: s.W * 0.8, fontSize: p[2] * U, fontFamily: p[3], fontWeight: p[4], fill: '#111827', textAlign: 'center', lineHeight: 1.28, editable: false, name: 'text' }), { left: s.W * 0.1 }); setTimeout(function () { var t = $('tTxt'); if (t) { t.focus(); t.select(); } }, 60); };
      g.appendChild(bt);
    });
    var o = act();
    if (isText(o)) textEffects(b, o);
    else b.appendChild(el('<div class="note" style="margin:10px 0">எழுத்தைத் தட்டினால் Outline, Glow, Highlight, Gradient போன்ற effects இங்கே வரும்.</div>'));
    b.appendChild(el('<label style="margin-top:12px">தயார் வாசகங்கள் · Ready wording (தட்டினால் சேரும்)</label>'));
    var sel = el('<select></select>'); Object.keys(WORDS).forEach(function (k) { sel.appendChild(el('<option>' + k + '</option>')); }); b.appendChild(sel);
    var list = el('<div class="words" style="margin-top:8px"></div>'); b.appendChild(list);
    var fill = function () { list.innerHTML = ''; WORDS[sel.value].forEach(function (w) { var bt = el('<button type="button">' + esc(w) + '</button>'); bt.onclick = async function () { await P.ensureFont('Hind Madurai'); addObj(new F.Textbox(w, { width: s.W * 0.84, fontSize: 60 * U, fontFamily: 'Hind Madurai', fontWeight: 700, fill: '#111827', textAlign: 'center', lineHeight: 1.28, editable: false, name: 'text' }), { left: s.W * 0.08 }); }; list.appendChild(bt); }); };
    sel.onchange = fill; fill();
  }
  function slider(b, label, min, max, step, val, fmt, on) {
    var r = el('<div class="sl"><span style="min-width:96px">' + label + '</span><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"><output>' + fmt(val) + '</output></div>');
    var i = r.querySelector('input'); i.oninput = function () { r.querySelector('output').textContent = fmt(+i.value); on(+i.value, false); }; i.onchange = function () { on(+i.value, true); };
    b.appendChild(r); return r;
  }
  function color(b, label, val, on) {
    var r = el('<div class="sl"><span style="min-width:96px">' + label + '</span><input type="color" value="' + val + '"></div>');
    var i = r.querySelector('input'); i.oninput = function () { on(i.value, false); }; i.onchange = function () { on(i.value, true); }; b.appendChild(r); return r;
  }
  function hexOf(c, d) { return typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : d; }
  function textEffects(b, o) {
    var U = u(), done = function (fin) { o.dirty = true; if (o.initDimensions) o.initDimensions(); C.requestRenderAll(); if (fin) changed(o); };
    b.appendChild(el('<label style="margin-top:12px">Effects — தேர்ந்தெடுத்த எழுத்து</label>'));
    slider(b, 'Outline', 0, 20, 1, Math.round((o.strokeWidth || 0) / U), function (v) { return v; }, function (v, fin) { o.set({ strokeWidth: v * U, stroke: v ? (o.stroke || '#ffffff') : null, paintFirst: 'stroke', strokeLineJoin: 'round' }); done(fin); });
    color(b, 'Outline நிறம்', hexOf(o.stroke, '#ffffff'), function (v, fin) { o.set({ stroke: v }); if (!o.strokeWidth) o.set({ strokeWidth: 6 * U, paintFirst: 'stroke', strokeLineJoin: 'round' }); done(fin); });
    var sh = o.shadow || {};
    slider(b, 'Glow / நிழல்', 0, 60, 1, Math.round((sh.blur || 0) / U), function (v) { return v; }, function (v, fin) { o.set({ shadow: v ? new F.Shadow({ color: (o.shadow && o.shadow.color) || 'rgba(0,0,0,.55)', blur: v * U, offsetX: (o.shadow && o.shadow.offsetX) || 0, offsetY: (o.shadow && o.shadow.offsetY) || 0 }) : null }); done(fin); });
    color(b, 'Glow நிறம்', hexOf(sh.color, '#000000'), function (v, fin) { o.set({ shadow: new F.Shadow({ color: v, blur: ((o.shadow && o.shadow.blur) || 20 * U), offsetX: 0, offsetY: 0 }) }); done(fin); });
    color(b, 'Highlight', hexOf(o.textBackgroundColor, '#fff59d'), function (v, fin) { o.set({ textBackgroundColor: v }); done(fin); });
    var hl = el('<div class="row" style="margin:4px 0 8px"><button type="button" class="btn o sm" id="hlOff">Highlight நீக்கு</button><button type="button" class="btn o sm" id="grOn">🌈 Gradient</button><button type="button" class="btn o sm" id="grOff">Gradient நீக்கு</button></div>');
    b.appendChild(hl);
    hl.querySelector('#hlOff').onclick = function () { o.set({ textBackgroundColor: '' }); done(true); };
    hl.querySelector('#grOn').onclick = function () { o.set({ fill: new F.Gradient({ type: 'linear', coords: { x1: 0, y1: 0, x2: 0, y2: o.height || 100 }, colorStops: [{ offset: 0, color: '#ffd60a' }, { offset: 1, color: '#ff6b00' }] }) }); done(true); };
    hl.querySelector('#grOff').onclick = function () { o.set({ fill: '#111827' }); done(true); };
    slider(b, 'வரி இடைவெளி', 0.8, 2.2, 0.05, o.lineHeight || 1.28, function (v) { return v.toFixed(2); }, function (v, fin) { o.set({ lineHeight: v }); done(fin); });
    slider(b, 'சாய்வு (°)', -45, 45, 1, Math.round(o.angle || 0), function (v) { return v + '°'; }, function (v, fin) { o.rotate(v); done(fin); });
    slider(b, 'ஒளிபுகு %', 10, 100, 1, Math.round((o.opacity == null ? 1 : o.opacity) * 100), function (v) { return v + '%'; }, function (v, fin) { o.set({ opacity: v / 100 }); done(fin); });
    b.appendChild(el('<div class="note">தமிழ் எழுத்துகள் சிதையாமல் இருக்க வளைந்த எழுத்து (curved text) மற்றும் எழுத்து இடைவெளி மாற்றம் தவிர்க்கப்பட்டுள்ளன.</div>'));
  }

  /* ---------------------------------------------------------------- photo tools */
  function tabPhoto(b) {
    var o = act();
    b.appendChild(el('<div class="row"><button type="button" class="btn o" id="phAdd">🖼️ படம் சேர்</button><button type="button" class="btn o" id="phBg">🖼️ பின்னணிப் படம் சேர்</button></div>'));
    var fi = el('<input type="file" accept="image/*" class="hide">'); b.appendChild(fi);
    var mode = 'add';
    b.querySelector('#phAdd').onclick = function () { mode = 'add'; fi.click(); };
    b.querySelector('#phBg').onclick = function () { mode = 'bg'; fi.click(); };
    fi.onchange = async function () {
      var f = fi.files[0]; fi.value = ''; if (!f) return;
      if (mode === 'add') { await P.addPhoto(f); showTab('ph'); return; }
      try { var im = await P.readImage(f); setBackground(P.downscale(im, 2600)); } catch (e) { P.toast('படத்தைத் திறக்க முடியவில்லை'); }
    };
    if (!isImg(o)) { b.appendChild(el('<div class="note" style="margin-top:10px">ஒரு படத்தைத் தட்டினால் Filters, வட்ட வடிவம், கரை, திருப்புதல் போன்றவை இங்கே வரும்.</div>')); return; }
    var Fl = F.filters;
    var get = function (T) { return (o.filters || []).filter(function (x) { return x instanceof T; })[0]; };
    var setF = function (T, opts, on) {
      var cur = get(T); o.filters = (o.filters || []).filter(function (x) { return !(x instanceof T); });
      if (on) o.filters.push(new T(opts)); o.applyFilters(); C.requestRenderAll();
    };
    b.appendChild(el('<label style="margin-top:12px">Filters</label>'));
    slider(b, 'ஒளி (Brightness)', -50, 50, 1, Math.round(((get(Fl.Brightness) || {}).brightness || 0) * 100), function (v) { return v; }, function (v, fin) { setF(Fl.Brightness, { brightness: v / 100 }, v !== 0); if (fin) changed(o); });
    slider(b, 'Contrast', -50, 50, 1, Math.round(((get(Fl.Contrast) || {}).contrast || 0) * 100), function (v) { return v; }, function (v, fin) { setF(Fl.Contrast, { contrast: v / 100 }, v !== 0); if (fin) changed(o); });
    slider(b, 'நிறச் செறிவு', -100, 100, 1, Math.round(((get(Fl.Saturation) || {}).saturation || 0) * 100), function (v) { return v; }, function (v, fin) { setF(Fl.Saturation, { saturation: v / 100 }, v !== 0); if (fin) changed(o); });
    slider(b, 'மங்கல் (Blur)', 0, 40, 1, Math.round(((get(Fl.Blur) || {}).blur || 0) * 100), function (v) { return v; }, function (v, fin) { setF(Fl.Blur, { blur: v / 100 }, v !== 0); if (fin) changed(o); });
    var row = el('<div class="row" style="margin:6px 0"><button type="button" class="btn o sm" data-f="bw">கருப்பு-வெள்ளை</button><button type="button" class="btn o sm" data-f="sepia">பழைய படம் (Sepia)</button><button type="button" class="btn o sm" data-f="none">Filters நீக்கு</button></div>');
    row.onclick = function (e) {
      var k = e.target.getAttribute('data-f'); if (!k) return;
      if (k === 'none') { o.filters = []; o.applyFilters(); }
      if (k === 'bw') setF(Fl.Grayscale, {}, !get(Fl.Grayscale));
      if (k === 'sepia') setF(Fl.Sepia, {}, !get(Fl.Sepia));
      changed(o); showTab('ph');
    };
    b.appendChild(row);
    b.appendChild(el('<label>வடிவம் · Shape</label>'));
    var sr = el('<div class="row"><button type="button" class="btn o sm" data-s="none">▭ சாதாரணம்</button><button type="button" class="btn o sm" data-s="round">▢ வளைந்த மூலை</button><button type="button" class="btn o sm" data-s="circle">◯ வட்டம்</button></div>');
    sr.onclick = function (e) {
      var k = e.target.getAttribute('data-s'); if (!k) return;
      var w = o.width, h = o.height, m = Math.min(w, h);
      o.clipPath = k === 'none' ? null : k === 'circle' ? new F.Circle({ radius: m / 2, originX: 'center', originY: 'center', left: 0, top: 0 }) : new F.Rect({ width: w, height: h, rx: m * 0.08, ry: m * 0.08, originX: 'center', originY: 'center', left: 0, top: 0 });
      o.dirty = true; changed(o);
    };
    b.appendChild(sr);
    slider(b, 'கரை (Border)', 0, 30, 1, Math.round((o.strokeWidth || 0) / (o.scaleX || 1) / u()), function (v) { return v; }, function (v, fin) { o.set({ stroke: v ? (o.stroke || '#ffffff') : null, strokeWidth: v * u() / (o.scaleX || 1) }); C.requestRenderAll(); if (fin) changed(o); });
    color(b, 'கரை நிறம்', hexOf(o.stroke, '#ffffff'), function (v, fin) { o.set({ stroke: v }); if (!o.strokeWidth) o.set({ strokeWidth: 8 * u() / (o.scaleX || 1) }); C.requestRenderAll(); if (fin) changed(o); });
    slider(b, 'ஒளிபுகு %', 10, 100, 1, Math.round((o.opacity == null ? 1 : o.opacity) * 100), function (v) { return v + '%'; }, function (v, fin) { o.set({ opacity: v / 100 }); C.requestRenderAll(); if (fin) changed(o); });
    var fr = el('<div class="row" style="margin-top:6px"><button type="button" class="btn o sm" id="flH">⇋ இடம்-வலம்</button><button type="button" class="btn o sm" id="flV">⇵ மேல்-கீழ்</button><button type="button" class="btn o sm" id="mkBg">⬛ பின்னணியாக்கு</button></div>');
    fr.querySelector('#flH').onclick = function () { o.set({ flipX: !o.flipX }); changed(o); };
    fr.querySelector('#flV').onclick = function () { o.set({ flipY: !o.flipY }); changed(o); };
    fr.querySelector('#mkBg').onclick = function () { fitAsBackground(o); };
    b.appendChild(fr);
    b.appendChild(el('<div class="note">படத்தின் பின்னணியை நீக்க: <a href="/?tool=bgremove" target="_blank">Background Remover</a> கருவியில் நீக்கி, PNG-ஐ இங்கே சேருங்கள்.</div>'));
  }
  function fitAsBackground(o) {
    var s = P.state(), k = Math.max(s.W / o.width, s.H / o.height);
    o.set({ originX: 'center', originY: 'center', left: s.W / 2, top: s.H / 2, scaleX: k, scaleY: k, angle: 0, clipPath: null, name: 'bgphoto' });
    var bg = C.getObjects().filter(function (x) { return x.name === 'bg'; })[0];
    C.remove(o); C.insertAt(bg ? C.getObjects().indexOf(bg) + 1 : 0, o);
    C.setActiveObject(o); changed(o);
  }
  function setBackground(canvasOrImg) {
    var img = new F.FabricImage(canvasOrImg, { name: 'bgphoto' });
    C.add(img); fitAsBackground(img); P.toast('பின்னணிப் படம் சேர்ந்தது — எழுத்து தெரிய வேண்டுமானால் “ஒளி” குறைக்கவும்');
  }

  /* ---------------------------------------------------------------- arrange, snap, layers */
  function tabArrange(b) {
    var o = act();
    b.appendChild(el('<label>Canvas-ல் சீரமை · Align</label>'));
    var g = el('<div class="pgrid"></div>'); b.appendChild(g);
    [['⇤', 'இடது', 'l'], ['↔', 'நடு', 'c'], ['⇥', 'வலது', 'r'], ['⤒', 'மேல்', 't'], ['↕', 'நடு (மேல்-கீழ்)', 'm'], ['⤓', 'கீழ்', 'b']].forEach(function (a) {
      var bt = el('<button type="button"><b>' + a[0] + '</b>' + a[1] + '</button>'); bt.disabled = !o;
      bt.onclick = function () { align(a[2]); }; g.appendChild(bt);
    });
    var lk = el('<div class="row" style="margin:10px 0"><button type="button" class="btn o sm" id="lock">' + (o && o.lockMovementX ? '🔓 பூட்டு நீக்கு' : '🔒 பூட்டு') + '</button></div>');
    lk.querySelector('button').disabled = !o;
    lk.querySelector('button').onclick = function () { var x = act(); if (!x) return; var l = !x.lockMovementX; x.set({ lockMovementX: l, lockMovementY: l, lockScalingX: l, lockScalingY: l, lockRotation: l, hasControls: !l }); changed(x); showTab('ar'); };
    b.appendChild(lk);
    b.appendChild(el('<label>அடுக்குகள் · Layers (மேலே உள்ளது முன்னே)</label>'));
    b.appendChild(el('<div id="layers"></div>'));
    refreshLayers();
    b.appendChild(el('<div class="note">நகர்த்தும்போது நடுக்கோடு (இளஞ்சிவப்பு) வந்தால் சரியாக நடுவில் உள்ளது. விசைப்பலகை அம்புகளால் சிறிது நகர்த்தலாம் (Shift = 10 மடங்கு).</div>'));
  }
  function align(k) {
    var o = act(); if (!o) return; var s = P.state(), r = o.getBoundingRect();
    var dx = 0, dy = 0, m = s.W * 0.04;
    if (k === 'l') dx = m - r.left; if (k === 'c') dx = (s.W - r.width) / 2 - r.left; if (k === 'r') dx = s.W - m - r.width - r.left;
    if (k === 't') dy = m - r.top; if (k === 'm') dy = (s.H - r.height) / 2 - r.top; if (k === 'b') dy = s.H - m - r.height - r.top;
    o.set({ left: o.left + dx, top: o.top + dy }); changed(o);
  }
  function label(o) {
    if (o.name === 'bg') return '🎨 பின்னணி'; if (o.isFooter) return '🏪 Footer';
    if (o instanceof F.Textbox) return '🔤 ' + String(o.text).replace(/\s+/g, ' ').slice(0, 28);
    if (o instanceof F.FabricImage) return o.name === 'bgphoto' ? '🖼️ பின்னணிப் படம்' : '🖼️ படம்';
    if (o.isSlot) return '⬚ படம் இடம்'; if (o instanceof F.Group) return '🧩 ' + (o.name || 'குழு');
    return '◆ ' + (o.name && o.name !== 'text' ? o.name : (o.type || 'வடிவம்'));
  }
  function refreshLayers() {
    var box = $('layers'); if (!box) return; box.innerHTML = '';
    var objs = C.getObjects().slice().reverse(), a = act();
    objs.forEach(function (o) {
      if (o.name === 'slotHint') return;
      var row = el('<div class="layer' + (o === a ? ' on' : '') + '"><span></span><button type="button" title="காட்டு/மறை">' + (o.visible === false ? '🙈' : '👁') + '</button><button type="button" title="முன்னே">▲</button><button type="button" title="பின்னே">▼</button></div>');
      row.querySelector('span').textContent = label(o);
      var bs = row.querySelectorAll('button');
      row.querySelector('span').onclick = function () { if (o.selectable === false) { o.set({ selectable: true, evented: true }); } C.setActiveObject(o); C.requestRenderAll(); showTab('ar'); };
      bs[0].onclick = function () { o.set({ visible: o.visible === false }); changed(o); };
      bs[1].onclick = function () { C.bringObjectForward(o); changed(o); };
      bs[2].onclick = function () { C.sendObjectBackwards(o); changed(o); };
      box.appendChild(row);
    });
  }
  var guides = { v: false, h: false };
  function wireSnap() {
    C.on('object:moving', function (e) {
      var o = e.target, s = P.state(), r = o.getBoundingRect(), tol = Math.max(6, s.W * 0.008);
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      guides.v = Math.abs(cx - s.W / 2) < tol; guides.h = Math.abs(cy - s.H / 2) < tol;
      if (guides.v) o.set({ left: o.left + (s.W / 2 - cx) });
      if (guides.h) o.set({ top: o.top + (s.H / 2 - cy) });
    });
    C.on('mouse:up', function () { guides.v = guides.h = false; C.requestRenderAll(); });
    C.on('after:render', function () {
      if (!guides.v && !guides.h) return; var ctx = C.getContext(), s = P.state();
      ctx.save(); ctx.strokeStyle = '#ec4899'; ctx.lineWidth = Math.max(2, s.W / 400); ctx.setLineDash([s.W / 60, s.W / 90]);
      if (guides.v) { ctx.beginPath(); ctx.moveTo(s.W / 2, 0); ctx.lineTo(s.W / 2, s.H); ctx.stroke(); }
      if (guides.h) { ctx.beginPath(); ctx.moveTo(0, s.H / 2); ctx.lineTo(s.W, s.H / 2); ctx.stroke(); }
      ctx.restore();
    });
  }
  function wireKeys() {
    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || ''; if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      var o = act(); if (!o) return; var st = (e.shiftKey ? 10 : 1) * Math.max(1, P.state().W / 540);
      var m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
      if (m) { e.preventDefault(); o.set({ left: o.left + m[0], top: o.top + m[1] }); o.setCoords(); C.requestRenderAll(); clearTimeout(o.__kt); o.__kt = setTimeout(function () { changed(o); }, 300); }
    });
  }

  /* ---------------------------------------------------------------- AI (optional, uses credits) */
  var authClient = null;
  async function token() {
    try {
      if (!authClient && window.supabase && window.supabase.createClient) authClient = window.supabase.createClient(API);
      if (!authClient) return null;
      var r = await authClient.auth.getSession(); return r && r.data && r.data.session && r.data.session.access_token || null;
    } catch (e) { return null; }
  }
  async function call(path, body) {
    var t = await token();
    if (!t) { var e = new Error('LOGIN'); e.login = true; throw e; }
    var r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(body) });
    var j = await r.json().catch(function () { return {}; });
    if (r.status === 402) throw new Error('Credits போதவில்லை — முதன்மைப் பக்கத்தில் Credits வாங்கலாம்.');
    if (!r.ok) throw new Error(j.error || j.message || ('Error ' + r.status));
    return j;
  }
  function loginNote(b) { b.appendChild(el('<div class="note" style="background:#fff4e5;padding:10px;border-radius:10px">AI-க்கு login தேவை. <a href="/?login=1" target="_blank"><b>இங்கே login செய்யுங்கள்</b></a> (Google அல்லது மின்னஞ்சல் code) — பிறகு இந்தப் பக்கத்துக்குத் திரும்பி மீண்டும் தட்டுங்கள்.</div>')); }
  var STYLES = [['photo', 'புகைப்படம் போல', 'realistic photograph, soft light, high detail'], ['fest', 'பண்டிகை ஓவியம்', 'festive colourful illustration, Indian style, rich colours'], ['water', 'Watercolor', 'soft watercolor painting'], ['flat', 'Flat / Vector', 'flat vector illustration, clean shapes, bright colours'], ['3d', '3D', '3D render, glossy, studio lighting']];
  function tabAI(b) {
    b.appendChild(el('<div class="note" style="margin-bottom:10px">✨ AI உதவி விருப்பமானது. மற்ற அனைத்தும் இலவசம். AI பயன்படுத்தும்போது மட்டும் Credits செலவாகும் — தட்டும் முன் எவ்வளவு என்று காட்டுவோம்.</div>'));
    // --- AI picture
    b.appendChild(el('<label>🎨 AI படம் / பின்னணி — 5 credits</label>'));
    var pr = el('<textarea lang="ta" placeholder="எ.கா. தீபாவளி விளக்குகள், இரவு வானம், பட்டாசு — அல்லது English-ல் எழுதலாம்" style="min-height:70px"></textarea>'); b.appendChild(pr);
    var stl = el('<div class="chips" style="margin:8px 0"></div>'); var cur = 'fest';
    STYLES.forEach(function (s) { var c = el('<button type="button" class="chip' + (s[0] === cur ? ' on' : '') + '">' + s[1] + '</button>'); c.onclick = function () { cur = s[0]; stl.querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('on', x === c); }); }; stl.appendChild(c); });
    b.appendChild(stl);
    b.appendChild(el('<div class="note">படத்தில் எழுத்துகள் வேண்டாம் என்று AI-க்கு சொல்லுகிறோம் — தமிழ் எழுத்தை நீங்கள் மேலே சேர்க்கலாம் (AI தமிழ் எழுத்தைச் சரியாக வரையாது).</div>'));
    var row = el('<div class="row" style="margin-top:8px"><button type="button" class="btn p" id="aiGen">✨ படம் உருவாக்கு (5 credits)</button></div>'); b.appendChild(row);
    var out = el('<div class="aiout"></div>'); b.appendChild(out);
    row.querySelector('#aiGen').onclick = async function () {
      var p = pr.value.trim(); if (!p) { pr.focus(); return; }
      if (!confirm('AI படம் உருவாக்க 5 credits செலவாகும். தொடரலாமா?')) return;
      var bt = this; bt.disabled = true; out.innerHTML = '<div class="note">⏳ AI படம் வரைகிறது… (10–30 வினாடி)</div>';
      try {
        var style = STYLES.filter(function (s) { return s[0] === cur; })[0][2];
        var j = await call('/api/ai/image', { toolId: 'posterai', prompt: p + ' — ' + style + ', poster background, no text, no letters, no watermark' });
        var src = 'data:' + (j.mimeType || 'image/jpeg') + ';base64,' + j.imageBase64;
        out.innerHTML = ''; var im = el('<img alt="AI படம்">'); im.src = src; out.appendChild(im);
        var r2 = el('<div class="row" style="margin-top:8px"><button type="button" class="btn g" id="useBg">பின்னணியாக வை</button><button type="button" class="btn o" id="useEl">படமாகச் சேர்</button></div>'); out.appendChild(r2);
        var blob = await (await fetch(src)).blob(), file = new File([blob], 'ai-image.jpg', { type: blob.type });
        r2.querySelector('#useBg').onclick = async function () { var i2 = await P.readImage(file); setBackground(P.downscale(i2, 2600)); };
        r2.querySelector('#useEl').onclick = function () { P.addPhoto(file); };
        if (j.usedPrompt && j.translated) out.appendChild(el('<div class="note">AI-க்கு அனுப்பிய ஆங்கில விவரம்: ' + esc(j.usedPrompt) + '</div>'));
      } catch (e) { out.innerHTML = ''; if (e.login) loginNote(out); else out.appendChild(el('<div class="note" style="background:#fdeded;padding:10px;border-radius:10px">' + esc(e.message) + '</div>')); }
      bt.disabled = false;
    };
    // --- AI wording
    b.appendChild(el('<label style="margin-top:16px">📝 AI வாசகம் (தமிழ்) — 1 credit</label>'));
    var ab = el('<input type="text" lang="ta" placeholder="எ.கா. ஜவுளிக் கடை தீபாவளி தள்ளுபடி 30%, நாகர்கோவில்">'); b.appendChild(ab);
    var row2 = el('<div class="row" style="margin-top:8px"><button type="button" class="btn p" id="aiTx">✨ வாசகம் தயார் செய் (1 credit)</button></div>'); b.appendChild(row2);
    var out2 = el('<div class="words" style="margin-top:8px"></div>'); b.appendChild(out2);
    row2.querySelector('#aiTx').onclick = async function () {
      var q = ab.value.trim(); if (!q) { ab.focus(); return; }
      if (!confirm('AI வாசகத்துக்கு 1 credit செலவாகும். தொடரலாமா?')) return;
      var bt = this; bt.disabled = true; out2.innerHTML = '<div class="note">⏳ எழுதுகிறது…</div>';
      try {
        var j = await call('/api/ai/text', { toolId: 'posteraitext', creditCost: 1, text: '', instruction: 'You write short, catchy Tamil text for a printed poster. Topic: "' + q + '". Reply ONLY with 8 lines, each a separate poster line in natural Tamil script (no numbering, no quotes, no English unless it is a brand or number): 3 headline options (max 6 words each), 3 sub-lines (max 12 words), 2 call-to-action lines. Do not invent phone numbers, addresses, prices or dates that were not given.' });
        var lines = String(j.answer || '').split(/\n+/).map(function (x) { return x.replace(/^[\s\-*•\d.)]+/, '').replace(/^["“]|["”]$/g, '').trim(); }).filter(function (x) { return x && x.length < 140 && !/^\[note/i.test(x); }).slice(0, 10);
        out2.innerHTML = ''; if (!lines.length) out2.appendChild(el('<div class="note">பதில் கிடைக்கவில்லை — வேறு வார்த்தைகளில் முயலுங்கள்.</div>'));
        out2.appendChild(el('<div class="note" style="margin-bottom:6px">தட்டினால் போஸ்டரில் சேரும் — சேர்த்தபின் திருத்தலாம். AI தவறு செய்யலாம்; சரிபார்த்து பயன்படுத்துங்கள்.</div>'));
        var s = P.state(), U = u();
        lines.forEach(function (w, i) { var b2 = el('<button type="button">' + esc(w) + '</button>'); b2.onclick = async function () { await P.ensureFont('Baloo Thambi 2'); addObj(new F.Textbox(w, { width: s.W * 0.84, fontSize: (i < 3 ? 96 : 56) * U, fontFamily: i < 3 ? 'Baloo Thambi 2' : 'Hind Madurai', fontWeight: 700, fill: '#111827', textAlign: 'center', lineHeight: 1.28, editable: false, name: 'text' }), { left: s.W * 0.08 }); }; out2.appendChild(b2); });
      } catch (e) { out2.innerHTML = ''; if (e.login) loginNote(out2); else out2.appendChild(el('<div class="note" style="background:#fdeded;padding:10px;border-radius:10px">' + esc(e.message) + '</div>')); }
      bt.disabled = false;
    };
  }
  // start last, after every var above is initialised
  if (window.__poster) start(); else document.addEventListener('poster-ready', start, { once: true });
})();
