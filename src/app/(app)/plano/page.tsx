import type { Metadata } from "next";
import { Check, Minus, Plus } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obterConta, saldoTotal, temRecurso } from "@/lib/servicos/creditos";
import {
  formatarPreco,
  listarPacotesAtivos,
  listarPlanosAtivos,
  mostrarPrecosNaLanding,
  rotuloPlataformas,
} from "@/lib/servicos/catalogo";
import type { Recurso } from "@/lib/planos";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Plano e créditos" };

const LINHAS_COMPARACAO: { rotulo: string; recurso?: Recurso }[] = [
  { rotulo: "Roteiro, legenda e SEO" },
  { rotulo: "Geração de arte" },
  { rotulo: "Teleprompter", recurso: "teleprompter" },
  { rotulo: "Banco de imagens", recurso: "bancoImagens" },
  { rotulo: "Editor de vídeo com IA", recurso: "video" },
];

export default async function PaginaPlano() {
  const usuario = await exigirUsuario();

  const [conta, planos, pacotes, mostrarPrecos] = await Promise.all([
    obterConta(usuario.id),
    listarPlanosAtivos(),
    listarPacotesAtivos(),
    // A mesma chave que controla a landing vale aqui. Mostrar preço nesta tela
    // com a landing escondendo seria o usuário descobrir o valor por um
    // caminho e não pelo outro.
    mostrarPrecosNaLanding(),
  ]);

  const extrato = await prisma.creditTransaction.findMany({
    where: { userId: usuario.id },
    orderBy: { criadoEm: "desc" },
    take: 20,
  });

  const plano = conta.plano;
  const disponivel = saldoTotal(conta);
  // Só o saldo do plano entra na barra: o avulso não tem "cota cheia" para
  // servir de denominador, então misturar os dois daria uma barra passando de
  // 100% sem explicação nenhuma.
  const usados = Math.max(plano.creditosMensais - conta.saldoPlano, 0);
  const fracao =
    plano.creditosMensais > 0 ? Math.min(usados / plano.creditosMensais, 1) : 0;

  // Planos arquivados somem da vitrine, mas se for o plano de quem está vendo,
  // ele precisa continuar aparecendo — senão a pessoa não vê o próprio plano.
  const vitrine = planos.some((p) => p.id === plano.id) ? planos : [plano, ...planos];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Plano e créditos</h1>
      <p className="mt-1 text-tinta-500">
        Cada roteiro, tema ou pesquisa nova consome um crédito.
      </p>

      {/* Saldo */}
      <section className="cartao mt-6 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-sm text-tinta-400">
              Plano {plano.nome}
              {conta.cortesia && " · cortesia"}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {disponivel}{" "}
              <span className="text-base font-normal text-tinta-400">
                {disponivel === 1 ? "crédito" : "créditos"}
              </span>
            </p>
          </div>
          <p className="text-sm text-tinta-500">
            Renova em{" "}
            <time dateTime={conta.proximoReset.toISOString()}>
              {conta.proximoReset.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
              })}
            </time>
          </p>
        </div>

        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"
          role="img"
          aria-label={`${usados} de ${plano.creditosMensais} créditos do plano usados`}
        >
          <div
            className="h-full rounded-full bg-marca-500 transition-[width]"
            style={{ width: `${fracao * 100}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-tinta-400">
          {usados} de {plano.creditosMensais} do plano usados neste ciclo
          {conta.saldoAvulso > 0 && ` · ${conta.saldoAvulso} avulsos (não expiram)`}
          {plano.minutosVideoMensais > 0 && ` · ${conta.minutosVideo} min de vídeo`}
        </p>
      </section>

      {/* Comparação de planos */}
      <h2 className="mt-10 text-lg font-semibold">Planos</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {vitrine.map((p) => {
          const atual = p.id === plano.id;
          return (
            <div
              key={p.id}
              className={cn(
                "rounded-2xl border p-4",
                atual ? "border-marca-500 bg-marca-50" : "border-linha bg-cartao",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{p.nome}</p>
                {atual && (
                  <span className="rounded-full bg-marca-500 px-2 py-0.5 text-xs font-medium text-white">
                    Atual
                  </span>
                )}
              </div>
              {mostrarPrecos && (
                <p className="mt-1 text-xl font-semibold tracking-tight">
                  {formatarPreco(p.precoCentavos)}
                  <span className="text-sm font-normal text-tinta-400">/mês</span>
                </p>
              )}
              <p className="mt-1 text-sm text-tinta-500">{p.descricao}</p>
              <p className="mt-3 text-sm font-medium">
                {p.creditosMensais} créditos
                {p.minutosVideoMensais > 0 &&
                  ` + ${p.minutosVideoMensais} min de vídeo`}
              </p>
              <ul className="mt-3 space-y-1.5">
                {LINHAS_COMPARACAO.map((linha) => {
                  const incluso = linha.recurso ? temRecurso(p, linha.recurso) : true;
                  return (
                    <li
                      key={linha.rotulo}
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        incluso ? "text-tinta-700" : "text-tinta-400",
                      )}
                    >
                      {incluso ? (
                        <Check
                          className="size-4 shrink-0 text-emerald-400"
                          aria-hidden
                        />
                      ) : (
                        <Minus className="size-4 shrink-0" aria-hidden />
                      )}
                      {linha.rotulo}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-tinta-400">
                {rotuloPlataformas(p.maxPlataformas)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Pacotes avulsos */}
      {pacotes.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">Créditos avulsos</h2>
          <p className="mt-1 text-sm text-tinta-500">
            Para quando o saldo acaba antes de virar o mês. Não expiram.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {pacotes.map((pacote) => (
              <div
                key={pacote.id}
                className="rounded-2xl border border-linha bg-cartao p-4"
              >
                <p className="text-sm font-medium text-tinta-500">{pacote.nome}</p>
                <p className="mt-1 flex items-center gap-1 text-lg font-semibold">
                  <Plus className="size-4 text-marca-700" aria-hidden />
                  {pacote.quantidade}
                  <span className="text-sm font-normal text-tinta-400">
                    {pacote.tipo === "credito" ? "créditos" : "min"}
                  </span>
                </p>
                {mostrarPrecos && (
                  <p className="mt-1 text-sm text-tinta-400">
                    {formatarPreco(pacote.precoCentavos)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Nenhum botão de compra: ainda não existe meio de pagamento ligado, e um
          botão que não cobra nada é pior que botão nenhum. */}
      <p className="mt-4 rounded-xl border border-linha bg-cartao p-4 text-sm text-tinta-500">
        A cobrança ainda não está ligada. Enquanto isso a troca de plano é feita
        por nós, a pedido.
      </p>

      {/* Extrato */}
      <h2 className="mt-10 text-lg font-semibold">Últimos consumos</h2>
      {extrato.length === 0 ? (
        <p className="mt-2 text-sm text-tinta-400">
          Nada consumido ainda. Seus créditos aparecem aqui conforme você gera
          conteúdo.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-linha overflow-hidden rounded-2xl border border-linha bg-cartao">
          {extrato.map((linha) => (
            <li
              key={linha.id}
              className="flex items-center justify-between gap-3 p-3.5 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-tinta-700">{linha.motivo}</p>
                <p className="text-xs text-tinta-400">
                  {linha.criadoEm.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {linha.origemAvulso && " · avulso"}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 font-medium tabular-nums",
                  linha.quantidade < 0 ? "text-tinta-500" : "text-emerald-400",
                )}
              >
                {linha.quantidade > 0 ? `+${linha.quantidade}` : linha.quantidade}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
