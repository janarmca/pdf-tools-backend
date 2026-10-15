// Animated, funny Tamil Short — made by plain code (no AI, no paid service, no server): story templates + headless Chrome frames + ffmpeg.
// A different story / colour / character look comes up every day (rotation by date), so the channel never looks repetitive.
// Used by promo-youtube.mjs. All characters are original drawings; sound effects are synthesised by ffmpeg (no one else's music).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const NOM = 16.8; // nominal story length in seconds (stretched to fit the voice)
export const STORIES = ['reject', 'queue', 'beard'];
export const PALETTES = [['#5B3A9E', '#2A2160', '#14182b'], ['#0F766E', '#134E4A', '#0b1f24'], ['#B45309', '#7C2D12', '#1c1210'], ['#1D4ED8', '#1E3A8A', '#0b1230'], ['#BE185D', '#701A75', '#1a0f24']];
export const LOOKS = [{ skin: '#F2C29B', hair: '#1b1b1b', shirt: '#3B82F6' }, { skin: '#D9A074', hair: '#3b2314', shirt: '#10B981' }, { skin: '#B9774E', hair: '#111111', shirt: '#F59E0B' }, { skin: '#F5CDA8', hair: '#5a3a1e', shirt: '#EC4899' }];

// Per category: a typical "bad" input for the reject story and a shop price for the queue story (Tamil prices people recognise).
const CAT = {
  pdf: { label: 'கோப்பு:', bad: 'form_final(3).pdf', price: '₹20 / பக்கம்' },
  image: { label: 'படம்:', bad: 'photo_12MB.jpg', price: '₹30 / போட்டோ' },
  business: { label: 'எண்:', bad: 'ABCDE12345', price: 'CA கட்டணம் ₹500' },
  video: { label: 'Video:', bad: 'clip_4K.mp4', price: '₹50 / நிமிடம்' },
  ai: { label: 'File:', bad: 'resume_old.doc', price: 'Agency ₹2,000' },
  education: { label: 'File:', bad: 'marks_final.xlsx', price: 'Tuition ₹300' },
};
// Hand-made demo rows for tools where a real example is more convincing than the generic 3 steps.
const DEMO = {
  pantan: { label: 'PAN எண்:', bad: 'ABCDE12345', rows: [{ v: 'ABCPD1234E', ok: true, m: 'தனிநபர் PAN' }, { v: 'ABCDE12345', ok: false, m: 'இடம் 10-ல் எழுத்து வேண்டும்' }, { v: 'AB1DE1234F', ok: false, m: 'இடம் 3-ல் எழுத்து வேண்டும்' }, { v: 'ABCZD1234E', ok: false, m: '4-வது எழுத்து தவறு' }], line: '5 எழுத்து + 4 எண் + 1 எழுத்து<br>தப்பை உடனே காட்டும்!' },
};
const STEPS = [{ v: 'STEP 1', ok: true, m: 'File போடுங்க' }, { v: 'STEP 2', ok: true, m: '👆 Button தட்டுங்க' }, { v: 'STEP 3', ok: true, m: '⬇️ Download!' }, { v: 'LOGIN', ok: false, m: 'தேவையே இல்லை 🚫' }];

export const istDay = (d = new Date()) => Math.floor((d.getTime() + 19800000) / 86400000);
export function pick(day, force = {}) {
  const story = STORIES.includes(force.story) ? force.story : STORIES[day % STORIES.length];
  return { story, palette: PALETTES[Math.floor(day / STORIES.length) % PALETTES.length], look: LOOKS[(day * 7 + Math.floor(day / 3)) % LOOKS.length] };
}

