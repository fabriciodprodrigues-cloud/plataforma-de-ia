import { cache } from "react";
import { notFound } from "next/navigation";
import { PapelUsuario } from "@/generated/prisma/enums";
import { obterUsuarioAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Porteiro do painel do dono.
 *
 * Responde 404, não 403, para todo mundo que não é ADMIN_MASTER — inclusive
 * quem nem está logado. Um 403 confirmaria que a rota existe; o 404 não conta
 * nada a quem está só tentando a sorte em /admin.
 *
 * Precisa ser chamado em TODA página e em TODA server action do admin. Esconder
 * o botão não é proteção, e o middleware sozinho também não: ele barra a
 * navegação, mas uma server action é um POST que chega direto no servidor, sem
 * passar pela mesma checagem de rota.
 */
export const exigirAdmin = cache(async () => {
  const authUser = await obterUsuarioAuth();
  if (!authUser) notFound();

  const usuario = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      nome: true,
      papel: true,
      suspensoEm: true,
    },
  });

  if (!usuario || usuario.papel !== PapelUsuario.ADMIN_MASTER) notFound();
  // Admin suspenso também perde o acesso. Evita que suspender a própria conta
  // por engano deixe uma porta aberta.
  if (usuario.suspensoEm) notFound();

  return usuario;
});

export type AdminLogado = Awaited<ReturnType<typeof exigirAdmin>>;

/** Iniciais para o avatar do cabeçalho. */
export function iniciais(nome: string | null, email: string): string {
  const base = nome?.trim() || email;
  return base
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
