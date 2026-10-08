/* Kalvi Kalanjiyam — Lab, part 2: "why learn this" notes for every experiment + 14 more experiments.
   All written by us (own code, own Tamil text). Needs lab.js loaded first. */
(function(){
'use strict';
const L = window.KALVI_LAB; if(!L) return;
const {mkSlider,mkChips,mkBtn,ln,tx,circ,clamp,esc,T,P2,phColor} = L.H;
const EXPS = L.EXPS, PHYS = L.PHYS, G = 9.8;

/* ---------- WHY: purpose of every experiment (l=daily life, j=careers, h=think about it) ---------- */
Object.assign(L.WHY, {
 spring:{ l:['பைக்/பஸ்ஸின் shock absorber, எடை பார்க்கும் spring தராசு, மெத்தை, பேனாவின் spring — எல்லாம் இந்த விதியில்தான் இயங்குகின்றன.','Bike/bus shock absorbers, spring balances, mattresses and pen springs all work on this rule.'],
   j:['வாகனப் பொறியாளர், மெக்கானிக்கல் இன்ஜினியர், கருவி வடிவமைப்பாளர்.','Automobile and mechanical engineers, instrument designers.'],
   h:['கடைக்காரரின் spring தராசு பொருளின் எடையை எப்படி "படிக்கிறது"? நீட்சியை அளந்துதான்!','How does a shop\'s spring balance "read" weight? By measuring how far the spring stretches!'] },
 projectile:{ l:['கிரிக்கெட்டில் பந்தை எறிதல், ஈட்டி எறிதல், நீர் பீய்ச்சுதல் — எந்தக் கோணத்தில் எறிவது நல்லது என்று இது சொல்லும்.','Throwing a cricket ball, javelin, a jet of water — this tells you the best angle to throw.'],
   j:['விளையாட்டுப் பயிற்சியாளர், ராக்கெட்/விண்வெளிப் பொறியாளர், விளையாட்டு (game) வடிவமைப்பாளர்.','Sports coach, rocket/space engineer, game designer.'],
   h:['விளையாட்டு வீரர்கள் கணக்குப் போடாமலே 45°-க்கு அருகில் எறிவது ஏன்? அனுபவம் இந்த விதியைக் கண்டுபிடித்துவிட்டது!','Why do athletes throw near 45° without doing sums? Practice has "discovered" this rule!'] },
 lever:{ l:['கத்தரிக்கோல், ஆணி பிடுங்கி, கிணற்றுத் துலா, சீ-சா, வண்டிச் சக்கரம் மாற்றும் spanner — எல்லாம் நெம்புகோல்.','Scissors, claw hammer, the village well-sweep (thulā), seesaw, a wheel spanner — all levers.'],
   j:['கட்டுமானப் பொறியாளர், கிரேன் இயக்குபவர், இயந்திரத் தொழிலாளர்.','Civil engineer, crane operator, machine workers.'],
   h:['நீளமான spanner கொண்டால் இறுக்கமான nut எளிதில் திறக்கிறது. ஏன்? தூரம் கூடினால் திருப்புத்திறன் கூடும்!','A long spanner opens a tight nut easily — why? More distance means more turning effect!'] },
 density:{ l:['கப்பல் மிதப்பது, கடலில் நீந்துவது எளிது, பால்/தேனில் கலப்படம் சோதிப்பது, லைஃப் ஜாக்கெட்.','Why ships float, why it\'s easier to swim in the sea, testing milk/honey purity, life jackets.'],
   j:['கப்பல் கட்டும் பொறியாளர், மீனவர், உணவுத் தர ஆய்வாளர், மீட்புப் படை.','Shipbuilder, fisher, food-quality inspector, rescue teams.'],
   h:['இரும்பு நீரில் மூழ்கும், ஆனால் இரும்புக் கப்பல் மிதக்கிறது! உள்ளே காற்று இருப்பதால் மொத்த அடர்த்தி நீரை விடக் குறைவு.','Iron sinks, yet an iron ship floats! The air inside makes its overall density lower than water.'] },
 ohm:{ l:['மின்விசிறி வேகம், பல்பு ஒளி, செல்போன் charger, இஸ்திரிப் பெட்டி சூடாவது — எல்லாம் V, I, R தொடர்பு.','Fan speed, bulb brightness, phone chargers, an iron getting hot — all follow V, I, R.'],
   j:['எலக்ட்ரீஷியன், மின் பொறியாளர், எலக்ட்ரானிக்ஸ் தொழில்நுட்பம், சோலார் நிறுவுநர்.','Electrician, electrical engineer, electronics technician, solar installer.'],
   h:['மிகச் சிறிய பியூஸ் ஏன் பெரிய தீ விபத்தைத் தடுக்கிறது? மின்னோட்டம் அளவு மீறினால் அது உருகி இணைப்பைத் துண்டிக்கும்.','How does a tiny fuse prevent a big fire? When current exceeds the limit it melts and cuts the circuit.'] },
 circuit:{ l:['வீட்டுக்குள் ஒவ்வொரு பல்பும் தனியாக எரிவது (பக்க இணைப்பு); தீபாவளி சீரியல் விளக்கில் ஒன்று போனால் எல்லாம் அணைவது (தொடர்).','Why each home light works on its own (parallel); why one dead bulb switches off a whole festival light string (series).'],
   j:['எலக்ட்ரீஷியன், கட்டிட மின் வடிவமைப்பாளர், மின்னணுப் பொறியாளர்.','Electrician, building-wiring designer, electronics engineer.'],
   h:['வீட்டில் எல்லா சாதனங்களையும் ஒரே plug-ல் சொருகினால் ஏன் ஆபத்து? பக்க இணைப்பில் பொருட்கள் கூடினால் மொத்த மின்னோட்டம் கூடி கம்பி சூடாகும்.','Why is plugging everything into one socket risky? More parallel devices means more total current and hotter wires.'] },
 fraction:{ l:['பிரியாணி/பீட்சா பங்கிடுதல், ¼ கிலோ, ½ லிட்டர் அளவுகள், தள்ளுபடி, வரைபடத்தின் அளவு.','Sharing biryani or pizza, ¼ kg and ½ litre measures, discounts, map scales.'],
   j:['சமையல் கலைஞர், தையல்காரர், தச்சர், கணக்காளர், மருந்தாளர் (dose).','Cook, tailor, carpenter, accountant, pharmacist (doses).'],
   h:['"½ கிலோவும் 500 கிராமும்" ஒன்றே என்று உனக்குத் தெரியும் — அதுதான் சம பின்னம்!','You already know ½ kg and 500 g are the same — that is equivalent fractions!'] },
 line:{ l:['ஆட்டோ கட்டணம் = நிலைக் கட்டணம் + கி.மீ × கட்டணம். இதுவே y = mx + c! மொபைல் plan, மின்கட்டணம் போன்றவையும்.','Auto fare = fixed charge + km × rate. That is y = mx + c! Mobile plans and electricity bills too.'],
   j:['தரவு ஆய்வாளர் (data analyst), பொருளாதார நிபுணர், பொறியாளர், வணிகத் திட்டமிடுபவர்.','Data analyst, economist, engineer, business planner.'],
   h:['ஒரு ஆட்டோவுக்கு நிலைக் கட்டணம் ₹30, கி.மீ-க்கு ₹15 எனில் 10 கி.மீ = ? நீ ஏற்கனவே y = mx + c போடுகிறாய்!','Auto: ₹30 fixed + ₹15/km. 10 km = ? You are already using y = mx + c!'] },
 quad:{ l:['எறிந்த பந்தின் பாதை, பாலத்தின் வளைவு, செயற்கைக்கோள் dish, வாகன headlight கண்ணாடி.','Path of a thrown ball, bridge arches, satellite dishes, headlight reflectors.'],
   j:['பொறியாளர், கட்டிடக் கலைஞர், விளையாட்டு அறிவியலாளர், விண்வெளி ஆய்வு.','Engineer, architect, sports scientist, space research.'],
   h:['ஏன் satellite dish வளைவாக இருக்கிறது? பரவளையம் எல்லா சிக்னலையும் ஒரே புள்ளியில் சேர்க்கும்!','Why is a satellite dish curved? A parabola gathers all signals at one point!'] },
 pendulum:{ l:['ஊஞ்சல், சுவர்க் கடிகாரம், நிலநடுக்கம் அளக்கும் கருவி. ஊஞ்சலில் கனமானவர் இலகுவானவர் இருவருக்கும் ஒரே நேரம்!','Swings, wall clocks, earthquake detectors. A heavy and a light person take the same time on a swing!'],
   j:['கடிகாரத் தொழில்நுட்பம், புவி அறிவியலாளர், பொறியாளர்.','Clock-making, geoscientists, engineers.'],
   h:['உன் ஊஞ்சலை வேகமாக ஆட வைக்க கயிற்றை நீளமாக்குவாயா, குறைப்பாயா?','To make your swing go faster, would you make the rope longer or shorter?'] },
 refraction:{ l:['மூக்குக் கண்ணாடி, கேமரா லென்ஸ், நீரில் குச்சி வளைந்து தெரிதல், வைரம் ஜொலிப்பது.','Spectacles, camera lenses, a stick looking bent in water, why diamonds sparkle.'],
   j:['கண் மருத்துவர், கண்ணாடி நிபுணர் (optometrist), கேமரா/ஒளியிழை பொறியாளர்.','Eye doctor, optometrist, camera and optical-fibre engineers.'],
   h:['இணையம் கடலுக்கடியில் ஒளிக்கற்றை வழியாக வருகிறது — ஒளியை வளைத்து வழிநடத்தும் தொழில்நுட்பம் இது.','Internet travels under the sea as light in glass fibres — technology that guides light by bending it.'] },
 ph:{ l:['மண்ணின் pH (விவசாயம்), நீச்சல் குள நீர், வயிற்று எரிச்சலுக்கு ஆன்டாசிட், சோப்பு/ஷாம்பூ.','Soil pH in farming, swimming-pool water, antacids for acidity, soaps and shampoos.'],
   j:['விவசாய அலுவலர், மருத்துவ ஆய்வகம், குடிநீர் சுத்திகரிப்பு, உணவுத் தொழில்.','Agriculture officer, medical lab, water treatment, food industry.'],
   h:['அதிக அமில மண்ணில் பயிர் வளராது. விவசாயி மண்ணைச் சோதித்து சுண்ணாம்பு சேர்ப்பது ஏன்? pH-ஐ சரிசெய்ய!','Crops struggle in very acidic soil. Why do farmers test soil and add lime? To correct the pH!'] },
 wave:{ l:['ஒலி, ரேடியோ, மொபைல் சிக்னல், கடல் அலை, இசை — எல்லாம் அலைகள்.','Sound, radio, mobile signals, sea waves, music — all waves.'],
   j:['தொலைத்தொடர்புப் பொறியாளர், ஒலிப் பொறியாளர், மருத்துவ ultrasound நிபுணர், இசைக் கலைஞர்.','Telecom engineer, sound engineer, ultrasound specialist, musician.'],
   h:['கடலில் அலை கரைக்கு வருகிறது, ஆனால் மிதக்கும் படகு கரைக்கு வருவதில்லை — ஏன்? நகர்வது ஆற்றல்தான், நீர் அல்ல!','Waves reach the shore but a floating boat doesn\'t — why? Only energy travels, not the water!'] },
 gas:{ l:['சைக்கிள் பம்ப், ஊசி (syringe), டயரில் காற்று, ஆழ்கடலில் மூழ்குபவர், பலூன்.','Bicycle pump, syringe, tyre air, scuba divers, balloons.'],
   j:['மருத்துவ உபகரணத் தொழில்நுட்பம், வாகனப் பொறியாளர், மூழ்கு வீரர் பயிற்சியாளர்.','Medical-equipment technician, automobile engineer, dive instructor.'],
   h:['சைக்கிள் பம்ப் முனையை அடைத்துவிட்டு அழுத்தினால் கடினமாகிறது; ஏன்? இடம் குறைந்து அழுத்தம் கூடுகிறது!','Block a bicycle pump and push — it gets hard. Why? Less room means higher pressure!'] }
});

/* ---------- pure functions (unit-tested) ---------- */
Object.assign(PHYS, {
  fall:(h,k)=>{ if(!k) return Math.sqrt(2*h/G); let y=0,v=0,t=0; const dt=0.0005; while(y<h && t<60){ v+=(G-k*v*Math.abs(v))*dt; y+=v*dt; t+=dt; } return t; },
  speedDist:(v,t)=>v*t,
  moon:(a)=>({ lit:(1-Math.cos(a*Math.PI/180))/2, day:a/360*29.5 }),
  em:(N,I,core)=>{ const s=N*I*(core?20:1); return { s, clips:Math.min(12,Math.floor(N*I*(core?1:0.05)/20)) }; },
  skate:(h0,fr,secs)=>{ const a=0.35; let x=Math.sqrt(h0/a), vx=0, t=0, drift=0; const dt=0.0005, E0=G*a*x*x; while(t<secs){ const yp=2*a*x, ypp=2*a; const ax=-(G*yp+yp*ypp*vx*vx)/(1+yp*yp); vx+=ax*dt-(fr?0.4*vx*dt:0); x+=vx*dt; t+=dt; const E=0.5*vx*vx*(1+(2*a*x)**2)+G*a*x*x; if(!fr) drift=Math.max(drift,Math.abs(E-E0)/E0); } return {drift, vBottom:Math.sqrt(2*G*h0)}; },
  atom:(p,n,e)=>({ A:p+n, charge:p-e }),
  balance:(eq,co)=>{ const L={},R={}; eq.re.forEach((s,i)=>{ for(const k in s.a) L[k]=(L[k]||0)+s.a[k]*co[i]; }); eq.pr.forEach((s,i)=>{ for(const k in s.a) R[k]=(R[k]||0)+s.a[k]*co[eq.re.length+i]; }); const keys=Object.keys(Object.assign({},L,R)); return { L,R,keys, ok:keys.every(k=>(L[k]||0)===(R[k]||0)) }; },
  select:(p,sBrownGreenEnv)=>{ const sb=sBrownGreenEnv.sb, sg=sBrownGreenEnv.sg; return p*sb/(p*sb+(1-p)*sg); },
  gcd:(a,b)=>b?PHYS.gcd(b,a%b):a,
  ratio:(a,b,k)=>{ const A=a*k,B=b*k,g=PHYS.gcd(A,B); return { A,B,simp:[A/g,B/g] }; },
  rect:(w,h)=>({ area:w*h, per:2*(w+h) }),
  pyth:(a,b)=>Math.sqrt(a*a+b*b),
  interest:(P,r,t)=>({ simple:P*(1+r/100*t), compound:P*Math.pow(1+r/100,t) }),
  phase:(Tc)=>Tc<0?'solid':(Tc<100?'liquid':'gas')
});
const inr = v => '₹'+Math.round(v).toLocaleString('en-IN');

/* 1. free fall */
EXPS.push({ id:'freefall', icon:'🪂', c:[8,10], s:'physics', t:['விழும் பொருள் — கனமானது முதலில் விழுமா?','Falling objects — does heavy land first?'], mins:5,
  goal:['கனமான, இலகுவான பொருட்கள் ஒரே உயரத்திலிருந்து விழுந்தால் எது முதலில் தரையைத் தொடும்?','Dropped from the same height, which lands first — heavy or light?'],
  why:{ l:['மழைத்துளி, பாராசூட், கீழே விழும் தேங்காய் — எவ்வளவு வேகமாக விழும் என்று மதிப்பிட.','Raindrops, parachutes, a falling coconut — estimating how fast things fall.'],
        j:['விமானப் பொறியாளர், பாராசூட் வடிவமைப்பாளர், கட்டிட பாதுகாப்பு நிபுணர், விண்வெளி வீரர் பயிற்சி.','Aircraft engineer, parachute designer, building-safety expert, astronaut training.'],
        h:['நிலவில் காற்று இல்லை; அங்கு இறகும் சுத்தியலும் ஒரே நேரத்தில் விழும் — 1971-ல் அப்பல்லோ 15 விண்வெளி வீரர் இதைச் செய்து காட்டினார்.','There is no air on the Moon, so a feather and hammer fall together — Apollo 15\'s astronaut showed this in 1971.'] },
  predict:{ q:['காற்றே இல்லாத இடத்தில் ஒரு கல்லும் ஒரு இறகும் ஒரே உயரத்திலிருந்து விழுந்தால்?','With no air at all, a stone and a feather are dropped together…'],
    o:[['கல் முதலில்','Stone first'],['இறகு முதலில்','Feather first'],['இரண்டும் ஒரே நேரத்தில்','Both together']], a:2, why:['காற்றுத் தடை இல்லையென்றால் எல்லாப் பொருட்களும் ஒரே முடுக்கத்தில் (g = 9.8 m/s²) விழும்.','Without air resistance everything falls with the same acceleration (g = 9.8 m/s²).'] },
  build(ctx){
    const c = ctx.ctrl, S = { air:false, t:0, run:false };
    const h = mkSlider(c,['உயரம்','Height'],5,80,5,40,'m',()=>{ info(); reset(); });
    mkChips(c,['சூழல்','Surroundings'],[[false,'வெற்றிடம் (காற்றில்லை)','Vacuum (no air)'],[true,'காற்று உண்டு','With air']],false,v=>{ S.air=v; info(); reset(); });
    mkBtn(c,['⬇ விடு','⬇ Drop'],()=>{ S.t=0; S.run=true; },'p');
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d'), kBall=0, kPaper=0.3;
    function pos(k,t){ if(!k) return 0.5*G*t*t; let v=0,y=0; const dt=0.01; for(let s=0;s<t;s+=dt){ v+=(G-k*v*Math.abs(v))*dt; y+=v*dt; } return y; }
    function times(){ return [PHYS.fall(h.get(),0), PHYS.fall(h.get(),S.air?kPaper:0)]; }
    function info(){ const [a,b]=times(); ctx.read([[T('கல் நேரம்','Stone time'),a.toFixed(2)+' s'],[T('காகிதம்/இறகு நேரம்','Paper/feather time'),b.toFixed(2)+' s'],[T('சூத்திரம் t = √(2h÷g)','Formula t = √(2h÷g)'),Math.sqrt(2*h.get()/G).toFixed(2)+' s'],[T('வேறுபாடு','Difference'),(b-a).toFixed(2)+' s']]); }
    function reset(){ S.t=0; S.run=false; } info();
    ctx.loop(dt=>{ if(S.run) S.t+=dt; const H=h.get(), sc=230/H; g.clearRect(0,0,640,330); g.fillStyle='#bfe3a4'; g.fillRect(0,290,640,40);
      for(let m=0;m<=H;m+=H/5){ ln(g,60,40+m*sc,80,40+m*sc,'#999',1.5); tx(g,m.toFixed(0)+' m',55,44+m*sc,'#666',11,'right'); }
      [[220,'🪨',0,T('கல்','stone')],[420,S.air?'📄':'🪶',S.air?kPaper:0,S.air?T('காகிதம்','paper'):T('இறகு','feather')]].forEach(([x,ic,k,nm])=>{ const y=Math.min(H,pos(k,S.t)); const done=y>=H-1e-6&&S.t>0; tx(g,ic,x,40+y*sc+10,'#000',30,'center'); tx(g,nm,x,318,'#333',12,'center'); if(done) tx(g,'✔ '+PHYS.fall(H,k).toFixed(2)+' s',x,70+y*sc,'#2e9e4f',13,'center'); });
      tx(g,S.run?'⏱ '+S.t.toFixed(2)+' s':'',320,24,'#333',15,'center'); });
    return { cols:[['உயரம் (m)','h (m)'],['சூழல்','Air?'],['கல் (s)','Stone (s)'],['இறகு (s)','Feather (s)']], rec:()=>{ const [a,b]=times(); return [h.get(), S.air?T('காற்று','air'):T('வெற்றிடம்','vacuum'), a.toFixed(2), b.toFixed(2)]; } };
  },
  key:['**காற்று இல்லாவிட்டால் எல்லாப் பொருட்களும் ஒரே நேரத்தில் விழும்** (எடை பொருட்டல்ல). நேரம் t = √(2h ÷ g). காற்று இருக்கும்போது பரந்த, இலகுவான பொருள் (காகிதம், இறகு) காற்றுத் தடையால் மெதுவாக விழும் — பாராசூட் இதனால்தான் வேலை செய்கிறது.','**Without air everything falls together** (weight does not matter). Time t = √(2h ÷ g). With air, wide light things (paper, feather) are slowed by air resistance — that is how a parachute works.'],
  quiz:[{q:['வெற்றிடத்தில் 1 kg, 10 kg கற்கள் விழுந்தால்?','In a vacuum, 1 kg and 10 kg stones fall…'],o:[['10 kg முதலில்','10 kg first'],['ஒரே நேரத்தில்','together'],['1 kg முதலில்','1 kg first']],a:1,w:['முடுக்கம் g எல்லாவற்றுக்கும் ஒன்றே.','The same g for all.']},
        {q:['பாராசூட் ஏன் மெதுவாக இறக்குகிறது?','Why does a parachute slow you down?'],o:[['காற்றுத் தடை அதிகம்','more air resistance'],['ஈர்ப்பு குறையும்','less gravity'],['எடை குறையும்','less weight']],a:0,w:['பெரிய பரப்பு → அதிக காற்றுத் தடை.','Big area → big air resistance.']}]
});

/* 2. motion: speed-distance-time */
EXPS.push({ id:'motion', icon:'🚗', c:[6,9], s:'physics', t:['வேகம் – தூரம் – நேரம்','Speed – distance – time'], mins:5,
  goal:['வேகமும் நேரமும் தெரிந்தால் தூரத்தைக் கணக்கிடுவது எப்படி? வரைபடம் என்ன சொல்கிறது?','How do speed and time give distance? What does the graph show?'],
  why:{ l:['பேருந்து/ரயில் எப்போது வந்துசேரும், பயண நேரம் கணிப்பது, Google Maps நேரம் எப்படி வருகிறது.','When a bus or train arrives, estimating travel time, how maps give arrival time.'],
        j:['போக்குவரத்துத் திட்டமிடுபவர், விமானி, ஓட்டுநர், விளையாட்டு வீரர் (ஓட்டப்பந்தய நேரம்).','Transport planner, pilot, driver, athlete (race timing).'],
        h:['60 km/h வேகத்தில் 150 km செல்ல எவ்வளவு நேரம்? 150 ÷ 60 = 2.5 மணி — நீ இப்போதே பயண நேரம் கணிக்கிறாய்!','150 km at 60 km/h takes 150 ÷ 60 = 2.5 h — you are already estimating travel time!'] },
  predict:{ q:['ஒரு பேருந்து 60 km/h வேகத்தில் 2 மணி நேரம் சென்றால் தூரம்?','A bus travels at 60 km/h for 2 hours. Distance?'],
    o:[['30 km','30 km'],['62 km','62 km'],['120 km','120 km'],['240 km','240 km']], a:2, why:['தூரம் = வேகம் × நேரம் = 60 × 2.','Distance = speed × time = 60 × 2.'] },
  build(ctx){
    const c = ctx.ctrl, S = { t:0, run:false, hist:[] };
    const v = mkSlider(c,['வேகம்','Speed'],1,20,1,8,'m/s',()=>{ S.t=0; S.hist=[]; info(); });
    mkBtn(c,['▶ ஓடு / ⏸ நிறுத்து','▶ Run / ⏸ Pause'],()=>{ S.run=!S.run; },'p'); mkBtn(c,['↺ மீண்டும்','↺ Reset'],()=>{ S.t=0; S.hist=[]; S.run=false; info(); });
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d');
    function info(){ ctx.read([[T('வேகம்','Speed'),v.get()+' m/s'],[T('நேரம்','Time'),S.t.toFixed(1)+' s'],[T('தூரம் = வேகம் × நேரம்','Distance = speed × time'),PHYS.speedDist(v.get(),S.t).toFixed(1)+' m'],[T('km/h-ல்','In km/h'),(v.get()*3.6).toFixed(0)+' km/h']]); } info();
    let acc=0;
    ctx.loop(dt=>{ if(S.run){ S.t+=dt; if(S.t>20){ S.t=20; S.run=false; } acc+=dt; if(acc>0.1){ acc=0; S.hist.push([S.t,v.get()*S.t]); } } g.clearRect(0,0,640,330);
      const d=v.get()*S.t, px=30+ (d%400)/400*560; g.fillStyle='#d9dde8'; g.fillRect(0,60,640,50); for(let x=0;x<640;x+=40) ln(g,x,85,x+20,85,'#fff',3); tx(g,'🚗',px,98,'#000',32,'center');
      tx(g,T('தூரம் (m)','Distance (m)'),12,150,'#555',11); const ox=60, oy=300, w=540, h=120; ln(g,ox,oy,ox+w,oy,'#333',2); ln(g,ox,oy,ox,oy-h,'#333',2); tx(g,T('நேரம் (s) →','Time (s) →'),ox+w,oy+16,'#555',11,'right'); const maxd=20*20;
      g.strokeStyle='#4a5bd0'; g.lineWidth=3; g.beginPath(); S.hist.forEach((p,i)=>{ const x=ox+p[0]/20*w, y=oy-p[1]/maxd*h; i?g.lineTo(x,y):g.moveTo(x,y); }); g.stroke();
      g.setLineDash([4,4]); ln(g,ox,oy,ox+w,oy-v.get()*20/maxd*h,'#bbb',1.5); g.setLineDash([]); if(Math.floor(S.t*10)%2===0||!S.run) info(); });
    return { cols:[['வேகம் (m/s)','v (m/s)'],['நேரம் (s)','t (s)'],['தூரம் (m)','d (m)']], rec:()=>[v.get(),S.t.toFixed(1),PHYS.speedDist(v.get(),S.t).toFixed(1)] };
  },
  key:['**தூரம் = வேகம் × நேரம்.** வேகம் = தூரம் ÷ நேரம்; நேரம் = தூரம் ÷ வேகம். தூரம்–நேர வரைபடம் நேர்கோடு; **கோட்டின் சரிவு = வேகம்**. வேகமாகச் சென்றால் கோடு செங்குத்தாகும்.','**Distance = speed × time.** Speed = distance ÷ time; time = distance ÷ speed. The distance–time graph is a straight line and **its slope is the speed**. Faster means a steeper line.'],
  quiz:[{q:['20 m/s வேகத்தில் 5 s-ல் தூரம்?','Distance in 5 s at 20 m/s?'],o:[['4 m','4 m'],['25 m','25 m'],['100 m','100 m']],a:2,w:['20 × 5 = 100.','20 × 5 = 100.']},
        {q:['120 km தூரத்தை 2 மணியில் சென்றால் வேகம்?','120 km in 2 hours — speed?'],o:[['60 km/h','60 km/h'],['240 km/h','240 km/h'],['122 km/h','122 km/h']],a:0,w:['120 ÷ 2 = 60.','120 ÷ 2 = 60.']}]
});

/* 3. moon phases */
const PH_NAMES = [['அமாவாசை (புது நிலவு)','New moon'],['வளர்பிறை — பிறை','Waxing crescent'],['வளர்பிறை — அரை நிலவு','First quarter'],['வளர்பிறை — பெரும்பகுதி','Waxing gibbous'],['பௌர்ணமி (முழு நிலவு)','Full moon'],['தேய்பிறை — பெரும்பகுதி','Waning gibbous'],['தேய்பிறை — அரை நிலவு','Last quarter'],['தேய்பிறை — பிறை','Waning crescent']];
EXPS.push({ id:'moon', icon:'🌙', c:[5,8], s:'physics', t:['நிலவின் கலைகள்','Phases of the Moon'], mins:5,
  goal:['நிலா ஏன் தினமும் வடிவம் மாறுகிறது? அமாவாசை, பௌர்ணமி எப்படி வருகின்றன?','Why does the Moon change shape every night? How do Amavasya and Pournami happen?'],
  why:{ l:['நம் பண்டிகைகள், விரதங்கள், பஞ்சாங்கம் நிலவின் கலைகளை வைத்தே. மீனவர்களும் விவசாயிகளும் அலை, நிலவொளி பார்த்துத் திட்டமிடுகிறார்கள்.','Our festivals, fasts and the Panchangam follow the Moon\'s phases. Fishers and farmers plan by tides and moonlight.'],
        j:['வானியலாளர், விண்வெளி விஞ்ஞானி, கடல் ஆய்வாளர், ஆசிரியர்.','Astronomer, space scientist, ocean researcher, teacher.'],
        h:['நிலா தானாக ஒளிர்வதில்லை — சூரிய ஒளியைத் திருப்பி அனுப்புகிறது. நமக்குத் தெரியும் ஒளிரும் பகுதிதான் மாறுகிறது; நிலா எப்போதும் பாதி ஒளிர்கிறது!','The Moon makes no light — it reflects sunlight. Always half is lit; what changes is how much of that lit half we can see!'] },
  predict:{ q:['முழு நிலவு (பௌர்ணமி) அன்று நிலா எங்கே இருக்கும்?','On a full-moon night, where is the Moon?'],
    o:[['பூமிக்கும் சூரியனுக்கும் இடையில்','Between Earth and Sun'],['பூமிக்குப் பின்னால் (சூரியனுக்கு எதிர்ப்பக்கம்)','Behind Earth (opposite the Sun)'],['சூரியனுக்கு மிக அருகில்','Very near the Sun']], a:1, why:['பௌர்ணமியில் நிலா பூமியின் மறுபக்கம்; சூரிய ஒளிபட்ட முழுப் பகுதியும் நமக்குத் தெரிகிறது.','At full moon the Moon is on the far side of Earth, so we see its whole lit face.'] },
  build(ctx){
    const c = ctx.ctrl;
    const a = mkSlider(c,['நிலவின் இடம் (சூரியனிலிருந்து கோணம்)','Moon position (angle from Sun)'],0,360,15,0,'°',()=>draw());
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d');
    const nameOf = al=> PH_NAMES[Math.round(al/45)%8];
    function draw(){ const al=a.get(), m=PHYS.moon(al); g.clearRect(0,0,640,330); g.fillStyle='#0b1030'; g.fillRect(0,0,640,330);
      const ex=270, ey=165, R=95; // sun
      const gr=g.createRadialGradient(40,165,5,40,165,70); gr.addColorStop(0,'#fff6a0'); gr.addColorStop(1,'rgba(255,200,40,0)'); g.fillStyle=gr; g.fillRect(0,95,120,140); circ(g,40,165,28,'#ffd23f'); tx(g,T('சூரியன்','Sun'),40,215,'#ffd23f',12,'center');
      for(let i=0;i<6;i++){ ln(g,75,95+i*28,ex-30,95+i*28,'rgba(255,230,120,.35)',1.5); }
      g.setLineDash([4,5]); g.strokeStyle='#556'; g.lineWidth=1; g.beginPath(); g.arc(ex,ey,R,0,Math.PI*2); g.stroke(); g.setLineDash([]);
      circ(g,ex,ey,24,'#2f6fd0'); g.save(); g.beginPath(); g.arc(ex,ey,24,-Math.PI/2,Math.PI/2); g.lineTo(ex,ey); g.closePath(); g.restore(); // earth lit half (left)
      g.fillStyle='#4aa0ff'; g.beginPath(); g.arc(ex,ey,24,Math.PI/2,Math.PI*1.5); g.fill(); tx(g,T('பூமி','Earth'),ex,ey+42,'#9cf',12,'center');
      const ar=al*Math.PI/180, mx=ex-R*Math.cos(ar), my=ey+R*Math.sin(ar); circ(g,mx,my,11,'#ddd'); g.fillStyle='#111'; g.beginPath(); g.arc(mx,my,11,-Math.PI/2,Math.PI/2); g.fill(); // night side right (away from sun)
      g.fillStyle='#ddd'; g.beginPath(); g.arc(mx,my,11,Math.PI/2,Math.PI*1.5); g.fill();
      // phase disc as seen from Earth
      const dx=520, dy=150, r=62; circ(g,dx,dy,r,'#1c2142','#556'); const t=Math.cos(ar), waxing=al>0&&al<180, sg=waxing?1:-1; g.fillStyle='#f3f0d8'; g.beginPath();
      if(al!==0){ if(sg>0){ g.arc(dx,dy,r,-Math.PI/2,Math.PI/2,false); for(let yy=r;yy>=-r;yy-=2){ const w=Math.sqrt(Math.max(0,r*r-yy*yy)); g.lineTo(dx+t*w,dy+yy); } }
        else { g.arc(dx,dy,r,Math.PI/2,Math.PI*1.5,false); for(let yy=-r;yy<=r;yy+=2){ const w=Math.sqrt(Math.max(0,r*r-yy*yy)); g.lineTo(dx-t*w,dy+yy); } } g.closePath(); g.fill(); }
      tx(g,T('பூமியிலிருந்து நாம் காண்பது','What we see from Earth'),dx,dy+r+22,'#cfd6ff',12,'center');
      tx(g,T('சூரிய ஒளி →','Sunlight →'),90,80,'#ffe58a',12);
      ctx.read([[T('கலை','Phase'),T(nameOf(al)[0],nameOf(al)[1])],[T('ஒளிரும் பகுதி (நமக்கு)','Lit part we see'),Math.round(m.lit*100)+'%'],[T('பிறை நாள் (≈)','Day of cycle (≈)'),m.day.toFixed(1)],[T('நிலவு–பூமி–சூரியன்','Moon–Earth–Sun'),al===0?T('நிலவு நடுவில்','Moon in between'):(al===180?T('பூமி நடுவில்','Earth in between'):T('சாய்வாக','at an angle'))]]); }
    draw();
    return { cols:[['கோணம்','Angle'],['கலை','Phase'],['ஒளி %','Lit %']], rec:()=>[a.get()+'°',T(nameOf(a.get())[0],nameOf(a.get())[1]).split(' ')[0],Math.round(PHYS.moon(a.get()).lit*100)+'%'] };
  },
  key:['**நிலா எப்போதும் பாதி ஒளிர்கிறது (சூரியன் பக்கம்).** பூமியிலிருந்து அந்த ஒளிப்பகுதியை எவ்வளவு பார்க்கிறோம் என்பதே கலை. நிலா சூரியன் பக்கம் இருந்தால் **அமாவாசை**; பூமிக்கு எதிர்ப்பக்கம் இருந்தால் **பௌர்ணமி**. ஒரு சுழற்சி ≈ 29.5 நாள்.','**The Moon is always half-lit (the side facing the Sun).** The phase is how much of that lit half we see from Earth. Moon on the Sun\'s side = **Amavasya (new moon)**; far side of Earth = **Pournami (full moon)**. One cycle ≈ 29.5 days.'],
  quiz:[{q:['அமாவாசை அன்று நிலா?','On Amavasya the Moon is…'],o:[['சூரியனுக்கும் பூமிக்கும் நடுவில்','between Sun and Earth'],['பூமிக்குப் பின்','behind Earth'],['மறைந்துவிடும்','destroyed']],a:0,w:['ஒளிபடாத பக்கம் நம்மை நோக்கும்.','Its unlit side faces us.']},
        {q:['வளர்பிறை என்றால்?','Valarpirai (waxing) means the lit part is…'],o:[['குறைகிறது','shrinking'],['வளர்கிறது','growing'],['மாறாது','fixed']],a:1,w:['அமாவாசை → பௌர்ணமி: ஒளிப்பகுதி வளரும்.','New → full: the lit part grows.']}]
});

/* 4. electromagnet */
EXPS.push({ id:'magnet', icon:'🧲', c:[8,10], s:'physics', t:['மின்காந்தம்','Electromagnet'], mins:5,
  goal:['மின்சாரத்தால் காந்தம் செய்ய முடியுமா? அதன் வலிமையை எப்படிக் கூட்டுவது?','Can electricity make a magnet? How do you make it stronger?'],
  why:{ l:['மின்சார மணி (calling bell), மின்விசிறி மோட்டார், ஸ்பீக்கர், பழைய இரும்புக் கிடங்கில் கார்களைத் தூக்கும் கிரேன்.','Electric bells, fan motors, loudspeakers, scrapyard cranes that lift cars.'],
        j:['மின் பொறியாளர், மருத்துவ MRI தொழில்நுட்பர், ரயில்வே (மேக்லெவ்) பொறியாளர், மோட்டார் வடிவமைப்பாளர்.','Electrical engineer, MRI technologist, railway/maglev engineer, motor designer.'],
        h:['சுவிட்சை அணைத்தால் மின்காந்தம் காந்தத்தன்மையை இழக்கும் — அதனால்தான் கிரேன் இரும்பை விடுவிக்க முடிகிறது!','Switch off, and an electromagnet stops being magnetic — that is how a crane lets go of the iron!'] },
  predict:{ q:['சுருளில் சுற்றுகளை இரட்டிப்பாக்கினால் காந்தம் வலிமை?','If you double the turns of the coil, the magnet becomes…'],
    o:[['பாதி','half as strong'],['மாறாது','the same'],['இரட்டிப்பு','twice as strong']], a:2, why:['பலம் ∝ சுற்றுகள் × மின்னோட்டம் (N × I).','Strength ∝ turns × current (N × I).'] },
  build(ctx){
    const c = ctx.ctrl, S = { core:true };
    const N = mkSlider(c,['சுற்றுகள்','Turns'],10,100,10,30,'',()=>draw());
    const I = mkSlider(c,['மின்னோட்டம்','Current'],0.5,3,0.5,1,'A',()=>draw());
    mkChips(c,['உள்ளகம்','Core'],[[true,'இரும்பு ஆணி','Iron nail'],[false,'காற்று (ஆணி இல்லை)','Air (no nail)']],true,v=>{ S.core=v; draw(); });
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d');
    function draw(){ const r=PHYS.em(N.get(),I.get(),S.core); g.clearRect(0,0,640,330); const y=110;
      ln(g,120,y,520,y,S.core?'#8a8f98':'rgba(0,0,0,0)',S.core?14:1); const turns=Math.round(N.get()/4); g.strokeStyle='#c0702a'; g.lineWidth=3; for(let i=0;i<turns;i++){ const x=200+i*(250/Math.max(turns,1)); g.beginPath(); g.ellipse(x,y,7,22,0,0,Math.PI*2); g.stroke(); }
      ln(g,200,y-22,160,40,'#c0702a',2); ln(g,160,40,80,40,'#c0702a',2); ln(g,450,y-22,470,40,'#c0702a',2); ln(g,470,40,560,40,'#c0702a',2); g.fillStyle='#f4f8ff'; g.fillRect(60,28,26,24); tx(g,'🔋',72,48,'#000',22,'center'); tx(g,I.get()+' A',320,34,'#c00',14,'center');
      for(let i=0;i<r.clips;i++){ g.fillStyle='#4a5bd0'; g.fillRect(500,y+10+i*14,28,9); g.strokeStyle='#223'; g.strokeRect(500,y+10+i*14,28,9); } tx(g,T('தூக்கிய பேப்பர் கிளிப்:','Paper clips lifted:')+' '+r.clips,320,300,'#333',16,'center');
      const f=clamp(r.s/6000,0,1); g.strokeStyle='rgba(74,91,208,'+(0.15+0.85*f)+')'; g.lineWidth=2; for(let k=1;k<=3;k++){ g.beginPath(); g.ellipse(335,y,230+k*18*f*3,40+k*26*f,0,0,Math.PI*2); g.stroke(); }
      ctx.read([[T('காந்த வலிமை (N × I × உள்ளகம்)','Strength (N × I × core)'),r.s.toFixed(0)],[T('இரும்புக் கிளிப்புகள்','Clips lifted'),r.clips],[T('உள்ளகம்','Core'),S.core?T('இரும்பு ✅','iron ✅'):T('இல்லை','none')],[T('சுருள் சுற்றுகள் × I','Turns × I'),N.get()+' × '+I.get()]]); }
    draw();
    return { cols:[['சுற்று','Turns'],['I (A)','I (A)'],['உள்ளகம்','Core'],['கிளிப்','Clips']], rec:()=>[N.get(),I.get(),S.core?T('இரும்பு','iron'):T('இல்லை','none'),PHYS.em(N.get(),I.get(),S.core).clips] };
  },
  key:['**மின்சாரம் காந்தப் புலத்தை உண்டாக்கும்.** சுருளில் சுற்று கூட்டினாலும், மின்னோட்டம் கூட்டினாலும், **இரும்பு உள்ளகம்** வைத்தாலும் காந்தம் வலிமையாகும். மின்சாரத்தை நிறுத்தினால் காந்தத்தன்மை போய்விடும் — இதுவே மின்காந்தத்தின் பெரிய பயன்.','**Electric current makes a magnetic field.** More turns, more current, or an **iron core** all strengthen it. Switch off and it stops being a magnet — the big advantage of electromagnets.'],
  quiz:[{q:['காந்தத்தை அணைத்து விடுவிக்க முடிவது எந்தக் காந்தத்தில்?','Which magnet can be switched off?'],o:[['மின்காந்தம்','electromagnet'],['நிலைக் காந்தம்','bar magnet'],['இரண்டும்','both']],a:0,w:['மின்சாரம் நிறுத்தினால் போதும்.','Just stop the current.']},
        {q:['இரும்பு ஆணியை எடுத்துவிட்டால் வலிமை?','Remove the iron nail — strength…'],o:[['கூடும்','rises'],['மிகவும் குறையும்','drops a lot'],['மாறாது','same']],a:1,w:['இரும்பு காந்தப் புலத்தை பல மடங்கு பெருக்கும்.','Iron multiplies the field many times.']}]
});

/* 5. energy skate */
EXPS.push({ id:'skate', icon:'🛹', c:[8,10], s:'physics', t:['ஆற்றல் — சறுக்கு பூங்கா','Energy — skate bowl'], mins:6,
  goal:['உயரத்தில் இருக்கும் ஆற்றலும் இயக்க ஆற்றலும் எப்படி மாறிக்கொள்கின்றன?','How do height-energy and motion-energy swap with each other?'],
  why:{ l:['ரோலர் கோஸ்டர், ஊஞ்சல், அணை நீர் மின்சாரம் தருவது, சைக்கிள் மேலிருந்து இறங்கும்போது வேகம் கூடுவது.','Roller coasters, swings, hydro-electric dams, a bicycle speeding up downhill.'],
        j:['நீர்மின் நிலையப் பொறியாளர், ரோலர் கோஸ்டர் வடிவமைப்பாளர், மின் உற்பத்தி ஆய்வாளர்.','Hydro-power engineer, roller-coaster designer, power-generation analyst.'],
        h:['மேட்டூர் அணையின் உயரத்திலுள்ள நீர் கீழே விழும்போது மின்சாரம் உண்டாகிறது — உயர ஆற்றல் மின் ஆற்றலாக மாறுகிறது!','Water high in a dam like Mettur falls and makes electricity — height-energy becomes electrical energy!'] },
  predict:{ q:['பந்து கிண்ணத்தின் மேலிருந்து அடிக்கு வரும்போது உயர ஆற்றல் (PE) என்ன ஆகிறது?','As the ball rolls from the top to the bottom of the bowl, its height-energy (PE)…'],
    o:[['மறைந்துவிடும்','just vanishes'],['இயக்க ஆற்றலாக (KE) மாறும்','turns into motion energy (KE)'],['கூடும்','increases']], a:1, why:['ஆற்றல் அழிவதில்லை; ஒரு வடிவிலிருந்து இன்னொன்றுக்கு மாறும். PE + KE = மாறிலி.','Energy is never lost, it changes form. PE + KE = constant.'] },
  build(ctx){
    const c = ctx.ctrl, S = { fr:false }, a=0.35;
    const h0 = mkSlider(c,['தொடக்க உயரம்','Start height'],0.5,5,0.5,3,'m',()=>release());
    const m = mkSlider(c,['நிறை','Mass'],1,5,1,2,'kg',()=>{});
    mkChips(c,['உராய்வு','Friction'],[[false,'இல்லை','None'],[true,'உண்டு','Yes']],false,v=>{ S.fr=v; release(); });
    mkBtn(c,['↺ மீண்டும் விடு','↺ Release again'],()=>release(),'p');
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d'); let x=0,vx=0;
    function release(){ x=Math.sqrt(h0.get()/a); vx=0; } release();
    const px=xm=>260+xm*55, py=ym=>290-ym*42;
    ctx.loop(dt=>{ const sub=40, d=dt/sub; for(let i=0;i<sub;i++){ const yp=2*a*x, ypp=2*a, ax=-(G*yp+yp*ypp*vx*vx)/(1+yp*yp); vx+=ax*d-(S.fr?0.4*vx*d:0); x+=vx*d; }
      const y=a*x*x, v2=vx*vx*(1+(2*a*x)**2), KE=0.5*m.get()*v2, PE=m.get()*G*y; g.clearRect(0,0,640,330);
      g.strokeStyle='#555'; g.lineWidth=5; g.beginPath(); for(let xm=-4.2;xm<=4.2;xm+=0.1){ const X=px(xm), Y=py(a*xm*xm); xm<-4.19?g.moveTo(X,Y):g.lineTo(X,Y); } g.stroke(); circ(g,px(x),py(y)-10,10,'#e24b4b','#600');
      const E0=m.get()*G*h0.get(), bx=520, sc=110/Math.max(E0,1); [[T('உயர ஆ.','PE'),PE,'#4a8fe0'],[T('இயக்க ஆ.','KE'),KE,'#e8a33d'],[T('மொத்தம்','Total'),KE+PE,'#2e9e4f']].forEach(([n,e,col],i)=>{ const hh=e*sc; g.fillStyle=col; g.fillRect(bx+i*34,290-hh,26,hh); tx(g,n,bx+i*34+13,306,'#333',10,'center'); });
      ctx.read([[T('உயர ஆற்றல் PE = mgh','PE = mgh'),PE.toFixed(1)+' J'],[T('இயக்க ஆற்றல் KE = ½mv²','KE = ½mv²'),KE.toFixed(1)+' J'],[T('மொத்தம்','Total'),(KE+PE).toFixed(1)+' J'],[T('வேகம்','Speed'),Math.sqrt(v2).toFixed(1)+' m/s']]); });
    return { cols:[['உயரம் (m)','h0 (m)'],['உராய்வு','Friction'],['அடியில் வேகம்','Speed at bottom']], rec:()=>[h0.get(),S.fr?T('உண்டு','yes'):T('இல்லை','no'),PHYS.skate(h0.get(),false,0.01).vBottom.toFixed(1)+' m/s'] };
  },
  key:['**PE + KE = மாறிலி (உராய்வு இல்லையெனில்).** மேலே PE அதிகம், அடியில் KE அதிகம். உராய்வு இருந்தால் மொத்த ஆற்றல் மெல்லக் குறையும் — அது வெப்பமாக மாறுகிறது (அழிவதில்லை). அடியில் வேகம் v = √(2gh).','**PE + KE stays constant (without friction).** High up there is more PE, at the bottom more KE. With friction the total slowly drops — it turns into heat (it is not destroyed). Speed at the bottom v = √(2gh).'],
  quiz:[{q:['அடியில் எந்த ஆற்றல் அதிகம்?','At the bottom which energy is biggest?'],o:[['PE','PE'],['KE','KE'],['இரண்டும் சமம்','both equal']],a:1,w:['உயரம் 0 → PE 0; எல்லாம் KE.','Height 0 → PE 0; all is KE.']},
        {q:['உராய்வில் இழந்த ஆற்றல் எங்கே போகிறது?','Where does energy lost to friction go?'],o:[['அழிகிறது','destroyed'],['வெப்பமாகிறது','becomes heat'],['PE-ஆகிறது','becomes PE']],a:1,w:['ஆற்றல் அழியாது.','Energy is never destroyed.']}]
});

/* 6. atom builder */
const ELS = [['H','ஹைட்ரஜன்','Hydrogen'],['He','ஹீலியம்','Helium'],['Li','லித்தியம்','Lithium'],['Be','பெரிலியம்','Beryllium'],['B','போரான்','Boron'],['C','கார்பன்','Carbon'],['N','நைட்ரஜன்','Nitrogen'],['O','ஆக்சிஜன்','Oxygen'],['F','ஃப்ளூரின்','Fluorine'],['Ne','நியான்','Neon']];
EXPS.push({ id:'atom', icon:'⚛️', c:[8,10], s:'chem', t:['அணுவை உருவாக்கு','Build an atom'], mins:6,
  goal:['புரோட்டான், நியூட்ரான், எலக்ட்ரான் — எது தனிமத்தைத் தீர்மானிக்கிறது?','Protons, neutrons, electrons — which one decides the element?'],
  why:{ l:['எல்லாப் பொருட்களும் அணுக்களால் ஆனவை — உன் உடல், காற்று, மொபைல் — எல்லாம்.','Everything is made of atoms — your body, air, your phone.'],
        j:['வேதியியலாளர், மருந்து ஆய்வாளர், அணுசக்தி/கதிரியக்க மருத்துவர், பொருள் அறிவியலாளர் (materials).','Chemist, drug researcher, nuclear/radiation medicine, materials scientist.'],
        h:['தங்கமும் இரும்பும் வேறு வேறானவை ஏன்? புரோட்டான் எண்ணிக்கை வேறு! அதுதான் தனிமத்தின் "அடையாள எண்".','Why are gold and iron different? Their proton numbers differ! That number is the element\'s "ID".'] },
  predict:{ q:['ஒரு அணுவில் புரோட்டான் எண்ணிக்கையை மாற்றினால் என்ன மாறும்?','If you change the number of protons in an atom, what changes?'],
    o:[['தனிமமே மாறும்','the element itself'],['நிறம் மட்டும்','only colour'],['ஒன்றும் மாறாது','nothing']], a:0, why:['புரோட்டான் எண் (அணு எண்) = தனிமத்தின் அடையாளம்.','Proton number (atomic number) = the element\'s identity.'] },
  build(ctx){
    const c = ctx.ctrl;
    const p = mkSlider(c,['புரோட்டான் (+)','Protons (+)'],1,10,1,6,'',()=>draw());
    const n = mkSlider(c,['நியூட்ரான் (0)','Neutrons (0)'],0,12,1,6,'',()=>draw());
    const e = mkSlider(c,['எலக்ட்ரான் (−)','Electrons (−)'],0,10,1,6,'',()=>draw());
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d'); let t=0;
    function info(){ const P=p.get(),N=n.get(),E=e.get(), r=PHYS.atom(P,N,E), el=ELS[P-1]; ctx.read([[T('தனிமம்','Element'),el[0]+' — '+T(el[1],el[2])],[T('நிறை எண் A = p + n','Mass number A = p + n'),r.A],[T('மின்னூட்டம்','Charge'),(r.charge>0?'+':'')+r.charge],[T('வகை','Type'),r.charge===0?T('நடுநிலை அணு','neutral atom'):(r.charge>0?T('நேர் அயனி','positive ion'):T('எதிர் அயனி','negative ion'))]]); }
    function draw(){ info(); } info();
    ctx.loop(dt=>{ t+=dt; const P=p.get(),N=n.get(),E=e.get(); g.clearRect(0,0,640,330); const cx=240,cy=165;
      g.strokeStyle='#d6dbef'; g.lineWidth=1; circ(g,cx,cy,60,null,'#d6dbef'); circ(g,cx,cy,110,null,'#d6dbef');
      const parts=[]; for(let i=0;i<P;i++) parts.push('p'); for(let i=0;i<N;i++) parts.push('n'); const rr=Math.min(34,12+Math.sqrt(parts.length)*6);
      parts.forEach((q,i)=>{ const ang=i*2.4, rad=Math.sqrt(i+0.5)/Math.sqrt(parts.length)*rr; circ(g,cx+rad*Math.cos(ang),cy+rad*Math.sin(ang),7,q==='p'?'#e24b4b':'#9aa0ad','#fff'); });
      for(let i=0;i<E;i++){ const shell=i<2?0:1, k=shell?i-2:i, cnt=shell?Math.min(8,E-2):Math.min(2,E), rad=shell?110:60, ang=t*(shell?0.7:1.2)+k*2*Math.PI/cnt; circ(g,cx+rad*Math.cos(ang),cy+rad*Math.sin(ang),6,'#2563eb','#fff'); }
      const el=ELS[P-1]; tx(g,el[0],480,140,'#222',70,'center'); tx(g,P+'p  '+N+'n  '+E+'e',480,185,'#555',16,'center'); tx(g,T(el[1],el[2]),480,215,'#3b2fc9',18,'center');
      tx(g,'🔴 '+T('புரோட்டான்','proton')+'  ⚪ '+T('நியூட்ரான்','neutron')+'  🔵 '+T('எலக்ட்ரான்','electron'),320,318,'#333',12,'center'); });
    return { cols:[['p','p'],['n','n'],['e','e'],['தனிமம்','Element'],['மின்னூட்டம்','Charge']], rec:()=>{ const r=PHYS.atom(p.get(),n.get(),e.get()); return [p.get(),n.get(),e.get(),ELS[p.get()-1][0]+'-'+r.A,(r.charge>0?'+':'')+r.charge]; } };
  },
  key:['**புரோட்டான் எண் = தனிமத்தின் அடையாளம்** (6 = கார்பன், 8 = ஆக்சிஜன்). **நியூட்ரானை** மாற்றினால் அதே தனிமத்தின் ஐசோடோப்பு (எ.கா. C-12, C-14). **எலக்ட்ரான்** புரோட்டானை விடக் குறைவு/அதிகம் எனில் அயனி (மின்னூட்டம் = p − e).','**Proton number = the element\'s ID** (6 = carbon, 8 = oxygen). Changing **neutrons** gives an isotope of the same element (C-12, C-14). Electrons different from protons make an ion (charge = p − e).'],
  quiz:[{q:['6 புரோட்டான், 6 எலக்ட்ரான் — மின்னூட்டம்?','6 protons, 6 electrons — charge?'],o:[['0','0'],['+6','+6'],['−6','−6']],a:0,w:['சமம் → நடுநிலை.','Equal → neutral.']},
        {q:['p = 11, e = 10 எனில்?','p = 11, e = 10 gives…'],o:[['நேர் அயனி (+1)','positive ion (+1)'],['எதிர் அயனி','negative ion'],['நடுநிலை','neutral']],a:0,w:['+11 − 10 = +1.','+11 − 10 = +1.']}]
});

/* 7. balancing equations */
const EQS = [
 { n:['நீர் உருவாதல்','Making water'], re:[{f:'H₂',a:{H:2}},{f:'O₂',a:{O:2}}], pr:[{f:'H₂O',a:{H:2,O:1}}], sol:[2,1,2] },
 { n:['அம்மோனியா','Ammonia'], re:[{f:'N₂',a:{N:2}},{f:'H₂',a:{H:2}}], pr:[{f:'NH₃',a:{N:1,H:3}}], sol:[1,3,2] },
 { n:['மீத்தேன் (சமையல் எரிவாயு) எரிதல்','Burning methane (cooking gas)'], re:[{f:'CH₄',a:{C:1,H:4}},{f:'O₂',a:{O:2}}], pr:[{f:'CO₂',a:{C:1,O:2}},{f:'H₂O',a:{H:2,O:1}}], sol:[1,2,1,2] },
 { n:['இரும்பு துருப்பிடித்தல்','Iron rusting'], re:[{f:'Fe',a:{Fe:1}},{f:'O₂',a:{O:2}}], pr:[{f:'Fe₂O₃',a:{Fe:2,O:3}}], sol:[4,3,2] },
 { n:['மெக்னீசியம் எரிதல்','Burning magnesium'], re:[{f:'Mg',a:{Mg:1}},{f:'O₂',a:{O:2}}], pr:[{f:'MgO',a:{Mg:1,O:1}}], sol:[2,1,2] }];
EXPS.push({ id:'balance', icon:'⚗️', c:[9,10], s:'chem', t:['வேதிச் சமன்பாடு சமப்படுத்து','Balance the equation'], mins:6,
  goal:['வினைக்கு முன்னும் பின்னும் ஒவ்வொரு அணுவும் சமமாக இருக்க எண்களை மாற்று.','Change the numbers so every kind of atom is equal before and after.'],
  why:{ l:['சமையல் எரிவாயு எரிவது, இரும்பு துருப்பிடிப்பது, உரம்/மருந்து தயாரிப்பு — எல்லாம் வேதிவினைகள்.','Burning cooking gas, rusting iron, making fertiliser and medicines — all chemical reactions.'],
        j:['வேதியியல் பொறியாளர், மருந்து/உரத் தொழிற்சாலை, ஆய்வக நிபுணர், சுற்றுச்சூழல் பொறியாளர்.','Chemical engineer, pharma/fertiliser industry, lab scientist, environmental engineer.'],
        h:['ஒரு தொழிற்சாலைக்கு எவ்வளவு மூலப்பொருள் வாங்க வேண்டும் என்று கணக்கிடுவது இந்தச் சமன்பாட்டில்தான் — தவறினால் பணம் வீண்!','A factory works out how much raw material to buy from this balance — get it wrong and money is wasted!'] },
  predict:{ q:['ஒரு வேதிவினையில் வினைக்கு முன்னும் பின்னும் அணுக்களின் மொத்த எண்ணிக்கை?','In a chemical reaction, the number of atoms before and after is…'],
    o:[['கூடும்','higher after'],['குறையும்','lower after'],['சமமாகவே இருக்கும்','always equal']], a:2, why:['பொருள் அழிவதுமில்லை, புதிதாக உருவாவதுமில்லை (நிறை அழியாமை விதி).','Matter is neither created nor destroyed (law of conservation of mass).'] },
  build(ctx){
    const c = ctx.ctrl, S = { eq:0 }; let cos=[], sl=[];
    const holder = document.createElement('div'); const chipsHost = document.createElement('div'); c.appendChild(chipsHost); c.appendChild(holder);
    mkChips(chipsHost,['வினை','Reaction'],EQS.map((q,i)=>[i,q.n[0],q.n[1]]),0,v=>{ S.eq=v; mk(); });
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d');
    function mk(){ holder.innerHTML=''; const q=EQS[S.eq]; cos=q.re.concat(q.pr).map(()=>1); sl=[]; q.re.concat(q.pr).forEach((s,i)=>{ sl.push(mkSlider(holder,[s.f+' — எண்ணிக்கை',s.f+' — number'],1,6,1,1,'',v=>{ cos[i]=v; draw(); })); }); draw(); }
    function draw(){ const q=EQS[S.eq], r=PHYS.balance(q,cos); g.clearRect(0,0,640,330);
      const parts=(arr,off)=>arr.map((s,i)=>(cos[off+i]>1?cos[off+i]:'')+s.f).join(' + '); tx(g,parts(q.re,0)+'  →  '+parts(q.pr,q.re.length),320,40,'#222',22,'center');
      const keys=r.keys; keys.forEach((k,i)=>{ const y=80+i*52, l=r.L[k]||0, rr=r.R[k]||0; tx(g,k,50,y+20,'#333',18,'center'); const unit=Math.min(24,200/Math.max(l,rr,1)); g.fillStyle='#4a8fe0'; g.fillRect(90,y,l*unit,18); g.fillStyle='#e8a33d'; g.fillRect(90,y+22,rr*unit,18); tx(g,String(l),100+l*unit,y+14,'#333',13); tx(g,String(rr),100+rr*unit,y+36,'#333',13); tx(g,l===rr?'✅':'❌',500,y+26,'#333',22,'center'); });
      tx(g,T('🟦 வினைக்கு முன்','🟦 before')+'   '+T('🟧 வினைக்குப் பின்','🟧 after'),320,320,'#555',12,'center');
      ctx.read([[T('சமநிலை?','Balanced?'),r.ok?T('ஆம் 🎉','Yes 🎉'):T('இன்னும் இல்லை','Not yet')],[T('இடது அணுக்கள்','Left atoms'),keys.map(k=>k+r.L[k]).join(' ')],[T('வலது அணுக்கள்','Right atoms'),keys.map(k=>k+(r.R[k]||0)).join(' ')],[T('குறிப்பு','Hint'),r.ok?T('நல்லது!','Well done!'):T('ஒரு அணுவைத் தேர்ந்து அதை முதலில் சமப்படுத்து','Fix one atom type at a time')]]); }
    mk();
    return { cols:[['வினை','Reaction'],['எண்கள்','Numbers'],['சமமா?','Balanced?']], rec:()=>[T(EQS[S.eq].n[0],EQS[S.eq].n[1]).split(' ')[0],cos.join(','),PHYS.balance(EQS[S.eq],cos).ok?'✅':'✖'] };
  },
  key:['**வினைக்கு முன்னும் பின்னும் ஒவ்வொரு தனிமத்தின் அணுக்களும் சமம்.** சமப்படுத்த சூத்திரத்தை மாற்றக் கூடாது; முன்னால் உள்ள எண்ணை (கெழு) மட்டுமே மாற்றலாம். இதுவே நிறை அழியாமை விதி.','**Every element has the same number of atoms before and after.** Never change a formula; only change the number in front (coefficient). This is the law of conservation of mass.'],
  quiz:[{q:['2H₂ + O₂ → 2H₂O — இடதில் H அணுக்கள்?','2H₂ + O₂ → 2H₂O — H atoms on the left?'],o:[['2','2'],['4','4'],['6','6']],a:1,w:['2 × 2 = 4.','2 × 2 = 4.']},
        {q:['சமப்படுத்தும்போது எதை மாற்றலாம்?','When balancing, what may you change?'],o:[['சூத்திரத்தின் சிறு எண்','small numbers inside formulas'],['முன்னால் உள்ள கெழு எண்','the coefficient in front'],['எதையும்','anything']],a:1,w:['H₂O ஐ H₂O₂ ஆக்கினால் வேறு பொருள்!','H₂O → H₂O₂ is a different substance!']}]
});

/* 8. natural selection */
EXPS.push({ id:'selection', icon:'🐇', c:[10,12], s:'bio', t:['இயற்கைத் தேர்வு','Natural selection'], mins:7,
  goal:['சூழலுக்குப் பொருந்தாத உயிரினங்கள் ஏன் குறைகின்றன? பல தலைமுறைகளில் என்ன மாறுகிறது?','Why do animals that don\'t suit their surroundings become fewer? What changes over generations?'],
  why:{ l:['பூச்சிகள் பூச்சிக்கொல்லிக்கு எதிர்ப்புத் திறன் பெறுவது, கிருமிகள் ஆன்டிபயாடிக்கை எதிர்ப்பது — அதே தத்துவம்.','Pests becoming resistant to pesticides and germs resisting antibiotics — the same idea.'],
        j:['உயிரியலாளர், மருத்துவ ஆராய்ச்சியாளர், விவசாய அறிவியலாளர், பாதுகாப்பு (conservation) நிபுணர்.','Biologist, medical researcher, agricultural scientist, conservation expert.'],
        h:['மருத்துவர் ஏன் "ஆன்டிபயாடிக் முழுக் கோர்ஸும் சாப்பிடு" என்கிறார்? பாதியில் நிறுத்தினால் வலிமையான கிருமிகள் மிஞ்சி பெருகும்!','Why does a doctor say "finish the whole antibiotic course"? Stop early and the toughest germs survive and multiply!'] },
  predict:{ q:['பச்சைப் புல்வெளியில் பச்சை, பழுப்பு முயல்களில் வேட்டையாடிகளிடம் அதிகம் தப்புவது?','On a green meadow, which bunnies escape predators more often?'],
    o:[['பழுப்பு முயல்','brown bunnies'],['பச்சை முயல்','green bunnies'],['இரண்டும் சமம்','both equally']], a:1, why:['சூழலுடன் கலந்து மறையும் நிறம் அதிகம் தப்பும்; அவை அதிகக் குட்டிகளை ஈனும்.','Colours that blend in survive more and have more young.'] },
  build(ctx){
    const c = ctx.ctrl, S = { env:'green', pop:[], hist:[] }, NN=40;
    const sv = ()=> S.env==='green' ? {sg:0.8,sb:0.4} : {sg:0.4,sb:0.8};
    function reset(){ S.pop=[]; for(let i=0;i<NN;i++) S.pop.push(i<NN/2?1:0); S.hist=[0.5]; draw(); }
    mkChips(c,['சூழல்','Environment'],[['green','பச்சைப் புல்வெளி','Green meadow'],['brown','பழுப்பு வறண்ட நிலம்','Dry brown land']],'green',v=>{ S.env=v; draw(); });
    const step=()=>{ const s=sv(); const surv=S.pop.filter(b=>Math.random()<(b?s.sb:s.sg)); const base=surv.length?surv:S.pop; const np=[]; for(let i=0;i<NN;i++) np.push(base[Math.floor(Math.random()*base.length)]); S.pop=np; S.hist.push(S.pop.reduce((a,b)=>a+b,0)/NN); draw(); };
    mkBtn(c,['▶ அடுத்த தலைமுறை','▶ Next generation'],step,'p'); mkBtn(c,['⏩ 10 தலைமுறை','⏩ 10 generations'],()=>{ for(let i=0;i<10;i++) step(); }); mkBtn(c,['↺ மீட்டமை','↺ Reset'],reset);
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d');
    function draw(){ g.clearRect(0,0,640,330); g.fillStyle=S.env==='green'?'#cfe8b0':'#d8c3a0'; g.fillRect(0,0,640,150);
      S.pop.forEach((b,i)=>{ const x=40+(i%20)*29, y=40+Math.floor(i/20)*58; g.fillStyle=b?'#8a5a2b':'#4aa04a'; g.beginPath(); g.ellipse(x,y+12,11,9,0,0,Math.PI*2); g.fill(); g.beginPath(); g.ellipse(x+9,y+4,5,6,0,0,Math.PI*2); g.fill(); g.fillRect(x+3,y-14,4,14); g.fillRect(x+9,y-14,4,14); circ(g,x+12,y+3,1.5,'#fff'); });
      const ox=50,oy=300,w=540,h=130; ln(g,ox,oy,ox,oy-h,'#333',2); ln(g,ox,oy,ox+w,oy,'#333',2); ln(g,ox,oy-h/2,ox+w,oy-h/2,'#ddd',1); tx(g,'100%',ox-6,oy-h+4,'#555',10,'right'); tx(g,'0%',ox-6,oy,'#555',10,'right'); tx(g,T('பழுப்பு முயல்கள் %','Brown bunnies %'),ox+4,oy-h-6,'#8a5a2b',12); tx(g,T('தலைமுறை →','generation →'),ox+w,oy+16,'#555',11,'right');
      g.strokeStyle='#8a5a2b'; g.lineWidth=3; g.beginPath(); S.hist.forEach((p,i)=>{ const x=ox+i/Math.max(20,S.hist.length-1)*w, y=oy-p*h; i?g.lineTo(x,y):g.moveTo(x,y); }); g.stroke();
      const brown=S.pop.reduce((a,b)=>a+b,0); ctx.read([[T('தலைமுறை','Generation'),S.hist.length-1],[T('பழுப்பு முயல்கள்','Brown bunnies'),brown+' / '+NN],[T('பச்சை முயல்கள்','Green bunnies'),(NN-brown)+' / '+NN],[T('தப்பும் வாய்ப்பு (பச்சை/பழுப்பு)','Survival chance (green/brown)'),Math.round(sv().sg*100)+'% / '+Math.round(sv().sb*100)+'%']]); }
    reset();
    return { cols:[['தலைமுறை','Gen'],['சூழல்','Environment'],['பழுப்பு %','Brown %']], rec:()=>[S.hist.length-1,S.env==='green'?T('பச்சை','green'):T('பழுப்பு','brown'),Math.round(S.hist[S.hist.length-1]*100)+'%'] };
  },
  key:['**சூழலுக்கு ஏற்ற பண்பு உள்ளவை அதிகம் தப்பிக் குட்டிகள் ஈனும்; அந்தப் பண்பு அடுத்த தலைமுறைகளில் பெருகும்.** இதுவே இயற்கைத் தேர்வு (டார்வின்). சூழல் மாறினால் எந்தப் பண்பு "பொருத்தமானது" என்பதும் மாறும். ஒரு தலைமுறையில் அல்ல, பல தலைமுறைகளில் நடக்கும் மாற்றம்.','**Animals with traits that suit the environment survive more and have more young; the trait spreads over generations.** This is natural selection (Darwin). If the environment changes, which trait "fits" also changes. It happens over many generations, not one.'],
  quiz:[{q:['பழுப்பு நிலத்தில் பல தலைமுறைக்குப் பின் எந்த முயல்கள் அதிகம்?','On brown land after many generations, which bunnies dominate?'],o:[['பச்சை','green'],['பழுப்பு','brown'],['சமம்','equal']],a:1,w:['மறைவது = தப்புவது.','Blending in = surviving.']},
        {q:['ஆன்டிபயாடிக் முழுக் கோர்ஸ் ஏன் அவசியம்?','Why finish an antibiotic course?'],o:[['வலிமையான கிருமிகள் மிஞ்சாமல் இருக்க','so tough germs don\'t survive'],['சுவைக்காக','for taste'],['காரணமில்லை','no reason']],a:0,w:['பாதியில் நிறுத்தினால் எதிர்ப்புக் கிருமிகள் தேர்வாகும்.','Stopping early selects resistant germs.']}]
});

/* 9. ratio recipes */
const RECIPES = [['சாதம் — அரிசி : தண்ணீர்','Rice — rice : water',1,2,'அரிசி','Rice','தண்ணீர்','Water','#f2d36b','#8fd0f5'],['பச்சை வண்ணம் — நீலம் : மஞ்சள்','Green paint — blue : yellow',2,3,'நீலம்','Blue','மஞ்சள்','Yellow','#4a8fe0','#f2c830'],['எலுமிச்சைப் பானம் — சாறு : தண்ணீர்','Lemonade — juice : water',1,5,'சாறு','Juice','தண்ணீர்','Water','#f5e04a','#8fd0f5']];
EXPS.push({ id:'ratio', icon:'🥣', c:[6,8], s:'maths', t:['விகிதம் — சமையல் அளவு','Ratio — recipe amounts'], mins:5,
  goal:['அளவை அதிகரித்தாலும் சுவை மாறாமல் இருக்க இரண்டு பொருட்களையும் எப்படி மாற்ற வேண்டும்?','To keep the taste the same when you make more, how must both amounts change?'],
  why:{ l:['சமையல், வரைபட அளவு (scale), மருந்து அளவு, பெயிண்ட் கலப்பு, சிமெண்ட் : மணல் கலவை.','Cooking, map scales, medicine doses, paint mixing, cement : sand mixes.'],
        j:['சமையல் கலைஞர், கட்டுமானம் (மேஸ்திரி/பொறியாளர்), மருந்தாளர், வரைபடக் கலைஞர், ஃபேஷன் வடிவமைப்பாளர்.','Chef, construction (mason/engineer), pharmacist, cartographer, fashion designer.'],
        h:['கட்டிடக் கலவை 1 : 4 (சிமெண்ட் : மணல்) எனில் 3 மூட்டை சிமெண்டுக்கு எவ்வளவு மணல்? தவறினால் கட்டிடம் பலவீனம்!','Mix 1 : 4 (cement : sand) — how much sand for 3 bags? Get it wrong and the wall is weak!'] },
  predict:{ q:['சாதத்துக்கு அரிசி : தண்ணீர் = 1 : 2. 3 கப் அரிசிக்குத் தண்ணீர்?','Rice : water = 1 : 2. For 3 cups of rice, how much water?'],
    o:[['2 கப்','2 cups'],['5 கப்','5 cups'],['6 கப்','6 cups'],['9 கப்','9 cups']], a:2, why:['இரண்டையும் ஒரே எண்ணால் பெருக்கு: 1×3 : 2×3 = 3 : 6.','Multiply both by the same number: 1×3 : 2×3 = 3 : 6.'] },
  build(ctx){
    const c = ctx.ctrl, S = { r:0 };
    mkChips(c,['செய்முறை','Recipe'],RECIPES.map((r,i)=>[i,r[0],r[1]]),0,v=>{ S.r=v; draw(); });
    const k = mkSlider(c,['எத்தனை பங்கு','Number of parts'],1,6,1,3,'',()=>draw());
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d');
    function draw(){ const r=RECIPES[S.r], q=PHYS.ratio(r[2],r[3],k.get()); g.clearRect(0,0,640,330); const rows=[[T(r[4],r[5]),q.A,r[8]],[T(r[6],r[7]),q.B,r[9]]];
      rows.forEach(([n,cnt,col],i)=>{ const y=60+i*90; tx(g,n,20,y+25,'#333',15); for(let j=0;j<cnt;j++){ g.fillStyle=col; g.fillRect(150+j*36%540,y+Math.floor(j*36/540)*34,30,28); g.strokeStyle='#555'; g.strokeRect(150+j*36%540,y+Math.floor(j*36/540)*34,30,28); } tx(g,String(cnt),600,y+25,'#333',22,'center'); });
      tx(g,r[2]+' : '+r[3]+'   ×'+k.get()+'  =  '+q.A+' : '+q.B,320,300,'#3b2fc9',22,'center');
      ctx.read([[T(r[4],r[5]),q.A],[T(r[6],r[7]),q.B],[T('விகிதம் (சுருக்கிய)','Ratio (simplest)'),q.simp[0]+' : '+q.simp[1]],[T('மொத்தம்','Total'),q.A+q.B]]); }
    draw();
    return { cols:[['செய்முறை','Recipe'],['பங்கு','Parts'],['அளவுகள்','Amounts'],['விகிதம்','Ratio']], rec:()=>{ const r=RECIPES[S.r], q=PHYS.ratio(r[2],r[3],k.get()); return [T(r[0],r[1]).split(' ')[0],k.get(),q.A+' : '+q.B,q.simp.join(':')]; } };
  },
  key:['**விகிதம் மாறாமல் இருக்க இரண்டு அளவுகளையும் ஒரே எண்ணால் பெருக்க வேண்டும்.** 1 : 2 = 2 : 4 = 3 : 6. சுருக்கிய விகிதம் எப்போதும் மாறாது. இதுவே சம விகிதம் (proportion).','**To keep a ratio, multiply both amounts by the same number.** 1 : 2 = 2 : 4 = 3 : 6. The simplest form never changes. This is proportion.'],
  quiz:[{q:['2 : 3 = ? : 12','2 : 3 = ? : 12'],o:[['6','6'],['8','8'],['10','10']],a:1,w:['3×4 = 12, எனவே 2×4 = 8.','3×4 = 12, so 2×4 = 8.']},
        {q:['வண்ணம் நீலம் : மஞ்சள் = 2 : 3; 6 பங்கு நீலத்துக்கு மஞ்சள்?','Blue : yellow = 2 : 3; for 6 parts of blue, yellow = ?'],o:[['4','4'],['9','9'],['12','12']],a:1,w:['×3: 2→6 எனவே 3→9.','×3: 2→6 so 3→9.']}]
});

/* 10. area & perimeter */
EXPS.push({ id:'areaperi', icon:'📐', c:[4,6], s:'maths', t:['சுற்றளவு & பரப்பளவு','Perimeter & area'], mins:5,
  goal:['அதே நீள வேலிக்குள் எந்த வடிவம் அதிக நிலத்தை அடைக்கும்?','With the same length of fence, which shape encloses the most land?'],
  why:{ l:['நிலம் அளப்பது, வீட்டுக்கு டைல்ஸ் வாங்குவது, சுவருக்கு பெயிண்ட், வயலுக்கு வேலி.','Measuring land, buying floor tiles, painting a wall, fencing a field.'],
        j:['சர்வேயர், கட்டிடக் கலைஞர், விவசாயி, இன்டீரியர் டிசைனர், ரியல் எஸ்டேட்.','Surveyor, architect, farmer, interior designer, real estate.'],
        h:['உன்னிடம் 24 மீ வேலி உள்ளது; வயல் நீளமாகவா, சதுரமாகவா அமைத்தால் அதிகப் பயிர் விளையும்? கண்டுபிடி!','You have 24 m of fence. Long and thin, or square — which field grows more crops? Find out!'] },
  predict:{ q:['24 மீ வேலியால் செவ்வகம் அமைக்கிறாய். எந்த வடிவம் அதிகப் பரப்பைத் தரும்?','You fence a rectangle with 24 m. Which shape gives the largest area?'],
    o:[['நீளமான குறுகிய (11 × 1)','long and thin (11 × 1)'],['சதுரம் (6 × 6)','square (6 × 6)'],['எல்லாம் சமம்','all equal']], a:1, why:['சுற்றளவு ஒன்றாக இருந்தாலும் பரப்பு மாறும்; சதுரம் அதிகம் (36).','Same perimeter, different area; the square is biggest (36).'] },
  build(ctx){
    const c = ctx.ctrl, S = { fence:true };
    mkChips(c,['முறை','Mode'],[[true,'24 மீ வேலி (நிலையான சுற்றளவு)','24 m fence (fixed perimeter)'],[false,'தானாக மாற்று','Free']],true,v=>{ S.fence=v; if(v) h.set(12-w.get()); draw(); });
    const w = mkSlider(c,['அகலம்','Width'],1,11,1,6,'m',()=>{ if(S.fence) h.set(12-w.get()); draw(); });
    const h = mkSlider(c,['நீளம்','Length'],1,11,1,6,'m',()=>{ if(S.fence) w.set(12-h.get()); draw(); });
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d');
    function draw(){ const W=w.get(),H=h.get(), r=PHYS.rect(W,H), u=Math.min(24,300/Math.max(W,H)); g.clearRect(0,0,640,330); const ox=40,oy=20;
      for(let i=0;i<W;i++) for(let j=0;j<H;j++){ g.fillStyle='#cfe8ff'; g.fillRect(ox+i*u,oy+j*u,u-1,u-1); } g.strokeStyle='#e24b4b'; g.lineWidth=4; g.strokeRect(ox,oy,W*u,H*u);
      tx(g,W+' m',ox+W*u/2,oy+H*u+20,'#333',14,'center'); tx(g,H+' m',ox+W*u+8,oy+H*u/2,'#333',14);
      tx(g,T('பரப்பளவு = ','Area = ')+W+' × '+H+' = '+r.area,380,100,'#2563b0',20); tx(g,T('சுற்றளவு = ','Perimeter = ')+'2 × ('+W+' + '+H+') = '+r.per,380,140,'#c33',20);
      ctx.read([[T('பரப்பளவு','Area'),r.area+' m²'],[T('சுற்றளவு','Perimeter'),r.per+' m'],[T('வடிவம்','Shape'),W===H?T('சதுரம்','square'):T('செவ்வகம்','rectangle')],[T('பரப்பு ÷ அதிகபட்சம்','Area vs best'),S.fence?Math.round(r.area/36*100)+'%':'—']]); }
    draw();
    return { cols:[['அகலம்','W'],['நீளம்','L'],['சுற்றளவு','Perimeter'],['பரப்பளவு','Area']], rec:()=>{ const r=PHYS.rect(w.get(),h.get()); return [w.get(),h.get(),r.per,r.area]; } };
  },
  key:['**சுற்றளவு = 2 × (நீளம் + அகலம்); பரப்பளவு = நீளம் × அகலம்.** சுற்றளவு ஒன்றாக இருந்தாலும் பரப்பளவு மாறும்; **சதுரத்தில் அதிகம்.** இரண்டும் வேறு விஷயங்கள் — வேலிக்குச் சுற்றளவு, டைல்ஸுக்குப் பரப்பளவு!','**Perimeter = 2 × (length + width); area = length × width.** Same perimeter can give different areas; **the square gives the most.** They are different things — perimeter for fencing, area for tiles!'],
  quiz:[{q:['8 மீ × 5 மீ தரையின் பரப்பளவு?','Area of an 8 m × 5 m floor?'],o:[['26 m²','26 m²'],['40 m²','40 m²'],['13 m²','13 m²']],a:1,w:['8 × 5 = 40.','8 × 5 = 40.']},
        {q:['டைல்ஸ் வாங்க எது தேவை?','To buy floor tiles you need…'],o:[['சுற்றளவு','perimeter'],['பரப்பளவு','area'],['இரண்டும் இல்லை','neither']],a:1,w:['தரையை மூடுவது = பரப்பளவு.','Covering the floor = area.']}]
});

/* 11. Pythagoras */
EXPS.push({ id:'pythagoras', icon:'📏', c:[8,10], s:'maths', t:['பிதாகரஸ் தேற்றம்','Pythagoras theorem'], mins:6,
  goal:['செங்கோண முக்கோணத்தின் மூன்று பக்கங்களுக்கு இடையே உள்ள ரகசியத் தொடர்பைக் கண்டுபிடி.','Discover the secret link between the three sides of a right-angled triangle.'],
  why:{ l:['சுவரில் சாய்த்த ஏணியின் நீளம், TV/மொபைல் திரையின் "அங்குலம்" (மூலைவிட்டம்), நேர்கோட்டுத் தூரம்.','Length of a ladder against a wall, screen "inches" (the diagonal), straight-line distances.'],
        j:['கட்டுமான மேஸ்திரி/பொறியாளர், சர்வேயர், தச்சர், வரைபடக் கலைஞர், game developer.','Mason/civil engineer, surveyor, carpenter, cartographer, game developer.'],
        h:['மேஸ்திரி 3-4-5 அடி நூலால் சுவர் மூலை சரியாக 90° என்று சோதிக்கிறார் — இதுவே பிதாகரஸ்!','Masons check a wall corner is a true 90° with a 3-4-5 string — that is Pythagoras!'] },
  predict:{ q:['ஒரு செங்கோண முக்கோணத்தின் இரு பக்கங்கள் 3 மற்றும் 4. கர்ணம் (நீளமான பக்கம்)?','A right triangle has sides 3 and 4. The hypotenuse (longest side) is…'],
    o:[['7','7'],['5','5'],['6','6'],['12','12']], a:1, why:['3² + 4² = 9 + 16 = 25 = 5².','3² + 4² = 9 + 16 = 25 = 5².'] },
  build(ctx){
    const c = ctx.ctrl;
    const a = mkSlider(c,['பக்கம் a','Side a'],1,12,1,3,'',()=>draw());
    const b = mkSlider(c,['பக்கம் b','Side b'],1,12,1,4,'',()=>draw());
    const cv = ctx.mkCanvas(640,360), g = cv.getContext('2d');
    function draw(){ const A=a.get(),B=b.get(), C=PHYS.pyth(A,B), u=Math.min(24,300/(2*A+B),580/(A+2*B)); g.clearRect(0,0,640,360);
      const cx=20+B*u, cy=20+(A+B)*u; const poly=(pts,col)=>{ g.beginPath(); pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])); g.closePath(); g.fillStyle=col; g.fill(); g.strokeStyle='#444'; g.lineWidth=1.5; g.stroke(); };
      const Pa=[cx+A*u,cy], Pb=[cx,cy-B*u];
      poly([[cx,cy],Pa,[Pa[0],cy+A*u],[cx,cy+A*u]],'#bcd9ff'); poly([[cx,cy],Pb,[cx-B*u,Pb[1]],[cx-B*u,cy]],'#ffd9a8'); poly([Pa,Pb,[Pb[0]+B*u,Pb[1]-A*u],[Pa[0]+B*u,Pa[1]-A*u]],'#c9efc9');
      poly([[cx,cy],Pa,Pb],'#fff'); g.strokeStyle='#222'; g.lineWidth=2.5; g.beginPath(); g.moveTo(cx,cy); g.lineTo(Pa[0],Pa[1]); g.lineTo(Pb[0],Pb[1]); g.closePath(); g.stroke(); g.strokeRect(cx+1,cy-12,12,12);
      tx(g,'a² = '+A*A,cx+A*u/2,cy+A*u/2+5,'#235',Math.max(11,Math.min(20,u*1.4)),'center'); tx(g,'b² = '+B*B,cx-B*u/2,cy-B*u/2+5,'#852',Math.max(11,Math.min(20,u*1.4)),'center');
      const mx=(Pa[0]+Pb[0])/2+B*u/2, my=(Pa[1]+Pb[1])/2-A*u/2; tx(g,'c² = '+(A*A+B*B),mx,my+5,'#262',Math.max(11,Math.min(20,u*1.4)),'center');
      const trip=Number.isInteger(C); ctx.read([[T('a² + b²','a² + b²'),A*A+' + '+B*B+' = '+(A*A+B*B)],[T('கர்ணம் c = √(a² + b²)','Hypotenuse c = √(a² + b²)'),(+C.toFixed(3))],[T('முழு எண் மும்மை?','Whole-number triple?'),trip?T('ஆம் ✅ ('+A+','+B+','+C+')','Yes ✅ ('+A+','+B+','+C+')'):T('இல்லை','No')],[T('வகை','Check'),T('நீல + ஆரஞ்சு பரப்பு = பச்சை பரப்பு','Blue + orange area = green area')]]); }
    draw();
    return { cols:[['a','a'],['b','b'],['c','c']], rec:()=>[a.get(),b.get(),+PHYS.pyth(a.get(),b.get()).toFixed(2)] };
  },
  key:['**செங்கோண முக்கோணத்தில்: a² + b² = c²** (c = கர்ணம், நீளமான பக்கம்). இரு சிறிய சதுரங்களின் பரப்பு கூடினால் பெரிய சதுரத்தின் பரப்புக்குச் சமம். (3,4,5), (5,12,13), (6,8,10) போன்றவை முழு எண் மும்மைகள்.','**In a right triangle: a² + b² = c²** (c = the hypotenuse, the longest side). The two small squares\' areas add up to the big square\'s area. (3,4,5), (5,12,13), (6,8,10) are whole-number triples.'],
  quiz:[{q:['a = 6, b = 8 எனில் c?','a = 6, b = 8 → c = ?'],o:[['10','10'],['14','14'],['12','12']],a:0,w:['36 + 64 = 100; √100 = 10.','36 + 64 = 100; √100 = 10.']},
        {q:['13 அடி ஏணி; அடி சுவரிலிருந்து 5 அடி. சுவரில் எவ்வளவு உயரம் எட்டும்?','A 13 ft ladder, foot 5 ft from the wall. How high does it reach?'],o:[['8 அடி','8 ft'],['12 அடி','12 ft'],['18 அடி','18 ft']],a:1,w:['13² − 5² = 169 − 25 = 144; √144 = 12.','13² − 5² = 169 − 25 = 144; √144 = 12.']}]
});

