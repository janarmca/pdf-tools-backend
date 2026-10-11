// Social platforms for the promotion agent (src/promo.js): posting + one-click "Connect" (OAuth) from the admin page.
// Connected tokens live in D1 promo_settings (keys below); app ids/secrets are Worker secrets.
//   Facebook Page + Instagram: FB_APP_ID, FB_APP_SECRET  -> Connect -> fb_page_id, fb_page_token (never expires), ig_user_id
//   Pinterest:                 PINTEREST_APP_ID, PINTEREST_APP_SECRET -> Connect -> pin_refresh (+ cached pin_access), pin_board
//   YouTube (uploads run in GitHub Actions, .github/workflows/promo-youtube.yml): GOOGLE_CLIENT_ID/SECRET -> Connect -> yt_refresh
//   X (Twitter): X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET (generated in the X developer portal for your own account)
import { b64url, b64urlDecode, hmac, safeEqual } from './util.js';

const enc = new TextEncoder();
const GRAPH = (env) => `${(env.FB_GRAPH_BASE || 'https://graph.facebook.com').replace(/\/$/, '')}/${env.FB_GRAPH_VERSION || 'v23.0'}`;
const PIN_API = (env) => (env.PINTEREST_API_BASE || 'https://api.pinterest.com').replace(/\/$/, '');
const X_API = (env) => (env.X_API_BASE || 'https://api.twitter.com').replace(/\/$/, '');
const apiBase = (env) => (env.PUBLIC_API_URL || 'https://pdftoolsindia.com/cfapi').replace(/\/$/, '');
const callbackUrl = (env, p) => `${apiBase(env)}/promo/oauth/${p}`;

export async function getSetting(env, key) {
  const r = await env.DB.prepare('select value from promo_settings where key = ?').bind(key).first();
  return r ? r.value : null;
}
export async function setSettings(env, obj) {
  await env.DB.batch(Object.entries(obj).map(([k, v]) => v == null
    ? env.DB.prepare('delete from promo_settings where key = ?').bind(k)
    : env.DB.prepare('insert into promo_settings (key, value) values (?, ?) on conflict(key) do update set value = excluded.value').bind(k, String(v))));
}
async function jsonOrText(r) { const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t.slice(0, 200) }; } }
const errText = (j, r) => (j && (j.error?.message || j.message || j.detail || (typeof j.error === 'string' && j.error) || j.raw)) || `HTTP ${r.status}`;

// ---------------------------------------------------------------- Facebook Page + Instagram
async function fbSend(env, t, post, s) {
  const text = `${t.ta || t.name} · ${t.name}\n\n${post.ta}\n\n${post.en}\n\n👉 ${t.url}`;
  const body = t.img ? { url: t.img, caption: text } : { message: text, link: t.url };
  const r = await fetch(`${GRAPH(env)}/${s.fb_page_id}/${t.img ? 'photos' : 'feed'}`, { method: 'POST', body: new URLSearchParams({ ...body, access_token: s.fb_page_token }) });
  const j = await jsonOrText(r);
  if (!r.ok || j.error) throw new Error('Facebook: ' + errText(j, r));
  return String(j.post_id || j.id || '');
}
async function igSend(env, t, post, s) {
  if (!t.img) return null; // Instagram needs a picture — skipped for this tool
  const caption = `${t.ta || t.name} · ${t.name}\n\n${post.ta}\n\n${post.en}\n\n🔗 pdftoolsindia.com (link in bio)`.slice(0, 2200);
  const c = await fetch(`${GRAPH(env)}/${s.ig_user_id}/media`, { method: 'POST', body: new URLSearchParams({ image_url: t.img, caption, access_token: s.fb_page_token }) });
  const cj = await jsonOrText(c);
  if (!c.ok || !cj.id) throw new Error('Instagram: ' + errText(cj, c));
  for (let i = 0; i < 6; i++) { // the picture is fetched by Instagram first; usually ready at once
    const st = await (await fetch(`${GRAPH(env)}/${cj.id}?fields=status_code&access_token=${encodeURIComponent(s.fb_page_token)}`)).json().catch(() => ({}));
    if (st.status_code === 'FINISHED' || !st.status_code) break;
    if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') throw new Error('Instagram could not process the picture');
    await new Promise((res) => setTimeout(res, 2000));
  }
  const p = await fetch(`${GRAPH(env)}/${s.ig_user_id}/media_publish`, { method: 'POST', body: new URLSearchParams({ creation_id: cj.id, access_token: s.fb_page_token }) });
  const pj = await jsonOrText(p);
  if (!p.ok || !pj.id) throw new Error('Instagram: ' + errText(pj, p));
  return String(pj.id);
}

