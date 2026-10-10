// generate-tool-pages.mjs
//
// Generates one static, crawlable, indexable landing page per tool at
// /tools/<slug>.html, plus a regenerated sitemap.xml listing all of them
// alongside the existing homepage + blog pages.
//
// WHY: the site is a single-page app — every route serves the same
// index.html, and every tool is opened via client-side JS (no per-tool
// <a href>, no per-tool <title>/meta). Google Search Console showed
// "Discovered: 9" — exactly the sitemap's URL count (homepage + blog) —
// because there was nothing else for Googlebot to find or meaningfully
// index. This script does NOT touch the app itself (index.source.html
// already has its own small, separate edit adding real hrefs to tool
// cards) — it only adds new, additive static pages that link into the
// existing, unmodified interactive tool via the app's own already-working
// ?tool=<id> deep link.
//
// USAGE: node generate-tool-pages.mjs
// Safe to re-run any time tools are added/removed/renamed — it always
// regenerates every /tools/*.html file and the full sitemap.xml from
// the current TOOLS array, so nothing drifts out of sync.

import fs from 'fs';
import path from 'path';
import { SEO_EXTRA } from './seo-content.mjs';
import { TA_TOOL } from './ta-names.mjs';
import { CAT_THEME, BASE_CSS, HEADER, FOOTER } from './pages-style.mjs';

const SITE = 'https://pdftoolsindia.com';
const OUT_DIR = './tools';

const CATEGORY_LABEL = {
  pdf: 'PDF', business: 'Business', image: 'Image',
  video: 'Video', ai: 'AI', education: 'Education',
};
const CATEGORY_BLURB = {
  pdf: 'Runs entirely in your browser — your file is never uploaded to a server.',
  business: 'GST, invoicing, HR and accounting tools built for Indian small businesses.',
  image: 'Runs entirely in your browser — your photo is never uploaded to a server.',
  video: 'Free by default, with an optional paid Fast Server upgrade for large files.',
  ai: 'Powered by AI — reads, writes or generates content a simple script cannot.',
  education: 'Free learning games and quizzes for Grades 1–12.',
};

