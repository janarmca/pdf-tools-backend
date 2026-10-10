// Login without passwords: Google sign-in, or a 6-digit code sent by e-mail (free: Brevo or Resend).
// No password hashing means no heavy CPU work — fits the Workers free plan (10 ms CPU per request).
// Sessions = short-lived JWT access token (1 h) + rotating refresh token (60 days, stored hashed).
import {
  json, err, readJson, now, addSeconds, randomToken, sha256, hmac, safeEqual, b64url, b64urlDecode,
  signJwt, userFromRequest, rateLimit, clientIp,
} from './util.js';

const ACCESS_TTL = 3600;
const REFRESH_TTL = 60 * 24 * 3600;
const OTP_TTL = 10 * 60;
const OTP_MAX_TRIES = 5;
const SITE = 'https://pdftoolsindia.com/';
const REDIRECT_OK = /^(https:\/\/((www\.)?pdftoolsindia\.com|[a-z0-9-]+\.pages\.dev)|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)(\/|$)/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const safeRedirect = (u) => (u && REDIRECT_OK.test(u) ? u : SITE);
const apiBase = (env) => (env.PUBLIC_API_URL || 'https://pdftoolsindia.com/cfapi').replace(/\/$/, '');
export const mailProvider = (env) => (env.BREVO_API_KEY ? 'brevo' : env.RESEND_API_KEY ? 'resend' : null);

async function findOrCreateUser(env, email, googleSub) {
  let u = googleSub ? await env.DB.prepare('select id, email from users where google_sub = ?').bind(googleSub).first() : null;
  if (u) return { user: u, created: false };
  u = await env.DB.prepare('select id, email, google_sub from users where email = ?').bind(email).first();
  if (u) {
    if (googleSub && !u.google_sub) await env.DB.prepare('update users set google_sub = ? where id = ?').bind(googleSub, u.id).run();
    return { user: { id: u.id, email: u.email }, created: false };
  }
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare('insert into users (id, email, google_sub) values (?, ?, ?)').bind(id, email, googleSub || null),
    env.DB.prepare('insert or ignore into profiles (id, email, credits) values (?, ?, 5)').bind(id, email), // 5 free credits
  ]);
  return { user: { id, email }, created: true };
}

