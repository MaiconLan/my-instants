# My Instants v2 — Plano

App Android (APK) para ~3 amigos: enviar áudios, nomear, tocar e compartilhar no WhatsApp.

## Decisões
- Backend: **Supabase** (Auth email/senha + Postgres + Storage). Sem servidor próprio.
- App: **Expo (React Native, TypeScript) + Expo Router**, só Android.
- Áudio público por padrão: checkbox "Áudio público" (default `true`) na tela de nome.
  Público = todos os usuários logados veem; privado = só o dono.
- Distribuição: APK via EAS Build local (`eas build --local`) ou GitHub Actions. Sem Play Store.
- Dados: `supabase/schema.sql` (tabelas `sounds`, `favorites`, bucket privado `audios`, RLS).
  Reprodução/compartilhamento usam URL assinada / download para cache.

## UI
- Referência visual e de comportamento: `design/My Instants.dc.html` (abrir no navegador) + especificação em `design/README.md` (tokens, telas, textos, regras de áudio).

## Fases
1. **Migrar áudios antigos** do Firebase — por último, depende do export feito por outra pessoa.
2. ✅ **Setup**: Supabase (`schema.sql`, `002_profiles.sql`), app Expo com login/cadastro.
3. ✅ **Núcleo**: grade colorida, busca, tocar ao toque, compartilhar no WhatsApp.
4. ✅ **Upload**: escolher arquivo → nome + "Áudio público" → enviar; receber áudio de outros apps (só no APK).
5. ✅ **Extras**: favoritos, editar nome/visibilidade, excluir; cache persistente dos áudios.
6. ✅ **APK**: GitHub Actions (`check.yml`, `build-rc.yml` com label RC, `apk.yml` na main).

## Pendente de você
- Rodar no SQL Editor do Supabase, nesta ordem: `supabase/schema.sql` e `supabase/002_profiles.sql`.
- Authentication → desligar "Confirm email".
- Chave publishable já está em `mobile/.env.local` (fora do git; nunca a secret key no app).
- Para a migração (fase 1): lista/URLs dos áudios do Firebase atual ou credenciais de leitura do bucket.
