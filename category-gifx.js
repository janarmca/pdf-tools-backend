/* category-gifx.js — GIF tools + social media sizes (lazy-loaded, UPDATE_67). Browser only, nothing uploaded.
 *   gifmaker    — photos → animated GIF (order, speed, size, loop), live preview
 *   gifedit     — edit a GIF: resize, speed, reverse, boomerang, caption text, or save every frame (ZIP)
 *   socialresize — one picture → every social size (Instagram, WhatsApp status, YouTube thumbnail, Facebook, LinkedIn…) in a ZIP
 * GIF engine: /libs/gifkit.min.js (gifenc + gifuct-js, MIT). Host globals: TOOL_IMPL, el, mountResult, mountProgress,
 * downloadBlob, escapeHtml, loadScriptOnce, JSZip.
 */
(function () {
  'use strict';
  // social sizes (px). Instagram grid shows 3:4 since 2025, so 1080×1440 is offered next to 4:5.
  const SOCIAL = [
    ['ig-square', 'Instagram post — square', 1080, 1080], ['ig-portrait', 'Instagram post — portrait 4:5', 1080, 1350], ['ig-grid', 'Instagram post — 3:4 (new profile grid)', 1080, 1440],
    ['story', 'Instagram / Facebook Story, Reel, WhatsApp Status', 1080, 1920], ['yt-thumb', 'YouTube thumbnail', 1280, 720], ['yt-banner', 'YouTube channel banner', 2560, 1440],
    ['fb-post', 'Facebook post / link', 1200, 630], ['fb-cover', 'Facebook page cover', 1640, 624], ['li-post', 'LinkedIn post', 1200, 627], ['li-banner', 'LinkedIn banner', 1584, 396],
    ['x-post', 'X (Twitter) post', 1600, 900], ['x-header', 'X (Twitter) header', 1500, 500], ['wa-dp', 'WhatsApp / profile photo', 640, 640], ['pin', 'Pinterest pin', 1000, 1500]
  ];
  // frame timing: speed factor → new delays (GIF delay unit is 10 ms; browsers treat < 20 ms as 100 ms, so keep ≥ 20)
  function scaleDelays(delays, speed) { return delays.map(function (d) { return Math.max(20, Math.round((d || 100) / speed / 10) * 10); }); }
  function boomerang(list) { return list.concat(list.slice(1, -1).reverse()); }
  window.GifxCore = { SOCIAL: SOCIAL, scaleDelays: scaleDelays, boomerang: boomerang };
  if (typeof TOOL_IMPL === 'undefined') return;

  const fail = function (body, e) { const b = mountResult(body, 'Error: ' + escapeHtml(String(e && e.message || e))); b.style.background = '#FDEDEC'; };
  const kb = function (n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };
  const kit = function () { return window.GifKit ? Promise.resolve(window.GifKit) : loadScriptOnce('/libs/gifkit.min.js?v=1').then(function () { return window.GifKit; }); };
  async function loadImg(file) { const u = URL.createObjectURL(file); try { const im = new Image(); im.src = u; await im.decode(); return im; } catch (e) { throw new Error(file.name + ': this picture could not be opened.'); } }
  function picker(label, accept, multiple, onFiles) {
    const lab = el('<label class="drop tamil" style="cursor:pointer;"><div class="drop-icon">🎞️</div><div class="drop-title">' + label + '</div><span class="drop-btn">📁 Choose</span><input type="file" accept="' + accept + '" ' + (multiple ? 'multiple' : '') + ' style="position:absolute; width:1px; height:1px; opacity:0;"></label>');
    const inp = lab.querySelector('input'); inp.onchange = function () { const f = [].slice.call(inp.files || []); inp.value = ''; if (f.length) onFiles(f); };
    lab.addEventListener('dragover', function (e) { e.preventDefault(); }); lab.addEventListener('drop', function (e) { e.preventDefault(); const f = [].slice.call(e.dataTransfer.files || []); if (f.length) onFiles(f); });
    return lab;
  }
  // encode frames (canvases of the same size) to a GIF blob
  async function encodeGif(frames, delays, loop, onProg) {
    const K = await kit(), gif = K.GIFEncoder(), W = frames[0].width, H = frames[0].height;
    for (let i = 0; i < frames.length; i++) {
      const data = frames[i].getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
      const pal = K.quantize(data, 256, { format: 'rgb565' }), idx = K.applyPalette(data, pal, 'rgb565');
      gif.writeFrame(idx, W, H, { palette: pal, delay: delays[i], repeat: loop ? 0 : -1 });
      if (onProg) onProg((i + 1) / frames.length);
      if (i % 4 === 3) await new Promise(function (r) { setTimeout(r, 0); });
    }
    gif.finish();
    return new Blob([gif.bytes()], { type: 'image/gif' });
  }
  function fitDraw(g, img, W, H, mode, bg) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    g.fillStyle = bg || '#fff'; g.fillRect(0, 0, W, H);
    const k = mode === 'fill' ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih), w = iw * k, h = ih * k;
    g.imageSmoothingQuality = 'high'; g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  }
  function preview(body, blob, name, info) {
    const old = body.querySelector('[data-res]'); if (old) old.remove();
    const card = el('<div data-res style="margin-top:12px; padding:12px; border:1px solid var(--line); border-radius:12px; background:#F7FAF8; text-align:center;"><img style="max-width:100%; max-height:340px; border:1px solid var(--line); background:#fff;"><div style="margin:8px 0; font-weight:800; font-size:13px;"></div><button class="btn">⬇️ Download GIF</button></div>');
    card.querySelector('img').src = URL.createObjectURL(blob);
    card.querySelector('div').textContent = info + ' · ' + kb(blob.size);
    card.querySelector('button').onclick = function () { downloadBlob(blob, name); };
    body.appendChild(card);
  }

  /* ================================================================== PHOTOS → GIF */
  TOOL_IMPL.gifmaker = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      let imgs = [];
      function paint() {
        body.innerHTML = '';
        body.appendChild(picker(imgs.length ? '➕ Add more photos' : 'Choose 2 or more photos (JPG / PNG / WEBP)', 'image/*', true, async function (fl) { try { for (const f of fl) imgs.push({ img: await loadImg(f), name: f.name }); paint(); } catch (e) { fail(body, e); } }));
        if (!imgs.length) return;
        const strip = el('<div style="display:flex; gap:8px; overflow-x:auto; padding:8px 0;"></div>');
        imgs.forEach(function (x, i) {
          const c = el('<div style="flex:0 0 auto; width:92px; text-align:center; font-size:11px;"><img style="width:92px; height:70px; object-fit:cover; border-radius:8px; border:1px solid var(--line);"><div>' + (i + 1) + '</div><div style="display:flex; gap:2px; justify-content:center;"><button data-a="l" style="border:1px solid var(--line); background:#fff; border-radius:6px; cursor:pointer;">◀</button><button data-a="x" style="border:1px solid var(--line); background:#fff; border-radius:6px; cursor:pointer; color:#B3261E;">✕</button><button data-a="r" style="border:1px solid var(--line); background:#fff; border-radius:6px; cursor:pointer;">▶</button></div></div>');
          c.querySelector('img').src = x.img.src;
          c.querySelectorAll('button').forEach(function (b) { b.onclick = function () { const a = b.dataset.a; if (a === 'x') imgs.splice(i, 1); else { const j = a === 'l' ? i - 1 : i + 1; if (j >= 0 && j < imgs.length) { const t = imgs[i]; imgs[i] = imgs[j]; imgs[j] = t; } } paint(); }; });
          strip.appendChild(c);
        });
        body.appendChild(strip);
        body.appendChild(el(`<div class="opts">
          <div class="field"><label>Each photo shows for</label><select id="gmD"><option value="200">0.2 s (fast)</option><option value="500">0.5 s</option><option value="800" selected>0.8 s</option><option value="1200">1.2 s</option><option value="2000">2 s (slow)</option></select></div>
          <div class="field"><label>Size</label><select id="gmS"><option value="480x480">480 × 480 (square)</option><option value="640x640">640 × 640</option><option value="480x360">480 × 360 (wide)</option><option value="360x640">360 × 640 (tall, status)</option><option value="first">Same shape as the first photo (max 640)</option></select></div>
          <div class="field"><label>Fit</label><select id="gmF"><option value="fit">Whole photo (bars if needed)</option><option value="fill">Fill (edges cut)</option></select></div>
          <div class="field"><label>Bar colour</label><input id="gmB" type="color" value="#ffffff"></div>
          <div class="field-inline"><input type="checkbox" id="gmL" checked><label for="gmL">Play again and again (loop)</label></div>
          <div class="field-inline"><input type="checkbox" id="gmX"><label for="gmX">Smooth fade between photos</label></div>
        </div>`));
        const row = el('<div class="btn-row"><button class="btn">🎞️ Make GIF</button></div>'); row.firstChild.onclick = run; body.appendChild(row);
      }
      async function run() {
        if (imgs.length < 2) { fail(body, 'Add at least 2 photos.'); return; }
        const prog = mountProgress(body);
        try {
          const q = function (id) { return body.querySelector(id); };
          let W, H; if (q('#gmS').value === 'first') { const f = imgs[0].img, k = Math.min(1, 640 / Math.max(f.naturalWidth, f.naturalHeight)); W = Math.round(f.naturalWidth * k); H = Math.round(f.naturalHeight * k); } else { const p = q('#gmS').value.split('x'); W = +p[0]; H = +p[1]; }
          const mode = q('#gmF').value, bg = q('#gmB').value, d = +q('#gmD').value, fade = q('#gmX').checked;
          const frames = [], delays = [];
          const draw = function (img) { const c = document.createElement('canvas'); c.width = W; c.height = H; fitDraw(c.getContext('2d'), img, W, H, mode, bg); return c; };
          const base = imgs.map(function (x) { return draw(x.img); });
          base.forEach(function (c, i) {
            frames.push(c); delays.push(fade ? Math.max(100, d - 240) : d);
            if (fade) { const next = base[(i + 1) % base.length]; for (let s = 1; s <= 3; s++) { const m = document.createElement('canvas'); m.width = W; m.height = H; const g = m.getContext('2d'); g.drawImage(c, 0, 0); g.globalAlpha = s / 4; g.drawImage(next, 0, 0); frames.push(m); delays.push(80); } }
          });
          const blob = await encodeGif(frames, delays, q('#gmL').checked, function (p) { prog.set(10 + p * 85, 'Making the GIF… ' + Math.round(p * 100) + '%'); });
          prog.remove(); preview(body, blob, 'animation.gif', W + '×' + H + ', ' + frames.length + ' frames');
        } catch (e) { prog.remove(); fail(body, e); }
      }
      paint();
    }
  };

  /* ================================================================== EDIT A GIF */
  TOOL_IMPL.gifedit = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      let file = null, frames = null, delays = null, W = 0, H = 0;
      async function decode(buf) {
        const K = await kit(), gif = K.parseGIF(buf), parts = K.decompressFrames(gif, true);
        if (!parts.length) throw new Error('No frames found — is this really a GIF?');
        W = gif.lsd.width; H = gif.lsd.height;
        const full = document.createElement('canvas'); full.width = W; full.height = H; const g = full.getContext('2d', { willReadFrequently: true });
        const tmp = document.createElement('canvas'), tg = tmp.getContext('2d');
        const out = [], dl = []; let prev = null;
        parts.forEach(function (f) {
          const dims = f.dims;
          if (prev && prev.disposalType === 2) g.clearRect(prev.dims.left, prev.dims.top, prev.dims.width, prev.dims.height);
          if (prev && prev.disposalType === 3 && prev.saved) g.putImageData(prev.saved, 0, 0);
          if (f.disposalType === 3) f.saved = g.getImageData(0, 0, W, H);
          tmp.width = dims.width; tmp.height = dims.height;
          const id = tg.createImageData(dims.width, dims.height); id.data.set(f.patch); tg.putImageData(id, 0, 0);
          g.drawImage(tmp, dims.left, dims.top);
          const snap = document.createElement('canvas'); snap.width = W; snap.height = H; snap.getContext('2d').drawImage(full, 0, 0);
          out.push(snap); dl.push(f.delay || 100); prev = f;
        });
        return { out: out, dl: dl };
      }
      function paint() {
        body.innerHTML = '';
        if (!frames) {
          body.appendChild(picker('Choose a GIF', 'image/gif', false, async function (fl) {
            file = fl[0]; body.innerHTML = '<div class="note">⏳ Opening the GIF…</div>';
            try { const r = await decode(new Uint8Array(await file.arrayBuffer())); frames = r.out; delays = r.dl; paint(); } catch (e) { frames = null; paint(); fail(body, e); }
          }));
          return;
        }
        const total = delays.reduce(function (a, b) { return a + b; }, 0);
        body.appendChild(el('<div class="note">' + escapeHtml(file.name) + ' — ' + W + '×' + H + ', ' + frames.length + ' frames, ' + (total / 1000).toFixed(1) + ' s, ' + kb(file.size) + '</div>'));
        body.appendChild(el(`<div class="opts">
          <div class="field"><label>Width (px) — height follows</label><input id="geW" type="number" min="16" max="1600" value="${W}"></div>
          <div class="field"><label>Speed</label><select id="geS"><option value="0.5">0.5× (slower)</option><option value="0.75">0.75×</option><option value="1" selected>Same</option><option value="1.5">1.5×</option><option value="2">2× (faster)</option><option value="4">4×</option></select></div>
          <div class="field"><label>Play</label><select id="geP"><option value="n">Normal</option><option value="r">Reverse</option><option value="b">Boomerang (forward + back)</option></select></div>
          <div class="field"><label>Keep every</label><select id="geK"><option value="1">Every frame</option><option value="2">2nd frame (smaller file)</option><option value="3">3rd frame (much smaller)</option></select></div>
          <div class="field"><label>Caption text (optional)</label><input id="geT" placeholder="e.g. இனிய பொங்கல் வாழ்த்துகள்"></div>
          <div class="field"><label>Caption place</label><select id="geTP"><option value="b">Bottom</option><option value="t">Top</option></select></div>
        </div>`));
        const row = el('<div class="btn-row"><button class="btn">✅ Make new GIF</button><button class="btn secondary">🗂️ Save frames as PNG (ZIP)</button><button class="btn secondary">🔄 Other GIF</button></div>');
        const bs = row.querySelectorAll('button'); bs[0].onclick = run; bs[1].onclick = zipFrames; bs[2].onclick = function () { frames = null; paint(); };
        body.appendChild(row);
      }
      async function run() {
        const prog = mountProgress(body);
        try {
          const q = function (id) { return body.querySelector(id); };
          const nw = Math.max(16, Math.min(1600, +q('#geW').value || W)), nh = Math.max(1, Math.round(H * nw / W)), step = +q('#geK').value, txt = q('#geT').value.trim();
          let list = frames.map(function (c, i) { return { c: c, d: delays[i] }; }).filter(function (x, i) { return i % step === 0; });
          // dropped frames' time is given to the kept ones so the length stays the same
          list = list.map(function (x, k) { let d = 0; for (let j = k * step; j < Math.min(frames.length, k * step + step); j++) d += delays[j]; return { c: x.c, d: d }; });
          if (q('#geP').value === 'r') list.reverse(); else if (q('#geP').value === 'b') list = boomerang(list);
          const dl = scaleDelays(list.map(function (x) { return x.d; }), +q('#geS').value);
          const out = list.map(function (x) {
            const c = document.createElement('canvas'); c.width = nw; c.height = nh; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(x.c, 0, 0, nw, nh);
            if (txt) {
              let fs = Math.max(12, Math.round(nh * 0.09)); g.font = '800 ' + fs + 'px "Noto Sans Tamil", Arial, sans-serif';
              while (fs > 10 && g.measureText(txt).width > nw * 0.92) { fs--; g.font = '800 ' + fs + 'px "Noto Sans Tamil", Arial, sans-serif'; }
              const y = q('#geTP').value === 't' ? fs * 1.1 : nh - fs * 0.6;
              g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = Math.max(3, fs / 6); g.strokeStyle = '#000'; g.strokeText(txt, nw / 2, y); g.fillStyle = '#fff'; g.fillText(txt, nw / 2, y);
            }
            return c;
          });
          const blob = await encodeGif(out, dl, true, function (p) { prog.set(5 + p * 90, 'Making the GIF… ' + Math.round(p * 100) + '%'); });
          prog.remove(); preview(body, blob, file.name.replace(/\.gif$/i, '') + '-edited.gif', nw + '×' + nh + ', ' + out.length + ' frames');
        } catch (e) { prog.remove(); fail(body, e); }
      }
      async function zipFrames() {
        const prog = mountProgress(body);
        try {
          if (typeof JSZip === 'undefined') await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
          const z = new JSZip();
          for (let i = 0; i < frames.length; i++) { prog.set(5 + i / frames.length * 85, 'Frame ' + (i + 1)); const b = await new Promise(function (r) { frames[i].toBlob(r, 'image/png'); }); z.file('frame-' + String(i + 1).padStart(3, '0') + '.png', b); }
          downloadBlob(await z.generateAsync({ type: 'blob' }), file.name.replace(/\.gif$/i, '') + '-frames.zip');
          prog.remove(); mountResult(body, frames.length + ' frames saved.');
        } catch (e) { prog.remove(); fail(body, e); }
      }
      paint();
    }
  };

  /* ================================================================== SOCIAL MEDIA SIZES */
  TOOL_IMPL.socialresize = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      let img = null, name = 'picture', chosen = { 'ig-square': 1, 'ig-portrait': 1, story: 1, 'yt-thumb': 1, 'fb-post': 1, 'wa-dp': 1 };
      try { const s = JSON.parse(localStorage.getItem('pti-social-sizes') || 'null'); if (s) chosen = s; } catch (e) {}
      function paint() {
        body.innerHTML = '';
        if (!img) { body.appendChild(picker('Choose one picture — get it in every social media size', 'image/*', false, async function (fl) { try { img = await loadImg(fl[0]); name = fl[0].name.replace(/\.[^.]+$/, ''); paint(); } catch (e) { fail(body, e); } })); return; }
        body.appendChild(el(`<div class="opts">
          <div class="field"><label>When the shape is different</label><select id="srM"><option value="blur">Fill the sides with a blurred copy (looks pro)</option><option value="pad">Fill with a colour</option><option value="fill">Crop to fill (edges cut)</option></select></div>
          <div class="field"><label>Colour (for “fill with a colour”)</label><input id="srC" type="color" value="#ffffff"></div>
          <div class="field"><label>Format</label><select id="srF"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></div>
        </div>`));
        const grid = el('<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:8px; margin:8px 0; align-items:start;"></div>');
        SOCIAL.forEach(function (s) {
          const cell = el('<label style="border:1px solid var(--line); border-radius:10px; padding:6px; font-size:11.5px; cursor:pointer; background:#fff; display:block;"><canvas style="width:100%; display:block; border-radius:6px; background:#eee;"></canvas><div style="display:flex; gap:5px; align-items:flex-start; margin-top:5px;"><input type="checkbox"><span><b>' + escapeHtml(s[1]) + '</b><br>' + s[2] + '×' + s[3] + '</span></div></label>');
          const cb = cell.querySelector('input'); cb.checked = !!chosen[s[0]]; cb.onchange = function () { chosen[s[0]] = cb.checked; try { localStorage.setItem('pti-social-sizes', JSON.stringify(chosen)); } catch (e) {} };
          const c = cell.querySelector('canvas'), k = 240 / Math.max(s[2], s[3]); c.width = Math.round(s[2] * k); c.height = Math.round(s[3] * k); cell._c = c; cell._s = s;
          grid.appendChild(cell);
        });
        body.appendChild(grid);
        const redraw = function () { grid.querySelectorAll('label').forEach(function (cell) { render(cell._c, cell._c.width, cell._c.height); }); };
        body.querySelectorAll('#srM,#srC').forEach(function (x) { x.oninput = x.onchange = redraw; });
        redraw();
        const row = el('<div class="btn-row"><button class="btn">📦 Download selected (ZIP)</button><button class="btn secondary">🔄 Other picture</button></div>');
        row.children[0].onclick = run; row.children[1].onclick = function () { img = null; paint(); }; body.appendChild(row);
      }
      function render(c, W, H) {
        const g = c.getContext('2d'), mode = body.querySelector('#srM').value, col = body.querySelector('#srC').value;
        if (mode === 'fill') { fitDraw(g, img, W, H, 'fill', col); return; }
        if (mode === 'pad') { fitDraw(g, img, W, H, 'fit', col); return; }
        // blurred background: draw a small cover copy, scale it up (cheap blur that works everywhere), darken a little, then the whole picture on top
        const sm = document.createElement('canvas'); sm.width = Math.max(4, Math.round(W / 24)); sm.height = Math.max(4, Math.round(H / 24));
        fitDraw(sm.getContext('2d'), img, sm.width, sm.height, 'fill', '#000');
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(sm, 0, 0, W, H);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, W, H);
        const iw = img.naturalWidth, ih = img.naturalHeight, k = Math.min(W / iw, H / ih), w = iw * k, h = ih * k;
        g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      }
      async function run() {
        const list = SOCIAL.filter(function (s) { return chosen[s[0]]; });
        if (!list.length) { fail(body, 'Tick at least one size.'); return; }
        const prog = mountProgress(body);
        try {
          if (typeof JSZip === 'undefined') await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
          const type = body.querySelector('#srF').value, ext = type === 'image/png' ? 'png' : 'jpg', z = new JSZip();
          for (let i = 0; i < list.length; i++) {
            const s = list[i]; prog.set(5 + i / list.length * 85, s[1]);
            const c = document.createElement('canvas'); c.width = s[2]; c.height = s[3]; render(c, s[2], s[3]);
            const b = await new Promise(function (r) { c.toBlob(r, type, 0.9); });
            if (list.length === 1) { downloadBlob(b, name + '-' + s[0] + '.' + ext); prog.remove(); mountResult(body, 'Saved ' + s[1] + '.'); return; }
            z.file(name + '-' + s[0] + '-' + s[2] + 'x' + s[3] + '.' + ext, b);
          }
          downloadBlob(await z.generateAsync({ type: 'blob' }), name + '-social-sizes.zip');
          prog.remove(); mountResult(body, list.length + ' sizes saved in one ZIP.');
        } catch (e) { prog.remove(); fail(body, e); }
      }
      paint();
    }
  };
})();
