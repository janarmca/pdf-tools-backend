// node tests/promo-brain.test.mjs — trend parsing, calendar, scoring maths, meta skip logic.
import { parseTrendsRss, calendarSignals, scoreTools, chooseTool, INTENT } from '../.github/scripts/promo-brain.mjs';
import { metaConfigured, postFacebookReel, postInstagramReel } from '../.github/scripts/promo-meta.mjs';
import { CATALOG } from '../cloudflare/src/promo-catalog.js';
let f = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) f++; };

const xml = `<rss><channel><item><title>ITR filing last date</title><ht:approx_traffic>200,000+</ht:approx_traffic></item><item><title><![CDATA[Gold rate today]]></title><ht:approx_traffic>50,000+</ht:approx_traffic></item><item><title>Cricket score</title><ht:approx_traffic>1,000,000+</ht:approx_traffic></item></channel></rss>`;
const tr = parseTrendsRss(xml);
ok(tr.length === 3 && tr[0].traffic === 200000 && tr[1].title === 'Gold rate today', 'RSS parsed (titles, CDATA, traffic)');
ok(parseTrendsRss('').length === 0 && parseTrendsRss('<html>x</html>').length === 0, 'garbage / empty feed gives no trends');
ok(INTENT.every((i) => i.tools.every((id) => CATALOG.some((t) => t.id === id))), 'every tool id in the intent table exists in the catalogue');

const d = new Date('2026-07-20T06:00:00Z');
ok(calendarSignals(d).some((s) => s.tools.includes('incometaxcalc')), 'ITR deadline signal near 31 July');
ok(calendarSignals(new Date('2026-10-03T06:00:00Z')).some((s) => s.tools.includes('tdsdates')), 'TDS 7th-of-month signal');

const r1 = chooseTool({ catalog: CATALOG, trends: tr, date: new Date('2026-09-12T06:00:00Z'), history: [] });
ok(['incometaxcalc', 'pantan', 'tdsdates'].includes(r1.id) && /ITR|trending/.test(r1.reason + r1.trend), `trending ITR drives the pick (${r1.id}: ${r1.reason})`);
const r0 = chooseTool({ catalog: CATALOG, trends: [], date: new Date('2026-09-12T06:00:00Z'), history: [] });
ok(!!r0.id && r0.top.length === 5, `works with no trends (${r0.id}: ${r0.reason})`);
ok(JSON.stringify(chooseTool({ catalog: CATALOG, trends: tr, date: new Date('2026-09-12T06:00:00Z'), history: [] })) === JSON.stringify(r1), 'deterministic for the same inputs');

// freshness: the tool posted yesterday must lose to a fresh one
const hist = [{ tool_id: r1.id, created_at: '2026-09-11T03:50:00.000Z' }];
const r2 = chooseTool({ catalog: CATALOG, trends: tr, date: new Date('2026-09-12T06:00:00Z'), history: hist });
ok(r2.id !== r1.id, `a tool posted yesterday is not repeated (${r1.id} -> ${r2.id})`);
// no repeats over 30 simulated days with the same trends
let history = [], seen = [], rep = 0;
for (let i = 0; i < 30; i++) { const date = new Date(Date.UTC(2026, 8, 1 + i, 4)); const c = chooseTool({ catalog: CATALOG, trends: i % 3 ? tr : [], date, history }); if (seen.slice(-6).includes(c.id)) rep++; seen.push(c.id); history = [{ tool_id: c.id, created_at: date.toISOString() }, ...history]; }
ok(rep === 0, `30-day simulation: no tool repeats within 7 days (${new Set(seen).size} different tools)`);
ok(!chooseTool({ catalog: CATALOG, trends: [{ title: 'gold rate', traffic: 9e6, news: [] }], date: new Date('2026-09-12T06:00:00Z'), history: [] }).id.startsWith('ai'), 'paid AI tools are down-weighted');

ok(!metaConfigured({}).facebook && !metaConfigured({ META_TOKEN: 'x', FB_PAGE_ID: '1' }).instagram && metaConfigured({ META_TOKEN: 'x', IG_USER_ID: '2' }).instagram, 'meta config detection');
ok((await postFacebookReel('x', 'y', {})).skipped && (await postInstagramReel('x', 'y', {})).skipped, 'Facebook/Instagram posting is skipped until the secrets exist');
console.log(f ? f + ' FAILED' : 'ALL PASS'); process.exit(f ? 1 : 0);
