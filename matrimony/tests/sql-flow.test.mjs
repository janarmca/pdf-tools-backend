import { makeDb } from './pg-setup.mjs';
const db = await makeDb();
let bad = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL:', m); } };
const U = {}; for (const k of ['m1', 'f1', 'f2', 'm2', 'adm', 'x']) U[k] = (await db.query(`insert into auth.users(email) values ($1) returning id`, [k + '@t.in'])).rows[0].id;
await db.query(`insert into mat_admins values ($1)`, [U.adm]);
async function as(who, sql, params = []) {
  await db.exec(`set role ${who === 'anon' ? 'anon' : who === 'service' ? 'service_role' : 'authenticated'}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [who === 'anon' || who === 'service' ? '' : U[who]]);
  try { return (await db.query(sql, params)).rows; } finally { await db.exec('reset role'); }
}
const rpc = async (who, fn, ...args) => { const ph = args.map((_, i) => '$' + (i + 1) + (typeof args[i] === 'object' && args[i] !== null ? '::jsonb' : '')).join(','); const r = await as(who, `select ${fn}(${ph}) as r`, args.map(a => typeof a === 'object' && a !== null ? JSON.stringify(a) : a)); return r[0].r; };
const prof = (o) => ({ name: 'Test', gender: 'M', dob: '1996-05-10', community: 'kannada_devanga', kulam: 'Kashyapa', education: 'be', occupation: 'Engineer', city: 'Salem', state: 'Tamil Nadu', height_cm: 172, consent: 'true', photos: [], ...o });
const err = async (who, sql) => { try { await as(who, sql); return null; } catch (e) { return e.message; } };

// ---- profile validation
ok((await rpc('m1', 'mat_save_profile', prof({ dob: '2010-01-01' }))).code === 'age', 'underage male blocked');
ok((await rpc('m1', 'mat_save_profile', prof({ gender: 'M', dob: new Date(Date.now() - 20.5 * 365.25 * 864e5).toISOString().slice(0, 10) }))).code === 'age', 'male 20 blocked (min 21)');
ok((await rpc('f1', 'mat_save_profile', prof({ name: 'Priya', gender: 'F', dob: new Date(Date.now() - 18.5 * 365.25 * 864e5).toISOString().slice(0, 10) }))).ok === true, 'female 18 allowed');
ok((await rpc('m1', 'mat_save_profile', prof({ about: 'call nine eight seven six five four three two one zero' }))).code === 'contact_in_profile', 'phone in about blocked');
ok((await rpc('m1', 'mat_save_profile', prof({ consent: 'false' }))).code === 'consent', 'consent required');
ok((await rpc('m1', 'mat_save_profile', prof({ photos: [U.f1 + '/a.jpg'] }))).code === 'photos', 'foreign photo path refused');
ok((await rpc('m1', 'mat_save_profile', prof({ name: 'Raja', about: 'Teacher, loves music' }), '9876543210', 'raja@t.in')).ok === true, 'm1 saved');
ok((await rpc('f1', 'mat_save_profile', prof({ name: 'Priya', gender: 'F', dob: '1998-03-02', about: 'Nurse' }), '9000000001', 'p@t.in')).ok === true, 'f1 saved');
ok((await rpc('f2', 'mat_save_profile', prof({ name: 'Kavya', gender: 'F', dob: '1999-07-07', community: 'nadar' }))).ok === true, 'f2 saved');
ok((await rpc('m2', 'mat_save_profile', prof({ name: 'Arun', gender: 'M', dob: '1995-01-01' }))).ok === true, 'm2 saved');

// ---- pending user cannot browse
ok((await rpc('m1', 'mat_search', {})).code === 'not_approved', 'pending cannot search');
ok((await rpc('f1', 'mat_admin_queue')).code === 'forbidden', 'non-admin forbidden');
const q = await rpc('adm', 'mat_admin_queue', 'pending');
ok(q.items.length === 4 && q.items.find(i => i.name === 'Raja').phone === '9876543210', 'admin sees queue + phone');
for (const k of ['m1', 'f1', 'f2', 'm2']) await rpc('adm', 'mat_admin_set_status', U[k], 'approved');

// ---- direct table access is closed
ok((await as('f1', 'select * from mat_profiles')).length === 1, 'authenticated reads only own profile row');
ok((await err('f1', 'select * from mat_private')) !== null, 'mat_private unreadable');
ok((await err('f1', `insert into mat_messages(user_a,user_b,sender,body) values ('${U.f1}','${U.m1}','${U.f1}','hi')`)) !== null, 'direct message insert denied');
ok((await err('f1', `update mat_profiles set status='approved'`)) !== null, 'cannot self-approve');
ok((await err('anon', 'select * from mat_profiles')) !== null, 'anon cannot read');
ok((await err('f1', `select mat_record_unlock('${U.f1}','${U.m1}','${U.f1}','o','p',5000)`)) !== null, 'user cannot fake payment');
ok((await as('anon', 'select mat_public_stats() as r'))[0].r.members === 4, 'public stats work for anon');

// ---- search
let s = await rpc('m1', 'mat_search', {});
ok(s.items.length === 2 && s.items.every(i => i.gender === 'F'), 'male sees only women');
ok(JSON.stringify(s).indexOf('9000000001') < 0 && !('dob' in s.items[0]), 'no phone / dob in cards');
s = await rpc('m1', 'mat_search', { community: ['kannada_devanga'] });
ok(s.items.length === 1 && s.items[0].name === 'Priya', 'community filter');
s = await rpc('m1', 'mat_search', { min_age: 24, max_age: 30 });
ok(s.items.length >= 1 && s.items.every(i => i.age >= 24 && i.age <= 30), 'age filter');
const gp = await rpc('m1', 'mat_get_profile', U.f1);
ok(gp.ok && !('dob' in gp.profile) && !('phone' in gp.profile) && gp.unlocked === false, 'profile view hides private fields');
ok((await rpc('m1', 'mat_get_profile', U.m2)).ok === true, 'can view same-gender profile by id (allowed, not listed)');

// ---- interests
ok((await rpc('m1', 'mat_send_interest', U.f1, 'call me on 9876543210')).code === 'contact_blocked', 'contact in interest note blocked');
ok((await rpc('m1', 'mat_send_interest', U.f1, 'We liked your profile')).ok, 'interest sent');
ok((await rpc('m1', 'mat_send_message', U.f1, 'hello')).code === 'not_accepted', 'no chat before accept');
const inbox = await rpc('f1', 'mat_inbox');
ok(inbox.items.length === 1 && inbox.items[0].dir === 'in', 'recipient sees interest');
ok((await rpc('f1', 'mat_respond_interest', inbox.items[0].id, true)).ok, 'accepted');
ok((await rpc('m1', 'mat_send_message', U.f1, 'hello')).code === 'not_unlocked', 'accepted but not paid -> locked');
ok((await rpc('m1', 'mat_chat_state', U.f1)).accepted === true, 'chat state accepted');

// ---- payment (service role only)
const a = U.m1 < U.f1 ? U.m1 : U.f1;
ok((await as('service', `select mat_record_unlock($1,$2,$3,'order_1','pay_1',5000) as r`, [U.m1, U.f1, U.m1]))[0].r.ok, 'service role records unlock');
ok((await as('service', `select mat_record_unlock($1,$2,$3,'order_1','pay_1',5000) as r`, [U.m1, U.f1, U.m1]))[0].r.ok, 'idempotent');
ok((await db.query('select count(*)::int c from mat_unlocks')).rows[0].c === 1, 'one unlock row');

// ---- chat + filter
ok((await rpc('m1', 'mat_send_message', U.f1, 'Namaste, shall we speak with our parents first?')).ok, 'normal message ok');
ok((await rpc('f1', 'mat_send_message', U.m1, 'ಹೌದು, ನಮ್ಮ ತಂದೆಯವರೊಂದಿಗೆ ಮಾತನಾಡುತ್ತೇನೆ')).ok, 'kannada message ok');
let r;
let r1 = await rpc('m1', 'mat_send_message', U.f1, 'my whatsapp is 98765 43210');
ok(r1.code === 'contact_blocked' && r1.strikes === 1, 'phone blocked, strike 1: ' + JSON.stringify(r1));
ok((await rpc('m1', 'mat_send_message', U.f1, '98765')).ok, '5 digits alone fine');
r = await rpc('m1', 'mat_send_message', U.f1, '43210');
ok(r.code === 'contact_blocked' && r.reason === 'phone', 'split number across messages blocked');
ok((await rpc('m1', 'mat_send_message', U.f1, 'ஜி மெயில் id')).banned === true, '3rd strike bans');
ok((await rpc('m1', 'mat_send_message', U.f1, 'hello again')).code === 'chat_banned', 'banned cannot send');
ok((await rpc('adm', 'mat_admin_set_chat_ban', U.m1, false)).ok, 'admin unbans');
ok((await rpc('m1', 'mat_send_message', U.f1, 'hello again')).ok, 'works after unban');
const msgs = await rpc('f1', 'mat_messages_list', U.m1, 0);
ok(msgs.items.length === 4 && msgs.items.every(m => !/\d{6}/.test(m.body)), 'stored messages contain no numbers: ' + msgs.items.length);
ok(JSON.stringify(msgs).indexOf('whatsapp') < 0, 'blocked text never stored');
ok((await rpc('f2', 'mat_messages_list', U.m1, 0)).code === 'not_unlocked', 'third party cannot read');
ok((await as('f2', 'select * from mat_messages')).length === 0, 'RLS hides others\' messages');
ok((await as('m1', 'select * from mat_messages')).length === 4, 'RLS shows own messages');
ok((await err('x', 'select 1')) === null, 'x ok');
// trigger = last line of defence (superuser insert)
let te = null; try { await db.query(`insert into mat_messages(user_a,user_b,sender,body) values ($1,$2,$3,'mail me at abc@gmail.com')`, [a, U.m1 < U.f1 ? U.f1 : U.m1, U.m1]); } catch (e) { te = e.message; }
ok(te && te.includes('contact_info_blocked'), 'DB trigger blocks direct insert: ' + te);
const conv = await rpc('f1', 'mat_conversations');
ok(conv.items.length === 1 && conv.items[0].unread >= 0, 'conversation list');
ok((await rpc('adm', 'mat_admin_reports')).violations.length === 3, 'violations logged for admin');

// ---- block / shortlist / report
ok((await rpc('f2', 'mat_toggle_shortlist', U.m2)).shortlisted === true, 'shortlist on');
ok((await rpc('f2', 'mat_shortlist_list')).items.length === 1, 'shortlist list');
ok((await rpc('f2', 'mat_block', U.m2)).ok, 'block');
ok((await rpc('m2', 'mat_search', {})).items.every(i => i.id !== U.f2), 'blocked user hidden from search');
ok((await rpc('m2', 'mat_send_interest', U.f2, 'hi')).code === 'not_found', 'blocked cannot send interest');
ok((await rpc('f2', 'mat_report', U.m2, 'fake', 'x')).ok, 'report');
ok((await rpc('adm', 'mat_admin_stats')).unlocks === 1, 'stats');

// ---- interest rate limit + mutual
for (let i = 0; i < 14; i++) { const u = (await db.query(`insert into auth.users(email) values ('bulk${i}@t') returning id`)).rows[0].id; await db.query(`insert into mat_profiles(user_id,name,gender,dob,community,status) values ($1,'Bulk${i}','F','1998-01-01','other','approved')`, [u]); U['b' + i] = u; }
let last; for (let i = 0; i < 14; i++) last = await rpc('m2', 'mat_send_interest', U['b' + i], 'hi');
ok(last.ok, '14 interests ok'); ok((await rpc('m2', 'mat_send_interest', U.f1, 'hi')).ok, '15th ok'); ok((await rpc('m2', 'mat_send_interest', U.f2, 'hi')).code, '16th refused (blocked/limit)');
await db.query(`insert into mat_interests(from_user,to_user) values ($1,$2)`, [U.b0, U.m1]);
ok((await rpc('m1', 'mat_send_interest', U.b0, 'hi')).mutual === true, 'mutual interest auto-accepts');

ok((await rpc('m2', 'mat_set_visibility', true)).status === 'hidden', 'hide profile');
ok((await rpc('f2', 'mat_search', {})).items.every(i => i.id !== U.m2), 'hidden profile not listed');
ok((await rpc('m2', 'mat_set_visibility', false)).status === 'approved', 'unhide profile');
ok((await rpc('f1', 'mat_counts')).status === 'approved', 'counts work');
// ---- admin edit flow + delete
ok((await rpc('f1', 'mat_save_profile', prof({ name: 'Priya', gender: 'F', dob: '1998-03-02', about: 'Nurse, new text' }))).status === 'pending', 'editing about re-queues approved profile');
ok((await rpc('f1', 'mat_delete_me')).ok && (await db.query(`select count(*)::int c from mat_profiles where user_id=$1`, [U.f1])).rows[0].c === 0, 'delete account');
console.log(`sql flow: ${n} checks, ${bad} failed`); process.exit(bad ? 1 : 0);
