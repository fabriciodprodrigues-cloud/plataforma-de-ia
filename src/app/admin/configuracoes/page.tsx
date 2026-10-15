import type { Metadata } from "next";
import { FormularioConfiguracoes } from "./formulario";
import { CabecalhoAdmin } from "../componentes";
import { exigirAdmin } from "@/lib/admin/sessao";
import { prisma } from "@/lib/prisma";
import { custosUnitarios, mostrarPrecosNaLanding } from "@/lib/servicos/catalogo";

export const metadata: Metadata = { title: "Configurações" };

export default async function PaginaConfiguracoes() {
  await exigirAdmin();

  const [mostrarPrecos, custos, historico] = await Promise.all([
    mostrarPrecosNaLanding(),
    custosUnitarios(),
    prisma.platformSetting.findMany({
      orderBy: { vigenteDesde: "desc" },
      take: 8,
    }),
  ]);

  return (
    <>
      <CabecalhoAdmin
        titulo="Configurações"
        descricao="Preços na vitrine e os custos que alimentam as estimativas."
      />

      <FormularioConfiguracoes
        inicial={{
          mostrarPrecos,
          custoCredito: custos.porCredito,
          custoMinutoVideo: custos.porMinutoVideo,
          infraFixaMensal: custos.infraFixaMensal,
        }}
      />

      <section className="mt-10">
        <h2 className="font-titulo text-base font-semibold">Histórico de vigência</h2>
        <p className="mt-1 text-sm text-tinta-400">
          Cada mudança vira uma linha nova em vez de sobrescrever a anterior. É
          isso que permite recalcular um consumo antigo com o custo que valia
          naquele dia.
        </p>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-linha bg-cartao">
          <table className="w-full min-w-[480px] border-collapse">
            <caption className="sr-only">
              Últimas alterações de configuração, da mais recente para a mais antiga
            </caption>
            <thead>
              <tr>
                <Th>Chave</Th>
                <Th>Valor</Th>
                <Th>Vale a partir de</Th>
              </tr>
            </thead>
            <tbody>
              {historico.map((linha) => (
                <tr key={linha.id} className="hover:bg-white/[0.02]">
                  <td className="border-b border-linha px-4 py-3 font-mono text-[13px] text-tinta-700">
                    {linha.chave}
                  </td>
                  <td className="border-b border-linha px-4 py-3 font-mono text-[13px]">
                    {JSON.stringify(linha.valorJson)}
                  </td>
                  <td className="border-b border-linha px-4 py-3 text-[13px] text-tinta-400">
                    {linha.vigenteDesde.toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="border-b border-linha bg-superficie px-4 py-3 text-left font-mono text-[10.5px] font-medium tracking-[0.08em] text-tinta-400 uppercase"
    >
      {children}
    </th>
  );
}
