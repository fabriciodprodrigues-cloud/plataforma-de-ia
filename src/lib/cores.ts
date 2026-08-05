/**
 * Extração da paleta de cores do logo — 100% no navegador, com a Canvas API.
 * Não usa IA nem API externa: é leitura de pixel. Roda em alguns milissegundos.
 *
 * Como funciona:
 *  1. desenha o logo num canvas pequeno (a resolução cheia não muda o resultado
 *     e só deixaria mais lento);
 *  2. lê os pixels, jogando fora o que é transparente ou quase branco/quase preto
 *     (fundo e contorno costumam dominar a contagem e não são "a cor da marca");
 *  3. agrupa cores parecidas em faixas (quantização) e conta quantos pixels caem
 *     em cada faixa;
 *  4. devolve as faixas mais frequentes, descartando as que ficaram parecidas
 *     demais com uma já escolhida.
 */

const TAMANHO_ANALISE = 160; // px no maior lado
const FAIXA = 24; // largura do "balde" de quantização por canal (0-255)
const DISTANCIA_MINIMA = 60; // o quanto duas cores precisam diferir para valerem as duas

export type CorRgb = { r: number; g: number; b: number };

export function paraHex({ r, g, b }: CorRgb): string {
  const p = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${p(r)}${p(g)}${p(b)}`.toUpperCase();
}

export function paraRgb(hex: string): CorRgb {
  const limpo = hex.replace("#", "");
  const completo =
    limpo.length === 3
      ? limpo
          .split("")
          .map((c) => c + c)
          .join("")
      : limpo;
  return {
    r: parseInt(completo.slice(0, 2), 16) || 0,
    g: parseInt(completo.slice(2, 4), 16) || 0,
    b: parseInt(completo.slice(4, 6), 16) || 0,
  };
}

/** Luminância relativa (0 = preto, 1 = branco), fórmula do padrão de acessibilidade WCAG. */
export function luminancia(cor: CorRgb): number {
  const canal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(cor.r) + 0.7152 * canal(cor.g) + 0.0722 * canal(cor.b);
}

/** Devolve preto ou branco — o que der mais contraste em cima da cor informada. */
export function corDeTextoSobre(hex: string): "#FFFFFF" | "#101018" {
  return luminancia(paraRgb(hex)) > 0.45 ? "#101018" : "#FFFFFF";
}

/** Versão mais escura da cor, usada em gradientes e sombras das artes. */
export function escurecer(hex: string, fator = 0.35): string {
  const { r, g, b } = paraRgb(hex);
  return paraHex({ r: r * (1 - fator), g: g * (1 - fator), b: b * (1 - fator) });
}

function distancia(a: CorRgb, b: CorRgb): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/** Carrega o arquivo num <img>. Funciona tanto para PNG/JPG quanto para SVG. */
function carregarImagem(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não conseguimos abrir essa imagem."));
    };
    img.src = url;
  });
}

export async function extrairPaleta(arquivo: File, quantidade = 5): Promise<string[]> {
  const img = await carregarImagem(arquivo);

  // SVG sem width/height explícitos pode chegar com dimensão 0.
  const larguraOriginal = img.naturalWidth || 300;
  const alturaOriginal = img.naturalHeight || 300;
  const escala = TAMANHO_ANALISE / Math.max(larguraOriginal, alturaOriginal);
  const largura = Math.max(1, Math.round(larguraOriginal * Math.min(1, escala)));
  const altura = Math.max(1, Math.round(alturaOriginal * Math.min(1, escala)));

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Seu navegador não conseguiu processar a imagem.");
  ctx.drawImage(img, 0, 0, largura, altura);

  const { data } = ctx.getImageData(0, 0, largura, altura);

  const baldes = new Map<string, { soma: CorRgb; total: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const alfa = data[i + 3];
    if (alfa < 200) continue; // pixel transparente: normalmente é o fundo do logo

    const cor = { r: data[i], g: data[i + 1], b: data[i + 2] };
    const lum = luminancia(cor);
    if (lum > 0.93 || lum < 0.02) continue; // branco/preto extremos não são "cor de marca"

    const chave = [cor.r, cor.g, cor.b]
      .map((v) => Math.round(v / FAIXA))
      .join(",");

    const balde = baldes.get(chave);
    if (balde) {
      balde.soma.r += cor.r;
      balde.soma.g += cor.g;
      balde.soma.b += cor.b;
      balde.total += 1;
    } else {
      baldes.set(chave, { soma: { ...cor }, total: 1 });
    }
  }

  const candidatas = [...baldes.values()]
    .sort((a, b) => b.total - a.total)
    .map(({ soma, total }) => ({
      r: soma.r / total,
      g: soma.g / total,
      b: soma.b / total,
    }));

  const escolhidas: CorRgb[] = [];
  for (const cor of candidatas) {
    if (escolhidas.length >= quantidade) break;
    if (escolhidas.every((e) => distancia(e, cor) > DISTANCIA_MINIMA)) {
      escolhidas.push(cor);
    }
  }

  return escolhidas.map(paraHex);
}

/** Aceita "#abc", "#AABBCC" — usado para validar a cor digitada à mão. */
export function ehHexValido(valor: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(valor.trim());
}
