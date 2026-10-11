// Daily promotion agent: once a day (Cron Trigger in wrangler.toml) pick the next tool,
// let AI write a short Tamil + English post about it, and publish it with the tool's
// picture and link. Runs inside the free plan: only network waits, no media work.
//
//   Platforms: Telegram channel (TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL) plus Facebook, Instagram, X and Pinterest
//   (src/social.js; connected from the admin page). YouTube Shorts are made by .github/workflows/promo-youtube.yml.
//   Kill switch: promo_settings.enabled = 'off' (POST /cfapi/promo/enabled {on:false}, matrimony admins only).
//   Admin: GET /cfapi/promo/status, POST /cfapi/promo/run {tool?} to post now.
import { CATALOG } from './promo-catalog.js';
import { gemini } from './api.js';
import { json, err, readJson, userFromRequest } from './util.js';
import { SOCIAL, loadSocial, socialStatus, connectUrl, oauthCallback, disconnect } from './social.js';

const TG_API = (env) => (env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/$/, '');
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

export async function promoEnabled(env) {
  const r = await env.DB.prepare("select value from promo_settings where key = 'enabled'").first().catch(() => null);
  return !r || r.value !== 'off';
}

// next tool: never posted first (free tools before paid), then the one posted longest ago
export async function pickTool(env) {
  const { results } = await env.DB.prepare("select tool_id, max(created_at) as last from promo_posts where status = 'sent' group by tool_id").all();
  const last = new Map(results.map((r) => [r.tool_id, r.last]));
  const fresh = CATALOG.filter((t) => !last.has(t.id));
  if (fresh.length) return fresh.find((t) => !t.paid) || fresh[0];
  return CATALOG.slice().sort((a, b) => (last.get(a.id) < last.get(b.id) ? -1 : 1))[0];
}

function fallbackText(t) {
  return {
    ta: `${t.ta || t.name} — ${t.taDesc || t.desc}. இலவசம், login தேவையில்லை, உங்கள் phone-லேயே வேலை செய்யும்.`,
    en: `${t.name}: ${t.desc}. Free, no sign-up, works right in your browser.`,
  };
}

// AI writes the post; any failure falls back to a plain template so the day's post still goes out
export async function writePost(env, t) {
  if (!env.GEMINI_API_KEY) return fallbackText(t);
  const prompt = `You write one short social media post for pdftoolsindia.com, a free Tamil-first website of online tools.
Tool: ${t.name} (Tamil name: ${t.ta || '-'})
What it does: ${t.desc} / ${t.taDesc}
Category: ${t.cat}${t.paid ? ' (uses a few AI credits)' : ' (free)'}
Write for ordinary people in Tamil Nadu: name one real everyday situation where this tool helps, then what it does.
Rules: simple spoken Tamil (not formal), honest (no fake numbers, prizes or urgency), at most 2 emojis, no hashtags, no links.
Return JSON: {"ta": "Tamil post, max 300 characters", "en": "English version, max 200 characters"}`;
  try {
    const out = JSON.parse(await gemini(env, [{ text: prompt }], { generationConfig: { response_mime_type: 'application/json', temperature: 0.8 } }));
    if (out && typeof out.ta === 'string' && typeof out.en === 'string' && out.ta.trim() && out.en.trim()) return { ta: clip(out.ta.trim(), 400), en: clip(out.en.trim(), 260) };
  } catch (e) { console.error('promo ai', e.message); }
  return fallbackText(t);
}