// ---------------------------------------------------------------- X (Twitter), OAuth 1.0a user context
const pct = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
export async function oauth1Header(method, url, k, nonce, ts) {
  const p = { oauth_consumer_key: k.key, oauth_nonce: nonce, oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: String(ts), oauth_token: k.token, oauth_version: '1.0' };
  const params = Object.keys(p).sort().map((x) => `${pct(x)}=${pct(p[x])}`).join('&');
  const base = `${method}&${pct(url)}&${pct(params)}`;
  const key = await crypto.subtle.importKey('raw', enc.encode(`${pct(k.secret)}&${pct(k.tokenSecret)}`), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(base)))));
  return 'OAuth ' + Object.entries({ ...p, oauth_signature: sig }).sort().map(([a, b]) => `${pct(a)}="${pct(b)}"`).join(', ');
}
async function xSend(env, t, post) {
  const url = `${X_API(env)}/2/tweets`;
  let head = `${t.name}${t.ta ? ' · ' + t.ta : ''}: ${post.en}`;
  if (head.length > 250) head = head.slice(0, 249).trimEnd() + '…'; // links always count as 23 characters
  const auth = await oauth1Header('POST', url, { key: env.X_API_KEY, secret: env.X_API_SECRET, token: env.X_ACCESS_TOKEN, tokenSecret: env.X_ACCESS_SECRET },
    b64url(crypto.getRandomValues(new Uint8Array(16))).replace(/[^a-zA-Z0-9]/g, ''), Math.floor(Date.now() / 1000));
  const r = await fetch(url, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: `${head}\n${t.url}` }) });
  const j = await jsonOrText(r);
  if (!r.ok || !j.data?.id) throw new Error('X: ' + errText(j, r));
  return String(j.data.id);
}

// ---------------------------------------------------------------- Pinterest (access token 30 days, refreshed from the 1-year refresh token)
const pinBasic = (env) => 'Basic ' + btoa(`${env.PINTEREST_APP_ID}:${env.PINTEREST_APP_SECRET}`);
async function pinToken(env, s) {
  const cached = s.pin_access ? JSON.parse(s.pin_access) : null;
  if (cached && cached.exp > Date.now() + 3600e3) return cached.token;
  const r = await fetch(`${PIN_API(env)}/v5/oauth/token`, { method: 'POST', headers: { Authorization: pinBasic(env), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: s.pin_refresh }) });
  const j = await jsonOrText(r);
  if (!r.ok || !j.access_token) throw new Error('Pinterest: ' + errText(j, r) + ' — press Connect Pinterest again');
  await setSettings(env, { pin_access: JSON.stringify({ token: j.access_token, exp: Date.now() + (j.expires_in || 2592000) * 1000 }), ...(j.refresh_token ? { pin_refresh: j.refresh_token } : {}) });
  return j.access_token;
}
async function pinSend(env, t, post, s) {
  if (!t.img) return null;
  const token = await pinToken(env, s);
  const r = await fetch(`${PIN_API(env)}/v5/pins`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ board_id: s.pin_board, link: t.url, title: `${t.name}${t.ta ? ' · ' + t.ta : ''}`.slice(0, 100), description: `${post.ta}\n${post.en}`.slice(0, 500), alt_text: t.name.slice(0, 500), media_source: { source_type: 'image_url', url: t.img } }),
  });
  const j = await jsonOrText(r);
  if (!r.ok || !j.id) throw new Error('Pinterest: ' + errText(j, r));
  return String(j.id);
}

