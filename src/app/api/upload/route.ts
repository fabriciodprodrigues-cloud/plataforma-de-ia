import { NextResponse } from "next/server";
import { obterUsuarioAuth } from "@/lib/auth";
import { enviarArquivo } from "@/lib/storage";

const TIPOS_ACEITOS = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB

/** Recebe logo ou foto do usuário e devolve a URL pública do arquivo salvo. */
export async function POST(request: Request) {
  try {
    const usuario = await obterUsuarioAuth();
    if (!usuario) {
      return NextResponse.json(
        { erro: "Sua sessão expirou. Entre de novo para continuar." },
        { status: 401 },
      );
    }

    const form = await request.formData();
    const arquivo = form.get("arquivo");
    const pasta = (form.get("pasta") as string | null) ?? "logos";

    if (!(arquivo instanceof File)) {
      return NextResponse.json({ erro: "Nenhum arquivo foi enviado." }, { status: 400 });
    }
    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      return NextResponse.json(
        { erro: "Formato não aceito. Envie uma imagem PNG, JPG, WEBP ou SVG." },
        { status: 400 },
      );
    }
    if (arquivo.size > TAMANHO_MAXIMO) {
      return NextResponse.json(
        { erro: "Essa imagem passa de 5 MB. Tente uma versão menor." },
        { status: 400 },
      );
    }

    const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "png";
    const nomeSeguro = `${pasta === "logos" ? "logos" : "fotos"}/${usuario.id}/${Date.now()}.${extensao}`;

    const url = await enviarArquivo({
      caminho: nomeSeguro,
      conteudo: await arquivo.arrayBuffer(),
      tipo: arquivo.type,
    });

    return NextResponse.json({ url });
  } catch (erro) {
    console.error("[upload]", erro);
    const mensagem =
      erro instanceof Error && erro.message.includes(".env")
        ? erro.message
        : "Não conseguimos salvar a imagem agora. Tente de novo em instantes.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
