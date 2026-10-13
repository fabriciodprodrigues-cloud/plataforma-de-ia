import { cache } from "react";
import type { Plan, CreditPack } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Leitura do catálogo comercial e das configurações da plataforma.
 *
 * Tudo aqui vive no banco porque o painel admin edita: criar um plano, mudar um
 * preço ou arquivar um pacote tem que aparecer na landing sem deploy. O que
 * continua em código é só o que NÃO é comercial — quanto cada ação custa em
 * créditos (`CUSTO` em src/lib/planos.ts), que é regra de produto.
 *
 * As funções de leitura usam `cache()` do React: numa mesma renderização, a
 * landing lê os planos uma vez só, mesmo que vários componentes peçam.
 */

export type { Plan, CreditPack };

/** Planos visíveis para novos assinantes, na ordem de exibição. */
export const listarPlanosAtivos = cache(async (): Promise<Plan[]> =>
  prisma.plan.findMany({
    where: { ativo: true },
    orderBy: [{ ordemExibicao: "asc" }, { precoCentavos: "asc" }],
  }),
);

/** Todos os planos, inclusive arquivados. Para o admin e para quem já assina. */
export const listarTodosOsPlanos = cache(async (): Promise<Plan[]> =>
  prisma.plan.findMany({ orderBy: [{ ativo: "desc" }, { ordemExibicao: "asc" }] }),
);

export const obterPlanoPorSlug = cache(async (slug: string): Promise<Plan | null> =>
  prisma.plan.findUnique({ where: { slug } }),
);

/**
 * Plano de quem acabou de criar conta: o ativo mais barato.
 *
 * Derivado em vez de fixo num slug. Se o dono arquivar o Essencial e criar um
 * "Básico", contas novas seguem funcionando — um slug fixo no código quebraria
 * silenciosamente no cadastro, que é o pior lugar para quebrar.
 */
export const planoPadrao = cache(async (): Promise<Plan> => {
  const ativos = await listarPlanosAtivos();
  if (ativos[0]) return ativos[0];

  // Nenhum plano ativo é configuração inválida, não estado normal. Cair no mais
  // barato que existir evita travar o cadastro enquanto o dono arruma.
  const qualquer = await prisma.plan.findFirst({ orderBy: { precoCentavos: "asc" } });
  if (!qualquer) {
    throw new Error(
      "Nenhum plano cadastrado. Rode prisma/sql/004-planos-no-banco-e-admin.sql.",
    );
  }
  return qualquer;
});

export const listarPacotesAtivos = cache(async (): Promise<CreditPack[]> =>
  prisma.creditPack.findMany({
    where: { ativo: true },
    orderBy: { ordemExibicao: "asc" },
  }),
);

/**
 * Valor vigente de uma configuração.
 *
 * `platform_settings` guarda histórico: cada mudança é uma linha nova com a
 * data a partir da qual vale. Aqui pegamos a mais recente que já entrou em
 * vigor. É o que permite, depois, recalcular o custo de um consumo antigo com o
 * preço daquele dia em vez de reescrever o histórico financeiro.
 */
export const obterConfig = cache(
  async <T>(chave: string, padrao: T, quando?: Date): Promise<T> => {
    const linha = await prisma.platformSetting.findFirst({
      where: { chave, vigenteDesde: { lte: quando ?? new Date() } },
      orderBy: { vigenteDesde: "desc" },
    });
    return linha ? (linha.valorJson as T) : padrao;
  },
);

/** A landing só mostra preço quando o admin liga esta chave. Padrão: desligada. */
export async function mostrarPrecosNaLanding(): Promise<boolean> {
  const v = await obterConfig<{ ativo: boolean }>("mostrar_precos_landing", {
    ativo: false,
  });
  return v.ativo === true;
}

/** Custos unitários para as estimativas do financeiro, em reais. */
export async function custosUnitarios(quando?: Date) {
  const [credito, minutoVideo, infra] = await Promise.all([
    obterConfig<{ reais: number }>("custo_credito", { reais: 0.0723 }, quando),
    obterConfig<{ reais: number }>("custo_minuto_video", { reais: 0.162 }, quando),
    obterConfig<{ reais: number }>("infra_fixa_mensal", { reais: 891 }, quando),
  ]);
  return {
    porCredito: credito.reais,
    porMinutoVideo: minutoVideo.reais,
    infraFixaMensal: infra.reais,
  };
}

export function formatarPreco(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** "1 rede", "Até 3 redes", "Redes ilimitadas". Zero significa sem limite. */
export function rotuloPlataformas(max: number): string {
  if (max === 0) return "Redes ilimitadas";
  if (max === 1) return "1 rede";
  return `Até ${max} redes`;
}
