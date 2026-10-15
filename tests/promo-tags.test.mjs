// node tests/promo-tags.test.mjs — hashtag limits, rotation, captions for every tool
import { buildCaptions, hashtags, seasonal, MAX, AUDIENCE } from '../.github/scripts/promo-tags.mjs';
import { CATALOG } from '../cloudflare/src/promo-catalog.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const count = (s) => (s.match(/#[\p{L}\p{N}_]+/gu) || []);
let over = 0, dup = 0, bad = 0, noSend = 0, paidFree = 0, fbLink = 0;
for (const t of CATALOG) for (let d = 0; d < 6; d++) {
  const c = buildCaptions(t, d, new Date('2026-10-20T00:00:00Z'));
  if (count(c.instagram).length > 5 || count(c.facebook).length > 3 || count(c.youtube).length > 4) over++;
  for (const k of ['instagram', 'facebook', 'youtube']) { const h = count(c[k]); if (new Set(h).size !== h.length) dup++; if (/undefined|null|NaN/.test(c[k]) || c[k].length < 80) bad++; }
  if (!/Send/.test(c.instagram) || !/Share/.test(c.facebook)) noSend++;
  if (t.paid && /இலவசம் ✅/.test(c.instagram + c.facebook + c.youtube)) paidFree++;
  if (/https?:\/\//.test(c.facebook) || !/#PDFToolsIndia/.test(c.instagram)) fbLink++;
}
ok(over === 0, 'Instagram <= 5, Facebook <= 3, YouTube <= 3 (+#Shorts) hashtags for every tool/day');
ok(dup === 0 && bad === 0, 'no duplicate hashtags, no undefined/empty captions');
ok(noSend === 0, 'every caption asks to Send/Share (sends are Instagram\'s strongest reach signal)');
ok(paidFree === 0, 'paid AI tools are never captioned as free');
ok(fbLink === 0, 'Facebook caption has no external link; brand hashtag always on Instagram');
ok(new Set([0, 1, 2, 3].map((d) => buildCaptions(CATALOG[0], d).audience)).size === AUDIENCE.length, 'audience (office / students) alternates daily');
ok(new Set([0, 1, 2].map((d) => hashtags(CATALOG[0], d).join())).size === 3, 'hashtag set rotates day to day');
const pan = CATALOG.find((x) => x.id === 'pantan');
ok(/#TDS/.test(hashtags(pan, 0).join()) && /#IncomeTaxIndia/.test(hashtags(pan, 0).join()), 'PAN/TAN tool gets tax tags');
ok(seasonal(pan, new Date('2026-10-20T00:00:00Z')).some((x) => /31 Oct/.test(x)) && !seasonal(pan, new Date('2026-10-05T00:00:00Z')).length, 'TDS due-date hook only in the last half of Jul/Oct/Jan/Apr');
ok(seasonal(CATALOG[0], new Date('2026-11-05T00:00:00Z')).some((x) => /தீபாவளி/.test(x)) && !seasonal(CATALOG[0], new Date('2026-12-05T00:00:00Z')).length, 'Deepavali greeting only up to 8 Nov 2026');
console.log(buildCaptions(pan, 1, new Date('2026-10-20T00:00:00Z')).instagram);
console.log(fail ? `${fail} FAILED` : 'ALL PASS'); process.exit(fail ? 1 : 0);
