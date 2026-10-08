/* Kalvi Kalanjiyam — 🎯 Missions: "hit the target" challenge games (Tamil + English).
   Student moves ONE slider, sees the live result, and must hit a random target. 5 rounds, 3 stars.
   All maths is computed (PHYS from lab.js + simple formulas); every round is solvable on the slider grid (unit-tested). */
(function(){
'use strict';
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang = () => document.documentElement.lang==='en' ? 'en' : 'ta';
const T = (ta,en) => lang()==='en' ? en : ta;
const P2 = a => a ? (lang()==='en' ? a[1] : a[0]) : '';
const ri = (a,b)=> a + Math.floor(Math.random()*(b-a+1));
const pick = a => a[Math.floor(Math.random()*a.length)];
const r2 = x => Math.round(x*100)/100;
const PH = () => (window.KALVI_LAB && window.KALVI_LAB.PHYS) || {};
const G = 9.8;

/* round = {q:[ta,en], ctrl:{lab:[ta,en],min,max,step,val,unit}, f:v=>number, out:[ta,en], unit, target, tol, exp:[ta,en]} */
const MISSIONS = [
 {id:'m-projectile', icon:'🏹', s:'physics', c:[9,10], t:['இலக்கைத் தாக்கு — எறிபொருள்','Hit the target — projectile'], why:['எறியும் கோணம் மாறினால் தூரம் மாறுகிறது; 45° அருகே அதிகம். பீரங்கி, கிரிக்கெட், ஈட்டி எறிதலில் பயன்.','The launch angle changes the range; about 45° gives the most. Used in cannons, cricket and javelin.'],
  make(){ const v = pick([15,20,25]), a = ri(15,75), t = r2(PH().projectile(a,v).range); return {q:[`${v} m/s வேகத்தில் எறியும் பந்து ${t} m தூரத்தில் விழ வேண்டும். கோணத்தை அமை.`,`A ball launched at ${v} m/s must land ${t} m away. Set the angle.`], ctrl:{lab:['கோணம்','Angle'],min:5,max:85,step:1,val:45,unit:'°'}, f:x=>r2(PH().projectile(x,v).range), out:['தூரம்','Range'], unit:'m', target:t, tol:0.01, exp:[`தூரம் = v² sin2θ ÷ g = ${v}² × sin(2×${a}°) ÷ 9.8 = ${t} m`,`range = v² sin2θ ÷ g = ${v}² × sin(2×${a}°) ÷ 9.8 = ${t} m`]}; }},
 {id:'m-spring', icon:'🧷', s:'physics', c:[7,10], t:['சுருள்வில்லை நீட்டு','Stretch the spring'], why:['ஹூக் விதி: நீட்சி எடைக்கு நேர் விகிதம். தராசுகள், வாகன அதிர்வுத் தாங்கிகள் (shock absorbers) இதனால் இயங்கும்.','Hooke\'s law: stretch is proportional to the weight. Spring scales and shock absorbers rely on it.'],
  make(){ const k = pick([20,25,40,50]), m = ri(3,40)*10, x = r2(PH().hooke(m,k).x); return {q:[`k = ${k} N/m சுருள்வில் ${x} cm நீள வேண்டும். எத்தனை கிராம் தொங்கவிடுவாய்?`,`A spring (k = ${k} N/m) must stretch ${x} cm. How many grams do you hang?`], ctrl:{lab:['எடை','Mass'],min:10,max:500,step:10,val:100,unit:'g'}, f:v=>r2(PH().hooke(v,k).x), out:['நீட்சி','Stretch'], unit:'cm', target:x, tol:0.005, exp:[`x = m g ÷ k = ${m/1000} × 9.8 ÷ ${k} = ${x/100} m = ${x} cm`,`x = m g ÷ k = ${m/1000} × 9.8 ÷ ${k} = ${x/100} m = ${x} cm`]}; }},
 {id:'m-lever', icon:'⚖️', s:'physics', c:[6,10], t:['சீ-சாவைச் சமப்படுத்து','Balance the seesaw'], why:['இடது எடை × தூரம் = வலது எடை × தூரம். கத்தரிக்கோல், ஆணிபிடுங்கி, தராசு இதே விதி.','Left weight × distance = right weight × distance. Scissors, claw hammers and balances use it.'],
  make(){ let wL,dL,wR,dR,n=0; do{ wL=ri(2,10); dL=ri(1,8); wR=ri(2,10); dR=wL*dL/wR; n++; }while((!Number.isInteger(dR)||dR<1||dR>10||wL===wR)&&n<500); if(!Number.isInteger(dR)){ wL=4;dL=3;wR=6;dR=2; }
   return {q:[`இடது: ${wL} kg, மையத்திலிருந்து ${dL} அடி. வலது: ${wR} kg. எத்தனை அடியில் வைத்தால் சமநிலை?`,`Left: ${wL} kg at ${dL} ft. Right: ${wR} kg. At what distance does it balance?`], ctrl:{lab:['வலது தூரம்','Right distance'],min:1,max:10,step:1,val:5,unit:'ft'}, f:v=>wR*v, out:['வலது திருப்புத்திறன்','Right moment'], unit:'kg·ft', target:wL*dL, tol:0.0001, exp:[`${wL} × ${dL} = ${wL*dL}; ${wR} × ${dR} = ${wR*dR} → சமம்`,`${wL} × ${dL} = ${wL*dL}; ${wR} × ${dR} = ${wR*dR} → equal`]}; }},
 {id:'m-ohm', icon:'💡', s:'physics', c:[8,10], t:['மின்னோட்டத்தை அமை','Set the current'], why:['I = V ÷ R: தடை கூடினால் மின்னோட்டம் குறையும். பியூஸ், மின் சாதனங்களின் பாதுகாப்பு இதையே நம்புகிறது.','I = V ÷ R: more resistance, less current. Fuses and appliance safety depend on it.'],
  make(){ const V = pick([6,12,24]), R = pick([2,3,4,6,8,12].filter(r=>V%r===0)), I = r2(V/R); return {q:[`${V} V மின்கலத்தில் ${I} A மின்னோட்டம் ஓட, தடையை எவ்வளவு வைப்பாய்?`,`On a ${V} V supply, which resistance gives a current of ${I} A?`], ctrl:{lab:['தடை','Resistance'],min:1,max:24,step:1,val:10,unit:'Ω'}, f:v=>r2(V/v), out:['மின்னோட்டம்','Current'], unit:'A', target:I, tol:0.005, exp:[`R = V ÷ I = ${V} ÷ ${I} = ${R} Ω`,`R = V ÷ I = ${V} ÷ ${I} = ${R} Ω`]}; }},
 {id:'m-pendulum', icon:'🕰️', s:'physics', c:[9,10], t:['ஊசலின் நேரம்','Time the pendulum'], why:['T = 2π√(L÷g): நீளமான ஊசல் மெதுவாக ஆடும். பழைய கடிகாரங்கள் இப்படித்தான் நேரம் காட்டின.','T = 2π√(L÷g): longer pendulums swing slower. Old clocks kept time this way.'],
  make(){ const i = ri(4,50), L = i*0.05, T0 = r2(PH().pendulum(L)); return {q:[`ஊசல் ஒரு முறை ஆட ${T0} வினாடி ஆக வேண்டும். நீளத்தை அமை.`,`One full swing must take ${T0} s. Set the length.`], ctrl:{lab:['நீளம்','Length'],min:0.2,max:2.5,step:0.05,val:1,unit:'m'}, f:v=>r2(PH().pendulum(v)), out:['அலைவுநேரம்','Period'], unit:'s', target:T0, tol:0.005, exp:[`T = 2π√(${r2(L)} ÷ 9.8) = ${T0} s`,`T = 2π√(${r2(L)} ÷ 9.8) = ${T0} s`]}; }},
 {id:'m-boyle', icon:'🎈', s:'physics', c:[9,10], t:['வாயு அழுத்தம்','Gas pressure'], why:['பாயில் விதி: P × V மாறாது; கனஅளவைக் குறைத்தால் அழுத்தம் கூடும். சைக்கிள் பம்ப், டயர் இதுவே.','Boyle\'s law: P × V stays constant; shrink the volume and pressure rises. Bicycle pumps and tyres use it.'],
  make(){ const V0 = pick([20,25,40,50,80,100,125,200]), P = r2(2000/V0); return {q:[`அழுத்தம் ${P} kPa ஆக வேண்டும் (P × V = 2000). கனஅளவு எவ்வளவு?`,`Make the pressure ${P} kPa (P × V = 2000). What volume?`], ctrl:{lab:['கனஅளவு','Volume'],min:10,max:250,step:5,val:100,unit:'cm³'}, f:v=>r2(PH().boyle(v)), out:['அழுத்தம்','Pressure'], unit:'kPa', target:P, tol:0.005, exp:[`V = 2000 ÷ ${P} = ${V0} cm³`,`V = 2000 ÷ ${P} = ${V0} cm³`]}; }},
 {id:'m-refract', icon:'🌈', s:'physics', c:[10,10], t:['ஒளி வளைவு','Bend the light'], why:['ஒளி நீரில்/கண்ணாடியில் நுழையும்போது வளைகிறது (ஸ்னெல் விதி). லென்ஸ், கண்ணாடி, ஆப்டிக்கல் ஃபைபர் இதனால் இயங்கும்.','Light bends when it enters water or glass (Snell\'s law). Lenses, spectacles and optical fibre use it.'],
  make(){ const n = pick([1.33,1.5]), a = ri(2,8)*5, r = Math.round(PH().refract(a,n)*10)/10; return {q:[`ஒளி காற்றிலிருந்து n = ${n} பொருளுக்குள் நுழைகிறது. வளைந்த கோணம் ${r}° ஆக வர, வீழ்கோணம் எவ்வளவு?`,`Light goes from air into a material with n = ${n}. Which angle of incidence gives a refracted angle of ${r}°?`], ctrl:{lab:['வீழ்கோணம்','Incidence'],min:5,max:80,step:5,val:30,unit:'°'}, f:v=>Math.round(PH().refract(v,n)*10)/10, out:['வளைந்த கோணம்','Refracted angle'], unit:'°', target:r, tol:0.001, exp:[`sin r = sin ${a}° ÷ ${n} → r = ${r}°`,`sin r = sin ${a}° ÷ ${n} → r = ${r}°`]}; }},
 {id:'m-pythagoras', icon:'📐', s:'maths', c:[8,10], t:['கர்ணத்தைக் கண்டுபிடி','Find the hypotenuse'], why:['a² + b² = c². கட்டுமானம், ஏணி, வரைபட தூரம், ஃபோன் திரை அளவு — எங்கும் பயன்.','a² + b² = c². Used in construction, ladders, map distances and screen sizes.'],
  make(){ const [a,b,c] = pick([[3,4,5],[5,12,13],[6,8,10],[8,15,17],[9,12,15],[7,24,25],[12,16,20],[15,20,25],[9,40,41],[20,21,29]]); return {q:[`செங்கோண முக்கோணத்தின் பக்கங்கள் ${a}, ${b}. கர்ணம் (c)?`,`A right triangle has legs ${a} and ${b}. What is the hypotenuse c?`], ctrl:{lab:['c','c'],min:1,max:45,step:1,val:10,unit:''}, f:v=>v*v, out:['c²','c²'], unit:'', target:a*a+b*b, tol:0.0001, exp:[`${a}² + ${b}² = ${a*a} + ${b*b} = ${a*a+b*b} = ${c}²`,`${a}² + ${b}² = ${a*a} + ${b*b} = ${a*a+b*b} = ${c}²`]}; }},
 {id:'m-ratio', icon:'🍚', s:'maths', c:[6,8], t:['சமையல் விகிதம்','Recipe ratio'], why:['விகிதம் = எல்லாம் ஒரே அளவில் பெருகுதல். சமையல், வண்ணக் கலவை, வரைபடம், மருந்து அளவு எல்லாம் விகிதம்.','Ratio means everything scales together. Cooking, paint mixing, maps and medicine doses all use it.'],
  make(){ const p0 = pick([2,3,4,5]), r0 = pick([1,2,3]), mult = ri(2,6), n = p0*mult, need = r0*mult; return {q:[`${p0} பேருக்கு ${r0} கப் அரிசி. ${n} பேருக்கு எத்தனை கப்?`,`${r0} cup(s) of rice feed ${p0} people. How many cups for ${n} people?`], ctrl:{lab:['கப்','Cups'],min:1,max:40,step:1,val:5,unit:''}, f:v=>v*p0/r0, out:['உணவளிக்கும் நபர்கள்','People fed'], unit:'', target:n, tol:0.0001, exp:[`${n} ÷ ${p0} = ${mult} மடங்கு → ${r0} × ${mult} = ${need} கப்`,`${n} ÷ ${p0} = ${mult} times → ${r0} × ${mult} = ${need} cups`]}; }},
 {id:'m-interest', icon:'🏦', s:'maths', c:[7,10], t:['வட்டி எத்தனை ஆண்டு?','How many years of interest?'], why:['தனி வட்டி = P × r × t ÷ 100. கடன், சேமிப்பு, FD — பணத்தைப் புத்திசாலித்தனமாகக் கையாள.','Simple interest = P × r × t ÷ 100. Key for loans, savings and fixed deposits.'],
  make(){ const P = pick([1000,2000,5000,10000]), r = pick([5,8,10,12]), t = ri(2,12), I = P*r*t/100; return {q:[`₹${P} ஐ ${r}% தனி வட்டியில் போட்டால் ₹${I} வட்டி வர எத்தனை ஆண்டு?`,`₹${P} at ${r}% simple interest earns ₹${I}. For how many years?`], ctrl:{lab:['ஆண்டுகள்','Years'],min:1,max:20,step:1,val:5,unit:'yr'}, f:v=>P*r*v/100, out:['வட்டி ₹','Interest ₹'], unit:'₹', target:I, tol:0.0001, exp:[`t = I × 100 ÷ (P × r) = ${I} × 100 ÷ (${P} × ${r}) = ${t}`,`t = I × 100 ÷ (P × r) = ${I} × 100 ÷ (${P} × ${r}) = ${t}`]}; }},
 {id:'m-wave', icon:'🌊', s:'physics', c:[9,10], t:['அலை வேகம்','Wave speed'], why:['v = f × λ. ரேடியோ, மொபைல் சிக்னல், ஒலி, ஒளி எல்லாம் அலைகள்.','v = f × λ. Radio, mobile signals, sound and light are all waves.'],
  make(){ const lam = pick([2,4,5,10]), f0 = ri(1,12), v = lam*f0; return {q:[`அலைநீளம் ${lam} m. அலை வேகம் ${v} m/s ஆக, அதிர்வெண் எவ்வளவு?`,`Wavelength is ${lam} m. Which frequency gives a wave speed of ${v} m/s?`], ctrl:{lab:['அதிர்வெண்','Frequency'],min:1,max:20,step:1,val:5,unit:'Hz'}, f:x=>PH().wave(x,lam).v, out:['வேகம்','Speed'], unit:'m/s', target:v, tol:0.0001, exp:[`f = v ÷ λ = ${v} ÷ ${lam} = ${f0} Hz`,`f = v ÷ λ = ${v} ÷ ${lam} = ${f0} Hz`]}; }}
];

/* ---- UI ---- */
function css(){ if(document.getElementById('miscss')) return; const s = document.createElement('style'); s.id = 'miscss';
 s.textContent = '.mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin:12px 0}.mcard{background:#fff;border:1px solid var(--line,#ddd);border-top:5px solid #e0702b;border-radius:16px;padding:14px;cursor:pointer}.mcard b{display:block;margin:4px 0}.mcard .st{font-size:1rem}.mplay{background:#fff;border:1px solid var(--line,#ddd);border-radius:16px;padding:16px;margin:12px 0}.mval{font-size:1.5rem;font-weight:800;margin:8px 0}.mmsg{min-height:2.6em;margin:8px 0;font-weight:600}.mbar{height:8px;background:#eee;border-radius:99px;overflow:hidden}.mbar i{display:block;height:100%;background:#e0702b}.mplay input[type=range]{width:100%}.mbtn{border:0;background:#e0702b;color:#fff;border-radius:12px;padding:10px 18px;font:inherit;font-weight:700;cursor:pointer;margin:6px 6px 0 0}.mbtn.g{background:#2e7d32}';
 document.head.appendChild(s); }
function prog(){ try{ return JSON.parse(localStorage.getItem('kalviProgress')||'{}'); }catch(e){ return {}; } }
function save(id,v){ try{ const p = prog(); p[id] = Object.assign(p[id]||{}, v); localStorage.setItem('kalviProgress', JSON.stringify(p)); }catch(e){} }
const go = h => { location.hash = h; };
const SUBJC = {physics:'⚡', maths:'🔢'};

function renderMissions(id){
  css(); const app = document.getElementById('app'), pr = prog();
  if(id){ const m = MISSIONS.find(x=>x.id===id); if(m) return play(m); }
  app.innerHTML = '<div class="crumbs"><span data-go="#/">'+T('முகப்பு','Home')+'</span> › '+T('சவால்கள்','Missions')+'</div>'
   +'<div class="hero" style="background:linear-gradient(135deg,#e0702b,#3b2fc9)"><h1>🎯 '+T('இலக்கை அடை — சவால் விளையாட்டுகள்','Hit the target — mission games')+'</h1><p>'+T('ஒரு ஸ்லைடரை நகர்த்து, முடிவு எப்படி மாறுகிறது என்று பார், இலக்கைத் தாக்கு! 5 சுற்று, 3 நட்சத்திரம்.','Move one slider, watch how the result changes, and hit the target! 5 rounds, 3 stars.')+'</p></div>'
   +'<div class="mgrid">'+MISSIONS.map(m=>{ const p = pr['mission-'+m.id]; const st = p&&p.stars||0; return '<div class="mcard" data-go="#/missions/'+m.id+'"><span style="font-size:1.8rem">'+m.icon+'</span><b>'+esc(P2(m.t))+'</b><div class="st">'+'⭐'.repeat(st)+'☆'.repeat(3-st)+'</div><small>'+SUBJC[m.s]+' '+T('வகுப்பு','Class')+' '+m.c[0]+'–'+m.c[1]+'</small></div>'; }).join('')+'</div>'
   +'<button class="btn" data-go="#/lab">🧪 '+T('ஆய்வகம்','Lab')+'</button>';
  app.querySelectorAll('[data-go]').forEach(n=> n.onclick=()=>go(n.dataset.go)); window.scrollTo(0,0);
}

function play(m){
  const app = document.getElementById('app'); let round = 0, tries = 0, total = 0, R = m.make(), done = false;
  const fmtv = x => (Math.round(x*100)/100).toString();
  function draw(){
    const c = R.ctrl;
    app.innerHTML = '<div class="crumbs"><span data-go="#/">'+T('முகப்பு','Home')+'</span> › <span data-go="#/missions">'+T('சவால்கள்','Missions')+'</span> › '+esc(P2(m.t))+'</div>'
     +'<div class="mplay"><div class="mbar"><i style="width:'+(round/5*100)+'%"></i></div><p><b>'+m.icon+' '+T('சுற்று','Round')+' '+(round+1)+' / 5</b></p>'
     +'<p style="font-size:1.05rem">'+esc(P2(R.q))+'</p>'
     +'<label>'+esc(P2(c.lab))+': <b id="mv"></b></label><input id="ms" type="range" min="'+c.min+'" max="'+c.max+'" step="'+c.step+'" value="'+c.val+'">'
     +'<div class="mval">'+esc(P2(R.out))+': <span id="mo"></span> '+esc(R.unit)+' &nbsp; 🎯 <span style="color:#e0702b">'+fmtv(R.target)+' '+esc(R.unit)+'</span></div>'
     +'<div class="mmsg" id="mm"></div><button class="mbtn" id="mc">✔ '+T('சரிபார்','Check')+'</button></div>';
    app.querySelectorAll('[data-go]').forEach(n=> n.onclick=()=>go(n.dataset.go));
    const s = document.getElementById('ms'), upd = ()=>{ document.getElementById('mv').textContent = fmtv(+s.value)+' '+c.unit; document.getElementById('mo').textContent = fmtv(R.f(+s.value)); };
    s.oninput = upd; upd();
    document.getElementById('mc').onclick = ()=>{
      const v = +s.value, val = R.f(v), ok = Math.abs(val-R.target) <= R.tol, mm = document.getElementById('mm'); tries++;
      if(ok){ total += tries; mm.innerHTML = '✅ '+T('சரி!','Correct!')+' <br><small>'+esc(P2(R.exp))+'</small>'; const b = document.getElementById('mc'); b.className = 'mbtn g'; b.textContent = round<4 ? T('அடுத்த சுற்று ▶','Next round ▶') : T('முடி 🏁','Finish 🏁'); b.onclick = ()=>{ round++; tries = 0; if(round>=5) return finish(); R = m.make(); draw(); }; s.disabled = true; }
      else mm.textContent = (val<R.target ? '⬆️ '+T('இன்னும் அதிகம் வேண்டும்','Need more') : '⬇️ '+T('குறைக்க வேண்டும்','Need less'))+' ('+fmtv(val)+' '+R.unit+')';
    };
  }
  function finish(){
    const stars = total <= 8 ? 3 : total <= 14 ? 2 : 1; const old = (prog()['mission-'+m.id]||{}).stars||0; save('mission-'+m.id, {done:true, stars:Math.max(old,stars)});
    app.innerHTML = '<div class="mplay"><h2>🏁 '+T('சவால் முடிந்தது!','Mission complete!')+'</h2><div style="font-size:2rem">'+'⭐'.repeat(stars)+'☆'.repeat(3-stars)+'</div><p>'+T('மொத்த முயற்சிகள்','Total attempts')+': '+total+' ('+T('5 சுற்றுகளுக்கு','for 5 rounds')+')</p>'
     +'<p><b>💡 '+T('ஏன் இது முக்கியம்?','Why does this matter?')+'</b><br>'+esc(P2(m.why))+'</p>'
     +'<button class="mbtn" id="again">🔁 '+T('மீண்டும்','Play again')+'</button><button class="mbtn g" data-go="#/missions">🎯 '+T('மற்ற சவால்கள்','More missions')+'</button></div>';
    document.getElementById('again').onclick = ()=> play(m); app.querySelectorAll('[data-go]').forEach(n=> n.onclick=()=>go(n.dataset.go));
  }
  draw(); window.scrollTo(0,0);
}
window.KALVI_MISSIONS = {render:renderMissions, MISSIONS};
})();
