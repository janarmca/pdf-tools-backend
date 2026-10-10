-- =====================================================================
--  சௌடேஸ்வரி திருமண அமைப்பகம் — Supabase schema (run ONCE in SQL Editor)
--  Safe to re-run: uses "if not exists" / "create or replace".
--  All tables are prefixed mat_ so they never touch your other tools' tables.
--  Rules enforced HERE (server side), not in the browser:
--    * nobody can read other people's rows directly — only through the functions below
--    * phone / e-mail / WhatsApp etc. can never be saved in chat or in profile text
--    * chat opens only after (interest accepted) AND (Rs 50 paid by either person)
-- =====================================================================

-- ---------- tables ----------
create table if not exists mat_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists mat_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_for text not null default 'self' check (created_for in ('self','son','daughter','brother','sister','relative','friend')),
  name text not null check (char_length(name) between 2 and 60),
  gender text not null check (gender in ('M','F')),
  dob date not null,
  religion text not null default 'hindu',
  community text not null,
  community_other text,
  kulam text,
  gotra text,
  mother_tongue text,
  star text,
  raasi text,
  dosham text not null default 'no',
  marital text not null default 'never' check (marital in ('never','divorced','widowed','separated')),
  height_cm int check (height_cm between 120 and 230),
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
  father_occ text,
  mother_occ text,
  brothers int check (brothers between 0 and 15),
  sisters int check (sisters between 0 and 15),
  family_type text,
  family_status text,
  about text check (char_length(about) <= 600),
  pref jsonb not null default '{}'::jsonb,
  photos text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected','hidden')),
  admin_note text,
  chat_strikes int not null default 0,
  chat_banned boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mat_profiles_search on mat_profiles (status, gender, dob);

-- phone / e-mail given at sign-up: for admin verification ONLY, never sent to other users
create table if not exists mat_private (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  email text
);

create table if not exists mat_interests (
  id bigserial primary key,
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  note text check (char_length(note) <= 200),
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (from_user, to_user),
  check (from_user <> to_user)
);
create index if not exists mat_interests_to on mat_interests (to_user, status);

create table if not exists mat_orders (
  order_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  other_id uuid not null references auth.users(id) on delete cascade,
  amount_paise int not null,
  status text not null default 'created',
  created_at timestamptz not null default now()
);

