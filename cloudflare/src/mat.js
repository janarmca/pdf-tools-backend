// சௌடேஸ்வரி திருமண அமைப்பகம் — the former Supabase plpgsql functions (matrimony/supabase/schema.base.sql),
// ported 1:1 to JavaScript over D1. Same names, same arguments, same JSON answers, so the site code is unchanged.
// Rules enforced here (server side): nobody reads other people's rows directly, contact details can never be
// stored in chat/profile text, chat opens only after (interest accepted) AND (fee paid, when the fee is on).
import MatFilter from '../../matrimony/m-filter.js';
import { now, addSeconds } from './util.js';

class Code extends Error {}

const contactCheck = (t, prev) => (t == null || t === '' ? null : MatFilter.check(String(t), prev || []));
const pairA = (x, y) => (x < y ? x : y);
const pairB = (x, y) => (x < y ? y : x);
const trimOrNull = (v) => { if (v == null) return null; const s = String(v).trim(); return s === '' ? null : s; };
const nz = (v) => (v == null || v === '' ? null : String(v));
const arr = (f, k) => (f && Array.isArray(f[k]) ? f[k].map(String) : []);
const truthy = (v) => v === true || v === 'true';

function toInt(v) {
  if (v == null || v === '') return null;
  if (!/^\s*[+-]?\d+\s*$/.test(String(v))) throw new Error(`invalid input syntax for type integer: "${v}"`);
  return parseInt(v, 10);
}

function validDate(s) {
  if (s == null) return null;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s).trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCMonth() !== +m[2] - 1) return null;
  return d.toISOString().slice(0, 10);
}

export function age(dob) {
  if (!dob) return null;
  const [y, m, d] = String(dob).slice(0, 10).split('-').map(Number);
  const t = new Date();
  let a = t.getUTCFullYear() - y;
  if (t.getUTCMonth() + 1 < m || (t.getUTCMonth() + 1 === m && t.getUTCDate() < d)) a--;
  return a;
}

// date that is exactly n years before today (yyyy-mm-dd)
function yearsAgo(n) {
  const t = new Date();
  return new Date(Date.UTC(t.getUTCFullYear() - n, t.getUTCMonth(), t.getUTCDate())).toISOString().slice(0, 10);
}

function profileOut(r) {
  if (!r) return r;
  const p = { ...r };
  p.pref = safeParse(p.pref, {});
  p.photos = safeParse(p.photos, []);
  p.chat_banned = !!p.chat_banned;
  return p;
}

function safeParse(s, dflt) {
  if (s == null) return dflt;
  try { return JSON.parse(s); } catch { return dflt; }
}

const omit = (o, keys) => { const c = { ...o }; keys.forEach((k) => delete c[k]); return c; };

// ---------------------------------------------------------------- helpers
async function isAdmin(db, uid) {
  if (!uid) return false;
  return !!(await db.prepare('select 1 from mat_admins where user_id = ?').bind(uid).first());
}

async function blocked(db, x, y) {
  return !!(await db.prepare('select 1 from mat_blocks where (blocker = ?1 and blocked = ?2) or (blocker = ?2 and blocked = ?1)').bind(x, y).first());
}

async function unlocked(db, x, y) {
  const s = await db.prepare("select value from mat_settings where key = 'chat_fee'").first();
  if ((s?.value || 'off') !== 'on') return true;
  return !!(await db.prepare('select 1 from mat_unlocks where user_a = ? and user_b = ?').bind(pairA(x, y), pairB(x, y)).first());
}

async function accepted(db, x, y) {
  return !!(await db.prepare("select 1 from mat_interests where status = 'accepted' and ((from_user = ?1 and to_user = ?2) or (from_user = ?2 and to_user = ?1))").bind(x, y).first());
}

async function meApproved(db, uid) {
  if (!uid) throw new Code('not_logged_in');
  const me = await db.prepare('select * from mat_profiles where user_id = ?').bind(uid).first();
  if (!me) throw new Code('no_profile');
  if (me.status !== 'approved') throw new Code('not_approved');
  return profileOut(me);
}

// viewer context for profile cards: whom I shortlisted, and my interests with everybody
async function cardCtx(db, uid) {
  const ctx = { uid, short: new Set(), ints: new Map() };
  if (!uid) return ctx;
  const [s, i] = await db.batch([
    db.prepare('select target from mat_shortlist where user_id = ?').bind(uid),
    db.prepare('select id, from_user, to_user, status from mat_interests where from_user = ?1 or to_user = ?1 order by id').bind(uid),
  ]);
  s.results.forEach((r) => ctx.short.add(r.target));
  i.results.forEach((r) => {
    const other = r.from_user === uid ? r.to_user : r.from_user;
    if (!ctx.ints.has(other)) ctx.ints.set(other, { id: r.id, status: r.status, dir: r.from_user === uid ? 'out' : 'in' });
  });
  return ctx;
}

// profile card shown in lists (no private data, ever)
function card(p, ctx) {
  const photos = Array.isArray(p.photos) ? p.photos : safeParse(p.photos, []);
  return {
    id: p.user_id, name: p.name, age: age(p.dob), gender: p.gender,
    height_cm: p.height_cm, community: p.community, community_other: p.community_other,
    kulam: p.kulam, gotra: p.gotra, star: p.star, raasi: p.raasi,
    education: p.education, occupation: p.occupation, city: p.city, state: p.state,
    marital: p.marital, created_for: p.created_for,
    photo: photos.length ? photos[0] : null,
    shortlisted: ctx.short.has(p.user_id),
    interest: ctx.ints.get(p.user_id) || null,
  };
}

