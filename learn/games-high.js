/* Kalvi Kalanjiyam — Classes 9–10 generated games (maths, physics, chemistry, computer science).
   Every answer is computed from the numbers shown; tests/games.test.cjs re-solves each one independently. */
(function(G){
'use strict';
const {S, ri, pick, shuffle, fmt} = G.KALVI_UTIL;
const {gcd, isPrime, fr, fs, N, P, opts, sup} = G.KALVI_MID_UTIL;
const H = {};
const TRIPLES = [[3,4,5],[5,12,13],[8,15,17],[7,24,25],[6,8,10],[9,12,15],[12,16,20],[20,21,29],[9,40,41],[15,20,25]];
const frac = (n, d) => fs(fr(n, d));
const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({1:'st', 2:'nd', 3:'rd'}[n % 10] || 'th'));
const sqfree = n => { for(let i = 2; i * i <= n; i++) if(n % (i * i) === 0) return false; return true; };

/* ================= SETS, RELATIONS ================= */
H.setsCount = { title:S('கணங்கள் — எண்ணிக்கை', 'Sets — counting'), icon:'⭕',
  intro:S('n(A ∪ B) = n(A) + n(B) − n(A ∩ B) — இரண்டிலும் உள்ளவர்களை இருமுறை எண்ணக் கூடாது! n உறுப்புகள் உள்ள கணத்துக்கு 2ⁿ உட்கணங்கள். n(A × B) = n(A) × n(B).', 'n(A ∪ B) = n(A) + n(B) − n(A ∩ B) — don’t count people in both twice! A set with n elements has 2ⁿ subsets. n(A × B) = n(A) × n(B).'),
  gen(L){ const k = pick(L.kinds || ['union', 'subsets', 'venn']);
    if(k === 'subsets'){ const n = ri(1, 8), ans = 2 ** n; return {p:S(`${n} உறுப்புகள் உள்ள கணத்தின் உட்கணங்களின் எண்ணிக்கை?`, `How many subsets does a set with ${n} elements have?`), scene:'', opts: opts(ans, [2 * n, n * n, ans - 1, ans * 2].filter(v => v > 0 && v !== ans)), ans, ex:S(`2${sup(n)} = ${ans}`, `2${sup(n)} = ${ans}`)}; }
    if(k === 'product'){ const a = ri(2, 9), b = ri(2, 9), ans = a * b; return {p:S(`n(A) = ${a}, n(B) = ${b} எனில் n(A × B) = ?`, `If n(A) = ${a} and n(B) = ${b}, then n(A × B) = ?`), scene:'', opts: opts(ans, [a + b, 2 ** (a + b) > 1000 ? ans + a : 2 ** (a + b), ans + 1].filter(v => v !== ans)), ans, ex:S(`${a} × ${b} = ${ans}`, `${a} × ${b} = ${ans}`)}; }
    if(k === 'relations'){ const a = ri(1, 3), b = ri(1, 3), ans = 2 ** (a * b); return {p:S(`n(A) = ${a}, n(B) = ${b} எனில் A-லிருந்து B-க்கு உள்ள உறவுகளின் எண்ணிக்கை?`, `If n(A) = ${a} and n(B) = ${b}, how many relations are there from A to B?`), scene:'', opts: opts(ans, [a * b, 2 ** (a + b), ans / 2 | 0 || 3].filter(v => v !== ans)), ans, ex:S(`A × B-ல் ${a * b} சோடிகள்; ஒவ்வொரு உட்கணமும் ஒரு உறவு → 2${sup(a * b)} = ${ans}`, `A × B has ${a * b} pairs; every subset is a relation → 2${sup(a * b)} = ${ans}`)}; }
    const both = ri(2, 20), a = both + ri(3, 30), b = both + ri(3, 30), u = a + b - both;
    if(k === 'union') return {p:S(`ஒரு வகுப்பில் ${a} பேர் கிரிக்கெட், ${b} பேர் கால்பந்து, ${both} பேர் இரண்டும் விளையாடுவர். குறைந்தது ஒன்றை விளையாடுபவர் எத்தனை?`, `In a class ${a} play cricket, ${b} play football and ${both} play both. How many play at least one?`), scene:'⚽🏏', opts: opts(u, [a + b, a + b + both, u - 1].filter(v => v !== u)), ans:u, ex:S(`${a} + ${b} − ${both} = ${u}`, `${a} + ${b} − ${both} = ${u}`)};
    const ans = a - both; return {p:S(`n(A) = ${a}, n(B) = ${b}, n(A ∩ B) = ${both}. A-ல் மட்டும் உள்ளவை n(A − B) = ?`, `n(A) = ${a}, n(B) = ${b}, n(A ∩ B) = ${both}. How many are in A only, n(A − B)?`), scene:'', opts: opts(ans, [a, b - both, u, a + both].filter(v => v !== ans)), ans, ex:S(`${a} − ${both} = ${ans}`, `${a} − ${both} = ${ans}`)}; } };

/* ================= REAL NUMBERS ================= */
H.surds = { title:S('வர்க்கமூலத்தைச் சுருக்கு', 'Simplify surds'), icon:'√',
  intro:S('√72 = √(36 × 2) = 6√2. மிகப் பெரிய வர்க்க எண் காரணியைக் கண்டுபிடித்து வெளியே எடு. √2, √3 விகிதமுறா எண்கள் — அவற்றின் தசம வடிவம் முடிவதும் இல்லை, திரும்ப வருவதும் இல்லை.', '√72 = √(36 × 2) = 6√2. Find the biggest square factor and take it outside. √2 and √3 are irrational — their decimals never end and never repeat.'),
  gen(){ let b; do { b = ri(2, 15); } while(!sqfree(b)); const a = ri(2, 12), n = a * a * b, ans = `${a}√${b}`;
    return {p:S(`√${n} = ?`, `√${n} = ?`), scene:'', opts: opts(ans, [`${b}√${a}`, `${a * 2}√${b}`, `${a}√${b * 2}`, `${a + 1}√${b}`, `${a * a}√${b}`].filter(x => x !== ans), v => v), ans,
      ex:S(`√${n} = √(${a * a} × ${b}) = ${a}√${b}`, `√${n} = √(${a * a} × ${b}) = ${a}√${b}`)}; } };
H.scientific = { title:S('அறிவியல் குறியீடு', 'Scientific notation'), icon:'🔬',
  intro:S('மிகப் பெரிய, மிகச் சிறிய எண்களை a × 10ⁿ (1 ≤ a < 10) என்று எழுது. 3,80,000 = 3.8 × 10⁵. 0.00045 = 4.5 × 10⁻⁴. ஒளியின் வேகம் 3 × 10⁸ m/s!', 'Write very big and very small numbers as a × 10ⁿ (1 ≤ a < 10). 380,000 = 3.8 × 10⁵. 0.00045 = 4.5 × 10⁻⁴. The speed of light is 3 × 10⁸ m/s!'),
  gen(){ let m; do { m = ri(11, 99); } while(m % 10 === 0); const e = pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8]); // number = (m/10) × 10^e
    const digits = String(m); let plain;
    if(e >= 1){ plain = (digits + '0'.repeat(e - 1)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); } else { plain = '0.' + '0'.repeat(-e - 1) + digits; }
    const mant = `${digits[0]}.${digits[1]}`.replace(/\.0$/, ''), supE = x => (x < 0 ? '⁻' : '') + sup(Math.abs(x)), ans = `${mant} × 10${supE(e)}`;
    return {p:S(`${plain} — அறிவியல் குறியீட்டில்?`, `Write ${plain} in scientific notation`), scene:'', opts: opts(ans, [`${mant} × 10${supE(e + 1)}`, `${mant} × 10${supE(e - 1)}`, `${mant} × 10${supE(-e)}`, `${digits} × 10${supE(e)}`].filter(x => x !== ans), v => v), ans,
      ex:S(`புள்ளியை ${Math.abs(e)} இடம் ${e > 0 ? 'இடப்பக்கம்' : 'வலப்பக்கம்'} நகர்த்து → ${ans}`, `Move the point ${Math.abs(e)} place${Math.abs(e) > 1 ? 's' : ''} ${e > 0 ? 'left' : 'right'} → ${ans}`), data:{m, e}}; } };
H.recurring = { title:S('சுழல் தசமம் → பின்னம்', 'Recurring decimal → fraction'), icon:'🔁',
  intro:S('0.777… = 7/9; 0.2727… = 27/99 = 3/11. விதி: திரும்ப வரும் இலக்கங்கள் ÷ அத்தனை 9-கள். ஏன்? x = 0.777… எனில் 10x = 7.777…, கழித்தால் 9x = 7.', '0.777… = 7/9; 0.2727… = 27/99 = 3/11. Rule: the repeating digits ÷ that many 9s. Why? If x = 0.777… then 10x = 7.777…; subtract: 9x = 7.'),
  gen(){ const two = Math.random() < .5; let r; do { r = two ? ri(10, 98) : ri(1, 8); } while(two && r % 11 === 0);
    const d = two ? 99 : 9, rs = two ? String(r).padStart(2, '0') : String(r), shown = `0.${rs.repeat(3)}…`, ans = frac(r, d);
    return {p:S(`${shown} = ? (பின்னமாக)`, `${shown} = ? (as a fraction)`), scene:'', opts: opts(ans, [frac(r, d * 10 + (two ? 1 : 1)), `${r}/${two ? 100 : 10}`, frac(r + 1, d), frac(r, two ? 9 : 99)].filter(x => x !== ans), v => v), ans,
      ex:S(`${rs} ÷ ${d} = ${r}/${d}${ans !== `${r}/${d}` ? ' = ' + ans : ''}`, `${rs} ÷ ${d} = ${r}/${d}${ans !== `${r}/${d}` ? ' = ' + ans : ''}`)}; } };
H.modular = { title:S('மட்டு எண்கணிதம் (கடிகாரக் கணக்கு)', 'Modular arithmetic (clock maths)'), icon:'🕐',
  intro:S('a mod n = a-ஐ n-ஆல் வகுக்கும்போது கிடைக்கும் மீதி. 17 mod 5 = 2. கடிகாரம் mod 12-ல் இயங்குகிறது: 10 மணி + 5 மணி = 3 மணி! வாரத்தின் நாள்கள் mod 7. இணையப் பாதுகாப்பு (மறைகுறியீடு) இதன் மேல்தான் கட்டப்பட்டுள்ளது.', 'a mod n = the remainder when a is divided by n. 17 mod 5 = 2. A clock works mod 12: 10 o’clock + 5 hours = 3 o’clock! Days of the week are mod 7. Internet security (encryption) is built on this.'),
  gen(){ const n = ri(3, 13), a = ri(n + 1, 200), ans = a % n;
    return {p:S(`${a} mod ${n} = ?`, `${a} mod ${n} = ?`), scene:'', opts: opts(ans, [Math.floor(a / n), n - ans, (ans + 1) % n, (ans + n - 1) % n].filter(v => v !== ans && v >= 0)), ans, ex:S(`${a} = ${n} × ${Math.floor(a / n)} + ${ans}`, `${a} = ${n} × ${Math.floor(a / n)} + ${ans}`)}; } };