create table if not exists mat_unlocks (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  paid_by uuid references auth.users(id) on delete set null,
  order_id text,
  payment_id text unique,
  amount_paise int,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create table if not exists mat_messages (
  id bigserial primary key,
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  sender uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (user_a < user_b)
);
create index if not exists mat_messages_pair on mat_messages (user_a, user_b, id);

create table if not exists mat_blocks (
  blocker uuid not null references auth.users(id) on delete cascade,
  blocked uuid not null references auth.users(id) on delete cascade,
  primary key (blocker, blocked)
);
create table if not exists mat_shortlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  target uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, target)
);
create table if not exists mat_reports (
  id bigserial primary key,
  reporter uuid not null references auth.users(id) on delete cascade,
  reported uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  detail text check (char_length(detail) <= 500),
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create table if not exists mat_violations (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  sample text,
  created_at timestamptz not null default now()
);

-- ---------- contact-information filter (generated) ----------

-- ===== GENERATED from m-filter.js by tools/build-schema.mjs — do not edit by hand =====
create or replace function mat_norm(s text) returns text language plpgsql immutable as $f$
declare t text;
begin
  t := lower(normalize(coalesce(s, ''), NFKC));
  t := regexp_replace(t, $q$[\u00AD\u200B-\u200D\u2060\uFEFF\uFE0E\uFE0F\u20E3]$q$, '', 'g');
  t := translate(t, $q$асеорхіјѕ$q$, $q$aceopxijs$q$);
  t := translate(t, $q$٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹०१२३४५६७८९০১২৩৪৫৬৭৮৯੦੧੨੩੪੫੬੭੮੯૦૧૨૩૪૫૬૭૮૯୦୧୨୩୪୫୬୭୮୯௦௧௨௩௪௫௬௭௮௯౦౧౨౩౪౫౬౭౮౯೦೧೨೩೪೫೬೭೮೯൦൧൨൩൪൫൬൭൮൯$q$, $q$01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789$q$);
  return t;
end $f$;

create or replace function mat_digits(a text) returns text language plpgsql immutable as $f$
declare
  t text := a; i int; m text;
  w text[] := array[$q$பூஜ்ஜியம்$q$,$q$poojiyam$q$,$q$తొమ్మిది$q$,$q$enimidi$q$,$q$moondru$q$,$q$naalugu$q$,$q$ombadhu$q$,$q$ombathu$q$,$q$ombattu$q$,$q$ombodhu$q$,$q$onbadhu$q$,$q$onbathu$q$,$q$poojyam$q$,$q$tommidi$q$,$q$ஒம்போது$q$,$q$பூஜ்யம்$q$,$q$ఎనిమిది$q$,$q$ಒಂಬತ್ತು$q$,$q$aindhu$q$,$q$ainthu$q$,$q$irandu$q$,$q$naalku$q$,$q$naangu$q$,$q$paanch$q$,$q$pujyam$q$,$q$shunya$q$,$q$இரண்டு$q$,$q$ஒன்பது$q$,$q$ஒம்பது$q$,$q$நான்கு$q$,$q$மூன்று$q$,$q$ரெண்டு$q$,$q$నాలుగు$q$,$q$సున్నా$q$,$q$ನಾಲ್ಕು$q$,$q$ಸೊನ್ನೆ$q$,$q$chaar$q$,$q$chhah$q$,$q$eazhu$q$,$q$eight$q$,$q$eradu$q$,$q$moodu$q$,$q$moonu$q$,$q$mooru$q$,$q$naalu$q$,$q$nalku$q$,$q$nangu$q$,$q$okati$q$,$q$ondhu$q$,$q$ondru$q$,$q$panch$q$,$q$randu$q$,$q$rendu$q$,$q$seven$q$,$q$sifar$q$,$q$sonne$q$,$q$sunna$q$,$q$three$q$,$q$शून्य$q$,$q$அஞ்சு$q$,$q$எட்டு$q$,$q$ஐந்து$q$,$q$ஒண்ணு$q$,$q$ஒன்னு$q$,$q$ஒன்று$q$,$q$சைபர்$q$,$q$రెండు$q$,$q$aaru$q$,$q$aath$q$,$q$aidu$q$,$q$anju$q$,$q$chah$q$,$q$char$q$,$q$cheh$q$,$q$chhe$q$,$q$entu$q$,$q$erdu$q$,$q$ettu$q$,$q$ezhu$q$,$q$five$q$,$q$four$q$,$q$nine$q$,$q$ondu$q$,$q$onnu$q$,$q$pach$q$,$q$saat$q$,$q$teen$q$,$q$zero$q$,$q$जीरो$q$,$q$पाँच$q$,$q$पांच$q$,$q$सिफर$q$,$q$ஜீரோ$q$,$q$ஜீரோ$q$,$q$நாலு$q$,$q$மூணு$q$,$q$ఒకటి$q$,$q$జీరో$q$,$q$మూడు$q$,$q$ಎಂಟು$q$,$q$ಎರಡು$q$,$q$ಒಂದು$q$,$q$ಜೀರೋ$q$,$q$ಮೂರು$q$,$q$aru$q$,$q$ath$q$,$q$edu$q$,$q$elu$q$,$q$nau$q$,$q$one$q$,$q$sat$q$,$q$six$q$,$q$two$q$,$q$चार$q$,$q$तीन$q$,$q$सात$q$,$q$ஆறு$q$,$q$ஏழு$q$,$q$ఆరు$q$,$q$ఏడు$q$,$q$ఐదు$q$,$q$ಆರು$q$,$q$ಏಳು$q$,$q$ಐದು$q$,$q$do$q$,$q$ek$q$,$q$आठ$q$,$q$एक$q$,$q$छः$q$,$q$छह$q$,$q$छे$q$,$q$दो$q$,$q$नौ$q$]::text[];
  d text[] := array[$q$0$q$,$q$0$q$,$q$9$q$,$q$8$q$,$q$3$q$,$q$4$q$,$q$9$q$,$q$9$q$,$q$9$q$,$q$9$q$,$q$9$q$,$q$9$q$,$q$0$q$,$q$9$q$,$q$9$q$,$q$0$q$,$q$8$q$,$q$9$q$,$q$5$q$,$q$5$q$,$q$2$q$,$q$4$q$,$q$4$q$,$q$5$q$,$q$0$q$,$q$0$q$,$q$2$q$,$q$9$q$,$q$9$q$,$q$4$q$,$q$3$q$,$q$2$q$,$q$4$q$,$q$0$q$,$q$4$q$,$q$0$q$,$q$4$q$,$q$6$q$,$q$7$q$,$q$8$q$,$q$2$q$,$q$3$q$,$q$3$q$,$q$3$q$,$q$4$q$,$q$4$q$,$q$4$q$,$q$1$q$,$q$1$q$,$q$1$q$,$q$5$q$,$q$2$q$,$q$2$q$,$q$7$q$,$q$0$q$,$q$0$q$,$q$0$q$,$q$3$q$,$q$0$q$,$q$5$q$,$q$8$q$,$q$5$q$,$q$1$q$,$q$1$q$,$q$1$q$,$q$0$q$,$q$2$q$,$q$6$q$,$q$8$q$,$q$5$q$,$q$5$q$,$q$6$q$,$q$4$q$,$q$6$q$,$q$6$q$,$q$8$q$,$q$2$q$,$q$8$q$,$q$7$q$,$q$5$q$,$q$4$q$,$q$9$q$,$q$1$q$,$q$1$q$,$q$5$q$,$q$7$q$,$q$3$q$,$q$0$q$,$q$0$q$,$q$5$q$,$q$5$q$,$q$0$q$,$q$0$q$,$q$0$q$,$q$4$q$,$q$3$q$,$q$1$q$,$q$0$q$,$q$3$q$,$q$8$q$,$q$2$q$,$q$1$q$,$q$0$q$,$q$3$q$,$q$6$q$,$q$8$q$,$q$7$q$,$q$7$q$,$q$9$q$,$q$1$q$,$q$7$q$,$q$6$q$,$q$2$q$,$q$4$q$,$q$3$q$,$q$7$q$,$q$6$q$,$q$7$q$,$q$6$q$,$q$7$q$,$q$5$q$,$q$6$q$,$q$7$q$,$q$5$q$,$q$2$q$,$q$1$q$,$q$8$q$,$q$1$q$,$q$6$q$,$q$6$q$,$q$6$q$,$q$2$q$,$q$9$q$]::text[];
  m2 text[] := array[$q$double$q$,$q$dabal$q$,$q$dubal$q$,$q$டபுள்$q$,$q$डबल$q$]::text[];
  m3 text[] := array[$q$triple$q$,$q$tripple$q$,$q$ட்ரிபிள்$q$,$q$ट्रिपल$q$]::text[];
begin
  for i in 1..array_length(w, 1) loop t := replace(t, w[i], d[i]); end loop;
  foreach m in array m2 loop t := regexp_replace(t, m || $q$[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]$q$ || '*([0-9])', '\1\1', 'g'); end loop;
  foreach m in array m3 loop t := regexp_replace(t, m || $q$[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]$q$ || '*([0-9])', '\1\1\1', 'g'); end loop;
  for i in 1..3 loop
    t := regexp_replace(t, $q$([0-9])([\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]{0,2})o([\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]{0,2})([0-9])$q$, '\1\2' || '0' || '\3\4', 'g');
  end loop;
  t := regexp_replace(t, $q$(?<![0-9])(0?[1-9]|[12][0-9]|3[01])[-/. ](0?[1-9]|1[0-2])[-/. ](19|20)[0-9][0-9](?![0-9])$q$, ' d ', 'g');
  t := regexp_replace(t, $q$(?<![0-9])(19|20)[0-9][0-9][\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]{0,3}(19|20)[0-9][0-9](?![0-9])$q$, ' d ', 'g');
  return t;
end $f$;

create or replace function mat_has_streak(a text) returns boolean language sql immutable as $f$
  select mat_digits(a) ~ $q$[0-9]([\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]{0,3}[0-9]){7,}$q$;
$f$;

-- returns NULL when the text is fine, otherwise the reason: phone | email | link | social | phrase
create or replace function mat_contact_check(txt text, prev text[] default '{}') returns text language plpgsql immutable as $f$
declare
  a text := mat_norm(txt); sq text; i int; n int; p text[] := '{}'; x text;
  rules_re text[] := array[$q$@$q$,$q$[a-z0-9][\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]{0,2}[\(\[\{<][\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]*at[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]*[\)\]\}>]$q$,$q$(?<![a-z0-9])at[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]+the[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]+rate$q$,$q$[\(\[\{<][\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]*dot[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]*[\)\]\}>]$q$,$q$(?<![a-z0-9])dot[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]+(com|in|net|org|co)(?![a-z0-9])$q$,$q$(?<![a-z0-9])(e[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]?mail|mail[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]?id)(?![a-z0-9])$q$,$q$(https?|ftp)://$q$,$q$(?<![a-z0-9])www[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]?\.$q$,$q$(?<![a-z0-9])[a-z0-9][a-z0-9-]*\.(com|in|net|org|co|me|link|app|io|xyz|info|ly|us|biz|online|site|club|gl|be|page|dev)(?![a-z0-9])$q$,$q$(?<![a-z0-9])(insta|ig|fb|dm|snap|wapp|wa|tg|telegram|whatsapp|watsapp|whtsapp|instagram|facebook|snapchat)(?![a-z0-9])$q$,$q$(?<![a-z0-9])(phone|fone|mobile|cell|contact|whatsapp|watsapp|call|ph|mob|tel)[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]{0,2}(no|num|nbr|nmbr|number|nambar|numbar)(?![a-z0-9])$q$,$q$(?<![a-z0-9])(phone|fone|cellphone)(?![a-z0-9])$q$,$q$(?<![a-z0-9])(call|ring|miss|missed|voice|video)[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]{1,2}(me|you|u|call|chat)(?![a-z0-9])$q$,$q$(?<![a-z0-9])(give|have)[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]+(me[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]+)?a[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]+(call|ring)(?![a-z0-9])$q$,$q$(?<![a-z0-9])(on|over)[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]+(call|phone)(?![a-z0-9])$q$,$q$(?<![a-z0-9])(unga|ungal|un|enn?oda|en|ur|your|my|his|her|avanga|neenga|tumhara|aapka|aapke|mera|meri|nimma|nanna|mee|naa)[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]+(number|numbar|nambar|nambaru|nambr|num|no|nbr|mobile|phone|fone|cell|contact|whatsapp|watsapp|email|mail|id|insta|telegram)(?![a-z0-9])$q$,$q$(?<![a-z0-9])(send|give|share|kudu|kodu|kodunga|bhejo|ivvu|sollunga|sollu|anuppunga|anuppu|tell|text|drop|note)[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]+((me|us|the|a|your|ur|ungal|unga)[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]+)?(number|numbar|nambar|nambr|num|no|mobile|phone|fone|whatsapp|email|mail|id)(?![a-z0-9])$q$]::text[];
  rules_id text[] := array[$q$email$q$,$q$email$q$,$q$email$q$,$q$email$q$,$q$email$q$,$q$email$q$,$q$link$q$,$q$link$q$,$q$link$q$,$q$social$q$,$q$phrase$q$,$q$phrase$q$,$q$phrase$q$,$q$phrase$q$,$q$phrase$q$,$q$phrase$q$,$q$phrase$q$]::text[];
  native text[] := array[$q$நம்பர்$q$,$q$நெம்பர்$q$,$q$தொலைபேசி$q$,$q$அலைபேசி$q$,$q$கைபேசி$q$,$q$மொபைல்$q$,$q$மொபைலில்$q$,$q$வாட்ஸ்அப்$q$,$q$வாட்ஸப்$q$,$q$வாட்சப்$q$,$q$வாட்ஸாப்$q$,$q$வாட்ஸ் அப்$q$,$q$வாட்சாப்$q$,$q$டெலிகிராம்$q$,$q$இன்ஸ்டா$q$,$q$பேஸ்புக்$q$,$q$ஃபேஸ்புக்$q$,$q$ஃபேஸ்புக்$q$,$q$ஜிமெயில்$q$,$q$ஜி மெயில்$q$,$q$ஜீமெயில்$q$,$q$ஜிமெய்ல்$q$,$q$யாகூ$q$,$q$மின்னஞ்சல்$q$,$q$ஈமெயில்$q$,$q$இமெயில்$q$,$q$ஈ-மெயில்$q$,$q$போன் எண்$q$,$q$போன் நம்பர்$q$,$q$போன் பண்ண$q$,$q$போன் செய்$q$,$q$போன் பன்ன$q$,$q$கால் பண்ண$q$,$q$கால் பன்ன$q$,$q$கால் செய்$q$,$q$மிஸ்டு கால்$q$,$q$மிஸ்ட் கால்$q$,$q$எண்ணை கொடு$q$,$q$எண் கொடு$q$,$q$எண்ணை அனுப்பு$q$,$q$வீடியோ கால்$q$,$q$வாய்ஸ் கால்$q$,$q$नंबर$q$,$q$नम्बर$q$,$q$मोबाइल$q$,$q$मोबाईल$q$,$q$फोन$q$,$q$फ़ोन$q$,$q$व्हाट्सएप$q$,$q$व्हाट्सऐप$q$,$q$वॉट्सऐप$q$,$q$वाट्सएप$q$,$q$व्हॉट्सअॅप$q$,$q$व्हाट्स$q$,$q$टेलीग्राम$q$,$q$इंस्टा$q$,$q$जीमेल$q$,$q$ईमेल$q$,$q$मेल आईडी$q$,$q$कॉल$q$,$q$ನಂಬರ್$q$,$q$ನಂಬರ$q$,$q$ಫೋನ್$q$,$q$ಮೊಬೈಲ್$q$,$q$ವಾಟ್ಸಪ್$q$,$q$ವಾಟ್ಸ್ಆ್ಯಪ್$q$,$q$ವಾಟ್ಸಾಪ್$q$,$q$ವಾಟ್ಸ್ ಆಪ್$q$,$q$ಟೆಲಿಗ್ರಾಂ$q$,$q$ಇನ್ಸ್ಟಾ$q$,$q$ಜಿಮೇಲ್$q$,$q$ಇಮೇಲ್$q$,$q$ಕಾಲ್ ಮಾಡಿ$q$,$q$ಕಾಲ್ ಮಾಡು$q$,$q$నంబర్$q$,$q$ఫోన్$q$,$q$మొబైల్$q$,$q$వాట్సాప్$q$,$q$టెలిగ్రామ్$q$,$q$ఇన్స్టా$q$,$q$జీమెయిల్$q$,$q$ఈమెయిల్$q$,$q$కాల్ చేయి$q$,$q$కాల్ చెయ్యి$q$]::text[];
  squeeze text[] := array[$q$whatsapp$q$,$q$whatsap$q$,$q$watsapp$q$,$q$wattsapp$q$,$q$whtsapp$q$,$q$wtsapp$q$,$q$whatsaap$q$,$q$telegram$q$,$q$instagram$q$,$q$facebook$q$,$q$snapchat$q$,$q$gmail$q$,$q$gmial$q$,$q$googlemail$q$,$q$yahoo$q$,$q$hotmail$q$,$q$outlook$q$,$q$protonmail$q$,$q$rediff$q$,$q$icloud$q$,$q$skype$q$,$q$linkedin$q$,$q$dotcom$q$,$q$dotin$q$,$q$dotnet$q$,$q$dotorg$q$,$q$attherate$q$,$q$atrate$q$]::text[];
  squeeze_id text[] := array[$q$social$q$,$q$social$q$,$q$social$q$,$q$social$q$,$q$social$q$,$q$social$q$,$q$social$q$,$q$social$q$,$q$social$q$,$q$social$q$,$q$social$q$,$q$email$q$,$q$social$q$,$q$email$q$,$q$email$q$,$q$email$q$,$q$email$q$,$q$email$q$,$q$email$q$,$q$email$q$,$q$social$q$,$q$social$q$,$q$email$q$,$q$email$q$,$q$email$q$,$q$email$q$,$q$email$q$,$q$email$q$]::text[];
begin
  if a = '' then return null; end if;
  for i in 1..array_length(rules_re, 1) loop
    if a ~ rules_re[i] then return rules_id[i]; end if;
  end loop;
  for i in 1..array_length(native, 1) loop
    if position(native[i] in a) > 0 then return 'phrase'; end if;
  end loop;
  sq := translate(a, $q$@$4310$q$, $q$asaeio$q$);
  sq := regexp_replace(sq, $q$[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A0-\u00BF\u2000-\u2BFF\u3000-\u303F]$q$, '', 'g');
  for i in 1..array_length(squeeze, 1) loop
    if position(squeeze[i] in sq) > 0 then return squeeze_id[i]; end if;
  end loop;
  if mat_has_streak(a) then return 'phone'; end if;
  n := coalesce(array_length(prev, 1), 0);
  if n > 0 then
    for i in greatest(1, n - 2)..n loop
      x := mat_norm(prev[i]);
      if x <> '' then p := p || x; end if;
    end loop;
    if array_length(p, 1) > 0 and mat_digits(a) ~ '[0-9]' then
      if mat_has_streak(array_to_string(p || a, ' ')) then return 'phone'; end if;
    end if;
  end if;
  return null;
end $f$;
-- ===== end generated =====


-- ---------- row level security: closed by default ----------
alter table mat_admins    enable row level security;
alter table mat_profiles  enable row level security;
alter table mat_private   enable row level security;
alter table mat_interests enable row level security;
alter table mat_orders    enable row level security;
alter table mat_unlocks   enable row level security;
alter table mat_messages  enable row level security;
alter table mat_blocks    enable row level security;
alter table mat_shortlist enable row level security;
alter table mat_reports   enable row level security;
alter table mat_violations enable row level security;

do $$ declare t text; begin
  foreach t in array array['mat_admins','mat_profiles','mat_private','mat_interests','mat_orders','mat_unlocks','mat_messages','mat_blocks','mat_shortlist','mat_reports','mat_violations'] loop
    execute format('revoke all on table %I from anon, authenticated', t);
  end loop;
end $$;

-- the only direct reads allowed: your own profile row, and the chat rows you take part in (for live updates)
drop policy if exists mat_profiles_self on mat_profiles;
create policy mat_profiles_self on mat_profiles for select to authenticated using (user_id = auth.uid());
grant select on mat_profiles to authenticated;
drop policy if exists mat_messages_part on mat_messages;
create policy mat_messages_part on mat_messages for select to authenticated using (auth.uid() in (user_a, user_b));
grant select on mat_messages to authenticated;
-- the mat_messages / mat_unlocks sequences & inserts are NOT granted: writing is possible only through functions.

-- ---------- helpers ----------
create or replace function mat_is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from mat_admins where user_id = auth.uid());
$$;

create or replace function mat_age(d date) returns int language sql immutable as $$
  select date_part('year', age(current_date, d))::int;
$$;

create or replace function mat_pair_a(x uuid, y uuid) returns uuid language sql immutable as $$ select least(x, y); $$;
create or replace function mat_pair_b(x uuid, y uuid) returns uuid language sql immutable as $$ select greatest(x, y); $$;

create or replace function mat_arr(f jsonb, k text) returns text[] language sql immutable as $$
  select case when jsonb_typeof(f -> k) = 'array'
              then array(select jsonb_array_elements_text(f -> k)) else '{}'::text[] end;
$$;

create or replace function mat_blocked(x uuid, y uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from mat_blocks where (blocker = x and blocked = y) or (blocker = y and blocked = x));
$$;

create or replace function mat_unlocked(x uuid, y uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from mat_unlocks where user_a = least(x, y) and user_b = greatest(x, y));
$$;

create or replace function mat_accepted(x uuid, y uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from mat_interests where status = 'accepted'
                 and ((from_user = x and to_user = y) or (from_user = y and to_user = x)));
$$;

-- profile card shown in lists (no private data, ever)
create or replace function mat_card(p mat_profiles) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.user_id, 'name', p.name, 'age', mat_age(p.dob), 'gender', p.gender,
    'height_cm', p.height_cm, 'community', p.community, 'community_other', p.community_other,
    'kulam', p.kulam, 'gotra', p.gotra, 'star', p.star, 'raasi', p.raasi,
    'education', p.education, 'occupation', p.occupation, 'city', p.city, 'state', p.state,
    'marital', p.marital, 'created_for', p.created_for,
    'photo', case when cardinality(p.photos) > 0 then p.photos[1] else null end,
    'shortlisted', exists (select 1 from mat_shortlist s where s.user_id = auth.uid() and s.target = p.user_id),
    'interest', (select jsonb_build_object('id', i.id, 'status', i.status, 'dir', case when i.from_user = auth.uid() then 'out' else 'in' end)
                 from mat_interests i where (i.from_user = auth.uid() and i.to_user = p.user_id) or (i.to_user = auth.uid() and i.from_user = p.user_id) limit 1)
  );
