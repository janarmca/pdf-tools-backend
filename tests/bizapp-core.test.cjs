// node tests/bizapp-core.test.cjs — pure helpers of category-bizapp.js (cash book, staff wages, bookings, stock, renewals)
const assert = require('assert');
global.window = {};
require('../category-bizapp.js');
const C = window.BizAppCore;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('week and month ranges', () => {
  assert.deepStrictEqual(C.weekRange('2026-10-24', 1), { from: '2026-10-19', to: '2026-10-25' }); // Saturday → Mon..Sun
  assert.deepStrictEqual(C.weekRange('2026-10-24', 0), { from: '2026-10-18', to: '2026-10-24' });
  assert.deepStrictEqual(C.monthRange('2028-02-10'), { from: '2028-02-01', to: '2028-02-29', days: 29 });
  assert.strictEqual(C.isoAdd('2026-12-31', 1), '2027-01-01');
});
t('cash book totals, categories, modes, cash in hand', () => {
  const e = [{ d: '2026-10-24', t: 'in', a: 1500, c: 'Sales', m: 'cash' }, { d: '2026-10-24', t: 'in', a: 800, c: 'Sales', m: 'upi' }, { d: '2026-10-24', t: 'out', a: 300, c: 'Tea', m: 'cash' }, { d: '2026-10-23', t: 'out', a: 1000, c: 'Rent', m: 'bank' }, { d: '2026-10-24', t: 'out', a: 'x', c: 'Bad', m: 'cash' }];
  const s = C.cashSummary(e, '2026-10-24', '2026-10-24');
  assert.deepStrictEqual([s.in, s.out, s.net, s.count], [2300, 300, 2000, 3]); assert.deepStrictEqual(s.byCat, { Sales: 2300, Tea: -300 }); assert.deepStrictEqual(s.byMode, { cash: 1200, upi: 800, bank: 0 });
  assert.strictEqual(C.cashInHand(e, '500'), 1700); // 500 + 1500 − 300; UPI and bank are not cash
});
t('staff wages: daily, half days, overtime, advance, monthly with week-offs', () => {
  const att = { '2026-10-19': { a: { s: 'P', ot: 2 }, b: { s: 'P' } }, '2026-10-20': { a: { s: 'H' }, b: { s: 'W' } }, '2026-10-21': { a: { s: 'A' }, b: { s: 'P' } }, '2026-10-29': { a: { s: 'P' } } };
  const daily = { id: 'a', type: 'day', wage: 800, ot: 100 }, monthly = { id: 'b', type: 'month', wage: 15000 };
  const adv = [{ w: 'a', d: '2026-10-20', a: 500 }], paid = [{ w: 'a', d: '2026-10-25', a: 100 }];
  const p = C.staffPay(daily, att, adv, paid, '2026-10-19', '2026-10-25', 30);
  assert.deepStrictEqual(p, { P: 1, H: 1, A: 1, W: 0, otHours: 2, days: 1.5, earned: 1200, ot: 200, adv: 500, paid: 100, bal: 800 });
  const m = C.staffPay(monthly, att, [], [], '2026-10-19', '2026-10-25', 30);
  assert.strictEqual(m.earned, 1500); // (2 present + 1 week-off) × 15000 / 30
});
t('bookings: clash check and calendar file', () => {
  const list = [{ id: '1', d: '2026-11-02', t: '10:00', mins: 120, st: 'booked' }, { id: '2', d: '2026-11-02', t: '', st: 'booked' }, { id: '3', d: '2026-11-02', t: '15:00', mins: 60, st: 'cancel' }];
  assert.deepStrictEqual(C.clashes(list.slice(0, 1), { id: 'x', d: '2026-11-02', t: '11:30', mins: 60 }).map(x => x.id), ['1']);
  assert.deepStrictEqual(C.clashes(list.slice(0, 1), { id: 'x', d: '2026-11-02', t: '12:00', mins: 60 }).map(x => x.id), []);
  assert.deepStrictEqual(C.clashes(list, { id: 'x', d: '2026-11-02', t: '15:00', mins: 60 }).map(x => x.id), ['2']); // all-day clashes, cancelled does not
  const ics = C.icsFor({ id: 'b1', d: '2026-11-02', t: '10:00', mins: 120, title: 'Wedding, Ravi; hall', place: 'Madurai' });
  assert.ok(ics.indexOf('DTSTART:20261102T100000') > 0 && ics.indexOf('DURATION:PT120M') > 0 && ics.indexOf('SUMMARY:Wedding\\, Ravi\\; hall') > 0 && ics.split('BEGIN:VALARM').length === 3 && /\r\n$/.test(ics));
  assert.ok(C.icsFor({ id: 'b2', d: '2026-11-02', title: 'x' }).indexOf('DTSTART;VALUE=DATE:20261102') > 0);
});
t('stock quantity, counted stock and value', () => {
  const it = [{ id: 'r', open: '10', cost: '50' }, { id: 's', open: '2', cost: '40' }];
  const mv = [{ i: 'r', t: 'in', q: 5 }, { i: 'r', t: 'out', q: 3 }, { i: 's', t: 'out', q: 5 }, { i: 'r', t: 'set', q: 11 }, { i: 'r', t: 'out', q: 1 }];
  assert.strictEqual(C.stockQty(it[0], mv), 10); assert.strictEqual(C.stockQty(it[1], mv), -3); assert.strictEqual(C.stockValue(it, mv), 500); // negative stock adds no value
});
t('renewals: days left and repeating dates', () => {
  assert.strictEqual(C.daysLeft('2026-11-23', '2026-10-24'), 30); assert.strictEqual(C.daysLeft('2026-10-20', '2026-10-24'), -4);
  assert.strictEqual(C.nextRepeat('2026-01-31', 'month', '2026-10-24'), '2026-10-31');
  assert.strictEqual(C.nextRepeat('2026-01-31', 'month', '2026-02-15'), '2026-02-28');
  assert.strictEqual(C.nextRepeat('2024-02-29', 'year', '2026-10-24'), '2027-02-28');
  assert.strictEqual(C.nextRepeat('2026-05-01', 'none', '2026-10-24'), '2026-05-01');
});
console.log(n + ' tests passed');
