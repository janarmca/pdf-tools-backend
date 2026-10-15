// node tests/promo-youtube.test.mjs — speech text + video build (needs ffmpeg/ffprobe; skipped without them)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import http from 'node:http';
import { speechText, makeVideo, makeVoice } from '../.github/scripts/promo-youtube.mjs';
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

// ---- Gemini TTS through a local mock server (no internet, no key)
if (have) {
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'pyg-')); const cwd2 = process.cwd(); process.chdir(d2);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-f', 's16le', '-ar', '24000', '-ac', '1', 'tone.pcm']);
  const pcm = fs.readFileSync('tone.pcm').toString('base64');
  const seen = []; let mode = 'ok';
  const srv = http.createServer((q, r) => {
    let b = ''; q.on('data', (c) => (b += c)); q.on('end', () => {
      seen.push({ url: q.url, key: q.headers['x-goog-api-key'], body: b ? JSON.parse(b) : null });
      if (mode === 'fail') { r.writeHead(500); return r.end('boom'); }
      if (mode === 'firstmodel404' && q.url.includes('model-a')) { r.writeHead(404); return r.end('no such model'); }
      r.writeHead(200, { 'content-type': 'application/json' });
      r.end(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: pcm } }] } }] }));
    });
  }).listen(0);
  const port = srv.address().port;
  Object.assign(process.env, { GEMINI_API_KEY: 'test-key', GEMINI_API_BASE: `http://127.0.0.1:${port}`, GEMINI_TTS_MODEL: 'model-a,model-b', TTS_ENGINES: 'gemini', GEMINI_VOICE: 'Kore' });
  const dur = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
  let v = await makeVoice('வணக்கம் இது ஒரு சோதனை');
  ok(v === 'voice.mp3' && Math.abs(dur('voice.mp3') - 3) < 0.2, 'Gemini voice: PCM answer becomes a ~3 s mp3');
  const rq = seen[0];
  ok(rq.url === '/v1beta/models/model-a:generateContent' && rq.key === 'test-key', 'Gemini request goes to the model URL with the key in a header (not in the URL)');
  ok(rq.body.generationConfig.responseModalities[0] === 'AUDIO' && rq.body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName === 'Kore', 'request asks for AUDIO with the chosen voice');
  ok(/Tamil/.test(rq.body.contents[0].parts[0].text) && /வணக்கம் இது ஒரு சோதனை/.test(rq.body.contents[0].parts[0].text), 'style prompt + the Tamil text are sent');
  seen.length = 0; mode = 'firstmodel404'; v = await makeVoice('சோதனை');
  ok(v === 'voice.mp3' && seen.length === 2 && seen[1].url.includes('model-b'), 'falls back to the next model when the first is not found');
  mode = 'fail'; process.env.GEMINI_API_KEY = 'k'; const t0 = Date.now();
  v = await makeVoice('சோதனை'); ok(v === null, 'when Gemini fails and no other engine is allowed, the Short is silent (null), no crash');
  delete process.env.GEMINI_API_KEY; process.env.TTS_ENGINES = 'gemini,edge,gtts'; seen.length = 0; mode = 'ok';
  process.env.PATH = '/nonexistent'; v = await makeVoice('சோதனை'); ok(v === null && seen.length === 0, 'no key -> Gemini skipped (no request), missing CLIs do not crash');
  srv.close(); process.chdir(cwd2);
}
console.log(fail ? 'FAILED ' + fail : 'ALL PROMO-YOUTUBE TESTS PASS'); process.exit(fail ? 1 : 0);
