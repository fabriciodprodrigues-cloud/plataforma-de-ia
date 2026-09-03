"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe, LoaderCircle, Search } from "lucide-react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { cn } from "@/lib/utils";

/**
 * Tela de espera do primeiro acesso.
 *
 * A versão anterior tinha etapas com tempo fixo (4s, 22s, 18s) e uma última de
 * 999s. Como a pesquisa real leva perto de três minutos, ela chegava no último
 * passo aos 44 segundos e congelava ali por mais dois minutos e meio — enquanto
 * o texto prometia "menos de um minuto". O dono do projeto foi o primeiro a
 * concluir que tinha quebrado.
 *
 * Agora o andamento vem do servidor: cada busca e cada site lido é um evento
 * real. Nada de cronômetro fingido.
 */

type Fase = "conectando" | "pesquisando" | "escrevendo" | "temas";

const LEGENDA: Record<Fase, string> = {
  conectando: "Preparando a pesquisa",
  pesquisando: "Procurando o que está em alta agora",
  escrevendo: "Resumindo o que encontrou",
  temas: "Montando seus temas",
};

export function Preparando() {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>("conectando");
  const [consulta, setConsulta] = useState<string | null>(null);
  const [buscas, setBuscas] = useState(0);
  const [fontes, setFontes] = useState(0);
  const [sites, setSites] = useState<string[]>([]);
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const jaRodou = useRef(false);

  // Cronômetro honesto: mostra o tempo que passou de verdade.
  useEffect(() => {
    if (erro) return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [erro, tentativa]);

  useEffect(() => {
    // Em desenvolvimento o React monta o componente duas vezes; sem essa trava
    // a pesquisa seria disparada em dobro (e cobrada em dobro).
    //
    // Cuidado que já custou caro aqui: NÃO usar uma flag de "cancelado" na
    // limpeza do efeito. O React chama a limpeza entre as duas montagens, então
    // a flag descartaria justamente a única chamada em andamento.
    if (jaRodou.current) return;
    jaRodou.current = true;

    (async () => {
      try {
        const resposta = await fetch("/api/preparar", { method: "POST" });
        if (!resposta.ok || !resposta.body) {
          throw new Error("Não conseguimos falar com o servidor.");
        }

        const leitor = resposta.body.pipeThrough(new TextDecoderStream()).getReader();
        let sobra = "";

        for (;;) {
          const { value, done } = await leitor.read();
          if (done) break;

          // Uma linha pode chegar partida entre dois pedaços do stream.
          const linhas = (sobra + value).split("\n");
          sobra = linhas.pop() ?? "";

          for (const linha of linhas) {
            if (!linha.trim()) continue;
            const evento = JSON.parse(linha);

            switch (evento.tipo) {
              case "buscando":
                setFase("pesquisando");
                setBuscas(evento.numero);
                setConsulta(evento.consulta || null);
                break;
              case "leu":
                setFontes(evento.totalFontes);
                setSites((atuais) =>
                  [...new Set([...evento.dominios, ...atuais])].slice(0, 4),
                );
                break;
              case "escrevendo":
                setFase("escrevendo");
                setConsulta(null);
                break;
              case "temas":
                setFase("temas");
                break;
              case "pronto":
                router.refresh();
                return;
              case "erro":
                setErro(evento.mensagem);
                return;
            }
          }
        }

        // O stream fechou sem "pronto" nem "erro" — a função foi cortada no meio.
        setErro(
          "A preparação foi interrompida antes de terminar. Clique para tentar de novo.",
        );
      } catch {
        setErro("Perdemos a conexão durante a preparação. Tente de novo.");
      }
    })();
  }, [router, tentativa]);

  function tentarDeNovo() {
    setErro(null);
    setFase("conectando");
    setConsulta(null);
    setBuscas(0);
    setFontes(0);
    setSites([]);
    setSegundos(0);
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

  const fases: Fase[] = ["pesquisando", "escrevendo", "temas"];
  const indiceAtual = fases.indexOf(fase);

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-center text-xl font-semibold tracking-tight">
        Estudando seu nicho
      </h1>
      <p className="mt-2 text-center text-tinta-500">
        Costuma levar de 2 a 3 minutos. Pode deixar essa aba aberta — a gente lê
        vários sites antes de sugerir qualquer coisa.
      </p>

      <ol className="mt-8 space-y-3" aria-live="polite">
        {fases.map((f, indice) => {
          const concluida = indiceAtual > indice;
          const atual = fase === f;
          return (
            <li
              key={f}
              className={cn(
                "rounded-xl border p-3.5 transition",
                atual && "border-marca-300 bg-marca-50",
                concluida && "border-transparent bg-transparent",
                !atual && !concluida && "border-transparent opacity-40",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center">
                  {concluida ? (
                    <Check className="size-5 text-emerald-300" aria-hidden />
                  ) : atual ? (
                    <LoaderCircle
                      className="size-5 animate-spin text-marca-500"
                      aria-hidden
                    />
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
                  {LEGENDA[f]}
                  {f === "pesquisando" && buscas > 0 && (
                    <span className="text-tinta-400">
                      {" "}
                      · busca {buscas}
                      {fontes > 0 && `, ${fontes} ${fontes === 1 ? "fonte" : "fontes"}`}
                    </span>
                  )}
                </span>
              </div>

              {/* O que está acontecendo agora, em texto do usuário. É isto que
                  diferencia "está trabalhando" de "travou". */}
              {atual && f === "pesquisando" && consulta && (
                <p className="mt-2 flex items-start gap-1.5 pl-9 text-xs text-tinta-500">
                  <Search className="mt-0.5 size-3 shrink-0" aria-hidden />
                  <span className="line-clamp-2">{consulta}</span>
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {sites.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
          <Globe className="size-3.5 text-tinta-400" aria-hidden />
          {sites.map((s) => (
            <span
              key={s}
              className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-tinta-500"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-tinta-400" aria-hidden>
        {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, "0")}
      </p>
    </div>
  );
}
