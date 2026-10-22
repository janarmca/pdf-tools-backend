// Pure-pixel checks for category-art.js: every free style runs, keeps the size and produces real pixels. Run: node tests/art-core.test.cjs
const vm = require('vm'), fs = require('fs'), assert = require('assert');
const win = {}; vm.runInContext(fs.readFileSync(__dirname + '/../category-art.js', 'utf8'), vm.createContext({ window: win, TOOL_IMPL: {}, console }));
const A = win.ArtCore; let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('PASS ' + m); };
const w = 96, h = 72, img = A.mkImg(w, h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = (y * w + x) * 4; const box = x > 40 && x < 60 && y > 20 && y < 50; img.data[p] = box ? 20 : 120 + x; img.data[p + 1] = box ? 20 : 100 + y * 2; img.data[p + 2] = box ? 30 : 210; img.data[p + 3] = 255; }
A.styles.forEach(s => {
  const src = { width: w, height: h, data: new Uint8ClampedArray(img.data) }, r = A.render(s, src, { scale: 0.2 });
  let mn = 255, mx = 0; for (let p = 0; p < r.data.length; p += 4) { mn = Math.min(mn, r.data[p]); mx = Math.max(mx, r.data[p]); }
  ok(r.width === w && r.height === h && r.data.length === w * h * 4 && mx > mn && r.data[3] === 255, 'style ' + s + ' renders (contrast ' + mn + '–' + mx + ')');
});
const k = A.kuwahara(img, 2); ok(k.width === w && Math.abs(k.data[(10 * w + 10) * 4] - img.data[(10 * w + 10) * 4]) < 12, 'kuwahara keeps smooth areas');
console.log('\nALL ' + n + ' ART-CORE CHECKS PASS');
