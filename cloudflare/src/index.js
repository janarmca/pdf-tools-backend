// pdf-tools-api — the whole backend on the Cloudflare Workers FREE plan (replaced Supabase + Google Cloud Run).
// Served at https://pdftoolsindia.com/cfapi/* (same site as the frontend, so ISP blocks on third-party domains don't matter).
//   /cfapi/auth/v1/*          login: Google, or a 6-digit e-mail code (no passwords); sessions
//   /cfapi/api/*              credits, promo codes, Razorpay payments + webhook, AI tools, Astrology+, matrimony payments
//   /cfapi/mat/rpc/<name>     matrimony functions (former Postgres functions)
//   /cfapi/mat/photo*         matrimony photos (KV, private, signed URLs)
//   /cfapi/internal/*         maintenance/tests only — disabled unless the INTERNAL_KEY secret is set
//   /cfapi/health
import { corsHeaders, json, err, readJson, userFromRequest, hmac, safeEqual, randomToken } from './util.js';
import { handleAuth, mailProvider } from './auth.js';
import { handleApi } from './api.js';
import { matRpc, matRecordUnlock } from './mat.js';

const PREFIX = '/cfapi';
const MAX_PHOTO = 1.5 * 1024 * 1024;
const PHOTO_URL_TTL = 3600;

async function photoUpload(req, env, url) {
  const folder = url.searchParams.get('folder') === 'submissions' ? 'submissions' : 'me';
  let base;
  if (folder === 'me') {
    const me = await userFromRequest(req, env);
    if (!me) return err(401, 'not_logged_in');
    base = me.id;
  } else base = 'submissions';
  const type = req.headers.get('Content-Type') || '';
  if (!/^image\/(jpeg|png|webp)$/.test(type)) return err(400, 'Only JPEG/PNG/WebP images');
  const buf = await req.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > MAX_PHOTO) return err(413, 'Image too large');
  const path = `${base}/${Date.now()}-${randomToken(4).replace(/[^a-zA-Z0-9]/g, 'x').slice(0, 5)}.jpg`;
  await env.MAT_PHOTOS.put(path, buf, { metadata: { type } });
  return json({ path });
}

async function photoDelete(req, env, url) {
  const me = await userFromRequest(req, env);
  if (!me) return err(401, 'not_logged_in');
  const path = url.searchParams.get('path') || '';
  if (!path.startsWith(me.id + '/') || path.includes('..')) return err(403, 'forbidden');
  await env.MAT_PHOTOS.delete(path);
  return json({ ok: true });
}

async function photoSignedUrl(req, env, url) {
  const me = await userFromRequest(req, env);
  if (!me) return err(401, 'not_logged_in');
  const path = url.searchParams.get('path') || '';
  if (!path || path.includes('..')) return err(400, 'bad path');
  const exp = Math.floor(Date.now() / 1000) + PHOTO_URL_TTL;
  const sig = await hmac(env.AUTH_JWT_SECRET, `photo:${path}:${exp}`);
  return json({ url: `${url.origin}${PREFIX}/mat/photo/${encodeURIComponent(path)}?exp=${exp}&sig=${sig}` });
}

async function photoServe(env, url, encPath) {
  const path = decodeURIComponent(encPath);
  const exp = +url.searchParams.get('exp');
  if (!exp || exp * 1000 < Date.now() || !safeEqual(await hmac(env.AUTH_JWT_SECRET, `photo:${path}:${exp}`), url.searchParams.get('sig'))) return err(403, 'expired');
  const obj = await env.MAT_PHOTOS.getWithMetadata(path, 'arrayBuffer');
  if (!obj.value) return err(404, 'not found');
  return new Response(obj.value, { headers: { 'Content-Type': obj.metadata?.type || 'image/jpeg', 'Cache-Control': 'private, max-age=3000', 'X-Robots-Tag': 'noindex' } });
}

// Cloud Run -> D1: runs a list of statements atomically (one D1 batch = one transaction)
async function internalSql(req, env) {
  const b = await readJson(req);
  const list = Array.isArray(b.statements) ? b.statements : [];
  if (!list.length || list.length > 50) return err(400, 'statements: 1..50');
  const res = await env.DB.batch(list.map((s) => env.DB.prepare(String(s.sql)).bind(...(Array.isArray(s.params) ? s.params : []))));
  return json({ results: res.map((r) => r.results || []), meta: res.map((r) => ({ changes: r.meta?.changes ?? 0, last_row_id: r.meta?.last_row_id ?? null })) });
}

async function route(req, env) {
  const url = new URL(req.url);
  let path = url.pathname;
  if (path.startsWith(PREFIX)) path = path.slice(PREFIX.length) || '/';
  const m = req.method;

  if (path === '/health') {
    const r = await env.DB.prepare('select count(*) as n from pricing_plans').first().catch(() => null);
    return json({
      ok: !!r, db: !!r, google: !!env.GOOGLE_CLIENT_ID, email: mailProvider(env), ai: { gemini: !!env.GEMINI_API_KEY, nvidia: !!env.NVIDIA_API_KEY, image: !!env.AI },
      razorpay: !!env.RAZORPAY_KEY_ID, astrology: !!env.ASTROLOGER_API_KEY, time: new Date().toISOString(),
    });
  }
  if (path.startsWith('/auth/v1/')) return handleAuth(req, env, path.slice('/auth/v1'.length), url);
  if (path.startsWith('/api/')) return handleApi(req, env, path);

  if (path.startsWith('/mat/rpc/') && m === 'POST') {
    const me = await userFromRequest(req, env);
    return json(await matRpc(env, me && me.id, path.slice('/mat/rpc/'.length), await readJson(req)));
  }
  if (path === '/mat/photo' && m === 'POST') return photoUpload(req, env, url);
  if (path === '/mat/photo' && m === 'DELETE') return photoDelete(req, env, url);
  if (path === '/mat/photo-url' && m === 'GET') return photoSignedUrl(req, env, url);
  if (path.startsWith('/mat/photo/') && m === 'GET') return photoServe(env, url, path.slice('/mat/photo/'.length));

  if (path.startsWith('/internal/')) {
    if (!env.INTERNAL_KEY || !safeEqual(req.headers.get('X-Internal-Key'), env.INTERNAL_KEY)) return err(403, 'forbidden');
    if (path === '/internal/sql' && m === 'POST') return internalSql(req, env);
    if (path === '/internal/mat-record-unlock' && m === 'POST') return json(await matRecordUnlock(env, await readJson(req)));
  }
  return err(404, 'Route not found');
}

export default {
  async fetch(req, env) {
    // secrets pasted with a stray space / new line ("Key not found") — use them trimmed
    for (const k of Object.keys(env)) if (typeof env[k] === 'string' && env[k] !== env[k].trim()) env = { ...env, [k]: env[k].trim() };
    const cors = corsHeaders(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      if (!env.AUTH_JWT_SECRET) res = err(503, 'Server is not configured yet (AUTH_JWT_SECRET missing)');
      else res = await route(req, env);
    } catch (e) {
      console.error(e);
      res = err(500, e.message || 'Server error');
    }
    // redirects keep their own headers; everything else gets CORS
    if (res.status >= 300 && res.status < 400) return res;
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  },
};