/* ================= SEQUENCES ================= */
H.ap = { title:S('கூட்டுத் தொடர், பெருக்குத் தொடர்', 'Arithmetic & geometric progressions'), icon:'📈',
  intro:S('கூட்டுத் தொடர் (AP): tₙ = a + (n − 1)d; முதல் n உறுப்புகளின் கூடுதல் Sₙ = n/2 × [2a + (n − 1)d]. 1 + 2 + … + 100 = 5050 — சிறுவன் காஸ் இதைச் சில நொடிகளில் கண்டுபிடித்ததாகக் கதை உண்டு! பெருக்குத் தொடர் (GP): tₙ = a × rⁿ⁻¹.', 'Arithmetic progression (AP): tₙ = a + (n − 1)d; sum of the first n terms Sₙ = n/2 × [2a + (n − 1)d]. 1 + 2 + … + 100 = 5050 — the story goes that young Gauss found it in seconds! Geometric progression (GP): tₙ = a × rⁿ⁻¹.'),
  gen(L){ const k = pick(L.kinds || ['nth', 'sum', 'gp']), a = ri(-10, 20), d = pick([-5, -4, -3, -2, 2, 3, 4, 5, 6, 7]);
    const seq = [0, 1, 2].map(i => a + i * d).map(N).join(', ');
    if(k === 'nth'){ const n = ri(8, 40), ans = a + (n - 1) * d; return {p:S(`${seq}, … — ${n}-ஆவது உறுப்பு?`, `${seq}, … — the ${ord(n)} term?`), scene:'', opts: opts(ans, [a + n * d, a + (n - 2) * d, n * d, ans + 1]), ans, ex:S(`${N(a)} + (${n} − 1) × ${P(d)} = ${N(ans)}`, `${N(a)} + (${n} − 1) × ${P(d)} = ${N(ans)}`)}; }
    if(k === 'sum'){ const n = ri(5, 30), ans = n * (2 * a + (n - 1) * d) / 2; if(!Number.isInteger(ans)) return H.ap.gen(L);
      return {p:S(`${seq}, … — முதல் ${n} உறுப்புகளின் கூடுதல்?`, `${seq}, … — sum of the first ${n} terms?`), scene:'', opts: opts(ans, [n * (a + (n - 1) * d), n * (2 * a + n * d) / 2 | 0, ans + d, a + (n - 1) * d]), ans, ex:S(`${n}/2 × [2 × ${P(a)} + ${n - 1} × ${P(d)}] = ${N(ans)}`, `${n}/2 × [2 × ${P(a)} + ${n - 1} × ${P(d)}] = ${N(ans)}`)}; }
    const g0 = ri(1, 5), r = pick([2, 3, -2]), n = ri(4, r === 3 ? 7 : 9), ans = g0 * r ** (n - 1), gs = [0, 1, 2].map(i => N(g0 * r ** i)).join(', ');
    return {p:S(`${gs}, … — ${n}-ஆவது உறுப்பு?`, `${gs}, … — the ${ord(n)} term?`), scene:'', opts: opts(ans, [g0 * r ** n, g0 * r ** (n - 2), -ans, g0 * r * (n - 1)].filter(v => v !== ans)), ans, ex:S(`${g0} × ${P(r)}${sup(n - 1)} = ${N(ans)}`, `${g0} × ${P(r)}${sup(n - 1)} = ${N(ans)}`)}; } };

/* ================= ALGEBRA ================= */
const poly = cs => { // coefficients high→low, variable x
  const deg = cs.length - 1; let s = '';
  cs.forEach((c, i) => { if(!c) return; const p = deg - i, abs = Math.abs(c), body = (abs === 1 && p ? '' : abs) + (p ? 'x' + (p > 1 ? sup(p) : '') : '');
    s += s ? (c < 0 ? ' − ' : ' + ') + body : (c < 0 ? '−' : '') + body; });
  return s || '0'; };
H.remainder = { title:S('மீதித் தேற்றம்', 'Remainder theorem'), icon:'➗',
  intro:S('p(x)-ஐ (x − a)-ஆல் வகுத்தால் மீதி = p(a). நீண்ட வகுத்தல் தேவையில்லை — a-ஐ x-க்குப் பதிலாக வை! மீதி 0 என்றால் (x − a) ஒரு காரணி (காரணித் தேற்றம்).', 'Dividing p(x) by (x − a) leaves remainder p(a). No long division needed — just put a in place of x! If the remainder is 0, (x − a) is a factor (factor theorem).'),
  gen(){ const cs = [ri(1, 3), ri(-6, 6), ri(-9, 9), ri(-12, 12)], a = ri(-3, 3) || 2, ans = cs.reduce((acc, c) => acc * a + c, 0), div = a < 0 ? `x + ${-a}` : `x − ${a}`;
    return {p:S(`p(x) = ${poly(cs)} — (${div})-ஆல் வகுத்தால் மீதி?`, `Remainder when p(x) = ${poly(cs)} is divided by (${div})?`), scene:'', opts: opts(ans, [cs.reduce((acc, c) => acc * -a + c, 0), cs[3], ans + a, cs.reduce((x, y) => x + y, 0)].filter(v => v !== ans)), ans,
      ex:S(`p(${N(a)}) = ${N(ans)}`, `p(${N(a)}) = ${N(ans)}`), data:{cs, a}}; } };
H.factorise = { title:S('இருபடிக் கோவையைக் காரணிப்படுத்து', 'Factorise the quadratic'), icon:'🧩',
  intro:S('x² + 7x + 12: பெருக்கினால் 12, கூட்டினால் 7 வரும் இரண்டு எண்கள் → 3, 4 → (x + 3)(x + 4). குறிகளைக் கவனி: பெருக்கல் எதிர்மமாக இருந்தால் இரண்டும் வேறு குறி.', 'x² + 7x + 12: find two numbers that multiply to 12 and add to 7 → 3 and 4 → (x + 3)(x + 4). Watch the signs: if the product is negative, the two numbers have different signs.'),
  gen(){ let p, q; do { p = ri(-9, 9); q = ri(-9, 9); } while(!p || !q || p === -q);
    const f = t => t < 0 ? `(x − ${-t})` : `(x + ${t})`, ord = (a, b) => [a, b].sort((x, y) => y - x), [a, b] = ord(p, q), ans = f(a) + f(b), e = poly([1, p + q, p * q]);
    const w = [[-a, -b], [a, -b], [-a, b], [a + 1, b - 1]].map(([x, y]) => ord(x, y)).filter(([x, y]) => x && y).map(([x, y]) => f(x) + f(y));
    return {p:S(`${e} = ?`, `Factorise ${e}`), scene:'', opts: opts(ans, w.filter(x => x !== ans), v => v), ans, ex:S(`${N(a)} × ${N(b)} = ${N(a * b)}, ${N(a)} + ${N(b)} = ${N(a + b)} → ${ans}`, `${N(a)} × ${N(b)} = ${N(a * b)}, ${N(a)} + ${N(b)} = ${N(a + b)} → ${ans}`)}; } };
H.quadRoots = { title:S('இருபடிச் சமன்பாட்டின் மூலங்கள்', 'Roots of a quadratic'), icon:'📉',
  intro:S('ax² + bx + c = 0. தன்மைகாட்டி Δ = b² − 4ac: Δ > 0 → இரண்டு வெவ்வேறு மெய் மூலங்கள்; Δ = 0 → இரண்டு சம மூலங்கள்; Δ < 0 → மெய் மூலங்கள் இல்லை. மூலங்கள் = (−b ± √Δ) ÷ 2a. மூலங்களின் கூடுதல் = −b/a, பெருக்கல் = c/a.', 'ax² + bx + c = 0. Discriminant Δ = b² − 4ac: Δ > 0 → two different real roots; Δ = 0 → two equal roots; Δ < 0 → no real roots. Roots = (−b ± √Δ) ÷ 2a. Sum of roots = −b/a, product = c/a.'),
  gen(){ if(Math.random() < .5){ let p, q; do { p = ri(-9, 9); q = ri(-9, 9); } while(p === q); const [x1, x2] = [p, q].sort((m, n) => m - n), ans = `${N(x1)}, ${N(x2)}`, e = poly([1, -(p + q), p * q]);
      return {p:S(`${e} = 0 — மூலங்கள்?`, `Roots of ${e} = 0?`), scene:'', opts: opts(ans, [`${N(-x2)}, ${N(-x1)}`, `${N(x1)}, ${N(-x2)}`, `${N(-x1)}, ${N(x2)}`, `${N(x1 + 1)}, ${N(x2 - 1)}`].filter(x => x !== ans), v => v), ans,
        ex:S(`(x ${x1 < 0 ? '+ ' + -x1 : '− ' + x1})(x ${x2 < 0 ? '+ ' + -x2 : '− ' + x2}) = 0 → x = ${N(x1)} அல்லது ${N(x2)}`, `(x ${x1 < 0 ? '+ ' + -x1 : '− ' + x1})(x ${x2 < 0 ? '+ ' + -x2 : '− ' + x2}) = 0 → x = ${N(x1)} or ${N(x2)}`)}; }
    const a = ri(1, 4), b = ri(-10, 10), c = ri(-8, 8), D = b * b - 4 * a * c, ans = D > 0 ? 'two' : D === 0 ? 'equal' : 'none', e = poly([a, b, c]);
    const T = {two:['இரண்டு வெவ்வேறு மெய் மூலங்கள்','two different real roots'], equal:['இரண்டு சம மெய் மூலங்கள்','two equal real roots'], none:['மெய் மூலங்கள் இல்லை','no real roots']};
    return {p:S(`${e} = 0 — மூலங்களின் தன்மை?`, `Nature of the roots of ${e} = 0?`), scene:'', opts: ['two', 'equal', 'none'].map(v => ({v, h:`${T[v][0]} / ${T[v][1]}`})), ans,
      ex:S(`Δ = ${P(b)}² − 4 × ${a} × ${P(c)} = ${N(D)} → ${T[ans][0]}`, `Δ = ${P(b)}² − 4 × ${a} × ${P(c)} = ${N(D)} → ${T[ans][1]}`)}; } };
H.simultaneous = { title:S('ஒருங்கமைச் சமன்பாடுகள்', 'Simultaneous equations'), icon:'✖️',
  intro:S('இரண்டு தெரியாதவை, இரண்டு சமன்பாடுகள். ஒரு மாறியை நீக்கு (கூட்டி/கழித்து), மற்றதைக் கண்டுபிடி, பிறகு மீண்டும் போட்டு இரண்டாவதைக் கண்டுபிடி. இரண்டு நேர்கோடுகள் சந்திக்கும் புள்ளியே விடை!', 'Two unknowns, two equations. Eliminate one variable (add or subtract), find the other, then substitute back. The answer is where the two straight lines meet!'),
  gen(){ const x = ri(-6, 9), y = ri(-6, 9); let a1, b1, a2, b2; do { a1 = ri(1, 5); b1 = ri(-5, 5); a2 = ri(1, 5); b2 = ri(-5, 5); } while(!b1 || !b2 || a1 * b2 - a2 * b1 === 0);
    const eq = (a, b) => `${a === 1 ? '' : a}x ${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}y = ${N(a * x + b * y)}`, ans = `x = ${N(x)}, y = ${N(y)}`;
    return {p:S(`${eq(a1, b1)};  ${eq(a2, b2)}`, `Solve: ${eq(a1, b1)};  ${eq(a2, b2)}`), scene:'', opts: opts(ans, [`x = ${N(y)}, y = ${N(x)}`, `x = ${N(-x)}, y = ${N(y)}`, `x = ${N(x)}, y = ${N(-y)}`, `x = ${N(x + 1)}, y = ${N(y - 1)}`].filter(v => v !== ans), v => v), ans,
      ex:S(`சரிபார்: ${a1}×${P(x)} + ${P(b1)}×${P(y)} = ${N(a1 * x + b1 * y)} ✓, ${a2}×${P(x)} + ${P(b2)}×${P(y)} = ${N(a2 * x + b2 * y)} ✓`, `Check: ${a1}×${P(x)} + ${P(b1)}×${P(y)} = ${N(a1 * x + b1 * y)} ✓, ${a2}×${P(x)} + ${P(b2)}×${P(y)} = ${N(a2 * x + b2 * y)} ✓`)}; } };
