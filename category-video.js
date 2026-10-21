/* category-video.js — lazy-loaded video tools for pdftoolsindia.com
 *
 *   videotrim  — Trim / Cut Video: visual timeline with two handles, keep or remove the selected part, fade, mute, fast or exact cut
 *   videocrop  — Crop Video: drag a crop box on the picture, aspect presets (1:1, 9:16, 16:9, 4:5, 4:3)
 *   videoresize— Resize Video: presets for YouTube / Shorts-Reels / Instagram, custom size, fit / fill / stretch
 *   screenrec  — Screen Recorder: record screen (+ system audio and/or microphone), preview, save WebM or convert to MP4
 *
 * Everything runs in the visitor's browser (ffmpeg.wasm / MediaRecorder) — nothing is uploaded, no credits are used.
 * Plain browser JS, no modules. Globals from the host page: TOOL_IMPL, el, mountUploader, mountFileList, mountProgress, mountResult,
 * downloadBlob, ensureFFmpeg, getVideoDuration, escapeHtml. Pure helpers are exported on window.VideoCore for tests.
 */
(function () {
  'use strict';

  /* ===================================================================== pure helpers (also used by tests) */
  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }

  // "83.5" | "1:23.5" | "01:02:03" -> seconds, or NaN
  function parseT(str) {
    str = String(str == null ? '' : str).trim().replace(',', '.');
    if (!str) return NaN;
    const parts = str.split(':');
    if (parts.length > 3 || parts.some(function (p) { return !/^\d+(\.\d+)?$/.test(p.trim()); })) return NaN;
    return parts.reduce(function (acc, p) { return acc * 60 + parseFloat(p); }, 0);
  }
  // seconds -> "m:ss.s" (h:mm:ss.s when long)
  function fmtT(s) {
    s = Math.max(0, s || 0);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s - h * 3600 - m * 60;
    const sec = (r < 10 ? '0' : '') + r.toFixed(1);
    return h ? h + ':' + (m < 10 ? '0' : '') + m + ':' + sec : m + ':' + sec;
  }
  const even = function (n) { return Math.max(2, Math.floor(n / 2) * 2); };
  const secArg = function (n) { return (Math.round(n * 1000) / 1000).toString(); };

  /* ffmpeg argument builders — each returns {withAudio, noAudio} so a clip without an audio track can retry safely. */
  function trimKeepArgs(inName, outName, o) {
    // o: {start, end, fast, fade, fadeSec, mute}
    const dur = o.end - o.start;
    if (o.fast && !o.fade) {
      const a = ['-ss', secArg(o.start), '-i', inName, '-t', secArg(dur), '-c', 'copy', '-avoid_negative_ts', 'make_zero'];
      if (o.mute) a.push('-an');
      a.push(outName);
      return { withAudio: a, noAudio: a };
    }
    const f = Math.min(o.fadeSec || 1, dur / 2);
    const vf = o.fade ? ['-vf', 'fade=t=in:st=0:d=' + secArg(f) + ',fade=t=out:st=' + secArg(dur - f) + ':d=' + secArg(f)] : [];
    const af = o.fade ? ['-af', 'afade=t=in:st=0:d=' + secArg(f) + ',afade=t=out:st=' + secArg(dur - f) + ':d=' + secArg(f)] : [];
    const base = ['-ss', secArg(o.start), '-i', inName, '-t', secArg(dur)];
    const enc = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
    const withAudio = base.concat(vf, o.mute ? ['-an'] : af.concat(['-c:a', 'aac', '-b:a', '160k']), enc, [outName]);
    const noAudio = base.concat(vf, ['-an'], enc, [outName]);
    return { withAudio: withAudio, noAudio: noAudio };
  }
  function trimRemoveArgs(inName, outName, o) {
    // keep [0,start] + [end,total]; always re-encoded
    const s = secArg(o.start), e = secArg(o.end);
    const enc = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
    const vparts = '[0:v]trim=0:' + s + ',setpts=PTS-STARTPTS[v0];[0:v]trim=start=' + e + ',setpts=PTS-STARTPTS[v1];';
    const aparts = '[0:a]atrim=0:' + s + ',asetpts=PTS-STARTPTS[a0];[0:a]atrim=start=' + e + ',asetpts=PTS-STARTPTS[a1];';
    const withAudio = ['-i', inName, '-filter_complex', vparts + aparts + '[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]', '-map', '[v]', '-map', '[a]']
      .concat(enc, ['-c:a', 'aac', '-b:a', '160k', outName]);
    const noAudio = ['-i', inName, '-filter_complex', vparts + '[v0][v1]concat=n=2:v=1:a=0[v]', '-map', '[v]'].concat(enc, ['-an', outName]);
    if (o.mute) return { withAudio: noAudio, noAudio: noAudio };
    return { withAudio: withAudio, noAudio: noAudio };
  }
  function cropFilter(vw, vh, r) {
    // r = normalised rect {x,y,w,h} (0..1 of the picture) -> crop=w:h:x:y in even source pixels
    let w = even(r.w * vw), h = even(r.h * vh);
    w = Math.min(w, even(vw)); h = Math.min(h, even(vh));
    const x = clamp(Math.round(r.x * vw), 0, Math.max(0, vw - w)), y = clamp(Math.round(r.y * vh), 0, Math.max(0, vh - h));
    return { w: w, h: h, x: x, y: y, filter: 'crop=' + w + ':' + h + ':' + x + ':' + y };
  }
  function resizeFilter(W, H, mode) {
    W = even(W); H = even(H);
    if (mode === 'fill') return 'scale=' + W + ':' + H + ':force_original_aspect_ratio=increase,crop=' + W + ':' + H + ',setsar=1';
    if (mode === 'stretch') return 'scale=' + W + ':' + H + ',setsar=1';
    return 'scale=' + W + ':' + H + ':force_original_aspect_ratio=decrease,pad=' + W + ':' + H + ':(ow-iw)/2:(oh-ih)/2:color=black,setsar=1';
  }
  // keep the picture's own shape: give width OR height, the other follows
  function scaleKeepAspect(vw, vh, w, h) {
    if (w && !h) return { w: even(w), h: even(w * vh / vw) };
    if (h && !w) return { w: even(h * vw / vh), h: even(h) };
    return { w: even(w), h: even(h) };
  }
  // largest rect of aspect ratio ar (w/h, in pixels) inside the picture, centred, as a normalised rect
  function aspectRect(vw, vh, ar) {
    let w = vw, h = vw / ar;
    if (h > vh) { h = vh; w = vh * ar; }
    return { x: (vw - w) / 2 / vw, y: (vh - h) / 2 / vh, w: w / vw, h: h / vh };
  }

  window.VideoCore = { parseT: parseT, fmtT: fmtT, even: even, trimKeepArgs: trimKeepArgs, trimRemoveArgs: trimRemoveArgs, cropFilter: cropFilter, resizeFilter: resizeFilter, scaleKeepAspect: scaleKeepAspect, aspectRect: aspectRect, clamp: clamp };

  /* ===================================================================== shared UI helpers */
  const baseName = function (f) { return (f.name || 'video').replace(/\.[^.]+$/, ''); };
  const extOf = function (f) { const e = ((f.name || '').split('.').pop() || 'mp4').toLowerCase(); return /^[a-z0-9]{2,5}$/.test(e) ? e : 'mp4'; };
  const errBox = function (body, msg) { const b = mountResult(body, 'Error: ' + escapeHtml(String(msg))); b.style.background = '#FDEDEC'; return b; };

  // Run one ffmpeg job; retries with the "no audio track" variant when the clip has no sound. Returns the output bytes.
  async function runFfmpeg(file, variants, outName, prog, label) {
    prog.set(5, 'Loading video engine…');
    const eng = await ensureFFmpeg(), ffmpeg = eng.ffmpeg, fetchFile = eng.fetchFile;
    const inName = 'in.' + extOf(file);
    let handler = null, logs = [];
    const onLog = function (e) { logs.push(e.message || ''); if (logs.length > 60) logs.shift(); };
    try {
      handler = function (e) { const p = clamp(e.progress || 0, 0, 1); prog.set(15 + p * 75, label + ' ' + Math.round(p * 100) + '%'); };
      ffmpeg.on('progress', handler); ffmpeg.on('log', onLog);
      await ffmpeg.writeFile(inName, await fetchFile(file));
      prog.set(15, label + '…');
      let code = await ffmpeg.exec(variants.withAudio(inName, outName));
      if (code !== 0 && variants.noAudio) { logs = []; try { await ffmpeg.deleteFile(outName); } catch (e) {} code = await ffmpeg.exec(variants.noAudio(inName, outName)); }
      if (code !== 0) throw new Error('The video engine could not process this file (' + (logs.slice(-2).join(' ').slice(0, 160) || 'code ' + code) + ')');
      prog.set(93, 'Preparing file…');
      const data = await ffmpeg.readFile(outName);
      try { await ffmpeg.deleteFile(outName); } catch (e) {}
      return data;
    } finally {
      try { ffmpeg.off('progress', handler); ffmpeg.off('log', onLog); } catch (e) {}
      try { await ffmpeg.deleteFile(inName); } catch (e) {}
    }
  }

  const STYLE_ID = 'vc-style';
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const st = document.createElement('style'); st.id = STYLE_ID;
    st.textContent = [
      '.vc-video{width:100%;border-radius:10px;background:#000;display:block;max-height:60vh}',
      '.vc-track{position:relative;height:58px;margin:12px 4px 6px;border-radius:10px;background:#1b1f27;touch-action:none;user-select:none;-webkit-user-select:none;overflow:visible}',
      '.vc-thumbs{position:absolute;inset:0;border-radius:10px;overflow:hidden;opacity:.85}',
      '.vc-thumbs canvas{width:100%;height:100%;display:block}',
      '.vc-dim{position:absolute;top:0;bottom:0;background:rgba(0,0,0,.62);pointer-events:none}',
      '.vc-sel{position:absolute;top:0;bottom:0;border-top:3px solid var(--brand,#3752A6);border-bottom:3px solid var(--brand,#3752A6);pointer-events:none}',
      '.vc-handle{position:absolute;top:-4px;bottom:-4px;width:18px;margin-left:-9px;background:var(--brand,#3752A6);border-radius:7px;cursor:ew-resize;touch-action:none;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;box-shadow:0 1px 4px rgba(0,0,0,.4)}',
      '.vc-handle:after{content:"";width:2px;height:20px;background:rgba(255,255,255,.85);border-radius:2px}',
      '.vc-head{position:absolute;top:-6px;bottom:-6px;width:2px;margin-left:-1px;background:#FFD43B;pointer-events:none}',
      '.vc-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}',
      '.vc-time{display:flex;align-items:center;gap:6px;background:var(--chip,#F0F2F6);border-radius:12px;padding:6px 8px}',
      '.vc-time label{font-size:11.5px;font-weight:800;color:var(--sub,#6B7280)}',
      '.vc-time input{width:84px;border:1px solid var(--line,#E6E8EC);border-radius:8px;padding:6px;font:700 13px system-ui;text-align:center}',
      '.vc-mini{border:0;background:#fff;border:1px solid var(--line,#E6E8EC);border-radius:8px;padding:6px 9px;font-weight:800;cursor:pointer}',
      '.vc-stage{position:relative;width:100%;line-height:0;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden;border-radius:10px}',
      '.vc-crop{position:absolute;z-index:3;border:2px solid #FFD43B;box-shadow:0 0 0 9999px rgba(0,0,0,.55);cursor:move;touch-action:none}',
      '.vc-crop i{position:absolute;width:22px;height:22px;background:#FFD43B;border-radius:6px;border:2px solid #20242B;touch-action:none}',
      '.vc-grid{position:absolute;inset:0;pointer-events:none;background:linear-gradient(to right,transparent 33.2%,rgba(255,255,255,.35) 33.3%,transparent 33.6%,transparent 66.4%,rgba(255,255,255,.35) 66.6%,transparent 66.9%),linear-gradient(to bottom,transparent 33.2%,rgba(255,255,255,.35) 33.3%,transparent 33.6%,transparent 66.4%,rgba(255,255,255,.35) 66.6%,transparent 66.9%)}',
      '.vc-chk{display:flex;gap:8px;align-items:flex-start;font-size:13px;margin-top:10px;line-height:1.4}',
      '.vc-chk small{display:block;color:var(--sub,#6B7280);font-size:11.5px}',
      '.vc-rec{display:inline-block;width:12px;height:12px;border-radius:50%;background:#E03131;margin-right:6px;animation:vcblink 1s infinite}',
      '@keyframes vcblink{50%{opacity:.25}}'
    ].join('\n');
    document.head.appendChild(st);
  }
  const videoEl = function (url) { return el('<video class="vc-video" src="' + url + '" controls playsinline preload="metadata"></video>'); };
  const waitMeta = function (v) { return new Promise(function (res, rej) { if (v.readyState >= 1 && v.videoWidth) return res(); v.addEventListener('loadedmetadata', function () { res(); }, { once: true }); v.addEventListener('error', function () { rej(new Error('This video format cannot be read by your browser')); }, { once: true }); }); };

  /* ===================================================================== TRIM VIDEO */
  TOOL_IMPL.videotrim = {
    mount: function (container) {
      ensureStyle();
      ensureFFmpeg().catch(function () {});
      let file = null, url = null, dur = 0, start = 0, end = 0, mode = 'keep', fade = false, mute = false, fast = null, thumbToken = 0;
      const body = el('<div></div>'); container.appendChild(body);

      function paint() {
        body.innerHTML = '';
        if (!file) {
          mountUploader(body, {
            accept: 'video/*', label: 'Drop a video here, or tap to choose', sublabel: 'MP4 · MOV · WEBM · AVI · MKV · MPG — cut it right in your browser, nothing is uploaded',
            onAdd: async function (fl) {
              file = fl[0]; if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(file);
              try { dur = await getVideoDuration(file); } catch (e) { dur = 0; }
              if (!dur || !isFinite(dur)) { file = null; body.innerHTML = ''; paint(); errBox(body, 'This video could not be read. Try an MP4 or MOV file.'); return; }
              start = 0; end = dur; fast = dur > 180; mode = 'keep'; paint();
            }
          });
          return;
        }
        mountFileList(body, [file], function () { file = null; if (url) URL.revokeObjectURL(url); url = null; paint(); });
        const video = videoEl(url); body.appendChild(video);

        // ---- timeline
        const track = el('<div class="vc-track" aria-label="Timeline"><div class="vc-thumbs"></div><div class="vc-dim" id="vcD1"></div><div class="vc-dim" id="vcD2"></div><div class="vc-sel" id="vcSel"></div><div class="vc-head" id="vcHead"></div><div class="vc-handle" id="vcH1" role="slider" aria-label="Start"></div><div class="vc-handle" id="vcH2" role="slider" aria-label="End"></div></div>');
        body.appendChild(track);
        const q = function (s) { return track.querySelector(s); }, H1 = q('#vcH1'), H2 = q('#vcH2'), D1 = q('#vcD1'), D2 = q('#vcD2'), SEL = q('#vcSel'), HEAD = q('#vcHead');
        const pct = function (t) { return (t / dur * 100) + '%'; };
        function layout() {
          H1.style.left = pct(start); H2.style.left = pct(end);
          D1.style.left = '0'; D1.style.width = pct(start);
          D2.style.left = pct(end); D2.style.width = (100 - end / dur * 100) + '%';
          SEL.style.left = pct(start); SEL.style.width = ((end - start) / dur * 100) + '%';
          HEAD.style.left = pct(video.currentTime || 0);
          inS.value = fmtT(start); inE.value = fmtT(end);
          info.innerHTML = (mode === 'keep' ? 'Keeping' : 'Removing') + ' <b>' + fmtT(end - start) + '</b> · result <b>' + fmtT(mode === 'keep' ? end - start : dur - (end - start)) + '</b> of ' + fmtT(dur);
          btn.disabled = (end - start) < 0.1;
        }
        const MINGAP = 0.1;
        function setStart(t, seek) { start = clamp(t, 0, end - MINGAP); layout(); if (seek) video.currentTime = start; }
        function setEnd(t, seek) { end = clamp(t, start + MINGAP, dur); layout(); if (seek) video.currentTime = Math.max(0, end - 0.05); }
        function drag(h, fn) {
          h.addEventListener('pointerdown', function (e) { h.setPointerCapture(e.pointerId); h._d = true; e.preventDefault(); e.stopPropagation(); video.pause(); });
          h.addEventListener('pointermove', function (e) { if (!h._d) return; const r = track.getBoundingClientRect(); fn(clamp((e.clientX - r.left) / r.width, 0, 1) * dur, true); });
          const up = function () { h._d = false; }; h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
        }
        drag(H1, setStart); drag(H2, setEnd);
        track.addEventListener('pointerdown', function (e) { if (e.target === H1 || e.target === H2) return; const r = track.getBoundingClientRect(); video.currentTime = clamp((e.clientX - r.left) / r.width, 0, 1) * dur; });
        video.addEventListener('timeupdate', function () {
          HEAD.style.left = pct(video.currentTime || 0);
          if (mode === 'keep' && !video.paused && video.currentTime >= end) { video.pause(); video.currentTime = end; }
          if (mode === 'remove' && !video.paused && video.currentTime >= start && video.currentTime < end) video.currentTime = end; // preview skips the removed part
        });

        // ---- numeric start / end
        const bar = el('<div class="vc-row"></div>'); body.appendChild(bar);
        const mk = function (label, which) {
          const box = el('<div class="vc-time"><label>' + label + '</label><button class="vc-mini" data-a="-">−0.1</button><input type="text" inputmode="decimal" aria-label="' + label + '"><button class="vc-mini" data-a="+">+0.1</button><button class="vc-mini" data-a="now" title="Use the current video position">⏺ now</button></div>');
          bar.appendChild(box); return box;
        };
        const bS = mk('Start', 'S'), bE = mk('End', 'E'), inS = bS.querySelector('input'), inE = bE.querySelector('input');
        const act = function (box, setter, get) {
          box.addEventListener('click', function (e) { const a = e.target.getAttribute && e.target.getAttribute('data-a'); if (!a) return; if (a === 'now') setter(video.currentTime, false); else setter(get() + (a === '+' ? 0.1 : -0.1), true); });
        };
        act(bS, setStart, function () { return start; }); act(bE, setEnd, function () { return end; });
        const typed = function (inp, setter, get) { inp.addEventListener('change', function () { const v = parseT(inp.value); if (isNaN(v)) { layout(); return; } setter(v, true); }); };
        typed(inS, setStart); typed(inE, setEnd);

        const info = el('<div class="note" style="margin-top:10px;"></div>'); body.appendChild(info);
        const pv = el('<div class="vc-row"><button class="btn secondary" id="vcPlay">▶ Preview</button></div>'); body.appendChild(pv);
        pv.querySelector('#vcPlay').onclick = function () { video.currentTime = mode === 'remove' ? Math.max(0, start - 2) : start; video.play(); };

        // ---- mode + options
        const modeRow = el('<div class="filter-row" style="margin-top:12px;flex-wrap:wrap;"></div>');
        [['keep', '✂️ Keep the selected part'], ['remove', '🗑️ Remove the selected part']].forEach(function (m) {
          modeRow.appendChild(el('<button class="filter-chip ' + (mode === m[0] ? 'active' : '') + '" data-m="' + m[0] + '">' + m[1] + '</button>'));
        });
        modeRow.addEventListener('click', function (e) { const b = e.target.closest('[data-m]'); if (!b) return; mode = b.getAttribute('data-m'); [].forEach.call(modeRow.children, function (c) { c.classList.toggle('active', c === b); }); fastBox.style.display = mode === 'keep' ? '' : 'none'; layout(); });
        body.appendChild(modeRow);

        const opt = el('<div></div>');
        opt.innerHTML =
          '<label class="vc-chk"><input type="checkbox" id="vcFade" ' + (fade ? 'checked' : '') + '><span>Fade in / fade out<small>Smooth 1-second fade at the start and end of the clip (needs the exact cut)</small></span></label>' +
          '<label class="vc-chk"><input type="checkbox" id="vcMute" ' + (mute ? 'checked' : '') + '><span>Remove the sound</span></label>';
        body.appendChild(opt);
        const fastBox = el('<div class="vc-chk" style="display:' + (mode === 'keep' ? '' : 'none') + ';"></div>');
        fastBox.innerHTML =
          '<div style="width:100%;"><div style="font-weight:800;font-size:12.5px;margin-bottom:6px;">Cut method</div>' +
          '<label class="vc-chk" style="margin-top:4px;"><input type="radio" name="vcFast" value="0" ' + (!fast ? 'checked' : '') + '><span>Exact — frame-accurate, re-encodes (a few minutes for long videos)</span></label>' +
          '<label class="vc-chk" style="margin-top:4px;"><input type="radio" name="vcFast" value="1" ' + (fast ? 'checked' : '') + '><span>Fast — instant, no quality loss; may start up to a few seconds early (at the nearest key-frame)</span></label></div>';
        body.appendChild(fastBox);
        opt.querySelector('#vcFade').onchange = function (e) { fade = e.target.checked; };
        opt.querySelector('#vcMute').onchange = function (e) { mute = e.target.checked; };
        fastBox.addEventListener('change', function (e) { if (e.target.name === 'vcFast') fast = e.target.value === '1'; });

        const row = el('<div class="btn-row"></div>');
        const btn = el('<button class="btn">✂️ Cut & download</button>');
        btn.onclick = doCut; row.appendChild(btn); body.appendChild(row);
        layout();
        makeThumbs(track.querySelector('.vc-thumbs'));
      }

      // filmstrip: grab ~10 frames so the timeline shows the picture (best effort — silently skipped if the browser cannot seek)
      async function makeThumbs(holder) {
        const my = ++thumbToken, N = 10, cv = document.createElement('canvas'); cv.width = 400; cv.height = 52; holder.appendChild(cv);
        const g = cv.getContext('2d'); g.fillStyle = '#1b1f27'; g.fillRect(0, 0, cv.width, cv.height);
        try {
          const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = url; await waitMeta(v);
          const tw = cv.width / N;
          for (let i = 0; i < N; i++) {
            if (my !== thumbToken || !holder.isConnected) return;
            await new Promise(function (res) { let done = false; const f = function () { if (!done) { done = true; res(); } }; v.addEventListener('seeked', f, { once: true }); setTimeout(f, 1500); v.currentTime = Math.min(dur - 0.05, (i + 0.5) * dur / N); });
            const sc = Math.max(tw / v.videoWidth, cv.height / v.videoHeight);
            g.drawImage(v, i * tw + (tw - v.videoWidth * sc) / 2, (cv.height - v.videoHeight * sc) / 2, v.videoWidth * sc, v.videoHeight * sc);
          }
        } catch (e) { /* no thumbnails — the timeline still works */ }
      }

      async function doCut() {
        const prog = mountProgress(body);
        try {
          const useFast = mode === 'keep' && fast && !fade, ext = useFast ? extOf(file) : 'mp4';
          const outName = 'out.' + ext;
          let build;
          if (mode === 'keep' || start <= 0.05 || end >= dur - 0.05) {
            // "remove" at either edge is simply keeping the other side
            let s = start, e = end;
            if (mode === 'remove') { if (start <= 0.05) { s = end; e = dur; } else { s = 0; e = start; } }
            if (e - s < 0.1) throw new Error('Nothing would be left — choose a shorter part to remove.');
            build = function (inN, outN, noAudio) { const v = trimKeepArgs(inN, outN, { start: s, end: e, fast: useFast, fade: fade, fadeSec: 1, mute: mute }); return noAudio ? v.noAudio : v.withAudio; };
          } else {
            build = function (inN, outN, noAudio) { const v = trimRemoveArgs(inN, outN, { start: start, end: end, mute: mute }); return noAudio ? v.noAudio : v.withAudio; };
          }
          const data = await runFfmpeg(file, { withAudio: function (i, o) { return build(i, o, false); }, noAudio: function (i, o) { return build(i, o, true); } }, outName, prog, 'Cutting');
          const mime = ext === 'webm' ? 'video/webm' : ext === 'mov' ? 'video/quicktime' : 'video/mp4';
          downloadBlob(new Blob([data], { type: mime }), baseName(file) + '-cut.' + ext);
          prog.set(100, 'Done'); prog.remove();
          mountResult(body, 'Done — your cut video was downloaded.');
        } catch (err) { prog.remove(); errBox(body, err.message || err); }
      }
      paint();
    }
  };

  /* ===================================================================== CROP VIDEO */
  TOOL_IMPL.videocrop = {
    mount: function (container) {
      ensureStyle();
      ensureFFmpeg().catch(function () {});
      let file = null, url = null, vw = 0, vh = 0, ratio = 'free', rect = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
      const body = el('<div></div>'); container.appendChild(body);
      const RATIOS = [['free', 'Free'], ['1:1', '1:1 Square'], ['9:16', '9:16 Reels/Shorts'], ['16:9', '16:9 Wide'], ['4:5', '4:5 Portrait'], ['4:3', '4:3']];
      const arOf = function (k) { if (k === 'free') return 0; const p = k.split(':'); return +p[0] / +p[1]; };

      function paint() {
        body.innerHTML = '';
        if (!file) {
          mountUploader(body, {
            accept: 'video/*', label: 'Drop a video here, or tap to choose', sublabel: 'Then drag the yellow box to choose the part of the picture to keep',
            onAdd: async function (fl) {
              file = fl[0]; if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(file);
              const t = document.createElement('video'); t.preload = 'metadata'; t.src = url;
              try { await waitMeta(t); vw = t.videoWidth; vh = t.videoHeight; } catch (e) { file = null; paint(); errBox(body, e.message); return; }
              rect = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }; ratio = 'free'; paint();
            }
          });
          return;
        }
        mountFileList(body, [file], function () { file = null; if (url) URL.revokeObjectURL(url); url = null; paint(); });
        const stage = el('<div class="vc-stage"></div>'); body.appendChild(stage);
        const video = el('<video src="' + url + '" muted playsinline preload="metadata" style="position:relative;z-index:1;width:100%;display:block;border-radius:10px;background:#000;max-height:62vh;object-fit:contain;"></video>');
        stage.appendChild(video);
        const box = el('<div class="vc-crop"><div class="vc-grid"></div><i data-c="nw" style="left:-5px;top:-5px;cursor:nwse-resize"></i><i data-c="ne" style="right:-5px;top:-5px;cursor:nesw-resize"></i><i data-c="sw" style="left:-5px;bottom:-5px;cursor:nesw-resize"></i><i data-c="se" style="right:-5px;bottom:-5px;cursor:nwse-resize"></i></div>');
        stage.appendChild(box);
        const seekRow = el('<div class="vc-row"><button class="btn secondary" id="vcPP">▶ Play</button><input type="range" id="vcSeek" min="0" max="1000" value="0" style="flex:1;min-width:120px;"></div>'); body.appendChild(seekRow);
        const info = el('<div class="note"></div>'); body.appendChild(info);
        video.addEventListener('loadedmetadata', function () { video.currentTime = 0.05; });
        const seek = seekRow.querySelector('#vcSeek');
        seek.oninput = function () { video.currentTime = (+seek.value / 1000) * (video.duration || 0); };
        video.addEventListener('timeupdate', function () { if (video.duration) seek.value = Math.round(video.currentTime / video.duration * 1000); });
        const pp = seekRow.querySelector('#vcPP'); pp.onclick = function () { if (video.paused) { video.play(); pp.textContent = '⏸ Pause'; } else { video.pause(); pp.textContent = '▶ Play'; } };

        // The visible picture is letter-boxed inside the <video> element (object-fit:contain) — work in the real picture's area.
        function picArea() {
          const W = stage.clientWidth, H = video.clientHeight, s = Math.min(W / vw, H / vh), pw = vw * s, ph = vh * s;
          return { x: (W - pw) / 2, y: (H - ph) / 2, w: pw, h: ph };
        }
        function layout() {
          const a = picArea();
          box.style.left = (a.x + rect.x * a.w) + 'px'; box.style.top = (a.y + rect.y * a.h) + 'px';
          box.style.width = (rect.w * a.w) + 'px'; box.style.height = (rect.h * a.h) + 'px';
          const c = cropFilter(vw, vh, rect);
          info.innerHTML = 'Output size: <b>' + c.w + ' × ' + c.h + '</b> px &nbsp;(original ' + vw + ' × ' + vh + ')';
        }
        function norm(rc) { // keep inside the picture, keep the chosen aspect
          rc.w = clamp(rc.w, 0.05, 1); rc.h = clamp(rc.h, 0.05, 1);
          rc.x = clamp(rc.x, 0, 1 - rc.w); rc.y = clamp(rc.y, 0, 1 - rc.h); return rc;
        }
        function setRatio(k) { ratio = k; if (k !== 'free') rect = aspectRect(vw, vh, arOf(k)); [].forEach.call(chips.children, function (c) { c.classList.toggle('active', c.getAttribute('data-r') === k); }); layout(); }
        const chips = el('<div class="filter-row" style="margin-top:12px;flex-wrap:wrap;"></div>');
        RATIOS.forEach(function (r) { chips.appendChild(el('<button class="filter-chip ' + (ratio === r[0] ? 'active' : '') + '" data-r="' + r[0] + '">' + r[1] + '</button>')); });
        chips.addEventListener('click', function (e) { const b = e.target.closest('[data-r]'); if (b) setRatio(b.getAttribute('data-r')); });
        body.insertBefore(chips, seekRow);

        // dragging: move the box, or resize from a corner (aspect-locked when a ratio chip is chosen)
        let d = null;
        box.addEventListener('pointerdown', function (e) {
          const c = e.target.getAttribute && e.target.getAttribute('data-c'); box.setPointerCapture(e.pointerId); e.preventDefault();
          const a = picArea(); d = { c: c, sx: e.clientX, sy: e.clientY, r0: Object.assign({}, rect), a: a };
        });
        box.addEventListener('pointermove', function (e) {
          if (!d) return; const dx = (e.clientX - d.sx) / d.a.w, dy = (e.clientY - d.sy) / d.a.h, r0 = d.r0, ar = arOf(ratio), pa = vw / vh;
          if (!d.c) { rect = norm({ x: r0.x + dx, y: r0.y + dy, w: r0.w, h: r0.h }); layout(); return; }
          // anchor = the corner opposite the one being dragged
          const ax = d.c.indexOf('w') >= 0 ? r0.x + r0.w : r0.x, ay = d.c.indexOf('n') >= 0 ? r0.y + r0.h : r0.y;
          const px = clamp((d.c.indexOf('w') >= 0 ? r0.x : r0.x + r0.w) + dx, 0, 1), py = clamp((d.c.indexOf('n') >= 0 ? r0.y : r0.y + r0.h) + dy, 0, 1);
          let w = Math.abs(px - ax), h = Math.abs(py - ay);
          const roomX = d.c.indexOf('w') >= 0 ? ax : 1 - ax, roomY = d.c.indexOf('n') >= 0 ? ay : 1 - ay;
          if (ar) { // normalised h from w: h = w * (vw/vh) / ar
            w = Math.max(w, h * ar / pa); w = Math.min(w, roomX, roomY * ar / pa); h = w * pa / ar;
          }
          w = Math.max(w, 0.05); h = Math.max(h, 0.05);
          rect = norm({ x: d.c.indexOf('w') >= 0 ? ax - w : ax, y: d.c.indexOf('n') >= 0 ? ay - h : ay, w: w, h: h }); layout();
        });
        const up = function () { d = null; }; box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
        window.addEventListener('resize', layout, { passive: true });
        video.addEventListener('loadeddata', layout);
        layout();

        const row = el('<div class="btn-row"></div>'); const btn = el('<button class="btn">⬛ Crop & download</button>');
        btn.onclick = doCrop; row.appendChild(btn); body.appendChild(row);
      }

      async function doCrop() {
        const prog = mountProgress(body);
        try {
          const c = cropFilter(vw, vh, rect);
          const mk = function (i, o) { return ['-i', i, '-vf', c.filter, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', o]; };
          const data = await runFfmpeg(file, { withAudio: mk, noAudio: null }, 'out.mp4', prog, 'Cropping');
          downloadBlob(new Blob([data], { type: 'video/mp4' }), baseName(file) + '-crop-' + c.w + 'x' + c.h + '.mp4');
          prog.set(100, 'Done'); prog.remove(); mountResult(body, 'Done — cropped video (' + c.w + ' × ' + c.h + ') downloaded.');
        } catch (err) { prog.remove(); errBox(body, err.message || err); }
      }
      paint();
    }
  };

  /* ===================================================================== RESIZE VIDEO */
  TOOL_IMPL.videoresize = {
    mount: function (container) {
      ensureStyle();
      ensureFFmpeg().catch(function () {});
      let file = null, url = null, vw = 0, vh = 0, preset = '1080p', fit = 'pad', cw = 1280, ch = 720;
      const body = el('<div></div>'); container.appendChild(body);
      const PRESETS = [
        ['1080p', 'Full HD 1080p', 1920, 1080], ['720p', 'HD 720p', 1280, 720], ['480p', 'SD 480p', 854, 480], ['360p', '360p (small file)', 640, 360],
        ['vert', 'Shorts / Reels / TikTok 9:16', 1080, 1920], ['sq', 'Instagram square 1:1', 1080, 1080], ['port', 'Instagram portrait 4:5', 1080, 1350], ['custom', 'Custom size', 0, 0]
      ];
      function target() {
        if (preset === 'custom') return { w: even(cw), h: even(ch) };
        const p = PRESETS.filter(function (x) { return x[0] === preset; })[0];
        if (['1080p', '720p', '480p', '360p'].indexOf(preset) >= 0) { // "p" presets follow the picture's own shape (height-based)
          const landscape = vw >= vh, short = p[3];
          return landscape ? { w: even(vw * short / vh), h: even(short) } : { w: even(short), h: even(vh * short / vw) };
        }
        return { w: p[2], h: p[3] };
      }
      function paint() {
        body.innerHTML = '';
        if (!file) {
          mountUploader(body, {
            accept: 'video/*', label: 'Drop a video here, or tap to choose', sublabel: 'Change the size (resolution) for YouTube, Reels, Shorts, WhatsApp or a smaller file',
            onAdd: async function (fl) {
              file = fl[0]; if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(file);
              const t = document.createElement('video'); t.preload = 'metadata'; t.src = url;
              try { await waitMeta(t); vw = t.videoWidth; vh = t.videoHeight; } catch (e) { file = null; paint(); errBox(body, e.message); return; }
              cw = even(vw); ch = even(vh); paint();
            }
          });
          return;
        }
        mountFileList(body, [file], function () { file = null; if (url) URL.revokeObjectURL(url); url = null; paint(); });
        body.appendChild(videoEl(url));
        body.appendChild(el('<div class="note">Original size: <b>' + vw + ' × ' + vh + '</b> px</div>'));
        const chips = el('<div class="filter-row" style="margin-top:12px;flex-wrap:wrap;"></div>');
        PRESETS.forEach(function (p) { chips.appendChild(el('<button class="filter-chip ' + (preset === p[0] ? 'active' : '') + '" data-p="' + p[0] + '">' + p[1] + '</button>')); });
        chips.addEventListener('click', function (e) { const b = e.target.closest('[data-p]'); if (!b) return; preset = b.getAttribute('data-p'); paint(); });
        body.appendChild(chips);
        if (preset === 'custom') {
          const c = el('<div class="opts"><div class="field"><label>Width (px)</label><input type="number" id="vrW" min="64" max="4096" value="' + cw + '"></div><div class="field"><label>Height (px)</label><input type="number" id="vrH" min="64" max="4096" value="' + ch + '"></div></div>');
          body.appendChild(c);
          const lockBox = el('<label class="vc-chk"><input type="checkbox" checked><span>Keep the original shape (aspect ratio)</span></label>'); body.appendChild(lockBox);
          const lock = lockBox.querySelector('input'), W = c.querySelector('#vrW'), H = c.querySelector('#vrH');
          W.oninput = function () { cw = +W.value || cw; if (lock.checked) { ch = even(cw * vh / vw); H.value = ch; } upd(); };
          H.oninput = function () { ch = +H.value || ch; if (lock.checked) { cw = even(ch * vw / vh); W.value = cw; } upd(); };
        }
        const isP = ['1080p', '720p', '480p', '360p'].indexOf(preset) >= 0;
        if (!isP) {
          const fr = el('<div class="filter-row" style="margin-top:12px;flex-wrap:wrap;"></div>');
          [['pad', 'Fit — keep all, add black bars'], ['fill', 'Fill — crop the edges'], ['stretch', 'Stretch']].forEach(function (f) { fr.appendChild(el('<button class="filter-chip ' + (fit === f[0] ? 'active' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>')); });
          fr.addEventListener('click', function (e) { const b = e.target.closest('[data-f]'); if (!b) return; fit = b.getAttribute('data-f'); paint(); });
          body.appendChild(fr);
        }
        const out = el('<div class="note" id="vrOut"></div>'); body.appendChild(out);
        function upd() { const t = target(); out.innerHTML = 'New size: <b>' + t.w + ' × ' + t.h + '</b> px' + (t.w > vw || t.h > vh ? ' — <span style="color:#C92A2A">larger than the original, the picture will not get sharper</span>' : ''); }
        upd();
        const row = el('<div class="btn-row"></div>'); const btn = el('<button class="btn">📐 Resize & download</button>');
        btn.onclick = doResize; row.appendChild(btn); body.appendChild(row);
      }
      async function doResize() {
        const prog = mountProgress(body);
        try {
          const t = target(), isP = ['1080p', '720p', '480p', '360p'].indexOf(preset) >= 0;
          const vf = resizeFilter(t.w, t.h, isP ? 'stretch' : fit); // the 1080p/720p… presets already follow the picture's own shape
          const mk = function (i, o) { return ['-i', i, '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', o]; };
          const data = await runFfmpeg(file, { withAudio: mk, noAudio: null }, 'out.mp4', prog, 'Resizing');
          downloadBlob(new Blob([data], { type: 'video/mp4' }), baseName(file) + '-' + t.w + 'x' + t.h + '.mp4');
          prog.set(100, 'Done'); prog.remove(); mountResult(body, 'Done — resized video (' + t.w + ' × ' + t.h + ') downloaded.');
        } catch (err) { prog.remove(); errBox(body, err.message || err); }
      }
      paint();
    }
  };

  /* ===================================================================== SCREEN RECORDER */
  TOOL_IMPL.screenrec = {
    mount: function (container) {
      ensureStyle();
      const body = el('<div></div>'); container.appendChild(body);
      const canCapture = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia && window.MediaRecorder);
      let rec = null, streams = [], chunks = [], timer = null, t0 = 0, paused = 0, pauseAt = 0, blob = null, url = null, ctx = null;
      const pickMime = function () {
        const c = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
        return c.filter(function (m) { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } })[0] || '';
      };
      function stopAll() { streams.forEach(function (s) { s.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} }); }); streams = []; if (ctx) { try { ctx.close(); } catch (e) {} ctx = null; } clearInterval(timer); }

      function paint() {
        body.innerHTML = '';
        if (!canCapture) {
          body.appendChild(el('<div class="note" style="background:#FFF4E5;">🖥️ Screen recording works in <b>Chrome, Edge or Firefox on a computer (laptop / desktop)</b>. Phones and tablets (including iPad) do not allow websites to record the screen — on a phone use the built-in screen recorder in your quick settings.</div>'));
          return;
        }
        if (blob) { showResult(); return; }
        body.appendChild(el('<div class="note">Record your screen, a window or a browser tab. You choose what to share — nothing is uploaded; the video stays on your device.</div>'));
        const o = el('<div></div>');
        o.innerHTML =
          '<label class="vc-chk"><input type="checkbox" id="srSys" checked><span>Record the sound of the screen / tab<small>In Chrome tick “Also share tab audio” (or “Share system audio”) in the box that appears</small></span></label>' +
          '<label class="vc-chk"><input type="checkbox" id="srMic"><span>Record my microphone (voice)</span></label>';
        body.appendChild(o);
        const row = el('<div class="btn-row"></div>'); const b = el('<button class="btn">⏺ Start recording</button>');
        b.onclick = function () { start(o.querySelector('#srSys').checked, o.querySelector('#srMic').checked); }; row.appendChild(b); body.appendChild(row);
      }

      async function start(sys, mic) {
        try {
          const disp = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !!sys }); streams.push(disp);
          let tracks = disp.getVideoTracks().slice();
          const audios = [];
          if (disp.getAudioTracks().length) audios.push(new MediaStream(disp.getAudioTracks()));
          if (mic) { try { const m = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); streams.push(m); audios.push(m); } catch (e) { /* mic refused — record without it */ } }
          if (audios.length > 1) { // mix screen sound + microphone into one track
            const AC = window.AudioContext || window.webkitAudioContext; ctx = new AC(); const dest = ctx.createMediaStreamDestination();
            audios.forEach(function (s) { ctx.createMediaStreamSource(s).connect(dest); }); tracks = tracks.concat(dest.stream.getAudioTracks());
          } else if (audios.length === 1) tracks = tracks.concat(audios[0].getAudioTracks());
          const mime = pickMime(); chunks = [];
          rec = new MediaRecorder(new MediaStream(tracks), mime ? { mimeType: mime, videoBitsPerSecond: 4000000 } : undefined);
          rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
          rec.onstop = function () { blob = new Blob(chunks, { type: (rec.mimeType || mime || 'video/webm').split(';')[0] }); stopAll(); if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob); paint(); };
          disp.getVideoTracks()[0].addEventListener('ended', function () { if (rec && rec.state !== 'inactive') rec.stop(); }); // user pressed the browser's "Stop sharing"
          rec.start(1000); t0 = Date.now(); paused = 0; showRecording();
        } catch (err) {
          stopAll(); paint();
          const denied = err && (err.name === 'NotAllowedError' || err.name === 'AbortError');
          body.appendChild(el('<div class="note" style="background:#FDEDEC;">' + (denied ? 'Recording was not started (permission was not given). Press Start again and choose a screen, window or tab to share.' : 'Could not start recording: ' + escapeHtml(err && err.message || String(err))) + '</div>'));
        }
      }
      function showRecording() {
        body.innerHTML = '';
        body.appendChild(el('<div style="text-align:center;padding:24px 10px;"><div style="font-size:34px;font-weight:900;font-variant-numeric:tabular-nums;" id="srT">0:00</div><div style="margin-top:6px;font-weight:700;"><span class="vc-rec"></span><span id="srS">Recording…</span></div></div>'));
        const row = el('<div class="btn-row" style="justify-content:center;"><button class="btn secondary" id="srPause">⏸ Pause</button><button class="btn" id="srStop">⏹ Stop & save</button></div>'); body.appendChild(row);
        const tEl = body.querySelector('#srT'), sEl = body.querySelector('#srS');
        const tick = function () { const ms = (rec.state === 'paused' ? pauseAt : Date.now()) - t0 - paused; const s = Math.floor(ms / 1000); tEl.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
        timer = setInterval(tick, 250);
        row.querySelector('#srPause').onclick = function (e) {
          if (rec.state === 'recording') { rec.pause(); pauseAt = Date.now(); e.target.textContent = '▶ Resume'; sEl.textContent = 'Paused'; }
          else if (rec.state === 'paused') { rec.resume(); paused += Date.now() - pauseAt; e.target.textContent = '⏸ Pause'; sEl.textContent = 'Recording…'; }
        };
        row.querySelector('#srStop').onclick = function () { if (rec && rec.state !== 'inactive') rec.stop(); };
      }
      function showResult() {
        body.innerHTML = '';
        const ext = /mp4/.test(blob.type) ? 'mp4' : 'webm';
        body.appendChild(el('<video class="vc-video" src="' + url + '" controls playsinline></video>'));
        body.appendChild(el('<div class="note">Recorded <b>' + (blob.size / 1048576).toFixed(1) + ' MB</b> (' + ext.toUpperCase() + ').' + (ext === 'webm' ? ' WebM plays in Chrome, Edge and Firefox; use “Convert to MP4” for WhatsApp, phones and editors.' : '') + '</div>'));
        const row = el('<div class="btn-row"></div>'); body.appendChild(row);
        const dl = el('<button class="btn">⬇ Download ' + ext.toUpperCase() + '</button>'); dl.onclick = function () { downloadBlob(blob, 'screen-recording-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.' + ext); }; row.appendChild(dl);
        if (ext === 'webm') {
          const cv = el('<button class="btn secondary">🎞️ Convert to MP4</button>');
          cv.onclick = async function () {
            cv.disabled = true; const prog = mountProgress(body);
            try {
              const f = new File([blob], 'screen-recording.webm', { type: blob.type });
              const mk = function (i, o) { return ['-i', i, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', o]; };
              const data = await runFfmpeg(f, { withAudio: mk, noAudio: null }, 'out.mp4', prog, 'Converting');
              downloadBlob(new Blob([data], { type: 'video/mp4' }), 'screen-recording.mp4'); prog.remove(); mountResult(body, 'Done — MP4 downloaded.');
            } catch (err) { prog.remove(); errBox(body, err.message || err); }
            cv.disabled = false;
          };
          row.appendChild(cv);
        }
        const again = el('<button class="btn secondary">⏺ Record again</button>'); again.onclick = function () { blob = null; if (url) URL.revokeObjectURL(url); url = null; paint(); }; row.appendChild(again);
      }
      paint();
    }
  };
})();
