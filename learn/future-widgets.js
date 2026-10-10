/* Kalvi Kalanjiyam — "நாளைய உலகம்" widgets (hands-on models used by the future lessons).
   Loaded before the main script; index.html merges KALVI_WIDGETS_X(helpers) into WIDGETS.
   Every widget is a small, honest MODEL: the formulas are pure functions (exported in KALVI_WX_PURE
   so tests can check them) and every widget says what it assumes. */
(function(G){
'use strict';

/* ---------- pure functions (tested separately) ---------- */
const PURE = {
  // illustrative forgetting model: retention = e^(-t/s); each review resets the clock and multiplies strength s by 2.5
  retention(reviews, gap, day){
    let s = 1.5, last = 0;
    for(let i = 1; i <= reviews; i++){ const rd = i * gap; if(rd <= day){ s *= 2.5; last = rd; } }
    return Math.exp(-(day - last) / s);
  },
  solar(kw, yieldPerKw, tariff, costPerKw){
    const day = kw * yieldPerKw, month = day * 30, save = month * tariff, year = save * 12, cost = kw * costPerKw;
    return {day, month, save, year, cost, payback: year > 0 ? cost / year : Infinity};
  },
  growth(p, ratePct, years){
    const r = ratePct / 100;
    return {simple: p * (1 + r * years), compound: p * Math.pow(1 + r, years), double: r > 0 ? 72 / ratePct : Infinity};
  },
  costKm(petrolPrice, kmPerL, kwhPerKm, tariff, kmMonth){
    const p = petrolPrice / kmPerL, e = kwhPerKm * tariff;
    return {petrolKm: p, evKm: e, petrolMonth: p * kmMonth, evMonth: e * kmMonth, saveMonth: (p - e) * kmMonth};
  },
  footprint(units, petrolL, cylinders){
    const el = units * 0.7, pe = petrolL * 2.31, lp = cylinders * 14.2 * 2.98; // kg CO2 per month
    const month = el + pe + lp, year = month * 12;
    return {el, pe, lp, month, year, trees: year / 20};
  },
  weightOn(massKg, g){ return {newton: massKg * g, kgEq: massKg * g / 9.81}; },
  dna(seq){
    const s = String(seq || '').toUpperCase().replace(/[^ACGT]/g, '');
    const cDNA = {A: 'T', T: 'A', C: 'G', G: 'C'}, mRNA = {A: 'U', T: 'A', C: 'G', G: 'C'};
    const comp = s.split('').map(x => cDNA[x]).join(''), rna = s.split('').map(x => mRNA[x]).join('');
    const codons = []; for(let i = 0; i + 3 <= rna.length; i += 3) codons.push(rna.slice(i, i + 3));
    return {s, comp, rna, codons};
  },
  bitsValue(bits){ return bits.reduce((a, b) => a * 2 + (b ? 1 : 0), 0); },
  thermoStep(T, outside, set, acOn){
    if(!acOn && T > set + 1) acOn = true; else if(acOn && T < set - 1) acOn = false;
    const dT = acOn ? -0.35 : (outside - T) * 0.04;
    return {T: T + dT, acOn};
  },
  chunk(text, size){
    let g; try{ g = Array.from(new Intl.Segmenter('ta', {granularity: 'grapheme'}).segment(text), x => x.segment); }catch(e){ g = Array.from(text); }
    const out = []; for(let i = 0; i < g.length; i += size) out.push(g.slice(i, i + size).join('')); return out;
  }
};
G.KALVI_WX_PURE = PURE;

G.KALVI_WIDGETS_X = function(h){
  const {svg, readout, slider, T, esc} = h;
  const fmt = (x, d) => Number(x).toLocaleString('en-IN', {maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d});
  const mk = html => { const d = document.createElement('div'); d.innerHTML = html; return d; };
  const note = (host, ta, en) => { const n = document.createElement('div'); n.className = 'note'; n.style.marginTop = '8px'; n.textContent = T(ta, en); host.appendChild(n); };
  const path = (pts, fx, fy) => pts.map((p, i) => (i ? 'L' : 'M') + fx(p[0]).toFixed(1) + ' ' + fy(p[1]).toFixed(1)).join('');

  return {
    /* 1. forgetting curve with spaced review */
    forgetting(host){
      const S = svg(host, 340, 200), ro = readout(host); let n = 3, gap = 3;
      function draw(){
        const X = d => 34 + d / 30 * 290, Y = r => 170 - r * 150;
        const a = [], b = []; for(let d = 0; d <= 30; d += .25){ a.push([d, PURE.retention(0, gap, d)]); b.push([d, PURE.retention(n, gap, d)]); }
        let g = ''; [0, .5, 1].forEach(v => g += `<line x1="34" x2="324" y1="${Y(v)}" y2="${Y(v)}" stroke="#e2e6ef"/><text x="4" y="${Y(v) + 4}" font-size="10">${v * 100}%</text>`);
        for(let i = 1; i <= n; i++){ const rd = i * gap; if(rd <= 30) g += `<line x1="${X(rd)}" x2="${X(rd)}" y1="20" y2="170" stroke="#f59e0b" stroke-dasharray="3 3"/><text x="${X(rd) - 6}" y="14" font-size="10">📖</text>`; }
        S.innerHTML = g + `<path d="${path(a, X, Y)}" fill="none" stroke="#94a3b8" stroke-width="2"/><path d="${path(b, X, Y)}" fill="none" stroke="#3b2fc9" stroke-width="3"/>
          <text x="34" y="192" font-size="10">${T('நாள் 0', 'Day 0')}</text><text x="290" y="192" font-size="10">${T('நாள் 30', 'Day 30')}</text>
          <text x="170" y="192" font-size="10" fill="#94a3b8">— ${T('ஒரு முறை மட்டும் படித்தால்', 'studied once')}</text>`;
        ro([[T('30-ஆம் நாள் — ஒரு முறை மட்டும்', 'Day 30 — once only'), fmt(PURE.retention(0, gap, 30) * 100, 0) + '%'], [T('30-ஆம் நாள் — மீள்பார்வையுடன்', 'Day 30 — with reviews'), fmt(PURE.retention(n, gap, 30) * 100, 0) + '%']]);
      }
      slider(host, T('மீள்பார்வை (முறை)', 'Reviews'), 0, 6, 1, n, v => { n = v; draw(); });
      slider(host, T('இடைவெளி (நாள்)', 'Gap (days)'), 1, 7, 1, gap, v => { gap = v; draw(); });
      note(host, 'இது ஒரு எளிய மாதிரி (எண்கள் எடுத்துக்காட்டுக்காக). உண்மையான நினைவு ஆளுக்கு ஆள் மாறும் — ஆனால் "இடைவெளி விட்டு மீண்டும் பார்த்தால் நினைவு நீடிக்கும்" என்பது ஆய்வுகளில் மீண்டும் மீண்டும் உறுதியான கருத்து.', 'A simple model (numbers are illustrative). Real memory differs between people — but "spaced re-visits make memory last" is a finding that research confirms again and again.');
    },

    /* 2. rooftop solar */
    solarHome(host){
      const ro = readout(host); let kw = 3, y = 4.5, tar = 6, cost = 55000;
      function draw(){
        const r = PURE.solar(kw, y, tar, cost);
        ro([[T('ஒரு நாள் மின்சாரம்', 'Per day'), fmt(r.day, 1) + ' ' + T('யூனிட்', 'units')], [T('ஒரு மாதம்', 'Per month'), fmt(r.month) + ' ' + T('யூனிட்', 'units')], [T('மாதச் சேமிப்பு', 'Saved per month'), '₹' + fmt(r.save)], [T('அமைப்புச் செலவு (தோராயம்)', 'System cost (approx.)'), '₹' + fmt(r.cost)], [T('செலவு திரும்ப', 'Payback'), r.payback === Infinity ? '—' : fmt(r.payback, 1) + ' ' + T('ஆண்டு', 'years')]]);
      }
      slider(host, T('சூரியத் தகடு திறன் (kW)', 'Panel size (kW)'), 1, 10, 1, kw, v => { kw = v; draw(); }, ' kW');
      slider(host, T('1 kW-க்கு ஒரு நாள் யூனிட்', 'Units per kW per day'), 3, 6, .1, y, v => { y = v; draw(); });
      slider(host, T('மின் கட்டணம் (₹/யூனிட்)', 'Tariff (₹/unit)'), 3, 12, .5, tar, v => { tar = v; draw(); }, ' ₹');
      slider(host, T('1 kW அமைப்புக்குச் செலவு (₹)', 'Cost per kW (₹)'), 40000, 80000, 1000, cost, v => { cost = v; draw(); }, ' ₹');
      note(host, 'தோராயக் கணக்கு: மேகம், நிழல், தகடு அழுக்கு, மின்சார வாரிய விதிகள் இவற்றால் உண்மை மாறும். அரசு மானியம் / net-metering விவரங்கள் மாறிக்கொண்டே இருக்கும் — முடிவெடுக்கும் முன் தற்போதைய விவரத்தை அதிகாரப்பூர்வ இடத்தில் பார்.', 'A rough estimate: clouds, shade, dust and utility rules change the real figure. Subsidy and net-metering details keep changing — check the current official details before deciding.');
    },

    /* 3. packets */
    packets(host, p){
      const wrap = mk(`<div class="ctrl" style="grid-template-columns:1fr auto"><input class="ans" style="width:100%" maxlength="40" value="${esc(p.text || T('வணக்கம் தமிழ்நாடு', 'Hello from Tamil Nadu'))}"><button class="btn p sm go">📡 ${T('அனுப்பு', 'Send')}</button></div>
        <label style="display:flex;gap:8px;align-items:center;font-size:.85rem;margin-top:6px"><input type="checkbox" class="lose"> ${T('வழியில் ஒரு packet தொலைந்துவிடட்டும்', 'Let one packet get lost on the way')}</label><div class="out" style="margin-top:8px"></div>`);
      host.appendChild(wrap);
      const inp = wrap.querySelector('input.ans'), out = wrap.querySelector('.out');
      const chip = (t, i, c) => `<span style="display:inline-block;margin:3px;padding:4px 9px;border-radius:10px;background:${c || '#eef0f7'};font-size:.85rem"><small style="opacity:.6">#${i + 1}</small> ${esc(t)}</span>`;
      wrap.querySelector('.go').onclick = () => {
        const text = inp.value || ' ', ch = PURE.chunk(text, 3), idx = ch.map((_, i) => i);
        for(let i = idx.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
        const lost = wrap.querySelector('.lose').checked && ch.length > 1 ? idx[Math.floor(Math.random() * idx.length)] : -1;
        const arrived = idx.filter(i => i !== lost);
        let html = `<div><b>1️⃣ ${T('உன் செய்தி துண்டுகளாக (packets) உடைகிறது', 'Your message is cut into packets')}</b><br>${ch.map((t, i) => chip(t, i)).join('')}</div>`;
        html += `<div style="margin-top:6px"><b>2️⃣ ${T('வெவ்வேறு பாதைகளில் வருகின்றன — வரிசை மாறுகிறது!', 'They travel by different routes — the order gets mixed up!')}</b><br>${arrived.map(i => chip(ch[i], i, '#fff4d6')).join('')}</div>`;
        if(lost >= 0) html += `<div style="margin-top:6px"><b>⚠️ ${T('#' + (lost + 1) + ' வரவில்லை → மீண்டும் அனுப்பச் சொல்லப்படுகிறது', 'Packet #' + (lost + 1) + ' never arrived → asked to be re-sent')}</b><br>${chip(ch[lost], lost, '#ffe1e1')}</div>`;
        html += `<div style="margin-top:6px"><b>3️⃣ ${T('எண் வரிசைப்படி சேர்க்கப்படுகிறது', 'Put back in number order')}</b><br><span style="font-size:1.05rem;font-weight:800;color:var(--ok)">${esc(ch.join(''))}</span></div>`;
        out.innerHTML = html;
      };
      wrap.querySelector('.go').click();
    },

    /* 4. bits */
    bits(host){
      const bits = [0, 1, 0, 0, 0, 0, 0, 1]; const ro = readout(host);
      const row = mk('<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:6px 0"></div>'); host.insertBefore(row, ro && host.lastChild);
      const sw = mk('<div style="height:34px;border-radius:10px;border:1px solid var(--line);margin-top:8px"></div>'); host.appendChild(sw);
      const pre = mk(`<div class="row" style="margin-top:8px;justify-content:center"><button class="btn sm" data-v="65">A</button><button class="btn sm" data-v="97">a</button><button class="btn sm" data-v="48">0</button><button class="btn sm" data-v="255">255</button><button class="btn sm" data-v="0">0 ⬛</button></div>`); host.appendChild(pre);
      function draw(){
        const v = PURE.bitsValue(bits);
        row.innerHTML = bits.map((b, i) => `<button class="btn" data-i="${i}" style="min-width:38px;padding:8px 0;background:${b ? '#3b2fc9' : '#eceef5'};color:${b ? '#fff' : '#14213d'}">${b}<small style="display:block;font-size:.6rem;opacity:.7">${128 >> i}</small></button>`).join('');
        row.querySelectorAll('button').forEach(bt => bt.onclick = () => { bits[Number(bt.dataset.i)] ^= 1; draw(); });
        sw.style.background = `rgb(${v},${v},${v})`;
        ro([[T('தசம எண் (decimal)', 'Decimal'), v], [T('இந்த எண் ஒரு எழுத்தாக (ASCII)', 'As a text character (ASCII)'), v >= 33 && v <= 126 ? String.fromCharCode(v) : '—'], [T('ஒரு pixel-ன் ஒளிர்வு', 'Pixel brightness'), v + ' / 255']]);
      }
      pre.querySelectorAll('button').forEach(bt => bt.onclick = () => { const v = Number(bt.dataset.v); for(let i = 0; i < 8; i++) bits[i] = (v >> (7 - i)) & 1; draw(); });
      draw();
    },

    /* 5. compound growth */
    growth(host){
      const S = svg(host, 340, 190), ro = readout(host); let P = 10000, r = 7, yrs = 10;
      function draw(){
        const pts1 = [], pts2 = []; for(let y = 0; y <= yrs; y++){ const g = PURE.growth(P, r, y); pts1.push([y, g.simple]); pts2.push([y, g.compound]); }
        const maxV = Math.max(PURE.growth(P, r, yrs).compound, P) * 1.05;
        const X = y => 36 + y / yrs * 290, Y = v => 165 - v / maxV * 140;
        S.innerHTML = `<line x1="36" x2="326" y1="165" y2="165" stroke="#cbd5e1"/><path d="${path(pts1, X, Y)}" fill="none" stroke="#94a3b8" stroke-width="2"/><path d="${path(pts2, X, Y)}" fill="none" stroke="#16a34a" stroke-width="3"/>
          <text x="36" y="182" font-size="10">0</text><text x="${X(yrs) - 14}" y="182" font-size="10">${yrs} ${T('ஆண்டு', 'yrs')}</text>
          <text x="44" y="20" font-size="10" fill="#16a34a">— ${T('கூட்டு வட்டி', 'compound')}</text><text x="44" y="34" font-size="10" fill="#64748b">— ${T('தனி வட்டி', 'simple')}</text>`;
        const g = PURE.growth(P, r, yrs);
        ro([[T('தனி வட்டியில்', 'Simple interest'), '₹' + fmt(g.simple)], [T('கூட்டு வட்டியில்', 'Compound interest'), '₹' + fmt(g.compound)], [T('கூடுதல் (கூட்டு − தனி)', 'Extra from compounding'), '₹' + fmt(g.compound - g.simple)], [T('இரட்டிப்பாக (72 விதி)', 'Doubling time (rule of 72)'), g.double === Infinity ? '—' : '≈ ' + fmt(g.double, 1) + ' ' + T('ஆண்டு', 'yrs')]]);
      }
      slider(host, T('முதல் தொகை (₹)', 'Amount (₹)'), 1000, 100000, 1000, P, v => { P = v; draw(); }, ' ₹');
      slider(host, T('ஆண்டு வட்டி %', 'Interest % a year'), 1, 20, .5, r, v => { r = v; draw(); }, '%');
      slider(host, T('ஆண்டுகள்', 'Years'), 1, 30, 1, yrs, v => { yrs = v; draw(); });
      note(host, 'வட்டி வீதங்கள் எடுத்துக்காட்டுக்காக மட்டும். உண்மையான வங்கி / முதலீட்டு வீதங்கள் மாறும்; அதிக வருமானம் தருவதாகச் சொல்லும் எதிலும் ஆபத்தும் அதிகம்.', 'Rates are only examples. Real rates change; anything promising very high returns also carries high risk.');
    },

    /* 6. petrol vs electric cost per km */
    costKm(host){
      let petrol = 100, kmL = 45, kwh = .035, tar = 6, km = 1000; let sP, sK, sE;
      const ro = readout(host);
      const pre = mk(`<div class="row" style="margin-bottom:6px"><button class="btn sm" data-k="2w">🛵 ${T('இருசக்கர வாகனம்', 'Two-wheeler')}</button><button class="btn sm" data-k="car">🚗 ${T('கார்', 'Car')}</button></div>`);
      host.insertBefore(pre, host.firstChild);
      function draw(){
        const r = PURE.costKm(petrol, kmL, kwh, tar, km);
        ro([[T('பெட்ரோல் — ₹/கி.மீ', 'Petrol — ₹/km'), '₹' + fmt(r.petrolKm, 2)], [T('மின்சாரம் — ₹/கி.மீ', 'Electric — ₹/km'), '₹' + fmt(r.evKm, 2)], [T('மாதம் — பெட்ரோல்', 'Month — petrol'), '₹' + fmt(r.petrolMonth)], [T('மாதம் — மின்', 'Month — electric'), '₹' + fmt(r.evMonth)], [T('மாதச் சேமிப்பு', 'Saved per month'), '₹' + fmt(r.saveMonth)]]);
      }
      sP = slider(host, T('பெட்ரோல் விலை ₹/லிட்டர்', 'Petrol ₹/litre'), 80, 130, 1, petrol, v => { petrol = v; draw(); }, ' ₹');
      sK = slider(host, T('பெட்ரோல் வாகனம் — கி.மீ/லிட்டர்', 'Petrol vehicle km/litre'), 10, 70, 1, kmL, v => { kmL = v; draw(); });
      sE = slider(host, T('மின் வாகனம் — kWh/கி.மீ', 'EV kWh per km'), .02, .2, .005, kwh, v => { kwh = v; draw(); });
      slider(host, T('வீட்டு மின் கட்டணம் ₹/யூனிட்', 'Home tariff ₹/unit'), 3, 12, .5, tar, v => { tar = v; draw(); }, ' ₹');
      slider(host, T('மாதம் ஓட்டும் கி.மீ', 'km per month'), 200, 3000, 100, km, v => { km = v; draw(); });
      const setv = (inp, v) => { inp.value = v; inp.dispatchEvent(new Event('input')); };
      pre.querySelectorAll('button').forEach(b => b.onclick = () => { if(b.dataset.k === '2w'){ setv(sK, 45); setv(sE, .035); } else { setv(sK, 15); setv(sE, .14); } });
      note(host, 'வீட்டில் சார்ஜ் செய்வதாகக் கொண்ட கணக்கு. வாகன விலை, பேட்டரி மாற்றுச் செலவு, பொது சார்ஜிங் கட்டணம் இதில் இல்லை. மின்சாரம் எந்த மூலத்திலிருந்து வருகிறது என்பதும் சுற்றுச்சூழல் பலனை மாற்றும்.', 'Assumes home charging. Vehicle price, battery replacement and public-charging fees are not included. Where the electricity comes from also changes the environmental benefit.');
    },

    /* 7. household carbon footprint */
    footprint(host){
      const ro = readout(host); let u = 150, pl = 20, cy = 1;
      const S = svg(host, 340, 110);
      function draw(){
        const r = PURE.footprint(u, pl, cy), mx = Math.max(r.el, r.pe, r.lp, 1);
        const bar = (y, v, c, lab) => `<rect x="110" y="${y}" width="${v / mx * 210}" height="18" rx="5" fill="${c}"/><text x="4" y="${y + 13}" font-size="11">${lab}</text><text x="${114 + v / mx * 210}" y="${y + 13}" font-size="10">${fmt(v)} kg</text>`;
        S.innerHTML = bar(8, r.el, '#f59e0b', T('மின்சாரம்', 'Electricity')) + bar(42, r.pe, '#ef4444', T('பெட்ரோல்', 'Petrol')) + bar(76, r.lp, '#3b82f6', T('சமையல் எரிவாயு', 'LPG'));
        ro([[T('ஒரு மாதம்', 'Per month'), fmt(r.month) + ' kg CO₂'], [T('ஓர் ஆண்டு', 'Per year'), fmt(r.year / 1000, 2) + ' ' + T('டன்', 't')], [T('இதை உறிஞ்ச மரங்கள் (தோராயம்)', 'Trees to absorb it (approx.)'), fmt(r.trees)]]);
      }
      slider(host, T('மின்சாரம் — யூனிட்/மாதம்', 'Electricity — units/month'), 0, 500, 10, u, v => { u = v; draw(); });
      slider(host, T('பெட்ரோல் — லிட்டர்/மாதம்', 'Petrol — litres/month'), 0, 150, 5, pl, v => { pl = v; draw(); });
      slider(host, T('எரிவாயு உருளை (14.2 kg)/மாதம்', 'LPG cylinders (14.2 kg)/month'), 0, 3, .25, cy, v => { cy = v; draw(); });
      note(host, 'தோராயக் காரணிகள்: மின்சாரம் ≈ 0.7 kg CO₂ / யூனிட் (இந்திய மின்தொகுப்புச் சராசரி), பெட்ரோல் ≈ 2.31 kg / லிட்டர், LPG ≈ 2.98 kg / கிலோ; ஒரு முதிர்ந்த மரம் ஆண்டுக்கு சுமார் 20 kg (மரத்துக்கு மரம் மாறும்). இந்த மூன்றை மட்டுமே கணக்கிடுகிறோம் — உணவு, பொருட்கள், பயணம் இல்லை.', 'Approximate factors: electricity ≈ 0.7 kg CO₂/unit (Indian grid average), petrol ≈ 2.31 kg/litre, LPG ≈ 2.98 kg/kg; a mature tree absorbs about 20 kg a year (varies). Only these three are counted — not food, goods or travel.');
    },

    /* 8. weight on other worlds */
    planetWeight(host){
      const W = [['🌍', 'பூமி', 'Earth', 9.81], ['🌙', 'நிலா', 'Moon', 1.62], ['🔴', 'செவ்வாய்', 'Mars', 3.71], ['🟡', 'வெள்ளி', 'Venus', 8.87], ['☿', 'புதன்', 'Mercury', 3.70], ['🟠', 'வியாழன்', 'Jupiter', 24.79], ['🪐', 'சனி', 'Saturn', 10.44]];
      let m = 40, i = 0; const ro = readout(host);
      const row = mk('<div class="row" style="margin-bottom:6px"></div>'); host.insertBefore(row, ro && host.firstChild);
      function draw(){
        row.innerHTML = W.map((w, k) => `<button class="btn sm" data-k="${k}" style="${k === i ? 'background:#3b2fc9;color:#fff' : ''}">${w[0]} ${T(w[1], w[2])}</button>`).join('');
        row.querySelectorAll('button').forEach(b => b.onclick = () => { i = Number(b.dataset.k); draw(); });
        const r = PURE.weightOn(m, W[i][3]);
        ro([[T('உன் நிறை (எங்கும் ஒன்றே)', 'Your mass (same everywhere)'), m + ' kg'], [T('ஈர்ப்பு g', 'Gravity g'), W[i][3] + ' m/s²'], [T('எடை (விசை)', 'Weight (force)'), fmt(r.newton, 0) + ' N'], [T('தராசு காட்டும் அளவு', 'A scale would show'), fmt(r.kgEq, 1) + ' kg']]);
      }
      slider(host, T('உன் நிறை (kg)', 'Your mass (kg)'), 20, 100, 1, m, v => { m = v; draw(); }, ' kg');
      draw();
      note(host, 'நிறை (mass) = உன்னில் எவ்வளவு பொருள் உள்ளது; அது மாறாது. எடை (weight) = அந்த இடத்தின் ஈர்ப்பு உன்னை இழுக்கும் விசை; அது இடத்துக்கு இடம் மாறும். (கோள்களின் மேற்பரப்பு ஈர்ப்பு, தோராய மதிப்புகள்.)', 'Mass = how much matter you have; it never changes. Weight = the pull of gravity at that place; it changes from place to place. (Approximate surface gravity values.)');
    },

    /* 9. DNA strand */
    dna(host, p){
      const box = mk(`<div class="ctrl" style="grid-template-columns:1fr"><input class="ans" style="width:100%;font-family:monospace;letter-spacing:.15em" maxlength="30" value="${esc(p.seq || 'TACGGCTAA')}"></div><div class="out" style="margin-top:8px;font-family:monospace;font-size:1rem;overflow-x:auto"></div>`);
      host.appendChild(box); const inp = box.querySelector('input'), out = box.querySelector('.out');
      const col = {A: '#ef4444', T: '#3b82f6', C: '#16a34a', G: '#f59e0b', U: '#8b5cf6'};
      const paint = s => s.split('').map(c => `<b style="color:${col[c] || '#000'}">${c}</b>`).join(' ');
      function draw(){
        const d = PURE.dna(inp.value);
        if(!d.s){ out.textContent = T('A, T, C, G எழுத்துகளை மட்டும் தட்டச்சு செய்', 'Type only the letters A, T, C, G'); return; }
        out.innerHTML = `<div>${T('உன் இழை', 'Your strand')} &nbsp;&nbsp;: ${paint(d.s)}</div><div style="color:#94a3b8">${T('இணைப்பு', 'pairs')} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${d.s.split('').map(() => '|').join(' ')}</div><div>${T('எதிர் இழை (DNA)', 'Partner strand (DNA)')}: ${paint(d.comp)}</div>
          <div style="margin-top:8px">${T('இதிலிருந்து mRNA', 'mRNA made from it')}: ${paint(d.rna)}</div><div>${T('மும்மைக் குறியீடுகள் (codons)', 'Codons (triplets)')}: ${d.codons.map(c => `<span style="background:#eef0f7;border-radius:8px;padding:2px 6px;margin:0 2px">${paint(c)}</span>`).join('')}</div>`;
      }
      inp.oninput = draw; draw();
      note(host, 'விதி: A↔T, C↔G (DNA-வில்). mRNA-வில் T-க்குப் பதிலாக U வரும். ஒவ்வொரு 3 எழுத்தும் (codon) ஓர் அமினோ அமிலத்தைக் குறிக்கும் — அவற்றின் வரிசையே ஒரு புரதம். இங்கே ஒரு சிறிய எடுத்துக்காட்டு மட்டும்; உண்மையான மரபணுக்கள் ஆயிரக்கணக்கான எழுத்துகள் கொண்டவை.', 'Rule: A↔T, C↔G in DNA. In mRNA, U replaces T. Every 3 letters (a codon) stand for one amino acid — the chain of them is a protein. This is a tiny demo; real genes have thousands of letters.');
    },

    /* 10. sense → think → act: a thermostat */
    thermostat(host){
      const S = svg(host, 340, 190), ro = readout(host); let set = 24, out = 36, Tm = 33, ac = false; const hist = []; let iv = null;
      const bt = mk(`<div class="row" style="margin-top:8px"><button class="btn p sm run">▶ ${T('தொடங்கு', 'Start')}</button><button class="btn sm rst">↺ ${T('மீண்டும்', 'Reset')}</button></div>`); host.appendChild(bt);
      function draw(){
        const X = i => 30 + i / 59 * 294, Y = t => 170 - (t - 18) / 24 * 150;
        let g = `<rect x="30" y="${Y(set + 1)}" width="294" height="${Y(set - 1) - Y(set + 1)}" fill="#dcfce7"/><line x1="30" x2="324" y1="${Y(out)}" y2="${Y(out)}" stroke="#f97316" stroke-dasharray="4 3"/><text x="32" y="${Y(out) - 3}" font-size="10" fill="#f97316">${T('வெளிப்புறம்', 'Outside')} ${out}°</text><text x="32" y="${Y(set) + 4}" font-size="10" fill="#15803d">${T('விரும்பியது', 'Set')} ${set}° ±1</text>`;
        if(hist.length > 1) g += `<path d="${path(hist.map((t, i) => [i, t]), X, Y)}" fill="none" stroke="#3b2fc9" stroke-width="3"/>`;
        S.innerHTML = g + `<text x="250" y="16" font-size="12" font-weight="700" fill="${ac ? '#0369a1' : '#64748b'}">${ac ? '❄️ AC ON' : '💤 AC OFF'}</text>`;
        ro([[T('உணர்வு — அறை வெப்பம்', 'SENSE — room temp'), Tm.toFixed(1) + '°C'], [T('முடிவு', 'THINK'), Tm > set + 1 ? T('சூடு அதிகம்', 'too hot') : Tm < set - 1 ? T('போதும் குளிர்', 'cool enough') : T('சரியான வரம்பு', 'in range')], [T('செயல்', 'ACT'), ac ? T('குளிர்விப்பு', 'cooling') : T('நிறுத்தம்', 'idle')]]);
      }
      function step(){
        if(!host.isConnected){ clearInterval(iv); return; }
        const r = PURE.thermoStep(Tm, out, set, ac); Tm = r.T; ac = r.acOn; hist.push(Tm); if(hist.length > 60) hist.shift(); draw();
      }
      const run = bt.querySelector('.run');
      run.onclick = () => { if(iv){ clearInterval(iv); iv = null; run.textContent = '▶ ' + T('தொடங்கு', 'Start'); } else { iv = setInterval(step, 350); run.textContent = '⏸ ' + T('நிறுத்து', 'Pause'); } };
      bt.querySelector('.rst').onclick = () => { Tm = out - 3; ac = false; hist.length = 0; draw(); };
      slider(host, T('விரும்பும் வெப்பம் °C', 'Set temperature °C'), 20, 30, 1, set, v => { set = v; draw(); }, '°');
      slider(host, T('வெளிப்புற வெப்பம் °C', 'Outside temperature °C'), 28, 42, 1, out, v => { out = v; draw(); }, '°');
      draw();
      note(host, 'ஒவ்வொரு தானியங்கி இயந்திரமும் (ரோபோ, ட்ரோன், தானோட்டிக் கார்) இதே சுழற்சி: உணர் → யோசி → செயல்படு → மீண்டும். இங்கே "யோசி" என்பது ஒரே ஒரு விதி: அதிகம் சூடானால் ஆன், போதுமான குளிர்ந்தால் ஆஃப்.', 'Every automatic machine (robot, drone, self-driving car) runs this same loop: sense → think → act → repeat. Here "think" is one rule: switch on if too hot, off when cool enough.');
    }
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
