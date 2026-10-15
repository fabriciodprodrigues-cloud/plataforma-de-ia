import type { Metadata } from "next";
import { CabecalhoAdmin, EmConstrucao, Kpi } from "./componentes";
import { StatusAssinatura } from "@/generated/prisma/enums";
import { exigirAdmin } from "@/lib/admin/sessao";
import { prisma } from "@/lib/prisma";
import { formatarPreco } from "@/lib/servicos/catalogo";

export const metadata: Metadata = { title: "Visão geral" };

export default async function PaginaVisaoGeral() {
  await exigirAdmin();

  const trintaDiasAtras = new Date(Date.now() - 30 * 86_400_000);

  // Só o que sai de uma consulta simples. Os gráficos e as listas de maior
  // consumo vêm no passo 8 — preferi números certos e poucos a uma tela cheia
  // de valores que eu ainda não conferi contra o banco.
  const [total, novos, assinaturas] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { criadoEm: { gte: trintaDiasAtras } } }),
    prisma.subscription.findMany({
      where: { status: StatusAssinatura.ATIVA },
      select: { cortesia: true, plan: { select: { precoCentavos: true } } },
    }),
  ]);

  // Cortesia é acesso dado, não receita: fica fora do MRR de propósito.
  const pagantes = assinaturas.filter((a) => !a.cortesia);
  const mrrCentavos = pagantes.reduce((soma, a) => soma + a.plan.precoCentavos, 0);
  const cortesias = assinaturas.length - pagantes.length;

  return (
    <>
      <CabecalhoAdmin
        titulo="Visão geral"
        descricao="O estado da plataforma agora."
      />

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi
          rotulo="Usuários"
          valor={String(total)}
          nota={`${novos} ${novos === 1 ? "novo" : "novos"} nos últimos 30 dias`}
        />
        <Kpi
          rotulo="Assinaturas ativas"
          valor={String(assinaturas.length)}
          nota={
            cortesias > 0
              ? `${cortesias} ${cortesias === 1 ? "cortesia" : "cortesias"}, fora do MRR`
              : "nenhuma cortesia"
          }
          tom="bom"
        />
        <Kpi
          rotulo="MRR"
          valor={formatarPreco(mrrCentavos)}
          nota="soma dos planos ativos, sem cortesias"
        />
      </div>

      <div className="mt-6">
        <EmConstrucao
          oQueVem="Créditos usados por dia, usuários por plano, últimos cadastros e os cinco maiores consumos do ciclo."
          etapa="passo 8"
        />
      </div>
    </>
  );
}
