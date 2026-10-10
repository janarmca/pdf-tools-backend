// Login: e-mail + password, Google sign-in, e-mail confirmation, forgot password.
// Sessions = short-lived JWT access token (1 h) + rotating refresh token (60 days, stored hashed).
import {
  json, err, readJson, now, addSeconds, randomToken, sha256, hmac, safeEqual, b64url, b64urlDecode,
  signJwt, hashPassword, checkPassword, userFromRequest,
} from './util.js';

const ACCESS_TTL = 3600;
const REFRESH_TTL = 60 * 24 * 3600;
const SITE = 'https://pdftoolsindia.com/';
const REDIRECT_OK = /^(https:\/\/((www\.)?pdftoolsindia\.com|[a-z0-9-]+\.pages\.dev)|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)(\/|$)/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const safeRedirect = (u) => (u && REDIRECT_OK.test(u) ? u : SITE);
const apiBase = (env) => (env.PUBLIC_API_URL || 'https://pdftoolsindia.com/cfapi').replace(/\/$/, '');
const mailEnabled = (env) => !!env.RESEND_API_KEY;

async function createUser(env, email, passwordHash, googleSub, confirmed) {
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare('insert into users (id, email, password_hash, google_sub, email_confirmed_at) values (?, ?, ?, ?, ?)')
      .bind(id, email, passwordHash, googleSub, confirmed ? now() : null),
    env.DB.prepare('insert or ignore into profiles (id, email, credits) values (?, ?, 5)').bind(id, email),
  ]);
  return { id, email };
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

async function sendMail(env, to, subject, html) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM || 'PDF Tools India <no-reply@pdftoolsindia.com>', to: [to], subject, html }),
  });
  if (!r.ok) throw new Error('E-mail could not be sent (' + r.status + ')');
}

async function mailLink(env, user, kind, redirectTo) {
  const token = randomToken(32);
  await env.DB.batch([
    env.DB.prepare('delete from auth_tokens where user_id = ? and kind = ?').bind(user.id, kind),
    env.DB.prepare('insert into auth_tokens (token_hash, user_id, kind, expires_at) values (?, ?, ?, ?)').bind(await sha256(token), user.id, kind, addSeconds(kind === 'confirm' ? 3 * 24 * 3600 : 3600)),
  ]);
  const link = `${apiBase(env)}/auth/v1/verify?` + new URLSearchParams({ token, type: kind, redirect_to: safeRedirect(redirectTo) });
  const isConfirm = kind === 'confirm';
  const subject = isConfirm ? 'உங்கள் e-mail-ஐ உறுதிப்படுத்துங்கள் / Confirm your e-mail' : 'புதிய password அமைக்க / Reset your password';
  const button = isConfirm ? 'E-mail-ஐ உறுதிப்படுத்து / Confirm e-mail' : 'புதிய password அமை / Set new password';
  await sendMail(env, user.email, subject,
    `<div style="font-family:sans-serif;font-size:15px;line-height:1.6"><p>வணக்கம்,</p><p>${isConfirm ? 'கணக்கைச் செயல்படுத்த கீழே உள்ள பொத்தானை அழுத்துங்கள்.' : 'புதிய password அமைக்க கீழே உள்ள பொத்தானை அழுத்துங்கள் (1 மணி நேரம் மட்டும் செல்லும்).'}</p>` +
    `<p><a href="${link}" style="background:#1E7145;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;display:inline-block">${button}</a></p>` +
    `<p style="color:#777;font-size:12px">நீங்கள் இதைக் கேட்கவில்லை என்றால் இந்த mail-ஐ விட்டுவிடுங்கள். If you did not ask for this, ignore this e-mail.</p></div>`);
}

async function tooManyFailures(env, email) {
  const r = await env.DB.prepare('select count(*) as n from login_failures where email = ? and at > ?').bind(email, addSeconds(-15 * 60)).first();
  return (r?.n || 0) >= 10;
}

// ---------------------------------------------------------------- handlers
async function signup(req, env) {
  const b = await readJson(req);
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!EMAIL_RE.test(email)) return err(400, 'Please enter a valid e-mail address');
  if (password.length < 6) return err(400, 'Password should be at least 6 characters');
  const existing = await env.DB.prepare('select id from users where email = ?').bind(email).first();
  if (existing) return err(400, 'User already registered');
  const confirmed = !mailEnabled(env); // without an e-mail service, accounts are confirmed immediately
  const user = await createUser(env, email, await hashPassword(password), null, confirmed);
  if (confirmed) return json({ user, session: await createSession(env, user) });
  await mailLink(env, user, 'confirm', b.redirect_to);
  return json({ user, session: null });
}

