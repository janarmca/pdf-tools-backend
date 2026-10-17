// Tells Bing / Yandex / Naver / Seznam (IndexNow) about pages that changed in the last push. Free, no account.
// Google does not take part in IndexNow — it finds pages through sitemap.xml and links.
// Run by .github/workflows/indexnow.yml.  Env: BEFORE (old commit), DRY=1 prints instead of sending.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

export const SITE = 'https://pdftoolsindia.com';
export function sitemapLocs(xml) { return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()); }
// which repo files serve a sitemap URL on Cloudflare Pages (clean URLs)
export function filesFor(loc) {
  const p = loc.replace(SITE, '').replace(/^\/+/, '').replace(/\/+$/, '');
  return p ? [`${p}.html`, `${p}/index.html`] : ['index.html'];
}
export function urlsToSubmit(locs, changed, all) {
  if (all) return locs;
  const set = new Set(changed);
  return locs.filter((l) => filesFor(l).some((f) => set.has(f)));
}
export function findKey(files) { return files.find((f) => /^[0-9a-f]{32}\.txt$/.test(f))?.replace('.txt', ''); }

if (import.meta.url === `file://${process.argv[1]}`) {
  const key = findKey(fs.readdirSync('.'));
  if (!key) { console.log('no IndexNow key file in repo root — nothing to do'); process.exit(0); }
  const locs = sitemapLocs(fs.readFileSync('sitemap.xml', 'utf8'));
  let changed = [], all = false;
  try { changed = execSync(`git diff --name-only ${process.env.BEFORE || 'HEAD~1'} HEAD`, { encoding: 'utf8' }).split('\n').filter(Boolean); }
  catch { all = true; }
  if (changed.includes('sitemap.xml')) all = true;
  const list = urlsToSubmit(locs, changed, all).slice(0, 10000);
  console.log(`IndexNow: ${list.length} URL(s)${all ? ' (full sitemap)' : ''}`);
  if (!list.length) process.exit(0);
  if (process.env.DRY) { console.log(list.join('\n')); process.exit(0); }
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: 'pdftoolsindia.com', key, keyLocation: `${SITE}/${key}.txt`, urlList: list }),
  });
  console.log('IndexNow response', r.status, await r.text());
  if (r.status >= 500) process.exit(1); // 200/202 = accepted; 4xx is logged but never fails a deploy
}
