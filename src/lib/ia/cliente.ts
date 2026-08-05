import Anthropic from "@anthropic-ai/sdk";
import { anthropicApiKey } from "@/lib/env";

/**
 * Modelo usado em toda a plataforma. Trocar aqui muda em todo lugar.
 * O Sonnet 5 não aceita os parâmetros `temperature`/`top_p` — o jeito de ajustar
 * o comportamento é pelo texto das instruções mesmo.
 */
export const MODELO = "claude-sonnet-5";

let cliente: Anthropic | null = null;

export function ia() {
  if (!cliente) cliente = new Anthropic({ apiKey: anthropicApiKey() });
  return cliente;
}

/** Erro nosso, com mensagem já pronta para aparecer na tela do usuário. */
export class ErroIA extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroIA";
  }
}

/**
 * Converte qualquer falha da API em uma frase que o usuário entenda.
 * Nada de "429 rate_limit_error" na interface.
 */
export function traduzirErroIA(erro: unknown): string {
  if (erro instanceof ErroIA) return erro.message;

  if (erro instanceof Error && erro.message.includes(".env")) {
    return erro.message;
  }

  if (erro instanceof Anthropic.AuthenticationError) {
    return "A chave da IA parece inválida. Confira o ANTHROPIC_API_KEY no arquivo .env.";
  }
  if (erro instanceof Anthropic.PermissionDeniedError) {
    return "Sua conta da IA não tem permissão para essa operação. Verifique o plano em console.anthropic.com.";
  }
  if (erro instanceof Anthropic.RateLimitError) {
    return "A IA recebeu pedidos demais de uma vez. Espere um minutinho e tente de novo.";
  }
  if (erro instanceof Anthropic.APIConnectionError) {
    return "Não conseguimos falar com a IA. Verifique sua conexão com a internet e tente de novo.";
  }
  if (erro instanceof Anthropic.APIError) {
    // 529 = serviço sobrecarregado, 500 = erro interno.
    if (erro.status && erro.status >= 500) {
      return "A IA está sobrecarregada neste momento. Tente de novo em alguns instantes.";
    }
    return "A IA recusou o pedido. Tente reformular o tema com outras palavras.";
  }

  console.error("[ia] erro não mapeado", erro);
  return "Algo deu errado ao falar com a IA. Tente de novo em instantes.";
}

/** Junta todos os blocos de texto da resposta num único string. */
export function textoDaResposta(conteudo: Anthropic.ContentBlock[]): string {
  return conteudo
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/** Interrompe cedo quando a resposta veio truncada ou recusada. */
export function conferirParada(resposta: Anthropic.Message) {
  if (resposta.stop_reason === "refusal") {
    throw new ErroIA(
      "A IA preferiu não responder sobre esse assunto. Tente descrever o tema de outro jeito.",
    );
  }
  if (resposta.stop_reason === "max_tokens") {
    throw new ErroIA(
      "A resposta ficou longa demais e foi cortada. Tente um tema mais específico ou uma duração menor.",
    );
  }
}
