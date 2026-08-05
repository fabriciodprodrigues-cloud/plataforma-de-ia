import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Tom = "erro" | "sucesso" | "info";

const estilos: Record<Tom, { caixa: string; icone: typeof Info }> = {
  erro: { caixa: "border-red-200 bg-red-50 text-red-800", icone: CircleAlert },
  sucesso: {
    caixa: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icone: CircleCheck,
  },
  info: { caixa: "border-marca-200 bg-marca-50 text-marca-800", icone: Info },
};

/**
 * Caixa de mensagem visível na tela. Toda falha de geração passa por aqui —
 * nada de erro que só aparece no console.
 */
export function Alerta({
  tom = "erro",
  titulo,
  children,
  className,
}: {
  tom?: Tom;
  titulo?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { caixa, icone: Icone } = estilos[tom];
  return (
    <div
      role={tom === "erro" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl border p-4 text-sm", caixa, className)}
    >
      <Icone className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0">
        {titulo && <p className="font-semibold">{titulo}</p>}
        <div className={cn(titulo && "mt-0.5", "leading-relaxed")}>{children}</div>
      </div>
    </div>
  );
}
