import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { criarClienteServidor } from "@/lib/supabase/server";

/** Usuário autenticado no Supabase, ou null. */
export async function obterUsuarioAuth() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Garante que existe uma linha em `users` com o mesmo id do Supabase Auth.
 * O Supabase cuida da senha; essa tabela local só existe para as outras tabelas
 * (marca, nichos, roteiros) terem em quem se pendurar.
 */
export async function garantirUsuarioLocal(params: {
  id: string;
  email: string;
  nome?: string | null;
}) {
  const existente = await prisma.user.findUnique({ where: { id: params.id } });
  if (existente) return existente;

  // No primeiro acesso, a renderização da página e a ação do servidor chegam aqui
  // ao mesmo tempo: as duas veem que não existe e as duas tentam criar. O upsert
  // resolve o empate dentro do próprio banco, em vez de uma delas quebrar.
  return prisma.user.upsert({
    where: { id: params.id },
    update: {},
    create: { id: params.id, email: params.email, nome: params.nome ?? null },
  });
}

/**
 * Usuário logado com os dados do app (marca, plataformas, nicho).
 * Redireciona para o login se não houver sessão.
 */
export async function exigirUsuario() {
  const authUser = await obterUsuarioAuth();
  if (!authUser) redirect("/entrar");

  await garantirUsuarioLocal({
    id: authUser.id,
    email: authUser.email ?? "",
    nome: (authUser.user_metadata?.nome as string | undefined) ?? null,
  });

  try {
    const usuario = await prisma.user.findUniqueOrThrow({
      where: { id: authUser.id },
      include: {
        brandKit: true,
        platformPreferences: true,
        niches: { orderBy: { criadoEm: "asc" }, take: 1 },
      },
    });
    return usuario;
  } catch (erro) {
    console.error("[auth] erro ao buscar usuário:", erro);
    const usuarioBasico = await prisma.user.findUnique({
      where: { id: authUser.id },
    });
    if (!usuarioBasico) redirect("/entrar");
    return {
      ...usuarioBasico,
      brandKit: null,
      platformPreferences: [],
      niches: [],
    };
  }
}

export type UsuarioCompleto = Awaited<ReturnType<typeof exigirUsuario>>;
