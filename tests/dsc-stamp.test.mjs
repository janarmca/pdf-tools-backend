// Tick-copy test: stamps a validly signed PDF with dsc-stamp.js and checks that (1) every original byte is untouched,
// (2) our own verifier still sees an intact, valid signature, (3) the copy is recognised as stamped, (4) all placements work.
// Needs: openssl, python3 + cryptography (like dsc-verify.test.mjs) and pdf-lib: `npm i pdf-lib` or set PDFLIB=/path/to/node_modules/pdf-lib.
// Independent validation with pyHanko / poppler: see tests/dsc/validate-stamped.py.   Run: node tests/dsc-stamp.test.mjs
import { execSync } from 'node:child_process'; import { mkdtempSync, copyFileSync, readFileSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join, dirname } from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const here = dirname(fileURLToPath(import.meta.url)), dir = mkdtempSync(join(tmpdir(), 'dscstamp-')), req = createRequire(import.meta.url);
let PDFLib; try { PDFLib = req(process.env.PDFLIB || 'pdf-lib'); } catch (e) { console.log('SKIP stamp tests (pdf-lib not found: npm i pdf-lib, or set PDFLIB)'); process.exit(0); }
copyFileSync(join(here, 'dsc/gen-certs.sh'), join(dir, 'gen.sh')); copyFileSync(join(here, 'dsc/make-pdfs.py'), join(dir, 'mk.py'));
copyFileSync(join(here, '../dsc-verify.js'), join(dir, 'verify.cjs')); copyFileSync(join(here, '../dsc-stamp.js'), join(dir, 'stamp.cjs'));
execSync('bash gen.sh && python3 mk.py', { cwd: dir, stdio: 'pipe' });
const V = req(join(dir, 'verify.cjs')), S = req(join(dir, 'stamp.cjs'));
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const src = readFileSync(join(dir, 't_ok.pdf'));
for (const place of ['strip', 'br', 'bl', 'tr', 'tl', 'sigbox']) {
  const r = await S.stamp(new Uint8Array(src), { place, signer: 'TEST SIGNER', signedAt: '09 Feb 2025', checkedAt: '14 Oct 2026', sha256: 'a1b2c3d4e5f6', count: 1 }, PDFLib);
  ok(Buffer.compare(src, Buffer.from(r.bytes.subarray(0, src.length))) === 0 && r.bytes.length > src.length, `[${place}] every original byte is untouched, ${r.bytes.length - src.length} bytes appended`);
  const rep = await V.analyze(r.bytes.buffer.slice(r.bytes.byteOffset, r.bytes.byteOffset + r.bytes.byteLength)), s0 = rep.signatures[0];
  ok(s0.integrity === 'ok' && s0.signatureValid === true, `[${place}] the digital signature still verifies`);
  ok(s0.problems.some(p => p.code === 'APPENDED') && s0.stampedCopy === true, `[${place}] the copy is reported as "data added after signing" and recognised as our stamp`);
}
const d0 = await PDFLib.PDFDocument.create(); d0.addPage([300, 200]); const un = await S.stamp(await d0.save({ useObjectStreams: true }), { place: 'strip' }, PDFLib); ok(un.bytes.length > 0, 'a normal (object-stream) PDF can be stamped — also not-yet-signed ones, though the UI never offers that');
let err0 = ''; try { await S.stamp(new Uint8Array(readFileSync(join(dir, 't_unsigned.pdf'))), {}, PDFLib); } catch (e) { err0 = e.message; } ok(err0 === '' || /Could not read/.test(err0), 'a hand-made stub PDF either stamps or gives a clear error');
let err = ''; try { await S.stamp(new Uint8Array([1, 2, 3, 4]), {}, PDFLib); } catch (e) { err = e.message; } ok(/Could not read/.test(err), 'garbage input gives a clear error: ' + err.slice(0, 50));
console.log(fail ? 'FAILED ' + fail : 'ALL STAMP TESTS PASS'); process.exit(fail ? 1 : 0);
