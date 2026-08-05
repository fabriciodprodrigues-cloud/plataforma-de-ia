"use client";

import { useActionState } from "react";
import { cadastrarAction, type EstadoFormulario } from "../acoes";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";

export function FormularioCadastro() {
  const [estado, acao, enviando] = useActionState<EstadoFormulario, FormData>(
    cadastrarAction,
    null,
  );

  // Cadastro feito, mas o Supabase está exigindo confirmação por e-mail:
  // some com o formulário para não dar a impressão de que deu errado.
  if (estado?.aviso) {
    return (
      <Alerta tom="sucesso" titulo="Conta criada!">
        {estado.aviso}
      </Alerta>
    );
  }

  return (
    <form action={acao} className="space-y-4">
      {estado?.erro && <Alerta tom="erro">{estado.erro}</Alerta>}

      <Campo
        rotulo="Como podemos te chamar?"
        name="nome"
        type="text"
        autoComplete="name"
        placeholder="Ana"
        required
      />
      <Campo
        rotulo="Seu e-mail"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="voce@exemplo.com"
        required
      />
      <Campo
        rotulo="Crie uma senha"
        name="senha"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        dica="Pelo menos 8 caracteres."
        minLength={8}
        required
      />

      <Botao
        type="submit"
        tamanho="grande"
        larguraTotal
        carregando={enviando}
        textoCarregando="Criando sua conta..."
      >
        Criar conta grátis
      </Botao>

      <p className="text-center text-xs leading-relaxed text-tinta-400">
        Ao criar a conta você concorda em receber e-mails sobre o seu conteúdo.
      </p>
    </form>
  );
}
