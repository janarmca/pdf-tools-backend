# ஸ்ரீ சௌடேஸ்வரி திருமண அமைப்பகம் — அமைப்பு வழிகாட்டி (Setup guide)

தளம்: `https://pdftoolsindia.com/matrimony/` · முதன்மை சமூகம்: கன்னட தேவாங்கர் · அனைத்து சமூகத்தினரும் பதிவு செய்யலாம்.

## 0. முதலில் பார்க்க (எந்த அமைப்பும் இல்லாமல்)
`https://pdftoolsindia.com/matrimony/?demo=1` — முழு தளமும் உங்கள் உலாவியிலேயே மாதிரித் தரவுடன் இயங்கும்
(பதிவு → admin → Interest → ₹50 → chat). Admin பார்க்க: `admin@demo.test` / `admin123`. உண்மையான தரவு எதுவும் இல்லை.

## 1. யார் என்ன செய்கிறார்கள்
| இலவசம் | ₹50 (ஒரு ஜோடிக்கு ஒருமுறை) |
|---|---|
| பதிவு, சுயவிவரம், படங்கள், தேடல், சுயவிவரம் பார்த்தல், Interest அனுப்பல்/ஏற்றல், விருப்பப்பட்டியல், தடு/புகார் | **Chat** — Interest ஏற்கப்பட்ட பின், இருவரில் யாராவது ஒருவர் ₹50 செலுத்தினால் இருவருக்கும் திறக்கும் |

* AI எங்கும் பயன்படுத்தப்படவில்லை → AI கட்டணம் இல்லை.
* தொலைபேசி எண் / email: சரிபார்ப்புக்காக **admin-க்கு மட்டும்** தெரியும்; உறுப்பினர்களுக்கு எங்கும் வராது.
* Chat-ல் எண் / email / WhatsApp / Instagram / link எந்த வடிவில் அனுப்பினாலும் **server-ல்** தடுக்கப்படும் (பார்க்க §6).

## 2. Supabase (database) — ஒருமுறை, மொபைலிலேயே செய்யலாம்
1. supabase.com → உங்கள் project → **SQL Editor** → **New query**.
2. `matrimony/supabase/schema.sql` கோப்பு முழுவதையும் copy செய்து ஒட்டி **Run** அழுத்துங்கள். "Success" வர வேண்டும். (மீண்டும் இயக்கினாலும் பிரச்சனை இல்லை.)
   * இது `mat_` என்று தொடங்கும் அட்டவணைகளை மட்டும் உருவாக்கும்; உங்கள் மற்ற tools-ன் தரவைத் தொடாது.
   * தனிப்பட்ட படங்களுக்கான `mat-photos` (private) bucket-ம் தானாக உருவாகும்.
3. **Authentication → URL Configuration → Redirect URLs** → `https://pdftoolsindia.com/matrimony/` சேர்க்கவும்.
4. **Authentication → Providers → Email** → *Confirm email* **ON** (போலிக் கணக்குகளைக் குறைக்கும்).
5. தளத்தில் (`/matrimony/`) உங்கள் email-ல் ஒருமுறை பதிவு செய்யுங்கள். பிறகு SQL Editor-ல் இதை இயக்குங்கள் (உங்கள் email-ஐ மாற்றி) — நீங்கள் admin ஆகிவிடுவீர்கள்:
   ```sql
   insert into mat_admins (user_id) select id from auth.users where email = 'உங்கள்@email.com' on conflict do nothing;
   ```
   பிறகு "என் கணக்கு" → "🛡 நிர்வாகப் பக்கம்".

