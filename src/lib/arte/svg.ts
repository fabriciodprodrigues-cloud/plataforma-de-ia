import type { Layout } from "./layout";

/** Escapa o que vai virar texto dentro do XML do SVG. */
function esc(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Monta o arquivo .svg da arte. Ele é autossuficiente: logo e foto entram
 * embutidos como data URI, então o arquivo abre sozinho em qualquer lugar.
 */
export function montarSvg(
  layout: Layout,
  recursos: { logoSrc?: string | null; fotoSrc?: string | null } = {},
): string {
  const { largura, altura } = layout;

  const fundo =
    layout.fundo === "foto" && recursos.fotoSrc
      ? `<image href="${recursos.fotoSrc}" x="0" y="0" width="${largura}" height="${altura}" preserveAspectRatio="xMidYMid slice"/>
      <rect width="${largura}" height="${altura}" fill="url(#veu)"/>`
      : `<rect width="${largura}" height="${altura}" fill="${layout.corPrimaria}"/>
      <rect width="${largura}" height="${altura}" fill="url(#veu)"/>`;

  const corVeu = layout.corPrimariaEscura;

  const logo = recursos.logoSrc
    ? `<clipPath id="recorteLogo"><circle cx="${layout.logo.cx}" cy="${layout.logo.cy}" r="${layout.logo.raio}"/></clipPath>
    <circle cx="${layout.logo.cx}" cy="${layout.logo.cy}" r="${layout.logo.raio}" fill="#ffffff" fill-opacity="0.95"/>
    <image href="${recursos.logoSrc}"
      x="${layout.logo.cx - layout.logo.raio * 0.72}"
      y="${layout.logo.cy - layout.logo.raio * 0.72}"
      width="${layout.logo.raio * 1.44}" height="${layout.logo.raio * 1.44}"
      preserveAspectRatio="xMidYMid meet" clip-path="url(#recorteLogo)"/>`
    : `<circle cx="${layout.logo.cx}" cy="${layout.logo.cy}" r="${layout.logo.raio}" fill="#ffffff" fill-opacity="0.95"/>
    <text x="${layout.logo.cx}" y="${layout.logo.cy + layout.logo.tamanhoFonteInicial * 0.35}"
      text-anchor="middle" fill="${layout.corPrimaria}"
      font-size="${layout.logo.tamanhoFonteInicial}" font-family="${esc(layout.fonteSvg)}" font-weight="700"
    >${esc(layout.logo.inicial)}</text>`;

  const linhas = layout.titulo.linhas
    .map(
      (linha) =>
        `<tspan x="${layout.titulo.x}" y="${linha.y}">${esc(linha.texto)}</tspan>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">
  <defs>
    <clipPath id="recorteCartao"><rect width="${largura}" height="${altura}" rx="${layout.raioCartao}"/></clipPath>
    <linearGradient id="veu" x1="0" y1="0" x2="0" y2="1">
      <stop offset="${Math.round(layout.gradiente.inicio * 100)}%" stop-color="${corVeu}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${corVeu}" stop-opacity="${layout.gradiente.opacidadeFinal}"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#recorteCartao)">
    ${fundo}
  </g>

  <rect x="${layout.borda.x}" y="${layout.borda.y}" width="${layout.borda.largura}" height="${layout.borda.altura}"
    rx="${layout.borda.raio}" fill="none" stroke="${layout.corTexto}" stroke-opacity="0.32"
    stroke-width="${layout.borda.espessura}"/>

  ${logo}

  <text fill="${layout.corTexto}" font-size="${layout.titulo.tamanhoFonte}"
    font-family="${esc(layout.fonteSvg)}" font-weight="700"
    style="paint-order:stroke;stroke:${layout.corPrimariaEscura};stroke-width:${layout.titulo.contorno};stroke-linejoin:round;">
    ${linhas}
  </text>

  <text x="${layout.rodape.x}" y="${layout.rodape.y}" fill="${layout.corTexto}" fill-opacity="0.85"
    font-size="${layout.rodape.tamanhoFonte}" font-family="${esc(layout.fonteSvg)}"
  >${esc(layout.rodape.texto)}</text>
</svg>`;
}
