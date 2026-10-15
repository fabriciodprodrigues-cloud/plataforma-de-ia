import { cn } from "@/lib/utils";

/** Cabeçalho padrão das telas do admin: título, explicação e ações à direita. */
export function CabecalhoAdmin({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-titulo text-[28px] font-bold tracking-[-0.3px]">{titulo}</h1>
        {descricao && <p className="mt-1.5 text-tinta-500">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2.5">{children}</div>}
    </header>
  );
}

/**
 * Tela ainda não construída.
 *
 * Existe para a navegação do admin nunca levar a um 404 — que aqui significaria
 * "você não é admin" e seria uma mensagem errada. Diz o que vai aparecer e em
 * qual etapa, em vez de deixar a pessoa adivinhando se quebrou.
 */
export function EmConstrucao({
  oQueVem,
  etapa,
}: {
  oQueVem: string;
  etapa: string;
}) {
  return (
    <div className="cartao border-dashed p-8 text-center">
      <p className="font-titulo text-lg font-semibold">Ainda não construído</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-tinta-500">{oQueVem}</p>
      <p className="mt-3 font-mono text-xs tracking-[0.06em] text-tinta-400 uppercase">
        {etapa}
      </p>
    </div>
  );
}

/** Indicador numérico do painel. */
export function Kpi({
  rotulo,
  valor,
  nota,
  tom = "normal",
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  tom?: "normal" | "bom" | "alerta";
}) {
  return (
    <div className="cartao p-5">
      <p className="font-mono text-[10.5px] tracking-[0.08em] text-tinta-400 uppercase">
        {rotulo}
      </p>
      <p
        className={cn(
          "mt-2 mb-1 font-titulo text-[32px] font-bold tracking-[-0.5px]",
          tom === "bom" && "text-marca-700",
          tom === "alerta" && "text-aviso",
        )}
      >
        {valor}
      </p>
      {nota && <p className="text-[12.5px] text-tinta-500">{nota}</p>}
    </div>
  );
}
