import type Anthropic from "@anthropic-ai/sdk";
import { modoDemonstracao } from "@/lib/env";
import { ErroIA, MODELO, conferirParada, ia, textoDaResposta } from "./cliente";
import { pesquisaSimulada } from "./simulado";

export type Fonte = { titulo: string; url: string };
export type ResultadoPesquisa = { resumo: string; fontes: Fonte[] };

/**
 * Aviso de progresso emitido durante a pesquisa.
 *
 * Existe porque a pesquisa real leva perto de três minutos: sem isso a tela fica
 * parada tempo demais e o usuário conclui que travou — foi exatamente o que
 * aconteceu no primeiro teste em produção.
 */
export type EventoPesquisa =
  | { tipo: "buscando"; consulta: string; numero: number }
  | { tipo: "leu"; dominios: string[]; totalFontes: number }
  | { tipo: "escrevendo" };

export type AoProgredir = (evento: EventoPesquisa) => void;

/** "https://www.contabeis.com.br/noticias/..." vira "contabeis.com.br". */
function dominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Teto de buscas por pesquisa. Usado nos dois lugares que precisam concordar:
 * o parâmetro `max_uses` da tool e o texto do prompt.
 *
 * Contar isso ao modelo importa. Sem o aviso, ele descobre o limite batendo
 * nele: numa medição com teto de 3 ele tentou 14 buscas, gastou 93 mil tokens
 * brigando com a parede e terminou pedindo desculpas em vez de resumir as 23
 * fontes que já tinha em mãos.
 */
const MAX_BUSCAS = 6;

const SISTEMA = `Você é um pesquisador de conteúdo para redes sociais, brasileiro, e escreve sempre em português do Brasil.

Sua tarefa é descobrir o que está em alta AGORA no nicho informado e resumir de um jeito prático para quem vai criar conteúdo.

Regras:
- Use a busca na web para achar informação recente. Não invente dados, números ou notícias.
- Priorize fontes brasileiras e conteúdo dos últimos meses.
- Escreva o resumo em tópicos curtos, direto ao ponto, sem enrolação e sem jargão de marketing.
- Foque no que gera conteúdo: dores do público, dúvidas comuns, formatos que estão funcionando, temas em alta, erros que as pessoas cometem.
- No máximo 400 palavras.

ORÇAMENTO DE BUSCAS — você tem no máximo ${MAX_BUSCAS} buscas nesta tarefa.
- Cada busca deve trazer um ângulo diferente. Não repita uma consulta que você já fez.
- Ao usar a última, escreva o resumo com o que encontrou até ali. Material parcial
  ainda é material: organize o que tem.
- Não peça desculpas pelo limite, não comente sobre a ferramenta e não sugira que a
  pessoa pesquise por conta própria. O resumo É a entrega.`;

/**
 * Pesquisa o nicho (ou um tema específico dentro dele) usando a busca na web
 * nativa da Claude API. É o que alimenta a geração de temas e de conteúdo.
 */
export async function pesquisar(params: {
  nicho: string;
  /** Tema digitado pelo usuário. Sem isso, faz a pesquisa geral do nicho. */
  termo?: string | null;
  /** Recebe o andamento em tempo real. Opcional — sem ele nada muda. */
  aoProgredir?: AoProgredir;
}): Promise<ResultadoPesquisa> {
  if (modoDemonstracao()) return pesquisaSimulada(params.nicho, params.termo);

  const prompt = params.termo
    ? `Nicho de atuação: "${params.nicho}".\n\nPesquise especificamente sobre: "${params.termo}".\n\nTraga o que está sendo falado sobre esse tema, dados ou fatos recentes que dão credibilidade, e os ângulos mais interessantes para criar conteúdo.`
    : `Nicho de atuação: "${params.nicho}".\n\nPesquise o que está em alta nesse nicho e traga os assuntos com mais potencial de engajamento agora.`;

  const mensagens: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  let resposta: Anthropic.Message | null = null;
  let buscasFeitas = 0;
  const urlsVistas = new Set<string>(); // só para o aviso de progresso
  const fontesAchadas: Fonte[] = []; // o que de fato vai ser gravado
  const urlsDeFontes = new Set<string>();
  let avisouEscrevendo = false;

  // A busca roda no servidor da Anthropic em ciclos. Quando ela atinge o limite de
  // um ciclo, a resposta volta com "pause_turn" e a gente reenvia para continuar.
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    // Streaming em vez de create(): é o que permite avisar a tela a cada busca,
    // em vez de deixar o usuário três minutos olhando para um passo congelado.
    // De quebra, manter a conexão viva ajuda contra o teto de duração da Vercel.
    const fluxo = ia().messages.stream({
      model: MODELO,
      max_tokens: 8000,
      system: SISTEMA,
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: MAX_BUSCAS },
      ],
      messages: mensagens,
    });

    if (params.aoProgredir) {
      fluxo.on("contentBlock", (bloco) => {
        if (bloco.type === "server_tool_use" && bloco.name === "web_search") {
          const consulta = (bloco.input as { query?: string })?.query;
          buscasFeitas += 1;
          params.aoProgredir!({
            tipo: "buscando",
            consulta: consulta ?? "",
            numero: buscasFeitas,
          });
          return;
        }

        if (bloco.type === "web_search_tool_result" && Array.isArray(bloco.content)) {
          const novos: string[] = [];
          for (const item of bloco.content) {
            if (item.type !== "web_search_result" || urlsVistas.has(item.url)) continue;
            urlsVistas.add(item.url);
            novos.push(dominio(item.url));
          }
          if (novos.length > 0) {
            params.aoProgredir!({
              tipo: "leu",
              dominios: [...new Set(novos)],
              totalFontes: urlsVistas.size,
            });
          }
          return;
        }

        // Bloco de texto depois das buscas = o resumo começou a ser escrito.
        // O resumo vem quebrado em vários blocos (foram 7 numa medição), então
        // avisa só na primeira vez — senão a tela pisca a mesma mensagem seguidas vezes.
        if (bloco.type === "text" && buscasFeitas > 0 && !avisouEscrevendo) {
          avisouEscrevendo = true;
          params.aoProgredir!({ tipo: "escrevendo" });
        }
      });
    }

    resposta = await fluxo.finalMessage();

    // As fontes de cada volta ficam só na resposta daquela volta. Acumular aqui
    // porque, quando a pesquisa pausa e continua, ler apenas a última resposta
    // descartaria em silêncio tudo que foi encontrado antes.
    acumularFontes(resposta.content, fontesAchadas, urlsDeFontes);

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

  return { resumo, fontes: fontesAchadas.slice(0, 12) };
}

/** Junta os links que a busca usou nesta volta, sem repetir os já vistos. */
function acumularFontes(
  conteudo: Anthropic.ContentBlock[],
  fontes: Fonte[],
  vistas: Set<string>,
): void {
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
}
