"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Plataforma, StatusIdeia } from "@/generated/prisma/enums";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLATAFORMAS, duracaoPadrao, ordenarPlataformas } from "@/lib/constants";
import { ErroIA, traduzirErroIA } from "@/lib/ia/cliente";
import { gerarConteudoPlataforma } from "@/lib/ia/conteudo";
import { obterPesquisaDoNicho, pesquisarTema } from "@/lib/servicos/nicho";
import { gerarSvgDaArte, type DadosMarca } from "@/lib/servicos/arte";

export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

async function contextoIdeia(ideaId: string) {
  const usuario = await exigirUsuario();

  const ideia = await prisma.contentIdea.findFirst({
    // O filtro pelo dono impede alguém abrir o conteúdo de outra conta pela URL.
    where: { id: ideaId, niche: { userId: usuario.id } },
    include: { niche: true },
  });
  if (!ideia) throw new ErroIA("Esse conteúdo não foi encontrado na sua conta.");

  const marca: DadosMarca = {
    nomeMarca: usuario.brandKit?.nomeMarca ?? ideia.niche.nome,
    corPrimaria: usuario.brandKit?.corPrimaria ?? "#6D4AFF",
    fonte: usuario.brandKit?.fonte ?? "Inter",
    logoUrl: usuario.brandKit?.logoUrl ?? null,
  };

  const plataformas = ordenarPlataformas(
    usuario.platformPreferences.map((p) => p.plataforma),
  );

  // Fora de `marca` de propósito: `DadosMarca` é o que a arte consome (cor,
  // fonte, logo). O arquétipo é assunto do texto, não do desenho.
  const voz = {
    arquetipo: usuario.brandKit?.arquetipo ?? null,
    gatilho: usuario.brandKit?.gatilhoPreferido ?? null,
  };

  return { usuario, ideia, marca, voz, plataformas };
}

/** A pesquisa que embasa o conteúdo: do tema, se for personalizado; do nicho, se não. */
async function pesquisaDeBase(ideia: {
  id: string;
  titulo: string;
  status: StatusIdeia;
  nicheId: string;
  niche: { nome: string };
}) {
  if (ideia.status === StatusIdeia.PERSONALIZADO) {
    return pesquisarTema({
      nicheId: ideia.nicheId,
      nomeNicho: ideia.niche.nome,
      termo: ideia.titulo,
    });
  }
  return obterPesquisaDoNicho({
    nicheId: ideia.nicheId,
    nomeNicho: ideia.niche.nome,
  });
}

/**
 * Gera conteúdo + SEO + arte para TODAS as plataformas escolhidas pelo usuário.
 * Cada plataforma vira um registro separado — é isso que garante que o texto do
 * Instagram nunca apareça na aba do YouTube.
 */
