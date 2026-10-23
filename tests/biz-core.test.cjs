// node tests/biz-core.test.cjs — pure helpers of category-biz.js (small-business tools)
const assert = require('assert');
global.window = {};
require('../category-biz.js');
const C = window.BizCore;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('number parsing: commas, rupee sign, Tamil digits, junk', () => {
  assert.strictEqual(C.num('1,250.50'), 1250.5); assert.strictEqual(C.num('₹ 300'), 300); assert.strictEqual(C.num('௧௨௫'), 125);
  assert.ok(Number.isNaN(C.num(''))); assert.ok(Number.isNaN(C.num('abc'))); assert.ok(Number.isNaN(C.num('1.2.3')));
});
t('credit book balance and totals', () => {
  const c1 = { n: 'A', e: [{ t: 'c', a: 500 }, { t: 'c', a: 250.5 }, { t: 'p', a: 300 }] };
  const c2 = { n: 'B', e: [{ t: 'c', a: 100 }, { t: 'p', a: 150 }] }; // paid 50 extra → advance
  const c3 = { n: 'C', e: [] };
  assert.strictEqual(C.balanceOf(c1.e), 450.5); assert.strictEqual(C.balanceOf(c2.e), -50);
  assert.deepStrictEqual(C.khataTotals([c1, c2, c3]), { owed: 450.5, advance: 50, owing: 1, customers: 3 });
});
t('csv export escapes quotes and commas', () => {
  const csv = C.khataCsv([{ n: 'Raja, "Mani"', p: '9876543210', e: [{ d: '2026-10-01', t: 'c', a: 100, n: 'oil' }, { d: '2026-10-02', t: 'p', a: 40, n: '' }] }]);
  const lines = csv.split('\r\n'); assert.strictEqual(lines.length, 3);
  assert.ok(lines[1].startsWith('"Raja, ""Mani""",9876543210,2026-10-01,Credit given,100,oil,100')); assert.ok(lines[2].endsWith(',60'));
});
t('timber cft, round log, plywood sheets', () => {
  assert.strictEqual(C.timberCft(10, 6, 2, 1), 0.833); assert.strictEqual(C.timberCft(8, 12, 1, 4), 2.667); // 8*12*1/144=0.6667 ×4
  assert.strictEqual(C.roundLogCft(48, 12), 12); // (48/4)^2*12/144 = 144*12/144 = 12
  assert.strictEqual(C.sheetsNeeded(100, 32, 10), 4); // 110/32 = 3.44 → 4
  assert.strictEqual(C.sheetsNeeded(64, 32, 0), 2); assert.strictEqual(C.sheetsNeeded(65, 32, 0), 3); assert.strictEqual(C.sheetsNeeded(10, 0, 5), 0);
});
t('feet-inch ↔ cm', () => {
  assert.strictEqual(C.ftInToCm(5, 6), 167.64); assert.deepStrictEqual(C.cmToFtIn(167.64), { ft: 5, inch: 6 }); assert.deepStrictEqual(C.cmToFtIn(30.48), { ft: 1, inch: 0 });
});
t('trip bill: minimum km, waiting, batta, toll, GST, advance', () => {
  let r = C.tripBill({ startKm: 1000, endKm: 1180, days: 1, ratePerKm: 12, minKmPerDay: 250, waitHours: 2, waitRate: 100, battaPerDay: 300, toll: 120, parking: 30, gstPct: 5, advance: 1000 });
  assert.strictEqual(r.km, 180); assert.strictEqual(r.billKm, 250); assert.strictEqual(r.minApplied, true);
  assert.strictEqual(r.fare, 3000); assert.strictEqual(r.wait, 200); assert.strictEqual(r.batta, 300); assert.strictEqual(r.other, 150);
  assert.strictEqual(r.sub, 3650); assert.strictEqual(r.tax, 182.5); assert.strictEqual(r.total, 3832.5); assert.strictEqual(r.due, 2832.5);
  r = C.tripBill({ startKm: 0, endKm: 600, days: 2, ratePerKm: 10, minKmPerDay: 250 }); assert.strictEqual(r.billKm, 600); assert.strictEqual(r.minApplied, false);
  r = C.tripBill({ startKm: 500, endKm: 400, ratePerKm: 10 }); assert.strictEqual(r.km, 0); // end below start never goes negative
});
t('profit: margin vs markup, GST, break-even', () => {
  assert.strictEqual(C.priceFromCost(75, 25), 100); assert.strictEqual(C.priceFromMarkup(80, 25), 100); assert.ok(Number.isNaN(C.priceFromCost(50, 100)));
  assert.deepStrictEqual(C.profitOf(80, 100), { profit: 20, margin: 20, markup: 25 });
  assert.strictEqual(C.withGst(100, 18), 118); assert.strictEqual(C.withoutGst(118, 18), 100);
  assert.strictEqual(C.breakEven(10000, 50, 30), 500); assert.strictEqual(C.breakEven(10001, 50, 30), 501); assert.strictEqual(C.breakEven(100, 30, 30), Infinity);
});
t('WhatsApp numbers and links', () => {
  assert.strictEqual(C.waNumber('98765 43210'), '919876543210'); assert.strictEqual(C.waNumber('09876543210'), '919876543210');
  assert.strictEqual(C.waNumber('+91 98765-43210'), '919876543210'); assert.strictEqual(C.waNumber('12345'), ''); assert.strictEqual(C.waNumber(''), '');
  assert.strictEqual(C.waLink('9876543210', 'வணக்கம் & நன்றி'), 'https://wa.me/919876543210?text=' + encodeURIComponent('வணக்கம் & நன்றி'));
  assert.ok(C.waLink('', 'hi').startsWith('https://wa.me/?text='));
});
t('message templates fill and leave blanks visible', () => {
  const m = C.MESSAGES.find(x => x.id === 'due');
  assert.strictEqual(C.fillTemplate(m.e, { name: 'Ravi', amount: '450', shop: 'Murugan Stores' }), 'Hello Ravi, a balance of ₹450 is pending on your account. Please pay at your convenience. Thank you. — Murugan Stores');
  assert.ok(C.fillTemplate(m.e, { name: '' }).indexOf('____') >= 0);
  C.MESSAGES.forEach(x => { assert.ok(x.t && x.e && x.ta && x.en, x.id); });
});
t('stamp helpers: mm → px at 300 dpi, tamil graphemes stay together', () => {
  assert.strictEqual(C.mmToPx(25.4, 300), 300); assert.strictEqual(C.mmToPx(40, 300), 472);
  const g = C.graphemes('தமிழ்'); assert.ok(g.length <= 3 && g.join('') === 'தமிழ்', JSON.stringify(g)); // த · மி · ழ்
  assert.strictEqual(C.nextToken(9), 10); assert.strictEqual(C.nextToken('x'), 1);
});
t('rate-card presets are complete', () => {
  assert.ok(C.PRESETS.length >= 10); C.PRESETS.forEach(p => { assert.ok(p.id && p.ta && p.en && p.items.length >= 5, p.id); });
  assert.strictEqual(new Set(C.PRESETS.map(p => p.id)).size, C.PRESETS.length);
});
console.log(n + ' tests passed');
