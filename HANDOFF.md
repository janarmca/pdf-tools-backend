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
