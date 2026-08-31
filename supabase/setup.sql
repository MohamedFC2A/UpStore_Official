create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  display_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  wallet_balance numeric(12, 2) not null default 0,
  referral_code text unique,
  referred_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists role text not null default 'customer';
alter table public.profiles add column if not exists wallet_balance numeric(12, 2) not null default 0;
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles (id) on delete set null;
alter table public.profiles add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.profiles add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.profiles add column if not exists strike_count integer not null default 0;
alter table public.profiles add column if not exists strikes_history jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists is_banned boolean default false;
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists is_phone_blacklisted boolean default false;
alter table public.profiles add column if not exists last_device_info jsonb default '{}'::jsonb;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null default 'Subscriptions',
  market_price numeric(12, 2) not null default 0,
  our_price numeric(12, 2) not null default 0,
  rating numeric(3, 2) not null default 0,
  reviews integer not null default 0,
  stock integer not null default 0,
  max_stock integer not null default 0,
  brand_color text,
  icon_name text,
  sale_ends_in integer,
  image_url text,
  description text,
  advantages jsonb default '[]'::jsonb,
  price_egp numeric(12, 2) not null default 0,
  price_sar numeric(12, 2) not null default 0,
  sold_count integer not null default 0,
  warranty_duration text default '30 Days',
  delivery_time text default 'Instant',
  subscription_duration text default '1 Month',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.products add column if not exists slug text;
alter table public.products add column if not exists name text;
alter table public.products add column if not exists category text not null default 'Subscriptions';
alter table public.products add column if not exists market_price numeric(12, 2) not null default 0;
alter table public.products add column if not exists our_price numeric(12, 2) not null default 0;
alter table public.products add column if not exists rating numeric(3, 2) not null default 0;
alter table public.products add column if not exists reviews integer not null default 0;
alter table public.products add column if not exists stock integer not null default 0;
alter table public.products add column if not exists max_stock integer not null default 0;
alter table public.products add column if not exists brand_color text;
alter table public.products add column if not exists icon_name text;
alter table public.products add column if not exists sale_ends_in integer;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists advantages jsonb default '[]'::jsonb;
alter table public.products add column if not exists price_egp numeric(12, 2) not null default 0;
alter table public.products add column if not exists price_sar numeric(12, 2) not null default 0;
alter table public.products add column if not exists sold_count integer not null default 0;
alter table public.products add column if not exists warranty_duration text default '30 Days';
alter table public.products add column if not exists delivery_time text default 'Instant';
alter table public.products add column if not exists subscription_duration text default '1 Month';
alter table public.products add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.products add column if not exists updated_at timestamptz not null default timezone('utc', now());

create unique index if not exists products_slug_key on public.products (slug);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  amount numeric(12, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'completed', 'fulfilled', 'cancelled')),
  product_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.orders add column if not exists user_id uuid references public.profiles (id) on delete cascade;
alter table public.orders add column if not exists product_id uuid references public.products (id) on delete set null;
alter table public.orders add column if not exists amount numeric(12, 2) not null default 0;
alter table public.orders add column if not exists status text not null default 'pending';
alter table public.orders add column if not exists product_key text;
alter table public.orders add column if not exists client_telemetry jsonb default '{}'::jsonb;
alter table public.orders add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.orders add column if not exists updated_at timestamptz not null default timezone('utc', now());

create index if not exists orders_user_id_created_at_idx on public.orders (user_id, created_at desc);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  amount numeric(12, 2) not null,
  type text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.transactions add column if not exists user_id uuid references public.profiles (id) on delete cascade;
alter table public.transactions add column if not exists label text;
alter table public.transactions add column if not exists amount numeric(12, 2) not null default 0;
alter table public.transactions add column if not exists type text not null default 'debit_order';
alter table public.transactions add column if not exists created_at timestamptz not null default timezone('utc', now());

create index if not exists transactions_user_id_created_at_idx on public.transactions (user_id, created_at desc);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.handle_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.handle_updated_at();

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
before update on public.site_settings
for each row
execute function public.handle_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = coalesce(user_id, auth.uid())
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_admin(uuid) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  display_name_value text;
  pending_referral_code text;
  referrer_id uuid;
  referral_seed text;
  generated_referral_code text;
  computed_role text;
