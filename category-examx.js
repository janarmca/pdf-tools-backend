/* category-examx.js — exam / government form helpers (lazy-loaded, UPDATE_67). All in the browser, nothing uploaded.
 *   exampresets   — photo / signature / thumb / declaration / postcard by exam (UPSC, SSC, IBPS, SBI, NEET, RRB, passport) — exact px + KB range
 *   sigclean      — signature cleaner: shadow-free white paper, black or blue ink, cropped to the signature
 *   sigstrip3     — UPSC-style strip: three signatures one below the other in one image
 *   photosignjoin — photo + signature in one image (some state forms / admit cards)
 *   cardprint     — Aadhaar / PAN / Voter ID / licence print: front + back at real card size on A4, optional masking
 *   hracalc       — HRA exemption (old regime) with the 2026 eight-city rule
 *   examage       — exam age eligibility with category relaxation, "born between" dates
 * Host globals: TOOL_IMPL, el, mountResult, mountProgress, downloadBlob, escapeHtml, mountRectSelector, PDFDocument.
 * Pure helpers on window.ExamxCore for tests.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ pure helpers */
  // Exam presets. Sources (checked 22-23 Oct 2026) are shown in the tool; every value stays editable because notifications change.
  const PRESETS = {
    upsc: { name: 'UPSC (CSE / ESE / CDS…)', src: 'UPSC 2026 notice as reported by VisionIAS; some sites list 40–300 KB — check your notice', items: {
      photo: { w: 350, h: 350, min: 20, max: 200, note: 'White background, face ≥ 75%, both ears visible. UPSC also takes a LIVE photo at the time of applying.' },
      sign3: { w: 500, h: 500, min: 20, max: 100, note: 'Three signatures one below the other, black ink — use the “3-Signature Strip” tool.' } } },
    ssc: { name: 'SSC (CGL / CHSL / MTS / GD…)', src: 'SSC preset as listed by sahisarkarijobs.in (3.5×4.5 cm)', items: {
      photo: { w: 200, h: 260, min: 20, max: 50, strip: true, note: 'SSC asks for a recent photo; many notices want the name and date printed on it.' },
      sign: { w: 200, h: 80, min: 10, max: 20, note: '' } } },
    ibps: { name: 'IBPS (PO / Clerk / RRB / SO)', src: 'IBPS notification format (photo 200×230, sign 140×60, thumb 240×240, declaration 800×400)', items: {
      photo: { w: 200, h: 230, min: 20, max: 50, note: '' }, sign: { w: 140, h: 60, min: 10, max: 20, note: 'Black ink on white paper.' },
      thumb: { w: 240, h: 240, min: 20, max: 50, note: 'Left thumb, blue or black ink, on white paper.' },
      decl: { w: 800, h: 400, min: 50, max: 100, note: 'Handwritten declaration in English, black ink. Write the text exactly as given in the notification.' } } },
    sbi: { name: 'SBI (PO / Clerk)', src: 'SBI preset as listed by sahisarkarijobs.in', items: {
      photo: { w: 200, h: 200, min: 20, max: 50, note: '' }, sign: { w: 140, h: 60, min: 10, max: 20, note: '' },
      thumb: { w: 240, h: 240, min: 20, max: 50, note: '' }, decl: { w: 800, h: 400, min: 50, max: 100, note: '' } } },
    neet: { name: 'NEET UG 2026', src: 'NEET UG 2026 rules as reported by Careers360', items: {
      photo: { w: 250, h: 350, min: 10, max: 200, strip: true, note: 'Photo taken after 1 Jan 2026, white background, name and date of capture on the photo, face ≈ 80%.' },
      postcard: { w: 1200, h: 1800, min: 10, max: 200, strip: true, note: 'Postcard size 4×6 inch, with name and date.' },
      sign: { w: 300, h: 120, min: 4, max: 30, note: '' }, thumb: { w: 240, h: 240, min: 10, max: 200, note: 'Left thumb impression (size not fixed in the notice).' } } },
    rrb: { name: 'RRB NTPC / Group D', src: 'Oliveboard summary of the RRB NTPC notice — photo is taken LIVE, no photo upload', items: {
      sign: { w: 280, h: 160, min: 30, max: 49, note: 'Minimum 140×60 px; the photo is captured live by webcam / phone (no file).' } } },
    passport: { name: 'Indian Passport (ICAO, from 1 Dec 2025)', src: 'Embassy of India notices on the new ICAO photo rules', items: {
      photo: { w: 630, h: 810, min: 0, max: 250, note: 'Plain white background, face ≈ 85% of the picture, forehead and face not covered.' } } },
    custom: { name: 'Other / my own size', src: 'Type the size from your notification', items: {
      photo: { w: 200, h: 230, min: 20, max: 50, note: '' }, sign: { w: 140, h: 60, min: 10, max: 20, note: '' } } }
  };
  const KIND_NAMES = { photo: '🧑 Photo', sign: '✍️ Signature', sign3: '✍️✍️✍️ 3 signatures', thumb: '👍 Left thumb', decl: '📝 Declaration', postcard: '🖼️ Postcard photo' };
  // pad a JPEG to at least minBytes by adding comment (COM) segments right after SOI — the picture itself is unchanged
  function padJpeg(u8, minBytes) {
    if (u8.length >= minBytes || u8[0] !== 0xFF || u8[1] !== 0xD8) return u8;
    let need = minBytes - u8.length; const segs = [];
    while (need > 0) { const n = Math.min(65533, Math.max(1, need - 4)); const s = new Uint8Array(n + 4); s[0] = 0xFF; s[1] = 0xFE; s[2] = ((n + 2) >> 8) & 255; s[3] = (n + 2) & 255; s.fill(0x20, 4); segs.push(s); need -= s.length; }
    const out = new Uint8Array(u8.length + segs.reduce(function (a, s) { return a + s.length; }, 0));
    out.set(u8.subarray(0, 2), 0); let o = 2; segs.forEach(function (s) { out.set(s, o); o += s.length; }); out.set(u8.subarray(2), o);
    return out;
  }
  // HRA exemption (old regime). salary = basic + DA for the months in rented house. year: 'ty2026' (8 cities 50%) | 'old' (4 metros)
  const CITIES_2026 = ['delhi', 'mumbai', 'kolkata', 'chennai', 'bengaluru', 'hyderabad', 'pune', 'ahmedabad'];
  const CITIES_OLD = ['delhi', 'mumbai', 'kolkata', 'chennai'];
  function hraExempt(o) {
    const salary = Math.max(0, +o.basic || 0) + Math.max(0, +o.da || 0), hra = Math.max(0, +o.hra || 0), rent = Math.max(0, +o.rent || 0);
    const list = o.year === 'old' ? CITIES_OLD : CITIES_2026, metro = list.indexOf(o.city) >= 0;
    const a = hra, b = Math.max(0, rent - 0.1 * salary), c = (metro ? 0.5 : 0.4) * salary;
    const ex = Math.min(a, b, c);
    return { a: a, b: b, c: c, exempt: Math.round(ex), taxable: Math.round(hra - ex), metro: metro, pct: metro ? 50 : 40, which: ex === a ? 'a' : ex === b ? 'b' : 'c' };
  }
  // age on a date (years, months, days), whole calendar arithmetic
  function ageOn(dob, on) {
    const d = new Date(dob + 'T00:00:00Z'), t = new Date(on + 'T00:00:00Z');
    if (isNaN(d) || isNaN(t)) return null;
    let y = t.getUTCFullYear() - d.getUTCFullYear(), m = t.getUTCMonth() - d.getUTCMonth(), dd = t.getUTCDate() - d.getUTCDate();
    if (dd < 0) { m--; dd += new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 0)).getUTCDate(); }
    if (m < 0) { y--; m += 12; }
    return { y: y, m: m, d: dd };
  }
  // born-between: to be at least minAge and not more than maxAge on cutoff → DOB in [cutoff - (maxAge+1)y + 1 day, cutoff - minAge y]
  function bornBetween(cutoff, minAge, maxAge) {
    const c = new Date(cutoff + 'T00:00:00Z'); if (isNaN(c)) return null;
    const sub = function (yrs) { const x = new Date(c); x.setUTCFullYear(x.getUTCFullYear() - yrs); return x; };
    const latest = sub(minAge), earliest = sub(maxAge + 1); earliest.setUTCDate(earliest.getUTCDate() + 1);
    const iso = function (x) { return x.toISOString().slice(0, 10); };
    return { from: iso(earliest), to: iso(latest) };
  }
  const RELAX = { gen: 0, ews: 0, obc: 3, sc: 5, st: 5, pwd: 10, pwdobc: 13, pwdsc: 15 };
  function eligible(dob, cutoff, minAge, maxAge, relaxYears) {
    const a = ageOn(dob, cutoff); if (!a) return null;
    const max = maxAge + (relaxYears || 0), bb = bornBetween(cutoff, minAge, max);
    const ok = dob >= bb.from && dob <= bb.to;
    return { age: a, max: max, ok: ok, from: bb.from, to: bb.to, tooYoung: dob > bb.to, tooOld: dob < bb.from };
  }
  // Otsu threshold on a 256-bin histogram
  function otsu(hist, total) {
    let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sB = 0, wB = 0, best = 0, th = 128;
    for (let i = 0; i < 256; i++) { wB += hist[i]; if (!wB) continue; const wF = total - wB; if (!wF) break; sB += i * hist[i]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > best) { best = v; th = i; } }
    return th;
  }
  window.ExamxCore = { PRESETS: PRESETS, padJpeg: padJpeg, hraExempt: hraExempt, ageOn: ageOn, bornBetween: bornBetween, eligible: eligible, RELAX: RELAX, otsu: otsu, CITIES_2026: CITIES_2026 };
  if (typeof TOOL_IMPL === 'undefined') return;

  /* ------------------------------------------------------------------ shared image helpers */
  const fail = function (body, e) { const b = mountResult(body, 'Error: ' + escapeHtml(String(e && e.message || e))); b.style.background = '#FDEDEC'; };
  const kb = function (n) { return (n / 1024).toFixed(1) + ' KB'; };
  async function loadImgFile(file) {
    if (/heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) throw new Error('HEIC photo — please convert it to JPG first with “HEIC → JPG”.');
    const url = URL.createObjectURL(file);
    try { const im = new Image(); im.src = url; await im.decode(); return im; }
    catch (e) { throw new Error('This picture could not be opened. Use JPG, PNG or WEBP.'); }
    finally { setTimeout(function () { URL.revokeObjectURL(url); }, 3000); }
  }
  function picker(label, onFile, multiple) {
    const lab = el('<label class="drop tamil" style="cursor:pointer;"><div class="drop-icon">📷</div><div class="drop-title">' + label + '</div><span class="drop-btn">📁 Choose ' + (multiple ? 'pictures' : 'picture') + '</span><input type="file" accept="image/*" ' + (multiple ? 'multiple' : '') + ' style="position:absolute; width:1px; height:1px; opacity:0;"></label>');
    lab.querySelector('input').onchange = function (e) { const f = [].slice.call(e.target.files || []); e.target.value = ''; if (f.length) onFile(multiple ? f : f[0]); };
    return lab;
  }
  function canvasOf(w, h, bg) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } return c; }
  const toBlob = function (c, type, q) { return new Promise(function (r) { c.toBlob(r, type, q); }); };
  // JPEG between minKB and maxKB: highest quality that fits; padded up if even the best quality is smaller than minKB
  async function jpegInRange(c, minKB, maxKB) {
    const maxB = (maxKB || 9999) * 1024, minB = (minKB || 0) * 1024;
    let lo = 0.3, hi = 0.97, best = null;
    let b = await toBlob(c, 'image/jpeg', hi);
    if (b.size <= maxB) best = b;
    else {
      for (let i = 0; i < 8; i++) { const q = (lo + hi) / 2; const x = await toBlob(c, 'image/jpeg', q); if (x.size <= maxB) { best = x; lo = q; } else hi = q; }
      if (!best) { const x = await toBlob(c, 'image/jpeg', 0.2); if (x.size <= maxB) best = x; }
      if (!best) throw new Error('Even the lowest quality is above ' + maxKB + ' KB at this pixel size. Reduce the width/height.');
    }
    let padded = false;
    if (best.size < minB) { const u = padJpeg(new Uint8Array(await best.arrayBuffer()), minB + 200); best = new Blob([u], { type: 'image/jpeg' }); padded = true; }
    return { blob: best, padded: padded };
  }
  // fixed-aspect cropper: drag to move, slider to zoom. Returns {el, draw(outCanvas)}
  function cropper(img, aspect, onChange) {
    const box = el('<div style="max-width:420px; margin:8px auto;"><div style="position:relative; overflow:hidden; border-radius:10px; border:1px solid var(--line); touch-action:none; cursor:grab; background:#eee;"><canvas style="display:block; width:100%;"></canvas><div style="position:absolute; inset:0; pointer-events:none; box-shadow:inset 0 0 0 2px rgba(21,101,192,.7);"></div></div><label style="display:flex; align-items:center; gap:8px; font-size:12px; margin-top:6px;">🔍 Zoom <input type="range" min="100" max="400" value="100" style="flex:1"></label><div style="font-size:11.5px; color:var(--sub); text-align:center;">Drag the picture to place the face / signature in the frame</div></div>');
    const cv = box.querySelector('canvas'), zoomIn = box.querySelector('input');
    const PW = 420, PH = Math.round(420 / aspect); cv.width = PW; cv.height = PH;
    let zoom = 1, cx = img.naturalWidth / 2, cy = img.naturalHeight / 2;
    const baseScale = function () { return Math.max(PW / img.naturalWidth, PH / img.naturalHeight); };
    function clampC() {
      const s = baseScale() * zoom, hw = PW / s / 2, hh = PH / s / 2;
      cx = Math.min(Math.max(cx, hw), img.naturalWidth - hw); cy = Math.min(Math.max(cy, hh), img.naturalHeight - hh);
      if (hw * 2 > img.naturalWidth) cx = img.naturalWidth / 2; if (hh * 2 > img.naturalHeight) cy = img.naturalHeight / 2;
    }
    function src() { const s = baseScale() * zoom, w = PW / s, h = PH / s; return { x: cx - w / 2, y: cy - h / 2, w: w, h: h }; }
    function paint() { clampC(); const r = src(), g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, PW, PH); g.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, PW, PH); }
    let drag = null;
    const wrap = cv.parentElement;
    wrap.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, cx: cx, cy: cy }; try { wrap.setPointerCapture(e.pointerId); } catch (x) {} });
    wrap.addEventListener('pointermove', function (e) { if (!drag) return; const k = (cv.getBoundingClientRect().width / PW) * baseScale() * zoom; cx = drag.cx - (e.clientX - drag.x) / k; cy = drag.cy - (e.clientY - drag.y) / k; paint(); });
    const up = function () { if (drag) { drag = null; onChange && onChange(); } };
    wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
    zoomIn.oninput = function () { zoom = +zoomIn.value / 100; paint(); }; zoomIn.onchange = function () { onChange && onChange(); };
    paint();
    return { el: box, draw: function (out) { const r = src(), g = out.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, out.width, out.height); } };
  }
  // name + date strip at the bottom (inside the size); returns strip height used
  function drawStrip(c, name, date) {
    const g = c.getContext('2d'), H = Math.max(18, Math.round(c.height * 0.16));
    g.fillStyle = '#fff'; g.fillRect(0, c.height - H, c.width, H);
    g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = [name, date].filter(Boolean), fs = Math.max(8, Math.floor(H / (lines.length > 1 ? 2.3 : 1.6)));
    g.font = '700 ' + fs + 'px "Noto Sans Tamil", Arial, sans-serif';
    lines.forEach(function (t, i) { let f = fs; while (f > 7 && g.measureText(t).width > c.width - 6) { f--; g.font = '700 ' + f + 'px "Noto Sans Tamil", Arial, sans-serif'; } g.fillText(t, c.width / 2, c.height - H + H * (lines.length > 1 ? (i ? 0.72 : 0.3) : 0.5)); });
  }
  // clean a signature / thumb / declaration photo: even out shadows, threshold, recolour ink, crop to the ink
  function cleanInk(img, opt) {
    opt = opt || {};
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const maxSide = 1600, k = Math.min(1, maxSide / Math.max(iw, ih));
    const W = Math.round(iw * k), H = Math.round(ih * k);
    const c = canvasOf(W, H, '#fff'), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H);
    const id = g.getImageData(0, 0, W, H), d = id.data, n = W * H;
    const gray = new Float32Array(n); for (let i = 0; i < n; i++) gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    // background estimate: small copy, max filter (paper is the bright part), blur, scale back
    const sw = Math.max(8, Math.round(W / 16)), sh = Math.max(8, Math.round(H / 16)), sm = new Float32Array(sw * sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { let m = 0; const x0 = Math.floor(x * W / sw), x1 = Math.floor((x + 1) * W / sw), y0 = Math.floor(y * H / sh), y1 = Math.floor((y + 1) * H / sh); for (let yy = y0; yy < y1; yy += 2) for (let xx = x0; xx < x1; xx += 2) { const v = gray[yy * W + xx]; if (v > m) m = v; } sm[y * sw + x] = m; }
    const bl = new Float32Array(sw * sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { let s = 0, c2 = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < sh && xx >= 0 && xx < sw) { s += sm[yy * sw + xx]; c2++; } } bl[y * sw + x] = s / c2; }
    const norm = new Uint8ClampedArray(n), hist = new Array(256).fill(0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const fx = Math.min(sw - 1, x * sw / W), fy = Math.min(sh - 1, y * sh / H), bg = Math.max(30, bl[Math.floor(fy) * sw + Math.floor(fx)]);
      const v = Math.min(255, gray[y * W + x] / bg * 255); norm[y * W + x] = v; hist[Math.round(v)]++;
    }
    let th = opt.threshold != null ? opt.threshold : Math.min(215, otsu(hist, n) + 12);
    const ink = opt.ink === 'blue' ? [16, 42, 140] : opt.ink === 'keep' ? null : [0, 0, 0];
    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (let i = 0; i < n; i++) {
      const v = norm[i], isInk = v < th;
      if (isInk) { const x = i % W, y = (i / W) | 0; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      // soft edge: dark = full ink, near threshold = lighter, above = white paper
      const a = isInk ? Math.min(1, (th - v) / Math.max(14, th * 0.22) + 0.6) : 0;
      if (ink) { d[i * 4] = 255 - (255 - ink[0]) * a; d[i * 4 + 1] = 255 - (255 - ink[1]) * a; d[i * 4 + 2] = 255 - (255 - ink[2]) * a; }
      else if (!isInk) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; }
    }
    g.putImageData(id, 0, 0);
    if (maxX < 0) return { canvas: c, empty: true, threshold: th };
    if (opt.crop === false) return { canvas: c, threshold: th };
    const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.06) + 4;
    const x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad), x1 = Math.min(W, maxX + pad + 1), y1 = Math.min(H, maxY + pad + 1);
    const out = canvasOf(x1 - x0, y1 - y0, '#fff'); out.getContext('2d').drawImage(c, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
    return { canvas: out, threshold: th };
  }
  // draw a canvas centred inside w×h, keeping its shape, on white
  function fitInto(src, w, h, padFrac) {
    const c = canvasOf(w, h, '#fff'), p = Math.round(Math.min(w, h) * (padFrac || 0.06)), k = Math.min((w - 2 * p) / src.width, (h - 2 * p) / src.height);
    const dw = src.width * k, dh = src.height * k; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh); return c;
  }
  function resultCard(body, blob, name, extra) {
    const old = body.querySelector('[data-res]'); if (old) old.remove();
    const url = URL.createObjectURL(blob);
    const card = el('<div data-res style="margin-top:12px; padding:12px; border:1px solid var(--line); border-radius:12px; background:#F7FAF8; text-align:center;"><img style="max-width:100%; max-height:300px; border:1px solid var(--line); background:#fff;"><div style="margin:8px 0; font-weight:800; font-size:13px;"></div><button class="btn">⬇️ Download</button></div>');
    card.querySelector('img').src = url;
    card.querySelector('div').innerHTML = escapeHtml(extra || '') + ' · ' + kb(blob.size);
    card.querySelector('button').onclick = function () { downloadBlob(blob, name); };
    body.appendChild(card); return card;
  }
  const today = function () { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear(); };

  /* ================================================================== EXAM PRESETS */
  TOOL_IMPL.exampresets = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      let exam = 'ibps', kind = 'photo', img = null, crop = null, timer = null, vals = null;
      try { const s = JSON.parse(localStorage.getItem('pti-exampreset') || '{}'); if (PRESETS[s.exam]) exam = s.exam; if (s.kind && PRESETS[exam].items[s.kind]) kind = s.kind; } catch (e) {}
      function cur() { return PRESETS[exam].items[kind] || PRESETS[exam].items[Object.keys(PRESETS[exam].items)[0]]; }
      function paint() {
        body.innerHTML = '';
        body.appendChild(el('<div class="note">Pick your exam and what you are uploading. The exact pixel size and KB range are filled in — change them if your notification says something else. Your picture stays on this phone.</div>'));
        const ex = el('<div class="opts"><div class="field"><label>Exam</label><select id="epExam"></select></div><div class="field"><label>What is this?</label><select id="epKind"></select></div></div>');
        const es = ex.querySelector('#epExam'), ks = ex.querySelector('#epKind');
        Object.keys(PRESETS).forEach(function (k) { es.appendChild(el('<option value="' + k + '">' + escapeHtml(PRESETS[k].name) + '</option>')); });
        es.value = exam;
        if (!PRESETS[exam].items[kind]) kind = Object.keys(PRESETS[exam].items)[0];
        Object.keys(PRESETS[exam].items).forEach(function (k) { ks.appendChild(el('<option value="' + k + '">' + KIND_NAMES[k] + '</option>')); });
        ks.value = kind;
        es.onchange = function () { exam = es.value; kind = Object.keys(PRESETS[exam].items)[0]; vals = null; save(); crop = null; paint(); };
        ks.onchange = function () { kind = ks.value; vals = null; save(); crop = null; paint(); };
        body.appendChild(ex);
        const p0 = cur();
        if (!vals) vals = { w: p0.w, h: p0.h, min: p0.min, max: p0.max };
        const p = Object.assign({}, p0, vals);
        if (kind === 'sign3') { body.appendChild(el('<div class="note">👉 For the three-signature image open <a href="#" id="epGo3">✍️ 3-Signature Strip</a>.</div>')); body.querySelector('#epGo3').onclick = function (e) { e.preventDefault(); openTool('sigstrip3'); }; return; }
        const f = el(`<div class="opts">
          <div class="field"><label>Width (px)</label><input id="epW" type="number" min="20" max="4000" value="${p.w}"></div>
          <div class="field"><label>Height (px)</label><input id="epH" type="number" min="20" max="4000" value="${p.h}"></div>
          <div class="field"><label>Minimum KB</label><input id="epMin" type="number" min="0" max="2000" value="${p.min}"></div>
          <div class="field"><label>Maximum KB</label><input id="epMax" type="number" min="1" max="5000" value="${p.max}"></div>
          ${kind === 'photo' || kind === 'postcard' ? `<div class="field-inline"><input type="checkbox" id="epStrip" ${p.strip ? 'checked' : ''}><label for="epStrip">Print name + date on the photo</label></div>
          <div class="field"><label>Name</label><input id="epName" placeholder="Your name as in the form"></div><div class="field"><label>Date</label><input id="epDate" value="${today()}"></div>` : `<div class="field-inline"><input type="checkbox" id="epClean" checked><label for="epClean">Clean the paper (white background, dark ink)</label></div>`}
        </div>`);
        body.appendChild(f);
        body.appendChild(el('<div style="font-size:11.5px; color:var(--sub); margin:-4px 0 8px;">' + escapeHtml(p.note || '') + (p.note ? ' ' : '') + 'Source: ' + escapeHtml(PRESETS[exam].src) + '. Always check your own notification.</div>'));
        try { const n = localStorage.getItem('pti-exam-name'); if (n && body.querySelector('#epName')) body.querySelector('#epName').value = n; } catch (e) {}
        f.querySelectorAll('input').forEach(function (i) { i.oninput = function () {
          if (i.id === 'epName') { try { localStorage.setItem('pti-exam-name', i.value); } catch (e) {} }
          const map = { epW: 'w', epH: 'h', epMin: 'min', epMax: 'max' }; if (map[i.id]) vals[map[i.id]] = +i.value;
          schedule(); };
          i.onchange = function () { i.oninput(); if (img && (i.id === 'epW' || i.id === 'epH')) { const keep = [f.querySelector('#epName'), f.querySelector('#epDate'), f.querySelector('#epStrip'), f.querySelector('#epClean')].map(function (x) { return x && (x.type === 'checkbox' ? x.checked : x.value); }); paint(); [ '#epName', '#epDate', '#epStrip', '#epClean'].forEach(function (id, k) { const x = body.querySelector(id); if (x && keep[k] != null) { if (x.type === 'checkbox') x.checked = keep[k]; else x.value = keep[k]; } }); } }; });
        if (!img) { body.appendChild(picker('📷 ' + KIND_NAMES[kind] + ' — choose the picture', async function (file) { try { img = await loadImgFile(file); crop = null; paint(); } catch (e) { fail(body, e); } })); return; }
        const w = +f.querySelector('#epW').value, h = +f.querySelector('#epH').value;
        crop = cropper(img, w / h, schedule); body.appendChild(crop.el);
        const row = el('<div class="btn-row"><button class="btn secondary">🔄 Another picture</button></div>'); row.firstChild.onclick = function () { img = null; paint(); }; body.appendChild(row);
        schedule();
      }
      function save() { try { localStorage.setItem('pti-exampreset', JSON.stringify({ exam: exam, kind: kind })); } catch (e) {} }
      function schedule() { clearTimeout(timer); timer = setTimeout(make, 250); }
      async function make() {
        if (!img || !crop) return;
        const q = function (id) { return body.querySelector(id); };
        const W = Math.max(20, Math.min(4000, +q('#epW').value || 200)), H = Math.max(20, Math.min(4000, +q('#epH').value || 200));
        try {
          let c = canvasOf(W, H, '#fff'); crop.draw(c);
          if (q('#epClean') && q('#epClean').checked) { const r = cleanInk(c, { crop: false }); c = fitInto(r.canvas, W, H, 0.0); }
          if (q('#epStrip') && q('#epStrip').checked) drawStrip(c, (q('#epName').value || '').trim(), (q('#epDate').value || '').trim());
          const r = await jpegInRange(c, +q('#epMin').value || 0, +q('#epMax').value || 9999);
          resultCard(body, r.blob, exam + '-' + kind + '-' + W + 'x' + H + '.jpg', W + '×' + H + ' px' + (r.padded ? ' (file padded up to the minimum KB — picture unchanged)' : ''));
        } catch (e) { fail(body, e); }
      }
      paint();
    }
  };
  /* ================================================================== SIGNATURE CLEANER */
  TOOL_IMPL.sigclean = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      let img = null, th = null, timer = null;
      function paint() {
        body.innerHTML = '';
        body.appendChild(el('<div class="note">Take a photo of your signature on white paper (any light). This removes shadows and the grey paper, makes the ink dark and crops to the signature.</div>'));
        if (!img) { body.appendChild(picker('✍️ Photo of your signature', async function (f) { try { img = await loadImgFile(f); paint(); } catch (e) { fail(body, e); } })); return; }
        body.appendChild(el(`<div class="opts">
          <div class="field"><label>Ink colour</label><select id="scInk"><option value="black">Black</option><option value="blue">Blue</option><option value="keep">Keep the real colour</option></select></div>
          <div class="field"><label>Darkness (move if lines break or paper marks show)</label><input id="scTh" type="range" min="80" max="240" value="${th || 170}"></div>
          <div class="field"><label>Output size</label><select id="scSize"><option value="0x0">Just cropped (no fixed size)</option><option value="140x60">140×60 px (IBPS / SBI)</option><option value="200x80">200×80 px (SSC)</option><option value="300x120">300×120 px</option><option value="350x150">350×150 px</option></select></div>
          <div class="field"><label>Max KB</label><input id="scKb" type="number" min="5" max="500" value="20"></div>
          <div class="field"><label>Format</label><select id="scFmt"><option value="jpg">JPG</option><option value="png">PNG (transparent background)</option></select></div>
        </div>`));
        body.querySelectorAll('select,input').forEach(function (x) { x.oninput = x.onchange = function () { if (x.id === 'scTh') th = +x.value; schedule(); }; });
        const row = el('<div class="btn-row"><button class="btn secondary">🔄 Another photo</button></div>'); row.firstChild.onclick = function () { img = null; th = null; paint(); }; body.appendChild(row);
        make(true);
      }
      function schedule() { clearTimeout(timer); timer = setTimeout(make, 200); }
      async function make(first) {
        const q = function (id) { return body.querySelector(id); };
        try {
          const r = cleanInk(img, { ink: q('#scInk').value, threshold: first && th == null ? null : +q('#scTh').value });
          if (first && th == null) { th = Math.round(r.threshold); q('#scTh').value = th; }
          if (r.empty) throw new Error('No ink found — move the Darkness slider to the right.');
          const sz = q('#scSize').value.split('x').map(Number);
          let c = sz[0] ? fitInto(r.canvas, sz[0], sz[1], 0.04) : r.canvas;
          if (q('#scFmt').value === 'png') {
            const t = canvasOf(c.width, c.height), g = t.getContext('2d'); g.drawImage(c, 0, 0);
            const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
            for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; d[i + 3] = Math.round(Math.max(0, Math.min(255, (255 - l) * 1.6))); }
            g.putImageData(id, 0, 0);
            resultCard(body, await toBlob(t, 'image/png'), 'signature.png', c.width + '×' + c.height + ' px PNG');
          } else {
            const out = await jpegInRange(c, 0, +q('#scKb').value || 20);
            resultCard(body, out.blob, 'signature.jpg', c.width + '×' + c.height + ' px');
          }
        } catch (e) { fail(body, e); }
      }
      paint();
    }
  };

  /* ================================================================== UPSC 3-SIGNATURE STRIP */
  TOOL_IMPL.sigstrip3 = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      let imgs = [], timer = null;
      function paint() {
        body.innerHTML = '';
        body.appendChild(el('<div class="note">UPSC asks for <b>three signatures one below the other</b> in black ink, in one image (JPG, 350–500 px, 20–100 KB). Give either <b>one photo</b> of a paper with your 3 signatures, or <b>three photos</b> (one signature each).</div>'));
        if (imgs.length) body.appendChild(el('<div class="note">' + imgs.length + ' photo(s) added.</div>'));
        if (imgs.length < 3) body.appendChild(picker(imgs.length ? '➕ Add another signature photo' : '✍️ Signature photo(s)', async function (fl) { try { for (const f of fl) if (imgs.length < 3) imgs.push(await loadImgFile(f)); paint(); } catch (e) { fail(body, e); } }, true));
        if (!imgs.length) return;
        body.appendChild(el(`<div class="opts">
          <div class="field"><label>Image size (square, px)</label><input id="s3W" type="number" min="350" max="500" value="500"></div>
          <div class="field"><label>KB range</label><div style="display:flex; gap:6px;"><input id="s3Min" type="number" value="20" style="width:50%"><input id="s3Max" type="number" value="100" style="width:50%"></div></div>
        </div>`));
        body.querySelectorAll('input').forEach(function (x) { x.oninput = function () { clearTimeout(timer); timer = setTimeout(make, 250); }; });
        const row = el('<div class="btn-row"><button class="btn secondary">🗑️ Start again</button></div>'); row.firstChild.onclick = function () { imgs = []; paint(); }; body.appendChild(row);
        make();
      }
      // one photo with 3 signatures: split the cleaned ink into the 3 biggest horizontal bands
      function splitBands(c) {
        const g = c.getContext('2d', { willReadFrequently: true }), d = g.getImageData(0, 0, c.width, c.height).data, rows = new Array(c.height).fill(0);
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4] < 128) rows[y]++;
        const bands = []; let s = -1, gap = 0, minGap = Math.max(3, Math.round(c.height * 0.02));
        for (let y = 0; y <= c.height; y++) { const ink = y < c.height && rows[y] > 0; if (ink) { if (s < 0) s = y; gap = 0; } else if (s >= 0) { gap++; if (gap > minGap || y === c.height) { bands.push([s, y - gap + 1]); s = -1; gap = 0; } } }
        bands.sort(function (a, b) { return (b[1] - b[0]) - (a[1] - a[0]); });
        return bands.slice(0, 3).sort(function (a, b) { return a[0] - b[0]; }).map(function (b) { const h = b[1] - b[0]; const o = canvasOf(c.width, h + 8, '#fff'); o.getContext('2d').drawImage(c, 0, b[0] - 4, c.width, h + 8, 0, 0, c.width, h + 8); return cleanInk(o).canvas; });
      }
      async function make() {
        try {
          let parts = imgs.map(function (i) { return cleanInk(i).canvas; });
          if (imgs.length === 1) { parts = splitBands(parts[0]); if (parts.length < 3) throw new Error('Could not find 3 separate signatures in this photo (found ' + parts.length + '). Leave more space between them, or add 3 separate photos.'); }
          if (parts.length < 3) { body.appendChild(el('<div class="note" data-res>Add ' + (3 - parts.length) + ' more signature photo(s).</div>')); return; }
          const W = Math.max(350, Math.min(500, +body.querySelector('#s3W').value || 500)), c = canvasOf(W, W, '#fff'), g = c.getContext('2d'), slot = W / 3;
          parts.forEach(function (p, i) { const k = Math.min((W * 0.9) / p.width, (slot * 0.82) / p.height), w = p.width * k, h = p.height * k; g.drawImage(p, (W - w) / 2, i * slot + (slot - h) / 2, w, h); });
          const r = await jpegInRange(c, +body.querySelector('#s3Min').value || 0, +body.querySelector('#s3Max').value || 100);
          resultCard(body, r.blob, 'signature-3x.jpg', W + '×' + W + ' px' + (r.padded ? ' (padded to minimum KB)' : ''));
        } catch (e) { fail(body, e); }
      }
      paint();
    }
  };

  /* ================================================================== PHOTO + SIGNATURE JOIN */
  TOOL_IMPL.photosignjoin = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      let photo = null, sign = null, crop = null, timer = null, V = { jW: 200, jPH: 230, jSH: 80, jKb: 50, jTxt: '' };
      function paint() {
        body.innerHTML = '';
        body.appendChild(el('<div class="note">Some forms want the photo and the signature in ONE picture (photo on top, signature below).</div>'));
        if (!photo) { body.appendChild(picker('🧑 ① Your photo', async function (f) { try { photo = await loadImgFile(f); paint(); } catch (e) { fail(body, e); } })); return; }
        if (!sign) { body.appendChild(picker('✍️ ② Your signature', async function (f) { try { sign = await loadImgFile(f); paint(); } catch (e) { fail(body, e); } })); return; }
        body.appendChild(el(`<div class="opts">
          <div class="field"><label>Width (px)</label><input id="jW" type="number" value="${V.jW}" min="80" max="1200"></div>
          <div class="field"><label>Photo height (px)</label><input id="jPH" type="number" value="${V.jPH}" min="80" max="1600"></div>
          <div class="field"><label>Signature height (px)</label><input id="jSH" type="number" value="${V.jSH}" min="30" max="600"></div>
          <div class="field"><label>Max KB</label><input id="jKb" type="number" value="${V.jKb}" min="5" max="1000"></div>
          <div class="field"><label>Name / date under signature (optional)</label><input id="jTxt" value="${escapeHtml(V.jTxt)}" placeholder="e.g. RAMESH K, 23-10-2026"></div>
        </div>`));
        crop = cropper(photo, (+body.querySelector('#jW').value) / (+body.querySelector('#jPH').value), schedule); body.appendChild(crop.el);
        body.querySelectorAll('.opts input').forEach(function (x) { x.oninput = function () { V[x.id] = x.type === 'number' ? +x.value : x.value; schedule(); }; x.onchange = function () { x.oninput(); if (x.id === 'jW' || x.id === 'jPH') paintCrop(); }; });
        const row = el('<div class="btn-row"><button class="btn secondary">🔄 Start again</button></div>'); row.firstChild.onclick = function () { photo = sign = null; paint(); }; body.appendChild(row);
        schedule();
      }
      function paintCrop() { const old = crop.el; crop = cropper(photo, (+body.querySelector('#jW').value) / (+body.querySelector('#jPH').value), schedule); old.replaceWith(crop.el); schedule(); }
      function schedule() { clearTimeout(timer); timer = setTimeout(make, 250); }
      async function make() {
        try {
          const q = function (id) { return +body.querySelector(id).value; };
          const W = q('#jW'), PH = q('#jPH'), SH = q('#jSH'), txt = body.querySelector('#jTxt').value.trim(), TH = txt ? Math.max(14, Math.round(SH * 0.3)) : 0;
          const c = canvasOf(W, PH + SH + TH, '#fff'), g = c.getContext('2d');
          const ph = canvasOf(W, PH, '#fff'); crop.draw(ph); g.drawImage(ph, 0, 0);
          g.drawImage(fitInto(cleanInk(sign).canvas, W, SH, 0.05), 0, PH);
          g.strokeStyle = '#999'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, PH + 0.5); g.lineTo(W, PH + 0.5); g.stroke();
          if (txt) { g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = Math.round(TH * 0.7); g.font = '700 ' + fs + 'px "Noto Sans Tamil",Arial'; while (fs > 7 && g.measureText(txt).width > W - 4) { fs--; g.font = '700 ' + fs + 'px "Noto Sans Tamil",Arial'; } g.fillText(txt, W / 2, PH + SH + TH / 2); }
          const r = await jpegInRange(c, 0, q('#jKb'));
          resultCard(body, r.blob, 'photo-signature.jpg', W + '×' + (PH + SH + TH) + ' px');
        } catch (e) { fail(body, e); }
      }
      paint();
    }
  };

  /* ================================================================== ID CARD PRINT (Aadhaar / PAN / Voter …) */
  TOOL_IMPL.cardprint = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      const sides = [{ key: 'front', label: '① Front side', img: null, sel: null, url: null }, { key: 'back', label: '② Back side (optional)', img: null, sel: null, url: null }];
      function paint() {
        body.innerHTML = '';
        body.appendChild(el('<div class="note">Print your Aadhaar / PAN / Voter ID / licence at the <b>real card size (85.6 × 54 mm)</b>, front and back side by side on A4 — ready to cut and fold. Take a photo or screenshot of each side; then drag the orange box around the card.</div>'));
        sides.forEach(function (s) {
          const box = el('<div style="margin:10px 0;"><div style="font-weight:800; margin-bottom:6px;">' + s.label + '</div></div>');
          if (!s.img) box.appendChild(picker('📷 ' + s.label, async function (f) { try { s.img = await loadImgFile(f); s.url = URL.createObjectURL(f); paint(); } catch (e) { fail(body, e); } }));
          else { s.sel = mountRectSelector(box, s.url, s.rect || { fx0: 0.04, fy0: 0.04, fx1: 0.96, fy1: 0.96 }); const rm = el('<button class="btn secondary" style="margin-top:6px; padding:6px 12px; font-size:12px;">✕ Remove</button>'); rm.onclick = function () { s.img = null; s.sel = null; paint(); }; box.appendChild(rm); }
          body.appendChild(box);
        });
        if (!sides[0].img) return;
        body.appendChild(el(`<div class="opts">
          <div class="field"><label>Layout</label><select id="cpLay"><option value="side">Front and back side by side (fold in the middle)</option><option value="stack">Front above back</option><option value="many">4 copies of the front</option></select></div>
          <div class="field-inline"><input type="checkbox" id="cpMask"><label for="cpMask">Mask Aadhaar number (cover the first 8 digits — drag the black box in the preview)</label></div>
          <div class="field-inline"><input type="checkbox" id="cpCut" checked><label for="cpCut">Dotted cutting lines</label></div>
        </div>`));
        const row = el('<div class="btn-row"><button class="btn">🖨️ Make A4 PDF</button></div>'); row.firstChild.onclick = make; body.appendChild(row);
      }
      function cut(s) {
        const r = s.sel.getRect(), x0 = Math.min(r.fx0, r.fx1), x1 = Math.max(r.fx0, r.fx1), y0 = Math.min(r.fy0, r.fy1), y1 = Math.max(r.fy0, r.fy1);
        s.rect = r;
        const W = 1012, H = 638; // 85.6 × 54 mm at 300 dpi
        const c = canvasOf(W, H, '#fff'); c.getContext('2d').drawImage(s.img, x0 * s.img.naturalWidth, y0 * s.img.naturalHeight, (x1 - x0) * s.img.naturalWidth, (y1 - y0) * s.img.naturalHeight, 0, 0, W, H);
        return c;
      }
      async function make() {
        const prog = mountProgress(body);
        try {
          const f = cut(sides[0]), b = sides[1].img ? cut(sides[1]) : null;
          if (body.querySelector('#cpMask').checked) await maskStep(f);
          const mm = 72 / 25.4, CW = 85.6 * mm, CH = 54 * mm, A4 = [595.28, 841.89];
          const out = await PDFDocument.create(), pg = out.addPage(A4);
          const emb = async function (c) { const bl = await toBlob(c, 'image/jpeg', 0.93); return out.embedJpg(await bl.arrayBuffer()); };
          const fi = await emb(f), bi = b ? await emb(b) : null, lay = body.querySelector('#cpLay').value, top = A4[1] - 25 * mm;
          const place = [];
          if (lay === 'side') { const x = (A4[0] - 2 * CW) / 2; place.push([fi, x, top - CH]); if (bi) place.push([bi, x + CW, top - CH]); }
          else if (lay === 'stack') { const x = (A4[0] - CW) / 2; place.push([fi, x, top - CH]); if (bi) place.push([bi, x, top - 2 * CH - 6 * mm]); }
          else { const x = (A4[0] - 2 * CW - 8 * mm) / 2; for (let i = 0; i < 4; i++) place.push([fi, x + (i % 2) * (CW + 8 * mm), top - CH - Math.floor(i / 2) * (CH + 8 * mm)]); }
          place.forEach(function (p) { pg.drawImage(p[0], { x: p[1], y: p[2], width: CW, height: CH }); if (body.querySelector('#cpCut').checked) pg.drawRectangle({ x: p[1], y: p[2], width: CW, height: CH, borderColor: rgb(0.55, 0.55, 0.55), borderWidth: 0.6, borderDashArray: [3, 3] }); });
          const bytes = await out.save();
          downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'id-card-print.pdf');
          prog.remove(); mountResult(body, 'PDF ready. Print at <b>100% / Actual size</b> (not “Fit to page”) so the card comes out at the real size.');
        } catch (e) { prog.remove(); fail(body, e); }
      }
      // let the person place one black box on the card picture before printing
      function maskStep(c) {
        return new Promise(function (resolve) {
          const ov = el('<div style="position:fixed; inset:0; background:rgba(0,0,0,.65); z-index:9999; display:flex; align-items:center; justify-content:center; padding:12px;"><div style="background:#fff; border-radius:14px; padding:14px; width:min(96vw,560px);"><div style="font-weight:800; margin-bottom:8px;">Drag the box over the first 8 digits</div><div data-h></div><div class="btn-row" style="margin-top:10px;"><button class="btn">✓ Apply mask</button></div></div></div>');
          document.body.appendChild(ov);
          const sel = mountRectSelector(ov.querySelector('[data-h]'), c.toDataURL('image/jpeg', 0.9), { fx0: 0.3, fy0: 0.78, fx1: 0.62, fy1: 0.9 });
          ov.querySelector('.btn').onclick = function () { const r = sel.getRect(), g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(Math.min(r.fx0, r.fx1) * c.width, Math.min(r.fy0, r.fy1) * c.height, Math.abs(r.fx1 - r.fx0) * c.width, Math.abs(r.fy1 - r.fy0) * c.height); ov.remove(); resolve(); };
        });
      }
      paint();
    }
  };

  /* ================================================================== HRA EXEMPTION */
  TOOL_IMPL.hracalc = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      body.appendChild(el(`<div class="opts">
        <div class="field"><label>Year</label><select id="hrY"><option value="ty2026">Tax year 2026-27 onwards (Income-tax Rules 2026)</option><option value="old">FY 2025-26 or earlier (old Act)</option></select></div>
        <div class="field"><label>City you live in</label><select id="hrC"><option value="chennai">Chennai</option><option value="bengaluru">Bengaluru</option><option value="hyderabad">Hyderabad</option><option value="delhi">Delhi</option><option value="mumbai">Mumbai</option><option value="kolkata">Kolkata</option><option value="pune">Pune</option><option value="ahmedabad">Ahmedabad</option><option value="other">Any other city / town (Coimbatore, Madurai…)</option></select></div>
        <div class="field"><label>Period</label><select id="hrP"><option value="12">Yearly (12 months)</option><option value="1">One month</option></select></div>
        <div class="field"><label>Basic pay (₹)</label><input id="hrB" type="number" min="0" value="40000"></div>
        <div class="field"><label>DA (₹) (part of salary for retirement)</label><input id="hrD" type="number" min="0" value="0"></div>
        <div class="field"><label>HRA received (₹)</label><input id="hrH" type="number" min="0" value="16000"></div>
        <div class="field"><label>Rent paid (₹)</label><input id="hrR" type="number" min="0" value="15000"></div>
        <div class="field"><label>Amounts above are</label><select id="hrU"><option value="m">Per month</option><option value="y">For the period</option></select></div>
      </div>`));
      const out = el('<div></div>'); body.appendChild(out);
      const fmt = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };
      function run() {
        const q = function (id) { return body.querySelector(id).value; };
        const months = +q('#hrP'), mul = q('#hrU') === 'm' ? months : 1;
        const r = hraExempt({ basic: q('#hrB') * mul, da: q('#hrD') * mul, hra: q('#hrH') * mul, rent: q('#hrR') * mul, city: q('#hrC'), year: q('#hrY') });
        const rentYear = q('#hrU') === 'm' ? q('#hrR') * 12 : (months === 1 ? q('#hrR') * 12 : +q('#hrR'));
        out.innerHTML = `<div style="padding:14px; border-radius:12px; background:#EEF6F0; border:1px solid #CDE6D4; margin-top:8px;">
          <div style="font-size:13px; color:var(--sub);">Tax-free HRA (${months === 12 ? 'year' : 'month'})</div><div style="font-size:28px; font-weight:900;">${fmt(r.exempt)}</div>
          <div style="font-size:13px;">Taxable HRA: <b>${fmt(r.taxable)}</b></div></div>
          <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:13px;">
          <tr style="${r.which === 'a' ? 'background:#FFF6D6;font-weight:800' : ''}"><td style="padding:6px; border-bottom:1px solid var(--line);">① HRA actually received</td><td style="text-align:right; padding:6px; border-bottom:1px solid var(--line);">${fmt(r.a)}</td></tr>
          <tr style="${r.which === 'b' ? 'background:#FFF6D6;font-weight:800' : ''}"><td style="padding:6px; border-bottom:1px solid var(--line);">② Rent paid − 10% of (Basic + DA)</td><td style="text-align:right; padding:6px; border-bottom:1px solid var(--line);">${fmt(r.b)}</td></tr>
          <tr style="${r.which === 'c' ? 'background:#FFF6D6;font-weight:800' : ''}"><td style="padding:6px; border-bottom:1px solid var(--line);">③ ${r.pct}% of (Basic + DA) — ${r.metro ? 'listed city' : 'other city'}</td><td style="text-align:right; padding:6px; border-bottom:1px solid var(--line);">${fmt(r.c)}</td></tr></table>
          <div class="note" style="margin-top:10px; font-size:12px; line-height:1.6;">The tax-free part is the <b>smallest</b> of ①②③ (highlighted). Only in the <b>old tax regime</b> — the new regime gives no HRA exemption.
          From tax year 2026-27 the 50% rule covers 8 cities (Delhi, Mumbai, Kolkata, Chennai, Bengaluru, Hyderabad, Pune, Ahmedabad) — Income-tax Rules 2026, notified 20 Mar 2026; earlier years: only the first four.
          ${rentYear > 100000 ? '<br>⚠️ Rent is above ₹1,00,000 a year — give your employer the landlord’s PAN.' : ''} Not tax advice — confirm with your office / CA.</div>`;
      }
      body.querySelectorAll('input,select').forEach(function (x) { x.oninput = x.onchange = run; });
      run();
    }
  };

  /* ================================================================== EXAM AGE ELIGIBILITY */
  TOOL_IMPL.examage = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      const y = new Date().getFullYear();
      body.appendChild(el(`<div class="opts">
        <div class="field"><label>Your date of birth</label><input id="eaDob" type="date" value="2000-06-15"></div>
        <div class="field"><label>Age is counted on (cut-off date from the notification)</label><input id="eaCut" type="date" value="${y + 1}-01-01"></div>
        <div class="field"><label>Minimum age</label><input id="eaMin" type="number" min="0" max="60" value="21"></div>
        <div class="field"><label>Maximum age (General)</label><input id="eaMax" type="number" min="0" max="70" value="32"></div>
        <div class="field"><label>Your category</label><select id="eaCat"><option value="gen">General / UR</option><option value="ews">EWS</option><option value="obc">OBC (non-creamy)</option><option value="sc">SC</option><option value="st">ST</option><option value="pwd">PwBD – General</option><option value="pwdobc">PwBD – OBC</option><option value="pwdsc">PwBD – SC / ST</option></select></div>
        <div class="field"><label>Extra relaxation (years) — ex-servicemen, widows, state rules…</label><input id="eaExtra" type="number" min="0" max="20" value="0"></div>
      </div>`));
      body.appendChild(el('<div style="font-size:11.5px; color:var(--sub); margin:-4px 0 8px;">Category years used: OBC +3, SC/ST +5, PwBD +10 (OBC +13, SC/ST +15) — the usual central-government rule (UPSC / SSC). State exams (TNPSC etc.) have different rules — change the maximum age and the extra years to match your notification.</div>'));
      const out = el('<div></div>'); body.appendChild(out);
      const dmy = function (iso) { const p = iso.split('-'); return p[2] + '-' + p[1] + '-' + p[0]; };
      function run() {
        const q = function (id) { return body.querySelector(id).value; };
        const relax = (RELAX[q('#eaCat')] || 0) + (+q('#eaExtra') || 0);
        const r = eligible(q('#eaDob'), q('#eaCut'), +q('#eaMin') || 0, +q('#eaMax') || 0, relax);
        if (!r) { out.innerHTML = '<div class="note">Enter both dates.</div>'; return; }
        out.innerHTML = `<div style="padding:14px; border-radius:12px; margin-top:8px; background:${r.ok ? '#EEF6F0' : '#FDEDEC'}; border:1px solid ${r.ok ? '#CDE6D4' : '#F5C6C2'};">
          <div style="font-size:22px; font-weight:900;">${r.ok ? '✅ Eligible by age' : '❌ Not eligible by age'}</div>
          <div style="margin-top:6px;">Age on ${dmy(q('#eaCut'))}: <b>${r.age.y} years ${r.age.m} months ${r.age.d} days</b></div>
          <div>Allowed: ${q('#eaMin')} to ${r.max} years${relax ? ' (includes ' + relax + ' years relaxation)' : ''}</div>
          <div>You must be born between <b>${dmy(r.from)}</b> and <b>${dmy(r.to)}</b> (both days included).</div>
          ${r.tooYoung ? '<div>You are too young for this cut-off date.</div>' : ''}${r.tooOld ? '<div>You crossed the upper age limit.</div>' : ''}</div>
          <div class="note" style="font-size:12px;">Always read the notification: some exams also limit the number of attempts, or count age on a different date.</div>`;
      }
      body.querySelectorAll('input,select').forEach(function (x) { x.oninput = x.onchange = run; });
      run();
    }
  };
})();
