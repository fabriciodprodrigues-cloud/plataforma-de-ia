import { redirect } from "next/navigation";
import { CabecalhoApp } from "@/components/cabecalho-app";
import { exigirUsuario } from "@/lib/auth";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();

  // Quem ainda não configurou marca/plataformas não tem o que ver aqui dentro.
  if (!usuario.onboardingConcluido) redirect("/onboarding");

  return (
    <div className="min-h-dvh">
      <CabecalhoApp usuario={usuario} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
