import { ErroIA, MODELO, conferirParada, ia, textoDaResposta } from "./cliente";

/**
 * Pede uma resposta em JSON com formato garantido pela API (saída estruturada).
 * Isso evita o clássico "a IA respondeu com um texto explicando o JSON em vez do JSON".
 *
 * Limitações do schema aceito pela API: nada de minLength/maxLength/minItems —
 * quantidades e tamanhos a gente pede no texto das instruções.
 */
export async function pedirJson<T>(params: {
  sistema: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
  /** "low" para tarefas simples e rápidas, "medium"/"high" para as que exigem raciocínio. */
  esforco?: "low" | "medium" | "high";
}): Promise<T> {
  const resposta = await ia().messages.create({
    model: MODELO,
    max_tokens: params.maxTokens ?? 8000,
    system: params.sistema,
    output_config: {
      effort: params.esforco ?? "medium",
      format: {
        type: "json_schema",
        schema: params.schema,
      },
    },
    messages: [{ role: "user", content: params.prompt }],
  });

  conferirParada(resposta);

  const texto = textoDaResposta(resposta.content);
  if (!texto) {
    throw new ErroIA("A IA devolveu uma resposta vazia. Tente de novo.");
  }

  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new ErroIA("A IA devolveu uma resposta em formato inesperado. Tente de novo.");
  }
}

/** Atalhos para montar schemas sem repetir `additionalProperties: false` toda hora. */
export function objeto(
  propriedades: Record<string, unknown>,
  obrigatorias: string[],
) {
  return {
    type: "object",
    properties: propriedades,
    required: obrigatorias,
    additionalProperties: false,
  };
}

export const texto = (descricao: string) => ({ type: "string", description: descricao });

export const listaDeTextos = (descricao: string) => ({
  type: "array",
  description: descricao,
  items: { type: "string" },
});
