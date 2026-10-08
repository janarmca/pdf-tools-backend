/* Kalvi Kalanjiyam — ஆய்வகம் (our own Experiments Lab) + இலவச புத்தகங்கள் (Books)
   Every experiment here is written from scratch by us (own code, own Tamil text, own physics).
   Nothing is embedded or copied from PhET/BYJU'S/NCERT. Flow for each: 🤔 predict → 🔬 do & record → 💡 understand → ✅ check. */
(function(){
'use strict';
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang = () => document.documentElement.lang==='en' ? 'en' : 'ta';
const T = (ta,en) => lang()==='en' ? en : ta;
const P2 = a => a ? (lang()==='en' ? a[1] : a[0]) : '';
const $ = (s,r)=> (r||document).querySelector(s);
function el(tag, cls, html){ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }
function go(h){ location.hash = h; }

/* ---------- pure physics / maths (unit-tested) ---------- */
const G = 9.8;
const PHYS = {
  hooke:(massG,k)=>{ const F=massG/1000*G; return {F, x:F/k*100}; },                      // x in cm, k in N/m
  projectile:(deg,v)=>{ const a=deg*Math.PI/180; return {range:v*v*Math.sin(2*a)/G, height:Math.pow(v*Math.sin(a),2)/(2*G), time:2*v*Math.sin(a)/G}; },
  lever:(wL,dL,wR,dR)=>({tl:wL*dL, tr:wR*dR, balanced:wL*dL===wR*dR}),
  density:(ro,rl)=>({floats:ro<rl, frac:Math.min(1,ro/rl)}),
  ohm:(V,R)=>({I:V/R, P:V*V/R}),
  circuit:(mode,n,V,R)=>{ const Rt = mode==='series' ? n*R : R/n; const I=V/Rt; const Ib = mode==='series' ? I : V/R; return {Rt, I, Ib, bright:Math.pow(Ib/(V/R),2)}; },
  fracEq:(a,b,c,d)=> a*d===c*b,
  line:(m,c)=>({xi: m===0?null:-c/m}),
  quad:(a,b,c)=>{ const D=b*b-4*a*c; const vx=a===0?null:-b/(2*a); return {D, vx, vy: a===0?null:a*vx*vx+b*vx+c, roots: a===0||D<0?[]:(D===0?[-b/(2*a)]:[(-b-Math.sqrt(D))/(2*a),(-b+Math.sqrt(D))/(2*a)].sort((p,q)=>p-q))}; },
  pendulum:(L)=>2*Math.PI*Math.sqrt(L/G),
  refract:(deg,n)=> Math.asin(Math.sin(deg*Math.PI/180)/n)*180/Math.PI,
  wave:(f,lam)=>({v:f*lam, T:1/f}),
  boyle:(V)=>2000/V
};

/* ---------- small UI helpers ---------- */
function inject(){
  if(document.getElementById('labcss')) return;
  const st = el('style'); st.id='labcss';
  st.textContent = `
.labgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin:12px 0}
.simc{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px;cursor:pointer;border-top:5px solid var(--c,#3b2fc9);transition:transform .15s;position:relative}
.simc:hover{transform:translateY(-2px)}.simc .ic{font-size:1.8rem}.simc b{display:block;margin:4px 0}.simc .m{font-size:.78rem;color:var(--sub)}
.simc .dn{position:absolute;right:10px;top:8px;font-size:1.1rem}
.fchips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.fchips button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:6px 13px;cursor:pointer;font:inherit;font-size:.84rem}
.fchips button.on{background:var(--brand);color:#fff;border-color:var(--brand)}
.lstep{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px 16px;margin:12px 0}
.lstep>h3{margin:0 0 8px;font-size:1.05rem}
.lstep.lock{opacity:.55;pointer-events:none}
.lopt{display:block;width:100%;text-align:left;border:2px solid var(--line);background:#fff;border-radius:12px;padding:10px 12px;margin:6px 0;cursor:pointer;font:inherit}
.lopt:hover{border-color:var(--brand)}.lopt.pick{border-color:var(--brand);background:var(--brand2)}.lopt.ok{border-color:#2e9e4f;background:#e8f7ec}.lopt.bad{border-color:#d64545;background:#fdeaea}
.labbox{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:14px}
@media(max-width:760px){.labbox{grid-template-columns:1fr}}
.labcv{width:100%;height:auto;background:linear-gradient(#f4f8ff,#fff);border:1px solid var(--line);border-radius:12px;display:block}
.lslider{margin:8px 0}.lslider label{display:flex;justify-content:space-between;font-size:.88rem;font-weight:600}.lslider input{width:100%}
.lread{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0}.lread div{background:#f1f4ff;border-radius:10px;padding:6px 10px;font-size:.78rem;color:var(--sub)}.lread b{display:block;font-size:1.05rem;color:#222}
.ltab{width:100%;border-collapse:collapse;font-size:.82rem;margin-top:8px}.ltab th,.ltab td{border:1px solid var(--line);padding:4px 6px;text-align:center}.ltab th{background:#f1f4ff}
.lkey{background:#eaf7ee;border:1px solid #9fd5ac;border-radius:12px;padding:12px;margin:8px 0}
.lgoal{background:#fff8e6;border:1px solid #f0d58a;border-radius:12px;padding:10px 12px;margin:8px 0}
.lwhy{background:#eef9f1;border:1px solid #a9dbb7;border-radius:12px;padding:10px 14px;margin:8px 0}.lwhy summary{cursor:pointer;font-weight:700}.lwhy p{margin:6px 0}
.lstepper{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 2px}.lstepper span{font-size:.75rem;padding:3px 10px;border-radius:999px;background:#eceffa;color:var(--sub)}.lstepper span.on{background:var(--brand);color:#fff}
.bookc{display:flex;gap:12px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin-bottom:10px;text-decoration:none;color:inherit}
.bookc .i{font-size:1.6rem}.bookc b{display:block}.bookc span{font-size:.82rem;color:var(--sub)}`;
  document.head.appendChild(st);
}
function mkSlider(host, lab, min, max, step, val, unit, cb){
  const d = el('div','lslider'); d.innerHTML = '<label><span>'+esc(P2(lab))+'</span><b></b></label><input type="range">';
  const inp = d.querySelector('input'), b = d.querySelector('b');
  inp.min=min; inp.max=max; inp.step=step; inp.value=val;
  const dec = step>=1 ? 0 : (step>=0.1 ? 1 : 2);
  const fmt = ()=>{ b.textContent = (+inp.value).toFixed(dec) + (unit?' '+unit:''); };
  inp.oninput = ()=>{ fmt(); cb(+inp.value); }; fmt(); host.appendChild(d);
  return { get:()=>+inp.value, set:v=>{ inp.value=v; fmt(); }, lim:m=>{ inp.max=m; if(+inp.value>m){ inp.value=m; } fmt(); } };
}
function mkChips(host, lab, opts, val, cb){
  const d = el('div'); if(lab) d.appendChild(el('div','note',esc(P2(lab))));
  const row = el('div','fchips'); d.appendChild(row); let cur = val;
  opts.forEach(o=>{ const b = el('button', o[0]===cur?'on':'', esc(lang()==='en'?o[2]:o[1])); b.onclick = ()=>{ cur=o[0]; row.querySelectorAll('button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); cb(cur); }; row.appendChild(b); });
  host.appendChild(d); return { get:()=>cur };
}
function mkBtn(host, label, fn, cls){ const b = el('button','btn '+(cls||''), esc(P2(label))); b.onclick = fn; host.appendChild(b); return b; }
const ln = (g,x1,y1,x2,y2,c,w)=>{ g.strokeStyle=c||'#333'; g.lineWidth=w||2; g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.stroke(); };
const tx = (g,s,x,y,c,sz,al)=>{ g.fillStyle=c||'#333'; g.font=(sz||14)+'px system-ui,"Noto Sans Tamil",sans-serif'; g.textAlign=al||'left'; g.fillText(s,x,y); };
const circ = (g,x,y,r,f,s)=>{ g.beginPath(); g.arc(x,y,r,0,Math.PI*2); if(f){ g.fillStyle=f; g.fill(); } if(s){ g.strokeStyle=s; g.lineWidth=2; g.stroke(); } };
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function hex2rgb(h){ return [1,3,5].map(i=>parseInt(h.substr(i,2),16)); }
const PH_STOPS = [[0,'#e5252a'],[2,'#f26522'],[4,'#f7a21b'],[5.5,'#f5e51b'],[7,'#6fbf44'],[8.5,'#1a9e6a'],[10,'#1f6fb8'],[12,'#4a3a9a'],[14,'#6a2a8a']];
function phColor(p){ for(let i=1;i<PH_STOPS.length;i++){ if(p<=PH_STOPS[i][0]){ const a=PH_STOPS[i-1], b=PH_STOPS[i], t=(p-a[0])/(b[0]-a[0]), A=hex2rgb(a[1]), B=hex2rgb(b[1]); return 'rgb('+A.map((v,j)=>Math.round(v+(B[j]-v)*t)).join(',')+')'; } } return PH_STOPS[PH_STOPS.length-1][1]; }

/* =====================================================================
   EXPERIMENTS — each: meta + predict + build(ctx) + key + quiz
   ctx: ctrl(host), mkCanvas(), read([[label,val]...]), loop(fn(dt)), onLiveDraw
   build returns {cols:[[ta,en]..], rec:()=>[...]}
   ===================================================================== */
const EXPS = [];

/* 1 — Hooke's law (spring) */
EXPS.push({ id:'spring', icon:'🧷', c:[7,10], s:'physics', t:['சுருள்வில் & எடை','Spring & weight'], mins:5,
  goal:['எடை கூடினால் சுருள்வில் எவ்வளவு நீளும்? ஒரு விதியைக் கண்டுபிடி.','How far does a spring stretch as weight grows? Find the rule.'],
  predict:{ q:['ஒரு எடையைத் தொங்கவிட்டால் சுருள்வில் 5 செ.மீ நீளுகிறது. எடையை இரட்டிப்பாக்கினால் எவ்வளவு நீளும்?','A weight stretches a spring 5 cm. If you double the weight, how far will it stretch?'],
    o:[['2.5 செ.மீ','2.5 cm'],['5 செ.மீ (மாறாது)','5 cm (no change)'],['10 செ.மீ','10 cm'],['25 செ.மீ','25 cm']], a:2,
    why:['எடை 2 மடங்கு → நீட்சியும் 2 மடங்கு. இதுவே ஹூக் விதி.','Weight ×2 → stretch ×2. This is Hooke\'s law.'] },
  build(ctx){
    const c = ctx.ctrl, S = {k:20};
    const k = mkChips(c,['சுருள்வில் வகை','Spring type'],[[10,'மென்மை','Soft'],[20,'நடுத்தரம்','Medium'],[40,'உறுதி','Stiff']],20,v=>{S.k=v;draw();});
    const m = mkSlider(c,['தொங்கும் எடை','Hanging mass'],50,500,50,100,'g',()=>draw());
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d');
    function draw(){
      const r = PHYS.hooke(m.get(), S.k.valueOf()), x = r.x, top = 30, nat = 70, y1 = top+nat+x*3;
      g.clearRect(0,0,640,330); ln(g,150,top,250,top,'#555',6);
      g.strokeStyle='#4a5bd0'; g.lineWidth=3; g.beginPath(); g.moveTo(200,top); const n=14;
      for(let i=1;i<=n;i++){ g.lineTo(200+(i%2?18:-18), top+(y1-top)*i/(n+1)); } g.lineTo(200,y1); g.stroke();
      const bh = 24+m.get()/12; g.fillStyle='#e8a33d'; g.fillRect(170,y1,60,bh); tx(g,m.get()+' g',200,y1+bh/2+5,'#222',14,'center');
      // ruler (cm from natural end)
      const y0 = top+nat; ln(g,470,y0,470,y0+49*3+10,'#999',2);
      for(let cm=0;cm<=50;cm+=5){ const yy=y0+cm*3; ln(g,470,yy,482,yy,'#999',2); tx(g,cm+' cm',488,yy+4,'#666',11); }
      ln(g,230,y1,470,y1,'#d64545',1.5); circ(g,470,y1,4,'#d64545');
      ln(g,300,y0,470,y0,'#aaa',1); tx(g,T('இயல்பு நீளம்','natural length'),300,y0-5,'#888',11);
      ctx.read([[T('விசை F = mg','Force F = mg'), r.F.toFixed(2)+' N'],[T('நீட்சி x','Stretch x'), x.toFixed(1)+' cm'],[T('F ÷ x','F ÷ x'), (r.F/(x/100)).toFixed(1)+' N/m'],[T('சுருள்வில் k','Spring k'), S.k+' N/m']]);
    }
    draw();
    return { cols:[['வகை','Spring'],['எடை (g)','Mass (g)'],['F (N)','F (N)'],['நீட்சி (cm)','Stretch (cm)']],
      rec:()=>{ const r=PHYS.hooke(m.get(),S.k); return [S.k+' N/m', m.get(), r.F.toFixed(2), r.x.toFixed(1)]; } };
  },
  key:['**நீட்சி எடைக்கு நேர்விகிதம்.** எடை இரட்டிப்பு → நீட்சி இரட்டிப்பு. F ÷ x எப்போதும் ஒரே எண் — அதுவே சுருள்வில்லின் உறுதி (k). **F = k × x** (ஹூக் விதி).','**Stretch is proportional to weight.** Double the weight → double the stretch. F ÷ x stays the same number — that is the spring\'s stiffness k. **F = k × x** (Hooke\'s law).'],
  quiz:[{q:['உறுதியான சுருள்வில் (k அதிகம்) அதே எடைக்கு…','For the same weight, a stiffer spring (bigger k) stretches…'],o:[['அதிகம் நீளும்','more'],['குறைவாக நீளும்','less'],['சமமாக நீளும்','the same']],a:1,w:['x = F ÷ k. k பெரியது → x சிறியது.','x = F ÷ k. Bigger k → smaller x.']},
        {q:['k = 20 N/m, F = 4 N எனில் நீட்சி?','k = 20 N/m, F = 4 N. The stretch is…'],o:[['0.2 m (20 cm)','0.2 m (20 cm)'],['5 m','5 m'],['80 m','80 m']],a:0,w:['x = 4 ÷ 20 = 0.2 m.','x = 4 ÷ 20 = 0.2 m.']}]
});

/* 2 — Projectile */
EXPS.push({ id:'projectile', icon:'🏹', c:[9,11], s:'physics', t:['எறிபொருள் — எந்தக் கோணம்?','Projectile — which angle?'], mins:6,
  goal:['பந்தை எந்தக் கோணத்தில் எறிந்தால் அதிக தூரம் போகும்?','At which angle does a ball travel farthest?'],
  predict:{ q:['அதே வேகத்தில் எந்தக் கோணத்தில் எறிந்தால் அதிக தூரம் போகும்?','With the same speed, which launch angle goes farthest?'],
    o:[['15°','15°'],['30°','30°'],['45°','45°'],['75°','75°']], a:2, why:['காற்று தடை இல்லாவிட்டால் 45° தான் அதிக தூரம். 30° & 60° சம தூரம்!','Ignoring air, 45° gives the maximum range. 30° and 60° give equal range!'] },
  build(ctx){
    const c = ctx.ctrl; let shots = [];
    const a = mkSlider(c,['கோணம்','Angle'],10,80,5,45,'°',()=>{ prev(); });
    const v = mkSlider(c,['வேகம்','Speed'],5,30,1,20,'m/s',()=>{ prev(); });
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d'), X0 = 30, Y0 = 300, SC = 5.5;
    mkBtn(c,['🚀 சுடு','🚀 Fire'],()=>{ const r=PHYS.projectile(a.get(),v.get()); shots.push({a:a.get(),v:v.get(),t:0,T:r.time,r}); if(shots.length>6) shots.shift(); },'p');
    mkBtn(c,['🧹 பாதைகளை அழி','🧹 Clear paths'],()=>{ shots=[]; });
    function pt(s,t){ const A=s.a*Math.PI/180; return [X0+s.v*Math.cos(A)*t*SC, Y0-(s.v*Math.sin(A)*t-0.5*G*t*t)*SC]; }
    function prev(){ const r=PHYS.projectile(a.get(),v.get()); ctx.read([[T('தூரம்','Range'),r.range.toFixed(1)+' m'],[T('அதிகபட்ச உயரம்','Max height'),r.height.toFixed(1)+' m'],[T('பறக்கும் நேரம்','Flight time'),r.time.toFixed(2)+' s'],[T('கோணம் / வேகம்','Angle / speed'),a.get()+'° / '+v.get()+' m/s']]); }
    prev();
    ctx.loop(dt=>{
      g.clearRect(0,0,640,330); g.fillStyle='#bfe3a4'; g.fillRect(0,Y0,640,30); ln(g,0,Y0,640,Y0,'#6a9c4e',3);
      for(let m=0;m<=100;m+=10){ const x=X0+m*SC; if(x<640){ ln(g,x,Y0,x,Y0+6,'#555',1.5); tx(g,m+'m',x,Y0+20,'#555',10,'center'); } }
      // preview (dotted) of current settings
      const cur={a:a.get(),v:v.get()}, rr=PHYS.projectile(cur.a,cur.v); g.setLineDash([4,5]); g.strokeStyle='#999'; g.lineWidth=1.5; g.beginPath();
      for(let t=0;t<=rr.time;t+=rr.time/40){ const p=pt(cur,t); t?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]); } g.stroke(); g.setLineDash([]);
      shots.forEach((s,i)=>{ s.t=Math.min(s.T,s.t+dt*1.4); g.strokeStyle=['#e24b4b','#e8a33d','#4a5bd0','#2e9e4f','#a24bd6','#14a0a8'][i%6]; g.lineWidth=2.5; g.beginPath();
        for(let t=0;t<=s.t+1e-9;t+=s.T/60){ const p=pt(s,t); t?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]); } g.stroke();
        const p=pt(s,s.t); circ(g,p[0],p[1],6,g.strokeStyle); if(s.t>=s.T) tx(g,s.r.range.toFixed(0)+'m ('+s.a+'°)',pt(s,s.T)[0],Y0-8,'#222',11,'center'); });
      circ(g,X0,Y0,5,'#333');
    });
    return { cols:[['கோணம் (°)','Angle (°)'],['வேகம்','Speed'],['தூரம் (m)','Range (m)']],
      rec:()=>[a.get(),v.get(),PHYS.projectile(a.get(),v.get()).range.toFixed(1)] };
  },
  key:['**45° கோணம் அதிக தூரம்.** 45°-க்கு மேலும் கீழும் சமமான கோணங்கள் (30° & 60°) ஒரே தூரம் தரும். வேகம் இரட்டிப்பானால் தூரம் 4 மடங்கு (தூரம் = v² sin2θ ÷ g).','**45° gives the longest range.** Angles equally above and below 45° (30° & 60°) give the same range. Doubling speed makes range 4×  (range = v² sin2θ ÷ g).'],
  quiz:[{q:['30° மற்றும் 60° — எது அதிக தூரம்?','30° or 60° — which goes farther?'],o:[['30°','30°'],['60°','60°'],['இரண்டும் சமம்','Both equal']],a:2,w:['sin60° = sin120°… 30°/60° இணை கோணங்கள் → சம தூரம்.','Complementary angles give equal range.']},
        {q:['வேகத்தை 10 → 20 m/s ஆக்கினால் தூரம்?','Speed 10 → 20 m/s. The range becomes…'],o:[['2 மடங்கு','2×'],['4 மடங்கு','4×'],['மாறாது','unchanged']],a:1,w:['தூரம் v²-க்கு விகிதம்; 2² = 4.','Range ∝ v²; 2² = 4.']}]
});

/* 3 — Lever */
EXPS.push({ id:'lever', icon:'⚖️', c:[6,8], s:'physics', t:['தராசு — சமநிலை','Seesaw — balance'], mins:5,
  goal:['இரு பக்கமும் சமநிலை வர எடையும் தூரமும் எப்படி இருக்க வேண்டும்?','What weights and distances make a seesaw balance?'],
  predict:{ q:['இடப்பக்கம் 4 kg எடை, மையத்திலிருந்து 3 அலகு தூரம். வலப்பக்கம் 6 kg எடையை எங்கே வைத்தால் சமநிலை?','Left: 4 kg at 3 units. Where must a 6 kg weight go on the right to balance?'],
    o:[['1 அலகு','1 unit'],['2 அலகு','2 units'],['3 அலகு','3 units'],['4 அலகு','4 units']], a:1, why:['4×3 = 12 = 6×2. எடை × தூரம் சமம் ஆக வேண்டும்.','4×3 = 12 = 6×2. Weight × distance must be equal.'] },
  build(ctx){
    const c = ctx.ctrl;
    const wL = mkSlider(c,['இடது எடை','Left weight'],1,10,1,4,'kg',()=>draw());
    const dL = mkSlider(c,['இடது தூரம்','Left distance'],1,5,1,3,T('அலகு','units'),()=>draw());
    const wR = mkSlider(c,['வலது எடை','Right weight'],1,10,1,6,'kg',()=>draw());
    const dR = mkSlider(c,['வலது தூரம்','Right distance'],1,5,1,4,T('அலகு','units'),()=>draw());
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d'); let ang = 0, target = 0;
    function calc(){ const r=PHYS.lever(wL.get(),dL.get(),wR.get(),dR.get()); target = r.balanced ? 0 : clamp((r.tr-r.tl)/30,-1,1)*0.3; return r; }
    function draw(){ const r=calc(); ctx.read([[T('இடது திருப்புத்திறன்','Left turning effect'), wL.get()+' × '+dL.get()+' = '+r.tl],[T('வலது திருப்புத்திறன்','Right turning effect'), wR.get()+' × '+dR.get()+' = '+r.tr],[T('நிலை','State'), r.balanced?T('✅ சமநிலை','✅ Balanced'):(r.tr>r.tl?T('வலம் இறங்கும் ⬇','Right goes down ⬇'):T('இடம் இறங்கும் ⬇','Left goes down ⬇'))],[T('வேறுபாடு','Difference'), Math.abs(r.tr-r.tl)]]); }
    draw();
    ctx.loop(dt=>{
      ang += (target-ang)*Math.min(1,dt*5); g.clearRect(0,0,640,330); const px=320, py=190, U=58;
      g.fillStyle='#8a6d3b'; g.beginPath(); g.moveTo(px,py); g.lineTo(px-26,py+90); g.lineTo(px+26,py+90); g.closePath(); g.fill();
      const cs=Math.cos(ang), sn=Math.sin(ang);
      g.save(); g.translate(px,py); g.rotate(ang); g.fillStyle='#c79a52'; g.fillRect(-300,-7,600,14);
      for(let u=-5;u<=5;u++){ if(u) { ln(g,u*U,-7,u*U,-14,'#6b4a1e',2); tx(g,String(Math.abs(u)),u*U,-18,'#6b4a1e',11,'center'); } } g.restore();
      [[-1,wL.get(),dL.get(),'#e24b4b'],[1,wR.get(),dR.get(),'#4a5bd0']].forEach(([s,w,d,col])=>{ const x=px+s*d*U*cs, y=py+s*d*U*sn, h=26+w*3; ln(g,x,y,x,y+22,'#555',2); g.fillStyle=col; g.fillRect(x-14-w,y+22,28+2*w,h); tx(g,w+' kg',x,y+22+h/2+5,'#fff',13,'center'); });
      circ(g,px,py,6,'#333');
    });
    return { cols:[['இடது','Left'],['வலது','Right'],['நிலை','Result']],
      rec:()=>{ const r=PHYS.lever(wL.get(),dL.get(),wR.get(),dR.get()); return [wL.get()+'kg×'+dL.get()+'='+r.tl, wR.get()+'kg×'+dR.get()+'='+r.tr, r.balanced?'✅':'✖']; } };
  },
  key:['**சமநிலை = எடை × தூரம் (இடது) = எடை × தூரம் (வலது).** இதையே "திருப்புத்திறன்" (moment) என்கிறோம். கனமான குழந்தை மையத்துக்கு அருகில் உட்கார்ந்தால் இலகுவான குழந்தையுடன் சமநிலை வரும்!','**Balance happens when weight × distance is equal on both sides.** This is called the moment. A heavier child sitting nearer the middle can balance a lighter child sitting farther away!'],
  quiz:[{q:['2 kg எடை 6 அலகு தூரத்தில்; சமநிலைக்கு 3 kg எடை எங்கே?','2 kg at 6 units. Where must 3 kg go to balance?'],o:[['2 அலகு','2 units'],['4 அலகு','4 units'],['6 அலகு','6 units']],a:1,w:['2×6 = 12 = 3×4.','2×6 = 12 = 3×4.']},
        {q:['ஒரு பக்கம் எடையை மையத்தை நோக்கி நகர்த்தினால் அந்தப் பக்கம்…','Moving a weight toward the pivot makes that side…'],o:[['கனமாகும்','heavier'],['இலகுவாகும் (திருப்பு குறையும்)','lighter (less turning)'],['மாற்றமில்லை','no change']],a:1,w:['தூரம் குறைந்தால் எடை × தூரம் குறையும்.','Smaller distance → smaller weight × distance.']}]
});

/* 4 — Density & floating */
const ITEMS = [[0.25,'🪵','கார்க்','Cork','#d9b382'],[0.6,'🌳','மரம்','Wood','#a8743b'],[0.92,'🧊','பனிக்கட்டி','Ice','#bfe8f7'],[1.1,'🧱','பிளாஸ்டிக்','Plastic','#e07b9a'],[2.7,'🥫','அலுமினியம்','Aluminium','#b5bcc5'],[7.8,'⚙️','இரும்பு','Iron','#6b6f78']];
const LIQS = [[0.9,'எண்ணெய்','Oil','#f2d36b'],[1.0,'நீர்','Water','#8fd0f5'],[1.2,'உப்புநீர்','Salt water','#6fb3e6'],[13.6,'பாதரசம்','Mercury','#b9bfc9']];
EXPS.push({ id:'density', icon:'🧊', c:[7,9], s:'physics', t:['மிதக்குமா? மூழ்குமா?','Float or sink?'], mins:5,
  goal:['ஒரு பொருள் மிதப்பதா மூழ்குவதா என்பதை எது தீர்மானிக்கிறது?','What decides whether an object floats or sinks?'],
  predict:{ q:['பனிக்கட்டியை நீரில் போட்டால்?','What happens to ice dropped in water?'],
    o:[['மூழ்கும்','Sinks'],['மிதக்கும்; பெரும்பகுதி நீருக்குள்','Floats, mostly under water'],['மிதக்கும்; பெரும்பகுதி வெளியே','Floats, mostly above water']], a:1, why:['பனிக்கட்டியின் அடர்த்தி 0.92 < நீர் 1.0 → மிதக்கும்; 92% மூழ்கும்.','Ice density 0.92 < water 1.0 → floats with 92% under water.'] },
  build(ctx){
    const c = ctx.ctrl, S = {i:2,l:1};
    mkChips(c,['பொருள்','Object'],ITEMS.map((x,i)=>[i,x[1]+' '+x[2],x[1]+' '+x[3]]),2,v=>{S.i=v;drop();});
    mkChips(c,['திரவம்','Liquid'],LIQS.map((x,i)=>[i,x[1],x[2]]),1,v=>{S.l=v;drop();});
    mkBtn(c,['⬇ மீண்டும் போடு','⬇ Drop again'],()=>drop(),'p');
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d'); let y = 20, ty = 20;
    function drop(){ const it=ITEMS[S.i], lq=LIQS[S.l], r=PHYS.density(it[0],lq[0]); y=10; ty = r.floats ? 150-60*(1-r.frac) : 290-60;
      ctx.read([[T('பொருள் அடர்த்தி','Object density'),it[0]+' g/cm³'],[T('திரவ அடர்த்தி','Liquid density'),lq[0]+' g/cm³'],[T('முடிவு','Result'),r.floats?T('மிதக்கும் ✅','Floats ✅'):T('மூழ்கும் ⬇','Sinks ⬇')],[T('நீருக்குள்','Under liquid'),r.floats?Math.round(r.frac*100)+'%':'100%']]); }
    drop();
    ctx.loop(dt=>{
      y += (ty-y)*Math.min(1,dt*4); g.clearRect(0,0,640,330); const lq=LIQS[S.l], it=ITEMS[S.i];
      g.fillStyle=lq[3]; g.globalAlpha=.75; g.fillRect(222,150,196,140); g.globalAlpha=1;
      g.strokeStyle='#555'; g.lineWidth=4; g.beginPath(); g.moveTo(220,80); g.lineTo(220,292); g.lineTo(420,292); g.lineTo(420,80); g.stroke();
      ln(g,222,150,418,150,'#2b7bb9',2);
      g.fillStyle=it[4]; g.fillRect(290,y,60,60); g.strokeStyle='#333'; g.lineWidth=2; g.strokeRect(290,y,60,60); tx(g,it[1],320,y+40,'#000',28,'center');
      tx(g,T(lq[1],lq[2])+'  '+lq[0]+' g/cm³',320,318,'#333',13,'center');
    });
    return { cols:[['பொருள்','Object'],['திரவம்','Liquid'],['முடிவு','Result']],
      rec:()=>{ const r=PHYS.density(ITEMS[S.i][0],LIQS[S.l][0]); return [T(ITEMS[S.i][2],ITEMS[S.i][3])+' ('+ITEMS[S.i][0]+')', T(LIQS[S.l][1],LIQS[S.l][2])+' ('+LIQS[S.l][0]+')', r.floats?T('மிதக்கும்','floats'):T('மூழ்கும்','sinks')]; } };
  },
  key:['**பொருளின் அடர்த்தி < திரவத்தின் அடர்த்தி → மிதக்கும்.** மிதக்கும் பகுதி = பொருள் அடர்த்தி ÷ திரவ அடர்த்தி. இரும்பு நீரில் மூழ்கும்; ஆனால் பாதரசத்தில் மிதக்கும் — ஏனெனில் பாதரசம் இன்னும் அடர்த்தி!','**Object density < liquid density → floats.** Submerged fraction = object density ÷ liquid density. Iron sinks in water but floats on mercury, because mercury is even denser!'],
  quiz:[{q:['0.6 அடர்த்தி மரம் நீரில் எவ்வளவு மூழ்கும்?','A wood of density 0.6 in water — how much goes under?'],o:[['40%','40%'],['60%','60%'],['100%','100%']],a:1,w:['0.6 ÷ 1.0 = 60%.','0.6 ÷ 1.0 = 60%.']},
        {q:['உப்புநீரில் மிதப்பது ஏன் எளிது?','Why is it easier to float in salt water?'],o:[['உப்புநீர் அடர்த்தி அதிகம்','Salt water is denser'],['உப்பு இலகுவானது','Salt is light'],['காரணமில்லை','No reason']],a:0,w:['அடர்த்தி அதிகம் → அதிகம் தாங்கும்.','Denser liquid → more support.']}]
});

/* 5 — Ohm's law */
EXPS.push({ id:'ohm', icon:'💡', c:[9,10], s:'physics', t:['ஓம் விதி — மின்னோட்டம்','Ohm\'s law — current'], mins:6,
  goal:['மின்னழுத்தம் (V), தடை (R), மின்னோட்டம் (I) — இவற்றுக்கு இடையே தொடர்பு என்ன?','How are voltage (V), resistance (R) and current (I) related?'],
  predict:{ q:['தடை மாறாமல் மின்னழுத்தத்தை இரட்டிப்பாக்கினால் மின்னோட்டம்?','Resistance fixed, voltage doubled. What happens to current?'],
    o:[['பாதி','Halves'],['மாறாது','Same'],['இரட்டிப்பு','Doubles'],['4 மடங்கு','4×']], a:2, why:['I = V ÷ R. V இரட்டிப்பு → I இரட்டிப்பு.','I = V ÷ R. V doubles → I doubles.'] },
  build(ctx){
    const c = ctx.ctrl;
    const V = mkSlider(c,['மின்னழுத்தம் V','Voltage V'],1,12,1,6,'V',()=>draw());
    const R = mkSlider(c,['தடை R','Resistance R'],1,20,1,6,'Ω',()=>draw());
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d'); let ph = 0;
    function draw(){ const r=PHYS.ohm(V.get(),R.get()); ctx.read([[T('மின்னோட்டம் I = V ÷ R','Current I = V ÷ R'),r.I.toFixed(2)+' A'],[T('திறன் P = V × I','Power P = V × I'),r.P.toFixed(1)+' W'],[T('V ÷ R','V ÷ R'),V.get()+' ÷ '+R.get()],[T('பல்பு','Bulb'),r.I<0.3?T('மங்கல்','dim'):(r.I<1.5?T('ஒளிரும்','glowing'):T('பிரகாசம்!','bright!'))]]); }
    draw();
    const path = s=>{ const per=2*(440+200); s=((s%per)+per)%per; if(s<440) return [100+s,60]; s-=440; if(s<200) return [540,60+s]; s-=200; if(s<440) return [540-s,260]; s-=440; return [100,260-s]; };
    ctx.loop(dt=>{
      const r=PHYS.ohm(V.get(),R.get()); ph += dt*Math.min(260,r.I*26); g.clearRect(0,0,640,330);
      g.strokeStyle='#333'; g.lineWidth=3; g.strokeRect(100,60,440,200);
      g.fillStyle='#f4f8ff'; g.fillRect(70,125,60,70); ln(g,90,135,90,185,'#222',5); ln(g,110,148,110,172,'#222',3); tx(g,'+',78,130,'#c00',16); tx(g,V.get()+' V',100,215,'#c00',15,'center');
      g.fillStyle='#fff'; g.fillRect(260,44,100,32); g.strokeStyle='#8a4b00'; g.lineWidth=3; g.strokeRect(260,44,100,32); tx(g,R.get()+' Ω',310,66,'#8a4b00',15,'center');
      const br = 1-Math.exp(-r.I/1.2); const gr=g.createRadialGradient(540,160,5,540,160,70); gr.addColorStop(0,'rgba(255,230,80,'+(0.9*br)+')'); gr.addColorStop(1,'rgba(255,230,80,0)'); g.fillStyle=gr; g.fillRect(450,70,180,180);
      circ(g,540,160,24,'rgba(255,240,150,'+(0.25+0.75*br)+')','#555'); ln(g,530,170,550,150,'#555',2);
      circ(g,320,260,22,'#fff','#2e9e4f'); tx(g,'A',320,266,'#2e9e4f',16,'center'); tx(g,r.I.toFixed(2)+' A',320,305,'#2e9e4f',14,'center');
      for(let i=0;i<20;i++){ const p=path(ph+i*64); circ(g,p[0],p[1],3.5,'#3b82f6'); }
    });
    return { cols:[['V','V'],['R (Ω)','R (Ω)'],['I (A)','I (A)']], rec:()=>[V.get(),R.get(),PHYS.ohm(V.get(),R.get()).I.toFixed(2)] };
  },
  key:['**I = V ÷ R** (ஓம் விதி). மின்னழுத்தம் கூடினால் மின்னோட்டம் கூடும்; தடை கூடினால் மின்னோட்டம் குறையும். V ÷ I எப்போதும் R.','**I = V ÷ R** (Ohm\'s law). More voltage → more current; more resistance → less current. V ÷ I is always R.'],
  quiz:[{q:['12 V, 4 Ω — மின்னோட்டம்?','12 V and 4 Ω — the current is…'],o:[['3 A','3 A'],['48 A','48 A'],['8 A','8 A']],a:0,w:['12 ÷ 4 = 3.','12 ÷ 4 = 3.']},
        {q:['தடையை இரட்டிப்பாக்கினால் (V மாறாமல்) மின்னோட்டம்?','Resistance doubled (V same) — current?'],o:[['இரட்டிப்பு','doubles'],['பாதி','halves'],['மாறாது','same']],a:1,w:['I = V ÷ R; R இரட்டிப்பு → I பாதி.','R ×2 → I ÷2.']}]
});

/* 6 — Series vs parallel */
EXPS.push({ id:'circuit', icon:'🔌', c:[8,10], s:'physics', t:['தொடர் vs பக்க இணைப்பு','Series vs parallel'], mins:6,
  goal:['பல்புகளைச் சேர்த்தால் ஒளி குறைகிறதா? இணைப்பு முறை ஏன் முக்கியம்?','Do bulbs dim when added? Why does the wiring matter?'],
  predict:{ q:['ஒரே வரிசையில் (தொடராக) 4 பல்புகளை இணைத்தால் ஒவ்வொரு பல்பும்?','4 bulbs wired in a single line (series) — each bulb will be…'],
    o:[['அதே ஒளி','same brightness'],['மிகவும் மங்கும்','much dimmer'],['அதிகம் ஒளிரும்','brighter']], a:1, why:['தொடரில் மொத்த தடை கூடும் → மின்னோட்டம் குறையும் → ஒளி குறையும்.','In series total resistance rises → current falls → bulbs dim.'] },
  build(ctx){
    const c = ctx.ctrl, S = {mode:'series'};
    const md = mkChips(c,['இணைப்பு','Wiring'],[['series','தொடர்','Series'],['parallel','பக்க (இணை)','Parallel']],'series',v=>{S.mode=v;draw();});
    const n = mkSlider(c,['பல்புகள்','Bulbs'],1,4,1,2,'',()=>draw());
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d');
    function bulb(x,y,b){ const a=0.12+0.88*Math.sqrt(clamp(b,0,1)); const gr=g.createRadialGradient(x,y,3,x,y,50); gr.addColorStop(0,'rgba(255,225,70,'+a+')'); gr.addColorStop(1,'rgba(255,225,70,0)'); g.fillStyle=gr; g.fillRect(x-55,y-55,110,110); circ(g,x,y,18,'rgba(255,240,150,'+(0.2+0.8*a)+')','#555'); }
    function draw(){
      const r=PHYS.circuit(S.mode,n.get(),6,6), N=n.get(); g.clearRect(0,0,640,330); g.strokeStyle='#333'; g.lineWidth=3;
      g.fillStyle='#f4f8ff'; g.fillRect(40,125,60,80); ln(g,60,135,60,195,'#222',5); ln(g,80,148,80,182,'#222',3); tx(g,'6 V',70,225,'#c00',14,'center');
      if(S.mode==='series'){ g.strokeRect(70,60,500,220); for(let i=0;i<N;i++){ bulb(150+i*(400/Math.max(1,N))+ (N===1?200:0)*0, 60, r.bright); } }
      else { ln(g,70,60,200,60,'#333',3); ln(g,70,280,200,280,'#333',3); ln(g,70,60,70,125,'#333',3); ln(g,70,205,70,280,'#333',3); ln(g,200,60,500,60,'#333',3); ln(g,200,280,500,280,'#333',3); ln(g,200,60,200,280,'#333',3); ln(g,500,60,500,280,'#333',3);
        for(let i=0;i<N;i++){ const x=260+i*(240/Math.max(1,N-1||1))*(N>1?1:0)+(N===1?100:0); ln(g,x,60,x,280,'#333',3); bulb(x,170,r.bright); } }
      ctx.read([[T('மொத்த தடை','Total resistance'),r.Rt.toFixed(1)+' Ω'],[T('மின்கலத்தின் மின்னோட்டம்','Battery current'),r.I.toFixed(2)+' A'],[T('ஒரு பல்பின் மின்னோட்டம்','Current in each bulb'),r.Ib.toFixed(2)+' A'],[T('பல்பு ஒளிர்வு','Bulb brightness'),Math.round(r.bright*100)+'%']]);
    }
    draw();
    return { cols:[['இணைப்பு','Wiring'],['பல்புகள்','Bulbs'],['ஒளிர்வு','Brightness']], rec:()=>[S.mode==='series'?T('தொடர்','series'):T('பக்க','parallel'), n.get(), Math.round(PHYS.circuit(S.mode,n.get(),6,6).bright*100)+'%'] };
  },
  key:['**தொடர்:** பல்பு சேர்த்தால் மொத்த தடை கூடும், எல்லா பல்புகளும் மங்கும்; ஒன்று உடைந்தால் அனைத்தும் அணையும். **பக்க இணைப்பு:** ஒவ்வொரு பல்புக்கும் தனி வழி — ஒளி குறையாது. வீட்டு மின்சாரம் பக்க இணைப்பு!','**Series:** adding bulbs raises total resistance so all dim; one break switches all off. **Parallel:** each bulb has its own path — brightness stays the same. Your home wiring is parallel!'],
  quiz:[{q:['வீட்டில் ஒரு பல்பு அணைந்தால் மற்றவை எரிவது ஏன்?','Why do other lights stay on when one bulb fails at home?'],o:[['தொடர் இணைப்பு','Series wiring'],['பக்க இணைப்பு','Parallel wiring'],['அதிர்ஷ்டம்','Luck']],a:1,w:['பக்க இணைப்பில் ஒவ்வொன்றுக்கும் தனி வழி.','Each bulb has its own path in parallel.']},
        {q:['பக்க இணைப்பில் பல்புகள் அதிகமானால் மின்கல மின்னோட்டம்?','In parallel, more bulbs make the battery current…'],o:[['கூடும்','rise'],['குறையும்','fall'],['மாறாது','stay same']],a:0,w:['ஒவ்வொரு கிளையும் மின்னோட்டம் இழுக்கும்; மொத்தத் தடை குறையும்.','Each branch draws current; total resistance falls.']}]
});

/* 7 — Fractions */
EXPS.push({ id:'fraction', icon:'🍕', c:[4,6], s:'maths', t:['பின்னங்கள் — சமமா?','Fractions — equal?'], mins:5,
  goal:['வேறு வேறு தோற்றமுள்ள பின்னங்கள் சமமாக இருக்க முடியுமா?','Can fractions that look different be equal?'],
  predict:{ q:['½ மற்றும் 2/4 — எது பெரியது?','½ and 2/4 — which is bigger?'],
    o:[['½','½'],['2/4','2/4'],['இரண்டும் சமம்','They are equal']], a:2, why:['பகுதிகளை இரட்டிப்பாக்கி, எடுத்ததையும் இரட்டிப்பாக்கினால் அளவு மாறாது.','Doubling both the parts and the pieces taken keeps the amount the same.'] },
  build(ctx){
    const c = ctx.ctrl;
    const bA = mkSlider(c,['முதல் பின்னம் — மொத்த பாகங்கள்','First — total parts'],1,12,1,2,'',()=>{ aA.lim(bA.get()); draw(); });
    const aA = mkSlider(c,['எடுத்த பாகங்கள்','Parts taken'],0,2,1,1,'',()=>draw());
    const bB = mkSlider(c,['இரண்டாம் — மொத்த பாகங்கள்','Second — total parts'],1,12,1,4,'',()=>{ aB.lim(bB.get()); draw(); });
    const aB = mkSlider(c,['எடுத்த பாகங்கள்','Parts taken'],0,4,1,2,'',()=>draw());
    const pre = el('div','fchips'); [[1,2,2,4],[1,3,2,6],[2,3,3,4],[3,4,6,8],[2,5,4,10]].forEach(p=>{ const b=el('button','',p[0]+'/'+p[1]+' & '+p[2]+'/'+p[3]); b.onclick=()=>{ bA.set(p[1]); aA.lim(p[1]); aA.set(p[0]); bB.set(p[3]); aB.lim(p[3]); aB.set(p[2]); draw(); }; pre.appendChild(b); }); c.appendChild(pre);
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d');
    function pie(cx,cy,r,a,b,col){ for(let i=0;i<b;i++){ const s=-Math.PI/2+i*2*Math.PI/b, e=-Math.PI/2+(i+1)*2*Math.PI/b; g.beginPath(); g.moveTo(cx,cy); g.arc(cx,cy,r,s,e); g.closePath(); g.fillStyle=i<a?col:'#fff'; g.fill(); g.strokeStyle='#555'; g.lineWidth=1.5; g.stroke(); } }
    function bar(x,y,w,a,b,col){ for(let i=0;i<b;i++){ g.fillStyle=i<a?col:'#fff'; g.fillRect(x+i*w/b,y,w/b,22); g.strokeStyle='#555'; g.lineWidth=1.2; g.strokeRect(x+i*w/b,y,w/b,22); } }
    function draw(){ const a=aA.get(),b=bA.get(),cc=aB.get(),d=bB.get(), eq=PHYS.fracEq(a,b,cc,d); g.clearRect(0,0,640,330);
      pie(170,115,85,a,b,'#f08a3c'); pie(470,115,85,cc,d,'#4a8fe0'); bar(70,235,200,a,b,'#f08a3c'); bar(370,235,200,cc,d,'#4a8fe0');
      tx(g,a+'/'+b,170,285,'#c05e10',22,'center'); tx(g,cc+'/'+d,470,285,'#2563b0',22,'center'); tx(g,eq?'=':'≠',320,125,eq?'#2e9e4f':'#d64545',48,'center');
      ctx.read([[T('முதல் பின்னம்','First'),(a/b).toFixed(3)],[T('இரண்டாம் பின்னம்','Second'),(cc/d).toFixed(3)],[T('சமமா?','Equal?'),eq?T('ஆம் ✅','Yes ✅'):T('இல்லை','No')],[T('குறுக்குப் பெருக்கல்','Cross-multiply'),(a*d)+' vs '+(cc*b)]]); }
    draw();
    return { cols:[['முதல்','First'],['இரண்டாம்','Second'],['சமமா?','Equal?']], rec:()=>[aA.get()+'/'+bA.get(), aB.get()+'/'+bB.get(), PHYS.fracEq(aA.get(),bA.get(),aB.get(),bB.get())?'✅':'✖'] };
  },
  key:['**சம பின்னங்கள்:** தொகுதி, பகுதி இரண்டையும் ஒரே எண்ணால் பெருக்கினால் மதிப்பு மாறாது (½ = 2/4 = 3/6). **எளிய சோதனை:** a/b = c/d எனில் a×d = c×b.','**Equivalent fractions:** multiply top and bottom by the same number and the value stays (½ = 2/4 = 3/6). **Quick test:** a/b = c/d if a×d = c×b.'],
  quiz:[{q:['3/4 = ?/8','3/4 = ?/8'],o:[['5','5'],['6','6'],['7','7']],a:1,w:['பகுதி ×2 (4→8) எனில் தொகுதியும் ×2: 3→6.','Bottom ×2 (4→8), so top ×2: 3→6.']},
        {q:['2/3 மற்றும் 3/4 — எது பெரியது?','2/3 and 3/4 — which is bigger?'],o:[['2/3','2/3'],['3/4','3/4'],['சமம்','equal']],a:1,w:['2×4=8 < 3×3=9 → 3/4 பெரியது (0.75 > 0.67).','2×4=8 < 3×3=9 → 3/4 is bigger (0.75 > 0.67).']}]
});

/* grid helper for graphs */
const GU = 22, GX = 320, GY = 180;
function grid(g){ g.clearRect(0,0,640,360); g.strokeStyle='#e3e8f5'; g.lineWidth=1;
  for(let x=-14;x<=14;x++){ ln(g,GX+x*GU,0,GX+x*GU,360,x?'#e8ecf8':'#333',x?1:2); if(x && x%2===0) tx(g,String(x),GX+x*GU,GY+13,'#888',10,'center'); }
  for(let y=-8;y<=8;y++){ ln(g,0,GY-y*GU,640,GY-y*GU,y?'#e8ecf8':'#333',y?1:2); if(y && y%2===0) tx(g,String(y),GX-5,GY-y*GU+4,'#888',10,'right'); } }

/* 8 — Straight line */
EXPS.push({ id:'line', icon:'📈', c:[8,10], s:'maths', t:['நேர்கோடு y = mx + c','Straight line y = mx + c'], mins:5,
  goal:['m மற்றும் c எண்கள் கோட்டை எப்படி மாற்றுகின்றன?','How do the numbers m and c change the line?'],
  predict:{ q:['m எதிர்மறை எண்ணாக (−2) இருந்தால் கோடு?','If m is negative (−2), the line…'],
    o:[['மேலே ஏறும்','goes up'],['கீழே இறங்கும்','goes down'],['கிடைமட்டம்','is flat']], a:1, why:['m = சரிவு. எதிர்மறை → வலப்புறம் செல்லச் செல்லக் கீழே.','m is the slope. Negative → falls as you move right.'] },
  build(ctx){
    const c = ctx.ctrl;
    const m = mkSlider(c,['சரிவு m','Slope m'],-5,5,0.5,1,'',()=>draw());
    const cc = mkSlider(c,['வெட்டுத்துண்டு c','Intercept c'],-6,6,1,2,'',()=>draw());
    const cv = ctx.mkCanvas(640,360), g = cv.getContext('2d');
    function draw(){ grid(g); const M=m.get(), C=cc.get(); g.strokeStyle='#e24b4b'; g.lineWidth=3; g.beginPath(); g.moveTo(0,GY-(M*((0-GX)/GU)+C)*GU); g.lineTo(640,GY-(M*((640-GX)/GU)+C)*GU); g.stroke();
      circ(g,GX,GY-C*GU,6,'#2563eb'); tx(g,'(0, '+C+')',GX+10,GY-C*GU-8,'#2563eb',12);
      const xi=PHYS.line(M,C).xi; if(xi!==null && Math.abs(xi)<14){ circ(g,GX+xi*GU,GY,6,'#2e9e4f'); }
      ctx.read([[T('சமன்பாடு','Equation'),'y = '+M+'x '+(C<0?'− '+Math.abs(C):'+ '+C)],[T('கோடு','Direction'),M>0?T('ஏறுகிறது ↗','rising ↗'):(M<0?T('இறங்குகிறது ↘','falling ↘'):T('கிடைமட்டம் →','flat →'))],[T('y-அச்சு வெட்டு','y-intercept'),C],[T('x-அச்சு வெட்டு','x-intercept'),xi===null?'—':(+xi.toFixed(2))]]); }
    draw();
    return { cols:[['m','m'],['c','c'],['கோடு','Direction']], rec:()=>[m.get(),cc.get(),m.get()>0?'↗':(m.get()<0?'↘':'→')] };
  },
  key:['**m = சரிவு** (x ஒன்று கூடினால் y எவ்வளவு மாறும்); m > 0 ஏறும், m < 0 இறங்கும், m = 0 கிடைமட்டம். **c = y-அச்சை வெட்டும் புள்ளி (0, c).**','**m is the slope** (how much y changes when x grows by 1): m > 0 rises, m < 0 falls, m = 0 flat. **c is where the line cuts the y-axis, (0, c).**'],
  quiz:[{q:['y = 3x − 2 — y-அச்சு வெட்டு?','y = 3x − 2 — y-intercept?'],o:[['3','3'],['−2','−2'],['2','2']],a:1,w:['c = −2.','c = −2.']},
        {q:['எந்தக் கோடு அதிகம் செங்குத்து?','Which line is steepest?'],o:[['y = x','y = x'],['y = 4x','y = 4x'],['y = 0.5x','y = 0.5x']],a:1,w:['|m| பெரியது → செங்குத்து.','Largest |m| is steepest.']}]
});

/* 9 — Quadratic */
EXPS.push({ id:'quad', icon:'🌈', c:[10,12], s:'maths', t:['பரவளையம் y = ax² + bx + c','Parabola y = ax² + bx + c'], mins:6,
  goal:['a, b, c எண்கள் பரவளையத்தின் வடிவத்தையும் இடத்தையும் எப்படி மாற்றுகின்றன?','How do a, b, c change the shape and position of the parabola?'],
  predict:{ q:['a எதிர்மறை எண்ணாக இருந்தால் பரவளையம்?','If a is negative, the parabola…'],
    o:[['மேல்நோக்கித் திறக்கும் ∪','opens up ∪'],['கீழ்நோக்கித் திறக்கும் ∩','opens down ∩'],['நேர்கோடாகும்','becomes a line']], a:1, why:['a < 0 → ∩ (கீழ்நோக்கி); a > 0 → ∪.','a < 0 → ∩; a > 0 → ∪.'] },
  build(ctx){
    const c = ctx.ctrl;
    const a = mkSlider(c,['a','a'],-3,3,0.5,1,'',()=>draw());
    const b = mkSlider(c,['b','b'],-6,6,1,0,'',()=>draw());
    const cc = mkSlider(c,['c','c'],-6,6,1,-2,'',()=>draw());
    const cv = ctx.mkCanvas(640,360), g = cv.getContext('2d');
    function draw(){ grid(g); const A=a.get(),B=b.get(),C=cc.get(), q=PHYS.quad(A,B,C); g.strokeStyle='#a24bd6'; g.lineWidth=3; g.beginPath(); let st=false;
      for(let px=0;px<=640;px+=2){ const x=(px-GX)/GU, y=A*x*x+B*x+C, py=GY-y*GU; if(py<-40||py>400){ st=false; continue; } st?g.lineTo(px,py):g.moveTo(px,py); st=true; } g.stroke();
      if(A!==0){ circ(g,GX+q.vx*GU,GY-q.vy*GU,6,'#e24b4b'); q.roots.forEach(r=>circ(g,GX+r*GU,GY,6,'#2e9e4f')); }
      ctx.read([[T('உச்சி','Vertex'),A===0?T('— (நேர்கோடு)','— (a line)'):'('+(+q.vx.toFixed(2))+', '+(+q.vy.toFixed(2))+')'],[T('திறக்கும் திசை','Opens'),A>0?T('மேலே ∪','up ∪'):(A<0?T('கீழே ∩','down ∩'):'—')],[T('வேறுபடுத்தி D = b²−4ac','Discriminant D'),q.D],[T('x-வெட்டுகள் (தீர்வுகள்)','x-intercepts (roots)'),A===0?'—':(q.roots.length?q.roots.map(r=>+r.toFixed(2)).join(', '):T('இல்லை','none'))]]); }
    draw();
    return { cols:[['a','a'],['b','b'],['c','c'],['வெட்டுகள்','Roots']], rec:()=>{ const q=PHYS.quad(a.get(),b.get(),cc.get()); return [a.get(),b.get(),cc.get(), a.get()===0?'—':q.roots.length]; } };
  },
  key:['**a** வடிவத்தை (திசை, அகலம்) தீர்மானிக்கும்: a > 0 ∪, a < 0 ∩; |a| பெரியது → ஒடுக்கம். **c** = y-அச்சு வெட்டு. **D = b² − 4ac:** D > 0 இரண்டு தீர்வு, D = 0 ஒன்று, D < 0 இல்லை (x-அச்சைத் தொடாது).','**a** sets direction and width: a > 0 ∪, a < 0 ∩; larger |a| is narrower. **c** is the y-intercept. **D = b² − 4ac:** D > 0 two roots, D = 0 one, D < 0 none (never touches the x-axis).'],
  quiz:[{q:['y = x² − 4 — x-வெட்டுகள்?','y = x² − 4 — x-intercepts?'],o:[['±2','±2'],['4','4'],['இல்லை','none']],a:0,w:['x² = 4 → x = ±2.','x² = 4 → x = ±2.']},
        {q:['D < 0 எனில்?','If D < 0…'],o:[['2 தீர்வுகள்','2 roots'],['1 தீர்வு','1 root'],['மெய்த் தீர்வு இல்லை','no real roots']],a:2,w:['வளைவு x-அச்சைத் தொடாது.','The curve misses the x-axis.']}]
});

/* 10 — Pendulum */
EXPS.push({ id:'pendulum', icon:'🕰️', c:[8,10], s:'physics', t:['ஊசல் — நேரம் எதைப் பொறுத்தது?','Pendulum — what sets the time?'], mins:5,
  goal:['ஊசலின் அலைவு நேரம் நீளத்தையா, எடையையா பொறுத்தது?','Does a pendulum\'s time depend on its length or its weight?'],
  predict:{ q:['கனமான குண்டைக் கட்டினால் ஊசல் வேகமாகவா மெதுவாகவா ஆடும்?','A heavier bob — will the pendulum swing faster, slower, or the same?'],
    o:[['வேகமாக','Faster'],['மெதுவாக','Slower'],['அதே நேரம்','Same time']], a:2, why:['அலைவு நேரம் நீளத்தை மட்டுமே பொறுத்தது; எடையை அல்ல (கலிலியோ).','Period depends only on length, not mass (Galileo).'] },
  build(ctx){
    const c = ctx.ctrl;
    const L = mkSlider(c,['நீளம்','Length'],0.25,2,0.05,1,'m',()=>draw());
    const M = mkSlider(c,['குண்டு எடை','Bob mass'],0.1,1,0.1,0.5,'kg',()=>draw());
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d'); let t = 0;
    function draw(){ const Tp=PHYS.pendulum(L.get()); ctx.read([[T('அலைவு நேரம் T','Period T'),Tp.toFixed(2)+' s'],[T('10 அலைவுகள்','10 swings'),(Tp*10).toFixed(1)+' s'],[T('நீளம் L','Length L'),L.get().toFixed(2)+' m'],[T('எடை','Mass'),M.get().toFixed(1)+' kg']]); } draw();
    ctx.loop(dt=>{ t+=dt; const Tp=PHYS.pendulum(L.get()), th=0.4*Math.cos(2*Math.PI*t/Tp), len=L.get()*130, px=320, py=30, bx=px+len*Math.sin(th), by=py+len*Math.cos(th);
      g.clearRect(0,0,640,330); ln(g,240,py,400,py,'#555',6); ln(g,px,py,bx,by,'#444',2); circ(g,bx,by,10+M.get()*14,'#e8a33d','#8a5a00'); tx(g,M.get().toFixed(1)+'kg',bx,by+4,'#222',11,'center');
      g.setLineDash([4,4]); ln(g,px,py,px,py+len+30,'#aaa',1); g.setLineDash([]); });
    return { cols:[['நீளம் (m)','L (m)'],['எடை (kg)','m (kg)'],['T (s)','T (s)']], rec:()=>[L.get().toFixed(2),M.get().toFixed(1),PHYS.pendulum(L.get()).toFixed(2)] };
  },
  key:['**T = 2π √(L ÷ g).** நீளம் 4 மடங்கு → நேரம் 2 மடங்கு. எடையும் ஆடும் அகலமும் (சிறிய கோணத்தில்) நேரத்தை மாற்றாது. இதனால்தான் ஊசல் கடிகாரங்கள் துல்லியம்.','**T = 2π √(L ÷ g).** Length ×4 → time ×2. Mass (and small swing size) don\'t change it — that\'s why pendulum clocks are accurate.'],
  quiz:[{q:['நீளத்தை 4 மடங்கு ஆக்கினால் T?','Length ×4 — period becomes…'],o:[['4 மடங்கு','4×'],['2 மடங்கு','2×'],['பாதி','half']],a:1,w:['T ∝ √L; √4 = 2.','T ∝ √L; √4 = 2.']},
        {q:['நிலவில் (g குறைவு) ஊசல்?','On the Moon (smaller g) the pendulum swings…'],o:[['வேகமாக','faster'],['மெதுவாக','slower'],['அதே','same']],a:1,w:['g குறைந்தால் T கூடும்.','Smaller g → longer T.']}]
});

/* 11 — Refraction */
EXPS.push({ id:'refraction', icon:'🔦', c:[8,10], s:'physics', t:['ஒளி விலகல்','Bending of light'], mins:5,
  goal:['காற்றிலிருந்து நீர்/கண்ணாடிக்குள் செல்லும்போது ஒளி எப்படி வளைகிறது?','How does light bend when it goes from air into water or glass?'],
  predict:{ q:['காற்றிலிருந்து நீருக்குள் செல்லும் ஒளிக்கதிர் செங்கோட்டை (normal) நோக்கியா, விலகியா வளையும்?','Light entering water from air bends…'],
    o:[['செங்கோட்டை நோக்கி','toward the normal'],['செங்கோட்டை விட்டு விலகி','away from the normal'],['வளையாது','not at all']], a:0, why:['அடர்ந்த ஊடகத்தில் ஒளி மெதுவாகும் → செங்கோட்டை நோக்கி வளையும்.','Light slows in the denser medium → bends toward the normal.'] },
  build(ctx){
    const c = ctx.ctrl, S = {n:1.33};
    mkChips(c,['இரண்டாம் ஊடகம்','Second medium'],[[1.33,'நீர் (1.33)','Water (1.33)'],[1.5,'கண்ணாடி (1.5)','Glass (1.5)'],[2.42,'வைரம் (2.42)','Diamond (2.42)']],1.33,v=>{S.n=v;draw();});
    const ang = mkSlider(c,['விழு கோணம் i','Angle of incidence i'],0,80,5,40,'°',()=>draw());
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d');
    function draw(){ const i=ang.get(), r=PHYS.refract(i,S.n), ir=i*Math.PI/180, rr=r*Math.PI/180, cx=320, cy=165, Ln=140; g.clearRect(0,0,640,330);
      g.fillStyle='#eef6ff'; g.fillRect(0,0,640,cy); g.fillStyle=S.n>2?'#d8d0f2':(S.n>1.4?'#d3ecd8':'#bfe3fb'); g.fillRect(0,cy,640,165); ln(g,0,cy,640,cy,'#333',2);
      g.setLineDash([6,5]); ln(g,cx,10,cx,320,'#888',1.5); g.setLineDash([]); tx(g,T('செங்கோடு','normal'),cx+6,22,'#888',11);
      ln(g,cx-Ln*Math.sin(ir),cy-Ln*Math.cos(ir),cx,cy,'#e8a300',4); ln(g,cx,cy,cx+Ln*Math.sin(rr),cy+Ln*Math.cos(rr),'#e8a300',4);
      ln(g,cx,cy,cx+Ln*Math.sin(ir)*0.7,cy-Ln*Math.cos(ir)*0.7,'rgba(232,163,0,.25)',2);
      tx(g,'i = '+i+'°',cx-90,cy-60,'#b57a00',15); tx(g,'r = '+r.toFixed(1)+'°',cx+30,cy+80,'#b57a00',15); tx(g,T('காற்று (1.0)','Air (1.0)'),20,25,'#2563b0',13); tx(g,T('ஊடகம் n = ','Medium n = ')+S.n,20,155+30,'#2f6d3f',13);
      ctx.read([[T('விழு கோணம் i','Incidence i'),i+'°'],[T('விலகு கோணம் r','Refraction r'),r.toFixed(1)+'°'],[T('வளைவு (i − r)','Bend (i − r)'),(i-r).toFixed(1)+'°'],[T('சூத்திரம்','Law'),'sin i ÷ sin r = '+S.n]]); }
    draw();
    return { cols:[['ஊடகம் n','n'],['i (°)','i (°)'],['r (°)','r (°)']], rec:()=>[S.n,ang.get(),PHYS.refract(ang.get(),S.n).toFixed(1)] };
  },
  key:['**அடர்ந்த ஊடகத்துக்குள் (நீர், கண்ணாடி) ஒளி செங்கோட்டை நோக்கி வளையும் (r < i).** n பெரியது → அதிக வளைவு. **ஸ்நெல் விதி: sin i ÷ sin r = n.** விழு கோணம் 0° (செங்குத்து) எனில் வளையாது.','**Entering a denser medium (water, glass) light bends toward the normal (r < i).** Bigger n → more bending. **Snell\'s law: sin i ÷ sin r = n.** At 0° (straight in) there is no bend.'],
  quiz:[{q:['நீரில் வைத்த குச்சி வளைந்து தெரிவது ஏன்?','Why does a stick in water look bent?'],o:[['ஒளி விலகல்','refraction of light'],['குச்சி வளையும்','the stick bends'],['நிழல்','shadow']],a:0,w:['நீர்–காற்று எல்லையில் ஒளி வளைகிறது.','Light bends at the water–air boundary.']},
        {q:['i = 0° எனில் r = ?','If i = 0°, r = ?'],o:[['0°','0°'],['45°','45°'],['90°','90°']],a:0,w:['செங்குத்தாக நுழைந்தால் வளைவு இல்லை.','Straight-in light does not bend.']}]
});

/* 12 — pH */
const SUBS = [['🍋','எலுமிச்சை சாறு','Lemon juice',2.2],['🍶','வினிகர்','Vinegar',2.8],['🍅','தக்காளி சாறு','Tomato juice',4.5],['☕','கருப்புக் காபி','Black coffee',5],['🥛','பால்','Milk',6.5],['💧','தூய நீர்','Pure water',7],['🧂','சமையல் சோடா','Baking soda',8.3],['🧼','சோப்புக் கரைசல்','Soap solution',10],['🧴','ப்ளீச்','Bleach',12.5]];
EXPS.push({ id:'ph', icon:'🧪', c:[8,10], s:'chem', t:['அமிலமா? காரமா? (pH)','Acid or base? (pH)'], mins:5,
  goal:['வீட்டுப் பொருட்களின் pH-ஐ அளந்து அமிலம் / நடுநிலை / காரம் என வகைப்படுத்து.','Measure the pH of home items and sort them into acid / neutral / base.'],
  predict:{ q:['எலுமிச்சை சாறு — அமிலமா, காரமா?','Lemon juice — acid or base?'],
    o:[['அமிலம் (pH < 7)','Acid (pH < 7)'],['நடுநிலை (pH = 7)','Neutral (pH = 7)'],['காரம் (pH > 7)','Base (pH > 7)']], a:0, why:['புளிப்புச் சுவை = அமிலம் (pH ≈ 2).','Sour taste = acid (pH ≈ 2).'] },
  build(ctx){
    const c = ctx.ctrl, S = {i:0};
    mkChips(c,['பொருளைத் தேர்ந்தெடு','Choose a substance'],SUBS.map((x,i)=>[i,x[0]+' '+x[1],x[0]+' '+x[2]]),0,v=>{S.i=v;draw();});
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d');
    function kind(p){ return p<6.5?T('அமிலம் 🔴','Acid 🔴'):(p>7.5?T('காரம் 🔵','Base 🔵'):T('நடுநிலை 🟢','Neutral 🟢')); }
    function draw(){ const s=SUBS[S.i], p=s[3]; g.clearRect(0,0,640,330);
      g.fillStyle=phColor(p); g.globalAlpha=.85; g.fillRect(70,130,140,150); g.globalAlpha=1; g.strokeStyle='#555'; g.lineWidth=4; g.beginPath(); g.moveTo(68,90); g.lineTo(68,282); g.lineTo(212,282); g.lineTo(212,90); g.stroke(); tx(g,s[0],140,115,'#000',40,'center'); tx(g,T(s[1],s[2]),140,310,'#333',14,'center');
      g.fillStyle=phColor(p); g.fillRect(250,110,36,150); g.strokeStyle='#333'; g.lineWidth=2; g.strokeRect(250,110,36,150); tx(g,T('pH தாள்','pH paper'),268,100,'#333',12,'center');
      const x0=320,w=290,y0=190; for(let i=0;i<w;i++){ g.fillStyle=phColor(i/w*14); g.fillRect(x0+i,y0,2,36); }
      for(let k=0;k<=14;k+=2){ tx(g,String(k),x0+k/14*w,y0+54,'#555',12,'center'); } tx(g,T('அமிலம் ←','← acid'),x0,y0-8,'#c33',12); tx(g,T('→ காரம்','base →'),x0+w,y0-8,'#336',12,'right');
      const mx=x0+p/14*w; g.fillStyle='#000'; g.beginPath(); g.moveTo(mx,y0+38); g.lineTo(mx-9,y0+60); g.lineTo(mx+9,y0+60); g.closePath(); g.fill(); tx(g,'pH '+p,mx,y0-30,'#000',20,'center');
      ctx.read([[T('பொருள்','Substance'),T(s[1],s[2])],[T('pH மதிப்பு','pH value'),p],[T('வகை','Type'),kind(p)],[T('H⁺ செறிவு','H⁺ strength'),p<7?T('அதிகம்','high'):(p>7?T('குறைவு','low'):T('சமம்','equal'))]]); }
    draw();
    return { cols:[['பொருள்','Item'],['pH','pH'],['வகை','Type']], rec:()=>{ const s=SUBS[S.i]; return [T(s[1],s[2]), s[3], kind(s[3]).replace(/ [^ ]*$/,'')]; } };
  },
  key:['**pH 0–14 அளவுகோல்:** 7-க்கு கீழே அமிலம், 7 நடுநிலை (தூய நீர்), 7-க்கு மேலே காரம். ஒவ்வொரு 1 pH மாற்றமும் 10 மடங்கு வலிமை வேறுபாடு! pH தாளின் நிறம் pH-ஐக் காட்டும்.','**pH scale 0–14:** below 7 acid, 7 neutral (pure water), above 7 base. Each 1 pH step is a 10× change in strength! The colour of pH paper shows the pH.'],
  quiz:[{q:['pH 9 உள்ள கரைசல்?','A solution of pH 9 is…'],o:[['அமிலம்','acid'],['நடுநிலை','neutral'],['காரம்','base']],a:2,w:['7-க்கு மேல் = காரம்.','Above 7 = base.']},
        {q:['pH 3, pH 5 — எது வலிமையான அமிலம்?','pH 3 vs pH 5 — which is the stronger acid?'],o:[['pH 3','pH 3'],['pH 5','pH 5'],['சமம்','equal']],a:0,w:['pH குறைவு = அமிலம் வலிமை.','Lower pH = stronger acid.']}]
});

/* 13 — Waves */
EXPS.push({ id:'wave', icon:'🌊', c:[8,10], s:'physics', t:['அலை — வேகம் = அதிர்வெண் × அலைநீளம்','Wave — speed = frequency × wavelength'], mins:6,
  goal:['அலையின் வேகத்தை அதிர்வெண்ணும் அலைநீளமும் எப்படி தீர்மானிக்கின்றன?','How do frequency and wavelength decide a wave\'s speed?'],
  predict:{ q:['அலைநீளம் மாறாமல் அதிர்வெண்ணை இரட்டிப்பாக்கினால் அலை வேகம்?','Wavelength fixed, frequency doubled. Wave speed becomes…'],
    o:[['பாதி','half'],['அதே','same'],['இரட்டிப்பு','double']], a:2, why:['v = f × λ; f இரட்டிப்பு → v இரட்டிப்பு.','v = f × λ; f ×2 → v ×2.'] },
  build(ctx){
    const c = ctx.ctrl;
    const A = mkSlider(c,['உயரம் (வீச்சு)','Amplitude'],10,60,5,35,'',()=>draw());
    const lam = mkSlider(c,['அலைநீளம் λ','Wavelength λ'],2,10,1,5,'cm',()=>draw());
    const f = mkSlider(c,['அதிர்வெண் f','Frequency f'],0.2,2,0.1,1,'Hz',()=>draw());
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d'); let t=0;
    function draw(){ const r=PHYS.wave(f.get(),lam.get()); ctx.read([[T('அலை வேகம் v = f × λ','Speed v = f × λ'),r.v.toFixed(1)+' cm/s'],[T('காலம் T = 1 ÷ f','Period T = 1 ÷ f'),r.T.toFixed(2)+' s'],[T('அலைநீளம்','Wavelength'),lam.get()+' cm'],[T('அதிர்வெண்','Frequency'),f.get().toFixed(1)+' Hz']]); } draw();
    ctx.loop(dt=>{ t+=dt; const px=lam.get()*30, k=2*Math.PI/px, w=2*Math.PI*f.get(); g.clearRect(0,0,640,330); ln(g,0,165,640,165,'#ddd',1);
      g.strokeStyle='#2563eb'; g.lineWidth=3; g.beginPath(); for(let x=0;x<=640;x+=3){ const y=165-A.get()*Math.sin(k*x-w*t); x?g.lineTo(x,y):g.moveTo(x,y); } g.stroke();
      const bx=130, by=165-A.get()*Math.sin(k*bx-w*t); circ(g,bx,by,8,'#e24b4b'); tx(g,T('நீர்த்துகள் மேலே/கீழே மட்டும் அசையும்','particle moves only up & down'),bx,300,'#c33',12,'center');
      const x1=330, crest=(Math.PI/2+w*t)/k; let cx=crest%px; while(cx<x1) cx+=px; if(cx+px<640){ ln(g,cx,165-A.get()-16,cx+px,165-A.get()-16,'#333',2); tx(g,'λ = '+lam.get()+' cm',cx+px/2,165-A.get()-24,'#333',12,'center'); }
      ln(g,590,165,590,165-A.get(),'#2e9e4f',3); tx(g,T('உயரம்','amp.'),600,165-A.get()/2,'#2e9e4f',11); tx(g,'→ v',600,40,'#555',16); });
    return { cols:[['f (Hz)','f (Hz)'],['λ (cm)','λ (cm)'],['v (cm/s)','v (cm/s)']], rec:()=>[f.get().toFixed(1),lam.get(),PHYS.wave(f.get(),lam.get()).v.toFixed(1)] };
  },
  key:['**v = f × λ.** அதிர்வெண் கூடினால் வேகம் கூடும் (λ மாறாமல்). அலையில் ஆற்றல் முன்னே செல்கிறது; துகள்கள் இடத்திலேயே மேலும் கீழும் ஆடுகின்றன. வீச்சு (உயரம்) ஆற்றலை (சத்தம்/பிரகாசம்) காட்டும், வேகத்தை அல்ல.','**v = f × λ.** Higher frequency → higher speed (same λ). Energy travels forward; particles just move up and down in place. Amplitude relates to loudness/brightness, not speed.'],
  quiz:[{q:['f = 2 Hz, λ = 3 cm → v?','f = 2 Hz, λ = 3 cm → v = ?'],o:[['1.5 cm/s','1.5 cm/s'],['5 cm/s','5 cm/s'],['6 cm/s','6 cm/s']],a:2,w:['2 × 3 = 6.','2 × 3 = 6.']},
        {q:['அலையுடன் துகள்கள் முன்னே நகர்கின்றனவா?','Do particles travel forward with the wave?'],o:[['ஆம்','Yes'],['இல்லை, இடத்திலேயே ஆடும்','No, they oscillate in place']],a:1,w:['ஆற்றல் மட்டுமே நகரும்.','Only energy moves.']}]
});

/* 14 — Boyle (gas) */
EXPS.push({ id:'gas', icon:'🎈', c:[9,11], s:'chem', t:['வாயு — கனஅளவும் அழுத்தமும்','Gas — volume & pressure'], mins:6,
  goal:['பெட்டியைச் சுருக்கினால் வாயுவின் அழுத்தம் ஏன் கூடுகிறது?','Why does gas pressure rise when you squeeze the box?'],
  predict:{ q:['கனஅளவை பாதியாக்கினால் (வெப்பநிலை மாறாமல்) அழுத்தம்?','Volume halved (temperature same). Pressure becomes…'],
    o:[['பாதி','half'],['மாறாது','same'],['இரட்டிப்பு','double']], a:2, why:['P × V = மாறிலி (பாயில் விதி). V பாதி → P இரட்டிப்பு.','P × V = constant (Boyle\'s law). V halves → P doubles.'] },
  build(ctx){
    const c = ctx.ctrl;
    const V = mkSlider(c,['கனஅளவு','Volume'],20,100,10,100,'cm³',()=>{ draw(); });
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d'); const N=30, ps=[]; let hits=[], now=0;
    for(let i=0;i<N;i++){ const a=Math.random()*6.28; ps.push({x:50+Math.random()*90,y:70+Math.random()*180,vx:130*Math.cos(a),vy:130*Math.sin(a)}); }
    function draw(){ const P=PHYS.boyle(V.get()); const recent=hits.filter(h=>now-h<=2).length/2; ctx.read([[T('கனஅளவு V','Volume V'),V.get()+' cm³'],[T('அழுத்தம் P = 2000 ÷ V','Pressure P = 2000 ÷ V'),P.toFixed(1)+' kPa'],[T('P × V','P × V'),(P*V.get()).toFixed(0)],[T('அடிகள் / வினாடி (நேரடி)','Hits per second (live)'),recent.toFixed(1)]]); }
    draw(); let acc=0;
    ctx.loop(dt=>{ now+=dt; const W=V.get()*5, X0=40, Y0=60, H=200; g.clearRect(0,0,640,330); g.strokeStyle='#444'; g.lineWidth=4; g.strokeRect(X0,Y0,W,H);
      g.fillStyle='#5b6b8a'; g.fillRect(X0+W,Y0,14,H); ln(g,X0+W+14,Y0+H/2,X0+W+60,Y0+H/2,'#5b6b8a',8); g.fillRect(X0+W+56,Y0+H/2-26,10,52);
      ps.forEach(p=>{ p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.x<X0+4){ p.x=X0+4; p.vx=Math.abs(p.vx); } if(p.x>X0+W-4){ p.x=X0+W-4; p.vx=-Math.abs(p.vx); hits.push(now); } if(p.y<Y0+4){ p.y=Y0+4; p.vy=Math.abs(p.vy); } if(p.y>Y0+H-4){ p.y=Y0+H-4; p.vy=-Math.abs(p.vy); } circ(g,p.x,p.y,4.5,'#e24b4b'); });
      hits=hits.filter(h=>now-h<=2); tx(g,T('அழுத்தம்','Pressure')+' '+PHYS.boyle(V.get()).toFixed(0)+' kPa',X0+W/2,Y0+H+30,'#333',14,'center'); acc+=dt; if(acc>0.4){ acc=0; draw(); } });
    return { cols:[['V (cm³)','V (cm³)'],['P (kPa)','P (kPa)'],['P × V','P × V']], rec:()=>{ const P=PHYS.boyle(V.get()); return [V.get(),P.toFixed(1),(P*V.get()).toFixed(0)]; } };
  },
  key:['**P × V = மாறிலி** (வெப்பநிலை மாறாதபோது). இடம் குறைந்தால் துகள்கள் சுவரில் அடிக்கடி மோதும் → அழுத்தம் கூடும். சைக்கிள் பம்ப் அடைத்து அழுத்தினால் கடினமாவது இதனால்தான்.','**P × V = constant** (at fixed temperature). Less room → particles hit the wall more often → higher pressure. That is why a blocked bicycle pump gets hard to push.'],
  quiz:[{q:['V = 50 cm³ → 25 cm³ எனில் P?','V goes 50 → 25 cm³. P becomes…'],o:[['பாதி','half'],['இரட்டிப்பு','double'],['4 மடங்கு','4×']],a:1,w:['P × V மாறிலி.','P × V is constant.']},
        {q:['அழுத்தம் உண்டாக்குவது?','Pressure is caused by…'],o:[['துகள்கள் சுவரில் மோதுவது','particles hitting the walls'],['துகள்கள் நிற்பது','particles being still'],['ஈர்ப்பு மட்டும்','gravity only']],a:0,w:['மோதல்களின் எண்ணிக்கை = அழுத்தம்.','More collisions → more pressure.']}]
});

const SUBJ = { maths:['கணிதம்','Maths','#3b2fc9'], physics:['இயற்பியல்','Physics','#0b7a75'], chem:['வேதியியல்','Chemistry','#b3541e'], bio:['உயிரியல்','Biology','#2e7d32'] };
const WHY = {};

/* ---------- lab home ---------- */
let cls = 'all', sub = 'all';
try{ cls = localStorage.getItem('kalviLabClass') || 'all'; }catch(e){}
function allProg(){ try{ return JSON.parse(localStorage.getItem('kalviProgress')||'{}'); }catch(e){ return {}; } }
function prog(id){ return allProg()['lab-'+id] || {}; }
function saveProg(id,v){ try{ const p=allProg(); p['lab-'+id]=Object.assign(p['lab-'+id]||{},v); localStorage.setItem('kalviProgress',JSON.stringify(p)); }catch(e){} }
function renderLab(){
  inject(); const app = $('#app');
  const list = EXPS.filter(x=> (cls==='all' || (x.c[0]<=+cls && +cls<=x.c[1])) && (sub==='all' || x.s===sub));
  const subs = [['all',T('எல்லாம்','All')]].concat(Object.keys(SUBJ).map(k=>[k, SUBJ[k][lang()==='en'?1:0]]));
  const cl = [['all',T('எல்லா வகுப்பும்','All classes')]].concat([4,5,6,7,8,9,10,11,12].map(n=>[n,T(n+' ஆம் வகுப்பு','Class '+n)]));
  const chips = (items,cur,key)=>'<div class="fchips">'+items.map(([v,l])=>'<button data-'+key+'="'+v+'" class="'+(String(cur)===String(v)?'on':'')+'">'+esc(l)+'</button>').join('')+'</div>';
  app.innerHTML = '<div class="crumbs"><span data-go="#/">'+T('முகப்பு','Home')+'</span> › '+T('ஆய்வகம்','Lab')+'</div>'
   +'<div class="hero" style="background:linear-gradient(135deg,#0b7a75,#3b2fc9)"><h1>🧪 '+T('ஆய்வகம் — செய்து பார், புரிந்துகொள்','Experiments Lab — do it, understand it')+'</h1>'
   +'<p>'+T('ஒவ்வொரு சோதனையும்: 🤔 ஊகி → 🔬 செய் & பதிவு செய் → 💡 விதியைப் புரிந்துகொள் → ✅ சோதி. எல்லாம் தமிழில், இலவசம், உள்நுழைவு இல்லை.','Every experiment: 🤔 predict → 🔬 do & record → 💡 learn the rule → ✅ check. All in Tamil, free, no login.')+'</p></div>'
   +'<div class="lgoal">💡 <b>'+T('ஏன் இப்படிச் செய்கிறோம்?','Why do it this way?')+'</b> '+T('விஞ்ஞானிகளும் பொறியாளர்களும் இப்படித்தான் கற்கிறார்கள்: ஊகி → சோதி → பதிவு செய் → விதியைக் கண்டுபிடி. மனப்பாடம் செய்தது மறந்துபோகும்; நீயே கண்டுபிடித்தது மறக்காது.','Scientists and engineers learn this way: predict → test → record → find the rule. What you memorise fades; what you discover stays.')+'</div>'
   +chips(cl,cls,'cl')+chips(subs,sub,'sb')
   +'<div class="labgrid">'+(list.length? list.map(x=>{ const p=prog(x.id); return '<div class="simc" data-id="'+x.id+'" style="--c:'+SUBJ[x.s][2]+'">'+(p.done?'<span class="dn">✅</span>':'')+'<div class="ic">'+x.icon+'</div><b>'+esc(P2(x.t))+'</b><div class="m">'+esc(SUBJ[x.s][lang()==='en'?1:0])+' · '+T('வகுப்பு ','Class ')+x.c[0]+'–'+x.c[1]+' · ⏱ '+x.mins+' '+T('நிமிடம்','min')+'</div><div class="m">'+esc(P2(x.goal))+'</div></div>'; }).join('') : '<p class="note">'+T('இந்த வகுப்புக்கு இன்னும் இல்லை — விரைவில்!','Nothing here yet for this selection — coming soon!')+'</p>')+'</div>'
   +'<p class="note">'+T('இவை நாங்களே எழுதிய சோதனைகள். இன்னும் அதிகம் வேண்டுமா? புத்தகங்கள் பக்கத்தில் மேலும் இலவச தளங்கள் உள்ளன.','These experiments are written by us. Want more? The Books page lists more free sites.')+'</p>'
   +'<div style="margin:10px 0"><button class="btn" data-go="#/missions">🎯 '+T('சவால் விளையாட்டுகள்','Mission games')+'</button> <button class="btn" data-go="#/what">🌍 '+T('இது என்ன பாடம்? ஏன் படிக்கிறோம்?','What is each subject? Why learn it?')+'</button> <button class="btn" data-go="#/books">📚 '+T('இலவச புத்தகங்கள்','Free books')+'</button></div>';
  app.querySelectorAll('[data-go]').forEach(n=> n.onclick=()=>go(n.dataset.go));
  app.querySelectorAll('[data-cl]').forEach(n=> n.onclick=()=>{ cls=n.dataset.cl; try{localStorage.setItem('kalviLabClass',cls);}catch(e){} renderLab(); });
  app.querySelectorAll('[data-sb]').forEach(n=> n.onclick=()=>{ sub=n.dataset.sb; renderLab(); });
  app.querySelectorAll('.simc').forEach(n=> n.onclick=()=>go('#/lab/'+n.dataset.id));
  window.scrollTo(0,0);
}

/* ---------- one experiment page ---------- */
let RAF = 0;
function whyBlock(x){ const w = x.why || WHY[x.id]; if(!w) return '';
  return '<details class="lwhy" open><summary>🌍 '+T('இதை ஏன் படிக்கிறோம்? இதனால் என்ன பயன்?','Why learn this? What is it good for?')+'</summary>'
   +'<p>🏠 <b>'+T('அன்றாட வாழ்வில்:','In daily life:')+'</b> '+esc(P2(w.l))+'</p>'
   +'<p>💼 <b>'+T('எந்தத் தொழில்களில்:','In careers:')+'</b> '+esc(P2(w.j))+'</p>'
   +'<p>⭐ <b>'+T('சிந்தித்துப் பார்:','Think about it:')+'</b> '+esc(P2(w.h))+'</p></details>'; }
function md(s){ return esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>'); }
function renderSim(id){
  inject(); const x = EXPS.find(e=>e.id===id); if(!x) return renderLab();
  cancelAnimationFrame(RAF);
  const app = $('#app'); const i = EXPS.indexOf(x), prev = EXPS[i-1], next = EXPS[i+1];
  const st = { pick:null, recs:0 };
  app.innerHTML = '<div class="crumbs"><span data-go="#/">'+T('முகப்பு','Home')+'</span> › <span data-go="#/lab">'+T('ஆய்வகம்','Lab')+'</span> › '+esc(P2(x.t))+'</div>'
   +'<h2 style="margin:0 0 4px">'+x.icon+' '+esc(P2(x.t))+'</h2>'
   +'<div class="lstepper"><span class="on" data-s="1">🤔 '+T('ஊகி','Predict')+'</span><span data-s="2">🔬 '+T('செய்','Do')+'</span><span data-s="3">💡 '+T('புரிந்துகொள்','Understand')+'</span><span data-s="4">✅ '+T('சோதி','Check')+'</span></div>'
   +whyBlock(x)
   +'<div class="lgoal">🎯 <b>'+T('இலக்கு:','Goal:')+'</b> '+esc(P2(x.goal))+'</div>'
   +'<div class="lstep" id="s1"><h3>🤔 '+T('முதலில் ஊகி','First, predict')+'</h3><p>'+esc(P2(x.predict.q))+'</p><div id="opts"></div><div id="pfb"></div></div>'
   +'<div class="lstep lock" id="s2"><h3>🔬 '+T('இப்போது செய்து பார்','Now try it')+'</h3><div class="labbox"><div id="cvh"></div><div><div id="ctrl"></div><div class="lread" id="read"></div></div></div>'
   +'<div style="margin-top:10px"><button class="btn p" id="recbtn">📌 '+T('இந்த மதிப்பைப் பதிவு செய்','Record this reading')+'</button> <button class="btn" id="clrbtn">🗑 '+T('அழி','Clear')+'</button> <span class="note" id="recmsg"></span></div><div style="overflow-x:auto"><table class="ltab" id="tab"></table></div>'
   +'<div style="margin-top:10px"><button class="btn p" id="seebtn" style="display:none">💡 '+T('முடிவைப் பார் →','See the result →')+'</button></div></div>'
   +'<div class="lstep lock" id="s3"><h3>💡 '+T('புரிந்துகொள்','Understand')+'</h3><div id="res"></div></div>'
   +'<div class="lstep lock" id="s4"><h3>✅ '+T('சோதித்துப் பார்','Check yourself')+'</h3><div id="quiz"></div></div>'
   +'<div class="nav">'+(prev?'<button class="btn" data-go="#/lab/'+prev.id+'">← '+esc(P2(prev.t))+'</button>':'<button class="btn" data-go="#/lab">← '+T('ஆய்வகம்','Lab')+'</button>')+(next?'<button class="btn p" data-go="#/lab/'+next.id+'">'+esc(P2(next.t))+' →</button>':'<button class="btn" data-go="#/lab">'+T('ஆய்வகம்','Lab')+'</button>')+'</div>';
  app.querySelectorAll('[data-go]').forEach(n=> n.onclick=()=>go(n.dataset.go));
  const stepTo = n=>{ app.querySelectorAll('.lstepper span').forEach(s=> s.classList.toggle('on', +s.dataset.s<=n)); };
  // predict
  const opts = $('#opts'); x.predict.o.forEach((o,k)=>{ const b=el('button','lopt',esc(P2(o))); b.onclick=()=>{ if(st.pick!==null) return; st.pick=k; opts.querySelectorAll('.lopt').forEach((q,j)=>{ q.classList.toggle('pick',j===k); });
      $('#pfb').innerHTML='<p class="note">'+T('உன் ஊகம் பதிவாகிவிட்டது! இப்போது சோதித்துப் பார் 👇','Your guess is saved! Now test it 👇')+'</p>'; $('#s2').classList.remove('lock'); stepTo(2); $('#s2').scrollIntoView({behavior:'smooth',block:'start'}); }; opts.appendChild(b); });
  // experiment
  const cvh = $('#cvh'); const loops = [];
  const ctx = { ctrl:$('#ctrl'), mkCanvas:(w,h)=>{ const cv=el('canvas','labcv'); cv.width=w; cv.height=h; cvh.appendChild(cv); return cv; },
    read:items=>{ $('#read').innerHTML = items.map(([k,v])=>'<div>'+esc(k)+'<b>'+esc(v)+'</b></div>').join(''); }, loop:fn=>loops.push(fn) };
  const ex = x.build(ctx);
  if(loops.length){ let last=performance.now(); const tick=now=>{ if(!document.body.contains(cvh)) return; const dt=Math.min(0.05,(now-last)/1000); last=now; loops.forEach(f=>f(dt)); RAF=requestAnimationFrame(tick); }; RAF=requestAnimationFrame(tick); }
  const tab = $('#tab'); const rows = [];
  const drawTab = ()=>{ tab.innerHTML = '<tr><th>#</th>'+ex.cols.map(c=>'<th>'+esc(P2(c))+'</th>').join('')+'</tr>'+rows.map((r,k)=>'<tr><td>'+(k+1)+'</td>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('');
    const left = Math.max(0,3-rows.length); $('#recmsg').textContent = left? T('இன்னும் '+left+' பதிவு (மதிப்புகளை மாற்றிப் பதிவு செய்)','Record '+left+' more (change values between readings)') : T('நல்லது! 👍','Great! 👍'); $('#seebtn').style.display = rows.length>=3?'inline-block':'none'; };
  $('#recbtn').onclick=()=>{ if(rows.length>=10) rows.shift(); rows.push(ex.rec()); drawTab(); };
  $('#clrbtn').onclick=()=>{ rows.length=0; drawTab(); }; drawTab();
  // result
  $('#seebtn').onclick=()=>{ const ok = st.pick===x.predict.a; $('#res').innerHTML = '<p><b>'+(ok?T('🎉 உன் ஊகம் சரி!','🎉 Your prediction was right!'):T('🤝 உன் ஊகம் வேறு — அதுவும் கற்றலின் பகுதி!','🤝 Your guess was different — that is part of learning!'))+'</b><br>'+T('சரியான விடை: ','Correct answer: ')+esc(P2(x.predict.o[x.predict.a]))+'<br>'+esc(P2(x.predict.why))+'</p><div class="lkey">🔑 '+md(P2(x.key))+'</div><p class="note">'+T('உன் பதிவு அட்டவணையில் இதே விதி தெரிகிறதா என்று பார்!','Can you see this same rule in your table?')+'</p>';
    $('#s3').classList.remove('lock'); $('#s4').classList.remove('lock'); stepTo(4); $('#s3').scrollIntoView({behavior:'smooth',block:'start'}); buildQuiz(); $('#seebtn').style.display='none'; };
  function buildQuiz(){ const qh=$('#quiz'); qh.innerHTML=''; let ans=0, sc=0; x.quiz.forEach((q,qi)=>{ const d=el('div'); d.innerHTML='<p><b>'+(qi+1)+'. '+esc(P2(q.q))+'</b></p>'; const fb=el('div','note'); let done=false;
      q.o.forEach((o,oi)=>{ const b=el('button','lopt',esc(P2(o))); b.onclick=()=>{ if(done) return; done=true; ans++; const ok=oi===q.a; if(ok) sc++; b.classList.add(ok?'ok':'bad'); d.querySelectorAll('.lopt')[q.a].classList.add('ok'); fb.innerHTML=(ok?'✅ ':'❌ ')+esc(P2(q.w));
          if(ans===x.quiz.length){ const pct=Math.round(sc/x.quiz.length*100); saveProg(x.id,{done:true,score:pct}); qh.appendChild(el('p',null,'<b>'+(pct===100?'🌟 ':'👍 ')+T('மதிப்பெண்: ','Score: ')+sc+'/'+x.quiz.length+'</b>')); } }; d.appendChild(b); });
      d.appendChild(fb); qh.appendChild(d); }); }
  window.scrollTo(0,0);
}

/* ---------- books ---------- */
const BOOKS = [
 {n:'தமிழ்நாடு பாடநூல் கழகம் (சமச்சீர் — 1–12)',e:'Tamil Nadu Textbook Corporation (Samacheer, Classes 1–12)',u:'https://www.tntextbooks.in',d:'தமிழ் & ஆங்கில வழி அதிகாரப்பூர்வ PDF பாடநூல்கள்',de:'Official PDF textbooks, Tamil & English medium',t:'🏛️'},
 {n:'NCERT பாடநூல்கள் (CBSE)',e:'NCERT Textbooks (CBSE)',u:'https://ncert.nic.in/textbook.php',d:'அரசு இலவச PDF — வகுப்பு 1–12',de:'Government free PDFs — Classes 1–12',t:'🇮🇳'},
 {n:'DIKSHA',e:'DIKSHA (Govt. of India)',u:'https://diksha.gov.in',d:'பாடம் வாரியான QR பாடப்பொருள், வீடியோக்கள்',de:'Curriculum-linked lessons & videos',t:'📲'},
 {n:'SWAYAM / NPTEL',e:'SWAYAM / NPTEL',u:'https://swayam.gov.in',d:'IIT/IISc இலவச படிப்புகள் (11–12, கல்லூரி)',de:'Free IIT/IISc courses (Class 11–12, college)',t:'🎓'},
 {n:'OpenStax',e:'OpenStax (Rice University)',u:'https://openstax.org/subjects',d:'உலகத் தர இலவச பாடநூல்கள் — கணிதம், இயற்பியல், வேதியியல், உயிரியல்',de:'Peer-reviewed free textbooks — maths, physics, chemistry, biology',t:'📗'},
 {n:'CK-12',e:'CK-12 FlexBooks',u:'https://www.ck12.org',d:'இலவச FlexBooks, பயிற்சி',de:'Free FlexBooks, practice',t:'📘'},
 {n:'LibreTexts',e:'LibreTexts',u:'https://libretexts.org',d:'திறந்த பாடநூல் நூலகம் (11–12, கல்லூரி)',de:'Open textbook library (Class 11–12, college)',t:'📙'},
 {n:'Khan Academy',e:'Khan Academy',u:'https://www.khanacademy.org',d:'வீடியோ + பயிற்சி — கணிதம், அறிவியல்',de:'Videos + practice — maths, science',t:'🎬'},
 {n:'PhET Simulations (கூடுதல்)',e:'PhET Simulations (extra)',u:'https://phet.colorado.edu/ta/',d:'கொலராடோ பல்கலைக்கழகத்தின் இலவச simulations — நம் ஆய்வகத்தைத் தாண்டி இன்னும் நூற்றுக்கணக்கானவை',de:'University of Colorado\'s free simulations — hundreds more beyond our lab',t:'🧪'},
 {n:'தமிழ் இணையக் கல்விக்கழகம்',e:'Tamil Virtual Academy',u:'https://www.tamilvu.org',d:'தமிழ் இலக்கியம், இலக்கணம், அகராதிகள்',de:'Tamil literature, grammar, dictionaries',t:'📜'},
 {n:'தமிழ் விக்கிமூலம்',e:'Tamil Wikisource',u:'https://ta.wikisource.org',d:'பொது உரிமையிலுள்ள தமிழ் நூல்கள்',de:'Public-domain Tamil texts',t:'📖'}
];
function renderBooks(){
  inject(); const app = $('#app');
  app.innerHTML = '<div class="crumbs"><span data-go="#/">'+T('முகப்பு','Home')+'</span> › '+T('புத்தகங்கள்','Books')+'</div>'
   +'<div class="hero" style="background:linear-gradient(135deg,#b3541e,#3b2fc9)"><h1>📚 '+T('இலவச புத்தகங்கள் & கற்றல் தளங்கள்','Free books & learning sites')+'</h1>'
   +'<p>'+T('இவை அந்தந்த நிறுவனங்களின் அதிகாரப்பூர்வ இலவச தளங்கள். நாங்கள் நகலெடுப்பதில்லை — நேரடி இணைப்பு மட்டும்.','Official free sites of each publisher. We never copy — direct links only.')+'</p></div>'
   +'<div style="margin-top:14px">'+BOOKS.map(b=>'<a class="bookc" href="'+b.u+'" target="_blank" rel="noopener"><span class="i">'+b.t+'</span><div><b>'+esc(T(b.n,b.e))+'</b><span>'+esc(T(b.d,b.de))+'</span></div></a>').join('')+'</div>'
   +'<button class="btn" data-go="#/lab">🧪 '+T('ஆய்வகம்','Lab')+'</button>';
  app.querySelectorAll('[data-go]').forEach(n=> n.onclick=()=>go(n.dataset.go));
  window.scrollTo(0,0);
}

/* ---- "What is Maths / Physics / Chemistry / Biology?" ---- */
const WHAT = [
 {k:'maths', i:'🔢', ta:'கணிதம் என்றால் என்ன?', en:'What is Maths?',
  what:['எண்கள், வடிவங்கள், அளவுகள், மாற்றங்களின் மொழி. "எவ்வளவு? எத்தனை? எப்படி மாறுகிறது? எது நிச்சயம்?" என்ற கேள்விகளுக்கு விடை தரும்.','The language of numbers, shapes, sizes and change. It answers: how much? how many? how does it change? what is certain?'],
  use:['கடையில் மலிவான பொதியைத் தேர்வது, வங்கி வட்டி, வரைபட தூரம், கட்டிடம் வடிவமைப்பு, கணினி நிரல், வானிலை முன்னறிவிப்பு — எல்லாவற்றின் அடிப்படை.','Choosing the cheaper pack, bank interest, map distances, designing buildings, computer programs, weather forecasts — all stand on it.'],
  job:['பொறியாளர், கணக்காளர், தரவு விஞ்ஞானி, விமானி, விளையாட்டு ஆய்வாளர், ISRO விஞ்ஞானி','Engineer, accountant, data scientist, pilot, sports analyst, ISRO scientist'],
  ex:['fraction','ratio','pythagoras','interest','coin','line'], lesson:['🛒 நிஜ வாழ்க்கைக் கணக்கு (6–10 வகுப்பு கணக்கு)','🛒 Real-life maths (Maths, Classes 6–10)'] },
 {k:'physics', i:'⚡', ta:'இயற்பியல் என்றால் என்ன?', en:'What is Physics?',
  what:['இயற்கை எப்படி இயங்குகிறது என்பதை விசை, இயக்கம், ஆற்றல், ஒளி, ஒலி, மின்சாரம் மூலம் விளக்கும் அறிவியல். "ஏன் விழுகிறது? ஏன் ஒளிர்கிறது? எவ்வளவு வேகம்?"','The science of how nature works through force, motion, energy, light, sound and electricity. Why does it fall? Why does it glow? How fast?'],
  use:['மின்விசிறி, மொபைல், பேருந்து, ராக்கெட், MRI, சூரிய மின்சாரம் — எல்லாம் இயற்பியல் விதிகளால் இயங்குகின்றன.','Fans, mobiles, buses, rockets, MRI, solar power — all run on physics laws.'],
  job:['பொறியாளர், விண்வெளி விஞ்ஞானி, மின் பொறியாளர், மருத்துவ இயற்பியலாளர்','Engineer, space scientist, electrical engineer, medical physicist'],
  ex:['spring','projectile','lever','pendulum','ohm','circuit','freefall','skate','refraction','wave'], lesson:['🎮 செய்து புரிந்துகொள் (அறிவியல், 6–10 வகுப்பு)','🎮 Learn by doing (Science, Classes 6–10)'] },
 {k:'chem', i:'🧪', ta:'வேதியியல் என்றால் என்ன?', en:'What is Chemistry?',
  what:['பொருட்கள் எதனால் ஆனவை, எப்படி மாறுகின்றன என்பதன் அறிவியல். அணு → மூலக்கூறு → புதிய பொருள்.','The science of what things are made of and how they change: atoms → molecules → new substances.'],
  use:['சமையல், சோப்பு, மருந்து, உரம், பேட்டரி, துருப்பிடித்தல், பிளாஸ்டிக் — எல்லாம் வேதிவினைகள்.','Cooking, soap, medicine, fertiliser, batteries, rusting, plastics — all chemical reactions.'],
  job:['மருந்து விஞ்ஞானி, வேதிப் பொறியாளர், உணவு தர ஆய்வாளர், சுற்றுச்சூழல் விஞ்ஞானி','Pharma scientist, chemical engineer, food-quality analyst, environmental scientist'],
  ex:['ph','atom','states','balance','density'], lesson:['🎮 அணு, pH, சமன்பாடு விளையாட்டுகள்','🎮 Atom, pH and equation games'] },
 {k:'bio', i:'🌱', ta:'உயிரியல் என்றால் என்ன?', en:'What is Biology?',
  what:['உயிர்களைப் பற்றிய அறிவியல் — செல், உடல், தாவரம், விலங்கு, சுற்றுச்சூழல், மரபு. "நாம் எப்படி வாழ்கிறோம்?"','The science of living things: cells, bodies, plants, animals, ecosystems and heredity. How do we live?'],
  use:['நோய் தடுப்பு, தடுப்பூசி, விவசாயம், உணவுப் பாதுகாப்பு, இயற்கையைக் காத்தல் — உயிரியல் அறிவால் சாத்தியம்.','Disease prevention, vaccines, farming, food safety and protecting nature all rely on biology.'],
  job:['மருத்துவர், செவிலியர், வேளாண் விஞ்ஞானி, மரபியலாளர், வனப் பாதுகாவலர்','Doctor, nurse, agricultural scientist, geneticist, forest officer'],
  ex:['selection','states'], lesson:['🎮 உணவுச் சங்கிலி, மரபு, இதயம் விளையாட்டுகள்','🎮 Food-chain, heredity and heart games'] }
];
function renderWhat(){
  inject(); const app = $('#app'); const L = id => EXPS.find(e=>e.id===id);
  app.innerHTML = '<div class="crumbs"><span data-go="#/">'+T('முகப்பு','Home')+'</span> › '+T('இது என்ன பாடம்?','What is each subject?')+'</div>'
   +'<div class="hero" style="background:linear-gradient(135deg,#3b2fc9,#2e7d32)"><h1>🌍 '+T('கணிதம், இயற்பியல், வேதியியல், உயிரியல் — ஏன்?','Maths, Physics, Chemistry, Biology — why?')+'</h1><p>'+T('ஒவ்வொரு பாடமும் உலகத்தின் ஒரு கேள்விக்கு விடை தருகிறது. கீழே பார், பிறகு செய்து விளையாடு!','Each subject answers a question about the world. Read below, then try and play!')+'</p></div>'
   + WHAT.map(w=>{ const c=SUBJ[w.k][2]; return '<section class="whyb" style="border-left:6px solid '+c+';margin-top:14px"><h2 style="margin:0 0 8px">'+w.i+' '+T(w.ta,w.en)+'</h2>'
     +'<p><b>'+T('இது என்ன?','What is it?')+'</b><br>'+esc(T(w.what[0],w.what[1]))+'</p>'
     +'<p><b>'+T('எங்கே பயன்?','Where is it used?')+'</b><br>'+esc(T(w.use[0],w.use[1]))+'</p>'
     +'<p><b>'+T('எதிர்காலத் தொழில்கள்','Careers')+'</b><br>'+esc(T(w.job[0],w.job[1]))+'</p>'
     +'<p><b>'+T('இப்போதே செய்து பார்','Try it now')+'</b></p><div style="display:flex;flex-wrap:wrap;gap:8px">'
     + w.ex.map(id=>{ const e=L(id); return e?'<button class="btn" style="background:'+c+'" data-go="#/lab/'+id+'">'+e.icon+' '+esc(T(e.t[0],e.t[1]))+'</button>':''; }).join('')
     +'</div><p style="margin-top:8px;opacity:.85">'+esc(T(w.lesson[0],w.lesson[1]))+'</p></section>'; }).join('')
   +'<button class="btn" style="margin-top:14px" data-go="#/lab">🧪 '+T('ஆய்வகம்','Lab')+'</button>';
  app.querySelectorAll('[data-go]').forEach(n=> n.onclick=()=>go(n.dataset.go));
  window.scrollTo(0,0);
}
window.KALVI_LAB = { renderLab, renderSim, renderBooks, renderWhat, EXPS, PHYS, BOOKS, WHY, SUBJ, H:{mkSlider,mkChips,mkBtn,ln,tx,circ,clamp,esc,T,P2,grid,phColor,G} };
})();
