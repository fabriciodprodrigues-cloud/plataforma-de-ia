"use client";

import { useActionState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { salvarConfiguracoes, type EstadoConfig } from "./acoes";

export function FormularioConfiguracoes({
  inicial,
}: {
  inicial: {
    mostrarPrecos: boolean;
    custoCredito: number;
    custoMinutoVideo: number;
    infraFixaMensal: number;
  };
}) {
  const [estado, acao, enviando] = useActionState<EstadoConfig, FormData>(
    salvarConfiguracoes,
    null,
  );

  // Vírgula decimal: é como se escreve dinheiro em português, e a action
  // aceita os dois formatos.
  const br = (n: number) => String(n).replace(".", ",");

  return (
    <form action={acao} className="grid gap-6">
      <section className="cartao p-5">
        <h2 className="font-titulo text-base font-semibold">Landing page</h2>
        <p className="mt-1 text-sm text-tinta-400">
          Com o interruptor desligado, os cards de plano mostram só a descrição e
          os recursos.
        </p>

        <label className="mt-4 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="mostrarPrecos"
            defaultChecked={inicial.mostrarPrecos}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="relative h-[22px] w-[38px] shrink-0 rounded-full bg-linha-forte transition peer-checked:bg-marca-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-marca-700 after:absolute after:top-[3px] after:left-[3px] after:size-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4"
          />
          <span className="text-sm">Mostrar preços na landing</span>
        </label>
      </section>

      <section className="cartao p-5">
        <h2 className="font-titulo text-base font-semibold">Custos unitários</h2>
        <p className="mt-1 text-sm text-tinta-400">
          Usados para estimar custo e margem no financeiro e nos planos. Mudar
          aqui <b className="text-tinta-700">não reescreve o histórico</b>: cada
          valor vale a partir da data em que foi salvo, e consumos antigos
          continuam calculados pelo valor que valia naquele dia.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Campo
            nome="custoCredito"
            rotulo="Custo por crédito"
            prefixo="R$"
            padrao={br(inicial.custoCredito)}
            dica="Média ponderada roteiro/arte."
          />
          <Campo
            nome="custoMinutoVideo"
            rotulo="Custo por minuto de vídeo"
            prefixo="R$"
            padrao={br(inicial.custoMinutoVideo)}
            dica="Estimativa até medir o render real."
          />
          <Campo
            nome="infraFixaMensal"
            rotulo="Infraestrutura fixa"
            prefixo="R$"
            padrao={br(inicial.infraFixaMensal)}
            dica="Por mês, independente de uso."
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="botao-primario botao-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {enviando ? "Salvando..." : "Salvar configurações"}
        </button>

        {/* aria-live para quem usa leitor de tela ouvir o resultado sem
            precisar procurar a mensagem na página. */}
        <p role="status" aria-live="polite" className="text-sm">
          {estado?.ok === true && (
            <span className="inline-flex items-center gap-1.5 text-ok">
              <CircleCheck className="size-4" aria-hidden />
              {estado.mensagem}
            </span>
          )}
          {estado?.ok === false && (
            <span className="inline-flex items-center gap-1.5 text-erro">
              <CircleAlert className="size-4" aria-hidden />
              {estado.erro}
            </span>
          )}
        </p>
      </div>
    </form>
  );
}

function Campo({
  nome,
  rotulo,
  prefixo,
  padrao,
  dica,
}: {
  nome: string;
  rotulo: string;
  prefixo: string;
  padrao: string;
  dica: string;
}) {
  return (
    <div>
      <label htmlFor={nome} className="rotulo">
        {rotulo}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-linha bg-superficie px-3 focus-within:border-marca-700 focus-within:ring-4 focus-within:ring-marca-500/25">
        <span className="font-mono text-sm text-tinta-400">{prefixo}</span>
        <input
          id={nome}
          name={nome}
          defaultValue={padrao}
          inputMode="decimal"
          autoComplete="off"
          aria-describedby={`${nome}-dica`}
          className="w-full bg-transparent py-3 font-mono text-base text-tinta-900 outline-none"
        />
      </div>
      <p id={`${nome}-dica`} className="mt-1.5 text-xs text-tinta-400">
        {dica}
      </p>
    </div>
  );
}