## 3. Cloud Run server (₹50 payment) — ஒருமுறை
புதிய கோப்பு: **`matrimony-api.js`** (repo root, `server.js`-க்கு அருகில்).
`server.js`-ல் 3 சிறிய மாற்றங்கள் — `matrimony/server.js.patch` (`git apply matrimony/server.js.patch`) அல்லது கையால்:
1. மேலே imports-ல்: `import { registerMatrimonyRoutes, matrimonyOnCaptured } from './matrimony-api.js';`
2. Webhook-ல் `const orderId = payment.order_id;` வரிக்குப் பிறகு: `if (await matrimonyOnCaptured(supabase, payment)) return res.json({ ok: true });`
3. 404 catch-all-க்கு முன்: `registerMatrimonyRoutes(app, { supabase, razorpay, requireAuth, limiter: creditLimiter });`

புதிய environment variable தேவையில்லை (ஏற்கனவே உள்ள `RAZORPAY_KEY_ID/SECRET`, `SUPABASE_*` போதும்). கட்டணத்தை மாற்ற: `MATRIMONY_FEE_PAISE` (இயல்பு `5000` = ₹50) **மற்றும்** `matrimony/m-config.js`-ல் `FEE_RS`.
பிறகு வழக்கம்போல் Cloud Run deploy.

## 4. தளக் கோப்புகள் (GitHub-ல் ஏற்ற)
`matrimony/` கோப்புறை முழுவதும் + `matrimony-api.js` + மாற்றப்பட்ட `index.source.html`, `index.html`, `sw.js`, `sitemap.xml`, `generate-tool-pages.mjs`. (முதன்மைப் பக்கத்தில் 💍 banner + footer link சேர்ந்துள்ளது.)

## 5. நேரலைக்கு முன் சரிபார்ப்பு (Go-live checklist)
- [ ] Razorpay **test key**-ல் ஒரு ₹50 payment முயன்று chat திறக்கிறதா பாருங்கள் (இரண்டு test கணக்குகள்).
- [ ] Razorpay கணக்கின் business category இந்த சேவைக்குப் பொருந்துகிறதா என்று உறுதி செய்யுங்கள்.
- [ ] `terms` / `privacy` பக்கங்கள் **வரைவு** — வழக்கறிஞர் பார்வைக்குப் பின் இறுதி செய்யவும் (`m-v-public.js`).
- [ ] உதவி WhatsApp எண் வேண்டுமானால் `m-config.js` → `SUPPORT_WHATSAPP`.
- [ ] முதல் 10–20 சுயவிவரங்களை நீங்களே/குடும்பத்தினர் பதிவு செய்து தளம் "காலியாக" தோன்றாமல் பார்த்துக்கொள்ளுங்கள்.

## 6. Contact-info filter எவ்வாறு வேலை செய்கிறது
ஒரே விதிகள் இரு இடங்களில்: உலாவியில் (`m-filter.js` — தட்டச்சும்போதே எச்சரிக்கை) மற்றும் **database-ல்** (`schema.sql` — தவிர்க்க முடியாத கடைசிக் காவல்; `mat_send_message` + `mat_messages` trigger). SQL பகுதி `m-filter.js`-லிருந்தே தானாக உருவாக்கப்படுகிறது (`node matrimony/tools/build-schema.mjs`).
தடுப்பவை: 8+ இலக்கங்கள் (இடைவெளி/புள்ளி/கோடு/emoji இடையில் இருந்தாலும்), ௯௮௭… / ९८७… / ೯೮೭… / ౯౮౭… / ９８７ / 9️⃣8️⃣ இலக்கங்கள், "nine eight seven…", ஒன்பது-எட்டு-ஏழு…, onbathu/ettu…, नौ-आठ…, "double nine", 98765o3210, இரண்டு-மூன்று செய்திகளாகப் பிரித்த எண், `@`, "(at) / (dot) / at the rate", gmail/yahoo…, ஜிமெயில், www / http / .com / wa.me / t.me, WhatsApp / வாட்ஸ்அப் / Telegram / Insta (எழுத்துப் பிழை, இடைவெளி, leet உட்பட), "phone number", "call me", "உங்கள் நம்பர்", "miss call"…
அனுமதிப்பவை: வயது, உயரம், பிறந்த தேதி (12-04-1995), ஆண்டு வரம்பு (2012-2016), 5–7 இலக்கத் தொகைகள், சாதாரண உரையாடல்.
மீறினால்: செய்தி சேமிக்கப்படாது → எச்சரிக்கை 1/3, 2/3 → 3-வது முறை chat நிறுத்தம். Admin → புகார்கள் தாவலில் முயற்சிகளைப் பார்த்து chat-ஐ மீட்டெடுக்கலாம்.
**வரம்பு:** எந்த filter-ம் 100% அல்ல (எ.கா. படமாக அனுப்புதல்/முற்றிலும் புதிய குறியீடு). அதனால் "புகார்" பொத்தானும் admin கண்காணிப்பும் உள்ளன; chat-ல் படம் அனுப்பும் வசதி வேண்டுமென்றே வழங்கப்படவில்லை.
1.2 கோடி போன்ற 8+ இலக்கத் தொகையை எழுதினால் தடுக்கப்படும் ("1.2 crore" என்று எழுதலாம்).

