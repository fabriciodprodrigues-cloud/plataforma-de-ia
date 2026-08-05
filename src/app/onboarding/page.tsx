import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Assistente } from "./assistente";
import { APP_NAME } from "@/lib/constants";
import { exigirUsuario } from "@/lib/auth";

export const metadata: Metadata = { title: "Vamos configurar sua conta" };

export default async function PaginaOnboarding() {
  const usuario = await exigirUsuario();
  if (usuario.onboardingConcluido) redirect("/painel");

  const primeiroNome = usuario.nome?.trim().split(" ")[0] ?? null;

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
}