async function createSession(env, user) {
  const refresh = randomToken(32);
  const iat = Math.floor(Date.now() / 1000);
  const access = await signJwt({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', iat, exp: iat + ACCESS_TTL }, env.AUTH_JWT_SECRET);
  const stmts = [
    env.DB.prepare('insert into sessions (token_hash, user_id, expires_at) values (?, ?, ?)').bind(await sha256(refresh), user.id, addSeconds(REFRESH_TTL)),
    env.DB.prepare('delete from sessions where user_id = ? and expires_at < ?').bind(user.id, now()),
  ];
  // matrimony admins listed in MAT_ADMIN_EMAILS (comma separated) become admins on sign-in
  const admins = String(env.MAT_ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  if (admins.includes(String(user.email).toLowerCase())) stmts.push(env.DB.prepare('insert or ignore into mat_admins (user_id) values (?)').bind(user.id));
  await env.DB.batch(stmts);
  return { access_token: access, token_type: 'bearer', expires_in: ACCESS_TTL, expires_at: iat + ACCESS_TTL, refresh_token: refresh, user: { id: user.id, email: user.email } };
}

function sessionHash(s, type) {
  const q = new URLSearchParams({ access_token: s.access_token, refresh_token: s.refresh_token, expires_in: String(s.expires_in), expires_at: String(s.expires_at), token_type: 'bearer', type });
  return '#' + q.toString();
}

// ---------- e-mail (Brevo: 300/day free, no domain needed — just verify the sender address; Resend: 100/day free)
function parseFrom(env) {
  const raw = env.EMAIL_FROM || 'PDF Tools India <no-reply@pdftoolsindia.com>';
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(raw);
  return m ? { name: m[1] || 'PDF Tools India', email: m[2] } : { name: 'PDF Tools India', email: raw.trim() };
}

export async function sendMail(env, to, subject, html) {
  const from = parseFrom(env);
  let r;
  if (env.BREVO_API_KEY) {
    r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sender: from, to: [{ email: to }], subject, htmlContent: html }),
    });
  } else if (env.RESEND_API_KEY) {
    r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${from.name} <${from.email}>`, to: [to], subject, html }),
    });
  } else throw new Error('no e-mail service');
  if (!r.ok) {
    console.error('mail failed', r.status, await r.text().catch(() => ''));
    throw new Error('The e-mail could not be sent right now. Please try again, or sign in with Google.');
  }
}

const codeHash = (env, email, code) => hmac(env.AUTH_JWT_SECRET, `otp:${email.toLowerCase()}:${code}`);

function newCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6, '0');
}

// ---------------------------------------------------------------- handlers
async function sendCode(req, env) {
  const b = await readJson(req);
  const email = String(b.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 120) return err(400, 'Please enter a valid e-mail address');
  // local tests only: return the code instead of e-mailing it (ignored unless the request is to localhost)
  const devEcho = env.OTP_DEV_ECHO === '1' && /^(localhost|127\.0\.0\.1)$/.test(new URL(req.url).hostname);
  if (!mailProvider(env) && !devEcho) return err(503, 'E-mail login is not set up yet. Please sign in with Google.');
  if (!(await rateLimit(env, 'otp1:' + email, 1, 50))) return err(429, 'Please wait a minute before asking for another code.');
  if (!(await rateLimit(env, 'otp:' + email, 6, 3600)) || !(await rateLimit(env, 'otpip:' + clientIp(req), 200, 3600))) {
    return err(429, 'Too many codes requested — please try again in an hour.');
  }
  const code = newCode();
  await env.DB.prepare('insert into otp_codes (email, code_hash, expires_at, attempts) values (?, ?, ?, 0) on conflict (email) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0')
    .bind(email, await codeHash(env, email, code), addSeconds(OTP_TTL)).run();
  if (devEcho && !mailProvider(env)) return json({ ok: true, dev_code: code });
  await sendMail(env, email, `${code} — உங்கள் login code / your login code`,
    `<div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#222"><p>வணக்கம்,</p>` +
    `<p>PDF Tools India-வில் உள்நுழைய இந்த code-ஐ உள்ளிடுங்கள் (10 நிமிடம் மட்டும்):<br>Enter this code to sign in (valid for 10 minutes):</p>` +
    `<p style="font-size:30px;font-weight:800;letter-spacing:8px;margin:18px 0">${code}</p>` +
    `<p style="color:#777;font-size:12px">இந்த code-ஐ யாரிடமும் பகிர வேண்டாம். நீங்கள் கேட்கவில்லை என்றால் இந்த mail-ஐ விட்டுவிடுங்கள்.<br>Never share this code. If you did not ask for it, ignore this e-mail.</p></div>`);
  return json({ ok: true });
}

async function verifyCode(req, env) {
  const b = await readJson(req);
  const email = String(b.email || '').trim().toLowerCase();
  const code = String(b.token || b.code || '').replace(/\D/g, '');
  const row = await env.DB.prepare('select code_hash, expires_at, attempts from otp_codes where email = ?').bind(email).first();
  if (!row || row.expires_at < now()) return err(400, 'The code has expired — please ask for a new one.', 'otp_expired');
  if (row.attempts >= OTP_MAX_TRIES) {
    await env.DB.prepare('delete from otp_codes where email = ?').bind(email).run();
    return err(429, 'Too many wrong tries — please ask for a new code.', 'otp_locked');
  }
  if (code.length !== 6 || !safeEqual(await codeHash(env, email, code), row.code_hash)) {
    await env.DB.prepare('update otp_codes set attempts = attempts + 1 where email = ?').bind(email).run();
    return err(400, 'Wrong code — please check and try again.', 'otp_wrong');
  }
  await env.DB.prepare('delete from otp_codes where email = ?').bind(email).run();
  const { user, created } = await findOrCreateUser(env, email, null);
  return json({ ...(await createSession(env, user)), new_user: created });
}

