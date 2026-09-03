import Link from "next/link";
import type { Metadata } from "next";
import { FormularioCadastro } from "./formulario";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCadastro() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Vamos começar</h1>
      <p className="mt-2 text-tinta-500">
        Leva menos de um minuto. Em seguida a gente já monta seu primeiro conteúdo.
      </p>

      <div className="mt-7">
        <FormularioCadastro />
      </div>

      <p className="mt-6 text-center text-sm text-tinta-500">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-marca-700 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
