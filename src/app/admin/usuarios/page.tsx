import type { Metadata } from "next";
import { CabecalhoAdmin, EmConstrucao } from "../componentes";
import { exigirAdmin } from "@/lib/admin/sessao";

export const metadata: Metadata = { title: "Usuários" };

export default async function PaginaUsuarios() {
  await exigirAdmin();
  return (
    <>
      <CabecalhoAdmin
        titulo="Usuários"
        descricao="Quem usa a plataforma, em qual plano e com quanto de saldo."
      />
      <EmConstrucao
        oQueVem="Lista com busca e filtros, criar usuário e alterar plano, com as regras de upgrade e downgrade."
        etapa="passo 7"
      />
    </>
  );
}
