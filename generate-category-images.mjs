// generate-category-images.mjs
// Generates a hero photo per CATEGORY (6 total: pdf, business, image, video,
// ai, education) for the homepage's "Browse by category" bento cards, via
// the same free Cloudflare Workers AI endpoint used by generate-tool-images.mjs.
//
// USAGE:
//   export CLOUDFLARE_ACCOUNT_ID=your_account_id
//   export CLOUDFLARE_API_TOKEN=your_api_token
//   node generate-category-images.mjs
//
// Saves to ./images/tools-cat/<key>.jpg — idempotent (skips existing files).

import fs from 'fs';
import path from 'path';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!ACCOUNT_ID || !API_TOKEN) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN first.');
  process.exit(1);
}

const OUT_DIR = './images/tools-cat';
fs.mkdirSync(OUT_DIR, { recursive: true });

const STYLE = 'photorealistic, warm natural lighting, shallow depth of field, candid and friendly, modern Indian home or office setting, professional photography, high detail, wide shot with some empty space at the edges for text overlay';

// Broader than a single-tool prompt — each depicts a representative scene
// for the whole category, not one specific action.
const PROMPTS = {
  pdf: 'a person working with documents and a laptop at a desk, papers and a PDF icon visible on screen, organized workspace',
  business: 'a small business owner reviewing invoices and a laptop at a shop counter, GST paperwork visible, warm and productive mood',
  image: 'a person editing photos on a laptop, colorful photo thumbnails visible on screen, creative workspace',
  video: 'a young content creator editing a video on a laptop, timeline visible on screen, cozy home studio',
  ai: 'a person having a friendly conversation with an AI assistant on a laptop, glowing chat interface, modern setting',
  education: 'a child and parent learning together on a tablet, colorful educational app on screen, cheerful home setting',
};

async function generateOne(key, prompt) {
  const outPath = path.join(OUT_DIR, `${key}.jpg`);
  if (fs.existsSync(outPath)) {
    console.log(`  SKIP  ${key} (already exists)`);
    return 'skipped';
  }
  const fullPrompt = `${prompt}, ${STYLE}`;
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: fullPrompt })
    }
  );
  const contentType = res.headers.get('content-type') || '';
  let buf;
  if (contentType.includes('application/json')) {
    const json = await res.json();
    if (!res.ok || json.success === false) throw new Error(json.errors?.[0]?.message || `HTTP ${res.status}`);
    buf = Buffer.from(json.result.image, 'base64');
  } else {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
  }
  fs.writeFileSync(outPath, buf);
  console.log(`  OK    ${key}  (${(buf.length / 1024).toFixed(0)} KB)`);
  return 'ok';
}

async function main() {
  const keys = Object.keys(PROMPTS);
  console.log(`Generating ${keys.length} category images -> ${OUT_DIR}/\n`);
  let ok = 0, skipped = 0, failed = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    process.stdout.write(`[${i + 1}/${keys.length}] ${key} ... `);
    try {
      const r = await generateOne(key, PROMPTS[key]);
      if (r === 'ok') ok++; else skipped++;
    } catch (err) {
      console.log(`  FAIL  ${key}: ${err.message}`);
      failed.push(key);
    }
    await new Promise(r => setTimeout(r, 600));
  }
  console.log(`\nDone. ${ok} generated, ${skipped} skipped, ${failed.length} failed.`);
  if (failed.length) console.log('Failed:', failed.join(', '));
}

main();
