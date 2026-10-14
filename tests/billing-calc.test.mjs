// Run: node tests/billing-calc.test.mjs  (pure maths: GST split, inclusive prices, round-off, GSTIN check digit)
import fs from 'fs'; import assert from 'node:assert/strict';
const TOOL_IMPL = {}; globalThis.TOOL_IMPL = TOOL_IMPL;
globalThis.numberToWordsINR = (n) => String(n);
new Function('TOOL_IMPL', fs.readFileSync(new URL('../category-docs.js', import.meta.url).pathname, 'utf8'))(TOOL_IMPL);
const { calcDoc, gstinCheck, fyOf } = TOOL_IMPL.quotepo._f;
const it = (desc, qty, rate, gst, o = {}) => ({ desc, hsn: o.hsn || '', qty, unit: 'NOS', rate, disc: o.disc || '', gst });
const R = (x) => x / 100;
// 1. blank HSN, two different rates, same state  (old code taxed BOTH at the first item's 5%)
let c = calcDoc([it('A', 3, 1000, 5), it('B', 2, 2500, 18)], { taxed: true, inter: false, inclusive: false, roundOff: false });
assert.equal(R(c.taxable), 8000); assert.equal(R(c.cgst), 525); assert.equal(R(c.sgst), 525); assert.equal(R(c.igst), 0); assert.equal(R(c.grand), 9050);
assert.equal(c.summary.length, 2);
// 2. inter-state -> IGST only
c = calcDoc([it('A', 3, 1000, 5), it('B', 2, 2500, 18)], { taxed: true, inter: true, roundOff: false });
assert.equal(R(c.igst), 1050); assert.equal(R(c.cgst), 0); assert.equal(R(c.grand), 9050);
// 3. discount 10% on B
c = calcDoc([it('A', 3, 1000, 5), it('B', 2, 2500, 18, { disc: 10 })], { taxed: true, inter: false, roundOff: false });
assert.equal(R(c.taxable), 7500); assert.equal(R(c.cgst + c.sgst), 960); assert.equal(R(c.grand), 8460);
// 4. GST-inclusive price: 118 incl 18% -> 100 + 18
c = calcDoc([it('X', 1, 118, 18)], { taxed: true, inter: false, inclusive: true, roundOff: false });
assert.equal(R(c.taxable), 100); assert.equal(R(c.tax), 18); assert.equal(R(c.grand), 118);
// 5. inclusive, several lines: grand must equal the sum of what customer sees (no stray paise)
c = calcDoc([it('X', 3, 99.99, 5), it('Y', 7, 49.5, 12), it('Z', 1, 1000, 18)], { taxed: true, inter: false, inclusive: true, roundOff: false });
assert.equal(c.grand, c.rows.reduce((a, r) => a + r.amount, 0)); assert.equal(c.taxable + c.tax, c.grand);
// 6. round-off + advance
c = calcDoc([it('A', 1, 1234.56, 18)], { taxed: true, inter: false, roundOff: true, advance: 500 });
assert.equal(R(c.total), 1456.78); assert.equal(R(c.grand), 1457); assert.equal(R(c.roundOff), 0.22); assert.equal(R(c.balance), 957);
// 7. no tax doc (Bill of Supply): GST column ignored even if set
c = calcDoc([it('A', 2, 100, 18)], { taxed: false, roundOff: false });
assert.equal(R(c.grand), 200); assert.equal(c.tax, 0);
// 8. decimal qty (kg)
c = calcDoc([it('Rice', 2.5, 62.4, 5)], { taxed: true, inter: false, roundOff: false });
assert.equal(R(c.taxable), 156); assert.equal(R(c.tax), 7.8); assert.equal(R(c.grand), 163.8);
// 9. same HSN, different rates stay separate; same HSN same rate merge
c = calcDoc([it('A', 1, 100, 5, { hsn: '1006' }), it('B', 1, 100, 18, { hsn: '1006' }), it('C', 1, 50, 5, { hsn: '1006' })], { taxed: true, inter: false, roundOff: false });
assert.equal(c.summary.length, 2); assert.equal(R(c.summary.find((g) => g.gst === 5).taxable), 150);
// 10. odd-paise tax splits evenly between CGST and SGST (never 1 paisa apart)
c = calcDoc([it('A', 1, 0.1, 5)], { taxed: true, inter: false, roundOff: false }); assert.equal(c.cgst, c.sgst);
// GSTIN check digit, known-valid public examples
for (const g of ['27AAPFU0939F1ZV', '29AABCT1332L1ZE', '33AAACH7409R1ZX']) console.log(g, JSON.stringify(gstinCheck(g)));
assert.equal(gstinCheck('27AAPFU0939F1ZV').ok, true); assert.equal(gstinCheck('27AAPFU0939F1ZX').ok, false); assert.equal(gstinCheck('27AAPFU0939F1Z').formatOk, false);
assert.equal(fyOf('2026-03-31'), '2025-26'); assert.equal(fyOf('2026-04-01'), '2026-27'); assert.equal(fyOf('2027-01-15'), '2026-27');
console.log('ALL CALC TESTS PASS');
