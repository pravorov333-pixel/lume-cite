-- ============================================================
-- LUME VISUALS — schema: accounts, friends, marketplace, orders
-- Run this once in the Supabase SQL editor of your project.
-- ============================================================

-- ===== profiles =====
-- One row per registered user, created automatically on signup.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when someone signs up.
-- Username comes from the "username" field passed at signup (see js/auth.js).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ===== friend requests / friendships =====
create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (sender_id, receiver_id),
  check (sender_id <> receiver_id)
);

alter table public.friend_requests enable row level security;

create policy "see requests you sent or received"
  on public.friend_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "send a friend request"
  on public.friend_requests for insert
  with check (auth.uid() = sender_id);

create policy "respond to a request you received"
  on public.friend_requests for update
  using (auth.uid() = receiver_id)
  with check (status in ('accepted', 'declined') and receiver_id = auth.uid() and sender_id <> auth.uid());

create policy "cancel a request you sent"
  on public.friend_requests for delete
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- ===== marketplace listings =====
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('particles', 'configs')),
  title text not null check (char_length(title) between 3 and 80),
  description text check (char_length(description) <= 1000),
  price_usdt numeric(10, 2) not null check (price_usdt > 0),
  file_path text not null,       -- path inside the "listing-files" storage bucket
  preview_path text,             -- optional path inside the "listing-previews" bucket
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.listings enable row level security;

create policy "approved listings are public"
  on public.listings for select
  using (status = 'approved' or seller_id = auth.uid());

create policy "sellers create their own listings"
  on public.listings for insert
  with check (auth.uid() = seller_id);

create policy "sellers edit their own pending/rejected listings"
  on public.listings for update
  using (auth.uid() = seller_id and status <> 'approved');

create policy "sellers delete their own listings"
  on public.listings for delete
  using (auth.uid() = seller_id);

create policy "admins moderate any listing"
  on public.listings for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ===== orders (crypto payments) =====
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount_usdt numeric(10, 2) not null,
  payment_wallet text not null,
  tx_hash text,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'submitted', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table public.orders enable row level security;

create policy "buyers and sellers see their own orders"
  on public.orders for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "buyers create an order"
  on public.orders for insert
  with check (auth.uid() = buyer_id);

-- Buyers may only flip status to 'submitted' and attach a tx hash — the
-- amount is re-checked against the listing's current price so a tampered
-- request (e.g. a raw API call with a lower amount_usdt) is rejected.
-- Admins must still verify the on-chain amount before confirming (see README).
create policy "buyers submit their tx hash"
  on public.orders for update
  using (auth.uid() = buyer_id and status = 'awaiting_payment')
  with check (
    status = 'submitted'
    and buyer_id = auth.uid()
    and amount_usdt = (select price_usdt from public.listings where id = listing_id)
  );

create policy "admins confirm or reject orders"
  on public.orders for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ===== storage buckets =====
-- Run in the Supabase dashboard (Storage) or via SQL below:
insert into storage.buckets (id, name, public)
values ('listing-previews', 'listing-previews', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('listing-files', 'listing-files', false)
on conflict (id) do nothing;

-- Anyone can view preview images; only the buyer/seller (via app logic) can download files.
create policy "previews are public"
  on storage.objects for select
  using (bucket_id = 'listing-previews');

create policy "sellers upload their own previews"
  on storage.objects for insert
  with check (bucket_id = 'listing-previews' and owner = auth.uid());

create policy "sellers upload their own files"
  on storage.objects for insert
  with check (bucket_id = 'listing-files' and owner = auth.uid());

create policy "sellers read their own uploaded files"
  on storage.objects for select
  using (bucket_id = 'listing-files' and owner = auth.uid());

create policy "buyers download files they purchased"
  on storage.objects for select
  using (
    bucket_id = 'listing-files'
    and exists (
      select 1 from public.orders o
      join public.listings l on l.id = o.listing_id
      where l.file_path = storage.objects.name
        and o.buyer_id = auth.uid()
        and o.status = 'confirmed'
    )
  );
