import { NextResponse, type NextRequest } from "next/server";
import { FormatoArte } from "@/generated/prisma/enums";
import { obterUsuarioAuth } from "@/lib/auth";
import { buscarFotos } from "@/lib/pexels";

/** Busca fotos de fundo no banco de imagens a partir de um termo. */
export async function GET(request: NextRequest) {
  const usuario = await obterUsuarioAuth();
  if (!usuario) {
    return NextResponse.json({ erro: "Sua sessão expirou." }, { status: 401 });
  }

  const termo = request.nextUrl.searchParams.get("termo")?.trim();
  const formatoBruto = request.nextUrl.searchParams.get("formato") ?? "POST";

  if (!termo) {
    return NextResponse.json({ erro: "Escreva o que você quer buscar." }, { status: 400 });
  }

  const formato =
    formatoBruto in FormatoArte
      ? (formatoBruto as FormatoArte)
      : FormatoArte.POST;

  try {
    const fotos = await buscarFotos({ termo, formato });
    return NextResponse.json({ fotos });
  } catch (erro) {
    console.error("[fotos]", erro);
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Não conseguimos buscar fotos agora. Tente de novo.";
    return NextResponse.json({ erro: mensagem }, { status: 502 });
  }
}
