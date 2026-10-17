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
const SOURCES = {
  tnauRice: 'TNAU Agritech — Rice fertiliser schedule (agritech.tnau.ac.in/agriculture/agri_cropproduction_cereal_rice_wetseededpudled_fertilizer.html)',
  tnauSeason: 'TNAU Agritech — Paddy seasons (agritech.tnau.ac.in/expert_system/paddy/season.html)',
  tnauPanchagavya: 'TNAU Agritech — Panchagavya (agritech.tnau.ac.in/org_farm/orgfarm_panchakavya.html): 3% foliar spray'
};
G.KALVI_FARM = {AREA, convertArea, sqftOf, plantsPerAcre, plantsPerCent, GRADE, fertPlan, splitEqual, mlPerLitre, mlPerTank, tanksNeeded, economics, perAcre, comparePlots, SEASONS, SOURCES, HA_PER_ACRE};
})(typeof window !== 'undefined' ? window : globalThis);
