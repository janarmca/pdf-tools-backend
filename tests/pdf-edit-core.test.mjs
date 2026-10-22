// PDF Editor "edit existing text" engine (pdf-edit-core.js): replaces text inside the page's own content stream.
// Needs pdf-lib: `npm i pdf-lib` or set PDFLIB=/path/to/node_modules/pdf-lib.   Run: node tests/pdf-edit-core.test.mjs
import { readFileSync } from 'node:fs'; import { join, dirname } from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const here = dirname(fileURLToPath(import.meta.url)), req = createRequire(import.meta.url);
let PDFLib; try { PDFLib = req(process.env.PDFLIB || 'pdf-lib'); } catch (e) { console.log('SKIP pdf-edit tests (pdf-lib not found: npm i pdf-lib, or set PDFLIB)'); process.exit(0); }
const m = { exports: {} }; new Function('module', 'self', readFileSync(join(here, '../pdf-edit-core.js'), 'utf8'))(m, undefined);
const Core = m.exports(PDFLib);
let fail = 0; const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fail++; };
const line = (doc, y) => Core.pageRuns(doc, 0).filter((r) => Math.abs(r.y - y) < 1).sort((a, b) => a.x - b.x);
const textAt = (doc, y, x0, x1) => line(doc, y).filter((r) => r.x >= x0 - 1 && r.x <= x1).map((r) => r.text).join('').replace(/\s+/g, ' ').trim();
const item = (str, x, y, width, size) => ({ str, x, y, width, size, dir: [1, 0] });

// 1) a Chrome-made PDF (subset TrueType fonts, Identity-H) — like most online receipts / statements
{
  const doc = await PDFLib.PDFDocument.load(readFileSync(join(here, 'fixtures/pdfedit-chrome.pdf')));
  let r = Core.replaceText(doc, 0, item('Oct 13th 2026, 5:28 PM', 436.4, 736.4, 116.3, 12), 'Oct 14th 2026, 5:20 PM', { align: 'right' });
  ok(r.ok && r.mode === 'same-font' && /Serif/.test(r.fontName), 'same-length value is written with the PDF\'s own font');
  ok(textAt(doc, 736.4, 400, 600) === 'Oct 14th 2026, 5:20 PM', 'the new text is in the page content, the old one is gone');
  r = Core.replaceText(doc, 0, item('Total Amount', 259.4, 701.1, 66.2, 12), 'Total Paid', { align: 'center' });
  const runs = line(doc, 701.1); const x0 = runs[0].x;
  ok(r.ok && r.mode === 'same-font' && Math.abs(x0 + r.newWidth / 2 - (259.4 + 66.2 / 2)) < 0.3, 'centred text stays centred (' + x0.toFixed(1) + ')');
  r = Core.replaceText(doc, 0, item('Customer Name', 32.2, 769.4, 78.3, 12), 'Name');
  ok(r.ok && textAt(doc, 769.4, 0, 300) === 'Name' && textAt(doc, 769.4, 400, 600) === 'A SAMPLE PERSON', 'shorter text: the value on the same line does not move');
  r = Core.replaceText(doc, 0, item('Bold words here', 226.1, 641.9, 94, 12), 'Bold');
  ok(r.ok && /Bold/.test(r.fontName) && textAt(doc, 641.9, 0, 600).startsWith('9, Gandhi Road, Madurai 625001 — Bold and'), 'a bold word inside a sentence: neighbours untouched, bold font kept');
  r = Core.replaceText(doc, 0, item('450', 284.6, 678.6, 35, 21), '320');
  ok(r.ok && r.mode === 'removed' && textAt(doc, 678.6, 270, 400) === '', 'letters the subset does not have → old text removed (caller draws the new text)');
  ok(Math.abs(r.x - 284.6) < 0.5 && Math.abs(r.y - 678.6) < 0.5 && Math.abs(r.size - 21) < 0.1, 'and the caller gets the exact place and size');
  const saved = await doc.save(); const again = await PDFLib.PDFDocument.load(saved);
  ok(textAt(again, 736.4, 400, 600) === 'Oct 14th 2026, 5:20 PM', 'survives save + reload');
}
// 2) a LibreOffice PDF (simple TrueType fonts with their own 1..n codes)
{
  const doc = await PDFLib.PDFDocument.load(readFileSync(join(here, 'fixtures/pdfedit-libreoffice.pdf')));
  const r = Core.replaceText(doc, 0, item('Total: Rs. 1234', 56.8, 774.4, 101.8, 12), 'Total: Rs. 4321');
  ok(r.ok && r.mode === 'same-font' && Math.abs(r.newWidth - r.oldWidth) < 0.01, 'LibreOffice font: digits swapped in place, same width');
  ok(textAt(doc, 774.4, 0, 600) === 'Total: Rs. 4321', 'LibreOffice: new text readable');
}
// 3) pdf-lib standard fonts (no /Widths) + a rotated page
{
  const d = await PDFLib.PDFDocument.create(); const h = await d.embedFont(PDFLib.StandardFonts.Helvetica);
  const p = d.addPage([595, 842]); p.drawText('Invoice No: 12345', { x: 50, y: 780, size: 14, font: h });
  const p2 = d.addPage([595, 842]); p2.setRotation(PDFLib.degrees(90)); p2.drawText('Rotated 777', { x: 100, y: 500, size: 16, font: h });
  const doc = await PDFLib.PDFDocument.load(await d.save());
  const w = 112.84; // as measured by pdf.js (PDF viewers do not apply pdf-lib's kerning pairs)
  const r = Core.replaceText(doc, 0, item('Invoice No: 12345', 50, 780, w, 14), 'Invoice No: 99');
  ok(r.ok && r.mode === 'same-font' && Math.abs(r.oldWidth - w) < 0.05, 'standard Helvetica: real widths used (' + r.oldWidth.toFixed(2) + ' vs ' + w.toFixed(2) + ')');
  ok(textAt(doc, 780, 0, 600) === 'Invoice No: 99', 'standard font edited in place');
  const r2 = Core.replaceText(doc, 1, item('Rotated 777', 100, 500, h.widthOfTextAtSize('Rotated 777', 16), 16), 'Rotated 888');
  ok(r2.ok && r2.mode === 'same-font', 'rotated page edited in place');
  ok(!Core.replaceText(doc, 0, item('Not on the page', 300, 300, 80, 12), 'x').ok, 'text that is not there → ok:false (caller covers it instead)');
}
console.log(fail ? `${fail} FAILED` : 'ALL PDF-EDIT CHECKS PASS'); process.exit(fail ? 1 : 0);
