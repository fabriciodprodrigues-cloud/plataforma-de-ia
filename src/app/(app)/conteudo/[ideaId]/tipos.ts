import type { Plataforma, TipoConteudo } from "@/generated/prisma/enums";

export type DadosSeo = {
  titulo: string;
  descricao: string;
  tags: string[];
};

export type DadosArte = {
  textoArte: string;
  fundo: "solido" | "foto";
  fotoFundoUrl: string | null;
  fotoCredito: string | null;
  termoFoto: string | null;
};

/** Tudo que uma plataforma tem. Um objeto desses por rede escolhida. */
export type DadosPlataforma = {
  plataforma: Plataforma;
  tipo: TipoConteudo;
  conteudo: string;
  duracaoSegundos: number | null;
  seo: DadosSeo;
  arte: DadosArte;
};

export type MarcaCliente = {
  nomeMarca: string;
  corPrimaria: string;
  fonte: string;
  logoUrl: string | null;
};

export type Secao = "roteiro" | "arte" | "seo";