begin
  normalized_email := lower(coalesce(new.email, ''));
  display_name_value := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    split_part(coalesce(new.email, 'User'), '@', 1),
    'User'
  );
  pending_referral_code := upper(coalesce(new.raw_user_meta_data ->> 'pending_referral_code', ''));

  if pending_referral_code <> '' then
    select id
      into referrer_id
    from public.profiles
    where referral_code = pending_referral_code
      and id <> new.id
    limit 1;
  end if;

  referral_seed := regexp_replace(upper(display_name_value), '[^A-Z0-9]', '', 'g');
  if referral_seed = '' then
    referral_seed := 'USER';
  end if;
  generated_referral_code := left(referral_seed, 8) || left(replace(new.id::text, '-', ''), 6);

  computed_role := 'customer';

  insert into public.profiles (
    id,
    email,
    display_name,
    role,
    wallet_balance,
    referral_code,
    referred_by
  )
  values (
    new.id,
    nullif(normalized_email, ''),
    display_name_value,
    computed_role,
    0,
    generated_referral_code,
    referrer_id
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        role = case
          when public.profiles.role = 'admin' or excluded.role = 'admin' then 'admin'
          else public.profiles.role
        end,
        referral_code = coalesce(public.profiles.referral_code, excluded.referral_code),
        referred_by = coalesce(public.profiles.referred_by, excluded.referred_by);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (
  id,
  email,
  display_name,
  role,
  wallet_balance,
  referral_code
)
select
  u.id,
  nullif(lower(u.email), ''),
  coalesce(
    u.raw_user_meta_data ->> 'display_name',
    u.raw_user_meta_data ->> 'full_name',
    split_part(coalesce(u.email, 'User'), '@', 1),
    'User'
  ),
  'customer',
  0,
  left(
    coalesce(
      nullif(regexp_replace(upper(coalesce(u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, 'USER'), '@', 1))), '[^A-Z0-9]', '', 'g'), ''),
      'USER'
    ),
    8
  ) || left(replace(u.id::text, '-', ''), 6)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.transactions enable row level security;
alter table public.site_settings enable row level security;

-- ==========================================
-- Drop legacy recursive policies before creating the safe versions below.
-- ==========================================

drop policy if exists "Admin full access profiles" on public.profiles;
drop policy if exists "Admin full access products" on public.products;
drop policy if exists "Admin full access orders" on public.orders;
drop policy if exists "Admin full access transactions" on public.transactions;

-- ==========================================
-- Cart and Notifications
-- ==========================================

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(user_id, product_id)
);

alter table public.cart_items enable row level security;

drop policy if exists "Users can view own cart items" on public.cart_items;
create policy "Users can view own cart items" on public.cart_items for select using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert own cart items" on public.cart_items;
create policy "Users can insert own cart items" on public.cart_items for insert with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own cart items" on public.cart_items;
create policy "Users can update own cart items" on public.cart_items for update using ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own cart items" on public.cart_items;
create policy "Users can delete own cart items" on public.cart_items for delete using ((select auth.uid()) = user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications" on public.notifications for select using ((select auth.uid()) = user_id);
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" on public.notifications for update using ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications" on public.notifications for delete using ((select auth.uid()) = user_id);
drop policy if exists "System can insert notifications" on public.notifications;
create policy "System can insert notifications" on public.notifications for insert with check (true);

create or replace function public.increment_product_sold_count(row_id uuid)
returns void as $$
begin
  update public.products
  set sold_count = sold_count + 1
  where id = row_id;
end;
$$ language plpgsql security definer;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists profiles_admin_manage on public.profiles;
create policy profiles_admin_manage
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists products_read_public on public.products;
create policy products_read_public
on public.products
for select
to anon, authenticated
using (true);

drop policy if exists products_admin_manage on public.products;
create policy products_admin_manage
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists orders_read_own on public.orders;
create policy orders_read_own
on public.orders
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own
on public.orders
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists orders_admin_manage on public.orders;
create policy orders_admin_manage
on public.orders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists transactions_read_own on public.transactions;
create policy transactions_read_own
on public.transactions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own
on public.transactions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists transactions_admin_manage on public.transactions;
create policy transactions_admin_manage
on public.transactions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists site_settings_read_public on public.site_settings;
create policy site_settings_read_public
on public.site_settings
for select
to anon, authenticated
using (true);

drop policy if exists site_settings_admin_manage on public.site_settings;
create policy site_settings_admin_manage
on public.site_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.site_settings (key, value)
values
  ('announcement_text', to_jsonb(''::text)),
  ('referral_bonus', to_jsonb(5.00)),
  ('maintenance_mode', to_jsonb(false))
on conflict (key) do nothing;

-- ==========================================
-- Fixed Currency Conversion (EGP = USD * 53, SAR = USD * 4)
-- ==========================================

create or replace function public.products_calculate_prices()
returns trigger
language plpgsql
security definer
as $$
begin
  new.price_egp = coalesce(new.our_price, 0) * 53;
  new.price_sar = coalesce(new.our_price, 0) * 4;
  return new;
end;
$$;

drop trigger if exists products_calc_prices on public.products;
create trigger products_calc_prices
before insert or update on public.products
for each row
execute function public.products_calculate_prices();

-- ==========================================
-- Extended schema used by the application
-- ==========================================

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists referral_applied_code text;
alter table public.profiles add column if not exists referral_locked_at timestamptz;

alter table public.products add column if not exists delivery_mode text not null default 'key';
alter table public.products add column if not exists zelenka_api_key text;
alter table public.products add column if not exists zelenka_product_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_delivery_mode_check'
  ) then
    alter table public.products
      add constraint products_delivery_mode_check
      check (delivery_mode in ('key', 'pre_assigned', 'zelenka_api'));
  end if;
