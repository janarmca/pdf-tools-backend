// Builds throw-away CA + signed PDFs with openssl/python-cryptography, then checks dsc-verify.js verdicts.
// Run: node tests/dsc-verify.test.mjs   (needs openssl, python3 + cryptography)
import { execSync } from 'node:child_process';
import { mkdtempSync, copyFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const here = dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'dsc-'));
copyFileSync(join(here, 'dsc/gen-certs.sh'), join(dir, 'gen.sh'));
copyFileSync(join(here, 'dsc/make-pdfs.py'), join(dir, 'mk.py'));
copyFileSync(join(here, '../dsc-verify.js'), join(dir, 'dsc.cjs'));   // repo is "type":"module"; the file is a classic script
execSync('bash gen.sh && python3 mk.py', { cwd: dir, stdio: 'pipe' });
const D = createRequire(import.meta.url)(join(dir, 'dsc.cjs'));
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const run = async f => (await D.analyze(readFileSync(join(dir, f)))).signatures[0];
let s = await run('t_ok.pdf');
ok(s.integrity === 'ok' && s.signatureValid && s.coversWholeFile && s.problems.length === 0, 'valid RSA signature');
ok(s.chain.length === 3 && s.chainComplete && s.cca, 'chain of 3 to a CCA-India-named root');
ok((await run('t_tampered.pdf')).problems.some(p => p.code === 'DIGEST_MISMATCH'), 'tampered content detected');
ok((await run('t_appended.pdf')).problems.some(p => p.code === 'APPENDED'), 'data appended after signing detected');
ok((await run('t_sha1.pdf')).problems.some(p => p.code === 'SHA1'), 'SHA-1 warned');
s = await run('t_ec.pdf'); ok(s.signatureValid === true && s.sigAlg === 'ECDSA', 'ECDSA signature verifies');
s = await run('t_noattr.pdf'); ok(s.integrity === 'ok' && s.signatureValid === true, 'signature without signed attributes verifies');
ok((await run('t_expired2.pdf')).problems.some(p => p.code === 'EXPIRED_AT_SIGNING'), 'certificate expired at signing time');
ok((await run('t_nochain.pdf')).problems.some(p => p.code === 'CHAIN_INCOMPLETE'), 'missing chain reported');
ok((await D.analyze(readFileSync(join(dir, 't_unsigned.pdf')))).signatures.length === 0, 'unsigned PDF has no signatures');
ok(D.signedInfo(readFileSync(join(dir, 't_ok.pdf'))).signed === true && D.signedInfo(readFileSync(join(dir, 't_unsigned.pdf'))).signed === false, 'signedInfo');

// Independent signer (pyHanko): optional, skipped when pyhanko is not installed. Set PYHANKO_PY to a python that has it.
const phPy = process.env.PYHANKO_PY || 'python3';
let havePh = true; try { execSync(phPy + ' -c "import pyhanko, pypdf"', { stdio: 'pipe' }); } catch (e) { havePh = false; }
if (!havePh) console.log('SKIP pyHanko tests (pip install pyhanko pypdf, or set PYHANKO_PY)');
else {
  copyFileSync(join(here, 'dsc/make-pyhanko-pdfs.py'), join(dir, 'mkph.py'));
  execSync(phPy + ' mkph.py', { cwd: dir, stdio: 'pipe', env: { ...process.env, TZ: 'Asia/Kolkata' } });
  const all = async f => (await D.analyze(readFileSync(join(dir, f)))).signatures;
  let g = await all('ph_pades.pdf'); ok(g[0].integrity === 'ok' && g[0].signatureValid, 'pyHanko PAdES signature');
  g = await all('ph_sha512.pdf'); ok(g[0].hash === 'SHA-512' && g[0].signatureValid, 'pyHanko SHA-512');
  g = await all('ph_sha384.pdf'); ok(g[0].hash === 'SHA-384' && g[0].signatureValid, 'pyHanko SHA-384');
  g = await all('ph_pss.pdf'); ok(g[0].sigAlg === 'RSA-PSS' && g[0].signatureValid === true && g[0].problems.length === 0, 'pyHanko RSA-PSS');
  g = await all('ph_two.pdf'); ok(g.length === 2 && g[0].integrity === 'ok' && !g[0].isLatest && g[1].isLatest && g[1].problems.length === 0 && g[0].problems.every(p => p.code === 'APPENDED'), 'two signatures: first intact (only "appended" note), second latest and clean');
  g = await all('ph_docts.pdf'); ok(g.length === 2 && g[1].isTimestampToken && g[1].integrity === 'ok' && g[1].signatureValid, 'RFC 3161 document time-stamp verifies');
  g = await all('ph_docts_tampered.pdf'); ok(g[0].problems.some(p => p.code === 'DIGEST_MISMATCH') && g[1].integrity === 'broken', 'tampering after a time-stamp breaks both');
}
console.log(fail ? 'FAILED ' + fail : 'ALL DSC TESTS PASS'); process.exit(fail ? 1 : 0);
