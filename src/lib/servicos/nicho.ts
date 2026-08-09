import { prisma } from "@/lib/prisma";
import { pesquisar, type AoProgredir } from "@/lib/ia/pesquisa";

/** Depois disso a pesquisa é considerada velha e refeita. */
const VALIDADE_DIAS = 7;

/**
 * Devolve a pesquisa do nicho, reaproveitando a última se ainda estiver fresca.
 * Cada pesquisa custa dinheiro e tempo — não faz sentido repetir a mesma toda
 * vez que o usuário abre o painel.
 */
export async function obterPesquisaDoNicho(params: {
  nicheId: string;
  nomeNicho: string;
  forcar?: boolean;
  /** Repassado para a pesquisa quando a tela quer acompanhar o andamento. */
  aoProgredir?: AoProgredir;
}): Promise<string> {
  if (!params.forcar) {
    const limite = new Date(Date.now() - VALIDADE_DIAS * 24 * 60 * 60 * 1000);
    const recente = await prisma.nicheResearch.findFirst({
      where: { nicheId: params.nicheId, termo: null, coletadoEm: { gte: limite } },
      orderBy: { coletadoEm: "desc" },
    });
    if (recente) return recente.resumo;
  }

  const { resumo, fontes } = await pesquisar({
    nicho: params.nomeNicho,
    aoProgredir: params.aoProgredir,
  });

  await prisma.nicheResearch.create({
    data: { nicheId: params.nicheId, termo: null, resumo, fontes },
  });

  return resumo;
}

/**
 * Pesquisa um tema específico dentro do nicho (o que o usuário digitou).
 * Guarda no mesmo cache, identificado pelo termo.
 */
export async function pesquisarTema(params: {
  nicheId: string;
  nomeNicho: string;
  termo: string;
}): Promise<string> {
  const limite = new Date(Date.now() - VALIDADE_DIAS * 24 * 60 * 60 * 1000);
  const recente = await prisma.nicheResearch.findFirst({
    where: {
      nicheId: params.nicheId,
      termo: params.termo,
      coletadoEm: { gte: limite },
    },
    orderBy: { coletadoEm: "desc" },
  });
  if (recente) return recente.resumo;

  const { resumo, fontes } = await pesquisar({
    nicho: params.nomeNicho,
    termo: params.termo,
  });

  await prisma.nicheResearch.create({
    data: { nicheId: params.nicheId, termo: params.termo, resumo, fontes },
  });

  return resumo;
}
