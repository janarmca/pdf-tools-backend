// "What's new" Shorts: when we ship something new, the daily run tells people first (logo + news + 3 steps), then our info (site, e-mail,
// YouTube / Instagram / Facebook names). The list lives in .github/promo-news.json — add one entry per new user-visible feature.
// Rules: an entry is posted once (tool_id 'news:<id>' in promo_posts), never on two days in a row, never before its date; tool-of-the-day resumes in between.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pick, istDay, NOM } from './promo-anim.mjs';
import { FOLLOW, MAX } from './promo-tags.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const NEWS_FILE = path.join(HERE, '..', 'promo-news.json');
export const SOCIAL = [['▶️', 'YouTube', '@pdftoolsindia'], ['📸', 'Instagram', '@pdftoolsindia'], ['👍', 'Facebook', 'Pdf Tools India']];
export const SITE = 'pdftoolsindia.com', EMAIL = 'support@pdftoolsindia.com';

export const loadNews = (file = NEWS_FILE) => JSON.parse(fs.readFileSync(file, 'utf8')).filter((x) => x && x.id && !String(x.id).startsWith('_'));
export function validateNews(items) {
  const errs = [], seen = new Set();
  for (const x of items) {
    if (seen.has(x.id)) errs.push(`${x.id}: duplicate id`); seen.add(x.id);
    if (!/^[a-z0-9-]+$/.test(x.id)) errs.push(`${x.id}: id must be lowercase letters, digits, dashes`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x.date || '')) errs.push(`${x.id}: date must be YYYY-MM-DD`);
    if (!x.title || x.title.length > 48) errs.push(`${x.id}: title missing or longer than 48 characters`);
    if (!x.line || x.line.length > 150) errs.push(`${x.id}: line missing or longer than 150 characters`);
    if (!Array.isArray(x.steps) || x.steps.length !== 3 || x.steps.some((s) => !s || s.length > 44)) errs.push(`${x.id}: needs exactly 3 steps of at most 44 characters`);
    if (!x.url || /^https?:\/\//.test(x.url)) errs.push(`${x.id}: url like pdftoolsindia.com/... (no https://)`);
  }
  return errs;
}
// sentIds: ids already posted ('news:<id>'); newsSentLast24h: a news Short already went out in the last 24 hours.
export function pendingNews(items, { sentIds = [], newsSentLast24h = false, today = new Date(), force = '' } = {}) {
  if (force) return items.find((x) => x.id === force) || null;
  if (newsSentLast24h) return null;
  const d = new Date(today.getTime() + 19800000).toISOString().slice(0, 10);
  return items.filter((x) => x.date <= d && !sentIds.includes('news:' + x.id)).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}
// A tool-shaped object so the existing upload / slide / logging code works unchanged.
export const newsTool = (n) => ({ id: 'news:' + n.id, name: n.title, ta: n.title, desc: n.line, taDesc: n.line, cat: 'pdf', paid: false, icon: n.icon || '🆕', color: '#1D4ED8', url: 'https://' + n.url });

export function buildNewsCaptions(n) {
  const lines = (...x) => x.filter(Boolean).join('\n\n');
  const tags = (k) => ['#PDFToolsIndia', '#TamilNadu', '#FreeTools', '#Tanglish', '#NewUpdate'].slice(0, MAX[k]);
  const body = `🆕 புதிய வசதி: ${n.title}\n${n.line}`;
  const how = n.steps.map((s, i) => `${i + 1}️⃣ ${s}`).join('\n');
  const ig = lines(body, how, '👉 Link in bio — ' + SITE, '📌 Save பண்ணுங்க · 📲 தேவைப்படும் friend-க்கு Send பண்ணுங்க', FOLLOW, tags('instagram').join(' '));
  const fb = lines(body, how, '🔁 Share பண்ணுங்க — உங்க நண்பர்களுக்கு உதவும்! (' + SITE + ')', FOLLOW, tags('facebook').join(' '));
  const yt = lines(`${n.title}\n${n.line}`, how, '👉 https://' + n.url, FOLLOW, [...tags('youtube'), '#Shorts'].join(' '));
  return { instagram: ig, facebook: fb, youtube: yt, youtubeTags: ['pdftoolsindia', 'new update', 'free tools', 'tamil', 'tanglish'] };
}

const dataUrl = (f) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(HERE, '..', '..', f)).toString('base64');
export function buildNewsPlan(n, day = istDay()) {
  const { palette } = pick(day);
  const subs = [[0.3, 2.9, '🆕 புதிய வசதி வந்திருக்கு!'], [3.0, 4.6, n.title], [5.2, 7.3, '1. ' + n.steps[0]], [7.4, 9.5, '2. ' + n.steps[1]], [9.6, 12.2, '3. ' + n.steps[2]], [13.0, NOM - 0.2, 'pdftoolsindia.com · Follow பண்ணுங்க!']];
  const cfg = { story: 'news', palette, nom: NOM, k: 1, icon: n.icon || '🆕', title: n.title, line: n.line, steps: n.steps, subs, logo: dataUrl('lockup.svg'), mark: dataUrl('mark.svg'), social: SOCIAL, site: SITE, email: EMAIL };
  const lines = ['புதிய வசதி வந்திருக்கு!', n.title, ...n.steps, 'பி டி எஃப் டூல்ஸ் இந்தியா டாட் காம். யூடியூப், இன்ஸ்டாகிராம், ஃபேஸ்புக் மூன்றிலும் ஃபாலோ பண்ணுங்க!'];
  return { cfg, lines };
}