// ---------------------------------------------------------------- the list promo.js posts to
const KEYS = ['fb_page_id', 'fb_page_token', 'fb_page_name', 'ig_user_id', 'pin_refresh', 'pin_access', 'pin_board', 'yt_refresh', 'yt_channel'];
export async function loadSocial(env) {
  const { results } = await env.DB.prepare(`select key, value from promo_settings where key in (${KEYS.map(() => '?').join(',')})`).bind(...KEYS).all();
  return Object.fromEntries(results.map((r) => [r.key, r.value]));
}
export const SOCIAL = [
  { name: 'facebook', ready: (env, s) => !!(s.fb_page_id && s.fb_page_token), send: fbSend },
  { name: 'instagram', ready: (env, s) => !!(s.ig_user_id && s.fb_page_token), send: igSend },
  { name: 'x', ready: (env) => !!(env.X_API_KEY && env.X_API_SECRET && env.X_ACCESS_TOKEN && env.X_ACCESS_SECRET), send: xSend },
  { name: 'pinterest', ready: (env, s) => !!(env.PINTEREST_APP_ID && env.PINTEREST_APP_SECRET && s.pin_refresh && s.pin_board), send: pinSend },
];
// what the admin page shows: can it be connected (app keys present) and is it connected
export function socialStatus(env, s) {
  return [
    { name: 'facebook', canConnect: !!(env.FB_APP_ID && env.FB_APP_SECRET), connected: !!s.fb_page_token, detail: s.fb_page_name || '' },
    { name: 'instagram', canConnect: !!(env.FB_APP_ID && env.FB_APP_SECRET), connected: !!s.ig_user_id, detail: s.ig_user_id ? 'via Facebook Page' : '' },
    { name: 'x', canConnect: false, connected: !!(env.X_API_KEY && env.X_ACCESS_TOKEN), detail: 'GitHub secrets' },
    { name: 'pinterest', canConnect: !!(env.PINTEREST_APP_ID && env.PINTEREST_APP_SECRET), connected: !!s.pin_refresh, detail: '' },
    { name: 'youtube', canConnect: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET), connected: !!s.yt_refresh, detail: s.yt_channel || '' },
  ];
}

