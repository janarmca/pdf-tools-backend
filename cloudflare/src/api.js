// /cfapi/api/* — everything the old Google Cloud Run server did, now on the free Workers plan:
// profile & credits, promo codes, Razorpay payments (+ webhook), AI tools (Gemini, NVIDIA, Workers AI),
// Astrology+, and the matrimony chat-unlock payment + horoscope reading.
// The server-side video "Fast Server Mode" (native ffmpeg) is retired: video tools run free in the browser.
import { Buffer } from 'node:buffer';
import { json, err, readJson, now, userFromRequest, rateLimit, safeEqual, clientIp } from './util.js';
import {
  astrologerCall, toSubject, buildRasiFromSubject, calcNakshatra, calculatePorutham, buildNavamsaFromSubject, SIGN_NAME_MAP,
} from './astro.js';
import { matRecordUnlock } from './mat.js';
import { prepareImagePrompt } from './imgprompt.js';
import { clampText, planProviders, runWithFallback, TRUNC_NOTE } from './aitext.js';

const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const NVIDIA_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';
const NO_CREDITS = 'Not enough credits — please buy more or upgrade to Pro.';
const MAX_UPLOAD = 15 * 1024 * 1024;
// upstream base URLs (overridable only so the test suite can point them at a local mock)
const base = (env, k, d) => env[k] || d;

// ---------------------------------------------------------------- credits
const IS_PRO = (n) => `(plan in ('pro','business') and (plan_expires_at is null or plan_expires_at > ?${n}))`;

// atomic: the UPDATE only succeeds when enough credits are left. Pro/Business users are never charged (logged as 0).
export async function deductCredits(env, uid, amount, toolId) {
  const db = env.DB, ts = now();
  const taken = await db.prepare(`update profiles set credits = credits - ?2 where id = ?1 and credits >= ?2 and not ${IS_PRO(3)} returning credits`).bind(uid, amount, ts).first();
  if (taken) {
    await db.prepare('insert into usage_logs (user_id, tool_id, credits_used) values (?, ?, ?)').bind(uid, toolId, amount).run();
    return true;
  }
  const pro = await db.prepare(`select 1 as ok from profiles where id = ?1 and ${IS_PRO(2)}`).bind(uid, ts).first();
  if (!pro) return false;
  await db.prepare('insert into usage_logs (user_id, tool_id, credits_used) values (?, ?, 0)').bind(uid, toolId).run();
  return true;
}

// gives credits back after a paid operation failed (never to Pro users — nothing was taken from them)
export async function refundCredits(env, uid, amount, toolId) {
  const db = env.DB, ts = now();
  try {
    await db.batch([
      db.prepare(`insert into usage_logs (user_id, tool_id, credits_used) select id, ?2, -?3 from profiles where id = ?1 and not ${IS_PRO(4)}`).bind(uid, toolId + '_refund', amount, ts),
      db.prepare(`update profiles set credits = credits + ?2 where id = ?1 and not ${IS_PRO(3)}`).bind(uid, amount, ts),
    ]);
  } catch (e) { console.error('refund failed', uid, toolId, e.message); }
}

// runs fn() after charging `cost`; refunds automatically if fn throws
async function charged(env, uid, cost, toolId, fn) {
  if (cost > 0 && !(await deductCredits(env, uid, cost, toolId))) return err(402, NO_CREDITS);
  try { return await fn(); } catch (e) {
    if (cost > 0) await refundCredits(env, uid, cost, toolId);
    return err(e.status || 500, e.message || 'Server error');
  }
}

const fail = (status, message) => Object.assign(new Error(message), { status });

// ---------------------------------------------------------------- helpers
async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function razorpayOrder(env, body) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw fail(500, 'Razorpay இன்னும் இணைக்கப்படவில்லை (keys இல்லை)');
  const r = await fetch(base(env, 'RAZORPAY_API_BASE', 'https://api.razorpay.com') + '/v1/orders', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw fail(502, j.error?.description || 'Razorpay order failed');
  return j;
}

async function validPaymentSignature(env, orderId, paymentId, signature) {
  if (!env.RAZORPAY_KEY_SECRET || !orderId || !paymentId || !signature) return false;
  return safeEqual(await hmacHex(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`), String(signature));
}

export async function gemini(env, parts, extra = {}) {
  if (!env.GEMINI_API_KEY) throw fail(501, 'AI feature not set up yet (GEMINI_API_KEY missing).');
  const files = parts.filter((p) => p._name).map((p) => ({ _name: p._name }));
  parts = parts.map(({ _name, ...p }) => p);
  try { return await geminiCall(env, parts, extra); } finally { await forgetFiles(env, files); }
}

async function geminiCall(env, parts, extra) {
  const r = await fetch(`${base(env, 'GEMINI_API_BASE', 'https://generativelanguage.googleapis.com')}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }], ...extra }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw fail(502, j.error?.message || 'AI request failed');
  return j.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// uploaded file -> Gemini part, within the free plan's 10 ms CPU budget:
//   small files (<= 768 KB) go inline as base64 (Buffer base64 is native, ~4.5 ms per MB);
//   bigger ones are STREAMED to the Gemini Files API (no base64 on our side) and referenced by URI.
const INLINE_MAX = 768 * 1024;

