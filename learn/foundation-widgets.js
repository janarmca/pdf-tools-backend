/* Kalvi Kalanjiyam — "அடித்தளம்" widgets: how computers and AI are built, step by step.
   Everything here is plain, deterministic code (no AI, no network). The pure functions are exported in
   KALVI_WF_PURE so learn/tests/foundation.test.cjs can check them. Every widget is a small honest MODEL. */
(function(G){
'use strict';

/* ---------- pure functions ---------- */
const PURE = {
  /* logic gates */
  gate(name, a, b){
    a = a ? 1 : 0; b = b ? 1 : 0;
    switch(name){
      case 'AND': return a & b;
      case 'OR': return a | b;
      case 'NOT': return a ? 0 : 1;
      case 'XOR': return a ^ b;
      case 'NAND': return (a & b) ? 0 : 1;
      default: throw new Error('unknown gate ' + name);
    }
  },
  truthTable(name){
    if(name === 'NOT') return [[0, null, 1], [1, null, 0]];
    const rows = []; for(let a = 0; a <= 1; a++) for(let b = 0; b <= 1; b++) rows.push([a, b, PURE.gate(name, a, b)]);
    return rows;
  },
  halfAdder(a, b){ return {sum: PURE.gate('XOR', a, b), carry: PURE.gate('AND', a, b)}; },
  fullAdder(a, b, c){
    const h1 = PURE.halfAdder(a, b), h2 = PURE.halfAdder(h1.sum, c);
    return {sum: h2.sum, carry: PURE.gate('OR', h1.carry, h2.carry)};
  },
  // add two numbers (0..7) using only gates, bit by bit; returns bits (LSB first) and value
  addWithGates(x, y){
    let carry = 0; const bits = [];
    for(let i = 0; i < 3; i++){ const r = PURE.fullAdder((x >> i) & 1, (y >> i) & 1, carry); bits.push(r.sum); carry = r.carry; }
    bits.push(carry);
    return {bits, value: bits.reduce((s, b, i) => s + (b << i), 0)};
  },

  /* a tiny compiler: source text -> tokens -> tree -> stack instructions -> result */
  tokenize(src){
    const out = []; let i = 0; src = String(src);
    while(i < src.length){
      const ch = src[i];
      if(/\s/.test(ch)){ i++; continue; }
      if(/[0-9.]/.test(ch)){
        let j = i; while(j < src.length && /[0-9.]/.test(src[j])) j++;
        const txt = src.slice(i, j);
        if(!/^\d+(\.\d+)?$/.test(txt)) return {error: 'badnumber', at: i};
        out.push({k: 'num', v: Number(txt), s: txt}); i = j; continue;
      }
      if('+-*/()'.includes(ch)){ out.push({k: ch, s: ch}); i++; continue; }
      return {error: 'badchar', at: i, ch};
    }
    return {tokens: out};
  },
  parse(tokens){
    let p = 0;
    const peek = () => tokens[p] ? tokens[p].k : null;
    const fail = code => { const e = new Error(code); e.code = code; throw e; };
    function expr(){ let l = term(); while(peek() === '+' || peek() === '-'){ const op = tokens[p++].k; l = {t: 'bin', op, l, r: term()}; } return l; }
    function term(){ let l = factor(); while(peek() === '*' || peek() === '/'){ const op = tokens[p++].k; l = {t: 'bin', op, l, r: factor()}; } return l; }
    function factor(){
      const k = peek();
      if(k === 'num') return {t: 'num', v: tokens[p++].v};
      if(k === '-'){ p++; return {t: 'neg', e: factor()}; }
      if(k === '('){ p++; const e = expr(); if(peek() !== ')') fail('paren'); p++; return e; }
      fail(k === null ? 'ended' : 'unexpected');
    }
    try{
      if(!tokens.length) return {error: 'empty'};
      const tree = expr();
      if(p < tokens.length) return {error: 'unexpected'};
      return {tree};
    }catch(e){ if(e.code) return {error: e.code}; throw e; }
  },
  codegen(tree){
    const code = [];
    (function walk(n){
      if(n.t === 'num') code.push(['PUSH', n.v]);
      else if(n.t === 'neg'){ walk(n.e); code.push(['NEG']); }
      else { walk(n.l); walk(n.r); code.push([{'+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV'}[n.op]]); }
    })(tree);
    return code;
  },
  run(code){
    const st = [], trace = [];
    for(const ins of code){
      const [op, v] = ins;
      if(op === 'PUSH') st.push(v);
      else if(op === 'NEG') st.push(-st.pop());
      else {
        const b = st.pop(), a = st.pop();
        if(op === 'ADD') st.push(a + b); else if(op === 'SUB') st.push(a - b); else if(op === 'MUL') st.push(a * b);
        else { if(b === 0) return {error: 'div0', trace}; st.push(a / b); }
      }
      trace.push({ins: v === undefined ? op : op + ' ' + v, stack: st.slice()});
    }
    return {value: st[0], trace};
  },
  compile(src){
    const t = PURE.tokenize(src); if(t.error) return {stage: 'tokens', error: t.error, at: t.at, ch: t.ch};
    const p = PURE.parse(t.tokens); if(p.error) return {stage: 'tree', error: p.error, tokens: t.tokens};
    const code = PURE.codegen(p.tree), r = PURE.run(code);
    if(r.error) return {stage: 'run', error: r.error, tokens: t.tokens, tree: p.tree, code, trace: r.trace};
    return {tokens: t.tokens, tree: p.tree, code, trace: r.trace, value: r.value};
  },
  treeLines(n, pad){
    pad = pad || '';
    if(n.t === 'num') return [pad + n.v];
    if(n.t === 'neg') return [pad + '−'].concat(PURE.treeLines(n.e, pad + '   '));
    return [pad + n.op].concat(PURE.treeLines(n.l, pad + '   '), PURE.treeLines(n.r, pad + '   '));
  },

  /* learning by reducing error: fit y = w * x to a few data points */
  DATA: {xs: [1, 2, 3, 4], ys: [2.8, 6.3, 8.9, 12.2]},
  loss(w, d){ d = d || PURE.DATA; return d.xs.reduce((s, x, i) => s + Math.pow(w * x - d.ys[i], 2), 0) / d.xs.length; },
  grad(w, d){ d = d || PURE.DATA; return d.xs.reduce((s, x, i) => s + 2 * x * (w * x - d.ys[i]), 0) / d.xs.length; },
  gdStep(w, lr, d){ return w - lr * PURE.grad(w, d); },
  bestW(d){ d = d || PURE.DATA; const sxy = d.xs.reduce((s, x, i) => s + x * d.ys[i], 0), sxx = d.xs.reduce((s, x) => s + x * x, 0); return sxy / sxx; },

  /* predicting the next word from counts */
  words(text){ return String(text).split(/\s+/).map(w => w.replace(/[.,!?;:"“”]/g, '')).filter(Boolean); },
  buildBigram(text){
    const model = {};
    String(text).split(/[\n.!?]+/).forEach(line => {
      const w = PURE.words(line); if(!w.length) return;
      const seq = ['<தொடக்கம்>'].concat(w, ['<முடிவு>']);
      for(let i = 0; i < seq.length - 1; i++){ const a = seq[i], b = seq[i + 1]; (model[a] = model[a] || {})[b] = (model[a][b] || 0) + 1; }
    });
    return model;
  },
  nextProbs(model, word){
    const m = model[word]; if(!m) return [];
    const total = Object.values(m).reduce((a, b) => a + b, 0);
    return Object.keys(m).map(k => ({w: k, n: m[k], p: m[k] / total})).sort((a, b) => b.n - a.n || (a.w < b.w ? -1 : 1));
  },
  generate(model, rnd, maxLen){
    const out = []; let cur = '<தொடக்கம்>';
    for(let i = 0; i < (maxLen || 12); i++){
      const ps = PURE.nextProbs(model, cur); if(!ps.length) break;
      let r = rnd(), pick = ps[ps.length - 1];
      for(const x of ps){ if(r < x.p){ pick = x; break; } r -= x.p; }
      if(pick.w === '<முடிவு>') break;
      out.push(pick.w); cur = pick.w;
    }
    return out.join(' ');
  }
};
G.KALVI_WF_PURE = PURE;

/* ---------- history data (well-documented milestones only) ---------- */
const TL = [
  {y: '9ஆம் நூற்றாண்டு', ye: '9th century', ic: '📜', who: {ta: 'அல்-குவாரிஸ்மி', en: 'Al-Khwarizmi'},
    what: {ta: 'பாக்தாத்தில் வாழ்ந்த இவர் எண்களைக் கொண்டு கணக்குகளைப் படிப்படியாகத் தீர்க்கும் முறைகளை எழுதினார். இவரது பெயரின் இலத்தீன் வடிவத்திலிருந்துதான் "algorithm" என்ற சொல் வந்தது.', en: 'Working in Baghdad, he wrote down step-by-step methods for solving problems with numbers. The word "algorithm" comes from the Latin form of his name.'},
    why: {ta: 'கணினி நிரல் என்பதே தெளிவான படிகளின் வரிசை — இதன் வேர் இங்கே.', en: 'A computer program is just a list of clear steps — this is the root.'}},
  {y: '1703', ye: '1703', ic: '⚖️', who: {ta: 'கோட்ஃபிரீட் லைப்னிட்ஸ்', en: 'Gottfried Leibniz'},
    what: {ta: '0 மற்றும் 1 மட்டுமே கொண்டு எல்லா எண்களையும் எழுதும் இரும (binary) முறையை ஒரு கட்டுரையில் விளக்கினார்.', en: 'Explained, in an article, the binary system that writes every number using only 0 and 1.'},
    why: {ta: 'இன்றைய கணினிகளின் அடிப்படை மொழி இதுவே.', en: 'This is the base language of today’s computers.'}},
  {y: '1843', ye: '1843', ic: '🧵', who: {ta: 'அடா லவ்லேஸ்', en: 'Ada Lovelace'},
    what: {ta: 'பாபேஜ் வடிவமைத்த "பகுப்பாய்வு இயந்திரம்" (Analytical Engine) பற்றிய தன் குறிப்புகளில், அதற்கான படிமுறையை (algorithm) எழுதிக் காட்டினார். இதுவே முதல் கணினி நிரல்களில் ஒன்றாகக் கருதப்படுகிறது.', en: 'In her notes on Babbage’s Analytical Engine she wrote out an algorithm for it — widely regarded as one of the first computer programs.'},
    why: {ta: 'இயந்திரம் செய்ய வேண்டியதை முன்கூட்டியே எழுதிவைக்கலாம் என்ற எண்ணம் பிறந்தது.', en: 'The idea was born that what a machine must do can be written down in advance.'}},
  {y: '1854', ye: '1854', ic: '✅', who: {ta: 'ஜார்ஜ் பூல்', en: 'George Boole'},
    what: {ta: '"The Laws of Thought" நூலில் சிந்தனையின் விதிகளை 1, 0 கொண்ட இயற்கணிதமாக எழுதினார் (அவருக்கு 1 = "எல்லாம்", 0 = "ஒன்றுமில்லை"). இன்று AND, OR, NOT என்று அழைக்கும் செயல்கள் இதிலிருந்து வந்தவை.', en: 'In "The Laws of Thought" he wrote the rules of reasoning as an algebra of 1 and 0 (for him 1 meant "everything" and 0 "nothing"). The operations we now call AND, OR, NOT grew from it.'},
    why: {ta: 'இன்றைய ஒவ்வொரு சிப்பிலும் உள்ள logic gates-இன் கணித அடிப்படை இதுவே.', en: 'This is the mathematics behind the logic gates in every chip today.'}},
  {y: '1936', ye: '1936', ic: '🧠', who: {ta: 'ஆலன் டூரிங்', en: 'Alan Turing'},
    what: {ta: '"கணக்கிடுதல்" என்றால் என்ன என்பதை ஒரு கற்பனை இயந்திரத்தின் மூலம் வரையறுத்து, சில கணக்குகளை எந்த இயந்திரத்தாலும் தீர்க்கவே முடியாது என்று நிரூபித்தார்.', en: 'Using an imaginary machine he defined what "computing" means, and proved that some problems can never be solved by any machine.'},
    why: {ta: 'கணினியால் "எல்லாம்" செய்ய முடியாது என்ற எல்லையையும் இவர்தான் வரைந்தார்.', en: 'He also drew the line showing computers cannot do "everything".'}},
  {y: '1937', ye: '1937', ic: '🔌', who: {ta: 'கிளாட் ஷானன்', en: 'Claude Shannon'},
    what: {ta: 'தன் முதுநிலை ஆய்வேட்டில், மின் சுவிட்சுச் சுற்றுகளால் (relay) பூலின் கணக்கைச் செய்ய முடியும் என்று காட்டினார்.', en: 'In his master’s thesis he showed that electric switch (relay) circuits can carry out Boole’s algebra.'},
    why: {ta: 'கணிதத்துக்கும் மின்சுற்றுக்கும் இடையிலான பாலம் — logic gates இங்கிருந்துதான் தொடங்கின.', en: 'The bridge between mathematics and circuits — logic gates start here.'}},
  {y: '1947', ye: '1947', ic: '🔬', who: {ta: 'பெல் ஆய்வகம் (Bell Labs)', en: 'Bell Labs'},
    what: {ta: 'டிரான்சிஸ்டர் கண்டுபிடிக்கப்பட்டது — மின்சாரத்தால் இயங்கும் மிகச் சிறிய ON/OFF சுவிட்ச்.', en: 'The transistor was invented — a tiny electrically-controlled ON/OFF switch.'},
    why: {ta: 'இன்று ஒரு போன் சிப்பில் பல நூறு கோடி டிரான்சிஸ்டர்கள் உள்ளன.', en: 'A phone chip today holds many billions of them.'}},
  {y: '1952', ye: '1952', ic: '🛠️', who: {ta: 'கிரேஸ் ஹாப்பர்', en: 'Grace Hopper'},
    what: {ta: 'மனிதர் படிக்கக்கூடிய வடிவில் எழுதியதை இயந்திரக் கட்டளையாக மாற்றும் முதல் "compiler" நிரல்களில் ஒன்றை உருவாக்கினார்.', en: 'Built one of the first "compilers" — a program that turns human-readable instructions into machine instructions.'},
    why: {ta: 'இதனால்தான் நாம் 0/1-ல் எழுதாமல் Python, Java போன்றவற்றில் எழுதுகிறோம்.', en: 'This is why we write in Python or Java instead of 0s and 1s.'}},
  {y: '1958', ye: '1958', ic: '🎯', who: {ta: 'பிராங்க் ரோசன்ப்ளாட்', en: 'Frank Rosenblatt'},
    what: {ta: '"Perceptron" — எடுத்துக்காட்டுகளைப் பார்த்துத் தன் எடைகளைத் தானே மாற்றிக்கொள்ளும் முதல் செயற்கை நியூரான் மாதிரிகளில் ஒன்று.', en: 'The "perceptron" — one of the first artificial-neuron models that adjusts its own weights by looking at examples.'},
    why: {ta: 'விதிகளை எழுதாமல் எடுத்துக்காட்டுகளிலிருந்து கற்கும் AI-யின் தொடக்கம்.', en: 'The start of AI that learns from examples instead of hand-written rules.'}},
  {y: '1986', ye: '1986', ic: '🔁', who: {ta: 'ரூமல்ஹார்ட், ஹிண்டன், வில்லியம்ஸ்', en: 'Rumelhart, Hinton, Williams'},
    what: {ta: 'பல அடுக்கு நியூரல் நெட்வொர்க்கின் தவறைப் பின்னோக்கிப் பகிர்ந்து அதன் எடைகளைத் திருத்தும் "backpropagation" முறையை ஆய்வுக்கட்டுரையில் பிரபலமாக்கினர்.', en: 'Popularised "backpropagation" in a paper — a way to send the error backwards through many layers and fix every weight.'},
    why: {ta: 'இன்றைய ஆழ்ந்த கற்றல் (deep learning) இந்த அடிப்படையில் நிற்கிறது.', en: 'Today’s deep learning stands on this.'}},
  {y: '2012', ye: '2012', ic: '🖼️', who: {ta: 'AlexNet', en: 'AlexNet'},
    what: {ta: 'சுமார் 12 லட்சம் படங்களால் பயிற்சி பெற்று, படங்களை அடையாளம் காணும் போட்டியில் (ImageNet) முந்தைய முறைகளைப் பெரிய இடைவெளியில் வென்றது.', en: 'Trained on about 1.2 million pictures, it beat earlier methods by a wide margin in the ImageNet image-recognition contest.'},
    why: {ta: 'தரவு + வேகமான GPU + நியூரல் நெட்வொர்க் = புதிய AI அலை.', en: 'Data + fast GPUs + neural networks = a new wave of AI.'}},
  {y: '2017', ye: '2017', ic: '💬', who: {ta: 'Transformer', en: 'The Transformer'},
    what: {ta: '"Attention Is All You Need" என்ற ஆய்வுக்கட்டுரை, வாக்கியத்தில் எந்தச் சொல் எதனோடு தொடர்புடையது என்று கவனிக்கும் attention-ஐ மட்டுமே அடிப்படையாகக் கொண்ட புதிய அமைப்பை அறிமுகம் செய்தது (attention 2014 முதலே இருந்தது).', en: 'The paper "Attention Is All You Need" introduced a design built entirely on attention — noticing which word relates to which (attention itself existed from 2014).'},
    why: {ta: 'இன்றைய பெரிய மொழி மாதிரிகள் (chat AI) பெரும்பாலும் இதன் மீது கட்டப்பட்டவை.', en: 'Most of today’s large language models (chat AIs) are built on it.'}}
];
G.KALVI_WF_TL = TL;

G.KALVI_WIDGETS_F = function(h){
  const {svg, readout, slider, T, esc} = h;
  const fmt = (x, d) => Number(x).toLocaleString('en-IN', {maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d});
  const mk = html => { const d = document.createElement('div'); d.innerHTML = html; return d; };
  const note = (host, ta, en) => { const n = document.createElement('div'); n.className = 'note'; n.style.marginTop = '8px'; n.textContent = T(ta, en); host.appendChild(n); };
  const ERR = {
    empty: ['எதுவும் எழுதவில்லை', 'Nothing was typed'],
    badchar: ['இந்த எழுத்து இங்கே புரியவில்லை', 'This character is not understood here'],
    badnumber: ['எண் தவறாக உள்ளது (எ.கா. 1.2.3)', 'The number is malformed (e.g. 1.2.3)'],
    unexpected: ['இங்கே ஒரு எண் அல்லது ( வர வேண்டும்', 'A number or "(" was expected here'],
    ended: ['வாக்கியம் முடிவதற்குள் நின்றுவிட்டது — அடுத்து ஒரு எண் வேண்டும்', 'The expression ended too early — a number is needed next'],
    paren: ['( திறந்தீர்கள், ஆனால் ) மூடவில்லை', 'You opened "(" but did not close it with ")"'],
    div0: ['பூஜ்யத்தால் வகுக்க முடியாது', 'Cannot divide by zero']
  };
  const btnCss = 'padding:7px 12px;font-weight:800';

  return {
    /* 1. logic gates + adding with gates */
    logicGates(host){
      let a = 1, b = 0, g = 'AND', x = 3, y = 5;
      const top = mk('<div></div>'), add = mk('<div style="margin-top:14px;border-top:1px dashed var(--line);padding-top:10px"></div>');
      host.appendChild(top); host.appendChild(add);
      const sw = (v, id) => `<button class="btn" data-sw="${id}" style="min-width:56px;${btnCss};background:${v ? '#3b2fc9' : '#eceef5'};color:${v ? '#fff' : '#14213d'}">${id.toUpperCase()} = ${v}</button>`;
      function drawTop(){
        const out = PURE.gate(g, a, b), rows = PURE.truthTable(g);
        top.innerHTML = `<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px">${['AND', 'OR', 'NOT', 'XOR', 'NAND'].map(n => `<button class="btn sm ${n === g ? 'p' : ''}" data-g="${n}">${n}</button>`).join('')}</div>
          <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">${sw(a, 'a')}${g === 'NOT' ? '' : sw(b, 'b')}<span style="font-size:1.4rem">➜</span>
          <span style="font-weight:800;font-size:1.1rem;padding:8px 14px;border-radius:12px;background:${out ? '#dcfce7' : '#fee2e2'}">${g}${g === 'NOT' ? '(' + a + ')' : '(' + a + ',' + b + ')'} = ${out}</span></div>
          <table style="margin-top:10px;border-collapse:collapse;font-size:.9rem"><tr><th style="padding:3px 12px">A</th>${g === 'NOT' ? '' : '<th style="padding:3px 12px">B</th>'}<th style="padding:3px 12px">${T('விடை', 'Out')}</th></tr>
          ${rows.map(r => { const hit = r[0] === a && (g === 'NOT' || r[1] === b); return `<tr style="${hit ? 'background:#eef2ff;font-weight:800' : ''}"><td style="padding:3px 12px;text-align:center">${r[0]}</td>${g === 'NOT' ? '' : `<td style="padding:3px 12px;text-align:center">${r[1]}</td>`}<td style="padding:3px 12px;text-align:center">${r[2]}</td></tr>`; }).join('')}</table>
          <div class="note" style="margin-top:6px">${({
            AND: T('இரண்டும் 1 ஆக இருந்தால் மட்டுமே 1 — "மழை பெய்கிறது AND குடை இல்லை" என்றால் நனைவாய்.', 'Output is 1 only if both are 1 — "it rains AND no umbrella" means you get wet.'),
            OR: T('ஏதாவது ஒன்று 1 ஆக இருந்தால் 1 — "அம்மா OR அப்பா அழைத்தால்" பள்ளிக்குப் போவாய்.', 'Output is 1 if any input is 1 — you go if mother OR father calls.'),
            NOT: T('தலைகீழாக்கும்: 1 → 0, 0 → 1.', 'Flips the input: 1 → 0, 0 → 1.'),
            XOR: T('இரண்டும் வேறுவேறாக இருந்தால் மட்டும் 1 — கூட்டலின் "இலக்கம்" இதுவே (கீழே பார்).', 'Output is 1 only if the inputs differ — this is the "digit" of addition (see below).'),
            NAND: T('AND-ன் தலைகீழ். இந்த ஒரே gate-ஐ வைத்து மற்ற எல்லா gate-களையும் உருவாக்க முடியும்!', 'The opposite of AND. Every other gate can be built from this one alone!')
          })[g]}</div>`;
        top.querySelectorAll('[data-g]').forEach(e => e.onclick = () => { g = e.dataset.g; drawTop(); });
        top.querySelectorAll('[data-sw]').forEach(e => e.onclick = () => { if(e.dataset.sw === 'a') a ^= 1; else b ^= 1; drawTop(); });
      }
      function drawAdd(){
        add.innerHTML = `<b>${T('கூட்டல் கூட gates-தான்!', 'Even addition is just gates!')}</b>
          <div class="note">${T('கீழே இரண்டு எண்களைத் தேர்ந்தெடு. கணினி அவற்றை XOR, AND, OR gates மட்டும் வைத்துக் கூட்டும் (பிட் பிட்டாக, carry-யுடன்).', 'Pick two numbers. The computer adds them using only XOR, AND and OR gates (bit by bit, with a carry).')}</div>`;
      }
      drawTop(); drawAdd();
      slider(add, T('முதல் எண்', 'First number'), 0, 7, 1, x, v => { x = v; upd(); });
      slider(add, T('இரண்டாவது எண்', 'Second number'), 0, 7, 1, y, v => { y = v; upd(); });
      const out = mk('<div style="margin-top:8px"></div>'); add.appendChild(out);
      function upd(){
        const r = PURE.addWithGates(x, y), bin = n => n.toString(2).padStart(3, '0');
        out.innerHTML = `<div style="font-family:monospace;font-size:1.05rem;line-height:1.7">${bin(x)} &nbsp;(${x})<br>+ ${bin(y)} &nbsp;(${y})<br>= ${r.bits.slice().reverse().join('')} &nbsp;(<b>${r.value}</b>) ${r.value === x + y ? '✅' : '❌'}</div>`;
      }
      note(host, 'இது மாதிரி: உண்மையான CPU-வில் இதே போன்ற gates பல கோடி உள்ளன. ஆனால் தத்துவம் இதுவே — கணக்கு = gates-ன் சேர்க்கை.', 'This is a model: a real CPU has billions of such gates. The principle is the same — arithmetic = a combination of gates.');
    },

    /* 2. a tiny compiler */
    compilerPipeline(host, p){
      const wrap = mk(`<div class="ctrl" style="grid-template-columns:1fr auto"><input class="ans" style="width:100%" maxlength="40" value="${esc((p && p.expr) || '2 + 3 * 4')}" inputmode="text" autocomplete="off"><button class="btn p sm go">⚙️ ${T('மொழிபெயர்', 'Compile')}</button></div>
        <div class="row" style="margin-top:6px;gap:6px;flex-wrap:wrap"><button class="btn sm" data-e="2 + 3 * 4">2 + 3 * 4</button><button class="btn sm" data-e="(2 + 3) * 4">(2 + 3) * 4</button><button class="btn sm" data-e="10 / (5 - 5)">10 / (5 - 5)</button><button class="btn sm" data-e="2 + * 3">2 + * 3</button></div>
        <div class="out" style="margin-top:10px"></div>`);
      host.appendChild(wrap);
      const inp = wrap.querySelector('input.ans'), out = wrap.querySelector('.out');
      const box = (n, title, body) => `<div style="border:1px solid var(--line);border-radius:12px;padding:8px 10px;margin-bottom:8px;background:#fff"><b>${n} ${title}</b><div style="margin-top:4px">${body}</div></div>`;
      const pre = t => `<pre style="margin:0;font-size:.85rem;white-space:pre-wrap;font-family:ui-monospace,Consolas,monospace">${esc(t)}</pre>`;
      function go(){
        const src = inp.value, r = PURE.compile(src);
        let html = box('1️⃣', T('மூலம் (Source) — மனிதர் எழுதியது', 'Source — what a human wrote'), pre(src));
        if(r.error && r.stage === 'tokens'){
          html += box('❌', T('துண்டாக்கும் நிலையிலேயே தவறு', 'Error while splitting into tokens'), esc(T(ERR[r.error][0], ERR[r.error][1])) + (r.ch ? ' → "' + esc(r.ch) + '"' : ''));
          out.innerHTML = html; return;
        }
        html += box('2️⃣', T('Tokens — சொற்களாகத் துண்டாக்கல்', 'Tokens — split into words'), r.tokens.map(t => `<span style="display:inline-block;margin:2px;padding:3px 9px;border-radius:9px;background:${t.k === 'num' ? '#e0f2fe' : '#fef3c7'};font-family:monospace">${esc(t.s)}</span>`).join(''));
        if(r.error && r.stage === 'tree'){
          html += box('❌', T('இலக்கணப் பிழை (Syntax error)', 'Syntax error'), esc(T(ERR[r.error][0], ERR[r.error][1])) + '<div class="note">' + T('compiler தவறைக் கண்டுபிடித்து, ஓடவே விடாமல் நிறுத்தும் — இதனால்தான் "error" செய்தி வருகிறது.', 'The compiler finds the mistake and refuses to run — that is why you see an "error" message.') + '</div>');
          out.innerHTML = html; return;
        }
        html += box('3️⃣', T('மரம் (Tree) — எதை முதலில் செய்ய வேண்டும்?', 'Tree — what must be done first?'), pre(PURE.treeLines(r.tree).join('\n')) + `<div class="note">${T('ஆழமாக உள்ளதை முதலில் கணக்கிடுவார்கள். இதனால்தான் × முன்பு, + பின்பு.', 'The deepest parts are worked out first. That is why × comes before +.')}</div>`);
        html += box('4️⃣', T('Machine கட்டளைகள் (Stack machine)', 'Machine instructions (stack machine)'), pre(r.code.map(c => c.join(' ')).join('\n')));
        html += box('5️⃣', T('ஓட்டம் — stack எப்படி மாறுகிறது', 'Run — how the stack changes'), '<table style="border-collapse:collapse;font-family:monospace;font-size:.85rem">' + r.trace.map(s => `<tr><td style="padding:2px 10px 2px 0">${esc(s.ins)}</td><td>→ [ ${s.stack.join(', ')} ]</td></tr>`).join('') + '</table>');
        if(r.error){ html += box('❌', T('ஓடும்போது பிழை (Runtime error)', 'Runtime error'), esc(T(ERR[r.error][0], ERR[r.error][1]))); }
        else html += box('✅', T('முடிவு (Result)', 'Result'), `<span style="font-size:1.4rem;font-weight:800;color:var(--ok)">${esc(fmt(r.value, 6))}</span>`);
        out.innerHTML = html;
      }
      wrap.querySelector('.go').onclick = go;
      inp.addEventListener('keydown', e => { if(e.key === 'Enter') go(); });
      wrap.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { inp.value = b.dataset.e; go(); });
      go();
      note(host, 'இது ஒரு சிறிய மாதிரி compiler (எண்களும் + − × ÷ ( ) மட்டும்). உண்மையான compiler-கள் இதே படிகளில் — துண்டாக்கு → மரம் → கட்டளை — வேலை செய்கின்றன, ஆனால் மிகப் பெரிய மொழிகளுக்கு.', 'A small model compiler (numbers and + − × ÷ ( ) only). Real compilers follow the same stages — split → tree → instructions — only for much bigger languages.');
    },

    /* 3. learning = reducing error (gradient descent) */
    gradientDescent(host){
      const D = PURE.DATA; let w = 0, lr = 0.05, steps = 0; const hist = [0];
      const S1 = svg(host, 340, 170), S2 = svg(host, 340, 150), ro = readout(host);
      const bt = mk(`<div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap"><button class="btn p sm one">👣 ${T('1 அடி கற்றுக்கொள்', 'Learn 1 step')}</button><button class="btn sm ten">⏩ ${T('10 அடி', '10 steps')}</button><button class="btn sm rst">↺ ${T('மீண்டும் தொடங்கு', 'Restart')}</button></div>`);
      host.appendChild(bt);
      function draw(){
        const bad = !isFinite(w) || Math.abs(w) > 1e4, wv = bad ? 0 : w;
        const X1 = x => 30 + x / 5 * 290, Y1 = y => 150 - y / 14 * 130;
        let g = `<line x1="30" x2="324" y1="150" y2="150" stroke="#cbd5e1"/><line x1="30" x2="30" y1="10" y2="150" stroke="#cbd5e1"/>`;
        g += `<line x1="${X1(0)}" y1="${Y1(0)}" x2="${X1(5)}" y2="${Y1(Math.max(-3, Math.min(17, wv * 5)))}" stroke="#3b2fc9" stroke-width="3"/>`;
        D.xs.forEach((x, i) => { g += `<circle cx="${X1(x)}" cy="${Y1(D.ys[i])}" r="6" fill="#f97316"/>`; });
        S1.innerHTML = g + `<text x="34" y="14" font-size="11">${T('புள்ளிகள் = உண்மைத் தரவு; கோடு = AI-யின் ஊகம் (y = w·x)', 'dots = real data; line = the model’s guess (y = w·x)')}</text>`;
        const X2 = v => 30 + (v + 1) / 7 * 290, Ls = []; for(let v = -1; v <= 6.01; v += .1) Ls.push([v, PURE.loss(v)]);
        const maxL = PURE.loss(-1), Y2 = l => 130 - Math.min(l, maxL) / maxL * 110;
        let g2 = `<line x1="30" x2="324" y1="130" y2="130" stroke="#cbd5e1"/><path d="${Ls.map((p, i) => (i ? 'L' : 'M') + X2(p[0]).toFixed(1) + ' ' + Y2(p[1]).toFixed(1)).join('')}" fill="none" stroke="#94a3b8" stroke-width="2"/>`;
        if(!bad){ const hs = hist.filter(v => isFinite(v) && v >= -1 && v <= 6); hs.forEach((v, i) => { g2 += `<circle cx="${X2(v)}" cy="${Y2(PURE.loss(v))}" r="${i === hs.length - 1 ? 7 : 3}" fill="${i === hs.length - 1 ? '#3b2fc9' : '#a5b4fc'}"/>`; }); }
        g2 += `<text x="34" y="14" font-size="11">${T('தவறு (loss) எவ்வளவு — பள்ளத்தின் அடிக்குப் போவதே கற்றல்', 'how wrong (loss) — learning = rolling to the bottom of the valley')}</text><text x="30" y="146" font-size="10">w = -1</text><text x="290" y="146" font-size="10">w = 6</text>`;
        S2.innerHTML = g2;
        ro([[T('w (எடை)', 'w (weight)'), bad ? '💥' : fmt(w, 3)], [T('தவறு (loss)', 'loss (error)'), bad ? '💥' : fmt(PURE.loss(w), 3)], [T('சரிவு (gradient)', 'slope (gradient)'), bad ? '💥' : fmt(PURE.grad(w), 3)], [T('அடிகள்', 'steps'), steps]]);
      }
      const doStep = () => { w = PURE.gdStep(w, lr); steps++; hist.push(w); if(hist.length > 40) hist.shift(); };
      bt.querySelector('.one').onclick = () => { doStep(); draw(); };
      bt.querySelector('.ten').onclick = () => { for(let i = 0; i < 10; i++) doStep(); draw(); };
      bt.querySelector('.rst').onclick = () => { w = 0; steps = 0; hist.length = 0; hist.push(0); draw(); };
      slider(host, T('கற்கும் வேகம் (learning rate)', 'Learning rate'), 0.01, 0.2, 0.01, lr, v => { lr = v; draw(); });
      const hint = mk(`<div class="note" style="margin-top:6px">${T('முயற்சி: வேகத்தை 0.05 இல் வைத்து "10 அடி" அழுத்து — w ≈ ' + fmt(PURE.bestW(), 2) + ' ஐ நெருங்கும். பிறகு வேகத்தை 0.17 க்கு உயர்த்தி முயற்சி செய் — என்ன நடக்கிறது?', 'Try: keep the rate at 0.05 and press "10 steps" — w heads to ≈ ' + fmt(PURE.bestW(), 2) + '. Then raise the rate to 0.17 and try again — what happens?')}</div>`);
      host.appendChild(hint);
      note(host, 'இங்கே ஒரே ஒரு எடை (w) மட்டுமே உள்ளது. பெரிய AI-யில் பல கோடி எடைகள் உள்ளன — ஆனால் "தவறைக் குறைக்கும் திசையில் சிறு அடி வை" என்ற அதே விதிதான்.', 'Here there is just one weight (w). Large AIs have billions — but the rule is the same: "take a small step in the direction that reduces the error".');
      draw();
    },

    /* 4. predicting the next word */
    nextWord(host){
      const seed = 'நான் பள்ளிக்குச் செல்கிறேன்.\nநான் புத்தகம் படிக்கிறேன்.\nநான் தமிழ் படிக்கிறேன்.\nநான் தினமும் புத்தகம் படிக்கிறேன்.\nநான் தினமும் தமிழ் படிக்கிறேன்.\nஅவன் பள்ளிக்குச் செல்கிறான்.\nஅவன் புத்தகம் படிக்கிறான்.\nநாங்கள் தினமும் பள்ளிக்குச் செல்கிறோம்.';
      const wrap = mk(`<div class="note" style="margin-bottom:4px">${T('இந்த மாதிரிப் பயிற்சித் தரவு (training data). நீயே மாற்றலாம்:', 'This is the training data. You can change it:')}</div>
        <textarea class="ans" rows="6" style="width:100%;font:inherit">${esc(seed)}</textarea>
        <div style="margin-top:8px"><b>${T('ஒரு சொல்லைத் தொடு — அடுத்து எது வரும்?', 'Tap a word — what comes next?')}</b></div><div class="chips" style="margin:6px 0"></div><div class="probs"></div>
        <div class="row" style="margin-top:10px;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn p sm gen">🎲 ${T('வாக்கியம் உருவாக்கு', 'Generate a sentence')}</button><span class="gout" style="font-weight:800"></span></div>`);
      host.appendChild(wrap);
      const ta = wrap.querySelector('textarea'), chips = wrap.querySelector('.chips'), probs = wrap.querySelector('.probs'), gout = wrap.querySelector('.gout');
      let model = PURE.buildBigram(ta.value), cur = '<தொடக்கம்>';
      function show(){
        const ps = PURE.nextProbs(model, cur);
        probs.innerHTML = `<div style="font-size:.9rem;margin-bottom:4px">${T('"' + esc(cur) + '" என்பதற்குப் பிறகு:', 'After "' + esc(cur) + '":')}</div>` + (ps.length ? ps.map(x => `<div style="display:flex;gap:8px;align-items:center;margin:3px 0"><span style="min-width:130px">${esc(x.w)}</span><span style="flex:1;background:#eef0f7;border-radius:8px;overflow:hidden"><i style="display:block;height:14px;width:${(x.p * 100).toFixed(0)}%;background:#3b2fc9"></i></span><b style="min-width:84px;text-align:right">${x.n} ${T('முறை', 'times')} · ${(x.p * 100).toFixed(0)}%</b></div>`).join('') : `<div class="note">${T('இந்தச் சொல் தரவில் இல்லை — மாதிரிக்கு எதுவும் தெரியாது!', 'This word is not in the data — the model knows nothing!')}</div>`);
      }
      function drawChips(){
        const vocab = ['<தொடக்கம்>'].concat(Object.keys(model).filter(k => k !== '<தொடக்கம்>'));
        chips.innerHTML = vocab.map(w => `<button class="btn sm ${w === cur ? 'p' : ''}" data-w="${esc(w)}" style="margin:2px">${esc(w)}</button>`).join('');
        chips.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { cur = b.dataset.w; drawChips(); show(); });
      }
      ta.oninput = () => { model = PURE.buildBigram(ta.value); if(!model[cur]) cur = '<தொடக்கம்>'; drawChips(); show(); };
      wrap.querySelector('.gen').onclick = () => { gout.textContent = PURE.generate(model, Math.random, 10) || '—'; };
      drawChips(); show();
      note(host, 'இது மிகச் சிறிய மாதிரி: ஒரே ஒரு முந்தைய சொல்லை மட்டும் பார்க்கிறது. பெரிய மொழி மாதிரிகள் நூற்றுக்கணக்கான சொற்களைப் பார்த்து, கோடிக்கணக்கான வாக்கியங்களில் பயிற்சி பெறுகின்றன — ஆனால் அடிப்படை: "முன்பு வந்ததைப் பார்த்து, அடுத்து எது வர வாய்ப்பு அதிகம்?"', 'A very small model: it looks at only the one previous word. Large language models look at hundreds of words and train on billions of sentences — but the core is the same: "given what came before, what is most likely next?"');
    },

    /* 5. timeline */
    timeline(host){
      let i = 0;
      const wrap = mk('<div></div>'); host.appendChild(wrap);
      function draw(){
        const e = TL[i];
        wrap.innerHTML = `<div class="row" style="gap:4px;flex-wrap:wrap;margin-bottom:8px">${TL.map((t, k) => `<button class="btn sm ${k === i ? 'p' : ''}" data-k="${k}" style="padding:5px 8px">${t.ic}</button>`).join('')}</div>
          <div style="border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:#fff">
            <div style="font-size:1.6rem">${e.ic} <b>${T(e.y, e.ye)}</b></div>
            <div style="font-weight:800;margin:2px 0 6px">${T(e.who.ta, e.who.en)}</div>
            <div>${T(e.what.ta, e.what.en)}</div>
            <div style="margin-top:8px;padding:8px 10px;border-radius:10px;background:#eef2ff"><b>${T('இன்று இது ஏன் முக்கியம்?', 'Why it matters today')}</b><br>${T(e.why.ta, e.why.en)}</div></div>
          <div class="row" style="margin-top:8px;justify-content:space-between"><button class="btn sm prev" ${i === 0 ? 'disabled' : ''}>←</button><span class="note">${i + 1} / ${TL.length}</span><button class="btn p sm next" ${i === TL.length - 1 ? 'disabled' : ''}>→</button></div>`;
        wrap.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { i = Number(b.dataset.k); draw(); });
        wrap.querySelector('.prev').onclick = () => { i--; draw(); };
        wrap.querySelector('.next').onclick = () => { i++; draw(); };
      }
      draw();
      note(host, 'இவை நன்கு ஆவணப்படுத்தப்பட்ட முக்கிய மைல்கற்கள் மட்டுமே. ஒவ்வொன்றுக்குப் பின்னாலும் ஆயிரக்கணக்கான பிற மனிதர்களின் உழைப்பு உள்ளது.', 'These are only the well-documented milestones. Behind each stand thousands of other people’s work.');
    }
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
