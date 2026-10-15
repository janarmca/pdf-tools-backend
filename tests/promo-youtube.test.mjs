// node tests/promo-youtube.test.mjs — speech text + video build (needs ffmpeg/ffprobe; skipped without them)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { speechText, makeVideo } from '../.github/scripts/promo-youtube.mjs';
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const t = { ta: 'PAN / TAN சரிபார்ப்பு 🪪', taDesc: 'ரூபாய் ₹200 e-Sign https://x.y', name: 'PAN checker' };
const sp = speechText(t);
ok(!/[🪪/]|https?:/.test(sp), 'emoji, slashes and URLs removed from the speech');
ok(/பான் டான்/.test(sp) && /200 ரூபாய்/.test(sp) && /இ சைன்/.test(sp), 'abbreviations, rupees and e-Sign spelt for the Tamil voice');
ok(/பி டி எஃப் டூல்ஸ் இந்தியா டாட் காம்/.test(sp), 'site name is spoken');
let have = true; try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); execFileSync('ffprobe', ['-version'], { stdio: 'ignore' }); } catch { have = false; }
if (!have) console.log('SKIP video tests (no ffmpeg)');
else {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pyt-')); const cwd = process.cwd(); process.chdir(d);
  const run = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a]);
  run('-f', 'lavfi', '-i', 'color=c=purple:s=1080x2100:d=1', '-frames:v', '1', 'slide.png');
  const dur = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
  const hasAudio = (f) => /audio/.test(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', f]).toString());
  ok(makeVideo(null, 'a.mp4') === 10 && Math.abs(dur('a.mp4') - 10) < 0.2 && hasAudio('a.mp4'), 'silent Short is 10 s and still has an audio track');
  run('-f', 'lavfi', '-i', 'sine=duration=14.2', 'v.mp3');
  const secs = makeVideo('v.mp3', 'b.mp4'); ok(Math.abs(secs - 15.8) < 0.01 && Math.abs(dur('b.mp4') - 15.8) < 0.2, 'video is voice length + 1.5 s (14.2 -> 15.8 s)');
  run('-f', 'lavfi', '-i', 'sine=duration=3', 's.mp3'); ok(makeVideo('s.mp3', 'c.mp4') === 10, 'short voice still gives a 10 s Short');
  run('-f', 'lavfi', '-i', 'sine=duration=70', 'l.mp3'); ok(makeVideo('l.mp3', 'd.mp4') === 30 && dur('d.mp4') < 31, 'very long voice is capped at 30 s');
  process.chdir(cwd);
}
console.log(fail ? 'FAILED ' + fail : 'ALL PROMO-YOUTUBE TESTS PASS'); process.exit(fail ? 1 : 0);
