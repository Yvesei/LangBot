begin;

create table if not exists public.app_settings (
  id text primary key default 'default',
  guest_message_limit integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  native_language text,
  target_language text,
  ui_language text not null default 'en',
  ui_theme text not null default 'neo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists native_language text;
alter table public.profiles add column if not exists target_language text;

-- Earlier table-only drafts omitted defaults and required-column constraints.
alter table public.app_settings
  alter column id set default 'default',
  alter column guest_message_limit set default 5,
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.app_settings
set guest_message_limit = coalesce(guest_message_limit, 5),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now())
where guest_message_limit is null or created_at is null or updated_at is null;

alter table public.app_settings
  alter column guest_message_limit set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.profiles
  alter column ui_language set default 'en',
  alter column ui_theme set default 'neo',
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.profiles
set ui_language = coalesce(ui_language, 'en'),
    ui_theme = coalesce(ui_theme, 'neo'),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now())
where ui_language is null or ui_theme is null or created_at is null or updated_at is null;

alter table public.profiles
  alter column ui_language set not null,
  alter column ui_theme set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

insert into public.app_settings (id) values ('default') on conflict (id) do nothing;

alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;

revoke all on public.app_settings, public.profiles from anon, authenticated;
grant select on public.app_settings to anon, authenticated;
grant select (id, native_language, target_language, ui_theme, updated_at)
  on public.profiles to authenticated;
grant insert (id, native_language, target_language, ui_theme, updated_at)
  on public.profiles to authenticated;
grant update (id, native_language, target_language, ui_theme, updated_at)
  on public.profiles to authenticated;

drop policy if exists app_settings_read_default on public.app_settings;
create policy app_settings_read_default on public.app_settings
  for select to anon, authenticated using (id = 'default');

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

commit;
