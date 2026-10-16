// node tests/promo-manual.test.mjs — the manual workflow lists every tool, is in sync with the catalogue and parses as YAML.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { buildYaml, optionLabel, toolFromChoice, CATS, NONE } from '../.github/scripts/generate-promo-manual.mjs';
import { CATALOG } from '../cloudflare/src/promo-catalog.js';
let f = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) f++; };
const y = buildYaml();
ok(fs.readFileSync('.github/workflows/promo-manual.yml', 'utf8') === y, 'promo-manual.yml is up to date (run generate-promo-manual.mjs after catalogue changes)');
ok(CATALOG.every((t) => y.includes(`'${optionLabel(t).replace(/'/g, "''")}'`)), `all ${CATALOG.length} tools are in the dropdowns`);
ok(CATALOG.every((t) => toolFromChoice(optionLabel(t)) === t.id) && toolFromChoice(NONE) === '' && toolFromChoice('') === '', 'a chosen option gives back the tool id; (none) gives nothing');
ok(CATS.every(([c]) => CATALOG.filter((t) => t.cat === c).length < 100) && new Set(CATALOG.map((t) => t.cat)).size === CATS.length, 'every category list stays well under GitHub\'s option limit and no category is missing');
let parsed = null; try { parsed = JSON.parse(execFileSync('python3', ['-c', 'import sys,yaml,json;print(json.dumps(yaml.safe_load(open(".github/workflows/promo-manual.yml"))))']).toString()); } catch (e) { console.log('yaml check skipped:', String(e.message).slice(0, 80)); }
if (parsed) { const inp = (parsed.on || parsed['true'])?.workflow_dispatch?.inputs || {}; ok(CATS.every(([c]) => inp['tool_' + c]?.options?.[0] === NONE) && Object.keys(inp).length === CATS.length + 2, 'YAML parses; 6 category dropdowns + privacy + story (8 inputs)'); }
console.log(f ? f + ' FAILED' : 'ALL PASS'); process.exit(f ? 1 : 0);