const SLUG_OVERRIDES = { 'Type Race — Typing Practice Game': 'typing-race-game' };
function slugify(name) {
  if (SLUG_OVERRIDES[name]) return SLUG_OVERRIDES[name];
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

const STANDALONE_IDS = new Set(['tnrentagreement', 'tnsaledeed', 'kalvikalanjiyam']); // real root pages — no generated /tools/ duplicate
function readTools(all = false) {
  const src = fs.readFileSync('index.source.html', 'utf8');
  const m = src.match(/const TOOLS = \[([\s\S]*?)\n\];/);
  if (!m) throw new Error('Could not find TOOLS array in index.source.html — aborting rather than generating from stale/guessed data.');
  const body = m[1];
  // Matches this codebase's one consistent object-literal shape:
  // {id:'x', name:'y', desc:'z', icon:'i', color:'#hex', cat:'c'[, cost:N]}
  const re = /\{id:'((?:[^'\\]|\\.)*)',\s*name:'((?:[^'\\]|\\.)*)',\s*desc:'((?:[^'\\]|\\.)*)',\s*icon:'((?:[^'\\]|\\.)*)',\s*color:'(#[0-9A-Fa-f]{6})',\s*cat:'([a-z]+)'(?:,\s*cost:(\d+))?(?:,\s*lazy:'[a-z0-9]+')?\s*\}/g;
  const unescapeJs = s => s.replace(/\\(.)/g, '$1');
  const tools = [];
  let mm;
  while ((mm = re.exec(body))) {
    tools.push({
      id: unescapeJs(mm[1]), name: unescapeJs(mm[2]), desc: unescapeJs(mm[3]),
      icon: mm[4], color: mm[5], cat: mm[6], cost: mm[7] ? parseInt(mm[7], 10) : 0,
    });
  }
  return all ? tools : tools.filter(t => !STANDALONE_IDS.has(t.id));
}

function pageHtml(t, slug, related) {
  const isPaid = t.cost > 0;
  const catLabel = CATEGORY_LABEL[t.cat] || t.cat;
  const title = isPaid
    ? `${t.name} — AI Tool Online | PDF Tools India`
    : `${t.name} — Free Online Tool | PDF Tools India`;
  const metaDesc = isPaid
    ? `${t.desc}. Use ${t.name} online at PDF Tools India — AI-powered, ${t.cost} credit${t.cost>1?'s':''} per use, works on mobile & desktop.`
    : `${t.desc}. Use ${t.name} free online at PDF Tools India — no signup, no install required, works on mobile & desktop.`;
  const X = SEO_EXTRA[t.id];
  const title2 = X ? X.title : title;
  const metaDesc2 = X ? X.desc : metaDesc;
  const costNote = isPaid
    ? `<p class="note">🤖 This is an AI-powered tool — costs ${t.cost} credit${t.cost>1?'s':''} per use. You'll always see this cost and confirm before it's charged.</p>`
    : `<p class="note">🔒 ${CATEGORY_BLURB[t.cat] || 'Free to use.'}</p>`;

  const free = !isPaid;
  const faqs = [
    ...((SEO_EXTRA[t.id] && SEO_EXTRA[t.id].faqs) || []),
    [`Is ${t.name} free to use?`, free ? `Yes. ${t.name} is free on PDF Tools India — no signup, no watermark and no daily limit.` : `${t.name} is AI-powered, so it uses ${t.cost} credit${t.cost>1?'s':''} per run. You always see the cost and confirm before anything is charged; the rest of the site's tools stay free.`],
    [`Is my data safe when I use ${t.name}?`, (t.cat === 'pdf' || t.cat === 'image' || t.cat === 'education') ? `Yes. ${t.name} runs inside your own browser, so your files and text never leave your device.` : (t.cat === 'ai' ? `Your file is sent only to the AI service needed to produce the result, over an encrypted connection, and is not kept after processing.` : `Most processing happens in your browser. Heavy video jobs can optionally use a faster server, and files there are deleted after processing.`)],
    [`Does ${t.name} work on mobile?`, `Yes. ${t.name} works on Android phones, iPhones, tablets and desktop browsers. The interface is available in Tamil and English.`],
    [`What does ${t.name} do?`, `${t.desc}.`],
  ];
  const faqHtml = faqs.map(([q, a]) => `<h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p>`).join('\n      ');
  const ld = JSON.stringify([
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: t.name, description: t.desc, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (web browser)', url: `${SITE}/tools/${slug}`, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' }, inLanguage: ['en', 'ta'] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'PDF Tools India', item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: catLabel, item: `${SITE}/${t.cat}-tools` }, { '@type': 'ListItem', position: 3, name: t.name, item: `${SITE}/tools/${slug}` } ] },
  ]).replace(/</g, '\\u003c');
  const relatedLinks = related.map(r => {
    const m = TA_TOOL[r.id] || [];
    return `<a class="tc" href="/tools/${slugify(r.name)}"><span class="ic" style="background:${r.color}">${r.icon}</span><span class="tx"><div class="nm">${escapeHtml(m[0] || r.name)}${m[0] ? `<small>${escapeHtml(r.name)}</small>` : ''}</div></span></a>`;
  }).join('\n        ');
  const theme = CAT_THEME[t.cat] || CAT_THEME.pdf;
  const taName = (TA_TOOL[t.id] || [])[0] || t.name;
  const taDesc = (TA_TOOL[t.id] || [])[1] || t.desc;
  const costNoteText = isPaid
    ? `🤖 This is an AI-powered tool — costs ${t.cost} credit${t.cost>1?'s':''} per use. You'll always see this cost and confirm before it's charged.`
    : `🔒 ${CATEGORY_BLURB[t.cat] || 'Free to use.'}`;
  return `<!DOCTYPE html>
<html lang="ta">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title2)}</title>
<meta name="description" content="${escapeHtml(metaDesc2)}">
<link rel="canonical" href="${SITE}/tools/${slug}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title2)}">
<meta property="og:description" content="${escapeHtml(metaDesc2)}">
<meta property="og:url" content="${SITE}/tools/${slug}">
<meta property="og:site_name" content="PDF Tools India">
<link rel="icon" href="/favicon.ico">
<script type="application/ld+json">${ld}</script>
<style>${BASE_CSS}
  :root{--brand:${t.color};}
</style>
</head>
<body>
  ${HEADER}
  <div class="wrap">
    <div class="crumb"><a href="/?home=1">PDF Tools India</a> › <a href="/${t.cat}-tools">${escapeHtml(theme.ta)}</a> › ${escapeHtml(t.name)}</div>
    <div class="hero" style="background:linear-gradient(135deg,${t.color},#1d2540);">
      <div class="row">
        <div class="big">${t.icon}</div>
        <div><h1>${escapeHtml(taName)}</h1><div class="en">${escapeHtml(t.name)}</div></div>
      </div>
      <p>${escapeHtml(taDesc)}</p>
      <p style="margin-top:6px;opacity:.85;font-size:13.5px;">${escapeHtml(t.desc)}</p>
      <a class="cta" href="/?tool=${encodeURIComponent(t.id)}">இப்போதே திற · Open →</a>
      <div class="pills"><span class="pill">${isPaid ? `⚡ AI கருவி — ${t.cost} credit` : '✓ இலவசம்'}</span><span class="pill">🔒 கோப்பு உங்கள் சாதனத்திலேயே</span><span class="pill">📱 மொபைல் + கணினி</span></div>
    </div>
    <div class="section">
      <h2>இந்தக் கருவி பற்றி <small>About this tool</small></h2>
      <p>${X ? escapeHtml(X.intro) + ' ' : ''}${escapeHtml(t.name)} is part of PDF Tools India's ${escapeHtml(catLabel)} toolkit. ${escapeHtml(t.desc)}. ${CATEGORY_BLURB[t.cat] || ''} Available in Tamil and English, on both mobile and desktop, with no account required to try it.</p>
      <p style="margin-top:8px;">${costNoteText}</p>
    </div>
    <div class="section">
      <h2>எப்படிப் பயன்படுத்துவது? <small>How it works</small></h2>
      <ol>
        ${X ? X.steps.map(x => `<li>${escapeHtml(x)}</li>`).join('\n        ') : `<li>Click "Open ${escapeHtml(t.name)}" above.</li>
        <li>Follow the simple on-screen steps — add a file, type your input, or record, depending on the tool.</li>
        <li>Download or copy your result — that's it.</li>`}
      </ol>
    </div>
