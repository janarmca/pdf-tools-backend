// "Brain" of the social promotion: decides WHICH tool to promote today from free signals, using plain maths (no AI, no cost).
//   score(tool) = ( 3·trend + 2·calendar + 1·evergreen ) × freshness × category-variety × paid-factor  (+ tiny deterministic tie-break)
//   trend      = how strongly today's Google Trends (India) searches mention what the tool does (log-scaled by search traffic)
//   calendar   = dated needs in India (TDS dates, ITR, exam / counselling season, festivals)
//   evergreen  = how often people search for that job all year (hand-set, small table)
//   freshness  = ~0 for 7 days after a tool was promoted, then 1 − e^(−(days−6)/6)
// Everything is deterministic for a given (date, trends, history) so it is testable. Network failure -> trends = [] and the calendar + evergreen still work.

// What each search idea means for our tools. words = lowercase substrings of a trending query (English, Tanglish or Tamil).
export const INTENT = [
  { words: ['itr', 'income tax', 'tax refund', 'form 16', 'form16', '26as', 'ais ', 'வருமான வரி'], tools: ['incometaxcalc', 'pantan', 'tdsdates'] },
  { words: ['tds'], tools: ['tdsdates', 'tdslatefee', 'tdsinterest', 'pantan'] },
  { words: ['gst', 'ஜிஎஸ்டி'], tools: ['gstcalc', 'gstchecking'] },
  { words: ['pan card', 'pan ', 'aadhaar', 'aadhar', 'ஆதார்'], tools: ['pantan', 'imgcompresskb', 'imgpassport'] },
  { words: ['resume', 'cv ', 'job', 'vacancy', 'recruitment', 'naukri', 'வேலைவாய்ப்பு'], tools: ['resumebuilder', 'compress', 'imgpassport'] },
  { words: ['tnpsc', 'ssc', 'upsc', 'railway', 'rrb', 'exam', 'hall ticket', 'admit card', 'result', 'தேர்வு', 'நீட்', 'neet', 'jee'], tools: ['examphoto', 'imgcompresskb', 'compress', 'studytimer'] },
  { words: ['tnea', 'cutoff', 'cut off', 'counselling', 'counseling', 'rank list', 'கட்-ஆஃப்'], tools: ['tneacutoff', 'cgpacalc'] },
  { words: ['da hike', 'dearness', 'arrears', '7th pay', '8th pay', 'pay commission', 'salary', 'hra', 'ஊதிய', 'அகவிலைப்படி'], tools: ['daarrears', 'salaryslip', 'pfcalc'] },
  { words: ['emi', 'loan', 'repo rate', 'interest rate', 'rbi', 'கடன்'], tools: ['emicalc', 'interestcalc', 'sipcalc'] },
  { words: ['gold', 'silver', 'தங்கம்', 'வெள்ளி'], tools: ['goldcalc'] },
  { words: ['sip', 'mutual fund', 'sensex', 'nifty', 'stock', 'share price', 'ipo'], tools: ['sipcalc', 'interestcalc'] },
  { words: ['pf ', 'epfo', 'provident'], tools: ['pfcalc'] },
  { words: ['eb bill', 'tneb', 'electricity', 'tangedco', 'மின்'], tools: ['ebbill'] },
  { words: ['diwali', 'deepavali', 'pongal', 'festival', 'wedding', 'marriage', 'திருமண', 'தீபாவளி', 'பொங்கல்'], tools: ['invitation', 'porutham', 'biodata'] },
  { words: ['passport', 'visa', 'photo', 'selfie'], tools: ['imgpassport', 'imgcompresskb', 'bgremove'] },
  { words: ['pdf'], tools: ['compress', 'merge', 'pdf2word'] },
  { words: ['whatsapp', 'status', 'reel', 'youtube', 'video'], tools: ['videocompress', 'videotogif'] },
  { words: ['qr', 'upi', 'phonepe', 'gpay', 'paytm'], tools: ['qrgen', 'qrscan'] },
  { words: ['birthday', 'age ', 'horoscope', 'rasi', 'ராசி'], tools: ['agecalc', 'datecalc', 'starfinder'] },
  { words: ['bmi', 'diet', 'weight', 'fitness'], tools: ['bmicalc'] },
  { words: ['typing', 'tamil font', 'unicode', 'தட்டச்சு'], tools: ['tamiltyping', 'tamilfont'] },
  { words: ['property', 'registration', 'rent', 'patta', 'பத்திர'], tools: ['tnpropertycalc', 'tnrentagreement', 'tnsaledeed'] },
];
// Year-round demand (0..1). Anything not listed gets 0.3.
export const EVERGREEN = { compress: 1, merge: 0.9, imgcompresskb: 0.9, imgpassport: 0.8, pdf2word: 0.8, img2pdf: 0.8, resumebuilder: 0.8, emicalc: 0.7, gstcalc: 0.6, incometaxcalc: 0.7, qrgen: 0.5, imgcompress: 0.7, bgremove: 0.7, examphoto: 0.6, salaryslip: 0.5, agecalc: 0.5, sign: 0.6, split: 0.7, pdf2img: 0.6, videocompress: 0.6, tamiltyping: 0.5 };

