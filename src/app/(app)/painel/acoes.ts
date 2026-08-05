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

/**
 * Roda logo depois do onboarding: pesquisa o nicho e cria os primeiros temas.
 * É a etapa que o usuário vê como "Estudando seu nicho...".
 */
export async function prepararPainel(): Promise<Resultado> {
  try {
    const { usuario, nicho } = await contexto();

    const pesquisa = await obterPesquisaDoNicho({
      nicheId: nicho.id,
      nomeNicho: nicho.nome,
    });

    const jaTem = await prisma.contentIdea.count({
      where: { nicheId: nicho.id, status: { not: StatusIdeia.DESCARTADO } },
    });

    if (jaTem === 0) {
      const temas = await gerarTemas({
        nicho: nicho.nome,
        nomeMarca: usuario.brandKit?.nomeMarca ?? nicho.nome,
        pesquisa,
      });

      if (temas.length === 0) {
        return {
          ok: false,
          erro: "Não conseguimos montar temas dessa vez. Tente atualizar a pesquisa.",
        };
      }

      await prisma.contentIdea.createMany({
        data: temas.map((t) => ({
          nicheId: nicho.id,
          titulo: t.titulo,
          justificativa: t.justificativa,
          status: StatusIdeia.SUGERIDO,
        })),
      });
    }

    revalidatePath("/painel");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: traduzirErroIA(erro) };
  }
}

/** Botão "Quero mais ideias" — gera temas novos sem repetir os que já existem. */
export async function gerarMaisTemas(): Promise<Resultado> {
  try {
    const { usuario, nicho } = await contexto();

    const pesquisa = await obterPesquisaDoNicho({
      nicheId: nicho.id,
      nomeNicho: nicho.nome,
    });

    const existentes = await prisma.contentIdea.findMany({
      where: { nicheId: nicho.id },
      select: { titulo: true },
      orderBy: { criadoEm: "desc" },
      take: 30,
    });

    const temas = await gerarTemas({
      nicho: nicho.nome,
      nomeMarca: usuario.brandKit?.nomeMarca ?? nicho.nome,
      pesquisa,
      evitar: existentes.map((e) => e.titulo),
    });

    if (temas.length === 0) {
      return { ok: false, erro: "Não veio nenhum tema novo agora. Tente de novo." };
    }

    await prisma.contentIdea.createMany({
      data: temas.map((t) => ({
        nicheId: nicho.id,
        titulo: t.titulo,
        justificativa: t.justificativa,
        status: StatusIdeia.SUGERIDO,
      })),
    });

    revalidatePath("/painel");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: traduzirErroIA(erro) };
  }
}

/** Refaz a pesquisa do nicho do zero, ignorando o cache. */
export async function atualizarPesquisa(): Promise<Resultado> {
  try {
    const { nicho } = await contexto();
    await obterPesquisaDoNicho({
      nicheId: nicho.id,
      nomeNicho: nicho.nome,
      forcar: true,
    });
    revalidatePath("/painel");
    return { ok: true };
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
