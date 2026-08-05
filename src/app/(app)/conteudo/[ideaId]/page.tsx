import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Estudio } from "./estudio";
import type { DadosPlataforma } from "./tipos";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ordenarPlataformas } from "@/lib/constants";

type Props = { params: Promise<{ ideaId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ideaId } = await params;
  const usuario = await exigirUsuario();
  const ideia = await prisma.contentIdea.findFirst({
    where: { id: ideaId, niche: { userId: usuario.id } },
    select: { titulo: true },
  });
  return { title: ideia?.titulo ?? "Conteúdo" };
}

export default async function PaginaConteudo({ params }: Props) {
  const { ideaId } = await params;
  const usuario = await exigirUsuario();

  const ideia = await prisma.contentIdea.findFirst({
    // O vínculo com o usuário evita abrir conteúdo de outra conta pela URL.
    where: { id: ideaId, niche: { userId: usuario.id } },
    include: {
      scripts: {
        include: { seo: true, arte: true },
        orderBy: { criadoEm: "asc" },
      },
    },
  });

  if (!ideia) notFound();

  const plataformasEscolhidas = ordenarPlataformas(
    usuario.platformPreferences.map((p) => p.plataforma),
  );

  // Um objeto por plataforma que já tem conteúdo. Nada é compartilhado entre elas.
  const dados: DadosPlataforma[] = ordenarPlataformas(
    ideia.scripts.map((s) => s.plataforma),
  ).flatMap((plataforma) => {
    const script = ideia.scripts.find((s) => s.plataforma === plataforma);
    if (!script) return [];
    return [
      {
        plataforma,
        tipo: script.tipo,
        conteudo: script.conteudo,
        duracaoSegundos: script.duracaoSegundos,
        seo: {
          titulo: script.seo?.titulo ?? "",
          descricao: script.seo?.descricao ?? "",
          tags: script.seo?.tagsOuHashtags ?? [],
        },
        arte: {
          textoArte: script.arte?.textoArte ?? ideia.titulo,
          fundo: script.arte?.fundo === "foto" ? "foto" : "solido",
          fotoFundoUrl: script.arte?.fotoFundoUrl ?? null,
          fotoCredito: script.arte?.fotoCredito ?? null,
          termoFoto: script.arte?.termoFoto ?? null,
        },
      },
    ];
  });

  return (
    <Estudio
      ideaId={ideia.id}
      titulo={ideia.titulo}
      plataformasEscolhidas={plataformasEscolhidas}
      dadosIniciais={dados}
      marca={{
        nomeMarca: usuario.brandKit?.nomeMarca ?? "Sua marca",
        corPrimaria: usuario.brandKit?.corPrimaria ?? "#6D4AFF",
        fonte: usuario.brandKit?.fonte ?? "Inter",
        logoUrl: usuario.brandKit?.logoUrl ?? null,
      }}
    />
  );
}