end;
$$;

alter table public.orders add column if not exists session_id text;
create index if not exists orders_session_id_idx on public.orders (session_id);

alter table public.transactions add column if not exists status text not null default 'completed';
alter table public.transactions add column if not exists reference_id text;
create index if not exists transactions_reference_id_idx on public.transactions (reference_id);

create table if not exists public.product_credentials (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  credentials_text text not null,
  is_sold boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.product_credentials enable row level security;

drop trigger if exists product_credentials_set_updated_at on public.product_credentials;
create trigger product_credentials_set_updated_at
before update on public.product_credentials
for each row
execute function public.handle_updated_at();

drop policy if exists product_credentials_admin_manage on public.product_credentials;
create policy product_credentials_admin_manage
on public.product_credentials
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists product_credentials_product_unsold_idx
  on public.product_credentials (product_id, is_sold, created_at);

create or replace function public.increment_product_sold_count(
  row_id uuid,
  sold_units integer default 1
)
returns void as $$
declare
  safe_units integer;
begin
  safe_units := greatest(coalesce(sold_units, 1), 1);

  update public.products
  set sold_count = coalesce(sold_count, 0) + safe_units,
      reviews = coalesce(reviews, 0) + safe_units
  where id = row_id;
end;
$$ language plpgsql security definer;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  display_name_value text;
  pending_referral_code text;
  referrer_id uuid := null;
  referrer_applied_code text := null;
  referral_seed text;
  generated_referral_code text;
  computed_role text;
begin
  normalized_email := lower(coalesce(new.email, ''));
  display_name_value := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    split_part(coalesce(new.email, 'User'), '@', 1),
    'User'
  );
  pending_referral_code := upper(coalesce(new.raw_user_meta_data ->> 'pending_referral_code', ''));

  if pending_referral_code <> '' then
    select id, referral_code
      into referrer_id, referrer_applied_code
    from public.profiles
    where referral_code = pending_referral_code
      and id <> new.id
    limit 1;
  end if;

  referral_seed := regexp_replace(upper(display_name_value), '[^A-Z0-9]', '', 'g');
  if referral_seed = '' then
    referral_seed := 'USER';
  end if;
  generated_referral_code := left(referral_seed, 8) || left(replace(new.id::text, '-', ''), 6);

  computed_role := 'customer';

  insert into public.profiles (
    id,
    email,
    display_name,
    role,
    wallet_balance,
    referral_code,
    referred_by,
    referral_applied_code,
    referral_locked_at
  )
  values (
    new.id,
    nullif(normalized_email, ''),
    display_name_value,
    computed_role,
    0,
    generated_referral_code,
    referrer_id,
    referrer_applied_code,
    case when referrer_id is not null then timezone('utc', now()) else null end
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        role = case
          when public.profiles.role = 'admin' or excluded.role = 'admin' then 'admin'
          else public.profiles.role
        end,
        referral_code = coalesce(public.profiles.referral_code, excluded.referral_code),
        referred_by = coalesce(public.profiles.referred_by, excluded.referred_by),
        referral_applied_code = coalesce(public.profiles.referral_applied_code, excluded.referral_applied_code),
        referral_locked_at = coalesce(public.profiles.referral_locked_at, excluded.referral_locked_at);

  return new;
end;
$$;

update public.profiles p
set referral_applied_code = ref.referral_code,
    referral_locked_at = coalesce(p.referral_locked_at, p.created_at, timezone('utc', now()))
from public.profiles ref
where p.referred_by = ref.id
  and p.referral_applied_code is null;

-- ==========================================
-- Security & Concurrency RPCs
-- ==========================================

create or replace function public.increment_wallet_balance(user_id uuid, amount numeric)
returns void as $$
begin
  update public.profiles
  set wallet_balance = wallet_balance + amount
  where id = user_id;
end;
$$ language plpgsql security definer;

create or replace function public.consume_product_credential(p_product_id uuid, p_order_id uuid)
returns text as $$
declare
  cred_id uuid;
  cred_text text;
begin
  select id, credentials_text into cred_id, cred_text
  from public.product_credentials
  where product_id = p_product_id and is_sold = false
  limit 1
  for update skip locked;

  if cred_id is not null then
    update public.product_credentials
    set is_sold = true, order_id = p_order_id, updated_at = timezone('utc', now())
    where id = cred_id;
    return cred_text;
  end if;

  return null;
end;
$$ language plpgsql security definer;

create or replace function public.decrement_product_stock(p_product_id uuid, qty integer default 1)
returns void as $$
begin
  update public.products
  set stock = greatest(stock - qty, 0)
  where id = p_product_id;
end;
$$ language plpgsql security definer;

create or replace function public.get_referrer_by_code(code text)
returns table(id uuid, referral_code text, display_name text, email text)
language sql stable security definer set search_path = public as $$
  select id, referral_code, display_name, email
  from public.profiles
  where referral_code = code
  limit 1;
$$;
grant execute on function public.get_referrer_by_code(text) to anon, authenticated;

-- Protect zelenka api keys from public visibility
REVOKE SELECT (zelenka_api_key) ON public.products FROM PUBLIC, anon, authenticated;
REVOKE SELECT (zelenka_product_id) ON public.products FROM PUBLIC, anon, authenticated;

-- Create changelogs table
create table if not exists public.changelogs (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text not null,
  description text not null,
  category text not null default 'feature' check (category in ('feature', 'fix', 'improvement', 'announcement')),
  features text[] not null default '{}'::text[],
  fixes text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now())
);

