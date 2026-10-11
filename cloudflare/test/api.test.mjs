// /cfapi/api/* against a running Worker, with Gemini/NVIDIA/Razorpay/Astrologer replaced by test/mock-upstream.mjs
// (the local .dev.vars point *_API_BASE at http://127.0.0.1:8790 — see README "Local development / tests").
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { startMock, calls, behaviour, deleted } from './mock-upstream.mjs';

const API = process.env.API || 'http://127.0.0.1:8787/cfapi';
const IKEY = process.env.INTERNAL_KEY || 'int-key-456';
const RZP_SECRET = 'rzp-secret', WEBHOOK_SECRET = 'whsec';
const run = Math.random().toString(36).slice(2, 8);
let mock;
before(async () => { mock = await startMock(8790); });
after(() => mock.close());

async function call(path, { method = 'POST', body, token, headers = {}, form, raw } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = 'Bearer ' + token;
  let payload;
  if (form) payload = form;
  else if (raw !== undefined) payload = raw;
  else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(API + path, { method, headers: h, body: payload });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  return { s: r.status, j };
}
const sql = (statements) => call('/internal/sql', { body: { statements }, headers: { 'X-Internal-Key': IKEY } }).then((r) => r.j);
async function user(name) {
  const email = `${name}.${run}@test.in`;
  const o = await call('/auth/v1/otp', { body: { email } });
  return (await call('/auth/v1/verify', { body: { email, token: o.j.dev_code } })).j;
}
const credits = async (u) => (await call('/api/me', { method: 'GET', token: u.access_token })).j.credits;
const setCredits = (u, n) => sql([{ sql: 'update profiles set credits = ? where id = ?', params: [n, u.user.id] }]);

test('profile, pricing, credits, Pro users, redeem codes', async () => {
  const u = await user('cred');
  assert.equal((await call('/api/me', { method: 'GET' })).s, 401);
  const me = await call('/api/me', { method: 'GET', token: u.access_token });
  assert.equal(me.j.credits, 5);
  assert.equal(me.j.plan, 'free');
  const pricing = await call('/api/pricing', { method: 'GET' });
  assert.deepEqual(pricing.j.map((p) => p.id), ['credits_20', 'pro_monthly', 'credits_100', 'pro_yearly', 'business']);
  assert.equal((await call('/api/credits/use', { body: { toolId: 't', cost: 3, checkOnly: true }, token: u.access_token })).s, 200);
  assert.equal((await call('/api/credits/use', { body: { toolId: 't', cost: 3 }, token: u.access_token })).s, 200);
  assert.equal((await call('/api/credits/use', { body: { toolId: 't', cost: 3 }, token: u.access_token })).s, 402);
  assert.equal(await credits(u), 2);
  await sql([{ sql: "update profiles set plan = 'pro', plan_expires_at = ? where id = ?", params: [new Date(Date.now() + 86400e3).toISOString(), u.user.id] }]);
  assert.equal((await call('/api/credits/use', { body: { toolId: 't', cost: 50 }, token: u.access_token })).s, 200, 'Pro: unlimited');
  assert.equal(await credits(u), 2);
  await sql([{ sql: "update profiles set plan = 'free', plan_expires_at = null where id = ?", params: [u.user.id] }]);

  const code = 'GIFT' + run.toUpperCase();
  await sql([{ sql: 'insert into redeem_codes (code, credits, max_uses) values (?, 10, 1)', params: [code] }]);
  const r = await call('/api/redeem', { body: { code: code.toLowerCase() }, token: u.access_token });
  assert.deepEqual(r.j, { ok: true, creditsAdded: 10 });
  assert.match((await call('/api/redeem', { body: { code }, token: u.access_token })).j.error, /already/);
  assert.match((await call('/api/redeem', { body: { code: 'NOPE' }, token: u.access_token })).j.error, /Invalid/);
  const u2 = await user('cred2');
  assert.match((await call('/api/redeem', { body: { code }, token: u2.access_token })).j.error, /Invalid/, 'max_uses reached');
  assert.equal(await credits(u), 12);
});

