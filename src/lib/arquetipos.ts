import type { Arquetipo, GatilhoMental } from "@/generated/prisma/enums";

/**
 * Os 12 arquétipos de marca de Mark & Pearson, com o tom de voz e o gatilho
 * mental que cada um usa naturalmente.
 *
 * Os textos de `aberturaExemplo` e `ctaExemplo` vieram do protótipo validado
 * (referencia/prototipo-experimental.html). Eles não são usados literalmente no
 * conteúdo final — entram no prompt como exemplo do *jeito* de falar, porque
 * descrever um tom em abstrato ("seja ousado") produz resultado muito pior do
 * que mostrar uma frase pronta naquele tom.
 */

export type Motivacao = "Independência" | "Domínio" | "Pertencimento" | "Estabilidade";

export type InfoArquetipo = {
  nome: string;
  motivacao: Motivacao;
  /** Como esse arquétipo fala. Vai direto para o prompt. */
  tom: string;
  /** O gatilho mental que combina com ele. Um só — ver nota em conteudo.ts. */
  gatilho: GatilhoMental;
  rotuloGatilho: string;
  /** Que tipo de convite o CTA faz. */
  estiloCta: string;
  /** Frase de abertura no tom do arquétipo, usada como exemplo no prompt. */
  aberturaExemplo: string;
  /** Frase de fechamento no tom do arquétipo, usada como exemplo no prompt. */
  ctaExemplo: string;
};

export const ARQUETIPOS: Record<Arquetipo, InfoArquetipo> = {
  INOCENTE: {
    nome: "Inocente",
    motivacao: "Independência",
    tom: "otimista, simples e direto, sem rodeios",
    gatilho: "NOVIDADE",
    rotuloGatilho: "Novidade",
    estiloCta: "convite leve, sem pressão",
    aberturaExemplo:
      "Fazer pão de fermentação natural em casa — e a boa notícia é que é mais simples do que parece.",
    ctaExemplo: "Comenta aqui embaixo — é mais simples do que parece começar.",
  },
  EXPLORADOR: {
    nome: "Explorador",
    motivacao: "Independência",
    tom: "curioso, aventureiro, fala de descobertas",
    gatilho: "CURIOSIDADE",
    rotuloGatilho: "Curiosidade",
    estiloCta: "convite pra experimentar algo novo",
    aberturaExemplo:
      "Fui atrás de descobrir o que realmente funciona em panificação artesanal, e cheguei nisso.",
    ctaExemplo: "Testa isso e me conta como foi — quero saber o que você descobriu.",
  },
  SABIO: {
    nome: "Sábio",
    motivacao: "Independência",
    tom: "analítico, didático, embasado em dados",
    gatilho: "AUTORIDADE",
    rotuloGatilho: "Autoridade",
    estiloCta: "convite a aprender mais / se aprofundar",
    aberturaExemplo:
      "Depois de estudar bastante sobre panificação artesanal, acho importante compartilhar isso.",
    ctaExemplo: "Comenta se quiser que eu aprofunde algum desses pontos.",
  },
  HEROI: {
    nome: "Herói",
    motivacao: "Domínio",
    tom: "direto, motivador, fala de superação",
    gatilho: "DESAFIO",
    rotuloGatilho: "Desafio",
    estiloCta: "convite a agir agora, encarar o desafio",
    aberturaExemplo:
      "Se você quer se destacar em panificação artesanal, precisa encarar isso de frente.",
    ctaExemplo: "Bora colocar isso em prática hoje mesmo — comenta quando encarar o desafio.",
  },
  FORA_DA_LEI: {
    nome: "Fora-da-lei",
    motivacao: "Domínio",
    tom: "ousado, questionador, quebra padrão",
    gatilho: "EXCLUSIVIDADE",
    rotuloGatilho: "Exclusividade",
    estiloCta: "convite a romper com o óbvio",
    aberturaExemplo: "Ninguém vai te contar isso sobre panificação artesanal, mas eu vou.",
    ctaExemplo: "Se você concorda que isso foge do óbvio, comenta aqui.",
  },
  MAGO: {
    nome: "Mago",
    motivacao: "Domínio",
    tom: "visionário, fala de transformação",
    gatilho: "ANTECIPACAO",
    rotuloGatilho: "Antecipação",
    estiloCta: "convite a imaginar o resultado transformado",
    aberturaExemplo:
      "Imagina transformar completamente o resultado do seu trabalho em panificação artesanal.",
    ctaExemplo: "Imagina esse resultado na prática — comenta o que você quer transformar primeiro.",
  },
  CARA_COMUM: {
    nome: "Cara Comum",
    motivacao: "Pertencimento",
    tom: "acessível, autêntico, gente como a gente",
    gatilho: "PROVA_SOCIAL",
    rotuloGatilho: "Prova Social",
    estiloCta: "convite a fazer parte do grupo",
    aberturaExemplo: "Isso aconteceu comigo, e acho que já aconteceu com você também.",
    ctaExemplo: "Comenta aqui se isso também já aconteceu com você.",
  },
  BOBO_DA_CORTE: {
    nome: "Bobo da Corte",
    motivacao: "Pertencimento",
    tom: "leve, bem-humorado, descontraído",
    gatilho: "CURIOSIDADE",
    rotuloGatilho: "Curiosidade",
    estiloCta: "convite divertido, sem peso",
    aberturaExemplo:
      "Ok, bora falar de um jeito leve sobre fermentação natural — sem drama, só o que interessa.",
    ctaExemplo: "Comenta aqui um emoji que resume como você se sentiu 😄",
  },
  AMANTE: {
    nome: "Amante",
    motivacao: "Pertencimento",
    tom: "caloroso, emocional, próximo",
    gatilho: "RECIPROCIDADE",
    rotuloGatilho: "Reciprocidade",
    estiloCta: "convite afetivo, de conexão",
    aberturaExemplo: "Quero falar de algo que mexe comigo de verdade.",
    ctaExemplo: "Comenta aqui — quero saber o que isso desperta em você.",
  },
  CUIDADOR: {
    nome: "Cuidador",
    motivacao: "Estabilidade",
    tom: "acolhedor, atencioso, protetor",
    gatilho: "RECIPROCIDADE",
    rotuloGatilho: "Reciprocidade",
    estiloCta: "convite a se cuidar / ser cuidado",
    aberturaExemplo:
      "Escrevi isso pensando em quem, como eu, se preocupa de verdade com panificação artesanal.",
    ctaExemplo: "Comenta aqui se precisar de ajuda com algum desses pontos — tô por aqui.",
  },
  GOVERNANTE: {
    nome: "Governante",
    motivacao: "Estabilidade",
    tom: "confiante, autoritativo, no controle",
    gatilho: "AUTORIDADE",
    rotuloGatilho: "Autoridade",
    estiloCta: "convite a assumir o controle",
    aberturaExemplo:
      "Se você quer ter controle de verdade sobre panificação artesanal, comece por aqui.",
    ctaExemplo: "Comenta aqui e assuma o controle disso a partir de hoje.",
  },
  CRIADOR: {
    nome: "Criador",
    motivacao: "Estabilidade",
    tom: "original, detalhista, fala de processo",
    gatilho: "NOVIDADE",
    rotuloGatilho: "Novidade",
    estiloCta: "convite a criar/personalizar junto",
    aberturaExemplo: "Construí esse conteúdo com cuidado, porque esse assunto merece ser bem explicado.",
    ctaExemplo: "Comenta aqui o que você criaria a partir dessa ideia.",
  },
};