H.identity = { title:S('இயற்கணித முற்றொருமைகள்', 'Algebraic identities'), icon:'🟰',
  intro:S('(a + b)² = a² + 2ab + b²; (a − b)² = a² − 2ab + b²; (a + b)(a − b) = a² − b². மனக்கணக்கு ரகசியம்: 103² = (100 + 3)² = 10000 + 600 + 9 = 10609. 47 × 53 = (50 − 3)(50 + 3) = 2500 − 9 = 2491.', '(a + b)² = a² + 2ab + b²; (a − b)² = a² − 2ab + b²; (a + b)(a − b) = a² − b². Mental-maths secret: 103² = (100 + 3)² = 10000 + 600 + 9 = 10609. 47 × 53 = (50 − 3)(50 + 3) = 2500 − 9 = 2491.'),
  gen(){ const base = pick([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]), d = ri(1, 9), k = pick(['sq+', 'sq-', 'diff']);
    if(k === 'diff'){ const ans = base * base - d * d; return {p:S(`${base - d} × ${base + d} = ? (முற்றொருமையைப் பயன்படுத்து)`, `${base - d} × ${base + d} = ? (use an identity)`), scene:'', opts: opts(ans, [base * base + d * d, base * base, ans - 2 * d, ans + 10]), ans, ex:S(`(${base} − ${d})(${base} + ${d}) = ${base * base} − ${d * d} = ${fmt(ans)}`, `(${base} − ${d})(${base} + ${d}) = ${base * base} − ${d * d} = ${fmt(ans)}`)}; }
    const s = k === 'sq+' ? 1 : -1, v = base + s * d, ans = v * v;
    return {p:S(`${v}² = ? (முற்றொருமையைப் பயன்படுத்து)`, `${v}² = ? (use an identity)`), scene:'', opts: opts(ans, [base * base + d * d, ans + 10, ans - 2 * d, base * base + s * base * d + d * d]), ans,
      ex:S(`(${base} ${s > 0 ? '+' : '−'} ${d})² = ${base * base} ${s > 0 ? '+' : '−'} ${2 * base * d} + ${d * d} = ${fmt(ans)}`, `(${base} ${s > 0 ? '+' : '−'} ${d})² = ${base * base} ${s > 0 ? '+' : '−'} ${2 * base * d} + ${d * d} = ${fmt(ans)}`)}; } };

/* ================= GEOMETRY & COORDINATES ================= */
H.circleAngles = { title:S('வட்டக் கோணங்கள்', 'Angles in circles'), icon:'⭕',
  intro:S('ஒரே வில் மையத்தில் தாங்கும் கோணம் = பரிதியில் தாங்கும் கோணத்தின் இரு மடங்கு. அரைவட்டத்தில் அமையும் கோணம் 90°. வட்ட நாற்கரத்தின் எதிர்க் கோணங்களின் கூடுதல் 180°. தொடுகோடு ஆரத்துக்குச் செங்குத்து.', 'The angle an arc makes at the centre is twice the angle it makes on the circle. The angle in a semicircle is 90°. Opposite angles of a cyclic quadrilateral add to 180°. A tangent is perpendicular to the radius.'),
  gen(){ const k = pick(['centre', 'circ', 'cyclic', 'semi']);
    if(k === 'centre'){ const a = ri(15, 85), ans = 2 * a; return {p:S(`ஒரு வில் பரிதியில் ${a}° கோணம் தாங்குகிறது. அதே வில் மையத்தில் தாங்கும் கோணம்?`, `An arc makes ${a}° at the circle. What angle does it make at the centre?`), scene:'', opts: opts(ans, [a, 180 - a, 90 + a, a / 2 | 0].filter(v => v !== ans), v => v + '°'), ans, ex:S(`2 × ${a}° = ${ans}°`, `2 × ${a}° = ${ans}°`)}; }
    if(k === 'circ'){ const c = ri(10, 85) * 2, ans = c / 2; return {p:S(`ஒரு வில் மையத்தில் ${c}° கோணம் தாங்குகிறது. பரிதியில் தாங்கும் கோணம்?`, `An arc makes ${c}° at the centre. What angle does it make at the circle?`), scene:'', opts: opts(ans, [c, 180 - c, 90 - ans].filter(v => v > 0 && v !== ans), v => v + '°'), ans, ex:S(`${c}° ÷ 2 = ${ans}°`, `${c}° ÷ 2 = ${ans}°`)}; }
    if(k === 'cyclic'){ const a = ri(40, 140), ans = 180 - a; return {p:S(`வட்ட நாற்கரம் ABCD-ல் ∠A = ${a}°. ∠C = ?`, `In cyclic quadrilateral ABCD, ∠A = ${a}°. ∠C = ?`), scene:'', opts: opts(ans, [a, 360 - a, 90 - Math.abs(90 - a) || 45].filter(v => v !== ans), v => v + '°'), ans, ex:S(`எதிர்க் கோணங்கள்: 180° − ${a}° = ${ans}°`, `Opposite angles: 180° − ${a}° = ${ans}°`)}; }
    const a = ri(20, 70), ans = 90 - a; return {p:S(`AB விட்டம், C வட்டத்தின் மேல் ஒரு புள்ளி. ∠CAB = ${a}° எனில் ∠CBA = ?`, `AB is a diameter and C is on the circle. If ∠CAB = ${a}°, then ∠CBA = ?`), scene:'', opts: opts(ans, [a, 180 - a, 90 + a].filter(v => v !== ans), v => v + '°'), ans, ex:S(`∠ACB = 90° (அரைவட்டக் கோணம்); 180° − 90° − ${a}° = ${ans}°`, `∠ACB = 90° (angle in a semicircle); 180° − 90° − ${a}° = ${ans}°`)}; } };
H.coord = { title:S('ஆயத்தொலை வடிவியல்', 'Coordinate geometry'), icon:'📍',
  intro:S('தூரம் = √[(x₂ − x₁)² + (y₂ − y₁)²] (போதாயனர் தேற்றமே!). நடுப்புள்ளி = ((x₁ + x₂)/2, (y₁ + y₂)/2). சாய்வு m = (y₂ − y₁) ÷ (x₂ − x₁). (+,+) முதல் கால்பகுதி, (−,+) இரண்டாம், (−,−) மூன்றாம், (+,−) நான்காம்.', 'Distance = √[(x₂ − x₁)² + (y₂ − y₁)²] (Baudhayana’s theorem again!). Midpoint = ((x₁ + x₂)/2, (y₁ + y₂)/2). Slope m = (y₂ − y₁) ÷ (x₂ − x₁). (+,+) is quadrant I, (−,+) II, (−,−) III, (+,−) IV.'),
  gen(L){ const k = pick(L.kinds || ['dist', 'mid', 'quad']), x1 = ri(-8, 8), y1 = ri(-8, 8), pt = (x, y) => `(${N(x)}, ${N(y)})`;
    if(k === 'dist'){ const [a, b, c] = pick(TRIPLES), sx = pick([1, -1]), sy = pick([1, -1]), sw = Math.random() < .5, x2 = x1 + sx * (sw ? a : b), y2 = y1 + sy * (sw ? b : a);
      return {p:S(`${pt(x1, y1)}, ${pt(x2, y2)} — இடையே உள்ள தூரம்?`, `Distance between ${pt(x1, y1)} and ${pt(x2, y2)}?`), scene:'', opts: opts(c, [a + b, c + 1, Math.abs(x2 - x1) + Math.abs(y2 - y1) - 1, c * 2].filter(v => v !== c)), ans:c, ex:S(`√(${a}² + ${b}²) = √${c * c} = ${c}`, `√(${a}² + ${b}²) = √${c * c} = ${c}`)}; }
    if(k === 'mid'){ const x2 = x1 + 2 * ri(-5, 5), y2 = y1 + 2 * ri(-5, 5), ans = pt((x1 + x2) / 2, (y1 + y2) / 2);
      return {p:S(`${pt(x1, y1)}, ${pt(x2, y2)} — நடுப்புள்ளி?`, `Midpoint of ${pt(x1, y1)} and ${pt(x2, y2)}?`), scene:'', opts: opts(ans, [pt(x1 + x2, y1 + y2), pt((x2 - x1) / 2, (y2 - y1) / 2), pt((y1 + y2) / 2, (x1 + x2) / 2), pt((x1 + x2) / 2 + 1, (y1 + y2) / 2)].filter(v => v !== ans), v => v), ans, ex:S(`((${N(x1)} + ${N(x2)})/2, (${N(y1)} + ${N(y2)})/2) = ${ans}`, `((${N(x1)} + ${N(x2)})/2, (${N(y1)} + ${N(y2)})/2) = ${ans}`)}; }
    if(k === 'slope'){ let x2, y2; do { x2 = ri(-8, 8); y2 = ri(-8, 8); } while(x2 === x1); const ans = frac(y2 - y1, x2 - x1);
      return {p:S(`${pt(x1, y1)}, ${pt(x2, y2)} வழியே செல்லும் கோட்டின் சாய்வு?`, `Slope of the line through ${pt(x1, y1)} and ${pt(x2, y2)}?`), scene:'', opts: opts(ans, [frac(x2 - x1, (y2 - y1) || 1), frac(y1 - y2 + 1, x2 - x1), frac(-(y2 - y1), x2 - x1), frac(y2 + y1, x2 - x1)].filter(v => v !== ans), v => v), ans, ex:S(`(${N(y2)} − ${P(y1)}) ÷ (${N(x2)} − ${P(x1)}) = ${ans}`, `(${N(y2)} − ${P(y1)}) ÷ (${N(x2)} − ${P(x1)}) = ${ans}`)}; }
    if(k === 'area'){ let x2, y2, x3, y3, A2; do { x2 = ri(-8, 8); y2 = ri(-8, 8); x3 = ri(-8, 8); y3 = ri(-8, 8); A2 = Math.abs(x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)); } while(!A2 || A2 % 2);
      const ans = A2 / 2; return {p:S(`${pt(x1, y1)}, ${pt(x2, y2)}, ${pt(x3, y3)} — முக்கோணத்தின் பரப்பு (சதுர அலகு)?`, `Area of the triangle with vertices ${pt(x1, y1)}, ${pt(x2, y2)}, ${pt(x3, y3)} (square units)?`), scene:'', opts: opts(ans, [A2, ans + 1, ans - 1, ans * 3].filter(v => v > 0 && v !== ans)), ans, ex:S(`½|x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)| = ½ × ${A2} = ${ans}`, `½|x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)| = ½ × ${A2} = ${ans}`)}; }
    let x, y; do { x = ri(-9, 9); y = ri(-9, 9); } while(!x || !y); const ans = x > 0 ? (y > 0 ? 'I' : 'IV') : (y > 0 ? 'II' : 'III');
    return {p:S(`${pt(x, y)} எந்தக் கால்பகுதியில் உள்ளது?`, `Which quadrant is ${pt(x, y)} in?`), scene:'', opts: ['I', 'II', 'III', 'IV'].map(v => ({v, h:v})), ans, ex:S(`x ${x > 0 ? '+' : '−'}, y ${y > 0 ? '+' : '−'} → ${ans}`, `x ${x > 0 ? '+' : '−'}, y ${y > 0 ? '+' : '−'} → ${ans}`)}; } };