async function passwordGrant(req, env) {
  const b = await readJson(req);
  const email = String(b.email || '').trim().toLowerCase();
  if (await tooManyFailures(env, email)) return err(429, 'Too many attempts — please wait 15 minutes and try again.');
  const u = await env.DB.prepare('select id, email, password_hash, email_confirmed_at from users where email = ?').bind(email).first();
  if (!u || !(await checkPassword(String(b.password || ''), u.password_hash))) {
    await env.DB.prepare('insert into login_failures (email) values (?)').bind(email).run();
    return err(400, 'Invalid login credentials');
  }
  if (!u.email_confirmed_at) return err(400, 'Email not confirmed');
  await env.DB.prepare('delete from login_failures where email = ?').bind(email).run();
  return json(await createSession(env, u));
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

async function recover(req, env) {
  const b = await readJson(req);
  if (!mailEnabled(env)) return err(503, 'Password reset e-mails are not set up yet. Please contact support.');
  const email = String(b.email || '').trim().toLowerCase();
  const u = await env.DB.prepare('select id, email from users where email = ?').bind(email).first();
  if (u) await mailLink(env, u, 'recovery', b.redirect_to);
  return json({ ok: true }); // same answer whether or not the account exists
}

async function getUser(req, env) {
  const me = await userFromRequest(req, env);
  if (!me) return err(401, 'Invalid JWT');
  return json({ id: me.id, email: me.email });
}

async function updateUser(req, env) {
  const me = await userFromRequest(req, env);
  if (!me) return err(401, 'Invalid JWT');
  const b = await readJson(req);
  if (b.password !== undefined) {
    if (String(b.password).length < 6) return err(400, 'Password should be at least 6 characters');
    await env.DB.prepare('update users set password_hash = ?, email_confirmed_at = coalesce(email_confirmed_at, ?) where id = ?').bind(await hashPassword(String(b.password)), now(), me.id).run();
  }
  return json({ id: me.id, email: me.email });
}

async function verifyLink(url, env) {
  const type = url.searchParams.get('type') === 'recovery' ? 'recovery' : 'confirm';
  const target = safeRedirect(url.searchParams.get('redirect_to'));
  const h = await sha256(url.searchParams.get('token') || '');
  const row = await env.DB.prepare('select t.user_id, t.expires_at, u.email from auth_tokens t join users u on u.id = t.user_id where t.token_hash = ? and t.kind = ?').bind(h, type).first();
  if (!row || row.expires_at < now()) return Response.redirect(target.split('#')[0] + '#error=access_denied&error_description=' + encodeURIComponent('Link is invalid or has expired'), 302);
  await env.DB.batch([
    env.DB.prepare('delete from auth_tokens where token_hash = ?').bind(h),
    env.DB.prepare('update users set email_confirmed_at = coalesce(email_confirmed_at, ?) where id = ?').bind(now(), row.user_id),
  ]);
  const s = await createSession(env, { id: row.user_id, email: row.email });
  return Response.redirect(target.split('#')[0] + sessionHash(s, type === 'recovery' ? 'recovery' : 'signup'), 302);
}

// ---------- Google sign-in (OAuth 2.0 authorization-code flow)
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
  const email = String(claims.email).toLowerCase();
  let u = await env.DB.prepare('select id, email from users where google_sub = ?').bind(claims.sub).first();
  let type = 'magiclink';
  if (!u) {
    u = await env.DB.prepare('select id, email from users where email = ?').bind(email).first();
    if (u) await env.DB.prepare('update users set google_sub = ?, email_confirmed_at = coalesce(email_confirmed_at, ?) where id = ?').bind(claims.sub, now(), u.id).run();
    else { u = await createUser(env, email, null, claims.sub, true); type = 'signup'; }
  }
  return Response.redirect(back + sessionHash(await createSession(env, u), type), 302);
}

export async function handleAuth(req, env, path, url) {
  const m = req.method;
  if (path === '/signup' && m === 'POST') return signup(req, env);
  if (path === '/token' && m === 'POST') {
    const g = url.searchParams.get('grant_type');
    if (g === 'password') return passwordGrant(req, env);
    if (g === 'refresh_token') return refreshGrant(req, env);
    return err(400, 'Unsupported grant_type');
  }
  if (path === '/logout' && m === 'POST') return logout(req, env);
  if (path === '/recover' && m === 'POST') return recover(req, env);
  if (path === '/user' && m === 'GET') return getUser(req, env);
  if (path === '/user' && m === 'PUT') return updateUser(req, env);
  if (path === '/verify' && m === 'GET') return verifyLink(url, env);
  if (path === '/authorize' && m === 'GET') return authorize(url, env);
  if (path === '/callback' && m === 'GET') return callback(url, env);
  return err(404, 'Not found');
}
