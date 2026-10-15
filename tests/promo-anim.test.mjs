// node tests/promo-anim.test.mjs — story rotation, plan text for every tool, and (when playwright + Chrome + ffmpeg exist) a real render.
// In the sandbox:  PLAYWRIGHT_PATH=/opt/node-tools/node_modules/playwright CHROME=/opt/pw-browsers/chromium node tests/promo-anim.test.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { buildPlan, pick, STORIES, PALETTES, LOOKS, NOM, SFX_CUES, stretch, istDay, makeAnimVideo, renderFrames } from '../.github/scripts/promo-anim.mjs';
import { animSpeech } from '../.github/scripts/promo-youtube.mjs';
import { CATALOG } from '../cloudflare/src/promo-catalog.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };

// ---- rotation: every story appears, consecutive days differ, deterministic
const seq = Array.from({ length: 30 }, (_, d) => pick(d).story);
ok(STORIES.every((s) => seq.includes(s)), 'all story templates come up within 30 days');
ok(seq.every((s, i) => i === 0 || s !== seq[i - 1]), 'two days in a row never get the same story');
ok(JSON.stringify(pick(123)) === JSON.stringify(pick(123)), 'same date -> same pick (deterministic)');
ok(new Set(Array.from({ length: 30 }, (_, d) => pick(d).palette.join())).size === PALETTES.length, 'all colour palettes are used');
ok(new Set(Array.from({ length: 30 }, (_, d) => JSON.stringify(pick(d).look))).size === LOOKS.length, 'all character looks are used');
ok(pick(5, { story: 'beard' }).story === 'beard' && pick(5, { story: 'auto' }).story === STORIES[5 % 3] && pick(5, { story: '' }).story === STORIES[5 % 3], 'forced story works, "auto"/empty means rotation');
ok(istDay(new Date('2026-10-15T20:00:00Z')) === istDay(new Date('2026-10-16T02:00:00Z')) - 0 && istDay(new Date('2026-10-15T17:00:00Z')) !== istDay(new Date('2026-10-15T19:00:00Z')), 'day number follows India time (changes at 00:00 IST)');
ok(stretch(0) === 1 && stretch(14) > 0.85 && stretch(100) * NOM <= 30.001 && stretch(5) === 0.85, 'time stretch follows the voice, within 0.85x..30 s');
ok(STORIES.every((s) => SFX_CUES[s] && SFX_CUES[s].every(([, t]) => t > 0 && t < NOM)), 'every story has sound cues inside the timeline');

// ---- plan text for every tool in the catalogue, every story
let bad = 0, longHook = 0, paidFree = 0;
for (const t of CATALOG) for (const story of STORIES) {
  const { cfg, lines } = buildPlan(t, 1, { story });
  const txt = JSON.stringify(cfg.subs) + cfg.hook + cfg.pills.join();
  if (/undefined|null|NaN/.test(txt) || cfg.subs.some((s) => !s[2]) || cfg.rows.length !== 4 || lines.length !== 6 || animSpeech(lines).length < 40) bad++;
  if (cfg.hook.replace(/<[^>]+>/g, '|').split('|')[0].length > 22) longHook++;
  if (t.paid && /இலவசம்/.test(cfg.pills.join() + cfg.subs[4][2])) paidFree++;
  if (!t.paid && !/இலவசம்/.test(cfg.pills[0])) paidFree++;
}
ok(bad === 0, `plans for all ${CATALOG.length} tools x 3 stories are complete (no undefined / empty lines)`);
ok(longHook === 0, 'hook first lines fit the big title (<= 22 characters)');
ok(paidFree === 0, 'paid AI tools are never called free; free tools are');
const pan = buildPlan(CATALOG.find((x) => x.id === 'pantan'), 1, { story: 'reject' });
ok(pan.cfg.rows[0].ok && !pan.cfg.rows[1].ok && /PAN/.test(pan.cfg.label) && pan.cfg.bad === 'ABCDE12345', 'PAN/TAN demo uses the real examples');
const sp = animSpeech(pan.lines);
ok(!/[😎😭🎉]|<br>|https?:/.test(sp) && /டாட் காம்/.test(sp), 'spoken text has no emoji / html and says the site name');

// ---- real render (needs playwright, Chrome, ffmpeg)
let can = true; try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { can = false; }
if (!can) console.log('SKIP render tests (no ffmpeg)');
else {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pan-')); const cwd = process.cwd(); process.chdir(d);
  const root = path.resolve(cwd);
  fs.symlinkSync(path.join(root, 'fonts'), 'fonts'); if (fs.existsSync('/tmp/anim/node_modules')) fs.symlinkSync('/tmp/anim/node_modules', 'node_modules'); else if (fs.existsSync(path.join(root, 'node_modules'))) fs.symlinkSync(path.join(root, 'node_modules'), 'node_modules');
  const ff = (f, file, w) => `@font-face{font-family:'${f}';font-weight:${w};src:url('${file}') format('woff2')}`;
  const FONT = [ff('Noto Sans Tamil', 'fonts/noto-sans-tamil-500.woff2', 500), ff('Noto Sans Tamil', 'fonts/noto-sans-tamil-800.woff2', 800), ff('Inter', 'node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2', 600), ff('Inter', 'node_modules/@fontsource/inter/files/inter-latin-900-normal.woff2', 900)].join('\n');
  const dur = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
  try {
    for (const story of STORIES) { const p = buildPlan(CATALOG.find((x) => x.id === 'merge'), 1, { story }); const n = await renderFrames(p.cfg, FONT, 'f_' + story, [0, 60, 150, 300, 480]); ok(n === 504 && fs.statSync(`f_${story}/f0300.jpg`).size > 20000, `story ${story}: page renders without errors (${n} frames at 30 fps)`); }
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=300:duration=14', 'voice.mp3']);
    const p = buildPlan(CATALOG.find((x) => x.id === 'pantan'), 1, { story: 'beard' });
    const secs = await makeAnimVideo(p, 'voice.mp3', FONT, 'short.mp4');
    const k = (14 + 1.2) / NOM;
    ok(Math.abs(secs - NOM * k) < 0.1 && Math.abs(dur('short.mp4') - secs) < 0.2, `full Short is voice length + 1.2 s (${secs.toFixed(1)} s)`);
    ok(/audio/.test(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', 'short.mp4']).toString()) && /h264/.test(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', 'short.mp4']).toString()), 'Short has h264 video + audio');
    const vol = execFileSync('ffmpeg', ['-i', 'short.mp4', '-af', 'volumedetect', '-f', 'null', '-'], { stdio: ['ignore', 'pipe', 'pipe'] }); void vol;
  } catch (e) { if (/playwright-core is not installed/.test(e.message)) console.log('SKIP render tests (playwright not installed)'); else { ok(false, 'render: ' + e.message); } }
  process.chdir(cwd);
}
console.log(fail ? `${fail} FAILED` : 'ALL PASS'); process.exit(fail ? 1 : 0);
