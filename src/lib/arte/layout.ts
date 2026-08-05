import type { FormatoArte } from "@/generated/prisma/enums";
import { fonteFamiliaSvg, fonteVariavel } from "@/lib/constants";
import { corDeTextoSobre, escurecer } from "@/lib/cores";

/**
 * Cálculo da arte em um lugar só.
 *
 * Por que assim: a prévia na tela é desenhada em <canvas> (para o PNG sair
 * idêntico ao que o usuário viu, com as fontes reais do navegador) e o arquivo
 * .svg é gerado no servidor. Se cada um calculasse posição por conta própria,
 * uma hora iam divergir. Aqui os dois leem o MESMO layout.
 */

export type FundoArte = "solido" | "foto";

export type OpcoesArte = {
  formato: FormatoArte;
  /** Frase que vai estampada na arte. */
  texto: string;
  nomeMarca: string;
  nomePlataforma: string;
  corPrimaria: string;
  /** Id da fonte escolhida no onboarding (ex: "Fraunces"). */
  fonteId: string;
  fundo: FundoArte;
  temLogo: boolean;
  temFoto: boolean;
};

export type LinhaTitulo = { texto: string; y: number };

export type Layout = {
  largura: number;
  altura: number;
  raioCartao: number;
  corPrimaria: string;
  corPrimariaEscura: string;
  corTexto: string;
  /** Família a escrever dentro do .svg (nome comum da fonte). */
  fonteSvg: string;
  /** Variável CSS da fonte — o canvas resolve para o nome real do next/font. */
  fonteVariavel: string;
  fundo: FundoArte;
  margem: number;
  /** Faixa do degradê que escurece o rodapé para o texto ficar legível. */
  gradiente: { inicio: number; opacidadeFinal: number };
  borda: { x: number; y: number; largura: number; altura: number; raio: number; espessura: number };
  logo: { cx: number; cy: number; raio: number; inicial: string; tamanhoFonteInicial: number };
  titulo: {
    x: number;
    tamanhoFonte: number;
    alturaLinha: number;
    contorno: number;
    linhas: LinhaTitulo[];
  };
  rodape: { x: number; y: number; texto: string; tamanhoFonte: number };
};

type Medidas = {
  largura: number;
  altura: number;
  margem: number;
  fonteTitulo: number;
  fonteMinima: number;
  maxLinhas: number;
  fonteRodape: number;
  raioLogo: number;
};

const MEDIDAS: Record<FormatoArte, Medidas> = {
  // Instagram / LinkedIn — 4:5
  POST: {
    largura: 1080,
    altura: 1350,
    margem: 76,
    fonteTitulo: 82,
    fonteMinima: 52,
    maxLinhas: 5,
    fonteRodape: 30,
    raioLogo: 54,
  },
  // YouTube — 16:9
  THUMBNAIL: {
    largura: 1280,
    altura: 720,
    margem: 64,
    fonteTitulo: 78,
    fonteMinima: 48,
    maxLinhas: 3,
    fonteRodape: 28,
    raioLogo: 48,
  },
  // TikTok — 9:16
  CAPA_VERTICAL: {
    largura: 1080,
    altura: 1920,
    margem: 80,
    fonteTitulo: 92,
    fonteMinima: 58,
    maxLinhas: 4,
    fonteRodape: 32,
    raioLogo: 58,
  },
};

/**
 * Largura média de um caractere em relação ao tamanho da fonte, para texto em
 * negrito. É uma estimativa — o objetivo é quebrar a linha no lugar certo, e
 * como servidor e navegador usam a MESMA estimativa, os dois quebram igual.
 *
 * O valor é propositalmente um pouco generoso: fontes serifadas (Playfair,
 * Fraunces) são mais largas que as sem serifa. Errando para mais, a linha quebra
 * um pouco antes; errando para menos, o texto vazaria para fora da margem.
 */
const FATOR_LARGURA_CARACTERE = 0.58;

