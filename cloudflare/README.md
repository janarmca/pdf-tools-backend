# pdf-tools-api — முழு backend, Cloudflare இலவச plan-ல் (₹0)

Supabase, Google Cloud Run இரண்டும் நீக்கப்பட்டன. இப்போது எல்லாமே **ஒரே Cloudflare Worker** — `https://pdftoolsindia.com/cfapi/*`:

| பகுதி | இலவச சேவை | இலவச வரம்பு |
|---|---|---|
| Website | Cloudflare Pages (மாற்றமில்லை) | வரம்பில்லை |
| API (login, AI, payments, credits, matrimony) | Cloudflare Workers Free | 1 லட்சம் requests/நாள், 10 ms CPU/request |
| Database | Cloudflare D1 Free (`pdftools-db`, SQLite) | 5 GB, 50 லட்சம் reads/நாள் |
| Matrimony படங்கள் | Cloudflare KV Free (`pdftools-mat-photos`) | 1 GB, 1,000 uploads/நாள் |
| Text→Image AI | Workers AI (FLUX.1-schnell) | 10,000 Neurons/நாள் |
| Login | **Google** அல்லது **email-ல் 6 இலக்க code** (Brevo 300/நாள் அல்லது Resend 100/நாள்) — கடவுச்சொல் இல்லை | — |
| Document/photo AI | Gemini (AI Studio இலவச key), NVIDIA Build (இலவசம்) | அவர்களின் இலவச வரம்பு |
| Payments | Razorpay | மாதக் கட்டணம் இல்லை; ஒவ்வொரு payment-லும் Razorpay ~2% |
| Video tools | உலாவியிலேயே ffmpeg.wasm (open source) | வரம்பில்லை |

10 ms CPU வரம்புக்குள் இருக்க: கடவுச்சொல் hashing இல்லை (OTP), பெரிய படங்கள் base64 ஆக்கப்படாமல் Gemini Files API-க்கு நேரடியாக stream செய்யப்படும் (பதில் வந்ததும் அழிக்கப்படும்), video-வை server-ல் process செய்வதில்லை ("Fast Server Mode" நிறுத்தப்பட்டது).

```
browser ── cf-auth.js ──► /cfapi/auth/v1/otp, /verify, /authorize (Google), /token (refresh)
browser ── Bearer JWT ──► /cfapi/api/*      (me, credits, redeem, ai/ask|text|image, payment/*, astrology, matrimony payments)
browser ── m-backend.js ► /cfapi/mat/rpc/*  (matrimony functions), /cfapi/mat/photo*
Razorpay ── webhook ────► /cfapi/api/payment/webhook
```

## ஒருமுறை அமைப்பு (எல்லாம் இலவசம், card தேவையில்லை)

GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**. ஒவ்வொரு secret-ஐச் சேர்த்த பின் அந்த வசதி வேலை செய்யும்.

| Secret | எங்கிருந்து | கட்டாயமா |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | dash.cloudflare.com → pdftoolsindia.com இருக்கும் account → வலது பக்கம் "Account ID" | ✅ |
| `CLOUDFLARE_API_TOKEN` | My Profile → API Tokens → Create Token → **"Edit Cloudflare Workers"** template → *Add more*: **D1 → Edit**, **Workers AI → Read** → Zone: `pdftoolsindia.com` | ✅ |
| `AUTH_JWT_SECRET` | எந்த terminal-லும் `openssl rand -hex 32` (அல்லது 64 எழுத்து random) | ✅ |
| `BREVO_API_KEY` | brevo.com இலவச account → **SMTP & API → API keys**. **Senders** பகுதியில் `no-reply@pdftoolsindia.com` (அல்லது உங்கள் email) சேர்த்து verify செய்யவும் | Email login-க்கு |
| `EMAIL_FROM` | எ.கா. `PDF Tools India <no-reply@pdftoolsindia.com>` — Brevo-வில் verify செய்த அதே முகவரி | Email login-க்கு |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | கீழே "Google sign-in" | Google login-க்கு |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → Account & Settings → API Keys | Payments-க்கு |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay → Webhooks → Add: URL `https://pdftoolsindia.com/cfapi/api/payment/webhook`, event `payment.captured`, ஒரு secret கொடுங்கள் → அதையே இங்கே | விருப்பம் (backup) |
| `GEMINI_API_KEY` | aistudio.google.com → Get API key (இலவசம்) | Document/photo AI |
| `NVIDIA_API_KEY` | build.nvidia.com → Get API Key (இலவசம்) | Text AI |
| `ASTROLOGER_API_KEY` | RapidAPI → Astrologer API (இலவச tier) | Astrology+ |
| `MAT_ADMIN_EMAILS` | திருமண அமைப்பக admin email(கள்), comma பிரித்து | விருப்பம் |
| `TELEGRAM_BOT_TOKEN` | Telegram → @BotFather → `/newbot` தரும் token. Bot-ஐ `@pdftoolsindia` channel-ல் Admin ஆக்கவும் (channel பெயர் `wrangler.toml`-ல் உள்ளது) | தினசரி promotion post-க்கு |
| `SITE_ADMIN_EMAILS` (wrangler.toml `[vars]`, secret அல்ல) | இயல்பு `pdftoolsindia@gmail.com` — இந்த மின்னஞ்சல்களுக்கு credits வரம்பு இல்லை + `pdftoolsindia.com/admin` பயன்பாட்டுப் புள்ளிவிவரம் | Admin |
| `FB_APP_ID`, `FB_APP_SECRET` | developers.facebook.com → My Apps → Create app (Business) → Settings → Basic. *Facebook Login for Business* → Valid OAuth Redirect URI: `https://pdftoolsindia.com/cfapi/promo/oauth/facebook` | Facebook Page + Instagram post-க்கு |
| `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET` | developers.pinterest.com → My apps → Connect app. Redirect URI: `https://pdftoolsindia.com/cfapi/promo/oauth/pinterest` | Pinterest pin-க்கு |
| `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` | developer.x.com → Project → App → User authentication: **Read and write** → Keys and tokens → API Key & Secret + Access Token & Secret | X (Twitter) post-க்கு |

