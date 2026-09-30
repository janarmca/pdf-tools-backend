/* Kalvi Kalanjiyam — Tamil, English, Science (EVS) and Social games, Classes 1–5.
   Content is curated and checked item by item; see tests/games.test.js. */
(function(G){
'use strict';
const {S, ri, pick, shuffle} = G.KALVI_UTIL;
const TX = {};

/* ---------- builders ---------- */
// match-style MCQ from a list of {e, q:{ta,en}, a:{ta,en}}
function pairGame(meta, items, opt){
  opt = opt || {};
  return Object.assign({}, meta, { data: items, gen(){
    const it = pick(items);
    // distractors: explicit alts first, else answers of the same group, else any other answer — never duplicated
    const seen = new Set([it.a.ta]), others = [];
    const pool = it.alts ? shuffle(it.alts) : shuffle(items.filter(x => (x.grp || '') === (it.grp || '')).map(x => x.a)).concat(it.grp ? [] : []);
    for(const a of pool){ if(others.length < 3 && !seen.has(a.ta)){ seen.add(a.ta); others.push(a); } }
    const lab = a => `${a.ta}${a.en && a.en !== a.ta ? ' / ' + a.en : ''}`;
    return {p: opt.ask ? opt.ask(it) : it.q, scene: it.e ? `<div class="emo" style="font-size:${it.big ? 60 : 44}px">${it.e}</div>` : '',
      opts: shuffle([it.a].concat(others)).map(a => ({v:a.ta, h:lab(a)})), ans:it.a.ta,
      ex: it.why || S(`${it.q.ta} → ${it.a.ta}`, `${it.q.en} → ${it.a.en}`), say: opt.say ? opt.say(it) : null};
  }});
}
// sorting round: tap an item, then tap the right basket
function sortGame(meta, bins, items, per){
  return Object.assign({}, meta, { data:{bins, items}, gen(){
    const chosen = [];
    bins.forEach(b => chosen.push(...shuffle(items.filter(x => x.bin === b.id)).slice(0, Math.max(1, Math.floor((per || 6) / bins.length)))));
    return {kind:'sort', p: meta.ask || S('ஒவ்வொன்றையும் சரியான கூடைக்குள் போடு', 'Put each one in the right basket'),
      bins: bins.map(b => ({id:b.id, h:`${b.e || ''} ${b.ta}<small>${b.en}</small>`})),
      items: shuffle(chosen).map(x => ({h:`<span class="it-e">${x.e || ''}</span><span class="it-t">${x.ta}<small>${x.en}</small></span>`, bin:x.bin, name:x})),
      ex: meta.rule || S('', '')};
  }});
}

/* ================= TAMIL ================= */
const UYIR = ['அ','ஆ','இ','ஈ','உ','ஊ','எ','ஏ','ஐ','ஒ','ஓ','ஔ'];
const SIGN = ['','ா','ி','ீ','ு','ூ','ெ','ே','ை','ொ','ோ','ௌ'];
const MEI = ['க','ங','ச','ஞ','ட','ண','த','ந','ப','ம','ய','ர','ல','வ','ழ','ள','ற','ன'];
const PULLI = '்';
const mei = i => MEI[i] + PULLI;
const um = (i, j) => MEI[i] + SIGN[j];
G.KALVI_TAMIL = {UYIR, SIGN, MEI, PULLI, mei, um};

const UYIR_WORDS = [
  {w:'அணில்', e:'🐿️', l:0}, {w:'ஆடு', e:'🐐', l:1}, {w:'இலை', e:'🍃', l:2}, {w:'ஈ', e:'🪰', l:3}, {w:'உப்பு', e:'🧂', l:4}, {w:'ஊசி', e:'🪡', l:5},
  {w:'எலி', e:'🐭', l:6}, {w:'ஏணி', e:'🪜', l:7}, {w:'ஐந்து', e:'✋', l:8}, {w:'ஒட்டகம்', e:'🐫', l:9}, {w:'ஓடம்', e:'⛵', l:10}
];
// words pre-split into Tamil letters (graphemes)
const WORDS = [
  ['மரம்','🌳',['ம','ர','ம்']], ['பூ','🌸',['பூ']], ['கண்','👁️',['க','ண்']], ['பல்','🦷',['ப','ல்']], ['மீன்','🐟',['மீ','ன்']], ['வீடு','🏠',['வீ','டு']],
  ['நாய்','🐕',['நா','ய்']], ['பசு','🐄',['ப','சு']], ['குடை','☂️',['கு','டை']], ['தேன்','🍯',['தே','ன்']], ['பால்','🥛',['பா','ல்']], ['நிலா','🌙',['நி','லா']],
  ['மயில்','🦚',['ம','யி','ல்']], ['யானை','🐘',['யா','னை']], ['கிளி','🦜',['கி','ளி']], ['புலி','🐅',['பு','லி']], ['முயல்','🐇',['மு','ய','ல்']], ['கோழி','🐔',['கோ','ழி']],
  ['மாம்பழம்','🥭',['மா','ம்','ப','ழ','ம்']], ['கால்','🦵',['கா','ல்']], ['காது','👂',['கா','து']], ['மூக்கு','👃',['மூ','க்','கு']], ['பந்து','⚽',['ப','ந்','து']],
  ['பேருந்து','🚌',['பே','ரு','ந்','து']], ['மிதிவண்டி','🚲',['மி','தி','வ','ண்','டி']], ['கப்பல்','🚢',['க','ப்','ப','ல்']], ['விமானம்','✈️',['வி','மா','ன','ம்']],
  ['மழை','🌧️',['ம','ழை']], ['தக்காளி','🍅',['த','க்','கா','ளி']], ['சூரியன்','☀️',['சூ','ரி','ய','ன்']], ['குதிரை','🐎',['கு','தி','ரை']], ['பாம்பு','🐍',['பா','ம்','பு']],
  ['தவளை','🐸',['த','வ','ளை']], ['பூனை','🐈',['பூ','னை']], ['வாத்து','🦆',['வா','த்','து']], ['சிங்கம்','🦁',['சி','ங்','க','ம்']], ['கரடி','🐻',['க','ர','டி']], ['மேகம்','☁️',['மே','க','ம்']]
];
G.KALVI_TAMIL.WORDS = WORDS; G.KALVI_TAMIL.UYIR_WORDS = UYIR_WORDS;
// split a letter (grapheme) into consonant index + vowel index
function parseLetter(g){
  const ci = MEI.indexOf(g[0]); if(ci < 0) return null;
  const rest = g.slice(1);
  if(rest === PULLI) return {c:ci, v:-1};
  const vi = SIGN.indexOf(rest); return vi < 0 ? null : {c:ci, v:vi};
}
G.KALVI_TAMIL.parseLetter = parseLetter;
function letterVariants(g){
  const p = parseLetter(g); if(!p) return [];
  const out = new Set();
  [0,1,2,3,4,5,6,7,8].forEach(v => out.add(um(p.c, v)));
  out.add(mei(p.c));
  out.delete(g); return [...out];
}

TX.uyirStart = { title:S('உயிர் எழுத்து — முதல் எழுத்து', 'Vowels — first letter'), icon:'அ',
  intro:S('தமிழில் 12 உயிர் எழுத்துகள்: அ ஆ இ ஈ உ ஊ எ ஏ ஐ ஒ ஓ ஔ. படத்தின் பெயரைச் சத்தமாகச் சொல் — முதல் ஒலி எந்த எழுத்து?', 'Tamil has 12 vowels: அ ஆ இ ஈ உ ஊ எ ஏ ஐ ஒ ஓ ஔ. Say the picture’s name aloud — which letter is the first sound?'),
  gen(){ const it = pick(UYIR_WORDS), ans = UYIR[it.l];
    const near = [it.l ^ 1, it.l + 2, it.l - 2, it.l + 1, it.l - 1].filter(i => i >= 0 && i < 12 && i !== it.l).map(i => UYIR[i]);
    const others = shuffle([...new Set(near)]); UYIR.forEach((u, i) => { if(others.length < 3 && i !== it.l && !others.includes(u)) others.push(u); });
    const opts = [ans, ...others.slice(0, 3)];
    return {p:S('இந்தப் பெயர் எந்த எழுத்தில் தொடங்குகிறது?', 'Which letter does this name start with?'), scene:`<div class="emo" style="font-size:64px">${it.e}</div>`,
      opts: shuffle(opts).map(v => ({v, h:`<span class="ta-big">${v}</span>`})), ans, ex:S(`${it.w} → ${ans}`, `${it.w} → ${ans}`), say:S(it.w, it.w), check:q => q.ans === it.w[0]}; } };
TX.uyirOrder = { title:S('எழுத்து வரிசை', 'Letter order'), icon:'🔡',
  intro:S('உயிர்: அ ஆ இ ஈ உ ஊ எ ஏ ஐ ஒ ஓ ஔ. மெய்: க் ங் ச் ஞ் ட் ண் த் ந் ப் ம் ய் ர் ல் வ் ழ் ள் ற் ன். சத்தமாகப் பாடிப் பழகு!', 'Vowels: அ ஆ இ ஈ உ ஊ எ ஏ ஐ ஒ ஓ ஔ. Consonants: க் ங் ச் ஞ் ட் ண் த் ந் ப் ம் ய் ர் ல் வ் ழ் ள் ற் ன். Sing them aloud!'),
  gen(L){ const useMei = L.mei ? Math.random() < .6 : false, arr = useMei ? MEI.map((_, i) => mei(i)) : UYIR, n = arr.length;
    const s = ri(0, n - 5), seq = arr.slice(s, s + 4), ans = arr[s + 4];
    const pool = arr.filter(x => x !== ans && !seq.includes(x));
    return {p:S('அடுத்த எழுத்து எது?', 'Which letter comes next?'), scene:`<div class="nl ta">${seq.map(x => `<span>${x}</span>`).join('')}<span class="on">?</span></div>`,
      opts: shuffle([ans, ...shuffle(pool).slice(0, 3)]).map(v => ({v, h:`<span class="ta-big">${v}</span>`})), ans,
      ex:S(`${seq.join(' ')} → ${ans}`, `${seq.join(' ')} → ${ans}`), check:q => arr.indexOf(q.ans) === s + 4}; } };
TX.meiSpot = { title:S('மெய் எழுத்தைக் கண்டுபிடி', 'Spot the consonant'), icon:'்',
  intro:S('மெய் எழுத்தின் தலையில் ஒரு புள்ளி ( ் ) இருக்கும்: க், ச், ட். புள்ளி இல்லையென்றால் அது உயிர்மெய் (க = க் + அ).', 'A consonant (மெய்) has a dot on top ( ் ): க், ச், ட். Without the dot it is a vowel-consonant (க = க் + அ).'),
  gen(){ const c = ri(0, 17), ans = mei(c), others = shuffle([um(c, 0), um(c, ri(1, 5)), um(ri(0, 17), 0), UYIR[ri(0, 11)], um(c, ri(6, 11))]).filter((x, i, a) => a.indexOf(x) === i && x !== ans).slice(0, 3);
    return {p:S('இவற்றில் மெய் எழுத்து எது?', 'Which one is a consonant (மெய்)?'), scene:'', opts: shuffle([ans, ...others]).map(v => ({v, h:`<span class="ta-big">${v}</span>`})), ans,
      ex:S(`${ans} — தலையில் புள்ளி உள்ளது, அதனால் மெய்.`, `${ans} — it has the dot, so it is a consonant.`), check:q => q.ans.endsWith(PULLI)}; } };
TX.uyirmeiBuild = { title:S('உயிர்மெய் உருவாக்கு', 'Build a vowel-consonant'), icon:'🧩',
  intro:S('மெய் + உயிர் = உயிர்மெய். க் + அ = க, க் + ஆ = கா, க் + இ = கி, க் + ஈ = கீ, க் + உ = கு, க் + ஊ = கூ, க் + எ = கெ, க் + ஏ = கே, க் + ஐ = கை, க் + ஒ = கொ, க் + ஓ = கோ, க் + ஔ = கௌ. 18 × 12 = 216 உயிர்மெய் எழுத்துகள்!', 'Consonant + vowel = vowel-consonant. க் + அ = க, க் + ஆ = கா, க் + இ = கி … 18 × 12 = 216 of them!'),
  gen(L){ const c = ri(0, 17), v = L.v ? pick(L.v) : ri(0, 11), ans = um(c, v);
    const rev = Math.random() < .35;
    if(rev){ const a = `${mei(c)} + ${UYIR[v]}`;
      const alt = [`${mei(c)} + ${UYIR[(v + 1) % 12]}`, `${mei(c)} + ${UYIR[(v + 11) % 12]}`, `${mei((c + 1) % 18)} + ${UYIR[v]}`, `${mei(c)} + ${UYIR[(v + 6) % 12]}`].filter(x => x !== a);
      return {p:S(`"${ans}" = ? + ?`, `"${ans}" = ? + ?`), scene:`<div class="big ta">${ans}</div>`, opts: shuffle([a, ...alt.slice(0, 3)]).map(x => ({v:x, h:`<span class="ta-mid">${x}</span>`})), ans:a,
        ex:S(`${ans} = ${a}`, `${ans} = ${a}`), check:q => q.ans === a}; }
    const near = [...new Set([v + 1, v - 1, v + 2, v - 2, v + 6, v - 6].filter(j => j >= 0 && j < 12 && j !== v))].map(j => um(c, j));
    return {p:S(`${mei(c)} + ${UYIR[v]} = ?`, `${mei(c)} + ${UYIR[v]} = ?`), scene:`<div class="big ta">${mei(c)} + ${UYIR[v]}</div>`,
      opts: shuffle([ans, ...shuffle(near).slice(0, 3)]).map(x => ({v:x, h:`<span class="ta-big">${x}</span>`})), ans,
      ex:S(`${mei(c)} + ${UYIR[v]} = ${ans}`, `${mei(c)} + ${UYIR[v]} = ${ans}`), check:q => q.ans === MEI[c] + SIGN[v]}; } };
TX.wordStart = { title:S('படம் — முதல் எழுத்து', 'Picture — first letter'), icon:'🖼️',
  intro:S('படத்தின் பெயரை மெதுவாகச் சொல்: "ம-ர-ம்". முதலில் வரும் ஒலியே முதல் எழுத்து.', 'Say the name slowly: "ma-ra-m". The first sound is the first letter.'),
  gen(){ const [w, e, parts] = pick(WORDS), ans = parts[0], alt = shuffle(letterVariants(ans)).slice(0, 3);
    return {p:S('இந்தப் படத்தின் பெயர் எந்த எழுத்தில் தொடங்குகிறது?', 'Which letter does this picture’s name start with?'), scene:`<div class="emo" style="font-size:64px">${e}</div>`,
      opts: shuffle([ans, ...alt]).map(v => ({v, h:`<span class="ta-big">${v}</span>`})), ans, ex:S(`${w} = ${parts.join(' + ')}`, `${w} = ${parts.join(' + ')}`), say:S(w, w), check:q => q.ans === parts[0]}; } };
TX.missingLetter = { title:S('விடுபட்ட எழுத்து', 'The missing letter'), icon:'🧩',
  intro:S('படத்தைப் பார்த்து, சொல்லை மெதுவாகச் சொல். எந்த ஒலி விடுபட்டிருக்கிறது?', 'Look at the picture and say the word slowly. Which sound is missing?'),
  gen(){ let item; do { item = pick(WORDS); } while(item[2].length < 2);
    const [w, e, parts] = item, i = ri(0, parts.length - 1), ans = parts[i], alt = shuffle(letterVariants(ans)).slice(0, 3);
    return {p:S('விடுபட்ட எழுத்து எது?', 'Which letter is missing?'), scene:`<div class="emo" style="font-size:56px">${e}</div><div class="big ta">${parts.map((x, j) => j === i ? '<span class="qbox">?</span>' : x).join('')}</div>`,
      opts: shuffle([ans, ...alt]).map(v => ({v, h:`<span class="ta-big">${v}</span>`})), ans, ex:S(`${w} = ${parts.join(' + ')}`, `${w} = ${parts.join(' + ')}`), say:S(w, w), check:q => q.ans === parts[i]}; } };
TX.letterFacts = pairGame({title:S('எழுத்துக் கணக்கு', 'Counting Tamil letters'), icon:'🔢',
  intro:S('உயிர் 12 + மெய் 18 + உயிர்மெய் 216 + ஆய்தம் 1 = மொத்தம் 247 தமிழ் எழுத்துகள். உயிர்மெய் = 18 மெய் × 12 உயிர்.', 'Vowels 12 + consonants 18 + vowel-consonants 216 + aaytham 1 = 247 Tamil letters. Vowel-consonants = 18 × 12.')}, [
  {q:S('உயிர் எழுத்துகள் எத்தனை?', 'How many vowels (உயிர்)?'), a:S('12', '12'), e:'அ'},
  {q:S('மெய் எழுத்துகள் எத்தனை?', 'How many consonants (மெய்)?'), a:S('18', '18'), e:'க்'},
  {q:S('உயிர்மெய் எழுத்துகள் எத்தனை?', 'How many vowel-consonants (உயிர்மெய்)?'), a:S('216', '216'), e:'கா'},
  {q:S('ஆய்த எழுத்து எத்தனை?', 'How many aaytham letters?'), a:S('1', '1'), e:'ஃ'},
  {q:S('தமிழில் மொத்த எழுத்துகள் எத்தனை?', 'How many Tamil letters in all?'), a:S('247', '247'), e:'📜'}
]);
TX.plural = pairGame({title:S('ஒருமை — பன்மை', 'One and many'), icon:'🌳🌳',
  intro:S('ஒன்று = ஒருமை; பல = பன்மை. பொதுவாக "-கள்" சேர்க்கிறோம்: மரம் → மரங்கள், பூ → பூக்கள், வீடு → வீடுகள்.', 'One = singular (ஒருமை); many = plural (பன்மை). Usually we add "-கள்": மரம் → மரங்கள், பூ → பூக்கள், வீடு → வீடுகள்.')}, [
  ['மரம்','மரங்கள்','🌳'], ['பழம்','பழங்கள்','🍎'], ['புத்தகம்','புத்தகங்கள்','📚'], ['பூ','பூக்கள்','🌸'], ['வீடு','வீடுகள்','🏠'], ['நாய்','நாய்கள்','🐕'],
  ['பறவை','பறவைகள்','🐦'], ['மாடு','மாடுகள்','🐄'], ['கண்','கண்கள்','👁️'], ['பந்து','பந்துகள்','⚽'], ['இலை','இலைகள்','🍃'], ['குழந்தை','குழந்தைகள்','👶']
].map(([a, b, e]) => ({q:S(`"${a}" — பன்மை என்ன?`, `Plural of "${a}"?`), a:S(b, b), e})), {say:it => S(it.a.ta, it.a.ta)});
TX.opposite = pairGame({title:S('எதிர்ச்சொல்', 'Opposites'), icon:'↕️',
  intro:S('எதிர்ச்சொல் = நேர் எதிரான பொருள் தரும் சொல்: பெரிய × சிறிய, இரவு × பகல்.', 'An opposite means the exact reverse: பெரிய × சிறிய (big × small), இரவு × பகல் (night × day).')}, [
  ['பெரிய','சிறிய','🐘🐭'], ['இரவு','பகல்','🌙☀️'], ['மேல்','கீழ்','⬆️⬇️'], ['உள்ளே','வெளியே','📦'], ['முன்','பின்','⏩⏪'], ['வலது','இடது','👉👈'],
  ['புதியது','பழையது','🆕'], ['நல்லது','கெட்டது','👍👎'], ['இனிப்பு','கசப்பு','🍬'], ['வெற்றி','தோல்வி','🏆'], ['சிரிப்பு','அழுகை','😄😢'], ['இன்பம்','துன்பம்','🙂🙁'],
  ['வெளிச்சம்','இருட்டு','💡'], ['அருகில்','தொலைவில்','📍'], ['நீளம்','குட்டை','📏'], ['சூடு','குளிர்ச்சி','🔥🧊']
].map(([a, b, e]) => ({q:S(`"${a}" — எதிர்ச்சொல் என்ன?`, `Opposite of "${a}"?`), a:S(b, b), e})));
const TAMIL_MONTHS = ['சித்திரை','வைகாசி','ஆனி','ஆடி','ஆவணி','புரட்டாசி','ஐப்பசி','கார்த்திகை','மார்கழி','தை','மாசி','பங்குனி'];
G.KALVI_TAMIL.MONTHS = TAMIL_MONTHS;
TX.tamilMonths = { title:S('தமிழ் மாதங்கள்', 'Tamil months'), icon:'🗓️',
  intro:S('சித்திரை, வைகாசி, ஆனி, ஆடி, ஆவணி, புரட்டாசி, ஐப்பசி, கார்த்திகை, மார்கழி, தை, மாசி, பங்குனி — 12 மாதங்கள். தமிழ்ப் புத்தாண்டு சித்திரையில், பொங்கல் தையில்.', 'Chithirai, Vaikasi, Aani, Aadi, Aavani, Purattasi, Aippasi, Karthigai, Margazhi, Thai, Maasi, Panguni — 12 months. Tamil New Year is in Chithirai, Pongal in Thai.'),
  gen(){ const i = ri(0, 11), ans = TAMIL_MONTHS[(i + 1) % 12];
    return {p:S(`${TAMIL_MONTHS[i]} மாதத்திற்கு அடுத்த மாதம் எது?`, `Which month comes after ${TAMIL_MONTHS[i]}?`), scene:'<div class="emo">🗓️</div>',
      opts: shuffle([ans, TAMIL_MONTHS[(i + 2) % 12], TAMIL_MONTHS[(i + 11) % 12], TAMIL_MONTHS[(i + 6) % 12]]).map(v => ({v, h:v})), ans,
      ex:S(`${TAMIL_MONTHS[i]} → ${ans}`, `${TAMIL_MONTHS[i]} → ${ans}`), check:q => TAMIL_MONTHS.indexOf(q.ans) === (i + 1) % 12}; } };

/* ================= ENGLISH ================= */
const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
TX.abcOrder = { title:S('ABC order', 'ABC order'), icon:'🔤',
  intro:S('A B C D E F G H I J K L M N O P Q R S T U V W X Y Z — 26 எழுத்துகள். பாட்டாகப் பாடினால் எளிதில் நினைவில் இருக்கும்!', 'A to Z — 26 letters. Singing the song makes them easy to remember!'),
  gen(){ const i = ri(1, 24), after = Math.random() < .6, ans = AZ[after ? i + 1 : i - 1];
    return {p: after ? S(`${AZ[i]}-க்கு அடுத்த எழுத்து?`, `Which letter comes after ${AZ[i]}?`) : S(`${AZ[i]}-க்கு முந்தைய எழுத்து?`, `Which letter comes before ${AZ[i]}?`),
      scene:`<div class="big">${AZ[i]}</div>`, opts: shuffle([ans, AZ[after ? i - 1 : i + 1], AZ[(i + 3) % 26], AZ[(i + 20) % 26]].filter((x, k, a) => a.indexOf(x) === k)).map(v => ({v, h:v})), ans,
      ex:S(`${AZ[i - 1]} ${AZ[i]} ${AZ[i + 1]}`, `${AZ[i - 1]} ${AZ[i]} ${AZ[i + 1]}`), check:q => q.ans === AZ[after ? i + 1 : i - 1]}; } };
TX.abcCase = { title:S('Capital & small', 'Capital & small letters'), icon:'Aa',
  intro:S('ஒவ்வொரு ஆங்கில எழுத்துக்கும் இரண்டு வடிவம்: பெரிய (A) மற்றும் சிறிய (a). பெயர்களும் வாக்கியங்களும் பெரிய எழுத்தில் தொடங்கும்.', 'Every English letter has two forms: capital (A) and small (a). Names and sentences begin with a capital.'),
  gen(){ const i = ri(0, 25), up = Math.random() < .5, q = up ? AZ[i] : AZ[i].toLowerCase(), ans = up ? AZ[i].toLowerCase() : AZ[i];
    const confus = {b:'d', d:'b', p:'q', q:'p', m:'n', n:'m', u:'n', h:'n'};
    const lower = AZ[i].toLowerCase(), c = [confus[lower], AZ[(i + 1) % 26].toLowerCase(), AZ[(i + 25) % 26].toLowerCase(), AZ[(i + 13) % 26].toLowerCase()].filter(Boolean).map(x => up ? x : x.toUpperCase()).filter(x => x !== ans);
    return {p: up ? S(`"${q}" — சிறிய எழுத்து எது?`, `Small letter for "${q}"?`) : S(`"${q}" — பெரிய எழுத்து எது?`, `Capital letter for "${q}"?`), scene:`<div class="big">${q}</div>`,
      opts: shuffle([ans, ...[...new Set(c)].slice(0, 3)]).map(v => ({v, h:v})), ans, ex:S(`${AZ[i]} ↔ ${lower}`, `${AZ[i]} ↔ ${lower}`), check:qq => qq.ans.toLowerCase() === lower}; } };
const PIC_WORDS = [['apple','🍎'],['ball','⚽'],['cat','🐈'],['dog','🐕'],['egg','🥚'],['fish','🐟'],['goat','🐐'],['hat','🎩'],['jar','🫙'],['kite','🪁'],['lion','🦁'],['mango','🥭'],
  ['nest','🪺'],['owl','🦉'],['pen','🖊️'],['rainbow','🌈'],['sun','☀️'],['tree','🌳'],['umbrella','☂️'],['van','🚐'],['watch','⌚'],['yo-yo','🪀'],['zebra','🦓']];
TX.firstLetter = { title:S('Picture → first letter', 'Picture → first letter'), icon:'🍎',
  intro:S('படத்தின் ஆங்கிலப் பெயரைச் சொல் — Apple, Ball, Cat… முதல் எழுத்து எது?', 'Say the English name of the picture — Apple, Ball, Cat… Which letter comes first?'),
  gen(){ const [w, e] = pick(PIC_WORDS), ans = w[0].toUpperCase(), i = AZ.indexOf(ans);
    return {p:S('இந்தப் படத்தின் ஆங்கிலப் பெயர் எந்த எழுத்தில் தொடங்குகிறது?', 'Which letter does this picture’s English name begin with?'), scene:`<div class="emo" style="font-size:64px">${e}</div>`,
      opts: shuffle([ans, AZ[(i + 1) % 26], AZ[(i + 25) % 26], AZ[(i + 7) % 26]]).map(v => ({v, h:v})), ans, ex:S(`${w} → ${ans}`, `${w} → ${ans}`), say:S(w, w), check:q => q.ans === w[0].toUpperCase()}; } };
const CVC = [['cat','🐈'],['dog','🐕'],['sun','☀️'],['pen','🖊️'],['pin','📌'],['pan','🍳'],['bus','🚌'],['cup','☕'],['hat','🎩'],['bag','👜'],['pig','🐖'],['fox','🦊'],['bed','🛏️'],['box','📦'],['hen','🐔'],['bat','🦇'],['net','🥅']];
TX.cvc = { title:S('Missing vowel', 'Missing vowel'), icon:'🔡',
  intro:S('a, e, i, o, u — இவை ஆங்கில உயிர் எழுத்துகள் (vowels). ஒவ்வொரு ஒலியையும் சேர்த்துச் சொல்லிப் பார்: c-a-t = cat.', 'a, e, i, o, u are the vowels. Blend each sound: c-a-t = cat.'),
  gen(){ const [w, e] = pick(CVC), ans = w[1];
    return {p:S('விடுபட்ட எழுத்து எது?', 'Which vowel is missing?'), scene:`<div class="emo" style="font-size:56px">${e}</div><div class="big">${w[0]}<span class="qbox">?</span>${w[2]}</div>`,
      opts: shuffle(['a','e','i','o','u'].filter(x => x !== ans)).slice(0, 3).concat([ans]).sort().map(v => ({v, h:v})), ans, ex:S(`${w[0]}-${ans}-${w[2]} = ${w}`, `${w[0]}-${ans}-${w[2]} = ${w}`), say:S(w, w), check:q => q.ans === w[1]}; } };
TX.enOpposite = pairGame({title:S('Opposites', 'Opposites'), icon:'↔️', intro:S('Opposite = எதிர்ச்சொல். big × small, hot × cold.', 'An opposite has the reverse meaning: big × small, hot × cold.')}, [
  ['big','small','🐘'], ['hot','cold','🔥'], ['day','night','☀️'], ['up','down','⬆️'], ['in','out','📦'], ['open','closed','🚪'], ['happy','sad','😄'], ['fast','slow','🐇'],
  ['tall','short','🦒'], ['full','empty','🥛'], ['heavy','light','🏋️'], ['clean','dirty','🧼'], ['early','late','⏰'], ['strong','weak','💪'], ['wet','dry','💧'], ['push','pull','🛒'], ['left','right','👈'], ['thick','thin','📚']
].map(([a, b, e]) => ({q:S(`Opposite of "${a}"?`, `Opposite of "${a}"?`), a:S(b, b), e})));
TX.enPlural = pairGame({title:S('One → many (plural)', 'One → many (plural)'), icon:'📚',
  intro:S('பெரும்பாலும் -s: cat → cats. -s, -x, -sh, -ch முடிவில் -es: box → boxes. y → ies: baby → babies. சில சிறப்பு: man → men, child → children, mouse → mice, tooth → teeth.', 'Usually add -s: cat → cats. After s, x, sh, ch add -es: box → boxes. y → ies: baby → babies. Special ones: man → men, child → children, mouse → mice, tooth → teeth.')}, [
  ['cat','cats'], ['box','boxes'], ['bus','buses'], ['baby','babies'], ['man','men'], ['woman','women'], ['child','children'], ['mouse','mice'], ['tooth','teeth'], ['foot','feet'],
  ['leaf','leaves'], ['knife','knives'], ['city','cities'], ['dish','dishes'], ['sheep','sheep'], ['brush','brushes'], ['toy','toys'], ['bench','benches']
].map(([a, b]) => ({q:S(`Plural of "${a}"?`, `Plural of "${a}"?`), a:S(b, b)})));
TX.article = { title:S('a or an?', 'a or an?'), icon:'🅰️',
  intro:S('உயிர் ஒலியில் (a, e, i, o, u ஒலி) தொடங்கும் சொல்லுக்கு "an": an apple, an egg. மற்றவைக்கு "a": a ball. ஒலியைப் பார், எழுத்தை அல்ல: an hour (h ஒலிக்காது), a university (யூ ஒலி).', 'Use "an" before a vowel sound: an apple, an egg; "a" before other sounds: a ball. Listen to the sound, not the letter: an hour (silent h), a university ("yoo" sound).'),
  gen(L){ const easy = [['apple','an'],['egg','an'],['umbrella','an'],['owl','an'],['elephant','an'],['orange','an'],['ink pot','an'],['ball','a'],['cat','a'],['kite','a'],['mango','a'],['pen','a'],['tree','a'],['dog','a']];
    const hard = [['hour','an'],['honest boy','an'],['university','a'],['uniform','a'],['one-rupee coin','a'],['MLA','an']];
    const [w, ans] = pick(L.hard ? easy.concat(hard) : easy);
    return {p:S(`___ ${w}`, `___ ${w}`), scene:`<div class="big">___ ${w}</div>`, opts:[{v:'a', h:'a'}, {v:'an', h:'an'}], ans,
      ex:S(`${ans} ${w}`, `${ans} ${w}`)}; } };
TX.pastTense = pairGame({title:S('Past tense', 'Past tense'), icon:'⏪', intro:S('நேற்று நடந்ததைச் சொல்ல: பெரும்பாலும் -ed (play → played). சிலவை தனி வடிவம்: go → went, eat → ate, see → saw.', 'To talk about yesterday: usually add -ed (play → played). Some are special: go → went, eat → ate, see → saw.')}, [
  ['go','went'], ['eat','ate'], ['see','saw'], ['run','ran'], ['write','wrote'], ['come','came'], ['take','took'], ['sing','sang'], ['drink','drank'], ['give','gave'],
  ['swim','swam'], ['sleep','slept'], ['buy','bought'], ['catch','caught'], ['teach','taught'], ['fly','flew'], ['draw','drew'], ['speak','spoke'], ['play','played'], ['jump','jumped'], ['walk','walked']
].map(([a, b]) => ({q:S(`Past tense of "${a}"?`, `Past tense of "${a}"?`), a:S(b, b)})));
const RHYME = [['cat',['hat','bat','mat']],['sun',['fun','bun','run']],['pen',['hen','ten','men']],['cake',['lake','bake','make']],['star',['car','jar','far']],['ball',['tall','wall','call']],
  ['fish',['dish','wish']],['bee',['tree','see','three']],['boat',['coat','goat']],['frog',['log','dog','fog']],['king',['ring','sing','wing']],['mouse',['house']]];
TX.rhyme = { title:S('Rhyming words', 'Rhyming words'), icon:'🎵', intro:S('ஒரே மாதிரி முடியும் ஒலி = rhyme: cat – hat – bat.', 'Words that end with the same sound rhyme: cat – hat – bat.'),
  gen(){ const r = pick(RHYME), ans = pick(r[1]); const allRhymes = new Set([r[0], ...r[1]]);
    const pool = RHYME.filter(x => x !== r).flatMap(x => [x[0], ...x[1]]).filter(x => !allRhymes.has(x));
    return {p:S(`"${r[0]}" உடன் rhyme ஆகும் சொல் எது?`, `Which word rhymes with "${r[0]}"?`), scene:`<div class="big">${r[0]}</div>`, opts: shuffle([ans, ...shuffle(pool).slice(0, 3)]).map(v => ({v, h:v})), ans,
      ex:S(`${r[0]} – ${ans}`, `${r[0]} – ${ans}`), say:S(r[0], r[0])}; } };
const DICT_WORDS = ['apple','ant','ball','bird','cat','cup','dog','duck','egg','fan','fish','goat','hat','ink','jug','kite','lamp','lion','mango','nest','owl','pen','queen','rat','sun','tree','van','wall','yak','zoo','bag','bat','cow','cap','hen','hut','map','mat','pig','pot'];
TX.dictOrder = { title:S('Dictionary order', 'Dictionary order'), icon:'📖',
  intro:S('அகராதியில் சொற்கள் முதல் எழுத்தின் ABC வரிசையில். முதல் எழுத்து ஒன்றாக இருந்தால் இரண்டாவது எழுத்தைப் பார்: bag, ball, bat.', 'Dictionaries list words in ABC order of the first letter. If the first letters match, look at the second: bag, ball, bat.'),
  gen(){ const ws = shuffle(DICT_WORDS).slice(0, 4), ans = ws.slice().sort()[0];
    return {p:S('அகராதியில் முதலில் வரும் சொல் எது?', 'Which word comes first in a dictionary?'), scene:'<div class="emo">📖</div>', opts: ws.map(v => ({v, h:v})), ans,
      ex:S(`ABC வரிசை: ${ws.slice().sort().join(', ')}`, `ABC order: ${ws.slice().sort().join(', ')}`), check:q => q.ans === ws.slice().sort()[0]}; } };

/* ================= SCIENCE / EVS ================= */
TX.living = sortGame({title:S('உயிருள்ளவை / உயிரற்றவை', 'Living / non-living'), icon:'🌱',
  intro:S('உயிருள்ளவை: வளரும், உணவு உண்ணும், சுவாசிக்கும், தம்மைப் போன்றவற்றை உருவாக்கும். தாவரங்களும் உயிருள்ளவையே! உயிரற்றவை இவற்றைச் செய்யாது.', 'Living things grow, eat, breathe and make more of their own kind. Plants are living too! Non-living things do none of these.'),
  rule:S('உயிருள்ளவை வளரும், சுவாசிக்கும், உண்ணும்.', 'Living things grow, breathe and feed.')},
  [{id:'l', e:'🌱', ta:'உயிருள்ளவை', en:'Living'}, {id:'n', e:'🪨', ta:'உயிரற்றவை', en:'Non-living'}],
  [['🌳','மரம்','tree','l'],['🐄','பசு','cow','l'],['🐟','மீன்','fish','l'],['🐦','பறவை','bird','l'],['🧒','குழந்தை','child','l'],['🌱','செடி','plant','l'],['🐜','எறும்பு','ant','l'],['🦋','வண்ணத்துப்பூச்சி','butterfly','l'],['🐘','யானை','elephant','l'],['🐓','சேவல்','rooster','l'],
   ['🪨','கல்','stone','n'],['🚗','கார்','car','n'],['🪑','நாற்காலி','chair','n'],['📱','கைபேசி','phone','n'],['⚽','பந்து','ball','n'],['🏠','வீடு','house','n'],['✏️','பென்சில்','pencil','n'],['🧸','பொம்மை','toy','n'],['🚲','மிதிவண்டி','bicycle','n'],['⏰','கடிகாரம்','clock','n']
  ].map(([e, ta, en, bin]) => ({e, ta, en, bin})), 8);
TX.animalHomes = pairGame({title:S('விலங்குகளின் வீடு', 'Animal homes'), icon:'🪺', intro:S('ஒவ்வொரு உயிரினத்திற்கும் அதற்கேற்ற வீடு: பறவைக்குக் கூடு, சிங்கத்திற்குக் குகை, சிலந்திக்கு வலை.', 'Every animal has a home that suits it: a bird’s nest, a lion’s den, a spider’s web.')}, [
  ['🐦','பறவை','bird','கூடு','nest'], ['🐝','தேனீ','bee','தேன்கூடு','hive'], ['🦁','சிங்கம்','lion','குகை','den'], ['🕷️','சிலந்தி','spider','வலை','web'], ['🐎','குதிரை','horse','லாயம்','stable'],
  ['🐄','பசு','cow','தொழுவம்','shed'], ['🐜','எறும்பு','ant','புற்று','anthill'], ['🐔','கோழி','hen','கூண்டு','coop'], ['🐟','மீன்','fish','நீர்','water']
].map(([e, ta, en, a, ae]) => ({e, q:S(`${ta} எங்கே வசிக்கும்?`, `Where does a ${en} live?`), a:S(a, ae)})));
TX.foodHabit = sortGame({title:S('எதை உண்ணும்?', 'What do they eat?'), icon:'🦁',
  intro:S('தாவர உண்ணி — தாவரங்களை மட்டும் (பசு, மான்). ஊன் உண்ணி — பிற விலங்குகளை (சிங்கம், புலி). அனைத்துண்ணி — இரண்டையும் (கரடி, கோழி, மனிதர்).', 'Herbivores eat only plants (cow, deer). Carnivores eat other animals (lion, tiger). Omnivores eat both (bear, hen, humans).')},
  [{id:'h', e:'🌿', ta:'தாவர உண்ணி', en:'Herbivore'}, {id:'c', e:'🍖', ta:'ஊன் உண்ணி', en:'Carnivore'}, {id:'o', e:'🍽️', ta:'அனைத்துண்ணி', en:'Omnivore'}],
  [['🐄','பசு','cow','h'],['🐐','ஆடு','goat','h'],['🦌','மான்','deer','h'],['🐘','யானை','elephant','h'],['🐇','முயல்','rabbit','h'],['🦒','ஒட்டகச்சிவிங்கி','giraffe','h'],['🐎','குதிரை','horse','h'],
   ['🦁','சிங்கம்','lion','c'],['🐅','புலி','tiger','c'],['🦅','கழுகு','eagle','c'],['🐍','பாம்பு','snake','c'],['🐺','ஓநாய்','wolf','c'],['🐊','முதலை','crocodile','c'],
   ['🐻','கரடி','bear','o'],['🐓','கோழி','hen','o'],['🧑','மனிதர்','human','o'],['🐖','பன்றி','pig','o']].map(([e, ta, en, bin]) => ({e, ta, en, bin})), 6);
const PARTS = {root:S('வேர்','root'), stem:S('தண்டு','stem'), leaf:S('இலை','leaf'), flower:S('பூ','flower'), fruit:S('கனி','fruit'), seed:S('விதை','seed')};
TX.plantParts = { title:S('தாவரத்தின் எந்தப் பகுதியை உண்கிறோம்?', 'Which plant part do we eat?'), icon:'🥕',
  intro:S('கேரட், முள்ளங்கி = வேர். உருளைக்கிழங்கு, இஞ்சி, கரும்பு = தண்டு (மண்ணுக்குள் இருந்தாலும் உருளைக்கிழங்கு தண்டுதான் — அதில் "கண்கள்" என்ற மொட்டுகள் உண்டு!). கீரை = இலை. காலிஃப்ளவர், வாழைப்பூ = பூ. கத்தரி, தக்காளி = கனி. அரிசி, பட்டாணி, நிலக்கடலை = விதை.', 'Carrot, radish = root. Potato, ginger, sugarcane = stem (a potato grows underground but is a stem — its "eyes" are buds!). Spinach = leaf. Cauliflower, banana flower = flower. Brinjal, tomato = fruit. Rice, peas, groundnut = seed.'),
  data: [['🥕','கேரட்','carrot','root'],['','முள்ளங்கி','radish','root'],['','பீட்ரூட்','beetroot','root'],['🥔','உருளைக்கிழங்கு','potato','stem'],['🫚','இஞ்சி','ginger','stem'],['','கரும்பு','sugarcane','stem'],
   ['🥬','கீரை','spinach','leaf'],['🌿','கறிவேப்பிலை','curry leaves','leaf'],['🌿','கொத்தமல்லி இலை','coriander leaves','leaf'],['','காலிஃப்ளவர்','cauliflower','flower'],['🥦','ப்ரோக்கோலி','broccoli','flower'],['','வாழைப்பூ','banana flower','flower'],
   ['🍆','கத்தரிக்காய்','brinjal','fruit'],['🍅','தக்காளி','tomato','fruit'],['🥒','வெள்ளரிக்காய்','cucumber','fruit'],['🫛','பட்டாணி','peas','seed'],['🍚','அரிசி','rice','seed'],['🥜','நிலக்கடலை','groundnut','seed'],['🌽','மக்காச்சோளம்','corn','seed']],
  gen(){ const [e, ta, en, part] = pick(this.data), keys = Object.keys(PARTS), opts = shuffle([part, ...shuffle(keys.filter(k => k !== part)).slice(0, 3)]);
    return {p:S(`${ta} — தாவரத்தின் எந்தப் பகுதி?`, `${en} — which part of the plant?`), scene:`<div class="emo" style="font-size:56px">${e}</div><div class="big" style="font-size:22px">${ta} / ${en}</div>`,
      opts: opts.map(k => ({v:k, h:`${PARTS[k].ta} / ${PARTS[k].en}`})), ans:part, ex:S(`${ta} = ${PARTS[part].ta}`, `${en} = ${PARTS[part].en}`)}; } };
TX.matter = sortGame({title:S('திண்மம், திரவம், வாயு', 'Solid, liquid, gas'), icon:'🧊',
  intro:S('திண்மம் — தனக்கென வடிவம் உண்டு (கல், பனிக்கட்டி). திரவம் — ஊற்றலாம், பாத்திரத்தின் வடிவம் எடுக்கும் (நீர், பால்). வாயு — முழு இடத்தையும் நிரப்பும், பெரும்பாலும் கண்ணுக்குத் தெரியாது (காற்று, நீராவி).', 'Solids keep their own shape (stone, ice). Liquids can be poured and take the shape of the container (water, milk). Gases fill all the space and are mostly invisible (air, steam).')},
  [{id:'s', e:'🧊', ta:'திண்மம்', en:'Solid'}, {id:'l', e:'💧', ta:'திரவம்', en:'Liquid'}, {id:'g', e:'💨', ta:'வாயு', en:'Gas'}],
  [['🪨','கல்','stone','s'],['🧊','பனிக்கட்டி','ice','s'],['🪵','மரக்கட்டை','wood','s'],['🥄','கரண்டி','spoon','s'],['✏️','பென்சில்','pencil','s'],['🧱','செங்கல்','brick','s'],
   ['💧','நீர்','water','l'],['🥛','பால்','milk','l'],['🧃','பழச்சாறு','juice','l'],['🫗','எண்ணெய்','oil','l'],['🍯','தேன்','honey','l'],
   ['🌬️','காற்று','air','g'],['♨️','நீராவி','steam','g'],['O₂','ஆக்சிஜன்','oxygen','g']].map(([e, ta, en, bin]) => ({e, ta, en, bin})), 6);
TX.senses = pairGame({title:S('ஐம்புலன்கள்', 'Our five senses'), icon:'👁️', intro:S('கண் — பார்த்தல், காது — கேட்டல், மூக்கு — நுகர்தல், நாக்கு — சுவைத்தல், தோல் — தொடு உணர்வு.', 'Eyes — see, ears — hear, nose — smell, tongue — taste, skin — touch.')}, [
  ['👁️','கண்','eye','பார்த்தல்','seeing'], ['👂','காது','ear','கேட்டல்','hearing'], ['👃','மூக்கு','nose','நுகர்தல்','smelling'], ['👅','நாக்கு','tongue','சுவைத்தல்','tasting'], ['✋','தோல்','skin','தொடு உணர்வு','touch']
].map(([e, ta, en, a, ae]) => ({e, q:S(`${ta} — எந்த உணர்வு?`, `${en} — which sense?`), a:S(a, ae)})));
TX.organs = pairGame({title:S('உறுப்பு மண்டலங்கள்', 'Organ systems'), icon:'🫀', intro:S('இதயம் — இரத்த ஓட்ட மண்டலம், நுரையீரல் — சுவாச மண்டலம், இரைப்பை — செரிமான மண்டலம், மூளை — நரம்பு மண்டலம், எலும்புகள் — எலும்பு மண்டலம், சிறுநீரகம் — கழிவு நீக்க மண்டலம்.', 'Heart — circulatory, lungs — respiratory, stomach — digestive, brain — nervous, bones — skeletal, kidneys — excretory.')}, [
  ['🫀','இதயம்','heart','இரத்த ஓட்ட மண்டலம்','circulatory system'], ['🫁','நுரையீரல்','lungs','சுவாச மண்டலம்','respiratory system'], ['🍽️','இரைப்பை','stomach','செரிமான மண்டலம்','digestive system'],
  ['🧠','மூளை','brain','நரம்பு மண்டலம்','nervous system'], ['🦴','எலும்புகள்','bones','எலும்பு மண்டலம்','skeletal system'], ['🩺','சிறுநீரகம்','kidneys','கழிவு நீக்க மண்டலம்','excretory system']
].map(([e, ta, en, a, ae]) => ({e, q:S(`${ta} எந்த மண்டலத்தைச் சேர்ந்தது?`, `The ${en} belong to which system?`), a:S(a, ae)})));
TX.foodGroups = sortGame({title:S('உணவு வகைகள்', 'Food groups'), icon:'🍱',
  intro:S('ஆற்றல் தரும் உணவு — அரிசி, கோதுமை, உருளைக்கிழங்கு. உடல் வளர்ச்சி உணவு (புரதம்) — பருப்பு, முட்டை, பால், மீன். பாதுகாப்பு உணவு (வைட்டமின், தாது) — காய்கறிகள், பழங்கள்.', 'Energy-giving — rice, wheat, potato. Body-building (protein) — dal, egg, milk, fish. Protective (vitamins, minerals) — vegetables and fruits.')},
  [{id:'e', e:'⚡', ta:'ஆற்றல் தரும்', en:'Energy-giving'}, {id:'b', e:'💪', ta:'உடல் வளர்ச்சி', en:'Body-building'}, {id:'p', e:'🛡️', ta:'பாதுகாப்பு', en:'Protective'}],
  [['🍚','சோறு','rice','e'],['🫓','சப்பாத்தி','chapati','e'],['🥔','உருளைக்கிழங்கு','potato','e'],['🍞','ரொட்டி','bread','e'],
   ['🥚','முட்டை','egg','b'],['🥛','பால்','milk','b'],['🍲','பருப்பு','dal','b'],['🐟','மீன்','fish','b'],['🥜','நிலக்கடலை','groundnut','b'],
   ['🥕','கேரட்','carrot','p'],['🍎','ஆப்பிள்','apple','p'],['🍊','ஆரஞ்சு','orange','p'],['🥦','ப்ரோக்கோலி','broccoli','p'],['🍅','தக்காளி','tomato','p'],['🥬','கீரை','spinach','p']].map(([e, ta, en, bin]) => ({e, ta, en, bin})), 6);
TX.floatSink = sortGame({title:S('மிதக்குமா, மூழ்குமா?', 'Float or sink?'), icon:'🛶',
  intro:S('நீரில் போட்டுப் பார்த்துச் சோதனை செய்! இலை, மரக்கட்டை, இறகு, பனிக்கட்டி மிதக்கும். கல், சாவி, நாணயம், இரும்பு ஆணி மூழ்கும்.', 'Test it in a bucket of water! A leaf, wood, a feather and ice float. A stone, key, coin and iron nail sink.')},
  [{id:'f', e:'🛟', ta:'மிதக்கும்', en:'Floats'}, {id:'s', e:'⬇️', ta:'மூழ்கும்', en:'Sinks'}],
  [['🍃','இலை','leaf','f'],['🪵','மரக்கட்டை','wooden block','f'],['🪶','இறகு','feather','f'],['🧊','பனிக்கட்டி','ice','f'],['🧽','கடற்பஞ்சு','sponge','f'],['🥥','தேங்காய்','coconut','f'],
   ['🪨','கல்','stone','s'],['🔑','சாவி','key','s'],['🪙','நாணயம்','coin','s'],['🔩','இரும்பு ஆணி','iron nail','s'],['🥄','எஃகுக் கரண்டி','steel spoon','s']].map(([e, ta, en, bin]) => ({e, ta, en, bin})), 6);
TX.energy = sortGame({title:S('ஆற்றல் மூலங்கள்', 'Energy sources'), icon:'☀️',
  intro:S('புதுப்பிக்கத்தக்கவை — தீர்ந்து போகாதவை: சூரிய ஒளி, காற்று, ஓடும் நீர். புதுப்பிக்க இயலாதவை — ஒருமுறை பயன்படுத்தினால் தீர்ந்துவிடும்: நிலக்கரி, பெட்ரோல், டீசல், இயற்கை எரிவாயு.', 'Renewable — they don’t run out: sunlight, wind, flowing water. Non-renewable — once used up they are gone: coal, petrol, diesel, natural gas.')},
  [{id:'r', e:'♻️', ta:'புதுப்பிக்கத்தக்கது', en:'Renewable'}, {id:'n', e:'⛽', ta:'புதுப்பிக்க இயலாதது', en:'Non-renewable'}],
  [['☀️','சூரிய ஒளி','sunlight','r'],['🌬️','காற்று','wind','r'],['🌊','ஓடும் நீர்','flowing water','r'],['🐄','சாண எரிவாயு','biogas','r'],
   ['⚫','நிலக்கரி','coal','n'],['⛽','பெட்ரோல்','petrol','n'],['🛢️','டீசல்','diesel','n'],['🔥','இயற்கை எரிவாயு','natural gas','n']].map(([e, ta, en, bin]) => ({e, ta, en, bin})), 6);
TX.pushPull = pairGame({title:S('தள்ளுதல் / இழுத்தல்', 'Push or pull'), icon:'🛒', intro:S('விசை = தள்ளுதல் அல்லது இழுத்தல். பொருளை நம்மிடமிருந்து விலக்கினால் தள்ளுதல்; நம்மை நோக்கிக் கொண்டுவந்தால் இழுத்தல்.', 'A force is a push or a pull. Moving something away from you is a push; bringing it towards you is a pull.')}, [
  ['⚽','பந்தை உதைத்தல்','kicking a ball','தள்ளுதல்','push'], ['🗄️','இழுப்பறையைத் திறத்தல்','opening a drawer','இழுத்தல்','pull'], ['🪢','கயிறு இழுக்கும் போட்டி','tug of war','இழுத்தல்','pull'],
  ['🛒','வண்டியைத் தள்ளுதல்','pushing a cart','தள்ளுதல்','push'], ['🥭','மரத்திலிருந்து பழம் பறித்தல்','plucking a fruit','இழுத்தல்','pull'], ['⌨️','பொத்தானை அழுத்துதல்','pressing a button','தள்ளுதல்','push'],
  ['🪣','கிணற்றிலிருந்து நீர் இறைத்தல்','drawing water from a well','இழுத்தல்','pull'], ['🥎','பந்தை எறிதல்','throwing a ball','தள்ளுதல்','push']
].map(([e, ta, en, a, ae]) => ({e, q:S(`${ta} — தள்ளுதலா, இழுத்தலா?`, `${en} — push or pull?`), a:S(a, ae)})));
TX.safety = sortGame({title:S('பாதுகாப்பானதா?', 'Safe or unsafe?'), icon:'🦺',
  intro:S('ஆபத்தைத் தவிர்ப்பது புத்திசாலித்தனம். சந்தேகம் என்றால் பெரியவரிடம் கேள்.', 'Avoiding danger is smart. When in doubt, ask a grown-up.')},
  [{id:'s', e:'✅', ta:'பாதுகாப்பானது', en:'Safe'}, {id:'u', e:'⛔', ta:'ஆபத்தானது', en:'Unsafe'}],
  [['🪖','வண்டியில் தலைக்கவசம் அணிதல்','wearing a helmet on a bike','s'],['🚸','சிக்னலில் வரிக்குதிரைக் கோட்டில் சாலையைக் கடத்தல்','crossing at the zebra crossing with the signal','s'],['🧼','சாப்பிடும் முன் கைகழுவுதல்','washing hands before eating','s'],['🚗','சீட் பெல்ட் அணிதல்','wearing a seat belt','s'],
   ['🔌','ஈரக் கையால் மின் பிளக்கைத் தொடுதல்','touching a plug with wet hands','u'],['🧨','தனியாகப் பட்டாசு வெடித்தல்','bursting crackers alone','u'],['🏊','தனியாகக் குளத்தில் நீந்துதல்','swimming alone in a pond','u'],['🚶','தெரியாதவருடன் போதல்','going with a stranger','u'],['🛣️','சாலையில் ஓடி விளையாடுதல்','playing on the road','u']
  ].map(([e, ta, en, bin]) => ({e, ta, en, bin})), 6);
TX.water = sortGame({title:S('நீரைச் சேமி', 'Save water'), icon:'🚰',
  intro:S('ஒவ்வொரு துளியும் முக்கியம். நல்ல பழக்கங்கள் நீரைச் சேமிக்கின்றன; கவனக்குறைவு வீணாக்குகிறது.', 'Every drop counts. Good habits save water; carelessness wastes it.')},
  [{id:'s', e:'💧', ta:'சேமிக்கிறது', en:'Saves water'}, {id:'w', e:'🚱', ta:'வீணாக்குகிறது', en:'Wastes water'}],
  [['🪥','பல் துலக்கும்போது குழாயை மூடுதல்','closing the tap while brushing','s'],['🔧','ஒழுகும் குழாயைச் சரிசெய்தல்','fixing a leaking tap','s'],['🪴','அரிசி கழுவிய நீரைச் செடிக்கு ஊற்றுதல்','watering plants with rice-wash water','s'],['🌧️','மழைநீரைச் சேகரித்தல்','collecting rainwater','s'],
   ['🚿','குழாயைத் திறந்தே விடுதல்','leaving the tap running','w'],['🚙','ஓடும் குழாய் நீரில் வண்டி கழுவுதல்','washing a vehicle with a running hose','w'],['🪣','நிரம்பி வழியும் தொட்டியைக் கவனிக்காமல் விடுதல்','ignoring an overflowing tank','w']
  ].map(([e, ta, en, bin]) => ({e, ta, en, bin})), 6);

/* ================= SOCIAL ================= */
TX.transport = sortGame({title:S('போக்குவரத்து', 'Transport'), icon:'🚌', intro:S('நிலம் — பேருந்து, ரயில். நீர் — கப்பல், படகு. வான் — விமானம், ஹெலிகாப்டர்.', 'Land — bus, train. Water — ship, boat. Air — aeroplane, helicopter.')},
  [{id:'l', e:'🛣️', ta:'நிலம்', en:'Land'}, {id:'w', e:'🌊', ta:'நீர்', en:'Water'}, {id:'a', e:'☁️', ta:'வான்', en:'Air'}],
  [['🚌','பேருந்து','bus','l'],['🚂','ரயில்','train','l'],['🚲','மிதிவண்டி','bicycle','l'],['🛺','ஆட்டோ','auto rickshaw','l'],['🚗','கார்','car','l'],
   ['🚢','கப்பல்','ship','w'],['⛵','பாய்மரப் படகு','sailing boat','w'],['🛶','படகு','canoe','w'],['✈️','விமானம்','aeroplane','a'],['🚁','ஹெலிகாப்டர்','helicopter','a'],['🛩️','சிறிய விமானம்','small plane','a']].map(([e, ta, en, bin]) => ({e, ta, en, bin})), 6);
TX.directions = { title:S('திசைகள்', 'Directions'), icon:'🧭',
  intro:S('வரைபடத்தில் மேலே வடக்கு, கீழே தெற்கு, வலது கிழக்கு, இடது மேற்கு. காலையில் சூரியன் கிழக்கில் உதிக்கிறது!', 'On a map: up is North, down is South, right is East, left is West. The sun rises in the East every morning!'),
  gen(){ const places = shuffle([['🏥','மருத்துவமனை','hospital'],['🏪','கடை','shop'],['🌳','பூங்கா','park'],['🛕','கோயில்','temple'],['🏦','வங்கி','bank'],['🏤','அஞ்சலகம்','post office'],['🚉','ரயில் நிலையம்','station'],['⛪','தேவாலயம்','church']]);
    const dirs = [{k:'N', ta:'வடக்கு', to:'வடக்கே', en:'north', r:0, c:1}, {k:'S', ta:'தெற்கு', to:'தெற்கே', en:'south', r:2, c:1}, {k:'E', ta:'கிழக்கு', to:'கிழக்கே', en:'east', r:1, c:2}, {k:'W', ta:'மேற்கு', to:'மேற்கே', en:'west', r:1, c:0}];
    const grid = [[null,null,null],[null,['🏫','பள்ளி','school'],null],[null,null,null]];
    dirs.forEach((d, i) => { grid[d.r][d.c] = places[i]; });
    const d = pick(dirs), ans = grid[d.r][d.c][1];
    const html = `<div class="map"><div class="compass">N ⬆</div><table>${grid.map(row => `<tr>${row.map(c => `<td>${c ? `<div style="font-size:30px">${c[0]}</div><small>${c[1]}</small>` : ''}</td>`).join('')}</tr>`).join('')}</table></div>`;
    return {p:S(`பள்ளிக்கு ${d.to} உள்ள இடம் எது?`, `Which place is to the ${d.en} of the school?`), scene:html,
      opts: shuffle(dirs.map(x => grid[x.r][x.c])).map(x => ({v:x[1], h:`${x[0]} ${x[1]} / ${x[2]}`})), ans,
      ex:S(`வரைபடத்தில் ${d.ta} = ${d.k === 'N' ? 'மேலே' : d.k === 'S' ? 'கீழே' : d.k === 'E' ? 'வலது' : 'இடது'} → ${ans}`, `On a map ${d.en} = ${d.k === 'N' ? 'up' : d.k === 'S' ? 'down' : d.k === 'E' ? 'right' : 'left'} → ${grid[d.r][d.c][2]}`), check:q => q.ans === grid[d.r][d.c][1]}; } };
TX.landforms = pairGame({title:S('ஐவகை நிலங்கள்', 'The five Tamil landscapes'), icon:'⛰️',
  intro:S('சங்க காலத் தமிழர்கள் நிலத்தை ஐந்தாகப் பிரித்தனர்: குறிஞ்சி — மலை; முல்லை — காடு; மருதம் — வயல்; நெய்தல் — கடல்; பாலை — வறண்ட மணல் நிலம்.', 'Sangam-age Tamils divided land into five: Kurinji — mountains; Mullai — forest; Marutham — farmland; Neithal — seashore; Paalai — dry sandy land.')}, [
  ['⛰️','குறிஞ்சி','Kurinji','மலையும் மலை சார்ந்த இடமும்','mountains'], ['🌲','முல்லை','Mullai','காடும் காடு சார்ந்த இடமும்','forest'], ['🌾','மருதம்','Marutham','வயலும் வயல் சார்ந்த இடமும்','farmland'],
  ['🌊','நெய்தல்','Neithal','கடலும் கடல் சார்ந்த இடமும்','seashore'], ['🏜️','பாலை','Paalai','வறண்ட மணல் நிலம்','dry sandy land']
].map(([e, ta, en, a, ae]) => ({e, q:S(`${ta} என்பது எந்த நிலம்?`, `${en} is which landscape?`), a:S(a, ae)})));
TX.vallal = pairGame({title:S('கடையெழு வள்ளல்கள்', 'Great givers of the Sangam age'), icon:'🎁',
  intro:S('சங்க கால வள்ளல்கள் பெரும் கொடைக்குப் பெயர் பெற்றவர்கள். பாரி — படரக் கொம்பில்லாத முல்லைக் கொடிக்குத் தன் தேரைக் கொடுத்தார். பேகன் — குளிரில் நடுங்குவதாக எண்ணி மயிலுக்குப் போர்வை போர்த்தினார். அதியமான் — நீண்ட ஆயுள் தரும் நெல்லிக்கனியை ஔவையாருக்குக் கொடுத்தார்.', 'The Sangam patrons were famous for generosity. Paari gave his chariot to a jasmine creeper that had nothing to climb. Pegan wrapped a shawl round a peacock he thought was shivering. Athiyaman gave Avvaiyar the rare gooseberry said to give long life.')}, [
  ['🌿','பாரி','Paari','முல்லைக் கொடிக்குத் தேர்','a chariot for a jasmine creeper'], ['🦚','பேகன்','Pegan','மயிலுக்குப் போர்வை','a shawl for a peacock'], ['🍏','அதியமான்','Athiyaman','ஔவையாருக்கு நெல்லிக்கனி','a gooseberry for Avvaiyar']
].map(([e, ta, en, a, ae]) => ({e, q:S(`${ta} எதைக் கொடுத்தார்?`, `What did ${en} give?`), a:S(a, ae)})));
TX.freedom = pairGame({title:S('தமிழக விடுதலை வீரர்கள்', 'Freedom fighters of Tamil Nadu'), icon:'🇮🇳', intro:S('நம் விடுதலைக்காகப் போராடிய தமிழர்களும் அவர்களின் சிறப்புப் பெயர்களும்.', 'Tamils who fought for our freedom, and what they are remembered for.')}, [
  ['🚢','வ.உ. சிதம்பரனார்','V. O. Chidambaranar','கப்பலோட்டிய தமிழன்','the Tamil who sailed ships'], ['🚩','திருப்பூர் குமரன்','Tiruppur Kumaran','கொடி காத்த குமரன்','Kumaran who guarded the flag'],
  ['✒️','பாரதியார்','Bharathiyar','மகாகவி','the great poet'], ['⚔️','வீரபாண்டிய கட்டபொம்மன்','Veerapandiya Kattabomman','பாஞ்சாலங்குறிச்சி','Panchalankurichi'], ['👑','வேலு நாச்சியார்','Velu Nachiyar','சிவகங்கை அரசி','queen of Sivaganga']
].map(([e, ta, en, a, ae]) => ({e, q:S(`${ta} — எதோடு தொடர்புடையவர்?`, `${en} — is linked with?`), a:S(a, ae)})));
TX.localGov = pairGame({title:S('உள்ளாட்சி', 'Local government'), icon:'🏛️', intro:S('கிராம ஊராட்சி — ஊராட்சித் தலைவர்; நகராட்சி — நகர்மன்றத் தலைவர்; மாநகராட்சி — மேயர்; மாவட்டம் — மாவட்ட ஆட்சியர்.', 'Village panchayat — panchayat president; municipality — chairperson; corporation — mayor; district — collector.')}, [
  ['🏡','கிராம ஊராட்சி','village panchayat','ஊராட்சித் தலைவர்','panchayat president'], ['🏘️','நகராட்சி','municipality','நகர்மன்றத் தலைவர்','municipal chairperson'],
  ['🏙️','மாநகராட்சி','corporation','மேயர்','mayor'], ['🗺️','மாவட்டம்','district','மாவட்ட ஆட்சியர்','district collector']
].map(([e, ta, en, a, ae]) => ({e, q:S(`${ta} — தலைமை யார்?`, `Who heads a ${en}?`), a:S(a, ae)})));
TX.helplines = pairGame({title:S('அவசர உதவி எண்கள்', 'Emergency numbers'), icon:'📞', intro:S('108 — ஆம்புலன்ஸ், 101 — தீயணைப்பு, 100 — காவல்துறை, 1098 — குழந்தைகள் உதவி, 112 — எல்லா அவசரத்துக்கும் ஒரே எண்.', '108 — ambulance, 101 — fire, 100 — police, 1098 — child helpline, 112 — one number for all emergencies.')}, [
  ['🚑','ஆம்புலன்ஸ்','ambulance','108','108'], ['🚒','தீயணைப்பு','fire service','101','101'], ['🚓','காவல்துறை','police','100','100'], ['🧒','குழந்தைகள் உதவி','child helpline','1098','1098'], ['🆘','எல்லா அவசரத்துக்கும்','all emergencies','112','112']
].map(([e, ta, en, a, ae]) => ({e, q:S(`${ta} — எந்த எண்?`, `${en} — which number?`), a:S(a, ae)})));
TX.traffic = pairGame({title:S('போக்குவரத்து விளக்கு', 'Traffic lights'), icon:'🚦', intro:S('சிவப்பு — நில். மஞ்சள் — தயாராகு / மெதுவாக. பச்சை — செல்.', 'Red — stop. Yellow — get ready / slow down. Green — go.')}, [
  ['🔴','சிவப்பு','red','நில்','stop'], ['🟡','மஞ்சள்','yellow','தயாராகு','get ready'], ['🟢','பச்சை','green','செல்','go']
].map(([e, ta, en, a, ae]) => ({e, big:true, q:S(`${ta} விளக்கு என்றால்?`, `A ${en} light means?`), a:S(a, ae)})));
const CONT = [S('ஆசியா','Asia'), S('ஆப்பிரிக்கா','Africa'), S('ஐரோப்பா','Europe'), S('ஆஸ்திரேலியா','Australia'), S('அண்டார்டிகா','Antarctica'), S('வட அமெரிக்கா','North America'), S('தென் அமெரிக்கா','South America')];
const OCEANS = [S('பசிபிக்','Pacific'), S('அட்லாண்டிக்','Atlantic'), S('இந்தியப் பெருங்கடல்','Indian Ocean'), S('ஆர்க்டிக்','Arctic')];
const others = (list, a) => list.filter(x => x.ta !== a.ta);
TX.worldFacts = pairGame({title:S('நம் பூமி', 'Our Earth'), icon:'🌍', intro:S('7 கண்டங்கள், 5 பெருங்கடல்கள். மிகப் பெரிய கண்டம் ஆசியா, மிகச் சிறியது ஆஸ்திரேலியா. மிகப் பெரிய பெருங்கடல் பசிபிக். பூமியின் மேற்பரப்பில் ஏறக்குறைய 71% நீர்.', '7 continents, 5 oceans. Largest continent Asia, smallest Australia. Largest ocean the Pacific. About 71% of Earth’s surface is water.')}, [
  {e:'🌏', q:S('கண்டங்கள் எத்தனை?','How many continents?'), a:S('7','7'), alts:[S('5','5'), S('6','6'), S('8','8')]},
  {e:'🌊', q:S('பெருங்கடல்கள் எத்தனை?','How many oceans?'), a:S('5','5'), alts:[S('3','3'), S('4','4'), S('7','7')]},
  {e:'🗺️', q:S('மிகப் பெரிய கண்டம்?','Largest continent?'), a:CONT[0], alts:others(CONT, CONT[0])},
  {e:'🦘', q:S('மிகச் சிறிய கண்டம்?','Smallest continent?'), a:CONT[3], alts:others(CONT, CONT[3])},
  {e:'🐋', q:S('மிகப் பெரிய பெருங்கடல்?','Largest ocean?'), a:OCEANS[0], alts:others(OCEANS, OCEANS[0])},
  {e:'🐧', q:S('மிகக் குளிரான கண்டம்?','Coldest continent?'), a:CONT[4], alts:others(CONT, CONT[4])},
  {e:'💧', q:S('பூமியின் மேற்பரப்பில் நீர் எவ்வளவு?','How much of Earth’s surface is water?'), a:S('ஏறக்குறைய 71%','about 71%'), alts:[S('ஏறக்குறைய 29%','about 29%'), S('ஏறக்குறைய 50%','about 50%'), S('ஏறக்குறைய 95%','about 95%')]},
  {e:'🇮🇳', q:S('இந்தியா எந்தக் கண்டத்தில்?','India is in which continent?'), a:CONT[0], alts:others(CONT, CONT[0])}
]);
TX.tnFacts = pairGame({title:S('நம் தமிழ்நாடு', 'Our Tamil Nadu'), icon:'🏞️', intro:S('தலைநகர் சென்னை. 38 மாவட்டங்கள். மாநில விலங்கு வரையாடு, பறவை மரகதப் புறா, மலர் செங்காந்தள், மரம் பனை. நெய்வேலியில் பழுப்பு நிலக்கரி. வேடந்தாங்கல் — பறவைகள் சரணாலயம்.', 'Capital Chennai. 38 districts. State animal Nilgiri tahr, bird emerald dove, flower gloriosa lily, tree palmyra. Lignite at Neyveli. Vedanthangal — bird sanctuary.')}, [
  {e:'🏙️', q:S('தமிழ்நாட்டின் தலைநகர்?','Capital of Tamil Nadu?'), a:S('சென்னை','Chennai'), alts:[S('மதுரை','Madurai'), S('கோயம்புத்தூர்','Coimbatore'), S('திருச்சிராப்பள்ளி','Tiruchirappalli')]},
  {e:'🗺️', q:S('தமிழ்நாட்டில் எத்தனை மாவட்டங்கள்?','How many districts in Tamil Nadu?'), a:S('38','38'), alts:[S('32','32'), S('35','35'), S('40','40')]},
  {e:'🐐', q:S('மாநில விலங்கு?','State animal?'), a:S('வரையாடு','Nilgiri tahr'), alts:[S('யானை','elephant'), S('புலி','tiger'), S('புள்ளி மான்','spotted deer')]},
  {e:'🕊️', q:S('மாநிலப் பறவை?','State bird?'), a:S('மரகதப் புறா','emerald dove'), alts:[S('மயில்','peacock'), S('கிளி','parrot'), S('குயில்','koel')]},
  {e:'🌺', q:S('மாநில மலர்?','State flower?'), a:S('செங்காந்தள்','gloriosa lily'), alts:[S('தாமரை','lotus'), S('மல்லிகை','jasmine'), S('ரோஜா','rose')]},
  {e:'🌴', q:S('மாநில மரம்?','State tree?'), a:S('பனை','palmyra palm'), alts:[S('வேம்பு','neem'), S('ஆலமரம்','banyan'), S('தென்னை','coconut palm')]},
  {e:'⛏️', q:S('நெய்வேலியில் கிடைக்கும் கனிமம்?','Mineral found at Neyveli?'), a:S('பழுப்பு நிலக்கரி','lignite'), alts:[S('தங்கம்','gold'), S('வெள்ளி','silver'), S('செம்பு','copper')]},
  {e:'🐦', q:S('வேடந்தாங்கல் — எந்தச் சரணாலயம்?','Vedanthangal is what kind of sanctuary?'), a:S('பறவைகள் சரணாலயம்','bird sanctuary'), alts:[S('யானைகள் சரணாலயம்','elephant sanctuary'), S('புலிகள் காப்பகம்','tiger reserve'), S('முதலைப் பண்ணை','crocodile farm')]}
]);

G.KALVI_LANG = TX;
G.KALVI_BUILD = {pairGame, sortGame};
})(typeof window !== 'undefined' ? window : globalThis);
