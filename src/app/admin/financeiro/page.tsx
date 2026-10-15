import type { Metadata } from "next";
import { CabecalhoAdmin, EmConstrucao } from "../componentes";
import { exigirAdmin } from "@/lib/admin/sessao";

export const metadata: Metadata = { title: "Financeiro" };

export default async function PaginaFinanceiro() {
  await exigirAdmin();
  return (
    <>
      <CabecalhoAdmin
        titulo="Financeiro"
        descricao="Receita confirmada, custo estimado de IA e margem."
      />
      <EmConstrucao
        oQueVem="Indicadores, MRR por plano, transações e exportação CSV. A receita vem só de webhook do Asaas confirmado, nunca do front."
        etapa="passos 6 e 9"
      />
    </>
  );
}