async function filePart(env, file) {
  if (file.size > MAX_UPLOAD) throw fail(413, 'File too large (max 15 MB)');
  const mime = file.type || 'image/jpeg';
  if (file.size <= INLINE_MAX) return { inline_data: { mime_type: mime, data: Buffer.from(await file.arrayBuffer()).toString('base64') } };
  const g = base(env, 'GEMINI_API_BASE', 'https://generativelanguage.googleapis.com');
  const start = await fetch(`${g}/upload/v1beta/files?key=${env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(file.size), 'X-Goog-Upload-Header-Content-Type': mime, 'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: 'upload' } }),
  });
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!start.ok || !uploadUrl) throw fail(502, 'Could not upload the file to the AI service');
  const up = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Length': String(file.size), 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' },
    body: file.stream(),
  });
  const j = await up.json().catch(() => ({}));
  if (!up.ok || !j.file?.uri) throw fail(502, 'Could not upload the file to the AI service');
  return { file_data: { mime_type: j.file.mimeType || mime, file_uri: j.file.uri }, _name: j.file.name };
}

// uploaded copies are deleted right after the answer (Gemini would otherwise keep them for 48 h)
async function forgetFiles(env, parts) {
  const g = base(env, 'GEMINI_API_BASE', 'https://generativelanguage.googleapis.com');
  for (const p of parts) {
    if (!p._name) continue;
    const name = p._name; delete p._name;
    try { await fetch(`${g}/v1beta/${name}?key=${env.GEMINI_API_KEY}`, { method: 'DELETE' }); } catch {}
  }
}

const isFile = (v) => v && typeof v === 'object' && typeof v.arrayBuffer === 'function';

// ---------------------------------------------------------------- profile, pricing, credits, redeem
async function me(env, user) {
  const [, r] = await env.DB.batch([
    env.DB.prepare('insert or ignore into profiles (id, email, credits) values (?, ?, 5)').bind(user.id, user.email || null),
    env.DB.prepare('select * from profiles where id = ?').bind(user.id),
  ]);
  return json(r.results[0]);
}

async function creditsUse(env, user, b) {
  const cost = Number(b.cost);
  if (!b.toolId || !cost || cost < 1) return err(400, 'Invalid request');
  if (b.checkOnly) {
    const p = await env.DB.prepare('select credits, plan, plan_expires_at from profiles where id = ?').bind(user.id).first();
    if (!p) return err(500, 'Profile not found — please sign in again');
    const pro = (p.plan === 'pro' || p.plan === 'business') && (!p.plan_expires_at || p.plan_expires_at > now());
    return pro || p.credits >= cost ? json({ ok: true }) : err(402, NO_CREDITS);
  }
  return (await deductCredits(env, user.id, cost, String(b.toolId))) ? json({ ok: true }) : err(402, NO_CREDITS);
}

async function redeem(env, req, user, b) {
  if (!(await rateLimit(env, 'redeem:' + user.id, 10, 3600))) return err(429, 'Too many redeem attempts — please try again later.');
  const code = String(b.code || '').trim().toUpperCase();
  if (!code) return err(400, 'Please enter a code');
  const db = env.DB, ts = now();
  const valid = 'from redeem_codes where code = ?2 and active = 1 and (expires_at is null or expires_at > ?3) and (max_uses is null or uses < max_uses)';
  const mine = 'exists (select 1 from redemptions where user_id = ?1 and code = ?2 and created_at = ?3)'; // the row THIS request inserted
  // one transaction: record the redemption (primary key = one use per person), count it, add the credits
  const r = await db.batch([
    db.prepare(`insert or ignore into redemptions (user_id, code, created_at) select ?1, code, ?3 ${valid}`).bind(user.id, code, ts),
    db.prepare(`update redeem_codes set uses = uses + 1 where code = ?2 and ${mine}`).bind(user.id, code, ts),
    db.prepare(`update profiles set credits = credits + (select credits from redeem_codes where code = ?2) where id = ?1 and ${mine}`).bind(user.id, code, ts),
    db.prepare('select credits from redeem_codes where code = ?').bind(code),
  ]);
  if (!r[0].meta.changes) {
    const used = await db.prepare('select 1 as x from redemptions where user_id = ? and code = ?').bind(user.id, code).first();
    return err(400, used ? 'You have already used this code' : 'Invalid or expired code');
  }
  return json({ ok: true, creditsAdded: r[3].results[0]?.credits || 0 });
}

// ---------------------------------------------------------------- AI
// These 7 tools cost 2 credits; other callers of /ai/ask (ocr upgrade, livetranslate, pdfeditor) stay at 1.
const RAISED_PRICE_AI_TOOLS = new Set(['askai', 'aisummarize', 'aitranslate', 'aireceipt', 'airesume', 'aiexcelcompare', 'aihandwriting']);

async function aiAsk(env, req, user) {
  const form = await req.formData();
  const toolId = String(form.get('toolId') || 'askai');
  const cost = form.get('deepAnalysis') === 'true' ? 3 : RAISED_PRICE_AI_TOOLS.has(toolId) ? 2 : 1;
  if (!env.GEMINI_API_KEY) return err(501, 'AI feature not set up yet (GEMINI_API_KEY missing).');
  const file = form.get('file');
  return charged(env, user.id, cost, toolId, async () => {
    const parts = [{ text: String(form.get('question') || 'Summarize this document and pull out any key dates, numbers, or names.') }];
    if (isFile(file)) parts.push(await filePart(env, file));
    const answer = await gemini(env, parts);
    return json({ ok: true, answer: answer || 'No answer returned.' });
  });
}

async function nvidiaText(env, content, maxTokens) {
  let r;
  try {
    r = await fetch(base(env, 'NVIDIA_API_BASE', 'https://integrate.api.nvidia.com') + '/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(45000),
      headers: { Authorization: `Bearer ${env.NVIDIA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: NVIDIA_MODEL, temperature: 0.3, max_tokens: maxTokens,
        messages: [
          { role: 'system', content: 'You are a precise, helpful assistant. Follow the instruction exactly and output only what is asked for — no preamble like "Here is the summary", no notes about what you did.' },
          { role: 'user', content },
        ],
      }),
    });
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') throw fail(504, 'The AI service took too long to respond (over 45 seconds) — please try again in a moment.');
    throw fail(502, 'Could not reach the AI service — please check your connection and try again. (' + e.message + ')');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const detail = j.error?.message || (typeof j.error === 'string' ? j.error : null) || j.message || j.detail;
    throw fail(502, detail ? `${detail} (NVIDIA HTTP ${r.status})` : `AI request failed (NVIDIA HTTP ${r.status})`);
  }
  return { text: j.choices?.[0]?.message?.content || '', truncated: j.choices?.[0]?.finish_reason === 'length' };
}

async function geminiText(env, content) {
  const text = await gemini(env, [{ text: content }], { generationConfig: { temperature: 0.3, maxOutputTokens: 8192 } });
  return { text, truncated: false };
}

async function aiText(env, user, b) {
  const toolId = String(b.toolId || 'aisummarize');
  const order = planProviders(env, toolId);
  if (!order.length) return err(501, 'AI feature not set up yet (NVIDIA_API_KEY / GEMINI_API_KEY missing).');
  // never trust the browser below 1 credit (a negative / tiny / NaN value used to make AI text free)
  const cost = Math.min(20, Math.max(1, Math.round(Number(b.creditCost) || 1)));
  const instruction = String(b.instruction || '');
  if (!instruction.trim()) return err(400, 'Missing instruction.');
  const { text, cut } = clampText(b.text);
  return charged(env, user.id, cost, toolId, async () => {
    const content = text.trim() ? `${instruction}\n\n---\nDocument content:\n${text}` : instruction;
    // translation output is as long as the input (Tamil needs many tokens per word) — the old 1500-token cap silently cut it
    const maxTokens = toolId === 'aitranslate' || toolId === 'livetranslate' ? 8192 : 3000;
    const r = await runWithFallback(order, { nvidia: (c) => nvidiaText(env, c, maxTokens), gemini: (c) => geminiText(env, c) }, content);
    let answer = r.text;
    if (r.truncated) answer += TRUNC_NOTE;
    if (cut) answer += `\n\n[Note: only the first ${Math.round(120000 / 1000)},000 characters of the document were read.]`;
    return json({ ok: true, answer });
  });
}

