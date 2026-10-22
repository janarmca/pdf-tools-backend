/* category-art.js — lazy-loaded photo-to-art tools for pdftoolsindia.com
 *
 *   imgsketch — Photo → Sketch & Art (FREE, no AI): 14 styles made by image-processing code in the browser —
 *               pencil, colour pencil, charcoal, ink line-art, cartoon, comic halftone, oil paint, watercolour,
 *               pop-art 4-panel, neon, pixel art, retro, duotone, emboss. Live preview, sliders, before/after.
 *   aistyle   — AI Photo Style (5 credits): anime / 3D cartoon / comic / watercolour / oil / Tanjore… re-drawn by
 *               an AI image model (Cloudflare Workers AI, FLUX.2 klein) — the "ChatGPT-like" look.
 *
 * Plain code cannot invent new detail like an AI model can; the free styles are honest filters, the AI style is labelled
 * and charged. Pure pixel maths is exported on window.ArtCore for tests (works on {width,height,data} objects).
 */
(function () {
  'use strict';
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  const C255 = function (v) { return v < 0 ? 0 : v > 255 ? 255 : v; };

  /* ===================================================================== pixel maths */
  function mkImg(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }
  function lum(img) { const n = img.width * img.height, g = new Float32Array(n), d = img.data; for (let i = 0, p = 0; i < n; i++, p += 4) g[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]; return g; }
  // fast blur: three passes of a box blur ≈ Gaussian (separable, O(n) per pass)
  function boxBlur1(src, w, h, r) {
    if (r < 1) return src.slice();
    const tmp = new Float32Array(src.length), out = new Float32Array(src.length), k = 1 / (2 * r + 1);
    for (let y = 0; y < h; y++) {
      const o = y * w; let acc = 0;
      for (let x = -r; x <= r; x++) acc += src[o + clamp(x, 0, w - 1)];
      for (let x = 0; x < w; x++) { tmp[o + x] = acc * k; acc += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)]; }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) { out[y * w + x] = acc * k; acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; }
    }
    return out;
  }
  function blur(g, w, h, r) { const b = Math.max(1, Math.round(r / 1.7)); return boxBlur1(boxBlur1(boxBlur1(g, w, h, b), w, h, b), w, h, b); }
  function sobel(g, w, h) {
    const m = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = -g[i - w - 1] - 2 * g[i - 1] - g[i + w - 1] + g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1];
      const gy = -g[i - w - 1] - 2 * g[i - w] - g[i - w + 1] + g[i + w - 1] + 2 * g[i + w] + g[i + w + 1];
      m[i] = Math.sqrt(gx * gx + gy * gy);
    }
    return m;
  }
  function dilateMax(a, w, h, r) { // grey dilation (makes lines thicker)
    if (r < 1) return a; let cur = a;
    for (let t = 0; t < r; t++) { const o = new Float32Array(a.length); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; let v = cur[i]; if (x > 0 && cur[i - 1] > v) v = cur[i - 1]; if (x < w - 1 && cur[i + 1] > v) v = cur[i + 1]; if (y > 0 && cur[i - w] > v) v = cur[i - w]; if (y < h - 1 && cur[i + w] > v) v = cur[i + w]; o[i] = v; } cur = o; }
    return cur;
  }
  // Kuwahara filter with summed-area tables: flat, painterly colour areas that keep the edges (cartoon / oil / watercolour)
  function kuwahara(img, r) {
    const w = img.width, h = img.height, d = img.data, W = w + 1, out = mkImg(w, h), o = out.data;
    const S = [new Float64Array(W * (h + 1)), new Float64Array(W * (h + 1)), new Float64Array(W * (h + 1))], Q = new Float64Array(W * (h + 1));
    for (let y = 0; y < h; y++) {
      let s0 = 0, s1 = 0, s2 = 0, q = 0;
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4, L = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
        s0 += d[p]; s1 += d[p + 1]; s2 += d[p + 2]; q += L * L;
        const j = (y + 1) * W + x + 1;
        S[0][j] = S[0][j - W] + s0; S[1][j] = S[1][j - W] + s1; S[2][j] = S[2][j - W] + s2; Q[j] = Q[j - W] + q;
      }
    }
    const L = new Float64Array(W * (h + 1)); // summed luminance
    for (let y = 0; y < h; y++) { let s = 0; for (let x = 0; x < w; x++) { const p = (y * w + x) * 4; s += 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]; L[(y + 1) * W + x + 1] = L[y * W + x + 1] + s; } }
    const box = function (A, x0, y0, x1, y1) { return A[(y1 + 1) * W + x1 + 1] - A[y0 * W + x1 + 1] - A[(y1 + 1) * W + x0] + A[y0 * W + x0]; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let best = Infinity, br = 0, bg = 0, bb = 0;
      for (let qd = 0; qd < 4; qd++) {
        const x0 = qd & 1 ? x : Math.max(0, x - r), x1 = qd & 1 ? Math.min(w - 1, x + r) : x;
        const y0 = qd & 2 ? y : Math.max(0, y - r), y1 = qd & 2 ? Math.min(h - 1, y + r) : y;
        const n = (x1 - x0 + 1) * (y1 - y0 + 1), mL = box(L, x0, y0, x1, y1) / n, v = box(Q, x0, y0, x1, y1) / n - mL * mL;
        if (v < best) { best = v; br = box(S[0], x0, y0, x1, y1) / n; bg = box(S[1], x0, y0, x1, y1) / n; bb = box(S[2], x0, y0, x1, y1) / n; }
      }
      const p = (y * w + x) * 4; o[p] = br; o[p + 1] = bg; o[p + 2] = bb; o[p + 3] = 255;
    }
    return out;
  }
  function posterize(img, levels) { const d = img.data, st = 255 / (levels - 1); for (let p = 0; p < d.length; p += 4) { d[p] = Math.round(d[p] / st) * st; d[p + 1] = Math.round(d[p + 1] / st) * st; d[p + 2] = Math.round(d[p + 2] / st) * st; } return img; }
  function saturate(img, k) { const d = img.data; for (let p = 0; p < d.length; p += 4) { const L = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]; d[p] = C255(L + (d[p] - L) * k); d[p + 1] = C255(L + (d[p + 1] - L) * k); d[p + 2] = C255(L + (d[p + 2] - L) * k); } return img; }
  function grayToImg(g, w, h) { const o = mkImg(w, h), d = o.data; for (let i = 0, p = 0; i < g.length; i++, p += 4) { const v = C255(g[i]); d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = 255; } return o; }
  function grain(img, amt, seed) { const d = img.data; let s = seed || 1234567; for (let p = 0; p < d.length; p += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; const n = ((s / 0x7fffffff) - 0.5) * amt; d[p] = C255(d[p] + n); d[p + 1] = C255(d[p + 1] + n); d[p + 2] = C255(d[p + 2] + n); } return img; }
  function paper(img, amt) { // soft paper fibres: low-frequency noise
    const w = img.width, h = img.height, n = new Float32Array(w * h); let s = 987654;
    for (let i = 0; i < n.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; n[i] = s / 0x7fffffff - 0.5; }
    const t = blur(n, w, h, 2), d = img.data;
    for (let i = 0, p = 0; i < t.length; i++, p += 4) { const k = 1 + t[i] * amt; d[p] = C255(d[p] * k); d[p + 1] = C255(d[p + 1] * k); d[p + 2] = C255(d[p + 2] * k); }
    return img;
  }

  // o: {detail 0..100, colors 2..12, line 0..4, texture bool, scale (=image long side / 640)}
  const STYLES = {
    pencil: function (img, o) { // colour-dodge pencil sketch
      const w = img.width, h = img.height, g = lum(img), inv = g.map(function (v) { return 255 - v; }), b = blur(inv, w, h, (4 + o.detail / 6) * o.scale), out = new Float32Array(g.length);
      const dark = 1 + o.line * 0.35;
      for (let i = 0; i < g.length; i++) { const v = b[i] >= 255 ? 255 : Math.min(255, g[i] * 255 / (255 - b[i])); out[i] = 255 * Math.pow(v / 255, dark); }
      const r = grayToImg(out, w, h); return o.texture ? paper(r, 0.25) : r;
    },
    colorpencil: function (img, o) {
      const sk = STYLES.pencil(img, Object.assign({}, o, { texture: false })), d = sk.data, s = img.data, r = mkImg(img.width, img.height), q = r.data;
      for (let p = 0; p < d.length; p += 4) { const k = Math.pow(d[p] / 255, 1.25); for (let c = 0; c < 3; c++) q[p + c] = C255((255 - (255 - s[p + c]) * 0.6) * k); q[p + 3] = 255; } // light washed colour × pencil strokes
      saturate(r, 1.15); return o.texture ? paper(r, 0.22) : r;
    },
    charcoal: function (img, o) {
      const w = img.width, h = img.height, g = blur(lum(img), w, h, 1.2 * o.scale), e = sobel(g, w, h), out = new Float32Array(g.length), k = 1.2 + o.detail / 40;
      for (let i = 0; i < g.length; i++) out[i] = 255 - Math.min(255, e[i] * k) - (255 - g[i]) * 0.35;
      return grain(grayToImg(dilateMax(out.map(function (v) { return 255 - v; }), w, h, Math.round(o.line * o.scale * 0.5)).map(function (v) { return 255 - v; }), w, h), 28, 7);
    },
    ink: function (img, o) { // black line-art on white
      const w = img.width, h = img.height, g = blur(lum(img), w, h, (1.6 + (100 - o.detail) / 40) * o.scale), e = dilateMax(sobel(g, w, h), w, h, Math.round(o.line * o.scale * 0.45)), th = 32 + (100 - o.detail) * 1.0, out = new Float32Array(g.length);
      for (let i = 0; i < g.length; i++) out[i] = e[i] > th ? 20 : 255;
      return grayToImg(out, w, h);
    },
    cartoon: function (img, o) {
      const w = img.width, h = img.height, r = Math.max(2, Math.round((3 + (100 - o.detail) / 25) * o.scale));
      const flat = posterize(kuwahara(kuwahara(img, r), Math.max(2, Math.round(r * 0.7))), Math.max(3, o.colors + 1)); saturate(flat, 1.25);
      const g = blur(lum(img), w, h, (2.2 + (100 - o.detail) / 50) * o.scale), e = dilateMax(sobel(g, w, h), w, h, Math.round(o.line * o.scale * 0.5)), th = 95 + (100 - o.detail) * 0.9;
      const d = flat.data; for (let i = 0, p = 0; i < e.length; i++, p += 4) if (e[i] > th) { d[p] *= 0.15; d[p + 1] *= 0.15; d[p + 2] *= 0.15; }
      return flat;
    },
    comic: function (img, o) { // halftone dots + bold ink
      const w = img.width, h = img.height, kr = Math.max(2, Math.round(3 * o.scale)), base = posterize(kuwahara(kuwahara(img, kr), kr), Math.max(3, o.colors - 1)); saturate(base, 1.4);
      const cell = Math.max(4, Math.round((6 + (100 - o.detail) / 12) * o.scale)), d = base.data, g = lum(base);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, cx = (Math.floor(x / cell) + 0.5) * cell, cy = (Math.floor(y / cell) + 0.5) * cell;
        const rr = (1 - g[Math.min(h - 1, Math.floor(cy)) * w + Math.min(w - 1, Math.floor(cx))] / 255) * cell * 0.62, dist = Math.hypot(x - cx, y - cy);
        const gv = g[i]; if (dist < rr && gv > 35 && gv < 215) { const p = i * 4; d[p] *= 0.72; d[p + 1] *= 0.72; d[p + 2] *= 0.72; } // dots only in the mid-tones
      }
      const e = dilateMax(sobel(blur(lum(img), w, h, 2.4 * o.scale), w, h), w, h, Math.round((o.line + 0.5) * o.scale * 0.5));
      for (let i = 0, p = 0; i < e.length; i++, p += 4) if (e[i] > 115 + (100 - o.detail) * 0.8) { d[p] = d[p + 1] = d[p + 2] = 15; }
      return base;
    },
    oil: function (img, o) { const r = kuwahara(img, Math.max(3, Math.round((4 + (100 - o.detail) / 14) * o.scale))); saturate(r, 1.15); return o.texture ? paper(r, 0.12) : r; },
    watercolor: function (img, o) {
      const w = img.width, h = img.height, kr = Math.max(3, Math.round((4 + (100 - o.detail) / 18) * o.scale)), r = posterize(kuwahara(kuwahara(img, kr), kr), Math.max(8, o.colors + 4)), d = r.data;
      for (let p = 0; p < d.length; p += 4) { d[p] = 255 - (255 - d[p]) * 0.82; d[p + 1] = 255 - (255 - d[p + 1]) * 0.82; d[p + 2] = 255 - (255 - d[p + 2]) * 0.82; } // lighter, like pigment on paper
      const e = sobel(blur(lum(r), w, h, 1), w, h);
      for (let i = 0, p = 0; i < e.length; i++, p += 4) { const k = 1 - Math.min(0.35, e[i] / 600); d[p] *= k; d[p + 1] *= k; d[p + 2] *= k; } // darker pigment at the edges
      return paper(r, 0.18);
    },
    popart: function (img, o) { // 2×2 panels, each a two-colour print
      const w = img.width, h = img.height, hw = Math.floor(w / 2), hh = Math.floor(h / 2), out = mkImg(w, h), od = out.data, g = lum(img);
      const P = [[[255, 230, 0], [220, 20, 60]], [[0, 200, 255], [120, 0, 160]], [[255, 105, 180], [20, 20, 120]], [[50, 220, 120], [255, 90, 0]]];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const sx = (x % hw) * 2, sy = (y % hh) * 2, panel = (y >= hh ? 2 : 0) + (x >= hw ? 1 : 0), v = g[Math.min(h - 1, sy) * w + Math.min(w - 1, sx)];
        const c = P[panel % 4][v > 110 + (o.detail - 50) ? 0 : 1], p = (y * w + x) * 4;
        od[p] = c[0]; od[p + 1] = c[1]; od[p + 2] = c[2]; od[p + 3] = 255;
      }
      return out;
    },
    neon: function (img, o) {
      const w = img.width, h = img.height, e = sobel(blur(lum(img), w, h, 1.2 * o.scale), w, h), gl = blur(e, w, h, 3 * o.scale), out = mkImg(w, h), d = out.data, s = img.data;
      for (let i = 0, p = 0; i < e.length; i++, p += 4) { const k = Math.min(1, e[i] / 160) + Math.min(0.8, gl[i] / 120); d[p] = C255(s[p] * k * 1.6 + 30 * k); d[p + 1] = C255(s[p + 1] * k * 1.6); d[p + 2] = C255(s[p + 2] * k * 1.6 + 60 * k); d[p + 3] = 255; }
      return out;
    },
    pixel: function (img, o) {
      const w = img.width, h = img.height, cell = Math.max(3, Math.round((4 + (100 - o.detail) / 6) * o.scale)), out = mkImg(w, h), d = out.data, s = img.data;
      for (let by = 0; by < h; by += cell) for (let bx = 0; bx < w; bx += cell) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let y = by; y < Math.min(h, by + cell); y++) for (let x = bx; x < Math.min(w, bx + cell); x++) { const p = (y * w + x) * 4; r += s[p]; g += s[p + 1]; b += s[p + 2]; n++; }
        r /= n; g /= n; b /= n; const st = 255 / (o.colors - 1); r = Math.round(r / st) * st; g = Math.round(g / st) * st; b = Math.round(b / st) * st;
        for (let y = by; y < Math.min(h, by + cell); y++) for (let x = bx; x < Math.min(w, bx + cell); x++) { const p = (y * w + x) * 4; d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255; }
      }
      return out;
    },
    retro: function (img, o) {
      const w = img.width, h = img.height, out = mkImg(w, h), d = out.data, s = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4, r = s[p], g = s[p + 1], b = s[p + 2], dx = x / w - 0.5, dy = y / h - 0.5, v = 1 - Math.min(0.6, (dx * dx + dy * dy) * (1.2 + o.detail / 80));
        d[p] = C255((r * 0.393 + g * 0.769 + b * 0.189) * v); d[p + 1] = C255((r * 0.349 + g * 0.686 + b * 0.168) * v); d[p + 2] = C255((r * 0.272 + g * 0.534 + b * 0.131) * v); d[p + 3] = 255;
      }
      return grain(out, 22, 3);
    },
    duotone: function (img, o) {
      const g = lum(img), out = mkImg(img.width, img.height), d = out.data, A = [30, 20, 90], B = [255, 190, 60];
      for (let i = 0, p = 0; i < g.length; i++, p += 4) { const t = Math.pow(g[i] / 255, 0.8 + (50 - o.detail) / 150); d[p] = A[0] + (B[0] - A[0]) * t; d[p + 1] = A[1] + (B[1] - A[1]) * t; d[p + 2] = A[2] + (B[2] - A[2]) * t; d[p + 3] = 255; }
      return out;
    },
    emboss: function (img, o) {
      const w = img.width, h = img.height, g = blur(lum(img), w, h, 1 * o.scale), out = new Float32Array(g.length), k = 1 + o.detail / 30;
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; out[i] = 128 + (g[i + w + 1] - g[i - w - 1]) * k; }
      return grayToImg(out, w, h);
    }
  };
  const LABELS = [
    ['pencil', '✏️ Pencil sketch'], ['colorpencil', '🖍️ Colour pencil'], ['charcoal', '🖤 Charcoal'], ['ink', '🖋️ Line art'],
    ['cartoon', '🎨 Cartoon'], ['comic', '💥 Comic'], ['oil', '🖼️ Oil paint'], ['watercolor', '💧 Watercolour'],
    ['popart', '🟨 Pop art'], ['neon', '🌈 Neon'], ['pixel', '👾 Pixel art'], ['retro', '📷 Retro'], ['duotone', '🌗 Duotone'], ['emboss', '🪨 Emboss']
  ];
  function render(style, img, o) { return STYLES[style](img, Object.assign({ detail: 50, colors: 6, line: 1, texture: true, scale: 1 }, o)); }
  window.ArtCore = { mkImg: mkImg, lum: lum, blur: blur, sobel: sobel, kuwahara: kuwahara, posterize: posterize, render: render, styles: Object.keys(STYLES) };

  /* ===================================================================== browser glue */
  async function loadImg(file) {
    const url = URL.createObjectURL(file);
    try { const im = new Image(); im.src = url; await im.decode(); return im; } catch (e) { throw new Error('This picture could not be opened. Try JPG, PNG or WEBP.'); }
    finally { setTimeout(function () { URL.revokeObjectURL(url); }, 3000); }
  }
  function grab(img, maxSide) {
    const sc = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.max(1, Math.round(img.naturalWidth * sc)), h = Math.max(1, Math.round(img.naturalHeight * sc));
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h); return { width: w, height: h, data: d.data };
  }
  function toCanvas(r) { const c = document.createElement('canvas'); c.width = r.width; c.height = r.height; c.getContext('2d').putImageData(new ImageData(r.data, r.width, r.height), 0, 0); return c; }
  const baseName = function (f) { return (f.name || 'photo').replace(/\.[^.]+$/, ''); };
  const err = function (body, m) { const b = mountResult(body, 'Error: ' + escapeHtml(String(m))); b.style.background = '#FDEDEC'; };
  const PREV = 640;

  /* ===================================================================== FREE: Photo → Sketch & Art */
  TOOL_IMPL.imgsketch = {
    mount: function (container) {
      let file = null, img = null, small = null, style = 'pencil', o = { detail: 50, colors: 6, line: 1, texture: true }, busy = 0;
      const body = el('<div></div>'); container.appendChild(body);
      function paint() {
        body.innerHTML = '';
        if (!img) {
          mountUploader(body, { accept: 'image/*', label: 'Drop a photo here, or tap to choose', sublabel: '14 free art styles — pencil, cartoon, comic, oil, watercolour… made in your browser, nothing is uploaded',
            onAdd: async function (fl) { file = fl[0]; try { img = await loadImg(file); small = grab(img, PREV); paint(); } catch (e) { paint(); err(body, e.message); } } });
          body.appendChild(el('<div class="note">Want an AI re-drawing (anime, 3D cartoon, Tanjore painting…) like ChatGPT? Use <a href="?tool=aistyle"><b>AI Photo Style</b></a> (5 credits).</div>'));
          return;
        }
        mountFileList(body, [file], function () { img = null; small = null; file = null; paint(); });
        const chips = el('<div class="filter-row" style="margin-top:12px;flex-wrap:wrap;"></div>');
        LABELS.forEach(function (l) { chips.appendChild(el('<button class="filter-chip ' + (style === l[0] ? 'active' : '') + '" data-s="' + l[0] + '">' + l[1] + '</button>')); });
        chips.addEventListener('click', function (e) { const b = e.target.closest('[data-s]'); if (!b) return; style = b.getAttribute('data-s'); [].forEach.call(chips.children, function (c) { c.classList.toggle('active', c === b); }); syncSliders(); preview(); });
        body.appendChild(chips);
        const sl = el('<div style="margin-top:6px"></div>'); body.appendChild(sl);
        const mk = function (key, label, min, max, step) {
          const r = el('<div class="art-sl" data-k="' + key + '" style="display:flex;align-items:center;gap:10px;margin-top:8px;font-size:13px;"><b style="min-width:92px">' + label + '</b><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + o[key] + '" style="flex:1"><span style="min-width:30px;text-align:right;font-weight:800">' + o[key] + '</span></div>');
          r.querySelector('input').oninput = function (e) { o[key] = +e.target.value; r.querySelector('span').textContent = o[key]; preview(); }; sl.appendChild(r);
        };
        mk('detail', 'Detail', 0, 100, 1); mk('colors', 'Colours', 2, 12, 1); mk('line', 'Line thickness', 0, 4, 1);
        const tx = el('<label class="art-tx" style="display:flex;gap:8px;align-items:center;font-size:13px;margin-top:8px;"><input type="checkbox" ' + (o.texture ? 'checked' : '') + '> Paper texture</label>'); body.appendChild(tx);
        tx.querySelector('input').onchange = function (e) { o.texture = e.target.checked; preview(); };
        function syncSliders() {
          const uses = { colors: ['cartoon', 'comic', 'watercolor', 'pixel'], line: ['pencil', 'colorpencil', 'charcoal', 'ink', 'cartoon', 'comic'], texture: ['pencil', 'colorpencil', 'oil'] };
          sl.querySelector('[data-k=colors]').style.display = uses.colors.indexOf(style) >= 0 ? 'flex' : 'none';
          sl.querySelector('[data-k=line]').style.display = uses.line.indexOf(style) >= 0 ? 'flex' : 'none';
          tx.style.display = uses.texture.indexOf(style) >= 0 ? 'flex' : 'none';
        }
        syncSliders();
        // before / after: drag the divider
        const stage = el('<div style="position:relative;margin-top:12px;border-radius:12px;overflow:hidden;line-height:0;touch-action:none;user-select:none;-webkit-user-select:none;background:#eee"></div>'); body.appendChild(stage);
        const after = document.createElement('canvas'), before = toCanvas({ width: small.width, height: small.height, data: new Uint8ClampedArray(small.data) });
        after.style.cssText = before.style.cssText = 'width:100%;height:auto;display:block';
        before.style.position = 'absolute'; before.style.left = before.style.top = '0';
        stage.appendChild(after); stage.appendChild(before);
        const bar = el('<div style="position:absolute;top:0;bottom:0;width:3px;background:#fff;box-shadow:0 0 6px rgba(0,0,0,.5);cursor:ew-resize"><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:999px;padding:4px 8px;font:800 11px system-ui;color:#333;white-space:nowrap">◀ ▶</span></div>'); stage.appendChild(bar);
        let cut = 0.0;
        const setCut = function (v) { cut = clamp(v, 0, 1); before.style.clipPath = 'inset(0 ' + (100 - cut * 100) + '% 0 0)'; bar.style.left = 'calc(' + (cut * 100) + '% - 1px)'; };
        setCut(0.0);
        stage.addEventListener('pointerdown', function (e) { stage.setPointerCapture(e.pointerId); stage._d = true; const r = stage.getBoundingClientRect(); setCut((e.clientX - r.left) / r.width); });
        stage.addEventListener('pointermove', function (e) { if (!stage._d) return; const r = stage.getBoundingClientRect(); setCut((e.clientX - r.left) / r.width); });
        stage.addEventListener('pointerup', function () { stage._d = false; });
        body.appendChild(el('<div class="note">Drag on the picture to compare with the original.</div>'));
        let tmr = null;
        function preview() {
          clearTimeout(tmr); const my = ++busy;
          tmr = setTimeout(function () {
            if (my !== busy) return;
            const src = { width: small.width, height: small.height, data: new Uint8ClampedArray(small.data) };
            const r = render(style, src, Object.assign({}, o, { scale: Math.max(small.width, small.height) / PREV }));
            after.width = r.width; after.height = r.height; after.getContext('2d').putImageData(new ImageData(r.data, r.width, r.height), 0, 0);
          }, 60);
        }
        preview();
        const row = el('<div class="btn-row"><button class="btn" id="artJpg">⬇ Download JPG</button><button class="btn secondary" id="artPng">⬇ PNG</button></div>'); body.appendChild(row);
        const save = async function (type) {
          const prog = mountProgress(body); prog.set(20, 'Making the full-size picture…');
          await new Promise(function (r) { setTimeout(r, 30); });
          try {
            const full = grab(img, 2400), r = render(style, full, Object.assign({}, o, { scale: Math.max(full.width, full.height) / PREV }));
            const c = toCanvas(r), blob = await new Promise(function (res) { c.toBlob(res, type, 0.93); });
            downloadBlob(blob, baseName(file) + '-' + style + (type === 'image/png' ? '.png' : '.jpg')); prog.set(100, 'Done'); prog.remove();
            mountResult(body, 'Done — ' + c.width + ' × ' + c.height + ' px picture downloaded.');
          } catch (e) { prog.remove(); err(body, e.message || e); }
        };
        row.querySelector('#artJpg').onclick = function () { save('image/jpeg'); };
        row.querySelector('#artPng').onclick = function () { save('image/png'); };
        body.appendChild(el('<div class="note">✨ For an AI re-drawing (anime, 3D cartoon, Tanjore…) try <a href="?tool=aistyle"><b>AI Photo Style</b></a> — 5 credits.</div>'));
      }
      paint();
    }
  };

  /* ===================================================================== AI Photo Style (credits) */
  const AI_STYLES = [
    ['anime', '🌸 Anime'], ['cartoon3d', '🧸 3D Cartoon'], ['comic', '💥 Comic book'], ['watercolor', '💧 Watercolour'], ['oil', '🖼️ Oil painting'],
    ['pencil', '✏️ Pencil drawing'], ['tanjore', '👑 Tanjore painting'], ['clay', '🧱 Clay figure'], ['pixel', '👾 Pixel art'], ['popart', '🟨 Pop art'], ['caricature', '😄 Caricature'], ['sticker', '🏷️ Sticker']
  ];
  TOOL_IMPL.aistyle = {
    mount: function (container) {
      let file = null, img = null, style = 'anime', results = [];
      const body = el('<div></div>'); container.appendChild(body);
      function paint() {
        body.innerHTML = '';
        body.appendChild(el('<div class="note">✨ An AI image model re-draws your photo in the chosen style (like ChatGPT image editing). Costs <b>5 credits</b> per picture; you confirm before it is charged. If it fails, the credits come back automatically. The photo is sent to the AI service only for this — not stored by us.</div>'));
        if (!img) {
          mountUploader(body, { accept: 'image/*', label: 'Drop a photo here, or tap to choose', sublabel: 'Faces, pets, places — clear, well-lit photos give the best result',
            onAdd: async function (fl) { file = fl[0]; try { img = await loadImg(file); paint(); } catch (e) { paint(); err(body, e.message); } } });
          return;
        }
        mountFileList(body, [file], function () { img = null; file = null; paint(); });
        const prev = grab(img, 512), pc = toCanvas(prev); pc.style.cssText = 'max-width:220px;width:100%;border-radius:10px;margin-top:10px;display:block'; body.appendChild(pc);
        const chips = el('<div class="filter-row" style="margin-top:12px;flex-wrap:wrap;"></div>');
        AI_STYLES.forEach(function (s) { chips.appendChild(el('<button class="filter-chip ' + (style === s[0] ? 'active' : '') + '" data-s="' + s[0] + '">' + s[1] + '</button>')); });
        chips.addEventListener('click', function (e) { const b = e.target.closest('[data-s]'); if (!b) return; style = b.getAttribute('data-s'); [].forEach.call(chips.children, function (c) { c.classList.toggle('active', c === b); }); });
        body.appendChild(chips);
        const ex = el('<div class="field" style="margin-top:10px"><label>Extra wish (optional, Tamil or English)</label><input type="text" id="aisExtra" maxlength="200" placeholder="e.g. festival background with lamps, wearing a silk saree"></div>'); body.appendChild(ex);
        const row = el('<div class="btn-row"><button class="btn" id="aisGo">✨ Make AI picture (5 credits)</button></div>'); body.appendChild(row);
        const out = el('<div></div>'); body.appendChild(out);
        results.forEach(function (r) { showOne(out, r); });
        row.querySelector('#aisGo').onclick = async function () {
          if (!AUTH_CONFIGURED || !authState.session) { mountResult(out, 'Please sign in first (top right) — AI pictures use credits.').style.background = '#FDEDEC'; return; }
          if (!(await confirmCreditSpend(body, '5 credits'))) return;
          const btn = this; btn.disabled = true; const prog = mountProgress(out); prog.set(25, 'AI is drawing… (10–30 seconds)');
          try {
            const p512 = grab(img, 500), c = toCanvas(p512), dataUrl = c.toDataURL('image/jpeg', 0.9), ar = p512.width / p512.height;
            let W = 1024, H = 1024; if (ar >= 1) H = Math.round(1024 / ar / 16) * 16; else W = Math.round(1024 * ar / 16) * 16;
            const res = await backendFetchJson(APP_CONFIG.BACKEND_URL + '/api/ai/restyle', {
              method: 'POST', headers: { Authorization: 'Bearer ' + authState.session.access_token, 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageBase64: dataUrl.split(',')[1], style: style, prompt: (body.querySelector('#aisExtra').value || '').trim(), width: W, height: H })
            });
            if (res.error) throw new Error(res.error);
            const b64 = res.imageBase64, mime = /^iVBOR/.test(b64) ? 'image/png' : 'image/jpeg';
            const r = { src: 'data:' + mime + ';base64,' + b64, style: style, mime: mime }; results.unshift(r);
            prog.remove(); showOne(out, r, true);
            try { if (typeof refreshProfile === 'function') refreshProfile(); } catch (e) {}
          } catch (e) { prog.remove(); err(out, e.message || e); }
          btn.disabled = false;
        };
      }
      function showOne(out, r, top) {
        const card = el('<div style="margin-top:12px;border:1px solid var(--line);border-radius:12px;padding:10px;background:#fff"><img alt="AI picture" style="width:100%;border-radius:8px;display:block"><div class="btn-row" style="margin-top:8px"><button class="btn">⬇ Download</button></div></div>');
        card.querySelector('img').src = r.src;
        card.querySelector('button').onclick = async function () { const b = await (await fetch(r.src)).blob(); downloadBlob(b, baseName(file || { name: 'photo' }) + '-ai-' + r.style + (r.mime === 'image/png' ? '.png' : '.jpg')); };
        if (top && out.firstChild) out.insertBefore(card, out.firstChild); else out.appendChild(card);
      }
      paint();
    }
  };
})();
