// Runs INSIDE the headless-Chrome page (inlined by promo-anim.mjs). Deterministic: window.render(seconds) draws one frame.
// window.CFG = { story, palette:[c1,c2,c3], look:{skin,hair,shirt}, k, hook, label, bad, stamp, price, bubble, rows, pills, subs, nom }
// All characters are original drawings. Story beats (nominal seconds): A 0-5.4 problem · B 5.5-10.4 hero shows the tool · C 10.5-13.9 celebrate · D 14-16.8 call to action.
const C = window.CFG, K = C.k || 1, STORY = C.story;
const root = document.getElementById('root');
root.style.background = `linear-gradient(165deg,${C.palette[0]} 0%,${C.palette[1]} 55%,${C.palette[2]} 100%)`;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo3 = (x) => 1 - Math.pow(1 - x, 3);
const eoBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const mk = (cls, html, css) => { const d = document.createElement('div'); d.className = 'abs ' + cls; d.innerHTML = html || ''; Object.assign(d.style, css || {}); root.appendChild(d); return d; };
const tf = (e, x, y, s = 1, r = 0, o = 1) => { e.style.transform = `translate(${x}px,${y}px) rotate(${r}deg) scale(${s})`; e.style.opacity = o; };
const $ = (id) => document.getElementById(id);
const L = C.look;

