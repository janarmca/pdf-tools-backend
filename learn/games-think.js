/* Kalvi Kalanjiyam — Thinking Lab, Life & Values, Nation & Me, Languages (Classes 1–5).
   Puzzles are generated and solved by code; facts are curated and checked. */
(function(G){
'use strict';
const {S, ri, pick, shuffle, numOpts, strOpts, fmt} = G.KALVI_UTIL;
const {pairGame} = G.KALVI_BUILD;
const TH = {};

/* ================= THINKING LAB ================= */
const DIRS = {'↑':[0,-1], '↓':[0,1], '←':[-1,0], '→':[1,0]};
function runProgram(prog, W, H, start, walls){
  let [x, y] = start;
  for(const m of prog){ const d = DIRS[m]; x += d[0]; y += d[1]; if(x < 0 || y < 0 || x >= W || y >= H || walls.has(x + ',' + y)) return null; }
  return [x, y];
}
function bfs(W, H, start, goal, walls){
  const key = p => p[0] + ',' + p[1], prev = new Map([[key(start), null]]), q = [start];
  while(q.length){ const c = q.shift(); if(c[0] === goal[0] && c[1] === goal[1]) break;
    for(const [m, d] of Object.entries(DIRS)){ const n = [c[0] + d[0], c[1] + d[1]], k = key(n);
      if(n[0] < 0 || n[1] < 0 || n[0] >= W || n[1] >= H || walls.has(k) || prev.has(k)) continue; prev.set(k, [c, m]); q.push(n); } }
  if(!prev.has(key(goal))) return null;
  const path = []; let k = key(goal); while(prev.get(k)){ const [c, m] = prev.get(k); path.unshift(m); k = key(c); } return path;
}
G.KALVI_THINK_UTIL = {runProgram, DIRS};
TH.robot = { title:S('Robot-க்கு code எழுது', 'Code the robot'), icon:'🤖',
  intro:S('Robot ஒவ்வொரு அம்புக்குறிக்கும் ஒரு கட்டம் நகரும்: ↑ மேலே, ↓ கீழே, ← இடது, → வலது. பாறையில் மோதக் கூடாது, வெளியே போகக் கூடாது. ⭐-ஐ அடையும் சரியான "program" எது? — இதுதான் coding: கணினிக்குத் தெளிவான படிப்படியான கட்டளைகள் (algorithm).', 'The robot moves one square for each arrow: ↑ up, ↓ down, ← left, → right. It must not hit a rock or leave the board. Which "program" reaches the ⭐? — That is coding: clear step-by-step instructions (an algorithm) for a computer.'),
  gen(L){ const W = L.size || 4, H = L.size || 4, rocks = L.rocks || 2, minLen = L.minLen || 3;
    for(let tries = 0; tries < 200; tries++){
      const start = [0, H - 1]; const goal = [ri(0, W - 1), ri(0, H - 1)]; if(goal[0] === start[0] && goal[1] === start[1]) continue;
      const walls = new Set(); while(walls.size < rocks){ const w = [ri(0, W - 1), ri(0, H - 1)]; const k = w.join(','); if(k !== start.join(',') && k !== goal.join(',')) walls.add(k); }
      const path = bfs(W, H, start, goal, walls); if(!path || path.length < minLen || path.length > (L.maxLen || 8)) continue;
      const ans = path.join(' ');
      const muts = new Set();
      for(let t = 0; t < 60 && muts.size < 6; t++){ const p = path.slice(), r = Math.random();
        if(r < .3){ const i = ri(0, p.length - 1); p[i] = pick(Object.keys(DIRS).filter(d => d !== p[i])); }
        else if(r < .55 && p.length > 1){ p.splice(ri(0, p.length - 1), 1); }
        else if(r < .8){ p.splice(ri(0, p.length), 0, pick(Object.keys(DIRS))); }
        else { const i = ri(0, p.length - 1), j = ri(0, p.length - 1); [p[i], p[j]] = [p[j], p[i]]; }
        const end = runProgram(p, W, H, start, walls), s = p.join(' ');
        if(s !== ans && !(end && end[0] === goal[0] && end[1] === goal[1])) muts.add(s); }
      if(muts.size < 3) continue;
      const c = 46; let cells = '';
      for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){ const k = x + ',' + y; cells += `<rect x="${x * c + 2}" y="${y * c + 2}" width="${c - 4}" height="${c - 4}" rx="8" fill="${(x + y) % 2 ? '#eef2ff' : '#f8fafc'}" stroke="#c7d2fe"/>` + (walls.has(k) ? `<text x="${x * c + c / 2}" y="${y * c + c / 2 + 9}" font-size="26" text-anchor="middle">🪨</text>` : ''); }
      cells += `<text x="${start[0] * c + c / 2}" y="${start[1] * c + c / 2 + 9}" font-size="26" text-anchor="middle">🤖</text><text x="${goal[0] * c + c / 2}" y="${goal[1] * c + c / 2 + 9}" font-size="26" text-anchor="middle">⭐</text>`;
      return {p:S('எந்த program robot-ஐ ⭐-க்குக் கொண்டு செல்லும்?', 'Which program takes the robot to the ⭐?'), scene:`<svg viewBox="0 0 ${W * c + 4} ${H * c + 4}" class="pic" style="max-width:${W * 60}px">${cells}</svg>`,
        opts: shuffle([ans, ...shuffle([...muts]).slice(0, 3)]).map(v => ({v, h:`<span style="font-size:1.35rem;letter-spacing:.08em">${v}</span>`})), ans,
        ex:S(`சரியான program: ${ans}. மற்றவை பாறையில் மோதுகின்றன, வெளியே போகின்றன, அல்லது ⭐-ஐ அடையவில்லை.`, `The right program: ${ans}. The others hit a rock, leave the board, or miss the ⭐.`),
        data:{W, H, start, goal, walls:[...walls]}, check:q => { const e = runProgram(q.ans.split(' '), W, H, start, walls); return !!e && e[0] === goal[0] && e[1] === goal[1]; }};
    }
    throw new Error('robot: could not build a puzzle'); } };
const LOSHU = [[2,7,6],[9,5,1],[4,3,8]];
function symmetries(m){ const rot = a => a[0].map((_, i) => a.map(r => r[i]).reverse()), flip = a => a.map(r => r.slice().reverse()); const out = []; let x = m; for(let i = 0; i < 4; i++){ out.push(x, flip(x)); x = rot(x); } return out; }
TH.magicSquare = { title:S('மாயச் சதுரம்', 'Magic square'), icon:'🔢',
  intro:S('மாயச் சதுரத்தில் ஒவ்வொரு வரிசை, நிரல், மூலைவிட்டம் — எல்லாவற்றின் கூடுதலும் ஒரே எண். முழுமையான ஒரு வரிசையைக் கூட்டி அந்த எண்ணைக் கண்டுபிடி, பிறகு மறைந்த எண்ணைக் கணக்கிடு. (இந்த 3×3 சதுரத்தைப் பண்டைய சீனாவில் “லோ ஷு” என்று அழைத்தனர் — மிகப் பழமையான கணிதப் புதிர்களில் ஒன்று!)', 'In a magic square every row, column and diagonal adds up to the same number. Add up a complete line to find that number, then work out the hidden one. (Ancient China called this 3×3 square the “Lo Shu” — one of the oldest maths puzzles!)'),
  gen(L){ const base = pick(symmetries(LOSHU)), k = L.shift ? ri(1, L.shift) : 0, m = base.map(r => r.map(v => v + k)), total = 15 + 3 * k;
    const r = ri(0, 2), c = ri(0, 2), ans = m[r][c];
    const grid = `<table class="msq">${m.map((row, i) => `<tr>${row.map((v, j) => `<td class="${i === r && j === c ? 'q' : ''}">${i === r && j === c ? '?' : v}</td>`).join('')}</tr>`).join('')}</table>`;
    const rowOthers = m[r].filter((_, j) => j !== c);
    return {p:S('மறைந்த எண் எது?', 'What is the hidden number?'), scene:grid, opts: numOpts(ans, [ans + 1, ans - 1, ans + 2, total - ans, ans + 3], 4, 1), ans,
      ex:S(`ஒவ்வொரு வரிசையின் கூடுதல் = ${total}. ${total} − ${rowOthers.join(' − ')} = ${ans}`, `Every line adds up to ${total}. ${total} − ${rowOthers.join(' − ')} = ${ans}`),
      data:{m, r, c}, check:q => q.ans === total - rowOthers[0] - rowOthers[1]}; } };
const FRUITS = ['🍎','🍌','🥭','🍇','🍋','🥥','🍓'];
TH.balance = { title:S('தராசுப் புதிர்', 'Balance puzzle'), icon:'⚖️',
  intro:S('தராசு சமமாக இருந்தால் இரு பக்க எடையும் சமம். ஒரே பழம் 3 முறை = 12 என்றால், ஒரு பழம் = 12 ÷ 3 = 4. இதுவே இயற்கணிதத்தின் (algebra) தொடக்கம் — தெரியாத ஒன்றைக் கண்டுபிடித்தல்!', 'If the scale balances, both sides weigh the same. If the same fruit 3 times = 12, one fruit = 12 ÷ 3 = 4. This is where algebra begins — finding an unknown!'),
  gen(L){ const [A, B] = shuffle(FRUITS).slice(0, 2);
    if(L.two){ const a = ri(2, 12), b = ri(2, 12), n = ri(2, 3), ans = b;
      return {p:S(`${B} = ?`, `${B} = ?`), scene:`<div class="eqs"><div>${Array(n).fill(A).join(' + ')} = ${n * a}</div><div>${A} + ${B} = ${a + b}</div><div>${B} = <span class="qbox">?</span></div></div>`,
        opts: numOpts(ans, [a, a + b, ans + 1, ans - 1, n * a - ans], 4, 1), ans,
        ex:S(`முதல் வரி: ${A} = ${n * a} ÷ ${n} = ${a}. இரண்டாம் வரி: ${B} = ${a + b} − ${a} = ${b}.`, `Line 1: ${A} = ${n * a} ÷ ${n} = ${a}. Line 2: ${B} = ${a + b} − ${a} = ${b}.`), check:q => q.ans === (a + b) - (n * a) / n}; }
    const n = ri(2, L.maxN || 4), a = ri(1, L.maxV || 10);
    return {p:S(`ஒரு ${A} = ?`, `One ${A} = ?`), scene:`<div class="eqs"><div>${Array(n).fill(A).join(' + ')} = ${n * a}</div></div>`, opts: numOpts(a, [n * a, a + 1, a - 1, n], 4, 1), ans:a,
      ex:S(`${n * a} ÷ ${n} = ${a}`, `${n * a} ÷ ${n} = ${a}`), check:q => q.ans * n === n * a}; } };
TH.sequence = { title:S('அடுத்த எண் — மேதைப் புதிர்', 'What comes next? — genius puzzles'), icon:'🧩',
  intro:S('எண்களுக்கு இடையிலான தொடர்பைத் தேடு: கூட்டலா? பெருக்கலா? இடைவெளி வளர்கிறதா? முந்தைய இரண்டைக் கூட்டுகிறதா? விதியைக் கண்டுபிடித்தால் அடுத்தது தானாகத் தெரியும்.', 'Look for the link between the numbers: adding? multiplying? a growing gap? adding the previous two? Find the rule and the next one follows.'),
  gen(L){ const kinds = L.kinds || ['add','double','squares','grow','fib','triple'], k = pick(kinds); let seq, ans, why;
    if(k === 'add'){ const s0 = ri(1, L.s0 || 20), d = ri(L.dMin || 3, L.dMax || 12); seq = [0,1,2,3,4].map(i => s0 + d * i); ans = s0 + d * 5; why = S(`ஒவ்வொரு முறையும் +${d}`, `+${d} each time`); }
    else if(k === 'double'){ const s0 = ri(1, 5); seq = [0,1,2,3,4].map(i => s0 * Math.pow(2, i)); ans = s0 * 32; why = S('ஒவ்வொன்றும் இரு மடங்கு (× 2)', 'each one doubles (× 2)'); }
    else if(k === 'triple'){ const s0 = ri(1, 3); seq = [0,1,2,3].map(i => s0 * Math.pow(3, i)); ans = s0 * 81; why = S('ஒவ்வொன்றும் மூன்று மடங்கு (× 3)', 'each one triples (× 3)'); }
    else if(k === 'squares'){ const s0 = ri(1, 4); seq = [0,1,2,3,4].map(i => (s0 + i) * (s0 + i)); ans = (s0 + 5) * (s0 + 5); why = S(`வர்க்க எண்கள்: ${s0}×${s0}, ${s0 + 1}×${s0 + 1}, … → ${s0 + 5}×${s0 + 5}`, `square numbers: ${s0}×${s0}, ${s0 + 1}×${s0 + 1}, … → ${s0 + 5}×${s0 + 5}`); }
    else if(k === 'grow'){ const s0 = ri(1, 10); seq = [s0]; for(let i = 1; i < 5; i++) seq.push(seq[i - 1] + i); ans = seq[4] + 5; why = S('இடைவெளி வளர்கிறது: +1, +2, +3, +4, +5', 'the gap grows: +1, +2, +3, +4, +5'); }
    else { const a = ri(1, 3), b = ri(a, 4); seq = [a, b]; while(seq.length < 6) seq.push(seq[seq.length - 1] + seq[seq.length - 2]); ans = seq[4] + seq[5]; why = S('ஒவ்வொன்றும் முந்தைய இரண்டின் கூடுதல் (பிபனாச்சி வரிசை — சூரியகாந்திப் பூவின் விதைகளிலும் இது உண்டு!)', 'each is the sum of the previous two (the Fibonacci sequence — it even appears in sunflower seeds!)'); }
    const last = seq[seq.length - 1];
    return {p:S('அடுத்த எண் எது?', 'What comes next?'), scene:`<div class="nl">${seq.map(x => `<span>${fmt(x)}</span>`).join('')}<span class="on">?</span></div>`,
      opts: numOpts(ans, [last + (last - seq[seq.length - 2]), last * 2, ans + 1, ans - 1, ans + 2], 4, 1), ans, ex:S(`${why.ta} → ${fmt(ans)}`, `${why.en} → ${fmt(ans)}`), data:{seq, k}}; } };
TH.oddOut = { title:S('பொருந்தாதது எது?', 'Which one doesn’t belong?'), icon:'🔍',
  intro:S('ஒரு மடங்கு = அந்த எண்ணின் வாய்ப்பாட்டில் வரும் எண். 5-ன் மடங்குகள் 0 அல்லது 5-ல் முடியும்; 2-ன் மடங்குகள் இரட்டை எண்கள்; 3-ன் மடங்கின் இலக்கங்களைக் கூட்டினால் 3-ன் மடங்கு வரும்!', 'A multiple is a number in that number’s table. Multiples of 5 end in 0 or 5; multiples of 2 are even; the digits of a multiple of 3 add up to a multiple of 3!'),
  gen(L){ const k = pick(L.ks || [2, 3, 4, 5, 6, 9, 10]), max = L.max || 12;
    const mult = shuffle(Array.from({length: max}, (_, i) => k * (i + 1))).slice(0, 3);
    let odd; do { odd = ri(k + 1, k * max); } while(odd % k === 0);
    return {p:S(`எது ${k}-ன் மடங்கு இல்லை?`, `Which one is NOT a multiple of ${k}?`), scene:'', opts: shuffle(mult.concat([odd])).map(v => ({v, h:fmt(v)})), ans:odd,
      ex:S(`${fmt(odd)} ÷ ${k} = ${Math.floor(odd / k)}, மீதி ${odd % k}. மற்றவை மீதியின்றி வகுபடும்.`, `${fmt(odd)} ÷ ${k} = ${Math.floor(odd / k)} remainder ${odd % k}. The others divide exactly.`), check:q => q.ans % k !== 0 && q.opts.filter(o => o.v % k !== 0).length === 1}; } };
const KIDS = [['அருண்','Arun'],['பிரியா','Priya'],['கவின்','Kavin'],['மீனா','Meena'],['ரவி','Ravi'],['லதா','Latha'],['சூர்யா','Surya'],['நிலா','Nila']];
TH.logic = { title:S('தர்க்கப் புதிர்', 'Logic puzzle'), icon:'🕵️',
  intro:S('ஒவ்வொரு தகவலையும் ஒரு வரிசையாக எழுது: "அருண் > பிரியா", "பிரியா > கவின்" என்றால் அருண் > பிரியா > கவின். படம் வரைந்தால் புதிர் எளிது!', 'Write each clue as an order: "Arun > Priya", "Priya > Kavin" means Arun > Priya > Kavin. Drawing it makes the puzzle easy!'),
  gen(L){ const n = L.n || 3, kids = shuffle(KIDS).slice(0, n); // kids[0] tallest … kids[n-1] shortest
    const facts = []; for(let i = 0; i < n - 1; i++) facts.push([kids[i], kids[i + 1]]);
    const tallest = Math.random() < .5, ans = tallest ? kids[0] : kids[n - 1];
    const lines = shuffle(facts).map(([a, b]) => S(`${a[0]}, ${b[0]}-ஐ விட உயரம்.`, `${a[1]} is taller than ${b[1]}.`));
    return {p: tallest ? S('யார் மிக உயரமானவர்?', 'Who is the tallest?') : S('யார் மிகக் குட்டையானவர்?', 'Who is the shortest?'),
      scene:`<div class="clues">${lines.map(l => `<div>🔎 ${l.ta}<br><small>${l.en}</small></div>`).join('')}</div>`,
      opts: shuffle(kids).map(k => ({v:k[1], h:`${k[0]} / ${k[1]}`})), ans:ans[1],
      ex:S(`வரிசை: ${kids.map(k => k[0]).join(' > ')}`, `Order: ${kids.map(k => k[1]).join(' > ')}`), data:{order:kids.map(k => k[1]), tallest},
      check:q => q.ans === (tallest ? kids[0][1] : kids[n - 1][1])}; } };

/* ================= LIFE & VALUES ================= */
const REL = [
  ['அப்பாவின் அப்பா','father’s father','தாத்தா','grandfather'], ['அம்மாவின் அப்பா','mother’s father','தாத்தா','grandfather'],
  ['அப்பாவின் அம்மா','father’s mother','பாட்டி','grandmother'], ['அம்மாவின் அம்மா','mother’s mother','பாட்டி','grandmother'],
  ['அப்பாவின் அண்ணன்','father’s elder brother','பெரியப்பா','uncle (periyappa)'], ['அப்பாவின் தம்பி','father’s younger brother','சித்தப்பா','uncle (chithappa)'],
  ['அம்மாவின் அக்கா','mother’s elder sister','பெரியம்மா','aunt (periyamma)'], ['அம்மாவின் தங்கை','mother’s younger sister','சித்தி','aunt (chithi)'],
  ['அம்மாவின் சகோதரர்','mother’s brother','மாமா','uncle (maama)'], ['அப்பாவின் சகோதரி','father’s sister','அத்தை','aunt (athai)']
];
const RELNAMES = [...new Map(REL.map(r => [r[2], S(r[2], r[3])])).values()];
TH.relations = pairGame({title:S('உறவுமுறைகள்', 'Family relations'), icon:'👨‍👩‍👧‍👦',
  intro:S('நம் குடும்பம் ஒரு மரம் போல: தாத்தா பாட்டி வேர்கள், அம்மா அப்பா தண்டு, நாம் கிளைகள். ஒவ்வொரு உறவுக்கும் தமிழில் ஒரு அழகான பெயர் உண்டு — அப்பாவின் அண்ணன் பெரியப்பா, தம்பி சித்தப்பா; அம்மாவின் சகோதரர் மாமா; அப்பாவின் சகோதரி அத்தை.', 'Our family is like a tree: grandparents are the roots, parents the trunk, we are the branches. Tamil has a beautiful name for each relation — father’s elder brother periyappa, younger brother chithappa; mother’s brother maama; father’s sister athai.')},
  REL.map(([q1, q2, a1, a2]) => ({e:'👪', q:S(`${q1} — உனக்கு யார்?`, `Your ${q2} is your…?`), a:S(a1, a2), alts: RELNAMES.filter(x => x.ta !== a1)})));
const VALUES = [
  ['👵','பாட்டிக்கு மருந்துச் சீட்டில் உள்ள சிறிய எழுத்தைப் படிக்க முடியவில்லை.','Grandma can’t read the small print on her medicine.','அவருக்குப் பொறுமையாகப் படித்துக் காட்டுவேன்','read it to her patiently',[['கவனிக்காமல் விளையாடப் போவேன்','go off to play'],['"எனக்குத் தெரியாது" என்பேன்','say "I don’t know"']]],
  ['👨','அப்பா வேலையிலிருந்து களைப்பாக வருகிறார்.','Father comes home tired from work.','தண்ணீர் கொடுத்து, அவர் நாள் எப்படி இருந்தது என்று கேட்பேன்','give him water and ask about his day',[['TV சத்தத்தைக் கூட்டுவேன்','turn the TV up louder'],['உடனே பொம்மை கேட்பேன்','ask for a toy right away']]],
  ['👴','தாத்தா தன் சிறுவயதுக் கதை சொல்கிறார்.','Grandpa tells a story from his childhood.','கவனமாகக் கேட்டு, கேள்விகள் கேட்பேன்','listen carefully and ask questions',[['போனைப் பார்த்துக்கொண்டிருப்பேன்','keep looking at my phone'],['"பழைய கதை" என்று சிரிப்பேன்','laugh and say "old story"']]],
  ['🚌','பேருந்தில் ஒரு முதியவர் நிற்கிறார்; நான் உட்கார்ந்திருக்கிறேன்.','An elderly person is standing on the bus; I have a seat.','எழுந்து அவருக்கு இடம் கொடுப்பேன்','stand up and offer my seat',[['தூங்குவது போல நடிப்பேன்','pretend to sleep'],['ஜன்னலைப் பார்ப்பேன்','look out of the window']]],
  ['🧒','வகுப்பில் ஒருவனை மற்றவர்கள் கேலி செய்கிறார்கள்.','Others are teasing a classmate.','அவனுடன் நின்று, ஆசிரியரிடம் சொல்வேன்','stand with him and tell the teacher',[['நானும் சேர்ந்து சிரிப்பேன்','laugh along'],['பார்க்காதது போல இருப்பேன்','pretend not to see']]],
  ['👛','பள்ளி மைதானத்தில் ஒரு பணப்பை கிடக்கிறது.','A purse is lying in the school ground.','ஆசிரியரிடம் ஒப்படைப்பேன்','hand it to a teacher',[['எனக்கே வைத்துக்கொள்வேன்','keep it for myself'],['அங்கேயே விட்டுவிடுவேன்','leave it there']]],
  ['🗑️','ஒருவர் தெருவில் குப்பை வீசுகிறார்.','Someone throws rubbish on the street.','நான் குப்பைத் தொட்டியில் போட்டு, மரியாதையாக நினைவூட்டுவேன்','put it in the bin and politely remind them',[['நானும் அப்படியே வீசுவேன்','throw mine there too'],['கத்திச் சண்டை போடுவேன்','shout and fight']]],
  ['🍳','அம்மா சமைக்கிறார்; நான் விளையாடுகிறேன்.','Mother is cooking; I am playing.','சாப்பாட்டு மேசையைத் தயார் செய்ய உதவுவேன்','help set the table',[['"சாப்பாடு எப்போ?" என்று தொந்தரவு செய்வேன்','keep asking "when is food ready?"'],['விளையாட்டைத் தொடர்வேன்','carry on playing']]],
  ['📱','தாத்தாவுக்கு போனில் வீடியோ அழைப்பு செய்யத் தெரியவில்லை.','Grandpa doesn’t know how to make a video call.','பொறுமையாகக் கற்றுக்கொடுப்பேன்','teach him patiently',[['"இது கூடத் தெரியாதா?" என்பேன்','say "you don’t even know this?"'],['நானே செய்துவிட்டுப் போவேன், சொல்லித் தர மாட்டேன்','do it myself and not show him']]],
  ['📝','தேர்வில் நண்பன் விடையைக் காட்டச் சொல்கிறான்.','A friend asks to copy my answers in a test.','மறுத்துவிட்டு, பிறகு சேர்ந்து படிக்கலாம் என்பேன்','say no, and offer to study together later',[['காட்டிவிடுவேன்','show him'],['ஆசிரியரிடம் அவமானப்படுத்துவேன்','shame him in front of the teacher']]],
  ['🏺','நான் ஒரு பாத்திரத்தை உடைத்துவிட்டேன்; யாருக்கும் தெரியாது.','I broke a pot and nobody knows.','உண்மையைச் சொல்லி மன்னிப்புக் கேட்பேன்','tell the truth and say sorry',[['தம்பி மேல் பழி போடுவேன்','blame my little brother'],['மறைத்துவிடுவேன்','hide it']]],
  ['🧓','வீட்டில் பாட்டி தனிமையாக உணர்கிறார்.','Grandma feels lonely at home.','அவருடன் பேசி, சேர்ந்து விளையாடுவேன்','talk and play a game with her',[['அவரைத் தவிர்ப்பேன்','avoid her'],['வெளியே போய்விடுவேன்','go out']]]
];
TH.values = pairGame({title:S('நீ என்ன செய்வாய்?', 'What would you do?'), icon:'❤️',
  intro:S('நம்மை வளர்த்தவர்கள் அம்மா, அப்பா, தாத்தா, பாட்டி. அவர்கள் நம்மைப் பார்த்துக்கொண்டது போல, நாமும் அவர்களை மதித்து, உதவி, அன்புடன் பார்த்துக்கொள்ள வேண்டும். தாத்தா பாட்டியிடம் பல ஆண்டு அனுபவமும், நம் குடும்ப வரலாறும், கதைகளும் உண்டு — அவர்கள் ஒரு நடமாடும் நூலகம்! நல்ல மனிதன் = நேர்மை + அன்பு + பொறுப்பு.', 'Our parents and grandparents raised us. Just as they cared for us, we must respect, help and lovingly care for them. Grandparents carry many years of experience, our family history and stories — they are a walking library! A good person = honesty + kindness + responsibility.')},
  VALUES.map(([e, q1, q2, a1, a2, alts]) => ({e, q:S(q1, q2), a:S(a1, a2), alts: alts.map(([t, en]) => S(t, en)),
    why:S(`சிறந்த செயல்: ${a1}. மற்றவர்களின் உணர்வுகளை மதிப்பதே நல்ல மனிதனின் அடையாளம்.`, `Best choice: ${a2}. Respecting others’ feelings is the mark of a good person.`)})));
const HELP_HOME = [
  ['🧺','துணிகளை மடித்து வைத்தல்','folding clothes','h'],['🪴','செடிகளுக்கு நீர் ஊற்றுதல்','watering the plants','h'],['🍽️','சாப்பிட்ட தட்டைக் கழுவுதல்','washing my plate','h'],['🛏️','என் படுக்கையைச் சரிசெய்தல்','making my bed','h'],['🎒','என் பையை நானே தயார் செய்தல்','packing my own bag','h'],['👵','பாட்டிக்கு மருந்து நேரத்தை நினைவூட்டுதல்','reminding grandma of medicine time','h'],
  ['🧸','பொம்மைகளைத் தரையில் சிதறவிடுதல்','leaving toys all over the floor','n'],['🔊','பெரியவர்கள் ஓய்வெடுக்கும்போது சத்தம் போடுதல்','making noise while elders rest','n'],['🍛','உணவை வீணாக்குதல்','wasting food','n'],['💡','அறையை விட்டுப் போகும்போது விளக்கை அணைக்காமல் விடுதல்','leaving the light on when leaving the room','n']
];
TH.homeHelper = G.KALVI_BUILD.sortGame({title:S('வீட்டின் சிறந்த உதவியாளர்', 'Best helper at home'), icon:'🏠',
  intro:S('குடும்பம் ஒரு குழு. ஒவ்வொருவரும் சிறு வேலை செய்தால் அம்மாவுக்கும் அப்பாவுக்கும் சுமை குறையும்.', 'A family is a team. When everyone does a small job, the load on mother and father gets lighter.')},
  [{id:'h', e:'💚', ta:'உதவும் பழக்கம்', en:'Helpful habit'}, {id:'n', e:'🙁', ta:'மாற்ற வேண்டிய பழக்கம்', en:'Habit to change'}],
  HELP_HOME.map(([e, ta, en, bin]) => ({e, ta, en, bin})), 6);

/* ================= NATION & ME ================= */
const sym = (e, q1, q2, a, alts) => ({e, q:S(q1, q2), a, alts});
TH.symbols = pairGame({title:S('தேசியச் சின்னங்கள்', 'National symbols'), icon:'🇮🇳',
  intro:S('தேசியச் சின்னங்கள் நம் நாட்டின் அடையாளம்: விலங்கு புலி, பறவை மயில், மலர் தாமரை, மரம் ஆலமரம், பழம் மாம்பழம், நதி கங்கை, நீர்வாழ் விலங்கு கங்கை ஆற்று டால்பின், பாரம்பரிய விலங்கு யானை. தேசிய கீதம் "ஜன கண மன", தேசியப் பாடல் "வந்தே மாதரம்".', 'National symbols are our country’s identity: animal tiger, bird peacock, flower lotus, tree banyan, fruit mango, river Ganga, aquatic animal Ganges river dolphin, heritage animal elephant. National anthem "Jana Gana Mana", national song "Vande Mataram".')}, [
  sym('🐅','தேசிய விலங்கு?','National animal?', S('புலி','tiger'), [S('சிங்கம்','lion'), S('யானை','elephant'), S('மான்','deer')]),
  sym('🦚','தேசியப் பறவை?','National bird?', S('மயில்','peacock'), [S('கிளி','parrot'), S('புறா','pigeon'), S('கழுகு','eagle')]),
  sym('🪷','தேசிய மலர்?','National flower?', S('தாமரை','lotus'), [S('ரோஜா','rose'), S('மல்லிகை','jasmine'), S('சூரியகாந்தி','sunflower')]),
  sym('🌳','தேசிய மரம்?','National tree?', S('ஆலமரம்','banyan'), [S('வேம்பு','neem'), S('தென்னை','coconut palm'), S('அரசமரம்','peepal')]),
  sym('🥭','தேசியப் பழம்?','National fruit?', S('மாம்பழம்','mango'), [S('வாழைப்பழம்','banana'), S('பலாப்பழம்','jackfruit'), S('ஆப்பிள்','apple')]),
  sym('🌊','தேசிய நதி?','National river?', S('கங்கை','Ganga'), [S('காவிரி','Kaveri'), S('யமுனை','Yamuna'), S('கோதாவரி','Godavari')]),
  sym('🐬','தேசிய நீர்வாழ் விலங்கு?','National aquatic animal?', S('கங்கை ஆற்று டால்பின்','Ganges river dolphin'), [S('திமிங்கலம்','whale'), S('முதலை','crocodile'), S('ஆமை','turtle')]),
  sym('🐘','தேசியப் பாரம்பரிய விலங்கு?','National heritage animal?', S('யானை','elephant'), [S('புலி','tiger'), S('குதிரை','horse'), S('பசு','cow')]),
  sym('🎵','தேசிய கீதம்?','National anthem?', S('ஜன கண மன','Jana Gana Mana'), [S('வந்தே மாதரம்','Vande Mataram'), S('சாரே ஜஹான் சே அச்சா','Saare Jahan Se Achha'), S('நீராரும் கடலுடுத்த','Neerarum Kadaludutha')]),
  sym('🎶','தேசியப் பாடல்?','National song?', S('வந்தே மாதரம்','Vande Mataram'), [S('ஜன கண மன','Jana Gana Mana'), S('சாரே ஜஹான் சே அச்சா','Saare Jahan Se Achha'), S('நீராரும் கடலுடுத்த','Neerarum Kadaludutha')])
]);
TH.days = pairGame({title:S('முக்கிய நாட்கள்', 'Important days'), icon:'📅',
  intro:S('சுதந்திர தினம் ஆகஸ்ட் 15 (1947), குடியரசு தினம் ஜனவரி 26 (1950 — அரசியலமைப்பு நடைமுறைக்கு வந்த நாள்), காந்தி ஜெயந்தி அக்டோபர் 2, ஆசிரியர் தினம் செப்டம்பர் 5, குழந்தைகள் தினம் நவம்பர் 14, தேசிய அறிவியல் தினம் பிப்ரவரி 28, தேசிய விண்வெளி தினம் ஆகஸ்ட் 23, உலகச் சுற்றுச்சூழல் தினம் ஜூன் 5.', 'Independence Day Aug 15 (1947), Republic Day Jan 26 (1950 — the day the Constitution came into force), Gandhi Jayanti Oct 2, Teachers’ Day Sep 5, Children’s Day Nov 14, National Science Day Feb 28, National Space Day Aug 23, World Environment Day June 5.')},
  (() => { const D = [['🇮🇳','சுதந்திர தினம்','Independence Day','ஆகஸ்ட் 15','August 15'], ['📜','குடியரசு தினம்','Republic Day','ஜனவரி 26','January 26'], ['🕊️','காந்தி ஜெயந்தி','Gandhi Jayanti','அக்டோபர் 2','October 2'],
      ['🧑‍🏫','ஆசிரியர் தினம்','Teachers’ Day','செப்டம்பர் 5','September 5'], ['🧒','குழந்தைகள் தினம்','Children’s Day','நவம்பர் 14','November 14'], ['🔬','தேசிய அறிவியல் தினம்','National Science Day','பிப்ரவரி 28','February 28'],
      ['🚀','தேசிய விண்வெளி தினம்','National Space Day','ஆகஸ்ட் 23','August 23'], ['🌍','உலகச் சுற்றுச்சூழல் தினம்','World Environment Day','ஜூன் 5','June 5'], ['⚖️','அரசியலமைப்பு தினம்','Constitution Day','நவம்பர் 26','November 26']];
    return D.map(([e, q1, q2, a1, a2]) => ({e, q:S(`${q1} எப்போது?`, `When is ${q2}?`), a:S(a1, a2)})); })());
TH.democracy = pairGame({title:S('ஜனநாயகமும் நானும்', 'Democracy and me'), icon:'🗳️',
  intro:S('ஜனநாயகம் = மக்களே தங்கள் பிரதிநிதிகளைத் தேர்ந்தெடுக்கும் ஆட்சி. இந்தியாவில் 18 வயதானவர்கள் ஓட்டளிக்கலாம். ஒவ்வொருவருக்கும் ஒரே ஒரு ஓட்டு — பணக்காரருக்கும் ஏழைக்கும் சமம். அரசியலமைப்பு நம் நாட்டின் மிக உயர்ந்த சட்டப் புத்தகம்; அதில் நம் உரிமைகளும் கடமைகளும் உள்ளன.', 'Democracy = rule where the people choose their representatives. In India everyone aged 18 can vote. Each person has exactly one vote — equal for rich and poor. The Constitution is our country’s highest book of law; it holds our rights and duties.')}, [
  {e:'🗳️', q:S('இந்தியாவில் ஓட்டளிக்க வயது?','Voting age in India?'), a:S('18','18'), alts:[S('16','16'), S('21','21'), S('25','25')]},
  {e:'📜', q:S('அரசியலமைப்பு நடைமுறைக்கு வந்த நாள்?','When did the Constitution come into force?'), a:S('26 ஜனவரி 1950','26 January 1950'), alts:[S('15 ஆகஸ்ட் 1947','15 August 1947'), S('2 அக்டோபர் 1950','2 October 1950'), S('26 நவம்பர் 1947','26 November 1947')]},
  {e:'✍️', q:S('அரசியலமைப்பு வரைவுக் குழுவின் தலைவர்?','Chairman of the Constitution’s drafting committee?'), a:S('டாக்டர் பி.ஆர். அம்பேத்கர்','Dr B. R. Ambedkar'), alts:[S('மகாத்மா காந்தி','Mahatma Gandhi'), S('சுபாஷ் சந்திர போஸ்','Subhas Chandra Bose'), S('பகத் சிங்','Bhagat Singh')]},
  {e:'🏛️', q:S('தேர்தலை நடத்துவது யார்?','Who conducts elections?'), a:S('இந்தியத் தேர்தல் ஆணையம்','Election Commission of India'), alts:[S('காவல்துறை','the police'), S('உச்ச நீதிமன்றம்','the Supreme Court'), S('ரிசர்வ் வங்கி','the Reserve Bank')]},
  {e:'🏢', q:S('இந்திய நாடாளுமன்றத்தின் இரு அவைகள்?','The two houses of India’s Parliament?'), a:S('மக்களவை & மாநிலங்களவை','Lok Sabha & Rajya Sabha'), alts:[S('சட்டமன்றம் & நகராட்சி','Assembly & Municipality'), S('ஊராட்சி & மாநகராட்சி','Panchayat & Corporation'), S('நீதிமன்றம் & காவல்','Court & Police')]},
  {e:'🏙️', q:S('தமிழ்நாடு சட்டமன்றத்தில் எத்தனை உறுப்பினர்கள் (தொகுதிகள்)?','How many seats in the Tamil Nadu Legislative Assembly?'), a:S('234','234'), alts:[S('39','39'), S('120','120'), S('543','543')]},
  {e:'🇮🇳', q:S('தமிழ்நாட்டிலிருந்து மக்களவைக்கு எத்தனை உறுப்பினர்கள்?','How many Lok Sabha seats from Tamil Nadu?'), a:S('39','39'), alts:[S('234','234'), S('18','18'), S('80','80')]},
  {e:'🧑‍⚖️', q:S('இந்திய நாட்டின் தலைவர் (நாட்டுத் தலைவர்)?','Head of the Indian state?'), a:S('குடியரசுத் தலைவர்','the President'), alts:[S('ஆளுநர்','the Governor'), S('மேயர்','the Mayor'), S('மாவட்ட ஆட்சியர்','the Collector')]},
  {e:'🏛️', q:S('மாநில அரசை வழிநடத்துபவர்?','Who leads a state government?'), a:S('முதலமைச்சர்','the Chief Minister'), alts:[S('குடியரசுத் தலைவர்','the President'), S('மேயர்','the Mayor'), S('ஊராட்சித் தலைவர்','the Panchayat President')]}
]);
TH.proudIndia = pairGame({title:S('இந்தியாவின் சாதனைகள்', 'India’s proud achievements'), icon:'🚀',
  intro:S('இஸ்ரோ 1969-ல் தொடங்கப்பட்டது. முதல் இந்தியச் செயற்கைக்கோள் ஆரியபட்டா (1975). மங்கள்யான் முதல் முயற்சியிலேயே செவ்வாய்க் கோளைச் சுற்றியது (2014). சந்திரயான்-3 நிலவின் தென் துருவப் பகுதிக்கு அருகில் தரையிறங்கிய முதல் விண்கலம் (2023). நம் தமிழ்நாட்டு மேதைகள்: அப்துல் கலாம் (இராமேஸ்வரம்), ஸ்ரீனிவாச ராமானுஜன் (கணிதம்), சி.வி. ராமன் (நோபல் பரிசு 1930), எம்.எஸ். சுவாமிநாதன் (பசுமைப் புரட்சி).', 'ISRO was founded in 1969. The first Indian satellite was Aryabhata (1975). Mangalyaan reached Mars orbit on its first attempt (2014). Chandrayaan-3 was the first to land near the Moon’s south pole (2023). Tamil Nadu’s geniuses: Abdul Kalam (Rameswaram), Srinivasa Ramanujan (mathematics), C. V. Raman (Nobel Prize 1930), M. S. Swaminathan (Green Revolution).')}, [
  {e:'🛰️', q:S('முதல் இந்தியச் செயற்கைக்கோள்?','First Indian satellite?'), a:S('ஆரியபட்டா','Aryabhata'), alts:[S('சந்திரயான்','Chandrayaan'), S('மங்கள்யான்','Mangalyaan'), S('ககன்யான்','Gaganyaan')]},
  {e:'🌙', q:S('நிலவின் தென் துருவப் பகுதிக்கு அருகில் தரையிறங்கிய இந்திய விண்கலம்?','Indian mission that landed near the Moon’s south pole?'), a:S('சந்திரயான்-3','Chandrayaan-3'), alts:[S('ஆரியபட்டா','Aryabhata'), S('மங்கள்யான்','Mangalyaan'), S('ஆதித்யா-L1','Aditya-L1')]},
  {e:'🔴', q:S('முதல் முயற்சியிலேயே செவ்வாயை அடைந்த இந்தியத் திட்டம்?','Indian mission that reached Mars on its first attempt?'), a:S('மங்கள்யான்','Mangalyaan'), alts:[S('சந்திரயான்-3','Chandrayaan-3'), S('ஆரியபட்டா','Aryabhata'), S('ஆதித்யா-L1','Aditya-L1')]},
  {e:'🚀', q:S('"ஏவுகணை நாயகன்" என்றழைக்கப்படும் இராமேஸ்வரம் மேதை?','The "Missile Man" from Rameswaram?'), a:S('ஏ.பி.ஜே. அப்துல் கலாம்','A. P. J. Abdul Kalam'), alts:[S('சி.வி. ராமன்','C. V. Raman'), S('ராமானுஜன்','Ramanujan'), S('எம்.எஸ். சுவாமிநாதன்','M. S. Swaminathan')]},
  {e:'➗', q:S('எண்களின் அதிசயங்களைக் கண்டுபிடித்த தமிழ்க் கணிதமேதை?','The Tamil mathematical genius of numbers?'), a:S('ஸ்ரீனிவாச ராமானுஜன்','Srinivasa Ramanujan'), alts:[S('ஏ.பி.ஜே. அப்துல் கலாம்','A. P. J. Abdul Kalam'), S('சி.வி. ராமன்','C. V. Raman'), S('ஆரியபட்டர்','Aryabhata')]},
  {e:'🌈', q:S('ஒளிச் சிதறல் கண்டுபிடிப்புக்கு 1930-ல் நோபல் பரிசு பெற்றவர்?','Won the 1930 Nobel Prize for work on the scattering of light?'), a:S('சி.வி. ராமன்','C. V. Raman'), alts:[S('ராமானுஜன்','Ramanujan'), S('ஏ.பி.ஜே. அப்துல் கலாம்','A. P. J. Abdul Kalam'), S('ஜகதீஷ் சந்திர போஸ்','Jagadish Chandra Bose')]},
  {e:'🌾', q:S('இந்தியப் பசுமைப் புரட்சியின் தந்தை எனப்படும் தமிழர்?','The Tamil known as the father of India’s Green Revolution?'), a:S('எம்.எஸ். சுவாமிநாதன்','M. S. Swaminathan'), alts:[S('சி.வி. ராமன்','C. V. Raman'), S('ராமானுஜன்','Ramanujan'), S('ஏ.பி.ஜே. அப்துல் கலாம்','A. P. J. Abdul Kalam')]},
  {e:'🏢', q:S('இஸ்ரோ தொடங்கப்பட்ட ஆண்டு?','Year ISRO was founded?'), a:S('1969','1969'), alts:[S('1947','1947'), S('1975','1975'), S('2008','2008')]}
]);
const CIVIC = [
  ['🚦','சிக்னலுக்காகக் காத்திருத்தல்','waiting at the signal','g'],['🧍','வரிசையில் நிற்றல்','standing in a queue','g'],['🗑️','குப்பையைத் தொட்டியில் போடுதல்','putting rubbish in the bin','g'],['🌳','மரம் நடுதல்','planting a tree','g'],['🚰','பொதுக் குழாயை மூடுதல்','closing a public tap','g'],['📚','நூலகப் புத்தகத்தைச் சேதமின்றித் திருப்பித் தருதல்','returning library books undamaged','g'],
  ['✏️','பொதுச் சுவரில் கிறுக்குதல்','scribbling on public walls','b'],['🚮','ஆற்றில் குப்பை போடுதல்','dumping rubbish in a river','b'],['🔊','மருத்துவமனை அருகே ஹாரன் அடித்தல்','honking near a hospital','b'],['🪑','பூங்கா இருக்கையை உடைத்தல்','breaking a park bench','b']
];
TH.civic = G.KALVI_BUILD.sortGame({title:S('நல்ல குடிமகன்', 'Good citizen'), icon:'🏙️',
  intro:S('சாலை, பூங்கா, பேருந்து, நூலகம் — இவை எல்லாம் நம் வரிப்பணத்தில் கட்டப்பட்ட பொதுச் சொத்துகள். அவற்றைக் காப்பது நம் ஒவ்வொருவரின் கடமை. ஒரு நாடு முன்னேறுவது அதன் மக்களின் பழக்கங்களால்தான்.', 'Roads, parks, buses, libraries — all are public property built with our taxes. Protecting them is everyone’s duty. A country moves forward through the habits of its people.')},
  [{id:'g', e:'🌟', ta:'நாட்டுக்கு நல்லது', en:'Good for the nation'}, {id:'b', e:'⛔', ta:'நாட்டுக்குக் கேடு', en:'Harms the nation'}],
  CIVIC.map(([e, ta, en, bin]) => ({e, ta, en, bin})), 6);

/* ================= LANGUAGES ================= */
const HI_SWAR = ['अ','आ','इ','ई','उ','ऊ','ऋ','ए','ऐ','ओ','औ'];
const HI_VYAN = ['क','ख','ग','घ','च','छ','ज','झ','ट','ठ','ड','ढ','त','थ','द','ध','न','प','फ','ब','भ','म','य','र','ल','व','श','ष','स','ह'];
const HI_WORDS = [['आम','🥭','mango'],['उल्लू','🦉','owl'],['ऊन','🧶','wool'],['ऐनक','👓','spectacles'],['कमल','🪷','lotus'],['खरगोश','🐇','rabbit'],['गाय','🐄','cow'],['घड़ी','⌚','watch'],['चम्मच','🥄','spoon'],['जहाज','🚢','ship'],
  ['टमाटर','🍅','tomato'],['तितली','🦋','butterfly'],['नाव','⛵','boat'],['पतंग','🪁','kite'],['बतख','🦆','duck'],['भालू','🐻','bear'],['मछली','🐟','fish'],['शेर','🦁','lion'],['सेब','🍎','apple'],['हाथी','🐘','elephant']];
const HI_NUM = ['','एक','दो','तीन','चार','पाँच','छह','सात','आठ','नौ','दस'];
G.KALVI_HINDI = {HI_SWAR, HI_VYAN, HI_WORDS, HI_NUM};
TH.hindiSwar = { title:S('இந்தி உயிர் எழுத்துகள் (स्वर)', 'Hindi vowels (स्वर)'), icon:'अ',
  intro:S('இந்தி "தேவநாகரி" எழுத்தில் எழுதப்படுகிறது. உயிர் எழுத்துகள் (स्वर): अ (அ) आ (ஆ) इ (இ) ई (ஈ) उ (உ) ऊ (ஊ) ऋ (ரி) ए (ஏ) ऐ (ஐ) ओ (ஓ) औ (ஔ). தமிழ் உயிர் எழுத்துகளைப் போலவே வரிசை!', 'Hindi is written in the Devanagari script. Its vowels (स्वर): अ आ इ ई उ ऊ ऋ ए ऐ ओ औ — almost the same order as Tamil vowels!'),
  gen(){ const s = ri(0, HI_SWAR.length - 5), seq = HI_SWAR.slice(s, s + 4), ans = HI_SWAR[s + 4];
    return {p:S('அடுத்த இந்தி எழுத்து எது?', 'Which Hindi letter comes next?'), scene:`<div class="nl ta">${seq.map(x => `<span>${x}</span>`).join('')}<span class="on">?</span></div>`,
      opts: shuffle([ans, ...shuffle(HI_SWAR.filter(x => x !== ans && !seq.includes(x))).slice(0, 3)]).map(v => ({v, h:`<span class="ta-big">${v}</span>`})), ans,
      ex:S(`${seq.join(' ')} → ${ans}`, `${seq.join(' ')} → ${ans}`), check:q => HI_SWAR.indexOf(q.ans) === s + 4}; } };
TH.hindiWord = { title:S('இந்தி — படம் & முதல் எழுத்து', 'Hindi — picture & first letter'), icon:'🥭',
  intro:S('आम (ஆம்) = மாம்பழம், हाथी (ஹாதி) = யானை, मछली (மச்லி) = மீன். படத்தின் இந்திப் பெயர் எந்த எழுத்தில் தொடங்குகிறது?', 'आम (aam) = mango, हाथी (haathi) = elephant, मछली (machhli) = fish. Which letter does the Hindi name start with?'),
  gen(){ const [w, e, en] = pick(HI_WORDS), ans = w[0], pool = HI_SWAR.concat(HI_VYAN).filter(x => x !== ans);
    return {p:S(`இந்தப் படத்தின் இந்திப் பெயர் "${w}". அது எந்த எழுத்தில் தொடங்குகிறது?`, `This picture is "${w}" in Hindi. Which letter does it start with?`), scene:`<div class="emo" style="font-size:60px">${e}</div><div class="big ta">${w}</div>`,
      opts: shuffle([ans, ...shuffle(pool).slice(0, 3)]).map(v => ({v, h:`<span class="ta-big">${v}</span>`})), ans, ex:S(`${w} (${en}) → ${ans}`, `${w} (${en}) → ${ans}`), say:S(w, w), check:q => q.ans === w[0]}; } };
TH.hindiNum = { title:S('இந்தி எண்கள்', 'Hindi numbers'), icon:'🔢',
  intro:S('एक 1, दो 2, तीन 3, चार 4, पाँच 5, छह 6, सात 7, आठ 8, नौ 9, दस 10.', 'एक 1, दो 2, तीन 3, चार 4, पाँच 5, छह 6, सात 7, आठ 8, नौ 9, दस 10.'),
  gen(){ const n = ri(1, 10), ans = HI_NUM[n];
    return {p:S(`${n} — இந்தியில்?`, `${n} — in Hindi?`), scene:`<div class="big">${n}</div>`, opts: shuffle([ans, ...shuffle(HI_NUM.slice(1).filter(x => x !== ans)).slice(0, 3)]).map(v => ({v, h:`<span class="ta-mid">${v}</span>`})), ans,
      ex:S(`${n} = ${ans}`, `${n} = ${ans}`), check:q => HI_NUM.indexOf(q.ans) === n}; } };
const WORDS3 = [['💧','தண்ணீர்','पानी','water'],['👩','அம்மா','माँ','mother'],['☀️','சூரியன்','सूरज','sun'],['🌙','நிலா','चाँद','moon'],['🏠','வீடு','घर','house'],['📖','புத்தகம்','किताब','book'],['🌳','மரம்','पेड़','tree'],['🌸','பூ','फूल','flower'],
  ['🤝','நண்பன்','दोस्त','friend'],['🍛','உணவு','खाना','food'],['🏫','பள்ளி','विद्यालय','school'],['🐦','பறவை','चिड़िया','bird'],['🐕','நாய்','कुत्ता','dog'],['🐈','பூனை','बिल्ली','cat'],['🐘','யானை','हाथी','elephant'],['🐟','மீன்','मछली','fish'],['👁️','கண்','आँख','eye'],['✋','கை','हाथ','hand'],['🧑‍🏫','ஆசிரியர்','शिक्षक','teacher']];
TH.threeLang = { title:S('ஒரே சொல் — மூன்று மொழிகள்', 'One word — three languages'), icon:'🌐',
  intro:S('ஒரே பொருளுக்கு ஒவ்வொரு மொழியிலும் வேறு சொல்: தண்ணீர் = पानी (பானீ) = water. பல மொழிகள் தெரிந்தால் இந்தியா முழுவதும் நண்பர்கள்!', 'The same thing has a different word in each language: தண்ணீர் = पानी (paani) = water. Know many languages and you have friends all over India!'),
  gen(){ const [e, ta, hi, en] = pick(WORDS3), mode = Math.random() < .5 ? 'hi' : 'en';
    const ans = mode === 'hi' ? hi : en, pool = WORDS3.map(x => mode === 'hi' ? x[2] : x[3]).filter(x => x !== ans);
    return {p: mode === 'hi' ? S(`"${ta}" — இந்தியில்?`, `"${en}" — in Hindi?`) : S(`"${ta}" — ஆங்கிலத்தில்?`, `"${ta}" (${hi}) — in English?`), scene:`<div class="emo" style="font-size:56px">${e}</div>`,
      opts: shuffle([ans, ...shuffle(pool).slice(0, 3)]).map(v => ({v, h:`<span class="ta-mid">${v}</span>`})), ans, ex:S(`${ta} = ${hi} = ${en}`, `${ta} = ${hi} = ${en}`)}; } };
const GREET = [['வணக்கம்','தமிழ்','Tamil'],['नमस्ते','இந்தி','Hindi'],['നമസ്കാരം','மலையாளம்','Malayalam'],['నమస్కారం','தெலுங்கு','Telugu'],['ನಮಸ್ಕಾರ','கன்னடம்','Kannada'],['নমস্কার','வங்காளம்','Bengali'],
  ['નમસ્તે','குஜராத்தி','Gujarati'],['ਸਤ ਸ੍ਰੀ ਅਕਾਲ','பஞ்சாபி','Punjabi'],['ନମସ୍କାର','ஒடியா','Odia'],['آداب','உருது','Urdu'],['Hello','ஆங்கிலம்','English']];
G.KALVI_GREET = GREET;
TH.greetings = { title:S('இந்தியாவின் "வணக்கம்"', 'India says hello'), icon:'🙏',
  intro:S('இந்திய அரசியலமைப்பின் எட்டாவது அட்டவணையில் 22 மொழிகள் உள்ளன. ஒவ்வொன்றுக்கும் தனி அழகு உண்டு! 2004-ல் இந்தியாவின் முதல் செம்மொழியாக அறிவிக்கப்பட்டது தமிழ்.', 'The Eighth Schedule of the Indian Constitution lists 22 languages, each beautiful in its own way! In 2004 Tamil became the first language declared a classical language of India.'),
  gen(){ const g = pick(GREET), ans = g[1];
    return {p:S('இந்த "வணக்கம்" எந்த மொழியில்?', 'This "hello" is in which language?'), scene:`<div class="big" style="font-size:2rem">${g[0]}</div>`,
      opts: shuffle([g, ...shuffle(GREET.filter(x => x !== g)).slice(0, 3)]).map(x => ({v:x[1], h:`${x[1]} / ${x[2]}`})), ans, ex:S(`${g[0]} — ${g[1]}`, `${g[0]} — ${g[2]}`)}; } };

G.KALVI_THINK = TH;
})(typeof window !== 'undefined' ? window : globalThis);