H.similar = { title:S('வடிவொத்த முக்கோணங்கள் (BPT)', 'Similar triangles (BPT)'), icon:'🔺',
  intro:S('அடிப்படை விகிதசமத் தேற்றம் (தேல்ஸ்): முக்கோணம் ABC-ல் DE ∥ BC எனில் AD/DB = AE/EC. வடிவொத்த முக்கோணங்களின் ஒத்த பக்கங்கள் ஒரே விகிதத்தில் இருக்கும் — நிழலை வைத்துக் கோபுரத்தின் உயரம் அளக்கலாம்!', 'Basic Proportionality Theorem (Thales): in triangle ABC, if DE ∥ BC then AD/DB = AE/EC. Corresponding sides of similar triangles are in the same ratio — you can measure a tower’s height from its shadow!'),
  gen(){ if(Math.random() < .5){ const k = ri(2, 6), m = ri(1, 5), n = ri(1, 5), ad = k * m, db = k * n, e = ri(1, 4), ae = e * m, ans = e * n;
      return {p:S(`முக்கோணம் ABC-ல் DE ∥ BC. AD = ${ad} cm, DB = ${db} cm, AE = ${ae} cm எனில் EC = ?`, `In triangle ABC, DE ∥ BC. AD = ${ad} cm, DB = ${db} cm, AE = ${ae} cm. EC = ?`), scene:'', opts: opts(ans, [ae, db, ad * ae / db | 0 || ans + 2, ans + 1].filter(v => v > 0 && v !== ans), v => v + ' cm'), ans,
        ex:S(`AD/DB = AE/EC → EC = ${ae} × ${db} ÷ ${ad} = ${ans} cm`, `AD/DB = AE/EC → EC = ${ae} × ${db} ÷ ${ad} = ${ans} cm`)}; }
    const st = ri(1, 3), ss = ri(1, 4) * st, r = ri(3, 20), ts = ss * r, ans = st * r;
    return {p:S(`${st} m உயரக் குச்சியின் நிழல் ${ss} m. அதே நேரத்தில் ஒரு கோபுரத்தின் நிழல் ${ts} m. கோபுரத்தின் உயரம்?`, `A ${st} m stick casts a ${ss} m shadow. At the same time a tower casts a ${ts} m shadow. Height of the tower?`), scene:'🗼', opts: opts(ans, [ts, ts * st, ans + st, ans * 2].filter(v => v !== ans), v => v + ' m'), ans,
      ex:S(`வடிவொத்த முக்கோணங்கள்: உயரம் = ${ts} × ${st} ÷ ${ss} = ${ans} m`, `Similar triangles: height = ${ts} × ${st} ÷ ${ss} = ${ans} m`)}; } };
H.tangent = { title:S('தொடுகோட்டின் நீளம்', 'Length of a tangent'), icon:'⭕',
  intro:S('வெளிப்புள்ளியிலிருந்து வரையும் தொடுகோடு ஆரத்துக்குச் செங்குத்து. எனவே தொடுகோட்டு நீளம் = √(d² − r²) — d = மையத்திலிருந்து தூரம், r = ஆரம்.', 'A tangent from an outside point is perpendicular to the radius. So tangent length = √(d² − r²) — d = distance from the centre, r = radius.'),
  gen(){ const [a, b, c] = pick(TRIPLES), k = ri(1, 3), r = a * k, t = b * k, d = c * k;
    return {p:S(`ஆரம் ${r} cm உள்ள வட்டத்தின் மையத்திலிருந்து ${d} cm தொலைவில் உள்ள புள்ளியிலிருந்து தொடுகோட்டின் நீளம்?`, `Length of the tangent from a point ${d} cm from the centre of a circle of radius ${r} cm?`), scene:'', opts: opts(t, [d - r, d + r, t + 1, r].filter(v => v > 0 && v !== t), v => v + ' cm'), ans:t,
      ex:S(`√(${d}² − ${r}²) = √${d * d - r * r} = ${t} cm`, `√(${d}² − ${r}²) = √${d * d - r * r} = ${t} cm`)}; } };

/* ================= TRIGONOMETRY ================= */
const TV = {sin:{0:'0',30:'1/2',45:'1/√2',60:'√3/2',90:'1'}, cos:{0:'1',30:'√3/2',45:'1/√2',60:'1/2',90:'0'}, tan:{0:'0',30:'1/√3',45:'1',60:'√3',90:'not defined'}};
H.trigValues = { title:S('திட்டக் கோணங்களின் மதிப்புகள்', 'Standard angle values'), icon:'📐',
  intro:S('sin: 0, 1/2, 1/√2, √3/2, 1 (0°, 30°, 45°, 60°, 90°). cos அதே வரிசை தலைகீழாக. tan = sin ÷ cos: 0, 1/√3, 1, √3, வரையறுக்கப்படவில்லை. நினைவுக் குறிப்பு: sin-க்கு √0/2, √1/2, √2/2, √3/2, √4/2!', 'sin: 0, 1/2, 1/√2, √3/2, 1 (0°, 30°, 45°, 60°, 90°). cos is the same list reversed. tan = sin ÷ cos: 0, 1/√3, 1, √3, not defined. Memory trick: sin is √0/2, √1/2, √2/2, √3/2, √4/2!'),
  gen(){ const f = pick(['sin', 'cos', 'tan']), a = pick([0, 30, 45, 60, 90]), ans = TV[f][a], pool = [...new Set(Object.values(TV.sin).concat(Object.values(TV.tan)))];
    return {p:S(`${f} ${a}° = ?`, `${f} ${a}° = ?`), scene:'', opts: opts(ans, pool.filter(x => x !== ans), v => v === 'not defined' ? 'வரையறை இல்லை / not defined' : v), ans, ex:S(`${f} ${a}° = ${ans === 'not defined' ? 'வரையறுக்கப்படவில்லை' : ans}`, `${f} ${a}° = ${ans}`)}; } };
H.heights = { title:S('உயரங்களும் தூரங்களும்', 'Heights & distances'), icon:'🗼',
  intro:S('ஏற்றக் கோணம் θ, கோபுரத்திலிருந்து தூரம் d எனில் உயரம் h = d × tan θ. tan 45° = 1 → h = d. tan 60° = √3 → h = d√3. tan 30° = 1/√3 → h = d/√3.', 'With angle of elevation θ and distance d from the tower, height h = d × tan θ. tan 45° = 1 → h = d. tan 60° = √3 → h = d√3. tan 30° = 1/√3 → h = d/√3.'),
  gen(){ const a = pick([30, 45, 60]), d = a === 30 ? ri(2, 20) * 3 : ri(5, 60), ans = a === 45 ? `${d} m` : a === 60 ? `${d}√3 m` : `${d / 3}√3 m`;
    return {p:S(`ஒரு கோபுரத்தின் அடியிலிருந்து ${d} m தொலைவில் நின்று பார்க்கும்போது உச்சியின் ஏற்றக் கோணம் ${a}°. கோபுரத்தின் உயரம்?`, `From a point ${d} m from the foot of a tower, the angle of elevation of the top is ${a}°. Height of the tower?`), scene:'🗼',
      opts: opts(ans, [`${d} m`, `${d}√3 m`, a === 30 ? `${d * 2} m` : `${d * 2} m`, `${d / 3}√3 m`, `${d}√2 m`].filter((x, i, arr) => x !== ans && arr.indexOf(x) === i && !/\.\d/.test(x)), v => v), ans,
      ex:S(`h = ${d} × tan ${a}° = ${d} × ${TV.tan[a]} = ${ans}`, `h = ${d} × tan ${a}° = ${d} × ${TV.tan[a]} = ${ans}`)}; } };

/* ================= MENSURATION ================= */
H.solids = { title:S('திண்மங்கள் — கனஅளவு, பரப்பு', 'Solids — volume & surface area'), icon:'🧊',
  intro:S('உருளை: கனஅளவு πr²h, வளைபரப்பு 2πrh. கூம்பு: கனஅளவு ⅓πr²h. கோளம்: கனஅளவு (4/3)πr³, புறப்பரப்பு 4πr². அரைக்கோளம்: கனஅளவு (2/3)πr³. π = 22/7. ஒரு கூம்பு = அதே அளவு உருளையின் ⅓ — மணலால் நிரப்பிச் சோதித்துப் பார்!', 'Cylinder: volume πr²h, curved surface 2πrh. Cone: volume ⅓πr²h. Sphere: volume (4/3)πr³, surface area 4πr². Hemisphere: volume (2/3)πr³. π = 22/7. A cone holds ⅓ of a cylinder of the same size — test it with sand!'),
  gen(L){ const k = pick(L.kinds || ['cylV', 'cylC', 'coneV', 'sphV', 'sphA']), r = /^(sphV|hemV)$/.test(k) ? pick([21, 42]) : pick([7, 14, 21]), h = ri(1, 12) * 3;
    const T = {cylV:[`volume of a cylinder with r = ${r} cm, h = ${h} cm`, `r = ${r} cm, h = ${h} cm உருளையின் கனஅளவு`, 22 * r * r * h / 7, 'cm³'],
      cylC:[`curved surface area of a cylinder with r = ${r} cm, h = ${h} cm`, `r = ${r} cm, h = ${h} cm உருளையின் வளைபரப்பு`, 2 * 22 * r * h / 7, 'cm²'],
      coneV:[`volume of a cone with r = ${r} cm, h = ${h} cm`, `r = ${r} cm, h = ${h} cm கூம்பின் கனஅளவு`, 22 * r * r * h / 21, 'cm³'],
      sphV:[`volume of a sphere with r = ${r} cm`, `r = ${r} cm கோளத்தின் கனஅளவு`, 4 * 22 * r * r * r / 21, 'cm³'],
      sphA:[`surface area of a sphere with r = ${r} cm`, `r = ${r} cm கோளத்தின் புறப்பரப்பு`, 4 * 22 * r * r / 7, 'cm²'],
      hemV:[`volume of a hemisphere with r = ${r} cm`, `r = ${r} cm அரைக்கோளத்தின் கனஅளவு`, 2 * 22 * r * r * r / 21, 'cm³']}[k];
    const ans = T[2], alt = {cylV: ans / 3, cylC: ans * r / 2 / h, coneV: ans * 3, sphV: ans / 2, sphA: ans / 4, hemV: ans * 2}[k];
    return {p:S(`${T[1]} = ? (π = 22/7)`, `Find the ${T[0]} (π = 22/7)`), scene:'', opts: opts(ans, [alt, ans + 22, ans * 2, ans - 44].filter(v => Number.isInteger(v) && v > 0 && v !== ans), v => fmt(v) + ' ' + T[3]), ans,
      ex:S(`= ${fmt(ans)} ${T[3]}`, `= ${fmt(ans)} ${T[3]}`)}; } };
H.heron = { title:S('ஹெரான் சூத்திரம்', 'Heron’s formula'), icon:'🔺',
  intro:S('மூன்று பக்கங்கள் a, b, c தெரிந்தால்: s = (a + b + c)/2, பரப்பு = √[s(s − a)(s − b)(s − c)]. உயரம் தெரியாமலே நிலத்தின் பரப்பைக் கணக்கிடலாம்!', 'If you know the three sides a, b, c: s = (a + b + c)/2, area = √[s(s − a)(s − b)(s − c)]. You can find a field’s area without knowing any height!'),
  gen(){ const [a0, b0, c0] = pick([[13,14,15],[5,5,6],[5,5,8],[10,13,13],[3,4,5],[6,8,10],[9,10,17],[7,15,20],[13,20,21],[11,13,20]]), k = ri(1, 3), a = a0 * k, b = b0 * k, c = c0 * k, s = (a + b + c) / 2, ans = Math.round(Math.sqrt(s * (s - a) * (s - b) * (s - c)));
    return {p:S(`பக்கங்கள் ${a} m, ${b} m, ${c} m உள்ள முக்கோணத்தின் பரப்பு?`, `Area of a triangle with sides ${a} m, ${b} m, ${c} m?`), scene:'', opts: opts(ans, [a * b / 2, ans * 2, s * 2, ans + s].filter(v => Number.isInteger(v) && v !== ans), v => fmt(v) + ' m²'), ans,
      ex:S(`s = ${s}; √(${s} × ${s - a} × ${s - b} × ${s - c}) = √${fmt(s * (s - a) * (s - b) * (s - c))} = ${fmt(ans)} m²`, `s = ${s}; √(${s} × ${s - a} × ${s - b} × ${s - c}) = √${fmt(s * (s - a) * (s - b) * (s - c))} = ${fmt(ans)} m²`)}; } };

