// Daily YouTube Short for the promotion agent (run by .github/workflows/promo-youtube.yml).
// 1. reads today's promotion post (tool + AI text) and the YouTube connection from D1 (Cloudflare REST API)
// 2. renders a 1080x1920 Tamil + English slide with headless Chrome, 3. makes a 10 s video with ffmpeg,
// 4. uploads it with the YouTube Data API (refresh token saved by "Connect YouTube" on the admin page), 5. logs it in D1.
// Env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET; optional TOOL (force a tool id), DRY_RUN=1.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CATALOG } from '../../cloudflare/src/promo-catalog.js';
import { buildPlan, makeAnimVideo } from './promo-anim.mjs';
import { buildCaptions } from './promo-tags.mjs';
import { fetchTrends, chooseTool } from './promo-brain.mjs';
import { loadNews, validateNews, pendingNews, newsTool, buildNewsPlan, buildNewsCaptions } from './promo-news.mjs';
import { metaConfigured, postFacebookReel, postInstagramReel } from './promo-meta.mjs';

// Fonts come from npm (@fontsource, installed by the workflow) and are loaded from disk, so a slow or blocked
// Google Fonts request can no longer make the Tamil text fall back to an ugly font.
const ff = (fam, file, w, extra = '') => `@font-face{font-family:'${fam}';font-weight:${w};font-style:normal;src:url('${file}') format('woff2');${extra}}`;
const FONT_FACE = [
  ff('Noto Sans Tamil', 'fonts/noto-sans-tamil-500.woff2', 500), ff('Noto Sans Tamil', 'fonts/noto-sans-tamil-800.woff2', 800), // shipped in the repo (fonts/), no network needed
  ff('Inter', 'node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2', 600), ff('Inter', 'node_modules/@fontsource/inter/files/inter-latin-900-normal.woff2', 900), // npm, installed by the workflow
].join('\n');

