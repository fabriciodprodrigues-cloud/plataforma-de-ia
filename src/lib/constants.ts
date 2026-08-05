import type { FormatoArte, Plataforma, TipoConteudo } from "@/generated/prisma/enums";

/**
 * Nome da marca. Ainda não definido — trocar AQUI muda em toda a aplicação
 * (título da aba, cabeçalhos, e-mails, textos de interface).
 */
export const APP_NAME = "Plataforma";
export const APP_DESCRICAO =
  "Pesquisa de nicho, roteiro, arte e SEO prontos para cada rede social.";

export type DimensoesArte = { largura: number; altura: number; proporcao: string };

export type MetaPlataforma = {
  id: Plataforma;
  nome: string;
  /** O que a IA gera para essa rede: legenda de post ou roteiro de vídeo. */
  tipoConteudo: TipoConteudo;
  formatoArte: FormatoArte;
  dimensoes: DimensoesArte;
  /** Durações oferecidas no seletor, em segundos. Vazio quando não é vídeo. */
  duracoes: { segundos: number; rotulo: string }[];
  cor: string;
  /** Como chamamos o conteúdo na interface — sem jargão. */
  rotuloConteudo: string;
  rotuloArte: string;
};

export const PLATAFORMAS: Record<Plataforma, MetaPlataforma> = {
  INSTAGRAM: {
    id: "INSTAGRAM",
    nome: "Instagram",
    tipoConteudo: "PUBLICACAO",
    formatoArte: "POST",
    dimensoes: { largura: 1080, altura: 1350, proporcao: "4:5" },
    duracoes: [],
    cor: "#E1306C",
    rotuloConteudo: "Legenda do post",
    rotuloArte: "Post 4:5",
  },
  LINKEDIN: {
    id: "LINKEDIN",
    nome: "LinkedIn",
    tipoConteudo: "PUBLICACAO",
    formatoArte: "POST",
    dimensoes: { largura: 1080, altura: 1350, proporcao: "4:5" },
    duracoes: [],
    cor: "#0A66C2",
    rotuloConteudo: "Texto da publicação",
    rotuloArte: "Post 4:5",
  },
  YOUTUBE: {
    id: "YOUTUBE",
    nome: "YouTube",
    tipoConteudo: "ROTEIRO_VIDEO",
    formatoArte: "THUMBNAIL",
    dimensoes: { largura: 1280, altura: 720, proporcao: "16:9" },
    duracoes: [
      { segundos: 60, rotulo: "1 min" },
      { segundos: 180, rotulo: "3 min" },
      { segundos: 300, rotulo: "5 min" },
      { segundos: 600, rotulo: "10 min" },
    ],
    cor: "#FF0000",
    rotuloConteudo: "Roteiro do vídeo",
    rotuloArte: "Capa 16:9",
  },
  TIKTOK: {
    id: "TIKTOK",
    nome: "TikTok",
    tipoConteudo: "ROTEIRO_VIDEO",
    formatoArte: "CAPA_VERTICAL",
    dimensoes: { largura: 1080, altura: 1920, proporcao: "9:16" },
    duracoes: [
      { segundos: 15, rotulo: "15s" },
      { segundos: 30, rotulo: "30s" },
      { segundos: 60, rotulo: "60s" },
    ],
    cor: "#000000",
    rotuloConteudo: "Roteiro do vídeo",
    rotuloArte: "Capa 9:16",
  },
};

/** Ordem fixa de exibição das abas, para não depender da ordem do banco. */
export const ORDEM_PLATAFORMAS: Plataforma[] = [
  "INSTAGRAM",
  "YOUTUBE",
  "TIKTOK",
  "LINKEDIN",
];

export function ordenarPlataformas(lista: Plataforma[]): Plataforma[] {
  return [...lista].sort(
    (a, b) => ORDEM_PLATAFORMAS.indexOf(a) - ORDEM_PLATAFORMAS.indexOf(b),
  );
}

export function duracaoPadrao(plataforma: Plataforma): number | null {
  const duracoes = PLATAFORMAS[plataforma].duracoes;
  if (duracoes.length === 0) return null;
  // YouTube começa em 3 min, TikTok em 30s — os formatos mais usados.
  return duracoes[Math.min(1, duracoes.length - 1)].segundos;
}

export function rotuloDuracao(plataforma: Plataforma, segundos: number | null) {
  if (segundos == null) return null;
  return (
    PLATAFORMAS[plataforma].duracoes.find((d) => d.segundos === segundos)?.rotulo ??
    `${segundos}s`
  );
}

/**
 * Fontes oferecidas no onboarding.
 *
 * Atenção ao detalhe do `next/font`: ele auto-hospeda as fontes com um nome
 * embaralhado (algo como "__Fraunces_a1b2c3"), acessível SÓ pela variável CSS.
 * Por isso guardamos os três formatos:
 *  - `css`        → para usar em style={{ fontFamily }} na tela (usa a variável);
 *  - `variavel`   → para o canvas descobrir o nome real em tempo de execução;
 *  - `familiaSvg` → nome comum, para o arquivo .svg abrir bem em outros programas.
 */
export const FONTES = [
  {
    id: "Inter",
    nome: "Inter",
    css: "var(--font-inter), sans-serif",
    variavel: "--font-inter",
    familiaSvg: "Inter, sans-serif",
    vibe: "Moderna e limpa",
  },
  {
    id: "Poppins",
    nome: "Poppins",
    css: "var(--font-poppins), sans-serif",
    variavel: "--font-poppins",
    familiaSvg: "Poppins, sans-serif",
    vibe: "Amigável e redonda",
  },
  {
    id: "Montserrat",
    nome: "Montserrat",
    css: "var(--font-montserrat), sans-serif",
    variavel: "--font-montserrat",
    familiaSvg: "Montserrat, sans-serif",
    vibe: "Forte e geométrica",
  },
  {
    id: "Playfair Display",
    nome: "Playfair Display",
    css: "var(--font-playfair), serif",
    variavel: "--font-playfair",
    familiaSvg: "'Playfair Display', serif",
    vibe: "Elegante e clássica",
  },
  {
    id: "Fraunces",
    nome: "Fraunces",
    css: "var(--font-fraunces), serif",
    variavel: "--font-fraunces",
    familiaSvg: "Fraunces, serif",
    vibe: "Artesanal e acolhedora",
  },
] as const;

export type FonteId = (typeof FONTES)[number]["id"];

function acharFonte(id: string) {
  return FONTES.find((f) => f.id === id) ?? FONTES[0];
}

/** Para usar em `style={{ fontFamily }}` dentro da aplicação. */
export function fonteCss(id: string): string {
  return acharFonte(id).css;
}

/** Nome da variável CSS, para o canvas resolver a família real. */
export function fonteVariavel(id: string): string {
  return acharFonte(id).variavel;
}

/** Nome comum da família, usado dentro do arquivo .svg. */
export function fonteFamiliaSvg(id: string): string {
  return acharFonte(id).familiaSvg;
}
