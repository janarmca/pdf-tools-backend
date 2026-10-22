// Free Tamil text-to-speech that runs entirely in the visitor's browser (no server, no credits).
// Model: Pocket TTS Tamil int4 ONNX by Prasad Vittaldev (CC-BY-4.0), based on Kyutai Pocket TTS (CC-BY-4.0).
//   https://huggingface.co/prasadvittaldev/pocket-tts-tamil-onnx-int4   https://huggingface.co/kyutai/pocket-tts
// Inference loop adapted from KevinAHM/pocket-tts-web inference-worker.js (Apache-2.0).
// Tokenizer: @sctg/sentencepiece-js (Apache-2.0), trimmed copy in /vendor/sentencepiece.mjs.
// Runtime: onnxruntime-web (MIT) from jsDelivr.
//
// Messages in : {type:'generate', text}            Messages out: {type:'progress', pct, text}
//                                                                {type:'audio', data:Float32Array, sampleRate}
//                                                                {type:'error', error}
'use strict';

const ORT_VERSION = '1.22.0';
const MODEL_BASE = 'https://huggingface.co/prasadvittaldev/pocket-tts-tamil-onnx-int4/resolve/main/';
const CACHE_NAME = 'pocket-tts-tamil-v1';
const FILES = {
  bundle: 'bundle.json', tokenizer: 'tokenizer.model', bos: 'bos_before_voice.npy', voice: 'sample_geetha.wav',
  text_conditioner: 'text_conditioner.onnx', flow_lm_main: 'flow_lm_main_int4.onnx', flow_lm_flow: 'flow_lm_flow_int8.onnx',
  mimi_decoder: 'mimi_decoder_int8.onnx', mimi_encoder: 'mimi_encoder_int8.onnx'
};
// approximate sizes (bytes) — only used for the download progress bar
const SIZES = { bundle: 24361, tokenizer: 345594, bos: 4224, voice: 276524, text_conditioner: 16388344, flow_lm_main: 40802614, flow_lm_flow: 9962530, mimi_decoder: 22684077, mimi_encoder: 20802362 };
const MAX_FRAMES = 500;      // 40 s of audio per text piece at most
const LSD_STEPS = 1;
const TEMPERATURE = 0.7;
const EOS_THRESHOLD = -4.0;
const GAP_SEC = 0.25;

let ort = null, meta = null, sp = null, bos = null, S = {}, voiceState = null, busy = false;
const post = (m, t) => self.postMessage(m, t || []);
const progress = (pct, text) => post({ type: 'progress', pct: Math.max(0, Math.min(100, Math.round(pct))), text });

// ---------- downloads (kept in the browser's Cache Storage, so the 110 MB comes down only once) ----------
async function getFile(key, onBytes) {
  const url = MODEL_BASE + FILES[key];
  let cache = null;
  try { cache = await caches.open(CACHE_NAME); const hit = await cache.match(url); if (hit) { const b = await hit.arrayBuffer(); onBytes(b.byteLength); return b; } } catch (e) { cache = null; }
  const r = await fetch(url, { mode: 'cors' });
  if (!r.ok) throw new Error('Could not download the voice model (' + FILES[key] + ', HTTP ' + r.status + '). Check your internet and try again.');
  let buf;
  if (r.body && r.body.getReader) {
    const reader = r.body.getReader(), parts = []; let n = 0;
    for (;;) { const x = await reader.read(); if (x.done) break; parts.push(x.value); n += x.value.length; onBytes(x.value.length, true); }
    const u = new Uint8Array(n); let o = 0; for (const p of parts) { u.set(p, o); o += p.length; } buf = u.buffer;
  } else { buf = await r.arrayBuffer(); onBytes(buf.byteLength); }
  if (cache) { try { await cache.put(url, new Response(buf.slice(0), { headers: { 'Content-Type': 'application/octet-stream' } })); } catch (e) { /* storage full: still works, downloads again next time */ } }
  return buf;
}

