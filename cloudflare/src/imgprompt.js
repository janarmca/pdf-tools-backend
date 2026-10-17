// Text→Image prompt preparation. FLUX.1-schnell understands English only: a Tamil/Hindi prompt sent as-is is mostly ignored
// and the model draws a generic picture (a family portrait instead of "children playing outside a village house").
// So non-English prompts are translated first with the free Workers AI translation model (m2m100).
const SCRIPTS = [
  ['ta', /[஀-௿]/g], // Tamil
  ['hi', /[ऀ-ॿ]/g], // Devanagari (Hindi / Marathi)
  ['kn', /[ಀ-೿]/g], // Kannada
  ['te', /[ఀ-౿]/g], // Telugu
  ['ml', /[ഀ-ൿ]/g], // Malayalam
];
const NON_LATIN = /[^\u0000-ɏ -⁯₠-⃏]/;

export function detectLang(text) {
  let best = null, bestN = 0;
  for (const [code, re] of SCRIPTS) { const n = (text.match(re) || []).length; if (n > bestN) { best = code; bestN = n; } }
  return best;
}

// returns { prompt, translated, from }; throws an Error (with .status) when a non-English prompt cannot be translated
export async function prepareImagePrompt(env, raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 900);
  const from = detectLang(text);
  if (!from) {
    if (NON_LATIN.test(text)) throw Object.assign(new Error('Please describe the picture in English, Tamil or Hindi.'), { status: 400 });
    return { prompt: text, translated: false, from: 'en' };
  }
  // Cloudflare's docs show two-letter codes in the parameter text but full names in the examples — try both
  const NAMES = { ta: 'tamil', hi: 'hindi', kn: 'kannada', te: 'telugu', ml: 'malayalam' };
  let out, last;
  for (const [src, dst] of [[from, 'en'], [NAMES[from], 'english']]) {
    try { out = await env.AI.run('@cf/meta/m2m100-1.2b', { text, source_lang: src, target_lang: dst }); last = null; if (out && (out.translated_text || out.translation)) break; }
    catch (e) { last = e; }
  }
  if (last) throw Object.assign(new Error('Translation of your description failed — please write it in English or try again.'), { status: 502 });
  const en = String((out && (out.translated_text || out.translation)) || '').trim();
  if (!en || NON_LATIN.test(en)) throw Object.assign(new Error('Could not understand the description — please write it in English or simplify it.'), { status: 502 });
  return { prompt: en.slice(0, 2000), translated: true, from };
}