/* 12. interest */
EXPS.push({ id:'interest', icon:'💰', c:[8,10], s:'maths', t:['வட்டி — தனி vs கூட்டு','Interest — simple vs compound'], mins:6,
  goal:['பணம் காலப்போக்கில் எப்படி வளர்கிறது? தனி வட்டிக்கும் கூட்டு வட்டிக்கும் என்ன வேறுபாடு?','How does money grow over time? Simple vs compound interest?'],
  why:{ l:['வங்கி சேமிப்பு, FD, கடன், கிரெடிட் கார்டு, EMI, கந்து வட்டிக் கடனில் சிக்காமல் இருப்பது.','Bank savings, fixed deposits, loans, credit cards, EMIs, and staying out of loan-shark debt.'],
        j:['வங்கி அலுவலர், கணக்காளர், நிதி ஆலோசகர், தொழில் முனைவோர் — மற்றும் உன் சொந்த வாழ்க்கை நிதி!','Bank officer, accountant, financial planner, entrepreneur — and your own life finances!'],
        h:['"மாதம் 5% வட்டி" என்றால் ஆண்டுக்கு 60%! வட்டி மாதத்துக்கா, ஆண்டுக்கா என்று எப்போதும் கேள்.','"5% a month" means 60% a year! Always ask whether a rate is per month or per year.'] },
  predict:{ q:['₹10,000-ஐ 10% வட்டியில் 10 ஆண்டு வைத்தால் — கூட்டு வட்டி தனி வட்டியைவிட?','₹10,000 at 10% for 10 years — compared with simple interest, compound interest gives…'],
    o:[['குறைவு','less'],['சமம்','the same'],['அதிகம்','more']], a:2, why:['கூட்டு வட்டியில் வட்டிக்கும் வட்டி கிடைக்கும்; காலம் நீண்டால் வேறுபாடு பெரிதாகும்.','Compound interest earns interest on interest; the gap grows with time.'] },
  build(ctx){
    const c = ctx.ctrl;
    const P = mkSlider(c,['முதல் (Principal)','Principal'],1000,100000,1000,10000,'₹',()=>draw());
    const r = mkSlider(c,['ஆண்டு வட்டி விகிதம்','Yearly rate'],1,24,1,10,'%',()=>draw());
    const t = mkSlider(c,['ஆண்டுகள்','Years'],1,20,1,10,'',()=>draw());
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d');
    function draw(){ const p=P.get(), R=r.get(), Y=t.get(), v=PHYS.interest(p,R,Y); g.clearRect(0,0,640,330); const ox=70, oy=290, w=540, h=240, mx=v.compound*1.05;
      ln(g,ox,oy,ox,oy-h,'#333',2); ln(g,ox,oy,ox+w,oy,'#333',2); tx(g,T('ஆண்டுகள் →','years →'),ox+w,oy+16,'#555',11,'right'); tx(g,inr(mx),ox-6,oy-h+4,'#555',10,'right'); tx(g,inr(p),ox-6,oy-p/mx*h+4,'#555',10,'right');
      [['simple','#4a8fe0'],['compound','#e24b4b']].forEach(([k,col])=>{ g.strokeStyle=col; g.lineWidth=3; g.beginPath(); for(let y=0;y<=Y;y+=Y/60){ const q=PHYS.interest(p,R,y)[k], x=ox+y/Y*w, yy=oy-q/mx*h; y?g.lineTo(x,yy):g.moveTo(x,yy); } g.stroke(); });
      tx(g,T('🟦 தனி வட்டி','🟦 Simple')+'  '+T('🟥 கூட்டு வட்டி','🟥 Compound'),ox+10,24,'#333',13);
      ctx.read([[T('தனி வட்டி — மொத்தம்','Simple — total'),inr(v.simple)],[T('கூட்டு வட்டி — மொத்தம்','Compound — total'),inr(v.compound)],[T('கூட்டு வட்டி கூடுதல்','Extra from compounding'),inr(v.compound-v.simple)],[T('பணம் எத்தனை மடங்கு (கூட்டு)','Money multiplied (compound)'),(v.compound/p).toFixed(2)+'×']]); }
    draw();
    return { cols:[['முதல்','Principal'],['% / ஆண்டு','% / yr'],['ஆண்டு','Years'],['தனி','Simple'],['கூட்டு','Compound']], rec:()=>{ const v=PHYS.interest(P.get(),r.get(),t.get()); return [inr(P.get()),r.get(),t.get(),inr(v.simple),inr(v.compound)]; } };
  },
  key:['**தனி வட்டி:** A = P × (1 + r × t) — வட்டி எப்போதும் முதலுக்கு மட்டும். **கூட்டு வட்டி:** A = P × (1 + r)ᵗ — வட்டிக்கும் வட்டி! சேமிப்பில் கூட்டு வட்டி நமக்கு நன்மை; கடனில் அது நமக்கு எதிராக வேலை செய்யும். வட்டி ஆண்டுக்கா, மாதத்துக்கா என்று எப்போதும் சரிபார்.','**Simple:** A = P × (1 + r × t) — interest on the original only. **Compound:** A = P × (1 + r)ᵗ — interest on interest! Compounding helps your savings, but works against you in debt. Always check whether a rate is yearly or monthly.'],
  quiz:[{q:['₹1,000, 10%, 2 ஆண்டு — தனி வட்டியில் மொத்தம்?','₹1,000, 10%, 2 years — total with simple interest?'],o:[['₹1,200','₹1,200'],['₹1,210','₹1,210'],['₹1,020','₹1,020']],a:0,w:['1000 × (1 + 0.1 × 2) = 1200.','1000 × (1 + 0.1 × 2) = 1200.']},
        {q:['கூட்டு வட்டி கடனில் ஆபத்து ஏன்?','Why is compound interest dangerous in debt?'],o:[['வட்டிக்கும் வட்டி சேரும்','interest piles on interest'],['வட்டி குறையும்','interest shrinks'],['ஆபத்தில்லை','not dangerous']],a:0,w:['கடன் வேகமாக வளரும்.','Debt grows fast.']}]
});

