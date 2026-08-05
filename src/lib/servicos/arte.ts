import type { FormatoArte, Plataforma } from "@/generated/prisma/enums";
import { PLATAFORMAS } from "@/lib/constants";
import { calcularLayout, type FundoArte } from "@/lib/arte/layout";
import { montarSvg } from "@/lib/arte/svg";

export type DadosMarca = {
  nomeMarca: string;
  corPrimaria: string;
  fonte: string;
  logoUrl: string | null;
};

/** Gera o arquivo SVG da arte a partir da marca do usuário e do texto escolhido. */
export function gerarSvgDaArte(params: {
  plataforma: Plataforma;
  marca: DadosMarca;
  texto: string;
  fundo: FundoArte;
  fotoUrl?: string | null;
}): string {
  const meta = PLATAFORMAS[params.plataforma];

  const layout = calcularLayout({
    formato: meta.formatoArte,
    texto: params.texto,
    nomeMarca: params.marca.nomeMarca,
    nomePlataforma: meta.nome,
    corPrimaria: params.marca.corPrimaria,
    fonteId: params.marca.fonte,
    fundo: params.fundo,
    temLogo: Boolean(params.marca.logoUrl),
    temFoto: Boolean(params.fotoUrl),
  });

  return montarSvg(layout, {
    logoSrc: params.marca.logoUrl,
    fotoSrc: params.fotoUrl,
  });
}

export function formatoDaPlataforma(plataforma: Plataforma): FormatoArte {
  return PLATAFORMAS[plataforma].formatoArte;
}