${X && X.uses ? `    <div class="section">
      <h2>எதற்குப் பயன்படும்? <small>Common uses</small></h2>
      <ul>${X.uses.map(u => `<li>${escapeHtml(u)}</li>`).join('')}</ul>
    </div>
` : ''}    <div class="section faq">
      <h2>அடிக்கடி கேட்கப்படும் கேள்விகள் <small>FAQ</small></h2>
      ${faqHtml}
    </div>
    ${related.length ? `<div class="section">
      <h2>தொடர்புடைய கருவிகள் <small>Related tools</small></h2>
      <div class="grid">
        ${relatedLinks}
      </div>
    </div>` : ''}
    ${FOOTER}
  </div>
</body>
</html>
`;
}

const STANDALONE_HREF = { tnrentagreement: '/tn-rent-agreement', tnsaledeed: '/tn-sale-deed', kalvikalanjiyam: '/learn/' };
const HUB_META = {
  pdf:       { file: 'pdf-tools.html',       title: 'PDF Tools Online Free | PDF Tools India',
    desc: 'Free PDF tools online — merge, split, compress, convert PDF to Word/Excel/Image, sign and more. No signup, works on mobile & desktop. தமிழிலும் கிடைக்கும்.',
    ta: 'PDF வேலைகள் அனைத்தும் ஒரே இடத்தில் — இணை, பிரி, சுருக்கு, Word/Excel ஆக மாற்று, கையொப்பமிடு, கடவுச்சொல் இடு. எந்த கணக்கும் தேவையில்லை; உங்கள் கோப்பு உங்கள் சாதனத்தை விட்டு வெளியே போகாது.',
    en: 'Everyday PDF work — merging, splitting, compressing, converting and editing PDF files — runs directly in your browser, so your files are never uploaded.' },
  image:     { file: 'image-tools.html',     title: 'Image Tools Online Free | PDF Tools India',
    desc: 'Free image tools online — compress, convert, crop, resize, remove background and edit photos. No signup, works on mobile & desktop.',
    ta: 'படத்தைச் சுருக்கு, வடிவம் மாற்று, வெட்டு, Background நீக்கு, Passport அளவு தயாரி. எல்லாம் உங்கள் போனிலேயே நடக்கும்; படம் எங்கும் பதிவேறாது.',
    en: 'Compress, convert, crop, resize, remove backgrounds and add watermarks — all in your browser, with no premium tier hiding basic edits.' },
  business:  { file: 'business-tools.html',  title: 'Free Business Tools for India | PDF Tools India',
    desc: 'Free business tools for Indian businesses — GST invoice generator, EMI calculator, rent receipt, quotation maker, amount in words and more.',
    ta: 'GST பில், EMI / வட்டிக் கணிப்பான், வாடகை ரசீது, விலைப்புள்ளி, ரூபாய் எழுத்தில் — சிறு வணிகர்களுக்கும் எல்லோருக்கும் தேவையான இந்திய வடிவக் கருவிகள்; இலவசம்.',
    en: 'Built around Indian formats and tax rules — GST invoices with CGST/SGST/IGST, EMI and interest calculators, receipts, quotations and everyday utilities.' },
  video:     { file: 'video-tools.html',     title: 'Video Tools Online Free | PDF Tools India',
    desc: 'Free video tools online — compress, merge, trim, convert and edit videos directly in your browser. No signup required.',
    ta: 'வீடியோவை வெட்டு, இணை, சுருக்கு, GIF ஆக்கு, வசன வரிகள் சேர். பதிவு தேவையில்லை; வீடியோவில் Watermark சேர்க்கப்படாது.',
    en: 'Trim, merge, compress, mute, loop, add subtitles and convert to GIF — with no watermark added to your video.' },
  ai:        { file: 'ai-tools.html',        title: 'AI Tools Online | PDF Tools India',
    desc: 'AI-powered tools — document summarizer, resume reviewer, AI translation, handwriting to text and more. Uses AI credits.',
    ta: 'AI உண்மையாகத் தேவைப்படும் வேலைகளுக்கு மட்டும் — ஆவணச் சுருக்கம், மொழிபெயர்ப்பு, கையெழுத்து → எழுத்து, Resume ஆலோசனை. இவற்றுக்கு மட்டும் சிறு credit செலவாகும்; மற்ற எல்லாக் கருவிகளும் இலவசம்.',
    en: 'These use paid AI models behind the scenes, so they run on a small credit system. Every other tool on PDF Tools India stays free.' },
  education: { file: 'education-tools.html', title: 'இலவசக் கல்விக் கருவிகள் & கற்றல் விளையாட்டுகள் | PDF Tools India',
    desc: 'Free education tools and learning games for Tamil students — Kalvi Kalanjiyam (Class 1–10), Tamil typing, Tamil font converter, math practice sheets, marks calculator and more.',
    ta: '1 முதல் 10 ஆம் வகுப்பு வரை தமிழ் மாணவர்களுக்காக — தினசரி சவால், நட்சத்திரங்கள், நாளைய உலகம் பாடங்கள் கொண்ட கல்வி களஞ்சியம்; தமிழ்த் தட்டச்சு, எழுத்துரு மாற்றி, கணக்குப் பயிற்சித் தாள், மதிப்பெண் கணிப்பான். எல்லாம் இலவசம்.',
    en: 'Learning through play for Tamil students in Classes 1–10, plus Tamil typing and font tools and student calculators. No ads, no account needed.' },
};
function hubHtml(cat, items) {
  const m = HUB_META[cat], th = CAT_THEME[cat];
  const cards = items.map(t => {
    const tm = TA_TOOL[t.id] || [];
    const href = STANDALONE_HREF[t.id] || `/tools/${slugify(t.name)}`;
    const badge = t.cost > 0 ? `<span class="bd ai">⚡ ${t.cost}</span>` : '<span class="bd">இலவசம்</span>';
    return `<a class="tc" href="${href}"><span class="ic" style="background:${t.color}">${t.icon}</span><span class="tx"><div class="nm">${escapeHtml(tm[0] || t.name)}${tm[0] ? `<small>${escapeHtml(t.name.split(' — ')[0])}</small>` : ''}</div><div class="ds">${escapeHtml(tm[1] || t.desc)}</div></span>${badge}</a>`;
  }).join('\n        ');
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: m.title, description: m.desc, url: `${SITE}/${m.file.replace('.html','')}`, inLanguage: ['ta','en'], numberOfItems: items.length }).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="ta">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(m.title)}</title>
<meta name="description" content="${escapeHtml(m.desc)}">
<link rel="canonical" href="${SITE}/${m.file}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(m.title)}">
<meta property="og:description" content="${escapeHtml(m.desc)}">
<meta property="og:url" content="${SITE}/${m.file}">
<meta property="og:site_name" content="PDF Tools India">
<link rel="icon" href="/favicon.ico">
<script type="application/ld+json">${ld}</script>
<style>${BASE_CSS}</style>
</head>
<body>
  ${HEADER}
  <div class="wrap">
    <div class="crumb"><a href="/?home=1">PDF Tools India</a> › ${escapeHtml(th.ta)}</div>
    <div class="hero" style="background:${th.g};">
      <div class="row"><div class="big">${th.icon}</div><div><h1>${escapeHtml(th.ta)}</h1><div class="en">${items.length} free tools · ${escapeHtml(th.en)}</div></div></div>
      <p>${escapeHtml(m.ta)}</p>
      <p style="margin-top:6px;opacity:.85;font-size:13.5px;">${escapeHtml(m.en)}</p>
      <div class="pills"><span class="pill">🧰 ${items.length} கருவிகள்</span><span class="pill">${cat === 'ai' ? '⚡ credit தேவை' : '✓ இலவசம்'}</span><span class="pill">🔒 கோப்பு உங்கள் சாதனத்திலேயே</span></div>
    </div>
    <div class="section">
      <h2>எல்லாக் கருவிகளும் <small>All ${escapeHtml(th.en)}</small></h2>
      <div class="grid">
        ${cards}
      </div>
    </div>
    ${FOOTER}
  </div>
</body>
</html>
`;
}