/** Como cada gatilho deve ser usado. Entra no prompt junto com a regra de ética. */
export const GATILHOS: Record<GatilhoMental, { rotulo: string; comoUsar: string }> = {
  NOVIDADE: {
    rotulo: "Novidade",
    comoUsar: "apresentar algo como recente ou pouco explorado — desde que seja verdade",
  },
  CURIOSIDADE: {
    rotulo: "Curiosidade",
    comoUsar: "abrir uma lacuna de informação que o próprio conteúdo fecha até o final",
  },
  AUTORIDADE: {
    rotulo: "Autoridade",
    comoUsar: "sustentar o que diz em experiência real ou fonte concreta, sem inventar credencial",
  },
  DESAFIO: {
    rotulo: "Desafio",
    comoUsar: "propor uma ação concreta e alcançável, não uma cobrança vaga",
  },
  EXCLUSIVIDADE: {
    rotulo: "Exclusividade",
    comoUsar: "mostrar um ângulo que quase ninguém aborda — nunca inventar acesso restrito",
  },
  ANTECIPACAO: {
    rotulo: "Antecipação",
    comoUsar: "descrever o resultado possível de forma concreta, sem prometer o que não se entrega",
  },
  PROVA_SOCIAL: {
    rotulo: "Prova Social",
    comoUsar: "partir de uma experiência compartilhada e reconhecível, sem inventar números",
  },
  RECIPROCIDADE: {
    rotulo: "Reciprocidade",
    comoUsar: "entregar algo útil de graça antes de pedir qualquer coisa",
  },
};

/** Primeira pergunta do quiz: descobre a motivação. Texto igual ao do protótipo. */
export const QUIZ_MOTIVACAO: { texto: string; motivacao: Motivacao }[] = [
  { texto: "Buscar liberdade, autenticidade e viver a própria jornada", motivacao: "Independência" },
  { texto: "Deixar minha marca, conquistar algo grande, ser referência", motivacao: "Domínio" },
  {
    texto: "Criar conexão e pertencimento, fazer parte de algo com os outros",
    motivacao: "Pertencimento",
  },
  { texto: "Trazer ordem, cuidado e estrutura pra vida das pessoas", motivacao: "Estabilidade" },
];

