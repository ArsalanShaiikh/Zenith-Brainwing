-- Enquiries from the site's Enquire form (2026-11-18)
--
-- Until now the form only showed "We will be in touch shortly" and kept
-- nothing, so every lead typed in was lost. This table stores them.
--
-- Access:
--  * anon          INSERT only — a visitor can submit, never read anyone's.
--  * authenticated INSERT + SELECT — the /admin login can read the leads
--                  (and an admin browsing the site while signed in can still
--                  submit). No UPDATE/DELETE/TRUNCATE for either.
-- Additive only: creates one new table, touches nothing that exists.
-- Run once (the policies are not re-creatable without a drop).

begin;

create table if not exists public.enquiries (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 120),
  phone       text check (phone is null or char_length(phone) <= 40),
  email       text check (email is null or char_length(email) <= 200),
  config      text check (config is null or char_length(config) <= 60),
  visitor_id  uuid,
  constraint enquiries_contact check (phone is not null or email is not null)
);

alter table public.enquiries enable row level security;

revoke all on table public.enquiries from anon, authenticated;
grant insert on table public.enquiries to anon, authenticated;
grant select on table public.enquiries to authenticated;

create policy "visitors can submit enquiries"
  on public.enquiries for insert to anon, authenticated with check (true);

create policy "admins can read enquiries"
  on public.enquiries for select to authenticated using (true);

commit;
