// ============================================================
// PDF/Video Tools — Backend server
// இது real ffmpeg (browser WASM அல்ல) பயன்படுத்தி வேகமாக
// video/image processing செய்யும், Supabase மூலம் login/credits
// சரிபார்க்கும், Razorpay மூலம் payment எடுக்கும்.
//
// Deploy: Render.com / Railway.app-ல் இந்த backend/ folder-ஐ
// deploy செய்யவும் (கீழே README.md-ல் படிநிலை வழிமுறை உள்ளது).
// ============================================================
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';

const app = express();
const PORT = process.env.PORT || 8080;

// ---------- Supabase admin client (service_role — server-side மட்டும்) ----------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------- Razorpay client ----------
const razorpay = process.env.RAZORPAY_KEY_ID ? new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
}) : null;

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
// Razorpay webhook needs the RAW body for signature verification, so we
// register that route's body-parser separately, before the JSON parser.
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), handleWebhook);
app.use(express.json());

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 500 * 1024 * 1024 } });

// ============================================================
// Auth middleware — Supabase-ல் login செய்த user-ஐ சரிபார்க்கிறது
// Frontend, Authorization: Bearer <supabase_access_token> header அனுப்ப வேண்டும்.
// ============================================================
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'உள்நுழையவும் (Login required)' });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Session காலாவதியானது — மீண்டும் login செய்யவும்' });
    req.user = data.user;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Auth பிழை: ' + e.message });
  }
}

// Deducts credits atomically via the Postgres function (race-condition safe).
// Returns true if allowed to proceed, false if not enough credits.
async function deductCredits(userId, amount, toolId) {
  const { data, error } = await supabase.rpc('deduct_credits', {
    p_user_id: userId, p_amount: amount, p_tool_id: toolId
  });
  if (error) throw new Error(error.message);
  return data === true;
}

