-- ============================================================
-- PDF/Video Tools — Supabase schema
-- இதை Supabase Dashboard → SQL Editor-ல் paste செய்து Run செய்யவும்.
-- ============================================================

-- 1) ஒவ்வொரு user-க்கும் ஒரு profile (Supabase auth.users-உடன் இணைக்கப்படும்)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  plan text not null default 'free',          -- 'free' | 'pro' | 'business'
  plan_expires_at timestamptz,                  -- subscription எப்போது முடியும்
  credits integer not null default 5,           -- free tier-க்கு ஆரம்ப credits
  created_at timestamptz not null default now()
);

-- புதிய user sign-up ஆனவுடன் தானாக ஒரு profile row உருவாக்க trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, credits)
  values (new.id, new.email, 5); -- புதிய user-க்கு 5 இலவச credits
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2) Credit பயன்பாட்டு வரலாறு (எந்த tool, எத்தனை credits, எப்போது)
create table if not exists public.usage_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tool_id text not null,              -- எ.கா. 'videocompress', 'ocr'
  credits_used integer not null default 1,
  file_size_bytes bigint,
  status text not null default 'success',  -- 'success' | 'failed'
  created_at timestamptz not null default now()
);

-- 3) Payment transactions (Razorpay-லிருந்து webhook மூலம் நிரப்பப்படும்)
create table if not exists public.transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  razorpay_order_id text,
  razorpay_payment_id text unique,
  amount_inr numeric(10,2) not null,
  credits_purchased integer,           -- one-time credit pack எனில்
  plan_purchased text,                 -- subscription எனில் 'pro' / 'business'
  status text not null default 'created', -- 'created' | 'paid' | 'failed'
  created_at timestamptz not null default now()
);

-- 4) Pricing plans reference table (frontend-ல் காட்ட)
create table if not exists public.pricing_plans (
  id text primary key,             -- 'credits_50', 'pro_monthly', etc.
  label text not null,
  label_ta text not null,
  amount_inr numeric(10,2) not null,
  credits integer,                 -- credit pack எனில்
  plan text,                       -- subscription plan எனில்
  duration_days integer,           -- subscription எனில்
  description_ta text
);

insert into public.pricing_plans (id, label, label_ta, amount_inr, credits, plan, duration_days, description_ta) values
  ('credits_20',  '20 Credits',   '20 கிரெடிட்ஸ்',        49,  20,  null, null, 'சிறிய தேவைகளுக்கு — ஒவ்வொரு heavy tool 1 credit'),
  ('credits_100', '100 Credits',  '100 கிரெடிட்ஸ்',       179, 100, null, null, 'அடிக்கடி பயன்படுத்துபவர்களுக்கு'),
  ('pro_monthly', 'Pro Monthly',  'ப்ரோ — மாதம்',         99,  null,'pro', 30,   'Unlimited tools + Fast Server Processing + No watermark'),
  ('pro_yearly',  'Pro Yearly',   'ப்ரோ — வருடம்',        799, null,'pro', 365,  '2 மாதம் இலவசம் — Unlimited tools + Fast Server'),
  ('business',    'Business',     'பிசினஸ்',              1999,null,'business', 30, 'API Access + Team seats + Priority queue')
on conflict (id) do nothing;

-- ============================================================
-- Row Level Security (RLS) — ஒவ்வொரு user தன் சொந்த data-ஐ மட்டுமே பார்க்க/மாற்ற முடியும்
-- ============================================================
alter table public.profiles enable row level security;
alter table public.usage_logs enable row level security;
alter table public.transactions enable row level security;
alter table public.pricing_plans enable row level security;

create policy "profiles: user can read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: user can update own display name" on public.profiles
  for update using (auth.uid() = id);

create policy "usage_logs: user can read own" on public.usage_logs
  for select using (auth.uid() = user_id);
-- NOTE: usage_logs-க்கு INSERT policy வேண்டாம் — backend server மட்டுமே
-- (service_role key மூலம், RLS-ஐ தாண்டி) credits deduct + log insert செய்யும்.
-- இதனால் ஒரு user client-side-ல் இருந்து தன் credits-ஐ ஏமாற்ற முடியாது.

create policy "transactions: user can read own" on public.transactions
  for select using (auth.uid() = user_id);

create policy "pricing_plans: everyone can read" on public.pricing_plans
  for select using (true);

-- ============================================================
-- Helper function: credits-ஐ atomic-ஆக (race-condition இல்லாமல்) கழிக்க
-- (backend server இதை service_role மூலம் அழைக்கும்)
-- ============================================================
create or replace function public.deduct_credits(p_user_id uuid, p_amount integer, p_tool_id text)
returns boolean as $$
declare
  current_credits integer;
  is_pro boolean;
begin
  select credits, (plan in ('pro','business') and (plan_expires_at is null or plan_expires_at > now()))
    into current_credits, is_pro
    from public.profiles where id = p_user_id for update;

  if is_pro then
    -- Pro/Business users-க்கு credits தேவையில்லை (unlimited)
    insert into public.usage_logs (user_id, tool_id, credits_used) values (p_user_id, p_tool_id, 0);
    return true;
  end if;

  if current_credits < p_amount then
    return false; -- போதுமான credits இல்லை
  end if;

  update public.profiles set credits = credits - p_amount where id = p_user_id;
  insert into public.usage_logs (user_id, tool_id, credits_used) values (p_user_id, p_tool_id, p_amount);
  return true;
end;
$$ language plpgsql security definer;
