// Structural validator for the "நாளைய உலகம்" lesson JSON files.
// Run:  node learn/tests/lessons.test.cjs                 (all lessons listed in catalog.future)
//       node learn/tests/lessons.test.cjs id1 id2 ...     (only those ids)
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const cat = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json'), 'utf8'));
const LEGACY = new Set(['ai-learns', 'inventor-toolkit', 'tech-side-effects']); // written before this contract; checked only when named explicitly
const ids = process.argv.slice(2).length ? process.argv.slice(2) : (cat.future || []).map(f => f.id).filter(i => !LEGACY.has(i));
const WIDGETS = new Set(['eratosthenes', 'robotProgram', 'pythagoras', 'doubling', 'birthday', 'classVote', 'aiTrainer', 'ideaSpinner', 'trigTriangle', 'shadow', 'special', 'unitCircle', 'heightDistance', 'motion', 'mole', 'reflex',
  'forgetting', 'solarHome', 'packets', 'bits', 'growth', 'costKm', 'footprint', 'planetWeight', 'dna', 'thermostat']);
const TYPES = new Set(['hook', 'predict', 'discover', 'widget', 'text', 'key', 'example', 'try', 'world', 'future', 'activity', 'invent', 'explain', 'summary', 'table']);
const TAMIL = /[஀-௿]/;
let fails = 0;
const bad = (id, msg) => { fails++; console.log('FAIL', id, '-', msg); };

function checkBi(id, where, v, opts){
  opts = opts || {};
  if(v == null || typeof v !== 'object' || typeof v.ta !== 'string' || typeof v.en !== 'string' || !v.ta.trim() || !v.en.trim()){ bad(id, where + ': needs non-empty {ta,en}'); return; }
  if(!opts.latinOk && v.ta.length > 14 && !TAMIL.test(v.ta)) bad(id, where + ': ta text has no Tamil letters');
  if(/TODO|lorem|XXX/i.test(v.ta + v.en)) bad(id, where + ': placeholder text');
  if(v.ta.split(/\n\s*\n/).some(p => /^\s*\[\[/.test(p) && !/\]\]\s*$/.test(p))) bad(id, where + ': [[formula]] must be a whole paragraph');
}
function walk(id, where, v){ // every object that has 'ta' or 'en' must be a valid bilingual pair
  if(Array.isArray(v)) return v.forEach((x, i) => walk(id, where + '[' + i + ']', x));
  if(v && typeof v === 'object'){
    if('ta' in v || 'en' in v){ checkBi(id, where, v, {latinOk: true}); return; }
    Object.keys(v).forEach(k => walk(id, where + '.' + k, v[k]));
  }
}

