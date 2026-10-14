// Image → Excel cleanup test. The fixtures are REAL Tesseract output (words + grid) for a supplier table:
// a clean render, and two blurry/tilted "phone photo" versions. No OCR runs here — it checks what Img2Xls does with the words.
// Run: node tests/img2xls-clean.test.mjs
import fs from 'node:fs'; import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const L = fs.readFileSync(join(here, '../index.source.html'), 'utf8').split('\n'); const s = L.findIndex(l => l.startsWith('const Img2Xls = (function(){')); let e = s; while (!/^\}\)\(\);/.test(L[e])) e++;
const X = new Function('document', 'window', L.slice(s, e + 1).join('\n') + '\nreturn Img2Xls;')({ createElement: () => ({ getContext: () => ({}) }) }, {});
const T = JSON.parse(fs.readFileSync(join(here, 'fixtures/img2xls-truth.json'), 'utf8'));
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const norm = x => String(x).replace(/\W+/g, '').toLowerCase();
function run(name) {
  const w = JSON.parse(fs.readFileSync(join(here, 'fixtures/' + name), 'utf8')), t = X.buildTable(w.words, w.grid), ty = X.typeTable(t, { header: 'auto', dayFirst: true });
  const nums = new Map(), texts = new Set(); let junk = 0;
  for (const r of ty.cells) for (const c of r) { if (c.t === 'n') nums.set(c.v, (nums.get(c.v) || 0) + 1); else if (c.t === 's' && c.v) { texts.add(norm(c.v)); if (!/[A-Za-z]{3,}/.test(c.v) && !/^\d+$/.test(c.v)) junk++; } }
  let hit = 0, tot = 0, asText = 0;
  for (const row of T.rows) { if (row[1]) { tot++; if (texts.has(norm(row[1]))) hit++; } for (const v of row.slice(2)) if (v) { const n = +v.replace(/,/g, ''); tot++; if ((nums.get(n) || 0) > 0) { hit++; nums.set(n, nums.get(n) - 1); } else if (texts.has(norm(v))) asText++; } }
  return { t, ty, hit, tot, junk, asText, chk: X.checkTotals(ty, t) };
}
let r = run('img2xls-clean-words.json');
ok(r.hit === r.tot, `clean image: all ${r.tot} cells exact (${r.hit})`);
ok(r.chk.bad.length === 0 && r.chk.ok.length >= 3, 'clean image: Grand Total, second Grand Total and the across-total (25,44,151) all reconcile');
r = run('img2xls-photo2-words.json');
ok(r.t.rows[0].length === 4, 'photo 2: the stray 5th "margin" column is removed (4 columns left)');
ok(r.asText === 0, 'photo 2: no amount is left as text (the sparse second Amount column is typed as numbers)');
ok(r.junk <= 1, `photo 2: noise cells removed (${r.junk} left)`);
ok(r.hit >= 34, `photo 2: ${r.hit}/${r.tot} cells exact (was 27 before the cleanup)`);
ok(r.chk.bad.length === 1 && r.chk.bad[0].diff === 9000 && r.chk.bad[0].suspects.some(x => x.r === 5), 'photo 2: the one wrong figure is caught — total differs by 9,000 and the misread cell is among the suspects');
r = run('img2xls-photo4-words.json');
ok(r.hit >= 31 && r.asText === 0 && r.junk <= 1, `photo 4 (blurry): ${r.hit}/${r.tot} exact, no text amounts, ${r.junk} noise cell`);
ok(r.chk.bad.length >= 1, 'photo 4: mismatching totals are flagged instead of passing silently');
// unit rules
const ty2 = X.typeTable({ rows: [['Item', 'Qty', 'Amount'], ['A', '1', '1.250'], ['B', '2', '2.500'], ['C', '3', '3.750']], conf: Array(4).fill([100, 100, 100]) }, {});
ok(ty2.cells[1][2].v === 1.25, 'a genuine 3-decimal column (1.250, 2.500) is NOT turned into thousands');
const ty3 = X.typeTable({ rows: [['Name', 'Amount'], ['A', '5,19,574'], ['B', '4,24,800'], ['C', '29.487'], ['D', '1.42.190']], conf: Array(5).fill([100, 100]) }, {});
ok(ty3.cells[3][1].v === 29487 && ty3.cells[4][1].v === 142190, 'in a whole-rupee column, 29.487 and 1.42.190 are read as 29,487 and 1,42,190');
const d = X.denoise({ rows: [['Name', 'Amount'], ['A', '100'], ['B', '200'], ['C', 'Nil'], ['D', 'SUR'], ['E', '300']], conf: [[100, 100], [100, 100], [100, 100], [100, 90], [100, 20], [100, 100]] });
ok(d.rows[3][1] === 'Nil' && d.rows[4][1] === '' && d.noise === 1, 'noise removal keeps "Nil" and removes a very unsure "SUR" in a numbers column');
const keep = X.denoise({ rows: [['Name', 'Note'], ['A', 'paid late'], ['B', 'ok'], ['C', 'hold'], ['D', 'x ray']], conf: Array(5).fill([100, 30]) });
ok(keep.noise === 0, 'low-confidence words in a TEXT column are never removed');
const flags = X.denoise({ rows: [['Name', 'Amount', ''], ['A', '100', 'Y'], ['B', '200', 'N'], ['C', '300', 'Y'], ['D', '400', 'N']], conf: Array(5).fill([100, 100, 100]) });
ok(flags.noise === 0, 'a clean headerless column of Y / N flags is kept');
const blurry = X.denoise({ rows: [['Name', 'Remarks'], ['A', 'ok'], ['B', 'hold'], ['C', 'x ray'], ['D', 'paid late']], conf: Array(5).fill([100, 25]) });
ok(blurry.noise === 0, 'a real "Remarks" column read with low confidence is NOT deleted as a margin strip');
console.log(fail ? 'FAILED ' + fail : 'ALL IMG2XLS TESTS PASS'); process.exit(fail ? 1 : 0);
