// generate-tool-images.mjs
// Batch-generates a photorealistic "person using this tool" image for every
// tool on pdftoolsindia.com, via Cloudflare Workers AI (FLUX.1-schnell) —
// the same free (~10,000 Neurons/day, no credit card) endpoint already
// wired into /api/ai/image on the live backend.
//
// USAGE (from Cloud Shell, or anywhere with these env vars):
//   export CLOUDFLARE_ACCOUNT_ID=your_account_id
//   export CLOUDFLARE_API_TOKEN=your_api_token
//   node generate-tool-images.mjs
//
// Images are saved to ./images/tools/<toolId>.jpg — copy that folder into
// the repo and commit. Safe to re-run: it SKIPS any tool whose image file
// already exists, so a failed/interrupted run can just be re-run to finish
// the remaining ones.
//
// Every prompt below was hand-written per tool (not templated from the name)
// so each image genuinely depicts that tool's specific action. Prompts
// involving a child are deliberately limited to wholesome, fully-clothed,
// everyday contexts (homework, a learning game, tracing letters) matching
// the Education category's real audience — never anything else.

import fs from 'fs';
import path from 'path';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!ACCOUNT_ID || !API_TOKEN) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN first.');
  process.exit(1);
}

const OUT_DIR = './images/tools';
fs.mkdirSync(OUT_DIR, { recursive: true });

// A consistent "look" suffix keeps all 114 images feeling like one cohesive
// photo set rather than 114 unrelated styles.
const STYLE = 'photorealistic, warm natural lighting, shallow depth of field, candid and friendly, modern Indian home or office setting, professional photography, high detail';