$$;

-- the caller must be signed in AND approved (otherwise raises a short code)
create or replace function mat_me_approved() returns mat_profiles language plpgsql stable security definer set search_path = public as $$
declare me mat_profiles;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  select * into me from mat_profiles where user_id = auth.uid();
  if not found then raise exception 'no_profile'; end if;
  if me.status <> 'approved' then raise exception 'not_approved'; end if;
  return me;
end $$;

-- ---------- profile ----------
create or replace function mat_save_profile(p jsonb, phone text default null, email text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); g text; d date; a int; ph text[]; bad text; k text;
  existing mat_profiles;
begin
  if uid is null then return jsonb_build_object('ok', false, 'code', 'not_logged_in'); end if;
  g := p->>'gender';
  if g not in ('M','F') then return jsonb_build_object('ok', false, 'code', 'gender'); end if;
  begin d := (p->>'dob')::date; exception when others then return jsonb_build_object('ok', false, 'code', 'dob'); end;
  a := mat_age(d);
  if (g = 'M' and a < 21) or (g = 'F' and a < 18) then return jsonb_build_object('ok', false, 'code', 'age'); end if;
  if a > 80 then return jsonb_build_object('ok', false, 'code', 'dob'); end if;
  if coalesce(p->>'consent', '') <> 'true' and not exists (select 1 from mat_profiles where user_id = uid and consent_at is not null) then
    return jsonb_build_object('ok', false, 'code', 'consent');
  end if;
  -- no contact details inside any free-text field
  foreach k in array array['name','community_other','kulam','gotra','education_detail','occupation','father_occ','mother_occ','about','city','district'] loop
    bad := mat_contact_check(p->>k);
    if bad is not null then return jsonb_build_object('ok', false, 'code', 'contact_in_profile', 'field', k, 'reason', bad); end if;
  end loop;
  ph := mat_arr(p, 'photos');
  if cardinality(ph) > 6 then return jsonb_build_object('ok', false, 'code', 'photos'); end if;
  foreach k in array ph loop
    if left(k, 37) <> uid::text || '/' then return jsonb_build_object('ok', false, 'code', 'photos'); end if;
  end loop;
  select * into existing from mat_profiles where user_id = uid;
  insert into mat_profiles as m (user_id, created_for, name, gender, dob, religion, community, community_other, kulam, gotra, mother_tongue,
      star, raasi, dosham, marital, height_cm, diet, education, education_detail, occupation, employer_type, income_band,
      city, district, state, country, father_occ, mother_occ, brothers, sisters, family_type, family_status, about, pref, photos, consent_at)
  values (uid, coalesce(nullif(p->>'created_for',''), 'self'), btrim(p->>'name'), g, d, coalesce(nullif(p->>'religion',''), 'hindu'), coalesce(nullif(p->>'community',''), 'other'),
      nullif(btrim(p->>'community_other'), ''), nullif(btrim(p->>'kulam'), ''), nullif(btrim(p->>'gotra'), ''), nullif(p->>'mother_tongue',''),
      nullif(p->>'star',''), nullif(p->>'raasi',''), coalesce(nullif(p->>'dosham',''), 'no'), coalesce(nullif(p->>'marital',''), 'never'),
      nullif(p->>'height_cm','')::int, nullif(p->>'diet',''), nullif(p->>'education',''), nullif(btrim(p->>'education_detail'), ''), nullif(btrim(p->>'occupation'), ''),
      nullif(p->>'employer_type',''), nullif(p->>'income_band',''), nullif(btrim(p->>'city'), ''), nullif(btrim(p->>'district'), ''), nullif(p->>'state',''),
      coalesce(nullif(p->>'country',''), 'India'), nullif(btrim(p->>'father_occ'), ''), nullif(btrim(p->>'mother_occ'), ''),
      nullif(p->>'brothers','')::int, nullif(p->>'sisters','')::int, nullif(p->>'family_type',''), nullif(p->>'family_status',''),
      nullif(btrim(p->>'about'), ''), coalesce(p->'pref', '{}'::jsonb), ph, now())
  on conflict (user_id) do update set
      created_for = excluded.created_for, name = excluded.name, gender = excluded.gender, dob = excluded.dob, religion = excluded.religion,
      community = excluded.community, community_other = excluded.community_other, kulam = excluded.kulam, gotra = excluded.gotra,
      mother_tongue = excluded.mother_tongue, star = excluded.star, raasi = excluded.raasi, dosham = excluded.dosham, marital = excluded.marital,
      height_cm = excluded.height_cm, diet = excluded.diet, education = excluded.education, education_detail = excluded.education_detail,
      occupation = excluded.occupation, employer_type = excluded.employer_type, income_band = excluded.income_band, city = excluded.city,
      district = excluded.district, state = excluded.state, country = excluded.country, father_occ = excluded.father_occ, mother_occ = excluded.mother_occ,
      brothers = excluded.brothers, sisters = excluded.sisters, family_type = excluded.family_type, family_status = excluded.family_status,
      about = excluded.about, pref = excluded.pref, photos = excluded.photos, updated_at = now(),
      -- editing photos / about / name sends an approved profile back for a quick re-check
      status = case when m.status = 'approved' and (m.photos is distinct from excluded.photos or m.about is distinct from excluded.about or m.name is distinct from excluded.name)
                    then 'pending' else m.status end;
  insert into mat_private (user_id, phone, email) values (uid, nullif(btrim(phone), ''), nullif(btrim(email), ''))
    on conflict (user_id) do update set phone = coalesce(excluded.phone, mat_private.phone), email = coalesce(excluded.email, mat_private.email);
  return jsonb_build_object('ok', true, 'status', (select status from mat_profiles where user_id = uid));
