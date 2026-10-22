/* category-imgx.js — two extra image tools (lazy-loaded):
 *   imgblur  — Blur / Pixelate / Hide part of a photo: drag boxes over an Aadhaar number, a face, a number plate, an address…
 *   imgsplit — Split image into a grid: 1×2 … 3×3 tiles for Instagram carousels / profile grids, saved as a ZIP
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
      let file = null, img = null, rows = 1, cols = 3, square = true;
      const body = el('<div></div>'); container.appendChild(body);
      const PRE = [[1, 2], [1, 3], [2, 2], [2, 3], [3, 3], [3, 1]];
      function paint() {
        body.innerHTML = '';
        if (!img) { mountUploader(body, { accept: 'image/*', label: 'Drop a picture here, or tap to choose', sublabel: 'Cut it into tiles for an Instagram carousel or a 3×3 profile grid', onAdd: async function (fl) { file = fl[0]; try { img = await loadImg(file); paint(); } catch (e) { paint(); err(body, e.message); } } }); return; }
        mountFileList(body, [file], function () { img = null; file = null; paint(); });
        const chips = el('<div class="filter-row" style="margin-top:12px;flex-wrap:wrap;"></div>');
        PRE.forEach(function (p) { chips.appendChild(el('<button class="filter-chip ' + (rows === p[0] && cols === p[1] ? 'active' : '') + '" data-r="' + p[0] + '" data-c="' + p[1] + '">' + p[0] + ' × ' + p[1] + '</button>')); });
        chips.addEventListener('click', function (e) { const b = e.target.closest('[data-r]'); if (!b) return; rows = +b.getAttribute('data-r'); cols = +b.getAttribute('data-c'); paint(); });
        body.appendChild(chips);
        const sq = el('<label style="display:flex;gap:8px;align-items:center;font-size:13px;margin-top:10px;"><input type="checkbox" ' + (square ? 'checked' : '') + '> Square tiles (best for Instagram) — the edges are trimmed evenly</label>'); body.appendChild(sq);
        sq.querySelector('input').onchange = function (e) { square = e.target.checked; paint(); };
        const cv = document.createElement('canvas'); cv.style.cssText = 'width:100%;height:auto;display:block;border-radius:10px;margin-top:10px;background:#eee'; body.appendChild(cv);
        const sc = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight)); cv.width = Math.round(img.naturalWidth * sc); cv.height = Math.round(img.naturalHeight * sc);
        const g = cv.getContext('2d'); g.drawImage(img, 0, 0, cv.width, cv.height);
        const T = tiles(cv.width, cv.height, rows, cols, square);
        g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, cv.width, cv.height);
        T.forEach(function (t, i) { g.drawImage(img, t.x / sc, t.y / sc, t.w / sc, t.h / sc, t.x, t.y, t.w, t.h); g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(t.x, t.y, t.w, t.h); g.fillStyle = '#fff'; g.font = 'bold ' + Math.round(t.h / 6) + 'px system-ui'; g.fillText(String(i + 1), t.x + t.w / 14, t.y + t.h / 5); });
        const full = tiles(img.naturalWidth, img.naturalHeight, rows, cols, square);
        body.appendChild(el('<div class="note">' + full.length + ' tiles of ' + full[0].w + ' × ' + full[0].h + ' px. For an Instagram grid, post them from the LAST number to the first so they line up on your profile.</div>'));
        const row = el('<div class="btn-row"><button class="btn">⬇ Download tiles (ZIP)</button></div>'); body.appendChild(row);
        row.querySelector('button').onclick = async function () {
          const btn = this; btn.disabled = true;
          try {
            if (!window.JSZip) await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
            const zip = new window.JSZip(), t = outType(file), ext = extOf(t);
            for (let i = 0; i < full.length; i++) {
              const f = full[i], c = document.createElement('canvas'); c.width = f.w; c.height = f.h; c.getContext('2d').drawImage(img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
              zip.file(baseName(file) + '-' + String(i + 1).padStart(2, '0') + '.' + ext, await toBlob(c, t));
            }
            downloadBlob(await zip.generateAsync({ type: 'blob' }), baseName(file) + '-grid-' + rows + 'x' + cols + '.zip');
            mountResult(body, 'Done — ' + full.length + ' tiles downloaded in one ZIP file.');
          } catch (e) { err(body, e.message || e); }
          btn.disabled = false;
        };
      }
      paint();
    }
  };
})();
