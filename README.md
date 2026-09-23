# PDF Tools India — pdftoolsindia.com

113+ free, browser-based PDF/Image/Video/Business/Education tools, in Tamil + English, built by a Tamilian for Tamil people. Most tools run entirely client-side (merge, split, compress, convert, OCR, watermark) — no upload, no server cost, no daily limits. A small set of AI-powered tools and "Fast Server Mode" reach the backend and cost credits.

## Live Architecture

| Layer | Service | Notes |
|---|---|---|
| Frontend | **Cloudflare Pages** | Auto-deploys from this repo's `main` branch — pushing `index.html` here goes live. |
| Backend | **Google Cloud Run** (`all-in-one-tools`, project `pdf-tools-506813`, region `asia-south1`) | Handles AI calls (Gemini), payment verification, and Fast Server Mode video processing (real ffmpeg). |
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
- `astrology-plus.html` — Astrology+ (needs auth — receives the session token via `postMessage`)
- `number-jungle-game-engine.html`, `kids-arcade.html` — education games (embedded via a separate iframe pattern, not `mountEmbeddedTool`)

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
3. Re-minify and ship.

## Known follow-ups
- **`server.js` needs a Cloud Run redeploy** to apply the Text-to-Image credit price change (3 → 5 credits, fixing a real per-image loss — see changelog). Frontend change is already live.
- PDF, Business, Video, and AI categories remain bundled in `index.html` — candidates for the same lazy-load split Education and Image already received, if the pattern continues to prove stable.

## Recent major changes
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
