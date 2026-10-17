// Standalone (no wrangler needed): node --test test/imgprompt.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareImagePrompt, detectLang } from '../src/imgprompt.js';

test('detects scripts', () => {
  assert.equal(detectLang('ஒரு ஊரில் வீடு'), 'ta');
  assert.equal(detectLang('एक गाँव का घर'), 'hi');
  assert.equal(detectLang('a cat on a sofa'), null);
});
test('English passes through without calling AI', async () => {
  const env = { AI: { run: () => { throw new Error('should not be called'); } } };
  const r = await prepareImagePrompt(env, '  a cat   on a sofa ');
  assert.deepEqual(r, { prompt: 'a cat on a sofa', translated: false, from: 'en' });
});
test('Tamil is translated with m2m100 (ta → en)', async () => {
  let seen;
  const env = { AI: { run: async (m, i) => { seen = [m, i]; return { translated_text: 'A sister and brother playing in front of a beautiful house in a village' }; } } };
  const r = await prepareImagePrompt(env, 'ஒரு ஊரில் ஒரு அழகான வீடு அதில் அக்காவும் தம்பியும் விளையாடிக் கொண்டிருக்கிறார்கள்');
  assert.equal(seen[0], '@cf/meta/m2m100-1.2b');
  assert.equal(seen[1].source_lang, 'ta'); assert.equal(seen[1].target_lang, 'en');
  assert.equal(r.translated, true); assert.match(r.prompt, /sister and brother/);
});
test('failed or untranslated output is an error (credits get refunded by the caller)', async () => {
  await assert.rejects(prepareImagePrompt({ AI: { run: async () => { throw new Error('x'); } } }, 'வீடு'), (e) => e.status === 502);
  await assert.rejects(prepareImagePrompt({ AI: { run: async () => ({ translated_text: 'வீடு' }) } }, 'வீடு'), (e) => e.status === 502);
  await assert.rejects(prepareImagePrompt({ AI: { run: async () => ({}) } }, 'வீடு'), (e) => e.status === 502);
});
test('unsupported scripts are refused clearly', async () => {
  await assert.rejects(prepareImagePrompt({ AI: {} }, '猫がソファの上'), (e) => e.status === 400);
});
test('mixed Tamil + English is translated', async () => {
  const env = { AI: { run: async () => ({ translated_text: 'a red car near a house' }) } };
  assert.equal((await prepareImagePrompt(env, 'red car வீடு அருகில்')).prompt, 'a red car near a house');
});
test('retries with full language names when the two-letter code is rejected', async () => {
  const calls = [];
  const env = { AI: { run: async (m, i) => { calls.push(i.source_lang); if (i.source_lang === 'ta') throw new Error('bad lang'); return { translated_text: 'a house in a village' }; } } };
  const r = await prepareImagePrompt(env, 'ஊரில் வீடு');
  assert.deepEqual(calls, ['ta', 'tamil']); assert.equal(r.prompt, 'a house in a village');
});