-- Enable RLS
alter table public.changelogs enable row level security;

-- Policies for public.changelogs
drop policy if exists "Changelogs are viewable by everyone" on public.changelogs;
create policy "Changelogs are viewable by everyone" on public.changelogs
  for select using (true);

drop policy if exists "Changelogs are manageable by admins" on public.changelogs;
create policy "Changelogs are manageable by admins" on public.changelogs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ==========================================
-- Product Variants & Packages Extension (v3)
-- ==========================================

-- 1. Create product_variants table
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  name_ar text,
  image_url text,
  market_price numeric(12, 2) not null default 0,
  our_price numeric(12, 2) not null default 0,
  price_egp numeric(12, 2) not null default 0,
  price_sar numeric(12, 2) not null default 0,
  subscription_duration text default '1 Month',
  quality text,
  stock integer not null default 0,
  max_stock integer not null default 0,
  status text not null default 'active',
  sort_order integer not null default 0,
  zelenka_product_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 2. Trigger function for auto converting variant prices
create or replace function public.product_variants_calculate_prices()
returns trigger
language plpgsql
security definer
as $$
begin
  new.price_egp = coalesce(new.our_price, 0) * 53;
  new.price_sar = coalesce(new.our_price, 0) * 4;
  return new;
end;
$$;

drop trigger if exists product_variants_calc_prices on public.product_variants;
create trigger product_variants_calc_prices
before insert or update on public.product_variants
for each row
execute function public.product_variants_calculate_prices();

-- 3. RLS for product_variants
alter table public.product_variants enable row level security;

drop policy if exists product_variants_read_public on public.product_variants;
create policy product_variants_read_public
on public.product_variants
for select
to anon, authenticated
using (true);