const lc = (s) => ' ' + String(s || '').toLowerCase() + ' ';

// Google Trends daily-trends RSS (https://trends.google.com/trending/rss?geo=IN). Items: <title>, <ht:approx_traffic>
export function parseTrendsRss(xml) {
  const out = [];
  for (const m of String(xml || '').matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const b = m[1];
    const title = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(b)?.[1]?.trim();
    const tr = /<ht:approx_traffic>([^<]*)<\/ht:approx_traffic>/.exec(b)?.[1] || '';
    const n = parseInt(tr.replace(/[^\d]/g, ''), 10) || 1000;
    const news = [...b.matchAll(/<ht:news_item_title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/ht:news_item_title>/g)].map((x) => x[1].trim());
    if (title) out.push({ title: title.replace(/&amp;/g, '&'), traffic: n, news });
  }
  return out;
}
export async function fetchTrends(geo = 'IN') {
  const urls = [`https://trends.google.com/trending/rss?geo=${geo}`, `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${geo}`];
  for (const u of urls) {
    try { const r = await fetch(u, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; pdftoolsindia-bot)' } }); if (!r.ok) continue; const t = parseTrendsRss(await r.text()); if (t.length) return t; } catch { /* next */ }
  }
  return [];
}

// Dated needs in India. Returns [{ tools:[ids], w:0..1, why }]. IST date parts are passed in (m = 1..12).
export function calendarSignals(date = new Date()) {
  const ist = new Date(date.getTime() + 19800000), m = ist.getUTCMonth() + 1, d = ist.getUTCDate(), out = [];
  const near = (mm, dd, before = 12) => { const t = Date.UTC(2000, m - 1, d), x = Date.UTC(2000, mm - 1, dd); const diff = (x - t) / 86400000; return diff >= 0 && diff <= before ? 1 - diff / (before + 1) : 0; };
  if (d <= 7) out.push({ tools: ['tdsdates', 'tdsinterest', 'tdslatefee'], w: 0.5 + (7 - d) * 0.05, why: 'TDS deposit due on the 7th' });
  for (const [mm, dd] of [[1, 31], [4, 30], [7, 31], [10, 31]]) { const w = near(mm, dd, 14); if (w) out.push({ tools: ['tdsdates', 'tdslatefee', 'pantan'], w, why: `TDS return due ${dd}/${mm}` }); }
  { const w = Math.max(near(7, 31, 30), near(12, 31, 20)); if (w) out.push({ tools: ['incometaxcalc', 'pantan'], w, why: 'ITR filing deadline' }); }
  if ((m === 3 && d >= 1) || (m === 4 && d <= 10)) out.push({ tools: ['examphoto', 'studytimer', 'cgpacalc'], w: 0.6, why: 'board exam season' });
  if (m === 5 || (m === 6 && d <= 20)) out.push({ tools: ['tneacutoff', 'imgcompresskb', 'imgpassport'], w: 0.7, why: 'results and TNEA season' });
  if (m === 7 || (m === 8 && d <= 20)) out.push({ tools: ['tneacutoff', 'cgpacalc', 'imgcompresskb'], w: 0.5, why: 'college admissions' });
  if (m === 1 && d >= 5 && d <= 14) out.push({ tools: ['invitation', 'porutham'], w: 0.5, why: 'Pongal' });
  if (m === 10 || (m === 11 && d <= 8)) out.push({ tools: ['invitation', 'goldcalc'], w: 0.5, why: 'Deepavali season' });
  if (m === 3) out.push({ tools: ['incometaxcalc', 'pfcalc', 'salaryslip'], w: 0.5, why: 'financial year end — tax saving' });
  return out;
}

const hash01 = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; };