/* 13. probability */
EXPS.push({ id:'coin', icon:'🪙', c:[7,10], s:'maths', t:['நிகழ்தகவு — நாணயம் சுண்டுதல்','Probability — coin tosses'], mins:5,
  goal:['நாணயத்தைப் பல முறை சுண்டினால் தலை எத்தனை சதவீதம் வரும்?','Toss a coin many times — what percent land heads?'],
  why:{ l:['வானிலை "மழை வாய்ப்பு 70%", கிரிக்கெட் வெற்றி வாய்ப்பு, லாட்டரி/சூதாட்டத்தில் ஏன் பெரும்பாலும் தோல்வி.','Weather "70% chance of rain", cricket win chances, why lotteries and gambling mostly lose.'],
        j:['தரவு அறிவியலாளர், காப்பீட்டுக் கணக்கீட்டாளர், மருத்துவ ஆராய்ச்சி, வானிலை ஆய்வாளர், AI பொறியாளர்.','Data scientist, insurance actuary, medical researcher, meteorologist, AI engineer.'],
        h:['"இது வரை 5 முறை தலை வந்தது, அடுத்தது பூ தான்!" — இது தவறு! நாணயத்துக்கு நினைவே இல்லை; ஒவ்வொரு முறையும் 50-50.','"Five heads so far, so tails is due!" Wrong! A coin has no memory; every toss is 50-50.'] },
  predict:{ q:['1000 முறை சுண்டினால் தலை எத்தனை சதவீதம் வரும் என எதிர்பார்க்கிறாய்?','Toss 1000 times — about what percent will be heads?'],
    o:[['சரியாக 50% தான்','exactly 50%'],['சுமார் 50% (சிறு வேறுபாடு இருக்கலாம்)','about 50% (a small difference is normal)'],['30% முதல் 70% வரை எதுவும்','anything from 30% to 70%']], a:1, why:['முறை கூடக் கூட சதவீதம் 50%-க்கு நெருங்கும் (பெரிய எண்களின் விதி); ஆனால் சரியாக 50 ஆகாது.','More tosses → closer to 50% (law of large numbers) — but rarely exactly 50.'] },
  build(ctx){
    const c = ctx.ctrl, S = { n:0, h:0, hist:[] };
    const flip=k=>{ for(let i=0;i<k;i++){ S.n++; if(Math.random()<0.5) S.h++; if(S.n<=2000) S.hist.push(S.h/S.n); } draw(); };
    mkBtn(c,['🪙 1 முறை','🪙 1 toss'],()=>flip(1),'p'); mkBtn(c,['×10','×10'],()=>flip(10)); mkBtn(c,['×100','×100'],()=>flip(100)); mkBtn(c,['×1000','×1000'],()=>flip(1000)); mkBtn(c,['↺ மீட்டமை','↺ Reset'],()=>{ S.n=0; S.h=0; S.hist=[]; draw(); });
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d');
    function draw(){ g.clearRect(0,0,640,330); const ox=60,oy=290,w=540,h=220; ln(g,ox,oy,ox,oy-h,'#333',2); ln(g,ox,oy,ox+w,oy,'#333',2); ln(g,ox,oy-h/2,ox+w,oy-h/2,'#2e9e4f',1.5); tx(g,'50%',ox-6,oy-h/2+4,'#2e9e4f',11,'right'); tx(g,'100%',ox-6,oy-h+4,'#555',10,'right'); tx(g,'0%',ox-6,oy+4,'#555',10,'right'); tx(g,T('சுண்டிய எண்ணிக்கை →','tosses →'),ox+w,oy+16,'#555',11,'right');
      g.strokeStyle='#e24b4b'; g.lineWidth=2.5; g.beginPath(); const N=Math.max(20,S.hist.length-1); S.hist.forEach((p,i)=>{ const x=ox+i/N*w, y=oy-p*h; i?g.lineTo(x,y):g.moveTo(x,y); }); g.stroke();
      tx(g,S.n?('🪙 '+(S.h/S.n*100).toFixed(1)+'% '+T('தலை','heads')):T('நாணயத்தைச் சுண்டு!','Toss the coin!'),320,40,'#333',22,'center');
      ctx.read([[T('சுண்டிய முறை','Tosses'),S.n],[T('தலை','Heads'),S.h],[T('பூ','Tails'),S.n-S.h],[T('தலை %','Heads %'),S.n?(S.h/S.n*100).toFixed(1)+'%':'—']]); }
    draw();
    return { cols:[['முறை','Tosses'],['தலை','Heads'],['தலை %','Heads %']], rec:()=>[S.n,S.h,S.n?(S.h/S.n*100).toFixed(1)+'%':'—'] };
  },
  key:['**முறை கூடக் கூட தலையின் சதவீதம் 50%-க்கு நெருங்குகிறது** (பெரிய எண்களின் விதி). குறைந்த முறைகளில் பெரிய ஏற்றத்தாழ்வு சாதாரணம். நிகழ்தகவு = சாதகமான வாய்ப்புகள் ÷ மொத்த வாய்ப்புகள் = 1 ÷ 2. முந்தைய முடிவு அடுத்ததைப் பாதிக்காது.','**With more tosses the heads percentage settles near 50%** (law of large numbers). Big swings in a few tosses are normal. Probability = favourable ÷ total = 1 ÷ 2. The past result does not affect the next toss.'],
  quiz:[{q:['பகடையில் 6 வர நிகழ்தகவு?','Probability of a 6 on a die?'],o:[['1/2','1/2'],['1/6','1/6'],['6','6']],a:1,w:['6 வாய்ப்புகளில் 1 சாதகம்.','1 favourable out of 6.']},
        {q:['5 முறை தலை வந்தால் அடுத்து பூ வருவது உறுதியா?','After five heads, is tails now certain?'],o:[['ஆம்','yes'],['இல்லை, அதே 50-50','no, still 50-50']],a:1,w:['நாணயத்துக்கு நினைவு இல்லை.','A coin has no memory.']}]
});