const NOT_BLOCKED = (me, col) => `not exists (select 1 from mat_blocks b where (b.blocker = ${me} and b.blocked = ${col}) or (b.blocker = ${col} and b.blocked = ${me}))`;

const TEXT_FIELDS = ['name', 'community_other', 'kulam', 'gotra', 'education_detail', 'occupation', 'father_occ', 'mother_occ', 'father_name', 'mother_name', 'native_place', 'family_about', 'about', 'city', 'district'];

// the CHECK constraints of the original table
function checkConstraints(r) {
  const between = (v, a, b) => v == null || (v >= a && v <= b);
  const len = (s) => (s == null ? 0 : [...s].length);
  const bad = !['self', 'son', 'daughter', 'brother', 'sister', 'relative', 'friend'].includes(r.created_for) ||
    len(r.name) < 2 || len(r.name) > 60 ||
    !['never', 'divorced', 'widowed', 'separated'].includes(r.marital) ||
    !between(r.height_cm, 120, 230) || !between(r.brothers, 0, 15) || !between(r.sisters, 0, 15) ||
    !between(r.brothers_married, 0, 15) || !between(r.sisters_married, 0, 15) ||
    len(r.family_about) > 400 || len(r.about) > 600;
  if (bad) throw new Error('new row for relation "mat_profiles" violates check constraint');
}

// ---------------------------------------------------------------- functions (same names as before)
const F = {};

F.mat_save_profile = async (db, uid, a) => {
  const p = a.p || {};
  if (!uid) return { ok: false, code: 'not_logged_in' };
  const g = p.gender;
  if (g !== 'M' && g !== 'F') return { ok: false, code: 'gender' };
  const d = validDate(p.dob);
  if (!d) return { ok: false, code: 'dob' };
  const ag = age(d);
  if ((g === 'M' && ag < 21) || (g === 'F' && ag < 18)) return { ok: false, code: 'age' };
  if (ag > 80) return { ok: false, code: 'dob' };
  const existing = await db.prepare('select * from mat_profiles where user_id = ?').bind(uid).first();
  if (String(p.consent ?? '') !== 'true' && !(existing && existing.consent_at)) return { ok: false, code: 'consent' };
  for (const k of TEXT_FIELDS) {
    const bad = contactCheck(p[k]);
    if (bad) return { ok: false, code: 'contact_in_profile', field: k, reason: bad };
  }
  const ph = arr(p, 'photos');
  if (ph.length > 6) return { ok: false, code: 'photos' };
  if (ph.some((k) => k.slice(0, 37) !== uid + '/' || k.includes('..'))) return { ok: false, code: 'photos' };

  const r = {
    created_for: nz(p.created_for) || 'self', name: String(p.name ?? '').trim(), gender: g, dob: d,
    religion: nz(p.religion) || 'hindu', community: nz(p.community) || 'other',
    community_other: trimOrNull(p.community_other), kulam: trimOrNull(p.kulam), gotra: trimOrNull(p.gotra), mother_tongue: nz(p.mother_tongue),
    star: nz(p.star), raasi: nz(p.raasi), dosham: nz(p.dosham) || 'no', marital: nz(p.marital) || 'never',
    height_cm: toInt(p.height_cm), diet: nz(p.diet), education: nz(p.education), education_detail: trimOrNull(p.education_detail), occupation: trimOrNull(p.occupation),
    employer_type: nz(p.employer_type), income_band: nz(p.income_band), city: trimOrNull(p.city), district: trimOrNull(p.district), state: nz(p.state),
    country: nz(p.country) || 'India', father_occ: trimOrNull(p.father_occ), mother_occ: trimOrNull(p.mother_occ),
    brothers: toInt(p.brothers), sisters: toInt(p.sisters), family_type: nz(p.family_type), family_status: nz(p.family_status),
    father_name: trimOrNull(p.father_name), mother_name: trimOrNull(p.mother_name), native_place: trimOrNull(p.native_place),
    brothers_married: toInt(p.brothers_married), sisters_married: toInt(p.sisters_married), family_about: trimOrNull(p.family_about),
    about: trimOrNull(p.about), pref: JSON.stringify(p.pref && typeof p.pref === 'object' ? p.pref : {}), photos: JSON.stringify(ph),
  };
  checkConstraints(r);
  const cols = Object.keys(r);
  let status = existing ? existing.status : 'pending';
  // editing photos / about / name sends an approved profile back for a quick re-check
  if (existing && existing.status === 'approved' && (existing.photos !== r.photos || existing.about !== r.about || existing.name !== r.name)) status = 'pending';
  const ts = now();
  const upsert = existing
    ? db.prepare(`update mat_profiles set ${cols.map((c) => c + ' = ?').join(', ')}, status = ?, updated_at = ? where user_id = ?`).bind(...cols.map((c) => r[c]), status, ts, uid)
    : db.prepare(`insert into mat_profiles (user_id, ${cols.join(', ')}, consent_at, status) values (?, ${cols.map(() => '?').join(', ')}, ?, 'pending')`).bind(uid, ...cols.map((c) => r[c]), ts);
  await db.batch([
    upsert,
    db.prepare('insert into mat_private (user_id, phone, email) values (?1, ?2, ?3) on conflict (user_id) do update set phone = coalesce(excluded.phone, mat_private.phone), email = coalesce(excluded.email, mat_private.email)')
      .bind(uid, trimOrNull(a.phone), trimOrNull(a.email)),
  ]);
  const st = await db.prepare('select status from mat_profiles where user_id = ?').bind(uid).first();
  return { ok: true, status: st.status };
};

F.mat_my_profile = async (db, uid) => {
  const admin = await isAdmin(db, uid);
  const p = uid ? await db.prepare('select * from mat_profiles where user_id = ?').bind(uid).first() : null;
  if (!p) return { none: true, is_admin: admin };
  return { ...profileOut(p), age: age(p.dob), is_admin: admin };
};