drop policy if exists product_variants_admin_manage on public.product_variants;
create policy product_variants_admin_manage
on public.product_variants
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 4. Alter referencing tables
alter table public.orders add column if not exists variant_id uuid references public.product_variants (id) on delete set null;
alter table public.cart_items add column if not exists variant_id uuid references public.product_variants (id) on delete cascade;
alter table public.product_credentials add column if not exists variant_id uuid references public.product_variants (id) on delete cascade;

-- 5. Drop old unique constraint on cart_items and add new expression index
alter table public.cart_items drop constraint if exists cart_items_user_id_product_id_key;

create unique index if not exists cart_items_user_id_product_id_variant_id_idx 
on public.cart_items (user_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'));

-- 6. Recreate consume_product_credential function supporting variant_id
create or replace function public.consume_product_credential(p_product_id uuid, p_order_id uuid, p_variant_id uuid default null)
returns text as $$
declare
  cred_id uuid;
  cred_text text;
begin
  if p_variant_id is not null then
    select id, credentials_text into cred_id, cred_text
    from public.product_credentials
    where product_id = p_product_id and variant_id = p_variant_id and is_sold = false
    limit 1
    for update skip locked;
  else
    select id, credentials_text into cred_id, cred_text
    from public.product_credentials
    where product_id = p_product_id and variant_id is null and is_sold = false
    limit 1
    for update skip locked;
  end if;

  -- Fallback: if variant specific credential is not found, check if general credential exists
  if cred_id is null and p_variant_id is not null then
    select id, credentials_text into cred_id, cred_text
    from public.product_credentials
    where product_id = p_product_id and variant_id is null and is_sold = false
    limit 1
    for update skip locked;
  end if;

  if cred_id is not null then
    update public.product_credentials
    set is_sold = true, order_id = p_order_id, updated_at = timezone('utc', now())
    where id = cred_id;
    return cred_text;
  end if;

  return null;
end;
$$ language plpgsql security definer;

-- 7. Create decrement_product_variant_stock function that also syncs parent product stock
create or replace function public.decrement_product_variant_stock(p_variant_id uuid, qty integer default 1)
returns void as $$
declare
  v_product_id uuid;
begin
  -- Decrement variant stock
  update public.product_variants
  set stock = greatest(stock - qty, 0)
  where id = p_variant_id
  returning product_id into v_product_id;

  -- Sync parent product stock as sum of active variants
  if v_product_id is not null then
    update public.products
    set stock = (
      select coalesce(sum(stock), 0)
      from public.product_variants
      where product_id = v_product_id and status = 'active'
    )
    where id = v_product_id;
  end if;
end;
$$ language plpgsql security definer;

-- ==========================================
-- Hyper-Adaptive AI User Behavioral Telemetry (v4)
-- ==========================================

create table if not exists public.user_behavioral_telemetry (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid references public.profiles (id) on delete set null,
  user_email text,
  display_name text,
  persona text not null default 'balanced',
  persona_confidence numeric(5, 2) not null default 100.00,
  profile_completeness numeric(5, 2) not null default 10.00,
  cognitive_load integer not null default 0,
  confusion_score integer not null default 0,
  hesitation_level text not null default 'none',
  price_sensitivity text not null default 'medium',
  top_category text default 'Subscriptions',
  category_dwell_times jsonb default '{}'::jsonb,
  viewed_slugs jsonb default '[]'::jsonb,
  search_history jsonb default '[]'::jsonb,
  cart_actions jsonb default '[]'::jsonb,
  rage_clicks_count integer not null default 0,
  device_info jsonb default '{}'::jsonb,
  ai_report jsonb default null,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists user_behavioral_telemetry_session_unique on public.user_behavioral_telemetry (session_id);
create index if not exists user_behavioral_telemetry_user_id_idx on public.user_behavioral_telemetry (user_id);
create index if not exists user_behavioral_telemetry_last_seen_at_idx on public.user_behavioral_telemetry (last_seen_at desc);

alter table public.user_behavioral_telemetry enable row level security;

drop policy if exists "Public and users can insert telemetry" on public.user_behavioral_telemetry;
create policy "Public and users can insert telemetry" on public.user_behavioral_telemetry
  for insert with check (true);

drop policy if exists "Users can update own session telemetry" on public.user_behavioral_telemetry;
create policy "Users can update own session telemetry" on public.user_behavioral_telemetry
  for update using (true) with check (true);

drop policy if exists "Admin full access user_behavioral_telemetry" on public.user_behavioral_telemetry;
create policy "Admin full access user_behavioral_telemetry" on public.user_behavioral_telemetry
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ==========================================
-- Smart 3-Friends Referral & Anti-Fraud Engine (v5)
-- ==========================================

create table if not exists public.referral_logs (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referred_user_id uuid not null unique references public.profiles (id) on delete cascade,
  referral_code text not null,
  status text not null default 'verified' check (status in ('pending', 'verified', 'flagged_fraud', 'rewarded', 'rejected')),
  ip_address text,
  device_fingerprint text,
  fraud_score numeric(5, 2) default 0,
  fraud_reason text,
  reward_batch_number integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists referral_logs_referrer_idx on public.referral_logs (referrer_id, status);
create index if not exists referral_logs_referred_user_idx on public.referral_logs (referred_user_id);
create index if not exists referral_logs_ip_idx on public.referral_logs (ip_address);
create index if not exists referral_logs_fingerprint_idx on public.referral_logs (device_fingerprint);

alter table public.referral_logs enable row level security;

drop policy if exists "Users can view own referral logs" on public.referral_logs;
create policy "Users can view own referral logs" on public.referral_logs
  for select to authenticated
  using ((select auth.uid()) = referrer_id);

drop policy if exists "Admin full access referral logs" on public.referral_logs;
create policy "Admin full access referral logs" on public.referral_logs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Upsert site settings for 3-friend milestone defaults
insert into public.site_settings (key, value)
values
  ('referral_reward_per_batch', to_jsonb(1.00)),
  ('referral_batch_size', to_jsonb(3))
on conflict (key) do update set value = excluded.value;

-- ==========================================
-- Visitor Devices & Single-Alert Deduplication Engine (v6)
-- ==========================================

create table if not exists public.visitor_devices (
  device_hash text primary key,
  device_model text,
  device_type text default 'Mobile',
  os text,
  browser text,
  ip_address text,
  country text,
  city text,
  screen_resolution text,
  first_seen_at timestamptz not null default timezone('utc', now()),
  metadata jsonb default '{}'::jsonb
);

create index if not exists visitor_devices_ip_idx on public.visitor_devices (ip_address);
create index if not exists visitor_devices_first_seen_at_idx on public.visitor_devices (first_seen_at desc);

alter table public.visitor_devices enable row level security;

drop policy if exists "Admin full access visitor_devices" on public.visitor_devices;
create policy "Admin full access visitor_devices" on public.visitor_devices
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Public insert visitor_devices" on public.visitor_devices;
create policy "Public insert visitor_devices" on public.visitor_devices
  for insert with check (true);

-- ==========================================
-- High-Performance Database Indexes & Foreign Key Tuning (v7)
-- ==========================================

-- 1. Profiles & Authorization
create index if not exists profiles_referred_by_idx on public.profiles (referred_by);
create index if not exists profiles_role_is_banned_idx on public.profiles (role, is_banned);

-- 2. Products Catalog & Sales
create index if not exists products_category_created_at_idx on public.products (category, created_at desc);
create index if not exists products_sold_count_idx on public.products (sold_count desc);
create index if not exists products_is_flash_deal_idx on public.products (is_flash_deal) where is_flash_deal = true;

-- 3. Product Variants
create index if not exists product_variants_product_id_status_sort_idx on public.product_variants (product_id, status, sort_order);

-- 4. Orders & Fulfillment
create index if not exists orders_product_id_idx on public.orders (product_id);
create index if not exists orders_variant_id_idx on public.orders (variant_id);
create index if not exists orders_status_created_at_idx on public.orders (status, created_at desc);

-- 5. Cart Items
create index if not exists cart_items_product_id_idx on public.cart_items (product_id);
create index if not exists cart_items_variant_id_idx on public.cart_items (variant_id);

-- 6. Notifications
create index if not exists notifications_user_id_is_read_created_at_idx on public.notifications (user_id, is_read, created_at desc);

-- 7. Product Credentials Inventory Locking
create index if not exists product_credentials_order_id_idx on public.product_credentials (order_id);
create index if not exists product_credentials_variant_unsold_idx on public.product_credentials (product_id, variant_id, is_sold);

-- 8. Changelogs
create index if not exists changelogs_created_at_idx on public.changelogs (created_at desc);
create index if not exists changelogs_category_idx on public.changelogs (category);