## 7. தினசரி நிர்வாகம்
நிர்வாகம் → *காத்திருப்பவை*: பெயர், படம், தொலைபேசி/email-ஐப் பார்த்து அங்கீகரி / நிராகரி (காரணம் உறுப்பினருக்குக் காட்டப்படும்). *புகார்கள்*: போலி/தொந்தரவு புகார்கள் + எண் பகிர முயற்சிகள். *புள்ளிவிவரம்*: உறுப்பினர், chat திறப்புகள், வருவாய்.

## 8. பாதுகாப்பு வடிவமைப்பு (சுருக்கம்)
* அட்டவணைகளை உலாவியிலிருந்து நேரடியாகப் படிக்க/எழுத முடியாது (RLS); எல்லாம் சரிபார்க்கும் functions வழியாக மட்டுமே.
* அங்கீகரிக்கப்பட்ட, உள்நுழைந்த உறுப்பினர்கள் மட்டுமே பிறர் சுயவிவரங்களைப் பார்க்கலாம்; பிறந்த தேதி/தொலைபேசி/email வெளியே வராது.
* Payment-ஐ உலாவியால் போலியாகப் பதிவு செய்ய முடியாது: Razorpay signature சரிபார்த்த server மட்டுமே `mat_record_unlock` அழைக்க முடியும் (service role).
* வரம்புகள்: நாளுக்கு 15 Interest, மணிக்கு 120 செய்திகள். திருமண வயது: ஆண் 21, பெண் 18.

## 9. இன்னும் இல்லாதவை (அடுத்த கட்டம்)
Email/WhatsApp அறிவிப்புகள் (புதிய Interest வந்தால்), ஜாதகப் பொருத்தம் (பத்துப் பொருத்தம்), கன்னட மொழி இடைமுகம், அடையாள ஆவணச் சரிபார்ப்பு badge, சந்தா திட்டங்கள்.

## 10. சோதனைகள் (dev)
`node matrimony/tests/filter.test.js` · `node matrimony/tests/sql-parity.test.mjs` (JS = SQL, 1667 வழக்குகள்) · `node matrimony/tests/sql-flow.test.mjs` (71 சோதனைகள், RLS உட்பட) — PGlite (`npm i @electric-sql/pglite`) தேவை. Payment module: repo root-ல் `node matrimony/tests/api.test.mjs`.


