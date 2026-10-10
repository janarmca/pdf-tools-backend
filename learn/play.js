/* Kalvi Kalanjiyam — game shell ("விளையாடிக் கற்போம்").
   Flow per game: see how it works (animated worked example) → play 10 rounds →
   stars. Wrong answers always show the correct answer and WHY. */
(function(G){
'use strict';
const GAMES = Object.assign({}, G.KALVI_MATH, G.KALVI_LANG, G.KALVI_THINK || {}, G.KALVI_MID || {}, G.KALVI_HIGH || {}, G.KALVI_SCI || {});
G.KALVI_GAMES = GAMES;
let H = null; // host helpers: {L, lang, esc, go, getProg, setProg}
const T = (ta, en) => H.lang() === 'ta' ? ta : en;
const Lx = o => o == null ? '' : typeof o === 'string' ? o : (o[H.lang()] || o.ta || o.en || '');

/* ---------- sound (no files; tiny WebAudio beeps) ---------- */
let AC = null;
const muted = () => { try{ return localStorage.getItem('kalviMute') === '1'; }catch(e){ return false; } };
function beep(good){
  if(muted()) return;
  try{
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const notes = good ? [523, 659, 784] : [300, 220];
    notes.forEach((f, i) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = good ? 'triangle' : 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, AC.currentTime + i * .09); g.gain.exponentialRampToValueAtTime(.18, AC.currentTime + i * .09 + .02); g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + i * .09 + .18);
      o.connect(g).connect(AC.destination); o.start(AC.currentTime + i * .09); o.stop(AC.currentTime + i * .09 + .2); });
  }catch(e){}
}
/* ---------- speech (only if the phone has the voice) ---------- */
function voiceFor(lang){
  try{ const vs = speechSynthesis.getVoices(); return vs.find(v => v.lang && v.lang.toLowerCase().startsWith(lang === 'ta' ? 'ta' : 'en-in')) || (lang === 'en' ? vs.find(v => v.lang && v.lang.toLowerCase().startsWith('en')) : null); }catch(e){ return null; }
}
function speak(text, lang){
  try{ const v = voiceFor(lang); if(!v) return false; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang; u.rate = .85; speechSynthesis.speak(u); return true; }catch(e){ return false; }
}
try{ speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => {}; }catch(e){}

/* ---------- mascot: மயிலு the peacock (original drawing) ---------- */
const MAYILU = `<svg viewBox="0 0 120 120" class="mayilu"><g class="tail">${Array.from({length: 7}, (_, i) => { const a = (-150 + i * 20) * Math.PI / 180; return `<ellipse cx="${60 + 38 * Math.cos(a)}" cy="${78 + 38 * Math.sin(a)}" rx="11" ry="17" transform="rotate(${-60 + i * 20} ${60 + 38 * Math.cos(a)} ${78 + 38 * Math.sin(a)})" fill="#16a34a"/><circle cx="${60 + 42 * Math.cos(a)}" cy="${78 + 42 * Math.sin(a)}" r="5" fill="#1d4ed8" stroke="#facc15" stroke-width="2"/>`; }).join('')}</g>
  <ellipse cx="60" cy="86" rx="20" ry="24" fill="#1d4ed8"/><circle cx="60" cy="52" r="15" fill="#2563eb"/><circle cx="55" cy="49" r="4" fill="#fff"/><circle cx="56" cy="49" r="2" fill="#111"/><circle cx="65" cy="49" r="4" fill="#fff"/><circle cx="66" cy="49" r="2" fill="#111"/>
  <polygon points="60,55 67,59 60,61" fill="#f59e0b"/><g fill="#1d4ed8"><line x1="60" y1="37" x2="54" y2="26" stroke="#1d4ed8" stroke-width="2"/><line x1="60" y1="37" x2="60" y2="24" stroke="#1d4ed8" stroke-width="2"/><line x1="60" y1="37" x2="66" y2="26" stroke="#1d4ed8" stroke-width="2"/><circle cx="54" cy="25" r="3"/><circle cx="60" cy="23" r="3"/><circle cx="66" cy="25" r="3"/></g>
  <line x1="54" y1="108" x2="52" y2="118" stroke="#f59e0b" stroke-width="3"/><line x1="66" y1="108" x2="68" y2="118" stroke="#f59e0b" stroke-width="3"/></svg>`;
