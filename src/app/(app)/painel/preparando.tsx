"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle } from "lucide-react";
import { prepararPainel } from "./acoes";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { cn } from "@/lib/utils";

/**
 * Tela de espera do primeiro acesso. A pesquisa + geração de temas leva algumas
 * dezenas de segundos, então mostramos as etapas avançando em vez de um spinner
 * mudo — o usuário precisa saber que tem coisa acontecendo.
 */
const ETAPAS = [
  { rotulo: "Entendendo o seu nicho", segundos: 4 },
  { rotulo: "Procurando o que está em alta agora", segundos: 22 },
  { rotulo: "Separando os melhores assuntos", segundos: 18 },
  { rotulo: "Montando seus temas", segundos: 999 },
];

export function Preparando() {
  const router = useRouter();
  const [etapa, setEtapa] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const jaRodou = useRef(false);

  // Avança as etapas visuais no tempo estimado de cada uma.
  useEffect(() => {
    if (erro) return;
    if (etapa >= ETAPAS.length - 1) return;
    const t = setTimeout(() => setEtapa((e) => e + 1), ETAPAS[etapa].segundos * 1000);
    return () => clearTimeout(t);
  }, [etapa, erro]);

  useEffect(() => {
    // Em desenvolvimento o React monta o componente duas vezes; sem essa trava
    // a pesquisa seria disparada em dobro (e cobrada em dobro).
    //
    // Cuidado que já custou caro aqui: NÃO usar uma flag de "cancelado" na
    // limpeza do efeito. O React chama a limpeza entre as duas montagens, então
    // a flag marcaria como cancelada justamente a única chamada em andamento —
    // e o resultado (inclusive a mensagem de erro) seria jogado fora em silêncio.
    if (jaRodou.current) return;
    jaRodou.current = true;

    prepararPainel().then((resultado) => {
      if (resultado.ok) {
        router.refresh();
      } else {
        setErro(resultado.erro);
      }
    });
  }, [router, tentativa]);

  function tentarDeNovo() {
    setErro(null);
    setEtapa(0);
    jaRodou.current = false;
    setTentativa((t) => t + 1);
  }

  if (erro) {
    return (
      <div className="mx-auto max-w-md py-10">
        <Alerta tom="erro" titulo="Não conseguimos preparar seus temas">
          {erro}
        </Alerta>
        <div className="mt-4 flex justify-center">
          <Botao onClick={tentarDeNovo}>Tentar de novo</Botao>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-center text-xl font-semibold tracking-tight">
        Preparando tudo pra você
      </h1>
      <p className="mt-2 text-center text-tinta-500">
        Isso leva menos de um minuto. Pode deixar essa aba aberta.
      </p>

      <ol className="mt-8 space-y-3" aria-live="polite">
        {ETAPAS.map((item, indice) => {
          const concluida = indice < etapa;
          const atual = indice === etapa;
          return (
            <li
              key={item.rotulo}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3.5 transition",
                atual && "border-marca-300 bg-marca-50",
                concluida && "border-transparent bg-transparent",
                !atual && !concluida && "border-transparent opacity-40",
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center">
                {concluida ? (
                  <Check className="size-5 text-emerald-600" aria-hidden />
                ) : atual ? (
                  <LoaderCircle className="size-5 animate-spin text-marca-500" aria-hidden />
                ) : (
                  <span className="size-2 rounded-full bg-tinta-400" aria-hidden />
                )}
              </span>
              <span
                className={cn(
                  "text-sm",
                  atual ? "font-medium text-tinta-900" : "text-tinta-500",
                )}
              >
                {item.rotulo}
                {atual && "..."}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