// Text-to-image: Workers AI (FLUX.1-schnell), free 10,000 Neurons/day. aibgreplace is advertised as free.
async function aiImage(env, user, b) {
  if (!env.AI) return err(501, 'AI image feature is not set up (Workers AI binding missing).');
  const prompt = String(b.prompt || '').trim();
  if (!prompt) return err(400, 'Prompt தேவை.');
  const toolId = String(b.toolId || 'texttoimage');
  return charged(env, user.id, toolId === 'aibgreplace' ? 0 : 5, toolId, async () => {
    const prep = await prepareImagePrompt(env, prompt); // Tamil/Hindi → English first (FLUX only understands English)
    const out = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt: prep.prompt });
    if (!out || !out.image) throw fail(502, 'Model did not return an image — try rephrasing the prompt.');
    return json({ ok: true, imageBase64: out.image, mimeType: 'image/jpeg', usedPrompt: prep.prompt, translated: prep.translated });
  });
}

// Photo → AI style (anime, 3D cartoon, Tanjore…): FLUX.2 [klein] 4B edits the user's photo (reference image ≤ 512 px,
// sent by the browser as JPEG base64). 5 credits, refunded automatically if the model fails. Prompts never name a studio or artist.
const RESTYLE = {
  anime: 'a hand-drawn Japanese anime film illustration, soft painted background, clean line art, warm light',
  cartoon3d: 'a cute 3D animated movie character render, soft studio lighting, big expressive eyes',
  comic: 'a bold comic book illustration with black ink outlines, flat colours and halftone shading',
  watercolor: 'a delicate watercolour painting on textured paper with soft colour bleeds',
  oil: 'a classic oil painting on canvas with visible brush strokes and rich colours',
  pencil: 'a detailed graphite pencil drawing on white paper with realistic shading',
  tanjore: 'a traditional South Indian Tanjore painting with rich colours, gold leaf ornaments and a decorative border',
  clay: 'a handmade clay figure (claymation) scene with soft shadows',
  pixel: 'retro 16-bit pixel art',
  popart: 'a colourful pop-art print with bold flat colours and dots',
  caricature: 'a friendly, flattering caricature drawing with a slightly larger head, clean colours',
  sticker: 'a die-cut cartoon sticker with a thick white border on a plain light background',
};
async function aiRestyle(env, user, b) {
  if (!env.AI) return err(501, 'AI image feature is not set up (Workers AI binding missing).');
  const b64 = String(b.imageBase64 || '');
  if (!b64 || b64.length > 1400000 || !/^[A-Za-z0-9+/=]+$/.test(b64)) return err(400, 'Photo missing or too large (send ≤ 512 px JPEG).');
  const style = RESTYLE[String(b.style || '')];
  const extra = String(b.prompt || '').trim().slice(0, 200);
  if (!style && !extra) return err(400, 'Choose a style.');
  const dim = (v) => Math.min(1024, Math.max(256, Math.round((Number(v) || 1024) / 16) * 16));
  const W = dim(b.width), H = dim(b.height);
  return charged(env, user.id, 5, 'aistyle', async () => {
    const extraEn = extra ? (await prepareImagePrompt(env, extra)).prompt : '';
    const prompt = `Redraw image 0 as ${style || 'an artwork'}. Keep the same people, faces, expressions, pose, clothes and composition; keep it family-friendly.${extraEn ? ' Also: ' + extraEn + '.' : ''} No text, no watermark.`;
    const bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('input_image_0', new Blob([bytes], { type: 'image/jpeg' }), 'photo.jpg');
    form.append('width', String(W));
    form.append('height', String(H));
    const fr = new Response(form); // serialises the form and gives the multipart boundary
    const out = await env.AI.run('@cf/black-forest-labs/flux-2-klein-4b', { multipart: { body: fr.body, contentType: fr.headers.get('content-type') } });
    if (!out || !out.image) throw fail(502, 'The AI did not return a picture — try another photo or style.');
    return json({ ok: true, imageBase64: out.image, style: b.style || null });
  });
}

// Text → speech (Tamil, English, Hindi … 100+ languages) with Gemini TTS. 1 credit per 1,000 characters (min 1), max 4,000.
// The audio answer is streamed straight back to the browser WITHOUT parsing it here (a minute of WAV is ~4 MB of base64 —
// JSON.parse of that would blow the free plan's 10 ms CPU). The browser finds the audio in either response shape.
const TTS_VOICES = new Set(['Kore', 'Puck', 'Charon', 'Aoede', 'Leda', 'Orus', 'Achird', 'Sulafat', 'Zephyr', 'Fenrir', 'Gacrux', 'Vindemiatrix']);
async function aiSpeech(env, user, b) {
  if (!env.GEMINI_API_KEY) return err(501, 'Text to speech is not set up yet (GEMINI_API_KEY missing).');
  const text = String(b.text || '').trim();
  if (!text) return err(400, 'Type the text to read.');
  if (text.length > 4000) return err(400, 'Please send at most 4,000 characters at a time.');
  const voice = TTS_VOICES.has(b.voice) ? b.voice : 'Kore';
  const style = String(b.style || '').trim().slice(0, 80);
  const cost = Math.max(1, Math.ceil(text.length / 1000));
  return charged(env, user.id, cost, 'texttospeech', async () => {
    const g = base(env, 'GEMINI_API_BASE', 'https://generativelanguage.googleapis.com');
    const say = style ? `Read this aloud in a ${style} voice:\n${text}` : text;
    // 1) current Interactions API
    let r = await fetch(`${g}/v1beta/interactions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({ model: env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts', input: [{ type: 'user_input', content: [{ type: 'text', text: say }] }], response_format: { type: 'audio' }, generation_config: { speech_config: [{ voice }] } }),
    });
    // 2) older generateContent shape, if the first is not available on this key/region
    if (!r.ok) {
      r = await fetch(`${g}/v1beta/models/${env.GEMINI_TTS_FALLBACK || 'gemini-2.5-flash-preview-tts'}:generateContent?key=${env.GEMINI_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: say }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }),
      });
    }
    if (!r.ok) throw fail(502, 'The voice service is busy or not available right now — your credits were returned. Please try again later.');
    return new Response(r.body, { status: 200, headers: { 'Content-Type': 'application/json', 'X-Credits-Used': String(cost) } });
  });
}

