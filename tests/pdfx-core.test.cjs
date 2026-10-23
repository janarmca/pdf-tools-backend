// node tests/pdfx-core.test.cjs — pure helpers of category-pdfx.js
const assert = require('assert');
global.window = {};
require('../category-pdfx.js');
const C = window.PdfxCore;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

// Verhoeff: make a valid 12-digit number by appending the check digit
function withCheck(base11) { for (let d = 0; d <= 9; d++) if (C.verhoeffOk(base11 + d)) return base11 + d; throw new Error('no check digit'); }
const AAD = withCheck('23456789012');

t('alternate order, reversed backs', () => {
  assert.deepStrictEqual(C.altOrder(3, 3, true), [['A', 0], ['B', 2], ['A', 1], ['B', 1], ['A', 2], ['B', 0]]);
  assert.deepStrictEqual(C.altOrder(2, 1, false), [['A', 0], ['B', 0], ['A', 1]]);
});
t('bates label', () => { assert.strictEqual(C.batesLabel('CASE-', 7, 6, '/A'), 'CASE-000007/A'); });
t('aadhaar with spaces, verhoeff checked', () => {
  const s = 'Aadhaar: ' + AAD.slice(0, 4) + ' ' + AAD.slice(4, 8) + ' ' + AAD.slice(8) + ' end';
  const m = C.findMatches(s, { aadhaar: true });
  assert.strictEqual(m.length, 1); assert.strictEqual(m[0].kind, 'aadhaar');
  const bad = AAD.slice(0, 11) + ((+AAD[11] + 1) % 10);
  assert.strictEqual(C.findMatches('no ' + bad, { aadhaar: true }).length, 0);
  // keep last 4 visible
  const r = C.maskRange(m[0], true); assert.strictEqual(s.slice(r[0], r[1]).replace(/\D/g, ''), AAD.slice(0, 8));
});
t('pan, phone, email, words', () => {
  const s = 'PAN ABCPE1234F mob +91 98765 43210 mail a.b@x.in name Ramesh';
  const m = C.findMatches(s, { pan: true, phone: true, email: true, words: ['ramesh'] });
  assert.deepStrictEqual(m.map((x) => x.kind), ['pan', 'phone', 'email', 'word']);
  assert.strictEqual(C.findMatches('ABCDE12345F', { pan: true }).length, 0);
  assert.strictEqual(C.findMatches('acct 123456789012345', { phone: true }).length, 0);
});
t('markdown to html', () => {
  const h = C.md2html('# T\n\n- a\n- **b**\n\n| x | y |\n|---|---|\n| 1 | 2 |\n\npara *i*');
  assert.ok(h.includes('<h1>T</h1>')); assert.ok(h.includes('<li><b>b</b></li>')); assert.ok(h.includes('<td>1</td>')); assert.ok(h.includes('<i>i</i>'));
  assert.ok(!C.md2html('<script>x</script>').includes('<script>'));
});
t('pdf text items to markdown', () => {
  const it = (str, x, y, size, font) => ({ str, transform: [size, 0, 0, size, x, y], width: str.length * size * 0.5, fontName: font || 'F1' });
  const blocks = C.itemsToBlocks([it('Big Title', 50, 800, 24), it('First line of text that', 50, 760, 11), it('continues here.', 50, 746, 11), it('• item one', 50, 720, 11)], 842);
  const md = C.blocksToMarkdown([blocks]);
  assert.ok(/^# Big Title/.test(md), md);
  assert.ok(md.includes('First line of text that continues here.'), md);
  assert.ok(md.includes('- item one'), md);
});
console.log('ALL PDFX TESTS PASS (' + n + ')');
