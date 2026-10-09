# Handoff de design: My Instants v2 (app Android)

## Visão geral
App de botões de áudio (memes) para um grupo pequeno de amigos: login/cadastro, grade colorida de áudios, tocar ao toque, buscar/filtrar/ordenar, favoritar, compartilhar (WhatsApp etc.), enviar áudio com nome + cor + "Áudio público", editar/excluir os próprios áudios, e dois modos de reprodução (**Caos** e **Play/Pause**).

## Sobre os arquivos de design
`My Instants.dc.html` é um **protótipo de referência em HTML**: mostra o visual e o comportamento esperados, **não é código de produção**. A tarefa é **recriar essa UI em Expo (React Native + TypeScript + Expo Router)**, conforme `../PLAN.md`, com backend Supabase (`../supabase/schema.sql`). Abra o HTML num navegador para interagir.

## Fidelidade
**Alta fidelidade (hi-fi).** Cores, tipografia, espaçamentos, raios, textos e interações são finais. Recriar o mais fiel possível usando componentes RN (`View`, `Pressable`, `TextInput`, `FlatList`).

---

## Tokens de design

### Cores (tema escuro único)
| Token | Valor | Uso |
|---|---|---|
| `bg` | `#141210` | fundo das telas |
| `surface` | `#1f1c19` | bottom sheets, cartões de conta |
| `surface2` | `#25211d` | campo de busca, linhas de opção, diálogo |
| `surfaceDim` | `#1a1714` | fundo de inputs (login), card de modo não selecionado |
| `navBg` | `#1c1916` | barra de navegação inferior (borda topo `#26221e`) |
| `border` | `#3a352f` | bordas de inputs/chips/botões outline |
| `borderSoft` | `#2c2723` | borda card não selecionado, botão "Sair", trilho do progresso |
| `handle` | `#4a443d` | alça do sheet, borda tracejada do upload |
| `text` | `#f3efe9` | texto principal |
| `textSoft` | `#d9d2c8` | chips inativos, botão ordenar |
| `textMuted2` | `#c4bcb1` | labels de campo, descrições |
| `textMuted` | `#a39b91` | texto secundário, ícones de input |
| `ink` | `#1a1612` | texto/ícone sobre cores de botão |
| `accent` | `oklch(0.86 0.16 95)` ≈ `#f2c94c` | FAB, botões primários, checkbox, links |
| `danger` | `oklch(0.75 0.15 25)` ≈ `#f08a76` | erros, "Excluir" |
| `dangerBtn` | `oklch(0.72 0.17 25)` ≈ `#ec7560` | botão confirmar exclusão |
| `errorBg` | `oklch(0.3 0.06 25)` ≈ `#4a2a24` | caixa de erro do login |
| nav pill ativa | `#3a332b` | |

**Cores dos botões de áudio** — `oklch(0.76 0.15 H)` com 8 matizes `H = 25, 60, 95, 145, 190, 235, 285, 330`. Hex aproximados (salvar em `sounds.color`):
`#f4876e` (25) · `#e8a14f` (60) · `#c9b648` (95) · `#7fcb7a` (145) · `#3fc9c0` (190) · `#5fb4f2` (235) · `#a99af5` (285) · `#ec88c6` (330).
> Converta os oklch exatos com uma ferramenta (ex.: oklch.com) se quiser bater pixel a pixel; RN não aceita oklch.

### Tipografia
- **Bricolage Grotesque** (Google Fonts, via `@expo-google-fonts/bricolage-grotesque`) — toda a UI.
- **JetBrains Mono** — metadados (duração, contadores, rótulos de seção em caixa alta).
- **Material Symbols Rounded** — ícones (em RN: `@expo/vector-icons` MaterialIcons/MaterialCommunityIcons equivalentes, ou fonte Material Symbols).