/* 14. states of matter */
EXPS.push({ id:'states', icon:'🧊', c:[7,9], s:'chem', t:['திண்மம் – திரவம் – வாயு','Solid – liquid – gas'], mins:5,
  goal:['வெப்பம் கூடும்போது நீரின் துகள்களுக்கு என்ன ஆகிறது?','What happens to the particles of water as heat increases?'],
  why:{ l:['பனிக்கட்டி உருகுவது, சமையலில் தண்ணீர் கொதித்து நீராவி ஆவது, துணி காய்வது, மழை உருவாவது.','Ice melting, water boiling to steam, clothes drying, rain forming.'],
        j:['சமையல் & உணவுத் தொழில்நுட்பம், குளிர்சாதனப் (refrigerator/AC) பொறியாளர், வானிலை ஆய்வாளர், மின் உற்பத்தி (நீராவி).','Food technology, refrigeration/AC engineer, meteorologist, power plants (steam).'],
        h:['நீர் எப்போதும் நீரே (H₂O). பனி, நீர், நீராவி வெவ்வேறு "நிலை"; துகள்களின் இயக்கம்தான் வேறுபாடு.','Water is always H₂O. Ice, water and steam are different "states" — only the particles\' motion differs.'] },
  predict:{ q:['நீரை 100°C-க்கு மேல் சூடாக்கினால் துகள்கள்?','Heat water above 100°C and its particles…'],
    o:[['அசையாமல் நிற்கும்','stop moving'],['மிக வேகமாகத் தனித்தனியாகப் பறக்கும் (வாயு)','fly apart fast (gas)'],['இறுக்கமாகச் சேரும்','pack tighter']], a:1, why:['வெப்பம் கூட → துகள் வேகம் கூடும் → பிணைப்பு உடைந்து வாயு (நீராவி).','More heat → faster particles → bonds break → gas (steam).'] },
  build(ctx){
    const c = ctx.ctrl;
    const Tm = mkSlider(c,['வெப்பநிலை','Temperature'],-20,140,5,25,'°C',()=>draw());
    const cv = ctx.mkCanvas(640,330), g = cv.getContext('2d'); const NP=36, ps=[]; for(let i=0;i<NP;i++) ps.push({x:260+Math.random()*120,y:200+Math.random()*80,vx:Math.random()-.5,vy:Math.random()-.5,ph:Math.random()*6});
    const name=ph=> ph==='solid'?T('திண்மம் (பனிக்கட்டி)','Solid (ice)'):(ph==='liquid'?T('திரவம் (நீர்)','Liquid (water)'):T('வாயு (நீராவி)','Gas (steam)'));
    function draw(){ const tc=Tm.get(), ph=PHYS.phase(tc); ctx.read([[T('நிலை','State'),name(ph)],[T('துகள் இயக்கம்','Particle motion'),ph==='solid'?T('இடத்தில் அதிர்கின்றன','vibrate in place'):(ph==='liquid'?T('நழுவிச் செல்கின்றன','slide past each other'):T('வேகமாகப் பறக்கின்றன','fly freely'))],[T('துகள்களின் இடைவெளி','Spacing'),ph==='gas'?T('மிக அதிகம்','very large'):(ph==='liquid'?T('சிறிது','small'):T('மிகக் குறைவு','tiny'))],[T('உருகுநிலை / கொதிநிலை','Melting / boiling'),'0°C / 100°C']]); } draw();
    ctx.loop(dt=>{ const tc=Tm.get(), ph=PHYS.phase(tc), sp=40+Math.sqrt(Math.max(1,tc+273))*9, X0=180,X1=460,Y0=40,Y1=290; g.clearRect(0,0,640,330);
      g.fillStyle=ph==='solid'?'#e9f6ff':(ph==='liquid'?'#fff':'#fff'); g.fillRect(X0,Y0,X1-X0,Y1-Y0); if(ph==='liquid'){ g.fillStyle='rgba(120,190,245,.35)'; g.fillRect(X0,180,X1-X0,Y1-180); } g.strokeStyle='#444'; g.lineWidth=4; g.strokeRect(X0,Y0,X1-X0,Y1-Y0);
      ps.forEach((p,i)=>{ if(ph==='solid'){ const gx=X0+60+(i%6)*30, gy=Y1-40-Math.floor(i/6)*28, j=1+Math.max(0,tc+20)/40; p.ph+=dt*8; const nx=gx+Math.sin(p.ph+i)*j, ny=gy+Math.cos(p.ph*1.3+i)*j; p.x+=(nx-p.x)*0.4; p.y+=(ny-p.y)*0.4; p.vx=Math.cos(i); p.vy=Math.sin(i); }
        else { const yTop = ph==='liquid'?188:Y0+6; const s=ph==='liquid'?sp*0.6:sp*1.6; const n=Math.hypot(p.vx,p.vy)||1; p.vx=p.vx/n*s; p.vy=p.vy/n*s; p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.x<X0+6){ p.x=X0+6; p.vx=Math.abs(p.vx); } if(p.x>X1-6){ p.x=X1-6; p.vx=-Math.abs(p.vx); } if(p.y<yTop){ p.y=yTop; p.vy=Math.abs(p.vy); } if(p.y>Y1-6){ p.y=Y1-6; p.vy=-Math.abs(p.vy); } }
        circ(g,p.x,p.y,7,ph==='gas'?'#e8a33d':(ph==='liquid'?'#3b82f6':'#6aa5e8'),'#fff'); });
      const th=60+ (tc+20)/160*200; g.fillStyle='#ddd'; g.fillRect(60,60,18,220); g.fillStyle='#e24b4b'; g.fillRect(60,280-(tc+20)/160*220,18,(tc+20)/160*220); circ(g,69,285,16,'#e24b4b'); tx(g,tc+'°C',69,310,'#c00',14,'center');
      tx(g,name(ph),320,24,'#333',16,'center'); ln(g,90,280-20/160*220,110,280-20/160*220,'#2563eb',2); tx(g,'0',114,280-20/160*220+4,'#2563eb',11); ln(g,90,280-120/160*220,110,280-120/160*220,'#c33',2); tx(g,'100',114,280-120/160*220+4,'#c33',11); });
    return { cols:[['°C','°C'],['நிலை','State']], rec:()=>[Tm.get(),name(PHYS.phase(Tm.get())).split(' ')[0]] };
  },
  key:['**வெப்பம் கூடினால் துகள்கள் வேகமாக அசையும்.** திண்மம்: இறுக்கமாக இடத்திலேயே அதிரும்; திரவம்: நழுவி நகரும்; வாயு: தனித்தனியாக வேகமாகப் பறக்கும். நீருக்கு 0°C-ல் உருகும் (பனி → நீர்), 100°C-ல் கொதிக்கும் (நீர் → நீராவி). துகள்கள் மாறுவதில்லை, அவற்றின் அமைப்பும் இயக்கமும்தான் மாறும்.','**More heat makes particles move faster.** Solid: packed and vibrating in place; liquid: sliding past each other; gas: flying apart. Water melts at 0°C and boils at 100°C. The particles stay the same — only their arrangement and motion change.'],
  quiz:[{q:['நீர் எந்த வெப்பநிலையில் கொதிக்கும் (சாதாரண அழுத்தத்தில்)?','At what temperature does water boil (normal pressure)?'],o:[['0°C','0°C'],['100°C','100°C'],['50°C','50°C']],a:1,w:['கொதிநிலை 100°C.','Boiling point 100°C.']},
        {q:['எந்த நிலையில் துகள்களுக்கு இடையே இடைவெளி அதிகம்?','In which state are the particles farthest apart?'],o:[['திண்மம்','solid'],['திரவம்','liquid'],['வாயு','gas']],a:2,w:['வாயுத் துகள்கள் தனித்தனியாகப் பறக்கும்.','Gas particles fly freely.']}]
});

/* order experiments by class then keep stable */
const ord = EXPS.map((e,i)=>[e,i]); ord.sort((a,b)=>a[0].c[0]-b[0].c[0]||a[1]-b[1]); EXPS.length=0; ord.forEach(o=>EXPS.push(o[0]));
Object.assign(L,{ EQS, ELS, RECIPES });
})();