// Builds everything the page and the voice need. `lines` are the spoken sentences (raw — promo-youtube.mjs spells abbreviations for the voice).
export function buildPlan(t, day = istDay(), force = {}) {
  const { story, palette, look } = pick(day, force);
  const cat = { ...(CAT[t.cat] || CAT.pdf), ...(DEMO[t.id] || {}) };
  const nm = String(t.name || '').length <= 16 ? t.name : 'இந்த tool'; // long names would not fit the big hook line
  const ta = t.ta || t.name, paid = !!t.paid;
  const hook = { reject: 'இந்த ஒரு தப்பால்<br>வேலை REJECT?! <span style="font-size:110px">😱</span>', queue: `${nm}-க்கு<br>கடையில் காசா?! <span style="font-size:110px">😱</span>`, beard: `${nm}<br>காத்திருந்தா... <span style="font-size:110px">⏳</span>` }[story];
  const stamp = { reject: { text: 'REJECTED ✖', color: '#ef4444' }, beard: { text: 'STILL 99% 🐌', color: '#f59e0b', size: 96, left: '120px' }, queue: null }[story];
  const s0 = { reject: 'ஒரே ஒரு தப்பு...', queue: `${ta} வேணுமா? கடைக்குப் போனா...`, beard: `${ta} — loading... loading...` }[story];
  const s1 = { reject: 'REJECTED!! 😭<br>3 மணி நேர வேலை வீண்!', queue: `${cat.price}!! 😭<br>பணம் பறந்து போச்சு!`, beard: '3 நாள் ஆச்சு! 😴<br>தாடியே வளர்ந்துடுச்சு!' }[story];
  const s3 = cat.line || String(t.taDesc || t.desc || '').replace(/[.!]+$/, '') + '!';
  const s4 = paid ? 'AI tool ✨ — தேவையான இடத்தில் மட்டும் சிறு கட்டணம்' : 'இலவசம்! Login இல்லை! 🎉';
  const subs = [[0.3, 2.3, s0], [2.45, 5.3, s1], [5.6, 7.1, 'கவலை வேண்டாம்! இவன் இருக்கான் 😎'], [7.2, 10.5, s3], [10.8, 13.9, s4], [14.2, 17, 'தினமும் ஒரு புது tool — Follow பண்ணுங்க!']];
  const cfg = {
    story, palette, look, k: 1, nom: NOM, hook, label: cat.label, bad: cat.bad, price: cat.price, stamp, dayWord: 'நாள்',
    bubble: `அண்ணே, கவலை வேண்டாம்! நான் பாத்துக்கறேன் 😎`, rows: cat.rows || STEPS, subs,
    pills: paid ? ['AI ✨', 'சிறு கட்டணம்', 'Phone-லேயே ✓'] : ['இலவசம் ✓', 'Login இல்லை ✓', 'Phone-லேயே ✓'],
  };
  const spoken = subs.map((s) => String(s[2]).replace(/<br>/g, ' ')).filter(Boolean);
  spoken[spoken.length - 1] = 'பி டி எஃப் டூல்ஸ் இந்தியா டாட் காம். தினமும் ஒரு புது டூல், ஃபாலோ பண்ணுங்க!';
  return { cfg, lines: spoken };
}

// Sound-effect cue lists (nominal seconds). Sounds are generated by ffmpeg, so there is nothing to license.
const COMMON = [['whoosh', 5.5], ['ting', 7.3], ['ting', 8.05], ['ting', 8.8], ['ting', 9.55], ['chime', 10.6]];
export const SFX_CUES = {
  reject: [['bonk', 2.4], ['sad', 3.2], ...COMMON],
  queue: [['pop', 2.4], ['pop', 2.62], ['pop', 2.84], ['pop', 3.06], ['sad', 3.4], ...COMMON],
  beard: [['tick', 0.5], ['tick', 1.0], ['tick', 1.5], ['tick', 2.0], ['boing', 2.4], ['sad', 3.2], ...COMMON],
};
const SOUND_SRC = {
  bonk: ['sine=f=180:d=0.25', 'afade=t=out:st=0.05:d=0.2,volume=1.5'],
  sad: ["aevalsrc='0.5*sin(2*PI*(330-60*t)*t)*exp(-0.6*t)':d=1.2:s=44100", 'tremolo=f=6:d=0.4'],
  whoosh: ['anoisesrc=d=0.6:c=pink:a=0.5', 'highpass=f=400,lowpass=f=4000,afade=t=in:d=0.25,afade=t=out:st=0.3:d=0.3'],
  ting: ['sine=f=1320:d=0.35', 'afade=t=out:st=0.02:d=0.33,volume=0.8'],
  chime: ["aevalsrc='0.4*(sin(2*PI*880*t)+sin(2*PI*1320*t)+sin(2*PI*1760*t))*exp(-3*t)':d=1.0:s=44100", 'anull'],
  pop: ["aevalsrc='0.6*sin(2*PI*(500+1500*t)*t)*exp(-9*t)':d=0.3:s=44100", 'anull'],
  tick: ['sine=f=1800:d=0.05', 'afade=t=out:st=0.01:d=0.04,volume=0.7'],
  boing: ["aevalsrc='0.5*sin(2*PI*(200+500*sin(18*t))*t)*exp(-2.5*t)':d=0.7:s=44100", 'anull'],
};
export function makeSfx(story, k, out, dur) {
  const cues = SFX_CUES[story]; const names = [...new Set(cues.map((c) => c[0]))];
  const ff = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a]);
  for (const n of names) ff('-f', 'lavfi', '-i', SOUND_SRC[n][0], '-af', SOUND_SRC[n][1], `sfx_${n}.wav`);
  ff('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(dur), 'sfx_base.wav');
  const inputs = ['sfx_base.wav', ...cues.map((c) => `sfx_${c[0]}.wav`)];
  const chains = cues.map((c, i) => { const ms = Math.round(c[1] * k * 1000); return `[${i + 1}]aresample=44100,adelay=${ms}|${ms}[a${i}]`; });
  const mix = `[0]${cues.map((_, i) => `[a${i}]`).join('')}amix=inputs=${cues.length + 1}:normalize=0,alimiter=limit=0.95[o]`;
  ff(...inputs.flatMap((f) => ['-i', f]), '-filter_complex', [...chains, mix].join(';'), '-map', '[o]', out);
  return out;
}