// ---------------------------------------------------------------- payments (Razorpay)
async function createOrder(env, user, b) {
  const plan = await env.DB.prepare('select * from pricing_plans where id = ?').bind(b.planId).first();
  if (!plan) return err(400, 'தவறான plan');
  try {
    const order = await razorpayOrder(env, { amount: Math.round(plan.amount_inr * 100), currency: 'INR', receipt: `rcpt_${Date.now().toString(36)}`, notes: { user_id: user.id, plan_id: plan.id } });
    await env.DB.prepare("insert into transactions (user_id, razorpay_order_id, amount_inr, credits_purchased, plan_purchased, status) values (?, ?, ?, ?, ?, 'created')")
      .bind(user.id, order.id, plan.amount_inr, plan.credits, plan.plan).run();
    return json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: env.RAZORPAY_KEY_ID });
  } catch (e) { return err(e.status || 500, e.message); }
}

// marks a transaction paid + credits the user — guarded by status = 'created', so it runs once even if /verify and the webhook both fire
async function markPaidAndCredit(env, txn, paymentId) {
  const db = env.DB;
  const updated = await db.prepare("update transactions set status = 'paid', razorpay_payment_id = ? where id = ? and status = 'created' returning id").bind(paymentId, txn.id).first();
  if (!updated) return { already: true };
  if (txn.credits_purchased) {
    await db.prepare('update profiles set credits = credits + ? where id = ?').bind(txn.credits_purchased, txn.user_id).run();
  } else if (txn.plan_purchased) {
    const plan = await db.prepare('select duration_days from pricing_plans where plan = ? limit 1').bind(txn.plan_purchased).first();
    const expires = new Date(Date.now() + (plan?.duration_days || 30) * 86400000).toISOString();
    await db.prepare('update profiles set plan = ?, plan_expires_at = ? where id = ?').bind(txn.plan_purchased, expires, txn.user_id).run();
  }
  return { already: false };
}

async function verifyPayment(env, user, b) {
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = b;
  if (!oid || !pid || !sig) return err(400, 'Payment details missing');
  if (!(await validPaymentSignature(env, oid, pid, sig))) return err(400, 'கையொப்பம் பொருந்தவில்லை (invalid signature) — இது போலியான payment ஆக இருக்கலாம்.');
  const txn = await env.DB.prepare('select * from transactions where razorpay_order_id = ? and user_id = ?').bind(oid, user.id).first();
  if (!txn) return err(404, 'Transaction record கிடைக்கவில்லை');
  return json({ ok: true, ...(await markPaidAndCredit(env, txn, pid)) });
}

// Razorpay Dashboard → Webhooks → https://pdftoolsindia.com/cfapi/api/payment/webhook  (event: payment.captured)
async function webhook(env, req) {
  const raw = await req.text();
  if (!env.RAZORPAY_WEBHOOK_SECRET || !safeEqual(await hmacHex(env.RAZORPAY_WEBHOOK_SECRET, raw), req.headers.get('x-razorpay-signature'))) return err(400, 'Invalid signature');
  const event = JSON.parse(raw);
  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    if (payment.notes && payment.notes.app === 'matrimony') {
      const order = await env.DB.prepare('select * from mat_orders where order_id = ?').bind(payment.order_id).first();
      if (order && Number(payment.amount) === Number(order.amount_paise)) await matFulfil(env, order, payment.id);
      return json({ ok: true });
    }
    const txn = await env.DB.prepare('select * from transactions where razorpay_order_id = ?').bind(payment.order_id).first();
    if (txn) await markPaidAndCredit(env, txn, payment.id);
  }
  return json({ ok: true });
}

// ---------------------------------------------------------------- Astrology+
async function astrologyCalculate(env, user, b) {
  const isPorutham = b.mode === 'porutham';
  const cost = isPorutham ? 4 : 2; // porutham needs 2 real birth-chart lookups
  if (!(await deductCredits(env, user.id, cost, isPorutham ? 'astrologyplus_porutham' : 'astrologyplus'))) return json({ error: NO_CREDITS, verified: false }, 402);
  const refund = () => refundCredits(env, user.id, cost, 'astrologyplus');
  try {
    if (isPorutham) {
      const pA = b.bride, pB = b.groom;
      if (!pA || !pB || !pA.dob || !pA.tob || !pA.coords || !pB.dob || !pB.tob || !pB.coords) {
        await refund();
        return json({ error: 'மணமகள் மற்றும் மணமகன் இருவருக்கும் முழு பிறந்த தேதி, நேரம், ஆயத்தொலைவுகள் தேவை.', verified: false }, 400);
      }
      const [dataA, dataB] = await Promise.all([
        astrologerCall(env, '/api/v5/chart-data/birth-chart', { subject: toSubject(pA.dob, pA.tob, pA.coords, pA.name || 'Bride', pA.timezone) }),
        astrologerCall(env, '/api/v5/chart-data/birth-chart', { subject: toSubject(pB.dob, pB.tob, pB.coords, pB.name || 'Groom', pB.timezone) }),
      ]);
      const subjA = (dataA.chart_data && dataA.chart_data.subject) || dataA.subject || dataA;
      const subjB = (dataB.chart_data && dataB.chart_data.subject) || dataB.subject || dataB;
      if (!subjA.moon || !Number.isFinite(subjA.moon.abs_pos) || !subjB.moon || !Number.isFinite(subjB.moon.abs_pos)) throw new Error('சந்திரன் நிலை கணக்கிட முடியவில்லை — பிறப்பு விவரங்களை சரிபார்க்கவும்.');
      const nakA = calcNakshatra(subjA.moon.abs_pos), nakB = calcNakshatra(subjB.moon.abs_pos);
      const signA = SIGN_NAME_MAP[subjA.moon.sign] || subjA.moon.sign, signB = SIGN_NAME_MAP[subjB.moon.sign] || subjB.moon.sign;
      const porutham = calculatePorutham({ nakshatra: nakA.en, moonSign: signA, moonDeg: subjA.moon.position }, { nakshatra: nakB.en, moonSign: signB, moonDeg: subjB.moon.position });
      return json({ verified: true, bride: { nakshatra: nakA, moonSign: signA }, groom: { nakshatra: nakB, moonSign: signB }, porutham });
    }
    if (b.mode === 'compatibility') {
      const pA = b.personA, pB = b.personB;
      if (!pA || !pB || !pA.dob || !pA.tob || !pA.coords || !pB.dob || !pB.tob || !pB.coords) {
        await refund();
        return json({ error: 'Both people need complete date, time and coordinates.', verified: false }, 400);
      }
      const data = await astrologerCall(env, '/api/v5/chart-data/synastry', {
        first_subject: toSubject(pA.dob, pA.tob, pA.coords, pA.name || 'Person A', pA.timezone),
        second_subject: toSubject(pB.dob, pB.tob, pB.coords, pB.name || 'Person B', pB.timezone),
      });
      return json({ ...data, verified: true });
    }
    if (!b.dateOfBirth || !b.timeOfBirth || !b.coordinates) {
      await refund();
      return json({ error: 'Date, time and coordinates are required.', verified: false }, 400);
    }
    const data = await astrologerCall(env, '/api/v5/chart-data/birth-chart', { subject: toSubject(b.dateOfBirth, b.timeOfBirth, b.coordinates, b.name, b.timezone, b.birthPlace) });
    const subject = (data.chart_data && data.chart_data.subject) || data.subject || (data.data && data.data.subject) || data.data || data;
    const nakshatra = subject && subject.moon && Number.isFinite(subject.moon.abs_pos) ? calcNakshatra(subject.moon.abs_pos) : null;
    const rasi = buildRasiFromSubject(subject);
    const lagna = subject && subject.ascendant && (SIGN_NAME_MAP[subject.ascendant.sign] || subject.ascendant.sign);
    const navamsa = buildNavamsaFromSubject(subject);
    // current transits (non-fatal if this extra call fails)
    let transitSummary = null;
    try {
      const t = new Date();
      const [tLat, tLng] = String(b.coordinates).split(',').map((s) => parseFloat(s.trim()));
      const td = await astrologerCall(env, '/api/v5/chart-data/transit', {
        first_subject: toSubject(b.dateOfBirth, b.timeOfBirth, b.coordinates, b.name, b.timezone, b.birthPlace),
        transit_subject: { name: 'Transit', year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate(), hour: t.getUTCHours(), minute: t.getUTCMinutes(), longitude: tLng, latitude: tLat, timezone: b.timezone || 'Asia/Kolkata' },
      });
      const ts = (td.chart_data && td.chart_data.transit_subject) || (td.chart_data && td.chart_data.subject) || null;
      if (ts) {
        transitSummary = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']
          .map((pk) => { const p = ts[pk]; return p && p.sign ? `${pk[0].toUpperCase() + pk.slice(1)} transiting ${SIGN_NAME_MAP[p.sign] || p.sign}` : null; })
          .filter(Boolean).join('; ');
      }
    } catch (e) { console.warn('[transit] failed, continuing without it:', e.message); }
    const planetSummary = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']
      .map((pk) => { const p = subject && subject[pk]; return p && p.sign ? `${pk[0].toUpperCase() + pk.slice(1)} in ${SIGN_NAME_MAP[p.sign] || p.sign} (${p.house || ''}${p.retrograde ? ', retrograde' : ''})` : null; })
      .filter(Boolean).join('; ');
    return json({
      ...data, verified: true, rasi, lagna, nakshatra, navamsa, transit: transitSummary,
      chartSummaryForAI: `Lagna (Ascendant): ${lagna}. Moon Nakshatra: ${nakshatra ? nakshatra.en + ' pada ' + nakshatra.pada : 'unknown'}. Planets: ${planetSummary}.${transitSummary ? ' Current transits: ' + transitSummary + '.' : ''}`,
    });
  } catch (e) {
    await refund();
    return json({ error: e.message, verified: false, accuracyStatus: 'unverified' }, 502);
  }
}