function parseNpy(buffer) {
  const v = new DataView(buffer), major = v.getUint8(6);
  const hl = major === 1 ? v.getUint16(8, true) : v.getUint32(8, true), ho = major === 1 ? 10 : 12;
  const head = new TextDecoder().decode(new Uint8Array(buffer, ho, hl));
  const m = head.match(/\(\s*([0-9,\s]+)\)/); if (!m) throw new Error('bad npy');
  const shape = m[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(Number);
  return { data: new Float32Array(buffer.slice(ho + hl)), shape: shape };
}

// WAV → mono Float32 at the model rate (PCM 8/16/24/32-bit or float32)
function parseWav(buffer, rate) {
  const v = new DataView(buffer); let p = 12, fmt = null, data = null;
  while (p + 8 <= v.byteLength) {
    const id = String.fromCharCode(v.getUint8(p), v.getUint8(p + 1), v.getUint8(p + 2), v.getUint8(p + 3)), size = v.getUint32(p + 4, true);
    if (id === 'fmt ') fmt = { tag: v.getUint16(p + 8, true), ch: v.getUint16(p + 10, true), sr: v.getUint32(p + 12, true), bits: v.getUint16(p + 22, true) };
    else if (id === 'data') { data = { off: p + 8, len: Math.min(size, v.byteLength - p - 8) }; break; }
    p += 8 + size + (size & 1);
  }
  if (!fmt || !data) throw new Error('bad wav');
  const bps = fmt.bits >> 3, frames = Math.floor(data.len / (bps * fmt.ch)), mono = new Float32Array(frames);
  const isFloat = fmt.tag === 3;
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < fmt.ch; c++) {
      const o = data.off + (i * fmt.ch + c) * bps;
      if (isFloat) s += v.getFloat32(o, true);
      else if (bps === 2) s += v.getInt16(o, true) / 32768;
      else if (bps === 3) s += ((v.getUint8(o) | (v.getUint8(o + 1) << 8) | (v.getInt8(o + 2) << 16)) / 8388608);
      else if (bps === 4) s += v.getInt32(o, true) / 2147483648;
      else s += (v.getUint8(o) - 128) / 128;
    }
    mono[i] = s / fmt.ch;
  }
  if (fmt.sr === rate) return mono;
  const n = Math.floor(frames * rate / fmt.sr), out = new Float32Array(n), k = fmt.sr / rate;
  for (let i = 0; i < n; i++) { const x = i * k, a = Math.floor(x), f = x - a; out[i] = (mono[a] || 0) * (1 - f) + (mono[Math.min(a + 1, frames - 1)] || 0) * f; }
  return out;
}

// ---------- tensors / state ----------
function filled(shape, dtype, fill) {
  const n = shape.reduce(function (a, b) { return a * b; }, 1);
  if (dtype === 'int64') return new BigInt64Array(n);
  if (dtype === 'bool') return new Uint8Array(n);
  const d = new Float32Array(n); if (fill === 'nan') d.fill(NaN); else if (fill === 'ones') d.fill(1); return d;
}
const T = (dtype, data, dims) => new ort.Tensor(dtype, data, dims);
function initState(manifest) { const s = {}; for (const e of manifest) s[e.input_name] = T(e.dtype, filled(e.shape, e.dtype, e.fill), e.shape); return s; }
// feed only what the graph asks for; anything it needs that we don't have comes from its manifest default
async function run(sess, feeds, manifest) {
  const f = {};
  for (const name of sess.inputNames) {
    if (feeds[name]) f[name] = feeds[name];
    else { const e = manifest && manifest.find(function (x) { return x.input_name === name; }); if (!e) throw new Error('Model input "' + name + '" missing (model wants: ' + sess.inputNames.join(', ') + ')'); f[name] = T(e.dtype, filled(e.shape, e.dtype, e.fill), e.shape); }
  }
  try { return await sess.run(f); }
  catch (e) { throw new Error(((e && e.message) || String(e)) + ' (inputs: ' + sess.inputNames.join(', ') + ' / outputs: ' + sess.outputNames.join(', ') + ')'); }
}
function keepState(state, out, manifest) { for (const e of manifest) if (out[e.output_name]) state[e.input_name] = out[e.output_name]; }

