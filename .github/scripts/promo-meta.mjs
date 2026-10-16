// Posts the daily Short to a Facebook Page (as a Reel) and to Instagram (as a Reel) through Meta's official Graph API. Free.
// One-time setup is on Meta's side (see HANDOFF "Meta setup"): GitHub secrets META_TOKEN (long-lived Page access token), FB_PAGE_ID, IG_USER_ID.
// Without them each function returns { skipped: true } and nothing happens. Calls follow Meta's documented flows (Reels publishing API v25.0).
import fs from 'node:fs';

const V = process.env.META_API_VERSION || 'v25.0';
const G = `https://graph.facebook.com/${V}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t.slice(0, 300) }; } };
const fail = (what, o) => { throw new Error(`${what}: ${JSON.stringify(o.error || o).slice(0, 300)}`); };

export const metaConfigured = (env = process.env) => ({ facebook: !!(env.META_TOKEN && env.FB_PAGE_ID), instagram: !!(env.META_TOKEN && env.IG_USER_ID) });

async function rupload(url, token, buf) {
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `OAuth ${token}`, offset: '0', file_size: String(buf.length), 'Content-Type': 'application/octet-stream' }, body: buf });
  const o = await j(r); if (!r.ok || o.success === false) fail('upload', o); return o;
}

// Facebook Page Reel: start -> upload bytes -> finish (PUBLISHED).
export async function postFacebookReel(file, description, env = process.env) {
  if (!metaConfigured(env).facebook) return { skipped: true };
  const token = env.META_TOKEN, page = env.FB_PAGE_ID, buf = fs.readFileSync(file);
  const s = await j(await fetch(`${G}/${page}/video_reels`, { method: 'POST', body: new URLSearchParams({ upload_phase: 'start', access_token: token }) }));
  if (!s.video_id) fail('facebook start', s);
  await rupload(s.upload_url || `https://rupload.facebook.com/video-upload/${V}/${s.video_id}`, token, buf);
  const f = await j(await fetch(`${G}/${page}/video_reels`, { method: 'POST', body: new URLSearchParams({ upload_phase: 'finish', video_id: s.video_id, video_state: 'PUBLISHED', description, access_token: token }) }));
  if (!f.success) fail('facebook finish', f);
  return { id: s.video_id };
}

// Instagram Reel: create resumable container -> upload bytes -> wait until FINISHED -> media_publish.
export async function postInstagramReel(file, caption, env = process.env) {
  if (!metaConfigured(env).instagram) return { skipped: true };
  const token = env.META_TOKEN, ig = env.IG_USER_ID, buf = fs.readFileSync(file);
  const c = await j(await fetch(`${G}/${ig}/media`, { method: 'POST', body: new URLSearchParams({ media_type: 'REELS', upload_type: 'resumable', caption, share_to_feed: 'true', access_token: token }) }));
  if (!c.id) fail('instagram container', c);
  await rupload(c.uri || `https://rupload.facebook.com/ig-api-upload/${V}/${c.id}`, token, buf);
  let st = '';
  for (let i = 0; i < 30; i++) {
    const s = await j(await fetch(`${G}/${c.id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`));
    st = s.status_code || ''; if (st === 'FINISHED') break; if (st === 'ERROR' || st === 'EXPIRED') fail('instagram processing', s);
    await sleep(10000);
  }
  if (st !== 'FINISHED') throw new Error('instagram processing timed out');
  const p = await j(await fetch(`${G}/${ig}/media_publish`, { method: 'POST', body: new URLSearchParams({ creation_id: c.id, access_token: token }) }));
  if (!p.id) fail('instagram publish', p);
  return { id: p.id };
}
