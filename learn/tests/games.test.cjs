// Automated correctness test for every Class 1–5 game in learn/catalog.json.
// Run: node learn/tests/games.test.cjs   (exit code 1 on any failure)
'use strict';
const path = require('path');
const root = path.join(__dirname, '..');
const vm = require('vm'), fs = require('fs');
vm.runInThisContext(fs.readFileSync(path.join(root, 'games-math.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root, 'games-lang.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root, 'games-think.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root, 'games-mid.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root, 'games-mid2.js'), 'utf8'));
const GAMES = Object.assign({}, globalThis.KALVI_MATH, globalThis.KALVI_LANG, globalThis.KALVI_THINK, globalThis.KALVI_MID);
const MAXCLASS = 8;
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
  // ---- Thinking Lab: solved again here, independently of the generator ----
  robot: q => { const d = q.data, walls = new Set(d.walls), M = {'↑':[0,-1],'↓':[0,1],'←':[-1,0],'→':[1,0]};
    const run = s => { let [x, y] = d.start; for(const m of s.split(' ')){ const v = M[m]; if(!v) return false; x += v[0]; y += v[1]; if(x < 0 || y < 0 || x >= d.W || y >= d.H || walls.has(x + ',' + y)) return false; } return x === d.goal[0] && y === d.goal[1]; };
    const good = q.opts.filter(o => run(o.v)); return good.length === 1 ? good[0].v : 'reaching programs: ' + good.length; },
  magicSquare: q => { const m = q.data.m, sums = [...m.map(r => r[0] + r[1] + r[2]), ...[0,1,2].map(j => m[0][j] + m[1][j] + m[2][j]), m[0][0] + m[1][1] + m[2][2], m[0][2] + m[1][1] + m[2][0]];
    if(new Set(sums).size !== 1) return 'not magic'; if(new Set(m.flat()).size !== 9) return 'repeated number';
    const cells = [...q.scene.matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map(x => x[1]); if(cells.filter(x => x === '?').length !== 1) return 'bad grid';
    const i = cells.indexOf('?'), row = [0,1,2].map(j => cells[Math.floor(i / 3) * 3 + j]).filter(x => x !== '?').map(Number); return sums[0] - row[0] - row[1]; },
  balance: q => { const lines = [...q.scene.matchAll(/<div>([^<]*)<\/div>/g)].map(x => x[1]).filter(l => /=\s*\d/.test(l));
    const first = lines[0].split(' = '), n = first[0].split(' + ').length, a = +first[1] / n; if(lines.length === 1) return a;
    return +lines[1].split(' = ')[1] - a; },
  sequence: q => { const n = [...q.scene.matchAll(/<span>([\d,]+)<\/span>/g)].map(x => num(x[1])), L = n.length;
    const d = n.map((x, i) => i ? x - n[i - 1] : null).slice(1);
    if(d.every(x => x === d[0])) return n[L - 1] + d[0];
    if(n.slice(1).every((x, i) => x === n[i] * 2)) return n[L - 1] * 2;
    if(n.slice(1).every((x, i) => x === n[i] * 3)) return n[L - 1] * 3;
    if(n.slice(2).every((x, i) => x === n[i] + n[i + 1])) return n[L - 1] + n[L - 2];
    if(n.every(x => Number.isInteger(Math.sqrt(x))) && d.every((x, i) => !i || x === d[i - 1] + 2)) return Math.pow(Math.sqrt(n[L - 1]) + 1, 2);
    if(d.every((x, i) => !i || x === d[i - 1] + 1)) return n[L - 1] + d[d.length - 1] + 1; return 'no rule'; },
  oddOut: q => { const k = +q.p.en.match(/multiple of (\d+)/)[1], odd = q.opts.filter(o => o.v % k !== 0); return odd.length === 1 ? odd[0].v : 'odd count ' + odd.length; },
  logic: q => { const pairs = [...q.scene.matchAll(/<small>(\w+) is taller than (\w+)\.<\/small>/g)].map(x => [x[1], x[2]]);
    const names = [...new Set(pairs.flat())], shorter = new Set(pairs.map(x => x[1])), taller = new Set(pairs.map(x => x[0]));
    const top = names.filter(x => !shorter.has(x)), bot = names.filter(x => !taller.has(x)); if(top.length !== 1 || bot.length !== 1) return 'ambiguous';
    return /tallest/.test(q.p.en) ? top[0] : bot[0]; },
  hindiWord: q => { const w = q.p.en.match(/is "(.+)" in Hindi/)[1]; const H = globalThis.KALVI_HINDI; return H.HI_SWAR.concat(H.HI_VYAN).includes(w[0]) ? w[0] : 'not a letter ' + w[0]; },
  hindiNum: q => ['', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस'][+q.p.en.match(/^(\d+) —/)[1]],
  greetings: q => { const w = q.scene.replace(/<[^>]+>/g, ''), c = w.codePointAt(0);
    const B = [[0x0B80, 0x0BFF, 'தமிழ்'], [0x0900, 0x097F, 'இந்தி'], [0x0D00, 0x0D7F, 'மலையாளம்'], [0x0C00, 0x0C7F, 'தெலுங்கு'], [0x0C80, 0x0CFF, 'கன்னடம்'], [0x0980, 0x09FF, 'வங்காளம்'], [0x0A80, 0x0AFF, 'குஜராத்தி'], [0x0A00, 0x0A7F, 'பஞ்சாபி'], [0x0B00, 0x0B7F, 'ஒடியா'], [0x0600, 0x06FF, 'உருது'], [0x41, 0x7A, 'ஆங்கிலம்']];
    const b = B.find(x => c >= x[0] && c <= x[1]); return b ? b[2] : 'unknown script'; },
  uyirmeiBuild: q => { const T = globalThis.KALVI_TAMIL; let m = q.p.en.match(/^(.+) \+ (.+) = \?$/); if(m){ const c = T.MEI.indexOf(m[1][0]), v = T.UYIR.indexOf(m[2]); return T.MEI[c] + T.SIGN[v]; }
    m = q.p.en.match(/^"(.+)" = \? \+ \?$/); if(m){ const p = T.parseLetter(m[1]); return `${T.MEI[p.c]}்` + ` + ${T.UYIR[p.v]}`; } }
};

// ---- Classes 6–8: every answer re-solved here from the question text with independent code ----
const g_ = (a, b) => { a = Math.abs(a); b = Math.abs(b); while(b){ const t = a % b; a = b; b = t; } return a; };
const prime_ = n => { if(n < 2) return false; for(let d = 2; d * d <= n; d++) if(n % d === 0) return false; return true; };
const pn = t => Number(t.replace(/−/g, '-').replace(/[(),₹]/g, ''));
const rat = t => { t = t.replace(/[()]/g, '').replace(/−/g, '-'); const m = t.match(/^(-?\d+)(?:\/(\d+))?$/); return m ? [BigInt(m[1]), BigInt(m[2] || 1)] : null; };
const rstr = ([n, d]) => { if(d < 0n){ n = -n; d = -d; } const gg = (a, b) => { a = a < 0n ? -a : a; while(b){ [a, b] = [b, a % b]; } return a; }; const k = gg(n, d) || 1n; n /= k; d /= k; const neg = n < 0n; const a = neg ? -n : n; return d === 1n ? (neg ? '−' : '') + Number(a).toLocaleString('en-IN') : `${neg ? '−' : ''}${a}/${d}`; };
const hund = t => { t = t.replace(/−/g, '-').replace(/,/g, ''); const neg = t.startsWith('-'); if(neg) t = t.slice(1); const [i, f = ''] = t.split('.'); return (neg ? -1 : 1) * (Number(i) * 100 + Number((f + '00').slice(0, 2))); };
const hstr = h => { const neg = h < 0; h = Math.abs(h); const i = Math.floor(h / 100), f = h % 100; return (neg ? '−' : '') + i.toLocaleString('en-IN') + (f ? '.' + String(f).padStart(2, '0').replace(/0$/, '') : ''); };
const SUPR = {'⁰':0,'¹':1,'²':2,'³':3,'⁴':4,'⁵':5,'⁶':6,'⁷':7,'⁸':8,'⁹':9}, unsup = t => Number(t.split('').map(c => SUPR[c]).join(''));
const romanOf = n => { const V = [1000,900,500,400,100,90,50,40,10,9,5,4,1], R = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I']; let s = ''; V.forEach((v, i) => { while(n >= v){ s += R[i]; n -= v; } }); return s; };
const fromRoman = s => { const v = {I:1,V:5,X:10,L:50,C:100,D:500,M:1000}; let t = 0; for(let i = 0; i < s.length; i++){ const a = v[s[i]], b = v[s[i + 1]] || 0; t += a < b ? -a : a; } return t; };
const clock12 = h => { h = ((h % 24) + 24) % 24; return `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`; };
Object.assign(INDEP, {
  intAdd: q => { const m = q.p.en.match(/^(.+) ([+−]) (.+) = \?$/); if(!m) return; const a = pn(m[1]), b = pn(m[3]); return m[2] === '+' ? a + b : a - b; },
  intMul: q => { const m = q.p.en.match(/^(.+) ([×÷]) (.+) = \?$/); if(!m) return; const a = pn(m[1]), b = pn(m[3]); return m[2] === '×' ? a * b : a / b; },
  hcfLcm: q => { const m = q.p.en.match(/^(HCF|LCM) of (\d+) and (\d+)/); if(!m) return; const a = +m[2], b = +m[3], h = g_(a, b); return m[1] === 'HCF' ? h : a * b / h; },
  prime: q => { const p = q.opts.filter(o => prime_(o.v)); return p.length === 1 ? p[0].v : 'primes ' + p.length; },
  bigNumbers: q => { const m = q.p.en.match(/^Write ([\d,]+) in the (International|Indian) system$/); if(!m) return; const n = m[1].replace(/,/g, '');
    if(m[2] === 'International') return n.replace(/\B(?=(\d{3})+(?!\d))/g, ','); const last = n.slice(-3), rest = n.slice(0, -3); return (rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' : '') + last; },
  roman: q => { let m = q.p.en.match(/^(\d+) in Roman numerals\?$/); if(m) return romanOf(+m[1]); m = q.p.en.match(/^([IVXLCDM]+) = \?$/); if(m){ const n = fromRoman(m[1]); return romanOf(n) === m[1] ? n : 'bad roman'; } },
  fracSimplify: q => { const m = q.p.en.match(/^Write (\d+)\/(\d+) in lowest terms$/); if(!m) return; const a = +m[1], b = +m[2], h = g_(a, b); return `${a / h}/${b / h}`; },
  fracOps: q => { const m = q.p.en.match(/^(\(?−?\d+(?:\/\d+)?\)?) ([+−×÷]) (\(?−?\d+(?:\/\d+)?\)?) = \?$/); if(!m) return; const [an, ad] = rat(m[1]), [bn, bd] = rat(m[3]);
    const r = {'+':[an * bd + bn * ad, ad * bd], '−':[an * bd - bn * ad, ad * bd], '×':[an * bn, ad * bd], '÷':[an * bd, ad * bn]}[m[2]]; return rstr(r); },
  fracCompare: q => { const m = q.p.en.match(/^Which is bigger: (\d+)\/(\d+) or (\d+)\/(\d+)\?$/); if(!m) return; return (+m[1]) * (+m[4]) > (+m[3]) * (+m[2]) ? `${m[1]}/${m[2]}` : `${m[3]}/${m[4]}`; },
  decimals: q => { const m = q.p.en.match(/^([\d,.]+) ([+−×]) ([\d,.]+) = \?$/); if(!m) return; const a = hund(m[1]);
    if(m[2] === '×') return hstr(a * Number(m[3])); const b = hund(m[3]); return hstr(m[2] === '+' ? a + b : a - b); },
  ratio: q => { let m = q.p.en.match(/^Simplify (\d+) : (\d+)$/); if(m){ const h = g_(+m[1], +m[2]); return `${m[1] / h} : ${m[2] / h}`; }
    m = q.p.en.match(/^Share ₹([\d,]+) in the ratio (\d+) : (\d+)\. The larger share/); if(m) return num(m[1]) * Math.max(+m[2], +m[3]) / (+m[2] + +m[3]); },
  proportion: q => { let m = q.p.en.match(/^(\d+) workers finish a job in (\d+) days\. How many days will (\d+) workers/); if(m) return m[1] * m[2] / m[3];
    m = q.p.en.match(/^(\d+) \w+ cost ₹(\d+)\. How much do (\d+) /); if(m) return m[2] / m[1] * m[3]; },
  percent: q => { let m = q.p.en.match(/^(\d+)% of (\d+) = \?$/); if(m) return m[1] * m[2] / 100; m = q.p.en.match(/^Write (\d+)\/(\d+) as a percentage$/); if(m) return m[1] * 100 / m[2]; },
  profitLoss: q => { const m = q.p.en.match(/^CP ₹([\d,]+), SP ₹([\d,]+)\. Profit or loss(, and how much| percent)\?$/); if(!m) return; const cp = num(m[1]), sp = num(m[2]), w = sp > cp ? 'profit' : 'loss', d = Math.abs(sp - cp);
    return m[3] === ' percent' ? `${w} ${d * 100 / cp}%` : `${w} ${d}`; },
  interest: q => { let m = q.p.en.match(/^P = ₹([\d,]+), R = (\d+)% per year, T = (\d+) years\. Simple interest/); if(m) return num(m[1]) * m[2] * m[3] / 100;
    m = q.p.en.match(/^P = ₹([\d,]+), R = (\d+)% per year, (\d+) years, compounded yearly\. Compound interest/); if(m){ let a = num(m[1]); for(let i = 0; i < +m[3]; i++) a = a * (100 + +m[2]) / 100; return Math.round(a * 1e6) / 1e6 - num(m[1]); } },
  speed: q => { let m = q.p.en.match(/covers (\d+) km in (\d+) hours\. Speed/); if(m) return m[1] / m[2]; m = q.p.en.match(/at (\d+) km\/h for (\d+) hours, distance/); if(m) return m[1] * m[2];
    m = q.p.en.match(/to cover (\d+) km at (\d+) km\/h\?/); if(m) return m[1] / m[2]; },
  timeWork: q => { const m = q.p.en.match(/in (\d+) days and B in (\d+) days/); if(m) return 1 / (1 / m[1] + 1 / m[2]) + 1e-9 | 0; },
  solveEq: q => { const m = q.p.en.match(/^Solve: (.+) = (.+)\. x = \?$/); if(!m) return; const side = (t, x) => { t = t.replace(/−/g, '-').replace(/ /g, ''); let v = 0; for(const term of t.match(/[+-]?[^+-]+/g)){ if(term.endsWith('x')){ const c = term.slice(0, -1); v += (c === '' || c === '+' ? 1 : c === '-' ? -1 : Number(c)) * x; } else v += Number(term); } return v; };
    const sol = []; for(let x = -100; x <= 100; x++) if(side(m[1], x) === side(m[2], x)) sol.push(x); return sol.length === 1 ? sol[0] : 'solutions ' + sol.length; },
  evalExpr: q => { const m = q.p.en.match(/^If x = (−?\d+), then (.+) = \?$/); if(!m) return; const x = pn(m[1]); let v = 0; for(const term of m[2].replace(/ /g, '').match(/[+-]?[^+-]+/g)){ if(term === 'x²') v += x * x; else if(term.endsWith('x')) v += Number(term.slice(0, -1) || 1) * x; else v += Number(term); } return v; },
  matchstick: q => { const m = q.p.en.match(/1 → (\d+) sticks, 2 → (\d+), 3 → (\d+)\. How many sticks for (\d+)/); if(!m) return; const d = m[2] - m[1]; if(m[3] - m[2] !== d) return 'bad'; return +m[1] + d * (m[4] - 1); },
  exponents: q => { let m = q.p.en.match(/^(\d+)([⁰-⁹¹²³]+) = \?$/); if(m) return Math.pow(+m[1], unsup(m[2]));
    m = q.p.en.match(/^(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+) ([×÷]) (\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+) = /); if(m){ if(m[1] !== m[4]) return 'bases differ'; return m[3] === '×' ? unsup(m[2]) + unsup(m[5]) : unsup(m[2]) - unsup(m[5]); }
    m = q.p.en.match(/^\((\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\)([⁰¹²³⁴⁵⁶⁷⁸⁹]+) = /); if(m) return unsup(m[2]) * unsup(m[3]); },
  roots: q => { const t = q.p.en.replace(/,/g, ''); let m = t.match(/^(\d+)² = \?$/); if(m) return m[1] ** 2; m = t.match(/^(\d+)³ = \?$/); if(m) return m[1] ** 3;
    m = t.match(/^√(\d+) = \?$/); if(m){ const r = Math.round(Math.sqrt(+m[1])); return r * r === +m[1] ? r : 'not square'; } m = t.match(/^∛(\d+) = \?$/); if(m){ const r = Math.round(Math.cbrt(+m[1])); return r ** 3 === +m[1] ? r : 'not cube'; } },
  angleType: q => { const d = +q.p.en.match(/(\d+)°/)[1]; return d < 90 ? 'acute' : d === 90 ? 'right' : d < 180 ? 'obtuse' : d === 180 ? 'straight' : 'reflex'; },
  angleCalc: q => { const e = q.p.en; let m = e.match(/complement of (\d+)°/); if(m) return 90 - m[1]; m = e.match(/supplement of (\d+)°/); if(m) return 180 - m[1];
    m = e.match(/triangle are (\d+)° and (\d+)°/); if(m) return 180 - m[1] - m[2]; m = e.match(/interior angles of a \w+ \((\d+) sides\)/); if(m) return (m[1] - 2) * 180; m = e.match(/exterior angle of a regular \w+ \((\d+) sides\)/); if(m) return 360 / m[1]; },
  area: q => { const e = q.p.en; let m = e.match(/^(Perimeter|Area) .* of a square of side (\d+) cm/); if(m) return m[1] === 'Area' ? m[2] * m[2] : 4 * m[2];
    m = e.match(/^(Perimeter|Area) .* of a rectangle (\d+) cm long and (\d+) cm wide/); if(m) return m[1] === 'Area' ? m[2] * m[3] : 2 * (+m[2] + +m[3]);
    m = e.match(/triangle with base (\d+) cm and height (\d+) cm/); if(m) return m[1] * m[2] / 2; m = e.match(/parallelogram with base (\d+) cm and height (\d+) cm/); if(m) return m[1] * m[2];
    m = e.match(/^(Circumference|Area) .* radius (\d+) cm/); if(m) return m[1] === 'Area' ? 22 * m[2] * m[2] / 7 : 2 * 22 * m[2] / 7;
    m = e.match(/a (\d+) cm × (\d+) cm × (\d+) cm cuboid/); if(m) return m[1] * m[2] * m[3]; m = e.match(/cube of side (\d+) cm/); if(m) return 6 * m[1] * m[1]; },
  stats: q => { const m = q.p.en.match(/^(Mean|Median|Mode|Range) of ([\d, ]+) = \?$/); if(!m) return; const d = m[2].split(', ').map(Number), s = d.slice().sort((a, b) => a - b);
    if(m[1] === 'Mean') return d.reduce((a, b) => a + b) / d.length; if(m[1] === 'Median') return s[(s.length - 1) / 2]; if(m[1] === 'Range') return s[s.length - 1] - s[0];
    const c = {}; d.forEach(x => c[x] = (c[x] || 0) + 1); const top = Math.max(...Object.values(c)), modes = Object.keys(c).filter(k => c[k] === top); return modes.length === 1 ? +modes[0] : 'no unique mode'; },
  pressure: q => { let m = q.p.en.match(/force of ([\d,]+) N acts on (\d+) m²/); if(m) return num(m[1]) / m[2]; m = q.p.en.match(/^Mass ([\d,]+) g, volume (\d+) cm³/); if(m) return hstr(Math.round(num(m[1]) * 100 / m[2])); },
  temperature: q => { let m = q.p.en.match(/^(−?\d+)°C = \? °F$/); if(m) return pn(m[1]) * 9 / 5 + 32; m = q.p.en.match(/^(−?\d+)°C = \? K/); if(m) return pn(m[1]) + 273; },
  longitudeTime: q => { const m = q.p.en.match(/^It is (\d+):00 (AM|PM) at (\d+)° E\. What time is it at (\d+)° E/); if(!m) return; const h = (+m[1] % 12) + (m[2] === 'PM' ? 12 : 0); return clock12(h + (m[4] - m[3]) / 15); },
  tamilNumerals: q => { const T = '௦௧௨௩௪௫௬௭௮௯'; let m = q.p.en.match(/^(\d+) in Tamil numerals\?$/); if(m) return m[1].split('').map(d => T[+d]).join(''); m = q.p.en.match(/^([௦-௯]+) = \?$/); if(m) return +m[1].split('').map(c => T.indexOf(c)).join(''); },
  agreement: q => { const m = q.p.en.match(/^(.+) ___ /); const one = ['He', 'She', 'It', 'Priya', 'My father', 'The dog'].includes(m[1]); const v = q.opts.map(o => o.v).find(v => one ? /(s|es)$/.test(v) && !v.startsWith('to ') && !/ing$/.test(v) : !/(s|es|ing)$/.test(v) && !v.startsWith('to ')); return v; }
});


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
  if(+cls > MAXCLASS) continue;
  for(const s of C.subjects) for(const ch of s.chapters) for(const L of ch.lessons){
    if(!L.game){ const f = path.join(root, 'lessons', L.id + '.json'); if(!fs.existsSync(f)) fail(L.id, 'lesson file missing'); else { const j = JSON.parse(fs.readFileSync(f, 'utf8')); if(!j.blocks || !j.quiz) fail(L.id, 'lesson incomplete'); } continue; }
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
console.log(`checked ${total} generated questions across ${Object.values(cat.classes).slice(0, MAXCLASS).reduce((a, C) => a + C.subjects.reduce((b, s) => b + s.chapters.reduce((c, ch) => c + ch.lessons.length, 0), 0), 0)} games — failures: ${fails}`);
process.exit(fails ? 1 : 0);
