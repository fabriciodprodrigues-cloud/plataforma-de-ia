import Link from "next/link";
import { Compass } from "lucide-react";

export default function NaoEncontrado() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-md text-center">
        <Compass className="mx-auto size-10 text-marca-500" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          Essa página não existe
        </h1>
        <p className="mt-2 text-tinta-500">
          O endereço pode ter mudado, ou o conteúdo foi apagado.
        </p>
        <Link
          href="/painel"
          className="mt-6 inline-flex rounded-full bg-marca-500 px-6 py-3 font-semibold text-white transition hover:bg-marca-600"
        >
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
