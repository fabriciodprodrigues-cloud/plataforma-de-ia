import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Indicador de carregamento com texto. Regra do projeto: nenhuma espera fica
 * sem explicação na tela — o usuário sempre lê o que está acontecendo.
 */
export function Carregando({
  mensagem,
  detalhe,
  className,
}: {
  mensagem: string;
  detalhe?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center gap-3 py-12 text-center", className)}
    >
      <LoaderCircle className="size-7 animate-spin text-marca-500" aria-hidden />
      <div>
        <p className="font-medium text-tinta-700">{mensagem}</p>
        {detalhe && <p className="mt-1 text-sm text-tinta-400">{detalhe}</p>}
      </div>
    </div>
  );
}

/** Bloco cinza pulsando, usado enquanto o conteúdo real não chega. */
export function Esqueleto({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-black/[0.06]", className)} />;
}