| Estilo | Fonte | Tamanho | Peso | Extra |
|---|---|---|---|---|
| Título de tela | Bricolage | 27 | 800 | letterSpacing −0.02em |
| Título login | Bricolage | 34 | 800 | lineHeight 1.02 |
| Título de sheet | Bricolage | 22 | 800 | |
| Nome no botão (2 col) | Bricolage | 17 | 700 | lineHeight 1.08, máx 3 linhas |
| Nome no botão (3 col) | Bricolage | 14 | 700 | |
| Corpo / input | Bricolage | 16 | 400 | |
| Item de lista/ação | Bricolage | 15.5 | 500 | |
| Label de campo | Bricolage | 13 | 400 | cor `textMuted2` |
| Rótulo de seção | JetBrains Mono | 11 | 600 | MAIÚSCULAS, letterSpacing 0.08em, `textMuted` |
| Duração / contadores | JetBrains Mono | 11–12 | 600 | |
| Nav label | Bricolage | 12 | 600 | |

### Raios
Botão de áudio 22 · sheet 28 (topo) · diálogo 28 · card de modo 22 · busca 25 (pílula, h 50) · input 14 · chip 10 · FAB 20 · botões pílula = h/2 · checkbox 6 · swatch 17 (circular).

### Sombras
- FAB / "Parar tudo": `0 6 20 rgba(0,0,0,.45)` (elevation ~8)
- Toast: `0 8 24 rgba(0,0,0,.4)`
- Scrim de sheet: `rgba(0,0,0,.55)`

### Espaçamento
Padding lateral das telas 16 (login 24, sheets 20). Gap da grade 10. Gaps comuns: 6, 8, 10, 12, 14, 16.

---

## Telas

### 1. Login / Cadastro
- Topo: 4 quadrados 30×30 raio 10 nas cores 25/95/190/285 (marca provisória — substituir por logo).
- Título: "Bem-vindo de volta" / "Crie sua conta". Subtítulo (15, `textMuted`): "Entre pra tocar e mandar os áudios da galera." / "Pra enviar seus áudios e ver os dos amigos."
- Segmentado (fundo `surface`, padding 4, raio 16; abas h40 raio 12): **Entrar** | **Criar conta**. Ativa: fundo `text`, texto `ink`.
- Campos (label 13 acima; caixa h52, borda 2 `border`, fundo `surfaceDim`, ícone à esquerda):
  - Login: E-mail (`mail`), Senha (`lock`, botão olho mostrar/ocultar).
  - Cadastro: Seu nome (`person`), E-mail, Senha ("Mínimo 6 caracteres"), Confirmar senha.
- Login: link "Esqueci a senha" (accent, alinhado à direita).
- Botão primário h54 pílula accent, texto 16/800: "Entrar"/"Criar conta"; carregando: "Entrando…"/"Criando conta…" com opacidade .7.
- **Validação** (mostrada só após 1º envio): nome obrigatório; e-mail `/^\S+@\S+\.\S+$/` → "E-mail inválido"; senha ≥6 → "A senha precisa ter pelo menos 6 caracteres" (login: "Digite sua senha"); confirmação → "As senhas não batem". Campo com erro: borda `danger` + texto 12.5 `danger` abaixo.
- Erro do servidor: caixa `errorBg` raio 14 com ícone `error`: "E-mail ou senha incorretos."
- Esqueci a senha sem e-mail válido → erro "Digite seu e-mail acima pra receber o link."; com e-mail → toast "Link de redefinição enviado pra {email}" (`supabase.auth.resetPasswordForEmail`).
- Sucesso → toast "Oi, {nome}!" / "Conta criada. Bem-vindo, {nome}!" e vai para Áudios. Cadastro salva o nome em `user_metadata.name`.