const { CLOUDFLARE_API_TOKEN: CF_TOKEN, CLOUDFLARE_ACCOUNT_ID: ACC, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
const CF = `https://api.cloudflare.com/client/v4/accounts/${ACC}/d1/database`;
const H = { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let DB;
async function sql(q, params = []) {
  if (!DB) {
    const r = await (await fetch(`${CF}?name=pdftools-db`, { headers: H })).json();
    DB = r.result?.find((d) => d.name === 'pdftools-db')?.uuid;
    if (!DB) throw new Error('D1 database pdftools-db not found: ' + JSON.stringify(r.errors || r).slice(0, 300));
  }
  const r = await (await fetch(`${CF}/${DB}/query`, { method: 'POST', headers: H, body: JSON.stringify({ sql: q, params }) })).json();
  if (!r.success) throw new Error('D1: ' + JSON.stringify(r.errors).slice(0, 300));
  return r.result[0].results;
}
const setting = async (k) => (await sql('select value from promo_settings where key = ?', [k]))[0]?.value || null;
const log = (toolId, status, id, error, platform = 'youtube') => sql('insert into promo_posts (tool_id, platform, status, message_id, error) values (?, ?, ?, ?, ?)', [toolId, platform, status, id, error]);

export function slideHtml(t, text) {
  const [ta, en] = String(text || '').split('\n');
  return `<!doctype html><meta charset="utf-8"><style>${FONT_FACE}</style>
<style>*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden}
body{font-family:'Noto Sans Tamil','Inter','Noto Color Emoji',sans-serif;color:#fff;background:linear-gradient(160deg,${t.color} 0%,#14182b 100%);display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center;padding:110px 80px 120px}
.mid{display:flex;flex-direction:column;align-items:center}
.icon{font:300px/1 'Noto Color Emoji',sans-serif;margin-top:10px}
.pts{display:flex;gap:18px;justify-content:center;flex-wrap:wrap;margin-top:40px}.pts span{background:rgba(255,255,255,.16);border-radius:999px;padding:14px 28px;font-size:36px;font-weight:800}
.brand{font:900 44px Inter,sans-serif;letter-spacing:1px;opacity:.95}.brand b{color:#FFD54A}
.img{width:620px;height:620px;border-radius:48px;background:#fff center/cover no-repeat;box-shadow:0 30px 80px rgba(0,0,0,.45)}
h1{font-size:${(t.ta || '').length > 18 ? 68 : 84}px;font-weight:800;margin:60px 0 6px;line-height:1.25}
h2{font:900 52px Inter,sans-serif;margin:0;opacity:.92}
p{font-size:40px;font-weight:500;line-height:1.5;margin:46px 0 0;opacity:.95;max-height:420px;overflow:hidden}
.foot{background:#FFD54A;color:#14182b;font:900 40px Inter,sans-serif;padding:26px 36px;border-radius:999px;white-space:nowrap}
.foot span{font-family:'Noto Sans Tamil';font-weight:800}</style>
<div class="brand">PDF Tools <b>India</b></div>
<div class="mid">${t.img ? `<div class="img" style="background-image:url('${esc(t.img)}')"></div>` : `<div class="icon">${esc(t.icon || '🛠')}</div>`}
<h1>${esc(t.ta || t.name)}</h1><h2>${esc(t.name)}</h2>
<p>${esc(ta || t.taDesc || t.desc)}</p>
<div class="pts"><span>✓ இலவசம்</span><span>✓ Login இல்லை</span><span>✓ Phone-லேயே</span></div></div>
<div class="foot"><span>இலவசம்</span> · FREE · pdftoolsindia.com</div>`;
}

// ---- free Tamil voice (no API key, no cost) ----
// 1st choice: edge-tts (Microsoft neural Tamil voices), 2nd: gTTS (Google Translate voice). Both are installed by the workflow with pip.
// If neither works (blocked / rate limited) the Short is still made, silent, and the log says why.
// English abbreviations spelt out in Tamil letters so the Tamil voice reads them as people say them
const SAY = { PDF: 'பி டி எஃப்', GST: 'ஜி எஸ் டி', TDS: 'டி டி எஸ்', PAN: 'பான்', TAN: 'டான்', DSC: 'டி எஸ் சி', OCR: 'ஓ சி ஆர்', QR: 'கியூ ஆர்', AI: 'ஏ ஐ', JPG: 'ஜே பி ஜி', PNG: 'பி என் ஜி', ZIP: 'ஜிப்', EMI: 'இ எம் ஐ', HRA: 'எச் ஆர் ஏ', PF: 'பி எஃப்', ESI: 'இ எஸ் ஐ', CSV: 'சி எஸ் வி', PPT: 'பி பி டி', MP3: 'எம் பி த்ரீ', MP4: 'எம் பி போர்', Excel: 'எக்செல்', Word: 'வேர்டு', Tamil: 'தமிழ்', Aadhaar: 'ஆதார்' };
const say = (x) => x.replace(/₹\s*([\d,]+)/g, '$1 ரூபாய்').replace(/e-?sign/gi, 'இ சைன்').replace(/[A-Za-z0-9]+/g, (w) => SAY[w] || SAY[w.toUpperCase()] || w);
const clean = (x) => String(x || '').replace(/[\p{Extended_Pictographic}‍️]/gu, ' ').replace(/https?:\/\/\S+/g, ' ').replace(/[#*_|/]+/g, ' ').replace(/\s+/g, ' ').trim();
// Spoken text of the animated story (its sentences come from promo-anim.mjs).
export const animSpeech = (lines) => lines.map((x) => say(clean(x))).filter(Boolean).map((x) => (/[.!?]$/.test(x) ? x : x + '.')).join(' ');
export function speechText(t) {
  const parts = [say(clean(t.ta || t.name)), say(clean(t.taDesc || t.desc)), 'இலவசம். லாகின் தேவையில்லை.', 'பி டி எஃப் டூல்ஸ் இந்தியா டாட் காம் தளத்தில் பயன்படுத்துங்கள்.'];
  return parts.filter(Boolean).map((x) => (/[.!?]$/.test(x) ? x : x + '.')).join(' ');
}
// Gemini TTS (free tier "Free of charge" on the Gemini API pricing page; Tamil ta-IN is supported): by far the most natural voice.
// Needs the GitHub secret GEMINI_API_KEY. Returns raw 16-bit PCM which ffmpeg turns into mp3.
async function geminiVoice(text, out) {
  const key = process.env.GEMINI_API_KEY; if (!key) throw new Error('GEMINI_API_KEY not set');
  const base = (process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
  const models = (process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview,gemini-2.5-flash-preview-tts').split(',');
  const voiceName = process.env.GEMINI_VOICE || 'Kore';
  const prompt = `Say this in natural, warm, friendly spoken Tamil, at a relaxed conversational pace, like a helpful teacher on a short video:\n\n${text}`;
  let lastErr;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(`${base}/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(90000),
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } } }) });
        if (!r.ok) { lastErr = new Error(`${model}: HTTP ${r.status} ${(await r.text()).slice(0, 160)}`); if (r.status === 429 || r.status >= 500) { await new Promise((z) => setTimeout(z, 5000)); continue; } break; }
        const j = await r.json(); const part = j.candidates?.[0]?.content?.parts?.find((x) => x.inlineData?.data);
        if (!part) { lastErr = new Error(`${model}: no audio in the answer`); break; }
        const rate = /rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1] || '24000';
        fs.writeFileSync('voice.pcm', Buffer.from(part.inlineData.data, 'base64'));
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', rate, '-ac', '1', '-i', 'voice.pcm', '-ar', '44100', '-ac', '1', out]);
        console.log('Gemini model', model, 'voice', voiceName); return;
      } catch (e) { lastErr = e; }
    }
  }
  throw lastErr || new Error('Gemini TTS failed');
}
// Order: Gemini TTS (natural) -> edge-tts (Microsoft neural, no key) -> gTTS. Override with TTS_ENGINES=gemini,edge,gtts.
// If nothing works the Short is still made, silent, and the log says why.
export async function makeVoice(text, out = 'voice.mp3') {
  fs.rmSync(out, { force: true });
  const engines = (process.env.TTS_ENGINES || 'gemini,edge,gtts').split(',').map((x) => x.trim());
  const run = { gemini: () => geminiVoice(text, out),
    edge: () => execFileSync('edge-tts', ['--voice', process.env.TTS_VOICE || 'ta-IN-PallaviNeural', '--rate=-5%', '--text', text, '--write-media', out], { stdio: 'inherit', timeout: 90000 }),
    gtts: () => execFileSync('gtts-cli', [text, '-l', 'ta', '-o', out], { stdio: 'inherit', timeout: 90000 }) };
  for (const e of engines) {
    if (!run[e] || (e === 'gemini' && !process.env.GEMINI_API_KEY)) continue;
    try { await run[e](); if (fs.existsSync(out) && fs.statSync(out).size > 2000) { console.log('Voice made with', e); return out; } }
    catch (err) { console.log(e, 'failed:', String(err.message).slice(0, 200)); }
  }
  console.log('No voice could be made — the Short will be silent.');
  return null;
}
const audioSeconds = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim()) || 0;
export function makeVideo(voice, out = 'short.mp4') {
  const dur = voice ? Math.min(30, Math.max(10, Math.ceil((audioSeconds(voice) + 1.5) * 10) / 10)) : 10;
  const frames = Math.round(dur * 30);
  const audioIn = voice ? ['-i', voice] : ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo'];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-framerate', '30', '-i', 'slide.png', ...audioIn, '-t', String(dur),
    '-vf', `crop=1080:1920:0:0,scale=1188:2112,zoompan=z='min(zoom+${(0.08 / frames).toFixed(6)},1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`,
    '-af', 'apad', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '44100', '-ac', '2', out], { stdio: 'inherit' });
  return dur;
}

async function accessToken(refresh) {
  const r = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, refresh_token: refresh, grant_type: 'refresh_token' }) })).json();
  if (!r.access_token) throw new Error('Google token: ' + (r.error_description || r.error || 'failed') + ' — press "Connect YouTube" again on the admin page');
  return r.access_token;
}

