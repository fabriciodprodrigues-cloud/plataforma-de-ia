"use client";

import { useEffect, useRef, useState } from "react";

export type EstadoSalvamento = "ocioso" | "salvando" | "salvo" | "erro";

/**
 * Salva sozinho pouco depois de o usuário parar de digitar.
 *
 * A ideia é que ninguém precise procurar um botão "Salvar": tudo que a IA gera
 * é editável e a edição fica guardada sem cerimônia. `chave` é uma versão em
 * texto do que está sendo editado — é a comparação dela que dispara o salvamento.
 */
export function useAutoSalvar(
  chave: string,
  aoSalvar: () => Promise<{ ok: boolean; erro?: string }>,
  atraso = 1200,
) {
  const [estado, setEstado] = useState<EstadoSalvamento>("ocioso");
  const [erro, setErro] = useState<string | null>(null);

  // Guardado em ref para a função poder mudar de identidade a cada render sem
  // reiniciar o temporizador.
  const salvarRef = useRef(aoSalvar);
  salvarRef.current = aoSalvar;

  const primeiraRenderizacao = useRef(true);

  useEffect(() => {
    // Não salva no primeiro render: nada mudou ainda, é só o valor que veio do banco.
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }

    setEstado("salvando");
    const temporizador = setTimeout(async () => {
      try {
        const resultado = await salvarRef.current();
        if (resultado.ok) {
          setEstado("salvo");
          setErro(null);
        } else {
          setEstado("erro");
          setErro(resultado.erro ?? "Não conseguimos salvar sua alteração.");
        }
      } catch {
        setEstado("erro");
        setErro("Não conseguimos salvar sua alteração. Verifique sua conexão.");
      }
    }, atraso);

    return () => clearTimeout(temporizador);
  }, [chave, atraso]);

  // O aviso de "salvo" some sozinho para não poluir a tela.
  useEffect(() => {
    if (estado !== "salvo") return;
    const t = setTimeout(() => setEstado("ocioso"), 2500);
    return () => clearTimeout(t);
  }, [estado]);

  return { estado, erro };
}
