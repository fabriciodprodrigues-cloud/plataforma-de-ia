import type Anthropic from "@anthropic-ai/sdk";
import { modoDemonstracao } from "@/lib/env";
import { ErroIA, MODELO, conferirParada, ia, textoDaResposta } from "./cliente";
import { pesquisaSimulada } from "./simulado";

export type Fonte = { titulo: string; url: string };
export type ResultadoPesquisa = { resumo: string; fontes: Fonte[] };

const SISTEMA = `Você é um pesquisador de conteúdo para redes sociais, brasileiro, e escreve sempre em português do Brasil.

Sua tarefa é descobrir o que está em alta AGORA no nicho informado e resumir de um jeito prático para quem vai criar conteúdo.

Regras:
- Use a busca na web para achar informação recente. Não invente dados, números ou notícias.
- Priorize fontes brasileiras e conteúdo dos últimos meses.
- Escreva o resumo em tópicos curtos, direto ao ponto, sem enrolação e sem jargão de marketing.
- Foque no que gera conteúdo: dores do público, dúvidas comuns, formatos que estão funcionando, temas em alta, erros que as pessoas cometem.
- No máximo 400 palavras.`;

/**
 * Pesquisa o nicho (ou um tema específico dentro dele) usando a busca na web
 * nativa da Claude API. É o que alimenta a geração de temas e de conteúdo.
 */
export async function pesquisar(params: {
  nicho: string;
  /** Tema digitado pelo usuário. Sem isso, faz a pesquisa geral do nicho. */
  termo?: string | null;
}): Promise<ResultadoPesquisa> {
  if (modoDemonstracao()) return pesquisaSimulada(params.nicho, params.termo);

  const prompt = params.termo
    ? `Nicho de atuação: "${params.nicho}".\n\nPesquise especificamente sobre: "${params.termo}".\n\nTraga o que está sendo falado sobre esse tema, dados ou fatos recentes que dão credibilidade, e os ângulos mais interessantes para criar conteúdo.`
    : `Nicho de atuação: "${params.nicho}".\n\nPesquise o que está em alta nesse nicho e traga os assuntos com mais potencial de engajamento agora.`;

  const mensagens: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  let resposta: Anthropic.Message | null = null;

  // A busca roda no servidor da Anthropic em ciclos. Quando ela atinge o limite de
  // um ciclo, a resposta volta com "pause_turn" e a gente reenvia para continuar.
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    resposta = await ia().messages.create({
      model: MODELO,
      max_tokens: 8000,
      system: SISTEMA,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
      messages: mensagens,
    });

    if (resposta.stop_reason !== "pause_turn") break;
    mensagens.push({ role: "assistant", content: resposta.content });
  }

  if (!resposta) throw new ErroIA("Não conseguimos concluir a pesquisa. Tente de novo.");
  conferirParada(resposta);

  const resumo = textoDaResposta(resposta.content);
  if (!resumo) {
    throw new ErroIA(
      "A pesquisa não trouxe resultado. Tente descrever seu nicho de outro jeito.",
    );
  }

  return { resumo, fontes: extrairFontes(resposta.content) };
}

/** Lê os links que a busca realmente usou, sem repetir. */
function extrairFontes(conteudo: Anthropic.ContentBlock[]): Fonte[] {
  const vistas = new Set<string>();
  const fontes: Fonte[] = [];

  for (const bloco of conteudo) {
    if (bloco.type !== "web_search_tool_result") continue;
    // Quando a busca falha, `content` vem como um objeto de erro em vez de lista.
    if (!Array.isArray(bloco.content)) continue;

    for (const item of bloco.content) {
      if (item.type !== "web_search_result") continue;
      if (vistas.has(item.url)) continue;
      vistas.add(item.url);
      fontes.push({ titulo: item.title || item.url, url: item.url });
    }
  }

  return fontes.slice(0, 12);
}
