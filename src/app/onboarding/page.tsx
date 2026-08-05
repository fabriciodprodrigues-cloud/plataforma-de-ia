import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Assistente } from "./assistente";
import { APP_NAME } from "@/lib/constants";
import { obterUsuarioAuth, garantirUsuarioLocal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Vamos configurar sua conta" };

export default async function PaginaOnboarding() {
  const authUser = await obterUsuarioAuth();
  if (!authUser) redirect("/entrar");

  try {
    await garantirUsuarioLocal({
      id: authUser.id,
      email: authUser.email ?? "",
      nome: (authUser.user_metadata?.nome as string | undefined) ?? null,
    });

    const usuario = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (usuario?.onboardingConcluido) redirect("/painel");
    const primeiroNome = usuario?.nome?.trim().split(" ")[0] ?? null;

    return (
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-8">
        <header>
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </header>
        <main className="flex flex-1 justify-center py-8">
          <Assistente nomeUsuario={primeiroNome} />
        </main>
      </div>
    );
  } catch (erro) {
    console.error("[onboarding] erro:", erro);
    return (
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-8">
        <header>
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </header>
        <main className="flex flex-1 justify-center py-8">
          <Assistente nomeUsuario={null} />
        </main>
      </div>
    );
  }
}