// ---- rendering ----
async function loadPlaywright() {
  const tries = [process.env.PLAYWRIGHT_PATH, 'playwright-core', 'playwright'].filter(Boolean);
  const req = createRequire(import.meta.url);
  for (const m of tries) { try { return req(m); } catch { /* next */ } try { return await import(m); } catch { /* next */ } }
  throw new Error('playwright-core is not installed');
}
const chromePath = () => [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => p && p.startsWith('/') && fs.existsSync(p));
export const pageHtml = (cfg, fontFace) => `<!doctype html><meta charset="utf-8"><style>${fontFace}
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#14182b;font-family:'Noto Sans Tamil','Inter','Noto Color Emoji',sans-serif;color:#fff}
#root{position:absolute;inset:0;overflow:hidden}.abs{position:absolute;left:0;top:0;transform-origin:50% 50%;will-change:transform}
.title{width:1000px;left:40px;text-align:center;font-weight:800;font-size:96px;line-height:1.2;text-shadow:0 8px 0 rgba(0,0,0,.35)}
.sub{width:960px;left:60px;text-align:center;font-weight:800;font-size:56px;line-height:1.3;color:#fff;text-shadow:0 0 6px #000,0 4px 0 #000,0 0 18px rgba(0,0,0,.8)}
.mono{font-family:'Inter',monospace;font-weight:900}
.row{width:900px;height:132px;left:90px;background:#fff;border-radius:28px;color:#14182b;display:flex;align-items:center;padding:0 30px;gap:22px;box-shadow:0 10px 0 rgba(0,0,0,.25)}
.row .v{font:900 46px/1 'Inter',monospace;letter-spacing:2px}.row .m{font-weight:800;font-size:34px;line-height:1.2;flex:1;text-align:right}
.pill{width:660px;text-align:center;background:rgba(255,255,255,.18);border:3px solid rgba(255,255,255,.5);border-radius:999px;padding:16px 34px;font-weight:800;font-size:44px;white-space:nowrap}
.cta{background:#FFD54A;color:#14182b;font:900 76px/1 'Inter',sans-serif;border-radius:999px;padding:34px 56px;white-space:nowrap;box-shadow:0 12px 0 rgba(0,0,0,.3)}
.conf{width:26px;height:44px;border-radius:5px}</style>
<div id="root"></div><script>window.CFG=${JSON.stringify(cfg).replace(/</g, '\\u003c')}</script><script>${fs.readFileSync(path.join(HERE, 'anim', 'engine.js'), 'utf8')}</script>`;

// Renders every frame (30 fps) to frames/ ; returns the number of frames.
export async function renderFrames(cfg, fontFace, dir = 'anim-frames', only = null) {
  const pw = await loadPlaywright(); const chromium = pw.chromium || pw.default?.chromium;
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync('anim.html', pageHtml(cfg, fontFace));
  const exe = chromePath();
  const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--no-sandbox', '--disable-gpu'] });
  try {
    const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto('file://' + path.resolve('anim.html')); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(500);
    if (errs.length) throw new Error('animation page error: ' + errs[0]);
    const dur = await pg.evaluate(() => window.DUR); const n = Math.round(dur * 30);
    const list = only || Array.from({ length: n }, (_, i) => i);
    for (const i of list) { await pg.evaluate((t) => window.render(t), i / 30); await pg.screenshot({ path: `${dir}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 90 }); }
    if (errs.length) throw new Error('animation page error: ' + errs[0]);
    return n;
  } finally { await browser.close(); }
}

const audioSeconds = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim()) || 0;
// Story length follows the voice (so the voice is never cut), between 0.85x and 1.78x of the nominal beats (<= 30 s).
export const stretch = (voiceSecs) => (voiceSecs ? Math.min(30 / NOM, Math.max(0.85, (voiceSecs + 1.2) / NOM)) : 1);
export async function makeAnimVideo(plan, voice, fontFace, out = 'short.mp4') {
  const k = stretch(voice ? audioSeconds(voice) : 0); plan.cfg.k = k;
  const n = await renderFrames(plan.cfg, fontFace); const dur = n / 30;
  makeSfx(plan.cfg.story, k, 'sfx.wav', dur);
  const args = ['-y', '-loglevel', 'error', '-framerate', '30', '-i', 'anim-frames/f%04d.jpg', '-i', 'sfx.wav'];
  let filter = '[1:a]volume=0.55[a]';
  if (voice) { args.push('-i', voice); filter = '[1:a]volume=0.45[s];[2:a]adelay=300|300,aresample=44100,volume=1.2[v];[s][v]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]'; }
  execFileSync('ffmpeg', [...args, '-filter_complex', filter, '-map', '0:v', '-map', '[a]', '-t', String(dur), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-movflags', '+faststart', out], { stdio: 'inherit' });
  return dur;
}
