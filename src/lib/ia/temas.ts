import { modoDemonstracao } from "@/lib/env";
import { objeto, pedirJson, texto } from "./json";
import { temaProprioSimulado, temasSimulados } from "./simulado";

export type TemaSugerido = {
  titulo: string;
  justificativa: string;
};

const SISTEMA = `Você cria pautas de conteúdo para redes sociais e escreve sempre em português do Brasil.

Regras:
- Títulos curtos e concretos, do jeito que um criador falaria. Nada de título genérico tipo "A importância de X".
- Cada tema precisa ser específico o bastante para virar um post ou vídeo sozinho.
- A justificativa explica em UMA frase por que esse tema vale a pena agora, em linguagem simples.
- Nunca use jargão de marketing ("engajamento", "conversão", "funil") nos títulos.
- Varie os formatos: dica prática, erro comum, bastidor, comparação, mito, passo a passo.`;

const SCHEMA = objeto(
  {
    temas: {
      type: "array",
      description: "Lista de temas sugeridos",
      items: objeto(
        {
          titulo: texto("Título do conteúdo, no máximo 70 caracteres"),
          justificativa: texto("Uma frase explicando por que esse tema vale a pena agora"),
        },
        ["titulo", "justificativa"],
      ),
    },
  },
  ["temas"],
);

export async function gerarTemas(params: {
  nicho: string;
  nomeMarca: string;
  pesquisa: string;
  quantidade?: number;
  /** Títulos que o usuário já tem, para não sugerir repetido. */
  evitar?: string[];
}): Promise<TemaSugerido[]> {
  const quantidade = params.quantidade ?? 6;

  if (modoDemonstracao()) {
    return temasSimulados(params.nicho, quantidade, params.evitar ?? []);
  }

  const evitar =
    params.evitar && params.evitar.length > 0
      ? `\n\nJá existem estes temas — sugira outros, diferentes destes:\n${params.evitar.map((t) => `- ${t}`).join("\n")}`
      : "";

  const resultado = await pedirJson<{ temas: TemaSugerido[] }>({
    sistema: SISTEMA,
    prompt: `Marca: ${params.nomeMarca}
Nicho: ${params.nicho}

Pesquisa recente sobre o nicho:
"""
${params.pesquisa}
"""

Sugira exatamente ${quantidade} temas de conteúdo baseados nessa pesquisa.${evitar}`,
    schema: SCHEMA,
    maxTokens: 3000,
    esforco: "medium",
  });

  return (resultado.temas ?? [])
    .filter((t) => t?.titulo?.trim())
    .slice(0, quantidade)
    .map((t) => ({
      titulo: t.titulo.trim(),
      justificativa: (t.justificativa ?? "").trim(),
    }));
}

/** Usado quando o usuário digita o próprio tema: valida e melhora o título. */
export async function refinarTemaProprio(params: {
  nicho: string;
  temaDigitado: string;
  pesquisa: string;
}): Promise<TemaSugerido> {
  if (modoDemonstracao()) return temaProprioSimulado(params.temaDigitado);

  const resultado = await pedirJson<TemaSugerido>({
    sistema: SISTEMA,
    prompt: `Nicho: ${params.nicho}

O usuário quer falar sobre: "${params.temaDigitado}"

Pesquisa recente sobre esse tema:
"""
${params.pesquisa}
"""

Transforme isso em um título de conteúdo específico e atraente, mantendo fielmente a intenção do usuário. Não mude o assunto.`,
    schema: objeto(
      {
        titulo: texto("Título do conteúdo, no máximo 70 caracteres"),
        justificativa: texto("Uma frase explicando o ângulo escolhido"),
      },
      ["titulo", "justificativa"],
    ),
    maxTokens: 1500,
    esforco: "low",
  });

  return {
    titulo: resultado.titulo?.trim() || params.temaDigitado,
    justificativa: (resultado.justificativa ?? "").trim(),
  };
}
