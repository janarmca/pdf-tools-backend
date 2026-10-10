import { createRequire } from 'module'; import { makeDb } from './pg-setup.mjs';
const require = createRequire(import.meta.url);
const F = require('../m-filter.js'); const C = require('./corpus.js');
const db = await makeDb();
const pg = async (t, prev = []) => (await db.query('select mat_contact_check($1, $2::text[]) as r', [t, prev])).rows[0].r;
let bad = 0, n = 0;
async function cmp(t, prev = []) { n++; const a = F.check(t, prev), b = await pg(t, prev); if (a !== b) { bad++; console.log('DIFF', JSON.stringify(t), 'js=', a, 'sql=', b); } }
for (const t of [...C.block, ...C.pass]) await cmp(t);
for (const a of [['98765', '43210'], ['nine eight seven', 'six five four three two one'], ['9876', '5432', '10'], ['I am 28', 'height 172', '5'], ['hello', 'hi', '12', '34', '56', '78']]) await cmp(a[a.length - 1], a.slice(0, -1));
// fuzz: random mixes of fragments
const frag = ['9', '8', '7', 'nine', 'ek', 'ஒன்று', 'o', ' ', '-', '.', '/', '١٢٣', '௯', 'double', 'abc', 'hello', 'phone', '@', 'at', 'dot', 'com', 'whats', 'app', 'call', 'me', '2024', '12', '04', '1995', 'ஜி', 'மெயில்', 'நம்பர்', 'my', 'number', 'is', 'ok', '５', '❤', ',', '+91'];
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
for (let i = 0; i < 1500; i++) { const k = 2 + Math.floor(rnd() * 14); let s = ''; for (let j = 0; j < k; j++) s += frag[Math.floor(rnd() * frag.length)] + (rnd() < .5 ? ' ' : ''); await cmp(s); }
console.log(`parity: ${n} cases, ${bad} differences`); process.exit(bad ? 1 : 0);
