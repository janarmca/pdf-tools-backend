// "What's new" Short: logo -> the news -> 3 steps -> info card (site, e-mail, YouTube / Instagram / Facebook names + logo).
// Runs INSIDE headless Chrome. window.render(seconds) draws one frame (deterministic).
// CFG: { icon, title, line, steps:[3], subs:[[from,to,text]], palette, nom, k, logo (data: URL of lockup-dark.svg), mark (data: URL), social:[[icon,name,handle]], site, email }
const C = window.CFG, K = C.k || 1;
const root = document.getElementById('root');
const GOLD = '#FFD54A', INK = '#14182b';
root.style.background = `linear-gradient(165deg,${C.palette[0]} 0%,${C.palette[1]} 55%,${C.palette[2]} 100%)`;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo3 = (x) => 1 - Math.pow(1 - x, 3);
const mk = (html, css) => { const d = document.createElement('div'); d.className = 'abs'; d.innerHTML = html || ''; Object.assign(d.style, css || {}); root.appendChild(d); return d; };
const tf = (e, x, y, s = 1, o = 1) => { e.style.transform = `translate(${x}px,${y}px) scale(${s})`; e.style.opacity = o; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const rings = [0, 1, 2].map((i) => mk('', { width: 900 + i * 380 + 'px', height: 900 + i * 380 + 'px', left: 540 - (450 + i * 190) + 'px', top: 1000 - (450 + i * 190) + 'px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.08)' }));
// logo (top, every scene until the info card takes over)
const logo = mk(`<div style="background:#fff;border-radius:40px;padding:26px 40px;box-shadow:0 10px 0 rgba(0,0,0,.25)"><img src="${C.logo}" style="width:700px;display:block"></div>`, { left: '140px', top: '90px' });
const badge = mk(`<div style="display:inline-block;background:${GOLD};color:${INK};border-radius:999px;padding:12px 40px;font-weight:900;font-size:46px">🆕 புதிய வசதி</div>`, { left: '0', top: '420px', width: '1080px', textAlign: 'center' });
const icon = mk(esc(C.icon), { left: '0', top: '560px', width: '1080px', textAlign: 'center', fontSize: '210px', lineHeight: 1, fontFamily: "'Noto Color Emoji',sans-serif" });
const title = mk(esc(C.title), { left: '70px', top: '830px', width: '940px', textAlign: 'center', fontWeight: 900, fontSize: C.title.length > 26 ? '76px' : '92px', lineHeight: 1.25, color: GOLD, textShadow: '0 8px 0 rgba(0,0,0,.35)' });
const line = mk(esc(C.line), { left: '90px', top: '1180px', width: '900px', textAlign: 'center', fontWeight: 600, fontSize: '40px', lineHeight: 1.5, opacity: .95 });
const steps = C.steps.map((s, i) => mk(`<div style="display:flex;align-items:center;gap:26px;background:#fff;color:${INK};border-radius:30px;padding:26px 34px;box-shadow:0 10px 0 rgba(0,0,0,.25)"><div style="min-width:78px;height:78px;border-radius:50%;background:${GOLD};display:flex;align-items:center;justify-content:center;font:900 48px Inter,sans-serif">${i + 1}</div><div style="font-weight:800;font-size:44px;line-height:1.3">${esc(s)}</div></div>`, { left: '80px', top: 760 + i * 190 + 'px', width: '920px' }));
// info card
const card = mk(`<div style="text-align:center">
  <div style="background:#fff;border-radius:44px;padding:30px 44px;margin:0 auto 46px;width:900px;box-shadow:0 10px 0 rgba(0,0,0,.25)"><img src="${C.logo}" style="width:812px;display:block"></div>
  <div style="display:inline-block;background:${GOLD};color:${INK};border-radius:999px;padding:22px 58px;font:900 68px Inter,sans-serif">${esc(C.site)}</div>
  <div style="margin-top:34px;font:700 44px Inter,sans-serif">✉️ ${esc(C.email)}</div>
  <div style="margin-top:44px;display:flex;flex-direction:column;gap:20px;align-items:center">${C.social.map((s) => `<div style="width:820px;background:rgba(255,255,255,.14);border:3px solid rgba(255,255,255,.4);border-radius:26px;padding:20px 34px;display:flex;align-items:center;gap:22px;text-align:left"><span style="font-size:58px;font-family:'Noto Color Emoji'">${s[0]}</span><span style="font:700 36px Inter,sans-serif;opacity:.85;min-width:210px">${esc(s[1])}</span><span style="font:900 42px Inter,sans-serif;color:${GOLD}">${esc(s[2])}</span></div>`).join('')}</div>
  <div style="margin-top:40px;font-weight:700;font-size:40px;opacity:.9">தினமும் ஒரு புதிய தகவல் — Follow பண்ணுங்க!</div></div>`, { left: '0', top: '170px', width: '1080px' });
const sub = mk('', { left: '60px', top: '1790px', width: '960px', textAlign: 'center', fontWeight: 700, fontSize: '46px', lineHeight: 1.3, textShadow: '0 2px 10px rgba(0,0,0,.85)' });
window.DUR = C.nom * K;

window.render = (tReal) => {
  const t = tReal / K;
  rings.forEach((r, i) => tf(r, 0, 0, 1 + Math.sin(t * .6 + i) * .03, 1));
  const intro = 1 - seg(t, 4.6, 5.0), steps_ = seg(t, 4.8, 5.3) * (1 - seg(t, 12.4, 12.8)), infoIn = eo3(seg(t, 13.0, 13.7));
  const logoIn = eo3(seg(t, 0, .7));
  tf(logo, 0, (1 - logoIn) * -60, 1, logoIn * (1 - seg(t, 12.6, 13.0)));
  tf(badge, 0, 0, 1 + .08 * Math.max(0, 1 - Math.abs(t - .9) / .4), seg(t, .5, .9) * intro);
  tf(icon, 0, 0, 1 + .06 * Math.sin(t * 4), seg(t, 1.0, 1.5) * intro);
  tf(title, 0, 0, 1, seg(t, 1.6, 2.2) * intro);
  tf(line, 0, 0, 1, seg(t, 2.6, 3.2) * intro);
  steps.forEach((s, i) => { const a0 = 5.2 + i * 2.2, p = eo3(seg(t, a0, a0 + .5)); tf(s, 0, (1 - p) * 40, 1, p * (1 - seg(t, 12.4, 12.8))); });
  tf(card, 0, (1 - infoIn) * 50, 1, infoIn);
  const cur = C.subs.find((s) => t >= s[0] && t < s[1]);
  sub.innerHTML = cur ? cur[2] : ''; sub.style.opacity = cur ? Math.min(1, (t - cur[0]) / .25) : 0;
};
