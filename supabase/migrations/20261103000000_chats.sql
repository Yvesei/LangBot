begin;
create table public.conversations (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  native_language text not null,
  target_language text not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversation_languages_differ check (native_language <> target_language)
);
create table public.messages (
  id uuid primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  prompt text not null,
  reply text,
  correction jsonb,
  origin text not null default 'text',
  status text not null default 'pending',
  attempt_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_origin check (origin in ('text', 'voice')),
  constraint message_status check (status in ('pending', 'complete', 'failed'))
);
create index conversations_owner_recent on public.conversations (user_id, updated_at desc, id desc);
create index messages_recent on public.messages (conversation_id, created_at desc, id desc);
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
revoke all on public.conversations, public.messages from anon, authenticated;
grant select, insert, update, delete on public.conversations, public.messages to authenticated;
create policy conversations_own on public.conversations for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy messages_own on public.messages for all to authenticated
  using (exists (select 1 from public.conversations where id = conversation_id and user_id = (select auth.uid())))
  with check (exists (select 1 from public.conversations where id = conversation_id and user_id = (select auth.uid())));
commit;
