/* Kalvi Kalanjiyam — Classes 6–8 game generators (maths computed, facts curated).
   Same question format as games-math.js. Every numeric answer is COMPUTED from the
   numbers shown, and tests/games.test.cjs re-solves them from the question text. */
(function(G){
'use strict';
const {S, ri, pick, shuffle, fmt} = G.KALVI_UTIL;
const {pairGame, sortGame} = G.KALVI_BUILD;
const M = {};

/* ---------- helpers ---------- */
const N = n => n < 0 ? '−' + fmt(-n) : fmt(n);            // −7
const P = n => n < 0 ? `(${N(n)})` : N(n);                  // (−7) inside expressions
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while(b){ [a, b] = [b, a % b]; } return a; };
const lcm = (a, b) => a / gcd(a, b) * b;
const isPrime = n => { if(n < 2) return false; for(let i = 2; i * i <= n; i++) if(n % i === 0) return false; return true; };
function fr(n, d){ if(d < 0){ n = -n; d = -d; } const g = gcd(n, d) || 1; return {n: n / g, d: d / g}; }
const fs = f => f.d === 1 ? N(f.n) : `${f.n < 0 ? '−' : ''}${Math.abs(f.n)}/${f.d}`;
// any-type options: answer + distinct distractors
function opts(ans, cands, lab, n){
  n = n || 4; lab = lab || (v => typeof v === 'number' ? N(v) : String(v));
  const key = v => JSON.stringify(v), seen = new Set([key(ans)]), out = [ans];
  for(const c of shuffle(cands)) if(out.length < n && c !== undefined && c !== null && !(typeof c === 'number' && !isFinite(c)) && !seen.has(key(c))){ seen.add(key(c)); out.push(c); }
  if(typeof ans === 'number'){ let k = 1; while(out.length < n){ for(const c of [ans + k, ans - k]) if(out.length < n && !seen.has(key(c))){ seen.add(key(c)); out.push(c); } k++; } }
  return shuffle(out).map(v => ({v, h: lab(v)}));
}
const SUP = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
const sup = n => String(n).split('').map(c => SUP[c]).join('');
// decimals held as integer hundredths — no floating-point error
const dstr = h => { const s = h < 0 ? '−' : '', a = Math.abs(h), i = Math.floor(a / 100), f = a % 100; return s + fmt(i) + (f ? '.' + String(f).padStart(2, '0').replace(/0$/, '') : ''); };
G.KALVI_MID_UTIL = {gcd, lcm, isPrime, fr, fs, N, dstr};

/* ================= NUMBERS ================= */
M.intAdd = { title:S('முழுக்களைக் கூட்டு, கழி', 'Add & subtract integers'), icon:'➖',
  intro:S('எண் கோட்டில்: + என்றால் வலது பக்கம், − என்றால் இடது பக்கம் நகர். (−3) + 5: −3-ல் தொடங்கி 5 அடி வலது → 2. ஒரு எண்ணைக் கழிப்பது = அதன் எதிர் எண்ணைக் கூட்டுவது: 4 − (−2) = 4 + 2 = 6. வெப்பநிலை, கடன்-வரவு, கடல் மட்டத்துக்குக் கீழே — எல்லாம் முழுக்கள்!',
    'On a number line: + means move right, − means move left. (−3) + 5: start at −3, move 5 right → 2. Subtracting a number = adding its opposite: 4 − (−2) = 4 + 2 = 6. Temperatures, debt and depth below sea level are all integers!'),
  gen(L){ const m = L.max || 20; let a, b; do { a = ri(-m, m); b = ri(-m, m); } while(a >= 0 && b >= 0);
    const add = Math.random() < .5, ans = add ? a + b : a - b;
    const e = `${P(a)} ${add ? '+' : '−'} ${P(b)}`;
    return {p:S(`${e} = ?`, `${e} = ?`), scene:'', opts: opts(ans, [-ans, add ? a - b : a + b, ans + 2, ans - 2, -a - b]), ans,
      ex: add ? S(`${N(a)}-ல் தொடங்கி ${Math.abs(b)} அடி ${b >= 0 ? 'வலது' : 'இடது'} → ${N(ans)}`, `Start at ${N(a)}, move ${Math.abs(b)} ${b >= 0 ? 'right' : 'left'} → ${N(ans)}`)
        : S(`${P(b)}-ஐக் கழித்தல் = ${P(-b)}-ஐக் கூட்டுதல்: ${P(a)} + ${P(-b)} = ${N(ans)}`, `Subtracting ${P(b)} = adding ${P(-b)}: ${P(a)} + ${P(-b)} = ${N(ans)}`)}; } };
M.intMul = { title:S('முழுக்களின் பெருக்கல், வகுத்தல்', 'Multiply & divide integers'), icon:'✖️',
  intro:S('குறி விதி: (+)×(+) = +, (−)×(−) = +, (+)×(−) = −. வகுத்தலுக்கும் இதே விதி. நினைவில் வை: "ஒரே குறி → நேர்மறை; வேறு குறி → எதிர்மறை".', 'Sign rule: (+)×(+) = +, (−)×(−) = +, (+)×(−) = −. Division follows the same rule. Remember: "same signs → positive, different signs → negative".'),
  gen(L){ const m = L.max || 12; let a, b; do { a = ri(-m, m); b = ri(-m, m); } while(!a || !b || (a > 0 && b > 0));
    const mul = Math.random() < .55, prod = a * b; const e = mul ? `${P(a)} × ${P(b)}` : `${P(prod)} ÷ ${P(b)}`, ans = mul ? prod : a;
    const same = (mul ? a : prod) * b > 0;
    return {p:S(`${e} = ?`, `${e} = ?`), scene:'', opts: opts(ans, [-ans, ans + 1, ans - 1, mul ? a + b : -b]), ans,
      ex:S(`${same ? 'ஒரே குறி → +' : 'வேறு குறி → −'}. ${e} = ${N(ans)}`, `${same ? 'Same signs → +' : 'Different signs → −'}. ${e} = ${N(ans)}`)}; } };
M.hcfLcm = { title:S('மீ.பொ.வ & மீ.சி.ம (HCF & LCM)', 'HCF & LCM'), icon:'🔗',
  intro:S('மீ.பொ.வ (HCF) = இரண்டையும் மீதியின்றி வகுக்கும் மிகப் பெரிய எண் — 12, 18 → 6. மீ.சி.ம (LCM) = இரண்டின் மடங்காகவும் உள்ள மிகச் சிறிய எண் — 4, 6 → 12. தினமும் ஒரு பேருந்து 4 நிமிடத்துக்கு ஒருமுறை, மற்றொன்று 6 நிமிடத்துக்கு ஒருமுறை வந்தால் இரண்டும் சேர்ந்து வருவது 12 நிமிடத்தில்!', 'HCF = the biggest number that divides both exactly — 12, 18 → 6. LCM = the smallest number that is a multiple of both — 4, 6 → 12. If one bus comes every 4 minutes and another every 6, they arrive together every 12 minutes!'),
  gen(L){ const m = L.max || 30; let a, b; do { a = ri(4, m); b = ri(4, m); } while(a === b || gcd(a, b) === 1 && Math.random() < .7);
    const h = Math.random() < .5, ans = h ? gcd(a, b) : lcm(a, b);
    return {p: h ? S(`${a}, ${b} — மீ.பொ.வ (HCF) = ?`, `HCF of ${a} and ${b} = ?`) : S(`${a}, ${b} — மீ.சி.ம (LCM) = ?`, `LCM of ${a} and ${b} = ?`), scene:'',
      opts: opts(ans, h ? [lcm(a, b), ans * 2, Math.max(1, ans - 1), Math.min(a, b)] : [gcd(a, b), a * b, ans * 2, ans / 2 | 0, ans + a].filter(x => x > 0)), ans,
      ex: h ? S(`${a} = ${gcd(a, b)} × ${a / gcd(a, b)}, ${b} = ${gcd(a, b)} × ${b / gcd(a, b)} → மீ.பொ.வ ${ans}`, `${a} = ${gcd(a, b)} × ${a / gcd(a, b)}, ${b} = ${gcd(a, b)} × ${b / gcd(a, b)} → HCF ${ans}`)
        : S(`மீ.சி.ம = ${a} × ${b} ÷ மீ.பொ.வ(${gcd(a, b)}) = ${ans}`, `LCM = ${a} × ${b} ÷ HCF(${gcd(a, b)}) = ${ans}`)}; } };
M.prime = { title:S('பகா எண்ணைக் கண்டுபிடி', 'Find the prime'), icon:'💎',
  intro:S('பகா எண் = 1-ஆலும் தன்னாலும் மட்டுமே வகுபடும் எண் (2, 3, 5, 7, 11, 13…). 1 பகா எண் அல்ல. 2 மட்டுமே இரட்டைப் பகா எண். இணையத்தில் உன் கடவுச்சொல்லைப் பாதுகாக்கும் மறைகுறியீடு (encryption) பெரிய பகா எண்களை வைத்தே இயங்குகிறது!', 'A prime is divisible only by 1 and itself (2, 3, 5, 7, 11, 13…). 1 is not prime. 2 is the only even prime. The encryption that protects your passwords online is built on huge primes!'),
  gen(L){ const m = L.max || 60; const primes = [], comps = []; for(let i = 4; i <= m; i++) (isPrime(i) ? primes : comps).push(i);
    const ans = pick(primes), others = shuffle(comps.filter(x => x % 2 === 1 || Math.random() < .3)).slice(0, 3);
    const f = x => { for(let i = 2; i * i <= x; i++) if(x % i === 0) return `${x} = ${i} × ${x / i}`; };
    return {p:S('இவற்றில் பகா எண் எது?', 'Which of these is a prime number?'), scene:'', opts: shuffle([ans, ...others]).map(v => ({v, h:fmt(v)})), ans,
      ex:S(`${ans}-ஐ 1, ${ans} தவிர வேறு எதுவும் வகுக்காது. மற்றவை: ${others.map(f).join('; ')}`, `Only 1 and ${ans} divide ${ans}. The others: ${others.map(f).join('; ')}`), check:q => isPrime(q.ans) && q.opts.filter(o => isPrime(o.v)).length === 1}; } };
M.bigNumbers = { title:S('இந்திய & சர்வதேச முறை', 'Indian & International systems'), icon:'🔢',
  intro:S('இந்திய முறை: 12,34,567 (பன்னிரண்டு இலட்சத்து…) — முதலில் 3 இலக்கம், பிறகு 2, 2. சர்வதேச முறை: 1,234,567 (one million…) — எப்போதும் 3, 3. 10 இலட்சம் = 1 மில்லியன்; 1 கோடி = 10 மில்லியன்.', 'Indian system: 12,34,567 (twelve lakh…) — first 3 digits, then groups of 2. International: 1,234,567 (one million…) — always groups of 3. 10 lakh = 1 million; 1 crore = 10 million.'),
  gen(L){ const n = ri(100000, L.max || 99999999), intl = n.toLocaleString('en-US'), ind = n.toLocaleString('en-IN'); const toIntl = Math.random() < .5;
    const ans = toIntl ? intl : ind, other = toIntl ? ind : intl;
    const shift = s => { const d = s.replace(/,/g, ''); return d.slice(0, -1).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + d.slice(-1); };
    return {p: toIntl ? S(`${ind} — சர்வதேச முறையில் எழுது`, `Write ${ind} in the International system`) : S(`${intl} — இந்திய முறையில் எழுது`, `Write ${intl} in the Indian system`), scene:'',
      opts: opts(ans, [other, shift(ans), n.toString()], v => v), ans, ex:S(`இந்திய முறை ${ind} = சர்வதேச முறை ${intl}`, `Indian ${ind} = International ${intl}`), check:q => q.ans.replace(/,/g, '') === String(n)}; } };
const ROM = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
const roman = n => { let s = ''; for(const [v, r] of ROM) while(n >= v){ s += r; n -= v; } return s; };
M.roman = { title:S('ரோமன் எண்கள்', 'Roman numerals'), icon:'🏛️',
  intro:S('I = 1, V = 5, X = 10, L = 50, C = 100, D = 500, M = 1000. சிறியது பெரியதற்கு முன் வந்தால் கழி (IV = 4, IX = 9), பின் வந்தால் கூட்டு (VI = 6). ரோமன் எண்களில் பூஜ்யம் இல்லை — இந்தியர்கள் கண்டுபிடித்த பூஜ்யமும் இட மதிப்பும்தான் இன்றைய கணிதத்தை எளிதாக்கின!', 'I = 1, V = 5, X = 10, L = 50, C = 100, D = 500, M = 1000. A smaller one before a bigger one subtracts (IV = 4, IX = 9); after it adds (VI = 6). Roman numerals have no zero — the zero and place value from India made today’s maths easy!'),
  gen(L){ const n = ri(1, L.max || 100), r = roman(n), toR = Math.random() < .5;
    if(toR) return {p:S(`${n} — ரோமன் எண்ணில்?`, `${n} in Roman numerals?`), scene:'', opts: opts(r, [roman(n + 1), roman(Math.max(1, n - 1)), roman(n + 10), roman(Math.max(1, n - 10)), r.split('').reverse().join('')], v => v), ans:r, ex:S(`${n} = ${r}`, `${n} = ${r}`)};
    return {p:S(`${r} = ?`, `${r} = ?`), scene:'', opts: opts(n, [n + 1, n - 1, n + 10, n - 10, n + 2].filter(x => x > 0)), ans:n, ex:S(`${r} = ${n}`, `${r} = ${n}`)}; } };

/* ================= FRACTIONS, DECIMALS ================= */
M.fracSimplify = { title:S('பின்னத்தைச் சுருக்கு', 'Simplify the fraction'), icon:'🍕',
  intro:S('தொகுதி, பகுதி இரண்டையும் அவற்றின் மீ.பொ.வ-ஆல் வகு: 12/18 → (÷6) → 2/3. பீட்சாவை 18 துண்டாக வெட்டி 12 எடுப்பதும், 3 துண்டாக வெட்டி 2 எடுப்பதும் ஒரே அளவு!', 'Divide the top and bottom by their HCF: 12/18 → (÷6) → 2/3. Taking 12 of 18 slices is the same amount as 2 of 3 slices!'),
  gen(L){ let n, d; do { d = ri(2, 12); n = ri(1, d - 1); } while(gcd(n, d) !== 1); const k = ri(2, L.k || 9), f = `${n}/${d}`;
    return {p:S(`${n * k}/${d * k} — மிகச் சுருக்கிய வடிவம்?`, `Write ${n * k}/${d * k} in lowest terms`), scene:'', opts: opts(f, [`${d}/${n}`, `${n + 1}/${d}`, `${n}/${d + 1}`, `${n * 2}/${d * 3}`, `${Math.max(1, n - 1)}/${d}`].filter(x => x !== f), v => v), ans:f,
      ex:S(`மீ.பொ.வ ${k}: ${n * k} ÷ ${k} = ${n}, ${d * k} ÷ ${k} = ${d}`, `HCF is ${k}: ${n * k} ÷ ${k} = ${n}, ${d * k} ÷ ${k} = ${d}`)}; } };
M.fracOps = { title:S('பின்னக் கணக்குகள்', 'Fraction operations'), icon:'➗',
  intro:S('வெவ்வேறு பகுதி கொண்ட பின்னங்களைக் கூட்ட: பொதுப் பகுதி (மீ.சி.ம) ஆக்கு — 1/4 + 1/6 = 3/12 + 2/12 = 5/12. பெருக்க: மேல் × மேல், கீழ் × கீழ் — 2/3 × 3/5 = 6/15 = 2/5. வகுக்க: தலைகீழாக்கிப் பெருக்கு — 1/2 ÷ 1/4 = 1/2 × 4/1 = 2.', 'To add fractions with different bottoms, use a common denominator (the LCM): 1/4 + 1/6 = 3/12 + 2/12 = 5/12. To multiply: top × top, bottom × bottom — 2/3 × 3/5 = 6/15 = 2/5. To divide: flip and multiply — 1/2 ÷ 1/4 = 1/2 × 4/1 = 2.'),
  gen(L){ const ops = L.ops || ['+', '−'], op = pick(ops), neg = !!L.neg;
    const mk = () => { let n, d; do { d = ri(2, 10); n = ri(1, d - 1) * (neg && Math.random() < .5 ? -1 : 1); } while(gcd(n, d) !== 1); return {n, d}; };
    let a, b; do { a = mk(); b = mk(); } while(op !== '×' && op !== '÷' && a.d === b.d);
    const r = op === '+' ? fr(a.n * b.d + b.n * a.d, a.d * b.d) : op === '−' ? fr(a.n * b.d - b.n * a.d, a.d * b.d) : op === '×' ? fr(a.n * b.n, a.d * b.d) : fr(a.n * b.d, a.d * b.n);
    const ans = fs(r), sh = f => f.n < 0 ? `(${fs(f)})` : fs(f), e = `${sh(a)} ${op} ${sh(b)}`;
    const wrong = [fr(a.n + b.n, a.d + b.d), fr(a.n + b.n, a.d * b.d), fr(r.n + 1, r.d), fr(-r.n, r.d), fr(r.d, r.n || 1), fr(a.n * b.n, a.d + b.d)].map(fs);
    const q = (n, d) => n < 0 ? `(−${-n}/${d})` : `${n}/${d}`;
    let steps = op === '+' || op === '−' ? `${q(a.n * b.d, a.d * b.d)} ${op} ${q(b.n * a.d, a.d * b.d)}` : op === '×' ? q(a.n * b.n, a.d * b.d) : `${sh(a)} × ${sh(fr(b.d, b.n))}`;
    if(steps === ans) steps = '';
    return {p:S(`${e} = ?`, `${e} = ?`), scene:'', opts: opts(ans, wrong.filter(x => x !== ans), v => v), ans, ex:S(`${e} = ${steps ? steps + ' = ' : ''}${ans}`, `${e} = ${steps ? steps + ' = ' : ''}${ans}`)}; } };
M.fracCompare = { title:S('எந்தப் பின்னம் பெரியது?', 'Which fraction is bigger?'), icon:'⚖️',
  intro:S('குறுக்குப் பெருக்கல்: 3/5, 2/3 → 3×3 = 9, 5×2 = 10 → 10 பெரியது, எனவே 2/3 பெரியது. அல்லது இரண்டையும் ஒரே பகுதிக்கு மாற்று: 9/15, 10/15.', 'Cross-multiply: 3/5 vs 2/3 → 3×3 = 9, 5×2 = 10 → 10 is bigger, so 2/3 is bigger. Or give both the same denominator: 9/15 vs 10/15.'),
  gen(){ let a, b; do { a = fr(ri(1, 11), ri(2, 12)); b = fr(ri(1, 11), ri(2, 12)); } while(a.n >= a.d || b.n >= b.d || a.n * b.d === b.n * a.d || a.d === b.d);
    const big = a.n * b.d > b.n * a.d ? a : b, ans = fs(big);
    return {p:S(`${fs(a)}, ${fs(b)} — எது பெரியது?`, `Which is bigger: ${fs(a)} or ${fs(b)}?`), scene:'', opts:[fs(a), fs(b)].map(v => ({v, h:v})), ans,
      ex:S(`${a.n}×${b.d} = ${a.n * b.d}, ${b.n}×${a.d} = ${b.n * a.d} → ${ans} பெரியது`, `${a.n}×${b.d} = ${a.n * b.d}, ${b.n}×${a.d} = ${b.n * a.d} → ${ans} is bigger`)}; } };
M.decimals = { title:S('தசம எண்கள்', 'Decimals'), icon:'🔟',
  intro:S('தசமப் புள்ளிகளை ஒரே வரிசையில் வைத்துக் கூட்டு/கழி: 3.45 + 1.7 = 3.45 + 1.70 = 5.15. 10-ஆல் பெருக்கினால் புள்ளி ஒரு இடம் வலது: 2.35 × 10 = 23.5; 100-ஆல் இரண்டு இடம்.', 'Line up the decimal points to add or subtract: 3.45 + 1.7 = 3.45 + 1.70 = 5.15. Multiplying by 10 moves the point one place right: 2.35 × 10 = 23.5; by 100, two places.'),
  gen(L){ const k = pick(L.kinds || ['add', 'sub', 'mul10']);
    const d1 = () => { let h; do { h = ri(1, 4000) * (Math.random() < .5 ? 1 : 10); } while(h % 100 === 0); return h; }; // hundredths or tenths, never whole
    if(k === 'mul10'){ const a = ri(1, 999), t = pick([10, 100]), ans = dstr(a * t), e = `${dstr(a)} × ${t}`;
      return {p:S(`${e} = ?`, `${e} = ?`), scene:'', opts: opts(ans, [dstr(a * t / 10), dstr(a * t * 10), dstr(a + t * 100)].filter(x => x !== ans), v => v), ans, ex:S(`× ${t} → புள்ளி ${t === 10 ? 1 : 2} இடம் வலது: ${ans}`, `× ${t} → point moves ${t === 10 ? 1 : 2} place${t === 10 ? '' : 's'} right: ${ans}`)}; }
    let a = d1(), b = d1(); if(k === 'sub' && b > a) [a, b] = [b, a]; const r = k === 'add' ? a + b : a - b, ans = dstr(r), e = `${dstr(a)} ${k === 'add' ? '+' : '−'} ${dstr(b)}`;
    return {p:S(`${e} = ?`, `${e} = ?`), scene:'', opts: opts(ans, [dstr(r + 10), dstr(r - 10), dstr(r + 100), dstr(Math.abs(r - 1)), dstr(r + 1)].filter(x => x !== ans), v => v), ans,
      ex:S(`புள்ளிகளை வரிசைப்படுத்தி: ${e} = ${ans}`, `Line up the points: ${e} = ${ans}`)}; } };

/* ================= RATIO, PERCENT, MONEY ================= */
M.ratio = { title:S('விகிதம்', 'Ratio'), icon:'⚗️',
  intro:S('விகிதம் இரண்டு அளவுகளை ஒப்பிடுகிறது. 12 : 18 → இரண்டையும் 6-ஆல் வகு → 2 : 3. ₹500-ஐ 2 : 3 என்று பிரிக்க: மொத்தம் 5 பங்கு, ஒரு பங்கு ₹100 → ₹200, ₹300.', 'A ratio compares two amounts. 12 : 18 → divide both by 6 → 2 : 3. To share ₹500 in the ratio 2 : 3: 5 parts in all, one part ₹100 → ₹200 and ₹300.'),
  gen(){ let a, b; do { a = ri(1, 9); b = ri(1, 9); } while(a === b || gcd(a, b) !== 1);
    if(Math.random() < .5){ const k = ri(2, 12), ans = `${a} : ${b}`;
      return {p:S(`${a * k} : ${b * k} — சுருக்கு`, `Simplify ${a * k} : ${b * k}`), scene:'', opts: opts(ans, [`${b} : ${a}`, `${a + 1} : ${b}`, `${a} : ${b + 1}`, `${a * 2} : ${b * 3}`].filter(x => x !== ans), v => v), ans, ex:S(`இரண்டையும் ${k}-ஆல் வகு → ${ans}`, `Divide both by ${k} → ${ans}`)}; }
    const u = ri(2, 30) * 10, tot = (a + b) * u, big = Math.max(a, b) * u;
    return {p:S(`₹${fmt(tot)}-ஐ ${a} : ${b} விகிதத்தில் பிரி. பெரிய பங்கு = ?`, `Share ₹${fmt(tot)} in the ratio ${a} : ${b}. The larger share = ?`), scene:'', opts: opts(big, [Math.min(a, b) * u, tot / 2, big + u, big - u].filter(x => x > 0 && x !== big), v => '₹' + fmt(v)), ans:big,
      ex:S(`மொத்தம் ${a + b} பங்கு; ஒரு பங்கு ₹${fmt(tot)} ÷ ${a + b} = ₹${fmt(u)}; பெரிய பங்கு ${Math.max(a, b)} × ₹${fmt(u)} = ₹${fmt(big)}`, `${a + b} parts; one part ₹${fmt(tot)} ÷ ${a + b} = ₹${fmt(u)}; larger share ${Math.max(a, b)} × ₹${fmt(u)} = ₹${fmt(big)}`)}; } };
const ITEMS = [['பேனா','pens'],['நோட்டுப் புத்தகம்','notebooks'],['மாம்பழம்','mangoes'],['முட்டை','eggs'],['பென்சில்','pencils']];
M.proportion = { title:S('நேர், எதிர் விகிதம்', 'Direct & inverse proportion'), icon:'🔁',
  intro:S('நேர் விகிதம்: ஒன்று கூடினால் மற்றதும் கூடும் (அதிகப் பேனா → அதிக விலை). முதலில் ஒன்றின் விலையைக் கண்டுபிடி (ஒருமை முறை). எதிர் விகிதம்: ஒன்று கூடினால் மற்றது குறையும் (அதிக ஆட்கள் → குறைந்த நாள்கள்): ஆட்கள் × நாள்கள் = மாறாது.', 'Direct: when one goes up, so does the other (more pens → more cost). Find the cost of one first (unitary method). Inverse: when one goes up, the other goes down (more workers → fewer days): workers × days stays the same.'),
  gen(L){ if((L.inverse !== false) && Math.random() < .5){ let w1, d1, w2; do { w1 = ri(2, 12); d1 = ri(2, 20); w2 = ri(2, 15); } while(w1 === w2 || (w1 * d1) % w2);
      const ans = w1 * d1 / w2;
      return {p:S(`${w1} பேர் ஒரு வேலையை ${d1} நாளில் முடிப்பர். ${w2} பேர் எத்தனை நாளில் முடிப்பர்?`, `${w1} workers finish a job in ${d1} days. How many days will ${w2} workers take?`), scene:'', opts: opts(ans, [d1 * w2 / w1, d1 + w1 - w2, d1].filter(x => Number.isInteger(x) && x > 0)), ans,
        ex:S(`எதிர் விகிதம்: ${w1} × ${d1} = ${w1 * d1} ஆள்-நாள். ${w1 * d1} ÷ ${w2} = ${ans} நாள்`, `Inverse: ${w1} × ${d1} = ${w1 * d1} worker-days. ${w1 * d1} ÷ ${w2} = ${ans} days`)}; }
    const [ta, en] = pick(ITEMS), n1 = ri(2, 9), u = ri(3, 40), n2 = ri(2, 15), ans = n2 * u;
    return {p:S(`${n1} ${ta} விலை ₹${n1 * u}. ${n2} ${ta} விலை?`, `${n1} ${en} cost ₹${n1 * u}. How much do ${n2} ${en} cost?`), scene:'', opts: opts(ans, [n1 * u + n2, ans + u, ans - u, n2 * n1].filter(x => x > 0), v => '₹' + fmt(v)), ans,
      ex:S(`ஒன்றின் விலை ₹${n1 * u} ÷ ${n1} = ₹${u}. ${n2} × ₹${u} = ₹${ans}`, `One costs ₹${n1 * u} ÷ ${n1} = ₹${u}. ${n2} × ₹${u} = ₹${ans}`)}; } };
M.percent = { title:S('சதவீதம்', 'Percentage'), icon:'💯',
  intro:S('சதவீதம் = நூற்றுக்கு எவ்வளவு. 25% = 25/100 = 1/4. 360-ல் 25% = 360 × 25 ÷ 100 = 90. 3/4 = 75/100 = 75%. கடையில் "20% தள்ளுபடி", தேர்வு மதிப்பெண், மழை வாய்ப்பு — எங்கும் சதவீதம்!', 'Percent = out of a hundred. 25% = 25/100 = 1/4. 25% of 360 = 360 × 25 ÷ 100 = 90. 3/4 = 75/100 = 75%. "20% off" in shops, exam marks, chance of rain — percentages are everywhere!'),
  gen(){ if(Math.random() < .6){ const p = pick([5, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75]); let n; do { n = ri(2, 60) * 10; } while((n * p) % 100); const ans = n * p / 100;
      return {p:S(`${n}-ல் ${p}% = ?`, `${p}% of ${n} = ?`), scene:'', opts: opts(ans, [ans * 2, ans + 10, n - ans, p, ans + 5].filter(x => x > 0 && x !== ans)), ans, ex:S(`${n} × ${p} ÷ 100 = ${ans}`, `${n} × ${p} ÷ 100 = ${ans}`)}; }
    const d = pick([2, 4, 5, 10, 20, 25, 50]); let n; do { n = ri(1, d - 1); } while(gcd(n, d) !== 1); const ans = n * 100 / d;
    return {p:S(`${n}/${d} = எத்தனை சதவீதம்?`, `Write ${n}/${d} as a percentage`), scene:'', opts: opts(ans, [n * 10, d, ans + 5, ans - 5, 100 - ans].filter(x => x > 0 && x < 100 && x !== ans), v => v + '%'), ans,
      ex:S(`${n}/${d} = ${ans}/100 = ${ans}%`, `${n}/${d} = ${ans}/100 = ${ans}%`)}; } };
M.profitLoss = { title:S('இலாபம், நட்டம்', 'Profit & loss'), icon:'🏪',
  intro:S('அடக்க விலை (CP) = வாங்கிய விலை; விற்ற விலை (SP). SP > CP → இலாபம் = SP − CP. SP < CP → நட்டம் = CP − SP. இலாப சதவீதம் = இலாபம் ÷ CP × 100.', 'Cost price (CP) = what you paid; selling price (SP) = what you sold for. SP > CP → profit = SP − CP. SP < CP → loss = CP − SP. Profit % = profit ÷ CP × 100.'),
  gen(L){ if(L.pct && Math.random() < .5){ const p = pick([5, 10, 12, 15, 20, 25, 30, 40]); let cp; do { cp = ri(2, 50) * 20; } while((cp * p) % 100); const gain = cp * p / 100, prof = Math.random() < .5, sp = prof ? cp + gain : cp - gain;
      const ans = `${prof ? 'profit' : 'loss'} ${p}%`, lab = v => { const [w, x] = v.split(' '); return `${w === 'profit' ? 'இலாபம் / profit' : 'நட்டம் / loss'} ${x}`; };
      return {p:S(`அடக்க விலை ₹${fmt(cp)}, விற்ற விலை ₹${fmt(sp)}. இலாப/நட்ட சதவீதம்?`, `CP ₹${fmt(cp)}, SP ₹${fmt(sp)}. Profit or loss percent?`), scene:'',
        opts: opts(ans, [`${prof ? 'loss' : 'profit'} ${p}%`, `${prof ? 'profit' : 'loss'} ${p + 5}%`, `${prof ? 'profit' : 'loss'} ${p * 2}%`], lab), ans,
        ex:S(`${prof ? 'இலாபம்' : 'நட்டம்'} ₹${gain}; ${gain} ÷ ${cp} × 100 = ${p}%`, `${prof ? 'Profit' : 'Loss'} ₹${gain}; ${gain} ÷ ${cp} × 100 = ${p}%`)}; }
    const cp = ri(10, 200) * 5; let sp; do { sp = ri(8, 240) * 5; } while(sp === cp); const prof = sp > cp, amt = Math.abs(sp - cp), ans = `${prof ? 'profit' : 'loss'} ${amt}`;
    const lab = v => { const [w, x] = v.split(' '); return `${w === 'profit' ? 'இலாபம் / profit' : 'நட்டம் / loss'} ₹${fmt(+x)}`; };
    return {p:S(`அடக்க விலை ₹${fmt(cp)}, விற்ற விலை ₹${fmt(sp)}. இலாபமா, நட்டமா, எவ்வளவு?`, `CP ₹${fmt(cp)}, SP ₹${fmt(sp)}. Profit or loss, and how much?`), scene:'',
      opts: opts(ans, [`${prof ? 'loss' : 'profit'} ${amt}`, `${prof ? 'profit' : 'loss'} ${cp + sp}`, `${prof ? 'profit' : 'loss'} ${amt + 5}`], lab), ans,
      ex:S(`${prof ? `SP > CP → இலாபம் = ${sp} − ${cp}` : `SP < CP → நட்டம் = ${cp} − ${sp}`} = ₹${amt}`, `${prof ? `SP > CP → profit = ${sp} − ${cp}` : `SP < CP → loss = ${cp} − ${sp}`} = ₹${amt}`)}; } };
M.interest = { title:S('தனி வட்டி, கூட்டு வட்டி', 'Simple & compound interest'), icon:'🏦',
  intro:S('தனி வட்டி (I) = P × R × T ÷ 100 (அசல் × வட்டி வீதம் × ஆண்டுகள்). கூட்டு வட்டியில் ஒவ்வோர் ஆண்டும் வட்டிக்கும் வட்டி கிடைக்கும்: தொகை A = P × (1 + R/100)ⁿ, கூட்டு வட்டி = A − P. சேமிப்பை முன்கூட்டியே தொடங்கினால் கூட்டு வட்டி பெரிதாக வளரும்!', 'Simple interest (I) = P × R × T ÷ 100 (principal × rate × years). With compound interest you earn interest on interest every year: amount A = P × (1 + R/100)ⁿ, CI = A − P. Start saving early and compound interest grows big!'),
  gen(L){ if(L.compound && Math.random() < .5){ const R = pick([5, 10, 20]), n = R === 5 ? 2 : pick([2, 3]); let Pp; do { Pp = ri(1, 100) * 100; } while((BigInt(Pp) * BigInt(100 + R) ** BigInt(n)) % (100n ** BigInt(n)) !== 0n);
      const A = Number(BigInt(Pp) * BigInt(100 + R) ** BigInt(n) / (100n ** BigInt(n))), ans = A - Pp, si = Pp * R * n / 100;
      return {p:S(`P = ₹${fmt(Pp)}, R = ${R}% ஆண்டுக்கு, ${n} ஆண்டுகள், ஆண்டுதோறும் கூட்டு. கூட்டு வட்டி = ?`, `P = ₹${fmt(Pp)}, R = ${R}% per year, ${n} years, compounded yearly. Compound interest = ?`), scene:'',
        opts: opts(ans, [si, A, ans + R * 10, ans - R * 10].filter(x => x > 0 && x !== ans), v => '₹' + fmt(v)), ans,
        ex:S(`A = ${fmt(Pp)} × (${100 + R}/100)${sup(n)} = ₹${fmt(A)}; கூட்டு வட்டி = ${fmt(A)} − ${fmt(Pp)} = ₹${fmt(ans)} (தனி வட்டி ₹${fmt(si)} மட்டுமே!)`, `A = ${fmt(Pp)} × (${100 + R}/100)${sup(n)} = ₹${fmt(A)}; CI = ${fmt(A)} − ${fmt(Pp)} = ₹${fmt(ans)} (simple interest would be only ₹${fmt(si)}!)`)}; }
    const Pp = ri(5, 200) * 100, R = ri(2, 15), T = ri(1, 5), ans = Pp * R * T / 100;
    return {p:S(`P = ₹${fmt(Pp)}, R = ${R}% ஆண்டுக்கு, T = ${T} ஆண்டு. தனி வட்டி = ?`, `P = ₹${fmt(Pp)}, R = ${R}% per year, T = ${T} years. Simple interest = ?`), scene:'',
      opts: opts(ans, [Pp * R / 100, ans + Pp, Pp * R * (T + 1) / 100, ans * 10].filter(x => Number.isInteger(x) && x > 0 && x !== ans), v => '₹' + fmt(v)), ans,
      ex:S(`${fmt(Pp)} × ${R} × ${T} ÷ 100 = ₹${fmt(ans)}`, `${fmt(Pp)} × ${R} × ${T} ÷ 100 = ₹${fmt(ans)}`)}; } };
M.speed = { title:S('வேகம், தூரம், நேரம்', 'Speed, distance, time'), icon:'🚌',
  intro:S('வேகம் = தூரம் ÷ நேரம். தூரம் = வேகம் × நேரம். நேரம் = தூரம் ÷ வேகம். 180 km-ஐ 3 மணியில் → 60 km/h.', 'Speed = distance ÷ time. Distance = speed × time. Time = distance ÷ speed. 180 km in 3 hours → 60 km/h.'),
  gen(){ const v = ri(4, 18) * 5, t = ri(2, 8), d = v * t, k = pick(['v', 'd', 't']);
    if(k === 'v') return {p:S(`ஒரு பேருந்து ${d} km-ஐ ${t} மணி நேரத்தில் கடக்கிறது. வேகம் = ? (km/h)`, `A bus covers ${d} km in ${t} hours. Speed = ? (km/h)`), scene:'🚌', opts: opts(v, [d - t, v + 5, v - 5, d * t].filter(x => x > 0 && x !== v)), ans:v, ex:S(`${d} ÷ ${t} = ${v} km/h`, `${d} ÷ ${t} = ${v} km/h`)};
    if(k === 'd') return {p:S(`${v} km/h வேகத்தில் ${t} மணி நேரம் பயணித்தால் தூரம் = ? (km)`, `Travelling at ${v} km/h for ${t} hours, distance = ? (km)`), scene:'🚆', opts: opts(d, [v + t, d + v, d - v].filter(x => x > 0 && x !== d)), ans:d, ex:S(`${v} × ${t} = ${d} km`, `${v} × ${t} = ${d} km`)};
    return {p:S(`${d} km-ஐ ${v} km/h வேகத்தில் கடக்க எத்தனை மணி நேரம்?`, `How many hours to cover ${d} km at ${v} km/h?`), scene:'🚗', opts: opts(t, [t + 1, t - 1, t + 2].filter(x => x > 0)), ans:t, ex:S(`${d} ÷ ${v} = ${t} மணி`, `${d} ÷ ${v} = ${t} hours`)}; } };
M.timeWork = { title:S('சேர்ந்து வேலை செய்தால்', 'Working together'), icon:'🤝',
  intro:S('A ஒரு வேலையை 6 நாளில் முடித்தால், ஒரு நாளில் 1/6 பங்கு. B 12 நாளில் → 1/12. சேர்ந்து ஒரு நாளில் 1/6 + 1/12 = 3/12 = 1/4 → 4 நாள். குழுவாக வேலை செய்வதன் சக்தி!', 'If A finishes a job in 6 days, A does 1/6 of it per day. B in 12 days → 1/12. Together per day 1/6 + 1/12 = 3/12 = 1/4 → 4 days. The power of teamwork!'),
  gen(){ let a, b; do { a = ri(2, 30); b = ri(2, 30); } while(a === b || (a * b) % (a + b));
    const ans = a * b / (a + b);
    return {p:S(`A ஒரு வேலையை ${a} நாளில், B ${b} நாளில் முடிப்பர். இருவரும் சேர்ந்து எத்தனை நாளில்?`, `A can finish a job in ${a} days and B in ${b} days. How many days working together?`), scene:'', opts: opts(ans, [(a + b) / 2, a + b, Math.min(a, b), ans + 1].filter(x => Number.isInteger(x) && x > 0 && x !== ans)), ans,
      ex:S(`1/${a} + 1/${b} = ${a + b}/${a * b} → ${a * b} ÷ ${a + b} = ${ans} நாள்`, `1/${a} + 1/${b} = ${a + b}/${a * b} → ${a * b} ÷ ${a + b} = ${ans} days`)}; } };

/* ================= ALGEBRA ================= */
const lin = (a, b) => `${a === 1 ? '' : a}x${b ? (b > 0 ? ' + ' + b : ' − ' + (-b)) : ''}`;
M.solveEq = { title:S('சமன்பாட்டைத் தீர்', 'Solve the equation'), icon:'🟰',
  intro:S('சமன்பாடு ஒரு தராசு: இரு பக்கமும் ஒரே செயலைச் செய்தால் சமநிலை மாறாது. 3x + 5 = 20 → இரு பக்கமும் 5-ஐக் கழி: 3x = 15 → இரு பக்கமும் 3-ஆல் வகு: x = 5. விடையை மீண்டும் போட்டுச் சரிபார்: 3×5 + 5 = 20 ✓', 'An equation is a balance: do the same thing to both sides and it stays balanced. 3x + 5 = 20 → take 5 from both sides: 3x = 15 → divide both sides by 3: x = 5. Check by putting it back: 3×5 + 5 = 20 ✓'),
  gen(L){ const lvl = L.lvl || 2, x = lvl >= 3 ? ri(-9, 12) : ri(1, 15);
    if(lvl === 1){ const b = ri(1, 30), c = x + b; return {p:S(`x + ${b} = ${c}. x = ?`, `Solve: x + ${b} = ${c}. x = ?`), scene:'', opts: opts(x, [c + b, x + 1, x - 1, c].filter(v => v !== x)), ans:x, ex:S(`இரு பக்கமும் ${b} கழி: x = ${c} − ${b} = ${x}`, `Take ${b} from both sides: x = ${c} − ${b} = ${x}`)}; }
    if(lvl === 2){ const a = ri(2, 9), b = ri(-20, 20), c = a * x + b;
      return {p:S(`${lin(a, b)} = ${N(c)}. x = ?`, `Solve: ${lin(a, b)} = ${N(c)}. x = ?`), scene:'', opts: opts(x, [(c + b) / a, c - b, x + 1, -x].filter(v => Number.isInteger(v) && v !== x)), ans:x,
        ex:S(`${a}x = ${N(c)} ${b >= 0 ? '−' : '+'} ${Math.abs(b)} = ${N(c - b)} → x = ${N(c - b)} ÷ ${a} = ${N(x)}`, `${a}x = ${N(c)} ${b >= 0 ? '−' : '+'} ${Math.abs(b)} = ${N(c - b)} → x = ${N(c - b)} ÷ ${a} = ${N(x)}`)}; }
    let a, c; do { a = ri(2, 9); c = ri(1, 8); } while(a === c); const b = ri(-15, 15), d = (a - c) * x + b;
    return {p:S(`${lin(a, b)} = ${lin(c, d)}. x = ?`, `Solve: ${lin(a, b)} = ${lin(c, d)}. x = ?`), scene:'', opts: opts(x, [-x, x + 1, x - 1, (d + b) / (a - c)].filter(v => Number.isInteger(v) && v !== x)), ans:x,
      ex:S(`x-களை ஒரு பக்கம்: ${a - c}x = ${N(d)} ${b >= 0 ? '−' : '+'} ${Math.abs(b)} = ${N(d - b)} → x = ${N(x)}`, `Collect x on one side: ${a - c}x = ${N(d)} ${b >= 0 ? '−' : '+'} ${Math.abs(b)} = ${N(d - b)} → x = ${N(x)}`)}; } };
M.evalExpr = { title:S('மதிப்பைக் கண்டுபிடி', 'Find the value'), icon:'🔣',
  intro:S('எழுத்து (மாறி) ஒரு பெட்டி போல — அதில் எண்ணைப் போடு. x = 4 என்றால் 3x + 7 = 3 × 4 + 7 = 19. முதலில் பெருக்கல், பிறகு கூட்டல்!', 'A letter (variable) is like a box — put the number in. If x = 4, 3x + 7 = 3 × 4 + 7 = 19. Multiply first, then add!'),
  gen(L){ const x = L.neg ? ri(-6, 9) : ri(1, 12), a = ri(2, 9), b = ri(1, 20), sq = L.sq && Math.random() < .5;
    const ans = sq ? x * x + a * x + b : a * x + b, e = sq ? `x² + ${a}x + ${b}` : `${a}x + ${b}`;
    return {p:S(`x = ${N(x)} எனில், ${e} = ?`, `If x = ${N(x)}, then ${e} = ?`), scene:'', opts: opts(ans, [a + x + b, a * (x + b), ans + a, ans - 1, sq ? 2 * x + a * x + b : a * x - b].filter(v => v !== ans)), ans,
      ex:S(sq ? `${P(x)}² + ${a}×${P(x)} + ${b} = ${x * x} + ${N(a * x)} + ${b} = ${N(ans)}` : `${a} × ${P(x)} + ${b} = ${N(a * x)} + ${b} = ${N(ans)}`, sq ? `${P(x)}² + ${a}×${P(x)} + ${b} = ${x * x} + ${N(a * x)} + ${b} = ${N(ans)}` : `${a} × ${P(x)} + ${b} = ${N(a * x)} + ${b} = ${N(ans)}`)}; } };
M.matchstick = { title:S('தீக்குச்சி அமைப்புகள் → விதி', 'Matchstick patterns → rule'), icon:'🔥',
  intro:S('1 சதுரத்துக்கு 4 குச்சி, ஒவ்வொரு புதிய சதுரத்துக்கும் 3 கூடுதல் → n சதுரங்களுக்கு 3n + 1 குச்சி. இப்படி ஒரு விதியை எழுத்தால் (n) எழுதுவதுதான் இயற்கணிதம் (algebra)!', '1 square needs 4 sticks, each new square adds 3 → n squares need 3n + 1 sticks. Writing a rule with a letter (n) like this is algebra!'),
  gen(){ const sh = pick([['சதுரம்','squares',4,3,'□'],['முக்கோணம்','triangles',3,2,'△']]), n = ri(4, 30), per = sh[3], ans = per * n + 1;
    return {p:S(`தொடர்ச்சியான ${sh[0]} அமைப்பு: 1 → ${sh[2]} குச்சி, 2 → ${sh[2] + per}, 3 → ${sh[2] + 2 * per}. ${n} ${sh[0]}களுக்கு எத்தனை குச்சி?`, `A row of ${sh[1]}: 1 → ${sh[2]} sticks, 2 → ${sh[2] + per}, 3 → ${sh[2] + 2 * per}. How many sticks for ${n} ${sh[1]}?`),
      scene:`<div class="big">${Array(3).fill(sh[4]).join('')} …</div>`, opts: opts(ans, [sh[2] * n, per * n, ans + per, ans - 1].filter(v => v !== ans)), ans,
      ex:S(`விதி: ${per}n + 1 → ${per} × ${n} + 1 = ${ans}`, `Rule: ${per}n + 1 → ${per} × ${n} + 1 = ${ans}`)}; } };
M.exponents = { title:S('அடுக்குகள்', 'Exponents'), icon:'⚡',
  intro:S('2⁵ = 2 × 2 × 2 × 2 × 2 = 32. விதிகள்: aᵐ × aⁿ = aᵐ⁺ⁿ; aᵐ ÷ aⁿ = aᵐ⁻ⁿ; (aᵐ)ⁿ = aᵐˣⁿ; a⁰ = 1. ஒரு காகிதத்தை 10 முறை மடித்தால் 2¹⁰ = 1024 அடுக்குகள்!', '2⁵ = 2 × 2 × 2 × 2 × 2 = 32. Laws: aᵐ × aⁿ = aᵐ⁺ⁿ; aᵐ ÷ aⁿ = aᵐ⁻ⁿ; (aᵐ)ⁿ = aᵐˣⁿ; a⁰ = 1. Fold a paper 10 times and you get 2¹⁰ = 1024 layers!'),
  gen(L){ const k = pick(L.laws ? ['val', 'mul', 'div', 'pow'] : ['val']);
    if(k === 'val'){ let b, e; do { b = ri(2, 10); e = ri(2, 6); } while(Math.pow(b, e) > 100000); const ans = Math.pow(b, e);
      return {p:S(`${b}${sup(e)} = ?`, `${b}${sup(e)} = ?`), scene:'', opts: opts(ans, [b * e, Math.pow(e, b) <= 1e6 ? Math.pow(e, b) : ans * b, ans * b, ans / b].filter(v => Number.isInteger(v) && v !== ans)), ans,
        ex:S(`${Array(e).fill(b).join(' × ')} = ${fmt(ans)}`, `${Array(e).fill(b).join(' × ')} = ${fmt(ans)}`)}; }
    const b = ri(2, 9), m = ri(2, 9), n = ri(2, 6);
    if(k === 'mul'){ const ans = m + n; return {p:S(`${b}${sup(m)} × ${b}${sup(n)} = ${b}^? — அடுக்கு எவ்வளவு?`, `${b}${sup(m)} × ${b}${sup(n)} = ${b}^? — what is the power?`), scene:'', opts: opts(ans, [m * n, Math.abs(m - n)].filter(v => v !== ans)), ans, ex:S(`அடுக்குகளைக் கூட்டு: ${m} + ${n} = ${ans}`, `Add the powers: ${m} + ${n} = ${ans}`)}; }
    if(k === 'div'){ const mm = m + n, ans = mm - n; return {p:S(`${b}${sup(mm)} ÷ ${b}${sup(n)} = ${b}^? — அடுக்கு எவ்வளவு?`, `${b}${sup(mm)} ÷ ${b}${sup(n)} = ${b}^? — what is the power?`), scene:'', opts: opts(ans, [mm + n, mm * n, Math.floor(mm / n)].filter(v => v !== ans && v > 0)), ans, ex:S(`அடுக்குகளைக் கழி: ${mm} − ${n} = ${ans}`, `Subtract the powers: ${mm} − ${n} = ${ans}`)}; }
    const ans = m * n; return {p:S(`(${b}${sup(m)})${sup(n)} = ${b}^? — அடுக்கு எவ்வளவு?`, `(${b}${sup(m)})${sup(n)} = ${b}^? — what is the power?`), scene:'', opts: opts(ans, [m + n, Math.abs(m - n) || m + 1].filter(v => v !== ans)), ans, ex:S(`அடுக்குகளைப் பெருக்கு: ${m} × ${n} = ${ans}`, `Multiply the powers: ${m} × ${n} = ${ans}`)}; } };
M.roots = { title:S('வர்க்கம், வர்க்கமூலம், கனம்', 'Squares, roots & cubes'), icon:'⬛',
  intro:S('12² = 12 × 12 = 144; √144 = 12 (எந்த எண்ணை அதனாலேயே பெருக்கினால் 144?). 6³ = 6 × 6 × 6 = 216; ∛216 = 6. சதுரத் தரையின் பரப்பு 144 m² என்றால் ஒரு பக்கம் 12 m!', '12² = 12 × 12 = 144; √144 = 12 (which number times itself makes 144?). 6³ = 6 × 6 × 6 = 216; ∛216 = 6. A square floor of 144 m² has sides of 12 m!'),
  gen(L){ const k = pick(L.cube ? ['sq', 'sqrt', 'cube', 'cbrt'] : ['sq', 'sqrt']), n = k === 'cube' || k === 'cbrt' ? ri(2, 15) : ri(2, L.max || 30);
    const t = {sq:[`${n}² = ?`, n * n], sqrt:[`√${fmt(n * n)} = ?`, n], cube:[`${n}³ = ?`, n * n * n], cbrt:[`∛${fmt(n * n * n)} = ?`, n]}[k], ans = t[1];
    return {p:S(t[0], t[0]), scene:'', opts: opts(ans, k === 'sq' ? [2 * n, ans + n, ans - n, (n + 1) * (n + 1)] : k === 'cube' ? [3 * n, n * n, ans + n * n, (n + 1) ** 3] : [n + 1, n - 1, n * 2, Math.floor(n / 2)].filter(v => v > 0 && v !== n)), ans,
      ex:S(k === 'sqrt' ? `${n} × ${n} = ${fmt(n * n)}` : k === 'cbrt' ? `${n} × ${n} × ${n} = ${fmt(n ** 3)}` : `${Array(k === 'sq' ? 2 : 3).fill(n).join(' × ')} = ${fmt(ans)}`, k === 'sqrt' ? `${n} × ${n} = ${fmt(n * n)}` : k === 'cbrt' ? `${n} × ${n} × ${n} = ${fmt(n ** 3)}` : `${Array(k === 'sq' ? 2 : 3).fill(n).join(' × ')} = ${fmt(ans)}`)}; } };

/* ================= GEOMETRY & MEASURES ================= */
function angleSVG(d){ const r = d * Math.PI / 180, x = 100 + 80 * Math.cos(r), y = 110 - 80 * Math.sin(r);
  const big = d > 180 ? 1 : 0, ax = 100 + 26 * Math.cos(r), ay = 110 - 26 * Math.sin(r);
  return `<svg viewBox="0 0 200 200" class="pic" style="max-width:220px"><line x1="100" y1="110" x2="185" y2="110" stroke="#14213d" stroke-width="4"/><line x1="100" y1="110" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#a4133c" stroke-width="4"/><path d="M126 110 A26 26 0 ${big} 0 ${ax.toFixed(1)} ${ay.toFixed(1)}" fill="none" stroke="#f59e0b" stroke-width="3"/><text x="100" y="190" text-anchor="middle" font-size="20" font-weight="700" fill="#3b2fc9">${d}°</text></svg>`; }
M.angleType = { title:S('கோணத்தின் வகை', 'Type of angle'), icon:'📐',
  intro:S('குறுங்கோணம் < 90°; செங்கோணம் = 90°; விரிகோணம் 90°–180° இடையே; நேர்கோணம் = 180°; பின்வளை கோணம் > 180°. கதவைத் திறக்கும்போது எல்லா வகையும் வருகின்றன!', 'Acute < 90°; right = 90°; obtuse between 90° and 180°; straight = 180°; reflex > 180°. Opening a door passes through them all!'),
  gen(){ const T = [['acute','குறுங்கோணம்','acute'],['right','செங்கோணம்','right'],['obtuse','விரிகோணம்','obtuse'],['straight','நேர்கோணம்','straight'],['reflex','பின்வளை கோணம்','reflex']];
    const k = pick(T), d = {acute: ri(10, 85), right: 90, obtuse: ri(95, 175), straight: 180, reflex: ri(190, 340)}[k[0]];
    return {p:S(`${d}° — எந்த வகைக் கோணம்?`, `An angle of ${d}° is…`), scene: angleSVG(d), opts: shuffle(shuffle(T.filter(x => x !== k)).slice(0, 3).concat([k])).map(x => ({v:x[0], h:`${x[1]} / ${x[2]}`})), ans:k[0],
      ex:S(`${d}° → ${k[1]}`, `${d}° → ${k[2]}`), data:{d}}; } };
M.angleCalc = { title:S('கோணக் கணக்குகள்', 'Angle puzzles'), icon:'🔺',
  intro:S('நிரப்புக் கோணங்கள் கூடுதல் 90°; மிகைநிரப்புக் கோணங்கள் கூடுதல் 180°. முக்கோணத்தின் மூன்று கோணங்களின் கூடுதல் எப்போதும் 180° — ஒரு காகித முக்கோணத்தின் மூன்று மூலைகளைக் கிழித்து வரிசையாக வைத்துப் பார், ஒரு நேர்கோடு வரும்! n பக்க பலகோணத்தின் உட்கோணக் கூடுதல் = (n − 2) × 180°.', 'Complementary angles add to 90°; supplementary angles add to 180°. The three angles of a triangle always add to 180° — tear the three corners off a paper triangle and line them up: they make a straight line! Interior angles of an n-sided polygon add to (n − 2) × 180°.'),
  gen(L){ const k = pick(L.poly ? ['comp', 'supp', 'tri', 'poly', 'ext'] : ['comp', 'supp', 'tri']);
    if(k === 'comp'){ const a = ri(5, 85), ans = 90 - a; return {p:S(`${a}°-ன் நிரப்புக் கோணம் = ?`, `The complement of ${a}° = ?`), scene:'', opts: opts(ans, [180 - a, a, ans + 10, ans - 10].filter(v => v > 0 && v !== ans), v => v + '°'), ans, ex:S(`90° − ${a}° = ${ans}°`, `90° − ${a}° = ${ans}°`)}; }
    if(k === 'supp'){ const a = ri(5, 175), ans = 180 - a; return {p:S(`${a}°-ன் மிகைநிரப்புக் கோணம் = ?`, `The supplement of ${a}° = ?`), scene:'', opts: opts(ans, [Math.abs(90 - a), a, ans + 10, ans - 10].filter(v => v > 0 && v !== ans), v => v + '°'), ans, ex:S(`180° − ${a}° = ${ans}°`, `180° − ${a}° = ${ans}°`)}; }
    if(k === 'tri'){ let a, b; do { a = ri(20, 110); b = ri(20, 110); } while(a + b >= 170); const ans = 180 - a - b;
      return {p:S(`ஒரு முக்கோணத்தின் இரு கோணங்கள் ${a}°, ${b}°. மூன்றாவது கோணம் = ?`, `Two angles of a triangle are ${a}° and ${b}°. The third angle = ?`), scene:'', opts: opts(ans, [360 - a - b, 90 - Math.min(a, b), ans + 10, a + b].filter(v => v > 0 && v !== ans), v => v + '°'), ans, ex:S(`180° − ${a}° − ${b}° = ${ans}°`, `180° − ${a}° − ${b}° = ${ans}°`)}; }
    const n = pick([3, 4, 5, 6, 8, 9, 10, 12]), nm = {3:['முக்கோணம்','triangle'],4:['நாற்கரம்','quadrilateral'],5:['ஐங்கோணம்','pentagon'],6:['அறுங்கோணம்','hexagon'],8:['எண்கோணம்','octagon'],9:['நவகோணம்','nonagon'],10:['தசகோணம்','decagon'],12:['பன்னிருகோணம்','dodecagon']}[n];
    if(k === 'poly'){ const ans = (n - 2) * 180; return {p:S(`${nm[0]} (${n} பக்கம்) — உட்கோணங்களின் கூடுதல் = ?`, `Sum of the interior angles of a ${nm[1]} (${n} sides) = ?`), scene:'', opts: opts(ans, [n * 180, (n - 1) * 180, 360, ans + 180].filter(v => v !== ans), v => fmt(v) + '°'), ans, ex:S(`(${n} − 2) × 180° = ${fmt(ans)}°`, `(${n} − 2) × 180° = ${fmt(ans)}°`)}; }
    const ans = 360 / n; return {p:S(`ஒழுங்கு ${nm[0]} (${n} பக்கம்) — ஒரு வெளிக்கோணம் = ?`, `Each exterior angle of a regular ${nm[1]} (${n} sides) = ?`), scene:'', opts: opts(ans, [180 / n, 180 - ans, (n - 2) * 180 / n].filter(v => Number.isInteger(v) && v !== ans), v => v + '°'), ans, ex:S(`வெளிக்கோணங்களின் கூடுதல் எப்போதும் 360°: 360° ÷ ${n} = ${ans}°`, `Exterior angles always add to 360°: 360° ÷ ${n} = ${ans}°`)}; } };
M.area = { title:S('பரப்பளவு, சுற்றளவு, கனஅளவு', 'Area, perimeter & volume'), icon:'📏',
  intro:S('செவ்வகம்: பரப்பு = நீளம் × அகலம். முக்கோணம்: ½ × அடிப்பக்கம் × உயரம். இணைகரம்: அடிப்பக்கம் × உயரம். வட்டம்: சுற்றளவு = 2πr, பரப்பு = πr² (π ≈ 22/7). கனச்செவ்வகம்: கனஅளவு = நீ × அ × உ.', 'Rectangle: area = length × breadth. Triangle: ½ × base × height. Parallelogram: base × height. Circle: circumference = 2πr, area = πr² (π ≈ 22/7). Cuboid: volume = l × b × h.'),
  gen(L){ const kinds = L.kinds || ['rect', 'sq', 'tri']; const k = pick(kinds);
    if(k === 'rect' || k === 'sq'){ const l = ri(3, 30), b = k === 'sq' ? l : ri(2, 25), per = Math.random() < .5, ans = per ? 2 * (l + b) : l * b;
      const name = k === 'sq' ? S(`பக்கம் ${l} cm உள்ள சதுரம்`, `a square of side ${l} cm`) : S(`நீளம் ${l} cm, அகலம் ${b} cm உள்ள செவ்வகம்`, `a rectangle ${l} cm long and ${b} cm wide`);
      return {p:S(`${name.ta} — ${per ? 'சுற்றளவு (cm)' : 'பரப்பு (cm²)'} = ?`, `${per ? 'Perimeter (cm)' : 'Area (cm²)'} of ${name.en} = ?`), scene:'', opts: opts(ans, [per ? l * b : 2 * (l + b), l + b, ans + 2, ans - 2].filter(v => v > 0 && v !== ans)), ans,
        ex:S(per ? `2 × (${l} + ${b}) = ${ans} cm` : `${l} × ${b} = ${ans} cm²`, per ? `2 × (${l} + ${b}) = ${ans} cm` : `${l} × ${b} = ${ans} cm²`)}; }
    if(k === 'tri'){ const b = ri(2, 20) * 2, h = ri(2, 25), ans = b * h / 2;
      return {p:S(`அடிப்பக்கம் ${b} cm, உயரம் ${h} cm உள்ள முக்கோணத்தின் பரப்பு (cm²) = ?`, `Area (cm²) of a triangle with base ${b} cm and height ${h} cm = ?`), scene:'', opts: opts(ans, [b * h, b + h, ans + h].filter(v => v !== ans)), ans, ex:S(`½ × ${b} × ${h} = ${ans} cm²`, `½ × ${b} × ${h} = ${ans} cm²`)}; }
    if(k === 'para'){ const b = ri(3, 25), h = ri(2, 20), ans = b * h;
      return {p:S(`அடிப்பக்கம் ${b} cm, உயரம் ${h} cm உள்ள இணைகரத்தின் பரப்பு (cm²) = ?`, `Area (cm²) of a parallelogram with base ${b} cm and height ${h} cm = ?`), scene:'', opts: opts(ans, [b * h / 2 | 0, 2 * (b + h), ans + b].filter(v => v > 0 && v !== ans)), ans, ex:S(`${b} × ${h} = ${ans} cm²`, `${b} × ${h} = ${ans} cm²`)}; }
    if(k === 'circle'){ const r = ri(1, 6) * 7, circ = Math.random() < .5, ans = circ ? 44 * r / 7 : 22 * r * r / 7;
      return {p:S(`ஆரம் ${r} cm உள்ள வட்டத்தின் ${circ ? 'சுற்றளவு (cm)' : 'பரப்பு (cm²)'} = ? (π = 22/7)`, `${circ ? 'Circumference (cm)' : 'Area (cm²)'} of a circle of radius ${r} cm = ? (π = 22/7)`), scene:'', opts: opts(ans, [circ ? 22 * r * r / 7 : 44 * r / 7, circ ? 22 * r / 7 : 44 * r, ans + 22].filter(v => v !== ans)), ans,
        ex:S(circ ? `2 × 22/7 × ${r} = ${ans} cm` : `22/7 × ${r} × ${r} = ${fmt(ans)} cm²`, circ ? `2 × 22/7 × ${r} = ${ans} cm` : `22/7 × ${r} × ${r} = ${fmt(ans)} cm²`)}; }
    if(k === 'cuboid'){ const l = ri(2, 15), b = ri(2, 12), h = ri(2, 10), ans = l * b * h;
      return {p:S(`${l} cm × ${b} cm × ${h} cm கனச்செவ்வகத்தின் கனஅளவு (cm³) = ?`, `Volume (cm³) of a ${l} cm × ${b} cm × ${h} cm cuboid = ?`), scene:'📦', opts: opts(ans, [l + b + h, 2 * (l * b + b * h + h * l), l * b, ans + l].filter(v => v !== ans)), ans, ex:S(`${l} × ${b} × ${h} = ${ans} cm³`, `${l} × ${b} × ${h} = ${ans} cm³`)}; }
    const a = ri(2, 15), ans = 6 * a * a;
    return {p:S(`பக்கம் ${a} cm உள்ள கனசதுரத்தின் மொத்தப் புறப்பரப்பு (cm²) = ?`, `Total surface area (cm²) of a cube of side ${a} cm = ?`), scene:'🧊', opts: opts(ans, [a * a * a, 4 * a * a, a * a, ans + 6].filter(v => v !== ans)), ans, ex:S(`6 முகங்கள் × ${a}² = 6 × ${a * a} = ${ans} cm²`, `6 faces × ${a}² = 6 × ${a * a} = ${ans} cm²`)}; } };

/* ================= STATISTICS ================= */
M.stats = { title:S('சராசரி, இடைநிலை, முகடு', 'Mean, median, mode'), icon:'📊',
  intro:S('சராசரி = எல்லாவற்றின் கூடுதல் ÷ எண்ணிக்கை. இடைநிலை = வரிசைப்படுத்திய பின் நடுவில் உள்ள எண். முகடு = அதிக முறை வரும் எண். வீச்சு = பெரியது − சிறியது. கிரிக்கெட் சராசரியும் இப்படித்தான்!', 'Mean = total ÷ how many. Median = the middle number after sorting. Mode = the number that appears most. Range = largest − smallest. Cricket averages work the same way!'),
  gen(L){ const k = pick(L.kinds || ['mean', 'median', 'mode', 'range']), n = pick([5, 7]); let d, ans;
    if(k === 'mean'){ do { d = Array.from({length: n}, () => ri(1, 40)); } while(d.reduce((a, b) => a + b) % n); ans = d.reduce((a, b) => a + b) / n; }
    else if(k === 'mode'){ const m = ri(1, 30); do { d = [m, m, m, ...Array.from({length: n - 3}, () => ri(1, 30))]; } while(new Set(d.slice(3)).size !== n - 3 || d.slice(3).includes(m)); d = shuffle(d); ans = m; }
    else { d = shuffle(Array.from({length: n}, () => ri(1, 60))); const s = d.slice().sort((a, b) => a - b); ans = k === 'median' ? s[(n - 1) / 2] : s[n - 1] - s[0]; }
    const nm = {mean:['சராசரி','Mean'], median:['இடைநிலை','Median'], mode:['முகடு','Mode'], range:['வீச்சு','Range']}[k], s = d.slice().sort((a, b) => a - b), tot = d.reduce((a, b) => a + b);
    return {p:S(`${d.join(', ')} — ${nm[0]} = ?`, `${nm[1]} of ${d.join(', ')} = ?`), scene:'', opts: opts(ans, [s[(n - 1) / 2], Math.round(tot / n), s[n - 1] - s[0], s[0], s[n - 1], ans + 1].filter(v => v !== ans)), ans,
      ex:S({mean:`${tot} ÷ ${n} = ${ans}`, median:`வரிசை: ${s.join(', ')} → நடு = ${ans}`, mode:`${ans} மூன்று முறை வருகிறது`, range:`${s[n - 1]} − ${s[0]} = ${ans}`}[k], {mean:`${tot} ÷ ${n} = ${ans}`, median:`Sorted: ${s.join(', ')} → middle = ${ans}`, mode:`${ans} appears three times`, range:`${s[n - 1]} − ${s[0]} = ${ans}`}[k])}; } };

/* ================= SCIENCE (generated) ================= */
M.pressure = { title:S('அழுத்தம், அடர்த்தி', 'Pressure & density'), icon:'🧱',
  intro:S('அழுத்தம் = விசை ÷ பரப்பு (N/m² = பாஸ்கல், Pa). கூர்மையான கத்தி ஏன் நன்றாக வெட்டுகிறது? சிறிய பரப்பு → அதிக அழுத்தம்! அடர்த்தி = நிறை ÷ கனஅளவு. நீரின் அடர்த்தி 1 g/cm³; அதைவிடக் குறைந்த அடர்த்தி உள்ளவை மிதக்கும்.', 'Pressure = force ÷ area (N/m² = pascal, Pa). Why does a sharp knife cut well? Small area → big pressure! Density = mass ÷ volume. Water’s density is 1 g/cm³; things less dense than water float.'),
  gen(){ if(Math.random() < .5){ const A = ri(1, 20), p = ri(2, 50) * 5, F = A * p;
      return {p:S(`${fmt(F)} N விசை ${A} m² பரப்பில் செயல்படுகிறது. அழுத்தம் = ? (Pa)`, `A force of ${fmt(F)} N acts on ${A} m². Pressure = ? (Pa)`), scene:'', opts: opts(p, [F * A, F - A, p + 5, p * 2].filter(v => v > 0 && v !== p)), ans:p, ex:S(`${fmt(F)} ÷ ${A} = ${p} Pa`, `${fmt(F)} ÷ ${A} = ${p} Pa`)}; }
    const V = ri(2, 50) * 10, dens = pick([2, 3, 5, 6, 7, 8, 9, 11, 13, 19, 27]), m = V * dens / 10, ans = dstr(dens * 10);
    return {p:S(`நிறை ${fmt(m)} g, கனஅளவு ${V} cm³. அடர்த்தி = ? (g/cm³)`, `Mass ${fmt(m)} g, volume ${V} cm³. Density = ? (g/cm³)`), scene:'', opts: opts(ans, [dstr(dens * 100), dstr(dens), dstr(dens * 10 + 100), dstr(Math.max(10, dens * 10 - 100))].filter(v => v !== ans), v => v), ans,
      ex:S(`${fmt(m)} ÷ ${V} = ${ans} g/cm³ — ${dens > 10 ? 'நீரைவிட அடர்த்தி அதிகம், மூழ்கும்' : 'நீரைவிடக் குறைவு, மிதக்கும்'}`, `${fmt(m)} ÷ ${V} = ${ans} g/cm³ — ${dens > 10 ? 'denser than water, it sinks' : 'less dense than water, it floats'}`)}; } };
M.temperature = { title:S('வெப்பநிலை மாற்றம்', 'Temperature conversion'), icon:'🌡️',
  intro:S('°F = °C × 9/5 + 32. நீர் 0°C (32°F)-ல் உறையும், 100°C (212°F)-ல் கொதிக்கும். கெல்வின்: K = °C + 273 (துல்லியமாக 273.15). உடல் வெப்பநிலை சுமார் 37°C = 98.6°F.', '°F = °C × 9/5 + 32. Water freezes at 0°C (32°F) and boils at 100°C (212°F). Kelvin: K = °C + 273 (exactly 273.15). Body temperature is about 37°C = 98.6°F.'),
  gen(){ if(Math.random() < .6){ const c = ri(-8, 20) * 5, ans = c * 9 / 5 + 32;
      return {p:S(`${N(c)}°C = ? °F`, `${N(c)}°C = ? °F`), scene:'', opts: opts(ans, [c + 32, c * 2 + 32, ans + 9, ans - 9].filter(v => v !== ans), v => N(v) + '°F'), ans, ex:S(`${N(c)} × 9/5 + 32 = ${N(c * 9 / 5)} + 32 = ${N(ans)}°F`, `${N(c)} × 9/5 + 32 = ${N(c * 9 / 5)} + 32 = ${N(ans)}°F`)}; }
    const c = ri(-50, 150), ans = c + 273;
    return {p:S(`${N(c)}°C = ? K (K = °C + 273)`, `${N(c)}°C = ? K (use K = °C + 273)`), scene:'', opts: opts(ans, [c - 273, ans + 10, ans - 10, 273 - c].filter(v => v !== ans), v => N(v) + ' K'), ans, ex:S(`${N(c)} + 273 = ${N(ans)} K`, `${N(c)} + 273 = ${N(ans)} K`)}; } };

/* ================= SOCIAL (generated) ================= */
M.longitudeTime = { title:S('தீர்க்கரேகையும் நேரமும்', 'Longitude & time'), icon:'🕐',
  intro:S('பூமி 24 மணி நேரத்தில் 360° சுழல்கிறது → 1 மணி = 15°, 1° = 4 நிமிடம். கிழக்கே செல்லச் செல்ல நேரம் முன்னே: இந்திய திட்ட நேரம் (IST) 82½° கிழக்கு → கிரீன்விச்சை (0°) விட 5 மணி 30 நிமிடம் முன்னே.', 'The Earth turns 360° in 24 hours → 1 hour = 15°, 1° = 4 minutes. The further east, the later the clock: Indian Standard Time (82½° E) is 5 h 30 min ahead of Greenwich (0°).'),
  gen(){ const a = ri(0, 8) * 15, diff = ri(1, 6) * 15, b = a + diff, h0 = ri(1, 11) - 0, back = Math.random() < .5;
    const toStr = h => { h = ((h % 24) + 24) % 24; const ap = h < 12 ? 'AM' : 'PM', hh = h % 12 || 12; return `${hh}:00 ${ap}`; };
    const [from, to, start] = back ? [b, a, h0 + 10] : [a, b, h0], ans = toStr(start + (to - from) / 15);
    return {p:S(`${from}° கிழக்கில் நேரம் ${toStr(start)}. அதே நேரத்தில் ${to}° கிழக்கில் நேரம் என்ன?`, `It is ${toStr(start)} at ${from}° E. What time is it at ${to}° E at that moment?`), scene:'🌍',
      opts: opts(ans, [toStr(start - (to - from) / 15), toStr(start + (to - from) / 15 + 1), toStr(start + (to - from) / 15 - 1), toStr(start)], v => v), ans,
      ex:S(`${Math.abs(to - from)}° ÷ 15 = ${Math.abs(to - from) / 15} மணி; ${to > from ? 'கிழக்கு → முன்னே' : 'மேற்கு → பின்னே'} → ${ans}`, `${Math.abs(to - from)}° ÷ 15 = ${Math.abs(to - from) / 15} h; ${to > from ? 'east → ahead' : 'west → behind'} → ${ans}`)}; } };

/* ================= TAMIL (6–8) ================= */
const T8 = G.KALVI_TAMIL;
M.meiInam = sortGame({title:S('வல்லினம், மெல்லினம், இடையினம்', 'Hard, soft & medium consonants'), icon:'க்',
  intro:S('மெய் எழுத்துகள் 18: வல்லினம் — க் ச் ட் த் ப் ற் (வலிமையான ஒலி); மெல்லினம் — ங் ஞ் ண் ந் ம் ன் (மூக்கின் வழி மென்மையான ஒலி); இடையினம் — ய் ர் ல் வ் ழ் ள் (இடைப்பட்ட ஒலி). "ழ" தமிழின் சிறப்பு ஒலி!', 'The 18 consonants: vallinam (hard) — க் ச் ட் த் ப் ற்; mellinam (soft, nasal) — ங் ஞ் ண் ந் ம் ன்; idaiyinam (medium) — ய் ர் ல் வ் ழ் ள். "ழ" is a sound special to Tamil!'),
  ask:S('ஒவ்வொரு மெய்யையும் சரியான இனத்தில் போடு', 'Put each consonant in its group'), rule:S('வல்லினம் க ச ட த ப ற • மெல்லினம் ங ஞ ண ந ம ன • இடையினம் ய ர ல வ ழ ள', 'Hard க ச ட த ப ற • soft ங ஞ ண ந ம ன • medium ய ர ல வ ழ ள')},
  [{id:'v', e:'💪', ta:'வல்லினம்', en:'Hard'}, {id:'m', e:'🌸', ta:'மெல்லினம்', en:'Soft'}, {id:'i', e:'🌿', ta:'இடையினம்', en:'Medium'}],
  [['க்','v'],['ச்','v'],['ட்','v'],['த்','v'],['ப்','v'],['ற்','v'],['ங்','m'],['ஞ்','m'],['ண்','m'],['ந்','m'],['ம்','m'],['ன்','m'],['ய்','i'],['ர்','i'],['ல்','i'],['வ்','i'],['ழ்','i'],['ள்','i']].map(([ta, bin]) => ({e:'', ta, en:'', bin})), 6);
M.kurilNedil = sortGame({title:S('குறில், நெடில்', 'Short & long vowels'), icon:'அ',
  intro:S('குறில் (ஒரு மாத்திரை — குறுகிய ஒலி): அ இ உ எ ஒ. நெடில் (இரண்டு மாத்திரை — நீண்ட ஒலி): ஆ ஈ ஊ ஏ ஐ ஓ ஔ. சொல்லிப் பார்: "அ" குறுகியது, "ஆ" நீண்டது.', 'Kuril (short, 1 beat): அ இ உ எ ஒ. Nedil (long, 2 beats): ஆ ஈ ஊ ஏ ஐ ஓ ஔ. Say them: "அ" is short, "ஆ" is long.'),
  ask:S('குறிலா, நெடிலா?', 'Short or long?'), rule:S('குறில் அ இ உ எ ஒ • நெடில் ஆ ஈ ஊ ஏ ஐ ஓ ஔ', 'Short அ இ உ எ ஒ • long ஆ ஈ ஊ ஏ ஐ ஓ ஔ')},
  [{id:'k', e:'•', ta:'குறில்', en:'Short'}, {id:'n', e:'—', ta:'நெடில்', en:'Long'}],
  [['அ','k'],['இ','k'],['உ','k'],['எ','k'],['ஒ','k'],['ஆ','n'],['ஈ','n'],['ஊ','n'],['ஏ','n'],['ஐ','n'],['ஓ','n'],['ஔ','n'],['கி','k'],['கீ','n'],['மு','k'],['மூ','n'],['பெ','k'],['பே','n']].map(([ta, bin]) => ({e:'', ta, en:'', bin})), 6);
const VERBS = [['படித்தான்','படிக்கிறான்','படிப்பான்','read'],['ஓடினான்','ஓடுகிறான்','ஓடுவான்','run'],['எழுதினான்','எழுதுகிறான்','எழுதுவான்','write'],['வந்தான்','வருகிறான்','வருவான்','come'],['பார்த்தான்','பார்க்கிறான்','பார்ப்பான்','see'],
  ['சாப்பிட்டான்','சாப்பிடுகிறான்','சாப்பிடுவான்','eat'],['விளையாடினான்','விளையாடுகிறான்','விளையாடுவான்','play'],['கேட்டான்','கேட்கிறான்','கேட்பான்','ask/hear'],['நடந்தான்','நடக்கிறான்','நடப்பான்','walk'],['பாடினான்','பாடுகிறான்','பாடுவான்','sing'],['தூங்கினான்','தூங்குகிறான்','தூங்குவான்','sleep']];
M.kaalam = sortGame({title:S('காலம் — முக்காலம்', 'Tense — past, present, future'), icon:'⏳',
  intro:S('இறந்தகாலம் — நடந்து முடிந்தது (படித்தான்). நிகழ்காலம் — இப்போது நடக்கிறது (படிக்கிறான் — "கிறு/கின்று"). எதிர்காலம் — இனி நடக்கும் (படிப்பான்).', 'Past — already happened (படித்தான்). Present — happening now (படிக்கிறான் — note "கிறு"). Future — will happen (படிப்பான்).'),
  ask:S('ஒவ்வொரு சொல்லும் எந்தக் காலம்?', 'Which tense is each word?'), rule:S('இறந்தகாலம் -த்தான்/-னான் • நிகழ்காலம் -கிறான் • எதிர்காலம் -வான்/-ப்பான்', 'Past -த்தான்/-னான் • present -கிறான் • future -வான்/-ப்பான்')},
  [{id:'p', e:'⏪', ta:'இறந்தகாலம்', en:'Past'}, {id:'n', e:'▶️', ta:'நிகழ்காலம்', en:'Present'}, {id:'f', e:'⏩', ta:'எதிர்காலம்', en:'Future'}],
  VERBS.flatMap(v => [{e:'', ta:v[0], en:v[3], bin:'p'}, {e:'', ta:v[1], en:v[3], bin:'n'}, {e:'', ta:v[2], en:v[3], bin:'f'}]), 6);
const TNUM = ['௦','௧','௨','௩','௪','௫','௬','௭','௮','௯'];
M.tamilNumerals = { title:S('தமிழ் எண்கள்', 'Tamil numerals'), icon:'௧',
  intro:S('நம் முன்னோர் எழுதிய தமிழ் எண்கள்: ௧ (1) ௨ (2) ௩ (3) ௪ (4) ௫ (5) ௬ (6) ௭ (7) ௮ (8) ௯ (9) ௦ (0). பழைய கல்வெட்டுகளிலும் ஓலைச்சுவடிகளிலும் இவற்றைக் காணலாம்; ௰ = 10, ௱ = 100, ௲ = 1000 என்ற தனிக் குறிகளும் உண்டு.', 'Tamil numerals written by our ancestors: ௧ (1) ௨ (2) ௩ (3) ௪ (4) ௫ (5) ௬ (6) ௭ (7) ௮ (8) ௯ (9) ௦ (0). You can see them on old inscriptions and palm-leaf manuscripts; there are also special signs ௰ = 10, ௱ = 100, ௲ = 1000.'),
  gen(){ const n = ri(1, 99), t = String(n).split('').map(d => TNUM[+d]).join(''), toT = Math.random() < .5;
    const alt = m => String(m).split('').map(d => TNUM[+d]).join('');
    if(toT) return {p:S(`${n} — தமிழ் எண்ணில்?`, `${n} in Tamil numerals?`), scene:'', opts: opts(t, [alt(n + 1), alt(Math.max(1, n - 1)), alt(+String(n).split('').reverse().join('') || 1), alt(n + 10)].filter(x => x !== t), v => `<span class="ta-big">${v}</span>`), ans:t, ex:S(`${n} = ${t}`, `${n} = ${t}`)};
    return {p:S(`${t} = ?`, `${t} = ?`), scene:'', opts: opts(n, [n + 1, n - 1, n + 10, +String(n).split('').reverse().join('')].filter(x => x > 0)), ans:n, ex:S(`${t} = ${n}`, `${t} = ${n}`)}; } };
M.tamilLit = pairGame({title:S('தமிழ் இலக்கியம் — யார் எழுதியது?', 'Tamil literature — who wrote it?'), icon:'📜',
  intro:S('திருக்குறள் — திருவள்ளுவர் (1330 குறள்கள், 133 அதிகாரங்கள், அறம்-பொருள்-இன்பம் என மூன்று பால்கள்). தொல்காப்பியம் — தொல்காப்பியர் (இன்று கிடைக்கும் மிகப் பழைய தமிழ் இலக்கண நூல்). சிலப்பதிகாரம் — இளங்கோவடிகள். மணிமேகலை — சீத்தலைச் சாத்தனார். கம்பராமாயணம் — கம்பர்.', 'Thirukkural — Thiruvalluvar (1330 couplets, 133 chapters, in three parts: virtue, wealth, love). Tholkappiyam — Tholkappiyar (the oldest Tamil grammar that survives). Silappathikaram — Ilango Adigal. Manimegalai — Seethalai Sathanar. Kamba Ramayanam — Kambar.')},
  [['திருக்குறள்','Thirukkural','திருவள்ளுவர்','Thiruvalluvar'],['தொல்காப்பியம்','Tholkappiyam','தொல்காப்பியர்','Tholkappiyar'],['சிலப்பதிகாரம்','Silappathikaram','இளங்கோவடிகள்','Ilango Adigal'],['மணிமேகலை','Manimegalai','சீத்தலைச் சாத்தனார்','Seethalai Sathanar'],['கம்பராமாயணம்','Kamba Ramayanam','கம்பர்','Kambar']]
    .map(([a, b, c, d]) => ({e:'📜', grp:'a', q:S(`"${a}" எழுதியவர்?`, `Who wrote "${b}"?`), a:S(c, d)}))
  .concat([{e:'📖', q:S('திருக்குறளில் எத்தனை குறள்கள்?', 'How many couplets are in the Thirukkural?'), a:S('1330','1330'), alts:[S('133','133'), S('1000','1000'), S('3','3')]},
    {e:'📖', q:S('திருக்குறளில் எத்தனை அதிகாரங்கள்?', 'How many chapters are in the Thirukkural?'), a:S('133','133'), alts:[S('1330','1330'), S('100','100'), S('10','10')]},
    {e:'📖', q:S('திருக்குறளின் முப்பால்கள்?', 'The three parts of the Thirukkural?'), a:S('அறம், பொருள், இன்பம்','virtue, wealth, love'), alts:[S('இயல், இசை, நாடகம்','prose, music, drama'), S('அகம், புறம், பொருள்','inner, outer, wealth'), S('எழுத்து, சொல், பொருள்','letter, word, meaning')]}]));

/* ================= ENGLISH (6–8) ================= */
M.partsOfSpeech = sortGame({title:S('Parts of speech', 'Parts of speech'), icon:'🏷️',
  intro:S('Noun — பெயர்ச்சொல் (teacher, river, happiness). Verb — வினைச்சொல் (write, arrive). Adjective — பெயரைப் பற்றிச் சொல்வது (brave, tall). Adverb — வினையைப் பற்றிச் சொல்வது, பெரும்பாலும் -ly (quickly, carefully).', 'Noun — a naming word (teacher, river, happiness). Verb — an action word (write, arrive). Adjective — describes a noun (brave, tall). Adverb — describes a verb, often ending in -ly (quickly, carefully).'),
  ask:S('Sort the words', 'Sort the words'), rule:S('Noun = name • Verb = action • Adjective = describes a noun • Adverb = describes a verb', 'Noun = name • Verb = action • Adjective = describes a noun • Adverb = describes a verb')},
  [{id:'n', e:'🏷️', ta:'Noun', en:'naming'}, {id:'v', e:'🏃', ta:'Verb', en:'action'}, {id:'a', e:'🎨', ta:'Adjective', en:'describes noun'}, {id:'d', e:'⏱️', ta:'Adverb', en:'describes verb'}],
  [['teacher','n'],['river','n'],['happiness','n'],['Chennai','n'],['pencil','n'],['village','n'],['write','v'],['arrive','v'],['speak','v'],['bring','v'],['grow','v'],['eat','v'],
   ['beautiful','a'],['brave','a'],['tall','a'],['noisy','a'],['honest','a'],['huge','a'],['quickly','d'],['slowly','d'],['carefully','d'],['loudly','d'],['happily','d'],['bravely','d']].map(([ta, bin]) => ({e:'', ta, en:'', bin})), 8);
const DEG = [['good','better','best'],['bad','worse','worst'],['big','bigger','biggest'],['tall','taller','tallest'],['happy','happier','happiest'],['hot','hotter','hottest'],['easy','easier','easiest'],['little','less','least'],['many','more','most'],['beautiful','more beautiful','most beautiful'],['careful','more careful','most careful'],['small','smaller','smallest'],['thin','thinner','thinnest']];
M.degrees = { title:S('Degrees of comparison', 'Degrees of comparison'), icon:'🥇',
  intro:S('tall → taller (இருவரை ஒப்பிட) → tallest (எல்லோரிலும்). நீண்ட சொற்கள்: more/most beautiful. சில தனி வடிவம்: good → better → best; bad → worse → worst.', 'tall → taller (comparing two) → tallest (of all). Long words: more/most beautiful. Some are irregular: good → better → best; bad → worse → worst.'),
  gen(){ const d = pick(DEG), sup = Math.random() < .5, ans = sup ? d[2] : d[1];
    const wrongs = [d[0] + 'er', d[0] + 'est', 'more ' + d[0], 'most ' + d[0], sup ? d[1] : d[2], d[0]];
    return {p:S(`${sup ? 'Superlative (-est / most)' : 'Comparative (-er / more)'} of "${d[0]}"?`, `${sup ? 'Superlative' : 'Comparative'} of "${d[0]}"?`), scene:'', opts: opts(ans, wrongs.filter(w => w !== ans), v => v), ans,
      ex:S(`${d[0]} → ${d[1]} → ${d[2]}`, `${d[0]} → ${d[1]} → ${d[2]}`)}; } };
const V3 = [['go','went','gone'],['eat','ate','eaten'],['write','wrote','written'],['see','saw','seen'],['take','took','taken'],['give','gave','given'],['break','broke','broken'],['speak','spoke','spoken'],['choose','chose','chosen'],['begin','began','begun'],
  ['drink','drank','drunk'],['sing','sang','sung'],['swim','swam','swum'],['fly','flew','flown'],['know','knew','known'],['bring','brought','brought'],['think','thought','thought'],['teach','taught','taught'],['buy','bought','bought'],['catch','caught','caught'],['do','did','done'],['ride','rode','ridden'],['forget','forgot','forgotten'],['hide','hid','hidden']];
M.verbForms = { title:S('Verb forms (V1 – V2 – V3)', 'Verb forms (V1 – V2 – V3)'), icon:'🔤',
  intro:S('V1 present (write), V2 past (wrote), V3 past participle (written) — "I have written". பல verbs -ed, ஆனால் இவை தனி வடிவம் — பாட்டுப் போலச் சொல்லிப் பழகு: go-went-gone, eat-ate-eaten…', 'V1 present (write), V2 past (wrote), V3 past participle (written) — "I have written". Many verbs just add -ed, but these are irregular — chant them like a song: go-went-gone, eat-ate-eaten…'),
  gen(){ const v = pick(V3), three = Math.random() < .6, ans = three ? v[2] : v[1];
    const pool = [v[0] + 'ed', three ? v[1] : v[2], v[0], v[0] + 'en', v[1] + 'ed'].filter(x => x !== ans);
    return {p:S(`${three ? 'V3 (past participle)' : 'V2 (past)'} of "${v[0]}"? — "${three ? 'I have ___' : 'Yesterday I ___'}"`, `${three ? 'V3 (past participle)' : 'V2 (past)'} of "${v[0]}"? — "${three ? 'I have ___' : 'Yesterday I ___'}"`), scene:'', opts: opts(ans, pool, v => v), ans,
      ex:S(v.join(' – '), v.join(' – '))}; } };
const PRE = [['happy','un'],['kind','un'],['possible','im'],['polite','im'],['legal','il'],['logical','il'],['regular','ir'],['responsible','ir'],['honest','dis'],['agree','dis'],['appear','dis'],['visible','in'],['correct','in']];
M.prefix = { title:S('Opposites with prefixes', 'Opposites with prefixes'), icon:'↔️',
  intro:S('முன்னொட்டு சேர்த்தால் எதிர்ச்சொல்: un-happy, im-possible (p/m முன் im), il-legal (l முன் il), ir-regular (r முன் ir), dis-honest, in-correct.', 'Add a prefix to make an opposite: un-happy, im-possible (im before p/m), il-legal (il before l), ir-regular (ir before r), dis-honest, in-correct.'),
  gen(){ const [w, p] = pick(PRE), ans = p + w, pool = ['un', 'im', 'il', 'ir', 'dis', 'in'].filter(x => x !== p).map(x => x + w);
    return {p:S(`Opposite of "${w}"?`, `Opposite of "${w}"?`), scene:'', opts: opts(ans, pool, v => v), ans, ex:S(`${w} → ${ans}`, `${w} → ${ans}`), check:q => PRE.some(([a, b]) => b + a === q.ans)}; } };
const SUBJ = [['He',1],['She',1],['It',1],['Priya',1],['My father',1],['The dog',1],['They',0],['We',0],['I',0],['You',0],['The children',0],['My friends',0]];
const VB = [['play','plays','football every evening'],['go','goes','to school by bus'],['watch','watches','the news at night'],['study','studies','in the library'],['have','has','two pets'],['wash','washes','the plates after dinner'],['help','helps','grandmother in the garden'],['read','reads','a story every night']];
M.agreement = { title:S('Subject–verb agreement', 'Subject–verb agreement'), icon:'🤝',
  intro:S('He / She / It / ஒருவர் பெயர் → verb-க்கு -s: "She plays". I / You / We / They / பலர் → -s இல்லை: "They play". have → has; go → goes; study → studies.', 'He / She / It / one person → add -s: "She plays". I / You / We / They / many → no -s: "They play". have → has; go → goes; study → studies.'),
  gen(){ const [s, one] = pick(SUBJ), [v1, v3, rest] = pick(VB), ans = one ? v3 : v1;
    return {p:S(`${s} ___ ${rest}.`, `${s} ___ ${rest}.`), scene:'', opts: opts(ans, [one ? v1 : v3, v1 + 'ing', 'to ' + v1], v => v), ans,
      ex:S(`"${s}" ${one ? 'ஒருமை → -s' : 'பன்மை / I / You → -s இல்லை'}: ${s} ${ans} ${rest}.`, `"${s}" is ${one ? 'singular (3rd person) → -s' : 'plural / I / you → no -s'}: ${s} ${ans} ${rest}.`), data:{one}}; } };

G.KALVI_MID = M;
})(typeof window !== 'undefined' ? window : globalThis);
