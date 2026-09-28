# PDF Tools India — pdftoolsindia.com

123+ free, browser-based PDF/Image/Video/Business/Education tools, in Tamil + English, built by a Tamilian for Tamil people. Most tools run entirely client-side (merge, split, compress, convert, OCR, watermark) — no upload, no server cost, no daily limits. A small set of AI-powered tools and "Fast Server Mode" reach the backend and cost credits. The guiding rule for every new tool: deterministic/programmed logic is always free; only genuinely AI-dependent or heavy-backend features cost credits.

## Live Architecture

| Layer | Service | Notes |
|---|---|---|
| Frontend | **Cloudflare Pages** | Auto-deploys from this repo's `main` branch — pushing `index.html` here goes live. |
| Backend | **Google Cloud Run** (`all-in-one-tools`, project `pdf-tools-506813`, region `asia-south1`) | Handles AI calls (Gemini vision + NVIDIA Llama-3 text), payment verification, and Fast Server Mode video processing (real ffmpeg). |
| Auth + DB | **Supabase** | Email + Google sign-in, credit balances. |
| Payments | **Razorpay** (live mode) | Credit top-ups. |

Backend deploy command (from `~/pdf-tools-backend/pdf-tools-backend`):
```
git pull && gcloud run deploy all-in-one-tools --project=pdf-tools-506813 --source . --region asia-south1 --allow-unauthenticated --memory 2Gi
```
Frontend deploys automatically on push to `main` — no manual step needed.

## File Structure

### Main app
- **`index.source.html`** — the readable, human-maintainable source. **Edit this file**, not `index.html`.
- **`index.html`** — a **minified build** generated from `index.source.html` via `terser` (compress + mangle, property names untouched). This is what's actually served. After editing the source, re-minify and replace this file before shipping — never hand-edit it directly.
- **`category-education.js`**, **`category-image.js`** — tool code for the Education and Image categories, split out of `index.source.html`/`index.html` and **lazy-loaded** (only fetched the first time a person opens a tool from that category), to keep the initial page smaller. The remaining categories (PDF, Business, Video, AI) are still bundled directly into `index.html`. More categories may move to this pattern over time — see `LAZY_LOAD_CATEGORIES` in the source for the current list.

### Standalone embedded tools
A few tools are full standalone apps (their own HTML/CSS/JS), opened in a new browser tab rather than bundled inline — `mountEmbeddedTool()` in the source handles this:
- `Resume_build.html` — Resume Builder (also calls the real `/api/ai/ask` backend for AI-generated summary/bullets/skills when signed in, falling back to a built-in template library otherwise)
- `gst-checking.html` — GST Checking
- `hr-attendance-register.html` — HR Attendance Register
- `astrology-plus.html` — Astrology+ (needs auth — receives the session token via `postMessage`). Porutham (marriage-matching) now returns a weighted `verdict` (🟢 strong / 🟡 moderate / 🟠 weak / 🔴 caution) computed from classically-recognized relative severity of the 10 poruthams (Rajju/Vedha/Dina/Gana/Rasi weighted higher), not just a raw match count — calculation lives in `server.js`, fully deterministic, no AI.
- `tn-property-registration-calculator.html` — TN Property Registration & Stamp Duty Calculator (Sale/Gift/Settlement/Release/Partition/Mortgage/POA deeds, Tamil Nadu rates). No auth needed, 100% free, no AI — pure formula.
- `number-jungle-game-engine.html`, `typing-race-game.html` — education games (embedded via a separate iframe pattern, not `mountEmbeddedTool`). `typing-race-game.html` is Type Race — a typing speed/accuracy practice game (English words/sentences + Tamil words typed in Tanglish), with its own XP/level/badge system in `localStorage`, same style as Number Jungle.

