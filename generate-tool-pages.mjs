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

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function readTools() {
  const src = fs.readFileSync('index.source.html', 'utf8');
  const m = src.match(/const TOOLS = \[([\s\S]*?)\n\];/);
  if (!m) throw new Error('Could not find TOOLS array in index.source.html — aborting rather than generating from stale/guessed data.');
  const body = m[1];
  // Matches this codebase's one consistent object-literal shape:
  // {id:'x', name:'y', desc:'z', icon:'i', color:'#hex', cat:'c'[, cost:N]}
  const re = /\{id:'((?:[^'\\]|\\.)*)',\s*name:'((?:[^'\\]|\\.)*)',\s*desc:'((?:[^'\\]|\\.)*)',\s*icon:'((?:[^'\\]|\\.)*)',\s*color:'(#[0-9A-Fa-f]{6})',\s*cat:'([a-z]+)'(?:,\s*cost:(\d+))?\s*\}/g;
  const unescapeJs = s => s.replace(/\\(.)/g, '$1');
  const tools = [];
  let mm;
  while ((mm = re.exec(body))) {
    tools.push({
      id: unescapeJs(mm[1]), name: unescapeJs(mm[2]), desc: unescapeJs(mm[3]),
      icon: mm[4], color: mm[5], cat: mm[6], cost: mm[7] ? parseInt(mm[7], 10) : 0,
    });
  }
  return tools;
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
  const costNote = isPaid
    ? `<p class="note">🤖 This is an AI-powered tool — costs ${t.cost} credit${t.cost>1?'s':''} per use. You'll always see this cost and confirm before it's charged.</p>`
    : `<p class="note">🔒 ${CATEGORY_BLURB[t.cat] || 'Free to use.'}</p>`;
  const relatedLinks = related.map(r =>
    `<li><a href="/tools/${slugify(r.name)}.html">${r.icon} ${escapeHtml(r.name)}</a></li>`
  ).join('\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(metaDesc)}">
<link rel="canonical" href="${SITE}/tools/${slug}.html">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(metaDesc)}">
<meta property="og:url" content="${SITE}/tools/${slug}.html">
<meta property="og:site_name" content="PDF Tools India">
<link rel="icon" href="/favicon.ico">
<style>
  :root{--brand:${t.color};--ink:#1a1a2e;--sub:#5a6072;--line:#e6e8ec;--bg:#f7f8fa;}
  *{box-sizing:border-box;}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--ink);}
  .wrap{max-width:680px;margin:0 auto;padding:28px 20px 60px;}
  .crumb{font-size:13px;color:var(--sub);margin-bottom:18px;}
  .crumb a{color:var(--sub);text-decoration:none;}
  .crumb a:hover{text-decoration:underline;}
  .hero{background:#fff;border:1px solid var(--line);border-radius:18px;padding:28px 24px;text-align:center;}
  .icon{font-size:40px;line-height:1;margin-bottom:10px;}
  h1{font-size:24px;margin:0 0 8px;}
  .sub{color:var(--sub);font-size:15px;margin:0 0 20px;}
  .cta{display:inline-block;background:var(--brand);color:#fff;font-weight:800;font-size:15px;padding:13px 28px;border-radius:12px;text-decoration:none;}
  .note{font-size:13px;color:var(--sub);margin-top:16px;}
  .section{margin-top:24px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px 22px;}
  .section h2{font-size:16px;margin:0 0 10px;}
  .section p{font-size:14px;line-height:1.7;color:#333;margin:0;}
  .section ol{font-size:14px;line-height:1.8;color:#333;margin:0;padding-left:20px;}
  .related ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .related a{display:block;font-size:13.5px;color:var(--ink);text-decoration:none;padding:9px 12px;background:var(--bg);border-radius:10px;}
  .related a:hover{background:var(--line);}
  footer{margin-top:28px;text-align:center;font-size:12.5px;color:var(--sub);}
  footer a{color:var(--sub);}
</style>
</head>
<body>
  <div class="wrap">
    <div class="crumb"><a href="/">PDF Tools India</a> › ${escapeHtml(catLabel)} › ${escapeHtml(t.name)}</div>
    <div class="hero">
      <div class="icon">${t.icon}</div>
      <h1>${escapeHtml(t.name)}</h1>
      <p class="sub">${escapeHtml(t.desc)}</p>
      <a class="cta" href="/?tool=${encodeURIComponent(t.id)}">Open ${escapeHtml(t.name)} →</a>
      ${costNote}
    </div>
    <div class="section">
      <h2>About this tool</h2>
      <p>${escapeHtml(t.name)} is part of PDF Tools India's ${escapeHtml(catLabel)} toolkit. ${escapeHtml(t.desc)}. ${CATEGORY_BLURB[t.cat] || ''} Available in Tamil and English, on both mobile and desktop, with no account required to try it.</p>
    </div>
    <div class="section">
      <h2>How it works</h2>
      <ol>
        <li>Click "Open ${escapeHtml(t.name)}" above.</li>
        <li>Follow the simple on-screen steps — add a file, type your input, or record, depending on the tool.</li>
        <li>Download or copy your result — that's it.</li>
      </ol>
    </div>
    ${related.length ? `<div class="section related">
      <h2>Related tools</h2>
      <ul>
        ${relatedLinks}
      </ul>
    </div>` : ''}
    <footer>
      <a href="/">← All 100+ tools at PDF Tools India</a>
    </footer>
  </div>
</body>
</html>
`;
}

function buildSitemap(toolEntries) {
  const staticUrls = [
    { loc: `${SITE}/`, freq: 'weekly', pri: '1.0' },
    { loc: `${SITE}/blog/`, freq: 'weekly', pri: '0.9' },
    { loc: `${SITE}/blog/how-to-merge-pdf-files-free.html`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/compress-pdf-for-email-whatsapp.html`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/forgot-pdf-password-recovery-guide.html`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/gst-invoice-format-guide.html`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/how-emi-is-calculated.html`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/old-vs-new-income-tax-regime.html`, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/blog/how-to-write-a-resume-that-passes-ats.html`, freq: 'monthly', pri: '0.7' },
  ];
  const toolUrls = toolEntries.map(slug => ({ loc: `${SITE}/tools/${slug}.html`, freq: 'monthly', pri: '0.6' }));
  const all = [...staticUrls, ...toolUrls];
  const body = all.map(u =>
    `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`
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

  const sitemap = buildSitemap(slugs);
  fs.writeFileSync('sitemap.xml', sitemap);
  console.log(`Rewrote sitemap.xml — ${slugs.length + 9} URLs total.`);
}

main();
