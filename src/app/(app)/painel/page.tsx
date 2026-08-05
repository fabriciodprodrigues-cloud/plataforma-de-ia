import type { Metadata } from "next";
import { Preparando } from "./preparando";
import { ListaDeTemas } from "./lista-de-temas";
import { StatusIdeia } from "@/generated/prisma/enums";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ordenarPlataformas } from "@/lib/constants";

export const metadata: Metadata = { title: "Início" };

export default async function PaginaPainel() {
  const usuario = await exigirUsuario();
  const nicho = usuario.niches[0];

  // Sem nicho não há o que mostrar — o onboarding sempre cria um.
  if (!nicho) {
    return (
      <p className="text-tinta-500">
        Seu nicho ainda não foi configurado. Volte ao cadastro inicial para definir.
      </p>
    );
  }

  const [pesquisas, ideias] = await Promise.all([
    prisma.nicheResearch.count({ where: { nicheId: nicho.id, termo: null } }),
    prisma.contentIdea.findMany({
      where: { nicheId: nicho.id, status: { not: StatusIdeia.DESCARTADO } },
      include: { _count: { select: { scripts: true } } },
      orderBy: [{ status: "asc" }, { criadoEm: "desc" }],
    }),
  ]);

  // Primeiro acesso: ainda não pesquisamos o nicho nem geramos temas.
  if (pesquisas === 0 || ideias.length === 0) {
    return <Preparando />;
  }

  const plataformas = ordenarPlataformas(
    usuario.platformPreferences.map((p) => p.plataforma),
  );

  return (
    <ListaDeTemas
      nomeNicho={nicho.nome}
      plataformas={plataformas}
      temas={ideias.map((i) => ({
        id: i.id,
        titulo: i.titulo,
        justificativa: i.justificativa,
        status: i.status,
        conteudosProntos: i._count.scripts,
      }))}
    />
  );
}