const CHEERS = {ta:['அருமை!','சூப்பர்!','சபாஷ்!','கலக்கிட்ட!','சரியான விடை!'], en:['Great!','Super!','Well done!','Awesome!','Correct!']};

const ROUNDS = 10;
function stars(score, total){ const r = score / total; return r >= .9 ? 3 : r >= .7 ? 2 : r >= .5 ? 1 : 0; }

function render(app, entry, crumbs, nav){
  const game = GAMES[entry.game];
  if(!game){ app.innerHTML = `<p class="note">Game not found: ${H.esc(entry.game)}</p>`; return; }
  const level = entry.level || {};
  const id = entry.id;
  const best = (H.getProg()[id] || {}).stars || 0;
  app.innerHTML = `<div class="crumbs">${crumbs}</div>
    <div class="gcard">
      <div class="ghead"><div class="gicon">${game.icon || '🎮'}</div><div style="flex:1"><h1>${H.esc(Lx(entry.title || game.title))}</h1><div class="note">${'⭐'.repeat(best)}${'☆'.repeat(3 - best)}</div></div>
        <button class="btn sm" id="mute" title="sound">${muted() ? '🔇' : '🔊'}</button></div>
      <div class="gstage" id="stage"></div>
    </div>
    <div class="nav">${nav}</div>`;
  app.querySelectorAll('[data-go]').forEach(n => n.onclick = () => H.go(n.dataset.go));
  app.querySelector('#mute').onclick = e => { try{ localStorage.setItem('kalviMute', muted() ? '0' : '1'); }catch(x){} e.target.textContent = muted() ? '🔇' : '🔊'; };
  showIntro(app.querySelector('#stage'), game, level, id);
  window.scrollTo(0, 0);
}

function showIntro(stage, game, level, id){
  const ex = game.gen(level);
  stage.innerHTML = `<div class="mrow">${MAYILU}<div class="bubble"><b>${T('மயிலு சொல்கிறது:', 'Mayilu says:')}</b> ${H.esc(Lx(game.intro))}</div></div>
    <div class="demo"><div class="demo-t">${T('👀 எப்படி விளையாடுவது — ஒரு எடுத்துக்காட்டு', '👀 How it works — an example')}</div><div id="demoQ"></div></div>
    <div class="row" style="justify-content:center;margin-top:14px"><button class="btn p big-btn" id="startBtn">▶ ${T('விளையாடு!', 'Play!')}</button></div>`;
  const dq = stage.querySelector('#demoQ');
  if(ex.kind === 'sort'){
    dq.innerHTML = `<p>${H.esc(Lx(ex.p))}</p><div class="bins">${ex.bins.map(b => `<div class="bin"><div class="bin-h">${b.h}</div><div class="bin-in">${ex.items.filter(it => it.bin === b.id).slice(0, 2).map(it => `<div class="chipi placed">${it.h}</div>`).join('')}</div></div>`).join('')}</div>`;
  } else {
    dq.innerHTML = `<div class="gq">${H.esc(Lx(ex.p))}</div><div class="scene">${ex.scene || ''}</div><div class="gopts">${ex.opts.map(o => `<button class="gopt ${o.v === ex.ans ? 'will' : ''}" disabled>${o.h}</button>`).join('')}</div><div class="demo-ex"></div>`;
    setTimeout(() => { const w = dq.querySelector('.gopt.will'); if(w){ w.classList.add('ok', 'pop'); } dq.querySelector('.demo-ex').innerHTML = `<div class="fb ok">✅ ${H.esc(Lx(ex.ex))}</div>`; }, 1400);
  }
  stage.querySelector('#startBtn').onclick = () => play(stage, game, level, id);
}