/* ================= STATISTICS & PROBABILITY ================= */
H.probability = { title:S('நிகழ்தகவு', 'Probability'), icon:'🎲',
  intro:S('நிகழ்தகவு = சாதகமான விளைவுகள் ÷ மொத்த விளைவுகள். ஒரு பகடை: 6 விளைவுகள். இரண்டு பகடைகள்: 36. 52 சீட்டுகள்: 4 வகை × 13; 26 சிவப்பு, 26 கருப்பு. நிகழ்தகவு எப்போதும் 0 முதல் 1 வரை.', 'Probability = favourable outcomes ÷ total outcomes. One die: 6 outcomes. Two dice: 36. A pack of 52 cards: 4 suits × 13; 26 red and 26 black. Probability is always between 0 and 1.'),
  gen(){ const k = pick(['die', 'dice', 'bag', 'card', 'coins']); let q, fav, tot, why;
    if(k === 'die'){ const t = pick(['even', 'gt', 'prime', 'mult3']), g = ri(1, 5); fav = {even:3, gt:6 - g, prime:3, mult3:2}[t]; tot = 6;
      q = {even:['ஒரு பகடையை உருட்டும்போது இரட்டை எண் விழ நிகழ்தகவு?','Probability of an even number on one roll of a die?'], gt:[`ஒரு பகடையில் ${g}-ஐ விடப் பெரிய எண் விழ நிகழ்தகவு?`, `Probability of a number greater than ${g} on one roll of a die?`], prime:['ஒரு பகடையில் பகா எண் விழ நிகழ்தகவு?','Probability of a prime number on one roll of a die?'], mult3:['ஒரு பகடையில் 3-ன் மடங்கு விழ நிகழ்தகவு?','Probability of a multiple of 3 on one roll of a die?']}[t];
      why = {even:'2, 4, 6', gt:Array.from({length: 6 - g}, (_, i) => g + 1 + i).join(', '), prime:'2, 3, 5', mult3:'3, 6'}[t]; }
    else if(k === 'dice'){ const s = ri(2, 12); fav = 6 - Math.abs(7 - s); tot = 36; q = [`இரண்டு பகடைகளை உருட்டும்போது கூடுதல் ${s} வர நிகழ்தகவு?`, `Two dice are rolled. Probability that the total is ${s}?`];
      why = []; for(let a = 1; a <= 6; a++) if(s - a >= 1 && s - a <= 6) why.push(`(${a},${s - a})`); why = why.join(' '); }
    else if(k === 'bag'){ const r = ri(1, 9), b = ri(1, 9), gg = ri(0, 6), c = pick(['r', 'b']); fav = c === 'r' ? r : b; tot = r + b + gg;
      q = [`ஒரு பையில் ${r} சிவப்பு, ${b} நீல${gg ? `, ${gg} பச்சை` : ''} பந்துகள். ஒன்றை எடுத்தால் ${c === 'r' ? 'சிவப்பு' : 'நீலம்'} வர நிகழ்தகவு?`, `A bag has ${r} red, ${b} blue${gg ? ` and ${gg} green` : ''} balls. Probability of drawing a ${c === 'r' ? 'red' : 'blue'} one?`]; why = `${fav} / ${tot}`; }
    else if(k === 'card'){ const t = pick(['king', 'red', 'heart', 'face', 'ace']); fav = {king:4, red:26, heart:13, face:12, ace:4}[t]; tot = 52;
      q = {king:['52 சீட்டுகளில் ஒன்றை எடுத்தால் அது ராஜா (King) ஆக நிகழ்தகவு?','A card is drawn from a pack of 52. Probability it is a king?'], red:['52 சீட்டுகளில் சிவப்புச் சீட்டு வர நிகழ்தகவு?','Probability of drawing a red card from a pack of 52?'], heart:['52 சீட்டுகளில் ஹார்ட் (♥) வர நிகழ்தகவு?','Probability of drawing a heart from a pack of 52?'], face:['52 சீட்டுகளில் முகச் சீட்டு (J, Q, K) வர நிகழ்தகவு?','Probability of drawing a face card (J, Q, K) from a pack of 52?'], ace:['52 சீட்டுகளில் ஏஸ் வர நிகழ்தகவு?','Probability of drawing an ace from a pack of 52?']}[t];
      why = {king:'4 ராஜா / 4 kings', red:'26', heart:'13', face:'3 × 4 = 12', ace:'4'}[t]; }
    else { const n = ri(2, 3), h = ri(0, n); const C = (a, b) => b === 0 || b === a ? 1 : a === 3 ? 3 : 2; fav = C(n, h); tot = 2 ** n;
      q = [`${n} நாணயங்களைச் சுண்டும்போது சரியாக ${h} தலை விழ நிகழ்தகவு?`, `${n} coins are tossed. Probability of exactly ${h} head${h === 1 ? '' : 's'}?`]; why = `${fav} / ${tot}`; }
    const ans = frac(fav, tot);
    return {p:S(q[0], q[1]), scene:'', opts: opts(ans, [frac(fav, tot + 1), frac(tot - fav || 1, tot), frac(fav + 1, tot), frac(1, fav || 2), `${fav}/${tot + fav}`].filter(x => x !== ans && x !== '0' || x === '0' && ans !== '0'), v => v), ans,
      ex:S(`சாதகமானவை ${why} → ${fav}/${tot}${ans !== `${fav}/${tot}` ? ' = ' + ans : ''}`, `Favourable: ${why} → ${fav}/${tot}${ans !== `${fav}/${tot}` ? ' = ' + ans : ''}`)}; } };
H.spread = { title:S('வீச்சு, திட்டவிலக்கம்', 'Range & standard deviation'), icon:'📊',
  intro:S('வீச்சு = பெரியது − சிறியது. திட்டவிலக்கம் (σ) — மதிப்புகள் சராசரியிலிருந்து எவ்வளவு சிதறியுள்ளன: σ = √[Σ(x − x̄)² ÷ n]. மாறுபாட்டுக் கெழு CV = σ ÷ x̄ × 100 — CV குறைவானதே நிலையானது (consistent)!', 'Range = largest − smallest. Standard deviation (σ) — how spread out values are from the mean: σ = √[Σ(x − x̄)² ÷ n]. Coefficient of variation CV = σ ÷ x̄ × 100 — the smaller CV is more consistent!'),
  gen(){ const m = ri(10, 60), k = ri(1, 9); if(Math.random() < .5){ const d = shuffle([m - k, m - k, m + k, m + k]);
      return {p:S(`${d.join(', ')} — திட்டவிலக்கம் σ = ?`, `Standard deviation σ of ${d.join(', ')} = ?`), scene:'', opts: opts(k, [2 * k, k * k, m, k + 1].filter(v => v !== k)), ans:k,
        ex:S(`சராசரி ${m}; விலக்கங்கள் ±${k}; σ = √(4 × ${k * k} ÷ 4) = ${k}`, `Mean ${m}; deviations ±${k}; σ = √(4 × ${k * k} ÷ 4) = ${k}`)}; }
    const sd = pick([2, 4, 5, 10]), mean = pick([20, 25, 40, 50, 80, 100]), ans = sd * 100 / mean; if(!Number.isInteger(ans)) return H.spread.gen();
    return {p:S(`சராசரி ${mean}, திட்டவிலக்கம் ${sd}. மாறுபாட்டுக் கெழு (CV) = ?`, `Mean ${mean}, standard deviation ${sd}. Coefficient of variation (CV) = ?`), scene:'', opts: opts(ans, [mean / sd, sd * mean / 100, ans * 2].filter(v => Number.isInteger(v) && v !== ans), v => v + '%'), ans, ex:S(`${sd} ÷ ${mean} × 100 = ${ans}%`, `${sd} ÷ ${mean} × 100 = ${ans}%`)}; } };

/* ================= PHYSICS ================= */
H.kinematics = { title:S('இயக்கச் சமன்பாடுகள்', 'Equations of motion'), icon:'🚀',
  intro:S('v = u + at; s = ut + ½at²; v² = u² + 2as. u = தொடக்கத் திசைவேகம், v = இறுதித் திசைவேகம், a = முடுக்கம், t = நேரம், s = இடப்பெயர்ச்சி.', 'v = u + at; s = ut + ½at²; v² = u² + 2as. u = initial velocity, v = final velocity, a = acceleration, t = time, s = displacement.'),
  gen(){ const k = pick(['v', 's', 'a']), u = ri(0, 20), a = ri(1, 6), t = ri(2, 10) * 2;
    if(k === 'v'){ const ans = u + a * t; return {p:S(`u = ${u} m/s, a = ${a} m/s², t = ${t} s. இறுதித் திசைவேகம் v = ?`, `u = ${u} m/s, a = ${a} m/s², t = ${t} s. Final velocity v = ?`), scene:'🚗', opts: opts(ans, [a * t, u * t, u + a, ans + a].filter(v => v !== ans), v => v + ' m/s'), ans, ex:S(`v = ${u} + ${a} × ${t} = ${ans} m/s`, `v = ${u} + ${a} × ${t} = ${ans} m/s`)}; }
    if(k === 's'){ const ans = u * t + a * t * t / 2; return {p:S(`u = ${u} m/s, a = ${a} m/s², t = ${t} s. இடப்பெயர்ச்சி s = ?`, `u = ${u} m/s, a = ${a} m/s², t = ${t} s. Displacement s = ?`), scene:'🚗', opts: opts(ans, [u * t + a * t * t, u * t, a * t * t / 2, (u + a * t) * t].filter(v => v !== ans), v => fmt(v) + ' m'), ans, ex:S(`s = ${u}×${t} + ½×${a}×${t}² = ${fmt(ans)} m`, `s = ${u}×${t} + ½×${a}×${t}² = ${fmt(ans)} m`)}; }
    const v = u + a * t, ans = a; return {p:S(`ஒரு வண்டி ${t} வினாடியில் ${u} m/s-லிருந்து ${v} m/s-க்கு வேகம் கூடுகிறது. முடுக்கம் = ?`, `A car speeds up from ${u} m/s to ${v} m/s in ${t} s. Acceleration = ?`), scene:'🏎️', opts: opts(ans, [v / t | 0 || ans + 2, v - u, ans + 1, ans * 2].filter(x => x > 0 && x !== ans), v => v + ' m/s²'), ans, ex:S(`a = (${v} − ${u}) ÷ ${t} = ${ans} m/s²`, `a = (${v} − ${u}) ÷ ${t} = ${ans} m/s²`)}; } };
H.forceEnergy = { title:S('விசை, உந்தம், வேலை, ஆற்றல்', 'Force, momentum, work & energy'), icon:'💪',
  intro:S('F = ma (நியூட்டனின் இரண்டாம் விதி). உந்தம் p = mv. எடை W = mg. வேலை W = F × s. இயக்க ஆற்றல் KE = ½mv². நிலை ஆற்றல் PE = mgh. திறன் P = வேலை ÷ நேரம். (இங்கே g = 10 m/s² எனக் கொள்க.)', 'F = ma (Newton’s second law). Momentum p = mv. Weight W = mg. Work W = F × s. Kinetic energy KE = ½mv². Potential energy PE = mgh. Power P = work ÷ time. (Take g = 10 m/s² here.)'),
  gen(){ const k = pick(['F', 'p', 'W', 'KE', 'PE', 'P']), m = ri(2, 50), x = ri(2, 20); let q, ans, u, why;
    if(k === 'F'){ ans = m * x; q = [`நிறை ${m} kg, முடுக்கம் ${x} m/s². விசை F = ?`, `Mass ${m} kg, acceleration ${x} m/s². Force F = ?`]; u = 'N'; why = `${m} × ${x}`; }
    else if(k === 'p'){ ans = m * x; q = [`நிறை ${m} kg, திசைவேகம் ${x} m/s. உந்தம் p = ?`, `Mass ${m} kg, velocity ${x} m/s. Momentum p = ?`]; u = 'kg m/s'; why = `${m} × ${x}`; }
    else if(k === 'W'){ ans = m * x; q = [`${m} N விசை ஒரு பொருளை ${x} m நகர்த்துகிறது. செய்த வேலை = ?`, `A force of ${m} N moves an object ${x} m. Work done = ?`]; u = 'J'; why = `${m} × ${x}`; }
    else if(k === 'KE'){ const v = ri(1, 10) * 2; ans = m * v * v / 2; q = [`நிறை ${m} kg, திசைவேகம் ${v} m/s. இயக்க ஆற்றல் = ?`, `Mass ${m} kg, velocity ${v} m/s. Kinetic energy = ?`]; u = 'J'; why = `½ × ${m} × ${v}²`; }
    else if(k === 'PE'){ ans = m * 10 * x; q = [`${m} kg நிறை ${x} m உயரத்தில். நிலை ஆற்றல் = ? (g = 10 m/s²)`, `A ${m} kg mass at a height of ${x} m. Potential energy = ? (g = 10 m/s²)`]; u = 'J'; why = `${m} × 10 × ${x}`; }
    else { const t = ri(2, 10), w = t * ri(10, 200); ans = w / t; q = [`${fmt(w)} J வேலை ${t} வினாடியில் செய்யப்படுகிறது. திறன் = ?`, `${fmt(w)} J of work is done in ${t} s. Power = ?`]; u = 'W'; why = `${fmt(w)} ÷ ${t}`; }
    return {p:S(q[0], q[1]), scene:'', opts: opts(ans, [ans * 2, ans / 2, ans + 10, ans * 10].filter(v => Number.isInteger(v) && v > 0 && v !== ans), v => fmt(v) + ' ' + u), ans, ex:S(`${why} = ${fmt(ans)} ${u}`, `${why} = ${fmt(ans)} ${u}`)}; } };
