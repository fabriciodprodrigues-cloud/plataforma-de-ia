/**
 * Regras de produto sobre consumo. Não é catálogo.
 *
 * O catálogo comercial (planos, preços, pacotes) saiu daqui e foi para o banco
 * quando o painel admin passou a existir — ver src/lib/servicos/catalogo.ts.
 * O que ficou é o que o dono NÃO edita por tela: quanto cada ação custa em
 * créditos, que é decisão de produto calibrada em custo real de API.
 *
 * Este arquivo é puro de propósito: componentes de tela importam dele, e o
 * serviço de créditos importa o Prisma, que não pode entrar no pacote do
 * navegador.
 */

/**
 * Custo em créditos por ação.
 *
 * A régua é 1 crédito ≈ R$ 0,10 de custo real de backend:
 *  - conteúdo (roteiro/legenda + SEO): R$ 0,10  → 1 crédito
 *  - arte (template + renderização):   R$ 0,064 → 1 crédito, com margem
 *  - vídeo processado:                 R$ 0,162/min → 2 créditos/min
 */
export const CUSTO = {
  /** Um roteiro/legenda + SEO, por rede social. */
  CONTEUDO: 1,
  /** Uma arte gerada ou regerada. */
  ARTE: 1,
  /** Por minuto de vídeo processado (fase futura). */
  VIDEO_POR_MINUTO: 2,
} as const;

/** Recursos que são trava de PLANO, não de crédito. */
export type Recurso = "teleprompter" | "bancoImagens" | "video";

/** Rótulo de um recurso, para as mensagens de bloqueio. */
export const ROTULO_RECURSO: Record<Recurso, string> = {
  teleprompter: "O teleprompter",
  bancoImagens: "O banco de imagens",
  video: "A edição de vídeo",
};
