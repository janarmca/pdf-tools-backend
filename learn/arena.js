/* Kalvi Kalanjiyam — விளையாட்டு அரங்கம் (the game arena).
   A motivation layer on top of the games: XP + levels, daily streak, a daily challenge shared by every
   student of a class, subject marathons (mixed rounds from every game of a subject), badges and a
   "keep playing" button. Everything is computed on this device (localStorage 'kalviArena' + the
   existing 'kalviProgress'); no login, no server, no AI. */
(function(G){
'use strict';
let H = null; // {C(): catalog, L, esc, go, lang, getProg}
const T = (ta, en) => H.lang() === 'ta' ? ta : en;
const KEY = 'kalviArena';

/* ---------------- storage ---------------- */
function load(){ try{ const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return Object.assign({xp: 0, days: [], daily: {}, dailyCount: 0}, o); }catch(e){ return {xp: 0, days: [], daily: {}, dailyCount: 0}; } }
function save(a){ try{ localStorage.setItem(KEY, JSON.stringify(a)); }catch(e){} }
const pad = n => (n < 10 ? '0' : '') + n;
const dstr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => dstr(new Date());
function award(xp){
  const a = load(); a.xp += Math.max(0, Math.round(xp));
  const t = today(); if(!a.days.includes(t)){ a.days.push(t); a.days = a.days.slice(-400); }
  save(a); return a;
}
function streak(a){
  const set = new Set(a.days); const d = new Date(); let n = 0;
  if(!set.has(dstr(d))) d.setDate(d.getDate() - 1);
  while(set.has(dstr(d))){ n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ---------------- levels ---------------- */
const LEVELS = [
  [0, '🌱', 'முளை', 'Sprout'], [100, '🍃', 'இலை', 'Leaf'], [300, '🌿', 'செடி', 'Plant'], [600, '🌸', 'மொட்டு', 'Bud'], [1000, '🌺', 'மலர்', 'Flower'],
  [1600, '🥭', 'கனி', 'Fruit'], [2400, '🌳', 'மரம்', 'Tree'], [3500, '🌴', 'தோப்பு', 'Grove'], [5000, '🏞️', 'காடு', 'Forest'], [7000, '🏆', 'களஞ்சியம்', 'Treasury']
];
function levelOf(xp){
  let i = 0; while(i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++;
  const cur = LEVELS[i], nxt = LEVELS[i + 1];
  return {n: i + 1, icon: cur[1], name: T(cur[2], cur[3]), from: cur[0], to: nxt ? nxt[0] : null, pct: nxt ? Math.round((xp - cur[0]) / (nxt[0] - cur[0]) * 100) : 100};
}

/* ---------------- catalog helpers ---------------- */
function entriesOf(c){
  const out = [], cls = H.C().classes[c]; if(!cls) return out;
  const GAMES = G.KALVI_PLAY.GAMES;
  cls.subjects.forEach(sb => (sb.chapters || []).forEach((ch, ci) => (ch.lessons || []).forEach(l => {
    if(l.game && GAMES[l.game]) out.push({sid: sb.id, sb, ch: ci + 1, l, game: GAMES[l.game], level: l.level || {}});
  })));
  return out;
}
function statsOf(){
  const p = H.getProg(); let stars = 0, three = 0, lab = false;
  Object.keys(p).forEach(k => { const v = p[k]; if(v && typeof v.stars === 'number'){ stars += v.stars; if(v.stars >= 3) three++; } if(k.indexOf('lab-') === 0) lab = true; });
  const a = load();
  return {stars, three, lab, xp: a.xp, streak: streak(a), daily: a.dailyCount, level: levelOf(a.xp).n};
}
const BADGES = [
  ['b-first', '👣', 'முதல் அடி', 'First step', 'ஒரு விளையாட்டை முடி', 'Finish a game', s => s.xp > 0 || s.stars > 0],
  ['b-s10', '⭐', '10 நட்சத்திரம்', '10 stars', '10 நட்சத்திரம் சேர்', 'Collect 10 stars', s => s.stars >= 10],
  ['b-s50', '🌟', '50 நட்சத்திரம்', '50 stars', '50 நட்சத்திரம் சேர்', 'Collect 50 stars', s => s.stars >= 50],
  ['b-s150', '💫', '150 நட்சத்திரம்', '150 stars', '150 நட்சத்திரம் சேர்', 'Collect 150 stars', s => s.stars >= 150],
  ['b-3', '🥇', 'முழு மதிப்பெண்', 'Perfect game', 'ஒரு விளையாட்டில் 3 நட்சத்திரம்', '3 stars in one game', s => s.three >= 1],
  ['b-st3', '🔥', '3 நாள் தொடர்', '3-day streak', 'தொடர்ந்து 3 நாள் விளையாடு', 'Play 3 days in a row', s => s.streak >= 3],
  ['b-st7', '🔥', '7 நாள் தொடர்', '7-day streak', 'தொடர்ந்து 7 நாள் விளையாடு', 'Play 7 days in a row', s => s.streak >= 7],
  ['b-st30', '🌋', '30 நாள் தொடர்', '30-day streak', 'தொடர்ந்து 30 நாள் விளையாடு', 'Play 30 days in a row', s => s.streak >= 30],
  ['b-d1', '🎯', 'இன்றைய வீரன்', 'Daily player', 'இன்றைய சவாலை முடி', 'Finish a daily challenge', s => s.daily >= 1],
  ['b-d7', '🏅', '7 சவால்கள்', '7 challenges', '7 நாள் சவால்களை முடி', 'Finish 7 daily challenges', s => s.daily >= 7],
  ['b-lab', '🧪', 'ஆய்வாளர்', 'Experimenter', 'ஒரு ஆய்வகச் சோதனை செய்', 'Do a lab experiment', s => s.lab],
  ['b-lv5', '🌺', 'மலர் நிலை', 'Flower level', 'நிலை 5-ஐ அடை', 'Reach level 5', s => s.level >= 5]
];
const earned = s => BADGES.filter(b => b[6](s)).map(b => b[0]);

/* ---------------- seeded random (same daily challenge for everyone in a class) ---------------- */
function hash(s){ let h = 2166136261; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function dailyPicks(c){
  const all = entriesOf(c); if(!all.length) return [];
  const r = rng(hash(today() + '|' + c)), bySubj = {};
  all.forEach(e => (bySubj[e.sid] = bySubj[e.sid] || []).push(e));
  const sids = Object.keys(bySubj).sort(); // shuffle deterministically
  for(let i = sids.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [sids[i], sids[j]] = [sids[j], sids[i]]; }
  return sids.slice(0, 6).map(s => bySubj[s][Math.floor(r() * bySubj[s].length)]);
}
function nextGame(c){
  const all = entriesOf(c), p = H.getProg();
  const st = e => (p[e.l.id] || {}).stars || 0;
  return all.find(e => st(e) === 0) || all.find(e => st(e) < 3) || null;
}
const lessonHash = (c, e) => `#/${c}/${e.sid}/${e.ch}/${e.l.id}`;

/* ---------------- styles ---------------- */
function css(){
  if(document.getElementById('arenaCss')) return;
  const s = document.createElement('style'); s.id = 'arenaCss';
  s.textContent = `
.ar-me{background:linear-gradient(135deg,#3b2fc9,#7b2cbf);color:#fff;border-radius:22px;padding:18px 18px 16px}
.ar-top{display:flex;gap:14px;align-items:center}
.ar-lv{width:62px;height:62px;border-radius:20px;background:#ffffff26;display:flex;align-items:center;justify-content:center;font-size:2rem;flex:0 0 auto}
.ar-nm{font-size:1.15rem;font-weight:800;line-height:1.3}.ar-nm small{display:block;font-size:.78rem;font-weight:600;opacity:.85}
.ar-xp{height:9px;background:#ffffff33;border-radius:9px;margin-top:7px;overflow:hidden}.ar-xp i{display:block;height:100%;background:#ffd23f;border-radius:9px}
.ar-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ar-chips span{background:#ffffff26;border-radius:99px;padding:5px 12px;font-size:.84rem;font-weight:700}
.ar-cta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0}
.ar-big{border:0;border-radius:20px;padding:16px 14px;text-align:left;cursor:pointer;font:inherit;color:#fff;min-height:96px;transition:transform .12s}
.ar-big:active{transform:scale(.98)}
.ar-big b{display:block;font-size:1.12rem;margin-bottom:3px}.ar-big span{font-size:.8rem;opacity:.95;line-height:1.4;display:block}
.ar-big.d{background:linear-gradient(135deg,#c2410c,#b91c1c)}.ar-big.n{background:linear-gradient(135deg,#0f766e,#15803d)}
.ar-big.done{background:linear-gradient(135deg,#64748b,#475569)}
.ar-h{margin:20px 0 8px;font-size:1.05rem;font-weight:800}
.ar-sub{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
.ar-sc{background:#fff;border:1px solid var(--line);border-radius:18px;padding:12px;cursor:pointer;border-top:5px solid var(--c,#888);display:flex;flex-direction:column;gap:3px}
.ar-sc .ic{font-size:1.7rem;line-height:1.1}.ar-sc h3{margin:2px 0 0;font-size:1rem}.ar-sc .meta{font-size:.76rem;color:var(--sub)}
.ar-sc .mx{margin-top:6px;border:0;background:var(--brand2);color:var(--brand);border-radius:10px;padding:6px 8px;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}
.ar-more{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.ar-more div{background:#fff;border:1px solid var(--line);border-radius:14px;padding:11px 12px;cursor:pointer;font-weight:700;font-size:.9rem;line-height:1.4}
.ar-more small{display:block;font-weight:500;color:var(--sub);font-size:.74rem}
.ar-badges{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px}
.ar-b{background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px 6px;text-align:center;font-size:.76rem;line-height:1.3}
.ar-b i{display:block;font-style:normal;font-size:1.7rem}.ar-b.lock{opacity:.45;filter:grayscale(1)}.ar-b small{display:block;color:var(--sub);font-size:.68rem}
.ar-run{background:#fff;border:1px solid var(--line);border-radius:22px;padding:14px 16px}
.ar-sbar{display:flex;gap:10px;align-items:center;background:linear-gradient(135deg,#eef2ff,#fdf2f8);border:1px solid #d8d4ff;border-radius:16px;padding:12px 14px;margin:0 0 12px;cursor:pointer}
.ar-sbar b{display:block}.ar-sbar span{font-size:.8rem;color:var(--sub)}.ar-sbar .ic{font-size:1.8rem}
.ar-xpg{font-size:1.2rem;font-weight:800;color:#b45309;margin:4px 0}
.ar-new{background:#fff7e3;border:1px dashed #f5c242;border-radius:14px;padding:8px 12px;margin:8px auto;max-width:360px;font-weight:700}
.ar-list{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.ar-list span{background:#eef0f7;border-radius:99px;padding:3px 10px;font-size:.78rem}
@media(max-width:560px){.ar-cta{grid-template-columns:1fr}.ar-sub{grid-template-columns:repeat(2,1fr)}}
`;
  document.head.appendChild(s);
}

/* ---------------- home ---------------- */
function home(c){
  css();
  try{ localStorage.setItem('kalviClass', c); }catch(e){}
  const cat = H.C(), cls = cat.classes[c], a = load(), lv = levelOf(a.xp), st = statsOf(), prog = H.getProg(), esc = H.esc, L = H.L;
  const dailyDone = a.daily[today() + '|' + c];
  const nxt = nextGame(c);
  const subs = cls.subjects.map(sb => {
    let games = 0, pts = 0, lessons = 0, lpts = 0;
    (sb.chapters || []).forEach(ch => (ch.lessons || []).forEach(l => {
      if(l.game){ games++; pts += (prog[l.id] || {}).stars || 0; } else { lessons++; lpts += (prog[l.id] && prog[l.id].done) ? 1 : 0; }
    }));
    const total = games * 3 + lessons * 3, got = pts + lpts * 3;
    return {sb, games, lessons, total, got, pct: total ? Math.round(got / total * 100) : 0};
  });
  const have = new Set(earned(st));
  $app().innerHTML = `
  <div class="ar-me">
    <div class="ar-top"><div class="ar-lv">${lv.icon}</div>
      <div style="flex:1"><div class="ar-nm">${T('நிலை', 'Level')} ${lv.n} · ${lv.name}<small>${a.xp} XP${lv.to ? ' · ' + T('அடுத்த நிலைக்கு', 'next level at') + ' ' + lv.to : ''}</small></div>
        <div class="ar-xp"><i style="width:${lv.pct}%"></i></div></div></div>
    <div class="ar-chips"><span>🔥 ${st.streak} ${T('நாள் தொடர்', 'day streak')}</span><span>⭐ ${st.stars} ${T('நட்சத்திரம்', 'stars')}</span><span>🏅 ${have.size}/${BADGES.length}</span></div>
  </div>
  <div class="ar-cta">
    <button class="ar-big ${dailyDone != null ? 'done' : 'd'}" id="arDaily"><b>🎯 ${T('இன்றைய சவால்', 'Today’s challenge')}</b><span>${dailyDone != null ? T('இன்று முடித்தாய்! ' + dailyDone + '/10 — மீண்டும் முயற்சிக்கலாம்', 'Done today! ' + dailyDone + '/10 — try again') : T('6 பாடங்கள் கலந்த 10 கேள்விகள் · +50 XP', '10 questions across 6 subjects · +50 XP')}</span></button>
    <button class="ar-big n" id="arNext"><b>▶ ${T('தொடர்ந்து விளையாடு', 'Keep playing')}</b><span>${nxt ? esc(L(nxt.l.title)) : T('எல்லா விளையாட்டிலும் 3 நட்சத்திரம்! 🎉', 'All games at 3 stars! 🎉')}</span></button>
  </div>
  <div class="ar-h">${T('வகுப்பைத் தேர்ந்தெடு', 'Choose your class')}</div>
  <div class="classes">${Object.keys(cat.classes).map(k => `<div class="cls ${k === c ? 'on' : ''}" data-c="${k}"><b>${k}</b>${T('வகுப்பு', 'Class')}</div>`).join('')}</div>
  <div class="ar-h">${T('உன் பாட உலகங்கள்', 'Your subject worlds')} — ${c} ${T('ஆம் வகுப்பு', '')}</div>
  <div class="ar-sub">${subs.map(x => `<div class="ar-sc" style="--c:var(--c-${x.sb.color || 'math'})" data-s="${x.sb.id}">
      <div class="ic">${x.sb.icon || '📘'}</div><h3>${esc(L(x.sb.name))}</h3>
      <div class="meta">${x.games ? '🎮 ' + x.games + ' ' + T('விளையாட்டு', 'games') : ''}${x.games && x.lessons ? ' · ' : ''}${x.lessons ? '📘 ' + x.lessons + ' ' + T('பாடம்', 'lessons') : ''}${!x.games && !x.lessons ? T('விரைவில்', 'Soon') : ''}</div>
      ${x.total ? `<div class="bar"><i style="width:${x.pct}%"></i></div>` : ''}
      ${x.games > 1 ? `<button class="mx" data-m="${x.sb.id}">⚡ ${T('பாட மாரத்தான்', 'Marathon')}</button>` : ''}</div>`).join('')}</div>
  <div class="ar-h">${T('மேலும் கற்க', 'Explore more')}</div>
  <div class="ar-more">
    <div data-go="#/future" style="border-color:#f59e0b;background:#fff9ec">🚀 ${T('நாளைய உலகம்', 'Tomorrow’s World')}<small>${T('16 பாடங்கள்: மின்சாரம், இணையம், விண்வெளி, மருத்துவம், AI…', '16 lessons: power, internet, space, medicine, AI…')}</small></div>
    <div data-go="#/lab">🧪 ${T('ஆய்வகம்', 'Lab')}<small>${T('28 சோதனைகள் — செய்து பார்', '28 experiments')}</small></div>
    <div data-go="#/missions">🎯 ${T('இலக்கைத் தாக்கு', 'Hit the target')}<small>${T('11 சவால் விளையாட்டுகள்', '11 mission games')}</small></div>
    <div data-go="#/what">❓ ${T('இது என்ன பாடம்?', 'What is this subject?')}<small>${T('ஏன் படிக்கிறோம்?', 'Why do we learn it?')}</small></div>
    <div data-go="#/project">🧠 ${T('திட்ட வழிகாட்டி', 'Project coach')}<small>${T('பள்ளித் திட்டத்துக்கு உதவி', 'Help with school projects')}</small></div>
    <div data-go="#/books">📚 ${T('இலவச புத்தகங்கள்', 'Free books')}<small>${T('அதிகாரப்பூர்வ பாடநூல்கள்', 'Official textbooks')}</small></div>
  </div>
  <div class="ar-h">${T('பதக்கங்கள்', 'Badges')}</div>
  <div class="ar-badges">${BADGES.map(b => `<div class="ar-b ${have.has(b[0]) ? '' : 'lock'}"><i>${b[1]}</i><b>${T(b[2], b[3])}</b><small>${T(b[4], b[5])}</small></div>`).join('')}</div>
  <p class="note" style="margin-top:18px">${T('முழுக்க இலவசம் — பதிவு தேவையில்லை. உன் முன்னேற்றம் இந்தச் சாதனத்தில் மட்டும் சேமிக்கப்படும்.', 'Completely free — no sign-up. Your progress is saved on this device only.')}</p>`;
  document.querySelectorAll('.cls').forEach(n => n.onclick = () => home(n.dataset.c));
  document.querySelectorAll('.ar-sc').forEach(n => n.onclick = () => H.go(`#/${c}/${n.dataset.s}`));
  document.querySelectorAll('.ar-sc .mx').forEach(n => n.onclick = e => { e.stopPropagation(); H.go(`#/mix/${c}/${n.dataset.m}`); });
  document.querySelectorAll('.ar-more [data-go]').forEach(n => n.onclick = () => H.go(n.dataset.go));
  $('#arDaily').onclick = () => H.go('#/daily/' + c);
  $('#arNext').onclick = () => H.go(nxt ? lessonHash(c, nxt) : '#/daily/' + c);
  window.scrollTo(0, 0);
}
const $ = s => document.querySelector(s);
const $app = () => $('#app');

/* ---------------- a mixed run (daily challenge or subject marathon) ---------------- */
function run(kind, c, sid){
  css();
  const P = G.KALVI_PLAY, esc = H.esc, L = H.L, cls = H.C().classes[c];
  if(!cls) return home('10');
  let picks, title, intro, sbName = '';
  if(kind === 'daily'){
    picks = dailyPicks(c);
    title = '🎯 ' + T('இன்றைய சவால்', 'Today’s challenge') + ' — ' + c + ' ' + T('ஆம் வகுப்பு', '');
    intro = T('இன்று உன் வகுப்பில் எல்லோருக்கும் ஒரே சவால்! 6 பாடங்களிலிருந்து கலந்த 10 கேள்விகள். முடித்தால் +50 XP பரிசு.', 'The same challenge for everyone in your class today! 10 mixed questions from 6 subjects. Finish it for a +50 XP bonus.');
  } else {
    const all = entriesOf(c).filter(e => e.sid === sid);
    picks = all; const sb = cls.subjects.find(x => x.id === sid);
    sbName = sb ? L(sb.name) : '';
    title = '⚡ ' + T('பாட மாரத்தான்', 'Marathon') + ' — ' + esc(sbName) + ' ' + c;
    intro = T('இந்தப் பாடத்தின் எல்லா விளையாட்டுகளிலிருந்தும் கலந்த 10 கேள்விகள். ஒவ்வொரு முறையும் புதிய கேள்விகள்!', 'Ten mixed questions from every game in this subject. New questions every time!');
  }
  if(!picks.length){ $app().innerHTML = `<div class="soonbox">${T('இந்த வகுப்பில் இன்னும் விளையாட்டுகள் இல்லை.', 'No games here yet.')}</div>`; return; }
  const back = kind === 'daily' ? `#/${c}` : `#/${c}/${sid}`;
  const crumbs = `<div class="crumbs"><span data-go="#/${c}">${T('முகப்பு', 'Home')}</span>${kind === 'mix' ? ' › <span data-go="' + back + '">' + esc(sbName) + '</span>' : ''}</div>`;
  $app().innerHTML = `${crumbs}<div class="ar-run"><div class="ghead"><div class="gicon">${kind === 'daily' ? '🎯' : '⚡'}</div><h1 style="font-size:1.1rem;margin:0">${title}</h1></div><div class="gstage" id="stage"></div></div>
    <div class="nav"><button class="btn" data-go="#/${c}">← ${T('முகப்பு', 'Home')}</button></div>`;
  document.querySelectorAll('[data-go]').forEach(n => n.onclick = () => H.go(n.dataset.go));
  const stage = $('#stage');
  const showIntro = () => {
    stage.innerHTML = `<div class="mrow">${P.MAYILU}<div class="bubble"><b>${T('மயிலு சொல்கிறது:', 'Mayilu says:')}</b> ${intro}</div></div>
      <div class="ar-list">${picks.slice(0, 8).map(e => `<span>${e.game.icon || '🎮'} ${esc(L(e.l.title)).slice(0, 26)}</span>`).join('')}</div>
      <div class="row" style="justify-content:center;margin-top:14px"><button class="btn p big-btn" id="go">▶ ${T('ஆரம்பி!', 'Start!')}</button></div>`;
    $('#go').onclick = start;
    window.scrollTo(0, 0);
  };
  const start = () => P.playMix(stage, picks, score => finish(score));
  const finish = score => {
    const before = statsOf(), beforeB = new Set(earned(before)), a0 = load();
    const stars = P.stars(score, 10);
    let xp = score * 2 + (score >= 9 ? 10 : 0), bonus = 0;
    const a = load();
    if(kind === 'daily'){
      const k = today() + '|' + c;
      if(a.daily[k] == null){ if(score >= 5){ bonus = 50; a.dailyCount += 1; a.daily[k] = score; } }
      else if(score > a.daily[k]) a.daily[k] = score;
      Object.keys(a.daily).sort().slice(0, -30).forEach(x => delete a.daily[x]);
    }
    a.xp += xp + bonus; const t = today(); if(!a.days.includes(t)){ a.days.push(t); a.days = a.days.slice(-400); }
    save(a);
    const after = statsOf(), fresh = BADGES.filter(b => b[6](after) && !beforeB.has(b[0]));
    const lvB = levelOf(a0.xp).n, lvA = levelOf(a.xp).n;
    P.beep(stars >= 2);
    stage.innerHTML = `<div class="finish"><div class="confetti">${Array.from({length: 18}, (_, k) => `<i style="left:${k * 5.5}%;animation-delay:${(k % 6) * .15}s">${['⭐', '🎉', '✨', '🌟'][k % 4]}</i>`).join('')}</div>
      ${P.MAYILU}<div class="score">${score} / 10</div><div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <div class="ar-xpg">+${xp + bonus} XP${bonus ? ' (' + T('சவால் பரிசு', 'challenge bonus') + ' +' + bonus + ')' : ''}</div>${kind === 'daily' && !bonus && score < 5 && !a0.daily[today() + '|' + c] ? '<p class="note">' + T('பரிசு பெற 5 சரியான விடை வேண்டும் — மீண்டும் முயற்சி செய்!', 'You need 5 correct for the bonus — try again!') + '</p>' : ''}
      <p>🔥 ${after.streak} ${T('நாள் தொடர்!', 'day streak!')}${lvA > lvB ? ' · ' + T('புதிய நிலை: ', 'New level: ') + levelOf(a.xp).icon + ' ' + levelOf(a.xp).name : ''}</p>
      ${fresh.map(b => `<div class="ar-new">${b[1]} ${T('புதிய பதக்கம்:', 'New badge:')} ${T(b[2], b[3])}</div>`).join('')}
      <div class="row" style="justify-content:center;margin-top:10px"><button class="btn p big-btn" id="again">🔁 ${T('மீண்டும்', 'Again')}</button><button class="btn big-btn" id="hm">🏠 ${T('முகப்பு', 'Home')}</button></div></div>`;
    $('#again').onclick = () => (kind === 'daily' ? showIntro() : showIntro());
    $('#hm').onclick = () => H.go('#/' + c);
  };
  showIntro();
  window.scrollTo(0, 0);
}

/* ---------------- subject page: marathon button ---------------- */
function subjectBar(c, sid){
  const n = entriesOf(c).filter(e => e.sid === sid).length;
  if(n < 2) return '';
  css();
  return `<div class="ar-sbar" data-go="#/mix/${c}/${sid}"><div class="ic">⚡</div><div><b>${T('பாட மாரத்தான்', 'Subject marathon')}</b><span>${T('இந்தப் பாடத்தின் ' + n + ' விளையாட்டுகளும் கலந்து — 10 கேள்வி, XP பரிசு', 'All ' + n + ' games mixed — 10 questions, earn XP')}</span></div></div>`;
}

G.KALVI_ARENA = {
  init(h){ H = h; },
  award, home, subjectBar,
  daily: c => run('daily', c || '5'),
  mix: (c, sid) => run('mix', c, sid),
  _t: {levelOf, statsOf, earned, dailyPicks, entriesOf, nextGame, streak, BADGES, hash, rng}
};
})(typeof window !== 'undefined' ? window : globalThis);
