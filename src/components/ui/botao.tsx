import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variante = "primario" | "secundario" | "fantasma" | "perigo";
type Tamanho = "medio" | "grande";

const variantes: Record<Variante, string> = {
  primario:
    "bg-marca-500 text-white shadow-lg shadow-marca-500/25 hover:bg-marca-600 disabled:shadow-none",
  secundario:
    "border border-linha bg-cartao text-tinta-700 hover:bg-white/5",
  fantasma: "text-tinta-700 hover:bg-white/5",
  perigo: "border border-red-500/30 bg-cartao text-red-300 hover:bg-red-500/10",
};

const tamanhos: Record<Tamanho, string> = {
  medio: "px-4 py-2.5 text-sm",
  grande: "px-6 py-3.5 text-base",
};

type Props = React.ComponentProps<"button"> & {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
  /** Texto mostrado no lugar do normal enquanto carrega — nunca deixar o botão mudo. */
  textoCarregando?: string;
  larguraTotal?: boolean;
};

export function Botao({
  variante = "primario",
  tamanho = "medio",
  carregando = false,
  textoCarregando,
  larguraTotal = false,
  className,
  children,
  disabled,
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || carregando}
      aria-busy={carregando}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition",
        "active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
        variantes[variante],
        tamanhos[tamanho],
        larguraTotal && "w-full",
        className,
      )}
    >
      {carregando && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {carregando && textoCarregando ? textoCarregando : children}
    </button>
  );
}
