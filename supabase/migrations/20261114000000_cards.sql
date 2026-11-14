begin;
create table public.study_cards (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  source_message_id text not null,
  native_language text not null,
  target_language text not null,
  original_text text not null,
  corrected_text text not null,
  focus text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.study_cards enable row level security;
revoke all on public.study_cards from anon, authenticated;
grant select, insert, update, delete on public.study_cards to authenticated;
create policy study_cards_own on public.study_cards for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
commit;