// ---------- loading ----------
async function load() {
  if (voiceState) return;
  progress(1, 'Loading the voice engine…');
  const mod = await import('https://cdn.jsdelivr.net/npm/onnxruntime-web@' + ORT_VERSION + '/dist/ort.wasm.min.mjs');
  ort = mod.default || mod;
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@' + ORT_VERSION + '/dist/';
  ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(navigator.hardwareConcurrency || 2, 4) : 1;

  const total = Object.values(SIZES).reduce(function (a, b) { return a + b; }, 0); let got = 0, lastPct = -1;
  const tick = function (n) { got += n; const pct = 2 + 80 * got / total; if (Math.round(pct) !== lastPct) { lastPct = Math.round(pct); progress(pct, 'Downloading the Tamil voice (first time only) — ' + Math.min(100, Math.round(100 * got / total)) + '% of ~110 MB'); } };
  const keys = Object.keys(FILES), bufs = {};
  await Promise.all(keys.map(async function (k) { bufs[k] = await getFile(k, tick); }));

  meta = JSON.parse(new TextDecoder().decode(bufs.bundle));
  progress(84, 'Starting the voice engine…');
  const opt = { executionProviders: ['wasm'], graphOptimizationLevel: 'all' };
  for (const k of ['text_conditioner', 'flow_lm_main', 'flow_lm_flow', 'mimi_decoder', 'mimi_encoder']) {
    try { S[k] = await ort.InferenceSession.create(new Uint8Array(bufs[k]), opt); }
    catch (e) { throw new Error('[step: start ' + FILES[k] + '] ' + ((e && e.message) || e)); }
    bufs[k] = null;
  }
  const spm = await import('./vendor/sentencepiece.mjs');
  sp = new spm.SentencePieceProcessor(); await sp._loadModel(new Uint8Array(bufs.tokenizer));
  if (meta.insert_bos_before_voice && bufs.bos) bos = parseNpy(bufs.bos);

  // voice: the repo ships one real recording (Geetha); turn it into the model's voice prompt once per visit
  progress(92, 'Preparing the voice…');
  try { await makeVoice(bufs); } catch (e) { throw new Error('[step: voice] ' + ((e && e.message) || e)); }
}
async function makeVoice(bufs) {
  const wav = parseWav(bufs.voice, meta.sample_rate || 24000);
  const enc = await run(S.mimi_encoder, { audio: T('float32', wav, [1, 1, wav.length]) }, meta.mimi_state_manifest);
  const e0 = enc[S.mimi_encoder.outputNames[0]];
  let dims = e0.dims.slice(); while (dims.length > 3 && dims[0] === 1) dims = dims.slice(1); if (dims.length < 3) dims = [1].concat(dims);
  let vdata = new Float32Array(e0.data), vdims = dims;
  if (bos) { const c = new Float32Array(bos.data.length + vdata.length); c.set(bos.data, 0); c.set(vdata, bos.data.length); vdims = [1, dims[1] + bos.data.length / dims[2], dims[2]]; vdata = c; }
  const st = initState(meta.flow_lm_state_manifest);
  const res = await run(S.flow_lm_main, Object.assign({ sequence: T('float32', new Float32Array(0), [1, 0, meta.latent_dim]), text_embeddings: T('float32', vdata, vdims) }, st), meta.flow_lm_state_manifest);
  keepState(st, res, meta.flow_lm_state_manifest);
  voiceState = st;
}

// ---------- text ----------
function prepare(text) {
  let t = String(text || '').replace(/\r/g, ' ').replace(/\n+/g, '. ').replace(/\s+/g, ' ').replace(/(\.\s*){2,}/g, '. ').trim();
  if (meta.remove_semicolons) t = t.replace(/;/g, ',');
  if (t && !/[.!?…।]$/.test(t)) t += '.';
  return t;
}
function chunks(text) {
  const max = Number(meta.max_token_per_chunk || 50), out = [];
  const sentences = (text.match(/[^.!?।]+[.!?।]+|[^.!?।]+$/g) || [text]).map(function (s) { return s.trim(); }).filter(Boolean);
  let cur = '';
  for (const s of sentences) {
    const ids = sp.encodeIds(s);
    if (ids.length > max) {
      if (cur) { out.push(cur); cur = ''; }
      // long sentence: break at commas / spaces so we never cut a word in half
      const words = s.split(/(?<=[,，])\s*|\s+/).filter(Boolean); let piece = '';
      for (const w of words) { const tryP = piece ? piece + ' ' + w : w; if (piece && sp.encodeIds(tryP).length > max) { out.push(piece); piece = w; } else piece = tryP; }
      if (piece) out.push(piece);
      continue;
    }
    const comb = cur ? cur + ' ' + s : s;
    if (cur && sp.encodeIds(comb).length > max) { out.push(cur); cur = s; } else cur = comb;
  }
  if (cur) out.push(cur);
  return out;
}

function gauss(n, std) { const d = new Float32Array(n); for (let i = 0; i < n; i++) { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); d[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std; } return d; }

