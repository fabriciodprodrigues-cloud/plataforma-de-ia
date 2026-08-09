import { StatusIdeia } from "@/generated/prisma/enums";
import { exigirUsuario } from "@/lib/auth";
import { traduzirErroIA } from "@/lib/ia/cliente";
import type { EventoPesquisa } from "@/lib/ia/pesquisa";
import { gerarTemas } from "@/lib/ia/temas";
import { prisma } from "@/lib/prisma";
import { obterPesquisaDoNicho } from "@/lib/servicos/nicho";

/**
 * Preparação do painel transmitindo o andamento, em vez de uma espera muda.
 *
 * Isto existe como rota, e não como server action, porque server action devolve
 * um valor só no fim — e o fim, aqui, demora perto de três minutos. Manter a
 * resposta aberta enviando linhas também ajuda contra o teto de duração da
 * Vercel, já que a conexão nunca fica ociosa.
 *
 * Formato: NDJSON — um objeto por linha. Simples de gerar e de ler no navegador
 * sem depender de biblioteca de SSE.
 */

export const dynamic = "force-dynamic";
// Teto do plano Hobby com fluid compute. A pesquisa medida levou 191s.
export const maxDuration = 300;

type EventoSaida =
  | EventoPesquisa
  | { tipo: "comecou"; nicho: string }
  | { tipo: "temas" }
  | { tipo: "pronto"; temas: number }
  | { tipo: "erro"; mensagem: string };

export async function POST() {
  const codificador = new TextEncoder();

  const fluxo = new ReadableStream({
    async start(controlador) {
      let fechado = false;
      const enviar = (evento: EventoSaida) => {
        if (fechado) return;
        controlador.enqueue(codificador.encode(JSON.stringify(evento) + "\n"));
      };

      try {
        const usuario = await exigirUsuario();
        const nicho = usuario.niches[0];
        if (!nicho) {
          enviar({
            tipo: "erro",
            mensagem: "Seu nicho ainda não foi configurado. Refaça o cadastro inicial.",
          });
          return;
        }

        enviar({ tipo: "comecou", nicho: nicho.nome });

        const pesquisa = await obterPesquisaDoNicho({
          nicheId: nicho.id,
          nomeNicho: nicho.nome,
          aoProgredir: enviar,
        });

        const jaTem = await prisma.contentIdea.count({
          where: { nicheId: nicho.id, status: { not: StatusIdeia.DESCARTADO } },
        });

        if (jaTem > 0) {
          enviar({ tipo: "pronto", temas: jaTem });
          return;
        }

        enviar({ tipo: "temas" });

        const temas = await gerarTemas({
          nicho: nicho.nome,
          nomeMarca: usuario.brandKit?.nomeMarca ?? nicho.nome,
          pesquisa,
        });

        if (temas.length === 0) {
          enviar({
            tipo: "erro",
            mensagem: "Não conseguimos montar temas dessa vez. Tente atualizar a pesquisa.",
          });
          return;
        }

        await prisma.contentIdea.createMany({
          data: temas.map((t) => ({
            nicheId: nicho.id,
            titulo: t.titulo,
            justificativa: t.justificativa,
            status: StatusIdeia.SUGERIDO,
          })),
        });

        enviar({ tipo: "pronto", temas: temas.length });
      } catch (erro) {
        console.error("[preparar]", erro);
        enviar({ tipo: "erro", mensagem: traduzirErroIA(erro) });
      } finally {
        fechado = true;
        controlador.close();
      }
    },
  });

  return new Response(fluxo, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      // Impede buffering em proxies — sem isso as linhas chegariam todas juntas
      // no final, que é exatamente o problema que estamos resolvendo.
      "x-accel-buffering": "no",
    },
  });
}
