// Dignified "useful tip" Short. Runs INSIDE headless Chrome. window.render(seconds) draws one frame (deterministic).
// CFG: { name, ta, hook, steps:[3], badges:[3], subs:[[from,to,text]], nom, k, fileName, outName, paid }
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

// soft background rings (very subtle, slow)
const rings = [0, 1, 2].map((i) => mk('', { width: 900 + i * 380 + 'px', height: 900 + i * 380 + 'px', left: 540 - (450 + i * 190) + 'px', top: 1500 - (450 + i * 190) + 'px', borderRadius: '50%', border: '2px solid rgba(232,185,74,.10)' }));
// brand bar
const brand = mk(`<div style="display:flex;align-items:center;gap:22px;justify-content:center"><div style="width:84px;height:84px;border-radius:22px;background:linear-gradient(135deg,${GOLD},#C98F1E);color:${INK};font:900 34px/84px Inter,sans-serif;text-align:center">PDF</div><div style="font:800 52px Inter,sans-serif;letter-spacing:1px">PDF Tools <span style="color:${GOLD}">India</span></div></div><div style="height:3px;width:420px;margin:26px auto 0;background:linear-gradient(90deg,transparent,${GOLD},transparent)"></div>`, { left: '0', top: '90px', width: '1080px' });
// hook
const kicker = mk(`<div style="display:inline-block;border:2px solid ${GOLD};color:${GOLD};border-radius:999px;padding:8px 30px;font-weight:700;font-size:34px">🔥 இது தெரியுமா?</div>`, { left: '0', top: '280px', width: '1080px', textAlign: 'center' });
const hook = mk(esc(C.hook), { left: '70px', top: '360px', width: '940px', textAlign: 'center', fontWeight: 900, fontSize: C.hook.length > 24 ? '80px' : '100px', lineHeight: 1.2, color: GOLD, textShadow: '0 8px 0 rgba(0,0,0,.35)' });
const timer = mk(`<div style="display:inline-block;background:#EF4444;color:#fff;border-radius:999px;padding:10px 34px;font:900 44px Inter,'Noto Sans Tamil',sans-serif;box-shadow:0 8px 0 rgba(0,0,0,.3)">⏱ ${esc(C.fast)}</div>`, { left: '0', top: '600px', width: '1080px', textAlign: 'center' });
const prog = mk('', { left: '0', top: '0', width: '1080px', height: '14px', background: GOLD, transformOrigin: '0 50%' });
// tool window
const win = mk(`<div style="width:900px;height:560px;background:#F8FAFC;border-radius:30px;box-shadow:0 30px 70px rgba(0,0,0,.45);overflow:hidden;color:${INK}">
  <div style="height:70px;background:#E2E8F0;display:flex;align-items:center;padding:0 26px;gap:12px"><i style="width:18px;height:18px;border-radius:50%;background:#F87171"></i><i style="width:18px;height:18px;border-radius:50%;background:#FBBF24"></i><i style="width:18px;height:18px;border-radius:50%;background:#34D399"></i><div style="margin-left:18px;flex:1;background:#fff;border-radius:999px;padding:8px 22px;font:600 26px Inter,sans-serif;color:#475569">pdftoolsindia.com</div></div>
  <div style="padding:30px 44px"><div style="font-weight:800;font-size:${(C.ta || C.name).length > 24 ? 32 : 44}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(C.ta || C.name)}</div>
  <div id="dz" style="margin-top:22px;height:230px;border:4px dashed #94A3B8;border-radius:24px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:36px;color:#64748B;position:relative;overflow:hidden"><span id="dzt">📂 இங்கே file-ஐப் போடுங்கள்</span>
    <div id="chip" style="position:absolute;left:50%;top:50%;margin:-48px 0 0 -250px;width:500px;height:96px;background:#fff;border:3px solid #3B82F6;border-radius:18px;display:flex;align-items:center;gap:16px;padding:0 24px;font:700 32px Inter,sans-serif;opacity:0">📄 ${esc(C.fileName)}</div></div>
  <div id="btn" style="margin:26px auto 0;width:520px;height:96px;border-radius:20px;background:#2563EB;color:#fff;font-weight:800;font-size:40px;text-align:center;line-height:96px;position:relative;overflow:hidden"><span id="btnt">${esc(C.btn)}</span><div id="bar" style="position:absolute;left:0;bottom:0;height:10px;width:0;background:${GOLD}"></div></div></div></div>`, { left: '90px', top: '700px' });
