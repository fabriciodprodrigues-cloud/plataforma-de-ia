"use client";

import { useActionState } from "react";
import { entrarAction, type EstadoFormulario } from "../acoes";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";

export function FormularioEntrar({ proximo }: { proximo?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoFormulario, FormData>(
    entrarAction,
    null,
  );

  return (
    <form action={acao} className="space-y-4">
      {proximo && <input type="hidden" name="proximo" value={proximo} />}

      {estado?.erro && <Alerta tom="erro">{estado.erro}</Alerta>}

      <Campo
        rotulo="Seu e-mail"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="voce@exemplo.com"
        required
      />
      <Campo
        rotulo="Sua senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        required
      />

      <Botao
        type="submit"
        tamanho="grande"
        larguraTotal
        carregando={enviando}
        textoCarregando="Entrando..."
      >
        Entrar
      </Botao>
    </form>
  );
}
