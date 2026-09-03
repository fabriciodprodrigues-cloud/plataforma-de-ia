import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Ping diário para o projeto do Supabase não hibernar.
 *
 * O plano gratuito pausa projetos ociosos, e quando isso acontece some tudo de
 * uma vez: o banco, o Auth e até os registros de DNS do projeto. A tela de
 * cadastro passa a dizer "verifique sua internet", que é a pior mensagem
 * possível para um problema que não é do usuário.
 *
 * Uma consulta trivial por dia conta como atividade. Serve também de alarme:
 * se este endpoint começar a falhar, dá para saber antes do primeiro usuário.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(pedido: Request) {
  // Proteção opcional: se CRON_SECRET existir no ambiente, passa a ser exigida.
  // Sem a variável o endpoint fica aberto — o que ele faz é uma leitura trivial
  // sem dado nenhum de volta, então o risco é baixo e evita configuração extra
  // para algo que precisa funcionar desde o primeiro deploy.
  const segredo = process.env.CRON_SECRET;
  if (segredo && pedido.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const inicio = Date.now();
  try {
    // `SELECT 1` é o suficiente: o objetivo é tocar no banco, não ler nada.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, ms: Date.now() - inicio });
  } catch (erro) {
    console.error("[manter-vivo] banco inalcançável:", erro);
    return NextResponse.json(
      {
        ok: false,
        ms: Date.now() - inicio,
        erro: erro instanceof Error ? erro.message.split("\n")[0] : String(erro),
      },
      { status: 503 },
    );
  }
}
