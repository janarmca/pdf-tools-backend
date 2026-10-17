// Pure-function checks for learn/foundation-widgets.js  —  node learn/tests/foundation.test.cjs
'use strict';
require('../foundation-widgets.js');
const P = globalThis.KALVI_WF_PURE, TL = globalThis.KALVI_WF_TL;
const assert = require('assert');
let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); };

// gates
ok(P.gate('AND', 1, 1) === 1 && P.gate('AND', 1, 0) === 0, 'AND');
ok(P.gate('OR', 0, 1) === 1 && P.gate('OR', 0, 0) === 0, 'OR');
ok(P.gate('NOT', 1) === 0 && P.gate('NOT', 0) === 1, 'NOT');
ok(P.gate('XOR', 1, 1) === 0 && P.gate('XOR', 1, 0) === 1, 'XOR');
ok(P.gate('NAND', 1, 1) === 0 && P.gate('NAND', 0, 1) === 1, 'NAND');
// every addition 0..7 + 0..7 done with gates only must equal ordinary addition
for(let a = 0; a < 8; a++) for(let b = 0; b < 8; b++) ok(P.addWithGates(a, b).value === a + b, 'add ' + a + '+' + b);
ok(P.halfAdder(1, 1).sum === 0 && P.halfAdder(1, 1).carry === 1, '1+1=10');
// NAND is universal: NOT / AND / OR built from NAND only
for(let a = 0; a < 2; a++){ ok(P.gate('NAND', a, a) === P.gate('NOT', a), 'nand->not');
  for(let b = 0; b < 2; b++){ const and = P.gate('NAND', P.gate('NAND', a, b), P.gate('NAND', a, b));
    ok(and === P.gate('AND', a, b), 'nand->and'); const or = P.gate('NAND', P.gate('NAND', a, a), P.gate('NAND', b, b)); ok(or === P.gate('OR', a, b), 'nand->or'); } }

// compiler: results must equal JavaScript's own arithmetic for valid input
const cases = ['2 + 3 * 4', '(2 + 3) * 4', '10 / 4', '-3 + 5', '2 * (3 + 4) - 5 / 5', '1.5 * 4', '--2', '100 - 1 - 1', '8 / 2 / 2', '7'];
cases.forEach(c => { const r = P.compile(c); ok(!r.error, c + ' should compile'); ok(Math.abs(r.value - Function('return ' + c.replace(/--/g, '- -'))()) < 1e-9, c + ' value'); });
ok(P.compile('2 + 3 * 4').value === 14 && P.compile('(2 + 3) * 4').value === 20, 'precedence');
ok(P.compile('').error === 'empty', 'empty');
ok(P.compile('2 +').error === 'ended', 'ended');
ok(P.compile('2 + * 3').error === 'unexpected', 'unexpected');
ok(P.compile('(2 + 3').error === 'paren', 'paren');
ok(P.compile('2 $ 3').error === 'badchar', 'badchar');
ok(P.compile('1.2.3').error === 'badnumber', 'badnumber');
ok(P.compile('10 / (5 - 5)').error === 'div0', 'div0');
ok(P.compile('2 3').error === 'unexpected', 'two numbers');
ok(P.compile('2 + 3 * 4').code.map(c => c.join(' ')).join(',') === 'PUSH 2,PUSH 3,PUSH 4,MUL,ADD', 'bytecode');

// learning
const w0 = P.bestW(); ok(Math.abs(P.grad(w0)) < 1e-9, 'gradient is zero at the best w');
let w = 0; for(let i = 0; i < 200; i++) w = P.gdStep(w, 0.05); ok(Math.abs(w - w0) < 1e-6, 'gd converges');
ok(P.loss(w) <= P.loss(0), 'loss falls');
let d = 0; for(let i = 0; i < 40; i++) d = P.gdStep(d, 0.17); ok(!isFinite(d) || Math.abs(d) > 1e3, 'too big a rate diverges');
let s2 = 0; for(let i = 0; i < 400; i++) s2 = P.gdStep(s2, 0.12); ok(Math.abs(s2 - w0) < 1e-3, 'rate 0.12 still converges');
let loss = P.loss(0), mono = true; w = 0; for(let i = 0; i < 30; i++){ w = P.gdStep(w, 0.05); const l = P.loss(w); if(l > loss + 1e-12) mono = false; loss = l; } ok(mono, 'loss never rises at a small rate');

// next word
const m = P.buildBigram('நான் படிக்கிறேன்.\nநான் படிக்கிறேன்.\nநான் செல்கிறேன்.');
const np = P.nextProbs(m, 'நான்'); ok(np[0].w === 'படிக்கிறேன்' && np[0].n === 2 && Math.abs(np[0].p - 2 / 3) < 1e-9, 'bigram counts');
ok(Math.abs(np.reduce((a, b) => a + b.p, 0) - 1) < 1e-9, 'probabilities sum to 1');
ok(P.nextProbs(m, 'தெரியாதது').length === 0, 'unknown word');
const g1 = P.generate(m, () => 0.0, 10); ok(g1 === 'நான் படிக்கிறேன்', 'generate (top pick)');
const g2 = P.generate(m, () => 0.99, 10); ok(g2 === 'நான் செல்கிறேன்', 'generate (rare pick)');

// timeline
ok(TL.length >= 10 && TL.every(e => e.y && e.what.ta && e.what.en && e.why.ta && e.why.en && e.who.ta && e.who.en), 'timeline entries complete');
console.log('OK — ' + n + ' foundation checks passed');
