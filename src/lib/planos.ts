import type { NomePlano } from "@/generated/prisma/enums";

/**
 * Catálogo de planos e pacotes.
 *
 * Fica no código, e não numa tabela `plans` como a especificação sugeria.
 * O motivo é operacional: não existe tela de administração, então mudar preço
 * pelo banco significaria escrever SQL na mão — não é mais fácil que um deploy.
 * Em compensação, tabela vazia deixa de ser um modo de falha: se o seed não
 * rodasse na produção, TODA verificação de plano quebraria de uma vez. Aqui o
 * catálogo é versionado junto com o código que depende dele.
 *
 * O que fica no banco é só o que muda por usuário: assinatura, saldo e o
 * histórico de consumo.
 */

/**
 * Custo em créditos por ação.
 *
 * A régua é 1 crédito ≈ R$ 0,10 de custo real de backend. Os números vieram de
 * medição, não de chute:
 *  - conteúdo (roteiro/legenda + SEO): R$ 0,10  → 1 crédito
 *  - arte (template + renderização):   R$ 0,064 → 1 crédito, com margem
 *  - vídeo processado:                 R$ 0,162/min → 2 créditos/min
 *
 * A pesquisa de nicho (R$ 0,054) NÃO cobra separado: ela é insumo da geração de
 * conteúdo, e cobrar duas vezes pelo mesmo pedido confundiria o usuário.
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

export type Plano = {
  id: NomePlano;
  nome: string;
  /** Em centavos, para não carregar float de dinheiro por aí. */
  precoCentavos: number;
  creditosMensais: number;
  minutosVideoMensais: number;
  /** Quantas redes sociais o usuário pode manter ativas ao mesmo tempo. */
  maxPlataformas: number;
  recursos: Record<Recurso, boolean>;
  /** Frase curta de vitrine. */
  resumo: string;
};

export const PLANOS: Record<NomePlano, Plano> = {
  ESSENCIAL: {
    id: "ESSENCIAL",
    nome: "Essencial",
    precoCentavos: 4700,
    creditosMensais: 40,
    minutosVideoMensais: 0,
    maxPlataformas: 1,
    recursos: { teleprompter: false, bancoImagens: false, video: false },
    resumo: "Para quem está começando em uma rede só.",
  },
  CRIADOR: {
    id: "CRIADOR",
    nome: "Criador",
    precoCentavos: 9700,
    creditosMensais: 120,
    minutosVideoMensais: 0,
    maxPlataformas: 3,
    recursos: { teleprompter: true, bancoImagens: true, video: false },
    resumo: "Para quem publica em várias redes toda semana.",
  },
  COMPLETO: {
    id: "COMPLETO",
    nome: "Completo",
    precoCentavos: 19700,
    creditosMensais: 300,
    minutosVideoMensais: 60,
    // Quatro é o total que existe hoje. "Ilimitado" seria propaganda: quando
    // entrar uma quinta rede, este número sobe junto.
    maxPlataformas: 4,
    recursos: { teleprompter: true, bancoImagens: true, video: true },
    resumo: "Tudo, incluindo edição de vídeo com IA.",
  },
};

/** Plano de quem ainda não assinou nada. */
export const PLANO_PADRAO: NomePlano = "ESSENCIAL";

export const ORDEM_PLANOS: NomePlano[] = ["ESSENCIAL", "CRIADOR", "COMPLETO"];

export type Pacote = {
  id: string;
  nome: string;
  /** Créditos, ou minutos de vídeo quando `tipo` é "minutoVideo". */
  quantidade: number;
  precoCentavos: number;
  tipo: "credito" | "minutoVideo";
};

/**
 * Pacotes avulsos, para quem esgota o saldo antes de virar o ciclo.
 *
 * O preço por crédito avulso é sempre MAIOR que o de qualquer plano — isso é
 * de propósito. Se comprar avulso saísse mais barato que subir de plano, o
 * pacote canibalizaria a assinatura, que é a receita previsível.
 */
export const PACOTES: Pacote[] = [
  { id: "P", nome: "Pacote P", quantidade: 30, precoCentavos: 3900, tipo: "credito" },
  { id: "M", nome: "Pacote M", quantidade: 80, precoCentavos: 8900, tipo: "credito" },
  { id: "G", nome: "Pacote G", quantidade: 200, precoCentavos: 17900, tipo: "credito" },
  {
    id: "VIDEO30",
    nome: "Vídeo extra",
    quantidade: 30,
    precoCentavos: 5900,
    tipo: "minutoVideo",
  },
];

export function formatarPreco(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Rótulo de um recurso, para as mensagens de bloqueio. */
export const ROTULO_RECURSO: Record<Recurso, string> = {
  teleprompter: "O teleprompter",
  bancoImagens: "O banco de imagens",
  video: "A edição de vídeo",
};

/** O plano mais barato que libera um recurso. Usado no texto de upgrade. */
export function menorPlanoCom(recurso: Recurso): Plano {
  const encontrado = ORDEM_PLANOS.map((id) => PLANOS[id]).find(
    (p) => p.recursos[recurso],
  );
  // Todo recurso existe em pelo menos um plano; o fallback só satisfaz o tipo.
  return encontrado ?? PLANOS.COMPLETO;
}

/**
 * Mensagem de bloqueio de plano, já apontando o plano que resolve.
 *
 * Mora aqui, e não no serviço de créditos, porque componentes de tela precisam
 * dela — e o serviço importa o Prisma, que não pode entrar no pacote enviado ao
 * navegador. Este arquivo é puro de propósito.
 */
export function mensagemUpgrade(recurso: Recurso): string {
  const necessario = menorPlanoCom(recurso);
  return `${ROTULO_RECURSO[recurso]} faz parte do plano ${necessario.nome} (${formatarPreco(necessario.precoCentavos)}/mês).`;
}
