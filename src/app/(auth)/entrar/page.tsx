import Link from "next/link";
import type { Metadata } from "next";
import { FormularioEntrar } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>;
}) {
  const { proximo } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Que bom te ver de volta</h1>
      <p className="mt-2 text-tinta-500">Entre para continuar criando seus conteúdos.</p>

      <div className="mt-7">
        <FormularioEntrar proximo={proximo} />
      </div>

      <p className="mt-6 text-center text-sm text-tinta-500">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-marca-600 hover:underline">
          Criar conta grátis
        </Link>
      </p>
    </div>
  );
}