async function refreshGrant(req, env) {
  const b = await readJson(req);
  const h = await sha256(String(b.refresh_token || ''));
  const row = await env.DB.prepare('select s.user_id, s.expires_at, u.email from sessions s join users u on u.id = s.user_id where s.token_hash = ?').bind(h).first();
  if (!row || row.expires_at < now()) return err(401, 'Invalid Refresh Token');
  await env.DB.prepare('delete from sessions where token_hash = ?').bind(h).run();
  return json(await createSession(env, { id: row.user_id, email: row.email }));
}

async function logout(req, env) {
  const b = await readJson(req);
  if (b.refresh_token) await env.DB.prepare('delete from sessions where token_hash = ?').bind(await sha256(String(b.refresh_token))).run();
  return json({ ok: true });
}

async function getUser(req, env) {
  const me = await userFromRequest(req, env);
  if (!me) return err(401, 'Invalid JWT');
  return json({ id: me.id, email: me.email });
}

// ---------- Google sign-in (OAuth 2.0 authorization-code flow, free)
async function signState(env, data) {
  const body = b64url(new TextEncoder().encode(JSON.stringify(data)));
  return `${body}.${await hmac(env.AUTH_JWT_SECRET, 'oauth:' + body)}`;
}

async function readState(env, state) {
  const [body, sig] = String(state || '').split('.');
  if (!body || !safeEqual(await hmac(env.AUTH_JWT_SECRET, 'oauth:' + body), sig)) return null;
  try {
    const d = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    return d.exp > Date.now() ? d : null;
  } catch { return null; }
}

async function authorize(url, env) {
  if (url.searchParams.get('provider') !== 'google') return err(400, 'Unsupported provider');
  if (!env.GOOGLE_CLIENT_ID) return err(503, 'Google sign-in is not set up yet');
  const state = await signState(env, { r: safeRedirect(url.searchParams.get('redirect_to')), exp: Date.now() + 10 * 60 * 1000 });
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID, redirect_uri: `${apiBase(env)}/auth/v1/callback`, response_type: 'code',
    scope: 'openid email profile', state, prompt: 'select_account',
  });
  return Response.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + q, 302);
}

async function callback(url, env) {
  const st = await readState(env, url.searchParams.get('state'));
  const back = (st?.r || SITE).split('#')[0];
  const fail = (m) => Response.redirect(back + '#error=access_denied&error_description=' + encodeURIComponent(m), 302);
  if (!st) return fail('Sign-in expired, please try again');
  const code = url.searchParams.get('code');
  if (!code) return fail(url.searchParams.get('error') || 'Sign-in cancelled');
  const tr = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: `${apiBase(env)}/auth/v1/callback`, grant_type: 'authorization_code' }),
  });
  const tok = await tr.json().catch(() => ({}));
  if (!tr.ok || !tok.id_token) return fail('Google sign-in failed');
  // the id_token came straight from Google's token endpoint over TLS, so its claims can be trusted without re-checking the signature
  let claims;
  try { claims = JSON.parse(new TextDecoder().decode(b64urlDecode(tok.id_token.split('.')[1]))); } catch { return fail('Google sign-in failed'); }
  if (claims.aud !== env.GOOGLE_CLIENT_ID || !claims.sub || !claims.email || !claims.email_verified) return fail('Google account e-mail is not verified');
  const { user, created } = await findOrCreateUser(env, String(claims.email).toLowerCase(), claims.sub);
  return Response.redirect(back + sessionHash(await createSession(env, user), created ? 'signup' : 'magiclink'), 302);
}

export async function handleAuth(req, env, path, url) {
  const m = req.method;
  if (path === '/otp' && m === 'POST') return sendCode(req, env);
  if (path === '/verify' && m === 'POST') return verifyCode(req, env);
  if (path === '/token' && m === 'POST') {
    if (url.searchParams.get('grant_type') === 'refresh_token') return refreshGrant(req, env);
    return err(400, 'Unsupported grant_type');
  }
  if (path === '/logout' && m === 'POST') return logout(req, env);
  if (path === '/user' && m === 'GET') return getUser(req, env);
  if (path === '/authorize' && m === 'GET') return authorize(url, env);
  if (path === '/callback' && m === 'GET') return callback(url, env);
  return err(404, 'Not found');
}