function quebrarEmLinhas(
  texto: string,
  larguraDisponivel: number,
  tamanhoFonte: number,
): string[] {
  const maxCaracteres = Math.max(
    8,
    Math.floor(larguraDisponivel / (tamanhoFonte * FATOR_LARGURA_CARACTERE)),
  );

  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";

  for (const palavra of palavras) {
    const candidata = atual ? `${atual} ${palavra}` : palavra;
    if (candidata.length <= maxCaracteres) {
      atual = candidata;
    } else {
      if (atual) linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);

  return linhas;
}

export function calcularLayout(opcoes: OpcoesArte): Layout {
  const m = MEDIDAS[opcoes.formato];
  const larguraTexto = m.largura - m.margem * 2 - (m.raioLogo > 0 ? 0 : 0);

  // Diminui a fonte até o título caber no número de linhas permitido.
  let tamanhoFonte = m.fonteTitulo;
  let linhasTexto = quebrarEmLinhas(opcoes.texto, larguraTexto, tamanhoFonte);
  while (linhasTexto.length > m.maxLinhas && tamanhoFonte > m.fonteMinima) {
    tamanhoFonte -= 4;
    linhasTexto = quebrarEmLinhas(opcoes.texto, larguraTexto, tamanhoFonte);
  }
  // Se mesmo na fonte mínima não coube, corta e sinaliza com reticências.
  if (linhasTexto.length > m.maxLinhas) {
    linhasTexto = linhasTexto.slice(0, m.maxLinhas);
    linhasTexto[linhasTexto.length - 1] =
      linhasTexto[linhasTexto.length - 1].replace(/[.,;:]?$/, "…");
  }

  const alturaLinha = Math.round(tamanhoFonte * 1.18);
  const usaFoto = opcoes.fundo === "foto" && opcoes.temFoto;

  // Texto ancorado no rodapé, subindo conforme o número de linhas.
  const yRodape = m.altura - m.margem;
  const baseTitulo = yRodape - m.fonteRodape - 32;
  const primeiraLinhaY = baseTitulo - (linhasTexto.length - 1) * alturaLinha;

  const corTexto = usaFoto ? "#FFFFFF" : corDeTextoSobre(opcoes.corPrimaria);

  return {
    largura: m.largura,
    altura: m.altura,
    raioCartao: Math.round(m.largura * 0.02),
    corPrimaria: opcoes.corPrimaria,
    corPrimariaEscura: escurecer(opcoes.corPrimaria, 0.45),
    corTexto,
    fonteSvg: fonteFamiliaSvg(opcoes.fonteId),
    fonteVariavel: fonteVariavel(opcoes.fonteId),
    fundo: usaFoto ? "foto" : "solido",
    margem: m.margem,
    gradiente: usaFoto
      ? { inicio: 0.25, opacidadeFinal: 0.94 }
      : { inicio: 0.35, opacidadeFinal: 0.55 },
    borda: {
      x: Math.round(m.margem * 0.42),
      y: Math.round(m.margem * 0.42),
      largura: m.largura - Math.round(m.margem * 0.84),
      altura: m.altura - Math.round(m.margem * 0.84),
      raio: Math.round(m.largura * 0.012),
      espessura: Math.max(2, Math.round(m.largura / 480)),
    },
    logo: {
      cx: m.largura - m.margem - m.raioLogo * 0.15,
      cy: m.margem + m.raioLogo * 0.85,
      raio: m.raioLogo,
      inicial: (opcoes.nomeMarca || "M").trim().charAt(0).toUpperCase(),
      tamanhoFonteInicial: Math.round(m.raioLogo * 0.95),
    },
    titulo: {
      x: m.margem,
      tamanhoFonte,
      alturaLinha,
      contorno: Math.max(4, Math.round(tamanhoFonte * 0.16)),
      linhas: linhasTexto.map((texto, indice) => ({
        texto,
        y: primeiraLinhaY + indice * alturaLinha,
      })),
    },
    rodape: {
      x: m.margem,
      y: yRodape,
      texto: `${opcoes.nomeMarca} · ${opcoes.nomePlataforma}`,
      tamanhoFonte: m.fonteRodape,
    },
  };
}