H.electricity = { title:S('மின்னோட்டவியல்', 'Electricity'), icon:'⚡',
  intro:S('ஓம் விதி: V = IR. தொடர் இணைப்பு: R = R₁ + R₂. பக்க இணைப்பு: 1/R = 1/R₁ + 1/R₂. மின்திறன் P = VI. மின் ஆற்றல் (யூனிட், kWh) = திறன் (kW) × மணி நேரம். வீட்டு மின் கட்டணம் யூனிட்டில்தான்!', 'Ohm’s law: V = IR. Series: R = R₁ + R₂. Parallel: 1/R = 1/R₁ + 1/R₂. Electric power P = VI. Energy (units, kWh) = power (kW) × hours. Your home electricity bill is counted in units!'),
  gen(){ const k = pick(['V', 'I', 'series', 'parallel', 'P', 'kwh']);
    if(k === 'V' || k === 'I'){ const I = ri(1, 10), R = ri(2, 50), V = I * R; if(k === 'V') return {p:S(`I = ${I} A, R = ${R} Ω. மின்னழுத்தம் V = ?`, `I = ${I} A, R = ${R} Ω. Voltage V = ?`), scene:'🔋', opts: opts(V, [I + R, R - I, V * 2].filter(v => v > 0 && v !== V), v => v + ' V'), ans:V, ex:S(`V = ${I} × ${R} = ${V} V`, `V = ${I} × ${R} = ${V} V`)};
      return {p:S(`V = ${V} V, R = ${R} Ω. மின்னோட்டம் I = ?`, `V = ${V} V, R = ${R} Ω. Current I = ?`), scene:'🔋', opts: opts(I, [I + 1, V - R > 0 ? V - R : I + 2, I * 2].filter(v => v > 0 && v !== I), v => v + ' A'), ans:I, ex:S(`I = ${V} ÷ ${R} = ${I} A`, `I = ${V} ÷ ${R} = ${I} A`)}; }
    if(k === 'series'){ const a = ri(1, 30), b = ri(1, 30), ans = a + b; return {p:S(`${a} Ω, ${b} Ω தொடர் இணைப்பில். மொத்த மின்தடை?`, `${a} Ω and ${b} Ω in series. Total resistance?`), scene:'', opts: opts(ans, [a * b, Math.abs(a - b) || ans + 3, ans + 1].filter(v => v !== ans), v => v + ' Ω'), ans, ex:S(`${a} + ${b} = ${ans} Ω`, `${a} + ${b} = ${ans} Ω`)}; }
    if(k === 'parallel'){ const [a, b] = pick([[6, 3], [12, 6], [4, 4], [10, 10], [20, 5], [12, 4], [30, 6], [6, 12], [3, 6], [8, 8], [15, 10], [60, 30]]), ans = a * b / (a + b);
      return {p:S(`${a} Ω, ${b} Ω பக்க இணைப்பில். மொத்த மின்தடை?`, `${a} Ω and ${b} Ω in parallel. Total resistance?`), scene:'', opts: opts(ans, [a + b, (a + b) / 2, Math.min(a, b)].filter(v => Number.isInteger(v) && v !== ans), v => v + ' Ω'), ans, ex:S(`${a} × ${b} ÷ (${a} + ${b}) = ${ans} Ω — எப்போதும் சிறியதைவிடக் குறைவு!`, `${a} × ${b} ÷ (${a} + ${b}) = ${ans} Ω — always less than the smaller one!`)}; }
    if(k === 'P'){ const V = pick([6, 12, 24, 220, 230]), I = ri(1, 10), ans = V * I; return {p:S(`V = ${V} V, I = ${I} A. மின்திறன் P = ?`, `V = ${V} V, I = ${I} A. Power P = ?`), scene:'💡', opts: opts(ans, [V + I, ans / 2 | 0, ans * 2].filter(v => v > 0 && v !== ans), v => fmt(v) + ' W'), ans, ex:S(`${V} × ${I} = ${fmt(ans)} W`, `${V} × ${I} = ${fmt(ans)} W`)}; }
    const W = pick([100, 200, 250, 500, 1000, 1500, 2000]), h = ri(1, 12) * 2, d = ri(10, 30), rate = ri(2, 8), units = W * h * d / 1000; if(!Number.isInteger(units)) return H.electricity.gen();
    const ans = units * rate;
    return {p:S(`${W} W கருவி தினமும் ${h} மணி நேரம், ${d} நாள்கள் இயங்குகிறது. ஒரு யூனிட் ₹${rate} எனில் கட்டணம்?`, `A ${W} W appliance runs ${h} hours a day for ${d} days. At ₹${rate} per unit, the cost?`), scene:'🧾', opts: opts(ans, [units, W * h * d * rate / 100, ans + rate * 10].filter(v => Number.isInteger(v) && v > 0 && v !== ans), v => '₹' + fmt(v)), ans,
      ex:S(`${W / 1000} kW × ${h} × ${d} = ${units} யூனிட்; ${units} × ₹${rate} = ₹${fmt(ans)}`, `${W / 1000} kW × ${h} × ${d} = ${units} units; ${units} × ₹${rate} = ₹${fmt(ans)}`)}; } };
H.waves = { title:S('அலைகள், ஒளி, வெப்பம்', 'Waves, light & heat'), icon:'🌊',
  intro:S('அலை வேகம் v = fλ. எதிரொலி: தூரம் = வேகம் × நேரம் ÷ 2 (போய் வருவதால்). ஒளிவிலகல் எண் n = c ÷ v (c = 3 × 10⁸ m/s). லென்ஸின் திறன் P = 1 ÷ f (மீட்டரில்) டயாப்டர். வெப்பம் Q = mcΔT (நீரின் c = 4200 J/kg°C).', 'Wave speed v = fλ. Echo: distance = speed × time ÷ 2 (there and back). Refractive index n = c ÷ v (c = 3 × 10⁸ m/s). Lens power P = 1 ÷ f (in metres) dioptres. Heat Q = mcΔT (water’s c = 4200 J/kg°C).'),
  gen(){ const k = pick(['wave', 'echo', 'lens', 'heat', 'index']);
    if(k === 'wave'){ const f = ri(2, 50) * 10, l = ri(1, 8), ans = f * l; return {p:S(`அதிர்வெண் ${f} Hz, அலைநீளம் ${l} m. அலை வேகம்?`, `Frequency ${f} Hz, wavelength ${l} m. Wave speed?`), scene:'〰️', opts: opts(ans, [f + l, f / l | 0, ans * 2].filter(v => v > 0 && v !== ans), v => fmt(v) + ' m/s'), ans, ex:S(`${f} × ${l} = ${fmt(ans)} m/s`, `${f} × ${l} = ${fmt(ans)} m/s`)}; }
    if(k === 'echo'){ const v = pick([330, 340, 1500]), t = ri(1, 8), ans = v * t / 2; if(!Number.isInteger(ans)) return H.waves.gen();
      return {p:S(`ஒலியின் வேகம் ${v} m/s. எதிரொலி ${t} வினாடியில் கேட்கிறது. சுவர் எவ்வளவு தூரம்?`, `Sound travels at ${v} m/s. The echo is heard after ${t} s. How far is the wall?`), scene:'🗣️', opts: opts(ans, [v * t, ans / 2 | 0, ans + v].filter(x => x > 0 && x !== ans), v => fmt(v) + ' m'), ans, ex:S(`${v} × ${t} ÷ 2 = ${fmt(ans)} m`, `${v} × ${t} ÷ 2 = ${fmt(ans)} m`)}; }
    if(k === 'lens'){ const f = pick([10, 20, 25, 50, 100, 200]), cv = Math.random() < .5, P2 = 100 / f * (cv ? 1 : -1), ans = String(P2).replace('-', '−') + ' D';
      return {p:S(`${cv ? 'குவி' : 'குழி'} லென்ஸின் குவியத் தொலைவு ${cv ? '' : '−'}${f} cm. திறன்?`, `A ${cv ? 'convex' : 'concave'} lens has focal length ${cv ? '' : '−'}${f} cm. Its power?`), scene:'🔍', opts: opts(ans, [String(-P2).replace('-', '−') + ' D', `${f / 100} D`.replace('-', '−'), `${f} D`].filter(x => x !== ans), v => v), ans,
        ex:S(`P = 100 ÷ ${cv ? '' : '(−'}${f}${cv ? '' : ')'} = ${ans}`, `P = 100 ÷ ${cv ? '' : '(−'}${f}${cv ? '' : ')'} = ${ans}`)}; }
    if(k === 'index'){ const [v, n] = pick([[2, '1.5'], [1.5, '2'], [2.25, '1.33']]).map(String), ans = n; // c = 3e8
      const vv = {'2':'2 × 10⁸', '1.5':'1.5 × 10⁸', '2.25':'2.25 × 10⁸'}[v];
      return {p:S(`ஒரு ஊடகத்தில் ஒளியின் வேகம் ${vv} m/s. ஒளிவிலகல் எண்? (c = 3 × 10⁸ m/s)`, `Light travels at ${vv} m/s in a medium. Refractive index? (c = 3 × 10⁸ m/s)`), scene:'💎', opts: opts(ans, ['1.5', '2', '1.33', '0.67', '1'].filter(x => x !== ans), v => v), ans,
        ex:S(`n = 3 ÷ ${v} ${ans === '1.33' ? '≈' : '='} ${ans}`, `n = 3 ÷ ${v} ${ans === '1.33' ? '≈' : '='} ${ans}`), data:{v:+v}}; }
    const m = ri(1, 10), dT = ri(2, 20) * 5, ans = m * 4200 * dT;
    return {p:S(`${m} kg நீரை ${dT}°C சூடாக்கத் தேவையான வெப்பம்? (c = 4200 J/kg°C)`, `Heat needed to warm ${m} kg of water by ${dT}°C? (c = 4200 J/kg°C)`), scene:'♨️', opts: opts(ans, [m * 4200, 4200 * dT, ans * 2, ans / 10].filter(v => Number.isInteger(v) && v !== ans), v => fmt(v) + ' J'), ans, ex:S(`${m} × 4200 × ${dT} = ${fmt(ans)} J`, `${m} × 4200 × ${dT} = ${fmt(ans)} J`)}; } };
