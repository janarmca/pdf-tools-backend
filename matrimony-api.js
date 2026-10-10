// ============================================================
// சௌடேஸ்வரி திருமண அமைப்பகம் — ₹50 chat-unlock payments (Cloud Run / server.js)
// Two small routes + one helper for the existing Razorpay webhook.
//   POST /api/matrimony/create-order  { other_id }                       (login required)
//   POST /api/matrimony/verify        { razorpay_order_id, razorpay_payment_id, razorpay_signature }
//   matrimonyOnCaptured(payment)      call from the webhook (see MATRIMONY_SETUP.md)
// The unlock itself is written by the database function mat_record_unlock() using the
// service-role key, so a browser can never fake a payment.
// ============================================================
import crypto from 'crypto';

export const MATRIMONY_FEE_PAISE = Math.max(100, parseInt(process.env.MATRIMONY_FEE_PAISE || '5000', 10) || 5000); // ₹50

export function registerMatrimonyRoutes(app, { supabase, razorpay, requireAuth, limiter }) {
  const lim = limiter || ((req, res, next) => next());

  async function pairState(a, b) {
    const lo = a < b ? a : b, hi = a < b ? b : a;
    const [{ data: ps }, { data: ints }, { data: unl }, { data: blk }] = await Promise.all([
      supabase.from('mat_profiles').select('user_id,status').in('user_id', [a, b]),
      supabase.from('mat_interests').select('id').eq('status', 'accepted')
        .or(`and(from_user.eq.${a},to_user.eq.${b}),and(from_user.eq.${b},to_user.eq.${a})`),
      supabase.from('mat_unlocks').select('user_a').eq('user_a', lo).eq('user_b', hi),
      supabase.from('mat_blocks').select('blocker')
        .or(`and(blocker.eq.${a},blocked.eq.${b}),and(blocker.eq.${b},blocked.eq.${a})`)
    ]);
    return {
      bothApproved: (ps || []).length === 2 && ps.every(p => p.status === 'approved'),
      accepted: (ints || []).length > 0,
      unlocked: (unl || []).length > 0,
      blocked: (blk || []).length > 0
    };
  }

  app.post('/api/matrimony/create-order', lim, requireAuth, async (req, res) => {
    try {
      if (!razorpay) return res.status(500).json({ error: 'Razorpay இன்னும் இணைக்கப்படவில்லை' });
      const me = req.user.id, other = String((req.body && req.body.other_id) || '');
      if (!/^[0-9a-f-]{36}$/i.test(other) || other === me) return res.status(400).json({ error: 'தவறான கோரிக்கை' });
      const st = await pairState(me, other);
      if (!st.bothApproved || st.blocked) return res.status(403).json({ error: 'இந்த உறுப்பினருடன் chat திறக்க முடியாது' });
      if (!st.accepted) return res.status(403).json({ error: 'முதலில் Interest ஏற்கப்பட வேண்டும்' });
      if (st.unlocked) return res.json({ unlocked: true });
      const order = await razorpay.orders.create({
        amount: MATRIMONY_FEE_PAISE, currency: 'INR',
        receipt: `mat_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`.slice(0, 40),
        notes: { app: 'matrimony', payer: me, other }
      });
      const { error } = await supabase.from('mat_orders').insert({ order_id: order.id, user_id: me, other_id: other, amount_paise: MATRIMONY_FEE_PAISE });
      if (error) throw new Error(error.message);
      res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
    } catch (e) {
      console.error('matrimony create-order:', e.message);
      res.status(500).json({ error: 'Order உருவாக்க முடியவில்லை — மீண்டும் முயற்சிக்கவும்' });
    }
  });

  app.post('/api/matrimony/verify', lim, requireAuth, async (req, res) => {
    try {
      const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = req.body || {};
      if (!oid || !pid || !sig) return res.status(400).json({ error: 'Payment details missing' });
      if (!verifySignature(oid, pid, sig, process.env.RAZORPAY_KEY_SECRET)) return res.status(400).json({ error: 'கையொப்பம் பொருந்தவில்லை (invalid signature)' });
      const { data: order } = await supabase.from('mat_orders').select('*').eq('order_id', oid).eq('user_id', req.user.id).maybeSingle();
      if (!order) return res.status(404).json({ error: 'Order கிடைக்கவில்லை' });
      const r = await fulfil(supabase, order, pid);
      if (!r.ok) return res.status(409).json({ error: 'Chat திறக்க முடியவில்லை: ' + (r.code || 'error') });
      res.json({ ok: true });
    } catch (e) {
      console.error('matrimony verify:', e.message);
      res.status(500).json({ error: 'சரிபார்க்க முடியவில்லை — பணம் எடுக்கப்பட்டிருந்தால் 10 நிமிடத்தில் தானாக chat திறக்கும்' });
    }
  });
}

export function verifySignature(orderId, paymentId, signature, secret) {
  if (!secret || !orderId || !paymentId || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(orderId + '|' + paymentId).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function fulfil(supabase, order, paymentId) {
  const { data, error } = await supabase.rpc('mat_record_unlock', {
    a: order.user_id, b: order.other_id, payer: order.user_id,
    p_order: order.order_id, p_payment: paymentId, p_amount: order.amount_paise
  });
  if (error) throw new Error(error.message);
  return data || { ok: false };
}

// Backup path: the existing Razorpay webhook calls this for payments whose notes.app === 'matrimony'
export async function matrimonyOnCaptured(supabase, payment) {
  if (!payment || !payment.notes || payment.notes.app !== 'matrimony') return false;
  const { data: order } = await supabase.from('mat_orders').select('*').eq('order_id', payment.order_id).maybeSingle();
  if (!order || Number(payment.amount) !== Number(order.amount_paise)) return true; // ours, but nothing to do / mismatch
  await fulfil(supabase, order, payment.id);
  return true;
}