ids.forEach(id => {
  const f = path.join(root, 'lessons', id + '.json');
  if(!fs.existsSync(f)) return bad(id, 'file missing');
  let d; try{ d = JSON.parse(fs.readFileSync(f, 'utf8')); }catch(e){ return bad(id, 'invalid JSON: ' + e.message); }
  if(d.id !== id) bad(id, 'id field must equal filename');
  if(typeof d.minutes !== 'number' || d.minutes < 10 || d.minutes > 45) bad(id, 'minutes should be 10-45');
  checkBi(id, 'title', d.title);
  if(!Array.isArray(d.curriculum) || !d.curriculum.length) bad(id, 'curriculum needed'); else d.curriculum.forEach((c, i) => { if(!c.b) bad(id, 'curriculum[' + i + '].b'); checkBi(id, 'curriculum[' + i + '].w', c.w); });
  if(!Array.isArray(d.goals) || d.goals.length < 3) bad(id, 'at least 3 goals'); else d.goals.forEach((g, i) => checkBi(id, 'goals[' + i + ']', g));
  if(!Array.isArray(d.blocks)) return bad(id, 'blocks must be an array');
  walk(id, 'lesson', {blocks: d.blocks, quiz: d.quiz});
  const count = {}; d.blocks.forEach(b => count[b.type] = (count[b.type] || 0) + 1);
  d.blocks.forEach((b, i) => {
    const w = 'blocks[' + i + '](' + b.type + ')';
    if(!TYPES.has(b.type)) return bad(id, w + ': unknown type');
    switch(b.type){
      case 'hook': case 'text': case 'key': case 'activity': checkBi(id, w + '.text', b.text); break;
      case 'predict': checkBi(id, w + '.q', b.q); checkBi(id, w + '.reveal', b.reveal);
        if(!Array.isArray(b.options) || b.options.length < 3) bad(id, w + ': 3+ options'); if(b.answer != null && !(b.options && b.options[b.answer])) bad(id, w + ': answer index out of range'); break;
      case 'widget': if(!WIDGETS.has(b.name)) bad(id, w + ': unknown widget ' + b.name); checkBi(id, w + '.title', b.title); break;
      case 'discover': if(!WIDGETS.has(b.widget)) bad(id, w + ': unknown widget ' + b.widget); checkBi(id, w + '.text', b.text); checkBi(id, w + '.q', b.q); checkBi(id, w + '.insight', b.insight);
        if(!Array.isArray(b.options) || b.options.length < 2 || !(b.options[b.correct])) bad(id, w + ': options/correct'); break;
      case 'example': checkBi(id, w + '.q', b.q); if(!Array.isArray(b.steps) || b.steps.length < 2) bad(id, w + ': 2+ steps'); break;
      case 'try': checkBi(id, w + '.q', b.q);
        if(b.options){ if(b.options.length < 2 || !(b.options[b.correct])) bad(id, w + ': options/correct'); }
        else if(typeof b.answer !== 'number' || !Number.isFinite(b.answer)) bad(id, w + ': numeric answer needed');
        if(!b.solution) bad(id, w + ': solution needed'); break;
      case 'world': if(!Array.isArray(b.items) || b.items.length < 3) bad(id, w + ': 3+ items'); else b.items.forEach((it, k) => { checkBi(id, w + '.items[' + k + '].title', it.title); checkBi(id, w + '.items[' + k + '].text', it.text); }); break;
      case 'future': checkBi(id, w + '.text', b.text); checkBi(id, w + '.risk', b.risk); checkBi(id, w + '.fix', b.fix); break;
      case 'invent': checkBi(id, w + '.text', b.text); break;
      case 'explain': checkBi(id, w + '.q', b.q); if(!Array.isArray(b.keywords) || b.keywords.length < 3) bad(id, w + ': 3+ keywords'); checkBi(id, w + '.model', b.model); break;
      case 'summary': if(!Array.isArray(b.points) || b.points.length < 4) bad(id, w + ': 4+ points'); break;
    }
  });
  ['hook', 'predict', 'world', 'future', 'explain', 'summary', 'activity', 'try'].forEach(t => { if(!count[t]) bad(id, 'needs a "' + t + '" block'); });
  if(!(count.widget || count.discover)) bad(id, 'needs a widget or discover block');
  if(d.blocks[0] && d.blocks[0].type !== 'hook') bad(id, 'first block must be hook');
  const q = d.quiz;
  if(!Array.isArray(q) || q.length < 6) bad(id, 'quiz needs 6+ questions');
  else {
    q.forEach((x, i) => { checkBi(id, 'quiz[' + i + '].q', x.q); checkBi(id, 'quiz[' + i + '].explain', x.explain);
      if(!Array.isArray(x.options) || x.options.length < 3 || x.options.length > 4) bad(id, 'quiz[' + i + ']: 3-4 options');
      else { x.options.forEach((o, k) => checkBi(id, 'quiz[' + i + '].options[' + k + ']', o, {latinOk: true}));
        if(!Number.isInteger(x.correct) || !x.options[x.correct]) bad(id, 'quiz[' + i + ']: correct index');
        const seen = new Set(x.options.map(o => o.ta)); if(seen.size !== x.options.length) bad(id, 'quiz[' + i + ']: duplicate options'); } });
    const spread = new Set(q.map(x => x.correct)); if(spread.size < 3) bad(id, 'quiz: correct answers should not sit in the same position (found ' + [...spread] + ')');
  }
});
console.log(fails ? fails + ' problem(s)' : 'OK — ' + ids.length + ' lesson(s) valid');
process.exit(fails ? 1 : 0);