async function telegram(env, t, post) {
  const caption = `<b>${escHtml(t.ta || t.name)}</b> · ${escHtml(t.name)}\n\n${escHtml(post.ta)}\n\n${escHtml(post.en)}\n\n👉 ${escHtml(t.url)}`;
  const base = { chat_id: env.TELEGRAM_CHANNEL, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🔗 இலவசமாகப் பயன்படுத்துங்கள் · Open tool', url: t.url }]] } };
  const call = (method, body) => fetch(`${TG_API(env)}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...base, ...body }) })
    .then((r) => r.json().catch(() => ({ ok: false, description: `HTTP ${r.status}` })));
  let r = t.img ? await call('sendPhoto', { photo: t.img, caption: clip(caption, 1024) }) : null;
  if (!r || !r.ok) r = await call('sendMessage', { text: clip(caption, 4096), link_preview_options: { url: t.url } }); // no picture, or Telegram could not fetch it
  if (!r.ok) throw new Error(r.description || 'Telegram error');
  return String(r.result?.message_id ?? '');
}

const PLATFORMS = [
  { name: 'telegram', ready: (env) => !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHANNEL), send: telegram },
  ...SOCIAL,
];

export async function runPromo(env, opts = {}) {
  if (!opts.force && !(await promoEnabled(env))) return { ok: true, skipped: 'disabled' };
  const social = await loadSocial(env);
  const ready = PLATFORMS.filter((p) => p.ready(env, social));
  if (!ready.length) return { ok: true, skipped: 'no platform configured' };
  const t = opts.tool ? CATALOG.find((x) => x.id === opts.tool) : await pickTool(env);
  if (!t) return { ok: false, error: 'unknown tool' };
  const post = await writePost(env, t);
  const results = [];
  for (const p of ready) {
    let status = 'sent', messageId = null, error = null;
    try { messageId = await p.send(env, t, post, social); if (messageId === null) status = 'skipped'; } catch (e) { status = 'failed'; error = String(e.message || e).slice(0, 300); }
    await env.DB.prepare('insert into promo_posts (tool_id, platform, status, message_id, text, error) values (?, ?, ?, ?, ?, ?)')
      .bind(t.id, p.name, status, messageId, post.ta + '\n' + post.en, error).run();
    results.push({ platform: p.name, status, error });
  }
  return { ok: results.every((r) => r.status !== 'failed'), tool: t.id, results };
}

async function isAdmin(env, req) {
  const me = await userFromRequest(req, env);
  return !!(me && (await env.DB.prepare('select 1 from mat_admins where user_id = ?').bind(me.id).first()));
}

export async function handlePromo(req, env, path, url) {
  // the platform sends the browser back here after "Connect"; it is checked by the signed state, not a login
  if (path.startsWith('/promo/oauth/') && req.method === 'GET') return oauthCallback(env, path.slice('/promo/oauth/'.length), url);
  if (!(await isAdmin(env, req))) return err(403, 'Admins only');
  if (path.startsWith('/promo/connect/') && req.method === 'GET') {
    const link = await connectUrl(env, path.slice('/promo/connect/'.length));
    return link ? json({ url: link }) : err(400, 'This platform is not set up yet (app keys missing)');
  }
  if (path === '/promo/disconnect' && req.method === 'POST') { await disconnect(env, String((await readJson(req)).platform || '')); return json({ ok: true }); }
  if (path === '/promo/status' && req.method === 'GET') {
    const { results } = await env.DB.prepare('select tool_id, platform, status, error, created_at from promo_posts order by id desc limit 20').all();
    const social = await loadSocial(env);
    return json({ enabled: await promoEnabled(env), platforms: PLATFORMS.map((p) => ({ name: p.name, ready: p.ready(env, social) })), social: socialStatus(env, social), tools: CATALOG.length, recent: results });
  }
  if (path === '/promo/run' && req.method === 'POST') {
    const b = await readJson(req);
    return json(await runPromo(env, { force: true, tool: b.tool || null }));
  }
  if (path === '/promo/enabled' && req.method === 'POST') {
    const b = await readJson(req);
    await env.DB.prepare("insert into promo_settings (key, value) values ('enabled', ?) on conflict(key) do update set value = excluded.value").bind(b.on ? 'on' : 'off').run();
    return json({ enabled: !!b.on });
  }
  return err(404, 'Route not found');
}