H.fluidPressure = { title:S('திரவ அழுத்தம், மிதப்பு', 'Fluid pressure & buoyancy'), icon:'🌊',
  intro:S('திரவத்தில் ஆழம் h-ல் அழுத்தம் P = hρg. நீருக்கு ρ = 1000 kg/m³ (g = 10 m/s² எனக் கொள்க). அணைகளின் அடிப்பகுதி ஏன் அகலமாக உள்ளது? ஆழம் கூடக் கூட அழுத்தம் கூடுகிறது!', 'Pressure at depth h in a liquid is P = hρg. For water ρ = 1000 kg/m³ (take g = 10 m/s²). Why are dams wider at the bottom? Pressure grows with depth!'),
  gen(){ const h = ri(1, 50), ans = h * 1000 * 10;
    return {p:S(`நீரில் ${h} m ஆழத்தில் அழுத்தம் (வளிமண்டல அழுத்தம் தவிர)? (ρ = 1000 kg/m³, g = 10 m/s²)`, `Pressure at ${h} m depth in water (excluding air pressure)? (ρ = 1000 kg/m³, g = 10 m/s²)`), scene:'🤿', opts: opts(ans, [h * 1000, h * 10, ans * 2].filter(v => v !== ans), v => fmt(v) + ' Pa'), ans, ex:S(`${h} × 1000 × 10 = ${fmt(ans)} Pa`, `${h} × 1000 × 10 = ${fmt(ans)} Pa`)}; } };
H.halfLife = { title:S('அரை ஆயுள்', 'Half-life'), icon:'☢️',
  intro:S('ஒரு கதிரியக்கத் தனிமம் பாதியாகக் குறைய ஆகும் நேரம் அரை ஆயுள். ஒவ்வொரு அரை ஆயுளுக்கும் மீதி பாதியாகும்: 800 → 400 → 200 → 100. கார்பன்-14 அரை ஆயுளை வைத்துப் பழைய பொருள்களின் வயதைக் கணிக்கிறார்கள்!', 'Half-life is the time for half of a radioactive substance to decay. Each half-life halves what is left: 800 → 400 → 200 → 100. Scientists date ancient objects using carbon-14’s half-life!'),
  gen(){ const n = ri(1, 5), T = pick([2, 3, 5, 8, 10, 12]), N0 = 2 ** n * ri(1, 50) * 5, ans = N0 / 2 ** n;
    return {p:S(`அரை ஆயுள் ${T} நாள்கள். ${fmt(N0)} g-லிருந்து ${n * T} நாளுக்குப் பிறகு மீதம்?`, `Half-life ${T} days. Starting with ${fmt(N0)} g, how much is left after ${n * T} days?`), scene:'', opts: opts(ans, [N0 / (2 * n), ans * 2, ans / 2, N0 - ans].filter(v => Number.isInteger(v) && v > 0 && v !== ans), v => fmt(v) + ' g'), ans,
      ex:S(`${n * T} ÷ ${T} = ${n} அரை ஆயுள்கள்; ${fmt(N0)} ÷ 2${sup(n)} = ${fmt(ans)} g`, `${n * T} ÷ ${T} = ${n} half-lives; ${fmt(N0)} ÷ 2${sup(n)} = ${fmt(ans)} g`)}; } };

/* ================= CHEMISTRY ================= */
const AM = {H:1, C:12, N:14, O:16, Na:23, Mg:24, Al:27, S:32, Cl:35.5, K:39, Ca:40, Fe:56, Cu:63.5, Zn:65};
const CMP = [['H₂O','நீர்','water',{H:2,O:1}],['CO₂','கார்பன் டைஆக்சைடு','carbon dioxide',{C:1,O:2}],['NaCl','சோடியம் குளோரைடு','sodium chloride',{Na:1,Cl:1}],['NH₃','அம்மோனியா','ammonia',{N:1,H:3}],['CH₄','மீத்தேன்','methane',{C:1,H:4}],
  ['H₂SO₄','சல்ஃப்யூரிக் அமிலம்','sulphuric acid',{H:2,S:1,O:4}],['CaCO₃','கால்சியம் கார்பனேட்','calcium carbonate',{Ca:1,C:1,O:3}],['NaOH','சோடியம் ஹைட்ராக்சைடு','sodium hydroxide',{Na:1,O:1,H:1}],['HCl','ஹைட்ரஜன் குளோரைடு','hydrogen chloride',{H:1,Cl:1}],['C₆H₁₂O₆','குளுக்கோஸ்','glucose',{C:6,H:12,O:6}],
  ['MgO','மெக்னீசியம் ஆக்சைடு','magnesium oxide',{Mg:1,O:1}],['O₂','ஆக்சிஜன்','oxygen',{O:2}],['N₂','நைட்ரஜன்','nitrogen',{N:2}],['KCl','பொட்டாசியம் குளோரைடு','potassium chloride',{K:1,Cl:1}],['CaO','கால்சியம் ஆக்சைடு','calcium oxide',{Ca:1,O:1}],['HNO₃','நைட்ரிக் அமிலம்','nitric acid',{H:1,N:1,O:3}],['C₂H₅OH','எத்தனால்','ethanol',{C:2,H:6,O:1}],['Al₂O₃','அலுமினியம் ஆக்சைடு','aluminium oxide',{Al:2,O:3}]];
const molar = f => Object.entries(f).reduce((s, [e, n]) => s + AM[e] * n, 0);
G.KALVI_CHEM = {AM, CMP, molar};
H.molarMass = { title:S('மூலக்கூறு நிறை, மோல்', 'Molar mass & moles'), icon:'⚗️',
  intro:S('மூலக்கூறு நிறை = அணு நிறைகளின் கூடுதல். H₂O = 2 × 1 + 16 = 18 g/mol. மோல்களின் எண்ணிக்கை = நிறை ÷ மூலக்கூறு நிறை. 1 மோல் = 6.022 × 10²³ துகள்கள் (அவகாட்ரோ எண்). அணு நிறைகள்: H 1, C 12, N 14, O 16, Na 23, Mg 24, Al 27, S 32, Cl 35.5, K 39, Ca 40.', 'Molar mass = sum of the atomic masses. H₂O = 2 × 1 + 16 = 18 g/mol. Number of moles = mass ÷ molar mass. 1 mole = 6.022 × 10²³ particles (Avogadro’s number). Atomic masses: H 1, C 12, N 14, O 16, Na 23, Mg 24, Al 27, S 32, Cl 35.5, K 39, Ca 40.'),
  gen(){ const [f, ta, en, comp] = pick(CMP), M = molar(comp), lab = v => String(v);
    if(Math.random() < .5 || !Number.isInteger(M)) return {p:S(`${ta} (${f}) — மூலக்கூறு நிறை? (g/mol)`, `Molar mass of ${en} (${f})? (g/mol)`), scene:`<div class="big">${f}</div>`, opts: opts(M, [M + 1, M - 1, M + 16, Object.values(comp).reduce((a, b) => a + b, 0) * 10, M * 2].filter(v => v > 0 && v !== M), lab), ans:M,
      ex:S(Object.entries(comp).map(([e, n]) => `${n} × ${AM[e]}`).join(' + ') + ` = ${M}`, Object.entries(comp).map(([e, n]) => `${n} × ${AM[e]}`).join(' + ') + ` = ${M}`), data:{comp}};
    const n = ri(1, 10) / (Math.random() < .3 ? 2 : 1), mass = n * M, ans = String(n);
    return {p:S(`${fmt(mass)} g ${ta} (${f}) — எத்தனை மோல்?`, `How many moles are in ${fmt(mass)} g of ${en} (${f})?`), scene:'', opts: opts(ans, [String(n * 2), String(n + 1), String(n / 2), String(mass)].filter(x => x !== ans), v => v + ' mol'), ans,
      ex:S(`மூலக்கூறு நிறை ${M}; ${fmt(mass)} ÷ ${M} = ${n} மோல்`, `Molar mass ${M}; ${fmt(mass)} ÷ ${M} = ${n} mol`), data:{comp}}; } };
const ELS = [['H','ஹைட்ரஜன்','Hydrogen',1,1],['He','ஹீலியம்','Helium',2,4],['Li','லித்தியம்','Lithium',3,7],['Be','பெரிலியம்','Beryllium',4,9],['B','போரான்','Boron',5,11],['C','கார்பன்','Carbon',6,12],['N','நைட்ரஜன்','Nitrogen',7,14],['O','ஆக்சிஜன்','Oxygen',8,16],['F','ஃப்ளூரின்','Fluorine',9,19],['Ne','நியான்','Neon',10,20],
  ['Na','சோடியம்','Sodium',11,23],['Mg','மெக்னீசியம்','Magnesium',12,24],['Al','அலுமினியம்','Aluminium',13,27],['Si','சிலிக்கான்','Silicon',14,28],['P','பாஸ்பரஸ்','Phosphorus',15,31],['S','சல்ஃபர்','Sulphur',16,32],['Cl','குளோரின்','Chlorine',17,35],['Ar','ஆர்கான்','Argon',18,40],['K','பொட்டாசியம்','Potassium',19,39],['Ca','கால்சியம்','Calcium',20,40]];
const config = z => { const s = [], cap = [2, 8, 8, 2]; let r = z; for(const c of cap){ if(r <= 0) break; s.push(Math.min(c, r)); r -= c; } return s; };
G.KALVI_ELS = {ELS, config};
H.atoms = { title:S('அணு அமைப்பு', 'Atomic structure'), icon:'⚛️',
  intro:S('அணு எண் Z = புரோட்டான்கள் = (நடுநிலை அணுவில்) எலக்ட்ரான்கள். நிறை எண் A = புரோட்டான் + நியூட்ரான். எனவே நியூட்ரான் = A − Z. எலக்ட்ரான் அமைப்பு: K கூடு 2, L கூடு 8, M கூடு 8 (முதல் 20 தனிமங்களுக்கு). Na (11) = 2, 8, 1.', 'Atomic number Z = protons = electrons (in a neutral atom). Mass number A = protons + neutrons. So neutrons = A − Z. Electron arrangement: K shell 2, L shell 8, M shell 8 (for the first 20 elements). Na (11) = 2, 8, 1.'),
  gen(){ const [sym, ta, en, Z, A] = pick(ELS), k = pick(['n', 'p', 'cfg', 'val']);
    if(k === 'n'){ const ans = A - Z; return {p:S(`${ta} (${sym}): Z = ${Z}, A = ${A}. நியூட்ரான்கள் எத்தனை?`, `${en} (${sym}): Z = ${Z}, A = ${A}. How many neutrons?`), scene:`<div class="big">${sym}</div>`, opts: opts(ans, [A, Z, A + Z, ans + 1].filter(v => v !== ans)), ans, ex:S(`${A} − ${Z} = ${ans}`, `${A} − ${Z} = ${ans}`)}; }
    if(k === 'p') return {p:S(`${ta} (${sym}) அணு எண் ${Z}. நடுநிலை அணுவில் எலக்ட்ரான்கள் எத்தனை?`, `${en} (${sym}) has atomic number ${Z}. How many electrons in a neutral atom?`), scene:`<div class="big">${sym}</div>`, opts: opts(Z, [A, A - Z, Z + 1, Z * 2].filter(v => v !== Z)), ans:Z, ex:S(`எலக்ட்ரான் = புரோட்டான் = ${Z}`, `Electrons = protons = ${Z}`)};
    const c = config(Z), ans = c.join(', ');
    if(k === 'cfg'){ const w = [config(Z + 1).join(', '), config(Math.max(1, Z - 1)).join(', '), [...c].reverse().join(', '), Z > 2 ? [Z - 2, 2].join(', ') : '1, 1'].filter(x => x !== ans);
      return {p:S(`${ta} (Z = ${Z}) — எலக்ட்ரான் அமைப்பு?`, `Electronic configuration of ${en} (Z = ${Z})?`), scene:`<div class="big">${sym}</div>`, opts: opts(ans, w, v => v), ans, ex:S(`K ${c[0]}${c[1] ? ', L ' + c[1] : ''}${c[2] ? ', M ' + c[2] : ''}${c[3] ? ', N ' + c[3] : ''} → ${ans}`, `K ${c[0]}${c[1] ? ', L ' + c[1] : ''}${c[2] ? ', M ' + c[2] : ''}${c[3] ? ', N ' + c[3] : ''} → ${ans}`)}; }
    const last = c[c.length - 1], full = (c.length === 1 && last === 2) || last === 8, ans2 = full ? 0 : last <= 4 ? last : 8 - last;
    return {p:S(`${ta} (${c.join(', ')}) — இணைதிறன் (valency)?`, `Valency of ${en} (${c.join(', ')})?`), scene:`<div class="big">${sym}</div>`, opts: opts(ans2, [last, 8 - last, ans2 + 1, 0, 1, 2, 3, 4].filter(v => v !== ans2 && v >= 0 && v <= 4)), ans:ans2,
      ex:S(full ? 'வெளிக்கூடு நிரம்பியுள்ளது → 0 (மந்த வாயு)' : `வெளிக்கூட்டில் ${last} → ${last <= 4 ? `${last}-ஐ இழக்கும்/பகிரும்` : `${8 - last} பெற்றால் 8 ஆகும்`} → ${ans2}`, full ? 'Outer shell is full → 0 (noble gas)' : `${last} in the outer shell → ${last <= 4 ? `loses/shares ${last}` : `gains ${8 - last} to reach 8`} → ${ans2}`)}; } };
