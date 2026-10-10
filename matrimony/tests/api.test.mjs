import crypto from 'crypto'; import express from 'express';
process.env.RAZORPAY_KEY_SECRET = 'sekret'; process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
const { registerMatrimonyRoutes, verifySignature, matrimonyOnCaptured, MATRIMONY_FEE_PAISE } = await import('../../matrimony-api.js');
let bad = 0, n = 0; const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
const A = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222';
const db = { profiles: [{ user_id: A, status: 'approved' }, { user_id: B, status: 'approved' }], accepted: true, unlocked: false, blocked: false, orders: [], rpcs: [] };
// minimal chainable supabase mock
function from(t) {
  const q = { t, filters: {}, _ins: null };
  const api = {
    select() { return api; }, in() { return api; }, eq(k, v) { q.filters[k] = v; return api; }, or() { return api; },
    insert(row) { if (t === 'mat_orders') db.orders.push(row); return Promise.resolve({ error: null }); },
    maybeSingle() { return Promise.resolve({ data: db.orders.find(o => o.order_id === q.filters.order_id && (!q.filters.user_id || o.user_id === q.filters.user_id)) || null }); },
    then(res) {
      const d = t === 'mat_profiles' ? db.profiles : t === 'mat_interests' ? (db.accepted ? [{ id: 1 }] : []) : t === 'mat_unlocks' ? (db.unlocked ? [{}] : []) : t === 'mat_blocks' ? (db.blocked ? [{}] : []) : [];
      return Promise.resolve({ data: d }).then(res);
    }
  };
  return api;
}
const supabase = { from, rpc: async (fn, args) => { db.rpcs.push([fn, args]); return { data: { ok: true }, error: null }; } };
const razorpay = { orders: { create: async (o) => ({ id: 'order_' + Math.random().toString(36).slice(2, 8), amount: o.amount, currency: 'INR', _o: o }) } };
const app = express(); app.use(express.json());
const requireAuth = (req, res, next) => { const u = req.headers['x-user']; if (!u) return res.status(401).json({ error: 'login' }); req.user = { id: u }; next(); };
registerMatrimonyRoutes(app, { supabase, razorpay, requireAuth });
const srv = app.listen(0); const base = 'http://127.0.0.1:' + srv.address().port;
const post = async (p, body, u = A) => { const r = await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', ...(u ? { 'x-user': u } : {}) }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json() }; };

ok(MATRIMONY_FEE_PAISE === 5000, 'fee is Rs 50');
ok((await post('/api/matrimony/create-order', { other_id: B }, null)).s === 401, 'login required');
ok((await post('/api/matrimony/create-order', { other_id: 'bad' })).s === 400, 'bad id');
ok((await post('/api/matrimony/create-order', { other_id: A })).s === 400, 'self');
db.accepted = false; ok((await post('/api/matrimony/create-order', { other_id: B })).s === 403, 'needs accepted interest'); db.accepted = true;
db.blocked = true; ok((await post('/api/matrimony/create-order', { other_id: B })).s === 403, 'blocked refused'); db.blocked = false;
db.profiles[1].status = 'pending'; ok((await post('/api/matrimony/create-order', { other_id: B })).s === 403, 'unapproved refused'); db.profiles[1].status = 'approved';
db.unlocked = true; ok((await post('/api/matrimony/create-order', { other_id: B })).j.unlocked === true, 'already unlocked -> no charge'); db.unlocked = false;
const o = await post('/api/matrimony/create-order', { other_id: B });
ok(o.s === 200 && o.j.amount === 5000 && o.j.orderId && o.j.keyId === 'rzp_test_x' && db.orders.length === 1, 'order created for Rs 50');
const sign = (oid, pid, s = 'sekret') => crypto.createHmac('sha256', s).update(oid + '|' + pid).digest('hex');
ok((await post('/api/matrimony/verify', { razorpay_order_id: o.j.orderId, razorpay_payment_id: 'pay_1', razorpay_signature: 'deadbeef' })).s === 400, 'bad signature refused');
ok(db.rpcs.length === 0, 'nothing unlocked by a bad signature');
ok((await post('/api/matrimony/verify', { razorpay_order_id: o.j.orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(o.j.orderId, 'pay_1', 'wrong') })).s === 400, 'wrong secret refused');
ok((await post('/api/matrimony/verify', { razorpay_order_id: o.j.orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(o.j.orderId, 'pay_1') }, B)).s === 404, "other user cannot claim someone else's order");
const v = await post('/api/matrimony/verify', { razorpay_order_id: o.j.orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(o.j.orderId, 'pay_1') });
ok(v.s === 200 && db.rpcs.length === 1 && db.rpcs[0][0] === 'mat_record_unlock' && db.rpcs[0][1].p_amount === 5000, 'valid signature unlocks');
ok(verifySignature('o', 'p', sign('o', 'p'), 'sekret') && !verifySignature('o', 'p', '', 'sekret') && !verifySignature('o', 'p', sign('o', 'p'), ''), 'verifySignature unit');
ok(await matrimonyOnCaptured(supabase, { notes: { app: 'matrimony' }, order_id: o.j.orderId, id: 'pay_1', amount: 5000 }) === true && db.rpcs.length === 2, 'webhook path unlocks');
ok(await matrimonyOnCaptured(supabase, { notes: { app: 'matrimony' }, order_id: o.j.orderId, id: 'pay_2', amount: 100 }) === true && db.rpcs.length === 2, 'webhook amount mismatch ignored');
ok(await matrimonyOnCaptured(supabase, { notes: {}, order_id: 'x', id: 'p', amount: 1 }) === false, 'non-matrimony payments untouched');
srv.close(); console.log(`matrimony-api: ${n} checks, ${bad} failed`); process.exit(bad ? 1 : 0);