// ---------------------------------------------------------------- one-click Connect (OAuth authorization code)
async function signState(env, data) {
  const body = b64url(enc.encode(JSON.stringify(data)));
  return `${body}.${await hmac(env.AUTH_JWT_SECRET, 'promo-oauth:' + body)}`;
}
async function readState(env, state) {
  const [body, sig] = String(state || '').split('.');
  if (!body || !safeEqual(await hmac(env.AUTH_JWT_SECRET, 'promo-oauth:' + body), sig)) return null;
  try { const d = JSON.parse(new TextDecoder().decode(b64urlDecode(body))); return d.exp > Date.now() ? d : null; } catch { return null; }
}
// admin asked to connect a platform -> the URL to open
export async function connectUrl(env, platform) {
  const state = await signState(env, { p: platform, exp: Date.now() + 15 * 60 * 1000 });
  const redirect_uri = callbackUrl(env, platform);
  if (platform === 'facebook' && env.FB_APP_ID) {
    return `${(env.FB_DIALOG_BASE || 'https://www.facebook.com').replace(/\/$/, '')}/${env.FB_GRAPH_VERSION || 'v23.0'}/dialog/oauth?` + new URLSearchParams({ client_id: env.FB_APP_ID, redirect_uri, state, response_type: 'code',
      scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,business_management,instagram_basic,instagram_content_publish' });
  }
  if (platform === 'pinterest' && env.PINTEREST_APP_ID) {
    return `${(env.PINTEREST_AUTH_BASE || 'https://www.pinterest.com').replace(/\/$/, '')}/oauth/?` + new URLSearchParams({ client_id: env.PINTEREST_APP_ID, redirect_uri, response_type: 'code', scope: 'boards:read,boards:write,pins:read,pins:write', state });
  }
  if (platform === 'youtube' && env.GOOGLE_CLIENT_ID) {
    return `${(env.GOOGLE_AUTH_BASE || 'https://accounts.google.com').replace(/\/$/, '')}/o/oauth2/v2/auth?` + new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri, response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly', access_type: 'offline', prompt: 'consent', state });
  }
  return null;
}
const page = (title, msg, ok) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<body style="font-family:system-ui,'Noto Sans Tamil',sans-serif;max-width:560px;margin:40px auto;padding:16px;line-height:1.6"><h2>${ok ? '✅' : '❌'} ${title}</h2><p>${msg}</p>
<p><a href="https://pdftoolsindia.com/matrimony/#/admin/promo">← Promotion / விளம்பரம்</a></p></body>`, { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
const escH = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// the platform sent the browser back here with ?code=...&state=...
export async function oauthCallback(env, platform, url) {
  const st = await readState(env, url.searchParams.get('state'));
  if (!st || st.p !== platform) return page('Link expired', 'Please press Connect again on the admin page. · மீண்டும் Connect அழுத்துங்கள்.', false);
  const code = url.searchParams.get('code');
  if (!code) return page('Not connected', escH(url.searchParams.get('error_description') || url.searchParams.get('error') || 'Permission was not given.'), false);
  const redirect_uri = callbackUrl(env, platform);
  try {
    if (platform === 'facebook') {
      const q = (o) => new URLSearchParams({ client_id: env.FB_APP_ID, client_secret: env.FB_APP_SECRET, ...o });
      const a = await (await fetch(`${GRAPH(env)}/oauth/access_token?${q({ redirect_uri, code })}`)).json();
      if (!a.access_token) throw new Error(a.error?.message || 'no token');
      const l = await (await fetch(`${GRAPH(env)}/oauth/access_token?${q({ grant_type: 'fb_exchange_token', fb_exchange_token: a.access_token })}`)).json();
      if (!l.access_token) throw new Error(l.error?.message || 'no long-lived token');
      const pages = await (await fetch(`${GRAPH(env)}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(l.access_token)}`)).json();
      const pg = (pages.data || []).find((x) => /pdf\s*tools/i.test(x.name)) || (pages.data || [])[0];
      if (!pg) throw new Error('No Facebook Page found — create a Page first and allow it in the dialog.');
      await setSettings(env, { fb_page_id: pg.id, fb_page_token: pg.access_token, fb_page_name: pg.name, ig_user_id: pg.instagram_business_account?.id || null });
      return page('Facebook connected', `Page: <b>${escH(pg.name)}</b>. Instagram: ${pg.instagram_business_account ? '✅ connected' : '❌ not linked — make it a Professional account, link it to this Page, then press Connect again'}.`, true);
    }
    if (platform === 'pinterest') {
      const r = await fetch(`${PIN_API(env)}/v5/oauth/token`, { method: 'POST', headers: { Authorization: pinBasic(env), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri }) });
      const j = await r.json();
      if (!j.access_token) throw new Error(j.message || 'no token');
      const H = { Authorization: `Bearer ${j.access_token}`, 'Content-Type': 'application/json' };
      const boards = await (await fetch(`${PIN_API(env)}/v5/boards?page_size=50`, { headers: H })).json();
      let board = (boards.items || []).find((b) => /pdf\s*tools/i.test(b.name)) || (boards.items || [])[0];
      if (!board) board = await (await fetch(`${PIN_API(env)}/v5/boards`, { method: 'POST', headers: H, body: JSON.stringify({ name: 'PDF Tools India — Free Tools', description: 'Free Tamil-first online tools — pdftoolsindia.com' }) })).json();
      if (!board.id) throw new Error('Could not find or create a board');
      await setSettings(env, { pin_refresh: j.refresh_token, pin_access: JSON.stringify({ token: j.access_token, exp: Date.now() + (j.expires_in || 2592000) * 1000 }), pin_board: board.id });
      return page('Pinterest connected', `Board: <b>${escH(board.name || board.id)}</b>`, true);
    }
    if (platform === 'youtube') {
      const r = await fetch(`${(env.GOOGLE_TOKEN_BASE || 'https://oauth2.googleapis.com').replace(/\/$/, '')}/token`, { method: 'POST', body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri, grant_type: 'authorization_code' }) });
      const j = await r.json();
      if (!j.refresh_token) throw new Error(j.error_description || j.error || 'no refresh token');
      const ch = await (await fetch(`${(env.YOUTUBE_API_BASE || 'https://www.googleapis.com').replace(/\/$/, '')}/youtube/v3/channels?part=snippet&mine=true`, { headers: { Authorization: `Bearer ${j.access_token}` } })).json().catch(() => ({}));
      await setSettings(env, { yt_refresh: j.refresh_token, yt_channel: ch.items?.[0]?.snippet?.title || 'YouTube' });
      return page('YouTube connected', `Channel: <b>${escH(ch.items?.[0]?.snippet?.title || '?')}</b>. Shorts are made and uploaded every day by GitHub Actions.`, true);
    }
  } catch (e) {
    return page('Not connected', escH(e.message || e), false);
  }
  return page('Unknown platform', '', false);
}
export async function disconnect(env, platform) {
  const keys = { facebook: ['fb_page_id', 'fb_page_token', 'fb_page_name', 'ig_user_id'], instagram: ['ig_user_id'], pinterest: ['pin_refresh', 'pin_access', 'pin_board'], youtube: ['yt_refresh', 'yt_channel'] }[platform];
  if (keys) await setSettings(env, Object.fromEntries(keys.map((k) => [k, null])));
}