const done = mk(`<div style="background:#16A34A;color:#fff;border-radius:999px;padding:20px 44px;font-weight:800;font-size:44px;box-shadow:0 12px 30px rgba(0,0,0,.4);white-space:nowrap">✓ ${esc(C.doneText)}</div>`, { left: '0', top: '1285px', width: '1080px', display: 'flex', justifyContent: 'center' });
// steps
const steps = C.steps.map((s, i) => mk(`<div style="display:flex;align-items:center;gap:26px;background:rgba(0,0,0,.28);border:3px solid rgba(255,213,74,.7);border-radius:26px;padding:22px 30px"><div style="min-width:76px;height:76px;border-radius:50%;background:${GOLD};color:${INK};font:900 44px/76px Inter,sans-serif;text-align:center">${i + 1}</div><div style="font-weight:700;font-size:44px;line-height:1.25">${esc(s)}</div></div>`, { left: '90px', top: '1370px', width: '900px' }));
const badges = C.badges.map((b) => mk(`<div style="border:2px solid ${GOLD};color:${GOLD};border-radius:999px;padding:14px 30px;font-weight:700;font-size:38px;white-space:nowrap">✓ ${esc(b)}</div>`, { left: '0', top: '1390px' }));
const cta = mk(`<div style="text-align:center"><div style="font-weight:700;font-size:44px;opacity:.85">தினமும் ஒரு புதிய tool</div><div style="margin-top:26px;display:inline-block;background:linear-gradient(135deg,${GOLD},#C98F1E);color:${INK};font:900 72px/1 Inter,sans-serif;border-radius:24px;padding:30px 54px">pdftoolsindia.com</div><div style="margin-top:26px;font-weight:700;font-size:40px;opacity:.85">👉 Save செய்யுங்கள் · Share செய்யுங்கள்</div></div>`, { left: '0', top: '1260px', width: '1080px' });
const sub = mk('', { left: '60px', top: '1740px', width: '960px', textAlign: 'center', fontWeight: 700, fontSize: '48px', lineHeight: 1.3, textShadow: '0 2px 10px rgba(0,0,0,.8)' });
window.DUR = C.nom * K;

window.render = (tReal) => {
  const t = tReal / K;
  rings.forEach((r, i) => tf(r, 0, 0, 1 + Math.sin(t * .6 + i) * .03, 1));
  tf(brand, 0, (1 - eo3(seg(t, 0, .6))) * -40, 1, seg(t, 0, .6));
  const pop = 1 + .12 * Math.max(0, 1 - t / .35) + (t < 2.6 ? Math.sin(t * 6) * .012 : 0);
  tf(kicker, 0, 0, 1, (1 - seg(t, 13.8, 14.2)));
  tf(hook, 0, 0, pop, (1 - seg(t, 13.8, 14.2)));
  tf(timer, 0, 0, 1 + .05 * Math.abs(Math.sin(t * 5)), seg(t, .6, 1.0) * (1 - seg(t, 13.8, 14.2)));
  prog.style.transform = `scaleX(${clamp(t / 16.8)})`;
  const wIn = eo3(seg(t, 1.2, 1.9)), wOut = seg(t, 13.8, 14.2);
  tf(win, 0, (1 - wIn) * 120 - wOut * 60, 1 - wOut * .05, wIn * (1 - wOut));
  // demo inside the window: file arrives (4.0-5.0), button pressed (6.6), progress (6.6-8.4), done (8.6)
  const ch = $('chip'), a = eo3(seg(t, 4.0, 4.8));
  ch.style.opacity = a; ch.style.transform = `translateY(${(1 - a) * -90}px)`; $('dzt').style.opacity = 1 - a;
  const press = t > 6.5 && t < 6.75;
  $('btn').style.transform = press ? 'scale(.96)' : 'scale(1)';
  $('bar').style.width = seg(t, 6.7, 8.4) * 100 + '%';
  $('btnt').textContent = t > 8.5 ? C.btnDone : t > 6.7 ? C.btnBusy : C.btn;
  tf(done, 0, (1 - eo3(seg(t, 8.6, 9.1))) * 30, 1, seg(t, 8.6, 9.1) * (1 - wOut));
  // steps appear one by one (on the lower half) and stay until the badges
  steps.forEach((s, i) => { const a0 = 3.2 + i * 2.2, p = eo3(seg(t, a0, a0 + .5)); tf(s, 0, i * 106 + (1 - p) * 30, 1, p * (1 - seg(t, 10.2, 10.6))); });
  badges.forEach((b, i) => { const a0 = 10.8 + i * .45, p = eo3(seg(t, a0, a0 + .4)); tf(b, 200 + (i === 1 ? 60 : 0) + (i === 2 ? 20 : 0), i * 100 + (1 - p) * 30, 1, p * (1 - seg(t, 13.8, 14.2))); });
  const c = eo3(seg(t, 14.3, 14.9)); tf(cta, 0, (1 - c) * 40, 1, c);
  const cur = C.subs.find((s) => t >= s[0] && t < s[1]);
  sub.innerHTML = cur ? cur[2] : ''; sub.style.opacity = cur ? Math.min(1, (t - cur[0]) / .25) : 0;
};
function $(id) { return document.getElementById(id); }
