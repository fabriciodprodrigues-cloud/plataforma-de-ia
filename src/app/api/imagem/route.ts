import { NextResponse, type NextRequest } from "next/server";

/**
 * Repassa imagens externas pelo nosso próprio domínio.
 *
 * Motivo: a arte é desenhada num <canvas> para gerar o PNG. Se a foto vier de
 * outro domínio sem as permissões certas, o navegador marca o canvas como
 * "sujo" e bloqueia o download. Servindo pelo mesmo domínio, isso não acontece.
 *
 * Só aceitamos os domínios que a própria plataforma usa — senão viraria um
 * proxy aberto para qualquer endereço da internet.
 */
const HOSTS_PERMITIDOS = [/^images\.pexels\.com$/, /\.supabase\.co$/];

export async function GET(request: NextRequest) {
  const alvo = request.nextUrl.searchParams.get("url");
  if (!alvo) {
    return NextResponse.json({ erro: "Endereço da imagem não informado." }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(alvo);
  } catch {
    return NextResponse.json({ erro: "Endereço de imagem inválido." }, { status: 400 });
  }

  const permitido =
    url.protocol === "https:" && HOSTS_PERMITIDOS.some((re) => re.test(url.hostname));

  if (!permitido) {
    return NextResponse.json(
      { erro: "Essa imagem não vem de uma origem permitida." },
      { status: 403 },
    );
  }

  try {
    const resposta = await fetch(url, { next: { revalidate: 86400 } });
    if (!resposta.ok || !resposta.body) {
      return NextResponse.json({ erro: "Imagem não encontrada." }, { status: 404 });
    }

    return new NextResponse(resposta.body, {
      headers: {
        "Content-Type": resposta.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (erro) {
    console.error("[imagem]", erro);
    return NextResponse.json({ erro: "Não conseguimos carregar a imagem." }, { status: 502 });
  }
}
