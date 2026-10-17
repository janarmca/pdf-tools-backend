# HANDOFF — pdftoolsindia.com (read this first in a new session)

Owner: Janarthanan (talks in Tamil / Tanglish; wants everything at ₹0 cost). Reply to the owner in Tamil/Tanglish, keep it plain.
Repo: `janarmca/pdf-tools-backend`. Deploys: Cloudflare Pages auto-deploys `main`; one Cloudflare Worker (`cloudflare/`) is the whole backend.
Rules that never change are in `CLAUDE.md` (no Supabase / Cloud Run, no passwords, edit BOTH `index.source.html` and `index.html`, bump `sw.js`).

## Working rules for any change
1. Edit `index.source.html` (readable). Then run `python3 remin.py` (~8 s) to rebuild the served `index.html`. **Run remin again after every edit to the source, including version-string edits.**
2. Bump `CACHE_NAME` in `sw.js` (now `pdf-tools-shell-v54`).
3. Lazy category scripts load with a version query: `category-${cat}.js?v=2026101xx` inside `loadCategoryScript` in `index.source.html`. Change that string whenever `category-docs.js` / `category-extra.js` changes, or browsers keep the old file.
4. After catalog changes (`TOOLS` array) run `node generate-tool-pages.mjs` (rewrites `/tools/*.html`, hub pages, `sitemap.xml`) and `node generate-promo-catalog.mjs` (updates `cloudflare/src/promo-catalog.js`). Removing a tool = also delete its `/tools/<slug>.html` and add a 301 in `_redirects`.
5. Push to **both** `main` and `claude/merge-pending-upload-files-k4v19o` (same commits). Never force-push. If rejected (the sitemap bot commits to main): `git fetch origin main && git merge --no-edit origin/main`, push again.
6. Commit trailers: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: <session url>`.
7. Never ask the owner to paste secrets in chat; secrets live only in GitHub repo secrets.

## Where the tools live
| File | Contents |
|---|---|
| `index.source.html` / `index.html` | app shell, `TOOLS` catalog, `TOOL_LIBS` (on-demand libs per tool id), most older tools |
| `category-docs.js` (lazy `lazy:'docs'`) | **all document tools**: `quotepo` (Quotation / Proforma / Tax Invoice / Bill / Bill of Supply / PO / Challan, also covers GST invoice), `receipts` (rent, tuition, money receipt, payment voucher), `salaryslip`, `leaveletter`, `prescription`, `businesscard`, `hrattendance`, `expensetracker` |
| `category-extra.js` (lazy `lazy:'extra'`) | TNEA cut-off, biodata, star finder, porutham, gold, PF, EB bill, invitation |
| `category-education.js`, `category-image.js` | their categories |
| `libs/` | self-hosted `fontkit`, `regenerator-runtime`, `qrcode-generator` (no CDN needed for Tamil PDFs or QR) |
| `fonts/` | Noto Sans Tamil (TTF for PDFs, woff2 + `tamil.css` for pages) |
| `pages-style.mjs`, `generate-tool-pages.mjs` | static SEO pages for every tool |
| `_redirects` | 301s for removed tool pages |
| `cloudflare/` | Worker (D1, KV, Workers AI, promo agent) — see `cloudflare/README.md` |

Old tool ids still work: `TOOL_MOVED` in `index.source.html` maps `gstinvoice → quotepo`, `rentreceipt / tuitionreceipt / paymentvoucher → receipts` (used by `openTool` and `?tool=` deep links). `TOOL_ALIAS` is a different thing (search keywords) — do not reuse that name.

## Key design points in `category-docs.js`
- **Tamil in PDFs:** pdf-lib + fontkit + Noto Sans Tamil. `embedUnicodeFont` returns a font patched by `makeMixedScriptFont` (in `index.source.html`) so mixed Tamil/English strings are shaped per script run. Always draw through `page.drawText`; measure with `font.widthOfTextAtSize`.
- **Document language** (English / தமிழ் / both) exists on every document tool:
  - invoice family: `S.lang` (`en|ta|bi`), global `OL`, label dictionary `TA_LAB`, `LB()` translates fixed labels only (never user text), `lang3(en, ta)`; table headers stack two lines in `bi` mode.
  - receipts / salary slip / prescription: `tl(lang, en, ta)` + `rcWords(lang, n)` (amount in words, uses `TamilCore.rupeesToWords` for Tamil).
  - leave letter: `ta | en | bi` (bi = two letters, separate editable bodies); business card: two-sided (front/back in two languages, duplex-aligned sheet); HR + Expense: Excel/print language in the "Data" tab.
- **Money:** invoice maths is integer paise (`calcDoc`); per-(HSN, rate) tax summary; IGST vs CGST+SGST from seller/buyer state (GSTIN first 2 digits); inclusive-price mode; round-off; advance/balance.
- **Dates:** always local (`localISO`), never `toISOString()` (it gave yesterday between 00:00–05:30 IST).
- **Storage (all device-local, nothing leaves the browser):** `pti-biz-*` (invoice drafts, seller, buyers, numbering), `pti-rcpt-*`, `pti-salary-*`, `pti-leave-*`, `pti-rx-*`, `pti-card-v1`, `pti-exp-v1`, `hrreg_employees / hrreg_attendance / hrreg_settings` (HR keys kept from the old page so existing data survived). HR and Expense re-read storage before every write and listen for `storage` events (two tabs cannot overwrite each other).
- Helpers shared by tools: `root`, `B()` (UI text in the site language first), `esc`, `fld`-style inputs, `dx-*` CSS classes, `qrDataUrl` (self-hosted QR), `fileSafe`, `downloadBlob`.

## Tests / how to verify
- Pure maths: `node tests/billing-calc.test.mjs` (must print `ALL CALC TESTS PASS`).
- Worker: `cd cloudflare && node --test --test-concurrency=1 test/*.test.mjs` (needs `wrangler dev`, see README).
- Browser checks used so far (Playwright + Chromium, phone viewport 390×844, timezone Asia/Kolkata): open every tool via `openTool(id)` and look for JS errors / empty screens / horizontal overflow (157 tools passed); generate PDF/Excel/Word for each document tool and render PDFs with `pdftoppm` to look at them; recalculate Excel in LibreOffice (`soffice --headless --convert-to csv`) to confirm formulas = cached values.
- Local preview: `python3 -m http.server 8104` then `http://127.0.0.1:8104/index.html?tool=<id>`. In the sandbox, public CDNs are blocked, so anything that still needs a CDN will not load there (that is why libs were self-hosted).

## Pitfalls already hit (do not repeat)
- A `</body>` string inside page JS: never `replace('</body>', …)` first occurrence; use the last one.
- `const` name clash in the huge inline script (`TOOL_ALIAS`) breaks terser/minify — grep before adding a top-level name.
- Using a `const` before its declaration in the same expression (TDZ) in tool code throws only at runtime — always run the tool once.
- Tamil-only names make `fileSafe()` empty — it returns `''`; callers add a fallback.
- Free Worker plan = 10 ms CPU per request: no hashing/heavy work in the Worker.

## Not done / not verified (be honest about these)
- Not tested on a real Android/iPhone (print dialog, WhatsApp share, file downloads). Word (.docx) outputs download but were not opened in Word. Quotation/Invoice Excel not opened in Excel (only the Expense Excel was recalculated in LibreOffice).
- Image lazy-loading and performance measurements not done. No full visual redesign of the home page (earlier redesign already shipped; avoid breaking working parts).
- Legal/tax values written from memory — owner should verify: PF 12% on ₹15,000 ceiling, ESI 0.75% when gross ≤ ₹21,000, rent > ₹1,00,000/yr needs landlord PAN, §269ST (₹2 lakh cash), §40A(3) (₹10,000 cash). They show only as warnings. Professional Tax is entered by hand (state slabs not hard-coded). Revenue-stamp rule is state-specific — only a warning + optional stamp box.
- Old `hr-attendance-register.html` (React + Babel from CDN) is still in the repo but no longer linked.
- Owner-side items still pending: Telegram bot admin rights + "post now" test; Facebook / Instagram / X / Pinterest / YouTube app keys (as GitHub secrets); footer phone-number decision; verify TNEB tariff, PF 8.25%, gold-loan 75% LTV, TNEA eligibility % (written from memory).

## Ideas the owner may ask next
Bulk salary slips from a CSV; invoice → receipt link; Tamil number-to-words for paise edge cases; image lazy-loading + Lighthouse pass; remove the old HR page; e-invoice/QR (IRN) is out of scope (needs GST portal API).

## DSC / e-Sign tools (added Oct 2026)
- `dsc-verify.js` (self-contained, no libs, loaded on demand as lib key `dscverify` from `/dsc-verify.js?v=1`; bump the `?v=` in `ensureDscVerify` when it changes). `DscVerify.analyze(buf)` parses PDF `/ByteRange` + CMS/PKCS#7, checks digest, RSA/ECDSA signature, cert chain links, validity at signing time, appended data, SHA-1, Indian-CA names. Cannot check revocation (OCSP/CRL) or an official trust store offline — the UI says so.
- Tools: `dscverify` (🔏 verifier), `dscguide` (🔑 help page). `mountUploader` shows a "signed PDF" warning for every tool in `SIGN_BREAKING_TOOLS` (`signedPdfWarning`, fast byte scan `quickSignedCheck`).
- Browser cannot use a USB DSC token by itself, and Aadhaar e-Sign needs an authorised ESP — neither is built; the guide says so.
- Tests: `node tests/dsc-verify.test.mjs` (needs openssl + python3 `cryptography`). Not yet tried on real TRACES / eMudhra / (n)Code PDFs.

## TDS helper tools (added Oct 2026, lazy file `category-tds.js`, logic in `tds-core.js`)
- Tools: `pantan` (PAN/TAN checker), `tdsdates` (due-date calendar), `tdsinterest` (s.398(3)(a) interest), `dscbulk` (bulk Form 16/130 signature check, PDFs or TRACES ZIP). `TOOL_LIBS` loads `tdscore` (+ `dscverify`, `jszip`). After editing `category-tds.js` bump `?v=` in `loadCategoryScript`; after editing `tds-core.js` bump `?v=` in `ensureTdsCore`.
- Every rule was taken from Income Tax Dept pages (Transition FAQ Q2.13/Q6.8–Q6.10, Form 138/130 FAQs, Rules 2026): deposit 7th of next month (30 April for March), quarterly statements 31 Jul/31 Oct/31 Jan/31 May, Form 130 by 15 June, interest 1% / 1.5% per month or part. Form map: 16→130, 16A→131, 24Q→138, 26Q→140, 27Q→144, 27EQ→143, 15G/15H→121. Old Act applies to sums paid/credited up to 31 Mar 2026.
- DELIBERATELY NOT BUILT (cannot be verified here): TDS rate table (section numbers changed, blogs disagree), s.427 late fee amount, TCS dates, Form 16A/131 date, Form 130/16 generator (Dept says only TRACES-generated certificates are valid), FVU/TDS return file preparation.
- Month-counting convention in `monthsOrPart` (start and end day both counted) is an assumption; the UI tells users the TRACES Justification Report is final.
- Tests: `node tests/tds-core.test.mjs`.


## Tax-rule watcher (keeps the TDS tools current)
- `.github/tax-sources.json` lists the official Income Tax Department pages the TDS tools were verified against. `.github/tax-sources.lock.json` holds their hashes.
- `.github/workflows/watch-tax-rules.yml` runs every Monday (and on demand): `node .github/scripts/watch-tax-rules.mjs` fetches the pages (HTML is reduced to visible text so script/cache noise does not alarm), compares with the lock, commits the new lock, and opens/updates a GitHub issue "Tax rule pages changed — re-verify the TDS tools" when a page really changed. Unreachable pages are only logged; 4 weeks of ALL pages unreachable opens a separate issue (the site may block GitHub runners).
- It never edits the tools. When the issue appears: ask Claude to re-read the changed official pages, fix `tds-core.js` / `category-tds.js` / tests, set `RULES.asOf` in `tds-core.js` (shown in the UI as "Rules last verified on"), bump `tds-core.js?v=` in `index.source.html`, `sw.js` CACHE_NAME, run `python3 remin.py`, and ship a changed-files zip.
- First run after deploy only records a baseline (no alert). NOT verified from the build sandbox: the live run against incometaxindia.gov.in and the issue creation (needs the repo's Actions). Test: `node tests/watch-tax-rules.test.mjs` (local mock server).
- Remember: `dsc-verify.js` now handles RSA-PSS and RFC 3161 time-stamps (`?v=2`), `tds-core.js?v=2`, category scripts `?v=20261015d`, sw cache `v57`.

## Browser-level DSC / TDS test (done Oct 2026, with generated signed PDFs)
- Corpus: `bash tests/dsc/gen-certs.sh && python3 tests/dsc/make-pdfs.py` (openssl) and `tests/dsc/make-pyhanko-pdfs.py` (pyHanko in a venv: `pip install pyhanko pypdf cryptography`) in a scratch folder. These are real CMS/PKCS#7 signatures from a throw-away CA — NOT government-issued certificates; a real TRACES / eMudhra / (n)Code PDF is still untested.
- Result: verifier 18/18 files classified as expected in Chromium (valid, tampered, appended data, SHA-1, expired, missing chain, ECDSA, RSA-PSS, two signatures, document time-stamp, unsigned, non-PDF); bulk check counts + CSV correct for 9 loose PDFs, a TRACES-style ZIP (txt and `__MACOSX` ignored) and a 300-file ZIP (0.7 s); the signed-PDF warning shows only for signed PDFs on merge / compress / rotate / pdfmeta; PAN/TAN, TDS dates (FY 2025-26 and 2026-27) and TDS interest match the stated rules, including "deposited before the due date = no interest".
- Gotcha: `make-pdfs.py` hard-codes the PDF signing time `/M` to 2026-10-14 10:00 IST. A signature WITHOUT signed attributes has no signing time of its own, so the verifier uses that claimed time and, if the throw-away certificate was generated later than it, correctly reports `NOT_YET_VALID`. That is a test-data artefact, not a tool bug — regenerate with a current `/M` (see how `t_noattr` was rebuilt) before using it in a browser test.

## Image → Excel (`img2excel`) — OCR cleanup (Oct 2026)
- Why: a phone photo of a table gave stray marks (`™ p`, `SUR`), a junk 5th column, amounts left as TEXT, `29.487` stored as 29.487 instead of 29,487, and the preview / Copy showed raw OCR text while only the .xlsx was cleaned.
- Fixes (all in the `Img2Xls` module of `index.source.html`): `denoise` (only inside clearly-numeric columns; edge margin columns need an empty header AND tiny AND unsure; never touches text columns, headers, "Nil"), thousands-separator repair in whole-rupee columns (`colInt`), `checkTotals` (reconciles each Total row and a Total under a Grand Total; reports only, the optional "use calculated total" button is the user's choice), `locateCells` + `refineNumbers` (digits-only close-up re-read of unsure or missed number cells; blank cells are re-read only if they contain real ink). UI: preview and Copy now show the cleaned values (`disp`), orange suspect cells + banner, orange fill and a cell note in the .xlsx.
- Measured on a generated supplier table (clean render + 4 blurry/tilted "phone photo" variants, real Tesseract output): Excel cells exact 179/216 → 210/216; noise cells 43 → 6 (the legitimate "Sr" header counts as 1 per image); amounts stuck as text 17 → 0. Clean images stay 36/36.
- Test: `node tests/img2xls-clean.test.mjs` (fixtures in `tests/fixtures/img2xls-*.json` are real OCR output; no OCR runs). To re-measure with real OCR in a browser, Tesseract assets must be served locally in the sandbox: `npm i tesseract.js@4.1.1 @tesseract.js-data/eng@1.0.0` (worker.min.js, tesseract-core(-simd).wasm(.js), `4.0.0_best_int/eng.traineddata.gz`).
- Known limits: a row the first OCR pass drops completely (e.g. a missing "Star International" line) is not recovered; digit misreads are caught only when a Total row exists. Not tested on a real phone photo, nor Tamil / Hindi tables.

## DSC verifier: "tick mark" / viewer "Signature Not Verified ?" (Oct 2026)
- User report: a Chennai Corporation e-Sign birth certificate showed a yellow "?" / "Signature Not Verified" in a phone PDF viewer while our tool said valid. That "?" is drawn by the viewer (it does not know the Indian CA), or sits in the PDF's own appearance stream; we deliberately do NOT edit the signed PDF (it would break the signature or fake a tick).
- Added: an explanation box (shown unless the signature is broken), a calmer note for short-lived e-Sign certificates ("expired now" is normal; what matters is validity at signing time; a certificate that was already expired when signing keeps the red warning), and a separate "Verification report (PDF)" with a drawn tick / cross, file SHA-256, signer, chain, problems, and an honest "not checked: revocation, official trust list" footer. The font has no "→" glyph: use words, not arrows, in generated PDFs.
- Tested with a generated e-Sign-like file (ECDSA, 30-minute certificate, signed inside its window) — NOT with the user's real file, which we do not have.

## DSC verifier: "✔ tick உடன் புதிய PDF" (verified copy) (Oct 2026)
- Shown only when EVERY signature verdict is OK and the file is not already our stamp. Code: `dsc-stamp.js` (lazy, `?v=1`, `TOOL_LIBS.dscverify` includes `dscstamp`); UI in `TOOL_IMPL.dscverify`.
- How: PDF *incremental update* (append-only): new objects + xref with `/Prev`. The signed bytes (ByteRange) are never touched, so the signature stays cryptographically valid. Adds a `/Stamp` annotation (green circle + tick + 3 text lines incl. file SHA-256, "revocation not checked", "not an official CA / Adobe mark"). Placements: `strip` (default; extends MediaBox/CropBox by 40pt, covers nothing), `sigbox` (over the visible signature widget, falls back to `br`), `br/bl/tr/tl`.
- Safety net: before download the stamped bytes are re-verified in memory (original bytes must be an exact prefix and all signatures intact) or the download is refused. The verifier recognises our copy via `%PTI-VERIFIED-STAMP` and says "verify the ORIGINAL".
- Caveat: pyHanko labels the change level "OTHER" (changing page dict can't be proven annotation-only), so Adobe-like viewers may say "modified after signing". Tell users to upload the ORIGINAL to portals; the tick copy is for showing/sharing only.
- What Adobe does that we cannot: online revocation (OCSP/CRL), Adobe/OS trust lists (AATL/EUTL, Indian CCA roots), and certifying that later changes are allowed.
- Pitfall: new object numbers must start at the original trailer `/Size` (xref-stream files otherwise collide).
- Tests: `PDFLIB=<path to pdf-lib> node tests/dsc-stamp.test.mjs` (skips without pdf-lib); `tests/dsc/validate-stamped.py <stamped.pdf>` (pyHanko + pypdf + poppler; needs `root.pem` in cwd). Tested only with generated e-Sign-like PDFs, not a real government file.

### Late filing fee tool (`tdslatefee`)
- Official: Income-tax Act 2025 s.427(1),(2) (https://www.incometaxindia.gov.in/w/section-427-6) — Rs 200 per day, not more than the tax deductible, to be paid before the statement is delivered; old Act s.234E same. Days = filing date - due date. The s.271H penalty (Rs 10,000-1,00,000) is mentioned, not calculated.
- A TDS rate table is deliberately NOT built: s.393 has ~50 rows with notes/exceptions and "prevailing rates"; a lossy transcription would give wrong rates. The TDS dates page links the official s.393 and TDS Rates pages instead. To add one later, transcribe from the official PDF of the Act and test every row.
- Versions: tds-core.js?v=3, category scripts ?v=20261015e, sw cache v64. s427 + late-fee page added to .github/tax-sources.json.

### YouTube Short: Tamil voice + fonts (`.github/scripts/promo-youtube.mjs`)
- Voice (free, no key): `edge-tts` (ta-IN-PallaviNeural; set TTS_VOICE=ta-IN-ValluvarNeural for the male voice), fallback `gtts-cli`; both are unofficial free services, so they can be blocked/rate-limited from GitHub runners. If both fail the Short is uploaded silent and promo_posts.error says "uploaded WITHOUT voice". Video length = voice length + 1.5 s (min 10, max 30). English abbreviations are spelt in Tamil letters (`SAY` map in the script).
- Fonts: the slide now loads Noto Sans Tamil from the repo's `fonts/` and Inter from npm (@fontsource/inter, installed by the workflow), emoji from apt `fonts-noto-color-emoji` — no Google Fonts request.
- Test: `node tests/promo-youtube.test.mjs` (speech text + ffmpeg build). NOT verified from the build sandbox: the real edge-tts / gTTS calls (no access to those hosts here) — check the first Actions run's log for "Voice made with ...".

### YouTube Short voice upgrade: Gemini TTS first
- Voice order now: Gemini TTS (needs GitHub secret `GEMINI_API_KEY`; models `gemini-3.1-flash-tts-preview` then `gemini-2.5-flash-preview-tts`; voice via workflow input `gemini_voice`, default Kore) -> edge-tts -> gTTS -> silent. Env: GEMINI_TTS_MODEL, GEMINI_VOICE, TTS_ENGINES. Gemini TTS is "Free of charge" on the free tier per ai.google.dev/gemini-api/docs/pricing and ta-IN is GA per the Cloud TTS docs (checked 15 Oct 2026); free-tier limits/terms may change.
- Workflow input `privacy` (public/private) lets the owner test a voice without publishing.
- Tests: `node tests/promo-youtube.test.mjs` uses a local mock Gemini server. NOT verified from the sandbox: the real Gemini TTS call (no network) — read the first run's log ("Gemini model ... voice ...").

## Animated funny YouTube Shorts (UPDATE_20)
- `.github/scripts/promo-anim.mjs` + `.github/scripts/anim/engine.js`: code-only (no AI, no paid service) animated Short. Headless Chrome draws a deterministic `render(t)` timeline frame by frame (playwright-core, installed by the workflow), ffmpeg encodes it, SFX are synthesised by ffmpeg, the Tamil voice comes from `makeVoice` (Gemini → edge-tts → gTTS).
- Rotation by India date (`istDay`): 3 story templates (`reject`, `queue`, `beard`) x 5 colour palettes x 4 character looks; two days in a row never share a story. Workflow input `story` forces one (auto = rotation). Add a story: add its name to `STORIES`, its hook/subs/stamp in `buildPlan`, its props in `engine.js`, its cue list in `SFX_CUES`.
- Per-tool text comes from the catalogue; hand-made demo rows in `DEMO` (currently `pantan`). Paid AI tools are never called free (pills + subtitle).
- The video length follows the voice (`stretch`: 0.85x–1.78x of the 16.8 s beats, max 30 s). If the animation fails for any reason, `promo-youtube.mjs` falls back to the old still-slide Short, so a Short is always made. `ANIM=0` forces the still slide.
- Daily schedule (09:20 IST) is now ON in `promo-youtube.yml`. YouTube consent screen "Testing" mode makes the refresh token expire about every 7 days → publish the Google app to "In production" (or press Connect YouTube weekly).
- Tests: `PLAYWRIGHT_PATH=<playwright> CHROME=<chrome> node tests/promo-anim.test.mjs` (render tests are skipped when playwright/Chrome/ffmpeg are missing).

## Captions + hashtags for social reach (UPDATE_21)
- `.github/scripts/promo-tags.mjs`: code-only captions/hashtags per platform. Instagram ≤5 hashtags (Instagram's own cap since Dec 2025), Facebook ≤3 and no link, YouTube ≤3 + #Shorts. Keyword-first Tamil/English captions, every caption asks to Save + Send/Share (sends = strongest Reels signal), audience alternates office/college daily, hashtag set rotates, dated hooks (TDS due dates, Deepavali 8 Nov 2026, exam season).
- `promo-youtube.mjs` uses it for the YouTube description/tags and writes `social-captions.txt` (Instagram + Facebook captions) into the workflow artifact "short", next to `short.mp4`.
- NOT built: automatic posting to Instagram/Facebook (needs a Meta app + Page token; plan and unverified points are in the research report `Instagram Facebook reach tactics.md`). Tag performance for Tamil is unproven — review Insights after 3 weeks and edit `CAT_TAGS`/`TOOL_TAGS`/`COMMUNITY`.
- Test: `node tests/promo-tags.test.mjs`.

## Audience hubs: government employees and students (UPDATE_22)
- Pages `for-government-employees.html`, `for-students.html` are GENERATED by `generate-tool-pages.mjs` from `audience-hubs.mjs` (task-first sections, ⭐ favourites in localStorage, .ics calendar reminders, "rules checked on" and "not built yet, on purpose" sections, FAQ). Linked from the home footer and from every static page footer (`pages-style.mjs`). The generator aborts if a hub lists an unknown tool id.
- New tools (in `category-extra.js`, logic in `hub-core.js` = `window.HubCore`, lib `hubcore`): `daarrears` (DA / DR arrears, month by month, optional increment month, CSV) and `attendcalc` (attendance %, classes to attend in a row / can miss, target default 75). Tests: `node tests/hub-core.test.mjs` (also covers the .ics builder).
- DA/DR: the calculator never assumes a rate. One editable preset "58% → 60% (1 Jan 2026)": verified for TN pensioners (G.O.Ms.No.98 Finance (Pension) 14 May 2026, date on the copy uncertain); for serving employees only reported by the news. Not built because unconfirmed (16 Oct 2026): July 2026 DA, TAPS pension estimate, pay matrix / HRA tables (G.O.Ms.No.303, 305 need extracting from the G.O.), surrender leave, portal upload-size rules, exam dates. Fetch those from the official G.O.s / notifications first.
- Gratuity in `pfcalc` follows the Payment of Gratuity Act, NOT the TN government pension rules — so it is deliberately not on the government hub.
- Student hub privacy: no accounts, cookies or analytics on these pages (DPDP Act: under-18 = child; children's-data provisions expected to apply about May 2027 — not legal advice).
- Research behind this: `reports/Tamil Nadu employees students daily needs.md` (official sites could not be opened from the sandbox; many figures are secondary-sourced and marked so).

## UPDATE_23 — hub split, immediate downloads, drop-box and login UI (2026-10-16)
- Audience hubs are now a short landing page (hero, most-used, topic tiles, reminder, FAQ) plus one sub-page per topic: `/for-government-employees/<topic>`, `/for-students/<topic>`, and `/about` (rules checked + not-built list). Generated by `generate-tool-pages.mjs` via `audienceHtml(..., page)` and `hubSections()`. Favourites (⭐) work across pages (hidden `#allc` card store).
- `downloadBlob` is a single direct anchor download (no Save-As picker, no share sheet) + toast.
- Drop box (`.drop`) and login modal (`.am-*` classes) redesigned; Tamil-first labels; same logic/IDs.
- sw.js CACHE_NAME v66; category `?v=20261016b`.

## UPDATE_24 — simpler home, matrimony separated (2026-10-16)
- Home ("all" view): categories first → three audience cards (government employees, students, Kalvi Kalanjiyam) → 6 quick tasks → file picker → recent. "New tools" strip removed.
- ONE small Matrimony link row sits under the audience cards on home (owner asked for a single link); no card in tools lists; `/matrimony/` keeps its own shell/branding (hash-routed app). Sitemap entries for it kept. Subdomain move still pending (owner will decide).
- sw.js CACHE_NAME v67.

## UPDATE_25 — hubs: one page, tools shown directly (2026-10-16)
- Owner found page-by-page navigation confusing: `/for-government-employees` and `/for-students` now show ALL their tools on one page, grouped, with a sticky chip bar (அனைத்தும் + one chip per topic) that filters client-side; `#topic` hash deep-links. Sub-pages remain generated for SEO but are no longer linked from the landing. sw.js v68.

## UPDATE_26 — Search Console "Page with redirect" fix (2026-10-16)
- Cause: sitemap listed `/x.html` URLs, but Cloudflare Pages 308-redirects `.html` → `/x` and canonicals are clean. Sitemap now lists clean URLs only; hub canonical/og:url clean; clean canonicals added to hand-written pages (contact, privacy, refund, terms, tn-*, health-check, games). New `404.html` (noindex) so junk URLs like /api/*.html and /tools/terms.html return a real 404 instead of the SPA shell ("Alternate page with proper canonical"). `/?tool=<id>` deep links canonicalise to `/` by design.
- After deploy: Search Console → Sitemaps → resubmit; Pages → "Validate fix" on both reports.
- Search Console triage (16 Oct): "Blocked by robots.txt" for /api/ai/text and /api/pricing is intentional (legacy API paths, Disallow: /api/). `/tools/little-star-education-arcade` (old tool, no page) now 301 → /education-tools. "Crawled/Discovered – currently not indexed" (146/135) is Google's quality/crawl-budget queue for a new domain, not a code error; fixed by clean sitemap + time + richer tool-page text.

## UPDATE_28 — richer tool pages for indexing (2026-10-16)
- `seo-content.mjs` SEO_EXTRA now has 61 hand-written entries (26 before + 35 new: delete/reorder/extract/rotate/watermark/page-numbers/protect/unlock/editor/OCR/pdf→img/grayscale/redact/txt→pdf/excel→pdf, passport photo, exam photo, compress-to-KB, convert/crop image, colour picker, receipts, quotepo, resume, salary slip, leave letter, percentage, amount-in-words, GST calc, Tamil typing/font converter, read aloud, QR scan, study timer, SIP calc). Each page gets a unique title/description/intro/steps/uses/FAQ. Claims were kept to what the tool does (browser-only where code confirms). Goal: reduce "Crawled – currently not indexed" in Search Console. Review after 1–2 weeks; extend to remaining ~100 tools only if these index.

## UPDATE_32 — Trend "brain" + Facebook/Instagram Reels auto-post
- `.github/scripts/promo-brain.mjs`: daily tool choice = (3·Google-Trends-India match + 2·Indian calendar + 1·evergreen) × freshness (no repeat inside 7 days) × category variety × paid-factor 0.4. Free, no AI. Tests: `node tests/promo-brain.test.mjs`.
- `.github/scripts/promo-meta.mjs`: Facebook Page Reel (video_reels start→rupload→finish) and Instagram Reel (resumable container→rupload→poll→media_publish), Graph API v25.0. Skipped until secrets exist.
- `promo-youtube.mjs`: uses the brain (unless TOOL is forced), adds "🔥 இப்போ trending: …" to captions only when a trend really matched, posts YouTube → Facebook → Instagram independently; video audio is now 48 kHz AAC, GOP 2 s (Meta spec).
- **Meta setup (one time, user):** (1) Instagram must be Professional (Business/Creator) and linked to the Facebook Page. (2) developers.facebook.com → create App (Business type) → add "Facebook Login for Business"; permissions pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish. (3) Graph API Explorer → get a user token → exchange for long-lived → GET /me/accounts gives the **Page access token** (does not expire when made from a long-lived user token) and the Page id; GET /{page-id}?fields=instagram_business_account gives the IG user id. (4) GitHub secrets: META_TOKEN (Page token), FB_PAGE_ID, IG_USER_ID. Admins/testers of the app can publish to their own Page without App Review; if Meta asks for review it is only needed for other people's accounts. Limit: Facebook 30 API Reels per 24 h.

## UPDATE_33 — Facebook/Instagram creds from the admin page (no GitHub secrets needed)
`promo-youtube.mjs` now reads `fb_page_token`, `fb_page_id`, `ig_user_id` from D1 `promo_settings` (saved by **Connect Facebook** on the admin page, `cloudflare/src/social.js`) when the META_* secrets are not set. Needs Worker secrets FB_APP_ID + FB_APP_SECRET and, in the Meta app, the valid OAuth redirect URI `https://pdftoolsindia.com/cfapi/promo/oauth/facebook`.

## "What's new" Shorts + names on every platform (Oct 2026)
- Why: owner wants every new discovery/feature announced to the public — logo first, then the news, then our info — all free.
- Data: `.github/promo-news.json` (one entry per feature; validated by `validateNews`). Logic: `.github/scripts/promo-news.mjs` (`pendingNews`: oldest due & unposted entry; posted once as tool_id `news:<id>`; at most one per 24 h; otherwise the normal tool-of-the-day). Scene: `.github/scripts/anim/news.js` (logo card, NEW badge, title, 3 steps, info card with site, support e-mail, YouTube / Instagram / Facebook names). Workflow input `news` forces an id. CLAUDE.md carries the standing rule to add an entry with each new feature.
- Captions: every Instagram / Facebook / YouTube caption (tool-of-the-day and news) now ends with the follow list (`FOLLOW` in promo-tags.mjs). Facebook captions still have no external link.
- Verified end to end with a mocked database: `DRY_RUN` run made a 16.8 s h264+aac `short.mp4` for `dsc-tick`. Real Gemini voice and the three uploads are only provable from the live Actions log.
- NOT built yet (waiting for the owner's photo): "owner explains the new update" talking video. Zero-cost options are limited — a still photo with a moving mouth needs a lip-sync model (heavy on free CI); the safe plan is the photo in a framed circle with a subtle speaking pulse + the Gemini voice, or the owner records the voice/screen himself and the pipeline adds logo + info card.
- Live log check (Oct 2026, D1 `promo_posts`): YouTube, Facebook, Instagram all `sent` on 16 Oct; one Instagram `Application request limit reached` after many manual test runs (the daily single post is far below the limit); "uploaded as private" rows came from privacy=private test runs. Scheduled runs are delayed by GitHub (03:50 UTC cron started 08:31 UTC on 16 Oct) — normal.


## UPDATE_35 — Tamil Poster Maker (no AI, Phase 1)
- `poster-maker.html` + `poster-core.js` (Fabric 7.4.0 in `libs/`, fonts in `fonts/poster/`). Tool id `postermaker` (cat image, standalone `/poster-maker`, opens via mountEmbeddedTool). 13 code-drawn templates, sizes incl. A4 + flex, brand footer (name/phone/address/UPI QR from `libs/qrcode-generator.js`, saved only in localStorage), PNG/JPG/raster-PDF export, .json save/open, undo/redo.
- Rules: every text line is one Textbox run (no letter-spacing/curved text) so Tamil stays correct; text edited via the side textarea (`editable:false` on canvas); fabric 7 defaults originX/Y to center so `boot()` sets them to left/top.
- Festival dates in `FESTS` (poster-core.js) are provisional — update yearly (Deepavali 2026-11-08, 2027-10-29).
- NOT built yet: Reel maker (Mediabunny/WebCodecs), on-device AI (background removal, TTS) — owner decision needed.

## UPDATE_36 — growth/income groundwork (from the promotion & income plan)
- Every download toast (`showDownloadToast`, used by all tools) now has a green "WhatsApp-ல் share" button (`whatsappShareUrl()`, wa.me link the user taps themselves; UTM utm_source=whatsapp&utm_medium=share&utm_campaign=download). Poster maker has the same in its toast.
- YouTube Short descriptions link `?utm_source=youtube&utm_medium=short&utm_campaign=<tool id>`.
- Still owner-side: Search Console + Bing sitemap, CA call (GST/LUT/ITR), Razorpay KYC, affiliate programs (check they are live), AdSense only after unique text per tool page (owner decided to wait 3-4 months).

## Tamil text on tool pages (Oct 2026)
- `seo-content-ta.mjs` (`SEO_TA`) holds a hand-written Tamil intro + 3 tips + Tamil FAQs for the 20 most searched tools (merge, split, compress, img2pdf, imgcompress, imgcompresskb, examphoto, imgpassport, pdf2word, word2pdf, sign, rotate, remove, pdfprotect, pdfunlock, watermark, emicalc, incometaxcalc, receipts, salaryslip). `generate-tool-pages.mjs` renders it as "தமிழில் சுருக்கமாக" under the steps and adds the Tamil FAQs to the FAQ list + FAQPage schema. Rule: only restate what the English entry in `seo-content.mjs` already says — no new claims. Add more tools by adding keys, then `node generate-tool-pages.mjs`.
- Why: unique per-page text (needed before an AdSense application in ~3-4 months, and against "templated pages" spam signals). ~144 pages still use only the generic text.
- Blog pages (18) now have the Instagram / YouTube / Facebook / support e-mail footer (`footer.site .soc` in blog/blog.css).

## UPDATE_39 — Photo Resizer (exam-form KB / px)
- `photo-resizer.template.html` + `node generate-photo-pages.mjs` -> photo-resizer, photo-20kb/50kb/100kb/200kb, signature-resize (.html). Tool id `photoresize` (cat image, standalone). Binary search on JPEG quality, centre-crop when both width and height given, optional min KB. Exam-specific official sizes are NOT hard-coded (boards change them) — user types the size from the form.
- Edit the template, rerun the generator, commit the generated pages. SEO titles <= 60 chars, descriptions <= 160 (generator throws otherwise).

## UPDATE_40 — income groundwork from the "90 day income plan" research (reports/pdftoolsindia 90 day income plan.md)
- Funnel counters: Worker `POST /cfapi/api/event {name}` (allow-list in api.js FUNNEL_EVENTS) -> D1 `funnel_events(day,name,n)` (migration 0005, applied by the deploy workflow). Events: tool_download, whatsapp_share, paywall_seen, checkout_open, paid, photo_resize, poster_export. Admin read: GET /cfapi/promo/funnel (matrimony admins) or query D1 directly. No IP / user id stored. `trackEvent()` in index.source.html.
- IndexNow: `.github/workflows/indexnow.yml` + `.github/scripts/indexnow.mjs`; key file `<32 hex>.txt` in repo root must stay. Only Bing/Yandex/Naver/Seznam — Google is not part of IndexNow.
- `/tnpsc-photo-signature` (generate-photo-pages.mjs): TNPSC photo 20-50 KB, signature 10-20 KB (200 dpi) from Prepp (3rd party, Feb 2026) — px derived from cm; page tells users to confirm on tnpsc.gov.in. Re-verify when TNPSC publishes new instructions.
- Existing Worker already supports Telegram channel posting (TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL secrets) — owner only has to create the bot/channel and add the two secrets.
