-- PDF Tools India — Cloudflare D1 schema (replaces Supabase).
-- Applied by the "Deploy Cloudflare API" GitHub Action:
--   wrangler d1 migrations apply pdftools-db --remote
-- Timestamps are ISO-8601 UTC text ('2026-10-10T12:00:00.000Z') so they sort and compare as strings.
-- JSON values (pref, photos, data) are stored as JSON text.

-- ---------------------------------------------------------------- auth (no passwords: Google sign-in or a 6-digit e-mail code)
create table if not exists users (
  id text primary key,
  email text not null unique collate nocase,
  google_sub text unique,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- refresh tokens (only the SHA-256 hash is stored)
create table if not exists sessions (
  token_hash text primary key,
  user_id text not null references users(id) on delete cascade,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at text not null
);
create index if not exists sessions_user on sessions (user_id);

-- one pending e-mail login code per address (only a keyed hash of the code is stored)
create table if not exists otp_codes (
  email text primary key collate nocase,
  code_hash text not null,
  expires_at text not null,
  attempts integer not null default 0
);

-- simple sliding-window rate limits: one row per event (key = 'otp:<email>', 'otpip:<ip>', 'redeem:<user>' ...)
create table if not exists rate_events (
  key text not null,
  at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index if not exists rate_events_key on rate_events (key, at);

-- ---------------------------------------------------------------- credits & payments
create table if not exists profiles (
  id text primary key references users(id) on delete cascade,
  email text,
  display_name text,
  plan text not null default 'free',
  plan_expires_at text,
  credits integer not null default 5,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists usage_logs (
  id integer primary key autoincrement,
  user_id text not null references profiles(id) on delete cascade,
  tool_id text not null,
  credits_used integer not null default 1,
  file_size_bytes integer,
  status text not null default 'success',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index if not exists usage_logs_user on usage_logs (user_id, created_at);

create table if not exists transactions (
  id integer primary key autoincrement,
  user_id text not null references profiles(id) on delete cascade,
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  amount_inr real not null,
  credits_purchased integer,
  plan_purchased text,
  status text not null default 'created',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists pricing_plans (
  id text primary key,
  label text not null,
  label_ta text not null,
  amount_inr real not null,
  credits integer,
  plan text,
  duration_days integer,
  description_ta text
);
insert or ignore into pricing_plans (id, label, label_ta, amount_inr, credits, plan, duration_days, description_ta) values
  ('credits_20',  '20 Credits',  '20 கிரெடிட்ஸ்',  49,   20,   null,       null, 'சிறிய தேவைகளுக்கு — ஒவ்வொரு heavy tool 1 credit'),
  ('credits_100', '100 Credits', '100 கிரெடிட்ஸ்', 179,  100,  null,       null, 'அடிக்கடி பயன்படுத்துபவர்களுக்கு'),
  ('pro_monthly', 'Pro Monthly', 'ப்ரோ — மாதம்',   99,   null, 'pro',      30,   'Unlimited tools + Fast Server Processing + No watermark'),
  ('pro_yearly',  'Pro Yearly',  'ப்ரோ — வருடம்',  799,  null, 'pro',      365,  '2 மாதம் இலவசம் — Unlimited tools + Fast Server'),
  ('business',    'Business',    'பிசினஸ்',        1999, null, 'business', 30,   'API Access + Team seats + Priority queue');

-- promo / gift codes: insert into redeem_codes (code, credits, max_uses) values ('WELCOME10', 10, 100);
create table if not exists redeem_codes (
  code text primary key collate nocase,
  credits integer not null,
  max_uses integer,
  uses integer not null default 0,
  expires_at text,
  active integer not null default 1
);
create table if not exists redemptions (
  user_id text not null references profiles(id) on delete cascade,
  code text not null collate nocase,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (user_id, code)
);

-- ---------------------------------------------------------------- matrimony (mat_*)
create table if not exists mat_admins (
  user_id text primary key references users(id) on delete cascade
);

create table if not exists mat_profiles (
  user_id text primary key references users(id) on delete cascade,
  created_for text not null default 'self',
  name text not null,
  gender text not null,
  dob text not null,
  religion text not null default 'hindu',
  community text not null,
  community_other text,
  kulam text,
  gotra text,
  mother_tongue text,
  star text,
  raasi text,
  dosham text not null default 'no',
  marital text not null default 'never',
  height_cm integer,
  diet text,
  education text,
  education_detail text,
  occupation text,
  employer_type text,
  income_band text,
  city text,
  district text,
  state text,
  country text not null default 'India',
  father_name text,
  mother_name text,
  native_place text,
  father_occ text,
  mother_occ text,
  brothers integer,
  sisters integer,
  family_type text,
  family_status text,
  brothers_married integer,
  sisters_married integer,
  family_about text,
  about text,
  pref text not null default '{}',
  photos text not null default '[]',
  status text not null default 'pending',
  admin_note text,
  chat_strikes integer not null default 0,
  chat_banned integer not null default 0,
  consent_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index if not exists mat_profiles_search on mat_profiles (status, gender, dob);

create table if not exists mat_private (
  user_id text primary key references users(id) on delete cascade,
  phone text,
  email text
);

create table if not exists mat_interests (
  id integer primary key autoincrement,
  from_user text not null references users(id) on delete cascade,
  to_user text not null references users(id) on delete cascade,
  note text,
  status text not null default 'pending',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  responded_at text,
  unique (from_user, to_user)
);
create index if not exists mat_interests_to on mat_interests (to_user, status);

create table if not exists mat_orders (
  order_id text primary key,
  user_id text not null references users(id) on delete cascade,
  other_id text not null references users(id) on delete cascade,
  amount_paise integer not null,
  status text not null default 'created',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- chat fee is OFF (free) until: update mat_settings set value = 'on' where key = 'chat_fee';
create table if not exists mat_settings (key text primary key, value text not null);
insert or ignore into mat_settings (key, value) values ('chat_fee', 'off');

create table if not exists mat_unlocks (
  user_a text not null references users(id) on delete cascade,
  user_b text not null references users(id) on delete cascade,
  paid_by text references users(id) on delete set null,
  order_id text,
  payment_id text unique,
  amount_paise integer,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (user_a, user_b)
);

create table if not exists mat_messages (
  id integer primary key autoincrement,
  user_a text not null references users(id) on delete cascade,
  user_b text not null references users(id) on delete cascade,
  sender text not null references users(id) on delete cascade,
  body text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  read_at text
);
create index if not exists mat_messages_pair on mat_messages (user_a, user_b, id);
create index if not exists mat_messages_sender on mat_messages (sender, created_at);

create table if not exists mat_blocks (
  blocker text not null references users(id) on delete cascade,
  blocked text not null references users(id) on delete cascade,
  primary key (blocker, blocked)
);

create table if not exists mat_shortlist (
  user_id text not null references users(id) on delete cascade,
  target text not null references users(id) on delete cascade,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (user_id, target)
);

create table if not exists mat_reports (
  id integer primary key autoincrement,
  reporter text not null references users(id) on delete cascade,
  reported text not null references users(id) on delete cascade,
  reason text not null,
  detail text,
  status text not null default 'open',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists mat_violations (
  id integer primary key autoincrement,
  user_id text not null references users(id) on delete cascade,
  kind text not null,
  sample text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- public sign-up (no login): recorded for the admin
create table if not exists mat_submissions (
  id text primary key,
  data text not null,
  phone text not null,
  email text,
  photos text not null default '[]',
  status text not null default 'new',
  note text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index if not exists mat_submissions_created on mat_submissions (created_at);