end $$;

create or replace function mat_my_profile() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select to_jsonb(p) || jsonb_build_object('age', mat_age(p.dob), 'is_admin', mat_is_admin()) from mat_profiles p where p.user_id = auth.uid()),
                  jsonb_build_object('none', true, 'is_admin', mat_is_admin()));
$$;

create or replace function mat_delete_me() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'not_logged_in'); end if;
  delete from mat_messages where user_a = auth.uid() or user_b = auth.uid();
  delete from mat_interests where from_user = auth.uid() or to_user = auth.uid();
  delete from mat_shortlist where user_id = auth.uid() or target = auth.uid();
  delete from mat_profiles where user_id = auth.uid();
  delete from mat_private where user_id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

-- ---------- browse ----------
create or replace function mat_search(f jsonb default '{}', lim int default 20, off int default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me mat_profiles; res jsonb; g text; comm text[]; st text[]; rs text[]; mar text[]; edu text[]; sta text[]; dts text[]; qn text; kn text; cn text;
begin
  begin me := mat_me_approved(); exception when others then return jsonb_build_object('ok', false, 'code', sqlerrm); end;
  g := coalesce(nullif(f->>'gender', ''), case me.gender when 'M' then 'F' else 'M' end);
  comm := mat_arr(f, 'community'); st := mat_arr(f, 'star'); rs := mat_arr(f, 'raasi'); mar := mat_arr(f, 'marital');
  edu := mat_arr(f, 'education'); sta := mat_arr(f, 'state'); dts := mat_arr(f, 'diet');
  qn := nullif(btrim(f->>'q'), ''); kn := nullif(btrim(f->>'kulam'), ''); cn := nullif(btrim(f->>'city'), '');
  select coalesce(jsonb_agg(s.card order by s.created_at desc), '[]'::jsonb) into res from (
    select mat_card(p) as card, p.created_at
      from mat_profiles p
     where p.status = 'approved' and p.user_id <> me.user_id and p.gender = g
       and not mat_blocked(me.user_id, p.user_id)
       and (nullif(f->>'min_age','') is null or mat_age(p.dob) >= (f->>'min_age')::int)
       and (nullif(f->>'max_age','') is null or mat_age(p.dob) <= (f->>'max_age')::int)
       and (nullif(f->>'min_height','') is null or p.height_cm >= (f->>'min_height')::int)
       and (nullif(f->>'max_height','') is null or p.height_cm <= (f->>'max_height')::int)
       and (cardinality(comm) = 0 or p.community = any (comm))
       and (cardinality(st) = 0 or p.star = any (st))
       and (cardinality(rs) = 0 or p.raasi = any (rs))
       and (cardinality(mar) = 0 or p.marital = any (mar))
       and (cardinality(edu) = 0 or p.education = any (edu))
       and (cardinality(sta) = 0 or p.state = any (sta))
       and (cardinality(dts) = 0 or p.diet = any (dts))
       and (kn is null or p.kulam ilike '%' || kn || '%' or p.gotra ilike '%' || kn || '%')
       and (cn is null or p.city ilike '%' || cn || '%' or p.district ilike '%' || cn || '%')
       and (qn is null or p.name ilike '%' || qn || '%')
       and (coalesce(f->>'with_photo','') <> 'true' or cardinality(p.photos) > 0)
       and (coalesce(f->>'no_dosham','') <> 'true' or p.dosham = 'no')
     order by p.created_at desc
     limit least(greatest(coalesce(lim, 20), 1), 50) offset greatest(coalesce(off, 0), 0)
  ) s;
  return jsonb_build_object('ok', true, 'items', res);
end $$;

create or replace function mat_get_profile(pid uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me mat_profiles; p mat_profiles;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'not_logged_in'); end if;
  select * into p from mat_profiles where user_id = pid;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if pid = auth.uid() or mat_is_admin() then
    return jsonb_build_object('ok', true, 'profile', to_jsonb(p) || jsonb_build_object('age', mat_age(p.dob)) || mat_card(p), 'self', pid = auth.uid());
  end if;
  begin me := mat_me_approved(); exception when others then return jsonb_build_object('ok', false, 'code', sqlerrm); end;
  if p.status <> 'approved' or mat_blocked(auth.uid(), pid) then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'self', false,
    'profile', (to_jsonb(p) - 'admin_note' - 'chat_strikes' - 'chat_banned' - 'consent_at' - 'status' - 'dob') || jsonb_build_object('age', mat_age(p.dob)) || mat_card(p),
    'unlocked', mat_unlocked(auth.uid(), pid), 'accepted', mat_accepted(auth.uid(), pid));