// AI interpretation of the REAL calculated chart (Gemini). A multi-part question costs 50 credits.
async function astrologyAnalyze(env, user, b) {
  const q = String(b.question || '');
  const combo = (q.match(/\?/g) || []).length > 1 || /\b(and also|another question|multiple questions|plus|as well as)\b/i.test(q);
  const cost = combo ? 50 : 2;
  if (!(await deductCredits(env, user.id, cost, combo ? 'astrologyplus_ai_combo' : 'astrologyplus_ai'))) {
    return err(402, combo ? 'இது கலவை/பல-பகுதி கேள்வி — 50 credits தேவை. போதுமான credits இல்லை.' : NO_CREDITS);
  }
  try {
    const lang = (b.chartContext && b.chartContext.outputLanguage) || 'en';
    const summaryLine = b.chartContext && b.chartContext.chartSummaryForAI ? `\n\nCalculated chart summary: ${b.chartContext.chartSummaryForAI}` : '';
    const prompt = `You are an expert Vedic astrologer trained on the classical texts — Brihat Parashara Hora Shastra, Jaimini Sutras, Phaladeepika, Saravali — and their established rules for yogas (planetary combinations), planetary strength by exact degree (exaltation, debilitation, own sign, moolatrikona, combustion, retrogression), house lordship, aspects (drishti), and Dasha-Bhukti-Antardasha timing.

Using ONLY the verified, calculated chart data below (never invent planetary positions or degrees — every position you reason about must come from this data), apply real classical astrological methodology to answer the question:
- Identify any relevant yogas/combinations formed by the actual planetary placements that bear on the question (e.g. Raja yoga, Dhana yoga, Gaja-Kesari, Kemadruma, etc. — only if the data actually supports them).
- Judge each relevant planet's real strength from its exact degree and sign (exalted, debilitated, own sign, retrograde, combust) rather than treating every placement as equal.
- Consider house lordships and aspects (drishti) between the planets/houses relevant to the question.
- Factor in the current Dasha-Bhukti-Antardasha period shown in the data for timing.
Weave these into ONE coherent, specific, well-reasoned answer grounded in the actual data — never a vague reading that could apply to any chart, and never a bare list of technical terms without applying them.

Answer the user's ONE question in ${lang === 'ta' ? 'Tamil' : lang}. End with a brief note that this is an interpretation, not a guarantee.\n\nVerified chart data (raw):\n${JSON.stringify(b.chartContext)}${summaryLine}\n\nQuestion: ${b.question}`;
    const answer = await gemini(env, [{ text: prompt }]);
    if (!answer) throw new Error('AI did not return an answer — try rephrasing the question.');
    return json({ answer });
  } catch (e) {
    await refundCredits(env, user.id, cost, 'astrologyplus_ai');
    return err(502, e.message);
  }
}

// ---------------------------------------------------------------- matrimony: Rs 50 chat unlock + AI horoscope reading
export const matFeePaise = (env) => Math.max(100, parseInt(env.MATRIMONY_FEE_PAISE || '5000', 10) || 5000);

async function matFulfil(env, order, paymentId) {
  return matRecordUnlock(env, { a: order.user_id, b: order.other_id, payer: order.user_id, p_order: order.order_id, p_payment: paymentId, p_amount: order.amount_paise });
}

