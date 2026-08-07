import type { Arquetipo, Plataforma } from "@/generated/prisma/enums";
import { ARQUETIPOS, aberturaNoTom, ctaNoTom } from "@/lib/arquetipos";
import type { ConteudoGerado } from "./conteudo";
import type { ResultadoPesquisa } from "./pesquisa";
import type { TemaSugerido } from "./temas";

/**
 * MODO DEMONSTRAÇÃO
 *
 * Conteúdo de exemplo para testar a experiência inteira sem chave da IA e sem
 * custo. Liga sozinho quando ANTHROPIC_API_KEY está vazia.
 *
 * Regra que vale a pena manter: isto substitui APENAS a chamada da IA. Tudo o
 * resto (gravação no banco, um registro por plataforma, geração da arte, SEO,
 * edição, download) roda exatamente como em produção — senão o teste não
 * provaria nada.
 *
 * O texto varia por plataforma e o roteiro cresce de verdade conforme a duração
 * escolhida, que é justamente o que precisa ser conferido na tela.
 */

/** Números pseudoaleatórios previsíveis: o mesmo tema gera sempre o mesmo texto. */
function semente(texto: string) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function embaralhar<T>(lista: T[], aleatorio: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function contarPalavras(texto: string) {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

/** Pequena espera para as telas de carregamento aparecerem como aparecem de verdade. */
export function esperaSimulada(ms = 900) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Pesquisa
// ---------------------------------------------------------------------------

export async function pesquisaSimulada(
  nicho: string,
  termo?: string | null,
): Promise<ResultadoPesquisa> {
  await esperaSimulada(1400);

  const foco = termo ? `"${termo}"` : nicho;

  return {
    resumo: `[Exemplo — modo demonstração]

O que está movimentando ${foco} agora:

• Conteúdo de bastidor está performando melhor que conteúdo de produto acabado. As pessoas querem ver o processo, não só o resultado.
• A dúvida que mais aparece nos comentários é sobre preço: quanto custa, se vale a pena, como calcular.
• Vídeos curtos explicando UM erro específico estão tendo mais salvamentos que vídeos genéricos de "dicas".
• Quem mostra o próprio aprendizado (inclusive o que deu errado) constrói confiança mais rápido do que quem só mostra acerto.
• Público reclama de conteúdo raso: quer o passo a passo concreto, com números e exemplos reais.

Formatos que estão funcionando: antes e depois, respondendo comentário em vídeo, lista de erros comuns, comparação lado a lado.`,
    fontes: [
      { titulo: "Exemplo de fonte (modo demonstração)", url: "https://exemplo.com.br/tendencias" },
      { titulo: "Outro exemplo de fonte", url: "https://exemplo.com.br/pesquisa" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Temas
// ---------------------------------------------------------------------------

const MOLDES_TEMA: { titulo: (n: string) => string; motivo: string }[] = [
  {
    titulo: (n) => `O erro que quase todo mundo comete em ${n}`,
    motivo: "Conteúdo de erro comum gera muito comentário de gente se identificando.",
  },
  {
    titulo: (n) => `Quanto custa começar em ${n} hoje`,
    motivo: "Preço é a dúvida que mais aparece nos comentários do seu nicho.",
  },
  {
    titulo: (n) => `3 coisas que ninguém te conta sobre ${n}`,
    motivo: "Formato de lista curta é o que mais tem sido salvo pelo público.",
  },
  {
    titulo: (n) => `Um dia de trabalho por trás de ${n}`,
    motivo: "Bastidor está performando melhor que conteúdo de produto pronto.",
  },
  {
    titulo: (n) => `O que trava o resultado de quem trabalha com ${n}`,
    motivo: "Toca numa frustração real de quem está começando agora.",
  },
  {
    titulo: (n) => `${n}: o que mudou nos últimos meses`,
    motivo: "Conteúdo de atualização posiciona você como quem acompanha o assunto.",
  },
  {
    titulo: (n) => `Antes e depois: o que eu faria diferente em ${n}`,
    motivo: "Mostrar o próprio aprendizado constrói confiança rápido.",
  },
  {
    titulo: (n) => `A pergunta que mais me fazem sobre ${n}`,
    motivo: "Responder dúvida real do público costuma render bastante alcance.",
  },
];

export async function temasSimulados(
  nicho: string,
  quantidade: number,
  evitar: string[] = [],
): Promise<TemaSugerido[]> {
  await esperaSimulada(1200);

  const aleatorio = semente(nicho + evitar.length);
  const nichoMinusculo = nicho.charAt(0).toLowerCase() + nicho.slice(1);

  return embaralhar(MOLDES_TEMA, aleatorio)
    .map((m) => ({
      titulo: m.titulo(nichoMinusculo),
      justificativa: m.motivo,
    }))
    .filter((t) => !evitar.includes(t.titulo))
    .slice(0, quantidade);
}

export async function temaProprioSimulado(
  temaDigitado: string,
): Promise<TemaSugerido> {
  await esperaSimulada(1200);
  return {
    titulo: temaDigitado.charAt(0).toUpperCase() + temaDigitado.slice(1),
    justificativa: "Tema que você escolheu. (Exemplo — modo demonstração.)",
  };
}

// ---------------------------------------------------------------------------
// Conteúdo por plataforma
// ---------------------------------------------------------------------------

/** Frases de recheio, usadas para o roteiro alcançar a duração escolhida. */
const FRASES = [
  "E olha, isso parece detalhe, mas muda o resultado inteiro.",
  "Eu demorei bastante para entender isso na prática.",
  "Vou te dar um exemplo bem concreto do que estou falando.",
  "A maioria das pessoas pula essa parte e depois se arrepende.",
  "Se você fizer só isso já vai perceber diferença na primeira semana.",
  "Não precisa de nada caro nem complicado para começar.",
  "Anota aí, porque é aqui que quase todo mundo escorrega.",
  "Isso vale tanto para quem está começando quanto para quem já tem experiência.",
  "Repare que não é sobre fazer mais, é sobre fazer na ordem certa.",
  "Já vi muita gente desistir bem antes de chegar nessa etapa.",
  "O que eu faço hoje é bem mais simples do que eu fazia no começo.",
  "E tem um detalhe que quase ninguém comenta sobre isso.",
];

/**
 * Repete e varia frases até o texto chegar perto da meta de palavras.
 *
 * `fim` fica de fora do preenchimento e é colado depois. Sem isso o enchimento
 * cai atrás do CTA e da assinatura, e o post termina no meio de uma frase solta
 * — justamente a parte que o arquétipo personaliza.
 */
function preencherAte(
  inicio: string,
  alvoPalavras: number,
  aleatorio: () => number,
  fim = "",
) {
  let texto = inicio;
  let tentativas = 0;
  const alvoCorpo = alvoPalavras - contarPalavras(fim);
  while (contarPalavras(texto) < alvoCorpo && tentativas < 200) {
    texto += " " + FRASES[Math.floor(aleatorio() * FRASES.length)];
    tentativas++;
  }
  return fim ? `${texto}\n\n${fim}` : texto;
}

function palavrasParaDuracao(plataforma: Plataforma, segundos: number) {
  const porMinuto = plataforma === "TIKTOK" ? 175 : 140;
  return Math.round((segundos / 60) * porMinuto);
}

function pontosParaDuracao(segundos: number) {
  if (segundos <= 20) return 1;
  if (segundos <= 45) return 2;
  if (segundos <= 90) return 3;
  if (segundos <= 200) return 4;
  if (segundos <= 330) return 5;
  return 7;
}

function legenda(params: {
  plataforma: "INSTAGRAM" | "LINKEDIN";
  tema: string;
  nicho: string;
  nomeMarca: string;
  arquetipo: Arquetipo | null;
  aleatorio: () => number;
}): string {
  const { plataforma, tema, nicho, nomeMarca, arquetipo, aleatorio } = params;

  // Com arquétipo, a abertura e o fecho mudam de voz; sem ele, cai no texto
  // neutro de antes.
  const abertura = arquetipo
    ? aberturaNoTom(arquetipo, tema, nicho)
    : "Ninguém te avisa disso quando você começa.";
  const fecho = arquetipo
    ? ctaNoTom(arquetipo)
    : "Salva esse post pra lembrar quando bater a dúvida. E me conta nos comentários: qual desses três você já viveu?";

  if (plataforma === "INSTAGRAM") {
    return preencherAte(
      `${abertura}

${tema} parece uma coisa quando você olha de fora, e é outra bem diferente quando você põe a mão.

O que eu faria diferente se voltasse ao começo:

• Começaria com menos coisa e mais constância
• Perguntaria antes de investir, não depois
• Não copiaria o que estava dando certo pros outros sem entender o porquê`,
      150,
      aleatorio,
      `${fecho}\n\n— ${nomeMarca}`,
    );
  }

  return preencherAte(
    `${abertura}

Levei mais tempo do que gostaria para entender uma coisa sobre ${tema}.

No começo, eu achava que o problema era falta de recurso. Não era.

O que realmente mudou o jogo foi parar de tentar resolver tudo de uma vez e escolher uma única coisa para fazer bem feito. Parece óbvio escrito assim, mas na hora da decisão é bem menos.

Três aprendizados que eu levo comigo até hoje:

1. Constância vence intensidade. Sempre.
2. Perguntar cedo economiza meses de retrabalho.
3. O que funciona para os outros nem sempre serve para o seu contexto — entender o porquê importa mais do que copiar o formato.

Hoje eu olho para trás e vejo que quase todo erro que cometi veio de pressa.`,
    230,
    aleatorio,
    fecho,
  );
}

function roteiro(params: {
  plataforma: "YOUTUBE" | "TIKTOK";
  tema: string;
  nicho: string;
  duracaoSegundos: number;
  arquetipo: Arquetipo | null;
  aleatorio: () => number;
}): string {
  const { plataforma, tema, nicho, duracaoSegundos, arquetipo, aleatorio } = params;

  const alvo = palavrasParaDuracao(plataforma, duracaoSegundos);
  const pontos = pontosParaDuracao(duracaoSegundos);

  const subtitulos = [
    "O erro mais comum",
    "O que fazer no lugar",
    "Como saber se está funcionando",
    "O detalhe que muda tudo",
    "Um exemplo prático",
    "O que eu faria diferente hoje",
    "Como aplicar já nesta semana",
  ];

  // O gancho e o CTA são curtos; o miolo é o que cresce com a duração.
  const rotuloGancho = plataforma === "TIKTOK" ? "GANCHO (0-3s)" : "GANCHO (0-15s)";

  const textoGancho = arquetipo
    ? aberturaNoTom(arquetipo, tema, nicho)
    : plataforma === "TIKTOK"
      ? `Para tudo: se você faz isso em ${tema}, está perdendo tempo.`
      : `Se você já tentou ${tema} e não deu certo, provavelmente não foi falta de esforço. Nesse vídeo eu te mostro o que costuma estar por trás disso — e o que fazer no lugar.`;

  const gancho = `${rotuloGancho}\n${textoGancho}`;

  const fechoRede =
    plataforma === "TIKTOK" ? "Segue pra mais." : `Se inscreve no canal pra mais sobre ${nicho}.`;
  const textoCta = arquetipo
    ? `${ctaNoTom(arquetipo)} ${fechoRede}`
    : plataforma === "TIKTOK"
      ? "Segue aqui que amanhã eu mostro a parte 2."
      : "Se esse vídeo te ajudou, se inscreve no canal — toda semana tem conteúdo novo sobre isso. E me conta nos comentários qual desses pontos você já tinha percebido.";

  const cta = `CTA\n${textoCta}`;

  const orcamentoMiolo = Math.max(20, alvo - contarPalavras(gancho) - contarPalavras(cta));
  const porPonto = Math.round(orcamentoMiolo / pontos);

  const blocos = Array.from({ length: pontos }, (_, i) => {
    const base = `${i + 1}. ${subtitulos[i % subtitulos.length]}\nAqui vale a pena ir devagar, porque é onde a maioria se perde.`;
    return preencherAte(base, porPonto, aleatorio);
  });

  return `${gancho}\n\nDESENVOLVIMENTO\n\n${blocos.join("\n\n")}\n\n${cta}`;
}

function seoPara(params: {
  plataforma: Plataforma;
  tema: string;
  nicho: string;
}): ConteudoGerado["seo"] {
  const { plataforma, tema, nicho } = params;

  const palavrasNicho = nicho
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length > 3)
    .slice(0, 3);

  switch (plataforma) {
    case "YOUTUBE":
      return {
        titulo: tema.slice(0, 60),
        descricao: `Neste vídeo eu falo sobre ${tema.toLowerCase()}.\n\nSe você trabalha com ${nicho}, esse é o tipo de coisa que faz diferença no dia a dia.\n\nDeixa nos comentários a sua dúvida que eu respondo.\n\n[Descrição de exemplo — modo demonstração]`,
        tags: [...palavrasNicho, "dicas", "passo a passo", "iniciantes", "como fazer", "erros comuns", "tutorial"],
      };
    case "TIKTOK":
      return {
        titulo: tema.slice(0, 80),
        descricao: `Vídeo curto sobre ${tema.toLowerCase()}.`,
        tags: [...palavrasNicho, "dicas", "aprendanotiktok", "fyp"],
      };
    case "LINKEDIN":
      return {
        titulo: tema.slice(0, 70),
        descricao: `Reflexão sobre ${tema.toLowerCase()} e o que aprendi na prática.`,
        tags: [...palavrasNicho, "carreira", "empreendedorismo"],
      };
    case "INSTAGRAM":
      return {
        titulo: tema.slice(0, 60),
        descricao: `Post sobre ${tema.toLowerCase()}, com os erros mais comuns e o que fazer no lugar.`,
        tags: [
          ...palavrasNicho,
          "dicas",
          "empreendedorismo",
          "negocios",
          "aprendizado",
          "passoapasso",
          "iniciantes",
          "erroscomuns",
          "bastidores",
          "rotina",
          "inspiracao",
          "brasil",
        ],
      };
  }
}

/** Palavras de busca da foto de fundo — em inglês, que é o que o Pexels entende melhor. */
function buscaFotoPara(nicho: string): string {
  const mapa: [RegExp, string][] = [
    [/confeit|doce|bolo|padar/i, "artisan bakery"],
    [/marketing|digital|social/i, "creative workspace"],
    [/treino|fitness|academia|corrid/i, "fitness training"],
    [/finan|investi|dinheiro/i, "finance desk"],
    [/moda|roupa|costur/i, "fashion studio"],
    [/barbear|cabelo|salão|salao/i, "barbershop"],
    [/comida|restaurante|culinár|culinar/i, "food cooking"],
    [/foto|vídeo|video|film/i, "photography studio"],
  ];
  for (const [re, termo] of mapa) if (re.test(nicho)) return termo;
  return "small business workspace";
}

export async function conteudoSimulado(params: {
  plataforma: Plataforma;
  duracaoSegundos: number | null;
  tema: string;
  nicho: string;
  nomeMarca: string;
  arquetipo?: Arquetipo | null;
}): Promise<ConteudoGerado> {
  await esperaSimulada(1600);

  const aleatorio = semente(params.tema + params.plataforma + params.duracaoSegundos);
  const arquetipo = params.arquetipo ?? null;

  const conteudo =
    params.plataforma === "YOUTUBE" || params.plataforma === "TIKTOK"
      ? roteiro({
          plataforma: params.plataforma,
          tema: params.tema,
          nicho: params.nicho,
          duracaoSegundos: params.duracaoSegundos ?? 180,
          arquetipo,
          aleatorio,
        })
      : legenda({
          plataforma: params.plataforma,
          tema: params.tema,
          nicho: params.nicho,
          nomeMarca: params.nomeMarca,
          arquetipo,
          aleatorio,
        });

  // Frase da arte: curta, tirada do próprio tema.
  const textoArte =
    params.tema.length <= 60
      ? params.tema
      : params.tema.slice(0, 57).replace(/\s+\S*$/, "") + "…";

  return {
    conteudo,
    seo: seoPara({
      plataforma: params.plataforma,
      tema: params.tema,
      nicho: params.nicho,
    }),
    textoArte,
    buscaFoto: buscaFotoPara(params.nicho),
    arquetipoUsado: arquetipo,
    gatilhoUsado: arquetipo ? ARQUETIPOS[arquetipo].gatilho : null,
  };
}