F.mat_delete_me = async (db, uid) => {
  if (!uid) return { ok: false, code: 'not_logged_in' };
  await db.batch([
    db.prepare('delete from mat_messages where user_a = ?1 or user_b = ?1').bind(uid),
    db.prepare('delete from mat_interests where from_user = ?1 or to_user = ?1').bind(uid),
    db.prepare('delete from mat_shortlist where user_id = ?1 or target = ?1').bind(uid),
    db.prepare('delete from mat_profiles where user_id = ?').bind(uid),
    db.prepare('delete from mat_private where user_id = ?').bind(uid),
  ]);
  return { ok: true };
};

F.mat_search = async (db, uid, a) => {
  const f = a.f || {};
  let me;
  try { me = await meApproved(db, uid); } catch (e) { return { ok: false, code: e.message }; }
  const g = nz(f.gender) || (me.gender === 'M' ? 'F' : 'M');
  const where = ["p.status = 'approved'", 'p.user_id <> ?1', 'p.gender = ?2', NOT_BLOCKED('?1', 'p.user_id')];
  const binds = [uid, g];
  const bind = (v) => { binds.push(v); return '?' + binds.length; };
  if (nz(f.min_age) != null) where.push(`p.dob <= ${bind(yearsAgo(toInt(f.min_age)))}`);
  if (nz(f.max_age) != null) where.push(`p.dob > ${bind(yearsAgo(toInt(f.max_age) + 1))}`);
  if (nz(f.min_height) != null) where.push(`p.height_cm >= ${bind(toInt(f.min_height))}`);
  if (nz(f.max_height) != null) where.push(`p.height_cm <= ${bind(toInt(f.max_height))}`);
  for (const [k, col] of [['community', 'community'], ['star', 'star'], ['raasi', 'raasi'], ['marital', 'marital'], ['education', 'education'], ['state', 'state'], ['diet', 'diet']]) {
    const v = arr(f, k);
    if (v.length) where.push(`p.${col} in (${v.map(bind).join(', ')})`);
  }
  const kn = trimOrNull(f.kulam), cn = trimOrNull(f.city), qn = trimOrNull(f.q);
  if (kn) { const x = bind('%' + kn + '%'); where.push(`(p.kulam like ${x} or p.gotra like ${x})`); }
  if (cn) { const x = bind('%' + cn + '%'); where.push(`(p.city like ${x} or p.district like ${x})`); }
  if (qn) where.push(`p.name like ${bind('%' + qn + '%')}`);
  if (truthy(f.with_photo)) where.push("p.photos <> '[]'");
  if (truthy(f.no_dosham)) where.push("p.dosham = 'no'");
  const lim = Math.min(Math.max(toInt(a.lim) ?? 20, 1), 50);
  const off = Math.max(toInt(a.off) ?? 0, 0);
  const rows = (await db.prepare(`select p.* from mat_profiles p where ${where.join(' and ')} order by p.created_at desc limit ${lim} offset ${off}`).bind(...binds).all()).results;
  const ctx = await cardCtx(db, uid);
  return { ok: true, items: rows.map((p) => card(p, ctx)) };
};

F.mat_get_profile = async (db, uid, a) => {
  const pid = a.pid;
  if (!uid) return { ok: false, code: 'not_logged_in' };
  const raw = await db.prepare('select * from mat_profiles where user_id = ?').bind(pid).first();
  if (!raw) return { ok: false, code: 'not_found' };
  const p = profileOut(raw);
  const ctx = await cardCtx(db, uid);
  if (pid === uid || (await isAdmin(db, uid))) return { ok: true, profile: { ...p, age: age(p.dob), ...card(raw, ctx) }, self: pid === uid };
  try { await meApproved(db, uid); } catch (e) { return { ok: false, code: e.message }; }
  if (p.status !== 'approved' || (await blocked(db, uid, pid))) return { ok: false, code: 'not_found' };
  return {
    ok: true, self: false,
    profile: { ...omit(p, ['admin_note', 'chat_strikes', 'chat_banned', 'consent_at', 'status', 'dob']), age: age(p.dob), ...card(raw, ctx) },
    unlocked: await unlocked(db, uid, pid), accepted: await accepted(db, uid, pid),
  };
};

F.mat_toggle_shortlist = async (db, uid, a) => {
  if (!uid) return { ok: false, code: 'not_logged_in' };
  if (await db.prepare('select 1 from mat_shortlist where user_id = ? and target = ?').bind(uid, a.pid).first()) {
    await db.prepare('delete from mat_shortlist where user_id = ? and target = ?').bind(uid, a.pid).run();
    return { ok: true, shortlisted: false };
  }
  await db.prepare('insert into mat_shortlist (user_id, target) values (?, ?)').bind(uid, a.pid).run();
  return { ok: true, shortlisted: true };
};

F.mat_shortlist_list = async (db, uid) => {
  try { await meApproved(db, uid); } catch (e) { return { ok: false, code: e.message }; }
  const rows = (await db.prepare(`select p.* from mat_shortlist s join mat_profiles p on p.user_id = s.target
     where s.user_id = ?1 and p.status = 'approved' and ${NOT_BLOCKED('?1', 'p.user_id')} order by s.created_at desc`).bind(uid).all()).results;
  const ctx = await cardCtx(db, uid);
  return { ok: true, items: rows.map((p) => card(p, ctx)) };
};

