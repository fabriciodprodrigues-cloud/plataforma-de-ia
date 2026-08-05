"use client";

import type { Layout } from "./layout";

/**
 * Desenho da arte no <canvas> do navegador.
 *
 * Roda com as fontes reais já carregadas na página, então a prévia que o usuário
 * vê é pixel a pixel o mesmo PNG que ele baixa. Nada de rasterizar SVG (onde as
 * fontes personalizadas não se aplicam) nem de converter no servidor.
 */

function caminhoArredondado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
  altura: number,
  raio: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + raio, y);
  ctx.arcTo(x + largura, y, x + largura, y + altura, raio);
  ctx.arcTo(x + largura, y + altura, x, y + altura, raio);
  ctx.arcTo(x, y + altura, x, y, raio);
  ctx.arcTo(x, y, x + largura, y, raio);
  ctx.closePath();
}

/** Desenha a imagem cobrindo toda a área, cortando o excesso (igual ao CSS object-fit: cover). */
function desenharCobrindo(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  largura: number,
  altura: number,
) {
  const escala = Math.max(largura / img.width, altura / img.height);
  const l = img.width * escala;
  const a = img.height * escala;
  ctx.drawImage(img, (largura - l) / 2, (altura - a) / 2, l, a);
}

function hexParaRgba(hex: string, alfa: number): string {
  const limpo = hex.replace("#", "");
  const completo =
    limpo.length === 3
      ? limpo
          .split("")
          .map((c) => c + c)
          .join("")
      : limpo;
  const r = parseInt(completo.slice(0, 2), 16) || 0;
  const g = parseInt(completo.slice(2, 4), 16) || 0;
  const b = parseInt(completo.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}

export type ImagensArte = {
  logo?: HTMLImageElement | null;
  foto?: HTMLImageElement | null;
};

/**
 * Descobre o nome real da família da fonte.
 *
 * O next/font auto-hospeda as fontes com um nome embaralhado (algo como
 * "__Fraunces_a1b2c3") e só expõe esse nome por uma variável CSS. O canvas não
 * entende `var(--x)`, então lemos o valor já resolvido do documento. Sem isso a
 * arte sairia na fonte padrão do sistema em vez da fonte que o usuário escolheu.
 */
function familiaDoCanvas(layout: Layout): string {
  if (typeof window === "undefined") return layout.fonteSvg;
  const valor = getComputedStyle(document.documentElement)
    .getPropertyValue(layout.fonteVariavel)
    .trim();
  return valor || layout.fonteSvg;
}

export function desenharArte(
  canvas: HTMLCanvasElement,
  layout: Layout,
  imagens: ImagensArte = {},
) {
  const { largura, altura } = layout;
  canvas.width = largura;
  canvas.height = altura;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu preparar a imagem.");

  const familia = familiaDoCanvas(layout);
  ctx.clearRect(0, 0, largura, altura);

  // --- Fundo (recortado com cantos arredondados) ---
  ctx.save();
  caminhoArredondado(ctx, 0, 0, largura, altura, layout.raioCartao);
  ctx.clip();

  if (layout.fundo === "foto" && imagens.foto) {
    desenharCobrindo(ctx, imagens.foto, largura, altura);
  } else {
    ctx.fillStyle = layout.corPrimaria;
    ctx.fillRect(0, 0, largura, altura);
  }

  // Véu escuro no rodapé — é o que garante o texto legível sobre qualquer foto.
  const veu = ctx.createLinearGradient(0, 0, 0, altura);
  veu.addColorStop(layout.gradiente.inicio, hexParaRgba(layout.corPrimariaEscura, 0));
  veu.addColorStop(1, hexParaRgba(layout.corPrimariaEscura, layout.gradiente.opacidadeFinal));
  ctx.fillStyle = veu;
  ctx.fillRect(0, 0, largura, altura);
  ctx.restore();

  // --- Moldura interna ---
  ctx.save();
  ctx.strokeStyle = hexParaRgba(layout.corTexto === "#FFFFFF" ? "#FFFFFF" : "#101018", 0.32);
  ctx.lineWidth = layout.borda.espessura;
  caminhoArredondado(
    ctx,
    layout.borda.x,
    layout.borda.y,
    layout.borda.largura,
    layout.borda.altura,
    layout.borda.raio,
  );
  ctx.stroke();
  ctx.restore();

  // --- Logo ---
  ctx.save();
  ctx.beginPath();
  ctx.arc(layout.logo.cx, layout.logo.cy, layout.logo.raio, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fill();

  if (imagens.logo) {
    ctx.clip();
    const lado = layout.logo.raio * 1.44;
    const escala = Math.min(lado / imagens.logo.width, lado / imagens.logo.height);
    const l = imagens.logo.width * escala;
    const a = imagens.logo.height * escala;
    ctx.drawImage(imagens.logo, layout.logo.cx - l / 2, layout.logo.cy - a / 2, l, a);
  } else {
    ctx.fillStyle = layout.corPrimaria;
    ctx.font = `700 ${layout.logo.tamanhoFonteInicial}px ${familia}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(layout.logo.inicial, layout.logo.cx, layout.logo.cy);
  }
  ctx.restore();

  // --- Título com contorno (mesmo efeito do paint-order do SVG) ---
  ctx.save();
  ctx.font = `700 ${layout.titulo.tamanhoFonte}px ${familia}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.lineWidth = layout.titulo.contorno;
  ctx.strokeStyle = layout.corPrimariaEscura;
  for (const linha of layout.titulo.linhas) {
    ctx.strokeText(linha.texto, layout.titulo.x, linha.y);
  }
  ctx.fillStyle = layout.corTexto;
  for (const linha of layout.titulo.linhas) {
    ctx.fillText(linha.texto, layout.titulo.x, linha.y);
  }
  ctx.restore();

  // --- Rodapé ---
  ctx.save();
  ctx.font = `${layout.rodape.tamanhoFonte}px ${familia}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = layout.corTexto;
  ctx.fillText(layout.rodape.texto, layout.rodape.x, layout.rodape.y);
  ctx.restore();
}

/** Carrega uma imagem para uso no canvas, aceitando URL externa (Pexels/Storage). */
export function carregarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Sem isso o canvas fica "sujo" e o navegador bloqueia o download do PNG.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não conseguimos carregar essa imagem."));
    img.src = url;
  });
}

/** Espera as fontes da página estarem prontas antes de desenhar. */
export async function aguardarFontes() {
  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Se o navegador não expuser a API, seguimos com a fonte padrão.
    }
  }
}
