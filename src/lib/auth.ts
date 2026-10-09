import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Usuário autenticado no Supabase, ou null.
 *
 * Embrulhado em `cache()` do React, que memoriza por requisição. Sem isso cada
 * `exigirUsuario()` abria uma chamada de rede nova para o Supabase, e uma única
 * página de conteúdo fazia quatro: proxy, layout, página e generateMetadata. O
 * `cache()` resolve três delas (a do proxy roda em outra invocação e continua
 * separada).
 */
export const obterUsuarioAuth = cache(async () => {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** O usuário com tudo que as telas precisam, em uma consulta só. */
const buscarCompleto = (id: string) =>
  prisma.user.findUnique({
    where: { id },
    include: {
      brandKit: true,
      platformPreferences: true,
      niches: { orderBy: { criadoEm: "asc" }, take: 1 },
    },
  });

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
  // No primeiro acesso, a renderização da página e a ação do servidor chegam aqui
  // ao mesmo tempo: as duas veem que não existe e as duas tentam criar. O upsert
  // resolve o empate dentro do próprio banco, em vez de uma delas quebrar.
  return prisma.user.upsert({
    where: { id: params.id },
    update: {},
    create: { id: params.id, email: params.email, nome: params.nome ?? null },
  });
}

type Autenticado = { id: string; email?: string; user_metadata?: { nome?: unknown } };

/** Lê (ou cria) a linha local. Devolve null quando nem isso foi possível. */
async function carregarPerfil(authUser: Autenticado) {
  try {
    // O caminho comum é a conta já existir, então ele vem primeiro e custa UMA
    // consulta. Antes havia um findUnique só para decidir se criava, seguido de
    // um findUniqueOrThrow para ler de verdade — duas idas ao banco, sempre,
    // para um cadastro que só acontece uma vez na vida da conta.
    const existente = await buscarCompleto(authUser.id);
    if (existente) return existente;

    await garantirUsuarioLocal({
      id: authUser.id,
      email: authUser.email ?? "",
      nome: (authUser.user_metadata?.nome as string | undefined) ?? null,
    });
    return await buscarCompleto(authUser.id);
  } catch (erro) {
    console.error("[auth] erro ao buscar usuário:", erro);
    // Último recurso: a linha crua, sem as relações. Melhor entrar com a marca
    // em branco do que mostrar erro para quem tem sessão válida.
    const basico = await prisma.user
      .findUnique({ where: { id: authUser.id } })
      .catch(() => null);
    if (!basico) return null;
    return { ...basico, brandKit: null, platformPreferences: [], niches: [] };
  }
}

/**
 * Usuário logado com os dados do app (marca, plataformas, nicho).
 * Redireciona para o login se não houver sessão.
 *
 * Também em `cache()`: layout, página e generateMetadata chamam esta função na
 * mesma renderização, e cada chamada custava uma ida ao Supabase mais duas ao
 * banco. Agora o trabalho acontece uma vez por requisição.
 *
 * Os `redirect()` ficam FORA do try de propósito — ele funciona lançando uma
 * exceção, e um catch no caminho engoliria a saída.
 */
export const exigirUsuario = cache(async () => {
  const authUser = await obterUsuarioAuth();
  if (!authUser) redirect("/entrar");

  const perfil = await carregarPerfil(authUser);
  if (!perfil) redirect("/entrar");
  return perfil;
});

export type UsuarioCompleto = NonNullable<
  Awaited<ReturnType<typeof carregarPerfil>>
>;