function buildSitemap(toolEntries) {
  const staticUrls = [
    { loc: `${SITE}/`, freq: 'weekly', pri: '1.0' },
    { loc: `${SITE}/blog/`, freq: 'weekly', pri: '0.9' },
    { loc: `${SITE}/pdf-tools`, freq: 'weekly', pri: '0.8' },
    { loc: `${SITE}/image-tools`, freq: 'weekly', pri: '0.8' },
    { loc: `${SITE}/business-tools`, freq: 'weekly', pri: '0.8' },
    { loc: `${SITE}/video-tools`, freq: 'weekly', pri: '0.8' },
    { loc: `${SITE}/ai-tools`, freq: 'weekly', pri: '0.8' },
    { loc: `${SITE}/education-tools`, freq: 'weekly', pri: '0.8' },
    { loc: `${SITE}/learn/`, freq: 'weekly', pri: '0.8' },
    { loc: `${SITE}/tn-rent-agreement`, freq: 'monthly', pri: '0.6' },
    { loc: `${SITE}/tn-sale-deed`, freq: 'monthly', pri: '0.6' },
    { loc: `${SITE}/blog/how-to-merge-pdf-files-free`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/compress-pdf-for-email-whatsapp`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/forgot-pdf-password-recovery-guide`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/gst-invoice-format-guide`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/how-emi-is-calculated`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/old-vs-new-income-tax-regime`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/how-to-write-a-resume-that-passes-ats`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/whats-new-pdf-tools-india-october-2026`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/split-pdf-extract-pages-free`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/delete-reorder-rotate-pdf-pages`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/jpg-to-pdf-free-multiple-images`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/pdf-to-word-free-editable-docx`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/sign-pdf-online-free-draw-type-upload`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/reduce-image-size-to-kb-for-online-forms`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/are-online-pdf-tools-safe`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/remove-photo-location-exif-before-sharing`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/free-kalvi-kalanjiyam-learn-class-1-to-10`, freq: 'monthly', pri: '0.7' },
  ];
  const toolUrls = toolEntries.map(slug => ({ loc: `${SITE}/tools/${slug}`, freq: 'monthly', pri: '0.6' }));
  // The live sitemap lists real file URLs (with .html) — keep that form so nothing already indexed drops out.
  const withHtml = u => (/\/$/.test(u.loc) || /\.html$/.test(u.loc)) ? u : { ...u, loc: u.loc + '.html' };
  staticUrls.push({ loc: `${SITE}/health-check`, freq: 'monthly', pri: '0.6' });
  const all = [...staticUrls, ...toolUrls].map(withHtml);
  const body = all.map(u =>
    `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${new Date().toISOString().slice(0,10)}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function main() {
  const tools = readTools();
  console.log(`Read ${tools.length} tools from index.source.html`);

  const slugs = tools.map(t => slugify(t.name));
  const dupeCheck = {};
  slugs.forEach((s, i) => { (dupeCheck[s] = dupeCheck[s] || []).push(tools[i].id); });
  const dupes = Object.entries(dupeCheck).filter(([, ids]) => ids.length > 1);
  if (dupes.length) {
    console.error('ABORTING — duplicate slugs would overwrite each other:');
    dupes.forEach(([s, ids]) => console.error(`  ${s}: ${ids.join(', ')}`));
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let written = 0;
  for (const t of tools) {
    const slug = slugify(t.name);
    const sameCategory = tools.filter(o => o.cat === t.cat && o.id !== t.id);
    // Deterministic (not random) pick so re-runs produce byte-identical
    // output until the TOOLS list itself changes — easier to diff/review.
    const related = sameCategory.slice(0, 6);
    const html = pageHtml(t, slug, related);
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.html`), html);
    written++;
  }
  console.log(`Wrote ${written} pages to ${OUT_DIR}/`);

  const allTools = readTools(true);
  for (const cat of Object.keys(HUB_META)) {
    const items = allTools.filter(t => t.cat === cat);
    fs.writeFileSync(HUB_META[cat].file, hubHtml(cat, items));
  }
  console.log(`Wrote ${Object.keys(HUB_META).length} hub pages`);

  const sitemap = buildSitemap(slugs);
  fs.writeFileSync('sitemap.xml', sitemap);
  console.log(`Rewrote sitemap.xml — ${slugs.length + 16} URLs total.`);
}

main();
