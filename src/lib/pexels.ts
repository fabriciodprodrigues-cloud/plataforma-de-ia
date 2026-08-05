import type { FormatoArte } from "@/generated/prisma/enums";
import { pexelsApiKey } from "@/lib/env";

export type FotoBanco = {
  id: string;
  /** Versão pequena, usada na grade de escolha. */
  urlPreview: string;
  /** Versão grande, usada para compor a arte. */
  urlGrande: string;
  autor: string;
  creditoUrl: string;
  descricao: string;
};

/** O Pexels aceita filtrar por orientação — casa com o formato de cada rede. */
function orientacaoPara(formato: FormatoArte): "landscape" | "portrait" {
  return formato === "THUMBNAIL" ? "landscape" : "portrait";
}

type RespostaPexels = {
  photos?: Array<{
    id: number;
    photographer?: string;
    photographer_url?: string;
    alt?: string;
    src?: { medium?: string; large?: string; large2x?: string; portrait?: string };
  }>;
};

/**
 * Busca fotos com licença de uso livre no Pexels.
 * Falha aqui nunca deve derrubar a tela: quem chama trata e o usuário
 * continua podendo usar fundo de cor sólida ou foto própria.
 */
export async function buscarFotos(params: {
  termo: string;
  formato: FormatoArte;
  quantidade?: number;
}): Promise<FotoBanco[]> {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", params.termo);
  url.searchParams.set("per_page", String(params.quantidade ?? 12));
  url.searchParams.set("orientation", orientacaoPara(params.formato));
  url.searchParams.set("locale", "pt-BR");

  const resposta = await fetch(url, {
    headers: { Authorization: pexelsApiKey() },
    // As buscas se repetem bastante; uma hora de cache economiza requisições.
    next: { revalidate: 3600 },
  });

  if (resposta.status === 401) {
    throw new Error(
      "A chave do banco de imagens parece inválida. Confira o PEXELS_API_KEY no arquivo .env.",
    );
  }
  if (resposta.status === 429) {
    throw new Error(
      "O banco de imagens atingiu o limite de buscas por hora. Tente daqui a pouco.",
    );
  }
  if (!resposta.ok) {
    throw new Error("O banco de imagens não respondeu agora. Tente de novo em instantes.");
  }

  const dados = (await resposta.json()) as RespostaPexels;

  return (dados.photos ?? [])
    .map((foto) => {
      const grande = foto.src?.large2x ?? foto.src?.large ?? foto.src?.portrait;
      const preview = foto.src?.medium ?? grande;
      if (!grande || !preview) return null;
      return {
        id: String(foto.id),
        urlPreview: preview,
        urlGrande: grande,
        autor: foto.photographer ?? "Pexels",
        creditoUrl: foto.photographer_url ?? "https://www.pexels.com",
        descricao: foto.alt ?? params.termo,
      } satisfies FotoBanco;
    })
    .filter((f): f is FotoBanco => f !== null);
}
