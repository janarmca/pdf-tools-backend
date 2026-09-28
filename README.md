# PDF Tools India — pdftoolsindia.com

123+ free, browser-based PDF/Image/Video/Business/Education tools, in Tamil + English, built by a Tamilian for Tamil people. Most tools run entirely client-side (merge, split, compress, convert, OCR, watermark) — no upload, no server cost, no daily limits. A small set of AI-powered tools and "Fast Server Mode" reach the backend and cost credits. The guiding rule for every new tool: deterministic/programmed logic is always free; only genuinely AI-dependent or heavy-backend features cost credits.

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
- `astrology-plus.html` — Astrology+ (needs auth — receives the session token via `postMessage`). Porutham (marriage-matching) now returns a weighted `verdict` (🟢 strong / 🟡 moderate / 🟠 weak / 🔴 caution) computed from classically-recognized relative severity of the 10 poruthams (Rajju/Vedha/Dina/Gana/Rasi weighted higher), not just a raw match count — calculation lives in `server.js`, fully deterministic, no AI.
- `tn-property-registration-calculator.html` — TN Property Registration & Stamp Duty Calculator (Sale/Gift/Settlement/Release/Partition/Mortgage/POA deeds, Tamil Nadu rates). No auth needed, 100% free, no AI — pure formula.
- `number-jungle-game-engine.html`, `typing-race-game.html` — education games (embedded via a separate iframe pattern, not `mountEmbeddedTool`). `typing-race-game.html` is Type Race — a typing speed/accuracy practice game (English words/sentences + Tamil words typed in Tanglish), with its own XP/level/badge system in `localStorage`, same style as Number Jungle.
- `kids-arcade.html` — dead file, kept only until it can be deleted from GitHub (upload UI can't delete; see Known follow-ups). The "Little Star" tool that used it was already removed from the `TOOLS` array.

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
- PDF, Business, Video, and AI categories remain bundled in `index.html` — candidates for the same lazy-load split Education and Image already received, if the pattern continues to prove stable.
- **Initial page load is slow** — root cause confirmed: 10 heavy third-party libraries (`pdf-lib`, `pdf.js`, `jszip`, `tesseract.js`, `xlsx`, `mammoth`, `html2canvas`, `docx`, `supabase-js`, `pptxgenjs`) load synchronously in `<head>` on **every** visit, before the app even renders, regardless of which tool (if any) the visitor wants. The obvious fix (add `defer` to those `<script>` tags) was tried and **reverted** — testing proved that if any single one fails to load (a flaky connection, a CDN hiccup), Chromium's defer-ordering can let later app code run before earlier libraries finish, which can silently break PDF tools or login for that visit with no error shown. The safe fix is true per-tool lazy-loading (fetch each library only when a tool that needs it is opened) — the same proven pattern already used for `category-education.js`/`category-image.js` and for the existing `opencv.js`/`qrcode.js` on-demand loaders. This needs an audit of every `TOOL_IMPL` that references these 10 globals; not done yet.
- Manual cleanup still pending on GitHub (the web upload UI can't delete files, only add/replace): delete `kids-arcade.html`, `tools/little-star-education-arcade.html`, and `images/tools/littlestar.jpg` — all dead now that the Little Star tool was removed from `TOOLS`.

## ⚠️ Service worker (`sw.js`) gotcha
`sw.js` caches `index.html` for offline use, keyed by `CACHE_NAME`. Browsers only detect a new service worker (and re-cache) when **`sw.js` itself changes byte-for-byte** — editing `index.html` alone, however many times, never triggers this. A user's browser can keep running a service worker (and its cached app shell) from weeks ago even after many deploys, and hard refresh does **not** reliably force an active service worker to update in every browser. **Bump `CACHE_NAME` (e.g. `v2` → `v3`) whenever a change needs to reach service-worker-controlled clients promptly** — this was the actual cause of AI tool images not appearing for a user despite multiple confirmed-correct deploys and hard refreshes.

## ⚠️ Cloud Run env var gotcha
`gcloud run services update --set-env-vars` **replaces the entire env var set**, not just the ones listed — this caused a real production outage once (wiped Supabase/Razorpay/Gemini keys, leaving only the 2 vars in that command, which crashed the server on startup with `Error: supabaseUrl is required`). **Always use `--update-env-vars` instead** to add/change vars without touching the rest. Confirm the full var list before AND after any env change:
```bash
gcloud run services describe all-in-one-tools --project=pdf-tools-506813 --region=asia-south1 --format="value(spec.template.spec.containers[0].env[].name)"
```

## Recent major changes
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