async function generate(text) {
  await load();
  const t = prepare(text); if (!t) throw new Error('No text');
  const parts = chunks(t), L = meta.latent_dim, SR = meta.sample_rate || 24000;
  const words = t.split(/\s+/).filter(Boolean).length, afterEos = meta.model_recommended_frames_after_eos != null ? Number(meta.model_recommended_frames_after_eos) : (words <= 4 ? 3 : 1);
  const emptySeq = T('float32', new Float32Array(0), [1, 0, L]), emptyText = T('float32', new Float32Array(0), [1, 0, meta.conditioning_dim]);
  const audio = []; let samples = 0;
  for (let ci = 0; ci < parts.length; ci++) {
    const flow = Object.assign({}, voiceState); let mimi = initState(meta.mimi_state_manifest);
    const ids = sp.encodeIds(parts[ci]); if (!ids.length) continue;
    const tc = await S.text_conditioner.run({ [S.text_conditioner.inputNames[0]]: T('int64', BigInt64Array.from(ids.map(function (x) { return BigInt(x); })), [1, ids.length]) });
    let emb = tc[S.text_conditioner.outputNames[0]];
    if (emb.dims.length === 2) emb = T('float32', new Float32Array(emb.data), [1, emb.dims[0], emb.dims[1]]);
    keepState(flow, await run(S.flow_lm_main, Object.assign({ sequence: emptySeq, text_embeddings: emb }, flow), meta.flow_lm_state_manifest), meta.flow_lm_state_manifest);
    let latent = T('float32', new Float32Array(L).fill(NaN), [1, 1, L]), eosAt = null; const pending = [];
    const decode = async function () {
      if (!pending.length) return;
      const lat = new Float32Array(pending.length * L); pending.forEach(function (p, i) { lat.set(p, i * L); });
      const r = await run(S.mimi_decoder, Object.assign({ latent: T('float32', lat, [1, pending.length, L]) }, mimi), meta.mimi_state_manifest);
      keepState(mimi, r, meta.mimi_state_manifest);
      const a = new Float32Array(r[S.mimi_decoder.outputNames[0]].data); audio.push(a); samples += a.length; pending.length = 0;
    };
    for (let step = 0; step < MAX_FRAMES; step++) {
      if (step && step % 4 === 0) await new Promise(function (r) { setTimeout(r, 0); });
      const ar = await run(S.flow_lm_main, Object.assign({ sequence: latent, text_embeddings: emptyText }, flow), meta.flow_lm_state_manifest);
      if (eosAt == null && ar.eos_logit.data[0] > EOS_THRESHOLD) eosAt = step;
      const x = gauss(L, Math.sqrt(TEMPERATURE));
      for (let k = 0; k < LSD_STEPS; k++) {
        const s = k / LSD_STEPS, tt = s + 1 / LSD_STEPS;
        const fr = await S.flow_lm_flow.run({ c: ar.conditioning, s: T('float32', new Float32Array([s]), [1, 1]), t: T('float32', new Float32Array([tt]), [1, 1]), x: T('float32', x, [1, L]) });
        const dir = fr.flow_dir.data; for (let i = 0; i < L; i++) x[i] += dir[i] / LSD_STEPS;
      }
      pending.push(new Float32Array(x)); latent = T('float32', x, [1, 1, L]);
      keepState(flow, ar, meta.flow_lm_state_manifest);
      if (pending.length >= 12) await decode();
      if (eosAt != null && step >= eosAt + afterEos) break;
      if (step % 10 === 0) progress(100 * (ci + Math.min(0.95, step / 120)) / parts.length * 0.98, 'Speaking… part ' + (ci + 1) + ' of ' + parts.length);
    }
    await decode();
    if (ci < parts.length - 1) { const g = new Float32Array(Math.floor(GAP_SEC * SR)); audio.push(g); samples += g.length; }
  }
  const out = new Float32Array(samples); let o = 0; for (const a of audio) { out.set(a, o); o += a.length; }
  return { data: out, sampleRate: SR };
}

self.onmessage = async function (e) {
  const m = e.data || {};
  if (m.type !== 'generate') return;
  if (busy) { post({ type: 'error', error: 'Already speaking — please wait.' }); return; }
  busy = true;
  try {
    try { await load(); } catch (e) { throw /^\[step/.test(e.message || '') ? e : new Error('[step: download/load] ' + ((e && e.message) || e)); }
    let r; try { r = await generate(m.text); } catch (e) { throw /^\[step/.test(e.message || '') ? e : new Error('[step: speak] ' + ((e && e.message) || e)); }
    post({ type: 'audio', data: r.data, sampleRate: r.sampleRate }, [r.data.buffer]);
  }
  catch (err) { post({ type: 'error', error: String((err && err.message) || err) }); }
  busy = false;
};