/* ---------- characters ---------- */
const guySvg = (mood) => {
  const P = (d, w = 10) => `<path d="${d}" stroke="#111" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  const mouths = {
    neutral: '<path d="M150 255 Q180 262 210 255" stroke="#5a2d1a" stroke-width="9" fill="none" stroke-linecap="round"/>',
    shock: '<ellipse cx="180" cy="262" rx="26" ry="36" fill="#5a1a1a"/><ellipse cx="180" cy="276" rx="16" ry="12" fill="#e57373"/>',
    cry: '<path d="M140 280 Q180 236 220 280" stroke="#5a2d1a" stroke-width="10" fill="none" stroke-linecap="round"/>',
    hope: '<path d="M148 255 Q180 275 212 255" stroke="#5a2d1a" stroke-width="9" fill="none" stroke-linecap="round"/>',
    happy: '<path d="M130 245 Q180 320 230 245 Z" fill="#5a1a1a"/><path d="M146 262 Q180 296 214 262 Z" fill="#fff"/>' };
  const eyes = mood === 'shock' ? '<circle cx="130" cy="185" r="34" fill="#fff"/><circle cx="230" cy="185" r="34" fill="#fff"/><circle cx="130" cy="185" r="9" fill="#111"/><circle cx="230" cy="185" r="9" fill="#111"/>'
    : mood === 'cry' ? P('M100 195 Q130 165 160 195') + P('M200 195 Q230 165 260 195')
    : mood === 'happy' ? P('M100 195 Q130 160 160 195') + P('M200 195 Q230 160 260 195')
    : '<circle cx="130" cy="188" r="26" fill="#fff"/><circle cx="230" cy="188" r="26" fill="#fff"/><circle cx="134" cy="190" r="11" fill="#111"/><circle cx="226" cy="190" r="11" fill="#111"/>';
  const brows = mood === 'shock' ? P('M95 130 L160 118') + P('M200 118 L265 130') : mood === 'cry' ? P('M95 150 L160 135') + P('M200 135 L265 150') : P('M100 142 L160 138') + P('M200 138 L260 142');
  const beard = STORY === 'beard' ? '<g id="beard" transform="translate(180 262) scale(1 .001) translate(-180 -262)"><path d="M62 230 Q50 330 110 392 Q180 440 250 392 Q310 330 298 230 Q250 292 180 292 Q110 292 62 230Z" fill="#e5e7eb" stroke="#9ca3af" stroke-width="6"/></g>' : '';
  return `<svg width="360" height="520" viewBox="0 0 360 520" overflow="visible">
    <rect x="70" y="330" width="220" height="190" rx="46" fill="${L.shirt}"/><path d="M165 330 L195 330 L205 470 L180 495 L155 470 Z" fill="#fff"/><path d="M172 345 L188 345 L196 440 L180 460 L164 440 Z" fill="#E11D48"/>
    <ellipse cx="180" cy="200" rx="128" ry="140" fill="${L.skin}"/><ellipse cx="52" cy="210" rx="22" ry="32" fill="${L.skin}"/><ellipse cx="308" cy="210" rx="22" ry="32" fill="${L.skin}"/>
    <path d="M55 150 Q70 40 180 36 Q290 40 305 150 Q250 90 180 92 Q110 90 55 150Z" fill="${L.hair}"/>
    ${eyes}${brows}<path d="M180 205 Q168 235 184 238" stroke="#c98a62" stroke-width="8" fill="none" stroke-linecap="round"/>${beard}${mouths[mood]}
  </svg>`;
};
const heroSvg = `<svg width="380" height="470" viewBox="0 0 380 470">
  <path d="M60 130 Q-30 330 40 450 Q120 400 190 330 Z" fill="#F58220"/><path d="M320 130 Q410 330 340 450 Q260 400 190 330 Z" fill="#FFB347"/>
  <path d="M95 40 H245 L305 100 V400 Q305 430 275 430 H125 Q95 430 95 400 Z" fill="#4F6FD8"/><path d="M245 40 V92 Q245 100 253 100 H305 Z" fill="#B8C8F6"/>
  <rect x="130" y="250" width="140" height="130" rx="14" fill="#EAF0FF"/><rect x="150" y="275" width="100" height="14" rx="7" fill="#1F2A44"/><rect x="150" y="305" width="80" height="14" rx="7" fill="#1F2A44"/><rect x="150" y="335" width="60" height="14" rx="7" fill="#1F2A44"/>
  <rect x="118" y="130" width="76" height="52" rx="12" fill="#0b0b12"/><rect x="206" y="130" width="76" height="52" rx="12" fill="#0b0b12"/><rect x="190" y="145" width="20" height="10" fill="#0b0b12"/><path d="M128 142 L160 142" stroke="#6b7cff" stroke-width="6" stroke-linecap="round"/>
  <path d="M150 205 Q200 252 250 205 Z" fill="#fff" stroke="#14182b" stroke-width="7" stroke-linejoin="round"/>
  <circle cx="95" cy="300" r="26" fill="#FFD6A5"/><circle cx="305" cy="300" r="26" fill="#FFD6A5"/></svg>`;

/* ---------- scene objects ---------- */
const bgDots = []; for (let i = 0; i < 14; i++) bgDots.push(mk('', '', { width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,.06)' }));
const title = mk('title', C.hook, { top: '125px' });
const laptopHtml = (inner) => `<div style="width:640px;height:420px;background:#cbd5e1;border-radius:34px 34px 10px 10px;padding:26px"><div style="width:100%;height:100%;background:#0F172A;border-radius:14px;padding:30px;position:relative;overflow:hidden">${inner}<div id="flash" style="position:absolute;inset:0;background:${(C.stamp && C.stamp.color) || '#ef4444'};opacity:0"></div></div></div><div style="width:760px;height:34px;background:#94a3b8;border-radius:0 0 30px 30px;margin-left:-60px"></div>`;
let prop = null, stamp = null, coins = [];
if (STORY === 'queue') {
  prop = mk('', `<div style="width:800px;height:330px;background:#1f2937;border:10px solid #FFD54A;border-radius:34px;text-align:center;padding-top:26px;box-shadow:0 14px 0 rgba(0,0,0,.3)"><div style="font-weight:800;font-size:40px;color:#9ca3af">🏪 கடை · Computer Centre</div><div style="font-weight:800;font-size:${C.price.length > 12 ? 66 : 92}px;color:#FFD54A;margin-top:${C.price.length > 12 ? 24 : 6}px;line-height:1.15;white-space:nowrap">${C.price}</div><div style="font-weight:800;font-size:38px;color:#fca5a5;margin-top:4px">வரிசையில் 47 பேர் 👥👥👥</div></div>`, { left: '140px', top: '600px' });
  for (let i = 0; i < 6; i++) coins.push(mk('', '💸', { fontSize: '110px' }));
} else {
  const inner = STORY === 'beard'
    ? `<div class="mono" style="font-size:34px;color:#94a3b8">${C.label}</div><div style="height:46px;border-radius:23px;background:#334155;margin-top:26px;overflow:hidden"><div id="bar" style="height:100%;width:0;background:#22d3ee"></div></div><div id="typed" class="mono" style="font-size:54px;color:#fbbf24;margin-top:26px"></div>`
    : `<div class="mono" style="font-size:34px;color:#94a3b8">${C.label}</div><div id="typed" class="mono" style="font-size:62px;color:#22d3ee;margin-top:18px;letter-spacing:3px;height:80px"></div>`;
  prop = mk('', laptopHtml(inner), { left: '210px', top: '590px' });
  if (C.stamp) stamp = mk('', `<div style="border:14px solid ${C.stamp.color};color:${C.stamp.color};font:900 ${C.stamp.size || 108}px/1 Inter,'Noto Sans Tamil',sans-serif;padding:14px 34px;border-radius:22px;background:rgba(255,255,255,.92);letter-spacing:4px;white-space:nowrap">${C.stamp.text}</div>`, { left: C.stamp.left || '170px', top: '740px' });
}
const guy = mk('', guySvg('neutral'), { left: '360px', top: '1008px' });
let guyMood = 'neutral'; const setMood = (m) => { if (m !== guyMood) { guy.innerHTML = guySvg(m); guyMood = m; } };
const tears = [0, 1, 2, 3].map(() => mk('', '💧', { fontSize: '70px' }));
const sweat = mk('', '💦', { fontSize: '90px', left: '600px', top: '1010px' });
const hero = mk('', heroSvg, { left: '350px', top: '320px' });
const bubble = mk('', `<div style="background:#fff;color:#14182b;font-weight:800;font-size:46px;line-height:1.25;border-radius:34px;padding:22px 34px;width:560px;text-align:center;box-shadow:0 8px 0 rgba(0,0,0,.25)">${C.bubble}</div>`, { left: '440px', top: '340px' });
const rows = C.rows.map((r) => mk('row', `<div class="v">${r.v}</div><div class="m" style="color:${r.ok ? '#16a34a' : '#dc2626'}">${r.ok ? '✅' : '❌'} ${r.m}</div>`, { top: '0px' }));
const pills = C.pills.map((t) => mk('pill', t));
const cta = mk('cta', 'pdftoolsindia.com', { left: '110px', top: '800px' });
const share = mk('', '<div style="font-weight:800;font-size:72px;text-align:center;width:900px;line-height:1.3">Share 📲 &nbsp;·&nbsp; <span style="color:#FFD54A">Save 🔖</span></div>', { left: '90px', top: '1060px' });
const brand = mk('', 'PDF Tools <b style="color:#FFD54A">India</b>', { left: '0px', top: '70px', width: '1080px', textAlign: 'center', font: '900 46px Inter,sans-serif', opacity: .9 });
const conf = []; const cols = ['#FFD54A', '#22d3ee', '#f472b6', '#4ade80', '#fb923c', '#fff'];
for (let i = 0; i < 50; i++) conf.push(mk('conf', '', { background: cols[i % 6] }));
const subEl = mk('sub', '', { top: '1500px' });
window.DUR = C.nom * K;

window.render = (tReal) => {
  const t = tReal / K; // story time (nominal seconds)
  bgDots.forEach((d, i) => tf(d, (i * 173 + t * (20 + i * 3)) % 1200 - 60, (i * 241 + t * (30 + (i % 5) * 8)) % 2000 - 60, 1 + (i % 4) * .6, 0, 1));
  tf(brand, 0, 0, 1, 0, seg(t, 0, .4));
  // title (hook)
  const tIn = eoBack(seg(t, 0, .5)), tOut = 1 - seg(t, 3.1, 3.5);
  tf(title, Math.sin(t * 40) * (t < 2.4 ? 3 : 0), 0, .6 + .4 * tIn, Math.sin(t * 18) * 1.2, clamp(tIn) * tOut);
  // problem prop (laptop or price board)
  const lap = seg(t, .2, .7), lapOut = seg(t, 5.3, 5.9);
  const shake = (t > 2.4 && t < 3.3) ? Math.sin(t * 90) * 18 * (1 - seg(t, 2.4, 3.3)) : 0;
  tf(prop, shake - lapOut * 1300, (1 - eo3(lap)) * 300, 1, 0, clamp(lap * 3));
  const flash = $('flash'); if (flash) flash.style.opacity = (t > 2.4 && t < 2.9) ? 0.65 * (1 - seg(t, 2.4, 2.9)) : 0;
  if (STORY === 'reject') { const full = C.bad; const n = Math.floor(clamp((t - .9) / 1.2) * full.length); $('typed').textContent = full.slice(0, n) + ((Math.floor(t * 4) % 2 === 0 && t < 2.4) ? '▌' : ''); }
  if (STORY === 'beard') {
    const p = t < 1.0 ? t / 1.0 * 99 : 99; $('bar').style.width = p + '%';
    $('typed').textContent = Math.floor(p) + '% · ' + C.dayWord + ' ' + (1 + Math.floor(seg(t, .5, 2.4) * 2.99));
  }
  if (stamp) { const st = seg(t, 2.4, 2.58), stOut = seg(t, 5.2, 5.5); tf(stamp, shake, 0, st < 1 ? 3 - 2 * eo3(st) : 1, -12, (st > 0 ? 1 : 0) * (1 - stOut)); }
  // coins flying away (queue story)
  coins.forEach((c, i) => { const a = 2.4 + i * .22, p = seg(t, a, a + 1.6); const side = i % 2 ? 1 : -1; tf(c, 470 + side * p * (200 + i * 60), 1150 - p * 900 + Math.sin(p * 3.1) * 120, 1 - p * .3, side * p * 300, (p > 0 ? 1 : 0) * (1 - seg(t, a + 1.1, a + 1.6))); });
  // guy
  const gIn = seg(t, .3, .8), gOut = seg(t, 5.4, 5.9), gBack = seg(t, 10.5, 11.0), gOut2 = seg(t, 13.9, 14.4);
  setMood(t < 2.4 ? 'neutral' : t < 3.3 ? 'shock' : t < 5.9 ? 'cry' : t < 10.5 ? 'hope' : 'happy');
  let gy = 0, gs = .8, gr = 0, gx = 0;
  if (t < 10.5) { gy = (1 - eo3(gIn)) * 700 + gOut * 900; if (t > 2.4 && t < 3.3) { gx = Math.sin(t * 70) * 8; gs = .8 * (1 + .08 * (1 - seg(t, 2.4, 3.3))); } }
  else { gy = 27 + (1 - eo3(gBack)) * 700 - Math.abs(Math.sin((t - 10.5) * 7)) * 60 + gOut2 * 900; gs = .75; gr = Math.sin((t - 10.5) * 7) * 6; }
  tf(guy, gx, gy, gs, gr, 1);
  const bd = $('beard'); if (bd) { const s = t < 10.5 ? seg(t, .4, 2.6) * 1.9 : 0; bd.setAttribute('transform', `translate(180 262) scale(1 ${Math.max(.001, s)}) translate(-180 -262)`); }
  tears.forEach((e, i) => { const p = ((t * 1.4 + i * .25) % 1); const side = i % 2 ? 1 : -1; const on = (t > 3.3 && t < 5.7) ? 1 : 0; tf(e, 470 + side * (100 + p * 50), 1150 + p * 300, 1, 0, on * (1 - p)); });
  tf(sweat, Math.sin(t * 12) * 6, -Math.abs(Math.sin(t * 9)) * 18, 1, 0, (t > 2.5 && t < 3.6) ? 1 : 0);
  // hero + bubble
  const hIn = eoBack(seg(t, 5.5, 6.2)), toC = eo3(seg(t, 10.5, 11.0)), heroY = Math.sin(t * 4) * 14;
  tf(hero, 100 + (1 - hIn) * 1400 + toC * 250, heroY + toC * 20, .8 + .05 * toC, (1 - hIn) * -25, hIn > 0 ? 1 : 0);
  const bIn = eoBack(seg(t, 6.3, 6.8)), bOut = seg(t, 7.0, 7.3);
  tf(bubble, 0, 0, .5 + .5 * bIn, Math.sin(t * 6) * 1, clamp(bIn) * (1 - bOut));
  rows.forEach((r, i) => { const a = 7.25 + i * .75, p = eoBack(seg(t, a, a + .35)), out = seg(t, 10.3, 10.6); tf(r, 0, 770 + i * 160 + (1 - p) * 80, .8 + .2 * p, 0, clamp(p * 2) * (1 - out)); });
  pills.forEach((p, i) => { const a = 11.0 + i * .35, q = eoBack(seg(t, a, a + .3)), out = seg(t, 13.9, 14.2); tf(p, 210, 700 + i * 100 + (1 - q) * 60, .7 + .3 * q, 0, clamp(q * 2) * (1 - out)); });
  conf.forEach((c, i) => { const s = 10.55, tt = t - s, on = tt > 0 && tt < 3.3 ? 1 : 0; const x = 540 + Math.sin(i * 12.9) * 120 + Math.sin(i * 7.7) * 480 * seg(t, s, s + .7); const y = 700 - 500 * Math.sin(seg(t, s, s + .7) * 1.4) + (tt > .7 ? (tt - .7) * (500 + (i % 7) * 70) : 0); tf(c, x, y, 1, tt * (200 + i * 15), on * (1 - seg(t, 13.3, 13.9))); });
  const cIn = eoBack(seg(t, 14.0, 14.5)), pulse = 1 + Math.sin(t * 8) * .03; tf(cta, 0, 0, (.5 + .5 * cIn) * pulse, 0, clamp(cIn * 2));
  const sIn = eoBack(seg(t, 14.8, 15.3)); tf(share, 0, 0, .7 + .3 * sIn, 0, clamp(sIn * 2));
  const cur = C.subs.find((s) => t >= s[0] && t < s[1]);
  subEl.innerHTML = cur ? cur[2] : '';
  tf(subEl, 0, cur ? (t - cur[0] < .25 ? (1 - (t - cur[0]) / .25) * 30 : 0) : 0, 1, 0, cur ? 1 : 0);
};