// id -> subject/action description. Demographics (man/woman/child, and who)
// are varied deliberately across the set rather than defaulting to one type.
const PROMPTS = {
  // ---------- PDF (42) ----------
  merge: 'a woman at a laptop dragging two PDF document icons together on screen, smiling',
  split: 'a man using a laptop to split a PDF document into separate page thumbnails on screen',
  remove: 'a young professional deleting a page from a PDF document on a laptop screen',
  organize: 'a woman reordering PDF page thumbnails by dragging them on a tablet screen',
  rotate: 'a man rotating a PDF page on a laptop screen with a rotation icon visible',
  pdfnup: 'a woman reviewing a printed page showing four small document pages arranged on one sheet',
  pdfsplitsize: 'a man checking a file-size indicator while splitting a large PDF on a laptop',
  pdfblankpage: 'a woman inserting a blank page into a document on a tablet screen',
  compress: 'a man watching a PDF file size shrink on a laptop progress bar, satisfied',
  pdfgray: 'a woman converting a colorful PDF to grayscale on a laptop screen, before/after visible',
  pdfcrop: 'a man cropping the white margins off a scanned document on a tablet',
  pdfmeta: 'a woman editing document title and author fields in a PDF properties panel',
  img2pdf: 'a man converting a stack of photos into a PDF document on a laptop',
  word2pdf: 'a woman converting a Word document to PDF on a laptop, both icons visible',
  excel2pdf: 'a man exporting a spreadsheet to PDF on a laptop screen',
  txt2pdf: 'a woman turning a plain text file into a formatted PDF on a laptop',
  pdf2img: 'a man extracting PDF pages as image thumbnails on a laptop screen',
  pdf2word: 'a woman converting a PDF into an editable Word document on a laptop',
  pdf2excel: 'a man converting a PDF table into an Excel spreadsheet on a laptop screen',
  pdf2text: 'a woman copying plain text extracted from a PDF document on a laptop',
  excel2word: 'a man converting spreadsheet data into a Word document on a laptop',
  txt2html: 'a woman viewing a text file rendered as a clean webpage on a laptop',
  pdfeditor: 'a man typing directly onto a PDF page using an on-screen text tool, laptop',
  pdfform: 'a woman filling in form fields on a PDF application form on a tablet',
  sign: 'a man signing a document with his finger on a tablet screen, digital signature',
  pdfstamp: 'a woman stamping an "approved" mark onto a document on a laptop screen',
  pdfhighlight: 'a man highlighting important words in yellow on a PDF document, tablet',
  watermark: 'a woman adding a diagonal "confidential" watermark to a document on a laptop',
  pdfimgwm: 'a man placing a small company logo watermark onto a PDF page, laptop',
  pagenum: 'a woman adding page numbers to the bottom of document pages, laptop screen',
  pdfheaderfooter: 'a man typing a header and footer onto a document template, laptop',
  pdfqrstamp: 'a woman adding a QR code stamp onto a printed certificate, tablet screen',
  pdfbookmark: 'a man adding bookmark tabs to sections of a long PDF report, laptop',
  pdfcompare: 'a woman comparing two versions of a document side by side with changes highlighted, laptop',
  pdfprotect: 'a man setting a password lock on a PDF file, laptop screen with padlock icon',
  pdfunlock: 'a woman entering a password to unlock a protected PDF, laptop screen',
  pdfpwrecover: 'a man patiently trying to recover a forgotten PDF password on a laptop, hopeful',
  pdfredact: 'a woman blacking out sensitive text on a document before sharing it, tablet',
  qrgen: 'a young shopkeeper printing a QR code for his shop counter, phone in hand',
  qrscan: 'a woman scanning a QR code on a poster with her phone camera',
  readaloud: 'an elderly man listening to a document being read aloud through headphones, laptop',
  obituary: 'a middle-aged woman quietly preparing a memorial announcement on a laptop at home, respectful and gentle mood',

  // ---------- Business (19) ----------
  gstinvoice: 'a small shop owner creating a GST invoice on a laptop at his counter',
  quotepo: 'a businesswoman preparing a quotation document on a laptop in her office',
  salaryslip: 'an HR manager generating a salary slip on a laptop, office setting',
  paymentvoucher: 'a man filling out a payment voucher form on a tablet at a desk',
  emicalc: 'a young couple calculating a home loan EMI together on a laptop at their dining table',
  incometaxcalc: 'a woman reviewing income tax calculations on a laptop, papers on desk',
  agecalc: 'a man checking someone\'s exact age on a phone calculator app, casual setting',
  percentcalc: 'a student calculating exam percentage on a phone, textbooks nearby',
  rentreceipt: 'a landlord handing a printed rent receipt to a tenant at a doorway, friendly',
  tuitionreceipt: 'a tuition teacher writing a fee receipt for a parent, small classroom',
  hrattendance: 'an HR executive reviewing a staff attendance register on a tablet, office',
  leaveletter: 'an employee typing a leave application letter on a laptop at his desk',
  businesscard: 'a young entrepreneur designing her business card on a laptop, coffee shop setting',
  prescription: 'a doctor writing on a prescription pad template on a tablet, clinic setting',
  resumebuilder: 'a young job seeker building his resume on a laptop, focused and hopeful',
  expensetracker: 'a woman logging monthly expenses into a spreadsheet template on a laptop',
  gstchecking: 'an accountant cross-checking GST figures between two documents on a laptop',
  stmtcompare: 'a man reconciling two bank statements side by side on a laptop screen',
  astrologyplus: 'an elderly woman viewing a birth chart diagram on a tablet, warm home setting',

  // ---------- Image (22) ----------
  imgcompress: 'a man reducing a photo\'s file size on a laptop, size indicator shrinking',
  imgcompresskb: 'a woman typing an exact target file size in KB while compressing a photo, laptop',
  imgconvert: 'a man converting a photo from PNG to JPG format on a laptop screen',
  heic2jpg: 'a woman converting an iPhone HEIC photo to JPG on a laptop',
  bgremove: 'a man watching a product photo\'s background disappear on a laptop screen, impressed',
  batchbgremove: 'a woman processing a whole folder of product photos at once on a laptop',
  wmremove: 'a man carefully erasing a watermark from a scanned document photo, tablet',
  imgenhance: 'a woman sharpening a blurry old photo on a laptop, before/after visible',
  aiupscale: 'a man upscaling a small photo to high resolution on a laptop screen',
  imgcrop: 'a woman cropping a photo to a square frame on a tablet screen',
  imgpassport: 'a young man taking a passport-style photo of himself with a phone against a plain wall',
  imgbatchresize: 'a woman resizing a whole batch of photos at once on a laptop',
  imgborder: 'a man adding a decorative photo frame border on a tablet screen',
  imgfilters: 'a young woman applying a vintage filter to her photo on a phone, smiling',
  exifremove: 'a man stripping hidden location data from a photo before sharing it online, laptop',
  imgwatermark: 'a photographer stamping her studio watermark onto a photo, laptop',
  imgcollage: 'a family arranging several photos into one collage on a tablet together',
  imgsketch: 'a young artist turning her photo into a pencil-sketch style image on a laptop',
  imgmeme: 'a young man adding a funny caption to a photo on his phone, laughing',
  imgsticker: 'a teenager cutting out a sticker shape from a photo on a phone',
  colorpicker: 'a designer picking an exact color from a photo using an eyedropper tool, laptop',
  aibgreplace: 'a small business owner replacing a product photo\'s background with a studio backdrop, laptop, delighted',

  // ---------- Video (15) ----------
  vidsplit: 'a man trimming a long video into shorter clips on a laptop timeline',
  videomerge: 'a woman joining two video clips together on a laptop editing timeline',
  videocompress: 'a man shrinking a video file size on a laptop before sending it',
  videorotate: 'a woman rotating a sideways phone video the right way up, laptop screen',
  videospeed: 'a young man speeding up a video clip on a laptop, motion blur on screen',
  videoreverse: 'a woman watching a video play in reverse on a laptop screen, amused',
  videoloop: 'a man setting a short video clip to loop continuously on a laptop',
  vidvoice: 'a woman recording her voice over a video on a laptop with a microphone',
  videomute: 'a man muting the sound on a video clip on a laptop screen',
  videovolume: 'a woman adjusting a video\'s volume level on a laptop slider',
  videowave: 'a music producer turning an audio track into a waveform video on a laptop',
  videowatermark: 'a content creator adding her channel logo watermark to a video, laptop',
  videosubtitle: 'a man adding subtitles to a video on a laptop, captions visible on screen',
  videotogif: 'a young woman turning a short video clip into a GIF on a laptop, laughing',
  videothumb: 'a content creator picking the best video thumbnail frame on a laptop',

  // ---------- AI (11) ----------
  askai: 'a student asking an AI assistant a question about her textbook PDF on a laptop',
  aisummarize: 'a busy professional getting an AI summary of a long report on a laptop',
  aitranslate: 'a woman using AI to translate a document into another language on a laptop',
  aireceipt: 'a shop owner scanning a paper receipt to convert it into a spreadsheet, phone',
  airesume: 'a young job seeker getting AI feedback on his resume on a laptop, thoughtful',
  aiexcelcompare: 'an accountant using AI to compare two Excel files on a laptop screen',
  ocr: 'a woman scanning a printed page to extract editable text with her phone camera',
  camscan: 'a man photographing a document with his phone to scan it, corners auto-detected on screen',
  aihandwriting: 'a student converting her handwritten notes into typed text with her phone',
  livetranslate: 'two people from different countries talking through a live speech-translation app on a phone',
  texttoimage: 'a young creative typing a description and watching AI generate an image on a laptop, amazed',

  // ---------- Education (5) ----------
  numberjungle: 'a young child happily playing a number-matching learning game on a tablet',
  littlestar: 'a small child playing colorful educational games on a tablet, parent nearby smiling',
  mathpractice: 'a schoolchild solving printed math practice worksheets at a desk, pencil in hand',
  tamiltracing: 'a young child tracing Tamil letters on a tablet screen with a stylus, focused',
  carrompuzzle: 'a child and parent playing a carrom-style puzzle game together on a tablet',
};