function play(stage, game, level, id){
  let i = 0, score = 0, seen = new Set();
  const next = () => {
    if(i >= ROUNDS) return finish();
    let q, tries = 0;
    do { q = game.gen(level); tries++; } while(tries < 12 && seen.has(sig(q)));
    seen.add(sig(q)); i++;
    (q.kind === 'sort' ? askSort : askChoice)(stage, q, i, (ok) => { if(ok) score++; next(); });
  };
  const finish = () => {
    const st = stars(score, ROUNDS), prev = (H.getProg()[id] || {}).stars || 0;
    H.setProg(id, {stars: Math.max(st, prev), done: Math.max(st, prev) >= 2, score: Math.round(score / ROUNDS * 100)});
    if(H.award) H.award(score * 2 + Math.max(0, st - prev) * 10);
    stage.innerHTML = `<div class="finish"><div class="confetti">${Array.from({length: 18}, (_, k) => `<i style="left:${k * 5.5}%;animation-delay:${(k % 6) * .15}s">${['⭐','🎉','✨','🌟'][k % 4]}</i>`).join('')}</div>
      ${MAYILU}<div class="score">${score} / ${ROUNDS}</div><div class="stars">${'⭐'.repeat(st)}${'☆'.repeat(3 - st)}</div>
      <p>${st === 3 ? T('அற்புதம்! நீ இதில் சாம்பியன்!', 'Amazing! You are a champion at this!') : st === 2 ? T('நன்று! இன்னும் ஒரு முறை விளையாடி 3 நட்சத்திரம் பெறு!', 'Good! Play once more for 3 stars!') : T('பரவாயில்லை — மயிலுவின் விளக்கத்தை மீண்டும் பார்த்து, மீண்டும் விளையாடு. ஒவ்வொரு முறையும் நீ முன்னேறுவாய்!', 'That’s okay — look at Mayilu’s explanation again and play again. You get better every time!')}</p>
      <div class="row" style="justify-content:center"><button class="btn p big-btn" id="again">🔁 ${T('மீண்டும் விளையாடு', 'Play again')}</button><button class="btn" id="how">❓ ${T('எப்படி?', 'How?')}</button></div></div>`;
    beep(st >= 2);
    stage.querySelector('#again').onclick = () => play(stage, game, level, id);
    stage.querySelector('#how').onclick = () => showIntro(stage, game, level, id);
  };
  next();
}
/* mixed run: every round comes from a random game of the given picks [{game, level}] — used by the daily challenge and subject marathons */
function playMix(stage, picks, done){
  let i = 0, score = 0; const seen = new Set();
  const next = () => {
    if(i >= ROUNDS) return done(score);
    let q = null, tries = 0;
    do { const g = picks[Math.floor(Math.random() * picks.length)]; try{ q = g.game.gen(g.level || {}); }catch(e){ q = null; } tries++; } while((!q || seen.has(sig(q))) && tries < 24);
    if(!q) return done(score);
    seen.add(sig(q)); i++;
    (q.kind === 'sort' ? askSort : askChoice)(stage, q, i, ok => { if(ok) score++; next(); });
  };
  next();
}
const sig = q => q.kind === 'sort' ? q.items.map(x => x.h).join('|') : Lx(q.p) + '|' + (q.scene || '').length;

function progressDots(n){ return `<div class="dots">${Array.from({length: ROUNDS}, (_, k) => `<span class="${k < n - 1 ? 'd-done' : k === n - 1 ? 'd-now' : ''}"></span>`).join('')}</div>`; }
function sayBtn(q){
  const text = q.say ? Lx(q.say) : Lx(q.p);
  const lang = q.say ? (/[஀-௿]/.test(text) ? 'ta' : 'en') : H.lang();
  return voiceFor(lang) ? `<button class="btn sm say" data-t="${H.esc(text)}" data-l="${lang}">🔊</button>` : '';
}

