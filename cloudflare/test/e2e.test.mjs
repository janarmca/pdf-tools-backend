// End-to-end test against a running Worker (local: `npx wrangler dev`, see README).
//   API=http://127.0.0.1:8787/cfapi INTERNAL_KEY=... node --test test/
// Uses a fresh random e-mail domain each run, so it can be re-run on the same local database.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.API || 'http://127.0.0.1:8787/cfapi';
const IKEY = process.env.INTERNAL_KEY || 'int-key-456';
const run = Math.random().toString(36).slice(2, 8);
const mail = (n) => `${n}.${run}@test.in`;

async function call(path, { method = 'POST', body, token, headers = {}, raw } = {}) {
  const h = { ...headers };
  if (body !== undefined && !raw) h['Content-Type'] = 'application/json';
  if (token) h.Authorization = 'Bearer ' + token;
  const r = await fetch(API + path, { method, headers: h, body: raw ? body : body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
  const text = await r.text();
  let j; try { j = JSON.parse(text); } catch { j = text; }
  return { s: r.status, j, h: r.headers };
}
const rpc = (name, args, token) => call('/mat/rpc/' + name, { body: args || {}, token }).then((r) => r.j);
const sql = (statements) => call('/internal/sql', { body: { statements }, headers: { 'X-Internal-Key': IKEY } });

async function signup(name, pw = 'secret123') {
  const r = await call('/auth/v1/signup', { body: { email: mail(name), password: pw } });
  assert.equal(r.s, 200, JSON.stringify(r.j));
  return r.j.session;
}

const profile = (name, gender, dob, extra = {}) => ({ name, gender, dob, community: 'kannada_devanga', consent: true, city: 'Salem', about: 'Simple person', ...extra });

test('auth: sign-up, login, refresh rotation, user update, logout', async () => {
  const s = await signup('alice');
  assert.ok(s.access_token && s.refresh_token && s.user.id);
  assert.equal((await call('/auth/v1/signup', { body: { email: mail('alice'), password: 'secret123' } })).j.error, 'User already registered');
  assert.equal((await call('/auth/v1/token?grant_type=password', { body: { email: mail('alice'), password: 'wrong' } })).j.error, 'Invalid login credentials');
  const l = await call('/auth/v1/token?grant_type=password', { body: { email: mail('ALICE'), password: 'secret123' } });
  assert.equal(l.s, 200);
  assert.equal(l.j.user.id, s.user.id);
  const me = await call('/auth/v1/user', { method: 'GET', token: l.j.access_token });
  assert.equal(me.j.email, mail('alice'));
  assert.equal((await call('/auth/v1/user', { method: 'GET', token: l.j.access_token + 'x' })).s, 401);
  const r1 = await call('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: l.j.refresh_token } });
  assert.equal(r1.s, 200);
  assert.notEqual(r1.j.refresh_token, l.j.refresh_token);
  assert.equal((await call('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: l.j.refresh_token } })).s, 401, 'old refresh token is single-use');
  assert.equal((await call('/auth/v1/user', { method: 'PUT', token: r1.j.access_token, body: { password: 'newpass1' } })).s, 200);
  assert.equal((await call('/auth/v1/token?grant_type=password', { body: { email: mail('alice'), password: 'newpass1' } })).s, 200);
  await call('/auth/v1/logout', { body: { refresh_token: r1.j.refresh_token }, token: r1.j.access_token });
  assert.equal((await call('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: r1.j.refresh_token } })).s, 401);
  // without an e-mail service: reset is refused clearly, Google not configured
  assert.equal((await call('/auth/v1/recover', { body: { email: mail('alice') } })).s, 503);
  assert.equal((await call('/auth/v1/authorize?provider=google&redirect_to=https://pdftoolsindia.com/', { method: 'GET' })).s, 503);
  // profile row with 5 free credits exists
  const p = await sql([{ sql: 'select credits, plan from profiles where id = ?', params: [s.user.id] }]);
  assert.deepEqual(p.j.results[0][0], { credits: 5, plan: 'free' });
});

test('internal endpoint needs the key; batch is a transaction', async () => {
  assert.equal((await call('/internal/sql', { body: { statements: [{ sql: 'select 1' }] } })).s, 403);
  assert.equal((await call('/internal/sql', { body: { statements: [{ sql: 'select 1' }] }, headers: { 'X-Internal-Key': 'nope' } })).s, 403);
  const bad = await sql([{ sql: "insert into redeem_codes (code, credits) values ('T" + run + "', 1)" }, { sql: 'select * from no_such_table' }]);
  assert.equal(bad.s, 500);
  const chk = await sql([{ sql: 'select count(*) as n from redeem_codes where code = ?', params: ['T' + run] }]);
  assert.equal(chk.j.results[0][0].n, 0, 'first statement rolled back');
});

test('matrimony: profile -> admin approve -> search -> interest -> chat with contact filter', async () => {
  const admin = await signup('admin'); // not in MAT_ADMIN_EMAILS (different address) -> make admin directly
  await sql([{ sql: 'insert into mat_admins (user_id) values (?)', params: [admin.user.id] }]);
  const m = await signup('ravi'), f = await signup('priya');

  assert.equal((await rpc('mat_search', {}, null)).code, 'not_logged_in');
  assert.equal((await rpc('mat_no_such_fn', {}, m.access_token)).code, 'not_installed');
  assert.deepEqual(await rpc('mat_my_profile', {}, m.access_token), { none: true, is_admin: false });
  assert.equal((await rpc('mat_my_profile', {}, admin.access_token)).is_admin, true);

  assert.equal((await rpc('mat_save_profile', { p: profile('Ravi', 'M', '2010-01-01') }, m.access_token)).code, 'age');
  assert.equal((await rpc('mat_save_profile', { p: profile('Ravi', 'M', '1994-02-30') }, m.access_token)).code, 'dob');
  assert.equal((await rpc('mat_save_profile', { p: { ...profile('Ravi', 'M', '1994-03-12'), consent: false } }, m.access_token)).code, 'consent');
  const contact = await rpc('mat_save_profile', { p: profile('Ravi', 'M', '1994-03-12', { about: 'call 98765 43210' }) }, m.access_token);
  assert.equal(contact.code, 'contact_in_profile');
  assert.equal(contact.field, 'about');
  assert.equal((await rpc('mat_save_profile', { p: profile('Ravi', 'M', '1994-03-12', { photos: ['someone-else/x.jpg'] }) }, m.access_token)).code, 'photos');
  assert.equal((await rpc('mat_save_profile', { p: profile('Ravi', 'M', '1994-03-12', { height_cm: 'tall' }) }, m.access_token)).code, 'error');
  const saved = await rpc('mat_save_profile', { p: profile('Ravi', 'M', '1994-03-12', { height_cm: '172', star: 'bharani', pref: { min_age: 22 } }), phone: '9876543210', email: 'r@x.in' }, m.access_token);
  assert.deepEqual(saved, { ok: true, status: 'pending' });
  assert.equal((await rpc('mat_save_profile', { p: profile('Priya', 'F', '1997-04-18', { star: 'ashwini' }) }, f.access_token)).ok, true);

  const mine = await rpc('mat_my_profile', {}, m.access_token);
  assert.equal(mine.height_cm, 172);
  assert.deepEqual(mine.pref, { min_age: 22 });
  assert.deepEqual(mine.photos, []);
  assert.equal(mine.chat_banned, false);
  assert.equal(typeof mine.age, 'number');

  assert.equal((await rpc('mat_search', {}, m.access_token)).code, 'not_approved');
  assert.equal((await rpc('mat_admin_queue', {}, m.access_token)).code, 'forbidden');
  const q = await rpc('mat_admin_queue', { st: 'pending' }, admin.access_token);
  const ravi = q.items.find((x) => x.user_id === m.user.id);
  assert.equal(ravi.phone, '9876543210');
  assert.equal(ravi.email, 'r@x.in');
  for (const u of [m, f]) assert.equal((await rpc('mat_admin_set_status', { pid: u.user.id, st: 'approved', note: 'ok' }, admin.access_token)).ok, true);

  const s1 = await rpc('mat_search', { f: { min_age: 18, max_age: 60, star: ['ashwini'] } }, m.access_token);
  assert.equal(s1.ok, true);
  const card = s1.items.find((x) => x.id === f.user.id);
  assert.ok(card, 'priya found');
  assert.equal(card.name, 'Priya');
  assert.equal(card.interest, null);
  assert.equal(card.shortlisted, false);
  assert.equal('dob' in card, false);
  assert.equal((await rpc('mat_search', { f: { star: ['rohini'] } }, m.access_token)).items.some((x) => x.id === f.user.id), false);

  const gp = await rpc('mat_get_profile', { pid: f.user.id }, m.access_token);
  assert.equal(gp.ok, true);
  assert.equal(gp.self, false);
  assert.equal('dob' in gp.profile, false);
  assert.equal('admin_note' in gp.profile, false);
  assert.equal(gp.profile.id, f.user.id);

  assert.deepEqual(await rpc('mat_toggle_shortlist', { pid: f.user.id }, m.access_token), { ok: true, shortlisted: true });
  assert.equal((await rpc('mat_shortlist_list', {}, m.access_token)).items[0].shortlisted, true);

  assert.equal((await rpc('mat_send_interest', { pid: f.user.id, note: 'my number 9876543210' }, m.access_token)).code, 'contact_blocked');
  assert.deepEqual(await rpc('mat_send_interest', { pid: f.user.id, note: 'Hello' }, m.access_token), { ok: true, status: 'pending' });
  assert.equal((await rpc('mat_counts', {}, f.access_token)).interests_in, 1);
  const inbox = await rpc('mat_inbox', {}, f.access_token);
  assert.equal(inbox.items[0].dir, 'in');
  assert.equal(inbox.items[0].other.id, m.user.id);
  assert.equal((await rpc('mat_send_message', { pid: m.user.id, body: 'hi' }, f.access_token)).code, 'not_accepted');
  assert.deepEqual(await rpc('mat_respond_interest', { iid: inbox.items[0].id, accept: true }, f.access_token), { ok: true });
  assert.equal((await rpc('mat_respond_interest', { iid: inbox.items[0].id, accept: true }, f.access_token)).code, 'not_found');

  const cs = await rpc('mat_chat_state', { pid: f.user.id }, m.access_token);
  assert.deepEqual(cs, { ok: true, accepted: true, unlocked: true, blocked: false, banned: false }); // chat fee is off by default
  const sent = await rpc('mat_send_message', { pid: f.user.id, body: 'Vanakkam!' }, m.access_token);
  assert.equal(sent.ok, true);
  // digits split over several messages are caught by the rolling window
  assert.equal((await rpc('mat_send_message', { pid: f.user.id, body: 'my 98765' }, m.access_token)).ok, true);
  const split = await rpc('mat_send_message', { pid: f.user.id, body: '43210' }, m.access_token);
  assert.equal(split.code, 'contact_blocked');
  assert.equal(split.strikes, 1);
  assert.equal((await rpc('mat_send_message', { pid: f.user.id, body: 'mail me at a@b.com' }, m.access_token)).strikes, 2);
  const third = await rpc('mat_send_message', { pid: f.user.id, body: 'whatsapp pannunga' }, m.access_token);
  assert.equal(third.banned, true);
  assert.equal((await rpc('mat_send_message', { pid: f.user.id, body: 'hello' }, m.access_token)).code, 'chat_banned');
  assert.equal((await rpc('mat_counts', {}, f.access_token)).unread, 2);
  const list = await rpc('mat_messages_list', { pid: m.user.id, after_id: 0 }, f.access_token);
  assert.deepEqual(list.items.map((x) => [x.body, x.mine]), [['Vanakkam!', false], ['my 98765', false]]);
  assert.equal((await rpc('mat_counts', {}, f.access_token)).unread, 0);
  const conv = await rpc('mat_conversations', {}, f.access_token);
  assert.equal(conv.items[0].last_body, 'my 98765');
  assert.equal(conv.items[0].unread, 0);

  const rep = await rpc('mat_admin_reports', {}, admin.access_token);
  assert.equal(rep.violations.filter((v) => v.user_id === m.user.id).length, 3);
  assert.deepEqual(await rpc('mat_admin_set_chat_ban', { pid: m.user.id, banned: false }, admin.access_token), { ok: true });
  assert.equal((await rpc('mat_send_message', { pid: f.user.id, body: 'sorry' }, m.access_token)).ok, true);

  // fee switched on -> chat needs an unlock (written only by the server via the internal endpoint)
  await sql([{ sql: "update mat_settings set value = 'on' where key = 'chat_fee'" }]);
  assert.equal((await rpc('mat_chat_state', { pid: f.user.id }, m.access_token)).unlocked, false);
  assert.equal((await rpc('mat_send_message', { pid: f.user.id, body: 'hi' }, m.access_token)).code, 'not_unlocked');
  await call('/internal/mat-record-unlock', { body: { a: m.user.id, b: f.user.id, payer: m.user.id, p_order: 'o_' + run, p_payment: 'p_' + run, p_amount: 5000 }, headers: { 'X-Internal-Key': IKEY } });
  assert.equal((await rpc('mat_chat_state', { pid: f.user.id }, m.access_token)).unlocked, true);
  await sql([{ sql: "update mat_settings set value = 'off' where key = 'chat_fee'" }]);
  const stats = await rpc('mat_admin_stats', {}, admin.access_token);
  assert.ok(stats.unlocks >= 1 && stats.revenue_paise >= 5000);

  // block hides people from each other
  await rpc('mat_block', { pid: f.user.id }, m.access_token);
  assert.equal((await rpc('mat_get_profile', { pid: f.user.id }, m.access_token)).code, 'not_found');
  assert.equal((await rpc('mat_search', {}, m.access_token)).items.some((x) => x.id === f.user.id), false);
  await rpc('mat_block', { pid: f.user.id, on_off: false }, m.access_token);

  // editing name/about/photos sends an approved profile back to pending; hide/show
  assert.deepEqual(await rpc('mat_set_visibility', { hide: true }, f.access_token), { ok: true, status: 'hidden' });
  assert.deepEqual(await rpc('mat_set_visibility', { hide: false }, f.access_token), { ok: true, status: 'approved' });
  assert.equal((await rpc('mat_save_profile', { p: profile('Priya', 'F', '1997-04-18', { about: 'Updated about' }) }, f.access_token)).status, 'pending');
  const pub = await rpc('mat_public_stats', {}, null);
  assert.equal(typeof pub.members, 'number');
  assert.deepEqual(await rpc('mat_delete_me', {}, f.access_token), { ok: true });
  assert.equal((await rpc('mat_my_profile', {}, f.access_token)).none, true);
});

test('matrimony: public submission form + photos', async () => {
  const bad = await rpc('mat_submit_public', { p: profile('Kumar', 'M', '1990-01-01'), phone: '123' }, null);
  assert.equal(bad.code, 'phone');
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
  const up = await call('/mat/photo?folder=submissions', { body: jpg, raw: true, headers: { 'Content-Type': 'image/jpeg' } });
  assert.equal(up.s, 200);
  assert.match(up.j.path, /^submissions\//);
  assert.equal((await call('/mat/photo?folder=me', { body: jpg, raw: true, headers: { 'Content-Type': 'image/jpeg' } })).s, 401);
  const phone = '9' + String(Date.now()).slice(-9);
  const ok = await rpc('mat_submit_public', { p: { ...profile('Kumar', 'M', '1990-01-01'), photos: [up.j.path], junk: 'x' }, phone, email: 'k@x.in' }, null);
  assert.equal(ok.ok, true);
  const admin = await signup('admin2');
  await sql([{ sql: 'insert into mat_admins (user_id) values (?)', params: [admin.user.id] }]);
  const subs = await rpc('mat_admin_submissions', { st: 'new' }, admin.access_token);
  const mine = subs.items.find((x) => x.id === ok.id);
  assert.equal(mine.data.name, 'Kumar');
  assert.equal('junk' in mine.data, false);
  assert.deepEqual(mine.photos, [up.j.path]);
  assert.equal(typeof mine.age, 'number');
  assert.deepEqual(await rpc('mat_admin_submission_set', { sid: ok.id, st: 'done' }, admin.access_token), { ok: true });

  // signed photo URL: needs login, works, expires/forgery rejected
  const u = await call('/mat/photo-url?path=' + encodeURIComponent(up.j.path), { method: 'GET', token: admin.access_token });
  assert.ok(u.j.url);
  const img = await fetch(u.j.url.replace(/^https?:\/\/[^/]+\/cfapi/, API));
  assert.equal(img.status, 200);
  assert.deepEqual(new Uint8Array(await img.arrayBuffer()), jpg);
  assert.equal((await fetch(u.j.url.replace(/^https?:\/\/[^/]+\/cfapi/, API).replace(/sig=[^&]+/, 'sig=forged'))).status, 403);

  // own photo: upload / delete only inside your folder
  const me = await signup('photo');
  const mineUp = await call('/mat/photo?folder=me', { body: jpg, raw: true, token: me.access_token, headers: { 'Content-Type': 'image/jpeg' } });
  assert.ok(mineUp.j.path.startsWith(me.user.id + '/'));
  assert.equal((await call('/mat/photo?path=' + encodeURIComponent(up.j.path), { method: 'DELETE', token: me.access_token })).s, 403);
  assert.equal((await call('/mat/photo?path=' + encodeURIComponent(mineUp.j.path), { method: 'DELETE', token: me.access_token })).s, 200);
});

test('CORS + unknown routes', async () => {
  const r = await fetch(API + '/auth/v1/user', { method: 'OPTIONS', headers: { Origin: 'https://pdftoolsindia.com' } });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://pdftoolsindia.com');
  const evil = await fetch(API + '/health', { headers: { Origin: 'https://evil.example' } });
  assert.equal(evil.headers.get('access-control-allow-origin'), 'https://pdftoolsindia.com');
  assert.equal((await call('/nope', { method: 'GET' })).s, 404);
});
