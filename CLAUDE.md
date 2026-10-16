# pdftoolsindia.com — rules for anyone (human or AI) changing this repo

Site: static files on Cloudflare Pages (auto-deploys from `main`). Backend: ONE Cloudflare Worker on the free plan.
Supabase and Google Cloud Run were removed in Oct 2026 — do not bring them back.

## Backend
- Worker source: `cloudflare/` (README in Tamil: `cloudflare/README.md`). Served at `https://pdftoolsindia.com/cfapi/*`.
- Database: Cloudflare D1 `pdftools-db`. Schema changes = a NEW file `cloudflare/migrations/000N_name.sql`; never edit an applied migration.
- Deploy: `.github/workflows/deploy-cloudflare.yml` (on push to `cloudflare/**`, or Actions → "Deploy Cloudflare API" → Run workflow). All keys are GitHub repository secrets.
- Health: `https://pdftoolsindia.com/cfapi/health`.
- Free plan = **10 ms CPU per request**: no password hashing, no heavy work in the Worker (big AI uploads are streamed to the Gemini Files API). Keep heavy processing in the browser.
- Tests: `cd cloudflare && node --test --test-concurrency=1 test/*.test.mjs` against `wrangler dev` (see README).

## Frontend
- `APP_CONFIG.BACKEND_URL = 'https://pdftoolsindia.com/cfapi'`; endpoints keep their paths (`/api/me`, `/api/ai/ask`, `/api/ai/text`, `/api/ai/image`, `/api/credits/use`, `/api/redeem`, `/api/pricing`, `/api/payment/*`, `/api/astrology/calculate`, `/api/claude/analyze`, `/api/matrimony/*`). Never use `*.run.app` or `*.supabase.co` URLs.
- Login has **no passwords**: Google, or a 6-digit e-mail code. `/cf-auth.js` replaces supabase-js and provides `sb.auth.getSession / onAuthStateChange / signInWithOtp / verifyOtp / signInWithOAuth / signOut`. `signUp`, `signInWithPassword`, `resetPasswordForEmail`, `updateUser` do not exist.
- Requests to the backend send `Authorization: Bearer <authState.session.access_token>`.
- Server-side video "Fast Server Mode" is retired: `APP_CONFIG.FAST_SERVER = false`; video tools run in the browser (ffmpeg.wasm).
- `index.source.html` is the readable source; `index.html` is the minified file that is actually served. Apply every change to **both**, then bump `CACHE_NAME` in `sw.js`.
- Matrimony: `matrimony/m-config.js` (`API_URL`), `matrimony/m-backend.js` talks to the Worker; demo mode (`?demo=1`) uses `matrimony/supabase/schema.sql` in the browser only.

## Uploading files from a zip
Only copy files that were actually changed. Never overwrite these with older copies:
`index.html`, `index.source.html`, `cf-auth.js`, `sw.js`, `matrimony/m-backend.js`, `matrimony/m-config.js`, `matrimony/m-core.js`,
`matrimony/m-v-public.js`, `astrology-plus.html`, `Resume_build.html`, `health-check.html`, anything under `cloudflare/` or `.github/`.
If an incoming copy of one of these contains `supabase.co`, `@supabase/supabase-js`, `run.app`, `signInWithPassword` or `resetPasswordForEmail`, it is an old version — merge only the real change by hand instead. (The names `window.supabase` / `SUPABASE_URL` still exist on purpose: `cf-auth.js` keeps that API name.)

## Handoff / current state
Start every new session by reading `HANDOFF.md` (architecture of the document tools in `category-docs.js`, build steps, tests, pitfalls, and what is still unverified). Document tools are lazy-loaded: after editing `category-docs.js`, bump the `?v=` string in `loadCategoryScript`, run `python3 remin.py`, bump `sw.js`, and run `node tests/billing-calc.test.mjs`.

## Tell the public about every new feature (standing owner request)
Whenever you ship something NEW that visitors can use (a tool, a page, a new capability), add one entry to `.github/promo-news.json` in the same commit (id, first date, icon, short Tamil title/line, exactly 3 steps, url — rules at the top of that file; `node tests/promo-news.test.mjs` validates it). The daily Short job then posts it once as a "what's new" Short (our logo, the news, 3 steps, then site + support@pdftoolsindia.com + YouTube / Instagram / Facebook names) on YouTube, Facebook and Instagram, at most one news Short per 24 h. Keep it true and short; never announce something unverified or unfinished. Everything must stay at zero cost.

