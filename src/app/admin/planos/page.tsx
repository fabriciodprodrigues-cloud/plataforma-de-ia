import type { Metadata } from "next";
import { CabecalhoAdmin, EmConstrucao } from "../componentes";
import { exigirAdmin } from "@/lib/admin/sessao";

export const metadata: Metadata = { title: "Planos" };

export default async function PaginaPlanos() {
  await exigirAdmin();
  return (
    <>
      <CabecalhoAdmin
        titulo="Planos"
        descricao="Catálogo comercial. O que estiver ativo aqui aparece na landing."
      />
      <EmConstrucao
        oQueVem="Criar, editar e arquivar planos e pacotes avulsos, com prévia de custo máximo e margem."
        etapa="passo 5"
      />
    </>
  );
}
