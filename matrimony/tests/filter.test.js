const F = require('../m-filter.js'); const C = require('./corpus.js');
let bad = 0;
C.block.forEach(t => { const r = F.check(t); if (!r) { bad++; console.log('MISSED  :', JSON.stringify(t)); } });
C.pass.forEach(t => { const r = F.check(t); if (r) { bad++; console.log('FALSE+  :', JSON.stringify(t), '->', r); } });
// rolling window
const w = [['98765', '43210'], ['nine eight seven', 'six five four three two one'], ['9876', '5432', '10']];
w.forEach(a => { const r = F.check(a[a.length-1], a.slice(0,-1)); if (!r) { bad++; console.log('WINDOW MISSED', a); } });
if (F.check('5', ['I am 28', 'height 172']) ) { bad++; console.log('window false+'); }
console.log(`block ${C.block.length}, pass ${C.pass.length}, windows ${w.length} -> ${bad} problems`);
process.exit(bad ? 1 : 0);