### Site pages
`blog/` (SEO guide posts + index), `contact.html`, `privacy.html`, `terms.html`, `refund.html`, `robots.txt`, `sitemap.xml`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`.

### Backend
`server.js` (Express + Supabase + Razorpay + ffmpeg), `package.json`, `Dockerfile`, `.env.example`, `supabase_schema.sql`.

### Data
`thirukkural-daily.json` — all 1330 Thirukkural verses, used by the homepage's daily-verse widget.

## Rebuilding the minified `index.html` after editing the source

```bash
npm install terser --no-save
# then, per <script> block over ~100 chars in index.source.html:
npx terser <extracted-script>.js --compress --mangle --output <extracted-script>.min.js
# reassemble into index.html, verify with: node --check <extracted-script>.js
```
(This project's own commit history has the exact Python reassembly steps used each time — search recent commits mentioning "terser" if you need the precise script.)

## Adding a new tool
1. Register it in the `TOOLS` array in `index.source.html`: `{id:'yourtool', name:'...', desc:'...', icon:'...', color:'#hex', cat:'pdf'|'business'|'image'|'video'|'ai'|'education'}`.
2. Add `TOOL_IMPL.yourtool = { mount(container){ ... } }` — either inline in `index.source.html`, or in the relevant `category-*.js` file if that category is already split out.
3. If it uses any of the 9 lazy-loaded libraries (`pdf-lib`, `pdf.js`, `jszip`, `tesseract.js`, `xlsx`, `mammoth`, `html2canvas`, `docx`, `pptxgenjs`), add an entry to `TOOL_LIBS` in `index.source.html` (e.g. `yourtool:['pdflib']`) — otherwise `mount()` may run before the library has loaded. No entry needed for tools that don't use any of these.
4. Re-minify and ship.

## Known follow-ups
- PDF, Business, Video, and AI categories remain bundled in `index.html` — candidates for the same lazy-load split Education and Image already received, if the pattern continues to prove stable.
- One dead file still pending manual deletion on GitHub (the web upload UI can't delete files, only add/replace): `images/tools/littlestar.jpg` — the two dead HTML files (`kids-arcade.html`, `tools/little-star-education-arcade.html`) have already been deleted.

## ⚠️ Service worker (`sw.js`) gotcha
`sw.js` caches `index.html` for offline use, keyed by `CACHE_NAME`. Browsers only detect a new service worker (and re-cache) when **`sw.js` itself changes byte-for-byte** — editing `index.html` alone, however many times, never triggers this. A user's browser can keep running a service worker (and its cached app shell) from weeks ago even after many deploys, and hard refresh does **not** reliably force an active service worker to update in every browser. **Bump `CACHE_NAME` (e.g. `v2` → `v3`) whenever a change needs to reach service-worker-controlled clients promptly** — this was the actual cause of AI tool images not appearing for a user despite multiple confirmed-correct deploys and hard refreshes.

## ⚠️ New required env var: `NVIDIA_API_KEY`
`server.js` now has a second AI endpoint, `/api/ai/text` (in addition to the existing `/api/ai/ask`), which calls NVIDIA's free Llama-3 API (`integrate.api.nvidia.com`) instead of Gemini. **This endpoint will fail until `NVIDIA_API_KEY` is added to Cloud Run** — add it with `--update-env-vars` (see the gotcha right below this one, never `--set-env-vars`):
```bash
gcloud run services update all-in-one-tools --project=pdf-tools-506813 --region=asia-south1 --update-env-vars NVIDIA_API_KEY=nvapi-...
```
Get a free key at build.nvidia.com (sign in → any model page → "Get API Key" — no credit card needed).

## ⚠️ Cloud Run env var gotcha
`gcloud run services update --set-env-vars` **replaces the entire env var set**, not just the ones listed — this caused a real production outage once (wiped Supabase/Razorpay/Gemini keys, leaving only the 2 vars in that command, which crashed the server on startup with `Error: supabaseUrl is required`). **Always use `--update-env-vars` instead** to add/change vars without touching the rest. Confirm the full var list before AND after any env change:
```bash
gcloud run services describe all-in-one-tools --project=pdf-tools-506813 --region=asia-south1 --format="value(spec.template.spec.containers[0].env[].name)"
```

## Recent major changes
- **NVIDIA Llama-3 (free) now powers text-only AI work, saving Gemini cost for genuine photo/scan work**: a new shared client-side helper, `extractDocumentText(file)` in `index.source.html`, tries to pull real text out of an uploaded file first — using the already-lazy-loaded `pdf.js` (for a PDF that has an actual text layer, not a scan), `mammoth.js` (`.docx`), or `xlsx.js` (`.xlsx`/`.xls`/`.csv`) — entirely in the browser, at zero server cost. If that succeeds (more than ~20 characters of text), the extracted text is sent to the new `POST /api/ai/text` backend endpoint, which calls NVIDIA's free `meta/llama-3.3-70b-instruct` model instead of Gemini. If extraction fails or yields too little text (a photo, or a scanned/image-only PDF), the tool falls back to the original `/api/ai/ask` Gemini **vision** path unchanged — so nothing that worked before stops working. This hybrid routing is wired into:
  - **AI Summarize** (`aisummarize`) — rewritten to accept PDF/DOCX/XLSX/XLS/CSV/photo (previously photo/PDF only), routing text-based files through NVIDIA and photos/scans through Gemini vision as before.
  - **AI Resume Reviewer** (`airesume`) — now also accepts `.docx` (previously image/PDF only), using the same hybrid routing.
  - **Resume Builder**'s "AI suggest" buttons (`Resume_build.html`) — switched outright to `/api/ai/text` (pure instruction, no file involved, so no vision was ever needed here).
  - See the "New required env var" section below — `NVIDIA_API_KEY` must be added to Cloud Run before `/api/ai/text` will work in production.
  - Not changed: **AI Handwriting** and **Receipt/Invoice Extract** stay on Gemini vision — NVIDIA's OCR model doesn't support Tamil. Audio/video transcription via NVIDIA was investigated but not implemented — its Tamil-capable model variant appears to need self-hosted GPU infrastructure, not the simple free hosted API, so this needs further verification before it's worth building.
- **Download "Save As" dialog fixed to show the correct file type**: `downloadBlob()` (used by every tool's download button) calls the browser's native File System Access "Save As" dialog on desktop Chrome/Edge, but was calling it without telling it what kind of file it is — so the dialog's type dropdown only ever showed "All Files", regardless of whether the output was a PDF, ZIP, image, etc. (reported as the save dialog not showing/enforcing the right file extension). Fixed by passing a `types` option built from the file's extension (`DOWNLOAD_TYPE_MAP` in `index.source.html`, covering pdf/zip/docx/xlsx/pptx/png/jpg/gif/webp/mp4/mp3/wav/txt/csv/json) — the dialog now defaults to the correct type (e.g. "PDF file") and the browser enforces the right extension when saving. Unknown extensions fall back to the old behavior (harmless). Doesn't affect Safari/Firefox/mobile, which never used this dialog (they already download straight to the Downloads folder with the extension embedded in the filename).
- **Initial page load sped up — the 9 heavy non-auth libraries are now lazy-loaded per tool**, fixing the "slow first paint on every visit" issue: `pdf-lib`, `pdf.js`, `jszip`, `tesseract.js`, `xlsx`, `mammoth`, `html2canvas`, `docx`, and `pptxgenjs` no longer load in `<head>` on every visit — each is fetched only the first time a tool that actually needs it is opened (`supabase-js` stays eager, since auth/credits are needed site-wide immediately, not tied to one tool). A `defer`-based fix was tried earlier and reverted (see prior note, now removed) because it had a real script-ordering failure mode; this replacement uses explicit `await ensureXXX()` calls instead of browser-native `defer`, so ordering is never in question even if a library fails to load — the tool just shows a clear error ("Could not load ___ — check your internet connection and try again.") instead of silently breaking. A failed load is also retried automatically the next time that tool is opened, rather than staying broken for the rest of the tab's life. `TOOL_LIBS` in `index.source.html` is the one table listing which of the 9 libraries each tool needs (covers tools in `index.source.html` itself plus `category-image.js`/`category-education.js`); `renderToolPanel()` shows the same "⏳ Loading…" placeholder already used for lazy category loading while it waits. Verified with a Playwright smoke test (mocked CDN responses) covering: a no-library tool loading instantly with zero extra requests, a library loading once and being reused across multiple tools without re-fetching, a simulated failed library load showing the friendly error without corrupting other tools, and a successful retry of that same tool afterward with no page reload needed.
- **Cache bug fixed**: `_headers` had no `Cache-Control` rule for `.js`/`.json` files, so Cloudflare's default long-lived asset caching meant a browser (or the CDN edge) could keep serving an old, already-fixed-on-GitHub version of a lazy-loaded category file (or a stale day's `thirukkural-daily.json`) for a long time after a deploy — this was the recurring "site/tool looks old even after a fix" complaint. Fixed by making `.js` and `.json` always revalidate, same as `index.html`.
- **Memory-leak guard added**: a global `URL.createObjectURL`/`revokeObjectURL` tracker in `index.source.html`, swept on every screen transition (`render()`), auto-releases preview `blob:` URLs that a tool created but never revoked itself — fixes memory buildup from image/video/audio preview tools over a long session, without touching each tool's own code.
- **Porutham now gives a real verdict, not just a match count** — see `astrology-plus.html` entry above.
- **New tool: Type Race** — typing speed/accuracy practice game (English + Tamil), Education category, free, gamified (XP/levels/badges via `localStorage`). See `typing-race-game.html` above.
- **New tool: TN Property Registration & Stamp Duty Calculator** — Business category, free, no AI. See `tn-property-registration-calculator.html` above.
- **Text-to-Image now runs on Cloudflare Workers AI (FLUX.1-schnell)** — confirmed live in production (`/api/ai/image` correctly returns the login-required auth error, not route-not-found). Genuinely free, ~10,000 Neurons/day, no credit card needed — see the env var table in `.env.example`.
- **Password Recovery suite** (PDF/Excel/Word): common-password dictionary, personal-details-based guessing with cross-combination, name+number and name+digit+symbol brute-force with honest time estimates, and a "your own remembered guesses" mode — all client-side, all clearly scoped to genuinely weak/guessable passwords (AES-256 with a real strong password is not crackable, and the tool doesn't pretend otherwise).
- **PDF Protect/Unlock** upgraded to AES-256 (previously RC4-only, which real-world PDFs from banks/government rarely use).
- **EMI/Loan, Income Tax (FY 2026-27 Old vs New regime), Age, and Percentage calculators** added.
- **Photo Filters** tool added (Vivid/B&W/Sepia/Vintage/Cool/Warm/Vignette presets with live thumbnail gallery).
- **Resume Builder**'s "AI suggest" buttons upgraded from a static template library to genuine backend AI calls (with the template library kept as an honest fallback).
- Consolidated 3 overlapping business document tools (Bill/Quotation Maker, Purchase Order Generator) into the single, more capable Quotation/Bill/PO/Performa tool.
- Homepage redesigned (bento-grid category layout, trust banner, Tamil/English/Hindi language switcher), Blog section added for SEO.
- Site-wide minification for basic source-code protection (see File Structure above).
- Education and Image categories split into lazy-loaded `category-*.js` files (see File Structure above) to reduce initial page weight.
- Confirmed `server.js` (with the `/api/ai/image` Text-to-Image endpoint) is deployed to Cloud Run and live — verified via `curl -X POST .../api/ai/image` returning the expected "login required" auth error (not "route not found").
- Removed 2 dead files from the repo: `bill-quotation-maker.html` (its tool was consolidated away) and `kamakshi_gst_checking.html` (an exact byte-for-byte duplicate of `gst-checking.html`). Also removed `bar-collection-register.html` (never wired up as a tool, confirmed no longer needed).
