// Text-only AI routing (typed PDF / Word / Excel text sent by the browser to /api/ai/text).
//  - NVIDIA (free key, large context) first for summaries, resume review, Q&A; Gemini first for translation, because
//    Gemini handles Tamil/Indic scripts much better and has a far larger output limit.
//  - If the first provider fails (timeout, free-tier rate limit, retired model name) the other one is tried automatically,
//    so one dead upstream no longer breaks every text AI tool. Both are free-tier keys — no extra cost.
export const TEXT_CAP = 120000; // characters of document text accepted per request (keeps requests and the free quotas sane)
const GEMINI_FIRST = new Set(['aitranslate', 'livetranslate']);

export function clampText(text) {
  const t = String(text || '');
  return t.length > TEXT_CAP ? { text: t.slice(0, TEXT_CAP), cut: true } : { text: t, cut: false };
}

export function planProviders(env, toolId) {
  const have = { nvidia: !!env.NVIDIA_API_KEY, gemini: !!env.GEMINI_API_KEY };
  const order = GEMINI_FIRST.has(toolId) ? ['gemini', 'nvidia'] : ['nvidia', 'gemini'];
  return order.filter((p) => have[p]);
}

// impls: { nvidia: async (content) => ({text, truncated}), gemini: async (content) => ({text, truncated}) }
export async function runWithFallback(order, impls, content) {
  let last;
  for (const p of order) {
    try {
      const r = await impls[p](content);
      if (r && r.text) return { ...r, provider: p };
      last = Object.assign(new Error('The AI returned an empty answer'), { status: 502 });
    } catch (e) { last = e; }
  }
  throw last || Object.assign(new Error('AI feature not set up yet (NVIDIA_API_KEY / GEMINI_API_KEY missing).'), { status: 501 });
}

export const TRUNC_NOTE = '\n\n[… the answer was cut because it was too long — try a smaller part of the document.]';
