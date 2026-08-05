"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ImagePlus, LoaderCircle, Palette, Search } from "lucide-react";
import { salvarArte } from "./acoes";
import type { DadosPlataforma, MarcaCliente } from "./tipos";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { PLATAFORMAS } from "@/lib/constants";
import { calcularLayout } from "@/lib/arte/layout";
import { aguardarFontes, carregarImagem, desenharArte } from "@/lib/arte/canvas";
import { useAutoSalvar } from "@/lib/hooks/use-auto-salvar";
import { cn } from "@/lib/utils";

type FotoBanco = {
  id: string;
  urlPreview: string;
  urlGrande: string;
  autor: string;
  creditoUrl: string;
  descricao: string;
};

/** Imagens externas passam pelo nosso domínio para o canvas não ficar bloqueado. */
function viaProxy(url: string) {
  return `/api/imagem?url=${encodeURIComponent(url)}`;
}

export function SecaoArte({
  ideaId,
  dados,
  marca,
  aoAtualizar,
}: {
  ideaId: string;
  dados: DadosPlataforma;
  marca: MarcaCliente;
  aoAtualizar: (mudanca: Partial<DadosPlataforma>) => void;
}) {
  const meta = PLATAFORMAS[dados.plataforma];
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [erro, setErro] = useState<string | null>(null);
  const [desenhando, setDesenhando] = useState(true);
  const [fotos, setFotos] = useState<FotoBanco[]>([]);
  const [buscandoFotos, setBuscandoFotos] = useState(false);
  const [termoBusca, setTermoBusca] = useState(dados.arte.termoFoto ?? "");
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [baixando, setBaixando] = useState(false);

  const { estado: estadoSalvamento, erro: erroSalvamento } = useAutoSalvar(
    JSON.stringify(dados.arte),
    () =>
      salvarArte({
        ideaId,
        plataforma: dados.plataforma,
        textoArte: dados.arte.textoArte,
        fundo: dados.arte.fundo,
        fotoFundoUrl: dados.arte.fotoFundoUrl,
        fotoCredito: dados.arte.fotoCredito,
      }),
  );

  function atualizarArte(mudanca: Partial<DadosPlataforma["arte"]>) {
    aoAtualizar({ arte: { ...dados.arte, ...mudanca } });
  }

  /** Redesenha a arte inteira. É a mesma função que gera o PNG do download. */
  const redesenhar = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setDesenhando(true);
    try {
      await aguardarFontes();

      const [logo, foto] = await Promise.all([
        marca.logoUrl
          ? carregarImagem(viaProxy(marca.logoUrl)).catch(() => null)
          : Promise.resolve(null),
        dados.arte.fundo === "foto" && dados.arte.fotoFundoUrl
          ? carregarImagem(viaProxy(dados.arte.fotoFundoUrl)).catch(() => null)
          : Promise.resolve(null),
      ]);

      const layout = calcularLayout({
        formato: meta.formatoArte,
        texto: dados.arte.textoArte || meta.nome,
        nomeMarca: marca.nomeMarca,
        nomePlataforma: meta.nome,
        corPrimaria: marca.corPrimaria,
        fonteId: marca.fonte,
        fundo: dados.arte.fundo,
        temLogo: Boolean(logo),
        temFoto: Boolean(foto),
      });

      desenharArte(canvas, layout, { logo, foto });
      setErro(null);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não conseguimos montar a arte. Tente de novo.",
      );
    } finally {
      setDesenhando(false);
    }
  }, [
    dados.arte.fundo,
    dados.arte.fotoFundoUrl,
    dados.arte.textoArte,
    marca.corPrimaria,
    marca.fonte,
    marca.logoUrl,
    marca.nomeMarca,
    meta.formatoArte,
    meta.nome,
  ]);

  useEffect(() => {
    redesenhar();
  }, [redesenhar]);

  async function buscarFotos(termo: string) {
    const consulta = termo.trim();
    if (!consulta) return;
    setBuscandoFotos(true);
    setErro(null);
    try {
      const resposta = await fetch(
        `/api/fotos?termo=${encodeURIComponent(consulta)}&formato=${meta.formatoArte}`,
      );
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? "Falha na busca.");
      setFotos(corpo.fotos ?? []);
      if ((corpo.fotos ?? []).length === 0) {
        setErro("Nenhuma foto encontrada. Tente outras palavras (em inglês funciona melhor).");
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não conseguimos buscar fotos agora.");
    } finally {
      setBuscandoFotos(false);
    }
  }

  async function enviarFotoPropria(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    setEnviandoFoto(true);
    setErro(null);
    try {
      const form = new FormData();
      form.append("arquivo", arquivo);
      form.append("pasta", "fotos");
      const resposta = await fetch("/api/upload", { method: "POST", body: form });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? "Falha no envio.");

      atualizarArte({
        fundo: "foto",
        fotoFundoUrl: corpo.url,
        fotoCredito: null,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não conseguimos enviar essa foto.");
    } finally {
      setEnviandoFoto(false);
      evento.target.value = "";
    }
  }

  function baixarPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBaixando(true);
    canvas.toBlob((blob) => {
      setBaixando(false);
      if (!blob) {
        setErro("Não conseguimos gerar o arquivo. Tente de novo.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${meta.nome.toLowerCase()}-${meta.formatoArte.toLowerCase()}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Arte para {meta.nome}</h2>
          <p className="text-sm text-tinta-400">
            {meta.rotuloArte} · {meta.dimensoes.largura}×{meta.dimensoes.altura} px
          </p>
        </div>
        <Botao
          onClick={baixarPng}
          carregando={baixando || desenhando}
          textoCarregando="Preparando..."
        >
          <Download className="size-4" aria-hidden />
          Baixar PNG
        </Botao>
      </div>

      {(erro || erroSalvamento) && (
        <div className="mt-4">
          <Alerta tom="erro">{erro ?? erroSalvamento}</Alerta>
        </div>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Prévia */}
        <div>
          <div className="relative overflow-hidden rounded-2xl bg-black/[0.04] p-3">
            <canvas
              ref={canvasRef}
              aria-label={`Prévia da arte para ${meta.nome}`}
              className="mx-auto block h-auto w-full max-w-full rounded-xl shadow-lg"
              style={{ maxHeight: "min(70vh, 640px)", width: "auto", maxWidth: "100%" }}
            />
            {desenhando && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <LoaderCircle className="size-6 animate-spin text-marca-500" aria-hidden />
              </div>
            )}
          </div>
          {dados.arte.fotoCredito && (
            <p className="mt-2 text-center text-xs text-tinta-400">
              Foto de {dados.arte.fotoCredito} (Pexels)
            </p>
          )}
        </div>

        {/* Controles */}
        <div className="space-y-5">
          <div>
            <label htmlFor="texto-arte" className="rotulo">
              Texto da arte
            </label>
            <textarea
              id="texto-arte"
              value={dados.arte.textoArte}
              onChange={(e) => atualizarArte({ textoArte: e.target.value })}
              rows={3}
              maxLength={120}
              className="campo resize-none"
            />
            <p className="mt-1.5 text-sm text-tinta-400">
              Frases curtas funcionam melhor. {dados.arte.textoArte.length}/120
            </p>
          </div>

          <div>
            <span className="rotulo">Fundo</span>
            <div className="grid grid-cols-2 gap-2">
              <BotaoFundo
                ativo={dados.arte.fundo === "solido"}
                onClick={() => atualizarArte({ fundo: "solido" })}
                icone={<Palette className="size-4" aria-hidden />}
                rotulo="Cor da marca"
              />
              <BotaoFundo
                ativo={dados.arte.fundo === "foto"}
                onClick={() => {
                  atualizarArte({ fundo: "foto" });
                  if (fotos.length === 0 && termoBusca) buscarFotos(termoBusca);
                }}
                icone={<ImagePlus className="size-4" aria-hidden />}
                rotulo="Foto"
              />
            </div>
          </div>

          {dados.arte.fundo === "foto" && (
            <div className="space-y-4">
              <div>
                <span className="rotulo">Buscar no banco de imagens</span>
                <div className="flex gap-2">
                  <input
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        buscarFotos(termoBusca);
                      }
                    }}
                    placeholder="bakery, coffee, gym..."
                    aria-label="Buscar foto"
                    className="campo flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => buscarFotos(termoBusca)}
                    disabled={buscandoFotos || !termoBusca.trim()}
                    aria-label="Buscar"
                    className="rounded-xl border border-black/10 bg-white px-4 text-tinta-700 transition hover:bg-black/[0.03] disabled:opacity-40"
                  >
                    {buscandoFotos ? (
                      <LoaderCircle className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Search className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-sm text-tinta-400">
                  Fotos gratuitas do Pexels, liberadas para uso comercial.
                </p>
              </div>

              {fotos.length > 0 && (
                <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto pr-1">
                  {fotos.map((foto) => {
                    const escolhida = dados.arte.fotoFundoUrl === foto.urlGrande;
                    return (
                      <button
                        key={foto.id}
                        type="button"
                        onClick={() =>
                          atualizarArte({
                            fundo: "foto",
                            fotoFundoUrl: foto.urlGrande,
                            fotoCredito: foto.autor,
                          })
                        }
                        aria-label={foto.descricao}
                        aria-pressed={escolhida}
                        className={cn(
                          "relative aspect-square overflow-hidden rounded-lg transition",
                          escolhida
                            ? "ring-2 ring-marca-500 ring-offset-2"
                            : "ring-1 ring-black/10 hover:opacity-85",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={foto.urlPreview}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              <div>
                <span className="rotulo">Ou use uma foto sua</span>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/15 bg-white px-4 py-3 text-sm font-medium text-tinta-700 transition hover:border-marca-400">
                  {enviandoFoto ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" aria-hidden />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="size-4 text-marca-500" aria-hidden />
                      Escolher foto do dispositivo
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={enviarFotoPropria}
                  />
                </label>
              </div>
            </div>
          )}

          <p className="h-5 text-sm text-tinta-400" aria-live="polite">
            {estadoSalvamento === "salvando" && "Salvando..."}
            {estadoSalvamento === "salvo" && "Alterações salvas"}
          </p>
        </div>
      </div>
    </section>
  );
}

function BotaoFundo({
  ativo,
  onClick,
  icone,
  rotulo,
}: {
  ativo: boolean;
  onClick: () => void;
  icone: React.ReactNode;
  rotulo: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
        ativo
          ? "border-marca-500 bg-marca-50 text-marca-700"
          : "border-black/10 bg-white text-tinta-700 hover:border-black/25",
      )}
    >
      {icone}
      {rotulo}
    </button>
  );
}
