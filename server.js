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
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 8080;
app.set('trust proxy', 1); // Render sits behind a proxy — needed for rate-limit to see the real client IP

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

// ============================================================
// Abuse protection — rate limits by IP address. Three tiers:
//   - generalLimiter: everything (a loose ceiling against outright flooding)
//   - creditLimiter: credit-spending endpoints (slower, still generous for
//     a real person clicking around, but blocks a script hammering the API)
//   - redeemLimiter: strict — redeem codes are guessable strings, this stops
//     someone brute-forcing promo codes
// Rate-limiting alone won't stop someone making many free Supabase accounts to
// farm the 5 free signup credits — for that, also enable "Confirm email"
// under Supabase Dashboard → Authentication → Providers → Email, which
// requires a real, unique inbox per account before it can be used.
// ============================================================
const generalLimiter = rateLimit({ windowMs: 15*60*1000, limit: 300, standardHeaders: true, legacyHeaders: false });
const creditLimiter = rateLimit({ windowMs: 15*60*1000, limit: 40, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests — please slow down and try again in a few minutes.' } });
const redeemLimiter = rateLimit({ windowMs: 60*60*1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many redeem attempts — please try again later.' } });

app.use(generalLimiter);
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
// Razorpay webhook needs the RAW body for signature verification, so we
// register that route's body-parser separately, before the JSON parser.
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), handleWebhook);
app.use(express.json());

// Render's free tier gives this service only 512MB RAM. ffmpeg transcoding
// memory usage scales with the video's resolution/bitrate, not just its file
// size, but a hard cap on the INPUT file size is the simplest safety net
// against an out-of-memory crash (which otherwise takes the whole server
// down for everyone, not just the one oversized upload).
const uploadVideo = multer({ dest: os.tmpdir(), limits: { fileSize: 60 * 1024 * 1024 } });   // 60MB — safe for this instance size
const uploadImage = multer({ dest: os.tmpdir(), limits: { fileSize: 15 * 1024 * 1024 } });   // 15MB — plenty for photos/scanned pages sent to Gemini

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
app.post('/api/video/compress', creditLimiter, requireAuth, uploadVideo.single('file'), async (req, res) => {
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
// POST /api/video/process — Fast Server Mode for the simpler, single-file
// video operations (mute, rotate, speed, reverse, volume, loop, gif,
// thumbnail). Native server-side ffmpeg is far faster than ffmpeg.wasm in
// the browser, especially on phones. body: multipart file + op + params
// (JSON string). Multi-file (merge) and complex-overlay (subtitles, voice
// replace, waveform) operations are NOT here yet — those need more involved
// param handling and are planned for a follow-up.
// ============================================================
const VIDEO_OP_CREDIT_COST = { mute: 1, rotate: 1, speed: 1, reverse: 1, volume: 1, loop: 1, togif: 1, thumbnail: 1 };
app.post('/api/video/process', creditLimiter, requireAuth, uploadVideo.single('file'), async (req, res) => {
  const op = req.body.op;
  const CREDIT_COST = VIDEO_OP_CREDIT_COST[op];
  if (!CREDIT_COST) return res.status(400).json({ error: `Unknown or unsupported operation: ${op}` });
  let params = {};
  try { params = JSON.parse(req.body.params || '{}'); } catch (e) { /* use defaults */ }

  try {
    const allowed = await deductCredits(req.user.id, CREDIT_COST, 'video_' + op);
    if (!allowed) return res.status(402).json({ error: 'போதுமான credits இல்லை — மேலும் வாங்கவும் (Not enough credits)' });

    const inputPath = req.file.path;
    let ext = 'mp4', downloadName = op + '.mp4';
    if (op === 'togif') { ext = 'gif'; downloadName = 'video.gif'; }
    if (op === 'thumbnail') { ext = 'jpg'; downloadName = 'thumbnail.jpg'; }
    const outputPath = path.join(os.tmpdir(), crypto.randomUUID() + '.' + ext);

    await new Promise((resolve, reject) => {
      let cmd = ffmpeg(inputPath);
      switch (op) {
        case 'mute':
          cmd = cmd.noAudio().videoCodec('copy');
          break;
        case 'rotate': {
          // params.degrees: 90 | 180 | 270 | 'flipH' | 'flipV'
          const d = params.degrees;
          const filterMap = { 90: 'transpose=1', 180: 'transpose=1,transpose=1', 270: 'transpose=2', flipH: 'hflip', flipV: 'vflip' };
          cmd = cmd.videoFilters(filterMap[d] || 'transpose=1');
          break;
        }
        case 'speed': {
          const factor = Math.max(0.25, Math.min(4, Number(params.factor) || 1));
          cmd = cmd.videoFilters(`setpts=${(1 / factor).toFixed(4)}*PTS`)
                   .audioFilters(`atempo=${Math.max(0.5, Math.min(2, factor)).toFixed(4)}`);
          break;
        }
        case 'reverse':
          cmd = cmd.videoFilters('reverse').audioFilters('areverse');
          break;
        case 'volume': {
          const vol = Math.max(0, Math.min(5, Number(params.level) || 1));
          cmd = cmd.audioFilters(`volume=${vol}`);
          break;
        }
        case 'loop': {
          const times = Math.max(1, Math.min(20, parseInt(params.times) || 2));
          cmd = cmd.inputOptions(['-stream_loop', String(times - 1)]).outputOptions(['-c', 'copy']);
          break;
        }
        case 'togif': {
          const w = Math.max(120, Math.min(960, parseInt(params.width) || 480));
          const fps = Math.max(5, Math.min(20, parseInt(params.fps) || 10));
          if (params.startSec !== undefined) cmd = cmd.seekInput(Math.max(0, Number(params.startSec) || 0));
          if (params.durationSec) cmd = cmd.duration(Math.max(1, Math.min(15, Number(params.durationSec))));
          cmd = cmd.outputOptions(['-vf', `fps=${fps},scale=${w}:-1:flags=lanczos`, '-loop', '0']);
          break;
        }
        case 'thumbnail': {
          const atSec = Math.max(0, Number(params.atSeconds) || 1);
          cmd = cmd.seekInput(atSec).frames(1);
          break;
        }
      }
      cmd.on('end', resolve).on('error', reject).save(outputPath);
    });

    res.download(outputPath, downloadName, () => {
      fs.unlink(inputPath, () => {});
      fs.unlink(outputPath, () => {});
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// POST /api/video/process-multi — Fast Server Mode for operations needing
// more than one file or more complex parameters: merging several clips,
// replacing/extracting a voice track, burning in timed captions, and
// generating a waveform video from audio. body: multipart files[] (1-20) +
// op + params (JSON string, e.g. captions array or colours).
// ============================================================
const VIDEO_MULTI_OP_CREDIT_COST = { merge: 2, voicereplace: 2, voiceextract: 1, subtitle: 2, waveform: 1 };
function escDrawtextServer(s) {
  return String(s).replace(/\\/g, '\\\\\\\\').replace(/:/g, '\\:').replace(/'/g, '\u2019');
}
app.post('/api/video/process-multi', creditLimiter, requireAuth, uploadVideo.array('files', 20), async (req, res) => {
  const op = req.body.op;
  const CREDIT_COST = VIDEO_MULTI_OP_CREDIT_COST[op];
  if (!CREDIT_COST) return res.status(400).json({ error: `Unknown or unsupported operation: ${op}` });
  let params = {};
  try { params = JSON.parse(req.body.params || '{}'); } catch (e) { /* use defaults */ }
  const files = req.files || [];
  const cleanupPaths = files.map(f => f.path);

  try {
    const allowed = await deductCredits(req.user.id, CREDIT_COST, 'video_' + op);
    if (!allowed) return res.status(402).json({ error: 'போதுமான credits இல்லை — மேலும் வாங்கவும் (Not enough credits)' });

    let ext = 'mp4', downloadName = op + '.mp4';
    if (op === 'voiceextract') { ext = 'mp3'; downloadName = 'audio.mp3'; }
    const outputPath = path.join(os.tmpdir(), crypto.randomUUID() + '.' + ext);
    cleanupPaths.push(outputPath);

    if (op === 'merge') {
      if (files.length < 2) throw new Error('Merge needs at least 2 video files.');
      const listPath = path.join(os.tmpdir(), crypto.randomUUID() + '.txt');
      const listContent = files.map(f => `file '${f.path.replace(/'/g, "'\\''")}'`).join('\n');
      fs.writeFileSync(listPath, listContent);
      cleanupPaths.push(listPath);
      await new Promise((resolve, reject) => {
        // Try the fast stream-copy path first; fall back to re-encoding if the clips
        // aren't compatible for a direct concat (mismatched codecs/containers).
        ffmpeg().input(listPath).inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions(['-c', 'copy']).on('end', resolve).on('error', () => {
            ffmpeg().input(listPath).inputOptions(['-f', 'concat', '-safe', '0'])
              .videoCodec('libx264').outputOptions(['-preset', 'veryfast']).audioCodec('aac')
              .on('end', resolve).on('error', reject).save(outputPath);
          }).save(outputPath);
      });
    } else if (op === 'voicereplace') {
      if (files.length !== 2) throw new Error('Voice replace needs exactly 2 files: video, then audio.');
      const [videoPath, audioPath] = [files[0].path, files[1].path];
      const mix = params.mix === true;
      const delayMs = Math.max(0, Math.round((Number(params.startSec) || 0) * 1000));
      const delayedAudio = delayMs > 0 ? `adelay=${delayMs}|${delayMs},` : '';
      await new Promise((resolve, reject) => {
        const cmd = ffmpeg().input(videoPath).input(audioPath);
        if (mix) {
          cmd.complexFilter([`[1:a]${delayedAudio}apad[a1]`, '[0:a][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]'])
             .outputOptions(['-map', '0:v:0', '-map', '[aout]']);
        } else {
          cmd.complexFilter([`[1:a]${delayedAudio}apad[a1]`])
             .outputOptions(['-map', '0:v:0', '-map', '[a1]', '-shortest']);
        }
        cmd.videoCodec('libx264').outputOptions(['-preset', 'veryfast']).audioCodec('aac')
           .on('end', resolve).on('error', reject).save(outputPath);
      });
    } else if (op === 'voiceextract') {
      await new Promise((resolve, reject) => {
        ffmpeg(files[0].path).noVideo().audioFrequency(44100).audioChannels(2).audioBitrate('192k')
          .on('end', resolve).on('error', reject).save(outputPath);
      });
    } else if (op === 'subtitle') {
      const captions = Array.isArray(params.captions) ? params.captions : [];
      if (!captions.length) throw new Error('No captions provided.');
      const filters = captions.map(c =>
        `drawtext=text='${escDrawtextServer(c.text)}':fontsize=32:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-th-40:enable='between(t,${Number(c.start) || 0},${Number(c.end) || 0})'`
      ).join(',');
      await new Promise((resolve, reject) => {
        ffmpeg(files[0].path).videoFilters(filters).outputOptions(['-c:a', 'copy'])
          .on('end', resolve).on('error', reject).save(outputPath);
      });
    } else if (op === 'waveform') {
      const bg = params.bg || 'black', fg = params.fg || 'white';
      const filter = `[0:a]showwaves=s=1280x360:mode=cline:colors=${fg}:rate=25[wave];color=c=${bg}:s=1280x360:rate=25[bgv];[bgv][wave]overlay=format=auto[outv]`;
      await new Promise((resolve, reject) => {
        ffmpeg(files[0].path).complexFilter([filter]).outputOptions(['-map', '[outv]', '-map', '0:a', '-shortest'])
          .videoCodec('libx264').outputOptions(['-preset', 'veryfast']).audioCodec('aac')
          .on('end', resolve).on('error', reject).save(outputPath);
      });
    }

    res.download(outputPath, downloadName, () => {
      cleanupPaths.forEach(p => fs.unlink(p, () => {}));
    });
  } catch (e) {
    cleanupPaths.forEach(p => fs.unlink(p, () => {}));
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// POST /api/credits/use — Generic credit-deduction gate.
// Most Image/OCR/some Video tools still process the file entirely in the
// browser (fast enough there, no need to re-upload the file to a server).
// The frontend calls THIS endpoint first (no file upload, just a credit
// check) to unlock the tool for that use, then runs its normal client-side
// logic. Keeps monetization consistent without porting every algorithm
// to Node. body: { toolId: 'imgenhance', cost: 1 }
// ============================================================
app.post('/api/credits/use', creditLimiter, requireAuth, async (req, res) => {
  try {
    const { toolId, cost, checkOnly } = req.body;
    if (!toolId || !cost || cost < 1) return res.status(400).json({ error: 'Invalid request' });

    if (checkOnly) {
      // Some tools (video compress, the 6 AI tools) charge credits themselves
      // when the actual action runs — for those, "unlocking" the tool should
      // only VERIFY the person can afford it, not deduct twice.
      const { data: profile, error } = await supabase.from('profiles')
        .select('credits, plan, plan_expires_at').eq('id', req.user.id).single();
      if (error) throw new Error(error.message);
      const isPro = (profile.plan === 'pro' || profile.plan === 'business') &&
        (!profile.plan_expires_at || new Date(profile.plan_expires_at) > new Date());
      if (isPro || profile.credits >= cost) return res.json({ ok: true });
      return res.status(402).json({ error: 'Not enough credits — please buy more or upgrade to Pro.' });
    }

    const allowed = await deductCredits(req.user.id, cost, toolId);
    if (!allowed) return res.status(402).json({ error: 'Not enough credits — please buy more or upgrade to Pro.' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// POST /api/redeem — Redeem a promo/gift code for bonus credits.
// body: { code: 'WELCOME10' }
// ============================================================
app.post('/api/redeem', redeemLimiter, requireAuth, async (req, res) => {
  try {
    const code = (req.body.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'Please enter a code' });
    const { data, error } = await supabase.rpc('redeem_code', { p_user_id: req.user.id, p_code: code });
    if (error) throw new Error(error.message);
    if (!data.ok) return res.status(400).json({ error: data.error });
    res.json({ ok: true, creditsAdded: data.credits_added });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// POST /api/ai/ask — "Ask AI about your document" — uses Google Gemini
// (vision-capable, currently the cheapest capable option — see
// aistudio.google.com for a free API key). Add GEMINI_API_KEY to your
// Render env vars to activate this feature; until then it returns a
// clear "not configured" error instead of crashing.
// body: multipart form — file (image), question (text)
// ============================================================
app.post('/api/ai/ask', creditLimiter, requireAuth, uploadImage.single('file'), async (req, res) => {
  const CREDIT_COST = 1;
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(501).json({ error: 'AI feature not set up yet — add GEMINI_API_KEY in Render env vars (see backend/README.md).' });
    }
    const toolId = req.body.toolId || 'askai'; // which of the 6 AI tools called this — for usage_logs
    const allowed = await deductCredits(req.user.id, CREDIT_COST, toolId);
    if (!allowed) return res.status(402).json({ error: 'Not enough credits — please buy more or upgrade to Pro.' });

    const question = req.body.question || 'Summarize this document and pull out any key dates, numbers, or names.';
    const imageBytes = fs.readFileSync(req.file.path);
    const base64Image = imageBytes.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: question },
              { inline_data: { mime_type: mimeType, data: base64Image } }
            ]
          }]
        })
      }
    );
    const geminiJson = await geminiRes.json();
    fs.unlink(req.file.path, () => {});
    if (!geminiRes.ok) throw new Error(geminiJson.error?.message || 'AI request failed');
    const answer = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer returned.';
    res.json({ ok: true, answer });
  } catch (e) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// POST /api/payment/create-order — Razorpay order உருவாக்குதல்
// body: { planId: 'credits_100' | 'pro_monthly' | ... }
// ============================================================
app.post('/api/payment/create-order', creditLimiter, requireAuth, async (req, res) => {
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
app.post('/api/payment/verify', creditLimiter, requireAuth, async (req, res) => {
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

// ============================================================
// ASTROLOGY — proxies to Vedika API (real Swiss-Ephemeris-grade calculations,
// https://kerykeion.net/astrologer-api). Free tier on RapidAPI, no credit
// card required. Requires ASTROLOGER_API_KEY (your RapidAPI key) in env vars.
// The frontend (astrology-plus.html) never sees this key — it only calls
// OUR endpoints, matching the tool's own "never expose the key in HTML" rule.
//
// Real Swiss-Ephemeris-grade planetary positions come from Astrologer API
// (arcsecond precision, open-source Kerykeion engine) — never fabricated.
// "Prediction" text and multi-language output are generated by feeding that
// REAL data into our existing Gemini backend as context, so interpretations
// are grounded in actual astronomy, not guessed, and can be explained in
// any language the person asks for (Tamil included).
// ============================================================
const ASTROLOGER_BASE = 'https://astrologer.p.rapidapi.com';
async function astrologerCall(path, body) {
  if (!process.env.ASTROLOGER_API_KEY) throw new Error('Astrology calculation is not configured yet (ASTROLOGER_API_KEY missing on the server).');
  const r = await fetch(ASTROLOGER_BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': process.env.ASTROLOGER_API_KEY,
      'X-RapidAPI-Host': 'astrologer.p.rapidapi.com'
    },
    body: JSON.stringify(body)
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (!r.ok) throw new Error(data.error || data.message || ('Astrologer API error ' + r.status));
  return data;
}
function toSubject(dateStr, timeStr, coordsStr, name, timezone) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const [hh, mm] = String(timeStr || '12:00').split(':').map(Number);
  const [lat, lng] = String(coordsStr || '').split(',').map(s => parseFloat(s.trim()));
  return {
    name: name || 'Subject', year: y, month: m, day: d, hour: hh || 12, minute: mm || 0,
    longitude: lng, latitude: lat,
    timezone: timezone || 'Asia/Kolkata', // required by the API — defaults to IST since that's this app's primary audience
    zodiac_type: 'Sidereal', sidereal_mode: 'LAHIRI'
  };
}
// Groups the API's per-planet response (sun.sign, moon.sign, ...) into the
// per-ZODIAC-SIGN shape astrology-plus.html's Rasi chart expects
// (rasi['Aries'] = ['Sun','Mars'] etc.) — the two shapes don't match natively.
const SIGN_NAME_MAP = { Ari:'Aries', Tau:'Taurus', Gem:'Gemini', Can:'Cancer', Leo:'Leo', Vir:'Virgo', Lib:'Libra', Sco:'Scorpio', Sag:'Sagittarius', Cap:'Capricorn', Aqu:'Aquarius', Pis:'Pisces' };
function buildRasiFromSubject(subject) {
  const rasi = {};
  const planetKeys = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
  planetKeys.forEach(pk => {
    const p = subject && subject[pk];
    if (!p || !p.sign) return;
    const signName = SIGN_NAME_MAP[p.sign] || p.sign;
    if (!rasi[signName]) rasi[signName] = [];
    rasi[signName].push(pk.charAt(0).toUpperCase() + pk.slice(1) + (p.retrograde ? ' (R)' : ''));
  });
  return rasi;
}
app.post('/api/astrology/calculate', creditLimiter, requireAuth, async (req, res) => {
  try {
    const b = req.body || {};
    if (b.mode === 'compatibility') {
      const pA = b.personA, pB = b.personB;
      if (!pA || !pB || !pA.dob || !pA.tob || !pA.coords || !pB.dob || !pB.tob || !pB.coords) {
        return res.status(400).json({ error: 'Both people need complete date, time and coordinates.', verified: false });
      }
      const data = await astrologerCall('/api/v5/chart-data/synastry', {
        first_subject: toSubject(pA.dob, pA.tob, pA.coords, pA.name || 'Person A', pA.timezone),
        second_subject: toSubject(pB.dob, pB.tob, pB.coords, pB.name || 'Person B', pB.timezone)
      });
      return res.json({ ...data, verified: true });
    }
    if (!b.dateOfBirth || !b.timeOfBirth || !b.coordinates) {
      return res.status(400).json({ error: 'Date, time and coordinates are required.', verified: false });
    }
    const data = await astrologerCall('/api/v5/chart-data/birth-chart', { subject: toSubject(b.dateOfBirth, b.timeOfBirth, b.coordinates, b.name, b.timezone) });
    const subject = data.subject || (data.data && data.data.subject) || data.data || data;
    res.json({ ...data, verified: true, rasi: buildRasiFromSubject(subject), lagna: subject && subject.ascendant && (SIGN_NAME_MAP[subject.ascendant.sign] || subject.ascendant.sign) });
  } catch (e) {
    res.status(502).json({ error: e.message, verified: false, accuracyStatus: 'unverified' });
  }
});
app.post('/api/claude/analyze', creditLimiter, requireAuth, async (req, res) => {
  // Interprets the REAL, already-calculated chart (from /api/astrology/calculate)
  // using our existing Gemini setup — this is exactly the same "explain real
  // data, don't invent it" pattern as the other AI tools in this app, and
  // gives us free multi-language support since Gemini itself is multilingual.
  try {
    const b = req.body || {};
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'AI interpretation is not configured (GEMINI_API_KEY missing).' });
    const lang = (b.chartContext && b.chartContext.outputLanguage) || 'en';
    const prompt = `You are an astrology assistant. Using ONLY the verified chart data below (never invent planetary positions), answer the user's ONE question in ${lang === 'ta' ? 'Tamil' : lang}. Be clear that this is an interpretation, not a guarantee.\n\nVerified chart data:\n${JSON.stringify(b.chartContext)}\n\nQuestion: ${b.question}`;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await r.json();
    const answer = data.candidates && data.candidates[0] && data.candidates[0].content.parts[0].text;
    res.json({ answer: answer || 'No answer generated.' });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.get('/health', (req, res) => res.json({ ok: true, ffmpeg: 'native', astrology: !!process.env.ASTROLOGER_API_KEY, time: new Date().toISOString() }));

// Catch-all for any route that doesn't exist (e.g. frontend calling a newer
// endpoint than what's currently deployed here) — returns clear JSON instead
// of Express's default HTML 404 page, which is what causes the confusing
// "Unexpected token '<'" error on the frontend.
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path} — is this the latest server.js deployed?` });
});
// Catch-all for any unhandled error anywhere above — same reasoning, JSON not HTML.
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'This file is too large for Fast Server Mode on this plan. Try Browser Mode instead (unlimited size, just slower), or ask the developer to upgrade the server\'s memory.' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
