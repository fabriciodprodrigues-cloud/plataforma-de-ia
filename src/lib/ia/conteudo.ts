import type { Arquetipo, GatilhoMental, Plataforma } from "@/generated/prisma/enums";
import { ARQUETIPOS, GATILHOS } from "@/lib/arquetipos";
import { PLATAFORMAS, rotuloDuracao } from "@/lib/constants";
import { modoDemonstracao } from "@/lib/env";
import { listaDeTextos, objeto, pedirJson, texto } from "./json";
import { conteudoSimulado } from "./simulado";

export type ConteudoGerado = {
  /** Legenda do post ou roteiro do vídeo, pronto para editar. */
  conteudo: string;
  seo: {
    titulo: string;
    descricao: string;
    tags: string[];
  };
  /** Frase curta que vai estampada na arte (não é o mesmo que o título do SEO). */
  textoArte: string;
  /** Palavras-chave para buscar a foto de fundo no banco de imagens. */
  buscaFoto: string;
  /** O que de fato guiou este texto — vai gravado no roteiro e vira o selo. */
  arquetipoUsado: Arquetipo | null;
  gatilhoUsado: GatilhoMental | null;
};

const SISTEMA = `Você escreve conteúdo para redes sociais em português do Brasil.

Tom de voz: direto, humano e acessível. Escreve como uma pessoa falando com outra, não como uma empresa.

Regras que valem sempre:
- Nada de jargão corporativo ("solução robusta", "alavancar", "sinergia") nem de marketing ("engajamento", "conversão").
- Nada de emoji em excesso: no máximo dois, e só se combinarem com a marca.
- Não invente números, estudos ou fatos. Se a pesquisa não trouxer um dado, escreva sem ele.
- Não escreva "como IA" nem comente sobre o próprio processo. Entregue só o conteúdo.
- Nunca copie texto da pesquisa literalmente; escreva com suas palavras.

USO ÉTICO DOS GATILHOS MENTAIS — esta regra não tem exceção:
O gatilho serve para destacar um valor que existe de verdade no conteúdo, nunca para
fabricar pressão. Está proibido:
- inventar urgência ("últimas vagas", "só até hoje") quando não há prazo real;
- inventar escassez ("restam poucos", "vaga limitada") quando não há limite real;
- prometer resultado garantido, ou sugerir que quem não agir vai ficar para trás;
- inventar número, depoimento ou credencial para dar peso ao argumento.
Se o tema não sustentar o gatilho honestamente, escreva sem ele. Um texto morno e
verdadeiro é melhor que um texto persuasivo e falso.`;

const SCHEMA = objeto(
  {
    conteudo: texto("O conteúdo completo, pronto para publicar"),
    seoTitulo: texto("Título otimizado para a plataforma"),
    seoDescricao: texto("Descrição/resumo para a plataforma"),
    seoTags: listaDeTextos("Hashtags ou tags, sem o símbolo # no começo"),
    textoArte: texto("Frase curta e impactante para estampar na arte, até 60 caracteres"),
    buscaFoto: texto(
      "Duas ou três palavras EM INGLÊS para buscar uma foto de fundo que combine com o tema",
    ),
  },
  ["conteudo", "seoTitulo", "seoDescricao", "seoTags", "textoArte", "buscaFoto"],
);

/**
 * Quantas palavras cabem na duração escolhida.
 * É isso que faz o roteiro crescer ou encolher junto com o seletor de duração:
 * TikTok tem fala mais acelerada que YouTube, por isso a taxa muda.
 */
function palavrasParaDuracao(plataforma: Plataforma, segundos: number): number {
  const palavrasPorMinuto = plataforma === "TIKTOK" ? 175 : 140;
  return Math.round((segundos / 60) * palavrasPorMinuto);
}

/** Quantos pontos de desenvolvimento o roteiro deve ter, proporcional à duração. */
function pontosParaDuracao(segundos: number): number {
  if (segundos <= 20) return 1;
  if (segundos <= 45) return 2;
  if (segundos <= 90) return 3;
  if (segundos <= 200) return 4;
  if (segundos <= 330) return 5;
  return 7;
}

/**
 * Bloco que traduz o arquétipo do usuário em instrução de escrita.
 *
 * Repare que passamos UM gatilho só. A tentação é listar os oito e deixar o
 * modelo escolher, mas o resultado disso é um texto que tenta usar todos ao
 * mesmo tempo e soa artificial — que é exatamente o que a personalização
 * deveria evitar.
 *
 * As frases de exemplo importam mais que a descrição do tom: pedir "seja
 * ousado" produz um texto bem mais genérico do que mostrar uma frase ousada.
 */
