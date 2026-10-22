/* bg-remove-core.js — background removal in the visitor's browser, with permissively licensed models only.
 *   (one model for every photo: people, products, animals, logos)
 *   object : U²-Netp salient object segmentation (Apache-2.0, xuebinqin/U-2-Net) — /models/bg/u2netp.onnx (4.6 MB)
 * Runtime: onnxruntime-web (MIT) from jsDelivr. Licences: /models/bg/LICENSE-Apache-2.0.txt
 * Replaces @imgly/background-removal (AGPL-3.0).  API: window.BgRemove.cutout(fileOrImage, {mode:'person'|'object'}) →
 *   { canvas (RGBA cut-out, full size), mask (Uint8 alpha, full size), width, height }
 * Model files are cached by the browser (Cache Storage), so the ~5 MB comes down only once.
 */
(function () {
  'use strict';
  const ORT = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
  const MODELS = { person: '/models/bg/u2netp.onnx?v=1', object: '/models/bg/u2netp.onnx?v=1' };
  const CACHE = 'bg-models-v1';
  let ortP = null; const sess = {};

  function loadOrt() {
    if (window.ort && window.ort.InferenceSession) return Promise.resolve(window.ort);
    if (ortP) return ortP;
    ortP = new Promise(function (res, rej) {
      const s = document.createElement('script'); s.src = ORT + 'ort.wasm.min.js';
      s.onload = function () { try { window.ort.env.wasm.wasmPaths = ORT; window.ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1; res(window.ort); } catch (e) { rej(e); } };
      s.onerror = function () { ortP = null; rej(new Error('Could not load the AI engine — check your internet connection.')); };
      document.head.appendChild(s);
    });
    return ortP;
  }
  async function modelBytes(url, onProgress) {
    let cache = null;
    try { cache = await caches.open(CACHE); const hit = await cache.match(url); if (hit) return new Uint8Array(await hit.arrayBuffer()); } catch (e) { cache = null; }
    const r = await fetch(url); if (!r.ok) throw new Error('Could not download the AI model (HTTP ' + r.status + ').');
    const total = +r.headers.get('content-length') || 0; let got = 0; const parts = [];
    if (r.body && r.body.getReader) { const rd = r.body.getReader(); for (;;) { const x = await rd.read(); if (x.done) break; parts.push(x.value); got += x.value.length; if (onProgress && total) onProgress(got / total); } }
    else parts.push(new Uint8Array(await r.arrayBuffer()));
    const u = new Uint8Array(parts.reduce(function (a, p) { return a + p.length; }, 0)); let o = 0; parts.forEach(function (p) { u.set(p, o); o += p.length; });
    if (cache) { try { await cache.put(url, new Response(u.slice(0))); } catch (e) {} }
    return u;
  }
  async function session(mode, onProgress) {
    if (sess[mode]) return sess[mode];
    const ort = await loadOrt();
    const bytes = await modelBytes(MODELS[mode], onProgress);
    sess[mode] = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    return sess[mode];
  }
  async function toCanvas(src) {
    if (src instanceof HTMLCanvasElement) return src;
    let img = src;
    if (src instanceof Blob) { const u = URL.createObjectURL(src); img = new Image(); img.src = u; await img.decode(); setTimeout(function () { URL.revokeObjectURL(u); }, 3000); }
    const c = document.createElement('canvas'); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
    c.getContext('2d').drawImage(img, 0, 0); return c;
  }
  // model input: tensor [1,3,h,w] normalised with mean/std
  function tensorFrom(ort, cv, w, h, mean, std) {
    const t = document.createElement('canvas'); t.width = w; t.height = h;
    const g = t.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high'; g.drawImage(cv, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data, n = w * h, f = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) f[c * n + i] = (d[i * 4 + c] / 255 - mean[c]) / std[c];
    return new ort.Tensor('float32', f, [1, 3, h, w]);
  }
  // small matte → full-size alpha (bilinear), with a gentle contrast curve for clean edges
  function upscaleMask(m, mw, mh, W, H, lo, hi) {
    const out = new Uint8ClampedArray(W * H), sx = mw / W, sy = mh / H;
    for (let y = 0; y < H; y++) {
      const fy = Math.min(mh - 1, Math.max(0, (y + 0.5) * sy - 0.5)), y0 = Math.floor(fy), y1 = Math.min(mh - 1, y0 + 1), wy = fy - y0;
      for (let x = 0; x < W; x++) {
        const fx = Math.min(mw - 1, Math.max(0, (x + 0.5) * sx - 0.5)), x0 = Math.floor(fx), x1 = Math.min(mw - 1, x0 + 1), wx = fx - x0;
        const v = (m[y0 * mw + x0] * (1 - wx) + m[y0 * mw + x1] * wx) * (1 - wy) + (m[y1 * mw + x0] * (1 - wx) + m[y1 * mw + x1] * wx) * wy;
        out[y * W + x] = Math.round(Math.max(0, Math.min(1, (v - lo) / (hi - lo))) * 255);
      }
    }
    return out;
  }
  async function cutout(src, opts) {
    opts = opts || {};
    const mode = opts.mode === 'object' ? 'object' : 'person';
    const prog = opts.onProgress || function () {};
    const cv = await toCanvas(src), W = cv.width, H = cv.height;
    prog(0.05, 'Loading the AI model (first time ~5 MB)…');
    const s = await session(mode, function (p) { prog(0.05 + p * 0.45, 'Downloading the AI model… ' + Math.round(p * 100) + '%'); });
    const ort = window.ort;
    prog(0.55, 'Finding the ' + (mode === 'person' ? 'person' : 'subject') + '…');
    let mw, mh, input, mean, std;
    if (mode === 'person') { // MODNet: short side 512, both sides multiples of 32
      const k = 512 / Math.min(W, H); mw = Math.max(32, Math.round(W * k / 32) * 32); mh = Math.max(32, Math.round(H * k / 32) * 32);
      const big = Math.max(mw, mh); if (big > 1024) { const r = 1024 / big; mw = Math.max(32, Math.round(mw * r / 32) * 32); mh = Math.max(32, Math.round(mh * r / 32) * 32); }
      mean = [0.5, 0.5, 0.5]; std = [0.5, 0.5, 0.5];
    } else { mw = mh = 320; mean = [0.485, 0.456, 0.406]; std = [0.229, 0.224, 0.225]; }
    input = tensorFrom(ort, cv, mw, mh, mean, std);
    const feeds = {}; feeds[s.inputNames[0]] = input;
    const out = await s.run(feeds);
    const o = out[s.outputNames[0]]; let m = o.data;
    if (o.dims.length === 4 && o.dims[1] !== 1) m = m.subarray(0, mw * mh);
    if (mode === 'object') { // U²-Net output: normalise min..max
      let mn = Infinity, mx = -Infinity; for (let i = 0; i < m.length; i++) { if (m[i] < mn) mn = m[i]; if (m[i] > mx) mx = m[i]; }
      const r = (mx - mn) || 1, n = new Float32Array(m.length); for (let i = 0; i < m.length; i++) n[i] = (m[i] - mn) / r; m = n;
    }
    prog(0.85, 'Making the background transparent…');
    const alpha = mode === 'person' ? upscaleMask(m, mw, mh, W, H, 0.08, 0.92) : upscaleMask(m, mw, mh, W, H, 0.15, 0.85);
    const outC = document.createElement('canvas'); outC.width = W; outC.height = H;
    const g = outC.getContext('2d', { willReadFrequently: true }); g.drawImage(cv, 0, 0);
    const id = g.getImageData(0, 0, W, H); for (let i = 0; i < W * H; i++) id.data[i * 4 + 3] = alpha[i];
    g.putImageData(id, 0, 0);
    prog(1, 'Done');
    return { canvas: outC, mask: alpha, width: W, height: H, mode: mode };
  }
  async function cutoutBlob(src, opts) { const r = await cutout(src, opts); return await new Promise(function (res) { r.canvas.toBlob(res, 'image/png'); }); }
  window.BgRemove = { cutout: cutout, cutoutBlob: cutoutBlob, preload: function (m) { return session(m || 'person').catch(function () {}); } };
})();
