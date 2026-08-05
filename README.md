# Plataforma de conteúdo com IA

Plataforma que pesquisa o nicho do usuário, sugere temas e entrega **roteiro, arte e SEU
SEO adaptados a cada rede social** (Instagram, YouTube, TikTok, LinkedIn).

> O nome da marca ainda não foi definido. Ele está numa constante só, em
> [`src/lib/constants.ts`](src/lib/constants.ts) (`APP_NAME`) — mudar ali muda em todo lugar.

---

## O que você precisa antes de começar

Três contas gratuitas. Leva uns 10 minutos no total:

| Serviço | Para que serve | Onde criar |
|---|---|---|
| **Anthropic** | A IA que pesquisa e escreve | https://console.anthropic.com |
| **Supabase** | Login dos usuários + banco de dados + armazenamento dos logos | https://supabase.com |
| **Pexels** | Fotos de fundo para as artes | https://www.pexels.com/api/ |

E o **Node.js 20 ou superior** instalado no computador (https://nodejs.org).

---

## Configuração

### 1. Instalar as dependências

```bash
npm install
```

### 2. Preencher o arquivo `.env`

O arquivo `.env` já existe na pasta do projeto, com os campos em branco. Abra ele num
editor de texto e preencha:

**`ANTHROPIC_API_KEY`**
Console da Anthropic → *API Keys* → *Create Key*. Copie e cole (começa com `sk-ant-`).

**`DATABASE_URL`**
No Supabase: *Project Settings* → *Database* → *Connection string* → aba **URI**.
Copie o texto e troque `[YOUR-PASSWORD]` pela senha do banco que você definiu quando
criou o projeto.

**`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`**
No Supabase: *Project Settings* → *API*. São o *Project URL* e a chave *anon public*.

**`SUPABASE_SERVICE_ROLE_KEY`**
Mesma tela, chave *service_role*. Essa é secreta — nunca compartilhe.

**`PEXELS_API_KEY`**
Em https://www.pexels.com/api/ → *Get Started*. A chave sai na hora.

### 3. Criar as tabelas no banco

```bash
npm run db:push
```

Isso lê o arquivo [`prisma/schema.prisma`](prisma/schema.prisma) e cria as tabelas no
Supabase. Se der erro de conexão, quase sempre é a senha errada na `DATABASE_URL`.

### 4. Rodar

```bash
npm run dev
```

Abra http://localhost:3000.

---

## Comandos úteis

| Comando | O que faz |
|---|---|
| `npm run dev` | Roda o site localmente, atualizando sozinho quando você edita um arquivo |
| `npm run build` | Gera a versão otimizada (é o que a Vercel roda no deploy) |
| `npm run db:push` | Aplica o schema no banco (uso rápido, em desenvolvimento) |
| `npm run db:migrate` | Cria uma migração versionada (uso recomendado quando o app estiver no ar) |
| `npm run db:studio` | Abre uma telinha para ver e editar os dados do banco |

---

## Como o projeto está organizado

```
prisma/schema.prisma     Desenho do banco de dados (tabelas e relações)
prisma.config.ts         Configuração do Prisma 7 (conexão usada nas migrações)
src/app/                 Páginas e rotas de API do Next.js
src/lib/constants.ts     Nome do app, plataformas, formatos de arte, durações, fontes
src/lib/prisma.ts        Conexão com o banco
src/generated/prisma/    Código gerado automaticamente pelo Prisma (não editar)
```

### Decisões que valem saber

- **Uma linha por plataforma.** Cada tema gera um registro separado em `scripts`,
  `generated_artes` e `seo_metadata` para *cada* rede escolhida. É isso que impede o
  conteúdo do Instagram de aparecer na aba do YouTube.
- **Duração em segundos.** A especificação falava em minutos, mas o TikTok trabalha com
  15/30/60 segundos. Guardar em segundos cobre as duas redes sem gambiarra. A duração
  vira uma meta de palavras (`palavrasParaDuracao`), e é isso que faz o roteiro crescer
  ou encolher de verdade quando você troca o seletor.
- **Senha não passa por aqui.** O login é do Supabase Auth; a tabela `users` é só um
  espelho local (mesmo `id`) para conseguirmos relacionar as outras tabelas.
- **A paleta de cores do logo é extraída no navegador**, com a Canvas API — sem IA e sem
  API externa. É instantâneo e não custa nada.
- **Uma chamada de IA por plataforma.** Conteúdo, SEO, texto da arte e as palavras de
  busca da foto vêm juntos na mesma resposta. Isso corta o tempo até o primeiro
  resultado pela metade e reduz o custo — trocar a duração depois regera só o roteiro.
- **Layout da arte calculado em um lugar só** (`src/lib/arte/layout.ts`). A prévia é
  desenhada em `<canvas>` (para o PNG sair idêntico ao que você vê, com as fontes
  certas) e o `.svg` é montado no servidor. Os dois leem o mesmo cálculo, então nunca
  divergem.
- **As fotos passam pelo nosso domínio** (`/api/imagem`). Sem isso o navegador bloqueia
  o download do PNG por causa da política de origem cruzada.

### Onde isso difere da especificação original (e por quê)

1. **A arte não é gerada pela IA.** A especificação previa a Claude API escrevendo o
   SVG. Aqui o SVG é montado por código, com os dados da sua marca; a IA só escreve a
   **frase** que vai estampada. Motivo: o layout é sempre o mesmo template, então gerar
   por IA custaria dinheiro e alguns segundos a cada ajuste de cor ou texto — e poderia
   voltar quebrado. Do jeito atual a prévia é instantânea e nunca falha.
2. **PNG gerado no navegador**, em vez de `resvg`/Playwright no servidor. Não precisa de
   dependência nativa nem de fontes instaladas no servidor, e a imagem baixada é
   exatamente a que você viu na tela.

### Antes de testar com usuários

No Supabase, em *Authentication → Providers → Email*, considere **desligar** a
confirmação de e-mail enquanto estiver testando. Com ela ligada, cada cadastro exige
abrir o e-mail antes de entrar — o app trata os dois casos, mas sem confirmação o
primeiro conteúdo aparece bem mais rápido.

---

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Prisma 7 + PostgreSQL (Supabase) ·
Claude API (`claude-sonnet-5`, com a ferramenta nativa de busca na web) · Supabase Auth e
Storage · Pexels · Hospedagem na Vercel.
