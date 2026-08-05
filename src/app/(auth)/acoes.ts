"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { garantirUsuarioLocal } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoFormulario = {
  erro?: string;
  aviso?: string;
} | null;

const esquemaEntrar = z.object({
  email: z.string().trim().min(1, "Informe seu e-mail.").email("E-mail inválido."),
  senha: z.string().min(1, "Informe sua senha."),
});

const esquemaCadastro = z.object({
  nome: z.string().trim().min(2, "Digite seu nome."),
  email: z.string().trim().min(1, "Informe seu e-mail.").email("E-mail inválido."),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

/** Traduz os erros do Supabase (que vêm em inglês) para algo que o usuário entenda. */
function traduzirErro(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed"))
    return "Você ainda não confirmou seu e-mail. Procure a mensagem que enviamos (veja também o spam).";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Já existe uma conta com esse e-mail. Tente entrar.";
  if (m.includes("password should be at least"))
    return "A senha precisa ter pelo menos 8 caracteres.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas seguidas. Espere um minutinho e tente de novo.";
  if (m.includes("fetch failed") || m.includes("network"))
    return "Não conseguimos falar com o servidor. Verifique sua internet e tente de novo.";
  return "Não foi possível concluir agora. Tente novamente em instantes.";
}

export async function entrarAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const dados = esquemaEntrar.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Confira os dados informados." };
  }

  let destino = "/painel";
  try {
    console.log("[entrar] iniciando login para", dados.data.email);
    const supabase = await criarClienteServidor();
    console.log("[entrar] cliente Supabase criado");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: dados.data.email,
      password: dados.data.senha,
    });

    console.log("[entrar] resposta auth:", { hasData: !!data, hasError: !!error });
    if (error) {
      console.error("[entrar] erro auth:", error.message);
      return { erro: traduzirErro(error.message) };
    }

    if (data.user) {
      console.log("[entrar] garantindo usuário local para", data.user.id);
      await garantirUsuarioLocal({
        id: data.user.id,
        email: data.user.email ?? dados.data.email,
        nome: (data.user.user_metadata?.nome as string | undefined) ?? null,
      });
      console.log("[entrar] usuário local garantido");
    }

    const proximo = formData.get("proximo");
    if (typeof proximo === "string" && proximo.startsWith("/")) destino = proximo;
  } catch (erro) {
    console.error("[entrar] ERRO CAPTURADO:", erro);
    if (erro instanceof Error) {
      console.error("[entrar] stack:", erro.stack);
      console.error("[entrar] message:", erro.message);
    }
    return {
      erro:
        erro instanceof Error && erro.message.includes(".env")
          ? erro.message
          : "Não foi possível entrar agora. Tente novamente em instantes.",
    };
  }

  // redirect() precisa ficar fora do try: ele funciona lançando uma exceção interna.
  redirect(destino);
}

export async function cadastrarAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const dados = esquemaCadastro.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Confira os dados informados." };
  }

  try {
    const supabase = await criarClienteServidor();
    const { data, error } = await supabase.auth.signUp({
      email: dados.data.email,
      password: dados.data.senha,
      options: { data: { nome: dados.data.nome } },
    });
    if (error) return { erro: traduzirErro(error.message) };

    // Se a confirmação de e-mail estiver ligada no Supabase, não vem sessão agora.
    if (!data.session) {
      return {
        aviso: `Enviamos um e-mail de confirmação para ${dados.data.email}. Abra a mensagem e clique no link para ativar sua conta.`,
      };
    }

    if (data.user) {
      await garantirUsuarioLocal({
        id: data.user.id,
        email: data.user.email ?? dados.data.email,
        nome: dados.data.nome,
      });
    }
  } catch (erro) {
    console.error("[cadastro]", erro);
    return {
      erro:
        erro instanceof Error && erro.message.includes(".env")
          ? erro.message
          : "Não foi possível criar a conta agora. Tente novamente em instantes.",
    };
  }

  redirect("/onboarding");
}
