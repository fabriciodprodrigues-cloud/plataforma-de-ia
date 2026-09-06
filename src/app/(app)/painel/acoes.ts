"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { StatusIdeia } from "@/generated/prisma/enums";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { traduzirErroIA } from "@/lib/ia/cliente";
import { gerarTemas, refinarTemaProprio } from "@/lib/ia/temas";
import { obterPesquisaDoNicho, pesquisarTema } from "@/lib/servicos/nicho";

export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

async function contexto() {
  const usuario = await exigirUsuario();
  const nicho = usuario.niches[0];
  if (!nicho) {
    throw new Error("Seu nicho ainda não foi configurado. Refaça o cadastro inicial.");
  }
  return { usuario, nicho };
}

// A preparação do primeiro acesso vive em src/app/api/preparar/route.ts, e não
// aqui: ela leva perto de três minutos e a tela precisa acompanhar o andamento.
// Server action só devolve valor no fim, então não serve para isso.

/**
 * Gera temas a partir de uma pesquisa e grava os que forem inéditos.
 *
 * Os dois botões do painel terminam aqui. A diferença entre eles é só se a
 * pesquisa foi reaproveitada do cache ou refeita do zero — o que acontece
 * depois é o mesmo, e é isso que faz os dois produzirem efeito visível.
 */
async function gerarEGravarTemas(params: {
  nicheId: string;
  nomeNicho: string;
  nomeMarca: string;
  pesquisa: string;
}): Promise<Resultado> {
  const existentes = await prisma.contentIdea.findMany({
    where: { nicheId: params.nicheId },
    select: { titulo: true },
    orderBy: { criadoEm: "desc" },
    take: 30,
  });

  const temas = await gerarTemas({
    nicho: params.nomeNicho,
    nomeMarca: params.nomeMarca,
    pesquisa: params.pesquisa,
    evitar: existentes.map((e) => e.titulo),
  });

  if (temas.length === 0) {
    return { ok: false, erro: "Não veio nenhum tema novo agora. Tente de novo." };
  }

  await prisma.contentIdea.createMany({
    data: temas.map((t) => ({
      nicheId: params.nicheId,
      titulo: t.titulo,
      justificativa: t.justificativa,
      status: StatusIdeia.SUGERIDO,
    })),
  });

  revalidatePath("/painel");
  return { ok: true };
}

/** Botão "Quero mais ideias" — temas novos a partir da pesquisa já em cache. */
export async function gerarMaisTemas(): Promise<Resultado> {
  try {
    const { usuario, nicho } = await contexto();

    const pesquisa = await obterPesquisaDoNicho({
      nicheId: nicho.id,
      nomeNicho: nicho.nome,
    });

    return gerarEGravarTemas({
      nicheId: nicho.id,
      nomeNicho: nicho.nome,
      nomeMarca: usuario.brandKit?.nomeMarca ?? nicho.nome,
      pesquisa,
    });
  } catch (erro) {
    return { ok: false, erro: traduzirErroIA(erro) };
  }
}

/**
 * Botão "Atualizar pesquisa" — refaz a pesquisa do zero E sugere temas com ela.
 *
 * Antes esta ação parava depois de gravar a pesquisa nova. Como a lista de
 * temas não é derivada da pesquisa em tempo de leitura, o usuário esperava
 * minutos, pagava uma busca na web e via exatamente a mesma lista — um botão
 * sem efeito observável. Os temas antigos são preservados (podem estar
 * favoritados ou já ter conteúdo gerado); os novos entram sem repetir.
 */
export async function atualizarPesquisa(): Promise<Resultado> {
  try {
    const { usuario, nicho } = await contexto();

    const pesquisa = await obterPesquisaDoNicho({
      nicheId: nicho.id,
      nomeNicho: nicho.nome,
      forcar: true,
    });

    return gerarEGravarTemas({
      nicheId: nicho.id,
      nomeNicho: nicho.nome,
      nomeMarca: usuario.brandKit?.nomeMarca ?? nicho.nome,
      pesquisa,
    });
  } catch (erro) {
    return { ok: false, erro: traduzirErroIA(erro) };
  }
}

const esquemaTema = z
  .string()
  .trim()
  .min(4, "Escreva um pouco mais sobre o tema.")
  .max(160, "Tema muito longo. Resuma em uma frase.");

/** O usuário digitou o próprio tema: pesquisamos e criamos a ideia. */
export async function criarTemaProprio(
  termoBruto: string,
): Promise<Resultado<{ ideaId: string }>> {
  const validado = esquemaTema.safeParse(termoBruto);
  if (!validado.success) {
    return { ok: false, erro: validado.error.issues[0].message };
  }
  const termo = validado.data;

  try {
    const { nicho } = await contexto();

    const pesquisa = await pesquisarTema({
      nicheId: nicho.id,
      nomeNicho: nicho.nome,
      termo,
    });

    const tema = await refinarTemaProprio({
      nicho: nicho.nome,
      temaDigitado: termo,
      pesquisa,
    });

    const ideia = await prisma.contentIdea.create({
      data: {
        nicheId: nicho.id,
        titulo: tema.titulo,
        justificativa: tema.justificativa,
        status: StatusIdeia.PERSONALIZADO,
      },
    });

    revalidatePath("/painel");
    return { ok: true, ideaId: ideia.id };
  } catch (erro) {
    return { ok: false, erro: traduzirErroIA(erro) };
  }
}

/** Favoritar ou descartar um tema da lista. */
export async function mudarStatusTema(
  ideaId: string,
  status: "FAVORITO" | "DESCARTADO" | "SUGERIDO",
): Promise<Resultado> {
  try {
    const { nicho } = await contexto();
    const atualizados = await prisma.contentIdea.updateMany({
      where: { id: ideaId, nicheId: nicho.id },
      data: { status: StatusIdeia[status] },
    });
    if (atualizados.count === 0) {
      return { ok: false, erro: "Esse tema não foi encontrado." };
    }
    revalidatePath("/painel");
    return { ok: true };
  } catch (erro) {
    console.error("[mudarStatusTema]", erro);
    return { ok: false, erro: "Não conseguimos atualizar o tema agora." };
  }
}