async function generateOne(id, prompt) {
  const outPath = path.join(OUT_DIR, `${id}.jpg`);
  if (fs.existsSync(outPath)) {
    console.log(`  SKIP  ${id} (already exists)`);
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
    if (!res.ok || json.success === false) {
      throw new Error(json.errors?.[0]?.message || `HTTP ${res.status}`);
    }
    buf = Buffer.from(json.result.image, 'base64');
  } else {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
  }
  fs.writeFileSync(outPath, buf);
  console.log(`  OK    ${id}  (${(buf.length / 1024).toFixed(0)} KB)`);
  return 'ok';
}

async function main() {
  const ids = Object.keys(PROMPTS);
  console.log(`Generating images for ${ids.length} tools -> ${OUT_DIR}/\n`);
  let ok = 0, skipped = 0, failed = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    process.stdout.write(`[${i + 1}/${ids.length}] ${id} ... `);
    try {
      const result = await generateOne(id, PROMPTS[id]);
      if (result === 'ok') ok++; else skipped++;
    } catch (err) {
      console.log(`  FAIL  ${id}: ${err.message}`);
      failed.push(id);
    }
    // Small delay between calls — polite to the API, avoids any per-second
    // rate limit even though the daily Neuron pool is generous.
    await new Promise(r => setTimeout(r, 600));
  }
  console.log(`\nDone. ${ok} generated, ${skipped} skipped (already existed), ${failed.length} failed.`);
  if (failed.length) {
    console.log('Failed tool IDs (re-run this script to retry just these — it skips completed ones):');
    console.log(failed.join(', '));
  }
}

main();
