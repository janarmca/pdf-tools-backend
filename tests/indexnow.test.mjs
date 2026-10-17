// node tests/indexnow.test.mjs
import fs from 'node:fs';
import { sitemapLocs, filesFor, urlsToSubmit, findKey, SITE } from '../.github/scripts/indexnow.mjs';
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const locs = sitemapLocs(fs.readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8'));
ok(locs.length > 150 && locs.every((l) => l.startsWith(SITE)), `sitemap has ${locs.length} URLs`);
ok(filesFor(SITE + '/')[0] === 'index.html' && filesFor(SITE + '/photo-20kb')[0] === 'photo-20kb.html' && filesFor(SITE + '/tools/merge-pdf')[0] === 'tools/merge-pdf.html', 'URL -> file mapping');
const u = urlsToSubmit(locs, ['photo-20kb.html', 'README.md'], false);
ok(u.length === 1 && u[0] === SITE + '/photo-20kb', 'only changed pages are submitted');
ok(urlsToSubmit(locs, [], true).length === locs.length, 'full sitemap when sitemap.xml changed');
const key = findKey(fs.readdirSync(new URL('..', import.meta.url)));
ok(!!key && fs.readFileSync(new URL(`../${key}.txt`, import.meta.url), 'utf8') === key, 'key file exists and contains the key');
console.log(fail ? `${fail} FAILED` : 'ALL PASS'); process.exit(fail ? 1 : 0);