end $$;

-- ---------- shortlist / block / report ----------
create or replace function mat_toggle_shortlist(pid uuid) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'not_logged_in'); end if;
  if exists (select 1 from mat_shortlist where user_id = auth.uid() and target = pid) then
    delete from mat_shortlist where user_id = auth.uid() and target = pid;
    return jsonb_build_object('ok', true, 'shortlisted', false);
  end if;
  insert into mat_shortlist (user_id, target) values (auth.uid(), pid);
  return jsonb_build_object('ok', true, 'shortlisted', true);
end $$;

create or replace function mat_shortlist_list() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  begin perform mat_me_approved(); exception when others then return jsonb_build_object('ok', false, 'code', sqlerrm); end;
  return jsonb_build_object('ok', true, 'items', coalesce((
    select jsonb_agg(mat_card(p) order by s.created_at desc) from mat_shortlist s join mat_profiles p on p.user_id = s.target
     where s.user_id = auth.uid() and p.status = 'approved' and not mat_blocked(auth.uid(), p.user_id)), '[]'::jsonb));
end $$;

create or replace function mat_block(pid uuid, on_off boolean default true) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'not_logged_in'); end if;
  if on_off then
    insert into mat_blocks (blocker, blocked) values (auth.uid(), pid) on conflict do nothing;
    delete from mat_shortlist where (user_id = auth.uid() and target = pid) or (user_id = pid and target = auth.uid());
  else delete from mat_blocks where blocker = auth.uid() and blocked = pid; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function mat_report(pid uuid, reason text, detail text default null) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'not_logged_in'); end if;
  insert into mat_reports (reporter, reported, reason, detail) values (auth.uid(), pid, left(coalesce(reason, 'other'), 60), left(detail, 500));
  return jsonb_build_object('ok', true);