function blocoPersonalidade(
  arquetipo: Arquetipo | null | undefined,
  gatilhoEscolhido: GatilhoMental | null | undefined,
): string {
  if (!arquetipo) return "";

  const info = ARQUETIPOS[arquetipo];
  const gatilho = GATILHOS[gatilhoEscolhido ?? info.gatilho];

  return `
COMO ESTA MARCA FALA (arquétipo ${info.nome})
Tom de voz: ${info.tom}.

Gancho de abertura: use o gatilho mental "${gatilho.rotulo}" — ${gatilho.comoUsar}.
Use esse gatilho e só ele. Não tente encaixar outros gatilhos no mesmo texto.
Exemplo do jeito de abrir (não copie, é só o tom):
"${info.aberturaExemplo}"

CTA de fechamento: ${info.estiloCta}, no mesmo gatilho da abertura.
Exemplo do jeito de fechar (não copie, é só o tom):
"${info.ctaExemplo}"

O tom acima vale para o texto inteiro, não só para a abertura e o fecho.
`;
}

function briefingPorPlataforma(params: {
  plataforma: Plataforma;
  duracaoSegundos: number | null;
}): string {
  const { plataforma, duracaoSegundos } = params;

  switch (plataforma) {
    case "INSTAGRAM":
      return `Formato: legenda de publicação no Instagram.

Estrutura obrigatória, nesta ordem e separada por linhas em branco:
1. GANCHO — a primeira linha precisa fazer a pessoa parar de rolar. Máximo 12 palavras.
2. CORPO — 3 a 5 parágrafos curtos (2 a 3 linhas cada). Pode usar bullets com "•".
3. CTA — um convite claro para comentar, salvar ou mandar mensagem.

Tamanho total: entre 120 e 200 palavras.
NÃO inclua as hashtags dentro do conteúdo — elas vão separadas em seoTags.
NÃO escreva rótulos como "Gancho:" ou "CTA:" no texto final.

SEO desta plataforma:
- seoTitulo: uma frase de até 60 caracteres, que serve de chamada do post.
- seoDescricao: resumo de uma ou duas frases do que a publicação entrega.
- seoTags: 12 a 18 hashtags misturando alcance amplo e nicho específico, sem o "#".`;

    case "LINKEDIN":
      return `Formato: publicação no LinkedIn.

Estrutura obrigatória, nesta ordem e separada por linhas em branco:
1. GANCHO — uma afirmação ou pergunta que faça um profissional parar. Máximo 15 palavras.
2. CORPO — 4 a 6 parágrafos curtos. Pode contar uma situação real e tirar um aprendizado dela.
3. CTA — uma pergunta aberta convidando a comentar.

Tamanho total: entre 180 e 280 palavras.
Tom um pouco mais profissional que no Instagram, mas ainda humano — sem discurso de palestrante.
NÃO escreva rótulos como "Gancho:" ou "CTA:" no texto final.

SEO desta plataforma:
- seoTitulo: a primeira linha do post (o gancho), até 70 caracteres.
- seoDescricao: resumo de uma ou duas frases.
- seoTags: 3 a 5 hashtags profissionais, sem o "#". No LinkedIn menos é mais.`;

    case "YOUTUBE": {
      const segundos = duracaoSegundos ?? 180;
      const palavras = palavrasParaDuracao("YOUTUBE", segundos);
      const pontos = pontosParaDuracao(segundos);
      return `Formato: roteiro de vídeo para YouTube, com duração-alvo de ${rotuloDuracao("YOUTUBE", segundos) ?? `${segundos}s`}.

Estrutura obrigatória, com estes títulos em maiúsculas como separadores:

GANCHO (0-15s)
O que falar nos primeiros segundos para a pessoa não sair do vídeo.

DESENVOLVIMENTO
Exatamente ${pontos} blocos numerados. Cada bloco começa com um subtítulo curto do assunto e depois o texto a ser falado.

CTA
O fechamento: o que pedir para o espectador fazer.

REGRA DE TAMANHO — esta é a mais importante:
O roteiro inteiro deve ter aproximadamente ${palavras} palavras (aceitável entre ${Math.round(palavras * 0.85)} e ${Math.round(palavras * 1.15)}).
Esse número existe porque o vídeo tem ${rotuloDuracao("YOUTUBE", segundos) ?? `${segundos}s`} de duração. Escreva o texto falado, não instruções de câmera.

SEO desta plataforma:
- seoTitulo: título otimizado para busca no YouTube, até 60 caracteres, com a palavra-chave principal no começo.
- seoDescricao: descrição de 2 a 3 parágrafos curtos, com a palavra-chave nas primeiras linhas.
- seoTags: 10 a 15 tags de busca (palavras e expressões, não hashtags), sem o "#".`;
    }

    case "TIKTOK": {
      const segundos = duracaoSegundos ?? 30;
      const palavras = palavrasParaDuracao("TIKTOK", segundos);
      const pontos = pontosParaDuracao(segundos);
      return `Formato: roteiro de vídeo curto para TikTok, com duração-alvo de ${rotuloDuracao("TIKTOK", segundos) ?? `${segundos}s`}.

Estrutura obrigatória, com estes títulos em maiúsculas como separadores:

GANCHO (0-3s)
Uma frase. Precisa ser forte o bastante para segurar nos primeiros 3 segundos.

DESENVOLVIMENTO
Exatamente ${pontos} ${pontos === 1 ? "bloco" : "blocos"} de fala, direto ao ponto, sem introdução.

CTA
Uma frase curta de fechamento.

REGRA DE TAMANHO — esta é a mais importante:
O roteiro inteiro deve ter aproximadamente ${palavras} palavras (aceitável entre ${Math.round(palavras * 0.85)} e ${Math.round(palavras * 1.15)}).
Esse número existe porque o vídeo tem ${rotuloDuracao("TIKTOK", segundos) ?? `${segundos}s`}. Ritmo acelerado, frases curtas, zero enrolação.

SEO desta plataforma:
- seoTitulo: a legenda do vídeo, até 80 caracteres, curta e chamativa.
- seoDescricao: uma frase resumindo o vídeo.
- seoTags: 5 a 8 hashtags curtas e populares no TikTok, sem o "#".`;
    }
  }
}

