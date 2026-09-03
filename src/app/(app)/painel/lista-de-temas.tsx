"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Heart,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  atualizarPesquisa,
  criarTemaProprio,
  gerarMaisTemas,
  mudarStatusTema,
} from "./acoes";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { IconePlataforma } from "@/components/icone-plataforma";
import type { Plataforma, StatusIdeia } from "@/generated/prisma/enums";
import { PLATAFORMAS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Tema = {
  id: string;
  titulo: string;
  justificativa: string | null;
  status: StatusIdeia;
  conteudosProntos: number;
};

export function ListaDeTemas({
  nomeNicho,
  plataformas,
  temas,
}: {
  nomeNicho: string;
  plataformas: Plataforma[];
  temas: Tema[];
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [temaProprio, setTemaProprio] = useState("");
  const [criandoTema, criarTema] = useTransition();
  const [buscandoIdeias, buscarIdeias] = useTransition();
  const [repesquisando, repesquisar] = useTransition();
  const [ocupado, setOcupado] = useState<string | null>(null);

  function enviarTemaProprio(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    criarTema(async () => {
      const resultado = await criarTemaProprio(temaProprio);
      if (!resultado.ok) return setErro(resultado.erro);
      setTemaProprio("");
      router.push(`/conteudo/${resultado.ideaId}`);
    });
  }

  function maisIdeias() {
    setErro(null);
    buscarIdeias(async () => {
      const resultado = await gerarMaisTemas();
      if (!resultado.ok) setErro(resultado.erro);
      else router.refresh();
    });
  }

  function refazerPesquisa() {
    setErro(null);
    repesquisar(async () => {
      const resultado = await atualizarPesquisa();
      if (!resultado.ok) setErro(resultado.erro);
      else router.refresh();
    });
  }

  function alterarStatus(id: string, status: "FAVORITO" | "DESCARTADO" | "SUGERIDO") {
    setErro(null);
    setOcupado(id);
    mudarStatusTema(id, status)
      .then((r) => {
        if (!r.ok) setErro(r.erro);
        else router.refresh();
      })
      .finally(() => setOcupado(null));
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Temas para você</h1>
          <p className="mt-1 text-tinta-500">
            Baseados no que está em alta em{" "}
            <span className="font-medium text-tinta-700">{nomeNicho}</span>.
          </p>
        </div>
        <Botao
          variante="secundario"
          onClick={refazerPesquisa}
          carregando={repesquisando}
          textoCarregando="Pesquisando..."
        >
          <RefreshCw className="size-4" aria-hidden />
          Atualizar pesquisa
        </Botao>
      </div>

      {/* Plataformas ativas — o usuário vê o que vai receber. */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-tinta-500">
        <span>Conteúdo será criado para:</span>
        {plataformas.map((p) => (
          <span
            key={p}
            className="inline-flex items-center gap-1.5 rounded-full border border-linha bg-cartao px-2.5 py-1 font-medium text-tinta-700"
          >
            <IconePlataforma plataforma={p} className="size-3.5" />
            {PLATAFORMAS[p].nome}
          </span>
        ))}
      </div>

      {erro && (
        <div className="mt-5">
          <Alerta tom="erro">{erro}</Alerta>
        </div>
      )}

      {/* Tema próprio */}
      <form onSubmit={enviarTemaProprio} className="cartao mt-6 p-5">
        <label htmlFor="tema-proprio" className="flex items-center gap-2 font-semibold">
          <Wand2 className="size-4 text-marca-500" aria-hidden />
          Já tem um tema em mente?
        </label>
        <p className="mt-1 text-sm text-tinta-500">
          Escreva do seu jeito. A gente pesquisa o assunto e monta o conteúdo.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="tema-proprio"
            value={temaProprio}
            onChange={(e) => setTemaProprio(e.target.value)}
            placeholder="Ex: como escolher o recheio certo pro clima quente"
            maxLength={160}
            className="campo flex-1"
          />
          <Botao
            type="submit"
            carregando={criandoTema}
            textoCarregando="Pesquisando seu tema..."
            disabled={temaProprio.trim().length < 4}
          >
            <Sparkles className="size-4" aria-hidden />
            Criar conteúdo
          </Botao>
        </div>
      </form>

      {/* Lista de temas */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {temas.map((tema) => (
          <article
            key={tema.id}
            className={cn(
              "cartao flex flex-col p-5 transition",
              ocupado === tema.id && "opacity-50",
            )}
          >
            <div className="flex items-start gap-2">
              <h2 className="flex-1 leading-snug font-semibold text-balance">
                {tema.titulo}
              </h2>
              <button
                type="button"
                onClick={() =>
                  alterarStatus(
                    tema.id,
                    tema.status === "FAVORITO" ? "SUGERIDO" : "FAVORITO",
                  )
                }
                aria-label={
                  tema.status === "FAVORITO"
                    ? "Tirar dos favoritos"
                    : "Marcar como favorito"
                }
                aria-pressed={tema.status === "FAVORITO"}
                className="shrink-0 rounded-full p-1.5 text-tinta-400 transition hover:bg-white/5 hover:text-red-500"
              >
                <Heart
                  className={cn(
                    "size-4",
                    tema.status === "FAVORITO" && "fill-red-500 text-red-500",
                  )}
                  aria-hidden
                />
              </button>
            </div>

            {tema.justificativa && (
              <p className="mt-2 text-sm leading-relaxed text-tinta-500">
                {tema.justificativa}
              </p>
            )}

            {tema.conteudosProntos > 0 && (
              <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                {tema.conteudosProntos}{" "}
                {tema.conteudosProntos === 1 ? "conteúdo pronto" : "conteúdos prontos"}
              </p>
            )}

            <div className="mt-4 flex items-center gap-2 pt-1">
              <Botao
                onClick={() => router.push(`/conteudo/${tema.id}`)}
                className="flex-1"
              >
                {tema.conteudosProntos > 0 ? "Abrir conteúdo" : "Criar conteúdo"}
                <ArrowRight className="size-4" aria-hidden />
              </Botao>
              <button
                type="button"
                onClick={() => alterarStatus(tema.id, "DESCARTADO")}
                aria-label="Descartar tema"
                className="rounded-full p-2.5 text-tinta-400 transition hover:bg-white/5 hover:text-red-300"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <Botao
          variante="secundario"
          tamanho="grande"
          onClick={maisIdeias}
          carregando={buscandoIdeias}
          textoCarregando="Pensando em novos temas..."
        >
          <Sparkles className="size-4" aria-hidden />
          Quero mais ideias
        </Botao>
      </div>
    </div>
  );
}
