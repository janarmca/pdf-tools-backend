/* category-audio.js — lazy-loaded audio tools for pdftoolsindia.com (they appear in the Video & Audio category)
 *
 *   audiocut     — Audio Cutter / Ringtone Maker: waveform with two handles, keep or remove a part, fade in/out
 *   audioconvert — Audio Converter: MP3 / WAV / OGG / M4A, several files at once (video files too = Video → MP3)
 *   videotomp3   — Video to MP3: the converter, opened for videos
 *   audiomerge   — Merge / Join Audio: put several files one after another, gap or smooth cross-fade
 *   audioeffects — Volume & Effects: louder/softer, normalise, speed, reverse, mono, bass, fade, rumble filter
 *   voicerec     — Voice Recorder: microphone with level meter, pause, save as MP3 / WAV
 *
 * Everything runs in the visitor's browser (Web Audio API; MP3 by lamejs, OGG/M4A by WebCodecs) — nothing is uploaded.
 * Globals from the host page: TOOL_IMPL, el, mountUploader, mountFileList, mountProgress, mountResult, downloadBlob,
 * escapeHtml, loadScriptOnce. Pure helpers are exported on window.AudioCore for tests.
 */
(function () {
  'use strict';

  /* ===================================================================== pure helpers (also used by tests) */
  const clamp = function (v, a, b) { return Math.min(Math.max(v, a), b); };
  function parseT(str) {
    str = String(str == null ? '' : str).trim().replace(',', '.');
    if (!str) return NaN;
    const parts = str.split(':');
    if (parts.length > 3 || parts.some(function (p) { return !/^\d+(\.\d+)?$/.test(p.trim()); })) return NaN;
    return parts.reduce(function (acc, p) { return acc * 60 + parseFloat(p); }, 0);
  }
  function fmtT(s) {
    s = Math.max(0, s || 0);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s - h * 3600 - m * 60;
    const sec = (r < 10 ? '0' : '') + r.toFixed(1);
    return h ? h + ':' + (m < 10 ? '0' : '') + m + ':' + sec : m + ':' + sec;
  }
  // A tiny AudioBuffer-like value: {sampleRate, channels: Float32Array[]} — lets the maths run in tests without Web Audio.
  const len = function (b) { return b.channels[0].length; };
  const make = function (sr, nch, n) { const c = []; for (let i = 0; i < nch; i++) c.push(new Float32Array(n)); return { sampleRate: sr, channels: c }; };
  function slice(b, t0, t1) {
    const a = clamp(Math.round(t0 * b.sampleRate), 0, len(b)), z = clamp(Math.round(t1 * b.sampleRate), a, len(b));
    return { sampleRate: b.sampleRate, channels: b.channels.map(function (c) { return c.slice(a, z); }) };
  }
  function concat(list, gapSec, xfadeSec) {
    const sr = list[0].sampleRate, nch = Math.max.apply(null, list.map(function (b) { return b.channels.length; }));
    const gap = Math.round((gapSec || 0) * sr), xf = Math.round((xfadeSec || 0) * sr);
    let total = 0; list.forEach(function (b, i) { total += len(b); if (i) total += xf ? -Math.min(xf, len(b), len(list[i - 1])) : gap; });
    const out = make(sr, nch, Math.max(0, total));
    let pos = 0;
    list.forEach(function (b, i) {
      let ov = 0;
      if (i) { if (xf) ov = Math.min(xf, len(b), len(list[i - 1])); else pos += gap; }
      const start = pos - ov;
      for (let ch = 0; ch < nch; ch++) {
        const src = b.channels[Math.min(ch, b.channels.length - 1)], dst = out.channels[ch];
        for (let k = 0; k < src.length; k++) {
          if (k < ov) { const w = k / ov, j = start + k; dst[j] = dst[j] * (1 - w) + src[k] * w; } // equal-time cross-fade
          else dst[start + k] = src[k];
        }
      }
      pos = start + len(b);
    });
    return out;
  }
  function removePart(b, t0, t1) { return concat([slice(b, 0, t0), slice(b, t1, len(b) / b.sampleRate)], 0, 0); }
  function fade(b, inSec, outSec) {
    const n = len(b), fi = Math.min(n, Math.round((inSec || 0) * b.sampleRate)), fo = Math.min(n, Math.round((outSec || 0) * b.sampleRate));
    b.channels.forEach(function (c) {
      for (let i = 0; i < fi; i++) c[i] *= i / fi;
      for (let i = 0; i < fo; i++) c[n - 1 - i] *= i / fo;
    });
    return b;
  }
  function gain(b, g) { b.channels.forEach(function (c) { for (let i = 0; i < c.length; i++) c[i] = clamp(c[i] * g, -1, 1); }); return b; }
  function peak(b) { let p = 0; b.channels.forEach(function (c) { for (let i = 0; i < c.length; i++) { const v = Math.abs(c[i]); if (v > p) p = v; } }); return p; }
  function normalize(b, targetDb) { const p = peak(b); if (p < 1e-6) return b; return gain(b, Math.pow(10, (targetDb == null ? -1 : targetDb) / 20) / p); }
  function reverse(b) { b.channels.forEach(function (c) { c.reverse(); }); return b; }
  function toMono(b) {
    if (b.channels.length < 2) return b; const n = len(b), m = new Float32Array(n);
    b.channels.forEach(function (c) { for (let i = 0; i < n; i++) m[i] += c[i] / b.channels.length; });
    return { sampleRate: b.sampleRate, channels: [m] };
  }
  // 16-bit PCM WAV
  function wavBytes(b) {
    const nch = b.channels.length, n = len(b), sr = b.sampleRate, bytes = 44 + n * nch * 2, buf = new ArrayBuffer(bytes), v = new DataView(buf);
    const w = function (o, s) { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, bytes - 8, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, nch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * nch * 2, true); v.setUint16(32, nch * 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, n * nch * 2, true);
    let o = 44;
    for (let i = 0; i < n; i++) for (let ch = 0; ch < nch; ch++) { const s = clamp(b.channels[ch][i], -1, 1); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7FFF, true); o += 2; }
    return new Uint8Array(buf);
  }
  // peaks for drawing: [min,max] pairs per pixel column
  function peaks(b, cols) {
    const n = len(b), step = Math.max(1, Math.floor(n / cols)), out = [];
    for (let x = 0; x < cols; x++) {
      let mn = 1, mx = -1; const a = x * step, z = Math.min(n, a + step);
      for (let i = a; i < z; i += Math.max(1, Math.floor(step / 64))) { for (let ch = 0; ch < b.channels.length; ch++) { const s = b.channels[ch][i]; if (s < mn) mn = s; if (s > mx) mx = s; } }
      out.push(mn > mx ? [0, 0] : [mn, mx]);
    }
    return out;
  }
  window.AudioCore = { parseT: parseT, fmtT: fmtT, make: make, slice: slice, concat: concat, removePart: removePart, fade: fade, gain: gain, peak: peak, normalize: normalize, reverse: reverse, toMono: toMono, wavBytes: wavBytes, peaks: peaks };

  /* ===================================================================== browser glue */
  let actx = null;
  const ctx = function () { if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; actx = new AC(); } return actx; };
  const fromAB = function (ab) { const c = []; for (let i = 0; i < ab.numberOfChannels; i++) c.push(ab.getChannelData(i).slice()); return { sampleRate: ab.sampleRate, channels: c }; };
  const toAB = function (b) { const ab = ctx().createBuffer(b.channels.length, Math.max(1, len(b)), b.sampleRate); b.channels.forEach(function (c, i) { ab.copyToChannel(c, i); }); return ab; };
  const MAX_BYTES = 400 * 1024 * 1024;
  async function decode(file) {
    if (file.size > MAX_BYTES) throw new Error('This file is very large (' + Math.round(file.size / 1048576) + ' MB). Please use a file under 400 MB.');
    const data = await file.arrayBuffer();
    try { return fromAB(await ctx().decodeAudioData(data)); }
    catch (e) { throw new Error('Could not read the sound in “' + file.name + '”. Try MP3, WAV, M4A, OGG, or a video with sound.'); }
  }
  const baseName = function (f) { return (f.name || 'audio').replace(/\.[^.]+$/, ''); };
  const errBox = function (body, msg) { const b = mountResult(body, 'Error: ' + escapeHtml(String(msg))); b.style.background = '#FDEDEC'; return b; };
  const tick = function () { return new Promise(function (r) { setTimeout(r, 0); }); };

  // ---- encoders
  const LAME_URLS = ['https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js', 'https://unpkg.com/lamejs@1.2.1/lame.min.js'];
  async function ensureLame() {
    if (window.lamejs) return window.lamejs;
    for (const u of LAME_URLS) { try { await loadScriptOnce(u); if (window.lamejs) return window.lamejs; } catch (e) {} }
    throw new Error('Could not load the MP3 encoder — check your internet connection and try again.');
  }
  async function mp3Bytes(b, kbps, onP) {
    const lame = await ensureLame();
    if (b.channels.length > 2) b = { sampleRate: b.sampleRate, channels: b.channels.slice(0, 2) };
    const SR = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];
    if (SR.indexOf(b.sampleRate) < 0) b = await resample(b, 44100);
    const nch = b.channels.length, enc = new lame.Mp3Encoder(nch, b.sampleRate, kbps || 192), n = len(b), BL = 1152 * 20, parts = [];
    const L = new Int16Array(BL), R = new Int16Array(BL);
    for (let i = 0; i < n; i += BL) {
      const m = Math.min(BL, n - i);
      for (let k = 0; k < m; k++) { const l = clamp(b.channels[0][i + k], -1, 1); L[k] = l < 0 ? l * 0x8000 : l * 0x7FFF; if (nch > 1) { const r = clamp(b.channels[1][i + k], -1, 1); R[k] = r < 0 ? r * 0x8000 : r * 0x7FFF; } }
      const out = nch > 1 ? enc.encodeBuffer(L.subarray(0, m), R.subarray(0, m)) : enc.encodeBuffer(L.subarray(0, m));
      if (out.length) parts.push(new Uint8Array(out));
      if ((i / BL) % 8 === 0) { if (onP) onP(i / n); await tick(); }
    }
    const end = enc.flush(); if (end.length) parts.push(new Uint8Array(end));
    return new Blob(parts, { type: 'audio/mpeg' });
  }
  async function resample(b, sr) {
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, n = Math.ceil(len(b) * sr / b.sampleRate);
    const oc = new OC(b.channels.length, Math.max(1, n), sr), src = oc.createBufferSource(); src.buffer = toAB(b); src.connect(oc.destination); src.start();
    return fromAB(await oc.startRendering());
  }
  const MB_URL = 'https://cdn.jsdelivr.net/npm/mediabunny@1.61.0/dist/bundles/mediabunny.min.mjs';
  let mbP = null;
  const loadMB = function () { if (!('AudioEncoder' in window)) return Promise.resolve(null); if (!mbP) mbP = import(MB_URL).catch(function () { mbP = null; return null; }); return mbP; };
  async function canEncode(fmt) { const MB = await loadMB(); if (!MB) return false; try { return await MB.canEncodeAudio(fmt === 'm4a' ? 'aac' : 'opus'); } catch (e) { return false; } }
  async function webcodecsBytes(b, fmt, kbps, onP) {
    const MB = await loadMB(); if (!MB) throw new Error('This browser cannot make ' + fmt.toUpperCase() + ' files — choose MP3 or WAV.');
    const codec = fmt === 'm4a' ? 'aac' : 'opus';
    if (!(await MB.canEncodeAudio(codec))) throw new Error('This browser cannot make ' + fmt.toUpperCase() + ' files — choose MP3 or WAV.');
    if (codec === 'opus' && b.sampleRate !== 48000) b = await resample(b, 48000);
    const target = new MB.BufferTarget();
    const output = new MB.Output({ format: fmt === 'm4a' ? new MB.Mp4OutputFormat({ fastStart: 'in-memory' }) : new MB.OggOutputFormat(), target: target });
    const src = new MB.AudioBufferSource({ codec: codec, bitrate: (kbps || 160) * 1000 }); output.addAudioTrack(src);
    await output.start();
    const CH = b.sampleRate * 10; // feed 10 s at a time so the progress bar moves
    for (let i = 0; i < len(b); i += CH) { await src.add(toAB(slice(b, i / b.sampleRate, (i + CH) / b.sampleRate))); if (onP) onP(i / len(b)); }
    await output.finalize();
    return new Blob([target.buffer], { type: fmt === 'm4a' ? 'audio/mp4' : 'audio/ogg' });
  }
  const FORMATS = [['mp3', 'MP3'], ['wav', 'WAV (best quality)'], ['m4a', 'M4A / AAC'], ['ogg', 'OGG / Opus']];
  async function encode(b, fmt, kbps, prog, label) {
    const onP = function (p) { prog.set(55 + p * 40, (label || 'Saving') + ' ' + Math.round(p * 100) + '%'); };
    if (fmt === 'wav') return new Blob([wavBytes(b)], { type: 'audio/wav' });
    if (fmt === 'mp3') return await mp3Bytes(b, kbps, onP);
    return await webcodecsBytes(b, fmt, kbps, onP);
  }
  // format + bitrate picker; returns {get()} ; hides formats the browser cannot make
  function formatPicker(holder, defFmt) {
    const box = el('<div class="opts"><div class="field"><label>Save as</label><select class="ac-fmt">' + FORMATS.map(function (f) { return '<option value="' + f[0] + '"' + (f[0] === (defFmt || 'mp3') ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field ac-brf"><label>Quality</label><select class="ac-br"><option value="128">128 kbps — small file</option><option value="192" selected>192 kbps — good</option><option value="256">256 kbps — very good</option><option value="320">320 kbps — best MP3</option></select></div></div>');
    holder.appendChild(box);
    const fs = box.querySelector('.ac-fmt'), br = box.querySelector('.ac-br'), brf = box.querySelector('.ac-brf');
    const sync = function () { brf.style.display = fs.value === 'wav' ? 'none' : ''; }; fs.onchange = sync; sync();
    ['m4a', 'ogg'].forEach(function (f) { canEncode(f).then(function (ok) { if (!ok) { const o = fs.querySelector('option[value="' + f + '"]'); if (o) o.remove(); sync(); } }); });
    return { get: function () { return { fmt: fs.value, kbps: +br.value || 192 }; } };
  }
  const extFor = function (fmt) { return fmt === 'ogg' ? 'ogg' : fmt; };

  const STYLE_ID = 'ac-style';
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const st = document.createElement('style'); st.id = STYLE_ID;
    st.textContent = [
      '.ac-wave{position:relative;height:110px;margin:12px 4px 6px;border-radius:12px;background:#151a24;touch-action:none;user-select:none;-webkit-user-select:none}',
      '.ac-wave canvas{position:absolute;inset:0;width:100%;height:100%;border-radius:12px}',
      '.ac-dim{position:absolute;top:0;bottom:0;background:rgba(0,0,0,.6);pointer-events:none}',
      '.ac-sel{position:absolute;top:0;bottom:0;border-top:3px solid #F59F00;border-bottom:3px solid #F59F00;pointer-events:none}',
      '.ac-h{position:absolute;top:-4px;bottom:-4px;width:18px;margin-left:-9px;background:#F59F00;border-radius:7px;cursor:ew-resize;touch-action:none;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.4)}',
      '.ac-h:after{content:"";width:2px;height:26px;background:rgba(0,0,0,.45);border-radius:2px}',
      '.ac-head{position:absolute;top:-6px;bottom:-6px;width:2px;margin-left:-1px;background:#fff;pointer-events:none}',
      '.ac-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}',
      '.ac-time{display:flex;align-items:center;gap:6px;background:var(--chip,#F0F2F6);border-radius:12px;padding:6px 8px}',
      '.ac-time label{font-size:11.5px;font-weight:800;color:var(--sub,#6B7280)}',
      '.ac-time input{width:84px;border:1px solid var(--line,#E6E8EC);border-radius:8px;padding:6px;font:700 13px system-ui;text-align:center}',
      '.ac-mini{background:#fff;border:1px solid var(--line,#E6E8EC);border-radius:8px;padding:6px 9px;font-weight:800;cursor:pointer}',
      '.ac-chk{display:flex;gap:8px;align-items:flex-start;font-size:13px;margin-top:10px;line-height:1.4}',
      '.ac-chk small{display:block;color:var(--sub,#6B7280);font-size:11.5px}',
      '.ac-slider{display:flex;align-items:center;gap:10px;margin-top:12px;font-size:13px}',
      '.ac-slider b{min-width:120px}.ac-slider input{flex:1}.ac-slider span{min-width:58px;text-align:right;font-weight:800}',
      '.ac-meter{height:12px;border-radius:6px;background:#E9ECEF;overflow:hidden;margin:10px 0}.ac-meter i{display:block;height:100%;width:0;background:linear-gradient(90deg,#2F9E44,#F59F00,#E03131);transition:width .08s}',
      '.ac-rec{display:inline-block;width:12px;height:12px;border-radius:50%;background:#E03131;margin-right:6px;animation:acblink 1s infinite}',
      '@keyframes acblink{50%{opacity:.25}}'
    ].join('\n');
    document.head.appendChild(st);
  }
  function drawWave(canvas, buf) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.max(50, canvas.clientWidth), H = Math.max(40, canvas.clientHeight);
    canvas.width = W * dpr; canvas.height = H * dpr; const g = canvas.getContext('2d'); g.scale(dpr, dpr);
    g.fillStyle = '#151a24'; g.fillRect(0, 0, W, H);
    const pk = peaks(buf, Math.floor(W)), mid = H / 2;
    g.fillStyle = '#4DABF7';
    pk.forEach(function (p, x) { const y1 = mid - p[1] * mid * 0.95, y2 = mid - p[0] * mid * 0.95; g.fillRect(x, y1, 1, Math.max(1, y2 - y1)); });
  }
  const audioPlayer = function (blobOrUrl) { return el('<audio controls preload="auto" style="width:100%;margin-top:10px;" src="' + (typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl)) + '"></audio>'); };
  async function saveResult(body, buf, picker, name, label) {
    const prog = mountProgress(body);
    try {
      prog.set(50, (label || 'Saving') + '…');
      const o = picker.get(), blob = await encode(buf, o.fmt, o.kbps, prog, label);
      downloadBlob(blob, name + '.' + extFor(o.fmt)); prog.set(100, 'Done'); prog.remove();
      const r = mountResult(body, 'Done — ' + escapeHtml(name + '.' + extFor(o.fmt)) + ' downloaded (' + (blob.size / 1048576).toFixed(2) + ' MB).');
      r.insertAdjacentElement('afterend', audioPlayer(blob));
    } catch (e) { prog.remove(); errBox(body, e.message || e); }
  }

  /* ===================================================================== AUDIO CUTTER */
  TOOL_IMPL.audiocut = {
    mount: function (container) {
      ensureStyle();
      let file = null, buf = null, dur = 0, start = 0, end = 0, mode = 'keep', fin = 0, fout = 0, url = null;
      const body = el('<div></div>'); container.appendChild(body);
      function paint() {
        body.innerHTML = '';
        if (!buf) {
          mountUploader(body, {
            accept: 'audio/*,video/*', label: 'Drop a song, recording or video here, or tap to choose', sublabel: 'MP3 · WAV · M4A · OGG · AAC · FLAC · or a video — cut it in your browser, nothing is uploaded',
            onAdd: async function (fl) {
              file = fl[0]; body.innerHTML = '<div class="note">Reading the sound…</div>';
              try { buf = await decode(file); } catch (e) { buf = null; paint(); errBox(body, e.message); return; }
              dur = len(buf) / buf.sampleRate; start = 0; end = dur; if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(file); paint();
            }
          });
          return;
        }
        mountFileList(body, [file], function () { buf = null; file = null; paint(); });
        const player = el('<audio preload="auto" src="' + url + '"></audio>'); body.appendChild(player);
        const wave = el('<div class="ac-wave"><canvas></canvas><div class="ac-dim" id="acD1"></div><div class="ac-dim" id="acD2"></div><div class="ac-sel" id="acSel"></div><div class="ac-head" id="acHead"></div><div class="ac-h" id="acH1" aria-label="Start"></div><div class="ac-h" id="acH2" aria-label="End"></div></div>');
        body.appendChild(wave);
        const q = function (s) { return wave.querySelector(s); }, H1 = q('#acH1'), H2 = q('#acH2'), D1 = q('#acD1'), D2 = q('#acD2'), SEL = q('#acSel'), HEAD = q('#acHead');
        requestAnimationFrame(function () { drawWave(wave.querySelector('canvas'), buf); });
        const pct = function (t) { return (t / dur * 100) + '%'; };
        const bar = el('<div class="ac-row"></div>'); body.appendChild(bar);
        const mk = function (label) { const b = el('<div class="ac-time"><label>' + label + '</label><button class="ac-mini" data-a="-">−0.1</button><input type="text" inputmode="decimal" aria-label="' + label + '"><button class="ac-mini" data-a="+">+0.1</button><button class="ac-mini" data-a="now">⏺ now</button></div>'); bar.appendChild(b); return b; };
        const bS = mk('Start'), bE = mk('End'), inS = bS.querySelector('input'), inE = bE.querySelector('input');
        const info = el('<div class="note" style="margin-top:10px;"></div>'); body.appendChild(info);
        function layout() {
          H1.style.left = pct(start); H2.style.left = pct(end); D1.style.left = '0'; D1.style.width = pct(start);
          D2.style.left = pct(end); D2.style.width = (100 - end / dur * 100) + '%'; SEL.style.left = pct(start); SEL.style.width = ((end - start) / dur * 100) + '%';
          inS.value = fmtT(start); inE.value = fmtT(end);
          info.innerHTML = (mode === 'keep' ? 'Keeping' : 'Removing') + ' <b>' + fmtT(end - start) + '</b> · result <b>' + fmtT(mode === 'keep' ? end - start : dur - (end - start)) + '</b> of ' + fmtT(dur);
        }
        const setStart = function (t) { start = clamp(t, 0, end - 0.05); layout(); };
        const setEnd = function (t) { end = clamp(t, start + 0.05, dur); layout(); };
        [[H1, setStart], [H2, setEnd]].forEach(function (p) {
          const h = p[0], fn = p[1];
          h.addEventListener('pointerdown', function (e) { h.setPointerCapture(e.pointerId); h._d = true; e.preventDefault(); e.stopPropagation(); });
          h.addEventListener('pointermove', function (e) { if (!h._d) return; const r = wave.getBoundingClientRect(); fn(clamp((e.clientX - r.left) / r.width, 0, 1) * dur); });
          const up = function () { h._d = false; }; h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
        });
        wave.addEventListener('pointerdown', function (e) { if (e.target === H1 || e.target === H2) return; const r = wave.getBoundingClientRect(); player.currentTime = clamp((e.clientX - r.left) / r.width, 0, 1) * dur; HEAD.style.left = pct(player.currentTime); });
        player.addEventListener('timeupdate', function () {
          HEAD.style.left = pct(player.currentTime);
          if (mode === 'keep' && !player.paused && player.currentTime >= end) player.pause();
          if (mode === 'remove' && !player.paused && player.currentTime >= start && player.currentTime < end) player.currentTime = end;
        });
        [[bS, setStart, function () { return start; }], [bE, setEnd, function () { return end; }]].forEach(function (p) {
          p[0].addEventListener('click', function (e) { const a = e.target.getAttribute && e.target.getAttribute('data-a'); if (!a) return; if (a === 'now') p[1](player.currentTime); else p[1](p[2]() + (a === '+' ? 0.1 : -0.1)); });
          p[0].querySelector('input').addEventListener('change', function (e) { const v = parseT(e.target.value); if (isNaN(v)) layout(); else p[1](v); });
        });
        const pr = el('<div class="ac-row"><button class="btn secondary" id="acPlay">▶ Play selection</button><button class="btn secondary" id="acStop">⏸ Pause</button></div>'); body.appendChild(pr);
        pr.querySelector('#acPlay').onclick = function () { player.currentTime = mode === 'remove' ? Math.max(0, start - 2) : start; player.play(); };
        pr.querySelector('#acStop').onclick = function () { player.pause(); };
        const modeRow = el('<div class="filter-row" style="margin-top:12px;flex-wrap:wrap;"><button class="filter-chip ' + (mode === 'keep' ? 'active' : '') + '" data-m="keep">✂️ Keep the selected part</button><button class="filter-chip ' + (mode === 'remove' ? 'active' : '') + '" data-m="remove">🗑️ Remove the selected part</button></div>');
        modeRow.addEventListener('click', function (e) { const b = e.target.closest('[data-m]'); if (!b) return; mode = b.getAttribute('data-m'); [].forEach.call(modeRow.children, function (c) { c.classList.toggle('active', c === b); }); layout(); });
        body.appendChild(modeRow);
        const fd = el('<div class="opts"><div class="field"><label>Fade in (seconds)</label><select id="acFi"><option value="0">None</option><option value="0.5">0.5 s</option><option value="1">1 s</option><option value="2">2 s</option><option value="3">3 s</option><option value="5">5 s</option></select></div><div class="field"><label>Fade out (seconds)</label><select id="acFo"><option value="0">None</option><option value="0.5">0.5 s</option><option value="1">1 s</option><option value="2">2 s</option><option value="3">3 s</option><option value="5">5 s</option></select></div></div>');
        body.appendChild(fd); fd.querySelector('#acFi').value = String(fin); fd.querySelector('#acFo').value = String(fout);
        fd.addEventListener('change', function () { fin = +fd.querySelector('#acFi').value; fout = +fd.querySelector('#acFo').value; });
        const picker = formatPicker(body, 'mp3');
        body.appendChild(el('<div class="note">Ringtone tip: keep 20–30 seconds, add a 1 s fade in and out, save as MP3 (Android) or M4A (iPhone needs it renamed to .m4r and added through iTunes/Finder).</div>'));
        const row = el('<div class="btn-row"></div>'); const btn = el('<button class="btn">✂️ Cut & download</button>'); row.appendChild(btn); body.appendChild(row);
        btn.onclick = function () {
          let out = mode === 'keep' ? slice(buf, start, end) : removePart(buf, start, end);
          if (len(out) < 10) { errBox(body, 'Nothing would be left — choose a different part.'); return; }
          if (fin || fout) out = fade(out, fin, fout);
          saveResult(body, out, picker, baseName(file) + '-cut', 'Saving');
        };
        layout();
      }
      paint();
    }
  };

  /* ===================================================================== AUDIO CONVERTER (+ Video to MP3) */
  function converter(container, forVideo) {
    ensureStyle();
    let files = [];
    const body = el('<div></div>'); container.appendChild(body);
    function paint() {
      body.innerHTML = '';
      mountUploader(body, {
        accept: forVideo ? 'video/*,audio/*' : 'audio/*,video/*', multiple: true,
        label: forVideo ? 'Drop one or more videos here, or tap to choose' : 'Drop audio files (or videos) here, or tap to choose',
        sublabel: forVideo ? 'MP4 · MOV · WEBM · MKV — the sound is taken out as MP3 / WAV / M4A' : 'MP3 · WAV · M4A · AAC · OGG · FLAC · OPUS · or a video',
        onAdd: function (fl) { files = files.concat([].slice.call(fl)); paint(); }
      });
      if (!files.length) return;
      mountFileList(body, files, function (i) { files.splice(typeof i === 'number' ? i : files.indexOf(i), 1); paint(); });
      const picker = formatPicker(body, 'mp3');
      const o = el('<div><label class="ac-chk"><input type="checkbox" id="acMono"><span>Make it mono<small>Half the size; good for voice recordings and calls</small></span></label><label class="ac-chk"><input type="checkbox" id="acNorm"><span>Make the volume even (normalise)<small>Raises quiet recordings so the loudest part is just below the maximum</small></span></label></div>');
      body.appendChild(o);
      const row = el('<div class="btn-row"></div>'); const btn = el('<button class="btn">🎵 Convert & download</button>'); row.appendChild(btn); body.appendChild(row);
      btn.onclick = async function () {
        btn.disabled = true; const prog = mountProgress(body); let done = 0;
        try {
          for (let i = 0; i < files.length; i++) {
            const f = files[i]; prog.set(5, 'Reading ' + (i + 1) + ' / ' + files.length + ': ' + f.name);
            let b = await decode(f);
            if (o.querySelector('#acMono').checked) b = toMono(b);
            if (o.querySelector('#acNorm').checked) b = normalize(b, -1);
            const s = picker.get(), blob = await encode(b, s.fmt, s.kbps, prog, 'Converting ' + (i + 1) + ' / ' + files.length);
            downloadBlob(blob, baseName(f) + '.' + extFor(s.fmt)); done++;
            if (i < files.length - 1) await new Promise(function (r) { setTimeout(r, 400); }); // browsers block many downloads at the same instant
          }
          prog.remove(); mountResult(body, 'Done — ' + done + ' file' + (done > 1 ? 's' : '') + ' converted and downloaded.');
        } catch (e) { prog.remove(); errBox(body, (done ? done + ' file(s) done. ' : '') + (e.message || e)); }
        btn.disabled = false;
      };
    }
    paint();
  }
  TOOL_IMPL.audioconvert = { mount: function (c) { converter(c, false); } };
  TOOL_IMPL.videotomp3 = { mount: function (c) { converter(c, true); } };

  /* ===================================================================== MERGE AUDIO */
  TOOL_IMPL.audiomerge = {
    mount: function (container) {
      ensureStyle();
      let files = [], join = 'none', sec = 1;
      const body = el('<div></div>'); container.appendChild(body);
      function paint() {
        body.innerHTML = '';
        mountUploader(body, { accept: 'audio/*,video/*', multiple: true, label: 'Drop the audio files to join, or tap to choose', sublabel: 'They are joined in the order shown — use the arrows to change the order', onAdd: function (fl) { files = files.concat([].slice.call(fl)); paint(); } });
        if (!files.length) return;
        mountFileList(body, files, function (i) { files.splice(typeof i === 'number' ? i : files.indexOf(i), 1); paint(); }, function (i, d) { const j = i + d; if (j < 0 || j >= files.length) return; const t = files[i]; files[i] = files[j]; files[j] = t; paint(); });
        const jr = el('<div class="filter-row" style="margin-top:12px;flex-wrap:wrap;"></div>');
        [['none', 'Back to back'], ['gap', 'Silence between'], ['xfade', 'Smooth cross-fade']].forEach(function (j) { jr.appendChild(el('<button class="filter-chip ' + (join === j[0] ? 'active' : '') + '" data-j="' + j[0] + '">' + j[1] + '</button>')); });
        jr.addEventListener('click', function (e) { const b = e.target.closest('[data-j]'); if (!b) return; join = b.getAttribute('data-j'); paint(); });
        body.appendChild(jr);
        if (join !== 'none') { const s = el('<div class="ac-slider"><b>' + (join === 'gap' ? 'Silence' : 'Cross-fade') + '</b><input type="range" min="0.2" max="5" step="0.1" value="' + sec + '"><span>' + sec + ' s</span></div>'); body.appendChild(s); const r = s.querySelector('input'); r.oninput = function () { sec = +r.value; s.querySelector('span').textContent = sec + ' s'; }; }
        const picker = formatPicker(body, 'mp3');
        const row = el('<div class="btn-row"></div>'); const btn = el('<button class="btn">🔗 Join & download</button>'); row.appendChild(btn); body.appendChild(row);
        btn.onclick = async function () {
          if (files.length < 2) { errBox(body, 'Add at least two files to join.'); return; }
          btn.disabled = true; const prog = mountProgress(body);
          try {
            const list = [];
            for (let i = 0; i < files.length; i++) { prog.set(5 + 40 * i / files.length, 'Reading ' + (i + 1) + ' / ' + files.length); let b = await decode(files[i]); list.push(b); }
            const sr = list[0].sampleRate; for (let i = 0; i < list.length; i++) if (list[i].sampleRate !== sr) list[i] = await resample(list[i], sr);
            const nch = Math.max.apply(null, list.map(function (b) { return b.channels.length; }));
            const out = concat(list.map(function (b) { return b.channels.length === nch ? b : { sampleRate: b.sampleRate, channels: Array.from({ length: nch }, function (_, i) { return b.channels[Math.min(i, b.channels.length - 1)]; }) }; }), join === 'gap' ? sec : 0, join === 'xfade' ? sec : 0);
            prog.remove(); await saveResult(body, out, picker, 'joined-audio', 'Joining');
          } catch (e) { prog.remove(); errBox(body, e.message || e); }
          btn.disabled = false;
        };
      }
      paint();
    }
  };

  /* ===================================================================== VOLUME & EFFECTS */
  TOOL_IMPL.audioeffects = {
    mount: function (container) {
      ensureStyle();
      let file = null, buf = null;
      const st = { vol: 100, norm: false, speed: 1, rev: false, mono: false, bass: 0, treble: 0, fin: 0, fout: 0, rumble: false };
      const body = el('<div></div>'); container.appendChild(body);
      async function render(b) {
        // speed, bass, treble and the rumble filter are done by the browser's audio engine (OfflineAudioContext)
        let out = b;
        if (st.speed !== 1 || st.bass || st.treble || st.rumble) {
          const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, n = Math.ceil(len(b) / st.speed);
          const oc = new OC(b.channels.length, Math.max(1, n), b.sampleRate), src = oc.createBufferSource(); src.buffer = toAB(b); src.playbackRate.value = st.speed;
          let node = src;
          if (st.rumble) { const hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 80; node.connect(hp); node = hp; }
          if (st.bass) { const ls = oc.createBiquadFilter(); ls.type = 'lowshelf'; ls.frequency.value = 200; ls.gain.value = st.bass; node.connect(ls); node = ls; }
          if (st.treble) { const hs = oc.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 3500; hs.gain.value = st.treble; node.connect(hs); node = hs; }
          node.connect(oc.destination); src.start(); out = fromAB(await oc.startRendering());
        } else out = { sampleRate: b.sampleRate, channels: b.channels.map(function (c) { return c.slice(); }) };
        if (st.mono) out = toMono(out);
        if (st.rev) reverse(out);
        if (st.vol !== 100) gain(out, st.vol / 100);
        if (st.norm) normalize(out, -1);
        if (st.fin || st.fout) fade(out, st.fin, st.fout);
        return out;
      }
      function slider(label, key, min, max, step, fmt) {
        const s = el('<div class="ac-slider"><b>' + label + '</b><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + st[key] + '"><span>' + fmt(st[key]) + '</span></div>');
        const r = s.querySelector('input'); r.oninput = function () { st[key] = +r.value; s.querySelector('span').textContent = fmt(st[key]); }; return s;
      }
      function paint() {
        body.innerHTML = '';
        if (!buf) {
          mountUploader(body, { accept: 'audio/*,video/*', label: 'Drop a song, recording or video here, or tap to choose', sublabel: 'Make it louder or softer, change speed, add bass, fade, reverse…',
            onAdd: async function (fl) { file = fl[0]; body.innerHTML = '<div class="note">Reading the sound…</div>'; try { buf = await decode(file); } catch (e) { buf = null; paint(); errBox(body, e.message); return; } paint(); } });
          return;
        }
        mountFileList(body, [file], function () { buf = null; file = null; paint(); });
        body.appendChild(el('<div class="note">Length ' + fmtT(len(buf) / buf.sampleRate) + ' · ' + buf.channels.length + ' channel' + (buf.channels.length > 1 ? 's' : '') + ' · ' + buf.sampleRate + ' Hz</div>'));
        body.appendChild(slider('🔊 Volume', 'vol', 0, 300, 5, function (v) { return v + '%'; }));
        body.appendChild(slider('⏩ Speed', 'speed', 0.5, 2, 0.05, function (v) { return v.toFixed(2) + '×'; }));
        body.appendChild(el('<div class="note" style="margin-top:6px;">Speed also changes the pitch (higher when faster), like playing a tape faster.</div>'));
        body.appendChild(slider('🥁 Bass', 'bass', -12, 15, 1, function (v) { return (v > 0 ? '+' : '') + v + ' dB'; }));
        body.appendChild(slider('🎶 Treble', 'treble', -12, 12, 1, function (v) { return (v > 0 ? '+' : '') + v + ' dB'; }));
        body.appendChild(slider('🌅 Fade in', 'fin', 0, 10, 0.5, function (v) { return v + ' s'; }));
        body.appendChild(slider('🌇 Fade out', 'fout', 0, 10, 0.5, function (v) { return v + ' s'; }));
        const ck = el('<div>' +
          '<label class="ac-chk"><input type="checkbox" data-k="norm"' + (st.norm ? ' checked' : '') + '><span>Normalise — make the loudest part just below maximum<small>Good for quiet phone recordings</small></span></label>' +
          '<label class="ac-chk"><input type="checkbox" data-k="rumble"' + (st.rumble ? ' checked' : '') + '><span>Remove low rumble / fan hum<small>Cuts sounds below 80 Hz (wind, table knocks, AC hum)</small></span></label>' +
          '<label class="ac-chk"><input type="checkbox" data-k="mono"' + (st.mono ? ' checked' : '') + '><span>Mono</span></label>' +
          '<label class="ac-chk"><input type="checkbox" data-k="rev"' + (st.rev ? ' checked' : '') + '><span>Reverse (play backwards)</span></label></div>');
        ck.addEventListener('change', function (e) { const k = e.target.getAttribute('data-k'); if (k) st[k] = e.target.checked; });
        body.appendChild(ck);
        const picker = formatPicker(body, 'mp3');
        const row = el('<div class="btn-row"><button class="btn secondary" id="aePrev">▶ Preview 15 s</button><button class="btn" id="aeGo">🎛️ Apply & download</button></div>'); body.appendChild(row);
        let prevSrc = null;
        row.querySelector('#aePrev').onclick = async function () {
          try { if (prevSrc) { try { prevSrc.stop(); } catch (e) {} } const part = slice(buf, 0, Math.min(15, len(buf) / buf.sampleRate)); const r = await render(part); const c = ctx(); if (c.state === 'suspended') await c.resume(); prevSrc = c.createBufferSource(); prevSrc.buffer = toAB(r); prevSrc.connect(c.destination); prevSrc.start(); }
          catch (e) { errBox(body, e.message || e); }
        };
        row.querySelector('#aeGo').onclick = async function () { const prog = mountProgress(body); prog.set(20, 'Applying effects…'); try { const out = await render(buf); prog.remove(); await saveResult(body, out, picker, baseName(file) + '-edited', 'Saving'); } catch (e) { prog.remove(); errBox(body, e.message || e); } };
      }
      paint();
    }
  };

  /* ===================================================================== VOICE RECORDER */
  TOOL_IMPL.voicerec = {
    mount: function (container) {
      ensureStyle();
      const body = el('<div></div>'); container.appendChild(body);
      const ok = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
      let stream = null, rec = null, chunks = [], t0 = 0, paused = 0, pauseAt = 0, timer = null, raf = 0, blob = null, an = null, srcNode = null;
      const stopAll = function () { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; clearInterval(timer); cancelAnimationFrame(raf); try { if (srcNode) srcNode.disconnect(); } catch (e) {} };
      function paint() {
        body.innerHTML = '';
        if (!ok) { body.appendChild(el('<div class="note" style="background:#FFF4E5;">This browser cannot record from the microphone. Please use a recent Chrome, Edge, Firefox or Safari.</div>')); return; }
        if (blob) return showResult();
        body.appendChild(el('<div class="note">Record your voice with the phone or computer microphone. The recording stays on your device.</div>'));
        const o = el('<div><label class="ac-chk"><input type="checkbox" id="vrNs" checked><span>Reduce background noise and echo<small>Turn this off for recording music or instruments</small></span></label></div>'); body.appendChild(o);
        const row = el('<div class="btn-row"><button class="btn">🎙️ Start recording</button></div>'); body.appendChild(row);
        row.querySelector('button').onclick = function () { start(o.querySelector('#vrNs').checked); };
      }
      async function start(ns) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: ns, noiseSuppression: ns, autoGainControl: ns } });
          const c = ctx(); if (c.state === 'suspended') await c.resume();
          an = c.createAnalyser(); an.fftSize = 1024; srcNode = c.createMediaStreamSource(stream); srcNode.connect(an);
          const mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'].filter(function (m) { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } })[0];
          rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); chunks = [];
          rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
          rec.onstop = function () { blob = new Blob(chunks, { type: (rec.mimeType || 'audio/webm').split(';')[0] }); stopAll(); paint(); };
          rec.start(500); t0 = Date.now(); paused = 0; showRecording();
        } catch (e) {
          stopAll(); paint();
          body.appendChild(el('<div class="note" style="background:#FDEDEC;">' + (e && e.name === 'NotAllowedError' ? 'Microphone permission was not given. Allow the microphone for this site (lock icon in the address bar) and try again.' : 'Could not start: ' + escapeHtml(e && e.message || String(e))) + '</div>'));
        }
      }
      function showRecording() {
        body.innerHTML = '';
        body.appendChild(el('<div style="text-align:center;padding:20px 10px 6px;"><div id="vrT" style="font-size:36px;font-weight:900;font-variant-numeric:tabular-nums;">0:00</div><div style="margin-top:6px;font-weight:700;"><span class="ac-rec"></span><span id="vrS">Recording…</span></div></div>'));
        const meter = el('<div class="ac-meter"><i></i></div>'); body.appendChild(meter);
        const row = el('<div class="btn-row" style="justify-content:center;"><button class="btn secondary" id="vrP">⏸ Pause</button><button class="btn" id="vrX">⏹ Stop</button></div>'); body.appendChild(row);
        const tEl = body.querySelector('#vrT'), sEl = body.querySelector('#vrS'), bar = meter.querySelector('i'), data = new Uint8Array(an.fftSize);
        timer = setInterval(function () { const ms = (rec.state === 'paused' ? pauseAt : Date.now()) - t0 - paused, s = Math.floor(ms / 1000); tEl.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }, 250);
        const loop = function () { an.getByteTimeDomainData(data); let p = 0; for (let i = 0; i < data.length; i++) p = Math.max(p, Math.abs(data[i] - 128)); bar.style.width = Math.min(100, p / 128 * 140) + '%'; raf = requestAnimationFrame(loop); }; loop();
        row.querySelector('#vrP').onclick = function (e) {
          if (rec.state === 'recording') { rec.pause(); pauseAt = Date.now(); e.target.textContent = '▶ Resume'; sEl.textContent = 'Paused'; }
          else if (rec.state === 'paused') { rec.resume(); paused += Date.now() - pauseAt; e.target.textContent = '⏸ Pause'; sEl.textContent = 'Recording…'; }
        };
        row.querySelector('#vrX').onclick = function () { if (rec && rec.state !== 'inactive') rec.stop(); };
      }
      function showResult() {
        body.innerHTML = '';
        body.appendChild(audioPlayer(blob));
        const picker = formatPicker(body, 'mp3');
        const row = el('<div class="btn-row"><button class="btn" id="vrSave">⬇ Save</button><button class="btn secondary" id="vrAgain">🎙️ Record again</button></div>'); body.appendChild(row);
        row.querySelector('#vrSave').onclick = async function () {
          const f = new File([blob], 'recording.' + (/mp4/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm'), { type: blob.type });
          try { const b = await decode(f); await saveResult(body, b, picker, 'voice-recording-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'), 'Saving'); }
          catch (e) { downloadBlob(blob, f.name); mountResult(body, 'Saved the original recording (' + f.name + ').'); }
        };
        row.querySelector('#vrAgain').onclick = function () { blob = null; paint(); };
      }
      paint();
    }
  };

  /* ===================================================================== DSP: time-stretch (WSOLA), FFT, noise reduction */
  // WSOLA time-stretch: makes audio longer/shorter WITHOUT changing pitch. ratio > 1 = longer (slower).
  function wsola(b, ratio) {
    const n = len(b), N = 2048, Hs = 1024, Ha = Hs / ratio, outLen = Math.max(1, Math.round(n * ratio)), tol = 384, D = 4;
    const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    const mono = new Float32Array(n); b.channels.forEach(function (c) { for (let i = 0; i < n; i++) mono[i] += c[i] / b.channels.length; });
    const out = b.channels.map(function () { return new Float32Array(outLen + N); }), norm = new Float32Array(outLen + N);
    let prev = 0; // input position of the previous chosen frame
    for (let k = 0, op = 0; op < outLen; k++, op += Hs) {
      const ideal = Math.round(k * Ha);
      let best = ideal;
      if (k > 0) { // choose the offset whose start best continues the previous frame (natural continuation = prev + Hs)
        const nat = prev + Hs; let bc = -Infinity;
        for (let d = -tol; d <= tol; d += 2) {
          const s = ideal + d; if (s < 0 || s + N >= n) continue;
          let c = 0; for (let i = 0; i < N / 2; i += D) { const a = nat + i < n ? mono[nat + i] : 0; c += a * mono[s + i]; }
          if (c > bc) { bc = c; best = s; }
        }
      }
      best = clamp(best, 0, Math.max(0, n - 1)); prev = best;
      for (let ch = 0; ch < out.length; ch++) { const src = b.channels[ch], dst = out[ch]; for (let i = 0; i < N && best + i < n; i++) dst[op + i] += src[best + i] * win[i]; }
      for (let i = 0; i < N; i++) norm[op + i] += win[i];
    }
    return { sampleRate: b.sampleRate, channels: out.map(function (c) { const r = new Float32Array(outLen); for (let i = 0; i < outLen; i++) r[i] = norm[i] > 1e-3 ? c[i] / norm[i] : 0; return r; }) };
  }
  function fft(re, im) { // in-place radix-2
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let size = 2; size <= n; size <<= 1) {
      const ang = -2 * Math.PI / size, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let s = 0; s < n; s += size) { let cr = 1, ci = 0; for (let k = 0; k < size / 2; k++) { const a = s + k, c = a + size / 2, tr = re[c] * cr - im[c] * ci, ti = re[c] * ci + im[c] * cr; re[c] = re[a] - tr; im[c] = im[a] - ti; re[a] += tr; im[a] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
    }
  }
  // spectral subtraction: learns the background noise from the quietest moments, then lowers it everywhere
  async function denoise(b, strength, onP) {
    const N = 2048, H = 512, n = len(b), win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = Math.sqrt(0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
    const frames = Math.max(1, Math.ceil((n - N) / H) + 1), re = new Float32Array(N), im = new Float32Array(N);
    const olaK = 2 * H / N; // sqrt-Hann analysis × synthesis = Hann; Hann windows at hop N/4 add up to N/(2H)
    const out = [];
    for (let ch = 0; ch < b.channels.length; ch++) {
      const x = b.channels[ch], mags = [], energy = new Float32Array(frames);
      for (let f = 0; f < frames; f++) { const o = f * H; let e = 0; for (let i = 0; i < N; i++) { const v = o + i < n ? x[o + i] : 0; e += v * v; } energy[f] = e; }
      const order = Array.from(energy.keys()).sort(function (a, c) { return energy[a] - energy[c]; }).slice(0, Math.max(3, Math.round(frames * 0.1)));
      const noise = new Float32Array(N / 2 + 1);
      order.forEach(function (f) { const o = f * H; for (let i = 0; i < N; i++) { re[i] = (o + i < n ? x[o + i] : 0) * win[i]; im[i] = 0; } fft(re, im); for (let k = 0; k <= N / 2; k++) noise[k] += Math.hypot(re[k], im[k]) / order.length; });
      const y = new Float32Array(n + N), k1 = 1 + strength * 2.5, floor = 0.08;
      for (let f = 0; f < frames; f++) {
        const o = f * H;
        for (let i = 0; i < N; i++) { re[i] = (o + i < n ? x[o + i] : 0) * win[i]; im[i] = 0; }
        fft(re, im);
        for (let k = 0; k <= N / 2; k++) { const m = Math.hypot(re[k], im[k]), g = m > 1e-9 ? Math.max(floor, (m - k1 * noise[k]) / m) : 0; re[k] *= g; im[k] *= g; if (k > 0 && k < N / 2) { re[N - k] = re[k]; im[N - k] = -im[k]; } }
        for (let i = 0; i < N; i++) im[i] = -im[i]; fft(re, im); // inverse FFT via conjugation
        for (let i = 0; i < N; i++) y[o + i] += (re[i] / N) * win[i] * olaK; // olaK undoes the window overlap gain
        if (f % 200 === 0) { if (onP) onP((ch + f / frames) / b.channels.length); await tick(); }
      }
      out.push(y.subarray(0, n).slice());
    }
    return { sampleRate: b.sampleRate, channels: out };
  }
  // RBJ biquad low-pass (used twice = 24 dB/octave) to keep only the bass from the centre channel
  function lowpass(x, sr, fc) {
    const w0 = 2 * Math.PI * fc / sr, al = Math.sin(w0) / (2 * 0.7071), cw = Math.cos(w0), a0 = 1 + al;
    const b0 = (1 - cw) / 2 / a0, b1 = (1 - cw) / a0, b2 = b0, a1 = -2 * cw / a0, a2 = (1 - al) / a0, y = new Float32Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
    return y;
  }
  function vocalRemove(b, keep) {
    if (b.channels.length < 2) throw new Error('This file is mono (one channel). Vocal removal needs a stereo song where the singer is in the centre.');
    const L = b.channels[0], R = b.channels[1], n = L.length, sr = b.sampleRate, mid = new Float32Array(n), side = new Float32Array(n);
    for (let i = 0; i < n; i++) { mid[i] = (L[i] + R[i]) / 2; side[i] = (L[i] - R[i]) / 2; }
    const bass = lowpass(lowpass(mid, sr, 140), sr, 140), oL = new Float32Array(n), oR = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      if (keep) { oL[i] = oR[i] = mid[i] - bass[i] - side[i] * 0.5; } // rough “vocals only”: centre minus bass minus the wide instruments
      else { oL[i] = side[i] + bass[i]; oR[i] = -side[i] + bass[i]; } // karaoke: centre removed, bass kept
    }
    return { sampleRate: sr, channels: [oL, oR] };
  }
  Object.assign(window.AudioCore, { wsola: wsola, fft: fft, vocalRemove: vocalRemove, denoise: denoise });

  /* ---------------------------------------------------------------- "keep it as a video" for any of these tools */
  const isVideoFile = function (f) { return f && (/^video\//.test(f.type) || /\.(mp4|mov|m4v|webm|mkv|avi|3gp)$/i.test(f.name || '')); };
  async function muxIntoVideo(videoFile, buf, prog) {
    prog.set(55, 'Putting the new sound into the video…');
    const eng = await ensureFFmpeg(), ff = eng.ffmpeg, ext = ((videoFile.name || '').split('.').pop() || 'mp4').toLowerCase();
    await ff.writeFile('vin.' + ext, await eng.fetchFile(videoFile)); await ff.writeFile('ain.wav', wavBytes(buf));
    const run = function (v) { return ff.exec(['-i', 'vin.' + ext, '-i', 'ain.wav', '-map', '0:v:0', '-map', '1:a:0'].concat(v, ['-c:a', 'aac', '-b:a', '192k', '-shortest', 'vout.mp4'])); };
    let code = /^(mp4|m4v|mov)$/.test(ext) ? await run(['-c:v', 'copy']) : 1;
    if (code !== 0) { try { await ff.deleteFile('vout.mp4'); } catch (e) {} code = await run(['-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p']); }
    if (code !== 0) throw new Error('Could not rebuild the video — the cleaned sound can still be saved as audio.');
    const data = await ff.readFile('vout.mp4');
    ['vin.' + ext, 'ain.wav', 'vout.mp4'].forEach(function (x) { try { ff.deleteFile(x); } catch (e) {} });
    return new Blob([data], { type: 'video/mp4' });
  }
  function keepVideoBox(body, file) {
    if (!isVideoFile(file)) return { get: function () { return false; } };
    const b = el('<label class="ac-chk"><input type="checkbox" checked><span>Save as a video (keep the picture, replace the sound)<small>Untick to save only the sound as MP3 / WAV</small></span></label>'); body.appendChild(b);
    return { get: function () { return b.querySelector('input').checked; } };
  }
  async function finish(body, file, buf, picker, keep, suffix, label) {
    if (!keep.get()) return saveResult(body, buf, picker, baseName(file) + '-' + suffix, label);
    const prog = mountProgress(body);
    try { const v = await muxIntoVideo(file, buf, prog); downloadBlob(v, baseName(file) + '-' + suffix + '.mp4'); prog.remove(); mountResult(body, 'Done — video with the new sound downloaded (' + (v.size / 1048576).toFixed(1) + ' MB).'); }
    catch (e) { prog.remove(); errBox(body, e.message || e); }
  }
  // common "open one file → controls → preview 15 s → apply" shell
  function singleFileTool(container, opts) {
    ensureStyle();
    let file = null, buf = null;
    const body = el('<div></div>'); container.appendChild(body);
    let prevSrc = null;
    function paint() {
      body.innerHTML = '';
      if (opts.intro) body.appendChild(el('<div class="note">' + opts.intro + '</div>'));
      if (!buf) {
        mountUploader(body, { accept: 'audio/*,video/*', label: 'Drop a song, recording or video here, or tap to choose', sublabel: opts.sub || 'MP3 · WAV · M4A · OGG · or a video',
          onAdd: async function (fl) { file = fl[0]; body.innerHTML = '<div class="note">Reading the sound…</div>'; try { buf = await decode(file); } catch (e) { buf = null; paint(); errBox(body, e.message); return; } paint(); } });
        return;
      }
      mountFileList(body, [file], function () { buf = null; file = null; paint(); });
      body.appendChild(el('<div class="note">Length ' + fmtT(len(buf) / buf.sampleRate) + ' · ' + buf.channels.length + ' channel' + (buf.channels.length > 1 ? 's' : '') + '</div>'));
      opts.controls(body);
      const keep = keepVideoBox(body, file), picker = formatPicker(body, 'mp3');
      const row = el('<div class="btn-row"><button class="btn secondary">▶ Preview 15 s</button><button class="btn">' + (opts.button || 'Apply & download') + '</button></div>'); body.appendChild(row);
      const [bp, bg] = row.querySelectorAll('button');
      bp.onclick = async function () {
        try { if (prevSrc) { try { prevSrc.stop(); } catch (e) {} } const part = slice(buf, 0, Math.min(15, len(buf) / buf.sampleRate)); const r = await opts.process(part, function () {}); const c = ctx(); if (c.state === 'suspended') await c.resume(); prevSrc = c.createBufferSource(); prevSrc.buffer = toAB(r); prevSrc.connect(c.destination); prevSrc.start(); }
        catch (e) { errBox(body, e.message || e); }
      };
      bg.onclick = async function () {
        bg.disabled = true; const prog = mountProgress(body); prog.set(10, 'Working…');
        try { const out = await opts.process(buf, function (p) { prog.set(10 + p * 40, 'Working… ' + Math.round(p * 100) + '%'); }); prog.remove(); await finish(body, file, out, picker, keep, opts.suffix, 'Saving'); }
        catch (e) { prog.remove(); errBox(body, e.message || e); }
        bg.disabled = false;
      };
    }
    paint();
  }
  function rangeRow(holder, label, min, max, step, val, fmt, on) {
    const s = el('<div class="ac-slider"><b>' + label + '</b><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"><span>' + fmt(val) + '</span></div>');
    const r = s.querySelector('input'); r.oninput = function () { on(+r.value); s.querySelector('span').textContent = fmt(+r.value); }; holder.appendChild(s); return s;
  }

  /* ===================================================================== CHANGE PITCH / SPEED (independently) */
  TOOL_IMPL.audiopitch = {
    mount: function (container) {
      const st = { speed: 1, semis: 0 };
      singleFileTool(container, {
        intro: 'Change the <b>speed without changing the voice</b>, or the <b>pitch (voice higher / lower) without changing the speed</b> — or both.', suffix: 'pitch-speed', button: '🎚️ Apply & download',
        controls: function (b) {
          rangeRow(b, '⏩ Speed', 0.5, 2, 0.05, st.speed, function (v) { return v.toFixed(2) + '×'; }, function (v) { st.speed = v; });
          rangeRow(b, '🎵 Pitch', -12, 12, 1, st.semis, function (v) { return (v > 0 ? '+' : '') + v + ' semitone' + (Math.abs(v) === 1 ? '' : 's'); }, function (v) { st.semis = v; });
          b.appendChild(el('<div class="note" style="margin-top:6px;">+12 = one octave higher (child / cartoon voice) · −5 = deeper voice · speed 0.75× = slower for learning a song.</div>'));
        },
        process: async function (b) {
          const p = Math.pow(2, st.semis / 12);
          if (Math.abs(p - 1) < 1e-3 && Math.abs(st.speed - 1) < 1e-3) return b;
          let x = b;
          if (Math.abs(p - 1) > 1e-3) { // resample (changes pitch AND length), then stretch the length back
            const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, n = Math.ceil(len(b) / p);
            const oc = new OC(b.channels.length, Math.max(1, n), b.sampleRate), src = oc.createBufferSource(); src.buffer = toAB(b); src.playbackRate.value = p; src.connect(oc.destination); src.start();
            x = fromAB(await oc.startRendering());
          }
          return wsola(x, p / st.speed);
        }
      });
    }
  };

  /* ===================================================================== EQUALIZER */
  const BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const EQ_PRESETS = { 'Flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'Bass boost': [7, 6, 5, 2, 0, 0, 0, 0, 0, 0], 'Voice clarity': [-6, -4, -2, 0, 1, 3, 4, 3, 1, 0], 'Podcast / speech': [-8, -5, -1, 1, 2, 3, 3, 2, 0, -2], 'Treble boost': [0, 0, 0, 0, 0, 1, 3, 5, 6, 6], 'Telephone': [-12, -12, -8, 0, 4, 6, 4, 0, -12, -12], 'Music (V-shape)': [5, 4, 2, 0, -2, -2, 0, 2, 4, 5] };
  TOOL_IMPL.audioeq = {
    mount: function (container) {
      let g = EQ_PRESETS['Flat'].slice();
      singleFileTool(container, {
        intro: '10-band equaliser — boost or cut bass, voice and treble. Pick a preset or move the sliders.', suffix: 'eq', button: '🎛️ Apply EQ & download',
        controls: function (b) {
          const pr = el('<div class="filter-row" style="margin-top:8px;flex-wrap:wrap;"></div>'); b.appendChild(pr);
          const holder = el('<div></div>'); b.appendChild(holder);
          const draw = function () { holder.innerHTML = ''; BANDS.forEach(function (f, i) { rangeRow(holder, (f >= 1000 ? f / 1000 + ' kHz' : f + ' Hz'), -12, 12, 1, g[i], function (v) { return (v > 0 ? '+' : '') + v + ' dB'; }, function (v) { g[i] = v; }); }); };
          Object.keys(EQ_PRESETS).forEach(function (k) { const c = el('<button class="filter-chip">' + k + '</button>'); c.onclick = function () { g = EQ_PRESETS[k].slice(); [].forEach.call(pr.children, function (x) { x.classList.toggle('active', x === c); }); draw(); }; pr.appendChild(c); });
          draw();
        },
        process: async function (b) {
          const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, oc = new OC(b.channels.length, Math.max(1, len(b)), b.sampleRate), src = oc.createBufferSource(); src.buffer = toAB(b);
          let node = src;
          BANDS.forEach(function (f, i) { if (!g[i] || f >= b.sampleRate / 2) return; const q = oc.createBiquadFilter(); q.type = i === 0 ? 'lowshelf' : i === BANDS.length - 1 ? 'highshelf' : 'peaking'; q.frequency.value = f; q.Q.value = 1.1; q.gain.value = g[i]; node.connect(q); node = q; });
          const lim = oc.createDynamicsCompressor(); lim.threshold.value = -1; lim.ratio.value = 20; lim.attack.value = 0.003; lim.release.value = 0.1; node.connect(lim); lim.connect(oc.destination); // stop boosts from clipping
          src.start(); return fromAB(await oc.startRendering());
        }
      });
    }
  };

  /* ===================================================================== VOCAL REMOVER / KARAOKE */
  TOOL_IMPL.vocalremove = {
    mount: function (container) {
      let keep = false;
      singleFileTool(container, {
        intro: 'Make a <b>karaoke track</b> (singer removed) or an approximate <b>vocals-only</b> track from a stereo song or a music video. Works best on studio songs where the voice is in the centre; it cannot separate a mono recording (that needs AI).', suffix: 'karaoke', button: '🎤 Process & download',
        controls: function (b) {
          const m = el('<div class="filter-row" style="margin-top:8px;flex-wrap:wrap;"><button class="filter-chip active" data-k="0">🎶 Remove vocals (karaoke)</button><button class="filter-chip" data-k="1">🗣️ Keep vocals only (rough)</button></div>');
          m.onclick = function (e) { const c = e.target.closest('[data-k]'); if (!c) return; keep = c.getAttribute('data-k') === '1'; [].forEach.call(m.children, function (x) { x.classList.toggle('active', x === c); }); };
          b.appendChild(m);
        },
        process: async function (b) { const r = vocalRemove(b, keep); return peak(r) > 1 ? normalize(r, -1) : r; } // never boost what is left — only stop clipping
      });
    }
  };

  /* ===================================================================== NOISE REDUCTION */
  TOOL_IMPL.audiodenoise = {
    mount: function (container) {
      const st = { strength: 0.6, rumble: true };
      singleFileTool(container, {
        intro: 'Lower steady background noise — fan, AC hum, hiss, traffic rumble — in a voice recording or a video. It learns the noise from the quietest moments, so start or end your recording with 1–2 seconds of silence for the best result.', suffix: 'clean', button: '🧹 Clean & download',
        controls: function (b) {
          rangeRow(b, '🧹 Strength', 0.1, 1, 0.05, st.strength, function (v) { return Math.round(v * 100) + '%'; }, function (v) { st.strength = v; });
          const c = el('<label class="ac-chk"><input type="checkbox" checked><span>Also cut low rumble below 80 Hz</span></label>'); c.querySelector('input').onchange = function (e) { st.rumble = e.target.checked; }; b.appendChild(c);
        },
        process: async function (b, onP) {
          let x = b;
          if (st.rumble) { const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, oc = new OC(b.channels.length, Math.max(1, len(b)), b.sampleRate), src = oc.createBufferSource(); src.buffer = toAB(b); const hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 80; src.connect(hp); hp.connect(oc.destination); src.start(); x = fromAB(await oc.startRendering()); }
          return await denoise(x, st.strength, onP);
        }
      });
    }
  };

  /* ===================================================================== TEXT TO SPEECH (AI voice, credits) */
  // Gemini TTS voices (gender as listed in Google's voice table)
  const TTS_VOICES = [
    ['Kore', '👩 Female', 'Kore — firm'], ['Aoede', '👩 Female', 'Aoede — breezy'], ['Leda', '👩 Female', 'Leda — youthful'], ['Sulafat', '👩 Female', 'Sulafat — warm'],
    ['Zephyr', '👩 Female', 'Zephyr — bright'], ['Gacrux', '👩 Female', 'Gacrux — mature'], ['Vindemiatrix', '👩 Female', 'Vindemiatrix — gentle'], ['Despina', '👩 Female', 'Despina — smooth'],
    ['Puck', '👨 Male', 'Puck — upbeat'], ['Charon', '👨 Male', 'Charon — informative'], ['Orus', '👨 Male', 'Orus — firm'], ['Achird', '👨 Male', 'Achird — friendly'],
    ['Fenrir', '👨 Male', 'Fenrir — excitable'], ['Iapetus', '👨 Male', 'Iapetus — clear'], ['Algieba', '👨 Male', 'Algieba — smooth'], ['Sadaltager', '👨 Male', 'Sadaltager — knowledgeable']
  ];
  // credits per 1,000 characters: 2× what Google charges us (their TTS price doubles on 1 Jan 2027) — same rule in the Worker
  const ttsRate = function () { return Date.now() >= Date.UTC(2026, 11, 31, 18, 30) ? 3 : 2; };
  const TTS_STYLES = [['', 'Normal'], ['calm and clear', 'Calm & clear'], ['cheerful and friendly', 'Cheerful'], ['news reader', 'News reader'], ['storytelling, expressive', 'Story telling'], ['slow and clear for students', 'Slow, for students'], ['respectful announcement', 'Announcement']];
  function b64ToBytes(b64) { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  function findAudio(j) { // Interactions API: steps[].content[] {type:'audio', data, mime_type} · generateContent: candidates[0].content.parts[].inlineData
    try { const steps = j.steps || j.outputs || []; for (let i = steps.length - 1; i >= 0; i--) { const c = steps[i].content || []; for (let k = c.length - 1; k >= 0; k--) if (c[k] && (c[k].type === 'audio' || c[k].data) && c[k].data) return { data: c[k].data, mime: c[k].mime_type || c[k].mimeType || '' }; } } catch (e) {}
    try { const parts = j.candidates[0].content.parts; for (let i = 0; i < parts.length; i++) { const d = parts[i].inlineData || parts[i].inline_data; if (d && d.data) return { data: d.data, mime: d.mimeType || d.mime_type || '' }; } } catch (e) {}
    if (j.output_audio && j.output_audio.data) return { data: j.output_audio.data, mime: j.output_audio.mime_type || '' };
    return null;
  }
  async function audioToBuf(a) {
    const bytes = b64ToBytes(a.data);
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return fromAB(await ctx().decodeAudioData(bytes.buffer.slice(0)));
    const rate = +((/rate=(\d+)/.exec(a.mime) || [])[1] || 24000), n = bytes.length >> 1, dv = new DataView(bytes.buffer), c = new Float32Array(n); // raw 16-bit little-endian PCM
    for (let i = 0; i < n; i++) c[i] = dv.getInt16(i * 2, true) / 32768;
    return { sampleRate: rate, channels: [c] };
  }
  /* ===================================================================== AI TRANSCRIBE / SUBTITLES */
  // audio or video → mono 16 kHz MP3 at 32 kbps (≈ 4 KB per second, so the server knows the length from the size) →
  // Gemini writes the text (with [mm:ss] times) or SRT subtitles. 1 credit per 2 minutes (min 2).
  const sttCost = function (sec) { return Math.max(2, Math.ceil(sec / 120)); };
  function parseSrt(t) {
    return String(t).replace(/\r/g, '').split(/\n\s*\n/).map(function (b) {
      const m = /(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*\n([\s\S]*)/.exec(b.trim());
      return m ? { a: m[1].replace('.', ','), b: m[2].replace('.', ','), t: m[3].trim() } : null;
    }).filter(Boolean);
  }
  TOOL_IMPL.aitranscribe = {
    mount: function (container) {
      ensureStyle();
      let file = null, buf = null, dur = 0;
      const body = el('<div></div>'); container.appendChild(body);
      function paint() {
        body.innerHTML = '';
        body.appendChild(el('<div class="note">🎙️ Interview, class, speech, YouTube video, voice note… → <b>typed text</b> or <b>subtitles (SRT)</b> in Tamil, English, Hindi and more, by Google Gemini AI. Costs <b>1 credit per 2 minutes</b> (minimum 2) — shown before you start, refunded if it fails. Up to about 60 minutes per file.</div>'));
        mountUploader(body, { accept: 'audio/*,video/*', label: 'Drop an audio or video file, or tap to choose', sublabel: 'MP3 · M4A · WAV · OGG · MP4 · MOV · WEBM',
          onAdd: async function (fl) {
            file = fl[0]; body.innerHTML = '<div class="note">Reading the sound…</div>';
            try { buf = await decode(file); dur = len(buf) / buf.sampleRate; } catch (e) { file = null; buf = null; paint(); errBox(body, e.message); return; }
            paint();
          } });
        if (!file || !buf) return;
        mountFileList(body, [file], function () { file = null; buf = null; paint(); });
        if (dur > 62 * 60) { errBox(body, 'This is ' + fmtT(dur) + ' long — please cut it into parts of up to 60 minutes (Audio Cutter).'); return; }
        const cost = sttCost(dur);
        const o = el('<div class="opts"><div class="field"><label>Spoken language</label><select id="sttL"><option value="auto">Detect automatically</option><option value="Tamil">தமிழ் (Tamil)</option><option value="English">English</option><option value="Hindi">हिन्दी (Hindi)</option><option value="Malayalam">Malayalam</option><option value="Telugu">Telugu</option><option value="Kannada">Kannada</option></select></div>' +
          '<div class="field"><label>Output</label><select id="sttF"><option value="text">Text with time stamps</option><option value="srt">Subtitles (.srt) for videos</option></select></div></div>');
        body.appendChild(o);
        body.appendChild(el('<div class="note">Length <b>' + fmtT(dur) + '</b> · cost <b>' + cost + ' credits</b></div>'));
        const row = el('<div class="btn-row"><button class="btn">🤖 Make text (' + cost + ' credits)</button></div>'); body.appendChild(row);
        const out = el('<div></div>'); body.appendChild(out);
        row.querySelector('button').onclick = async function () {
          if (!(await confirmCreditSpend(body, cost + ' credits'))) return;
          const btn = this; btn.disabled = true; out.innerHTML = ''; const prog = mountProgress(body);
          try {
            prog.set(5, 'Preparing the sound…');
            let mono = buf.channels.length > 1 ? { sampleRate: buf.sampleRate, channels: [buf.channels[0].map(function (v, i) { let t = 0; for (let c = 0; c < buf.channels.length; c++) t += buf.channels[c][i]; return t / buf.channels.length; })] } : buf;
            mono = await resample(mono, 16000);
            const mp3 = await mp3Bytes(mono, 32, function (p) { prog.set(5 + p * 35, 'Compressing the sound… ' + Math.round(p * 100) + '%'); });
            prog.set(45, 'AI is listening… (about 1 minute for every 10 minutes of audio)');
            const f = new FormData();
            f.append('file', new File([mp3], 'audio.mp3', { type: 'audio/mpeg' }));
            f.append('lang', o.querySelector('#sttL').value); f.append('format', o.querySelector('#sttF').value);
            const r = await fetch(APP_CONFIG.BACKEND_URL + '/api/ai/transcribe', { method: 'POST', headers: { Authorization: 'Bearer ' + authState.session.access_token }, body: f });
            const j = await r.json().catch(function () { return {}; });
            if (!r.ok || j.error) throw new Error(j.error || ('Error ' + r.status));
            prog.remove();
            try { if (typeof refreshProfile === 'function') refreshProfile(); } catch (e) {}
            const isSrt = j.format === 'srt', cues = isSrt ? parseSrt(j.text) : [];
            const ta = el('<textarea lang="ta" rows="14" style="width:100%;margin-top:10px;padding:12px;border:1px solid var(--line);border-radius:12px;font:inherit;font-size:14px;line-height:1.6"></textarea>');
            ta.value = j.text; out.appendChild(ta);
            out.appendChild(el('<div class="note">' + (isSrt ? cues.length + ' subtitle lines' : 'Text ready') + ' — you can correct it here before saving. AI can mishear names; please check.</div>'));
            const r2 = el('<div class="btn-row"><button class="btn secondary" data-a="copy">📋 Copy</button><button class="btn" data-a="dl">⬇️ Download ' + (isSrt ? '.srt' : '.txt') + '</button>' + (isSrt ? '<button class="btn secondary" data-a="vid">💬 Put on a video</button>' : '') + '</div>');
            out.appendChild(r2);
            r2.querySelector('[data-a=copy]').onclick = function () { try { navigator.clipboard.writeText(ta.value); this.textContent = '✅ Copied'; } catch (e) { ta.select(); document.execCommand('copy'); } };
            r2.querySelector('[data-a=dl]').onclick = function () { downloadBlob(new Blob([ta.value], { type: isSrt ? 'application/x-subrip' : 'text/plain' }), baseName(file) + (isSrt ? '.srt' : '.txt')); };
            const v = r2.querySelector('[data-a=vid]'); if (v) v.onclick = function () { try { downloadBlob(new Blob([ta.value], { type: 'application/x-subrip' }), baseName(file) + '.srt'); } catch (e) {} openTool('videosubtitle'); };
          } catch (e) { prog.remove(); errBox(body, (e && e.message) || e); }
          btn.disabled = false;
        };
      }
      paint();
    }
  };

  TOOL_IMPL.texttospeech = {
    mount: function (container) {
      ensureStyle();
      const body = el('<div></div>'); container.appendChild(body);
      const rate = ttsRate();
      body.innerHTML = '<div class="note">Type or paste text in <b>Tamil, English, Hindi</b> or 100+ languages → a natural AI voice (choose 👩 female or 👨 male) → download MP3 / WAV. Costs <b>' + rate + ' credits per 1,000 characters</b> — asked only when you press “AI voice file” (refunded if it fails). “Listen free” uses your phone\'s own voice and cannot be downloaded.</div>';
      const ta = el('<textarea lang="ta" rows="7" maxlength="4000" style="width:100%;margin-top:10px;padding:12px;border:1px solid var(--line);border-radius:12px;font:inherit;font-size:15px;line-height:1.6" placeholder="எ.கா. அனைவருக்கும் வணக்கம்! இன்று நாம் ஒரு புதிய பாடத்தைக் கற்போம்."></textarea>'); body.appendChild(ta);
      const cnt = el('<div class="note" style="margin-top:6px"></div>'); body.appendChild(cnt);
      const voiceOpts = ['👩 Female', '👨 Male'].map(function (g) { return '<optgroup label="' + g + '">' + TTS_VOICES.filter(function (v) { return v[1] === g; }).map(function (v) { return '<option value="' + v[0] + '">' + v[1].slice(0, 2) + ' ' + v[2] + '</option>'; }).join('') + '</optgroup>'; }).join('');
      const o = el('<div class="opts"><div class="field"><label>Voice</label><div class="filter-row" id="ttsG" style="margin:0 0 6px"><button type="button" class="filter-chip active" data-g="👩 Female">👩 Female</button><button type="button" class="filter-chip" data-g="👨 Male">👨 Male</button></div><select id="ttsV">' + voiceOpts + '</select></div><div class="field"><label>Style</label><select id="ttsS">' + TTS_STYLES.map(function (v) { return '<option value="' + v[0] + '">' + v[1] + '</option>'; }).join('') + '</select></div></div>'); body.appendChild(o);
      const vSel = o.querySelector('#ttsV');
      const syncG = function () { const v = TTS_VOICES.filter(function (x) { return x[0] === vSel.value; })[0]; o.querySelectorAll('#ttsG button').forEach(function (b) { b.classList.toggle('active', !!v && b.dataset.g === v[1]); }); };
      o.querySelectorAll('#ttsG button').forEach(function (b) { b.onclick = function () { const first = TTS_VOICES.filter(function (x) { return x[1] === b.dataset.g; })[0]; if (first) vSel.value = first[0]; syncG(); }; });
      vSel.onchange = syncG; syncG();
      const upd = function () { const n = ta.value.trim().length; cnt.innerHTML = n + ' / 4000 characters · AI voice cost <b>' + (n ? rate * Math.ceil(n / 1000) : 0) + ' credits</b> · Listen free <b>0</b>'; }; ta.oninput = upd; upd();
      const picker = formatPicker(body, 'mp3');
      const row = el('<div class="btn-row"><button class="btn secondary" id="ttsFree">🔊 Listen free</button><button class="btn" id="ttsGo">🎙️ AI voice file</button></div>'); body.appendChild(row);
      const freeBtn = row.querySelector('#ttsFree');
      let speaking = false;
      const setIdle = function () { speaking = false; freeBtn.textContent = '🔊 Listen free'; };
      freeBtn.onclick = function () {
        if (!window.speechSynthesis) { errBox(body, 'This browser has no built-in voice.'); return; }
        if (speaking) { speechSynthesis.cancel(); setIdle(); return; } // Stop
        speechSynthesis.cancel(); const t = ta.value.trim(); if (!t) { ta.focus(); return; }
        const u = new SpeechSynthesisUtterance(t), ta_ = /[஀-௿]/.test(t), hi = /[ऀ-ॿ]/.test(t); u.lang = ta_ ? 'ta-IN' : hi ? 'hi-IN' : 'en-IN';
        const v = speechSynthesis.getVoices().filter(function (x) { return x.lang && x.lang.toLowerCase().indexOf(u.lang.slice(0, 2)) === 0; })[0]; if (v) u.voice = v;
        if (ta_ && !v) mountResult(body, 'Your phone has no Tamil voice installed — the free preview may sound wrong. The AI voice file reads Tamil properly.');
        u.onend = setIdle; u.onerror = setIdle;
        speaking = true; freeBtn.textContent = '⏹ Stop';
        speechSynthesis.speak(u);
      };
      // leaving the tool stops the free voice too
      const stopWhenGone = setInterval(function () { if (!document.body.contains(body)) { try { speechSynthesis.cancel(); } catch (e) {} clearInterval(stopWhenGone); } }, 1000);
      row.querySelector('#ttsGo').onclick = async function () {
        const t = ta.value.trim(); if (!t) { ta.focus(); return; }
        if (speaking) { speechSynthesis.cancel(); setIdle(); }
        if (typeof AUTH_CONFIGURED !== 'undefined' && (!AUTH_CONFIGURED || !authState.session)) { if (typeof mountAuthModal === 'function') mountAuthModal(); errBox(body, 'Please sign in first — the AI voice uses credits (new accounts get 5 free).'); return; }
        const cost = rate * Math.ceil(t.length / 1000);
        if (typeof confirmCreditSpend === 'function' && !(await confirmCreditSpend(body, cost + ' credits'))) return;
        const btn = this; btn.disabled = true; const prog = mountProgress(body); prog.set(20, 'Making the voice… (a few seconds per paragraph)');
        try {
          const r = await fetch(APP_CONFIG.BACKEND_URL + '/api/ai/speech', { method: 'POST', headers: { Authorization: 'Bearer ' + authState.session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t, voice: vSel.value, style: o.querySelector('#ttsS').value }) });
          const j = await r.json().catch(function () { return {}; });
          if (!r.ok || j.error) throw new Error((j.error && (j.error.message || j.error)) || ('Error ' + r.status));
          const a = findAudio(j); if (!a) throw new Error('The voice service answered without audio — please try again.');
          prog.set(50, 'Saving…'); const buf = await audioToBuf(a); prog.remove();
          await saveResult(body, buf, picker, 'voice-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'), 'Saving');
          try { if (typeof refreshProfile === 'function') refreshProfile(); } catch (e) {}
        } catch (e) { prog.remove(); errBox(body, e.message || e); }
        btn.disabled = false;
      };
    }
  };

})();