F.mat_block = async (db, uid, a) => {
  if (!uid) return { ok: false, code: 'not_logged_in' };
  const on = a.on_off === undefined ? true : truthy(a.on_off);
  if (on) {
    await db.batch([
      db.prepare('insert or ignore into mat_blocks (blocker, blocked) values (?, ?)').bind(uid, a.pid),
      db.prepare('delete from mat_shortlist where (user_id = ?1 and target = ?2) or (user_id = ?2 and target = ?1)').bind(uid, a.pid),
    ]);
  } else await db.prepare('delete from mat_blocks where blocker = ? and blocked = ?').bind(uid, a.pid).run();
  return { ok: true };
};

F.mat_report = async (db, uid, a) => {
  if (!uid) return { ok: false, code: 'not_logged_in' };
  await db.prepare('insert into mat_reports (reporter, reported, reason, detail) values (?, ?, ?, ?)')
    .bind(uid, a.pid, String(a.reason ?? 'other').slice(0, 60), a.detail == null ? null : String(a.detail).slice(0, 500)).run();
  return { ok: true };
};

F.mat_send_interest = async (db, uid, a) => {
  const pid = a.pid;
  let me;
  try { me = await meApproved(db, uid); } catch (e) { return { ok: false, code: e.message }; }
  if (pid === me.user_id) return { ok: false, code: 'self' };
  const p = await db.prepare("select 1 from mat_profiles where user_id = ? and status = 'approved'").bind(pid).first();
  if (!p || (await blocked(db, uid, pid))) return { ok: false, code: 'not_found' };
  const bad = contactCheck(a.note);
  if (bad) return { ok: false, code: 'contact_blocked', reason: bad };
  if (a.note != null && [...String(a.note).trim()].length > 200) throw new Error('new row for relation "mat_interests" violates check constraint');
  const n = await db.prepare('select count(*) as n from mat_interests where from_user = ? and created_at > ?').bind(uid, addSeconds(-86400)).first();
  if (n.n >= 15) return { ok: false, code: 'rate_limit' };
  const rev = await db.prepare('select id from mat_interests where from_user = ? and to_user = ?').bind(pid, uid).first();
  if (rev) { // they already liked you: it becomes a mutual match
    await db.prepare("update mat_interests set status = 'accepted', responded_at = ? where id = ?").bind(now(), rev.id).run();
    return { ok: true, status: 'accepted', mutual: true };
  }
  await db.prepare('insert or ignore into mat_interests (from_user, to_user, note) values (?, ?, ?)').bind(uid, pid, trimOrNull(a.note)).run();
  const s = await db.prepare('select status from mat_interests where from_user = ? and to_user = ?').bind(uid, pid).first();
  return { ok: true, status: s ? s.status : null };
};

F.mat_respond_interest = async (db, uid, a) => {
  try { await meApproved(db, uid); } catch (e) { return { ok: false, code: e.message }; }
  const r = await db.prepare("update mat_interests set status = ?, responded_at = ? where id = ? and to_user = ? and status = 'pending'")
    .bind(truthy(a.accept) ? 'accepted' : 'declined', now(), toInt(a.iid), uid).run();
  if (!r.meta.changes) return { ok: false, code: 'not_found' };
  return { ok: true };
};

F.mat_inbox = async (db, uid) => {
  try { await meApproved(db, uid); } catch (e) { return { ok: false, code: e.message }; }
  const rows = (await db.prepare(`select i.id as i_id, i.to_user as i_to, i.status as i_status, i.note as i_note, i.created_at as i_created, p.*
      from mat_interests i join mat_profiles p on p.user_id = case when i.to_user = ?1 then i.from_user else i.to_user end
     where (i.to_user = ?1 or i.from_user = ?1) and p.status = 'approved' and ${NOT_BLOCKED('?1', 'p.user_id')}
     order by i.created_at desc`).bind(uid).all()).results;
  const ctx = await cardCtx(db, uid);
  const items = [];
  for (const r of rows) {
    items.push({ id: r.i_id, dir: r.i_to === uid ? 'in' : 'out', status: r.i_status, note: r.i_note, created_at: r.i_created, other: card(r, ctx), unlocked: await unlocked(db, uid, r.user_id) });
  }
  return { ok: true, items };
};

F.mat_chat_state = async (db, uid, a) => {
  try { await meApproved(db, uid); } catch (e) { return { ok: false, code: e.message }; }
  const me = await db.prepare('select chat_banned from mat_profiles where user_id = ?').bind(uid).first();
  return { ok: true, accepted: await accepted(db, uid, a.pid), unlocked: await unlocked(db, uid, a.pid), blocked: await blocked(db, uid, a.pid), banned: !!me?.chat_banned };
};

F.mat_send_message = async (db, uid, a) => {
  const pid = a.pid;
  const t = String(a.body ?? '').trim();
  let me;
  try { me = await meApproved(db, uid); } catch (e) { return { ok: false, code: e.message }; }
  if (me.chat_banned) return { ok: false, code: 'chat_banned' };
  if (t === '') return { ok: false, code: 'empty' };
  if ([...t].length > 500) return { ok: false, code: 'too_long' };
  if (pid === uid || (await blocked(db, uid, pid)) || !(await db.prepare("select 1 from mat_profiles where user_id = ? and status = 'approved'").bind(pid).first())) return { ok: false, code: 'not_found' };
  if (!(await accepted(db, uid, pid))) return { ok: false, code: 'not_accepted' };
  if (!(await unlocked(db, uid, pid))) return { ok: false, code: 'not_unlocked' };
  const n = await db.prepare('select count(*) as n from mat_messages where sender = ? and created_at > ?').bind(uid, addSeconds(-3600)).first();
  if (n.n >= 120) return { ok: false, code: 'rate_limit' };
  const prev = (await db.prepare('select body from mat_messages where user_a = ? and user_b = ? and sender = ? and created_at > ? order by id desc limit 3')
    .bind(pairA(uid, pid), pairB(uid, pid), uid, addSeconds(-900)).all()).results.map((r) => r.body).reverse();
  const bad = contactCheck(t, prev);
  if (bad) {
    const [, upd] = await db.batch([
      db.prepare('insert into mat_violations (user_id, kind, sample) values (?, ?, ?)').bind(uid, bad, t.slice(0, 200)),
      db.prepare('update mat_profiles set chat_strikes = chat_strikes + 1, chat_banned = (chat_strikes + 1 >= 3) where user_id = ? returning chat_strikes').bind(uid),
    ]);
    const strikes = upd.results[0]?.chat_strikes ?? 0;
    return { ok: false, code: 'contact_blocked', reason: bad, strikes, banned: strikes >= 3 };
  }
  const r = await db.prepare('insert into mat_messages (user_a, user_b, sender, body) values (?, ?, ?, ?) returning id').bind(pairA(uid, pid), pairB(uid, pid), uid, t).first();
  return { ok: true, id: r.id };
};