async function matCreateOrder(env, user, b) {
  const me = user.id, other = String(b.other_id || '');
  if (!/^[0-9a-f-]{36}$/i.test(other) || other === me) return err(400, 'தவறான கோரிக்கை');
  const lo = me < other ? me : other, hi = me < other ? other : me;
  const [ps, ints, unl, blk] = await env.DB.batch([
    env.DB.prepare('select user_id, status from mat_profiles where user_id in (?, ?)').bind(me, other),
    env.DB.prepare("select id from mat_interests where status = 'accepted' and ((from_user = ?1 and to_user = ?2) or (from_user = ?2 and to_user = ?1))").bind(me, other),
    env.DB.prepare('select user_a from mat_unlocks where user_a = ? and user_b = ?').bind(lo, hi),
    env.DB.prepare('select blocker from mat_blocks where (blocker = ?1 and blocked = ?2) or (blocker = ?2 and blocked = ?1)').bind(me, other),
  ]);
  if (ps.results.length !== 2 || !ps.results.every((p) => p.status === 'approved') || blk.results.length) return err(403, 'இந்த உறுப்பினருடன் chat திறக்க முடியாது');
  if (!ints.results.length) return err(403, 'முதலில் Interest ஏற்கப்பட வேண்டும்');
  if (unl.results.length) return json({ unlocked: true });
  try {
    const fee = matFeePaise(env);
    const order = await razorpayOrder(env, { amount: fee, currency: 'INR', receipt: `mat_${Date.now().toString(36)}`, notes: { app: 'matrimony', payer: me, other } });
    await env.DB.prepare('insert into mat_orders (order_id, user_id, other_id, amount_paise) values (?, ?, ?, ?)').bind(order.id, me, other, fee).run();
    return json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: env.RAZORPAY_KEY_ID });
  } catch (e) {
    console.error('matrimony create-order:', e.message);
    return err(500, 'Order உருவாக்க முடியவில்லை — மீண்டும் முயற்சிக்கவும்');
  }
}

async function matVerify(env, user, b) {
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = b;
  if (!oid || !pid || !sig) return err(400, 'Payment details missing');
  if (!(await validPaymentSignature(env, oid, pid, sig))) return err(400, 'கையொப்பம் பொருந்தவில்லை (invalid signature)');
  const order = await env.DB.prepare('select * from mat_orders where order_id = ? and user_id = ?').bind(oid, user.id).first();
  if (!order) return err(404, 'Order கிடைக்கவில்லை');
  const r = await matFulfil(env, order, pid);
  return r.ok ? json({ ok: true }) : err(409, 'Chat திறக்க முடியவில்லை: ' + (r.code || 'error'));
}

const STARS = ['ashwini', 'bharani', 'krittika', 'rohini', 'mrigashira', 'thiruvathirai', 'punarpusam', 'pusam', 'ayilyam', 'magam', 'pooram', 'uthiram', 'hastham', 'chithirai', 'swathi', 'visakam', 'anusham', 'kettai', 'moolam', 'pooradam', 'uthiradam', 'thiruvonam', 'avittam', 'sathayam', 'poorattathi', 'uthirattathi', 'revathi'];
const RAASIS = ['mesham', 'rishabam', 'mithunam', 'kadagam', 'simmam', 'kanni', 'thulam', 'viruchigam', 'dhanusu', 'magaram', 'kumbam', 'meenam'];

// keep only values we can trust; the member reviews everything before saving anyway
export function sanitizeJathagam(j) {
  const out = {};
  if (!j || typeof j !== 'object') return out;
  const name = typeof j.name === 'string' ? j.name.replace(/\s+/g, ' ').trim() : '';
  if (name.length >= 2 && name.length <= 60 && !/\d{4,}/.test(name)) out.name = name;
  if (j.gender === 'M' || j.gender === 'F') out.gender = j.gender;
  if (typeof j.dob === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(j.dob)) {
    const d = new Date(j.dob + 'T00:00:00Z'), y = d.getUTCFullYear();
    if (!isNaN(d) && d.toISOString().slice(0, 10) === j.dob && y >= 1940 && d < new Date()) out.dob = j.dob;
  }
  if (STARS.includes(j.star)) out.star = j.star;
  if (RAASIS.includes(j.raasi)) out.raasi = j.raasi;
  if (typeof j.birth_time === 'string' && /^\d{1,2}:\d{2}/.test(j.birth_time)) out.birth_time = j.birth_time.slice(0, 8);
  if (typeof j.birth_place === 'string' && j.birth_place.trim().length <= 60) out.birth_place = j.birth_place.trim();
  return out;
}

async function matJathagam(env, req, user) {
  const form = await req.formData();
  const file = form.get('file');
  if (!isFile(file)) return err(400, 'ஜாதகக் கோப்பைத் தேர்வு செய்யுங்கள்');
  if (!/^(image\/|application\/pdf)/.test(file.type || '')) return err(400, 'படம் அல்லது PDF மட்டும்');
  if (!env.GEMINI_API_KEY) return err(501, 'AI இன்னும் அமைக்கப்படவில்லை');
  const cost = Number(env.MATRIMONY_JATHAGAM_CREDITS ?? 2);
  if (cost > 0 && !(await deductCredits(env, user.id, cost, 'matrimony_jathagam'))) {
    return json({ error: 'AI credits போதவில்லை — pdftoolsindia.com-ல் credits வாங்கவும்', needCredits: cost }, 402);
  }
  try {
    const prompt = 'You are reading an Indian (Tamil / Kannada / Telugu / English) horoscope (jathagam) or birth certificate. Extract ONLY what is clearly written. Never guess. ' +
      'Return JSON with keys: name (person name only, no phone), gender ("M" or "F" or null), dob (YYYY-MM-DD or null), birth_time (HH:MM 24h or null), birth_place (or null), ' +
      'star (one of ' + STARS.join(',') + ' or null), raasi (the moon sign, one of ' + RAASIS.join(',') + ' or null). Use null for anything not visible.';
    const text = await gemini(env, [{ text: prompt }, await filePart(env, file)], { generationConfig: { response_mime_type: 'application/json', temperature: 0 } });
    let parsed;
    try { parsed = JSON.parse(String(text || '').replace(/^```json|```$/g, '').trim()); } catch { throw new Error('AI பதிலைப் படிக்க முடியவில்லை'); }
    const fields = sanitizeJathagam(parsed);
    if (!Object.keys(fields).length) throw new Error('ஜாதகத்தில் தெளிவான விவரங்கள் கிடைக்கவில்லை — தெளிவான படம் பதிவேற்றவும்');
    return json({ ok: true, fields, credits: cost });
  } catch (e) {
    if (cost > 0) await refundCredits(env, user.id, cost, 'matrimony_jathagam');
    // Google says the key's project has the Gemini API switched off -> short, friendly message (credits already refunded)
    if (/has not been used in project|SERVICE_DISABLED|is disabled|API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(e.message || '')) return err(503, 'AI சேவை தற்போது கிடைக்கவில்லை — நிர்வாகத்திடம் தெரிவிக்கப்பட்டுள்ளது. இப்போதைக்கு விவரங்களை நீங்களே நிரப்பலாம் (credits திரும்பக் கிடைத்தன).');
    return err(500, e.message);
  }
}

