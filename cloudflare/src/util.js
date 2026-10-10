// Shared helpers: responses, CORS, crypto (WebCrypto only — no npm deps).

const enc = new TextEncoder();

export const now = () => new Date().toISOString();
export const addSeconds = (s) => new Date(Date.now() + s * 1000).toISOString();

const ALLOWED_ORIGIN = /^https:\/\/((www\.)?pdftoolsindia\.com|[a-z0-9-]+\.pages\.dev)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function corsHeaders(req) {
  const origin = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN.test(origin) ? origin : 'https://pdftoolsindia.com',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Internal-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow', ...extra },
  });
}

export const err = (status, error, code) => json(code ? { error, code } : { error }, status);

export async function readJson(req) {
  try { return await req.json(); } catch { return {}; }
}

export function b64url(bytes) {
  let s = '';
  const a = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(str) {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export const randomToken = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));

export async function sha256(text) {
  return b64url(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

// constant-time string compare
export function safeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

export async function hmac(secret, data) {
  return b64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(data)));
}

// ---------- JWT (HS256) — the same secret is given to Cloud Run (AUTH_JWT_SECRET) so it can verify tokens offline
export async function signJwt(payload, secret) {
  const head = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return `${head}.${body}.${await hmac(secret, `${head}.${body}`)}`;
}

export async function verifyJwt(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  if (!safeEqual(await hmac(secret, `${parts[0]}.${parts[1]}`), parts[2])) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
    if (!p.exp || p.exp * 1000 < Date.now()) return null;
    return p;
  } catch { return null; }
}

// ---------- password hashing: PBKDF2-SHA256 (100k iterations is the Workers maximum)
const PBKDF2_ITER = 100000;

async function pbkdf2(password, salt, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITER}$${b64url(salt)}$${b64url(await pbkdf2(password, salt, PBKDF2_ITER))}`;
}

export async function checkPassword(password, stored) {
  const [kind, iter, salt, hash] = String(stored || '').split('$');
  if (kind !== 'pbkdf2' || !hash) return false;
  return safeEqual(b64url(await pbkdf2(password, b64urlDecode(salt), +iter)), hash);
}

// bearer token -> { id, email } or null
export async function userFromRequest(req, env) {
  const h = req.headers.get('Authorization') || '';
  if (!h.startsWith('Bearer ')) return null;
  const p = await verifyJwt(h.slice(7), env.AUTH_JWT_SECRET);
  return p ? { id: p.sub, email: p.email } : null;
}
