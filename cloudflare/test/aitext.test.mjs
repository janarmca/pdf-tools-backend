// Standalone: node --test test/aitext.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { planProviders, runWithFallback, clampText, TEXT_CAP } from '../src/aitext.js';

test('provider order', () => {
  const both = { NVIDIA_API_KEY: 'n', GEMINI_API_KEY: 'g' };
  assert.deepEqual(planProviders(both, 'aisummarize'), ['nvidia', 'gemini']);
  assert.deepEqual(planProviders(both, 'aitranslate'), ['gemini', 'nvidia']);
  assert.deepEqual(planProviders({ NVIDIA_API_KEY: 'n' }, 'aitranslate'), ['nvidia']);
  assert.deepEqual(planProviders({ GEMINI_API_KEY: 'g' }, 'airesume'), ['gemini']);
  assert.deepEqual(planProviders({}, 'askai'), []);
});
test('falls back when the first provider fails or returns nothing', async () => {
  const ok = async () => ({ text: 'from gemini', truncated: false });
  const r1 = await runWithFallback(['nvidia', 'gemini'], { nvidia: async () => { throw new Error('504'); }, gemini: ok }, 'x');
  assert.equal(r1.provider, 'gemini');
  const r2 = await runWithFallback(['nvidia', 'gemini'], { nvidia: async () => ({ text: '' }), gemini: ok }, 'x');
  assert.equal(r2.text, 'from gemini');
});
test('first provider wins when healthy; last error surfaces when all fail', async () => {
  const r = await runWithFallback(['nvidia', 'gemini'], { nvidia: async () => ({ text: 'n' }), gemini: async () => { throw new Error('no'); } }, 'x');
  assert.equal(r.provider, 'nvidia');
  await assert.rejects(runWithFallback(['nvidia', 'gemini'], { nvidia: async () => { throw new Error('a'); }, gemini: async () => { throw new Error('b'); } }, 'x'), /b/);
});
test('clampText', () => {
  assert.deepEqual(clampText('abc'), { text: 'abc', cut: false });
  const big = clampText('x'.repeat(TEXT_CAP + 5));
  assert.equal(big.text.length, TEXT_CAP); assert.equal(big.cut, true);
});