// ---------------------------------------------------------------- health check (health-check.html), 2 credits
// The page screens emergency red flags first; the AI only explains likely causes from every angle.
// Siddha / home remedies come ONLY from this vetted list — the AI may pick keys, the text below is fixed.
const SIDDHA = {
  nilavembu: [['நிலவேம்புக் குடிநீர்', 'Nilavembu kudineer'], ['ஒரு டம்ளர் நீரில் 5 கிராம் பொடியைக் கொதிக்கவைத்து கால் பங்காகச் சுண்டியதும் வடிகட்டி, நாளுக்கு 2 முறை 30–60 மி.லி.', 'Boil 5 g powder in a glass of water down to a quarter, strain; 30–60 ml twice a day.'], ['கர்ப்பிணிகள், 5 நாளுக்கு மேல் காய்ச்சல் — மருத்துவரைப் பாருங்கள்.', 'Not in pregnancy; fever over 5 days needs a doctor.']],
  kabasura: [['கபசுரக் குடிநீர்', 'Kabasura kudineer'], ['5 கிராம் பொடியை 240 மி.லி. நீரில் 60 மி.லி. ஆகும் வரை கொதிக்கவைத்து, காலை–மாலை குடிக்கவும்.', 'Boil 5 g powder in 240 ml water down to 60 ml; drink morning and evening.'], ['கர்ப்பிணிகள், சிறு குழந்தைகளுக்கு மருத்துவர் ஆலோசனையுடன் மட்டும்.', 'Pregnancy and young children only on a doctor\'s advice.']],
  adathodai: [['ஆடாதோடை இலைக் கஷாயம்', 'Adathodai (Vasaka) leaf decoction'], ['2–3 இலைகளை நீரில் கொதிக்கவைத்து, தேன் சேர்த்து நாளுக்கு 2 முறை.', 'Boil 2–3 leaves in water, add honey; twice a day.'], ['கர்ப்ப காலத்தில் தவிர்க்கவும்.', 'Avoid in pregnancy.']],
  thulasi: [['துளசி இலை', 'Thulasi (holy basil)'], ['5–6 இலைகளை வெந்நீரில் போட்டு ஆவி பிடிக்கலாம் அல்லது தேநீராகக் குடிக்கலாம்.', 'Steep 5–6 leaves in hot water as a tea, or for steam.'], ['இரத்தம் உறையாமைக்கான மருந்து சாப்பிடுபவர்கள் மருத்துவரிடம் கேளுங்கள்.', 'Ask a doctor if you take blood thinners.']],
  ginger_honey: [['இஞ்சிச் சாறு + தேன்', 'Ginger juice with honey'], ['ஒரு தேக்கரண்டி இஞ்சிச் சாற்றுடன் தேன் கலந்து நாளுக்கு 2–3 முறை.', 'One teaspoon ginger juice with honey, 2–3 times a day.'], ['1 வயதுக்குக் குறைந்த குழந்தைக்குத் தேன் கொடுக்கக் கூடாது.', 'Never give honey to a baby under 1 year.']],
  seeragam: [['சீரகத் தண்ணீர்', 'Cumin (seeragam) water'], ['ஒரு தேக்கரண்டி சீரகத்தை நீரில் கொதிக்கவைத்து, ஆறியதும் சிறிது சிறிதாகக் குடிக்கவும்.', 'Boil a teaspoon of cumin in water; sip when warm.'], ['', '']],
  omam: [['ஓமம் தண்ணீர்', 'Ajwain (omam) water'], ['அரை தேக்கரண்டி ஓமத்தை வெந்நீரில் ஊறவைத்து வடிகட்டிக் குடிக்கவும்.', 'Soak half a teaspoon of ajwain in hot water, strain and drink.'], ['கர்ப்ப காலத்தில் அதிகம் வேண்டாம்.', 'Not in large amounts in pregnancy.']],
  turmeric_milk: [['மஞ்சள் பால்', 'Turmeric milk'], ['ஒரு டம்ளர் வெதுவெதுப்பான பாலில் கால் தேக்கரண்டி மஞ்சள், சிறிது மிளகுத்தூள்; இரவில்.', 'A quarter teaspoon of turmeric and a pinch of pepper in warm milk at night.'], ['பித்தப்பைக் கல் உள்ளவர்கள் தவிர்க்கவும்.', 'Avoid if you have gallstones.']],
  salt_gargle: [['உப்புநீர் கொப்பளித்தல்', 'Salt-water gargle'], ['ஒரு டம்ளர் வெதுவெதுப்பான நீரில் அரை தேக்கரண்டி உப்பு; நாளுக்கு 3–4 முறை கொப்பளிக்கவும்.', 'Half a teaspoon of salt in a glass of warm water; gargle 3–4 times a day.'], ['விழுங்க வேண்டாம்.', 'Do not swallow.']],
  triphala: [['திரிபலா சூரணம்', 'Triphala powder'], ['இரவு உணவுக்குப் பின் அரை–1 தேக்கரண்டி வெந்நீருடன்.', 'Half to one teaspoon with warm water after dinner.'], ['கர்ப்பம், வயிற்றுப்போக்கு இருந்தால் தவிர்க்கவும்.', 'Avoid in pregnancy or with diarrhoea.']],
};
const URGENCY = ['self_care', 'see_doctor_soon', 'see_doctor_today', 'emergency'];
const ANGLES = ['infection', 'food_water', 'sleep', 'stress', 'environment', 'chronic', 'medicine', 'other'];
const strList = (a, n = 8) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x.trim()).slice(0, n).map((x) => x.trim().slice(0, 300)) : []);

