# pdf-tools-api — Cloudflare Worker (Supabase-க்குப் பதிலாக)

Login, credits database, payment records, திருமண அமைப்பகம் (matrimony) data — எல்லாம் இப்போது **Cloudflare**-ல்:

| பகுதி | Cloudflare சேவை |
|---|---|
| API (login, matrimony functions) | Worker `pdf-tools-api` → `https://pdftoolsindia.com/cfapi/*` |
| Database | D1 `pdftools-db` (SQLite) — schema: `migrations/` |
| Matrimony photos | KV namespace `pdftools-mat-photos` (private; signed URLs, 1 மணி நேரம்) |

Frontend (Cloudflare Pages) மாற்றமில்லை. Cloud Run (`server.js`) AI, ffmpeg, Razorpay-ஐத் தொடர்ந்து கையாளும்; database-ஐ Worker-ன் internal endpoint வழியாக அணுகும் (`../cf-db.js`).

```
browser ── cf-auth.js ──► /cfapi/auth/v1/*        (login, Google, sessions)
browser ── m-backend.js ─► /cfapi/mat/rpc/<name>  (matrimony)
browser ── Authorization: Bearer <JWT> ──► Cloud Run /api/*  (JWT சரிபார்ப்பு offline-ல், AUTH_JWT_SECRET)
Cloud Run ── X-Internal-Key ──► /cfapi/internal/sql   (credits, payments — ஒரு batch = ஒரு transaction)
```

## ஒருமுறை அமைப்பு (One-time setup)

GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | எங்கிருந்து |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | dash.cloudflare.com → pdftoolsindia.com இருக்கும் account → வலது பக்கம் "Account ID" |
| `CLOUDFLARE_API_TOKEN` | My Profile → API Tokens → Create Token → **"Edit Cloudflare Workers"** template. Permissions-ல் **D1: Edit** சேர்க்கவும். Zone resources: `pdftoolsindia.com` |
| `AUTH_JWT_SECRET` | Cloud Shell-ல் `openssl rand -hex 32` |
| `CF_INTERNAL_KEY` | இன்னொரு முறை `openssl rand -hex 32` (வேறு மதிப்பு) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in — கீழே பார்க்கவும் |
| `MAT_ADMIN_EMAILS` (விருப்பம்) | திருமண அமைப்பக admin email(கள்), comma பிரித்து. அந்த email-ல் login செய்தவுடன் admin ஆகிவிடுவார் |
| `RESEND_API_KEY`, `EMAIL_FROM` (விருப்பம்) | Email confirmation / "Forgot password" mail-க்கு — resend.com (இலவசம்), domain `pdftoolsindia.com` verify. இல்லாவிட்டால்: பதிவு உடனே confirm ஆகும், password reset mail அனுப்பப்படாது |

பிறகு GitHub → **Actions → "Deploy Cloudflare API" → Run workflow** (அல்லது `cloudflare/`-ல் எதையாவது push செய்யுங்கள்). முதல் run D1 database-ஐயும் KV-ஐயும் தானாக உருவாக்கும். Cloud Run deploy (`deploy.yml`) அதே `AUTH_JWT_SECRET`, `CF_INTERNAL_KEY`-ஐ Cloud Run env-க்கு அனுப்பும் — ஆகவே secrets சேர்த்த பின் Cloud Run-ஐயும் ஒருமுறை re-run செய்யுங்கள் (Actions → "Deploy to Cloud Run" → Re-run).

சரிபார்க்க: `https://pdftoolsindia.com/cfapi/health` → `{"ok":true,"db":true,...}`

### Google sign-in
Google Cloud Console → APIs & Services → **Credentials → Create credentials → OAuth client ID** → *Web application*:
- Authorized JavaScript origins: `https://pdftoolsindia.com`
- Authorized redirect URIs: `https://pdftoolsindia.com/cfapi/auth/v1/callback`

(முதல் முறை என்றால் OAuth consent screen-ஐ "External" ஆக அமைக்கவும்.) Client ID / Secret-ஐ மேலே உள்ள GitHub secrets-ல் சேர்க்கவும்.

### Razorpay
மாற்றம் இல்லை — webhook URL இன்னும் Cloud Run (`/api/payment/webhook`).

## Database கட்டளைகள் (Cloudflare dashboard → D1 → pdftools-db → Console)
```sql
-- promo code
insert into redeem_codes (code, credits, max_uses) values ('WELCOME10', 10, 100);
-- matrimony chat fee ON (இயல்பு: OFF / இலவசம்)
update mat_settings set value = 'on' where key = 'chat_fee';
-- ஒருவரை matrimony admin ஆக்க (MAT_ADMIN_EMAILS-க்கு மாற்று)
insert into mat_admins (user_id) select id from users where email = 'you@example.com';
```
Schema மாற்றம் → `migrations/000N_name.sql` என்று புதிய file சேர்க்கவும் (பழையதை மாற்ற வேண்டாம்); workflow அதைத் தானாக apply செய்யும்.

## Local development / tests
```bash
cd cloudflare
printf 'AUTH_JWT_SECRET=test-secret-123\nINTERNAL_KEY=int-key-456\n' > .dev.vars
npx wrangler d1 migrations apply pdftools-db --local
npx wrangler dev --port 8787
# another terminal:
node --test test/*.test.mjs          # login, sessions, matrimony (all functions), photos, internal SQL, CORS
```
Matrimony payment routes (Cloud Run side) are tested without the Worker: `node matrimony/tests/api.test.mjs` (real SQLite with these migrations).
