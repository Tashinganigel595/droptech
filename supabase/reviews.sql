create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null check (char_length(product_id) between 1 and 100),
  rating smallint not null check (rating between 1 and 5),
  display_name text not null default 'Campus shopper' check (char_length(display_name) between 1 and 60),
  review_text text not null check (char_length(review_text) between 10 and 500),
  created_at timestamptz not null default now()
);

create index if not exists product_reviews_product_created_idx
  on public.product_reviews (product_id, created_at desc);

alter table public.product_reviews enable row level security;

grant usage on schema public to anon;
grant select, insert on table public.product_reviews to anon;

drop policy if exists "Anyone can read product reviews" on public.product_reviews;
create policy "Anyone can read product reviews"
  on public.product_reviews for select to anon
  using (true);

drop policy if exists "Anyone can submit product reviews" on public.product_reviews;
create policy "Anyone can submit product reviews"
  on public.product_reviews for insert to anon
  with check (
    rating between 1 and 5
    and char_length(product_id) between 1 and 100
    and char_length(display_name) between 1 and 60
    and char_length(review_text) between 10 and 500
  );
