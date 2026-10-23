/* category-imgx.js — two extra image tools (lazy-loaded):
 *   imgblur  — Blur / Pixelate / Hide part of a photo: drag boxes over an Aadhaar number, a face, a number plate, an address…
 *   imgsplit — Split image into a grid: 1×2 … 3×3 tiles for Instagram carousels / profile grids, saved as a ZIP
 *   imgborder  — Add border / frame (solid, double, polaroid, shadow card, gradient, square) with a LIVE preview
 *   imgenhance — Image enhancer with a before/after slider (sharpen, denoise, contrast, brightness, colour, upscale)
 *   aiupscale  — AI upscaler (UpscalerJS, in the browser) with a before/after slider
 * All in the browser (canvas), nothing uploaded. Host globals: TOOL_IMPL, el, mountUploader, mountFileList, mountResult,
 * downloadBlob, escapeHtml, loadScriptOnce. Pure maths exported on window.ImgxCore for tests.
 */
(function () {
  'use strict';
  const clamp = function (v, a, b) { return Math.min(Math.max(v, a), b); };
  // normalised rect from two drag points
  function rectFrom(x0, y0, x1, y1) { return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) }; }
  // tiles of a W×H image into rows×cols; when square=true the tiles are square and the grid is centred (the rest is cut)
  function tiles(W, H, rows, cols, square) {
    let tw = W / cols, th = H / rows, ox = 0, oy = 0;
    if (square) { const s = Math.min(tw, th); tw = th = s; ox = (W - s * cols) / 2; oy = (H - s * rows) / 2; }
    const out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ r: r, c: c, x: Math.round(ox + c * tw), y: Math.round(oy + r * th), w: Math.round(tw), h: Math.round(th) });
    return out;
  }
  window.ImgxCore = { rectFrom: rectFrom, tiles: tiles };

  async function loadImg(file) {
    const url = URL.createObjectURL(file);
    try { const im = new Image(); im.decoding = 'async'; im.src = url; await im.decode(); return im; }
    catch (e) { throw new Error('This picture could not be opened. Try JPG, PNG or WEBP.'); }
    finally { setTimeout(function () { URL.revokeObjectURL(url); }, 2000); }
  }
  const baseName = function (f) { return (f.name || 'image').replace(/\.[^.]+$/, ''); };
  const outType = function (f) { return /png/i.test(f.type) ? 'image/png' : /webp/i.test(f.type) ? 'image/webp' : 'image/jpeg'; };
  const extOf = function (t) { return t === 'image/png' ? 'png' : t === 'image/webp' ? 'webp' : 'jpg'; };
  const toBlob = function (cv, type) { return new Promise(function (r) { cv.toBlob(r, type, 0.92); }); };
  const err = function (body, m) { const b = mountResult(body, 'Error: ' + escapeHtml(String(m))); b.style.background = '#FDEDEC'; };

  /* ===================================================================== BLUR / PIXELATE / HIDE */
  TOOL_IMPL.imgblur = {
    mount: function (container) {
      let file = null, img = null, boxes = [], mode = 'pixel', strength = 14, sel = -1;
      const body = el('<div></div>'); container.appendChild(body);
      function paint() {
        body.innerHTML = '';
        if (!img) {
          mountUploader(body, { accept: 'image/*', label: 'Drop a photo here, or tap to choose', sublabel: 'Then drag boxes over what must be hidden — Aadhaar / PAN number, face, number plate, address',
            onAdd: async function (fl) { file = fl[0]; try { img = await loadImg(file); boxes = []; paint(); } catch (e) { paint(); err(body, e.message); } } });
          body.appendChild(el('<div class="note">Tip for Aadhaar copies: hide the first 8 digits and keep the last 4 — the same as the official “masked Aadhaar”.</div>'));
          return;
        }
        mountFileList(body, [file], function () { img = null; file = null; paint(); });
        const chips = el('<div class="filter-row" style="margin-top:12px;flex-wrap:wrap;"></div>');
        [['pixel', '🟫 Pixelate'], ['blur', '🌫️ Blur'], ['black', '⬛ Black box'], ['white', '⬜ White box']].forEach(function (m) { chips.appendChild(el('<button class="filter-chip ' + (mode === m[0] ? 'active' : '') + '" data-m="' + m[0] + '">' + m[1] + '</button>')); });
        chips.addEventListener('click', function (e) { const b = e.target.closest('[data-m]'); if (!b) return; mode = b.getAttribute('data-m'); if (sel >= 0) boxes[sel].mode = mode; [].forEach.call(chips.children, function (c) { c.classList.toggle('active', c === b); }); draw(); });
        body.appendChild(chips);
        const sl = el('<div style="display:flex;align-items:center;gap:10px;margin-top:10px;font-size:13px;"><b>Strength</b><input type="range" min="4" max="40" value="' + strength + '" style="flex:1"></div>'); body.appendChild(sl);
        sl.querySelector('input').oninput = function (e) { strength = +e.target.value; if (sel >= 0) boxes[sel].s = strength; draw(); };
        const wrap = el('<div style="position:relative;margin-top:10px;touch-action:none;user-select:none;-webkit-user-select:none;"></div>'); body.appendChild(wrap);
        const cv = document.createElement('canvas'); cv.style.cssText = 'width:100%;height:auto;display:block;border-radius:10px;cursor:crosshair;touch-action:none;background:#eee'; wrap.appendChild(cv);
        const MAX = 2400, sc = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        cv.width = Math.round(img.naturalWidth * sc); cv.height = Math.round(img.naturalHeight * sc);
        const g = cv.getContext('2d');
        const info = el('<div class="note"></div>'); body.appendChild(info);
        function apply(ctx, W, H, b) {
          const x = b.x * W, y = b.y * H, w = Math.max(1, b.w * W), h = Math.max(1, b.h * H);
          if (b.mode === 'black' || b.mode === 'white') { ctx.fillStyle = b.mode === 'black' ? '#000' : '#fff'; ctx.fillRect(x, y, w, h); return; }
          if (b.mode === 'pixel') {
            const k = Math.max(2, Math.round(b.s * Math.max(W, H) / 1200)), tw = Math.max(1, Math.round(w / k)), th = Math.max(1, Math.round(h / k));
            const t = document.createElement('canvas'); t.width = tw; t.height = th; t.getContext('2d').drawImage(ctx.canvas, x, y, w, h, 0, 0, tw, th);
            ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(t, 0, 0, tw, th, x, y, w, h); ctx.restore(); return;
          }
          ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.filter = 'blur(' + Math.max(2, b.s * Math.max(W, H) / 1500) + 'px)';
          for (let i = 0; i < 2; i++) ctx.drawImage(ctx.canvas, 0, 0); ctx.restore();
        }
        function render(ctx, W, H, showUI) {
          ctx.drawImage(img, 0, 0, W, H);
          boxes.forEach(function (b) { apply(ctx, W, H, b); });
          if (showUI) boxes.forEach(function (b, i) { ctx.save(); ctx.strokeStyle = i === sel ? '#F59F00' : '#4DABF7'; ctx.lineWidth = Math.max(2, W / 400); ctx.setLineDash([W / 80, W / 120]); ctx.strokeRect(b.x * W, b.y * H, b.w * W, b.h * H); ctx.restore(); });
        }
        function draw() { render(g, cv.width, cv.height, true); info.innerHTML = boxes.length ? boxes.length + ' area' + (boxes.length > 1 ? 's' : '') + ' hidden. Tap a box to select it; drag on the picture to add another.' : 'Drag on the picture to draw a box over what you want to hide.'; }
        let d = null;
        const pos = function (e) { const r = cv.getBoundingClientRect(); return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) }; };
        cv.addEventListener('pointerdown', function (e) {
          cv.setPointerCapture(e.pointerId); const p = pos(e);
          const hit = boxes.map(function (b, i) { return [b, i]; }).reverse().filter(function (x) { const b = x[0]; return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; })[0];
          if (hit) { sel = hit[1]; d = { move: true, sx: p.x, sy: p.y, b0: Object.assign({}, hit[0]) }; }
          else { boxes.push({ x: p.x, y: p.y, w: 0, h: 0, mode: mode, s: strength }); sel = boxes.length - 1; d = { sx: p.x, sy: p.y }; }
          draw(); e.preventDefault();
        });
        cv.addEventListener('pointermove', function (e) {
          if (!d) return; const p = pos(e), b = boxes[sel];
          if (d.move) { b.x = clamp(d.b0.x + p.x - d.sx, 0, 1 - b.w); b.y = clamp(d.b0.y + p.y - d.sy, 0, 1 - b.h); }
          else Object.assign(b, rectFrom(d.sx, d.sy, p.x, p.y));
          draw();
        });
        const up = function () { if (d && !d.move && sel >= 0) { if (boxes[sel].w < 0.005 || boxes[sel].h < 0.005) boxes.splice(sel, 1); sel = -1; } d = null; draw(); }; // a new box is not left selected, so the next style choice applies to the next box (tap a box to change it)
        cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
        const row = el('<div class="btn-row"><button class="btn secondary" id="ibDel">🗑 Remove selected box</button><button class="btn secondary" id="ibClr">Clear all</button><button class="btn" id="ibSave">⬇ Download</button></div>'); body.appendChild(row);
        row.querySelector('#ibDel').onclick = function () { if (sel >= 0) { boxes.splice(sel, 1); sel = -1; draw(); } };
        row.querySelector('#ibClr').onclick = function () { boxes = []; sel = -1; draw(); };
        row.querySelector('#ibSave').onclick = async function () {
          if (!boxes.length) { err(body, 'Draw at least one box first.'); return; }
          const out = document.createElement('canvas'); out.width = img.naturalWidth; out.height = img.naturalHeight; // full resolution
          render(out.getContext('2d'), out.width, out.height, false);
          const t = outType(file), blob = await toBlob(out, t);
          downloadBlob(blob, baseName(file) + '-hidden.' + extOf(t)); mountResult(body, 'Done — the picture was saved with ' + boxes.length + ' hidden area' + (boxes.length > 1 ? 's' : '') + ' (the hidden parts cannot be recovered from this copy).');
        };
        draw();
      }
      paint();
    }
  };

  /* ===================================================================== SPLIT INTO GRID */
  TOOL_IMPL.imgsplit = {
    mount: function (container) {
      let file = null, img = null, rows = 1, cols = 3, smode = 'whole', fill = 'blur';
      const body = el('<div></div>'); container.appendChild(body);
      const PRE = [[1, 2], [1, 3], [2, 2], [2, 3], [3, 3], [3, 1], [4, 3]];
      // the picture that is actually cut: 'whole' = every pixel kept, the picture sits in the middle of a bigger square-tile canvas and the
      // extra space is filled (blurred copy / white / black); 'trim' = square tiles, edges cut off; 'rect' = tiles of the picture's own shape
      function source(max) {
        const W = img.naturalWidth, H = img.naturalHeight;
        if (smode !== 'whole') return { src: img, W: W, H: H, sq: smode === 'trim' };
        let s = Math.ceil(Math.max(W / cols, H / rows)), k = 1;
        const big = Math.max(s * cols, s * rows); if (max && big > max) k = max / big;
        const PW = Math.max(cols, Math.round(s * cols * k)), PH = Math.max(rows, Math.round(s * rows * k));
        const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH; const g = cv.getContext('2d');
        const dw = Math.round(W * k), dh = Math.round(H * k), dx = Math.round((PW - dw) / 2), dy = Math.round((PH - dh) / 2);
        if (fill === 'blur') {
          const cover = Math.max(PW / W, PH / H);
          g.save(); try { g.filter = 'blur(' + Math.round(Math.max(PW, PH) / 40) + 'px)'; } catch (e) {}
          const bw = W * cover * 1.08, bh = H * cover * 1.08; g.drawImage(img, (PW - bw) / 2, (PH - bh) / 2, bw, bh); g.restore();
          g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 0, PW, PH);
        } else { g.fillStyle = fill === 'black' ? '#000' : '#fff'; g.fillRect(0, 0, PW, PH); }
        g.drawImage(img, dx, dy, dw, dh);
        return { src: cv, W: PW, H: PH, sq: false };
      }
      function paint() {
        body.innerHTML = '';
        if (!img) { mountUploader(body, { accept: 'image/*', label: 'Drop a picture here, or tap to choose', sublabel: 'Cut it into tiles for an Instagram carousel or a 3×3 profile grid', onAdd: async function (fl) { file = fl[0]; try { img = await loadImg(file); paint(); } catch (e) { paint(); err(body, e.message); } } }); return; }
        mountFileList(body, [file], function () { img = null; file = null; paint(); });
        const chips = el('<div class="filter-row" style="margin-top:12px;flex-wrap:wrap;"></div>');
        PRE.forEach(function (p) { chips.appendChild(el('<button class="filter-chip ' + (rows === p[0] && cols === p[1] ? 'active' : '') + '" data-r="' + p[0] + '" data-c="' + p[1] + '">' + p[0] + ' × ' + p[1] + '</button>')); });
        chips.addEventListener('click', function (e) { const b = e.target.closest('[data-r]'); if (!b) return; rows = +b.getAttribute('data-r'); cols = +b.getAttribute('data-c'); paint(); });
        body.appendChild(chips);
        const modeRow = el('<div class="opts"><div class="field"><label>How to cut</label><select id="spMode"><option value="whole">Whole picture — nothing cut off (square tiles)</option><option value="trim">Square tiles — trim the edges</option><option value="rect">Tiles in the picture\'s own shape</option></select></div><div class="field" id="spFillBox"><label>Extra space is filled with</label><select id="spFill"><option value="blur">Blurred copy of the picture</option><option value="white">White</option><option value="black">Black</option></select></div></div>');
        modeRow.querySelector('#spMode').value = smode; modeRow.querySelector('#spFill').value = fill;
        modeRow.querySelector('#spFillBox').style.display = smode === 'whole' ? '' : 'none';
        modeRow.querySelector('#spMode').onchange = function (e) { smode = e.target.value; paint(); };
        modeRow.querySelector('#spFill').onchange = function (e) { fill = e.target.value; paint(); };
        body.appendChild(modeRow);
        // live preview: the picture the tiles are cut from, with the grid lines and tile numbers on top
        const S = source(1400), cv = document.createElement('canvas'); cv.style.cssText = 'width:100%;height:auto;display:block;border-radius:10px;margin-top:10px;background:#eee'; body.appendChild(cv);
        const sc = Math.min(1, 1400 / Math.max(S.W, S.H)); cv.width = Math.max(1, Math.round(S.W * sc)); cv.height = Math.max(1, Math.round(S.H * sc));
        const g = cv.getContext('2d'); g.drawImage(S.src, 0, 0, cv.width, cv.height);
        const T = tiles(cv.width, cv.height, rows, cols, S.sq);
        if (S.sq) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, cv.width, cv.height); T.forEach(function (t) { g.drawImage(S.src, t.x / sc, t.y / sc, t.w / sc, t.h / sc, t.x, t.y, t.w, t.h); }); }
        T.forEach(function (t, i) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(t.x, t.y, t.w, t.h); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1; g.strokeRect(t.x + 2, t.y + 2, t.w - 4, t.h - 4); g.font = 'bold ' + Math.round(t.h / 6) + 'px system-ui'; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText(String(i + 1), t.x + t.w / 14, t.y + t.h / 5); g.fillStyle = '#fff'; g.fillText(String(i + 1), t.x + t.w / 14, t.y + t.h / 5); });
        const full = tiles(S.W, S.H, rows, cols, S.sq);
        const rw = smode === 'whole' ? Math.ceil(Math.max(img.naturalWidth / cols, img.naturalHeight / rows)) : 0, ft0 = smode === 'whole' ? { w: rw, h: rw } : tiles(img.naturalWidth, img.naturalHeight, rows, cols, smode === 'trim')[0];
        body.appendChild(el('<div class="note">' + full.length + ' tiles of ' + ft0.w + ' × ' + ft0.h + ' px' + (smode === 'whole' ? ' — the whole picture is inside, nothing is cut off' : smode === 'trim' ? ' — the outer edges are trimmed to make them square' : '') + '. For an Instagram grid, post them from the LAST number to the first so they line up on your profile.</div>'));
        const row = el('<div class="btn-row"><button class="btn">⬇ Download tiles (ZIP)</button></div>'); body.appendChild(row);
        row.querySelector('button').onclick = async function () {
          const btn = this; btn.disabled = true;
          try {
            if (!window.JSZip) await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
            const zip = new window.JSZip(), t = outType(file), ext = extOf(t), F = source(9000), ft = tiles(F.W, F.H, rows, cols, F.sq);
            for (let i = 0; i < ft.length; i++) {
              const f = ft[i], c = document.createElement('canvas'); c.width = f.w; c.height = f.h; c.getContext('2d').drawImage(F.src, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
              zip.file(baseName(file) + '-' + String(i + 1).padStart(2, '0') + '.' + ext, await toBlob(c, t));
            }
            downloadBlob(await zip.generateAsync({ type: 'blob' }), baseName(file) + '-grid-' + rows + 'x' + cols + '.zip');
            mountResult(body, 'Done — ' + ft.length + ' tiles downloaded in one ZIP file.');
          } catch (e) { err(body, e.message || e); }
          btn.disabled = false;
        };
      }
      paint();
    }
  };

  /* ===================================================================== shared: before / after slider */
  // container gets a box with the AFTER picture and the BEFORE picture on top, clipped at the handle; drag anywhere
  function mountCompare(container, beforeUrl, afterUrl, ratio) {
    const box = el('<div class="ix-cmp" style="position:relative;width:100%;max-width:720px;margin:10px auto;border-radius:12px;overflow:hidden;border:1px solid var(--line);touch-action:none;user-select:none;cursor:ew-resize;background:#eee"></div>');
    box.style.aspectRatio = String(ratio || 1);
    const after = el('<img alt="After" draggable="false" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block">');
    const before = el('<img alt="Before" draggable="false" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block">');
    after.src = afterUrl; before.src = beforeUrl;
    const line = el('<div style="position:absolute;top:0;bottom:0;width:3px;background:#fff;box-shadow:0 0 0 1px #0004;transform:translateX(-50%);pointer-events:none"><div style="position:absolute;top:50%;left:50%;width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:50%;background:#fff;box-shadow:0 2px 8px #0005;display:flex;align-items:center;justify-content:center;font-weight:900;color:#333;font-size:15px">⇆</div></div>');
    const lb = el('<span style="position:absolute;left:8px;top:8px;background:#000a;color:#fff;font-size:11px;font-weight:800;padding:3px 8px;border-radius:6px;pointer-events:none">BEFORE</span>');
    const la = el('<span style="position:absolute;right:8px;top:8px;background:#0b7a3e;color:#fff;font-size:11px;font-weight:800;padding:3px 8px;border-radius:6px;pointer-events:none">AFTER</span>');
    box.appendChild(after); box.appendChild(before); box.appendChild(line); box.appendChild(lb); box.appendChild(la);
    let pos = 50;
    const set = function (p) { pos = clamp(p, 0, 100); before.style.clipPath = 'inset(0 ' + (100 - pos) + '% 0 0)'; line.style.left = pos + '%'; };
    set(50);
    let drag = false;
    const at = function (e) { const r = box.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
    box.addEventListener('pointerdown', function (e) { drag = true; try { box.setPointerCapture(e.pointerId); } catch (x) {} at(e); });
    box.addEventListener('pointermove', function (e) { if (drag) at(e); });
    box.addEventListener('pointerup', function () { drag = false; });
    box.addEventListener('pointercancel', function () { drag = false; });
    box.tabIndex = 0;
    box.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') set(pos - 5); if (e.key === 'ArrowRight') set(pos + 5); });
    container.appendChild(box);
    container.appendChild(el('<div class="note" style="text-align:center;margin-top:-2px">⇆ Slide left / right to compare</div>'));
    return { box: box, setAfter: function (u) { after.src = u; }, setBefore: function (u) { before.src = u; } };
  }
  window.ImgxCore.mountCompare = mountCompare;
  const canvasOf = function (img, maxSide) {
    const k = Math.min(1, (maxSide || 1e9) / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
    const g = cv.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, cv.width, cv.height); return cv;
  };
  const urlOf = function (cv, type) { return new Promise(function (r) { cv.toBlob(function (b) { r(URL.createObjectURL(b)); }, type || 'image/jpeg', 0.9); }); };
  // a small strip of thumbnails to choose which picture is previewed
  function thumbPicker(body, files, cur, onPick, onRemove) {
    const row = el('<div style="display:flex;gap:8px;overflow-x:auto;padding:4px 0;margin:8px 0"></div>');
    files.forEach(function (f, i) {
      const u = URL.createObjectURL(f);
      const c = el('<div style="position:relative;flex:0 0 auto"><img src="' + u + '" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:3px solid ' + (i === cur ? 'var(--brand-dark,#1E3A8A)' : 'transparent') + ';cursor:pointer;display:block"><button type="button" title="Remove" style="position:absolute;top:-4px;right:-4px;width:22px;height:22px;border-radius:50%;border:0;background:#c0392b;color:#fff;font-size:12px;cursor:pointer">✕</button></div>');
      c.querySelector('img').onclick = function () { onPick(i); };
      c.querySelector('button').onclick = function () { onRemove(i); };
      row.appendChild(c);
    });
    body.appendChild(row);
  }

  /* ===================================================================== ADD BORDER / FRAME */
  const BORDER_STYLES = [['solid', 'Simple'], ['double', 'Double line'], ['polaroid', 'Polaroid'], ['shadow', 'Shadow card'], ['gradient', 'Gradient'], ['square', 'Square (Instagram)']];
  // draws `img` with the chosen frame on a new canvas; o = {style,width(% of short side),c1,c2,radius(% of short side)}
  function drawBorder(img, o, maxSide) {
    const src = canvasOf(img, maxSide);
    const w = src.width, h = src.height, short = Math.min(w, h);
    const b = Math.round(short * o.width / 100);
    let pl = b, pr = b, pt = b, pb = b;
    if (o.style === 'polaroid') { pl = pr = pt = Math.max(b, Math.round(short * 0.04)); pb = Math.round(pl * 3.6); }
    if (o.style === 'shadow') { const s = Math.max(b, Math.round(short * 0.05)); pl = pr = pt = s; pb = Math.round(s * 1.25); }
    let W = w + pl + pr, H = h + pt + pb, ox = pl, oy = pt;
    if (o.style === 'square') { const S = Math.max(w, h) + 2 * b; W = H = S; ox = Math.round((S - w) / 2); oy = Math.round((S - h) / 2); }
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const R = Math.round(short * (o.radius || 0) / 100);
    const rr = function (x, y, ww, hh, r) { r = Math.max(0, Math.min(r, ww / 2, hh / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); };
    // frame
    if (o.style === 'shadow') {
      g.fillStyle = o.c2 || '#f1f3f6'; g.fillRect(0, 0, W, H);
      g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = Math.round(pl * 0.7); g.shadowOffsetY = Math.round(pl * 0.25);
      rr(ox, oy, w, h, R); g.fillStyle = '#fff'; g.fill(); g.restore();
    } else {
      rr(0, 0, W, H, R ? R + Math.max(pl, pt) : 0);
      if (o.style === 'gradient') { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, o.c1); gr.addColorStop(1, o.c2 || '#ffffff'); g.fillStyle = gr; } else g.fillStyle = o.c1;
      g.fill();
    }
    // picture
    g.save(); rr(ox, oy, w, h, R); g.clip(); g.drawImage(src, ox, oy); g.restore();
    if (o.style === 'double' && b >= 3) { // thin inner line in the second colour
      const t = Math.max(1, Math.round(b * 0.18)), m = Math.round(b * 0.42);
      g.strokeStyle = o.c2 || '#000000'; g.lineWidth = t;
      rr(ox - m, oy - m, w + 2 * m, h + 2 * m, R ? R + m : 0); g.stroke();
    }
    return cv;
  }
  window.ImgxCore.drawBorder = drawBorder;

  TOOL_IMPL.imgborder = {
    mount: function (container) {
      let files = [], cur = 0, img = null, cmpTimer = 0;
      const o = { style: 'solid', width: 4, c1: '#ffffff', c2: '#1f2937', radius: 0 };
      const body = el('<div></div>'); container.appendChild(body);
      async function load(i) { cur = i; img = files[i] ? await loadImg(files[i]) : null; paint(); }
      function paint() {
        body.innerHTML = '';
        mountUploader(body, { accept: 'image/*', multiple: true, label: 'Drop photos here, or tap to choose', sublabel: 'JPG · PNG · WEBP — the same frame is added to every photo',
          onAdd: function (fl) { const first = !files.length; files = files.concat(fl); if (first) load(0); else paint(); } });
        if (!files.length || !img) return;
        thumbPicker(body, files, cur, function (i) { load(i); }, function (i) { files.splice(i, 1); load(Math.min(cur, files.length - 1)); });
        const pv = el('<div style="background:repeating-conic-gradient(#e9edf3 0 25%,#f7f9fc 0 50%) 0 0/18px 18px;border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center"><canvas style="max-width:100%;max-height:440px;height:auto;display:inline-block;box-shadow:0 4px 16px #0002"></canvas></div>');
        body.appendChild(pv);
        const cv = pv.querySelector('canvas');
        const st = el('<div class="filter-row" style="margin-top:12px"></div>');
        BORDER_STYLES.forEach(function (s) { const c = el('<button type="button" class="filter-chip' + (o.style === s[0] ? ' active' : '') + '">' + s[1] + '</button>'); c.onclick = function () { o.style = s[0]; if (s[0] === 'polaroid' && o.c1 === '#000000') o.c1 = '#ffffff'; paint(); }; st.appendChild(c); });
        body.appendChild(st);
        const opts = el('<div class="opts" style="margin-top:10px">' +
          '<div class="field"><label>Border size — <b id="bwV">' + o.width + '</b>%</label><input type="range" id="bw" min="0" max="20" step="0.5" value="' + o.width + '"></div>' +
          '<div class="field"><label>Rounded corners — <b id="brV">' + o.radius + '</b>%</label><input type="range" id="br" min="0" max="25" step="0.5" value="' + o.radius + '"></div>' +
          '<div class="field"><label>Colour</label><input type="color" id="bc1" value="' + o.c1 + '" style="width:100%;height:40px;padding:2px;border-radius:8px;border:1px solid var(--line)"></div>' +
          '<div class="field"><label>' + (o.style === 'shadow' ? 'Background' : 'Second colour (double / gradient)') + '</label><input type="color" id="bc2" value="' + o.c2 + '" style="width:100%;height:40px;padding:2px;border-radius:8px;border:1px solid var(--line)"></div></div>');
        body.appendChild(opts);
        const sw = el('<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"></div>');
        ['#ffffff', '#000000', '#f5e6c8', '#d4af37', '#c0392b', '#1e3a8a', '#16a34a', '#f472b6', '#7c3aed', '#fb923c'].forEach(function (c) {
          const b = el('<button type="button" title="' + c + '" style="width:30px;height:30px;border-radius:8px;border:2px solid var(--line);background:' + c + ';cursor:pointer"></button>');
          b.onclick = function () { o.c1 = c; opts.querySelector('#bc1').value = c; draw(); }; sw.appendChild(b);
        });
        body.appendChild(sw);
        function draw() { const out = drawBorder(img, o, 900); cv.width = out.width; cv.height = out.height; cv.getContext('2d').drawImage(out, 0, 0); }
        const bind = function (id, key, lbl) { const i = opts.querySelector(id); i.oninput = function () { o[key] = i.type === 'range' ? +i.value : i.value; if (lbl) opts.querySelector(lbl).textContent = i.value; clearTimeout(cmpTimer); cmpTimer = setTimeout(draw, 30); }; };
        bind('#bw', 'width', '#bwV'); bind('#br', 'radius', '#brV'); bind('#bc1', 'c1'); bind('#bc2', 'c2');
        draw();
        const row = el('<div class="btn-row" style="margin-top:12px"><button class="btn" id="bgo">🖼️ Download ' + (files.length > 1 ? 'all ' + files.length + ' photos' : 'photo') + '</button></div>');
        body.appendChild(row);
        row.querySelector('#bgo').onclick = async function () {
          const btn = this; btn.disabled = true; const prog = mountProgress(body);
          try {
            const outs = [];
            for (let i = 0; i < files.length; i++) {
              prog.set(5 + 85 * i / files.length, 'Adding the frame… ' + (i + 1) + '/' + files.length);
              const im = await loadImg(files[i]);
              const c = drawBorder(im, o, 6000);
              const type = (o.radius > 0 || /png/i.test(files[i].type)) ? 'image/png' : 'image/jpeg';
              outs.push({ name: baseName(files[i]) + '-framed.' + extOf(type), blob: await toBlob(c, type) });
            }
            if (outs.length === 1) downloadBlob(outs[0].blob, outs[0].name);
            else { if (typeof JSZip === 'undefined') await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'); const z = new JSZip(); outs.forEach(function (x) { z.file(x.name, x.blob); }); downloadBlob(await z.generateAsync({ type: 'blob' }), 'framed-photos.zip'); }
            prog.remove(); mountResult(body, 'Done — ' + outs.length + ' photo' + (outs.length > 1 ? 's' : '') + ' with the frame downloaded.');
          } catch (e) { prog.remove(); err(body, e.message || e); }
          btn.disabled = false;
        };
      }
      paint();
    }
  };

  /* ===================================================================== IMAGE ENHANCER (before / after) */
  // pure pixel maths (also run inside a Worker for the full-size export)
  function enhancePixels(d, w, h, o) {
    const n = w * h;
    const blur = function (src) { // 3×3 binomial blur, separable, on RGB
      const tmp = new Float32Array(n * 3), out = new Float32Array(n * 3);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, l = y * w + (x > 0 ? x - 1 : 0), r = y * w + (x < w - 1 ? x + 1 : x);
        for (let c = 0; c < 3; c++) tmp[i * 3 + c] = (src[l * 3 + c] + 2 * src[i * 3 + c] + src[r * 3 + c]) / 4;
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, t = (y > 0 ? y - 1 : 0) * w + x, b = (y < h - 1 ? y + 1 : y) * w + x;
        for (let c = 0; c < 3; c++) out[i * 3 + c] = (tmp[t * 3 + c] + 2 * tmp[i * 3 + c] + tmp[b * 3 + c]) / 4;
      }
      return out;
    };
    let f = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { f[i * 3] = d[i * 4]; f[i * 3 + 1] = d[i * 4 + 1]; f[i * 3 + 2] = d[i * 4 + 2]; }
    if (o.denoise > 0) { const b = blur(blur(f)); const k = o.denoise / 100; for (let i = 0; i < f.length; i++) f[i] = f[i] * (1 - k) + b[i] * k; }
    if (o.sharp > 0) { const b = blur(f); const k = o.sharp / 100 * 1.6; for (let i = 0; i < f.length; i++) f[i] = f[i] + k * (f[i] - b[i]); }
    // contrast: stretch luminance between the 0.5 % and 99.5 % points, blended by o.contrast
    let lo = 0, hi = 255;
    if (o.contrast > 0) {
      const hist = new Uint32Array(256);
      for (let i = 0; i < n; i++) { const l = 0.299 * f[i * 3] + 0.587 * f[i * 3 + 1] + 0.114 * f[i * 3 + 2]; hist[Math.max(0, Math.min(255, l | 0))]++; }
      let acc = 0; const cut = n * 0.005;
      for (lo = 0; lo < 255 && (acc += hist[lo]) < cut; lo++);
      acc = 0; for (hi = 255; hi > 0 && (acc += hist[hi]) < cut; hi--);
      if (hi - lo < 20) { lo = 0; hi = 255; }
    }
    const k = o.contrast / 100, sat = 1 + (o.color || 0) / 100, br = o.bright || 0;
    for (let i = 0; i < n; i++) {
      let r = f[i * 3], g = f[i * 3 + 1], b = f[i * 3 + 2];
      if (k > 0) { const sc = 255 / (hi - lo); r = r * (1 - k) + (r - lo) * sc * k; g = g * (1 - k) + (g - lo) * sc * k; b = b * (1 - k) + (b - lo) * sc * k; }
      if (sat !== 1) { const l = 0.299 * r + 0.587 * g + 0.114 * b; r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat; }
      d[i * 4] = r + br; d[i * 4 + 1] = g + br; d[i * 4 + 2] = b + br; // Uint8ClampedArray clamps
    }
    return d;
  }
  window.ImgxCore.enhancePixels = enhancePixels;
  let enhWorker = null;
  function enhanceInWorker(data, w, h, o) {
    return new Promise(function (resolve, reject) {
      try {
        if (!enhWorker) enhWorker = new Worker(URL.createObjectURL(new Blob(['var enhancePixels=' + enhancePixels.toString() + ';onmessage=function(e){var m=e.data;var d=new Uint8ClampedArray(m.buf);enhancePixels(d,m.w,m.h,m.o);postMessage(d.buffer,[d.buffer]);};'], { type: 'text/javascript' })));
      } catch (e) { resolve(enhancePixels(data, w, h, o)); return; }
      enhWorker.onmessage = function (e) { resolve(new Uint8ClampedArray(e.data)); };
      enhWorker.onerror = function (e) { enhWorker = null; reject(new Error('The picture is too big for this device — try 1× size.')); };
      enhWorker.postMessage({ buf: data.buffer, w: w, h: h, o: o }, [data.buffer]);
    });
  }

  TOOL_IMPL.imgenhance = {
    mount: function (container) {
      let files = [], cur = 0, img = null, base = null, beforeUrl = '', cmp = null, t = 0;
      const o = { scale: 2, sharp: 45, denoise: 20, contrast: 60, bright: 0, color: 10 };
      const body = el('<div></div>'); container.appendChild(body);
      async function load(i) { cur = i; img = files[i] ? await loadImg(files[i]) : null; base = img ? canvasOf(img, 1100) : null; beforeUrl = base ? await urlOf(base) : ''; paint(); }
      async function preview() {
        if (!base || !cmp) return;
        const c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(base, 0, 0);
        const id = g.getImageData(0, 0, c.width, c.height); enhancePixels(id.data, c.width, c.height, o); g.putImageData(id, 0, 0);
        cmp.setAfter(await urlOf(c));
      }
      function paint() {
        body.innerHTML = '';
        mountUploader(body, { accept: 'image/*', multiple: true, label: 'Drop photos here, or tap to choose', sublabel: 'JPG · PNG · WEBP — make dull or blurry photos clearer',
          onAdd: function (fl) { const first = !files.length; files = files.concat(fl); if (first) load(0); else paint(); } });
        if (!files.length || !img) return;
        thumbPicker(body, files, cur, function (i) { load(i); }, function (i) { files.splice(i, 1); load(Math.min(cur, files.length - 1)); });
        cmp = mountCompare(body, beforeUrl, beforeUrl, base.width / base.height);
        const opts = el('<div class="opts" style="margin-top:6px"></div>');
        const sl = function (key, label, min, max, unit) {
          const f = el('<div class="field"><label>' + label + ' — <b>' + o[key] + '</b>' + (unit || '') + '</label><input type="range" min="' + min + '" max="' + max + '" value="' + o[key] + '"></div>');
          const i = f.querySelector('input'); i.oninput = function () { o[key] = +i.value; f.querySelector('b').textContent = i.value; clearTimeout(t); t = setTimeout(preview, 60); };
          opts.appendChild(f);
        };
        sl('sharp', 'Sharpen', 0, 100, '%'); sl('denoise', 'Reduce noise', 0, 100, '%'); sl('contrast', 'Auto contrast', 0, 100, '%'); sl('bright', 'Brightness', -60, 60); sl('color', 'Colour', -50, 60, '%');
        const sc = el('<div class="field"><label>Size of the saved photo</label><select><option value="1">1× (same size)</option><option value="1.5">1.5×</option><option value="2">2×</option><option value="3">3×</option></select></div>');
        sc.querySelector('select').value = String(o.scale); sc.querySelector('select').onchange = function () { o.scale = +this.value; };
        opts.appendChild(sc);
        body.appendChild(opts);
        body.appendChild(el('<div class="note">Free, in your browser — sharpening, noise reduction, contrast and colour (not a neural network). For real AI detail use “AI Image Upscaler”.</div>'));
        const row = el('<div class="btn-row"><button class="btn" id="ego">✨ Enhance & download ' + (files.length > 1 ? 'all ' + files.length : '') + '</button></div>');
        body.appendChild(row);
        row.querySelector('#ego').onclick = async function () {
          const btn = this; btn.disabled = true; const prog = mountProgress(body);
          try {
            const outs = [];
            for (let i = 0; i < files.length; i++) {
              prog.set(5 + 88 * i / files.length, 'Enhancing ' + (i + 1) + '/' + files.length + '…');
              const im = await loadImg(files[i]);
              let W = Math.round(im.naturalWidth * o.scale), H = Math.round(im.naturalHeight * o.scale);
              const cap = 16e6; if (W * H > cap) { const k = Math.sqrt(cap / (W * H)); W = Math.round(W * k); H = Math.round(H * k); }
              const c = document.createElement('canvas'); c.width = W; c.height = H;
              const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high'; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(im, 0, 0, W, H);
              const id = g.getImageData(0, 0, W, H);
              const out = await enhanceInWorker(id.data, W, H, o);
              g.putImageData(new ImageData(out, W, H), 0, 0);
              outs.push({ name: baseName(files[i]) + '-enhanced.jpg', blob: await toBlob(c, 'image/jpeg') });
            }
            if (outs.length === 1) downloadBlob(outs[0].blob, outs[0].name);
            else { if (typeof JSZip === 'undefined') await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'); const z = new JSZip(); outs.forEach(function (x) { z.file(x.name, x.blob); }); downloadBlob(await z.generateAsync({ type: 'blob' }), 'enhanced-photos.zip'); }
            prog.remove(); mountResult(body, 'Done — ' + outs.length + ' enhanced photo' + (outs.length > 1 ? 's' : '') + ' downloaded.');
          } catch (e) { prog.remove(); err(body, e.message || e); }
          btn.disabled = false;
        };
        preview();
      }
      paint();
    }
  };

  /* ===================================================================== AI UPSCALER (before / after) */
  TOOL_IMPL.aiupscale = {
    mount: function (container) {
      try { if (typeof ensureUpscaler === 'function') ensureUpscaler().catch(function () {}); } catch (e) {}
      let file = null;
      const body = el('<div></div>'); container.appendChild(body);
      function paint() {
        body.innerHTML = '';
        body.appendChild(el('<div class="note">Real AI super-resolution (not just resizing) — adds detail. Runs fully in your browser, free. Best on small / low-resolution photos; big photos can be slow on older phones.</div>'));
        mountUploader(body, { accept: 'image/*', label: 'Drop your image', sublabel: '', onAdd: function (fl) { file = fl[0]; paint(); } });
        if (!file) return;
        mountFileList(body, [file], function () { file = null; paint(); });
        const row = el('<div class="btn-row"><button class="btn">🔍 AI Upscale (up to 4×)</button></div>');
        body.appendChild(row);
        row.querySelector('button').onclick = async function () {
          const btn = this; btn.disabled = true; const prog = mountProgress(body);
          try {
            if (typeof ensureUpscaler !== 'function') await loadCategoryScript('image');
            prog.set(10, 'Loading AI model… (first time only, ~10-20 MB)');
            const up = await ensureUpscaler();
            const im = await loadImg(file);
            prog.set(40, 'Running the neural network…');
            const out = await up.upscale(im, { progress: function (t) { prog.set(40 + 50 * t, 'Upscaling… ' + Math.round(100 * t) + '%'); } });
            const blob = await (await fetch(out)).blob();
            prog.remove();
            downloadBlob(blob, baseName(file) + '-upscaled.png');
            const big = await loadImg(blob);
            mountResult(body, 'AI-upscaled image downloaded (' + im.naturalWidth + '×' + im.naturalHeight + ' → ' + big.naturalWidth + '×' + big.naturalHeight + '). Compare:');
            // before = the original stretched to the same size (what plain resizing gives)
            const c = document.createElement('canvas'); c.width = big.naturalWidth; c.height = big.naturalHeight;
            const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height);
            mountCompare(body, await urlOf(c, 'image/png'), URL.createObjectURL(blob), c.width / c.height);
          } catch (e) { prog.remove(); err(body, (e.message || e) + ' — very large images can run out of memory; try a smaller photo.'); }
          btn.disabled = false;
        };
      }
      paint();
    }
  };
})();