F.mat_messages_list = async (db, uid, a) => {
  const pid = a.pid;
  try { await meApproved(db, uid); } catch (e) { return { ok: false, code: e.message }; }
  if (!(await unlocked(db, uid, pid)) || (await blocked(db, uid, pid))) return { ok: false, code: 'not_unlocked' };
  const A = pairA(uid, pid), B = pairB(uid, pid);
  const [, list] = await db.batch([
    db.prepare('update mat_messages set read_at = ? where user_a = ? and user_b = ? and sender = ? and read_at is null').bind(now(), A, B, pid),
    db.prepare('select id, sender, body, created_at from mat_messages where user_a = ? and user_b = ? and id > ? order by id').bind(A, B, toInt(a.after_id) ?? 0),
  ]);
  return { ok: true, items: list.results.map((m) => ({ id: m.id, mine: m.sender === uid, body: m.body, created_at: m.created_at })) };
};

F.mat_conversations = async (db, uid) => {
  try { await meApproved(db, uid); } catch (e) { return { ok: false, code: e.message }; }
  const rows = (await db.prepare(`select i.responded_at as i_resp, p.*,
        (select m.body from mat_messages m where m.user_a = min(?1, p.user_id) and m.user_b = max(?1, p.user_id) order by m.id desc limit 1) as last_body,
        (select count(*) from mat_messages m where m.user_a = min(?1, p.user_id) and m.user_b = max(?1, p.user_id) and m.sender = p.user_id and m.read_at is null) as unread,
        (select max(m.created_at) from mat_messages m where m.user_a = min(?1, p.user_id) and m.user_b = max(?1, p.user_id)) as last_msg
      from mat_interests i join mat_profiles p on p.user_id = case when i.to_user = ?1 then i.from_user else i.to_user end
     where i.status = 'accepted' and (i.to_user = ?1 or i.from_user = ?1) and p.status = 'approved' and ${NOT_BLOCKED('?1', 'p.user_id')}`).bind(uid).all()).results;
  const ctx = await cardCtx(db, uid);
  const items = [];
  for (const r of rows) items.push({ last_at: r.last_msg || r.i_resp, j: { other: card(r, ctx), unlocked: await unlocked(db, uid, r.user_id), last_body: r.last_body, unread: r.unread } });
  items.sort((x, y) => (x.last_at === y.last_at ? 0 : x.last_at == null ? 1 : y.last_at == null ? -1 : x.last_at < y.last_at ? 1 : -1));
  return { ok: true, items: items.map((x) => x.j) };
};

// ---------------------------------------------------------------- admin
async function adminOnly(db, uid) { return isAdmin(db, uid); }

F.mat_admin_queue = async (db, uid, a) => {
  if (!(await adminOnly(db, uid))) return { ok: false, code: 'forbidden' };
  const rows = (await db.prepare('select p.*, v.phone as v_phone, v.email as v_email from mat_profiles p left join mat_private v on v.user_id = p.user_id where p.status = ? order by p.created_at')
    .bind(a.st || 'pending').all()).results;
  return { ok: true, items: rows.map((r) => { const o = profileOut(omit(r, ['v_phone', 'v_email'])); return { ...o, age: age(r.dob), phone: r.v_phone, email: r.v_email }; }) };
};

F.mat_admin_set_status = async (db, uid, a) => {
  if (!(await adminOnly(db, uid))) return { ok: false, code: 'forbidden' };
  if (!['pending', 'approved', 'rejected', 'hidden'].includes(a.st)) return { ok: false, code: 'bad_status' };
  await db.prepare('update mat_profiles set status = ?, admin_note = ?, updated_at = ? where user_id = ?')
    .bind(a.st, a.note == null ? null : String(a.note).slice(0, 300), now(), a.pid).run();
  return { ok: true };
};

F.mat_admin_reports = async (db, uid) => {
  if (!(await adminOnly(db, uid))) return { ok: false, code: 'forbidden' };
  const [r, v] = await db.batch([
    db.prepare(`select r.*, (select name from mat_profiles where user_id = r.reporter) as reporter_name, (select name from mat_profiles where user_id = r.reported) as reported_name
                  from mat_reports r order by r.id desc limit 100`),
    db.prepare('select v.*, (select name from mat_profiles where user_id = v.user_id) as name from mat_violations v order by v.id desc limit 100'),
  ]);
  return {
    ok: true,
    reports: r.results.map((x) => ({ id: x.id, reason: x.reason, detail: x.detail, created_at: x.created_at, status: x.status, reporter: x.reporter_name, reported_id: x.reported, reported: x.reported_name })),
    violations: v.results.map((x) => ({ id: x.id, user_id: x.user_id, name: x.name, kind: x.kind, sample: x.sample, created_at: x.created_at })),
  };
};

