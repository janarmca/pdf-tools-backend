// Weekly watcher for the official pages the TDS tools depend on (see .github/tax-sources.json).
// It never edits the tools. It only tells the owner "this page changed — re-verify", by writing report.md
// and setting the step outputs `changed` / `alert_down`, which .github/workflows/watch-tax-rules.yml turns into an issue.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sha = b => createHash('sha256').update(b).digest('hex');
// visible text only, so cache-busting numbers / scripts in the HTML do not cause false alarms
export function normalise(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
export async function fetchHash(url, fetchFn = fetch) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 45000);
  try {
    const r = await fetchFn(url, { signal: ctl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (compatible; pdftoolsindia-rules-watch/1.0)', accept: '*/*' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    const type = (r.headers.get('content-type') || '').toLowerCase();
    const isPdf = type.includes('pdf') || buf.subarray(0, 5).toString() === '%PDF-';
    const text = isPdf ? '' : normalise(buf.toString('utf8'));
    if (!isPdf && text.length < 10) throw new Error('empty page');
    return { hash: isPdf ? sha(buf) : sha(text), bytes: buf.length, kind: isPdf ? 'pdf' : 'html' };
  } finally { clearTimeout(t); }
}
export async function checkSources(sources, lock, fetchFn = fetch, now = new Date()) {
  const next = { checkedAt: now.toISOString(), allDownStreak: 0, sources: { ...(lock.sources || {}) } };
  const report = [];
  for (const s of sources) {
    const old = (lock.sources || {})[s.id];
    try {
      const f = await fetchHash(s.url, fetchFn);
      const status = !old || !old.hash ? 'new' : (old.hash === f.hash ? 'unchanged' : 'changed');
      next.sources[s.id] = { hash: f.hash, bytes: f.bytes, kind: f.kind, checkedAt: now.toISOString(), changedAt: status === 'changed' ? now.toISOString() : (old && old.changedAt) || null, failStreak: 0 };
      report.push({ ...s, status, previous: old && old.checkedAt });
    } catch (e) {
      const streak = ((old && old.failStreak) || 0) + 1;
      next.sources[s.id] = { ...(old || {}), failStreak: streak, lastError: String(e.message || e) };
      report.push({ ...s, status: 'unreachable', error: String(e.message || e), failStreak: streak });
    }
  }
  const allDown = report.length > 0 && report.every(r => r.status === 'unreachable');
  next.allDownStreak = allDown ? ((lock.allDownStreak || 0) + 1) : 0;
  return { report, next, changed: report.some(r => r.status === 'changed'), alertDown: next.allDownStreak === 4 };
}
export function markdown(res, now = new Date()) {
  const L = [`# Official TDS rule pages — weekly check (${now.toISOString().slice(0, 10)})`, ''];
  if (res.changed) L.push('One or more official pages **changed**. The TDS tools (`tds-core.js`, `category-tds.js`) were verified against the old text, so they must be re-verified before anyone relies on them.', '', 'Ask Claude: "Re-verify the TDS tools against the changed official pages and update them."', '');
  if (res.alertDown) L.push('The watcher could not reach **any** official page for 4 weeks in a row (the Income Tax site may block GitHub runners). Check the pages by hand.', '');
  L.push('| Page | Status |', '|---|---|');
  for (const r of res.report) L.push(`| [${r.title}](${r.url}) | ${r.status === 'changed' ? '🔴 changed' : r.status === 'unreachable' ? '⚪ unreachable (' + r.error + ')' : r.status === 'new' ? '🟡 baseline recorded' : '🟢 unchanged'} |`);
  return L.join('\n') + '\n';
}
async function main() {
  const root = new URL('../', import.meta.url);
  const src = JSON.parse(readFileSync(new URL('tax-sources.json', root), 'utf8')).sources;
  const lockUrl = new URL('tax-sources.lock.json', root);
  const lock = existsSync(lockUrl) ? JSON.parse(readFileSync(lockUrl, 'utf8')) : {};
  const res = await checkSources(src, lock);
  writeFileSync(lockUrl, JSON.stringify(res.next, null, 2) + '\n');
  const md = markdown(res); writeFileSync('report.md', md); console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${res.changed}\nalert_down=${res.alertDown}\n`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });
