// node tests/examx-core.test.cjs — pure helpers of category-examx.js
const assert = require('assert');
global.window = {};
require('../category-examx.js');
const C = window.ExamxCore;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('HRA: smallest of the three, 2026 city list', () => {
  // yearly: basic 4.8L, HRA 1.92L, rent 1.8L, Bengaluru (50% from 2026) → min(1.92L, 1.8L-48k=1.32L, 2.4L) = 1.32L
  let r = C.hraExempt({ basic: 480000, da: 0, hra: 192000, rent: 180000, city: 'bengaluru', year: 'ty2026' });
  assert.strictEqual(r.exempt, 132000); assert.strictEqual(r.which, 'b'); assert.strictEqual(r.pct, 50);
  r = C.hraExempt({ basic: 480000, da: 0, hra: 192000, rent: 300000, city: 'bengaluru', year: 'old' });
  assert.strictEqual(r.pct, 40); assert.strictEqual(r.exempt, 192000); // min(192000, 252000, 192000)
  r = C.hraExempt({ basic: 300000, da: 60000, hra: 100000, rent: 20000, city: 'other', year: 'ty2026' });
  assert.strictEqual(r.exempt, 0); assert.strictEqual(r.taxable, 100000); // rent below 10% of salary
});
t('age on a date', () => { assert.deepStrictEqual(C.ageOn('2000-06-15', '2027-01-01'), { y: 26, m: 6, d: 17 }); assert.deepStrictEqual(C.ageOn('2004-02-29', '2025-02-28'), { y: 20, m: 11, d: 30 }); });
t('born between + relaxation', () => {
  // 21..32 on 1 Jan 2027 → born 02-01-1994 .. 01-01-2006
  assert.deepStrictEqual(C.bornBetween('2027-01-01', 21, 32), { from: '1994-01-02', to: '2006-01-01' });
  const gen = C.eligible('1993-12-31', '2027-01-01', 21, 32, 0); assert.strictEqual(gen.ok, false); assert.ok(gen.tooOld);
  const obc = C.eligible('1993-12-31', '2027-01-01', 21, 32, C.RELAX.obc); assert.strictEqual(obc.ok, true); assert.strictEqual(obc.max, 35);
  assert.strictEqual(C.eligible('2006-01-02', '2027-01-01', 21, 32, 0).tooYoung, true);
});
t('JPEG padding keeps a valid header', () => {
  const fake = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 16, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0xFF, 0xD9]);
  const p = C.padJpeg(fake, 150000);
  assert.ok(p.length >= 150000); assert.strictEqual(p[0], 0xFF); assert.strictEqual(p[1], 0xD8); assert.strictEqual(p[2], 0xFF); assert.strictEqual(p[3], 0xFE);
  // walk the segments: every COM length must be consistent and the original APP0 must follow
  let i = 2; while (p[i] === 0xFF && p[i + 1] === 0xFE) i += 2 + ((p[i + 2] << 8) | p[i + 3]);
  assert.strictEqual(p[i], 0xFF); assert.strictEqual(p[i + 1], 0xE0);
  assert.strictEqual(p[p.length - 1], 0xD9);
});
t('otsu splits two peaks', () => { const h = new Array(256).fill(0); h[30] = 500; h[220] = 5000; const th = C.otsu(h, 5500); assert.ok(th >= 30 && th < 220); });
t('presets have sane numbers', () => { Object.values(C.PRESETS).forEach((p) => Object.values(p.items).forEach((it) => { assert.ok(it.w > 0 && it.h > 0 && it.max >= it.min); })); });
console.log('ALL EXAMX TESTS PASS (' + n + ')');
