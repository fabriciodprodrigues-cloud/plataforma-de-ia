import { redirect } from "next/navigation";
import { CabecalhoApp } from "@/components/cabecalho-app";
import { exigirUsuario } from "@/lib/auth";
import { obterConta, saldoTotal } from "@/lib/servicos/creditos";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();

  // Quem ainda não configurou marca/plataformas não tem o que ver aqui dentro.
  if (!usuario.onboardingConcluido) redirect("/onboarding");

  // Além de alimentar o cabeçalho, esta é a leitura que cria a assinatura e o
  // saldo na primeira visita e vira o ciclo quando chega a data.
  const conta = await obterConta(usuario.id);

  return (
    <div className="min-h-dvh">
      <CabecalhoApp usuario={usuario} saldo={saldoTotal(conta)} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