export async function gerarConteudos(
  ideaId: string,
): Promise<Resultado<{ falhas: string[] }>> {
  try {
    const { usuario, ideia, marca, voz, plataformas } = await contextoIdeia(ideaId);

    if (plataformas.length === 0) {
      return {
        ok: false,
        erro: 'Você ainda não escolheu nenhuma rede social. Ajuste em "Minha marca".',
      };
    }

    const jaExistem = await prisma.script.findMany({
      where: { ideaId: ideia.id },
      select: { plataforma: true },
    });
    const feitas = new Set(jaExistem.map((s) => s.plataforma));
    const pendentes = plataformas.filter((p) => !feitas.has(p));

    if (pendentes.length === 0) {
      return { ok: true, falhas: [] };
    }

    const pesquisa = await pesquisaDeBase(ideia);

    // Em paralelo: o usuário espera pela plataforma mais lenta, não pela soma.
    const resultados = await Promise.allSettled(
      pendentes.map(async (plataforma) => {
        const meta = PLATAFORMAS[plataforma];
        const duracaoSegundos = duracaoPadrao(plataforma);

        const gerado = await gerarConteudoPlataforma({
          plataforma,
          duracaoSegundos,
          tema: ideia.titulo,
          justificativa: ideia.justificativa,
          pesquisa,
          nicho: ideia.niche.nome,
          nomeMarca: marca.nomeMarca,
          arquetipo: voz.arquetipo,
          gatilho: voz.gatilho,
        });

        const svg = gerarSvgDaArte({
          plataforma,
          marca,
          texto: gerado.textoArte,
          fundo: "solido",
        });

        await prisma.script.create({
          data: {
            ideaId: ideia.id,
            plataforma,
            tipo: meta.tipoConteudo,
            conteudo: gerado.conteudo,
            duracaoSegundos,
            arquetipoUsado: gerado.arquetipoUsado,
            gatilhoUsado: gerado.gatilhoUsado,
            seo: {
              create: {
                plataforma,
                titulo: gerado.seo.titulo,
                descricao: gerado.seo.descricao,
                tagsOuHashtags: gerado.seo.tags,
              },
            },
            arte: {
              create: {
                userId: usuario.id,
                plataforma,
                formato: meta.formatoArte,
                templateSvg: svg,
                textoArte: gerado.textoArte,
                fundo: "solido",
                termoFoto: gerado.buscaFoto,
              },
            },
          },
        });

        return plataforma;
      }),
    );

    const falhas: string[] = [];
    resultados.forEach((r, indice) => {
      if (r.status === "rejected") {
        const plataforma = pendentes[indice];
        console.error(`[gerarConteudos:${plataforma}]`, r.reason);
        falhas.push(`${PLATAFORMAS[plataforma].nome}: ${traduzirErroIA(r.reason)}`);
      }
    });

    // Todas falharam — isso é erro, não sucesso parcial.
    if (falhas.length === pendentes.length) {
      return { ok: false, erro: falhas[0] };
    }

    revalidatePath(`/conteudo/${ideaId}`);
    revalidatePath("/painel");
    return { ok: true, falhas };
  } catch (erro) {
    return { ok: false, erro: traduzirErroIA(erro) };
  }
}

/** Regera só o roteiro de uma plataforma — usado pelo seletor de duração. */
export async function regerarConteudo(params: {
  ideaId: string;
  plataforma: Plataforma;
  duracaoSegundos: number | null;
}): Promise<Resultado<{ conteudo: string }>> {
  try {
    const { ideia, marca, voz } = await contextoIdeia(params.ideaId);

    const script = await prisma.script.findUnique({
      where: { ideaId_plataforma: { ideaId: ideia.id, plataforma: params.plataforma } },
    });
    if (!script) return { ok: false, erro: "Esse conteúdo ainda não foi criado." };

    // Só aceita durações que a plataforma realmente oferece.
    const permitidas = PLATAFORMAS[params.plataforma].duracoes.map((d) => d.segundos);
    if (params.duracaoSegundos !== null && !permitidas.includes(params.duracaoSegundos)) {
      return { ok: false, erro: "Essa duração não existe para essa rede." };
    }

    const pesquisa = await pesquisaDeBase(ideia);

    const gerado = await gerarConteudoPlataforma({
      plataforma: params.plataforma,
      duracaoSegundos: params.duracaoSegundos,
      tema: ideia.titulo,
      justificativa: ideia.justificativa,
      pesquisa,
      nicho: ideia.niche.nome,
      nomeMarca: marca.nomeMarca,
      arquetipo: voz.arquetipo,
      gatilho: voz.gatilho,
    });

    await prisma.script.update({
      where: { id: script.id },
      data: {
        conteudo: gerado.conteudo,
        duracaoSegundos: params.duracaoSegundos,
        arquetipoUsado: gerado.arquetipoUsado,
        gatilhoUsado: gerado.gatilhoUsado,
        versao: { increment: 1 },
        editadoPeloUsuario: false,
      },
    });

    revalidatePath(`/conteudo/${params.ideaId}`);
    return { ok: true, conteudo: gerado.conteudo };
  } catch (erro) {
    return { ok: false, erro: traduzirErroIA(erro) };
  }
}

const esquemaConteudo = z.object({
  ideaId: z.string().uuid(),
  plataforma: z.enum(Plataforma),
  conteudo: z.string().trim().min(1, "O conteúdo não pode ficar vazio."),
});