/** Segunda pergunta: refina para o arquétipo dentro da motivação escolhida. */
export const QUIZ_ARQUETIPO: Record<Motivacao, { texto: string; arquetipo: Arquetipo }[]> = {
  Independência: [
    {
      texto: "Simplicidade e otimismo — acredito que as coisas tendem a dar certo",
      arquetipo: "INOCENTE",
    },
    { texto: "Descobrir coisas novas, testar, nunca ficar parado", arquetipo: "EXPLORADOR" },
    {
      texto: "Entender profundamente um assunto e compartilhar esse conhecimento",
      arquetipo: "SABIO",
    },
  ],
  Domínio: [
    { texto: "Encarar desafios de frente e superar limites", arquetipo: "HEROI" },
    { texto: "Questionar regras e fazer diferente do esperado", arquetipo: "FORA_DA_LEI" },
    { texto: "Transformar a realidade, criar soluções que parecem mágica", arquetipo: "MAGO" },
  ],
  Pertencimento: [
    { texto: "Ser acessível e autêntico — gente como a gente", arquetipo: "CARA_COMUM" },
    { texto: "Trazer leveza, humor e diversão pro dia a dia", arquetipo: "BOBO_DA_CORTE" },
    { texto: "Criar conexão íntima e emocional com quem acompanha", arquetipo: "AMANTE" },
  ],
  Estabilidade: [
    { texto: "Cuidar, apoiar e proteger quem confia no meu trabalho", arquetipo: "CUIDADOR" },
    { texto: "Trazer liderança, controle e visão de longo prazo", arquetipo: "GOVERNANTE" },
    { texto: "Criar coisas novas, com originalidade e capricho no processo", arquetipo: "CRIADOR" },
  ],
};

export const PERGUNTA_MOTIVACAO = "O que mais define por que você faz o que faz?";
export const PERGUNTA_ARQUETIPO = "E qual dessas frases soa mais com você?";

export function infoArquetipo(arquetipo: Arquetipo | null | undefined): InfoArquetipo | null {
  return arquetipo ? ARQUETIPOS[arquetipo] : null;
}

/**
 * Abertura no tom do arquétipo, montada a partir do tema.
 *
 * Existe para o modo demonstração: sem isso, quem testa a plataforma sem chave
 * da IA veria o mesmo texto para os 12 arquétipos e concluiria que a
 * personalização não funciona. Com a chave ligada quem escreve é o modelo —
 * estas frases viram só exemplo dentro do prompt.
 */
export function aberturaNoTom(arquetipo: Arquetipo, tema: string, nicho: string): string {
  const t = tema.charAt(0).toLowerCase() + tema.slice(1);
  const porArquetipo: Record<Arquetipo, string> = {
    INOCENTE: `${tema} — e a boa notícia é que é mais simples do que parece.`,
    EXPLORADOR: `Fui atrás de descobrir o que realmente funciona em ${nicho}, e cheguei nisso: ${t}.`,
    SABIO: `Depois de estudar bastante sobre ${nicho}, acho importante compartilhar isso: ${t}.`,
    HEROI: `Se você quer se destacar em ${nicho}, precisa encarar isso de frente: ${t}.`,
    FORA_DA_LEI: `Ninguém vai te contar isso sobre ${nicho}, mas eu vou: ${t}.`,
    MAGO: `Imagina transformar completamente o resultado do seu trabalho em ${nicho}. É sobre isso: ${t}.`,
    CARA_COMUM: `Isso aconteceu comigo, e acho que já aconteceu com você também: ${t}.`,
    BOBO_DA_CORTE: `Ok, bora falar de um jeito leve sobre ${t} — sem drama, só o que interessa.`,
    AMANTE: `Quero falar de algo que mexe comigo de verdade: ${t}.`,
    CUIDADOR: `Escrevi isso pensando em quem, como eu, se preocupa de verdade com ${nicho}: ${t}.`,
    GOVERNANTE: `Se você quer ter controle de verdade sobre ${nicho}, comece por aqui: ${t}.`,
    CRIADOR: `Construí esse conteúdo com cuidado, porque ${t} merece ser bem explicado.`,
  };
  return porArquetipo[arquetipo];
}

/** CTA no tom do arquétipo. Mesma lógica de `aberturaNoTom`. */
export function ctaNoTom(arquetipo: Arquetipo): string {
  return ARQUETIPOS[arquetipo].ctaExemplo;
}

/** Rótulo pronto para o selo: "Arquétipo Herói · Gancho mental usado: Desafio". */
export function rotuloSelo(
  arquetipo: Arquetipo | null | undefined,
  gatilho: GatilhoMental | null | undefined,
): { arquetipo: string; gatilho: string } | null {
  const info = infoArquetipo(arquetipo);
  if (!info) return null;
  return {
    arquetipo: info.nome,
    gatilho: GATILHOS[gatilho ?? info.gatilho].rotulo,
  };
}
