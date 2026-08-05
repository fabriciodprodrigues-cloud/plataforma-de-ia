"use client";

import { useState, useTransition } from "react";
import { Check, Clock, Copy, LoaderCircle, RefreshCw } from "lucide-react";
import { regerarConteudo, salvarConteudo } from "./acoes";
import type { DadosPlataforma } from "./tipos";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { PLATAFORMAS } from "@/lib/constants";
import { useAutoSalvar } from "@/lib/hooks/use-auto-salvar";
import { cn } from "@/lib/utils";

export function SecaoRoteiro({
  ideaId,
  dados,
  aoAtualizar,
}: {
  ideaId: string;
  dados: DadosPlataforma;
  aoAtualizar: (mudanca: Partial<DadosPlataforma>) => void;
}) {
  const meta = PLATAFORMAS[dados.plataforma];
  const ehVideo = dados.tipo === "ROTEIRO_VIDEO";

  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [regerando, regerar] = useTransition();

  const { estado: estadoSalvamento, erro: erroSalvamento } = useAutoSalvar(
    dados.conteudo,
    () =>
      salvarConteudo({
        ideaId,
        plataforma: dados.plataforma,
        conteudo: dados.conteudo,
      }),
  );

  function trocarDuracao(segundos: number) {
    if (segundos === dados.duracaoSegundos) return;
    setErro(null);
    regerar(async () => {
      const resultado = await regerarConteudo({
        ideaId,
        plataforma: dados.plataforma,
        duracaoSegundos: segundos,
      });
      if (!resultado.ok) return setErro(resultado.erro);
      aoAtualizar({ duracaoSegundos: segundos, conteudo: resultado.conteudo });
    });
  }

  function refazer() {
    setErro(null);
    regerar(async () => {
      const resultado = await regerarConteudo({
        ideaId,
        plataforma: dados.plataforma,
        duracaoSegundos: dados.duracaoSegundos,
      });
      if (!resultado.ok) return setErro(resultado.erro);
      aoAtualizar({ conteudo: resultado.conteudo });
    });
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(dados.conteudo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Seu navegador não deixou copiar. Selecione o texto e copie manualmente.");
    }
  }

  const palavras = dados.conteudo.trim().split(/\s+/).filter(Boolean).length;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{meta.rotuloConteudo}</h2>
          <p className="text-sm text-tinta-400">
            {palavras} {palavras === 1 ? "palavra" : "palavras"} · pode editar à vontade
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Botao variante="secundario" onClick={copiar}>
            {copiado ? (
              <>
                <Check className="size-4" aria-hidden />
                Copiado
              </>
            ) : (
              <>
                <Copy className="size-4" aria-hidden />
                Copiar
              </>
            )}
          </Botao>
          <Botao
            variante="secundario"
            onClick={refazer}
            carregando={regerando}
            textoCarregando="Escrevendo..."
          >
            <RefreshCw className="size-4" aria-hidden />
            Refazer
          </Botao>
        </div>
      </div>

      {/* Seletor de duração — só existe para vídeo. */}
      {ehVideo && meta.duracoes.length > 0 && (
        <div className="mt-5">
          <span className="rotulo flex items-center gap-1.5">
            <Clock className="size-4 text-tinta-400" aria-hidden />
            Duração do vídeo
          </span>
          <div className="flex flex-wrap gap-2">
            {meta.duracoes.map((d) => {
              const ativa = d.segundos === dados.duracaoSegundos;
              return (
                <button
                  key={d.segundos}
                  type="button"
                  onClick={() => trocarDuracao(d.segundos)}
                  disabled={regerando}
                  aria-pressed={ativa}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition",
                    ativa
                      ? "border-marca-500 bg-marca-500 text-white"
                      : "border-black/10 bg-white text-tinta-700 hover:border-black/25",
                    regerando && "cursor-not-allowed opacity-60",
                  )}
                >
                  {d.rotulo}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-tinta-400">
            Trocar a duração reescreve o roteiro no tamanho certo para o tempo escolhido.
          </p>
        </div>
      )}

      {erro && (
        <div className="mt-4">
          <Alerta tom="erro">{erro}</Alerta>
        </div>
      )}
      {erroSalvamento && (
        <div className="mt-4">
          <Alerta tom="erro">{erroSalvamento}</Alerta>
        </div>
      )}

      <div className="relative mt-4">
        <textarea
          value={dados.conteudo}
          onChange={(e) => aoAtualizar({ conteudo: e.target.value })}
          disabled={regerando}
          rows={18}
          aria-label={meta.rotuloConteudo}
          className="campo min-h-[420px] resize-y leading-relaxed whitespace-pre-wrap"
        />

        {regerando && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-[1px]">
            <p
              role="status"
              className="flex items-center gap-2 font-medium text-tinta-700"
            >
              <LoaderCircle className="size-5 animate-spin text-marca-500" aria-hidden />
              Escrevendo o novo roteiro...
            </p>
          </div>
        )}
      </div>

      <p className="mt-2 h-5 text-sm text-tinta-400" aria-live="polite">
        {estadoSalvamento === "salvando" && "Salvando..."}
        {estadoSalvamento === "salvo" && "Alterações salvas"}
      </p>
    </section>
  );
}
