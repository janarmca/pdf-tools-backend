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
t('order book: 5 pants + 3 shirts, express, discount, advance, balance', () => {
  const o = { l: [{ n: 'பேன்ட் / Pant', s: 'x', q: '5', r: '15' }, { n: 'சட்டை / Shirt', s: 'x', q: '3', r: '12' }, { n: '', q: '9', r: '9' }], ex: '50', dis: '10', pay: [{ a: 50 }] };
  const c = C.orderCalc(o);
  assert.deepStrictEqual(c, { sub: 111, ex: 55.5, dis: 10, total: 156.5, paid: 50, bal: 106.5, pcs: 8, lines: 2 });
  assert.strictEqual(C.itemSummary(o, false), 'பேன்ட் ×5, சட்டை ×3');
  assert.strictEqual(C.itemSummary({ l: [{ n: 'சட்டை / Shirt', q: 2 }, { n: 'சட்டை / Shirt', q: 1 }] }, true), 'Shirt ×3');
  assert.strictEqual(C.orderCalc({ l: [{ n: 'A', q: '1', r: '10' }], dis: '50' }).total, 0); // discount never makes it negative
});
t('order book: dates, overdue and day summary', () => {
  assert.strictEqual(C.addDaysIso('2026-12-30', 3), '2027-01-02'); assert.strictEqual(C.addDaysIso('2028-02-28', 1), '2028-02-29'); assert.strictEqual(C.addDaysIso('bad', 1), '');
  const today = '2026-10-24';
  const os = [
    { d: today, st: 'open', due: today, l: [{ n: 'a', q: 5, r: 10 }], pay: [{ d: today, a: 20, m: 'cash' }] },
    { d: '2026-10-20', st: 'open', due: '2026-10-22', l: [{ n: 'b', q: 2, r: 30 }], pay: [{ d: today, a: 10, m: 'upi' }] },
    { d: '2026-10-21', st: 'ready', due: '2026-10-25', l: [{ n: 'c', q: 1, r: 100 }], pay: [] },
    { d: today, st: 'cancel', due: today, l: [{ n: 'd', q: 9, r: 9 }], pay: [{ d: today, a: 999, m: 'cash' }] },
    { d: '2026-10-01', st: 'done', due: '2026-10-02', l: [{ n: 'e', q: 1, r: 40 }], pay: [{ d: '2026-10-02', a: 40 }] }
  ];
  assert.ok(C.isOverdue(os[1], today)); assert.ok(!C.isOverdue(os[0], today)); assert.ok(!C.isOverdue(os[4], today));
  assert.deepStrictEqual(C.dayStats(os, today), { orders: 1, pcs: 5, billed: 50, cash: 20, upi: 10, dueToday: 1, overdue: 1, readyWaiting: 1, toCollect: 180 });
  const csv = C.ordersCsv([Object.assign({ tok: 7, c: { n: 'Ravi, K', ph: '98' } }, os[0])]);
  assert.ok(csv.split('\r\n')[1].startsWith('7,2026-10-24,"Ravi, K",98,a ×5,5,50,20,30,2026-10-24,In progress'), csv);
});
t('order-book trades and tailor measurements are well formed', () => {
  assert.ok(C.TRADES.length >= 12); assert.strictEqual(new Set(C.TRADES.map(x => x.id)).size, C.TRADES.length);
  C.TRADES.forEach(x => { assert.ok(x.ta && x.en && x.icon && x.svc.length >= 1, x.id); (x.fields || []).forEach(f => assert.ok(['text', 'date', 'time', 'num', 'checks'].indexOf(f[2]) >= 0, x.id + f[0])); x.items.forEach(i => assert.ok(/ \/ /.test(i), x.id + ': ' + i)); });
  Object.keys(C.MEASURES).forEach(k => assert.ok(C.MEASURES[k].f.length >= 6, k));
});
t('trip fares: local package with extra hours/km, fixed fare, per-km unchanged', () => {
  const a = C.tripFare({ mode: 'local', startKm: 1000, endKm: 1100, hours: 10, pkgHours: 8, pkgKm: 80, pkgPrice: 2000, extraHrRate: 150, extraKmRate: 14, battaPerDay: 300, days: 1, toll: 50, advance: 500 });
  assert.strictEqual(a.exHr, 2); assert.strictEqual(a.exKm, 20); assert.strictEqual(a.fare, 2580); assert.strictEqual(a.total, 2930); assert.strictEqual(a.due, 2430);
  const b = C.tripFare({ mode: 'local', startKm: 0, endKm: 50, hours: 5, pkgHours: 8, pkgKm: 80, pkgPrice: 2000, extraHrRate: 150, extraKmRate: 14 });
  assert.strictEqual(b.fare, 2000); // inside the package: no extras
  const f = C.tripFare({ mode: 'fixed', fixedPrice: 1200, toll: 100, gstPct: 5 }); assert.strictEqual(f.total, 1365);
  assert.deepStrictEqual(C.tripFare({ mode: 'km', startKm: 1000, endKm: 1180, ratePerKm: 12, minKmPerDay: 250, battaPerDay: 300 }), C.tripBill({ startKm: 1000, endKm: 1180, ratePerKm: 12, minKmPerDay: 250, battaPerDay: 300 }));
});
t('carpenter cut list adds every row, skips incomplete rows', () => {
  assert.strictEqual(C.cutListCft([{ len: '10', wid: '6', thk: '2', qty: '1' }, { len: '7', wid: '4', thk: '3', qty: '4' }, { len: '', wid: '5', thk: '2', qty: '9' }]), 3.167);
  assert.strictEqual(C.cutListCost([{ len: '10', wid: '6', thk: '2' }, { len: '7', wid: '4', thk: '3', qty: '4' }], 2400), 7600); // not 3.167 × 2400 = 7600.80
});
t('quick bill: WhatsApp order text is read in Tamil, Tanglish and English', () => {
  const rows = C.parseOrder('Like thakali 2 kg, vendaka 250 gm, podalanga 100 gram, puthina 10 rs\nதக்காளி அரை கிலோ\n2kg vengayam 1/2 kg urulai\n₹20 kothamalli\n1. coconut 2\nmalli poo 2 muzham');
  const got = rows.map(r => [C.matchGoods(r.name), r.qty, r.unit]);
  assert.deepStrictEqual(got, [['tomato', 2, 'kg'], ['okra', 250, 'g'], ['snakegourd', 100, 'g'], ['mint', 10, 'rs'], ['tomato', 0.5, 'kg'], ['onion', 2, 'kg'], ['potato', 0.5, 'kg'], ['coriander', 20, 'rs'], ['coconut', 2, null], ['jasmine', 2, 'muzham']]);
  assert.strictEqual(C.matchName('Like thakali').exact, false); assert.strictEqual(C.matchName('thakkali').exact, true);
  assert.strictEqual(C.matchGoods('pepper'), 'pepper'); assert.strictEqual(C.matchGoods('poo'), null); assert.strictEqual(C.matchGoods('xyzabc'), null);
});
t('quick bill: amounts for kg, grams, rupees, round off', () => {
  assert.strictEqual(C.qbLine({ qty: '2', unit: 'kg', rate: '30' }), 60); assert.strictEqual(C.qbLine({ qty: '250', unit: 'g', rate: '60' }), 15);
  assert.strictEqual(C.qbLine({ qty: '10', unit: 'rs', rate: '999' }), 10); assert.strictEqual(C.qbLine({ qty: '500', unit: 'ml', rate: '64' }), 32);
  const b = { lines: [{ qty: '2', unit: 'kg', rate: '30' }, { qty: '250', unit: 'g', rate: '58' }, { qty: '10', unit: 'rs' }], delivery: '10', discount: '0', roundOff: true };
  assert.deepStrictEqual(C.qbTotals(b), { sub: 84.5, del: 10, dis: 0, total: 95, roundOff: 0.5 });
});
t('quick bill: UPI link and pay page link', () => {
  assert.ok(C.validVpa('murugan.veg@okaxis')); assert.ok(!C.validVpa('murugan')); assert.ok(!C.validVpa('a b@ok'));
  assert.strictEqual(C.upiString({ pa: 'shop@ybl', pn: 'Murugan Veg', am: 95, tn: 'Bill 7' }), 'upi://pay?pa=shop@ybl&pn=Murugan%20Veg&am=95.00&cu=INR&tn=Bill%207');
  assert.strictEqual(C.payLink({ pa: 'shop@ybl', pn: 'M', am: 95, tn: 'Bill 7', shop: 'முருகன்', bill: 7, phone: '98765 43210' }), 'https://pdftoolsindia.com/pay#pa=shop%40ybl&pn=M&am=95.00&tn=Bill%207&s=%E0%AE%AE%E0%AF%81%E0%AE%B0%E0%AF%81%E0%AE%95%E0%AE%A9%E0%AF%8D&b=7&ph=919876543210');
});
console.log(n + ' tests passed');