// ============================================================
// GET /api/me — login ஆன user-ன் profile (credits, plan) திருப்பும்
// ============================================================
app.get('/api/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', req.user.id).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ============================================================
// GET /api/pricing — pricing plans list (login தேவையில்லை)
// ============================================================
app.get('/api/pricing', async (req, res) => {
  const { data, error } = await supabase.from('pricing_plans').select('*').order('amount_inr');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ============================================================
// POST /api/video/compress — உண்மையான ffmpeg (native, WASM அல்ல) — வேகமானது
// multipart/form-data: file, crf, preset, width(optional)
// ============================================================
app.post('/api/video/compress', requireAuth, upload.single('file'), async (req, res) => {
  const CREDIT_COST = 2; // இந்த tool-க்கு எத்தனை credits
  try {
    const allowed = await deductCredits(req.user.id, CREDIT_COST, 'videocompress');
    if (!allowed) return res.status(402).json({ error: 'போதுமான credits இல்லை — மேலும் வாங்கவும் (Not enough credits)' });

    const inputPath = req.file.path;
    const outputPath = path.join(os.tmpdir(), crypto.randomUUID() + '.mp4');
    const crf = req.body.crf || '24';
    const preset = req.body.preset || 'fast'; // real server CPU is much faster than browser WASM
    const width = req.body.width ? parseInt(req.body.width) : null;

    await new Promise((resolve, reject) => {
      let cmd = ffmpeg(inputPath)
        .videoCodec('libx264')
        .outputOptions(['-crf', crf, '-preset', preset])
        .audioCodec('aac').audioBitrate('128k');
      if (width) cmd = cmd.size(`${width}x?`);
      cmd.on('end', resolve).on('error', reject).save(outputPath);
    });

    res.download(outputPath, 'compressed.mp4', () => {
      fs.unlink(inputPath, () => {});
      fs.unlink(outputPath, () => {});
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// POST /api/payment/create-order — Razorpay order உருவாக்குதல்
// body: { planId: 'credits_100' | 'pro_monthly' | ... }
// ============================================================
app.post('/api/payment/create-order', requireAuth, async (req, res) => {
  try {
    if (!razorpay) return res.status(500).json({ error: 'Razorpay இன்னும் இணைக்கப்படவில்லை (server .env-ல் keys இல்லை)' });
    const { planId } = req.body;
    const { data: plan, error } = await supabase.from('pricing_plans').select('*').eq('id', planId).single();
    if (error || !plan) return res.status(400).json({ error: 'தவறான plan' });

    const order = await razorpay.orders.create({
      amount: Math.round(plan.amount_inr * 100), // paise
      currency: 'INR',
      receipt: `rcpt_${req.user.id}_${Date.now()}`,
      notes: { user_id: req.user.id, plan_id: planId }
    });

    await supabase.from('transactions').insert({
      user_id: req.user.id,
      razorpay_order_id: order.id,
      amount_inr: plan.amount_inr,
      credits_purchased: plan.credits,
      plan_purchased: plan.plan,
      status: 'created'
    });

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Shared logic: mark a transaction paid + credit the user. Guarded with
// .eq('status','created') so it only ever runs ONCE even if both the
// /verify call (below) and the webhook fire for the same payment.
async function markPaidAndCredit(txn, paymentId) {
  const { data: updated, error } = await supabase.from('transactions')
    .update({ status: 'paid', razorpay_payment_id: paymentId })
    .eq('id', txn.id)
    .eq('status', 'created') // atomic guard against double-crediting
    .select();
  if (error) throw new Error(error.message);
  if (!updated || !updated.length) return { already: true }; // someone else already credited this

  if (txn.credits_purchased) {
    const { data: profile } = await supabase.from('profiles').select('credits').eq('id', txn.user_id).single();
    await supabase.from('profiles').update({
      credits: (profile?.credits || 0) + txn.credits_purchased
    }).eq('id', txn.user_id);
  } else if (txn.plan_purchased) {
    const { data: plan } = await supabase.from('pricing_plans')
      .select('duration_days').eq('plan', txn.plan_purchased).limit(1).single();
    const days = plan?.duration_days || 30;
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('profiles').update({
      plan: txn.plan_purchased, plan_expires_at: expires
    }).eq('id', txn.user_id);
  }
  return { already: false };
}

// ============================================================
// POST /api/payment/verify — Checkout success ஆன உடனேயே (frontend-ன்
// Razorpay `handler` callback-ல் இருந்து) அழைக்கப்படும். Razorpay webhook
// Dashboard-ல் தனியாக configure செய்ய வேண்டிய அவசியமே இல்லாமல், இதுவே
// credits-ஐ உடனடியாக சேர்க்கும் — signature-ஐ நாமே HMAC மூலம் சரிபார்த்து
// உறுதி செய்கிறோம் (Razorpay-ன் official verification முறை இது).
// ============================================================
app.post('/api/payment/verify', requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Payment details missing' });
    }
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'கையொப்பம் பொருந்தவில்லை (invalid signature) — இது போலியான payment ஆக இருக்கலாம்.' });
    }

    const { data: txn, error } = await supabase.from('transactions')
      .select('*').eq('razorpay_order_id', razorpay_order_id).eq('user_id', req.user.id).single();
    if (error || !txn) return res.status(404).json({ error: 'Transaction record கிடைக்கவில்லை' });

    const result = await markPaidAndCredit(txn, razorpay_payment_id);
    res.json({ ok: true, already: result.already });
  } catch (e) {
    console.error('Verify error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// POST /api/payment/webhook — (Optional backup) Razorpay Dashboard-ல்
// configure செய்தால் இங்கேயும் அதே credit-ஐ சேர்க்கும் — ஆனால் மேலே உள்ள
// /verify endpoint-ஏ primary path, இது தேவைப்படாமலேயே app வேலை செய்யும்.
// Razorpay Dashboard → Settings → Webhooks-ல் இந்த URL-ஐ பதிவு செய்யவும்:
//   https://your-backend-domain.com/api/payment/webhook
// ============================================================
async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body) // raw buffer
      .digest('hex');
    if (signature !== expected) return res.status(400).json({ error: 'Invalid signature' });

    const event = JSON.parse(req.body.toString());
    console.log('Webhook received:', event.event); // Render logs-ல் இதை பார்க்கலாம் — event வந்ததா இல்லையா என்று உறுதி செய்ய
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;

      const { data: txn } = await supabase.from('transactions')
        .select('*').eq('razorpay_order_id', orderId).single();
      if (!txn) { console.log('Webhook: no matching transaction for order', orderId); return res.json({ ok: true }); }

      await markPaidAndCredit(txn, payment.id);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('Webhook error:', e);
    res.status(500).json({ error: e.message });
  }
}

app.get('/health', (req, res) => res.json({ ok: true, ffmpeg: 'native', time: new Date().toISOString() }));

app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