H.pH = { title:S('pH அளவு', 'The pH scale'), icon:'🧪',
  intro:S('pH 0–14. pH < 7 அமிலம், pH = 7 நடுநிலை, pH > 7 காரம். pH = −log[H⁺]: [H⁺] = 10⁻³ எனில் pH 3. ஒரு pH அலகு குறைந்தால் அமிலத்தன்மை 10 மடங்கு! இரத்தம் pH ≈ 7.4, எலுமிச்சைச் சாறு ≈ 2.', 'pH runs 0–14. pH < 7 acid, pH = 7 neutral, pH > 7 base. pH = −log[H⁺]: if [H⁺] = 10⁻³ then pH is 3. One pH unit lower means 10 times more acidic! Blood is about pH 7.4, lemon juice about 2.'),
  gen(){ if(Math.random() < .5){ const n = ri(1, 13), supE = '⁻' + sup(n); return {p:S(`[H⁺] = 10${supE} mol/L எனில் pH = ?`, `If [H⁺] = 10${supE} mol/L, pH = ?`), scene:'', opts: opts(n, [14 - n, n + 1, n - 1].filter(v => v >= 0 && v <= 14 && v !== n)), ans:n, ex:S(`pH = −log(10${supE}) = ${n}`, `pH = −log(10${supE}) = ${n}`)}; }
    const p = ri(0, 14), ans = p < 7 ? 'acid' : p === 7 ? 'neutral' : 'base', T = {acid:['அமிலம்','acidic'], neutral:['நடுநிலை','neutral'], base:['காரம்','basic']};
    return {p:S(`ஒரு கரைசலின் pH ${p}. அது?`, `A solution has pH ${p}. It is…`), scene:'', opts: ['acid', 'neutral', 'base'].map(v => ({v, h:`${T[v][0]} / ${T[v][1]}`})), ans, ex:S(`pH ${p} ${p < 7 ? '< 7' : p === 7 ? '= 7' : '> 7'} → ${T[ans][0]}`, `pH ${p} ${p < 7 ? '< 7' : p === 7 ? '= 7' : '> 7'} → ${T[ans][1]}`)}; } };
H.solutions = { title:S('கரைசல்கள் — செறிவு', 'Solutions — concentration'), icon:'🥤',
  intro:S('நிறை சதவீதம் = கரைபொருளின் நிறை ÷ கரைசலின் நிறை × 100. கரைசல் = கரைபொருள் + கரைப்பான். 10 g உப்பு + 90 g நீர் = 100 g கரைசல் → 10%.', 'Mass percentage = mass of solute ÷ mass of solution × 100. Solution = solute + solvent. 10 g salt + 90 g water = 100 g solution → 10%.'),
  gen(){ const pct = pick([2, 4, 5, 10, 12, 15, 20, 25, 40]), tot = pick([50, 100, 200, 250, 400, 500]), solute = tot * pct / 100; if(!Number.isInteger(solute)) return H.solutions.gen();
    const solvent = tot - solute; return {p:S(`${solute} g சர்க்கரையை ${solvent} g நீரில் கரைத்தால் நிறை சதவீதம்?`, `${solute} g of sugar is dissolved in ${solvent} g of water. Mass percentage?`), scene:'🥤',
      opts: opts(pct, [Math.round(solute * 100 / solvent), pct * 2, pct + 5].filter(v => v !== pct), v => v + '%'), ans:pct, ex:S(`கரைசல் = ${solute} + ${solvent} = ${tot} g; ${solute} ÷ ${tot} × 100 = ${pct}%`, `Solution = ${solute} + ${solvent} = ${tot} g; ${solute} ÷ ${tot} × 100 = ${pct}%`)}; } };
const ALK = ['மீத்தேன்','ஈத்தேன்','புரொப்பேன்','பியூட்டேன்','பென்டேன்','ஹெக்சேன்','ஹெப்டேன்','ஆக்டேன்','நோனேன்','டெக்கேன்'], ALKE = ['methane','ethane','propane','butane','pentane','hexane','heptane','octane','nonane','decane'];
H.alkanes = { title:S('ஆல்கேன்கள் — பெயரும் வாய்பாடும்', 'Alkanes — names & formulae'), icon:'🛢️',
  intro:S('ஆல்கேன்களின் பொது வாய்பாடு CₙH₂ₙ₊₂: மீத்தேன் CH₄, ஈத்தேன் C₂H₆, புரொப்பேன் C₃H₈, பியூட்டேன் C₄H₁₀ (சமையல் எரிவாயுவில்!). ஒவ்வொரு அடுத்த உறுப்பும் CH₂ கூடுதல் — இது ஒரு "படிவரிசை" (homologous series).', 'General formula of alkanes CₙH₂ₙ₊₂: methane CH₄, ethane C₂H₆, propane C₃H₈, butane C₄H₁₀ (in cooking gas!). Each next member adds CH₂ — a "homologous series".'),
  gen(){ const n = ri(1, 10), sub = x => String(x).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[+d]).join(''), fm = k => `C${k > 1 ? sub(k) : ''}H${sub(2 * k + 2)}`, ans = fm(n);
    if(Math.random() < .5) return {p:S(`${ALK[n - 1]} (${ALKE[n - 1]}) — மூலக்கூறு வாய்பாடு?`, `Molecular formula of ${ALKE[n - 1]}?`), scene:'', opts: opts(ans, [`C${n > 1 ? sub(n) : ''}H${sub(2 * n)}`, `C${n > 1 ? sub(n) : ''}H${sub(2 * n + 1)}`, fm(n === 10 ? 9 : n + 1), `C${n > 1 ? sub(n) : ''}H${sub(2 * n - 2 > 0 ? 2 * n - 2 : 3)}`].filter(x => x !== ans), v => v), ans, ex:S(`n = ${n}: CₙH₂ₙ₊₂ → ${ans}`, `n = ${n}: CₙH₂ₙ₊₂ → ${ans}`), data:{n}};
    const a = ALKE[n - 1]; return {p:S(`${ans} — பெயர்?`, `Name of ${ans}?`), scene:'', opts: opts(a, shuffle(ALKE.filter(x => x !== a)).slice(0, 5), v => v), ans:a, ex:S(`${ans} = ${ALK[n - 1]} (${a})`, `${ans} = ${a}`), data:{n}}; } };

/* ================= COMPUTER SCIENCE ================= */
H.binary = { title:S('இரும எண்கள் (Binary)', 'Binary numbers'), icon:'💻',
  intro:S('கணினி 0, 1 மட்டுமே புரிந்துகொள்ளும். இட மதிப்புகள் 1, 2, 4, 8, 16, 32, 64, 128. 1011₂ = 8 + 0 + 2 + 1 = 11. 1 பைட் = 8 பிட். 1 KB = 1024 பைட்.', 'A computer understands only 0 and 1. Place values: 1, 2, 4, 8, 16, 32, 64, 128. 1011₂ = 8 + 0 + 2 + 1 = 11. 1 byte = 8 bits. 1 KB = 1024 bytes.'),
  gen(){ const n = ri(5, 255), b = n.toString(2);
    if(Math.random() < .5) return {p:S(`${b}₂ = ? (பதின்ம எண்)`, `${b}₂ = ? (in decimal)`), scene:'', opts: opts(n, [n + 1, n - 1, parseInt(b.split('').reverse().join(''), 2), n * 2].filter(v => v > 0 && v !== n)), ans:n,
      ex:S(b.split('').map((d, i) => d === '1' ? 2 ** (b.length - 1 - i) : null).filter(x => x !== null).join(' + ') + ` = ${n}`, b.split('').map((d, i) => d === '1' ? 2 ** (b.length - 1 - i) : null).filter(x => x !== null).join(' + ') + ` = ${n}`)};
    return {p:S(`${n} — இரும எண்ணில்?`, `${n} in binary?`), scene:'', opts: opts(b, [(n + 1).toString(2), Math.max(1, n - 1).toString(2), b.split('').reverse().join('').replace(/^0+/, '') || '1', (n * 2).toString(2)].filter(x => x !== b), v => v + '₂'), ans:b,
      ex:S(`${n} = ${b.split('').map((d, i) => d === '1' ? 2 ** (b.length - 1 - i) : null).filter(x => x !== null).join(' + ')} → ${b}₂`, `${n} = ${b.split('').map((d, i) => d === '1' ? 2 ** (b.length - 1 - i) : null).filter(x => x !== null).join(' + ')} → ${b}₂`)}; } };

/* ================= BIOLOGY (generated) ================= */
H.punnett = { title:S('மெண்டல் — பன்னெட் கட்டம்', 'Mendel — Punnett square'), icon:'🌱',
  intro:S('T = உயரம் (ஓங்கு பண்பு), t = குட்டை (ஒடுங்கு பண்பு). Tt × Tt → TT, Tt, Tt, tt: தோற்றம் 3 உயரம் : 1 குட்டை; மரபணு வகை 1 : 2 : 1. ஒரு T இருந்தாலே தாவரம் உயரமாக இருக்கும்!', 'T = tall (dominant), t = short (recessive). Tt × Tt → TT, Tt, Tt, tt: looks 3 tall : 1 short; genotypes 1 : 2 : 1. One T is enough to make the plant tall!'),
  gen(){ const P1 = pick(['TT', 'Tt', 'tt']), P2 = pick(['TT', 'Tt', 'tt']), kids = []; for(const a of P1) for(const b of P2) kids.push([a, b].sort().join(''));
    const want = pick(['tall', 'short']), fav = kids.filter(k => want === 'tall' ? k.includes('T') : k === 'tt').length, ans = frac(fav, 4);
    return {p:S(`${P1} × ${P2} — சந்ததி ${want === 'tall' ? 'உயரமாக' : 'குட்டையாக'} இருக்க நிகழ்தகவு? (T உயரம் ஓங்கு பண்பு)`, `${P1} × ${P2} — probability an offspring is ${want}? (T = tall, dominant)`), scene:`<div class="big">${P1} × ${P2}</div>`,
      opts: opts(ans, ['0', '1/4', '1/2', '3/4', '1'].filter(x => x !== ans), v => v), ans, ex:S(`சந்ததி: ${kids.join(', ')} → ${fav}/4${ans !== `${fav}/4` ? ' = ' + ans : ''}`, `Offspring: ${kids.join(', ')} → ${fav}/4${ans !== `${fav}/4` ? ' = ' + ans : ''}`), data:{P1, P2}}; } };

G.KALVI_HIGH = H;
})(typeof window !== 'undefined' ? window : globalThis);