## ✨ AI ஜாதகம் → அடிப்படை விவரங்கள் (புதிது)
- பதிவு படிவத்தின் முதல் பக்கத்தில் "ஜாதகம் பதிவேற்று" பொத்தான்: படம்/PDF → AI பெயர், பாலினம், பிறந்த தேதி, நட்சத்திரம், ராசி நிரப்பும். உறுப்பினர் சரிபார்த்துத் திருத்தலாம்.
- **AI = கட்டணம்**: ஒரு முறைக்கு 2 credits (`JATHAGAM_CREDITS` in `matrimony-api.js`), பிற tools-ல் உள்ள அதே credit balance. தோல்வியடைந்தால் credits திரும்பக் கிடைக்கும். ஜாதகக் கோப்பு உடனே நீக்கப்படும், சேமிக்கப்படாது.
- தேவை: Cloud Run-ல் `GEMINI_API_KEY` ஏற்கனவே உள்ளது; `server.js`-ல் patch-ன் கடைசி வரி (`upload: uploadImage, deductCredits, refundCredits`) சேர்க்க வேண்டும். இது இல்லாவிட்டால் AI பொத்தான் "AI error" காட்டும்; மற்ற அனைத்தும் வேலை செய்யும்.
- Demo முறை (`?demo=1`): மாதிரி விவரங்களை நிரப்பும் (உண்மை AI இல்லை).


## 💰 கட்டணக் கொள்கை (UPDATE 6)
- பதிவு, விவரங்கள், குடும்ப விவரம், படங்கள், Interest, Chat — **இலவசம்**.
- **AI மட்டும் கட்டணம்**: ஜாதகத்தை AI படித்து நிரப்ப 2 credits (`MATRIMONY_JATHAGAM_CREDITS` env மூலம் மாற்றலாம்; 0 = இலவசம்).
- Chat கட்டணம் (தொடர்புக்கு) தற்போது நிறுத்தம். பின்னர் தொகை முடிவானதும்: (1) Supabase SQL Editor-ல் `update mat_settings set value = 'on' where key = 'chat_fee';` (2) `m-config.js`-ல் `FEE_ON: true`, `FEE_RS: <தொகை>`; (3) Cloud Run env `MATRIMONY_FEE_PAISE=<தொகை×100>`.
- தொடர்பு பக்கம் `#/contact`: எண்/email `m-config.js`-ல் (`SUPPORT_PHONE`, `SUPPORT_EMAIL`, `SUPPORT_WHATSAPP`).
- `schema.sql`-ஐ மீண்டும் Run செய்தால் புதிய குடும்ப விவர columns + சுவிட்ச் சேர்ந்துவிடும் (பாதுகாப்பாக மீண்டும் ஓடும்).


## 🚪 உள்நுழைவு இல்லாமல் பதிவு (UPDATE 7)
- முகப்பில் "இலவசமாகப் பதிவு செய்க" → `#/join`: கணக்கு/கடவுச்சொல் தேவையில்லை. விவரம் (குடும்பம், ஜாதகம்), படங்கள் (6 வரை), மொபைல் எண், விருப்ப email — சமர்ப்பித்ததும் `mat_submissions`-ல் பதிவாகும்.
- Admin → **புதிய பதிவுகள்** tab: அனைத்து விவரம், படம், 📞 தட்டினால் அழைப்பு; "தொடர்பு கொண்டேன் / முடிந்தது" குறிக்கலாம். (தள உறுப்பினர் சுயவிவரம் வேறு; பின்னர் இணைத்துக்கொள்ளலாம்.)
- பாதுகாப்பு: ஒரு எண்ணுக்கு நாளைக்கு 3 பதிவு, மணிக்கு 300 மொத்தம்; எழுத்துப் பெட்டிகளில் தொலைபேசி/email தடை; படங்கள் `submissions/` கோப்புறையில் மட்டும்.
- AI ஜாதகம் நிரப்பல் உள்நுழைந்தவர்களுக்கு மட்டும் (credits தேவை).
- `schema.sql`-ஐ மீண்டும் Run செய்யுங்கள் (புதிய table + சேமிப்பு விதி சேரும்).

## 🔎 SEO / sitemap
- `/matrimony/` (தமிழ்) மற்றும் `/matrimony/en/` (English) — இரண்டிலும் hreflang, JSON-LD (தொடர்பு எண்/email). `sitemap.xml`-ல் இரண்டும் hreflang இணைப்புடன். `generate-tool-pages.mjs` இயக்கினால் தானாக உருவாகும்.
- தள மொழி: `?lang=en` / `?lang=ta` இணைப்பிலும் வேலை செய்யும்.