end $$;

-- ---------- interests (free) ----------
create or replace function mat_send_interest(pid uuid, note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me mat_profiles; p mat_profiles; bad text; rev mat_interests;
begin
  begin me := mat_me_approved(); exception when others then return jsonb_build_object('ok', false, 'code', sqlerrm); end;
  if pid = me.user_id then return jsonb_build_object('ok', false, 'code', 'self'); end if;
  select * into p from mat_profiles where user_id = pid and status = 'approved';
  if not found or mat_blocked(me.user_id, pid) then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  bad := mat_contact_check(note);
  if bad is not null then return jsonb_build_object('ok', false, 'code', 'contact_blocked', 'reason', bad); end if;
  if (select count(*) from mat_interests where from_user = me.user_id and created_at > now() - interval '1 day') >= 15 then
    return jsonb_build_object('ok', false, 'code', 'rate_limit');
  end if;
  select * into rev from mat_interests where from_user = pid and to_user = me.user_id;
  if found then  -- they already liked you: it becomes a mutual match
    update mat_interests set status = 'accepted', responded_at = now() where id = rev.id;
    return jsonb_build_object('ok', true, 'status', 'accepted', 'mutual', true);
  end if;
  insert into mat_interests (from_user, to_user, note) values (me.user_id, pid, nullif(btrim(note), ''))
    on conflict (from_user, to_user) do nothing;
  return jsonb_build_object('ok', true, 'status', (select status from mat_interests where from_user = me.user_id and to_user = pid));
end $$;

create or replace function mat_respond_interest(iid bigint, accept boolean) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  begin perform mat_me_approved(); exception when others then return jsonb_build_object('ok', false, 'code', sqlerrm); end;
  update mat_interests set status = case when accept then 'accepted' else 'declined' end, responded_at = now()
   where id = iid and to_user = auth.uid() and status = 'pending';
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function mat_inbox() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  begin perform mat_me_approved(); exception when others then return jsonb_build_object('ok', false, 'code', sqlerrm); end;
  return jsonb_build_object('ok', true, 'items', coalesce((
    select jsonb_agg(jsonb_build_object('id', i.id, 'dir', case when i.to_user = auth.uid() then 'in' else 'out' end, 'status', i.status,
                     'note', i.note, 'created_at', i.created_at, 'other', mat_card(p), 'unlocked', mat_unlocked(auth.uid(), p.user_id)) order by i.created_at desc)
      from mat_interests i
      join mat_profiles p on p.user_id = case when i.to_user = auth.uid() then i.from_user else i.to_user end
     where (i.to_user = auth.uid() or i.from_user = auth.uid()) and p.status = 'approved' and not mat_blocked(auth.uid(), p.user_id)), '[]'::jsonb));
end $$;

-- ---------- chat (Rs 50 unlock + contact filter) ----------
create or replace function mat_chat_state(pid uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  begin perform mat_me_approved(); exception when others then return jsonb_build_object('ok', false, 'code', sqlerrm); end;
  return jsonb_build_object('ok', true, 'accepted', mat_accepted(auth.uid(), pid), 'unlocked', mat_unlocked(auth.uid(), pid),
    'blocked', mat_blocked(auth.uid(), pid), 'banned', (select chat_banned from mat_profiles where user_id = auth.uid()));
end $$;

create or replace function mat_send_message(pid uuid, body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me mat_profiles; bad text; prev text[]; n int; msg_id bigint; t text := btrim(coalesce(body, ''));
begin
  begin me := mat_me_approved(); exception when others then return jsonb_build_object('ok', false, 'code', sqlerrm); end;
  if me.chat_banned then return jsonb_build_object('ok', false, 'code', 'chat_banned'); end if;
  if t = '' then return jsonb_build_object('ok', false, 'code', 'empty'); end if;
  if char_length(t) > 500 then return jsonb_build_object('ok', false, 'code', 'too_long'); end if;
  if pid = me.user_id or mat_blocked(me.user_id, pid) or not exists (select 1 from mat_profiles where user_id = pid and status = 'approved') then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if not mat_accepted(me.user_id, pid) then return jsonb_build_object('ok', false, 'code', 'not_accepted'); end if;
  if not mat_unlocked(me.user_id, pid) then return jsonb_build_object('ok', false, 'code', 'not_unlocked'); end if;
  if (select count(*) from mat_messages where sender = me.user_id and created_at > now() - interval '1 hour') >= 120 then
    return jsonb_build_object('ok', false, 'code', 'rate_limit');
  end if;
  select coalesce(array_agg(b order by id), '{}') into prev from (
    select id, mat_messages.body as b from mat_messages
     where user_a = mat_pair_a(me.user_id, pid) and user_b = mat_pair_b(me.user_id, pid) and sender = me.user_id
       and created_at > now() - interval '15 minutes' order by id desc limit 3) q;
  bad := mat_contact_check(t, prev);
  if bad is not null then
    insert into mat_violations (user_id, kind, sample) values (me.user_id, bad, left(t, 200));
    update mat_profiles set chat_strikes = chat_strikes + 1, chat_banned = (chat_strikes + 1 >= 3) where user_id = me.user_id returning chat_strikes into n;
    return jsonb_build_object('ok', false, 'code', 'contact_blocked', 'reason', bad, 'strikes', n, 'banned', n >= 3);
  end if;
  insert into mat_messages (user_a, user_b, sender, body) values (mat_pair_a(me.user_id, pid), mat_pair_b(me.user_id, pid), me.user_id, t) returning id into msg_id;
  return jsonb_build_object('ok', true, 'id', msg_id);
end $$;

-- last line of defence: even a direct INSERT (e.g. from a future bug) cannot store contact details
create or replace function mat_messages_guard() returns trigger language plpgsql as $$
declare prev text[]; bad text;
begin
  select coalesce(array_agg(b order by id), '{}') into prev from (
    select id, body as b from mat_messages where user_a = new.user_a and user_b = new.user_b and sender = new.sender
       and created_at > now() - interval '15 minutes' order by id desc limit 3) q;
  bad := mat_contact_check(new.body, prev);
  if bad is not null then raise exception 'contact_info_blocked:%', bad; end if;
  return new;
end $$;
drop trigger if exists mat_messages_guard_t on mat_messages;
create trigger mat_messages_guard_t before insert on mat_messages for each row execute function mat_messages_guard();

create or replace function mat_messages_list(pid uuid, after_id bigint default 0) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  begin perform mat_me_approved(); exception when others then return jsonb_build_object('ok', false, 'code', sqlerrm); end;
  if not mat_unlocked(auth.uid(), pid) or mat_blocked(auth.uid(), pid) then return jsonb_build_object('ok', false, 'code', 'not_unlocked'); end if;
  update mat_messages set read_at = now()
   where user_a = mat_pair_a(auth.uid(), pid) and user_b = mat_pair_b(auth.uid(), pid) and sender = pid and read_at is null;
  return jsonb_build_object('ok', true, 'items', coalesce((
    select jsonb_agg(jsonb_build_object('id', m.id, 'mine', m.sender = auth.uid(), 'body', m.body, 'created_at', m.created_at) order by m.id)
      from mat_messages m where m.user_a = mat_pair_a(auth.uid(), pid) and m.user_b = mat_pair_b(auth.uid(), pid) and m.id > coalesce(after_id, 0)), '[]'::jsonb));
end $$;

create or replace function mat_conversations() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  begin perform mat_me_approved(); exception when others then return jsonb_build_object('ok', false, 'code', sqlerrm); end;
  return jsonb_build_object('ok', true, 'items', coalesce((
    select jsonb_agg(x.j order by x.last_at desc nulls last) from (
      select jsonb_build_object('other', mat_card(p), 'unlocked', mat_unlocked(auth.uid(), p.user_id),
               'last_body', (select m.body from mat_messages m where m.user_a = mat_pair_a(auth.uid(), p.user_id) and m.user_b = mat_pair_b(auth.uid(), p.user_id) order by m.id desc limit 1),
               'unread', (select count(*) from mat_messages m where m.user_a = mat_pair_a(auth.uid(), p.user_id) and m.user_b = mat_pair_b(auth.uid(), p.user_id) and m.sender = p.user_id and m.read_at is null)) as j,
             coalesce((select max(m.created_at) from mat_messages m where m.user_a = mat_pair_a(auth.uid(), p.user_id) and m.user_b = mat_pair_b(auth.uid(), p.user_id)), i.responded_at) as last_at
        from mat_interests i join mat_profiles p on p.user_id = case when i.to_user = auth.uid() then i.from_user else i.to_user end
       where i.status = 'accepted' and (i.to_user = auth.uid() or i.from_user = auth.uid()) and p.status = 'approved' and not mat_blocked(auth.uid(), p.user_id)
    ) x), '[]'::jsonb));
end $$;

-- called ONLY by your server (service role) after Razorpay confirms the Rs 50 payment
create or replace function mat_record_unlock(a uuid, b uuid, payer uuid, p_order text, p_payment text, p_amount int) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not mat_accepted(a, b) then return jsonb_build_object('ok', false, 'code', 'not_accepted'); end if;
  insert into mat_unlocks (user_a, user_b, paid_by, order_id, payment_id, amount_paise)
    values (least(a, b), greatest(a, b), payer, p_order, p_payment, p_amount) on conflict do nothing;
  update mat_orders set status = 'paid' where order_id = p_order;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- admin ----------
create or replace function mat_admin_queue(st text default 'pending') returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not mat_is_admin() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  return jsonb_build_object('ok', true, 'items', coalesce((
    select jsonb_agg((to_jsonb(p) || jsonb_build_object('age', mat_age(p.dob), 'phone', v.phone, 'email', v.email)) order by p.created_at)
      from mat_profiles p left join mat_private v on v.user_id = p.user_id where p.status = coalesce(st, 'pending')), '[]'::jsonb));
end $$;

create or replace function mat_admin_set_status(pid uuid, st text, note text default null) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not mat_is_admin() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if st not in ('pending','approved','rejected','hidden') then return jsonb_build_object('ok', false, 'code', 'bad_status'); end if;
  update mat_profiles set status = st, admin_note = left(note, 300), updated_at = now() where user_id = pid;
  return jsonb_build_object('ok', true);
end $$;

create or replace function mat_admin_reports() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not mat_is_admin() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  return jsonb_build_object('ok', true,
    'reports', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'reason', r.reason, 'detail', r.detail, 'created_at', r.created_at, 'status', r.status,
        'reporter', (select name from mat_profiles where user_id = r.reporter), 'reported_id', r.reported, 'reported', (select name from mat_profiles where user_id = r.reported)) order by r.id desc)
        from (select * from mat_reports order by id desc limit 100) r), '[]'::jsonb),
    'violations', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'user_id', v.user_id, 'name', (select name from mat_profiles where user_id = v.user_id),
        'kind', v.kind, 'sample', v.sample, 'created_at', v.created_at) order by v.id desc)
        from (select * from mat_violations order by id desc limit 100) v), '[]'::jsonb));
