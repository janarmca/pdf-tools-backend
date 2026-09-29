// Automated correctness test for every Class 1–5 game in learn/catalog.json.
// Run: node learn/tests/games.test.cjs   (exit code 1 on any failure)
'use strict';
const path = require('path');
const root = path.join(__dirname, '..');
const vm = require('vm'), fs = require('fs');
vm.runInThisContext(fs.readFileSync(path.join(root, 'games-math.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root, 'games-lang.js'), 'utf8'));
const GAMES = Object.assign({}, globalThis.KALVI_MATH, globalThis.KALVI_LANG);
const cat = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json'), 'utf8'));
const N = Number(process.env.N || 3000);
let fails = 0, total = 0;
const fail = (id, msg, q) => { fails++; if(fails < 40) console.log('FAIL', id, msg, q ? JSON.stringify({p:q.p, ans:q.ans, opts:q.opts && q.opts.map(o => o.v)}).slice(0, 300) : ''); };
const txt = q => JSON.stringify(q);
const num = s => Number(String(s).replace(/,/g, ''));

// independent re-computation from the English prompt text
const INDEP = {
  add: q => { const m = q.p.en.match(/^([\d,]+) \+ ([\d,]+) = \?$/); return m ? num(m[1]) + num(m[2]) : undefined; },
  sub: q => { const m = q.p.en.match(/^([\d,]+) − ([\d,]+) = \?$/); return m ? num(m[1]) - num(m[2]) : undefined; },
  multiply: q => { const m = q.p.en.match(/^([\d,]+) × ([\d,]+) = \?$/); return m ? num(m[1]) * num(m[2]) : undefined; },
  missing: q => { const m = q.p.en.match(/\( □ ([+−×]) (\d+) = (\d+) \)/); if(!m) return; const a = +m[2], b = +m[3]; return m[1] === '+' ? b - a : m[1] === '−' ? b + a : b / a; },
  share: q => { let m = q.p.en.match(/^(\d+) sweets shared equally among (\d+)/); if(m) return +m[1] / +m[2];
    m = q.p.en.match(/^([\d,]+) ÷ (\d+) = \? \(quotient/); if(m){ const n = num(m[1]), d = +m[2]; return `${Math.floor(n / d)} r ${n % d}`; }
    m = q.p.en.match(/^([\d,]+) ÷ (\d+) = \?$/); if(m) return num(m[1]) / +m[2]; },
  convert: q => { const F = {m:100, kg:1000, L:1000, km:1000}; let m = q.p.en.match(/^(\d+) (m|kg|L|km) (\d+) (cm|g|mL|m) = how many/); if(m) return +m[1] * F[m[2]] + +m[3];
    m = q.p.en.match(/^(\d+) (m|kg|L|km) = how many/); if(m) return +m[1] * F[m[2]]; },
  fractionAdd: q => { const m = q.p.en.match(/^(\d+)\/(\d+) \+ (\d+)\/(\d+) = \?$/); return m && m[2] === m[4] ? `${+m[1] + +m[3]}/${m[2]}` : undefined; },
  rounding: q => { const m = q.p.en.match(/^Round ([\d,]+) to the nearest (\d+)$/); if(!m) return; const n = num(m[1]), t = +m[2]; const r = n % t; return r * 2 >= t ? n - r + t : n - r; },
  neighbours: q => { const m = q.p.en.match(/comes (after|before) ([\d,]+)\?/); return m ? num(m[2]) + (m[1] === 'after' ? 1 : -1) : undefined; },
  placeValue: q => { const m = q.p.en.match(/^In ([\d,]+), what is the place value of (\d)\?$/); if(!m) return; const s = m[1].replace(/,/g, ''), i = s.indexOf(m[2]); return +m[2] * Math.pow(10, s.length - 1 - i); },
  change: q => { const m = q.p.en.match(/costs ₹(\d+)\. You pay ₹(\d+)\./); return m ? +m[2] - +m[1] : undefined; },
  perimeter: q => { let m = q.p.en.match(/area of the rectangle in square units\? \((\d+) × (\d+)\)/); if(m) return +m[1] * +m[2]; m = q.p.en.match(/perimeter of the rectangle in units\? \(length (\d+), width (\d+)\)/); if(m) return 2 * (+m[1] + +m[2]); },
  oddEven: q => { const m = q.p.en.match(/^([\d,]+) — odd or even\?$/); return m ? (num(m[1]) % 2 ? 'odd' : 'even') : undefined; },
  calendar: q => { const D = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; let m = q.p.en.match(/^Today is (\w+)\. What day is it (\d+) days? later\?$/); if(m) return (D.indexOf(m[1]) + +m[2]) % 7;
    m = q.p.en.match(/^How many days are there in (\w+)\?$/); if(m) return {January:31,March:31,April:30,May:31,June:30,July:31,August:31,September:30,October:31,November:30,December:31}[m[1]]; },
  duration: q => { const m = q.p.en.match(/from (\d+):(\d\d) (AM|PM) to (\d+):(\d\d) (AM|PM)\?/); if(!m) return; const t = (h, mm, ap) => ((+h % 12) + (ap === 'PM' ? 12 : 0)) * 60 + +mm; const d = t(m[4], m[5], m[6]) - t(m[1], m[2], m[3]); return `${Math.floor(d / 60)} h ${d % 60} min`; },
  uyirmeiBuild: q => { const T = globalThis.KALVI_TAMIL; let m = q.p.en.match(/^(.+) \+ (.+) = \?$/); if(m){ const c = T.MEI.indexOf(m[1][0]), v = T.UYIR.indexOf(m[2]); return T.MEI[c] + T.SIGN[v]; }
    m = q.p.en.match(/^"(.+)" = \? \+ \?$/); if(m){ const p = T.parseLetter(m[1]); return `${T.MEI[p.c]}்` + ` + ${T.UYIR[p.v]}`; } }
};


// checks based on what the child actually SEES in the picture
const SCENE = {
  count: q => { const inner = q.scene.replace(/<[^>]+>/g, ' '); return [...inner.matchAll(/\S+/g)].length; },
  money: q => [...q.scene.matchAll(/>₹(\d+)</g)].reduce((a, m) => a + +m[1], 0),
  placeBlocks: q => { const h = (q.scene.match(/fill="#c7d2fe"/g) || []).length / 100, t = (q.scene.match(/fill="#fde68a"/g) || []).length / 10, o = (q.scene.match(/fill="#bbf7d0"/g) || []).length; return h * 100 + t * 10 + o; },
  fractionName: q => { const parts = (q.scene.match(/<path /g) || []).length, sh = (q.scene.match(/fill="#fb923c"/g) || []).length; return `${sh}/${parts}`; },
  clock: q => { const L = [...q.scene.matchAll(/<line x1="100" y1="100" x2="([\d.e-]+)" y2="([\d.e-]+)" stroke="(#a4133c|#0b7a75)"/g)];
    const ang = m => (Math.atan2(+m[2] - 100, +m[1] - 100) * 180 / Math.PI + 90 + 360) % 360;
    const hr = L.find(m => m[3] === '#a4133c'), mn = L.find(m => m[3] === '#0b7a75'); const mins = Math.round(ang(mn) / 6) % 60; let h = Math.floor((ang(hr) + 0.01) / 30) % 12; if(h === 0) h = 12; return `${h}:${String(mins).padStart(2, '0')}`; },
  skip: q => { const n = [...q.scene.matchAll(/<span>([\d,]+)<\/span>/g)].map(m => num(m[1])); const d = n[1] - n[0]; if(n.some((x, i) => i && x - n[i - 1] !== d)) return 'inconsistent'; return n[3] + d; },
  compare: q => { const [a0, b0] = q.scene.split('<b>B</b>'); const cnt = h => (h.replace('<b>A</b>', '').replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length; const a = cnt(a0), b = cnt(b0); return a > b ? 'A' : a < b ? 'B' : '='; }
};
const HITS = {}, WANT = {}; let SEENOK = 0;
for(const [cls, C] of Object.entries(cat.classes)){
  if(+cls > 5) continue;
  for(const s of C.subjects) for(const ch of s.chapters) for(const L of ch.lessons){
    const G = GAMES[L.game];
    if(INDEP[L.game]) WANT[L.id] = true;
    if(!G){ fail(L.id, 'unknown game ' + L.game); continue; }
    if(!G.title || !G.intro || !G.intro.ta || !G.intro.en) fail(L.id, 'missing title/intro');
    for(let k = 0; k < N; k++){
      total++;
      let q; try { q = G.gen(L.level || {}); } catch(e){ fail(L.id, 'gen threw ' + e.message); break; }
      const t = txt(q);
      if(/undefined|NaN|null\b|\[object/.test(t.replace(/"say":null/g, ''))){ fail(L.id, 'bad text', q); break; }
      if(!q.p || !q.p.ta || !q.p.en){ fail(L.id, 'missing prompt', q); break; }
      if(q.kind === 'sort'){
        const ids = q.bins.map(b => b.id);
        if(q.bins.length < 2 || q.items.length < q.bins.length) { fail(L.id, 'sort too small', q); break; }
        if(q.items.some(it => !ids.includes(it.bin))) { fail(L.id, 'item with unknown bin', q); break; }
        if(new Set(q.items.map(x => x.h)).size !== q.items.length){ fail(L.id, 'duplicate sort items', q); break; }
        continue;
      }
      const vs = q.opts.map(o => JSON.stringify(o.v)), hs = q.opts.map(o => o.h);
      if(q.opts.length < 2){ fail(L.id, 'fewer than 2 options', q); break; }
      if(new Set(vs).size !== vs.length){ fail(L.id, 'duplicate option values', q); break; }
      if(new Set(hs).size !== hs.length){ fail(L.id, 'duplicate option labels', q); break; }
      if(vs.filter(v => v === JSON.stringify(q.ans)).length !== 1){ fail(L.id, 'answer not exactly once in options', q); break; }
      if(q.check && !q.check(q)){ fail(L.id, 'self-check failed', q); break; }
      if(!q.ex || !q.ex.ta || !q.ex.en){ fail(L.id, 'missing explanation', q); break; }
      const f = INDEP[L.game];
      if(f){ const want = f(q); if(want !== undefined) HITS[L.id] = (HITS[L.id] || 0) + 1; if(want !== undefined && JSON.stringify(want) !== JSON.stringify(q.ans)){ fail(L.id, `independent check: want ${JSON.stringify(want)}`, q); break; } }
      const sf = SCENE[L.game];
      if(sf && !(L.level && L.level.pic === true && L.game !== 'count')){ const seen = sf(q); if(JSON.stringify(seen) !== JSON.stringify(q.ans)){ fail(L.id, `picture shows ${JSON.stringify(seen)}`, q); break; } SEENOK++; }
    }
  }
}
// every game with an independent checker must actually have been checked on most questions
for(const id of Object.keys(WANT)) if((HITS[id] || 0) < N * 0.3) fail(id, `independent checker matched only ${HITS[id] || 0}/${N}`);
console.log('picture-verified answers:', SEENOK);
console.log('independently re-computed:', Object.values(HITS).reduce((a, b) => a + b, 0), 'answers in', Object.keys(WANT).length, 'games');
// Tamil data integrity
const T = globalThis.KALVI_TAMIL;
for(const [w, e, parts] of T.WORDS){ if(parts.join('') !== w) fail('tamil-words', 'split mismatch ' + w); parts.forEach(p => { if(!T.parseLetter(p)) fail('tamil-words', 'bad letter ' + p + ' in ' + w); }); }
for(const u of T.UYIR_WORDS) if(u.w[0] !== T.UYIR[u.l]) fail('tamil-uyir', u.w);
if(T.MEI.length !== 18 || T.UYIR.length !== 12 || T.SIGN.length !== 12) fail('tamil', 'letter counts');
console.log(`checked ${total} generated questions across ${Object.values(cat.classes).slice(0, 5).reduce((a, C) => a + C.subjects.reduce((b, s) => b + s.chapters.reduce((c, ch) => c + ch.lessons.length, 0), 0), 0)} games — failures: ${fails}`);
process.exit(fails ? 1 : 0);
