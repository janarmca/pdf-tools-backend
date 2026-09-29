/* Kalvi Kalanjiyam — game question generators (Classes 1–5).
   Pure functions: no DOM. Every numeric answer is COMPUTED, never typed in,
   and tests/games.test.js re-checks thousands of generated questions.
   A question:
     {p:{ta,en}, scene:html, opts:[{v,h}], ans:v, ex:{ta,en}, say:{ta,en}?}
   or a sort round:
     {kind:'sort', p, bins:[{id,h}], items:[{h,bin}], ex} */
(function(G){
'use strict';
const S = (ta, en) => ({ta, en});
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => { const a = arr.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = n => Number(n).toLocaleString('en-IN');
// numeric options: answer + distinct plausible distractors (>= min)
function numOpts(ans, cands, n, min){
  n = n || 4; min = min == null ? 0 : min;
  const set = new Set([ans]);
  for(const c of shuffle(cands)) if(set.size < n && c !== ans && c >= min && Number.isInteger(c)) set.add(c);
  let k = 1;
  while(set.size < n){ for(const c of [ans + k, ans - k]) if(set.size < n && c >= min) set.add(c); k++; }
  return shuffle([...set]).map(v => ({v, h: fmt(v)}));
}
function strOpts(ans, pool, n){
  n = n || 4;
  const set = new Set([ans]);
  for(const c of shuffle(pool)) if(set.size < n && c !== ans) set.add(c);
  return shuffle([...set]).map(v => ({v, h: v}));
}
const EMO = ['🥭','🍎','🍌','⭐','🌸','🐟','🎈','🚗','🐤','🍋','🪁','🥥'];
function emojiGrid(e, n, per){
  per = per || 5; let rows = [];
  for(let i = 0; i < n; i += per) rows.push(`<div>${Array(Math.min(per, n - i)).fill(e).join(' ')}</div>`);
  return `<div class="emo">${rows.join('')}</div>`;
}

/* ---------- drawings ---------- */
function clockSVG(h, m){
  const ha = ((h % 12) + m / 60) * 30, ma = m * 6;
  const hand = (a, len, w, c) => { const r = (a - 90) * Math.PI / 180; return `<line x1="100" y1="100" x2="${100 + len * Math.cos(r)}" y2="${100 + len * Math.sin(r)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`; };
  let ticks = '';
  for(let i = 1; i <= 12; i++){ const r = (i * 30 - 90) * Math.PI / 180; ticks += `<text x="${100 + 72 * Math.cos(r)}" y="${100 + 72 * Math.sin(r) + 6}" text-anchor="middle" font-size="17" font-weight="700" fill="#14213d">${i}</text>`; }
  for(let i = 0; i < 60; i++){ const r = (i * 6 - 90) * Math.PI / 180, a = i % 5 ? 86 : 82; ticks += `<line x1="${100 + a * Math.cos(r)}" y1="${100 + a * Math.sin(r)}" x2="${100 + 90 * Math.cos(r)}" y2="${100 + 90 * Math.sin(r)}" stroke="#667" stroke-width="${i % 5 ? 1 : 2.5}"/>`; }
  return `<svg viewBox="0 0 200 200" class="pic" style="max-width:230px"><circle cx="100" cy="100" r="94" fill="#fffdf3" stroke="#3b2fc9" stroke-width="5"/>${ticks}${hand(ha, 48, 7, '#a4133c')}${hand(ma, 70, 4, '#0b7a75')}<circle cx="100" cy="100" r="6" fill="#14213d"/></svg>`;
}
function blocksSVG(h, t, o){
  let x = 6, out = '';
  for(let i = 0; i < h; i++){ out += `<g transform="translate(${x},6)">`; for(let r = 0; r < 10; r++) for(let c = 0; c < 10; c++) out += `<rect x="${c * 7}" y="${r * 7}" width="7" height="7" fill="#c7d2fe" stroke="#3b2fc9" stroke-width=".6"/>`; out += '</g>'; x += 76; }
  for(let i = 0; i < t; i++){ out += `<g transform="translate(${x},6)">`; for(let r = 0; r < 10; r++) out += `<rect x="0" y="${r * 7}" width="7" height="7" fill="#fde68a" stroke="#b45309" stroke-width=".6"/>`; out += '</g>'; x += 11; }
  x += 6;
  for(let i = 0; i < o; i++){ out += `<rect x="${x + (i % 5) * 9}" y="${6 + Math.floor(i / 5) * 9}" width="7" height="7" fill="#bbf7d0" stroke="#15803d" stroke-width=".6"/>`; }
  x += 50;
  return `<svg viewBox="0 0 ${Math.max(x, 120)} 82" class="pic">${out}</svg>`;
}
function fracSVG(n, k){
  // circle cut into n equal parts, k shaded
  let out = '';
  if(n === 1) return `<svg viewBox="0 0 120 120" class="pic" style="max-width:150px"><circle cx="60" cy="60" r="54" fill="${k ? '#fb923c' : '#fff'}" stroke="#7c2d12" stroke-width="2"/></svg>`;
  for(let i = 0; i < n; i++){
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
    const x0 = 60 + 54 * Math.cos(a0), y0 = 60 + 54 * Math.sin(a0), x1 = 60 + 54 * Math.cos(a1), y1 = 60 + 54 * Math.sin(a1);
    out += `<path d="M60 60 L${x0} ${y0} A54 54 0 ${1 / n > .5 ? 1 : 0} 1 ${x1} ${y1} Z" fill="${i < k ? '#fb923c' : '#fff'}" stroke="#7c2d12" stroke-width="2"/>`;
  }
  return `<svg viewBox="0 0 120 120" class="pic" style="max-width:150px">${out}</svg>`;
}
function barSVG(labels, vals){
  const max = Math.max(...vals), W = 60 * labels.length + 40;
  const top = Math.ceil(max / 5) * 5 || 5;
  let out = '';
  for(let g = 0; g <= top; g += (top > 20 ? 5 : top > 10 ? 2 : 1)){ const y = 170 - g / top * 140; out += `<line x1="34" x2="${W}" y1="${y}" y2="${y}" stroke="#e5e7eb"/><text x="28" y="${y + 4}" font-size="10" text-anchor="end" fill="#555">${g}</text>`; }
  labels.forEach((l, i) => { const h = vals[i] / top * 140; out += `<rect x="${46 + i * 60}" y="${170 - h}" width="36" height="${h}" fill="${['#3b2fc9','#0b7a75','#b3541e','#a4133c','#7c5e10'][i % 5]}" rx="3"/><text x="${64 + i * 60}" y="188" font-size="18" text-anchor="middle">${l}</text>`; });
  return `<svg viewBox="0 0 ${W} 196" class="pic">${out}<line x1="34" y1="170" x2="${W}" y2="170" stroke="#333"/></svg>`;
}
function rectGrid(w, h){
  const c = 22; let out = '';
  for(let i = 0; i < w; i++) for(let j = 0; j < h; j++) out += `<rect x="${10 + i * c}" y="${10 + j * c}" width="${c}" height="${c}" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1"/>`;
  return `<svg viewBox="0 0 ${w * c + 20} ${h * c + 20}" class="pic" style="max-width:${Math.min(360, w * c + 20)}px">${out}</svg>`;
}
function angleSVG(d){
  const r = d * Math.PI / 180, x = 40 + 110 * Math.cos(r), y = 130 - 110 * Math.sin(r);
  return `<svg viewBox="0 0 200 150" class="pic" style="max-width:240px"><line x1="40" y1="130" x2="180" y2="130" stroke="#14213d" stroke-width="4" stroke-linecap="round"/><line x1="40" y1="130" x2="${x}" y2="${y}" stroke="#14213d" stroke-width="4" stroke-linecap="round"/>${d === 90 ? `<rect x="40" y="108" width="22" height="22" fill="none" stroke="#b3541e" stroke-width="2.5"/>` : `<path d="M ${40 + 26} 130 A 26 26 0 ${d > 180 ? 1 : 0} 0 ${40 + 26 * Math.cos(r)} ${130 - 26 * Math.sin(r)}" fill="none" stroke="#b3541e" stroke-width="2.5"/>`}</svg>`;
}
const MONEY = {c1:'#d4a017', c2:'#c0c0c0', c5:'#d4a017', c10:'#b87333', n10:'#b5835a', n20:'#e8a33d', n50:'#39b6c4', n100:'#9b8bd6', n200:'#f5b942', n500:'#9aa0a6'};
function moneySVG(items){
  let x = 6, out = '';
  items.forEach(it => {
    if(it.t === 'c'){ out += `<circle cx="${x + 20}" cy="40" r="19" fill="${MONEY['c' + it.v]}" stroke="#555" stroke-width="1.5"/><text x="${x + 20}" y="46" text-anchor="middle" font-size="15" font-weight="800" fill="#222">₹${it.v}</text>`; x += 46; }
    else { out += `<rect x="${x}" y="14" width="78" height="52" rx="5" fill="${MONEY['n' + it.v]}" stroke="#555" stroke-width="1.5"/><text x="${x + 39}" y="47" text-anchor="middle" font-size="18" font-weight="800" fill="#222">₹${it.v}</text>`; x += 86; }
  });
  return `<svg viewBox="0 0 ${Math.max(x, 60)} 80" class="pic">${out}</svg>`;
}
function lineCompare(a, b, ea, eb){
  const s = 26;
  return `<svg viewBox="0 0 ${Math.max(a, b) * s + 90} 110" class="pic"><text x="4" y="36" font-size="22">${ea}</text><rect x="40" y="18" width="${a * s}" height="22" rx="6" fill="#60a5fa"/><text x="4" y="86" font-size="22">${eb}</text><rect x="40" y="68" width="${b * s}" height="22" rx="6" fill="#f59e0b"/></svg>`;
}

/* ---------- MATHS ---------- */
const TAMIL_NUM_WORDS = ['','ஒன்று','இரண்டு','மூன்று','நான்கு','ஐந்து','ஆறு','ஏழு','எட்டு','ஒன்பது','பத்து'];
const G_ = {};

G_.count = {
  title: S('எண்ணிப் பார்!', 'Count them!'), icon:'🔢',
  intro: S('ஒவ்வொரு பொருளையும் விரலால் தொட்டு "ஒன்று, இரண்டு, மூன்று…" என்று சொல். கடைசியாகச் சொன்ன எண்ணே மொத்தம்.', 'Touch each object and say "one, two, three…". The last number you say is the total.'),
  gen(L){ const max = L.max || 10, n = ri(1, max), e = pick(EMO);
    return {p:S('எத்தனை உள்ளன?', 'How many are there?'), scene: emojiGrid(e, n), opts: numOpts(n, [n - 1, n + 1, n + 2, n - 2], 4, 1), ans:n,
      ex:S(`ஒவ்வொன்றாக எண்ணினால் ${n}.`, `Counting one by one gives ${n}.`), check:q => q.ans === n}; }
};
G_.compare = {
  title: S('எது அதிகம்?', 'Which has more?'), icon:'⚖️',
  intro: S('இரண்டு கூட்டத்தையும் எண்ணு. பெரிய எண் = அதிகம்.', 'Count both groups. The bigger number means more.'),
  gen(L){ const max = L.max || 10; let a = ri(1, max), b = ri(1, max); const e1 = pick(EMO), e2 = pick(EMO);
    const ans = a > b ? 'A' : a < b ? 'B' : '=';
    return {p:S('எந்தக் கூட்டத்தில் அதிகம்?', 'Which group has more?'),
      scene:`<div class="two"><div><b>A</b>${emojiGrid(e1, a)}</div><div><b>B</b>${emojiGrid(e2, b)}</div></div>`,
      opts:[{v:'A', h:'A'}, {v:'B', h:'B'}, {v:'=', h:'= (சமம் / equal)'}], ans,
      ex:S(`A-ல் ${a}, B-ல் ${b}. ${ans === '=' ? 'இரண்டும் சமம்.' : (ans === 'A' ? 'A' : 'B') + '-ல் அதிகம்.'}`, `A has ${a}, B has ${b}. ${ans === '=' ? 'They are equal.' : (ans === 'A' ? 'A' : 'B') + ' has more.'}`)}; }
};
G_.neighbours = {
  title: S('முன்னும் பின்னும்', 'Before and after'), icon:'↔️',
  intro: S('எண் கோட்டில் ஒரு எண்ணுக்கு அடுத்தது = +1, முந்தையது = −1.', 'On the number line, the number after = +1, the number before = −1.'),
  gen(L){ const max = L.max || 20, n = ri(2, max - 1), after = Math.random() < .5, ans = after ? n + 1 : n - 1;
    return {p: after ? S(`${fmt(n)}-க்கு அடுத்த எண் எது?`, `Which number comes after ${fmt(n)}?`) : S(`${fmt(n)}-க்கு முந்தைய எண் எது?`, `Which number comes before ${fmt(n)}?`),
      scene:`<div class="nl">${[n - 2, n - 1, n, n + 1, n + 2].map(x => `<span class="${x === n ? 'on' : ''}">${x === ans ? '?' : (x >= 0 ? fmt(x) : '')}</span>`).join('')}</div>`,
      opts: numOpts(ans, [n, n + 2, n - 2, ans + 10, ans - 10], 4, 0), ans,
      ex:S(`${fmt(n)} ${after ? '+ 1' : '− 1'} = ${fmt(ans)}`, `${fmt(n)} ${after ? '+ 1' : '− 1'} = ${fmt(ans)}`)}; }
};
G_.add = {
  title: S('கூட்டல்', 'Addition'), icon:'➕',
  intro: S('கூட்டல் = இரண்டு கூட்டங்களை ஒன்றாகச் சேர்ப்பது. பெரிய எண்களில் ஒன்றுகள், பத்துகள், நூறுகள் — வலமிருந்து இடமாகக் கூட்டு; 10 வந்தால் அடுத்த இடத்திற்கு 1 "கொண்டு செல்".', 'Adding = putting two groups together. For big numbers add ones, tens, hundreds from right to left; if a column makes 10 or more, carry 1 to the next place.'),
  gen(L){
    if(L.pic){ const a = ri(1, L.max - 1), b = ri(1, L.max - a), e = pick(EMO);
      return {p:S(`${a} + ${b} = ?`, `${a} + ${b} = ?`), scene:`<div class="two"><div>${emojiGrid(e, a)}</div><div style="font-size:28px">+</div><div>${emojiGrid(e, b)}</div></div>`,
        opts: numOpts(a + b, [a + b + 1, a + b - 1, a, b], 4, 0), ans:a + b, ex:S(`${a}-உடன் ${b} சேர்த்தால் ${a + b}.`, `${a} together with ${b} makes ${a + b}.`)}; }
    const lo = L.lo || 10, hi = L.hi || 99; let a = ri(lo, hi), b = ri(lo, hi);
    if(L.sumMax) while(a + b > L.sumMax){ a = ri(lo, hi); b = ri(lo, hi); }
    const s = a + b;
    // common mistakes: forgetting to carry
    const noCarry = Number(String(a).padStart(6, '0').split('').map((d, i) => (Number(d) + Number(String(b).padStart(6, '0')[i])) % 10).join(''));
    return {p:S(`${fmt(a)} + ${fmt(b)} = ?`, `${fmt(a)} + ${fmt(b)} = ?`), scene:colOp(a, b, '+'), opts: numOpts(s, [noCarry, s + 10, s - 10, s + 1, s - 1, s + 100], 4, 0), ans:s,
      ex:S(`ஒன்றுகளிலிருந்து தொடங்கி, இடம் வாரியாகக் கூட்டு: ${fmt(a)} + ${fmt(b)} = ${fmt(s)}.`, `Start from the ones and add place by place: ${fmt(a)} + ${fmt(b)} = ${fmt(s)}.`), check:q => q.ans === a + b}; }
};
function colOp(a, b, op){
  const w = Math.max(String(a).length, String(b).length) + 1;
  const pad = x => String(x).padStart(w, ' ').split('').map(c => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  return `<div class="col"><div>${pad(a)}</div><div>${op}${pad(b).slice(0)}</div><div class="bar"></div><div>${'<span>?</span>'.repeat(1)}</div></div>`;
}
G_.sub = {
  title: S('கழித்தல்', 'Subtraction'), icon:'➖',
  intro: S('கழித்தல் = எடுத்துவிடுதல். ஒன்றுகள் இடத்தில் போதவில்லையென்றால், பத்துகள் இடத்திலிருந்து 1 பத்தை "கடன்" வாங்கு (அது 10 ஒன்றுகள்).', 'Subtracting = taking away. If the ones place is too small, borrow 1 ten from the tens place (it becomes 10 ones).'),
  gen(L){
    if(L.pic){ const a = ri(2, L.max), b = ri(1, a - 1), e = pick(EMO);
      return {p:S(`${a} − ${b} = ?`, `${a} − ${b} = ?`), scene:`<div class="emo">${Array(a).fill(0).map((_, i) => `<span style="${i >= a - b ? 'opacity:.25;text-decoration:line-through' : ''}">${e}</span>`).join(' ')}</div>`,
        opts: numOpts(a - b, [a - b + 1, a - b - 1, a + b, b], 4, 0), ans:a - b, ex:S(`${a}-லிருந்து ${b}-ஐ எடுத்தால் மீதம் ${a - b}.`, `Take ${b} away from ${a} and ${a - b} are left.`)}; }
    const lo = L.lo || 10, hi = L.hi || 99; let a = ri(lo, hi), b = ri(lo, hi); if(b > a) [a, b] = [b, a];
    const d = a - b;
    const noBorrow = Number(String(a).padStart(6, '0').split('').map((x, i) => Math.abs(Number(x) - Number(String(b).padStart(6, '0')[i]))).join(''));
    return {p:S(`${fmt(a)} − ${fmt(b)} = ?`, `${fmt(a)} − ${fmt(b)} = ?`), scene:colOp(a, b, '−'), opts: numOpts(d, [noBorrow, d + 10, d - 10, d + 1, d - 1], 4, 0), ans:d,
      ex:S(`${fmt(a)} − ${fmt(b)} = ${fmt(d)}. சரிபார்: ${fmt(d)} + ${fmt(b)} = ${fmt(a)} ✓`, `${fmt(a)} − ${fmt(b)} = ${fmt(d)}. Check: ${fmt(d)} + ${fmt(b)} = ${fmt(a)} ✓`), check:q => q.ans + b === a}; }
};
G_.placeBlocks = {
  title: S('இடமதிப்புக் கட்டைகள்', 'Place-value blocks'), icon:'🧱',
  intro: S('பெரிய சதுரம் = 100 (நூறு), நீண்ட குச்சி = 10 (பத்து), சிறிய கட்டை = 1 (ஒன்று). ஒவ்வொன்றையும் எண்ணி, மதிப்பால் பெருக்கிக் கூட்டு.', 'Big square = 100, long rod = 10, small cube = 1. Count each kind, multiply by its value, and add.'),
  gen(L){ const h = L.hundreds ? ri(0, L.hundreds) : 0, t = ri(h ? 0 : 1, 9), o = ri(0, 9), n = h * 100 + t * 10 + o;
    return {p:S('இந்தக் கட்டைகள் காட்டும் எண் எது?', 'Which number do these blocks show?'), scene:blocksSVG(h, t, o),
      opts: numOpts(n, [h * 100 + o * 10 + t, n + 10, n - 10, n + 1, n + 100, h + t * 10 + o * 100].filter(x => x !== n), 4, 0), ans:n,
      ex:S(`${h ? h + ' நூறு + ' : ''}${t} பத்து + ${o} ஒன்று = ${n}`, `${h ? h + ' hundreds + ' : ''}${t} tens + ${o} ones = ${n}`), check:q => q.ans === n}; }
};
G_.placeValue = {
  title: S('இலக்கத்தின் மதிப்பு', 'Value of a digit'), icon:'🏷️',
  intro: S('ஒரு இலக்கத்தின் மதிப்பு அது இருக்கும் இடத்தைப் பொறுத்தது. 4,732-ல் 7 நூறுகள் இடத்தில் உள்ளது — அதன் மதிப்பு 700.', 'A digit’s value depends on its place. In 4,732 the 7 is in the hundreds place — its value is 700.'),
  gen(L){ const digits = L.digits || 4; let n; do { n = ri(Math.pow(10, digits - 1), Math.pow(10, digits) - 1); } while(new Set(String(n)).size < digits);
    const s = String(n), i = ri(0, digits - 1), d = Number(s[i]), placePow = digits - 1 - i;
    if(d === 0) return this.gen(L);
    const val = d * Math.pow(10, placePow);
    const names = [S('ஒன்றுகள்','ones'), S('பத்துகள்','tens'), S('நூறுகள்','hundreds'), S('ஆயிரங்கள்','thousands'), S('பத்தாயிரங்கள்','ten-thousands')];
    return {p:S(`${fmt(n)} என்ற எண்ணில் ${d}-ன் இடமதிப்பு என்ன?`, `In ${fmt(n)}, what is the place value of ${d}?`),
      scene:`<div class="big">${s.split('').map((c, j) => `<span class="${j === i ? 'hl' : ''}">${c}</span>`).join('')}</div>`,
      opts: shuffle([0,1,2,3,4,5].slice(0, Math.max(4, digits)).map(k => d * Math.pow(10, k)).filter(v => v !== val).slice(0, 3).concat([val])).map(v => ({v, h:fmt(v)})), ans:val,
      ex:S(`${d} ${names[placePow].ta} இடத்தில் உள்ளது → ${d} × ${fmt(Math.pow(10, placePow))} = ${fmt(val)}`, `${d} is in the ${names[placePow].en} place → ${d} × ${fmt(Math.pow(10, placePow))} = ${fmt(val)}`), check:q => q.ans === val}; }
};
G_.skip = {
  title: S('எண் வரிசைப் புதிர்', 'Number patterns'), icon:'🐸',
  intro: S('தவளை ஒவ்வொரு முறையும் ஒரே அளவு தாவுகிறது. இரண்டு எண்களுக்கு இடையிலான வேறுபாட்டைக் கண்டுபிடி — அதுவே விதி.', 'The frog jumps the same amount every time. Find the difference between two numbers — that is the rule.'),
  gen(L){ const steps = L.steps || [2, 5, 10]; const st = pick(steps), dir = L.down && Math.random() < .4 ? -1 : 1;
    let start = ri(L.startMin || 0, L.startMax || 20); if(dir < 0) start += st * 6;
    const seq = [0,1,2,3].map(i => start + dir * st * i), ans = start + dir * st * 4;
    return {p:S('அடுத்த எண் எது?', 'What comes next?'), scene:`<div class="nl">${seq.map(x => `<span>${fmt(x)}</span>`).join('')}<span class="on">?</span></div>`,
      opts: numOpts(ans, [ans + st, ans - st, ans + 1, ans - 1, seq[3] + 1], 4, 0), ans,
      ex:S(`ஒவ்வொரு முறையும் ${dir > 0 ? '+' : '−'}${st}. ${fmt(seq[3])} ${dir > 0 ? '+' : '−'} ${st} = ${fmt(ans)}`, `Each time ${dir > 0 ? '+' : '−'}${st}. ${fmt(seq[3])} ${dir > 0 ? '+' : '−'} ${st} = ${fmt(ans)}`), check:q => q.ans === seq[3] + dir * st}; }
};
G_.shapePattern = {
  title: S('வடிவ வரிசை', 'Shape patterns'), icon:'🔺',
  intro: S('எந்தப் பகுதி திரும்பத் திரும்ப வருகிறது என்று பார் — அதுவே pattern.', 'See which part repeats again and again — that is the pattern.'),
  gen(){ const sets = [['🔴','🔵'],['⭐','🌙'],['🔺','🟩','🟡'],['🍎','🍌'],['🐱','🐶','🐭'],['🟦','🟦','🟥'],['🌸','🍃','🍃']];
    const core = pick(sets), len = 7 + ri(0, 2), seq = Array.from({length: len}, (_, i) => core[i % core.length]), ans = core[len % core.length];
    const pool = [...new Set(core.concat(['🟣','⬛','🔶','🍇']))];
    return {p:S('அடுத்து எது வரும்?', 'What comes next?'), scene:`<div class="emo" style="font-size:34px">${seq.join(' ')} <span class="qbox">?</span></div>`,
      opts: strOpts(ans, pool, Math.min(4, pool.length)), ans, ex:S(`திரும்பி வரும் பகுதி: ${core.join(' ')}`, `The repeating part: ${core.join(' ')}`)}; }
};
const SHAPES = {
  circle:{ta:'வட்டம்', en:'Circle', svg:'<circle cx="60" cy="60" r="45" fill="#fca5a5" stroke="#7f1d1d" stroke-width="3"/>', sides:0},
  square:{ta:'சதுரம்', en:'Square', svg:'<rect x="18" y="18" width="84" height="84" fill="#93c5fd" stroke="#1e3a8a" stroke-width="3"/>', sides:4},
  triangle:{ta:'முக்கோணம்', en:'Triangle', svg:'<polygon points="60,14 108,104 12,104" fill="#86efac" stroke="#14532d" stroke-width="3"/>', sides:3},
  rectangle:{ta:'செவ்வகம்', en:'Rectangle', svg:'<rect x="6" y="32" width="108" height="58" fill="#fde68a" stroke="#78350f" stroke-width="3"/>', sides:4},
  pentagon:{ta:'ஐங்கோணம்', en:'Pentagon', svg:'<polygon points="60,10 110,46 91,106 29,106 10,46" fill="#c4b5fd" stroke="#4c1d95" stroke-width="3"/>', sides:5},
  hexagon:{ta:'அறுங்கோணம்', en:'Hexagon', svg:'<polygon points="33,14 87,14 114,60 87,106 33,106 6,60" fill="#fdba74" stroke="#7c2d12" stroke-width="3"/>', sides:6}
};
G_.shapes = {
  title: S('வடிவங்கள்', 'Shapes'), icon:'🟦',
  intro: S('பக்கங்களையும் மூலைகளையும் எண்ணு. வட்டத்திற்கு மூலை இல்லை. சதுரத்தின் 4 பக்கங்களும் சமம்; செவ்வகத்தில் எதிர்ப்பக்கங்கள் மட்டும் சமம்.', 'Count the sides and corners. A circle has no corners. A square has 4 equal sides; a rectangle has only opposite sides equal.'),
  gen(L){ const keys = L.keys || ['circle','square','triangle','rectangle'], k = pick(keys), sh = SHAPES[k];
    if(L.sides && sh.sides){ return {p:S('இந்த வடிவத்திற்கு எத்தனை பக்கங்கள்?', 'How many sides does this shape have?'), scene:`<svg viewBox="0 0 120 120" class="pic" style="max-width:160px">${sh.svg}</svg>`,
      opts: numOpts(sh.sides, [3,4,5,6,8], 4, 3), ans:sh.sides, ex:S(`${sh.ta}க்கு ${sh.sides} பக்கங்கள்.`, `A ${sh.en.toLowerCase()} has ${sh.sides} sides.`)}; }
    return {p:S('இந்த வடிவத்தின் பெயர் என்ன?', 'What is this shape called?'), scene:`<svg viewBox="0 0 120 120" class="pic" style="max-width:160px">${sh.svg}</svg>`,
      opts: shuffle([k].concat(shuffle(keys.filter(x => x !== k)).slice(0, 3))).map(v => ({v, h:`${SHAPES[v].ta} / ${SHAPES[v].en}`})), ans:k,
      ex:S(`இது ${sh.ta}.`, `This is a ${sh.en.toLowerCase()}.`)}; }
};
const SOLIDS = [{k:'cube', ta:'கனசதுரம்', en:'Cube', e:'🎲'}, {k:'sphere', ta:'கோளம்', en:'Sphere', e:'⚽'}, {k:'cylinder', ta:'உருளை', en:'Cylinder', e:'🥫'}, {k:'cone', ta:'கூம்பு', en:'Cone', e:'🍦'}, {k:'cuboid', ta:'கனச்செவ்வகம்', en:'Cuboid', e:'📦'}];
G_.solids = {
  title: S('திண்ம வடிவங்கள்', 'Solid shapes'), icon:'🎲',
  intro: S('நம்மைச் சுற்றியுள்ள பொருட்கள் திண்ம வடிவங்கள்: பந்து = கோளம், தாயக்கட்டை = கனசதுரம், டப்பா = உருளை, ஐஸ்கிரீம் கூம்பு = கூம்பு, பெட்டி = கனச்செவ்வகம்.', 'Things around us are solid shapes: ball = sphere, dice = cube, tin = cylinder, ice-cream cone = cone, box = cuboid.'),
  gen(){ const s = pick(SOLIDS);
    return {p:S('இந்தப் பொருளின் வடிவம் என்ன?', 'What shape is this object?'), scene:`<div class="emo" style="font-size:64px">${s.e}</div>`,
      opts: shuffle([s].concat(shuffle(SOLIDS.filter(x => x !== s)).slice(0, 3))).map(x => ({v:x.k, h:`${x.ta} / ${x.en}`})), ans:s.k, ex:S(`${s.e} → ${s.ta}`, `${s.e} → ${s.en}`)}; }
};
const pad2 = n => String(n).padStart(2, '0');
G_.clock = {
  title: S('மணி பார்!', 'Tell the time'), icon:'🕒',
  intro: S('சிறிய முள் (சிவப்பு) = மணி. பெரிய முள் (பச்சை) = நிமிடம். பெரிய முள் 12-ல் இருந்தால் "சரியாக" மணி; 6-ல் இருந்தால் "அரை"; ஒவ்வொரு எண்ணும் 5 நிமிடம்.', 'Short hand (red) = hour. Long hand (green) = minutes. Long hand on 12 → "o’clock"; on 6 → "half past"; each number is 5 minutes.'),
  gen(L){ const step = L.step || 30, h = ri(1, 12), m = step * ri(0, 60 / step - 1);
    const ans = `${h}:${pad2(m)}`;
    const cands = [`${h}:${pad2((m + 30) % 60)}`, `${h % 12 + 1}:${pad2(m)}`, `${(h + 10) % 12 + 1}:${pad2(m)}`, `${m / 5 || 12}:${pad2(h * 5 % 60)}`, `${h}:${pad2((m + step) % 60)}`];
    return {p:S('கடிகாரம் காட்டும் நேரம் என்ன?', 'What time does the clock show?'), scene:clockSVG(h, m), opts: strOpts(ans, cands.filter(c => c !== ans)), ans,
      ex:S(`சிறிய முள் ${m === 0 ? h + '-ல்' : h + '-க்கும் ' + (h % 12 + 1) + '-க்கும் இடையில்'}, பெரிய முள் ${m / 5 || 12}-ல் (${m} நிமிடம்) → ${ans}`, `Short hand ${m === 0 ? 'on ' + h : 'between ' + h + ' and ' + (h % 12 + 1)}, long hand on ${m / 5 || 12} (${m} minutes) → ${ans}`), check:q => q.ans === `${h}:${pad2(m)}`}; }
};
G_.duration = {
  title: S('எவ்வளவு நேரம்?', 'How long?'), icon:'⏳',
  intro: S('முதலில் முழு மணிநேரங்களை எண்ணு, பிறகு மீதமுள்ள நிமிடங்களை. 1 மணி = 60 நிமிடம்.', 'Count the whole hours first, then the leftover minutes. 1 hour = 60 minutes.'),
  gen(){ const sh = ri(6, 15), sm = 5 * ri(0, 11), dur = 5 * ri(4, 60), end = sh * 60 + sm + dur, eh = Math.floor(end / 60), em = end % 60;
    const t = (h, m) => `${h > 12 ? h - 12 : h}:${pad2(m)} ${h >= 12 ? 'PM' : 'AM'}`;
    const fmtD = d => `${Math.floor(d / 60)} h ${d % 60} min`;
    const ans = fmtD(dur);
    return {p:S(`${t(sh, sm)} முதல் ${t(eh, em)} வரை எவ்வளவு நேரம்?`, `How long is it from ${t(sh, sm)} to ${t(eh, em)}?`), scene:`<div class="emo">🕘 ➜ 🕒</div>`,
      opts: strOpts(ans, [fmtD(dur + 60), fmtD(Math.max(5, dur - 60)), fmtD(dur + 10), fmtD(Math.max(5, dur - 10)), fmtD(dur + 40)]), ans,
      ex:S(`${t(sh, sm)} + ${Math.floor(dur / 60)} மணி ${dur % 60} நிமிடம் = ${t(eh, em)}`, `${t(sh, sm)} + ${Math.floor(dur / 60)} h ${dur % 60} min = ${t(eh, em)}`), check:q => q.ans === fmtD(end - (sh * 60 + sm))}; }
};
G_.money = {
  title: S('பணம் எண்ணு', 'Count the money'), icon:'💰',
  intro: S('பெரிய மதிப்புள்ள தாள்களிலிருந்து தொடங்கி, ஒவ்வொன்றையும் கூட்டிக்கொண்டே வா.', 'Start from the biggest notes and keep adding each one.'),
  gen(L){ const kinds = L.kinds || [{t:'c', v:1},{t:'c', v:2},{t:'c', v:5},{t:'c', v:10}], cnt = ri(2, L.count || 4);
    const items = Array.from({length: cnt}, () => pick(kinds)).sort((a, b) => b.v - a.v), tot = items.reduce((s, x) => s + x.v, 0);
    return {p:S('மொத்தம் எவ்வளவு ரூபாய்?', 'How many rupees in all?'), scene:moneySVG(items), opts: numOpts(tot, [tot + 1, tot - 1, tot + 5, tot - 5, tot + 10, tot - 10], 4, 1).map(o => ({v:o.v, h:'₹' + o.h})), ans:tot,
      ex:S(items.map(x => '₹' + x.v).join(' + ') + ` = ₹${tot}`, items.map(x => '₹' + x.v).join(' + ') + ` = ₹${tot}`), check:q => q.ans === items.reduce((s, x) => s + x.v, 0)}; }
};
G_.change = {
  title: S('கடை விளையாட்டு — மீதி சில்லறை', 'Shop game — the change'), icon:'🛒',
  intro: S('மீதி = கொடுத்த பணம் − பொருளின் விலை. கடைக்காரரைப் போல, விலையிலிருந்து மேல் நோக்கி எண்ணியும் சரிபார்க்கலாம்.', 'Change = money given − price. You can also check like a shopkeeper by counting up from the price.'),
  gen(L){ const items = [['🍌','வாழைப்பழம்','bananas'],['📓','நோட்டு','notebook'],['🥛','பால்','milk'],['🍫','சாக்லேட்','chocolate'],['✏️','பென்சில்கள்','pencils'],['🧃','பழச்சாறு','juice']];
    const it = pick(items), given = pick(L.notes || [20, 50, 100]), price = ri(Math.ceil(given * .2), given - 1), ch = given - price;
    return {p:S(`${it[1]} விலை ₹${price}. நீ ₹${given} கொடுத்தாய். மீதி எவ்வளவு?`, `The ${it[2]} costs ₹${price}. You pay ₹${given}. How much change?`), scene:`<div class="emo" style="font-size:54px">${it[0]}</div>${moneySVG([{t:'n', v:given}])}`,
      opts: numOpts(ch, [ch + 10, ch - 10, ch + 1, ch - 1, price], 4, 0).map(o => ({v:o.v, h:'₹' + o.h})), ans:ch,
      ex:S(`₹${given} − ₹${price} = ₹${ch}`, `₹${given} − ₹${price} = ₹${ch}`), check:q => q.ans + price === given}; }
};
G_.longer = {
  title: S('எது நீளம்?', 'Which is longer?'), icon:'📏',
  intro: S('இரண்டையும் ஒரே இடத்திலிருந்து தொடங்கி வைத்து ஒப்பிடு — எது அதிக தூரம் செல்கிறதோ அதுவே நீளம்.', 'Line them up from the same starting point — the one that goes further is longer.'),
  gen(){ let a = ri(3, 11), b = ri(3, 11); while(a === b) b = ri(3, 11); const [ea, eb] = shuffle(['🐍','🚂','🪱','🦒','🥖','✏️']).slice(0, 2);
    const ans = a > b ? 'A' : 'B';
    return {p:S('எந்தப் பட்டை நீளமானது?', 'Which strip is longer?'), scene:lineCompare(a, b, 'A', 'B'), opts:[{v:'A', h:'A (நீலம் / blue)'}, {v:'B', h:'B (மஞ்சள் / yellow)'}], ans,
      ex:S(`${ans} அதிக தூரம் செல்கிறது.`, `${ans} goes further.`)}; }
};
const UNITS = [
  {big:'m', small:'cm', f:100, ta:['மீட்டர்','சென்டிமீட்டர்']}, {big:'kg', small:'g', f:1000, ta:['கிலோகிராம்','கிராம்']},
  {big:'L', small:'mL', f:1000, ta:['லிட்டர்','மில்லிலிட்டர்']}, {big:'km', small:'m', f:1000, ta:['கிலோமீட்டர்','மீட்டர்']}
];
G_.convert = {
  title: S('அலகு மாற்றம்', 'Converting units'), icon:'⚖️',
  intro: S('1 m = 100 cm, 1 kg = 1000 g, 1 L = 1000 mL, 1 km = 1000 m. பெரிய அலகிலிருந்து சிறியதற்கு → பெருக்கு; சிறியதிலிருந்து பெரியதற்கு → வகு.', '1 m = 100 cm, 1 kg = 1000 g, 1 L = 1000 mL, 1 km = 1000 m. Big unit to small → multiply; small to big → divide.'),
  gen(L){ const u = pick(UNITS.filter(x => (L.units || ['m','kg','L','km']).includes(x.big)));
    if(L.mixed){ const a = ri(1, 9), b = ri(1, u.f - 1), ans = a * u.f + b;
      return {p:S(`${a} ${u.big} ${b} ${u.small} = எத்தனை ${u.small}?`, `${a} ${u.big} ${b} ${u.small} = how many ${u.small}?`), scene:`<div class="emo">${u.big === 'kg' ? '⚖️' : u.big === 'L' ? '🫙' : '📏'}</div>`,
        opts: numOpts(ans, [a * 100 + b, a * 10 + b, a * u.f, ans + u.f, Number(`${a}${b}`)], 4, 1), ans, ex:S(`${a} × ${u.f} + ${b} = ${fmt(ans)} ${u.small}`, `${a} × ${u.f} + ${b} = ${fmt(ans)} ${u.small}`), check:q => q.ans === a * u.f + b}; }
    const a = ri(1, 9), ans = a * u.f;
    return {p:S(`${a} ${u.big} = எத்தனை ${u.small}?`, `${a} ${u.big} = how many ${u.small}?`), scene:`<div class="emo">${u.big === 'kg' ? '⚖️' : u.big === 'L' ? '🫙' : '📏'}</div>`,
      opts: numOpts(ans, [a * 10, a * 100, a * 1000, a * 10000].filter(x => x !== ans), 4, 1), ans, ex:S(`1 ${u.big} = ${u.f} ${u.small}, எனவே ${a} × ${u.f} = ${fmt(ans)}`, `1 ${u.big} = ${u.f} ${u.small}, so ${a} × ${u.f} = ${fmt(ans)}`), check:q => q.ans === a * u.f}; }
};
G_.multiply = {
  title: S('பெருக்கல்', 'Multiplication'), icon:'✖️',
  intro: S('பெருக்கல் = ஒரே எண்ணை மீண்டும் மீண்டும் கூட்டுவது. 3 வரிசையில் ஒவ்வொன்றிலும் 4 = 4 + 4 + 4 = 3 × 4 = 12.', 'Multiplying = adding the same number again and again. 3 rows of 4 = 4 + 4 + 4 = 3 × 4 = 12.'),
  gen(L){ let a, b;
    if(L.table){ a = ri(L.tmin || 2, L.tmax || 5); b = ri(1, 10); }
    else { a = ri(L.alo, L.ahi); b = ri(L.blo, L.bhi); }
    const p = a * b;
    const scene = (L.table && a * b <= 40) ? `<div class="emo" style="font-size:22px">${Array.from({length:a}, () => `<div>${Array(b).fill('🍋').join('')}</div>`).join('')}</div>` : `<div class="big">${fmt(a)} × ${fmt(b)}</div>`;
    return {p:S(`${fmt(a)} × ${fmt(b)} = ?`, `${fmt(a)} × ${fmt(b)} = ?`), scene, opts: numOpts(p, [p + a, p - a, p + b, p - b, a + b, p + 10], 4, 0), ans:p,
      ex:S(L.table ? `${a} வரிசை × ஒவ்வொன்றிலும் ${b} = ${p}` : `${fmt(a)} × ${fmt(b)} = ${fmt(p)}`, L.table ? `${a} rows × ${b} in each = ${p}` : `${fmt(a)} × ${fmt(b)} = ${fmt(p)}`), check:q => q.ans === a * b}; }
};
G_.share = {
  title: S('சமமாகப் பகிர்', 'Share equally'), icon:'🍬',
  intro: S('வகுத்தல் = சமமாகப் பிரித்தல். 12 மிட்டாய்களை 3 பேருக்கு ஒவ்வொன்றாகக் கொடுத்துக்கொண்டே வா — ஒவ்வொருவருக்கும் 4. சரிபார்: 3 × 4 = 12.', 'Dividing = sharing equally. Give 12 sweets to 3 children one at a time — each gets 4. Check: 3 × 4 = 12.'),
  gen(L){ const d = ri(L.dmin || 2, L.dmax || 5), q = ri(L.qmin || 1, L.qmax || 10), r = L.rem ? ri(0, d - 1) : 0, n = d * q + r;
    if(L.rem){ const ans = `${q} r ${r}`;
      return {p:S(`${fmt(n)} ÷ ${d} = ? (ஈவு, மீதி)`, `${fmt(n)} ÷ ${d} = ? (quotient r remainder)`), scene:`<div class="big">${fmt(n)} ÷ ${d}</div>`,
        opts: strOpts(ans, [`${q + 1} r ${r}`, `${q} r ${(r + 1) % d}`, `${q - 1} r ${r + d > 9 ? r : r + d}`, `${q} r ${d}`]), ans,
        ex:S(`${d} × ${q} = ${d * q}; ${n} − ${d * q} = ${r} மீதி`, `${d} × ${q} = ${d * q}; ${n} − ${d * q} = remainder ${r}`), check:q2 => q2.ans === `${Math.floor(n / d)} r ${n % d}`}; }
    const scene = n <= 30 ? `<div class="emo">${emojiGrid('🍬', n, 10)}</div><div class="emo">${Array(d).fill('🧒').join(' ')}</div>` : `<div class="big">${fmt(n)} ÷ ${d}</div>`;
    return {p: n <= 30 ? S(`${n} மிட்டாய்களை ${d} குழந்தைகளுக்குச் சமமாகப் பிரித்தால் ஒவ்வொருவருக்கும் எத்தனை?`, `${n} sweets shared equally among ${d} children. How many each?`) : S(`${fmt(n)} ÷ ${d} = ?`, `${fmt(n)} ÷ ${d} = ?`),
      scene, opts: numOpts(q, [q + 1, q - 1, n - d, d, q * 2], 4, 1), ans:q, ex:S(`${fmt(n)} ÷ ${d} = ${fmt(q)}, ஏனென்றால் ${d} × ${fmt(q)} = ${fmt(n)}`, `${fmt(n)} ÷ ${d} = ${fmt(q)}, because ${d} × ${fmt(q)} = ${fmt(n)}`), check:q2 => q2.ans * d === n}; }
};
G_.fractionName = {
  title: S('பின்னம் — பங்கு', 'Fractions — parts'), icon:'🍕',
  intro: S('முழுமை எத்தனை சம பங்குகளாக வெட்டப்பட்டுள்ளது = கீழ் எண் (பகுதி). எத்தனை பங்குகள் நிறமிடப்பட்டுள்ளன = மேல் எண் (தொகுதி).', 'How many equal parts the whole is cut into = bottom number. How many parts are coloured = top number.'),
  gen(L){ const n = pick(L.dens || [2, 3, 4]), k = ri(1, n - (L.proper === false ? 0 : 1) || 1), ans = `${k}/${n}`;
    const cands = [`${n}/${k}`, `${k}/${n + 1}`, `${n - k}/${n}`, `${k + 1}/${n}`, `1/${k + 1}`].filter(c => c !== ans && !c.startsWith('0/'));
    return {p:S('நிறமிட்ட பகுதி எந்தப் பின்னம்?', 'What fraction is coloured?'), scene:fracSVG(n, k), opts: strOpts(ans, cands), ans,
      ex:S(`${n} சம பங்குகளில் ${k} நிறமிடப்பட்டுள்ளது → ${ans}`, `${k} of ${n} equal parts are coloured → ${ans}`), check:q => q.ans === `${k}/${n}`}; }
};
G_.fractionCompare = {
  title: S('பெரிய பின்னம் எது?', 'Which fraction is bigger?'), icon:'🥧',
  intro: S('கீழ் எண் ஒன்றாக இருந்தால், மேல் எண் பெரியதே பெரிய பின்னம். மேல் எண் 1 ஆக இருந்தால், கீழ் எண் சிறியதே பெரிய பங்கு (2 பேருக்குப் பிரித்த தோசை 4 பேருக்குப் பிரித்ததை விடப் பெரியது!).', 'Same bottom number: the bigger top number wins. Top number 1: the smaller bottom number is the bigger piece (a dosa shared by 2 gives bigger pieces than one shared by 4!).'),
  gen(){ let a, b, n1, n2;
    if(Math.random() < .5){ n1 = n2 = pick([4, 5, 6, 8, 10]); a = ri(1, n1 - 1); do { b = ri(1, n1 - 1); } while(b === a); }
    else { a = b = 1; n1 = pick([2, 3, 4, 5, 6, 8]); do { n2 = pick([2, 3, 4, 5, 6, 8]); } while(n2 === n1); }
    const v1 = a / n1, v2 = b / n2, ans = v1 > v2 ? `${a}/${n1}` : `${b}/${n2}`;
    return {p:S('எது பெரியது?', 'Which is bigger?'), scene:`<div class="two"><div>${fracSVG(n1, a)}<div class="big" style="font-size:22px">${a}/${n1}</div></div><div>${fracSVG(n2, b)}<div class="big" style="font-size:22px">${b}/${n2}</div></div></div>`,
      opts: shuffle([`${a}/${n1}`, `${b}/${n2}`]).map(v => ({v, h:v})), ans, ex:S(`படத்தைப் பார்: ${ans} அதிக இடத்தை நிரப்புகிறது.`, `Look at the pictures: ${ans} covers more.`), check:q => q.ans === (a / n1 > b / n2 ? `${a}/${n1}` : `${b}/${n2}`)}; }
};
G_.fractionAdd = {
  title: S('பின்னக் கூட்டல்', 'Adding fractions'), icon:'➕',
  intro: S('கீழ் எண்கள் ஒன்றாக இருந்தால், மேல் எண்களை மட்டும் கூட்டு; கீழ் எண் மாறாது. 2/8 + 3/8 = 5/8 (8 பங்குகளில் 5).', 'When the bottom numbers match, add only the top numbers; the bottom stays. 2/8 + 3/8 = 5/8 (5 of 8 parts).'),
  gen(){ const n = pick([5, 6, 7, 8, 9, 10, 12]); const a = ri(1, n - 2), b = ri(1, n - 1 - a), ans = `${a + b}/${n}`;
    return {p:S(`${a}/${n} + ${b}/${n} = ?`, `${a}/${n} + ${b}/${n} = ?`), scene:`<div class="two"><div>${fracSVG(n, a)}</div><div style="font-size:28px">+</div><div>${fracSVG(n, b)}</div></div>`,
      opts: strOpts(ans, [`${a + b}/${2 * n}`, `${a + b + 1}/${n}`, `${a * b}/${n}`, `${a + b - 1}/${n}`].filter(x => !x.startsWith('0/'))), ans,
      ex:S(`${a} + ${b} = ${a + b}; கீழ் எண் ${n} மாறாது → ${ans}`, `${a} + ${b} = ${a + b}; the bottom stays ${n} → ${ans}`), check:q => q.ans === `${a + b}/${n}`}; }
};
G_.perimeter = {
  title: S('சுற்றளவு & பரப்பு', 'Perimeter & area'), icon:'🟪',
  intro: S('சுற்றளவு = சுற்றி நடந்தால் கடக்கும் தூரம் = எல்லாப் பக்கங்களின் கூடுதல். பரப்பு = உள்ளே உள்ள சிறிய சதுரங்களின் எண்ணிக்கை = நீளம் × அகலம்.', 'Perimeter = the distance walked all the way round = sum of all sides. Area = the number of small squares inside = length × width.'),
  gen(L){ const w = ri(2, 9), h = ri(2, 6), area = L.area ? (L.area === 'mix' ? Math.random() < .5 : true) : false, ans = area ? w * h : 2 * (w + h);
    return {p: area ? S(`செவ்வகத்தின் பரப்பு எத்தனை சதுர அலகுகள்? (${w} × ${h})`, `What is the area of the rectangle in square units? (${w} × ${h})`) : S(`செவ்வகத்தின் சுற்றளவு எத்தனை அலகுகள்? (நீளம் ${w}, அகலம் ${h})`, `What is the perimeter of the rectangle in units? (length ${w}, width ${h})`),
      scene:rectGrid(w, h), opts: numOpts(ans, [w * h, 2 * (w + h), w + h, w * h + 2, 2 * w + h].filter(x => x !== ans), 4, 1), ans,
      ex: area ? S(`${w} × ${h} = ${w * h} சதுர அலகுகள்`, `${w} × ${h} = ${w * h} square units`) : S(`${w} + ${h} + ${w} + ${h} = ${2 * (w + h)} அலகுகள்`, `${w} + ${h} + ${w} + ${h} = ${2 * (w + h)} units`), check:q => q.ans === (area ? w * h : 2 * (w + h))}; }
};
G_.angles = {
  title: S('கோணங்கள்', 'Angles'), icon:'📐',
  intro: S('செங்கோணம் = 90° (புத்தகத்தின் மூலை போல). அதைவிடச் சிறியது = குறுங்கோணம். 90°-க்கும் 180°-க்கும் இடையில் = விரிகோணம். 180° = நேர்கோணம்.', 'Right angle = 90° (like a book corner). Smaller = acute. Between 90° and 180° = obtuse. 180° = straight angle.'),
  gen(){ const kinds = [{k:'acute', ta:'குறுங்கோணம்', en:'Acute', d:() => ri(20, 75)}, {k:'right', ta:'செங்கோணம்', en:'Right', d:() => 90}, {k:'obtuse', ta:'விரிகோணம்', en:'Obtuse', d:() => ri(105, 165)}, {k:'straight', ta:'நேர்கோணம்', en:'Straight', d:() => 180}];
    const K = pick(kinds), d = K.d();
    return {p:S('இது எந்த வகைக் கோணம்?', 'What kind of angle is this?'), scene:angleSVG(d), opts: kinds.map(x => ({v:x.k, h:`${x.ta} / ${x.en}`})), ans:K.k,
      ex:S(`${d}° → ${K.ta}`, `${d}° → ${K.en}`), check:q => q.ans === (d < 90 ? 'acute' : d === 90 ? 'right' : d < 180 ? 'obtuse' : 'straight')}; }
};
const BAR_ITEMS = ['🥭','🍌','🍎','🍇','🍊'];
G_.graph = {
  title: S('வரைபடம் படி', 'Read the graph'), icon:'📊',
  intro: S('ஒவ்வொரு கம்பத்தின் உச்சியிலிருந்து இடப்பக்க எண்ணுக்குக் கிடைமட்டமாகப் பார் — அதுவே அதன் மதிப்பு.', 'From the top of each bar, look straight across to the numbers on the left — that is its value.'),
  gen(L){ const k = L.n || 4, labels = shuffle(BAR_ITEMS).slice(0, k), max = L.max || 10;
    let vals; do { vals = labels.map(() => ri(1, max)); } while(new Set(vals).size < k);
    const type = pick(L.types || ['most', 'least', 'value', 'diff']);
    const iMax = vals.indexOf(Math.max(...vals)), iMin = vals.indexOf(Math.min(...vals));
    const i = ri(0, k - 1); let j = ri(0, k - 1); while(j === i) j = ri(0, k - 1);
    if(type === 'most') return {p:S('மாணவர்களுக்கு அதிகம் பிடித்த பழம் எது?', 'Which fruit do the most students like?'), scene:barSVG(labels, vals), opts: labels.map(v => ({v, h:`<span style="font-size:26px">${v}</span>`})), ans:labels[iMax], ex:S(`உயரமான கம்பம்: ${labels[iMax]} (${vals[iMax]})`, `Tallest bar: ${labels[iMax]} (${vals[iMax]})`)};
    if(type === 'least') return {p:S('குறைவானவர்களுக்குப் பிடித்த பழம் எது?', 'Which fruit do the fewest students like?'), scene:barSVG(labels, vals), opts: labels.map(v => ({v, h:`<span style="font-size:26px">${v}</span>`})), ans:labels[iMin], ex:S(`குட்டையான கம்பம்: ${labels[iMin]} (${vals[iMin]})`, `Shortest bar: ${labels[iMin]} (${vals[iMin]})`)};
    if(type === 'value') return {p:S(`${labels[i]} எத்தனை பேருக்குப் பிடிக்கும்?`, `How many students like ${labels[i]}?`), scene:barSVG(labels, vals), opts: numOpts(vals[i], [vals[i] + 1, vals[i] - 1, vals[j], vals[i] + 2], 4, 0), ans:vals[i], ex:S(`${labels[i]} கம்பம் ${vals[i]}-ல் முடிகிறது.`, `The ${labels[i]} bar ends at ${vals[i]}.`), check:q => q.ans === vals[i]};
    const dd = Math.abs(vals[i] - vals[j]), big = vals[i] > vals[j] ? i : j, sm = big === i ? j : i;
    return {p:S(`${labels[sm]}-ஐ விட ${labels[big]} எத்தனை பேருக்கு அதிகம் பிடிக்கும்?`, `How many more students like ${labels[big]} than ${labels[sm]}?`), scene:barSVG(labels, vals), opts: numOpts(dd, [vals[big], vals[sm], dd + 1, dd - 1, vals[big] + vals[sm]], 4, 1), ans:dd,
      ex:S(`${vals[big]} − ${vals[sm]} = ${dd}`, `${vals[big]} − ${vals[sm]} = ${dd}`), check:q => q.ans === vals[big] - vals[sm]}; }
};
G_.missing = {
  title: S('மறைந்த எண்', 'The missing number'), icon:'🔍',
  intro: S('□ ஒரு மறைந்த எண். எதிர்ச் செயலைச் செய்: □ + 7 = 15 என்றால் □ = 15 − 7 = 8. □ × 4 = 20 என்றால் □ = 20 ÷ 4 = 5.', '□ is a hidden number. Do the opposite operation: if □ + 7 = 15, then □ = 15 − 7 = 8. If □ × 4 = 20, then □ = 20 ÷ 4 = 5.'),
  gen(L){ const op = pick(L.ops || ['+', '−', '×']); let x, a, b, txt;
    if(op === '+'){ x = ri(1, 60); a = ri(1, 40); b = x + a; txt = `□ + ${a} = ${b}`; }
    else if(op === '−'){ a = ri(1, 40); b = ri(1, 60); x = a + b; txt = `□ − ${a} = ${b}`; }
    else { a = ri(2, 10); x = ri(2, 12); b = a * x; txt = `□ × ${a} = ${b}`; }
    return {p:S(`□ = ? ( ${txt} )`, `□ = ? ( ${txt} )`), scene:`<div class="big">${txt}</div>`, opts: numOpts(x, [x + 1, x - 1, b, a, b + a, x + 10], 4, 0), ans:x,
      ex:S(op === '+' ? `□ = ${b} − ${a} = ${x}` : op === '−' ? `□ = ${b} + ${a} = ${x}` : `□ = ${b} ÷ ${a} = ${x}`, op === '+' ? `□ = ${b} − ${a} = ${x}` : op === '−' ? `□ = ${b} + ${a} = ${x}` : `□ = ${b} ÷ ${a} = ${x}`),
      check:q => op === '+' ? q.ans + a === b : op === '−' ? q.ans - a === b : q.ans * a === b}; }
};
const DAYS = [S('ஞாயிறு','Sunday'), S('திங்கள்','Monday'), S('செவ்வாய்','Tuesday'), S('புதன்','Wednesday'), S('வியாழன்','Thursday'), S('வெள்ளி','Friday'), S('சனி','Saturday')];
const MONTHS = [['ஜனவரி','January',31],['பிப்ரவரி','February',28],['மார்ச்','March',31],['ஏப்ரல்','April',30],['மே','May',31],['ஜூன்','June',30],['ஜூலை','July',31],['ஆகஸ்ட்','August',31],['செப்டம்பர்','September',30],['அக்டோபர்','October',31],['நவம்பர்','November',30],['டிசம்பர்','December',31]];
G_.calendar = {
  title: S('நாட்காட்டி', 'Calendar'), icon:'📅',
  intro: S('வாரத்தில் 7 நாட்கள்: ஞாயிறு, திங்கள், செவ்வாய், புதன், வியாழன், வெள்ளி, சனி — பிறகு மீண்டும் ஞாயிறு. 30 நாள் மாதங்கள்: ஏப்ரல், ஜூன், செப்டம்பர், நவம்பர்.', '7 days in a week: Sunday to Saturday, then Sunday again. 30-day months: April, June, September, November.'),
  gen(L){ if(L.months && Math.random() < .5){ const mi = pick([0,2,3,4,5,6,7,8,9,10,11]), m = MONTHS[mi];
      return {p:S(`${m[0]} மாதத்தில் எத்தனை நாட்கள்?`, `How many days are there in ${m[1]}?`), scene:`<div class="emo">📅</div>`, opts:[30, 31, 28, 29].map(v => ({v, h:String(v)})), ans:m[2],
        ex:S(`${m[0]} = ${m[2]} நாட்கள்`, `${m[1]} has ${m[2]} days`), check:q => q.ans === m[2]}; }
    const d = ri(0, 6), k = ri(1, L.far ? 10 : 3), ans = (d + k) % 7;
    return {p:S(`இன்று ${DAYS[d].ta}. ${k} நாட்களுக்குப் பிறகு என்ன கிழமை?`, `Today is ${DAYS[d].en}. What day is it ${k} day${k > 1 ? 's' : ''} later?`), scene:`<div class="nl">${DAYS.map((x, i) => `<span class="${i === d ? 'on' : ''}" style="font-size:12px">${x.ta.slice(0, 3)}</span>`).join('')}</div>`,
      opts: shuffle([ans, (ans + 1) % 7, (ans + 6) % 7, (ans + 2) % 7]).map(v => ({v, h:`${DAYS[v].ta} / ${DAYS[v].en}`})), ans,
      ex:S(`${DAYS[d].ta}-லிருந்து ${k} நாள் முன்னே எண்ணு → ${DAYS[ans].ta}`, `Count ${k} day${k > 1 ? 's' : ''} on from ${DAYS[d].en} → ${DAYS[ans].en}`), check:q => q.ans === (d + k) % 7}; }
};
G_.oddEven = {
  title: S('ஒற்றை / இரட்டை', 'Odd or even'), icon:'👫',
  intro: S('ஜோடி ஜோடியாகப் பிரிக்க முடிந்தால் இரட்டை எண். ஒன்று தனியாக மீதமிருந்தால் ஒற்றை எண். கடைசி இலக்கம் 0, 2, 4, 6, 8 என்றால் இரட்டை.', 'If you can pair them all up, the number is even. If one is left alone, it is odd. Last digit 0, 2, 4, 6, 8 → even.'),
  gen(L){ const n = ri(1, L.max || 50), ans = n % 2 === 0 ? 'even' : 'odd';
    return {p:S(`${fmt(n)} — ஒற்றையா இரட்டையா?`, `${fmt(n)} — odd or even?`), scene: n <= 20 ? `<div class="emo">${Array.from({length: Math.ceil(n / 2)}, (_, i) => `<span style="display:inline-block;margin:2px;border:1px dashed #999;border-radius:8px;padding:0 3px">${i * 2 + 1 < n ? '🧦🧦' : '🧦'}</span>`).join('')}</div>` : `<div class="big">${fmt(n)}</div>`,
      opts:[{v:'odd', h:'ஒற்றை / Odd'}, {v:'even', h:'இரட்டை / Even'}], ans, ex:S(`கடைசி இலக்கம் ${n % 10} → ${ans === 'even' ? 'இரட்டை' : 'ஒற்றை'}`, `Last digit ${n % 10} → ${ans}`), check:q => q.ans === (n % 2 ? 'odd' : 'even')}; }
};
G_.rounding = {
  title: S('முழுமையாக்கல்', 'Rounding'), icon:'🎯',
  intro: S('அருகிலுள்ள 10-க்கு: ஒன்றுகள் இலக்கம் 5 அல்லது அதற்கு மேல் → மேலே; 4 அல்லது கீழ் → கீழே. 47 → 50, 43 → 40.', 'To the nearest 10: ones digit 5 or more → round up; 4 or less → round down. 47 → 50, 43 → 40.'),
  gen(L){ const to = L.to || 10, n = ri(to + 1, to * 99), ans = Math.round(n / to) * to;
    return {p:S(`${fmt(n)}-ஐ அருகிலுள்ள ${to}-க்கு முழுமையாக்கு`, `Round ${fmt(n)} to the nearest ${to}`), scene:`<div class="big">${fmt(n)}</div>`,
      opts: numOpts(ans, [Math.floor(n / to) * to, Math.ceil(n / to) * to, ans + to, ans - to].filter(x => x !== ans && x >= 0), 3, 0), ans,
      ex:S(`${fmt(n)} → ${fmt(ans)}`, `${fmt(n)} → ${fmt(ans)}`), check:q => q.ans === Math.round(n / to) * to}; }
};
G_.numWordsTa = {
  title: S('எண் சொற்கள்', 'Number words (Tamil)'), icon:'🔤',
  intro: S('1 ஒன்று, 2 இரண்டு, 3 மூன்று, 4 நான்கு, 5 ஐந்து, 6 ஆறு, 7 ஏழு, 8 எட்டு, 9 ஒன்பது, 10 பத்து.', '1 onRu, 2 iraNdu, 3 moonRu, 4 naangu, 5 ainthu, 6 aaRu, 7 eezhu, 8 ettu, 9 onbathu, 10 pathu.'),
  gen(){ const n = ri(1, 10), ans = TAMIL_NUM_WORDS[n];
    return {p:S(`${n} — தமிழில் எப்படி எழுதுவது?`, `${n} — how is it written in Tamil?`), scene:emojiGrid(pick(EMO), n), opts: strOpts(ans, TAMIL_NUM_WORDS.slice(1)), ans, ex:S(`${n} = ${ans}`, `${n} = ${ans}`), say:S(ans, ans), check:q => q.ans === TAMIL_NUM_WORDS[n]}; }
};
const EN_ONES = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const EN_TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const enWord = n => n < 20 ? EN_ONES[n] : EN_TENS[Math.floor(n / 10)] + (n % 10 ? '-' + EN_ONES[n % 10] : '');
G_.numWordsEn = {
  title: S('Number names (English)', 'Number names (English)'), icon:'🔤',
  intro: S('11–19 தனிப் பெயர்கள் (eleven, twelve…). 20-க்கு மேல்: பத்துகள் பெயர் + ஒன்றுகள் பெயர் (forty-seven).', '11–19 have their own names (eleven, twelve…). Above 20: tens name + ones name (forty-seven).'),
  gen(){ const n = ri(11, 99), ans = enWord(n);
    const rev = (n % 10) * 10 + Math.floor(n / 10);
    const c = [rev >= 11 && rev !== n && n % 10 ? enWord(rev) : enWord(n < 99 ? n + 1 : n - 1), enWord(n > 20 ? n - 10 : n + 10), enWord(n < 99 ? n + 1 : n - 2), enWord(n > 11 ? n - 1 : n + 2)].filter(x => x !== ans);
    return {p:S(`${n} = ?`, `${n} = ?`), scene:`<div class="big">${n}</div>`, opts: strOpts(ans, c), ans, ex:S(`${n} = ${ans}`, `${n} = ${ans}`), check:q => q.ans === enWord(n)}; }
};

G.KALVI_MATH = G_;
G.KALVI_UTIL = {S, ri, pick, shuffle, fmt, numOpts, strOpts, emojiGrid, enWord, TAMIL_NUM_WORDS, DAYS, MONTHS};
})(typeof window !== 'undefined' ? window : globalThis);