F.mat_admin_resolve_report = async (db, uid, a) => {
  if (!(await adminOnly(db, uid))) return { ok: false, code: 'forbidden' };
  await db.prepare("update mat_reports set status = 'closed' where id = ?").bind(toInt(a.rid)).run();
  return { ok: true };
};

F.mat_admin_set_chat_ban = async (db, uid, a) => {
  if (!(await adminOnly(db, uid))) return { ok: false, code: 'forbidden' };
  const b = truthy(a.banned);
  await db.prepare('update mat_profiles set chat_banned = ?, chat_strikes = case when ? then chat_strikes else 0 end where user_id = ?').bind(b ? 1 : 0, b ? 1 : 0, a.pid).run();
  return { ok: true };
};

F.mat_admin_stats = async (db, uid) => {
  if (!(await adminOnly(db, uid))) return { ok: false, code: 'forbidden' };
  const r = await db.prepare(`select
      (select count(*) from mat_profiles where status = 'pending') as pending,
      (select count(*) from mat_profiles where status = 'approved') as approved,
      (select count(*) from mat_profiles where status = 'approved' and gender = 'M') as men,
      (select count(*) from mat_profiles where status = 'approved' and gender = 'F') as women,
      (select count(*) from mat_unlocks) as unlocks,
      (select coalesce(sum(amount_paise), 0) from mat_unlocks) as revenue_paise,
      (select count(*) from mat_reports where status = 'open') as open_reports,
      (select count(*) from mat_submissions where status = 'new') as new_submissions,
      (select count(*) from mat_contact_requests where status = 'new') as new_requests,
      (select count(*) from mat_submissions) as submissions_total,
      (select count(*) from mat_submissions where listed = 1) as listed,
      (select count(*) from mat_contact_requests) as requests_total,
      (select count(*) from mat_profiles) as members_total`).first();
  return { ok: true, ...r };
};

// public numbers for the home page (no login needed, no personal data)
F.mat_public_stats = async (db) => {
  const r = await db.prepare(`select (select count(*) from mat_profiles where status = 'approved') as members,
      (select count(*) from mat_profiles where status = 'approved' and community = 'kannada_devanga') as devanga`).first();
  return { members: r.members, devanga: r.devanga };
};

F.mat_set_visibility = async (db, uid, a) => {
  if (!uid) return { ok: false, code: 'not_logged_in' };
  const hide = truthy(a.hide);
  await db.prepare("update mat_profiles set status = case when ?1 and status = 'approved' then 'hidden' when not ?1 and status = 'hidden' then 'approved' else status end, updated_at = ?2 where user_id = ?3")
    .bind(hide ? 1 : 0, now(), uid).run();
  const s = await db.prepare('select status from mat_profiles where user_id = ?').bind(uid).first();
  return { ok: true, status: s ? s.status : null };
};

// small counters for the menu badges
F.mat_counts = async (db, uid) => {
  const r = await db.prepare(`select
      (select count(*) from mat_interests where to_user = ?1 and status = 'pending') as interests_in,
      (select count(*) from mat_messages where sender <> ?1 and (user_a = ?1 or user_b = ?1) and read_at is null) as unread,
      (select count(*) from mat_shortlist where user_id = ?1) as shortlist,
      (select status from mat_profiles where user_id = ?1) as status`).bind(uid || '').first();
  return { interests_in: r.interests_in, unread: r.unread, shortlist: r.shortlist, status: r.status };
};

// public sign-up (NO login needed): the details are simply recorded for the admin
const SUBMIT_FIELDS = ['created_for', 'name', 'gender', 'dob', 'religion', 'community', 'community_other', 'kulam', 'gotra', 'mother_tongue', 'star', 'raasi', 'dosham', 'marital', 'height_cm', 'diet', 'education', 'education_detail', 'occupation', 'employer_type', 'income_band', 'city', 'district', 'state', 'country', 'father_name', 'mother_name', 'native_place', 'father_occ', 'mother_occ', 'brothers', 'sisters', 'brothers_married', 'sisters_married', 'family_type', 'family_status', 'family_about', 'about'];
const lastDigits = (s) => String(s ?? '').replace(/\D/g, '').slice(-10);

F.mat_submit_public = async (db, uid, a) => {
  const p = a.p || {};
  const nm = String(p.name ?? '').trim();
  if ([...nm].length < 2 || [...nm].length > 60) return { ok: false, code: 'name' };
  const g = p.gender;
  if (g !== 'M' && g !== 'F') return { ok: false, code: 'gender' };
  const d = validDate(p.dob);
  if (!d) return { ok: false, code: 'dob' };
  const ag = age(d);
  if ((g === 'M' && ag < 21) || (g === 'F' && ag < 18)) return { ok: false, code: 'age' };
  if (ag > 80) return { ok: false, code: 'dob' };
  if (String(p.consent ?? '') !== 'true') return { ok: false, code: 'consent' };
  const dig = lastDigits(a.phone);
  if (dig.length < 10) return { ok: false, code: 'phone' };
  for (const k of TEXT_FIELDS) {
    const bad = contactCheck(p[k]);
    if (bad) return { ok: false, code: 'contact_in_profile', field: k, reason: bad };
  }
  const ph = arr(p, 'photos');
  if (ph.length > 6) return { ok: false, code: 'photos' };
  if (ph.some((k) => k.slice(0, 12) !== 'submissions/' || k.includes('..'))) return { ok: false, code: 'photos' };
  const horo = trimOrNull(p.horoscope);
  if (horo && (horo.slice(0, 12) !== 'submissions/' || horo.includes('..'))) return { ok: false, code: 'photos' };
  const recent = (await db.prepare('select phone from mat_submissions where created_at > ?').bind(addSeconds(-86400)).all()).results;
  const lastHour = await db.prepare('select count(*) as n from mat_submissions where created_at > ?').bind(addSeconds(-3600)).first();
  if (recent.filter((r) => lastDigits(r.phone) === dig).length >= 3 || lastHour.n >= 300) return { ok: false, code: 'rate_limited' };
  const clean = {};
  for (const k of SUBMIT_FIELDS) {
    const v = trimOrNull(p[k] == null ? null : String(p[k]));
    if (v != null) clean[k] = [...v].slice(0, 600).join('');
  }
  if (p.pref && typeof p.pref === 'object' && !Array.isArray(p.pref)) clean.pref = p.pref;
  const sid = crypto.randomUUID();
  const email = trimOrNull(a.email);
  await db.prepare('insert into mat_submissions (id, data, phone, email, photos, horoscope) values (?, ?, ?, ?, ?, ?)')
    .bind(sid, JSON.stringify(clean), String(a.phone).trim().slice(0, 20), email ? email.slice(0, 120) : null, JSON.stringify(ph), horo).run();
  return { ok: true, id: sid };
};