/** Salva a edição manual do roteiro/legenda. */
export async function salvarConteudo(
  entrada: z.input<typeof esquemaConteudo>,
): Promise<Resultado> {
  const validado = esquemaConteudo.safeParse(entrada);
  if (!validado.success) {
    return { ok: false, erro: validado.error.issues[0].message };
  }

  try {
    const { ideia } = await contextoIdeia(validado.data.ideaId);
    await prisma.script.update({
      where: {
        ideaId_plataforma: {
          ideaId: ideia.id,
          plataforma: validado.data.plataforma,
        },
      },
      data: { conteudo: validado.data.conteudo, editadoPeloUsuario: true },
    });
    revalidatePath(`/conteudo/${validado.data.ideaId}`);
    return { ok: true };
  } catch (erro) {
    console.error("[salvarConteudo]", erro);
    return { ok: false, erro: "Não conseguimos salvar sua edição. Tente de novo." };
  }
}

const esquemaSeo = z.object({
  ideaId: z.string().uuid(),
  plataforma: z.enum(Plataforma),
  titulo: z.string().trim().max(200),
  descricao: z.string().trim().max(5000),
  tags: z.array(z.string().trim().max(60)).max(30),
});

/** Salva a edição manual do SEO. */
export async function salvarSeo(
  entrada: z.input<typeof esquemaSeo>,
): Promise<Resultado> {
  const validado = esquemaSeo.safeParse(entrada);
  if (!validado.success) {
    return { ok: false, erro: validado.error.issues[0].message };
  }
  const d = validado.data;

  try {
    const { ideia } = await contextoIdeia(d.ideaId);
    const script = await prisma.script.findUnique({
      where: { ideaId_plataforma: { ideaId: ideia.id, plataforma: d.plataforma } },
      select: { id: true },
    });
    if (!script) return { ok: false, erro: "Conteúdo não encontrado." };

    await prisma.seoMetadata.update({
      where: { scriptId: script.id },
      data: {
        titulo: d.titulo,
        descricao: d.descricao,
        tagsOuHashtags: d.tags.filter(Boolean),
      },
    });

    revalidatePath(`/conteudo/${d.ideaId}`);
    return { ok: true };
  } catch (erro) {
    console.error("[salvarSeo]", erro);
    return { ok: false, erro: "Não conseguimos salvar o SEO. Tente de novo." };
  }
}

const esquemaArte = z.object({
  ideaId: z.string().uuid(),
  plataforma: z.enum(Plataforma),
  textoArte: z.string().trim().min(1, "A arte precisa de um texto.").max(120),
  fundo: z.enum(["solido", "foto"]),
  fotoFundoUrl: z.string().url().nullable(),
  fotoCredito: z.string().max(200).nullable(),
});

/** Salva as escolhas da arte (texto, tipo de fundo, foto). */
export async function salvarArte(
  entrada: z.input<typeof esquemaArte>,
): Promise<Resultado> {
  const validado = esquemaArte.safeParse(entrada);
  if (!validado.success) {
    return { ok: false, erro: validado.error.issues[0].message };
  }
  const d = validado.data;

  try {
    const { ideia, marca } = await contextoIdeia(d.ideaId);
    const script = await prisma.script.findUnique({
      where: { ideaId_plataforma: { ideaId: ideia.id, plataforma: d.plataforma } },
      select: { id: true },
    });
    if (!script) return { ok: false, erro: "Conteúdo não encontrado." };

    const svg = gerarSvgDaArte({
      plataforma: d.plataforma,
      marca,
      texto: d.textoArte,
      fundo: d.fundo,
      fotoUrl: d.fotoFundoUrl,
    });

    await prisma.generatedArte.update({
      where: { scriptId: script.id },
      data: {
        templateSvg: svg,
        textoArte: d.textoArte,
        fundo: d.fundo,
        fotoFundoUrl: d.fotoFundoUrl,
        fotoCredito: d.fotoCredito,
      },
    });

    revalidatePath(`/conteudo/${d.ideaId}`);
    return { ok: true };
  } catch (erro) {
    console.error("[salvarArte]", erro);
    return { ok: false, erro: "Não conseguimos salvar a arte. Tente de novo." };
  }
}