end $$;

create or replace function mat_admin_resolve_report(rid bigint) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not mat_is_admin() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  update mat_reports set status = 'closed' where id = rid;
  return jsonb_build_object('ok', true);
end $$;

create or replace function mat_admin_set_chat_ban(pid uuid, banned boolean) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not mat_is_admin() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  update mat_profiles set chat_banned = banned, chat_strikes = case when banned then chat_strikes else 0 end where user_id = pid;
  return jsonb_build_object('ok', true);
end $$;

create or replace function mat_admin_stats() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not mat_is_admin() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  return jsonb_build_object('ok', true,
    'pending', (select count(*) from mat_profiles where status = 'pending'), 'approved', (select count(*) from mat_profiles where status = 'approved'),
    'men', (select count(*) from mat_profiles where status = 'approved' and gender = 'M'), 'women', (select count(*) from mat_profiles where status = 'approved' and gender = 'F'),
    'unlocks', (select count(*) from mat_unlocks), 'revenue_paise', (select coalesce(sum(amount_paise), 0) from mat_unlocks),
    'open_reports', (select count(*) from mat_reports where status = 'open'));
end $$;

-- public numbers for the home page (no login needed, no personal data)
create or replace function mat_public_stats() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('members', (select count(*) from mat_profiles where status = 'approved'),
    'devanga', (select count(*) from mat_profiles where status = 'approved' and community = 'kannada_devanga'));
