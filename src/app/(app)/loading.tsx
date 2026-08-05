import { Esqueleto } from "@/components/ui/carregando";

/** Esqueleto enquanto a página carrega — a tela nunca fica parada em branco. */
export default function Carregando() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando">
      <Esqueleto className="h-8 w-64" />
      <Esqueleto className="mt-3 h-5 w-80" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Esqueleto key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}
