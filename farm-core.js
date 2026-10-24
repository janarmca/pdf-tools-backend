/* Uzhavar Tools (உழவர் கருவிப்பெட்டி) — pure calculation functions, no network, no AI.
   Tested by tests/farm-core.test.cjs. Every constant carries its source in SOURCES. */
(function(G){
'use strict';
const SQFT_PER_SQM = 10.7639104167;
// area units in square feet. kuzhi/ma/kani/veli depend on the local kuzhi size (default 144 sq ft) — they differ between places.
const AREA = {
  sqft: {f: 1, ta: 'சதுர அடி', en: 'sq ft'},
  sqm: {f: SQFT_PER_SQM, ta: 'சதுர மீட்டர்', en: 'sq m'},
  cent: {f: 435.6, ta: 'சென்ட்', en: 'cent'},
  acre: {f: 43560, ta: 'ஏக்கர்', en: 'acre'},
  hectare: {f: 43560 * 2.4710538147, ta: 'ஹெக்டேர்', en: 'hectare'},
  ground: {f: 2400, ta: 'கிரவுண்டு (மனை)', en: 'ground'},
  kuzhi: {k: 1, ta: 'குழி', en: 'kuzhi'},
  ma: {k: 100, ta: 'மா', en: 'ma'},
  kani: {k: 400, ta: 'காணி', en: 'kani'},
  veli: {k: 2000, ta: 'வேலி', en: 'veli'}
};
function sqftOf(unit, kuzhiSqft){ const u = AREA[unit]; if(!u) throw new Error('unit ' + unit); return u.k ? u.k * kuzhiSqft : u.f; }
function convertArea(value, from, to, kuzhiSqft){ kuzhiSqft = kuzhiSqft || 144; return value * sqftOf(from, kuzhiSqft) / sqftOf(to, kuzhiSqft); }

const plantsPerAcre = (rowFt, plantFt) => (rowFt > 0 && plantFt > 0) ? 43560 / (rowFt * plantFt) : 0;
const plantsPerCent = (rowFt, plantFt) => (rowFt > 0 && plantFt > 0) ? 435.6 / (rowFt * plantFt) : 0;

// fertiliser grades (% nutrient) — FCO standard grades; verify against the bag label
const GRADE = {urea: {N: 46}, dap: {N: 18, P2O5: 46}, ssp: {P2O5: 16}, mop: {K2O: 60}};
const HA_PER_ACRE = 0.40468564224;
// dose in kg nutrient per hectare -> kg product for `acres`
function fertPlan(dosePerHa, acres, phosphorusSource){
  const f = acres * HA_PER_ACRE, N = (dosePerHa.N || 0) * f, P = (dosePerHa.P2O5 || 0) * f, K = (dosePerHa.K2O || 0) * f;
  const out = {nutrient: {N, P2O5: P, K2O: K}, products: {}, nCredit: 0};
  if(P > 0){
    if(phosphorusSource === 'ssp'){ out.products.ssp = P / (GRADE.ssp.P2O5 / 100); }
    else { out.products.dap = P / (GRADE.dap.P2O5 / 100); out.nCredit = out.products.dap * GRADE.dap.N / 100; }
  }
  const nLeft = Math.max(0, N - out.nCredit);
  out.products.urea = nLeft / (GRADE.urea.N / 100);
  out.products.mop = K > 0 ? K / (GRADE.mop.K2O / 100) : 0;
  return out;
}
// split a total into equal parts (TNAU splits N and K in four equal parts for transplanted rice)
const splitEqual = (total, n) => Array.from({length: n}, () => total / n);

// dilution: percent solution -> ml of concentrate per litre of water / per tank
const mlPerLitre = pct => pct * 10;
const mlPerTank = (pct, tankLitres) => pct * 10 * tankLitres;
const tanksNeeded = (areaAcre, litresPerAcre, tankLitres) => (tankLitres > 0) ? areaAcre * litresPerAcre / tankLitres : 0;

// cost & break-even (CACP concepts: A2+FL = paid-out costs + family labour; C2 adds rent/interest on owned land & capital)
function economics(o){
  const cost = (o.paidOut || 0) + (o.familyLabour || 0) + (o.ownedLandRent || 0) + (o.ownedCapitalInterest || 0);
  const a2fl = (o.paidOut || 0) + (o.familyLabour || 0);
  const yieldQ = o.yield || 0, price = o.price || 0, revenue = yieldQ * price;
  return {a2fl, c2: cost, revenue, netOverA2FL: revenue - a2fl, netOverC2: revenue - cost,
    breakEvenPriceA2FL: yieldQ > 0 ? a2fl / yieldQ : null, breakEvenPriceC2: yieldQ > 0 ? cost / yieldQ : null,
    breakEvenYieldC2: price > 0 ? cost / price : null};
}
// test plot vs comparison plot, both scaled to per-acre
function perAcre(plot){
  const a = plot.areaCent / 100; if(!(a > 0)) return null;
  const e = economics({paidOut: plot.cost, familyLabour: 0, yield: plot.yield, price: plot.price});
  return {yield: plot.yield / a, cost: plot.cost / a, revenue: e.revenue / a, net: (e.revenue - plot.cost) / a, labourHours: (plot.labourHours || 0) / a};
}
function comparePlots(test, ctrl){
  const t = perAcre(test), c = perAcre(ctrl); if(!t || !c) return null;
  const pct = (x, y) => y !== 0 ? (x - y) / Math.abs(y) * 100 : null;
  return {test: t, ctrl: c, yieldDiffPct: pct(t.yield, c.yield), costDiffPct: pct(t.cost, c.cost), netDiff: t.net - c.net, labourDiff: t.labourHours - c.labourHours};
}

// TNAU rice seasons for the Cauvery delta (sowing/planting months)
const SEASONS = [
  {id: 'kuruvai', ta: 'குறுவை', en: 'Kuruvai', months: {ta: 'ஜூன் – ஜூலை', en: 'Jun – Jul'}},
  {id: 'samba', ta: 'சம்பா', en: 'Samba', months: {ta: 'ஆகஸ்ட்', en: 'Aug'}},
  {id: 'thaladi', ta: 'பின் சம்பா / தாளடி', en: 'Late Samba / Thaladi', months: {ta: 'செப்டம்பர் – அக்டோபர்', en: 'Sep – Oct'}},
  {id: 'navarai', ta: 'நவரை', en: 'Navarai', months: {ta: 'டிசம்பர் – ஜனவரி', en: 'Dec – Jan'}}
];

// ---- Organic / traditional inputs — only recipes with a named official source ----
// Each recipe is ONE base batch; scaleRecipe multiplies every ingredient by `factor`.
const RECIPES = {
  panchagavya: {ta: 'பஞ்சகவ்யம்', en: 'Panchagavya', src: 'tnauPanchagavya', days: 30,
    ing: [
      {ta: 'மாட்டுச் சாணம்', en: 'Cow dung', q: 7, u: 'kg', step: 1}, {ta: 'பசு நெய்', en: 'Cow ghee', q: 1, u: 'kg', step: 1},
      {ta: 'மாட்டுச் சிறுநீர்', en: 'Cow urine', q: 10, u: 'L', step: 2}, {ta: 'தண்ணீர்', en: 'Water', q: 10, u: 'L', step: 2},
      {ta: 'பசும்பால்', en: 'Cow milk', q: 3, u: 'L', step: 3}, {ta: 'பசுந்தயிர்', en: 'Cow curd', q: 2, u: 'L', step: 3},
      {ta: 'இளநீர்', en: 'Tender coconut water', q: 3, u: 'L', step: 3}, {ta: 'வெல்லம்', en: 'Jaggery', q: 3, u: 'kg', step: 3},
      {ta: 'நன்கு பழுத்த பூவன் வாழைப்பழம்', en: 'Well-ripened poovan bananas', q: 12, u: 'no', step: 3}],
    steps: {ta: ['சாணம் + நெய்யைக் கலந்து காலை, மாலை கிளறி 3 நாள் வைக்கவும்.', '3 நாள் கழித்து சிறுநீர் + தண்ணீர் சேர்த்து, தினமும் இருமுறை கிளறி 15 நாள் வைக்கவும்.', '15 நாள் கழித்து பால், தயிர், இளநீர், வெல்லம், வாழைப்பழம் சேர்க்கவும்.', 'மொத்தம் 30 நாளில் தாய்க் கரைசல் தயார். நிழலில், ஈ புகாதபடி கம்பி வலை / கொசுவலை போட்டு மூடி, தினமும் காலை-மாலை கிளறவும்.'],
      en: ['Mix dung + ghee, stir morning and evening, keep 3 days.', 'After 3 days add urine + water, stir twice daily, keep 15 days.', 'After 15 days add milk, curd, coconut water, jaggery and bananas.', 'Stock solution is ready after 30 days in all. Keep in shade, covered with wire mesh / mosquito net against flies, and stir morning and evening.']},
    use: {ta: 'இலைவழித் தெளிப்பு: 3% (100 L நீருக்கு 3 L). பாசனத்தோடு: ஹெக்டேருக்கு 50 L. விதை/நாற்று நேர்த்தி: 3% கரைசலில் 20 நிமிடம். தெளிப்பு: பூக்கும் முன் 15 நாளுக்கு ஒருமுறை 2 முறை; பூ/காய் பிடிக்கும்போது 10 நாளுக்கு ஒருமுறை 2 முறை; முதிர்வில் 1 முறை.', en: 'Foliar spray: 3% (3 L per 100 L water). Through irrigation: 50 L per hectare. Seed / seedling treatment: 20 min in 3% solution. Sprays: 2 before flowering (every 15 days), 2 at flowering and pod setting (every 10 days), 1 at maturation.'},
    note: {ta: 'TNAU பக்கம்: எருமைப் பொருட்களைத் தவிர்க்கவும்; நாட்டு மாட்டுப் பொருட்கள் சிறந்தவை என்று கூறுகிறது.', en: 'TNAU page: avoid buffalo products; says local cow breeds are more potent.'}},
  amudham: {ta: 'செறிவூட்டிய அமுதக் கரைசல்', en: 'Concentrated Amudham solution', src: 'tnauAmudham', days: 5,
    ing: [{ta: 'மாட்டுச் சிறுநீர்', en: 'Cattle urine', q: 5, u: 'L'}, {ta: 'சாணம்', en: 'Dung', q: 1, u: 'kg'}, {ta: 'கழிவுப் பழச்சாறு (ஏதேனும்)', en: 'Juice of any waste fruit', q: 1, u: 'L'}],
    steps: {ta: ['சாணத்தை சிறுநீரில் நன்கு கரைக்கவும்.', 'பழச்சாறு சேர்த்து நன்கு கலக்கவும்.', '5 நாள் வைக்கவும்.'], en: ['Mix the dung thoroughly into the urine.', 'Add the fruit juice and stir well.', 'Keep for 5 days.']},
    use: {ta: 'பாசன நீரோடு மட்டும் — தெளிக்கக் கூடாது. ஏக்கருக்கு 20–30 L. (வெல்லம் தேவையில்லை; சாதாரண அமுதக் கரைசலுக்கு 50–100 L/ஏக்கர் தேவை என்று TNAU கூறுகிறது.)', en: 'For irrigation only — not for spraying. 20–30 L per acre. (No jaggery needed; TNAU says ordinary Amudham needs 50–100 L per acre.)'},
    perAcre: {min: 20, max: 30}},
  jeevamrita: {ta: 'ஜீவாமிர்தம்', en: 'Jeevamrita', src: 'niosJeeva', days: 2,
    ing: [{ta: 'தண்ணீர்', en: 'Water', q: 200, u: 'L'}, {ta: 'புதிய நாட்டு மாட்டுச் சாணம்', en: 'Fresh local cow dung', q: 10, u: 'kg'}, {ta: 'பழைய மாட்டுச் சிறுநீர்', en: 'Aged cow urine', q: 10, u: 'L'},
      {ta: 'வெல்லம்', en: 'Jaggery', q: 2, u: 'kg'}, {ta: 'பயறு மாவு', en: 'Pulse flour', q: 2, u: 'kg'}, {ta: 'வரப்பு மண் (கைப்பிடி)', en: 'Soil from the farm bund (a handful)', q: 1, u: 'handful'}],
    steps: {ta: ['பீப்பாயில் 200 L தண்ணீர் எடுத்து எல்லாப் பொருட்களையும் கலக்கவும்.', 'நிழலில் 48 மணி நேரம் புளிக்க விடவும் (அதே நூலின் மற்றொரு பகுதி 4–5 நாள் என்கிறது — உங்கள் KVK-யிடம் உறுதிசெய்யவும்).'], en: ['Put 200 L water in a barrel and mix in everything.', 'Ferment 48 hours in shade (another section of the same text says 4–5 days — confirm with your KVK).']},
    use: {ta: '200 L ஒரு ஏக்கருக்குப் போதும்; மாதம் இருமுறை பாசன நீரோடு, அல்லது 10% இலைவழித் தெளிப்பு.', en: '200 L is enough for one acre; twice a month with irrigation water, or as a 10% foliar spray.'},
    note: {ta: 'இது இயற்கை வேளாண் (ZBNF) மரபுச் செய்முறை; இதன் விளைச்சல் பலனுக்கு உங்கள் சோதனை நிலத்தில் ஒப்பிட்டுப் பாருங்கள்.', en: 'A natural-farming (ZBNF) tradition recipe; check its yield effect yourself with a trial plot.'}}
};
function scaleRecipe(id, factor){
  const r = RECIPES[id]; if(!r || !(factor > 0)) return null;
  return r.ing.map(i => ({ta: i.ta, en: i.en, u: i.u, q: i.q * factor}));
}
// stock solution needed for a spray: litres of finished spray × percent
const stockNeeded = (pct, sprayLitres) => pct / 100 * sprayLitres;
// litres of solution needed per acre range → total range for `acres`
const recipeNeed = (id, acres) => { const r = RECIPES[id]; if(!r || !r.perAcre || !(acres > 0)) return null; return {min: r.perAcre.min * acres, max: r.perAcre.max * acres}; };

// Green manure crops — TNAU Agritech (seed rate kg/ha for green manure; incorporate days after sowing)
const GREEN_MANURE = [
  {id: 'sithagathi', ta: 'சித்தகத்தி', en: 'Sithagathi (Sesbania speciosa)', kgHa: [30, 40], dasMin: 45, dasMax: 60, bioT: '15–18'},
  {id: 'dhaincha', ta: 'தக்கைப்பூண்டு', en: 'Dhaincha (Sesbania aculeata)', kgHa: [50, 50], dasMin: 45, dasMax: 60, bioT: '25'},
  {id: 'manila', ta: 'மணிலா அகத்தி', en: 'Manila agathi (Sesbania rostrata)', kgHa: [40, 40], dasMin: 45, dasMax: 50, bioT: '20'},
  {id: 'sunnhemp', ta: 'சணப்பை', en: 'Sunnhemp (Crotalaria juncea)', kgHa: [25, 35], dasMin: 45, dasMax: 60, bioT: '13–15'},
  {id: 'tephrosia', ta: 'கொழிஞ்சி', en: 'Wild indigo (Tephrosia purpurea)', kgHa: [15, 20], dasMin: null, dasMax: 60, bioT: '6–7'},
  {id: 'pillipesara', ta: 'பில்லிபெசரா', en: 'Pillipesara (Phaseolus trilobus)', kgHa: [10, 15], dasMin: null, dasMax: 60, bioT: '6–7'}
];
function greenManureSeed(id, acres){
  const g = GREEN_MANURE.find(x => x.id === id); if(!g || !(acres > 0)) return null;
  const ha = acres * HA_PER_ACRE; return {min: g.kgHa[0] * ha, max: g.kgHa[1] * ha};
}

// Traditional rice varieties — values exactly as on TNAU Agritech ITK pages (null = not stated there)
const VARIETIES = [
  {id: 'kullakar', ta: 'குள்ளகார்', en: 'Kullakar', days: '90–105', season: {ta: 'கோடை', en: 'Summer'}, yieldTxt: {ta: '15–30 மூட்டை (75 அல்லது 100 கிலோ)', en: '15–30 bags (75 or 100 kg)'}, claim: {ta: 'வறட்சி, பூச்சி, நோய் எதிர்ப்பு உடையது என TNAU கூறுகிறது; வைக்கோல் கூரைக்கு விரும்பப்படுகிறது; இட்லி, தோசை, புட்டு, கஞ்சிக்குப் பயன். கொழுப்பு, சர்க்கரை கட்டுப்பாடு, துத்தநாகம்-இரும்பு அதிகம் என்பது பாரம்பரிய/கூற்று நிலை.', en: 'TNAU says highly drought, pest and disease resistant; straw preferred for roofing; used for idli, dosa, puttu, porridge. Cholesterol / blood-sugar and zinc-iron claims are traditional claims.'}, src: 'tnauKullakar'},
  {id: 'kavuni', ta: 'கருப்புக் கவுனி', en: 'Karuppu Kavuni', days: '155', season: {ta: 'செப்டம்பர் – ஜனவரி', en: 'Sep – Jan'}, yieldTxt: {ta: '1,800 கிலோ / ஏக்கர்', en: '1,800 kg / acre'}, claim: {ta: 'மருத்துவ குணம் உண்டு என்று TNAU பக்கம் கூறுகிறது (பாரம்பரியக் கூற்று).', en: 'TNAU page says it has medicinal properties (traditional claim).'}, src: 'tnauKavuni'},
  {id: 'mapillai', ta: 'மாப்பிள்ளை சம்பா', en: 'Mapillai Samba', days: '155–160', season: null, yieldTxt: null, claim: {ta: 'செரிமானத்தை மேம்படுத்தும், வாய்ப்புண் ஆற்றும் என்று கூறப்படுகிறது; மணமகனுக்கு வலிமைக்காகத் தரப்பட்டது (பாரம்பரியக் கூற்று).', en: 'Said to improve digestion and cure mouth ulcers; once given to grooms for strength (traditional claim).'}, src: 'tnauMapillai'},
  {id: 'thooyamalli', ta: 'தூயமல்லி', en: 'Thooyamalli', days: '135–140', season: {ta: 'சம்பா', en: 'Samba'}, yieldTxt: {ta: '1,125 கிலோ / ஏக்கர்', en: '1,125 kg / acre'}, claim: {ta: 'உணவுக்கு ஏற்றது; பிரியாணிக்கு ஏற்றது; நரம்புகளுக்கு வலிமை என்று கூறப்படுகிறது (பாரம்பரியக் கூற்று).', en: 'Good for food and biriyani; said to strengthen nerves (traditional claim).'}, src: 'tnauMapillai'},
  {id: 'kichadi', ta: 'கிச்சடி சம்பா', en: 'Kichadi Samba', days: '130–140', season: {ta: 'ஜூலை – ஆகஸ்ட் விதைப்பு', en: 'Sown Jul – Aug'}, yieldTxt: null, claim: {ta: 'ஒரு விவசாயி சில தோல் நோய்களுக்கு நல்லது என்கிறார் (தனிநபர் கூற்று).', en: 'One farmer says it is good for some skin diseases (single-farmer claim).'}, src: 'tnauKavuni'}
];
const SOURCES = {
  tnauRice: 'TNAU Agritech — Rice fertiliser schedule (agritech.tnau.ac.in/agriculture/agri_cropproduction_cereal_rice_wetseededpudled_fertilizer.html)',
  tnauSeason: 'TNAU Agritech — Paddy seasons (agritech.tnau.ac.in/expert_system/paddy/season.html)',
  tnauAmudham: 'TNAU Agritech — Concentrated Amudham solution (agritech.tnau.ac.in/org_farm/orgfarm_cropproduction_plantprotection_concentrated_amudham.html)',
  niosJeeva: 'NIOS (Govt. of India) Indian Knowledge Tradition, Vocational Level C, ch. 11 §11.3–11.4 (nios.ac.in) — Jeevamrita',
  tnauGreen: 'TNAU Agritech — Green manures (agritech.tnau.ac.in/agriculture/agri_greenmanuring_agronomygreenmanures.html)',
  tnauKullakar: 'TNAU Agritech ITK — Kullakar (agritech.tnau.ac.in/itk/rice_variety_kullakar.html)',
  tnauKavuni: 'TNAU Agritech ITK — Karuppukavuni / Kichadi Samba (agritech.tnau.ac.in/itk/rice_variety_karuppukavuni.html)',
  tnauMapillai: 'TNAU Agritech ITK — Mapillai Samba & Thooyamalli (agritech.tnau.ac.in/itk/rice_variety_mapillai&thuyamalli.html)',
  tnauPanchagavya: 'TNAU Agritech — Panchagavya (agritech.tnau.ac.in/org_farm/orgfarm_panchakavya.html): 3% foliar spray'
};
G.KALVI_FARM = {AREA, convertArea, sqftOf, plantsPerAcre, plantsPerCent, GRADE, fertPlan, splitEqual, mlPerLitre, mlPerTank, tanksNeeded, economics, perAcre, comparePlots, SEASONS, SOURCES, HA_PER_ACRE, RECIPES, scaleRecipe, stockNeeded, recipeNeed, GREEN_MANURE, greenManureSeed, VARIETIES};
})(typeof window !== 'undefined' ? window : globalThis);
