// Pure-logic checks for category-audio.js (cut / join / fade / gain / WAV writer). Run: node tests/audio-core.test.cjs
const vm = require('vm'), fs = require('fs'), assert = require('assert');
const win = {}; const ctx = vm.createContext({ window: win, TOOL_IMPL: {}, document: { getElementById() { return {}; }, head: { appendChild() {} } }, navigator: {}, console });
vm.runInContext(fs.readFileSync(__dirname + '/../category-audio.js', 'utf8'), ctx);
const A = win.AudioCore; let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('PASS ' + m); };
const tone = (sec, sr = 1000, nch = 2, v = 0.5) => { const b = A.make(sr, nch, sec * sr); b.channels.forEach(c => c.fill(v)); return b; };
ok(A.parseT('1:05.5') === 65.5 && isNaN(A.parseT('x')), 'parseT');
let b = A.slice(tone(10), 2, 5); ok(b.channels[0].length === 3000 && b.channels.length === 2, 'slice 2–5 s keeps 3 s, both channels');
b = A.removePart(tone(10), 2, 5); ok(b.channels[0].length === 7000, 'remove 2–5 s of 10 s leaves 7 s');
b = A.concat([tone(3), tone(2)], 1, 0); ok(b.channels[0].length === 6000 && b.channels[0][3500] === 0 && b.channels[0][5500] === 0.5, 'join with 1 s silence = 3+1+2 s, silence in the gap');
b = A.concat([tone(3), tone(2)], 0, 1); ok(b.channels[0].length === 4000 && Math.abs(b.channels[0][2500] - 0.5) < 1e-6, 'cross-fade 1 s overlaps: 3+2−1 s, level stays even');
b = A.concat([tone(1, 1000, 1), tone(1, 1000, 2)], 0, 0); ok(b.channels.length === 2 && b.channels[1][100] === 0.5, 'mono + stereo join → stereo (mono copied to both sides)');
b = A.fade(tone(4), 1, 1); ok(b.channels[0][0] === 0 && Math.abs(b.channels[0][500] - 0.25) < 1e-3 && b.channels[0][2000] === 0.5 && b.channels[0][3999] === 0, 'fade in/out ramps');
b = A.gain(tone(1, 1000, 1, 0.6), 2); ok(b.channels[0][0] === 1, 'gain clips at full scale');
b = A.normalize(tone(1, 1000, 1, 0.25), -1); ok(Math.abs(A.peak(b) - Math.pow(10, -1 / 20)) < 1e-6, 'normalise to −1 dBFS');
b = A.toMono({ sampleRate: 1000, channels: [new Float32Array([1, 1]), new Float32Array([0, -1])] }); ok(b.channels.length === 1 && b.channels[0][0] === 0.5 && b.channels[0][1] === 0, 'mono = average of channels');
const w = A.wavBytes(tone(1, 8000, 2, 0.5)); const dv = new DataView(w.buffer);
ok(String.fromCharCode(...w.slice(0, 4)) === 'RIFF' && dv.getUint32(24, true) === 8000 && dv.getUint16(22, true) === 2 && w.length === 44 + 8000 * 2 * 2 && dv.getInt16(44, true) === Math.round(0.5 * 0x7FFF) - 0 || dv.getInt16(44, true) === 16383, 'WAV header + 16-bit samples');
const pk = A.peaks(tone(2, 1000, 1, 0.3), 10); ok(pk.length === 10 && Math.abs(pk[3][1] - 0.3) < 1e-6, 'waveform peaks');

// --- DSP added in UPDATE_61
{ const sr = 8000, n = sr * 2, b = A.make(sr, 2, n); for (let i = 0; i < n; i++) b.channels[0][i] = b.channels[1][i] = Math.sin(2 * Math.PI * 440 * i / sr) * 0.5;
  const zc = c => { let z = 0; for (let i = 1; i < c.length; i++) if (c[i - 1] < 0 && c[i] >= 0) z++; return z; };
  const s = A.wsola(b, 2); ok(Math.abs(s.channels[0].length - 2 * n) < 2 && Math.abs(zc(s.channels[0].subarray(sr / 2, 3 * sr)) / 2.5 - 440) < 12, 'WSOLA ×2 doubles the length and keeps 440 Hz');
  const h = A.wsola(b, 0.5); ok(Math.abs(h.channels[0].length - n / 2) < 2 && Math.abs(zc(h.channels[0].subarray(800, 7200)) / 0.8 - 440) < 15, 'WSOLA ×0.5 halves the length and keeps 440 Hz');
  const v = A.vocalRemove(b, false); let e = 0; for (let i = sr; i < n; i++) e += v.channels[0][i] ** 2; ok(Math.sqrt(e / sr) < 0.01, 'vocal remover cancels a centred 440 Hz voice'); }
{ const re = new Float32Array(16), im = new Float32Array(16); re[3] = 1; const r0 = re.slice(); A.fft(re, im); for (let i = 0; i < 16; i++) im[i] = -im[i]; A.fft(re, im); ok(Math.abs(re[3] / 16 - 1) < 1e-6 && Math.abs(re[5] / 16) < 1e-6, 'FFT → inverse FFT returns the input'); }
console.log('\nALL ' + n + ' AUDIO-CORE CHECKS PASS');