function askChoice(stage, q, n, done){
  stage.innerHTML = `${progressDots(n)}<div class="gq">${H.esc(Lx(q.p))} ${sayBtn(q)}</div><div class="scene">${q.scene || ''}</div>
    <div class="gopts ${q.opts.length > 4 ? 'many' : ''}">${q.opts.map((o, k) => `<button class="gopt" data-k="${k}">${o.h}</button>`).join('')}</div><div class="gfb"></div>`;
  const sb = stage.querySelector('.say'); if(sb) sb.onclick = () => speak(sb.dataset.t, sb.dataset.l);
  const fb = stage.querySelector('.gfb');
  let answered = false;
  stage.querySelectorAll('.gopt').forEach(b => b.onclick = () => {
    if(answered) return; answered = true;
    const o = q.opts[Number(b.dataset.k)], ok = o.v === q.ans;
    stage.querySelectorAll('.gopt').forEach((x, k) => { x.disabled = true; if(q.opts[k].v === q.ans) x.classList.add('ok'); });
    if(ok){ b.classList.add('pop'); beep(true); fb.innerHTML = `<div class="cheer">${MAYILU}<b>${pick(CHEERS[H.lang()])}</b></div>`; setTimeout(() => done(true), 950); }
    else { b.classList.add('bad', 'shake'); beep(false);
      fb.innerHTML = `<div class="fb bad">💡 ${H.esc(Lx(q.ex))}</div><div class="row" style="justify-content:center;margin-top:8px"><button class="btn p" id="nx">${T('அடுத்து →', 'Next →')}</button></div>`;
      fb.querySelector('#nx').onclick = () => done(false); }
  });
}
function askSort(stage, q, n, done){
  let sel = null, firstTryAll = true;
  stage.innerHTML = `${progressDots(n)}<div class="gq">${H.esc(Lx(q.p))}</div>
    <div class="pool">${q.items.map((it, k) => `<button class="chipi" data-k="${k}">${it.h}</button>`).join('')}</div>
    <div class="bins">${q.bins.map(b => `<div class="bin" role="button" tabindex="0" data-b="${b.id}"><div class="bin-h">${b.h}</div><div class="bin-in"></div></div>`).join('')}</div><div class="gfb"></div>`;
  const fb = stage.querySelector('.gfb');
  const left = () => stage.querySelectorAll('.pool .chipi').length;
  stage.querySelectorAll('.pool .chipi').forEach(c => c.onclick = () => { stage.querySelectorAll('.chipi').forEach(x => x.classList.remove('sel')); c.classList.add('sel'); sel = c; fb.innerHTML = `<div class="note">${T('இப்போது சரியான கூடையைத் தொடு ⬇️', 'Now tap the right basket ⬇️')}</div>`; });
  stage.querySelectorAll('.bin').forEach(bin => bin.onclick = () => {
    if(!sel) { fb.innerHTML = `<div class="note">${T('முதலில் மேலே ஒன்றைத் தொடு ⬆️', 'First tap one above ⬆️')}</div>`; return; }
    const it = q.items[Number(sel.dataset.k)];
    if(it.bin === bin.dataset.b){ sel.classList.remove('sel'); sel.classList.add('placed'); sel.onclick = null; bin.querySelector('.bin-in').appendChild(sel); sel = null; beep(true); fb.innerHTML = '';
      if(!left()){ fb.innerHTML = `<div class="cheer">${MAYILU}<b>${firstTryAll ? pick(CHEERS[H.lang()]) : T('எல்லாம் சரியாக வைத்தாய்!', 'All sorted!')}</b></div>`; setTimeout(() => done(firstTryAll), 1100); } }
    else { firstTryAll = false; sel.classList.add('shake'); setTimeout(() => sel && sel.classList.remove('shake'), 500); beep(false);
      const binName = q.bins.find(b => b.id === it.bin);
      fb.innerHTML = `<div class="fb bad">🤔 ${T('இது இந்தக் கூடை இல்லை. மீண்டும் யோசி!', 'Not this basket. Think again!')} ${Lx(q.ex) ? H.esc(Lx(q.ex)) : ''}</div>`; }
  });
}
const pick = a => a[Math.floor(Math.random() * a.length)];

G.KALVI_PLAY = { init(h){ H = h; }, render, GAMES, playMix, MAYILU, beep, ROUNDS, stars };
})(typeof window !== 'undefined' ? window : globalThis);