$$;

-- hide / show my own profile (only an approved profile can be hidden and shown again)
create or replace function mat_set_visibility(hide boolean) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'not_logged_in'); end if;
  update mat_profiles set status = case when hide and status = 'approved' then 'hidden' when not hide and status = 'hidden' then 'approved' else status end,
         updated_at = now() where user_id = auth.uid();
  return jsonb_build_object('ok', true, 'status', (select status from mat_profiles where user_id = auth.uid()));
end $$;

-- small counters for the menu badges
create or replace function mat_counts() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'interests_in', (select count(*) from mat_interests where to_user = auth.uid() and status = 'pending'),
    'unread', (select count(*) from mat_messages where sender <> auth.uid() and (user_a = auth.uid() or user_b = auth.uid()) and read_at is null),
    'shortlist', (select count(*) from mat_shortlist where user_id = auth.uid()),
    'status', (select status from mat_profiles where user_id = auth.uid()));
$$;

-- ---------- who may call what ----------
do $$ declare r record; begin
  for r in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname like 'mat\_%' loop
    execute format('revoke all on function %s from public, anon', r.sig);
    if r.proname in ('mat_record_unlock') then
      begin execute format('revoke all on function %s from authenticated', r.sig); execute format('grant execute on function %s to service_role', r.sig); exception when others then null; end;
    elsif r.proname = 'mat_public_stats' then
      execute format('grant execute on function %s to anon, authenticated', r.sig);
    else
      execute format('grant execute on function %s to authenticated', r.sig);
    end if;
  end loop;
end $$;

-- ---------- photo storage (private bucket; skipped automatically if Storage is not enabled) ----------
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('mat-photos', 'mat-photos', false) on conflict (id) do nothing;
    execute 'drop policy if exists mat_photos_read on storage.objects';
    execute 'drop policy if exists mat_photos_write on storage.objects';
    execute 'drop policy if exists mat_photos_update on storage.objects';
    execute 'drop policy if exists mat_photos_delete on storage.objects';
    execute $p$create policy mat_photos_read on storage.objects for select to authenticated using (bucket_id = 'mat-photos')$p$;
    execute $p$create policy mat_photos_write on storage.objects for insert to authenticated with check (bucket_id = 'mat-photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy mat_photos_update on storage.objects for update to authenticated using (bucket_id = 'mat-photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy mat_photos_delete on storage.objects for delete to authenticated using (bucket_id = 'mat-photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  end if;
end $$;

-- ---------- make yourself the admin (replace the e-mail, run separately AFTER you have registered once) ----------
-- insert into mat_admins (user_id) select id from auth.users where email = 'YOUR_EMAIL_HERE' on conflict do nothing;

-- let the API see the new functions immediately
notify pgrst, 'reload schema';
