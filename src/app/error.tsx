"use client";

import { useEffect } from "react";
import { CircleAlert } from "lucide-react";
import { Botao } from "@/components/ui/botao";

/**
 * Rede de segurança: qualquer erro que escape vira uma tela explicada, com
 * botão de ação. Nunca uma página branca nem um erro só no console.
 */
export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[erro-na-tela]", error);
  }, [error]);

  // Mensagens de configuração que a gente mesmo escreveu já são claras.
  const ehConfiguracao = error.message.includes(".env");

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-md text-center">
        <CircleAlert className="mx-auto size-10 text-red-500" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          {ehConfiguracao ? "Falta uma configuração" : "Algo deu errado aqui"}
        </h1>
        <p className="mt-2 leading-relaxed text-tinta-500">
          {ehConfiguracao
            ? error.message
            : "Não foi culpa sua. Tente de novo — se continuar, recarregue a página."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Botao onClick={reset}>Tentar de novo</Botao>
          <Botao variante="secundario" onClick={() => (window.location.href = "/painel")}>
            Voltar ao início
          </Botao>
        </div>
      </div>
    </div>
  );
}