F.mat_admin_submissions = async (db, uid, a) => {
  if (!(await adminOnly(db, uid))) return { ok: false, code: 'forbidden' };
  const rows = (await db.prepare('select * from mat_submissions where status = ? order by created_at desc').bind(a.st || 'new').all()).results;
  return { ok: true, items: rows.map((s) => { const data = safeParse(s.data, {}); return { ...s, data, photos: safeParse(s.photos, []), age: age(validDate(data.dob)) }; }) };
};

// every sign-up as flat rows (the admin page turns them into a CSV / Excel-openable download)
F.mat_admin_export = async (db, uid) => {
  if (!(await adminOnly(db, uid))) return { ok: false, code: 'forbidden' };
  const rows = (await db.prepare('select id, data, phone, email, status, listed, created_at from mat_submissions order by created_at desc limit 5000').all()).results;
  return { ok: true, items: rows.map((s) => { const d = safeParse(s.data, {}); return { code: String(s.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase(), name: d.name || '', gender: d.gender || '', age: age(validDate(d.dob)), phone: s.phone || '', email: s.email || '', community: d.community || '', kulam: d.kulam || '', star: d.star || '', raasi: d.raasi || '', education: d.education || '', occupation: d.occupation || '', city: d.city || '', state: d.state || '', status: s.status, listed: s.listed ? 'yes' : 'no', created_at: s.created_at }; }) };
};

// remove a sign-up for good (wrong / duplicate / asked to be removed); its photos are deleted too
F.mat_admin_submission_delete = async (db, uid, a, env) => {
  if (!(await adminOnly(db, uid))) return { ok: false, code: 'forbidden' };
  const s = await db.prepare('select photos, horoscope from mat_submissions where id = ?').bind(String(a.sid)).first();
  if (!s) return { ok: false, code: 'not_found' };
  await db.prepare('delete from mat_submissions where id = ?').bind(String(a.sid)).run();
  const files = [...safeParse(s.photos, []), ...(s.horoscope ? [s.horoscope] : [])];
  try { if (env && env.MAT_PHOTOS) for (const f of files) await env.MAT_PHOTOS.delete(f); } catch { /* best effort */ }
  return { ok: true };
};

F.mat_admin_submission_set = async (db, uid, a) => {
  if (!(await adminOnly(db, uid))) return { ok: false, code: 'forbidden' };
  if (!['new', 'contacted', 'done', 'rejected'].includes(a.st)) return { ok: false, code: 'bad_status' };
  await db.prepare('update mat_submissions set status = ?, note = ? where id = ?').bind(a.st, a.note == null ? null : String(a.note).slice(0, 300), a.sid).run();
  return { ok: true };
};

// ---------------------------------------------------------------- public browsing (NO login needed)
// Only these fields are ever shown to the public. Never: phone, e-mail, date of birth, income, parents' names,
// native place, family notes, district, horoscope. Photos of admin-listed profiles are visible to everyone (owner's decision).
const PUBLIC_FIELDS = ['name', 'gender', 'height_cm', 'religion', 'community', 'community_other', 'kulam', 'gotra', 'mother_tongue', 'star', 'raasi', 'dosham', 'marital',
  'diet', 'education', 'education_detail', 'occupation', 'employer_type', 'city', 'state', 'father_occ', 'mother_occ', 'brothers', 'sisters', 'family_type', 'family_status', 'about'];

// photos of admin-listed public sign-ups are visible to everyone (owner's decision); the admin approves the listing
async function canSeePhotos() { return true; }

function publicShape(id, d, created, photos, see) {
  const out = { id, code: String(id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase(), age: age(validDate(d.dob)), created_at: created };
  for (const k of PUBLIC_FIELDS) if (d[k] != null && d[k] !== '') out[k] = d[k];
  out.photo_count = photos.length;
  if (see && photos.length) { out.photo = photos[0]; out.photos = photos; }
  return out;
}

// Only public sign-ups that the admin has listed. (Member-account profiles agreed to be seen by approved members only, so they are NOT shown here.)
async function publicRows(db, see) {
  const subs = await db.prepare("select id, data, photos, created_at from mat_submissions where listed = 1 and status <> 'rejected' order by created_at desc limit 500").all();
  return subs.results.map((s) => publicShape(s.id, safeParse(s.data, {}), s.created_at, safeParse(s.photos, []), see));
}

F.mat_public_list = async (db, uid, a) => {
  const f = a.f || {};
  const lim = Math.min(Math.max(parseInt(a.lim, 10) || 12, 1), 24), off = Math.max(parseInt(a.off, 10) || 0, 0);
  const minA = parseInt(f.min_age, 10), maxA = parseInt(f.max_age, 10);
  let rows = await publicRows(db, await canSeePhotos(db, uid));
  if (f.gender === 'M' || f.gender === 'F') rows = rows.filter((r) => r.gender === f.gender);
  if (f.community) rows = rows.filter((r) => r.community === f.community);
  if (f.state) rows = rows.filter((r) => r.state === f.state);
  if (f.marital) rows = rows.filter((r) => r.marital === f.marital);
  if (minA) rows = rows.filter((r) => r.age != null && r.age >= minA);
  if (maxA) rows = rows.filter((r) => r.age != null && r.age <= maxA);
  return { ok: true, total: rows.length, items: rows.slice(off, off + lim) };
};

async function findPublic(db, see, id) {
  const s = await db.prepare("select id, data, photos, created_at from mat_submissions where id = ? and listed = 1 and status <> 'rejected'").bind(String(id)).first();
  return s ? publicShape(s.id, safeParse(s.data, {}), s.created_at, safeParse(s.photos, []), see) : null;
}

F.mat_public_profile = async (db, uid, a) => {
  const p = await findPublic(db, await canSeePhotos(db, uid), a.id);
  return p ? { ok: true, profile: p } : { ok: false, code: 'not_found' };
};

// a visitor asks the administrator to arrange contact (the admin phones both families)
F.mat_request_contact = async (db, uid, a) => {
  const target = await findPublic(db, false, a.target);
  if (!target) return { ok: false, code: 'not_found' };
  const nm = String(a.name ?? '').trim();
  if ([...nm].length < 2 || [...nm].length > 60) return { ok: false, code: 'name' };
  const dig = lastDigits(a.phone);
  if (dig.length < 10) return { ok: false, code: 'phone' };
  const note = trimOrNull(a.note);
  if (note && [...note].length > 300) return { ok: false, code: 'note' };
  const recent = (await db.prepare('select from_phone from mat_contact_requests where created_at > ?').bind(addSeconds(-86400)).all()).results;
  const lastHour = await db.prepare('select count(*) as n from mat_contact_requests where created_at > ?').bind(addSeconds(-3600)).first();
  if (recent.filter((r) => lastDigits(r.from_phone) === dig).length >= 5 || lastHour.n >= 200) return { ok: false, code: 'rate_limited' };
  await db.prepare('insert into mat_contact_requests (id, target_id, target_name, from_name, from_phone, note) values (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), String(a.target), target.name, nm, String(a.phone).trim().slice(0, 20), note).run();
  return { ok: true };
};

F.mat_admin_contact_requests = async (db, uid, a) => {
  if (!(await adminOnly(db, uid))) return { ok: false, code: 'forbidden' };
  const rows = (await db.prepare('select * from mat_contact_requests where status = ? order by created_at desc limit 200').bind(a.st || 'new').all()).results;
  const items = [];
  for (const r of rows) {
    let phone = null, email = null;
    const s = await db.prepare('select phone, email from mat_submissions where id = ?').bind(r.target_id).first();
    if (s) { phone = s.phone; email = s.email; } else {
      const v = await db.prepare('select phone, email from mat_private where user_id = ?').bind(r.target_id).first();
      if (v) { phone = v.phone; email = v.email; }
    }
    items.push({ ...r, target_phone: phone, target_email: email, code: String(r.target_id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() });
  }
  return { ok: true, items };
};

F.mat_admin_contact_request_set = async (db, uid, a) => {
  if (!(await adminOnly(db, uid))) return { ok: false, code: 'forbidden' };
  if (!['new', 'done'].includes(a.st)) return { ok: false, code: 'bad_status' };
  await db.prepare('update mat_contact_requests set status = ? where id = ?').bind(a.st, a.rid).run();
  return { ok: true };
};

F.mat_admin_submission_list = async (db, uid, a) => {
  if (!(await adminOnly(db, uid))) return { ok: false, code: 'forbidden' };
  await db.prepare('update mat_submissions set listed = ? where id = ?').bind(a.on === false || a.on === 'false' ? 0 : 1, a.sid).run();
  return { ok: true };
};

const PUBLIC = new Set(['mat_public_stats', 'mat_submit_public', 'mat_public_list', 'mat_public_profile', 'mat_request_contact']);

export async function matRpc(env, uid, name, args) {
  const fn = Object.prototype.hasOwnProperty.call(F, name) ? F[name] : null;
  if (!fn) return { ok: false, code: 'not_installed' };
  if (!uid && !PUBLIC.has(name) && name !== 'mat_my_profile' && name !== 'mat_counts') return { ok: false, code: 'not_logged_in' };
  try {
    return await fn(env.DB, uid, args || {}, env);
  } catch (e) {
    if (e instanceof Code) return { ok: false, code: e.message };
    return { ok: false, code: 'error', message: e.message };
  }
}

// called ONLY by the Cloud Run server (internal key) after Razorpay confirms the chat-unlock payment
export async function matRecordUnlock(env, a) {
  const db = env.DB;
  if (!(await accepted(db, a.a, a.b))) return { ok: false, code: 'not_accepted' };
  await db.batch([
    db.prepare('insert or ignore into mat_unlocks (user_a, user_b, paid_by, order_id, payment_id, amount_paise) values (?, ?, ?, ?, ?, ?)')
      .bind(pairA(a.a, a.b), pairB(a.a, a.b), a.payer, a.p_order, a.p_payment, a.p_amount),
    db.prepare("update mat_orders set status = 'paid' where order_id = ?").bind(a.p_order),
  ]);
  return { ok: true };
}
