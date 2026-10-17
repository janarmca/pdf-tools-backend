// Captions + hashtags for the daily Short, written by plain code (no AI, no cost). Based on research of Oct 2026:
//  - Instagram allows at most 5 hashtags per caption and says hashtags barely change reach -> 3-5 precise tags, keyword-first captions.
//  - Reach signals: watch time, likes and especially SENDS per reach -> every caption asks to Save and to Send to a friend.
//  - Facebook: fewer hashtags (<=3), no external link in the caption, wording different from Instagram.
//  - Audience alternates daily between office workers and college students. Which tags perform is NOT proven for Tamil —
//    the sets below are rotated so Instagram/YouTube Insights show what works; edit TAGS after 3 weeks of data.
export const MAX = { instagram: 5, facebook: 3, youtube: 3 };
const BRAND = '#PDFToolsIndia';
const CAT_TAGS = {
  pdf: ['#PDFTools', '#CompressPDF'], image: ['#ImageCompress', '#PhotoTools'], business: ['#FreeOnlineTools', '#IndiaTax'],
  video: ['#VideoEditing', '#FreeOnlineTools'], ai: ['#AITools', '#FreeOnlineTools'], education: ['#StudentLife', '#ExamPrep'],
};
const TOOL_TAGS = {
  pantan: ['#TDS', '#IncomeTaxIndia'], tdsdates: ['#TDS', '#IncomeTaxIndia'], tdslatefee: ['#TDS', '#IncomeTaxIndia'], tdsinterest: ['#TDS', '#IncomeTaxIndia'],
  incometaxcalc: ['#IncomeTaxIndia', '#ITRFiling'], gstcalc: ['#GSTIndia'], gstchecking: ['#GSTIndia'], emicalc: ['#EMICalculator'],
  resumebuilder: ['#ResumeTips', '#ResumeBuilder'], airesume: ['#ResumeTips', '#AITools'], tamiltyping: ['#TypingTest', '#TamilTyping'],
};
const KEYWORDS = {
  pdf: 'compress PDF · reduce PDF size for upload · merge PDF free · PDF size kammi panna',
  image: 'compress image online · photo size reduce · photo resize for form upload',
  business: 'ITR · GST · TDS calculator India · free online tax tools',
  video: 'compress video online · video size reduce for WhatsApp',
  ai: 'free AI tools online · resume AI · AI translate',
  education: 'free student tools · exam prep tools · Tamil typing',
};
export const AUDIENCE = [
  { key: 'office', tag: '#OfficeLife', ta: 'Office-ல் வேலை பாக்குறவங்களுக்கு', en: 'For office work' },
  { key: 'student', tag: '#CollegeLife', ta: 'College students-க்கு', en: 'For college students' },
];
const COMMUNITY = ['#TamilStudents', '#Tanglish', null]; // null = skip (keeps the set from looking stuffed)

// Dated hooks (India). Only used inside their window, only where they fit the tool.
export function seasonal(t, d = new Date()) {
  const m = d.getUTCMonth() + 1, day = d.getUTCDate(), y = d.getUTCFullYear(), out = [];
  const tds = /^tds|^pantan/.test(t.id);
  const due = { 1: '31 Jan', 4: '31 May', 7: '31 Jul', 10: '31 Oct' }[m]; // Form 138 quarterly due dates (Income-tax Act 2025) — same dates as tds-core.js
  if (tds && due && day >= 15) out.push(`⏰ TDS statement கடைசி தேதி ${due} — தாமதிக்காதீங்க!`);
  if (y === 2026 && m === 11 && day <= 8) out.push('🪔 தீபாவளி நல்வாழ்த்துகள்!');
  if (t.cat === 'education' && m === 11 && day >= 10) out.push('📚 Exam season — All the best!');
  return out;
}

const uniq = (a) => [...new Set(a.filter(Boolean))];
export function hashtags(t, day, platform = 'instagram') {
  const aud = AUDIENCE[day % AUDIENCE.length], com = COMMUNITY[day % COMMUNITY.length];
  const ordered = uniq([BRAND, ...(TOOL_TAGS[t.id] || []).slice(0, 2), aud.tag, ...(CAT_TAGS[t.cat] || CAT_TAGS.pdf), com]);
  return ordered.slice(0, MAX[platform]);
}

// Our names on every platform — shown in every caption so people can follow us wherever they watch.
export const FOLLOW = '▶️ YouTube: @pdftoolsindia\n📸 Instagram: @pdftoolsindia\n👍 Facebook: Pdf Tools India';

export function buildCaptions(t, day = Math.floor(Date.now() / 86400000), date = new Date()) {
  const aud = AUDIENCE[day % AUDIENCE.length], paid = !!t.paid;
  const ta = t.ta || t.name, desc = String(t.taDesc || t.desc || '').replace(/[.!]+$/, '');
  const season = seasonal(t, date); const kw = KEYWORDS[t.cat] || KEYWORDS.pdf;
  const price = paid ? 'AI tool ✨ — தேவையான இடத்தில் மட்டும் சிறு கட்டணம்' : 'இலவசம் ✅ · Login வேண்டாம் ✅ · Phone-லேயே ✅';
  const hook = `${aud.ta}: ${ta} — ${desc}!`;
  const lines = (...x) => x.filter(Boolean).join('\n\n');
  const ig = lines(hook, season.join('\n'), price, `🔎 ${t.name} · ${kw}`, '📌 Save பண்ணுங்க · 📲 இது தேவைப்படும் friend-க்கு Send பண்ணுங்க', '👉 Link in bio — pdftoolsindia.com', FOLLOW, hashtags(t, day, 'instagram').join(' '));
  const fb = lines(`${aud.ta} 👇\n${ta} — ${desc}`, season.join('\n'), price, '🔁 Share பண்ணுங்க — உங்க நண்பர்களுக்கு உதவும்! (pdftoolsindia.com)', FOLLOW, hashtags(t, day, 'facebook').join(' '));
  const ytTags = hashtags(t, day, 'youtube');
  const yt = lines(`${t.name} — ${ta}\n${desc}`, season.join('\n'), `🔎 ${kw}`, `👉 ${t.url}?utm_source=youtube&utm_medium=short&utm_campaign=${t.id}`, price, FOLLOW, [...ytTags, '#Shorts'].join(' '));
  return { audience: aud.key, instagram: ig, facebook: fb, youtube: yt, youtubeTags: uniq(['pdftoolsindia', 'free tools', 'tamil', 'tanglish', t.name, t.ta, ...kw.split(' · ')]).slice(0, 15) };
}
