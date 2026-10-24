'use strict'; require('../farm-core.js'); const F = globalThis.KALVI_FARM; const assert = require('assert'); let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); }, near = (a, b, e, m) => ok(Math.abs(a - b) <= (e || 1e-6), m + ' got ' + a + ' want ' + b);
near(F.convertArea(1, 'acre', 'cent'), 100, 1e-9, '1 acre = 100 cent');
near(F.convertArea(1, 'cent', 'sqft'), 435.6, 1e-9, 'cent sqft');
near(F.convertArea(1, 'hectare', 'acre'), 2.4710538147, 1e-9, 'ha');
near(F.convertArea(1, 'acre', 'sqm'), 4046.8564224, 0.01, 'acre sqm');
near(F.convertArea(1, 'veli', 'acre'), 6.61157, 0.001, 'veli ≈ 6.61 acre at kuzhi 144');
near(F.convertArea(1, 'kani', 'acre'), 1.3223, 0.001, 'kani ≈ 1.32 acre');
near(F.convertArea(1, 'ma', 'kuzhi'), 100, 1e-9, 'ma');
near(F.convertArea(1, 'veli', 'ma'), 20, 1e-9, 'veli = 20 ma');
near(F.convertArea(1, 'kani', 'ma'), 4, 1e-9, 'kani = 4 ma');
near(F.convertArea(1, 'ground', 'sqft'), 2400, 1e-9, 'ground');
near(F.convertArea(1, 'kuzhi', 'sqft', 100), 100, 1e-9, 'local kuzhi size is honoured');
for(const a of Object.keys(F.AREA)) for(const b of Object.keys(F.AREA)){ near(F.convertArea(F.convertArea(7, a, b, 150), b, a, 150), 7, 1e-9, 'roundtrip ' + a + b); }
near(F.plantsPerAcre(1, 1), 43560, 1e-9, 'plants'); near(F.plantsPerAcre(0.75, 0.75), 77440, 1, 'plants 9in x 9in');
ok(F.plantsPerAcre(0, 1) === 0, 'zero guard');
// fertiliser: TNAU 125:50:50 kg/ha for 1 ha
const p = F.fertPlan({N: 125, P2O5: 50, K2O: 50}, 1 / F.HA_PER_ACRE);   // exactly 1 ha
near(p.nutrient.N, 125, 1e-9, 'N'); near(p.products.dap, 50 / 0.46, 1e-9, 'DAP'); near(p.nCredit, 50 / 0.46 * 0.18, 1e-9, 'N credit from DAP');
near(p.products.urea, (125 - 50 / 0.46 * 0.18) / 0.46, 1e-9, 'urea after DAP credit'); near(p.products.mop, 50 / 0.6, 1e-9, 'MOP');
const nutrientBack = p.products.urea * 0.46 + p.products.dap * 0.18; near(nutrientBack, 125, 1e-9, 'N supplied equals dose');
const s = F.fertPlan({N: 125, P2O5: 50, K2O: 50}, 1 / F.HA_PER_ACRE, 'ssp'); near(s.products.ssp, 50 / 0.16, 1e-9, 'SSP'); near(s.products.urea, 125 / 0.46, 1e-9, 'urea w/o credit'); ok(s.products.dap === undefined, 'no DAP with SSP');
const half = F.fertPlan({N: 125, P2O5: 50, K2O: 50}, 0.5 / F.HA_PER_ACRE); near(half.products.urea * 2, p.products.urea, 1e-9, 'scales linearly');
ok(F.fertPlan({N: 10, P2O5: 100, K2O: 0}, 1).products.urea === 0, 'urea never negative when DAP gives more N than the dose');
ok(F.splitEqual(100, 4).every(x => x === 25), 'split');
// dilution
near(F.mlPerLitre(3), 30, 1e-9, '3% = 30 ml/L'); near(F.mlPerTank(3, 10), 300, 1e-9, '300 ml per 10 L'); near(F.mlPerTank(3, 16), 480, 1e-9, '16 L tank');
near(F.tanksNeeded(2, 200, 16), 25, 1e-9, 'tanks');
// economics
const e = F.economics({paidOut: 20000, familyLabour: 8000, ownedLandRent: 6000, ownedCapitalInterest: 1000, yield: 2000, price: 22});
ok(e.a2fl === 28000 && e.c2 === 35000 && e.revenue === 44000, 'costs'); ok(e.netOverC2 === 9000 && e.netOverA2FL === 16000, 'net');
near(e.breakEvenPriceC2, 17.5, 1e-9, 'breakeven price'); near(e.breakEvenYieldC2, 35000 / 22, 1e-9, 'breakeven yield');
ok(F.economics({paidOut: 1, yield: 0, price: 5}).breakEvenPriceC2 === null, 'no yield -> null');
// plots
const c = F.comparePlots({areaCent: 10, yield: 200, price: 20, cost: 1500, labourHours: 40}, {areaCent: 10, yield: 220, price: 20, cost: 2200, labourHours: 30});
near(c.test.yield, 2000, 1e-9, 'per-acre yield'); near(c.yieldDiffPct, -100 / 11, 1e-6, 'yield diff %'); near(c.costDiffPct, (15000 - 22000) / 22000 * 100, 1e-6, 'cost diff %');
near(c.netDiff, (40000 - 15000) - (44000 - 22000), 1e-6, 'net diff'); near(c.labourDiff, 400 - 300, 1e-9, 'labour diff');
ok(F.comparePlots({areaCent: 0, yield: 1, price: 1, cost: 1}, {areaCent: 10, yield: 1, price: 1, cost: 1}) === null, 'zero area -> null');
ok(F.SEASONS.length === 4, 'seasons');
// organic inputs (TNAU / NIOS figures)
const pg = F.scaleRecipe('panchagavya', 1); ok(pg.length === 9, 'panchagavya has 9 ingredients');
near(pg.find(i => i.en === 'Cow dung').q, 7, 1e-9, 'dung 7 kg'); near(pg.find(i => i.en === 'Cow ghee').q, 1, 1e-9, 'ghee 1 kg');
near(F.scaleRecipe('panchagavya', 2).find(i => i.en === 'Jaggery').q, 6, 1e-9, 'x2 jaggery 6 kg'); near(F.scaleRecipe('panchagavya', 0.5).find(i => i.u === 'no').q, 6, 1e-9, 'half = 6 bananas');
ok(F.scaleRecipe('panchagavya', 0) === null && F.scaleRecipe('nope', 1) === null, 'bad input -> null');
near(F.stockNeeded(3, 100), 3, 1e-9, '3 L per 100 L'); near(F.stockNeeded(3, 10) * 1000, 300, 1e-9, '300 ml per 10 L tank');
const jv = F.scaleRecipe('jeevamirtha' in F.RECIPES ? 'jeevamirtha' : 'jeevamrita', 2); near(jv[0].q, 400, 1e-9, 'jeevamrita x2 = 400 L water');
near(F.recipeNeed('amudham', 2).min, 40, 1e-9, 'amudham 20 L/acre x2'); near(F.recipeNeed('amudham', 2).max, 60, 1e-9, 'amudham 30 L/acre x2'); ok(F.recipeNeed('panchagavya', 1) === null, 'no per-acre range for panchagavya');
for(const id of Object.keys(F.RECIPES)){ const r = F.RECIPES[id]; ok(F.SOURCES[r.src], id + ' has a source'); ok(r.steps.ta.length === r.steps.en.length, id + ' steps in both languages'); }
const gm = F.greenManureSeed('dhaincha', 1); near(gm.min, 50 * F.HA_PER_ACRE, 1e-9, 'dhaincha 50 kg/ha -> ~20 kg/acre'); near(gm.min, 20.23, 0.01, 'dhaincha per acre');
near(F.greenManureSeed('sunnhemp', 1).max, 35 * F.HA_PER_ACRE, 1e-9, 'sunnhemp max'); ok(F.greenManureSeed('x', 1) === null, 'unknown crop');
ok(F.GREEN_MANURE.length === 6, 'six green manures');
ok(F.VARIETIES.length === 5 && F.VARIETIES.every(v => F.SOURCES[v.src] && v.ta && v.en && v.days), 'varieties sourced');
ok(F.VARIETIES.find(v => v.id === 'mapillai').yieldTxt === null, 'unstated yield stays null (never invented)');
console.log('OK — ' + n + ' farm-core checks passed');