async function aiHealth(env, user, b) {
  if (!env.GEMINI_API_KEY) return err(501, 'AI feature not set up yet (GEMINI_API_KEY missing).');
  const ta = b.lang !== 'en';
  if (Array.isArray(b.redFlags) && b.redFlags.length) {
    return json({ ok: true, result: { urgency: 'emergency', urgency_reason: ta ? 'அவசர அறிகுறிகள் உள்ளன — உடனே 108 அழைக்கவும் அல்லது அருகிலுள்ள மருத்துவமனைக்குச் செல்லவும்.' : 'Emergency signs — call 108 or go to the nearest hospital now.' } });
  }
  const p = b.profile || {}, c = b.context || {};
  const facts = JSON.stringify({ age: p.age, sex: p.sex, pregnant: !!p.pregnant, complaint: b.complaint, details: b.details, duration: `${b.durationValue || ''} ${b.durationUnit || ''}`.trim(), severity_out_of_10: b.severity, ...c }).slice(0, 6000);
  if (!String(b.complaint || '').trim() && !String(b.details || '').trim()) return err(400, ta ? 'பிரச்சனையை எழுதுங்கள்.' : 'Describe the problem.');
  return charged(env, user.id, 2, 'healthcheck', async () => {
    const prompt = `You are a careful general physician in Tamil Nadu helping a person understand a health problem before they see a doctor. You do NOT diagnose and you never prescribe.
Facts given by the person (JSON): ${facts}
Look at every angle: infection, food and water, sleep, stress, weather/environment, long-term illness, medicines they take. Be honest about uncertainty; prefer common causes; mention dengue, typhoid or malaria only when the facts fit (fever days, season, symptoms).
Rules: no prescription medicines, no antibiotics, no doses except "paracetamol as per the label" if fever; urgency must be 'see_doctor_today' or 'emergency' for anything worrying (children under 5, over 65, pregnancy, fever 3+ days, high fever, severe pain). Choose home remedies only from these keys if they truly fit (or none): ${Object.keys(SIDDHA).join(', ')}.
Write all text in ${ta ? 'simple spoken Tamil' : 'simple English'}.
Return JSON: {"urgency": one of ${JSON.stringify(URGENCY)}, "urgency_reason": "...", "summary": "2-3 sentences", "possible_causes": [{"cause": "...", "likelihood": "high|medium|low", "angle": one of ${JSON.stringify(ANGLES)}, "why": "..."}] (max 5), "root_cause_insight": "...", "self_care": ["..."], "siddha_keys": ["..."], "medicine_advice": "...", "tests_to_consider": ["..."], "see_doctor_if": ["..."], "questions_for_doctor": ["..."], "missing_info": ["..."]}`;
    let o;
    try { o = JSON.parse(await gemini(env, [{ text: prompt }], { generationConfig: { response_mime_type: 'application/json', temperature: 0.2 } })); } catch (e) { throw fail(502, e.status ? e.message : 'The AI answer could not be read — please try again.'); }
    const L = ta ? 0 : 1;
    const result = {
      urgency: URGENCY.includes(o.urgency) ? o.urgency : 'see_doctor_soon',
      urgency_reason: String(o.urgency_reason || '').slice(0, 500), summary: String(o.summary || '').slice(0, 1200),
      possible_causes: (Array.isArray(o.possible_causes) ? o.possible_causes : []).slice(0, 5).map((x) => ({ cause: String(x.cause || '').slice(0, 200), likelihood: ['high', 'medium', 'low'].includes(x.likelihood) ? x.likelihood : 'medium', angle: ANGLES.includes(x.angle) ? x.angle : 'other', why: String(x.why || '').slice(0, 400) })).filter((x) => x.cause),
      root_cause_insight: String(o.root_cause_insight || '').slice(0, 800),
      self_care: strList(o.self_care), medicine_advice: String(o.medicine_advice || '').slice(0, 600),
      siddha_remedies: strList(o.siddha_keys, 3).filter((k) => SIDDHA[k]).map((k) => ({ name: SIDDHA[k][0][L], how: SIDDHA[k][1][L], caution: SIDDHA[k][2][L] })),
      tests_to_consider: strList(o.tests_to_consider), see_doctor_if: strList(o.see_doctor_if), questions_for_doctor: strList(o.questions_for_doctor), missing_info: strList(o.missing_info, 5),
    };
    return json({ ok: true, result });
  });
}

// ---------------------------------------------------------------- router
const AUTHED_POST = {
  '/api/credits/use': (env, req, u, b) => creditsUse(env, u, b),
  '/api/redeem': (env, req, u, b) => redeem(env, req, u, b),
  '/api/ai/text': (env, req, u, b) => aiText(env, u, b),
  '/api/ai/image': (env, req, u, b) => aiImage(env, u, b),
  '/api/ai/restyle': (env, req, u, b) => aiRestyle(env, u, b),
  '/api/ai/speech': (env, req, u, b) => aiSpeech(env, u, b),
  '/api/ai/health': (env, req, u, b) => aiHealth(env, u, b),
  '/api/payment/create-order': (env, req, u, b) => createOrder(env, u, b),
  '/api/payment/verify': (env, req, u, b) => verifyPayment(env, u, b),
  '/api/astrology/calculate': (env, req, u, b) => astrologyCalculate(env, u, b),
  '/api/claude/analyze': (env, req, u, b) => astrologyAnalyze(env, u, b),
  '/api/matrimony/create-order': (env, req, u, b) => matCreateOrder(env, u, b),
  '/api/matrimony/verify': (env, req, u, b) => matVerify(env, u, b),
};
const AUTHED_FORM = {
  '/api/ai/ask': aiAsk,
  '/api/matrimony/jathagam-extract': matJathagam,
};

// Anonymous funnel counters for measuring what converts (tool used -> paywall -> checkout -> paid).
// Only a fixed list of event names is accepted; nothing about the visitor is stored.
export const FUNNEL_EVENTS = new Set(['tool_download', 'whatsapp_share', 'paywall_seen', 'checkout_open', 'paid', 'photo_resize', 'poster_export']);
async function funnelEvent(env, req) {
  const b = await readJson(req);
  const name = String((b && b.name) || '');
  if (!FUNNEL_EVENTS.has(name)) return err(400, 'Unknown event');
  if (!(await rateLimit(env, 'ev:' + clientIp(req), 120, 3600))) return json({ ok: true, limited: true });
  const day = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10); // IST day
  await env.DB.prepare('insert into funnel_events (day, name, n) values (?, ?, 1) on conflict(day, name) do update set n = n + 1').bind(day, name).run();
  return json({ ok: true });
}

export async function handleApi(req, env, path) {
  const m = req.method;
  if (path === '/api/pricing' && m === 'GET') return json((await env.DB.prepare('select * from pricing_plans order by amount_inr').all()).results);
  if (path === '/api/event' && m === 'POST') return funnelEvent(env, req);
  if (path === '/api/payment/webhook' && m === 'POST') return webhook(env, req);
  if (path.startsWith('/api/video/')) return err(410, 'Fast Server Mode has been retired — video tools now run free in your browser.');
  if (path === '/api/me' || AUTHED_POST[path] || AUTHED_FORM[path]) {
    const user = await userFromRequest(req, env);
    if (!user) return err(401, req.headers.get('Authorization') ? 'Session காலாவதியானது — மீண்டும் login செய்யவும்' : 'உள்நுழையவும் (Login required)');
    if (path === '/api/me' && m === 'GET') return me(env, user);
    if (m !== 'POST') return err(405, 'Method not allowed');
    // credit-spending endpoints: per-account ceiling against scripts (generous for a real person; per account, not
    // per IP, because many mobile users in India share one carrier IP)
    if (path !== '/api/payment/verify' && path !== '/api/matrimony/verify' && !(await rateLimit(env, 'credit:' + user.id, 40, 900))) {
      return err(429, 'Too many requests — please slow down and try again in a few minutes.');
    }
    if (AUTHED_FORM[path]) return AUTHED_FORM[path](env, req, user);
    return AUTHED_POST[path](env, req, user, await readJson(req));
  }
  return err(404, 'Route not found');
}