export async function gerarConteudoPlataforma(params: {
  plataforma: Plataforma;
  duracaoSegundos: number | null;
  tema: string;
  justificativa?: string | null;
  pesquisa: string;
  nicho: string;
  nomeMarca: string;
  /** Nulo para as contas criadas antes do quiz existir. */
  arquetipo?: Arquetipo | null;
  /** Sobrescreve o gatilho natural do arquétipo, quando o usuário trocar. */
  gatilho?: GatilhoMental | null;
}): Promise<ConteudoGerado> {
  // O gatilho que de fato foi usado volta junto com o texto para o selo mostrar
  // a verdade, mesmo que o usuário troque de arquétipo depois.
  const gatilhoUsado = params.arquetipo
    ? (params.gatilho ?? ARQUETIPOS[params.arquetipo].gatilho)
    : null;

  if (modoDemonstracao()) {
    return conteudoSimulado({
      plataforma: params.plataforma,
      duracaoSegundos: params.duracaoSegundos,
      tema: params.tema,
      nicho: params.nicho,
      nomeMarca: params.nomeMarca,
      arquetipo: params.arquetipo ?? null,
    });
  }

  const meta = PLATAFORMAS[params.plataforma];

  // Roteiros longos precisam de mais espaço de resposta que uma legenda de post.
  const maxTokens =
    params.duracaoSegundos && params.duracaoSegundos >= 300 ? 14000 : 8000;

  const resultado = await pedirJson<{
    conteudo: string;
    seoTitulo: string;
    seoDescricao: string;
    seoTags: string[];
    textoArte: string;
    buscaFoto: string;
  }>({
    sistema: SISTEMA,
    prompt: `Marca: ${params.nomeMarca}
Nicho: ${params.nicho}
Plataforma: ${meta.nome}
Tema do conteúdo: ${params.tema}${params.justificativa ? `\nÂngulo: ${params.justificativa}` : ""}

Pesquisa recente que deve embasar o conteúdo:
"""
${params.pesquisa}
"""
${blocoPersonalidade(params.arquetipo, params.gatilho)}
${briefingPorPlataforma(params)}`,
    schema: SCHEMA,
    maxTokens,
    esforco: "medium",
  });

  return {
    conteudo: (resultado.conteudo ?? "").trim(),
    seo: {
      titulo: (resultado.seoTitulo ?? params.tema).trim(),
      descricao: (resultado.seoDescricao ?? "").trim(),
      tags: normalizarTags(resultado.seoTags),
    },
    textoArte: (resultado.textoArte ?? params.tema).trim(),
    buscaFoto: (resultado.buscaFoto ?? params.nicho).trim(),
    arquetipoUsado: params.arquetipo ?? null,
    gatilhoUsado,
  };
}

/** Tira "#", espaços e duplicatas — a interface é quem decide como exibir. */
function normalizarTags(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  const vistas = new Set<string>();
  const saida: string[] = [];
  for (const bruta of tags) {
    const limpa = String(bruta ?? "")
      .replace(/^#+/, "")
      .trim();
    if (!limpa) continue;
    const chave = limpa.toLowerCase();
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    saida.push(limpa);
  }
  return saida.slice(0, 20);
}
