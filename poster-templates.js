/* poster-templates.js — extra ready-made designs for the Tamil Poster Maker (loaded BEFORE poster-core.js).
 * Every design is drawn in code (shapes + text) — no copied artwork, no images to download, all free.
 * Each entry: {id, label, cat, fonts, build(h)} — `h` is the drawing helper from poster-core.js (bg, grad, rect, circ, path,
 * poly, star, rays, dots, diya, slot, text, flow). K holds the font names and shop(). Text is placeholder the user edits.
 */
(function () {
  'use strict';
  window.__posterExtraTemplates = window.__posterExtraTemplates || [];
  window.__posterExtraTemplates.push(function (K) {
    var FH = K.FH, FM = K.FM, FS = K.FS, FT = K.FT, FC = K.FC, shop = K.shop;
    var NS = { selectable: false, evented: false };
    var deco = function (o) { return Object.assign({}, NS, o || {}); };
    // shrink a text box until it wraps to at most `lines` lines (Tamil words are long — never let a heading spill)
    function fit(tb, lines) {
      tb.initDimensions();
      for (var n = 0; n < 40 && (tb.textLines || []).length > (lines || 1); n++) { tb.set({ fontSize: tb.fontSize * 0.94 }); tb.initDimensions(); }
      return tb;
    }
    function T(h, t, op, lines) { return fit(h.text(t, op), lines || 1); }
    // a row of "item ........ ₹price" lines (two text boxes per row, left and right aligned), each kept to one line
    function priceRows(h, x, y, wd, rows, size, c1, c2, gap) {
      var cur = y;
      rows.forEach(function (r) {
        var a = T(h, r[0], { left: x, top: cur, w: wd * 0.7, size: size, font: FM, color: c1, bold: 1, align: 'left' });
        var b = T(h, r[1], { left: x + wd * 0.7, top: cur, w: wd * 0.3, size: size, font: FH, color: c2, bold: 1, align: 'right' });
        a.set({ top: cur + (size - a.fontSize) * 0.6 });
        h.rect(x, cur + size * 1.42, wd, Math.max(1, size * 0.04), 'rgba(255,255,255,.25)', NS);
        cur += size * 1.42 + (gap || size * 0.45);
      });
      return cur;
    }
    // bullet list that shrinks as a whole until it ends above maxY
    function bullets(h, x, y, wd, items, size, color, mark, maxY) {
      var objs = items.map(function (t) { return h.text((mark || '✔') + '  ' + t, { left: x, top: y, w: wd, size: size, font: FM, color: color, bold: 1, align: 'left' }); });
      var lay = function (sz) { var cur = y; objs.forEach(function (tb) { tb.set({ fontSize: sz, top: cur }); tb.initDimensions(); cur += tb.height + sz * 0.35; }); return cur; };
      var end = lay(size);
      for (var n = 0; maxY && end > maxY && n < 25; n++) { size *= 0.94; end = lay(size); }
      return end;
    }
    function phoneBar(h, y, bg, fg, label) {
      var w = h.w, H = h.h;
      h.rect(0, y, w, H * 0.075, bg, NS);
      var tb = T(h, label || '📞 98xxx xxx21', { left: w * 0.04, top: y, w: w * 0.92, size: w * 0.068, font: FH, color: fg, bold: 1, align: 'center', name: 'phone' });
      tb.set({ top: y + (H * 0.075 - tb.height) / 2 });
    }
    return [
      /* ------------------------------------------------ festivals */
      { id: 'christmas', label: 'கிறிஸ்துமஸ்', cat: 'fest', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#0b1f4d'], [1, '#123d7a']]));
        h.dots(w * 0.05, H * 0.03, 10, 6, w * 0.1, 3 * u, 'rgba(255,255,255,.45)');
        [[0.5, 0.20, 0.20], [0.5, 0.28, 0.27], [0.5, 0.37, 0.34]].forEach(function (t) {
          h.poly([{ x: 0, y: -w * t[2] * 0.6 }, { x: w * t[2] * 0.62, y: w * t[2] * 0.25 }, { x: -w * t[2] * 0.62, y: w * t[2] * 0.25 }], w * t[0], H * t[1], '#1f8a4c', NS);
        });
        h.rect(w * 0.46, H * 0.44, w * 0.08, H * 0.05, '#7a4a21', NS);
        h.star(w / 2, H * 0.085, w * 0.06, w * 0.025, 5, '#ffd60a', NS);
        [[0.42, 0.25, '#e63946'], [0.58, 0.31, '#ffd60a'], [0.44, 0.36, '#4cc9f0'], [0.6, 0.4, '#e63946'], [0.38, 0.42, '#ffd60a']].forEach(function (b) { h.circ(w * b[0], H * b[1], w * 0.018, b[2], NS); });
        h.flow(H * 0.53, [
          { t: 'கிறிஸ்துமஸ் நல்வாழ்த்துகள்', s: 0.09, f: FH, c: '#ffd60a', b: 1, sh: 1, g: 0.006 },
          { t: 'Merry Christmas', s: 0.065, f: FH, c: '#ffffff', b: 1, g: 0.02 },
          { t: 'அன்பும் அமைதியும் நிறைந்த இனிய திருநாள்', s: 0.045, f: FM, c: '#dbe7ff', g: 0.02 },
          { t: shop(), s: 0.065, f: FH, c: '#ffffff', b: 1 }
        ]);
      } },
      { id: 'eid', label: 'ரம்ஜான் / பக்ரீத்', cat: 'fest', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#064e3b'], [1, '#022c22']]));
        h.dots(w * 0.06, H * 0.03, 9, 5, w * 0.11, 3 * u, 'rgba(255,215,0,.35)');
        h.circ(w * 0.5, H * 0.22, w * 0.17, '#f4d35e', NS);
        h.circ(w * 0.57, H * 0.20, w * 0.15, '#04392b', NS);
        h.star(w * 0.36, H * 0.16, w * 0.04, w * 0.017, 5, '#f4d35e', NS);
        [0.2, 0.35, 0.5, 0.65, 0.8].forEach(function (x, i) { var ht = H * (0.05 + (i % 2) * 0.02); h.rect(w * x - w * 0.004, 0, w * 0.008, ht, 'rgba(244,211,94,.7)', NS); h.circ(w * x, ht + w * 0.02, w * 0.022, '#f4d35e', NS); });
        h.flow(H * 0.44, [
          { t: 'ரம்ஜான் நல்வாழ்த்துகள்', s: 0.095, f: FH, c: '#f4d35e', b: 1, sh: 1, g: 0.006 },
          { t: 'Eid Mubarak', s: 0.07, f: FH, c: '#ffffff', b: 1, g: 0.02 },
          { t: 'இறைவனின் அருள் உங்கள் இல்லம் நிறையட்டும்', s: 0.046, f: FM, c: '#d1fae5', g: 0.025 },
          { t: shop(), s: 0.065, f: FH, c: '#ffffff', b: 1 }
        ]);
      } },
      { id: 'vinayagar', label: 'விநாயகர் சதுர்த்தி', cat: 'fest', fonts: [FH, FM, FS], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#ff8c00'], [1, '#c2410c']]));
        h.rays(w / 2, H * 0.3, 0, w * 1.1, 32, 'rgba(255,255,255,.12)');
        h.circ(w / 2, H * 0.3, w * 0.3, 'rgba(255,240,200,.25)', NS);
        h.circ(w / 2, H * 0.3, w * 0.25, 'rgba(255,240,200,.25)', NS);
        h.slot(w / 2, H * 0.3, w * 0.42, w * 0.42, 'circle', '#fff3d6');
        h.flow(H * 0.56, [
          { t: 'விநாயகர் சதுர்த்தி', s: 0.1, f: FH, c: '#fff3d6', b: 1, sh: 1, g: 0.004 },
          { t: 'நல்வாழ்த்துகள்', s: 0.075, f: FH, c: '#ffffff', b: 1, g: 0.02 },
          { t: 'தடைகள் நீங்கி வெற்றி பெருகட்டும்', s: 0.046, f: FS, c: '#fff7e6', g: 0.025 },
          { t: shop(), s: 0.062, f: FH, c: '#ffffff', b: 1 }
        ]);
      } },
      { id: 'ayudha', label: 'ஆயுத / சரஸ்வதி பூஜை', cat: 'fest', fonts: [FH, FM, FS], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#7f1d1d'], [1, '#450a0a']]));
        h.dots(w * 0.04, H * 0.025, 13, 2, w * 0.077, 5 * u, 'rgba(250,204,21,.6)');
        h.dots(w * 0.04, H * 0.82, 13, 2, w * 0.077, 5 * u, 'rgba(250,204,21,.6)');
        h.rect(w * 0.06, H * 0.08, w * 0.88, H * 0.7, 'rgba(0,0,0,0)', deco({ stroke: '#facc15', strokeWidth: 5 * u }));
        h.diya(w * 0.3, H * 0.2, 1.3 * u, '#facc15', '#ff9f1c'); h.diya(w * 0.7, H * 0.2, 1.3 * u, '#facc15', '#ff9f1c');
        h.flow(H * 0.3, [
          { t: 'ஆயுத பூஜை', s: 0.11, f: FH, c: '#facc15', b: 1, sh: 1, g: 0.004 },
          { t: '&', s: 0.06, f: FH, c: '#ffffff', b: 1, g: 0.004 },
          { t: 'சரஸ்வதி பூஜை', s: 0.1, f: FH, c: '#facc15', b: 1, sh: 1, g: 0.02 },
          { t: 'நல்வாழ்த்துகள்', s: 0.07, f: FH, c: '#ffffff', b: 1, g: 0.025 },
          { t: 'தொழில் செழிக்க, கல்வி சிறக்க வாழ்த்துகிறோம்', s: 0.044, f: FS, c: '#fde68a', g: 0.02 },
          { t: shop(), s: 0.06, f: FH, c: '#ffffff', b: 1 }
        ]);
      } },
      { id: 'karthigai', label: 'கார்த்திகை தீபம்', cat: 'fest', fonts: [FH, FM, FS], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#1e1b4b'], [1, '#3b0764']]));
        h.dots(w * 0.05, H * 0.04, 10, 5, w * 0.1, 2.5 * u, 'rgba(255,255,255,.4)');
        for (var i = 0; i < 5; i++) h.diya(w * (0.14 + i * 0.18), H * 0.3 + (i % 2) * H * 0.03, 1.4 * u, '#d97706', '#fbbf24');
        h.rect(0, H * 0.37, w, H * 0.006, 'rgba(251,191,36,.5)', NS);
        h.flow(H * 0.44, [
          { t: 'கார்த்திகை தீப', s: 0.1, f: FH, c: '#fbbf24', b: 1, sh: 1, g: 0.004 },
          { t: 'நல்வாழ்த்துகள்', s: 0.08, f: FH, c: '#ffffff', b: 1, g: 0.02 },
          { t: 'இருள் நீங்கி ஒளி பரவட்டும்', s: 0.05, f: FS, c: '#fde68a', g: 0.025 },
          { t: shop(), s: 0.062, f: FH, c: '#ffffff', b: 1 }
        ]);
      } },
      { id: 'womensday', label: 'மகளிர் தினம்', cat: 'fest', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#db2777'], [1, '#7e22ce']]));
        h.circ(w * 0.85, H * 0.1, w * 0.25, 'rgba(255,255,255,.1)', NS); h.circ(w * 0.1, H * 0.75, w * 0.3, 'rgba(255,255,255,.08)', NS);
        h.slot(w / 2, H * 0.28, w * 0.44, w * 0.44, 'circle', '#ffffff');
        h.flow(H * 0.52, [
          { t: 'மகளிர் தின', s: 0.1, f: FH, c: '#ffffff', b: 1, sh: 1, g: 0.004 },
          { t: 'நல்வாழ்த்துகள்', s: 0.08, f: FH, c: '#fde68a', b: 1, g: 0.02 },
          { t: 'Happy Women’s Day', s: 0.055, f: FH, c: '#ffffff', g: 0.02 },
          { t: 'பெண்மையைப் போற்றுவோம்', s: 0.048, f: FM, c: '#fce7f3', b: 1, g: 0.025 },
          { t: shop(), s: 0.06, f: FH, c: '#ffffff', b: 1 }
        ]);
      } },
      /* ------------------------------------------------ business */
      { id: 'newarrival', label: 'புதிய வரவு / Product', cat: 'business', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg('#f8fafc');
        h.rect(0, 0, w, H * 0.5, h.grad([[0, '#0f172a'], [1, '#1e3a8a']], true, 0, H * 0.5), NS);
        h.slot(w / 2, H * 0.36, w * 0.62, w * 0.62, 'round', '#93c5fd');
        h.poly([{ x: 0, y: 0 }, { x: w * 0.42, y: 0 }, { x: w * 0.36, y: H * 0.05 }, { x: w * 0.42, y: H * 0.1 }, { x: 0, y: H * 0.1 }], w * 0.21, H * 0.06, '#f59e0b', NS);
        var nt = T(h, 'புதிய வரவு!', { left: w * 0.02, top: H * 0.06, w: w * 0.32, size: w * 0.06, font: FH, color: '#111827', bold: 1, align: 'center' }); nt.set({ top: H * 0.06 - nt.height / 2 });
        h.circ(w * 0.82, H * 0.6, w * 0.13, '#dc2626', NS);
        h.text('₹999', { left: w * 0.69, top: H * 0.6 - w * 0.06, w: w * 0.26, size: w * 0.075, font: FH, color: '#ffffff', bold: 1, align: 'center', name: 'price' });
        h.text('மட்டும்', { left: w * 0.69, top: H * 0.6 + w * 0.025, w: w * 0.26, size: w * 0.035, font: FM, color: '#ffffff', bold: 1, align: 'center' });
        h.flow(H * 0.7, [
          { t: 'பொருளின் பெயர்', s: 0.08, f: FH, c: '#0f172a', b: 1, a: 'left', g: 0.008 },
          { t: 'சிறப்பம்சம் 1 · சிறப்பம்சம் 2 · சிறப்பம்சம் 3', s: 0.042, f: FM, c: '#334155', a: 'left', g: 0.02 },
          { t: shop(), s: 0.055, f: FH, c: '#1e3a8a', b: 1, a: 'left' }
        ]);
      } },
      { id: 'pricelist', label: 'விலைப் பட்டியல் / Offer list', cat: 'business', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#14532d'], [1, '#052e16']]));
        h.rect(0, 0, w, H * 0.17, '#facc15', NS);
        T(h, 'இன்றைய சிறப்பு விலை', { left: w * 0.04, top: H * 0.04, w: w * 0.92, size: w * 0.085, font: FH, color: '#14532d', bold: 1, align: 'center' });
        T(h, shop(), { left: w * 0.04, top: H * 0.2, w: w * 0.92, size: w * 0.06, font: FH, color: '#ffffff', bold: 1, align: 'center' });
        priceRows(h, w * 0.08, H * 0.3, w * 0.84, [['அரிசி (1 கிலோ)', '₹ 52'], ['துவரம் பருப்பு (1 கிலோ)', '₹ 150'], ['சர்க்கரை (1 கிலோ)', '₹ 44'], ['எண்ணெய் (1 லிட்டர்)', '₹ 135'], ['டீ தூள் (250 கி)', '₹ 98'], ['சோப் (4 பீஸ்)', '₹ 120']], w * 0.05, '#ffffff', '#facc15');
        phoneBar(h, H * 0.79, '#facc15', '#14532d', '📞 Door delivery: 98xxx xxx21');
      } },
      { id: 'menu', label: 'ஹோட்டல் மெனு', cat: 'business', fonts: [FH, FM, FS], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg('#1c1917');
        h.rect(w * 0.04, H * 0.025, w * 0.92, H * 0.85, 'rgba(0,0,0,0)', deco({ stroke: '#d6a656', strokeWidth: 4 * u, rx: 22 * u, ry: 22 * u }));
        T(h, shop(), { left: w * 0.06, top: H * 0.05, w: w * 0.88, size: w * 0.075, font: FH, color: '#d6a656', bold: 1, align: 'center' });
        h.text('இன்றைய ஸ்பெஷல் · Today’s Menu', { left: w * 0.06, top: H * 0.12, w: w * 0.88, size: w * 0.045, font: FS, color: '#f5f5f4', align: 'center' });
        h.text('காலை உணவு', { left: w * 0.1, top: H * 0.19, w: w * 0.8, size: w * 0.05, font: FH, color: '#fbbf24', bold: 1, align: 'left' });
        var y = priceRows(h, w * 0.1, H * 0.25, w * 0.8, [['இட்லி (2)', '₹ 30'], ['தோசை', '₹ 45'], ['பொங்கல்', '₹ 50'], ['பூரி செட்', '₹ 55']], w * 0.042, '#f5f5f4', '#fbbf24');
        h.text('மதிய உணவு', { left: w * 0.1, top: y + H * 0.01, w: w * 0.8, size: w * 0.05, font: FH, color: '#fbbf24', bold: 1, align: 'left' });
        priceRows(h, w * 0.1, y + H * 0.07, w * 0.8, [['சாப்பாடு (Full Meals)', '₹ 110'], ['வெஜ் பிரியாணி', '₹ 120'], ['பரோட்டா (2) + குருமா', '₹ 60']], w * 0.042, '#f5f5f4', '#fbbf24');
      } },
      { id: 'service', label: 'சேவை விளம்பரம் (Electrician…)', cat: 'business', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg('#fff7ed');
        h.poly([{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: H * 0.26 }, { x: 0, y: H * 0.34 }], w / 2, H * 0.17, '#ea580c', NS);
        T(h, '⚡ எலக்ட்ரீஷியன் சேவை', { left: w * 0.05, top: H * 0.06, w: w * 0.9, size: w * 0.085, font: FH, color: '#ffffff', bold: 1, align: 'center' });
        T(h, 'வீடு · கடை · அலுவலகம்', { left: w * 0.05, top: H * 0.165, w: w * 0.9, size: w * 0.048, font: FM, color: '#ffedd5', bold: 1, align: 'center' });
        bullets(h, w * 0.1, H * 0.37, w * 0.8, ['புதிய வயரிங் & பழுது நீக்கம்', 'மோட்டார், இன்வெர்ட்டர் பொருத்துதல்', 'Fan, Light, Switch board', 'அவசர சேவை — 24 மணி நேரம்'], w * 0.05, '#7c2d12', '✔', H * 0.68);
        T(h, shop(), { left: w * 0.05, top: H * 0.7, w: w * 0.9, size: w * 0.06, font: FH, color: '#9a3412', bold: 1, align: 'center' });
        phoneBar(h, H * 0.79, '#ea580c', '#ffffff');
      } },
      { id: 'realestate', label: 'மனை / வீடு விற்பனை', cat: 'business', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg('#ecfeff');
        h.slot(w / 2, H * 0.22, w * 0.9, H * 0.34, 'rect', '#0e7490');
        h.rect(0, H * 0.4, w, H * 0.09, '#0e7490', NS);
        T(h, 'மனை விற்பனைக்கு', { left: w * 0.04, top: H * 0.415, w: w * 0.92, size: w * 0.08, font: FH, color: '#ffffff', bold: 1, align: 'center' });
        bullets(h, w * 0.08, H * 0.52, w * 0.84, ['இடம்: உங்கள் ஊர் பெயர்', 'அளவு: 1200 சதுர அடி', 'அனுமதி விவரம்: (உங்கள் விவரம்)', 'பிரதான சாலையிலிருந்து 500 மீட்டர்'], w * 0.048, '#164e63', '📍', H * 0.77);
        phoneBar(h, H * 0.79, '#f59e0b', '#1f2937', '📞 உரிமையாளர்: 98xxx xxx21');
      } },
      { id: 'ytthumb', label: 'YouTube Thumbnail', cat: 'business', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#111827'], [1, '#7f1d1d']], false, w));
        h.slot(w * 0.72, H * 0.45, Math.min(w * 0.46, H * 0.8), Math.min(w * 0.46, H * 0.8), 'round', '#fca5a5');
        h.text('இதை தெரிஞ்சுக்கோங்க!', { left: w * 0.04, top: H * 0.12, w: w * 0.5, size: Math.min(w * 0.09, H * 0.13), font: FH, color: '#facc15', bold: 1, align: 'left', shadow: 1, name: 'title' });
        h.rect(w * 0.04, H * 0.66, w * 0.36, H * 0.12, '#dc2626', deco({ rx: 12 * u, ry: 12 * u }));
        h.text('புதிய வீடியோ', { left: w * 0.04, top: H * 0.675, w: w * 0.36, size: Math.min(w * 0.045, H * 0.07), font: FH, color: '#ffffff', bold: 1, align: 'center' });
      } },
      /* ------------------------------------------------ events & people */
      { id: 'anniversary', label: 'திருமண நாள் வாழ்த்து', cat: 'events', fonts: [FT, FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#fff1f2'], [1, '#fecdd3']]));
        var heart = 'M 0 30 C -60 -20 -30 -70 0 -40 C 30 -70 60 -20 0 30 Z';
        h.path(heart, w * 0.15, H * 0.1, '#fb7185', deco({ scaleX: 1.2 * u, scaleY: 1.2 * u })); h.path(heart, w * 0.86, H * 0.14, '#f43f5e', deco({ scaleX: 0.9 * u, scaleY: 0.9 * u }));
        h.slot(w / 2, H * 0.3, w * 0.5, w * 0.5, 'circle', '#e11d48');
        h.flow(H * 0.56, [
          { t: 'இனிய திருமண நாள்', s: 0.09, f: FT, c: '#9f1239', b: 1, g: 0.004 },
          { t: 'நல்வாழ்த்துகள்', s: 0.075, f: FH, c: '#e11d48', b: 1, g: 0.02 },
          { t: 'மணமக்கள் பெயர் & பெயர்', s: 0.055, f: FH, c: '#4c0519', b: 1, g: 0.015 },
          { t: 'என்றும் அன்புடன் வாழ வாழ்த்துகிறோம்', s: 0.045, f: FM, c: '#881337', g: 0.02 },
          { t: '— வாழ்த்துவோர்: உங்கள் பெயர்', s: 0.042, f: FM, c: '#9f1239' }
        ]);
      } },
      { id: 'event', label: 'நிகழ்ச்சி அழைப்பு', cat: 'events', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#312e81'], [1, '#1e1b4b']]));
        h.circ(w * 0.9, H * 0.05, w * 0.3, 'rgba(129,140,248,.2)', NS);
        h.text('அன்புடன் அழைக்கிறோம்', { left: w * 0.05, top: H * 0.06, w: w * 0.9, size: w * 0.05, font: FM, color: '#c7d2fe', bold: 1, align: 'center' });
        h.text('நிகழ்ச்சியின் பெயர்', { left: w * 0.05, top: H * 0.12, w: w * 0.9, size: w * 0.1, font: FH, color: '#ffffff', bold: 1, align: 'center', shadow: 1, name: 'title' });
        [['📅', 'தேதி', '01-01-2027 (ஞாயிறு)'], ['⏰', 'நேரம்', 'மாலை 5.00 மணி'], ['📍', 'இடம்', 'திருமண மண்டபம், உங்கள் ஊர்']].forEach(function (r, i) {
          var y = H * (0.34 + i * 0.14);
          h.rect(w * 0.08, y, w * 0.84, H * 0.115, 'rgba(255,255,255,.1)', deco({ rx: 20 * u, ry: 20 * u }));
          h.text(r[0], { left: w * 0.1, top: y + H * 0.025, w: w * 0.12, size: w * 0.075, font: FM, color: '#ffffff', align: 'center' });
          h.text(r[1], { left: w * 0.24, top: y + H * 0.015, w: w * 0.64, size: w * 0.038, font: FM, color: '#a5b4fc', bold: 1, align: 'left' });
          h.text(r[2], { left: w * 0.24, top: y + H * 0.05, w: w * 0.64, size: w * 0.05, font: FH, color: '#ffffff', bold: 1, align: 'left' });
        });
        h.text('அனைவரும் வருக!', { left: w * 0.05, top: H * 0.78, w: w * 0.9, size: w * 0.065, font: FH, color: '#fde68a', bold: 1, align: 'center' });
      } },
      { id: 'congrats', label: 'வெற்றி வாழ்த்து (தேர்ச்சி)', cat: 'events', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#0369a1'], [1, '#0c4a6e']]));
        h.rays(w / 2, H * 0.27, 0, w, 28, 'rgba(253,224,71,.14)');
        h.slot(w / 2, H * 0.27, w * 0.42, w * 0.42, 'circle', '#fde047');
        h.star(w * 0.18, H * 0.1, w * 0.05, w * 0.02, 5, '#fde047', NS); h.star(w * 0.84, H * 0.42, w * 0.04, w * 0.016, 5, '#fde047', NS);
        h.flow(H * 0.5, [
          { t: 'வாழ்த்துகள்!', s: 0.12, f: FH, c: '#fde047', b: 1, sh: 1, g: 0.006 },
          { t: 'மாணவர் பெயர்', s: 0.075, f: FH, c: '#ffffff', b: 1, g: 0.008 },
          { t: '12ஆம் வகுப்பு பொதுத் தேர்வில் 590 / 600', s: 0.048, f: FM, c: '#e0f2fe', b: 1, g: 0.01 },
          { t: 'பள்ளி அளவில் முதலிடம்', s: 0.055, f: FH, c: '#fde047', b: 1, g: 0.02 },
          { t: '— வாழ்த்துவோர்: பெற்றோர், ஆசிரியர்கள்', s: 0.04, f: FM, c: '#bae6fd' }
        ]);
      } },
      { id: 'thanks', label: 'நன்றி அறிவிப்பு', cat: 'events', fonts: [FH, FM, FS], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg('#fefce8');
        h.rect(w * 0.05, H * 0.04, w * 0.9, H * 0.83, 'rgba(0,0,0,0)', deco({ stroke: '#a16207', strokeWidth: 3 * u, strokeDashArray: [14 * u, 8 * u] }));
        h.flow(H * 0.12, [
          { t: 'நன்றி', s: 0.18, f: FH, c: '#a16207', b: 1, g: 0.01 },
          { t: 'Thank You', s: 0.06, f: FH, c: '#713f12', g: 0.03 },
          { t: 'எங்கள் இல்ல விழாவுக்கு வருகை தந்து வாழ்த்திய அனைத்து உறவினர்கள், நண்பர்கள் அனைவருக்கும் எங்கள் மனமார்ந்த நன்றியைத் தெரிவித்துக் கொள்கிறோம்.', s: 0.046, f: FS, c: '#422006', w: 0.78, g: 0.03 },
          { t: '— உங்கள் குடும்பப் பெயர்', s: 0.05, f: FH, c: '#a16207', b: 1 }
        ]);
      } },
      /* ------------------------------------------------ notices, jobs, education */
      { id: 'hiring', label: 'வேலைவாய்ப்பு / Hiring', cat: 'notice', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg('#ffffff');
        h.rect(0, 0, w, H * 0.24, h.grad([[0, '#1d4ed8'], [1, '#7c3aed']], false, w), NS);
        h.text('வேலைவாய்ப்பு', { left: w * 0.05, top: H * 0.04, w: w * 0.9, size: w * 0.11, font: FH, color: '#ffffff', bold: 1, align: 'center' });
        h.text('WE ARE HIRING', { left: w * 0.05, top: H * 0.15, w: w * 0.9, size: w * 0.05, font: FH, color: '#fde68a', bold: 1, align: 'center' });
        T(h, shop() + ' — தேவை:', { left: w * 0.08, top: H * 0.28, w: w * 0.84, size: w * 0.05, font: FH, color: '#1e3a8a', bold: 1, align: 'left' });
        var y = bullets(h, w * 0.1, H * 0.35, w * 0.82, ['விற்பனை பிரதிநிதி — 2 பேர்', 'கணக்காளர் (Tally) — 1', 'டெலிவரி ஊழியர் (Bike உடன்) — 3'], w * 0.05, '#111827', '•', H * 0.58);
        bullets(h, w * 0.1, y + H * 0.02, w * 0.82, ['தகுதி: 12ஆம் வகுப்பு / டிகிரி', 'சம்பளம்: திறமைக்கேற்ப', 'அனுபவம் இல்லாதவர்களும் விண்ணப்பிக்கலாம்'], w * 0.042, '#374151', '✔', H * 0.77);
        phoneBar(h, H * 0.79, '#1d4ed8', '#ffffff', '📞 Resume அனுப்ப: 98xxx xxx21');
      } },
      { id: 'tuition', label: 'Tuition / சேர்க்கை', cat: 'notice', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#fef3c7'], [1, '#fde68a']]));
        h.rect(0, 0, w, H * 0.2, '#b45309', NS);
        T(h, 'சேர்க்கை நடைபெறுகிறது', { left: w * 0.04, top: H * 0.035, w: w * 0.92, size: w * 0.08, font: FH, color: '#ffffff', bold: 1, align: 'center' });
        h.text('ADMISSION OPEN 2027', { left: w * 0.04, top: H * 0.125, w: w * 0.92, size: w * 0.045, font: FH, color: '#fde68a', bold: 1, align: 'center' });
        T(h, shop() + ' டியூஷன் சென்டர்', { left: w * 0.05, top: H * 0.24, w: w * 0.9, size: w * 0.06, font: FH, color: '#78350f', bold: 1, align: 'center' });
        bullets(h, w * 0.1, H * 0.34, w * 0.82, ['1 முதல் 12ஆம் வகுப்பு வரை', 'கணிதம் · அறிவியல் · ஆங்கிலம்', 'NEET / JEE அடிப்படை வகுப்புகள்', 'சிறிய குழுக்கள் — தனிக் கவனம்', 'காலை 6–8 · மாலை 5–8'], w * 0.05, '#451a03', '📘', H * 0.77);
        phoneBar(h, H * 0.79, '#b45309', '#ffffff');
      } },
      { id: 'medicalcamp', label: 'இலவச மருத்துவ முகாம்', cat: 'notice', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg('#f0fdf4');
        h.rect(0, 0, w, H * 0.22, '#15803d', NS);
        h.rect(w * 0.44, H * 0.03, w * 0.12, H * 0.08, '#ffffff', NS); h.rect(w * 0.47, H * 0.015, w * 0.06, H * 0.11, '#ffffff', NS);
        h.rect(w * 0.47, H * 0.04, w * 0.06, H * 0.06, '#dc2626', NS); h.rect(w * 0.455, H * 0.055, w * 0.09, H * 0.03, '#dc2626', NS);
        T(h, 'இலவச மருத்துவ முகாம்', { left: w * 0.04, top: H * 0.135, w: w * 0.92, size: w * 0.07, font: FH, color: '#ffffff', bold: 1, align: 'center' });
        var yb = bullets(h, w * 0.1, H * 0.26, w * 0.82, ['பொது மருத்துவப் பரிசோதனை', 'இரத்த அழுத்தம், சர்க்கரை பரிசோதனை', 'கண் பரிசோதனை'], w * 0.05, '#14532d', '✚', H * 0.5);
        [['📅 தேதி', '01-01-2027'], ['⏰ நேரம்', 'காலை 9 – மதியம் 1'], ['📍 இடம்', 'அரசு பள்ளி வளாகம்']].forEach(function (r, i) {
          var y = Math.max(yb + H * 0.03, H * 0.5) + i * H * 0.075;
          T(h, r[0], { left: w * 0.08, top: y, w: w * 0.3, size: w * 0.045, font: FM, color: '#166534', bold: 1, align: 'left' });
          T(h, r[1], { left: w * 0.38, top: y, w: w * 0.56, size: w * 0.048, font: FH, color: '#052e16', bold: 1, align: 'left' });
        });
        h.text('ஏற்பாடு: உங்கள் அமைப்பின் பெயர்', { left: w * 0.05, top: H * 0.76, w: w * 0.9, size: w * 0.042, font: FM, color: '#166534', bold: 1, align: 'center' });
      } },
      { id: 'quote', label: 'திருக்குறள் / பொன்மொழி', cat: 'notice', fonts: [FH, FS, FT], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#fdf6e3'], [1, '#f5e6c8']]));
        h.text('“', { left: w * 0.06, top: H * 0.05, w: w * 0.3, size: w * 0.35, font: FS, color: 'rgba(146,64,14,.25)', align: 'left', noSel: true });
        h.flow(H * 0.24, [
          { t: 'கற்க கசடறக் கற்பவை கற்றபின்', s: 0.07, f: FT, c: '#78350f', b: 1, g: 0.006 },
          { t: 'நிற்க அதற்குத் தக', s: 0.07, f: FT, c: '#78350f', b: 1, g: 0.04 },
          { t: '— திருக்குறள் 391', s: 0.045, f: FS, c: '#92400e', g: 0.04 },
          { t: 'கற்க வேண்டியவற்றை குற்றமறக் கற்று, கற்றபின் அதற்கேற்ப நடக்க வேண்டும்.', s: 0.044, f: FS, c: '#451a03', w: 0.78, g: 0.03 },
          { t: shop(), s: 0.05, f: FH, c: '#92400e', b: 1 }
        ]);
      } },
      /* ------------------------------------------------ more designs (Oct 2026) */
      { id: 'newyear', label: 'ஆங்கிலப் புத்தாண்டு', cat: 'fest', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#0f0c29'], [0.55, '#302b63'], [1, '#24243e']]));
        h.dots(w * 0.04, H * 0.03, 12, 7, w * 0.085, 2.5 * u, 'rgba(255,255,255,.35)');
        [[0.22, 0.16, '#ffd60a'], [0.78, 0.12, '#f72585'], [0.5, 0.24, '#4cc9f0'], [0.15, 0.34, '#80ffdb'], [0.86, 0.3, '#ffd60a']].forEach(function (f) { h.star(w * f[0], H * f[1], w * 0.06, w * 0.012, 8, f[2], NS); });
        T(h, '2027', { left: w * 0.05, top: H * 0.36, w: w * 0.9, size: w * 0.3, font: FH, color: '#ffd60a', bold: 1, align: 'center', shadow: 1 });
        h.flow(H * 0.62, [
          { t: 'இனிய ஆங்கிலப் புத்தாண்டு நல்வாழ்த்துகள்', s: 0.068, f: FH, c: '#ffffff', b: 1, g: 0.012 },
          { t: 'Happy New Year', s: 0.06, f: FH, c: '#f72585', b: 1, g: 0.025 },
          { t: shop(), s: 0.058, f: FH, c: '#ffd60a', b: 1 }
        ]);
      } },
      { id: 'goodnight', label: 'இனிய இரவு', cat: 'fest', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#0b1d3a'], [1, '#1b3b6f']]));
        h.dots(w * 0.05, H * 0.04, 10, 8, w * 0.1, 2.2 * u, 'rgba(255,255,255,.5)');
        h.circ(w * 0.66, H * 0.22, w * 0.17, '#fef3c7', NS); h.circ(w * 0.74, H * 0.19, w * 0.16, '#0f2a52', NS);
        h.flow(H * 0.45, [
          { t: 'இனிய இரவு வணக்கம்', s: 0.09, f: FH, c: '#fde68a', b: 1, sh: 1, g: 0.012 },
          { t: 'Good Night', s: 0.06, f: FH, c: '#ffffff', b: 1, g: 0.03 },
          { t: 'இன்றைய களைப்பு நீங்கி, நாளை புத்துணர்வுடன் விடியட்டும்', s: 0.044, f: FM, c: '#dbeafe', g: 0.04 },
          { t: shop(), s: 0.055, f: FH, c: '#fde68a', b: 1 }
        ]);
      } },
      { id: 'blood', label: 'இரத்த தான முகாம்', cat: 'notice', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg('#fff5f5');
        h.rect(0, 0, w, H * 0.3, h.grad([[0, '#b91c1c'], [1, '#ef4444']]), NS);
        h.path('M 0 -60 C 30 -20 50 10 50 35 A 50 50 0 0 1 -50 35 C -50 10 -30 -20 0 -60 Z', w / 2, H * 0.12, '#ffffff', Object.assign({ scaleX: 1.2 * u, scaleY: 1.2 * u }, NS));
        T(h, 'இரத்த தான முகாம்', { left: w * 0.04, top: H * 0.2, w: w * 0.92, size: w * 0.085, font: FH, color: '#ffffff', bold: 1, align: 'center' });
        T(h, 'இரத்தம் கொடுப்போம் · உயிர் காப்போம்', { left: w * 0.05, top: H * 0.33, w: w * 0.9, size: w * 0.055, font: FH, color: '#991b1b', bold: 1, align: 'center' });
        bullets(h, w * 0.1, H * 0.42, w * 0.82, ['நாள்: ஞாயிறு, 15 நவம்பர்', 'நேரம்: காலை 9 – மதியம் 1', 'இடம்: சமுதாயக் கூடம்', '18 – 60 வயது, 50 kg மேல் உள்ளவர்கள்', 'இலவச உடல் பரிசோதனை'], w * 0.05, '#450a0a', '🩸', H * 0.77);
        phoneBar(h, H * 0.79, '#b91c1c', '#ffffff', '📞 பதிவுக்கு: 98xxx xxx21');
      } },
      { id: 'beauty', label: 'அழகு நிலையம் / Salon', cat: 'business', fonts: [FH, FM, FS], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#fdf2f8'], [1, '#fbcfe8']]));
        h.circ(w * 0.85, H * 0.08, w * 0.3, 'rgba(236,72,153,.18)', NS); h.circ(w * 0.1, H * 0.92, w * 0.35, 'rgba(236,72,153,.15)', NS);
        h.slot(w / 2, H * 0.27, w * 0.48, w * 0.48, 'circle', '#db2777');
        T(h, shop() + ' Beauty Parlour', { left: w * 0.05, top: H * 0.5, w: w * 0.9, size: w * 0.07, font: FH, color: '#9d174d', bold: 1, align: 'center' });
        T(h, 'பெண்களுக்கான அழகு நிலையம்', { left: w * 0.05, top: H * 0.565, w: w * 0.9, size: w * 0.05, font: FM, color: '#be185d', bold: 1, align: 'center' });
        bullets(h, w * 0.14, H * 0.63, w * 0.76, ['மணப்பெண் அலங்காரம்', 'Facial · Hair cut · Threading', 'மெஹந்தி · Pedicure'], w * 0.045, '#831843', '✿', H * 0.79);
        phoneBar(h, H * 0.8, '#db2777', '#ffffff', '📞 Appointment: 98xxx xxx21');
      } },
      { id: 'sports', label: 'விளையாட்டுப் போட்டி', cat: 'events', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#064e3b'], [1, '#16a34a']]));
        h.rays(w / 2, H * 0.2, 0, w * 1.2, 28, 'rgba(255,255,255,.08)');
        h.circ(w / 2, H * 0.2, w * 0.15, '#facc15', NS);
        T(h, '🏆', { left: w * 0.3, top: H * 0.13, w: w * 0.4, size: w * 0.16, font: FM, color: '#000', align: 'center' });
        T(h, 'மாபெரும் கிரிக்கெட் போட்டி', { left: w * 0.04, top: H * 0.36, w: w * 0.92, size: w * 0.085, font: FH, color: '#facc15', bold: 1, align: 'center', shadow: 1 });
        T(h, 'முதல் பரிசு ₹ 25,000 · இரண்டாம் பரிசு ₹ 15,000', { left: w * 0.05, top: H * 0.47, w: w * 0.9, size: w * 0.048, font: FH, color: '#ffffff', bold: 1, align: 'center' });
        bullets(h, w * 0.12, H * 0.56, w * 0.8, ['நாள்: 20, 21 டிசம்பர்', 'இடம்: அரசு பள்ளி மைதானம்', 'நுழைவுக் கட்டணம்: ₹ 1,000 / அணி'], w * 0.047, '#ecfccb', '⚑', H * 0.77);
        phoneBar(h, H * 0.79, '#facc15', '#064e3b', '📞 அணிப் பதிவு: 98xxx xxx21');
      } },
      { id: 'mobileshop', label: 'மொபைல் கடை Offer', cat: 'business', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#111827'], [1, '#1f2937']]));
        h.rect(w * 0.6, 0, w * 0.4, H, h.grad([[0, '#06b6d4'], [1, '#3b82f6']]), NS);
        h.slot(w * 0.78, H * 0.33, w * 0.34, H * 0.4, 'round', '#ffffff');
        T(h, 'மெகா', { left: w * 0.05, top: H * 0.08, w: w * 0.55, size: w * 0.1, font: FH, color: '#ffffff', bold: 1, align: 'left' });
        T(h, 'மொபைல் ஆஃபர்', { left: w * 0.05, top: H * 0.17, w: w * 0.55, size: w * 0.08, font: FH, color: '#22d3ee', bold: 1, align: 'left' }, 2);
        h.star(w * 0.25, H * 0.47, w * 0.16, w * 0.125, 18, '#facc15', NS);
        T(h, '30% OFF', { left: w * 0.09, top: H * 0.44, w: w * 0.32, size: w * 0.07, font: FH, color: '#111827', bold: 1, align: 'center' });
        bullets(h, w * 0.06, H * 0.62, w * 0.52, ['EMI வசதி · 0% வட்டி', 'பழைய போனுக்கு Exchange', 'Accessories இலவசம்'], w * 0.04, '#e5e7eb', '✔', H * 0.77);
        phoneBar(h, H * 0.8, '#06b6d4', '#111827', '📞 ' + shop() + ' · 98xxx xxx21');
      } },
      { id: 'temple', label: 'கோவில் திருவிழா', cat: 'events', fonts: [FH, FM, FS], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg(h.grad([[0, '#7c2d12'], [1, '#b45309']]));
        h.rays(w / 2, H * 0.24, 0, w * 1.1, 36, 'rgba(255,220,150,.12)');
        h.poly([{ x: 0, y: -H * 0.13 }, { x: w * 0.2, y: H * 0.08 }, { x: -w * 0.2, y: H * 0.08 }], w / 2, H * 0.2, '#fbbf24', NS);
        h.rect(w * 0.32, H * 0.28, w * 0.36, H * 0.05, '#f59e0b', NS);
        h.star(w / 2, H * 0.055, w * 0.03, w * 0.012, 6, '#fff7ed', NS);
        h.flow(H * 0.38, [
          { t: 'அருள்மிகு ஸ்ரீ முத்துமாரியம்மன்', s: 0.062, f: FH, c: '#fde68a', b: 1, g: 0.008 },
          { t: 'திருக்கோவில் திருவிழா', s: 0.085, f: FH, c: '#ffffff', b: 1, sh: 1, g: 0.02 },
          { t: 'கொடியேற்றம் · தேரோட்டம் · அன்னதானம்', s: 0.046, f: FM, c: '#ffedd5', g: 0.02 },
          { t: 'நவம்பர் 10 முதல் 17 வரை', s: 0.055, f: FH, c: '#fde68a', b: 1, g: 0.03 },
          { t: 'அனைவரும் வருக · அருள் பெறுக', s: 0.05, f: FS, c: '#ffffff', g: 0.02 },
          { t: shop(), s: 0.05, f: FH, c: '#fde68a', b: 1 }
        ]);
      } },
      { id: 'annualday', label: 'பள்ளி ஆண்டு விழா', cat: 'events', fonts: [FH, FM], build: function (h) {
        var w = h.w, H = h.h, u = h.u;
        h.bg('#eff6ff');
        h.rect(0, 0, w, H * 0.26, h.grad([[0, '#1e3a8a'], [1, '#2563eb']], false, w), NS);
        [0.1, 0.3, 0.5, 0.7, 0.9].forEach(function (x, i) { h.circ(w * x, H * 0.27, w * 0.03, ['#f43f5e', '#facc15', '#22c55e', '#38bdf8', '#a855f7'][i], NS); });
        T(h, shop() + ' பள்ளி', { left: w * 0.05, top: H * 0.05, w: w * 0.9, size: w * 0.07, font: FH, color: '#bfdbfe', bold: 1, align: 'center' });
        T(h, 'ஆண்டு விழா 2027', { left: w * 0.05, top: H * 0.12, w: w * 0.9, size: w * 0.1, font: FH, color: '#ffffff', bold: 1, align: 'center' });
        h.slot(w / 2, H * 0.45, w * 0.7, H * 0.25, 'round', '#2563eb');
        bullets(h, w * 0.12, H * 0.61, w * 0.8, ['நாள்: சனி, 24 ஜனவரி · மாலை 5 மணி', 'சிறப்பு விருந்தினர்: மாவட்ட ஆட்சியர்', 'கலை நிகழ்ச்சிகள் · பரிசளிப்பு'], w * 0.045, '#1e3a8a', '★', H * 0.79);
        phoneBar(h, H * 0.8, '#1e3a8a', '#ffffff', 'பெற்றோர்கள் அனைவரும் வருக!');
      } }
    ];
  });
})();
