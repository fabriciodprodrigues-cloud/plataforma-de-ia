"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Image as IconeImagem, LoaderCircle, Tags } from "lucide-react";
import { gerarConteudos } from "./acoes";
import { SecaoArte } from "./secao-arte";
import { SecaoRoteiro } from "./secao-roteiro";
import { SecaoSeo } from "./secao-seo";
import type { DadosPlataforma, MarcaCliente, Secao } from "./tipos";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { IconePlataforma } from "@/components/icone-plataforma";
import type { Plataforma } from "@/generated/prisma/enums";
import { PLATAFORMAS, rotuloDuracao } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SECOES: { id: Secao; rotulo: string; icone: typeof FileText }[] = [
  { id: "roteiro", rotulo: "Conteúdo", icone: FileText },
  { id: "arte", rotulo: "Arte", icone: IconeImagem },
  { id: "seo", rotulo: "SEO", icone: Tags },
];

export function Estudio({
  ideaId,
  titulo,
  marca,
  plataformasEscolhidas,
  dadosIniciais,
}: {
  ideaId: string;
  titulo: string;
  marca: MarcaCliente;
  plataformasEscolhidas: Plataforma[];
  dadosIniciais: DadosPlataforma[];
}) {
  const router = useRouter();
  const [dados, setDados] = useState(dadosIniciais);
  const [plataformaAtiva, setPlataformaAtiva] = useState<Plataforma>(
    dadosIniciais[0]?.plataforma ?? plataformasEscolhidas[0],
  );
  const [secao, setSecao] = useState<Secao>("roteiro");
  const [erro, setErro] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [gerando, setGerando] = useState(false);
  const jaGerou = useRef(false);

  const faltando = plataformasEscolhidas.filter(
    (p) => !dados.some((d) => d.plataforma === p),
  );

  // O useState só usa o valor inicial na primeira montagem. Quando a geração
  // termina e o servidor manda os dados novos, é preciso sincronizar na mão —
  // senão a tela fica presa no estado vazio até um F5.
  //
  // A comparação é pela lista de plataformas (e não pelo array inteiro), para
  // um salvamento automático não descartar o que o usuário acabou de digitar.
  const assinatura = dadosIniciais.map((d) => d.plataforma).join(",");
  const assinaturaAnterior = useRef(assinatura);
  useEffect(() => {
    if (assinaturaAnterior.current === assinatura) return;
    assinaturaAnterior.current = assinatura;
    setDados(dadosIniciais);
    if (!dadosIniciais.some((d) => d.plataforma === plataformaAtiva)) {
      setPlataformaAtiva(dadosIniciais[0]?.plataforma ?? plataformasEscolhidas[0]);
    }
  }, [assinatura, dadosIniciais, plataformaAtiva, plataformasEscolhidas]);

  // Assim que a tela abre, gera o que ainda não existe. O usuário chega aqui
  // vindo de "Criar conteúdo" — não faz sentido pedir um clique a mais.
  useEffect(() => {
    if (faltando.length === 0 || jaGerou.current) return;
    jaGerou.current = true;
    setGerando(true);
    setErro(null);

    gerarConteudos(ideaId)
      .then((resultado) => {
        if (!resultado.ok) {
          setErro(resultado.erro);
          return;
        }
        setAvisos(resultado.falhas);
        router.refresh();
      })
      .finally(() => setGerando(false));
  }, [faltando.length, ideaId, router]);

  function atualizarPlataforma(plataforma: Plataforma, mudanca: Partial<DadosPlataforma>) {
    setDados((atual) =>
      atual.map((d) => (d.plataforma === plataforma ? { ...d, ...mudanca } : d)),
    );
  }

  function tentarDeNovo() {
    jaGerou.current = false;
    setErro(null);
    setDados((d) => [...d]); // força o efeito a rodar de novo
  }

  const atual = dados.find((d) => d.plataforma === plataformaAtiva) ?? dados[0];

  return (
    <div>
      <Link
        href="/painel"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta-500 transition hover:text-tinta-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Voltar para os temas
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-balance">{titulo}</h1>

      {erro && (
        <div className="mt-5">
          <Alerta tom="erro" titulo="Não conseguimos criar o conteúdo">
            {erro}
          </Alerta>
          <div className="mt-3">
            <Botao onClick={tentarDeNovo}>Tentar de novo</Botao>
          </div>
        </div>
      )}

      {avisos.length > 0 && (
        <div className="mt-5">
          <Alerta tom="info" titulo="Algumas redes não deram certo">
            <ul className="list-inside list-disc">
              {avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </Alerta>
        </div>
      )}

      {gerando && dados.length === 0 && (
        <div className="py-16 text-center" role="status" aria-live="polite">
          <LoaderCircle
            className="mx-auto size-8 animate-spin text-marca-500"
            aria-hidden
          />
          <p className="mt-4 font-medium text-tinta-700">
            Criando seu conteúdo para {plataformasEscolhidas.length}{" "}
            {plataformasEscolhidas.length === 1 ? "rede" : "redes"}...
          </p>
          <p className="mt-1 text-sm text-tinta-400">
            Cada rede recebe um texto próprio. Leva menos de um minuto.
          </p>
        </div>
      )}

      {dados.length > 0 && atual && (
        <>
          {/* Abas de plataforma */}
          <div className="mt-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div
              role="tablist"
              aria-label="Escolha a rede social"
              className="flex w-max min-w-full gap-2 border-b border-linha pb-px"
            >
              {dados.map((d) => {
                const meta = PLATAFORMAS[d.plataforma];
                const ativa = d.plataforma === plataformaAtiva;
                return (
                  <button
                    key={d.plataforma}
                    role="tab"
                    aria-selected={ativa}
                    onClick={() => setPlataformaAtiva(d.plataforma)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-4 py-3 text-sm font-medium transition",
                      ativa
                        ? "border-marca-500 text-marca-700"
                        : "border-transparent text-tinta-500 hover:text-tinta-900",
                    )}
                  >
                    <IconePlataforma plataforma={d.plataforma} className="size-4" />
                    {meta.nome}
                    {d.duracaoSegundos !== null && (
                      <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-xs">
                        {rotuloDuracao(d.plataforma, d.duracaoSegundos)}
                      </span>
                    )}
                  </button>
                );
              })}
              {gerando && faltando.length > 0 && (
                <span className="flex shrink-0 items-center gap-2 px-4 py-3 text-sm text-tinta-400">
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  Criando mais {faltando.length}...
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)]">
            {/* Menu de seções — com a bolinha do que já está pronto */}
            <nav aria-label="Partes do conteúdo">
              <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
                {SECOES.map(({ id, rotulo, icone: Icone }) => {
                  const ativa = secao === id;
                  const pronto = secaoEstaPronta(id, atual);
                  return (
                    <li key={id} className="shrink-0 lg:shrink">
                      <button
                        onClick={() => setSecao(id)}
                        aria-current={ativa ? "page" : undefined}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
                          ativa
                            ? "bg-marca-50 text-marca-700"
                            : "text-tinta-500 hover:bg-white/5 hover:text-tinta-900",
                        )}
                      >
                        <Icone className="size-4 shrink-0" aria-hidden />
                        <span className="flex-1 text-left">{rotulo}</span>
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            pronto ? "bg-emerald-500" : "bg-white/10",
                          )}
                          aria-label={pronto ? "pronto" : "incompleto"}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Conteúdo da seção — sempre com a key da plataforma, para o estado
                de uma aba nunca vazar para a outra. */}
            <div className="min-w-0">
              {secao === "roteiro" && (
                <SecaoRoteiro
                  key={`roteiro-${atual.plataforma}`}
                  ideaId={ideaId}
                  dados={atual}
                  aoAtualizar={(m) => atualizarPlataforma(atual.plataforma, m)}
                />
              )}
              {secao === "arte" && (
                <SecaoArte
                  key={`arte-${atual.plataforma}`}
                  ideaId={ideaId}
                  dados={atual}
                  marca={marca}
                  aoAtualizar={(m) => atualizarPlataforma(atual.plataforma, m)}
                />
              )}
              {secao === "seo" && (
                <SecaoSeo
                  key={`seo-${atual.plataforma}`}
                  ideaId={ideaId}
                  dados={atual}
                  aoAtualizar={(m) => atualizarPlataforma(atual.plataforma, m)}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Estado vazio com ação clara — nunca uma tela em branco. */}
      {!gerando && dados.length === 0 && !erro && (
        <div className="cartao mt-8 p-8 text-center">
          <p className="font-medium text-tinta-700">Nada criado para esse tema ainda.</p>
          <p className="mt-1 text-sm text-tinta-500">
            Podemos escrever o conteúdo para as suas redes agora.
          </p>
          <div className="mt-5">
            <Botao tamanho="grande" onClick={tentarDeNovo}>
              Criar conteúdo
            </Botao>
          </div>
        </div>
      )}
    </div>
  );
}

/** A bolinha verde só aparece quando aquela parte realmente tem conteúdo utilizável. */
function secaoEstaPronta(secao: Secao, dados: DadosPlataforma): boolean {
  switch (secao) {
    case "roteiro":
      return dados.conteudo.trim().length > 0;
    case "arte":
      return dados.arte.textoArte.trim().length > 0;
    case "seo":
      return dados.seo.titulo.trim().length > 0 && dados.seo.tags.length > 0;
  }
}
