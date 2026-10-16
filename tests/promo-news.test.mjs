// node tests/promo-news.test.mjs — "what's new" Short: data file rules, selection logic, captions, and (if playwright + Chrome + ffmpeg exist) a real render.
// In the sandbox:  PLAYWRIGHT_PATH=/opt/node-tools/node_modules/playwright CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tests/promo-news.test.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { loadNews, validateNews, pendingNews, newsTool, buildNewsCaptions, buildNewsPlan, SOCIAL, SITE, EMAIL } from '../.github/scripts/promo-news.mjs';
import { MAX, FOLLOW, buildCaptions } from '../.github/scripts/promo-tags.mjs';
import { animSpeech } from '../.github/scripts/promo-youtube.mjs';
import { renderFrames } from '../.github/scripts/promo-anim.mjs';
import { CATALOG } from '../cloudflare/src/promo-catalog.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const count = (s) => (s.match(/#[\p{L}\p{N}_]+/gu) || []);

const items = loadNews();
ok(items.length >= 1 && validateNews(items).length === 0, 'promo-news.json is valid (' + items.length + ' entries): ' + validateNews(items).join('; '));
ok(validateNews([{ id: 'X', date: '2026', title: '', line: '', steps: [], url: 'https://a' }]).length >= 5, 'the validator rejects a bad entry');
ok(validateNews([items[0], items[0]]).some((e) => /duplicate/.test(e)), 'duplicate ids are rejected');

// selection: first due & unsent entry, oldest date first; nothing twice; never two news days in a row; not before its date
const d1 = new Date('2026-10-17T05:00:00Z'); // 10:30 IST on the 17th
ok(pendingNews(items, { today: new Date('2026-10-16T05:00:00Z') }) === null, 'nothing is posted before its date');
ok(pendingNews(items, { today: d1 })?.id === 'dsc-tick', 'the first due entry is chosen');
ok(pendingNews(items, { today: d1, sentIds: ['news:dsc-tick'] }) === null, 'an entry already posted is never posted again');
ok(pendingNews(items, { today: new Date('2026-10-30T05:00:00Z'), sentIds: ['news:dsc-tick'] })?.id === 'gov-hub', 'the next entry follows (oldest first)');
ok(pendingNews(items, { today: d1, newsSentLast24h: true }) === null, 'no second news Short within 24 hours (tool-of-the-day days in between)');
ok(pendingNews(items, { today: d1, force: 'student-hub' })?.id === 'student-hub' && pendingNews(items, { force: 'nope' }) === null, 'a news id can be forced from the workflow input');
ok(pendingNews(items, { today: new Date('2026-10-16T20:00:00Z') })?.id === 'dsc-tick', 'dates follow IST (17 Oct 01:30 IST is already the 17th)');

// captions: platform rules + our names on every platform
for (const n of items) {
  const c = buildNewsCaptions(n);
  ok(count(c.instagram).length <= MAX.instagram && count(c.facebook).length <= MAX.facebook && count(c.youtube).length <= MAX.youtube + 1, `${n.id}: hashtag limits (IG<=5, FB<=3, YT<=3 + #Shorts)`);
  ok(!/https?:\/\//.test(c.facebook) && /Share/.test(c.facebook) && /Send/.test(c.instagram), `${n.id}: Facebook has no external link; both ask to share/send`);
  ok(['instagram', 'facebook', 'youtube'].every((k) => c[k].includes('@pdftoolsindia') && c[k].includes('Pdf Tools India') && !/undefined|null/.test(c[k])), `${n.id}: every caption names YouTube, Instagram and Facebook`);
}
ok(FOLLOW.includes('YouTube') && FOLLOW.includes('Instagram') && FOLLOW.includes('Facebook'), 'follow list names all three platforms');
const tc = buildCaptions(CATALOG[0], 2, new Date('2026-10-20T00:00:00Z'));
ok(['instagram', 'facebook', 'youtube'].every((k) => tc[k].includes('@pdftoolsindia')), 'tool-of-the-day captions also carry our names');
ok(SOCIAL.length === 3 && SITE === 'pdftoolsindia.com' && EMAIL === 'support@pdftoolsindia.com', 'info card data: site, support e-mail, three platforms');

// plan + speech
for (const n of items) {
  const { cfg, lines } = buildNewsPlan(n, 4);
  ok(cfg.story === 'news' && lines.length === 6 && cfg.subs.length === 6 && cfg.steps.length === 3 && animSpeech(lines).length > 60 && !/undefined|null|NaN/.test(JSON.stringify(cfg.subs)), `${n.id}: plan is complete (6 lines, 3 steps)`);
  ok(cfg.logo.startsWith('data:image/svg+xml;base64,') && cfg.logo.length > 2000, `${n.id}: logo is embedded in the video page`);
  ok(newsTool(n).id === 'news:' + n.id && /^https:\/\//.test(newsTool(n).url), `${n.id}: tool-shaped object for logging (news:<id>)`);
}

// real render (optional)
let chrome = true; try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { chrome = false; }
if (chrome && (process.env.PLAYWRIGHT_PATH || (() => { try { import.meta.resolve('playwright-core'); return true; } catch { return false; } })())) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'news-')); const cwd = process.cwd(); process.chdir(tmp);
  try {
    const { cfg } = buildNewsPlan(items[0], 4); cfg.k = 1;
    const n = await renderFrames(cfg, '', 'frames', [0, 90, 200, 300, 450]);
    const sizes = [0, 90, 200, 300, 450].map((i) => fs.statSync(`frames/f${String(i).padStart(4, '0')}.jpg`).size);
    ok(n > 400 && sizes.every((s) => s > 20000), `news scene renders without page errors (${n} frames, 5 sampled)`);
    ok(new Set(sizes).size === 5, 'sampled frames differ (the scene really animates)');
  } catch (e) { ok(false, 'render failed: ' + e.message); } finally { process.chdir(cwd); }
} else console.log('SKIP render (no playwright/ffmpeg)');
console.log(fail ? `${fail} FAILED` : 'ALL PASS'); process.exit(fail ? 1 : 0);
