# Changesets

Toda mudança de comportamento do app precisa de um changeset:

```bash
npm run change
```

Escolha o tipo (`patch` / `minor` / `major`) e escreva uma descrição legível por gente —
ela vai para o `CHANGELOG.md` e para a nota da release. Mudança que não afeta quem usa o
app (CI, refatoração, documentação) não precisa de um.

A versão do app **não é digitada por ninguém**: o `app.config.ts` lê o `package.json`, e
só o `changeset version` escreve nele. Assim o número que aparece em Ajustes é confiável
para responder "qual build está nesse celular?".

No GitHub, o merge na `main` sobe a versão e gera o APK sozinho (`apk.yml`). Em um PR,
o label `RC` gera um APK de teste (`build-rc.yml`).