test('AI tools: charge, call the model, refund on failure', async () => {
  const u = await user('ai');
  // image question (multipart) -> Gemini gets the file as base64
  const fd = new FormData();
  fd.append('question', 'What is this?');
  fd.append('toolId', 'askai');
  fd.append('file', new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/png' }), 'x.png');
  const a = await call('/api/ai/ask', { form: fd, token: u.access_token });
  assert.equal(a.s, 200, JSON.stringify(a.j));
  assert.equal(a.j.answer, 'saw image/png ' + Buffer.from([1, 2, 3, 250]).toString('base64'));
  assert.equal(await credits(u), 3, 'askai costs 2');
  // a 1.2 MB photo is streamed to the Gemini Files API (no base64 in the Worker), then deleted
  const big = new Uint8Array(1200 * 1024).fill(42); big[0] = 255;
  const fdBig = new FormData(); fdBig.append('question', 'big'); fdBig.append('toolId', 'ocr');
  fdBig.append('file', new Blob([big], { type: 'image/jpeg' }), 'big.jpg');
  const bigRes = await call('/api/ai/ask', { form: fdBig, token: u.access_token });
  assert.equal(bigRes.j.answer, `file image/jpeg ${big.length} bytes (first 255)`);
  assert.deepEqual(deleted, ['/v1beta/files/f0']);
  await setCredits(u, 3);
  // ocr upgrade path costs 1
  const fd2 = new FormData(); fd2.append('question', 'read'); fd2.append('toolId', 'ocr');
  assert.equal((await call('/api/ai/ask', { form: fd2, token: u.access_token })).s, 200);
  assert.equal(await credits(u), 2);
  // model down -> credits come back
  behaviour.geminiFail = true;
  const fd3 = new FormData(); fd3.append('question', 'x'); fd3.append('toolId', 'askai');
  const f = await call('/api/ai/ask', { form: fd3, token: u.access_token });
  behaviour.geminiFail = false;
  assert.equal(f.s, 502);
  assert.equal(await credits(u), 2, 'refunded');
  // NVIDIA text
  const t = await call('/api/ai/text', { body: { instruction: 'Summarize', text: 'long report', toolId: 'aisummarize' }, token: u.access_token });
  assert.equal(t.j.answer, 'nvidia: Summarize\n\n---\nDocument conten');
  assert.equal(await credits(u), 1);
  assert.equal((await call('/api/ai/text', { body: { instruction: ' ' }, token: u.access_token })).s, 400);
  // not enough credits
  assert.equal((await call('/api/ai/text', { body: { instruction: 'x', creditCost: 5 }, token: u.access_token })).s, 402);
  // image generation needs the Workers AI binding (not available in local tests) -> clear error, no charge
  assert.equal((await call('/api/ai/image', { body: { prompt: 'a cat' }, token: u.access_token })).s, 501);
  assert.equal(await credits(u), 1);
  // video Fast Server Mode is retired
  assert.equal((await call('/api/video/compress', { form: new FormData(), token: u.access_token })).s, 410);
});

const sign = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');

test('payments: order, verify signature, webhook credits exactly once, plans', async () => {
  const u = await user('pay');
  const o = await call('/api/payment/create-order', { body: { planId: 'credits_20' }, token: u.access_token });
  assert.equal(o.s, 200, JSON.stringify(o.j));
  assert.equal(o.j.amount, 4900);
  const rz = calls.filter((c) => c.url === '/v1/orders').pop();
  assert.equal(rz.headers.authorization, 'Basic ' + Buffer.from('rzp_test_key:' + RZP_SECRET).toString('base64'));
  assert.equal((await call('/api/payment/create-order', { body: { planId: 'nope' }, token: u.access_token })).s, 400);
  // bad signature
  assert.equal((await call('/api/payment/verify', { body: { razorpay_order_id: o.j.orderId, razorpay_payment_id: 'pay_1', razorpay_signature: 'bad' }, token: u.access_token })).s, 400);
  // webhook twice -> +20 once
  const ev = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_' + run, order_id: o.j.orderId, amount: 4900, notes: {} } } } });
  assert.equal((await call('/api/payment/webhook', { raw: ev, headers: { 'x-razorpay-signature': 'nope' } })).s, 400);
  for (let i = 0; i < 2; i++) assert.equal((await call('/api/payment/webhook', { raw: ev, headers: { 'x-razorpay-signature': sign(WEBHOOK_SECRET, ev), 'Content-Type': 'application/json' } })).s, 200);
  assert.equal(await credits(u), 25);
  // verify after webhook = already credited
  const v = await call('/api/payment/verify', { body: { razorpay_order_id: o.j.orderId, razorpay_payment_id: 'pay_' + run, razorpay_signature: sign(RZP_SECRET, o.j.orderId + '|pay_' + run) }, token: u.access_token });
  assert.deepEqual(v.j, { ok: true, already: true });
  // plan purchase through verify
  const o2 = await call('/api/payment/create-order', { body: { planId: 'pro_monthly' }, token: u.access_token });
  const v2 = await call('/api/payment/verify', { body: { razorpay_order_id: o2.j.orderId, razorpay_payment_id: 'pay2_' + run, razorpay_signature: sign(RZP_SECRET, o2.j.orderId + '|pay2_' + run) }, token: u.access_token });
  assert.deepEqual(v2.j, { ok: true, already: false });
  const me = (await call('/api/me', { method: 'GET', token: u.access_token })).j;
  assert.equal(me.plan, 'pro');
  assert.ok(me.plan_expires_at > new Date(Date.now() + 29 * 86400e3).toISOString());
  // someone else cannot claim this order
  const other = await user('pay2');
  assert.equal((await call('/api/payment/verify', { body: { razorpay_order_id: o2.j.orderId, razorpay_payment_id: 'pay2_' + run, razorpay_signature: sign(RZP_SECRET, o2.j.orderId + '|pay2_' + run) }, token: other.access_token })).s, 404);
});

test('matrimony: chat unlock payment + AI horoscope reading', async () => {
  const a = await user('ma'), b = await user('mb');
  const prof = (n, g, d) => ({ p: { name: n, gender: g, dob: d, community: 'x', consent: true } });
  for (const [u, n, g, d] of [[a, 'Arun', 'M', '1994-01-01'], [b, 'Banu', 'F', '1996-01-01']]) {
    await call('/mat/rpc/mat_save_profile', { body: prof(n, g, d), token: u.access_token });
    await sql([{ sql: "update mat_profiles set status = 'approved' where user_id = ?", params: [u.user.id] }]);
  }
  assert.equal((await call('/api/matrimony/create-order', { body: { other_id: b.user.id }, token: a.access_token })).s, 403, 'needs accepted interest');
  await call('/mat/rpc/mat_send_interest', { body: { pid: b.user.id }, token: a.access_token });
  await call('/mat/rpc/mat_send_interest', { body: { pid: a.user.id }, token: b.access_token }); // mutual -> accepted
  const o = await call('/api/matrimony/create-order', { body: { other_id: b.user.id }, token: a.access_token });
  assert.equal(o.s, 200, JSON.stringify(o.j));
  assert.equal(o.j.amount, 5000);
  assert.equal((await call('/api/matrimony/verify', { body: { razorpay_order_id: o.j.orderId, razorpay_payment_id: 'mp_' + run, razorpay_signature: 'bad' }, token: a.access_token })).s, 400);
  const v = await call('/api/matrimony/verify', { body: { razorpay_order_id: o.j.orderId, razorpay_payment_id: 'mp_' + run, razorpay_signature: sign(RZP_SECRET, o.j.orderId + '|mp_' + run) }, token: a.access_token });
  assert.deepEqual(v.j, { ok: true });
  const un = await sql([{ sql: 'select amount_paise, paid_by from mat_unlocks where payment_id = ?', params: ['mp_' + run] }]);
  assert.deepEqual(un.results[0][0], { amount_paise: 5000, paid_by: a.user.id });
  assert.equal((await call('/api/matrimony/create-order', { body: { other_id: b.user.id }, token: a.access_token })).j.unlocked, true, 'already unlocked -> no second charge');

  // horoscope -> fields (phone number from the AI is dropped), 2 credits
  const fd = new FormData();
  fd.append('file', new Blob([new Uint8Array([9, 9, 9])], { type: 'image/jpeg' }), 'j.jpg');
  const j = await call('/api/matrimony/jathagam-extract', { form: fd, token: a.access_token });
  assert.equal(j.s, 200, JSON.stringify(j.j));
  assert.deepEqual(j.j.fields, { name: 'Kavya R', gender: 'F', dob: '1999-04-12', star: 'rohini', raasi: 'rishabam' });
  assert.equal(await credits(a), 3);
  const bad = new FormData(); bad.append('file', new Blob(['x'], { type: 'text/plain' }), 'a.txt');
  assert.equal((await call('/api/matrimony/jathagam-extract', { form: bad, token: a.access_token })).s, 400);
});

test('Astrology+: birth chart, porutham, AI reading', async () => {
  const u = await user('astro');
  await setCredits(u, 60);
  const c = await call('/api/astrology/calculate', { body: { dateOfBirth: '1990-05-10', timeOfBirth: '06:30', coordinates: '11.66, 78.14', name: 'R' }, token: u.access_token });
  assert.equal(c.s, 200, JSON.stringify(c.j));
  assert.equal(c.j.verified, true);
  assert.deepEqual(c.j.nakshatra, { en: 'Rohini', ta: 'ரோகிணி', pada: 2 });
  assert.equal(c.j.lagna, 'Leo');
  assert.deepEqual(c.j.rasi, { Aries: ['Sun'], Taurus: ['Moon'], Capricorn: ['Mars (R)'] });
  assert.equal(c.j.transit, 'Sun transiting Libra');
  assert.match(c.j.chartSummaryForAI, /Moon Nakshatra: Rohini pada 2/);
  assert.equal(await credits(u), 58);
  const missing = await call('/api/astrology/calculate', { body: { dateOfBirth: '1990-05-10' }, token: u.access_token });
  assert.equal(missing.s, 400);
  assert.equal(await credits(u), 58, 'refunded when input is incomplete');
  const p = await call('/api/astrology/calculate', { body: { mode: 'porutham', bride: { dob: '1995-01-01', tob: '10:00', coords: '11,78' }, groom: { dob: '1992-01-01', tob: '11:00', coords: '11,78' } }, token: u.access_token });
  assert.equal(p.j.porutham.total, 10);
  assert.equal(await credits(u), 54);
  const ai = await call('/api/claude/analyze', { body: { question: 'Career?', chartContext: { outputLanguage: 'ta', chartSummaryForAI: 'x' } }, token: u.access_token });
  assert.match(ai.j.answer, /^answer to: You are an expert Vedic astrologer/);
  assert.equal(await credits(u), 52);
  await setCredits(u, 10);
  const combo = await call('/api/claude/analyze', { body: { question: 'Career? Marriage?' }, token: u.access_token });
  assert.equal(combo.s, 402, 'multi-part question costs 50');
});

test('promotion agent: admin-only, AI post to Telegram, picture fallback, rotation, off switch', async () => {
  const u = await user('promo-user');
  assert.equal((await call('/promo/status', { method: 'GET', token: u.access_token })).s, 403);
  assert.equal((await call('/promo/run', { body: {} })).s, 403);
  const a = await user('promo-admin');
  await sql([{ sql: 'insert into mat_admins (user_id) values (?)', params: [a.user.id] }, { sql: 'delete from promo_posts' }, { sql: "update promo_settings set value = 'on' where key = 'enabled'" }]);
  const st = (await call('/promo/status', { method: 'GET', token: a.access_token })).j;
  assert.equal(st.enabled, true);
  assert.deepEqual(st.platforms, [{ name: 'telegram', ready: true }]);
  assert.ok(st.tools > 100);

  const n0 = calls.length;
  const r1 = (await call('/promo/run', { body: {}, token: a.access_token })).j;
  assert.equal(r1.ok, true);
  assert.equal(r1.tool, 'merge', 'first never-posted free tool');
  const tg = calls.slice(n0).find((c) => c.url === '/botTG-TOKEN/sendPhoto');
  assert.equal(tg.body.chat_id, '@test');
  assert.equal(tg.body.photo, 'https://pdftoolsindia.com/images/tools/merge.jpg');
  assert.match(tg.body.caption, /தமிழ் பதிவு &lt;b&gt;சோதனை&lt;\/b&gt;/, 'AI text is escaped');
  assert.match(tg.body.caption, /English post/);
  assert.equal(tg.body.reply_markup.inline_keyboard[0][0].url, 'https://pdftoolsindia.com/tools/merge-pdf');

  behaviour.telegramPhotoFail = true;
  const n1 = calls.length;
  const r2 = (await call('/promo/run', { body: {}, token: a.access_token })).j;
  behaviour.telegramPhotoFail = false;
  assert.equal(r2.ok, true);
  assert.notEqual(r2.tool, 'merge', 'rotates to the next tool');
  assert.ok(calls.slice(n1).some((c) => c.url === '/botTG-TOKEN/sendMessage'), 'falls back to a text message');

  behaviour.geminiFail = true;
  const r3 = (await call('/promo/run', { body: { tool: 'tneacutoff' }, token: a.access_token })).j;
  behaviour.geminiFail = false;
  assert.equal(r3.ok, true, 'AI down -> template post still goes out');

  // off switch stops the daily cron run
  assert.equal((await call('/promo/enabled', { body: { on: false }, token: a.access_token })).j.enabled, false);
  const n2 = calls.length;
  await fetch(API.replace(/\/cfapi$/, '') + '/__scheduled?cron=35+3+*+*+*');
  await new Promise((r) => setTimeout(r, 800));
  assert.equal(calls.slice(n2).filter((c) => c.url.startsWith('/botTG-TOKEN/')).length, 0);
  await call('/promo/enabled', { body: { on: true }, token: a.access_token });
  const n3 = calls.length;
  await fetch(API.replace(/\/cfapi$/, '') + '/__scheduled?cron=35+3+*+*+*');
  await new Promise((r) => setTimeout(r, 1500));
  assert.equal(calls.slice(n3).filter((c) => c.url.startsWith('/botTG-TOKEN/')).length, 1, 'cron posts once when on');
  const recent = (await call('/promo/status', { method: 'GET', token: a.access_token })).j.recent;
  assert.equal(recent.length, 4);
  assert.ok(recent.every((x) => x.status === 'sent'));
});

test('health check AI: red flags skip AI, vetted remedies only, 2 credits, refund on failure', async () => {
  const u = await user('health');
  await setCredits(u, 10);
  const red = await call('/api/ai/health', { body: { lang: 'ta', redFlags: ['chest pain'], complaint: 'x' }, token: u.access_token });
  assert.equal(red.j.result.urgency, 'emergency');
  assert.equal(await credits(u), 10, 'emergency answer is free and needs no AI');
  const r = await call('/api/ai/health', { body: { lang: 'en', redFlags: [], complaint: 'Fever', profile: { age: 30 }, context: {} }, token: u.access_token });
  assert.equal(r.s, 200);
  assert.equal(r.j.result.urgency, 'see_doctor_soon');
  assert.deepEqual(r.j.result.siddha_remedies.map((x) => x.name), ['Nilavembu kudineer'], 'unknown remedies are dropped');
  assert.match(r.j.result.siddha_remedies[0].caution, /pregnancy/);
  assert.deepEqual(r.j.result.self_care, ['rest']);
  assert.deepEqual(r.j.result.possible_causes[1], { cause: 'x', likelihood: 'medium', angle: 'other', why: '' });
  assert.equal(await credits(u), 8);
  behaviour.geminiFail = true;
  const bad = await call('/api/ai/health', { body: { lang: 'ta', complaint: 'Fever' }, token: u.access_token });
  behaviour.geminiFail = false;
  assert.equal(bad.s, 502);
  assert.equal(await credits(u), 8, 'refunded');
  assert.equal((await call('/api/ai/health', { body: { complaint: 'x' } })).s, 401);
});