### 2. Áudios (home)
- Cabeçalho fixo (sticky, fundo `bg`):
  - Linha h48: "My Instants" + **chip de modo** à direita (h36 pílula, ícone 20 + label 13/600). Caos: fundo cor 25, texto `ink`, ícone `cyclone`, "Caos". Play/Pause: fundo `borderSoft`, texto `text`, ícone `play_pause`. Toque alterna o modo.
  - Busca: h50, fundo `surface2`, ícone `search`, placeholder "Buscar áudios", botão `close` quando há texto. Busca ignora acentos/maiúsculas.
  - Chips (scroll horizontal): Todos · Favoritos · Meus · Públicos · Privados. Ativo: fundo/borda `text`, texto `ink`. Inativo: transparente, borda `border`, texto `textSoft`.
  - Linha meta: "{n} áudios" (mono 12 `textMuted`) e à direita botão ordenar (`swap_vert`) alternando **Recentes** ↔ **A–Z**.
- **Grade**: 2 colunas (opção 3), gap 10, padding 16.
- **Botão de áudio** (aspect 1/0.92, raio 22, padding 12, fundo = cor do áudio, conteúdo `ink`):
  - Topo: nome (até 3 linhas) + botão `more_vert` 30×30 (abre Ações).
  - Centro: círculo 46 — parado: fundo `rgba(26,22,18,.12)`, ícone `play_arrow`; tocando: fundo `ink`, ícone na cor do botão (`graphic_eq` no Caos, `stop` no Play/Pause).
  - Badge "×N" (mono 12, fundo `ink`, texto cor do botão, raio 9) quando há N>1 reproduções simultâneas.
  - Rodapé: duração ("1,3s", mono 11, opacidade .75), cadeado se privado, coração (preenchido se favorito), `share`.
  - Progresso: faixa `rgba(20,14,8,.16)` crescendo da esquerda conforme a reprodução mais recente.
  - Pressionado: scale .95.
- Vazio: ícone 44 + texto: "Nada encontrado pra “{q}”." / "Nenhum áudio neste filtro."
- **FAB** "+" 60×60 raio 20 accent, canto inferior direito (16 da borda, 106 do fundo) → sheet Enviar.
- **"Parar tudo"** pílula h48 clara (`text`/`ink`), canto inferior esquerdo, só aparece tocando: "Parar" ou "Parar tudo (N)".

### 3. Favoritos
Igual à home, título "Favoritos", sem chips, só favoritos. Vazio: ícone `heart_plus` + "Toque no coração de um áudio pra ele aparecer aqui."

### 4. Ajustes
- Rótulo "MODO DE REPRODUÇÃO" + 2 cards (padding 16, raio 22, borda 2):
  - **Modo caos** (ícone `cyclone`, cor 25): "Cada toque toca de novo sem parar o anterior — os áudios se sobrepõem como um eco."
  - **Play / Pause** (ícone `play_pause`, cor 190): "Um áudio por vez. Tocar outro para o atual; tocar o mesmo de novo para."
  - Selecionado: fundo `surface2`, borda na cor do modo, rádio preenchido. Não: fundo `surfaceDim`, borda `borderSoft`.
- Botão outline "Testar o modo atual" (toca o mesmo áudio 3× com 250 ms de intervalo).
- "CONTA": avatar 40 com inicial, nome, "{email} · {n} áudios enviados", botão "Sair". Persistir o modo (AsyncStorage).

### 5. Sheet "Enviar áudio"
Alça 36×4. Área tracejada (h140, borda 2 dashed `handle`, ícone `upload_file` accent): "Escolher arquivo de áudio" / "MP3 · M4A · OGG · OPUS · WAV — até 5 MB" (`expo-document-picker`, type `audio/*`). Arquivo >5 MB → toast "Arquivo maior que 5 MB".

### 6. Sheet "Novo áudio" / "Editar áudio"
- Card do arquivo na cor escolhida: ícone `audio_file`, nome do arquivo, duração, botão ▶ para pré-ouvir.
- "Nome do áudio" + contador "n/80"; input h52 raio 14 fundo `bg`; nome pré-preenchido do nome do arquivo; vazio → "Dê um nome pro áudio".
- "Cor do botão": 8 swatches 34×34; selecionado com anel duplo (3 px `surface` + 2 px `text`).
- Linha checkbox (fundo `surface2`, raio 16): **Áudio público** (padrão marcado). Descrição: marcado "Todos os amigos logados veem e podem tocar." / desmarcado "Desmarcado: só você vê este áudio."
- Envio: barra 6 px accent + "Enviando… 64%". Botões "Cancelar" (texto) e "Enviar"/"Salvar" (accent). Sucesso → toast "Áudio enviado — visível pra todos" ou "— só você vê"; volta para Todos/Recentes com o novo no topo.