(Brevo-க்குப் பதில் Resend பயன்படுத்தினால்: `RESEND_API_KEY` + Cloudflare DNS-ல் domain verify.)

பிறகு: GitHub → **Actions → "Deploy Cloudflare API" → Run workflow**. முதல் run D1 database-ஐயும் KV-ஐயும் தானாக உருவாக்கும். ஒரு secret-ஐச் சேர்த்த/மாற்றிய பின் இதையே மீண்டும் Run செய்யுங்கள்.

சரிபார்க்க: `https://pdftoolsindia.com/cfapi/health` → `"ok":true` மற்றும் எந்த வசதிகள் இயங்குகின்றன (`email`, `google`, `ai`, `razorpay`, `astrology`).

### Google sign-in (billing தேவையில்லை)
console.cloud.google.com → APIs & Services → **OAuth consent screen** (External, app name, support email) → **Credentials → Create credentials → OAuth client ID** → *Web application*:
- Authorized JavaScript origins: `https://pdftoolsindia.com`
- Authorized redirect URIs: `https://pdftoolsindia.com/cfapi/auth/v1/callback`

### பழைய Google Cloud Run-ஐ நிறுத்த (எல்லாம் வேலை செய்வதை உறுதிசெய்த பின்)
Cloud Run → `all-in-one-tools` → Delete. Artifact Registry → பழைய images → Delete. Billing → project-ஐ billing-லிருந்து unlink. அப்போது Google-ல் எந்த செலவும் வர வாய்ப்பில்லை.

## தினசரி promotion (src/promo.js)
தினமும் காலை 9:05 (IST) ஒரு tool-ஐத் தேர்ந்தெடுத்து, AI (Gemini) தமிழ் + English post எழுதி, படம் + link-உடன் Telegram channel-ல் போடும். எல்லா tools-ம் ஒருமுறை வந்த பிறகே மீண்டும் தொடங்கும். AI வேலை செய்யாவிட்டாலும் ஒரு எளிய post போகும்.
- நிறுத்த: login செய்த matrimony admin → `POST /cfapi/promo/enabled {"on":false}` (அல்லது D1 Console: `update promo_settings set value='off' where key='enabled';`)
- இப்போதே ஒரு post: `POST /cfapi/promo/run` (`{"tool":"biodata"}` கொடுத்தால் அந்த tool)
- நிலை: `GET /cfapi/promo/status` (கடைசி 20 posts)
- புதிய tools சேர்த்தால்: repo root-ல் `node generate-promo-catalog.mjs`
- மற்ற தளங்கள்: matrimony → Admin → **விளம்பரம் / Promotion** → Facebook / Pinterest / YouTube **Connect** (app keys சேர்த்த பின்). Instagram = Facebook Page-உடன் இணைந்த Professional account. X = மேலே உள்ள 4 secrets.
- YouTube Shorts: `.github/workflows/promo-youtube.yml` தினமும் 9:20-க்கு அன்றைய tool-க்கு 10 வினாடி video உருவாக்கி upload செய்யும் (Google OAuth client-ல் redirect URI `https://pdftoolsindia.com/cfapi/promo/oauth/youtube` சேர்க்கவும்; YouTube Data API v3-ஐ enable செய்யவும்). API audit ஆகும் வரை YouTube அவற்றை *private* ஆக வைக்கலாம்.

## Database கட்டளைகள் (Cloudflare dashboard → D1 → pdftools-db → Console)
```sql
insert into redeem_codes (code, credits, max_uses) values ('WELCOME10', 10, 100);   -- promo code
update mat_settings set value = 'on' where key = 'chat_fee';                         -- matrimony chat fee ON
insert into mat_admins (user_id) select id from users where email = 'you@example.com'; -- matrimony admin
```
Schema மாற்றம் → `migrations/000N_name.sql` என்று புதிய file (பழையதை மாற்ற வேண்டாம்); workflow தானாக apply செய்யும்.

## Local development / tests
```bash
cd cloudflare
cat > .dev.vars <<'V'
AUTH_JWT_SECRET=test-secret-123
INTERNAL_KEY=int-key-456
OTP_DEV_ECHO=1
RAZORPAY_KEY_ID=rzp_test_key
RAZORPAY_KEY_SECRET=rzp-secret
RAZORPAY_WEBHOOK_SECRET=whsec
GEMINI_API_KEY=g-key
NVIDIA_API_KEY=n-key
ASTROLOGER_API_KEY=a-key
GEMINI_API_BASE=http://127.0.0.1:8790
NVIDIA_API_BASE=http://127.0.0.1:8790
RAZORPAY_API_BASE=http://127.0.0.1:8790
ASTROLOGER_API_BASE=http://127.0.0.1:8790
TELEGRAM_API_BASE=http://127.0.0.1:8790
TELEGRAM_BOT_TOKEN=TG-TOKEN
TELEGRAM_CHANNEL=@test
V
npx wrangler d1 migrations apply pdftools-db --local
npx wrangler dev --port 8787 --test-scheduled   # (remove the [ai] block from a copy of wrangler.toml for fully offline runs)
node --test --test-concurrency=1 test/*.test.mjs   # another terminal; the AI/payment providers are mocked
```
`OTP_DEV_ECHO=1` returns the login code in the response instead of e-mailing it, and `INTERNAL_KEY` enables `/cfapi/internal/sql` for test setup — **never set either in production**.
