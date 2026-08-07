"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import type { Arquetipo } from "@/generated/prisma/enums";
import {
  ARQUETIPOS,
  GATILHOS,
  PERGUNTA_ARQUETIPO,
  PERGUNTA_MOTIVACAO,
  QUIZ_ARQUETIPO,
  QUIZ_MOTIVACAO,
  type Motivacao,
} from "@/lib/arquetipos";

/**
 * O mesmo quiz de 2 perguntas do onboarding, para quem já tem conta.
 *
 * Existe porque as contas criadas antes do quiz ficaram sem arquétipo: sem esta
 * tela, essas pessoas veriam o selo do arquétipo em lugar nenhum e não teriam
 * como ligar a personalização.
 */
export function SeletorArquetipo({
  valor,
  aoMudar,
}: {
  valor: Arquetipo | null;
  aoMudar: (arquetipo: Arquetipo) => void;
}) {
  const [refazendo, setRefazendo] = useState(false);
  const [motivacao, setMotivacao] = useState<Motivacao | null>(null);

  const info = valor ? ARQUETIPOS[valor] : null;
  const mostrandoQuiz = !valor || refazendo;

  if (!mostrandoQuiz && info) {
    const gatilho = GATILHOS[info.gatilho];
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-4">
        <div className="min-w-0">
          <p className="font-semibold">{info.nome}</p>
          <p className="mt-0.5 text-sm text-tinta-400">
            Tom {info.tom} · gancho mental {gatilho.rotulo}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMotivacao(null);
            setRefazendo(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-sm font-medium text-tinta-500 transition hover:border-marca-400 hover:text-marca-700"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Refazer
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <p className="font-medium text-tinta-700">
        {motivacao === null ? PERGUNTA_MOTIVACAO : PERGUNTA_ARQUETIPO}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {motivacao === null
          ? QUIZ_MOTIVACAO.map((opcao) => (
              <button
                key={opcao.motivacao}
                type="button"
                onClick={() => setMotivacao(opcao.motivacao)}
                className="rounded-xl border border-black/10 p-3 text-left text-sm transition hover:border-marca-500 hover:bg-marca-50"
              >
                {opcao.texto}
              </button>
            ))
          : QUIZ_ARQUETIPO[motivacao].map((opcao) => (
              <button
                key={opcao.arquetipo}
                type="button"
                onClick={() => {
                  aoMudar(opcao.arquetipo);
                  setRefazendo(false);
                  setMotivacao(null);
                }}
                className="rounded-xl border border-black/10 p-3 text-left text-sm transition hover:border-marca-500 hover:bg-marca-50"
              >
                {opcao.texto}
                <span className="mt-0.5 block text-xs text-tinta-400">
                  Perfil {ARQUETIPOS[opcao.arquetipo].nome}
                </span>
              </button>
            ))}
      </div>

      <div className="mt-3 flex gap-3 text-sm">
        {motivacao !== null && (
          <button
            type="button"
            onClick={() => setMotivacao(null)}
            className="font-medium text-tinta-500 transition hover:text-tinta-900"
          >
            Voltar
          </button>
        )}
        {refazendo && (
          <button
            type="button"
            onClick={() => {
              setRefazendo(false);
              setMotivacao(null);
            }}
            className="font-medium text-tinta-500 transition hover:text-tinta-900"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