### 7. Sheet Ações (⋮)
Cabeçalho: quadrado 48 da cor + nome + "Enviado por {dono} · Público/Privado · 1,3s". Linhas h52: Tocar · Compartilhar · Adicionar/Remover dos favoritos · (só dono) Editar nome e visibilidade · Excluir (cor `danger`).

### 8. Diálogo Excluir
Card centralizado `surface2` raio 28: ícone `delete` danger, "Excluir “{nome}”?", "O áudio sai da lista de todo mundo e o arquivo é apagado. Não dá pra desfazer." Cancelar / Excluir.

### 9. Compartilhar
No protótipo é uma folha simulada; **no app real use o share sheet nativo do Android** via `expo-sharing` (`Sharing.shareAsync(localUri, { mimeType: 'audio/mpeg' })`) após baixar o arquivo para o cache com a URL assinada. Assim o WhatsApp aparece nativamente.

### Navegação inferior
3 itens (h74 + barra de gestos): Áudios (`grid_view`), Favoritos (`favorite`), Ajustes (`tune`). Ativo: pílula 62×32 `#3a332b`, ícone preenchido, texto `text`; inativo `textMuted`. Recomendo Expo Router `(tabs)`.

### Toast
Pílula clara (`text`/`ink`), raio 12, 14/500, acima da navegação, some após 2,4 s. Textos: "Adicionado aos favoritos", "Removido dos favoritos", "Modo caos ligado — vai ter eco", "Modo play/pause — um áudio por vez", "Alterações salvas", "Áudio excluído".

---

## Comportamento de áudio (núcleo)
Use `expo-audio` (ou `expo-av`).
- **Caos**: a cada toque crie um **novo player** para o arquivo e dê play; não pare os anteriores. Libere cada player ao terminar. Contador ×N = players ativos daquele áudio. Considere limitar (~8 simultâneos).
- **Play/Pause**: um player global. Toque num áudio que está tocando → para. Toque em outro → para o atual e toca o novo.
- Trocar de modo para tudo que está tocando.
- **Cache**: baixe cada arquivo uma vez (`expo-file-system`, URL assinada do bucket `audios`) e toque a partir do arquivo local — reduz latência, essencial para o modo caos.
- Progresso: use `currentTime/duration` do player mais recente.

## Estado
- `session/user` (Supabase Auth) · `sounds[]` (select em `sounds` — RLS já filtra públicos+meus) · `favorites` (Set de `sound_id`) · `mode: 'caos'|'playpause'` (AsyncStorage) · `query`, `filter`, `sort` · `activePlayers` (Map soundId → players[]) · estado de upload/formulário · toast.
- Upload: `storage.from('audios').upload(`${uid}/${uuid}.${ext}`)` → `insert` em `sounds` (`name, file_path, color, duration_ms, is_public`).
- Editar: `update sounds set name, color, is_public`. Excluir: remover do storage + `delete` em `sounds`.
- "Meus" = `owner_id === user.id`. Nome do dono: precisa de uma tabela/visão `profiles` (id, name) — **não existe no schema atual**; adicionar se quiser mostrar "Enviado por {nome}".

## Assets
Nenhuma imagem. Ícones: Material Symbols Rounded. A marca (4 quadrados) é provisória.

## Arquivos
- `My Instants.dc.html` — protótipo interativo (abrir no navegador). A lógica está no `<script>` no fim do arquivo; os sons de exemplo são sintetizados (no app real vêm do Supabase).
- `../PLAN.md` — plano técnico e fases.
- `../supabase/schema.sql` — banco, RLS e storage.