async function upload(token, file, t, text, capOverride) {
  const cap = capOverride || buildCaptions(t);
  const meta = {
    snippet: { title: (capOverride ? `🆕 ${t.name} — PDF Tools India #Shorts` : `${t.ta ? t.ta + ' | ' : ''}${t.name} — ${t.paid ? 'Online Tool' : 'Free Online Tool'} #Shorts`).slice(0, 100), categoryId: '27', defaultLanguage: 'ta',
      description: cap.youtube, tags: cap.youtubeTags },
    status: { privacyStatus: process.env.PRIVACY === 'private' ? 'private' : 'public', selfDeclaredMadeForKids: false },
  };
  const size = fs.statSync(file).size;
  const start = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(size) }, body: JSON.stringify(meta) });
  if (!start.ok) throw new Error('YouTube: ' + (await start.text()).slice(0, 300));
  const put = await fetch(start.headers.get('location'), { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size) }, body: fs.readFileSync(file) });
  const j = await put.json().catch(() => ({}));
  if (!put.ok || !j.id) throw new Error('YouTube upload: ' + JSON.stringify(j.error || j).slice(0, 300));
  return j;
}

const main = async () => {
  if ((await setting('enabled')) === 'off') return console.log('Promotion is switched off on the admin page.');
  const refresh = await setting('yt_refresh');
  // Facebook/Instagram credentials: GitHub secrets if set, otherwise the ones saved by "Connect Facebook" on the admin page (D1) — so no manual token work is needed.
  const metaEnv = { META_TOKEN: process.env.META_TOKEN || await setting('fb_page_token'), FB_PAGE_ID: process.env.FB_PAGE_ID || await setting('fb_page_id'), IG_USER_ID: process.env.IG_USER_ID || await setting('ig_user_id') };
  const meta = metaConfigured(metaEnv);
  if (!refresh && !meta.facebook && !meta.instagram && !process.env.DRY_RUN) return console.log('Nothing is connected yet (YouTube on the admin page; Facebook/Instagram via the META_* secrets).');
  if (!process.env.TOOL && (await sql("select 1 from promo_posts where platform in ('youtube','instagram','facebook') and status = 'sent' and created_at >= date('now')")).length) return console.log('Already posted today.');
  // The brain picks today's tool from Google Trends (India) + the Indian calendar + evergreen demand, avoiding tools posted recently.
  let t, why = null, news = null;
  // A pending "what's new" announcement goes first (logo + news + 3 steps + our info); otherwise the tool-of-the-day brain chooses.
  if (!process.env.TOOL) {
    const items = loadNews(); const bad = validateNews(items); if (bad.length) throw new Error('promo-news.json: ' + bad.join('; '));
    const sentIds = (await sql("select distinct tool_id from promo_posts where tool_id like 'news:%' and status = 'sent'").catch(() => [])).map((r) => r.tool_id);
    const recent = (await sql("select 1 from promo_posts where tool_id like 'news:%' and status = 'sent' and created_at >= datetime('now', '-1 day')").catch(() => [])).length > 0;
    news = pendingNews(items, { sentIds, newsSentLast24h: recent, force: process.env.NEWS || '' });
    if (process.env.NEWS && !news) throw new Error('No news entry with id ' + process.env.NEWS);
  }
  if (news) { t = newsTool(news); console.log('News Short:', news.id); }
  else if (process.env.TOOL) t = CATALOG.find((x) => x.id === process.env.TOOL);
  else {
    const history = await sql("select tool_id, created_at from promo_posts where platform in ('youtube','instagram','facebook') and status = 'sent' order by id desc limit 60").catch(() => []);
    const trends = await fetchTrends();
    why = chooseTool({ catalog: CATALOG, trends, history });
    console.log(`Trends fetched: ${trends.length}. Brain chose ${why.id} (${why.reason}). Top 5:`, why.top.map((x) => `${x.id}=${x.score.toFixed(2)}`).join(' '));
    t = CATALOG.find((x) => x.id === why.id);
  }
  t = t || CATALOG.find((x) => !x.paid);
  const post = null;
  const newsCap = news ? buildNewsCaptions(news) : null;
  console.log('Tool:', t.id);
  // Animated funny story (a different one each day, made by code only). If anything in it fails the old still slide is used, so a Short is always made.
  let plan = news ? buildNewsPlan(news) : process.env.ANIM === '0' ? null : buildPlan(t, undefined, { story: process.env.STORY });
  let voice = await makeVoice(plan ? animSpeech(plan.lines) : speechText(t));
  let secs, kind = 'still slide';
  if (plan) {
    try { secs = await makeAnimVideo(plan, voice, FONT_FACE); kind = 'animated ' + (news ? 'news Short' : 'story "' + plan.cfg.story + '"'); }
    catch (e) { console.log('Animation failed, using the still slide instead:', String(e.message).slice(0, 300)); plan = null; voice = await makeVoice(speechText(t)); }
  }
  if (!plan) {
    fs.writeFileSync('slide.html', slideHtml(t, post?.text));
    const chrome = process.env.CHROME || 'google-chrome';
    execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1080,2100', '--virtual-time-budget=8000', `--screenshot=${process.cwd()}/slide.png`, `file://${process.cwd()}/slide.html`], { stdio: 'inherit' });
    secs = makeVideo(voice);
  }
  const cap = newsCap || buildCaptions(t);
  const hot = why?.trend ? `🔥 இப்போ trending: ${why.trend}\n\n` : '';
  fs.writeFileSync('social-captions.txt', `=== INSTAGRAM (Reel caption) ===\n${hot}${cap.instagram}\n\n=== FACEBOOK (Reel/post caption) ===\n${hot}${cap.facebook}\n\n=== YOUTUBE (description) ===\n${cap.youtube}\n\nBrain: ${why ? why.reason : 'forced tool'}\n`);
  console.log('Video', secs + 's', kind, voice ? 'with Tamil voice' : 'silent');
  if (process.env.DRY_RUN) return console.log('DRY_RUN: made short.mp4, not uploaded');
  let failed = null;
  if (refresh) {
    try {
      const v = await upload(await accessToken(refresh), 'short.mp4', t, post?.text, newsCap);
      await log(t.id, 'sent', v.id, v.status?.privacyStatus === 'private' ? 'uploaded as private (YouTube API audit needed for public)' : (voice ? null : 'uploaded WITHOUT voice (Tamil voice service unreachable)'));
      console.log('Uploaded https://youtube.com/shorts/' + v.id, v.status?.privacyStatus);
    } catch (e) { await log(t.id, 'failed', null, String(e.message).slice(0, 300)).catch(() => {}); failed = e; console.log('YouTube failed:', e.message); }
  }
  // Facebook Page Reel + Instagram Reel (independent of each other and of YouTube; each is skipped until its secrets exist).
  for (const [platform, fn, text] of [['facebook', postFacebookReel, hot + cap.facebook], ['instagram', postInstagramReel, hot + cap.instagram]]) {
    try {
      const r = await fn('short.mp4', text, metaEnv);
      if (r.skipped) { console.log(platform, 'not set up yet — skipped'); continue; }
      await log(t.id, 'sent', r.id, null, platform); console.log(platform, 'posted', r.id);
    } catch (e) { await log(t.id, 'failed', null, String(e.message).slice(0, 300), platform).catch(() => {}); failed = failed || e; console.log(platform, 'failed:', e.message); }
  }
  if (failed) throw failed;
};
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message || e); process.exit(1); });