// history: [{ tool_id, created_at:'YYYY-MM-DD…' }] newest first; returns the ranked list (best first).
export function scoreTools({ catalog, trends = [], date = new Date(), history = [] }) {
  const maxT = Math.max(1, ...trends.map((t) => Math.log1p(t.traffic)));
  const trendScore = new Map(), why = new Map();
  for (const tr of trends) {
    const text = lc(tr.title + ' ' + (tr.news || []).slice(0, 2).join(' '));
    const strength = Math.log1p(tr.traffic) / maxT;
    for (const it of INTENT) {
      const hit = it.words.find((w) => text.includes(w));
      if (!hit) continue;
      it.tools.forEach((id, i) => { const v = strength * (1 - i * 0.18); if (v > (trendScore.get(id) || 0)) { trendScore.set(id, v); why.set(id, { trend: tr.title, word: hit }); } });
    }
  }
  const cal = new Map(), calWhy = new Map();
  for (const s of calendarSignals(date)) s.tools.forEach((id, i) => { const v = Math.min(1, s.w) * (1 - i * 0.15); if (v > (cal.get(id) || 0)) { cal.set(id, v); calWhy.set(id, s.why); } });
  const today = Math.floor((date.getTime() + 19800000) / 86400000);
  const last = new Map(); for (const h of history) { if (!last.has(h.tool_id)) last.set(h.tool_id, Math.floor((Date.parse(String(h.created_at).replace(' ', 'T') + (String(h.created_at).includes('Z') ? '' : 'Z')) + 19800000) / 86400000)); }
  const lastCat = catalog.find((t) => t.id === history[0]?.tool_id)?.cat;
  const ranked = catalog.map((t) => {
    const tr = trendScore.get(t.id) || 0, ca = cal.get(t.id) || 0, ev = EVERGREEN[t.id] ?? 0.3;
    const days = last.has(t.id) ? Math.max(0, today - last.get(t.id)) : 30;
    const fresh = days < 7 ? 0.01 * days : 1 - Math.exp(-(days - 6) / 6); // never inside 7 days, then recovering
    const variety = lastCat && t.cat === lastCat ? 0.7 : 1;
    const paid = t.paid ? 0.4 : 1;
    const score = (3 * tr + 2 * ca + 1 * ev) * fresh * variety * paid + hash01(t.id + today) * 0.01;
    return { id: t.id, score, tr, ca, ev, fresh, trend: why.get(t.id)?.trend || null, calendar: calWhy.get(t.id) || null };
  }).sort((a, b) => b.score - a.score);
  return ranked;
}
export function chooseTool(opts) {
  const ranked = scoreTools(opts); const best = ranked[0];
  const reason = best.trend && best.tr >= best.ca ? `trending: ${best.trend}` : best.calendar ? `calendar: ${best.calendar}` : 'evergreen demand';
  return { id: best.id, reason, trend: best.tr > 0.25 ? best.trend : null, calendar: best.ca > 0.25 ? best.calendar : null, top: ranked.slice(0, 5) };
}
