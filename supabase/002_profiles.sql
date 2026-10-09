-- Perfis (nome de exibição). Rode no SQL Editor depois do schema.sql.

create table public.profiles (
  id   uuid primary key references auth.users(id) on delete cascade,
  name text not null default ''
);

alter table public.profiles enable row level security;

-- Qualquer usuário logado lê os nomes (para "Enviado por ...")
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Cria o perfil automaticamente no cadastro, com o nome vindo do user_metadata
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuários que já existirem
insert into public.profiles (id, name)
select id, coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;
