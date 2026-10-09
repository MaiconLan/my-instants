-- My Instants v2 — schema Supabase
-- Rode no SQL Editor do projeto (uma vez).

create table public.sounds (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name        text not null check (char_length(name) between 1 and 80),
  file_path   text not null unique,           -- caminho no bucket "audios"
  color       text not null default '#2196F3', -- cor do card (hex)
  duration_ms integer,
  is_public   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index sounds_public_name_idx on public.sounds (is_public, name);
create index sounds_owner_idx on public.sounds (owner_id);

create table public.favorites (
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  sound_id   uuid not null references public.sounds(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, sound_id)
);

-- RLS --------------------------------------------------------------------
alter table public.sounds    enable row level security;
alter table public.favorites enable row level security;

-- Vê: áudios públicos ou os seus
create policy "sounds_select" on public.sounds
  for select to authenticated
  using (is_public or owner_id = auth.uid());

create policy "sounds_insert" on public.sounds
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "sounds_update" on public.sounds
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "sounds_delete" on public.sounds
  for delete to authenticated
  using (owner_id = auth.uid());

create policy "favorites_all" on public.favorites
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Storage ----------------------------------------------------------------
-- Bucket privado; o app usa URLs assinadas. Limite 5 MB, só áudio.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audios', 'audios', false, 5242880,
        array['audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/opus','audio/wav','audio/x-wav','audio/webm','audio/x-m4a'])
on conflict (id) do nothing;

-- Arquivos ficam em "<user_id>/<arquivo>"
create policy "audios_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'audios' and exists (
      select 1 from public.sounds s
      where s.file_path = storage.objects.name
        and (s.is_public or s.owner_id = auth.uid())
    )
  );

create policy "audios_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "audios_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text);
