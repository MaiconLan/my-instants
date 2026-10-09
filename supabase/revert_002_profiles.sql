-- Reverte supabase/002_profiles.sql (rodado por engano em outro projeto).
-- ATENCAO: so rode se o 002 foi aplicado com sucesso nesse projeto e se a tabela
-- public.profiles era a criada por ele (colunas id e name). Se o projeto ja tinha uma
-- tabela/funcao/trigger com esses nomes, o 002 teria falhado e isto apagaria o original.

-- 1) trigger que cria o perfil no cadastro (fica em auth.users)
drop trigger if exists on_auth_user_created on auth.users;

-- 2) funcao usada pelo trigger
drop function if exists public.handle_new_user();

-- 3) tabela (as policies profiles_select e profiles_update caem junto)
drop table if exists public.profiles;
