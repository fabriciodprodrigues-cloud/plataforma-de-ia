"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { salvarMarca } from "./acoes";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { IconePlataforma } from "@/components/icone-plataforma";
import { SeletorArquetipo } from "@/components/seletor-arquetipo";
import type { Arquetipo, Plataforma } from "@/generated/prisma/enums";
import { FONTES, ORDEM_PLATAFORMAS, PLATAFORMAS, fonteCss } from "@/lib/constants";
import { corDeTextoSobre, ehHexValido, extrairPaleta } from "@/lib/cores";
import { cn } from "@/lib/utils";

const PALETA_PADRAO = ["#6D4AFF", "#1F5A4A", "#E0533D", "#1D4ED8", "#B45309"];

export function FormularioMarca({
  inicial,
}: {
  inicial: {
    nomeMarca: string;
    nicho: string;
    plataformas: Plataforma[];
    logoUrl: string | null;
    corPrimaria: string;
    coresExtraidas: string[];
    fonte: string;
    arquetipo: Arquetipo | null;
  };
}) {
  const router = useRouter();
  const [arquetipo, setArquetipo] = useState<Arquetipo | null>(inicial.arquetipo);
  const [nomeMarca, setNomeMarca] = useState(inicial.nomeMarca);
  const [nicho, setNicho] = useState(inicial.nicho);
  const [plataformas, setPlataformas] = useState<Plataforma[]>(inicial.plataformas);
  const [logoUrl, setLogoUrl] = useState(inicial.logoUrl);
  const [coresDoLogo, setCoresDoLogo] = useState(inicial.coresExtraidas);
  const [corPrimaria, setCorPrimaria] = useState(inicial.corPrimaria);
  const [fonte, setFonte] = useState(inicial.fonte);

  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [salvando, salvar] = useTransition();
  const inputArquivo = useRef<HTMLInputElement>(null);

  const paleta = [...new Set([...coresDoLogo, ...PALETA_PADRAO, corPrimaria])].slice(0, 9);

  async function aoEscolherLogo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    setErro(null);
    setEnviandoLogo(true);

    try {
      const cores = await extrairPaleta(arquivo);
      if (cores.length > 0) {
        setCoresDoLogo(cores);
        setCorPrimaria(cores[0]);
      }
    } catch {
      setCoresDoLogo([]);
    }

    try {
      const form = new FormData();
      form.append("arquivo", arquivo);
      form.append("pasta", "logos");
      const resposta = await fetch("/api/upload", { method: "POST", body: form });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? "Falha no envio.");
      setLogoUrl(corpo.url);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não conseguimos enviar seu logo.");
    } finally {
      setEnviandoLogo(false);
      evento.target.value = "";
    }
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvo(false);

    if (plataformas.length === 0) return setErro("Escolha pelo menos uma rede social.");
    if (!ehHexValido(corPrimaria)) return setErro("Escolha uma cor válida.");

    salvar(async () => {
      const resultado = await salvarMarca({
        nomeMarca: nomeMarca.trim(),
        nicho: nicho.trim(),
        plataformas,
        logoUrl,
        corPrimaria,
        coresExtraidas: coresDoLogo,
        fonte,
        arquetipo,
      });
      if (!resultado.ok) return setErro(resultado.erro);
      setSalvo(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} className="max-w-2xl space-y-7">
      {erro && <Alerta tom="erro">{erro}</Alerta>}
      {salvo && <Alerta tom="sucesso">Tudo certo, suas alterações foram salvas.</Alerta>}

      <Campo
        rotulo="Nome do negócio ou marca"
        value={nomeMarca}
        onChange={(e) => setNomeMarca(e.target.value)}
        maxLength={60}
      />

      <Campo
        rotulo="Sobre o que você fala"
        value={nicho}
        onChange={(e) => setNicho(e.target.value)}
        dica="Mudar isso altera as pesquisas e os próximos temas sugeridos."
        maxLength={120}
      />

      <div>
        <span className="rotulo">Seu jeito de falar</span>
        <SeletorArquetipo valor={arquetipo} aoMudar={setArquetipo} />
        <p className="mt-2 text-sm text-tinta-400">
          Define o tom dos textos e o gancho usado na abertura e no fecho. Vale para os
          próximos conteúdos — os que já existem continuam como estão até você refazer.
        </p>
      </div>

      <div>
        <span className="rotulo">Onde você publica</span>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {ORDEM_PLATAFORMAS.map((id) => {
            const meta = PLATAFORMAS[id];
            const marcada = plataformas.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() =>
                  setPlataformas((a) =>
                    a.includes(id) ? a.filter((x) => x !== id) : [...a, id],
                  )
                }
                aria-pressed={marcada}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3.5 text-left transition",
                  marcada
                    ? "border-marca-500 bg-marca-50 ring-2 ring-marca-500/20"
                    : "border-black/10 bg-white hover:border-black/20",
                )}
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: meta.cor }}
                >
                  <IconePlataforma plataforma={id} className="size-4" />
                </span>
                <span className="flex-1 font-medium">{meta.nome}</span>
                {marcada && <Check className="size-4 text-marca-600" aria-hidden />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className="rotulo">Seu logo</span>
        {logoUrl ? (
          <div className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Seu logo" className="size-14 rounded-xl object-contain" />
            <p className="flex-1 text-sm text-tinta-500">
              {enviandoLogo ? "Enviando..." : "Logo salvo"}
            </p>
            <button
              type="button"
              onClick={() => {
                setLogoUrl(null);
                setCoresDoLogo([]);
                if (inputArquivo.current) inputArquivo.current.value = "";
              }}
              aria-label="Remover logo"
              className="rounded-full p-2 text-tinta-400 transition hover:bg-black/5 hover:text-red-600"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/15 bg-white px-4 py-6 text-sm font-medium text-tinta-700 transition hover:border-marca-400">
            {enviandoLogo ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
                Enviando...
              </>
            ) : (
              <>
                <ImagePlus className="size-5 text-marca-500" aria-hidden />
                Escolher logo (PNG, JPG ou SVG)
              </>
            )}
            <input
              ref={inputArquivo}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              onChange={aoEscolherLogo}
            />
          </label>
        )}
      </div>

      <div>
        <span className="rotulo">Cor principal</span>
        <div className="flex flex-wrap items-center gap-2.5">
          {paleta.map((cor, indice) => {
            const escolhida = cor.toUpperCase() === corPrimaria.toUpperCase();
            return (
              <button
                key={`${cor}-${indice}`}
                type="button"
                onClick={() => setCorPrimaria(cor)}
                aria-label={`Usar a cor ${cor}`}
                aria-pressed={escolhida}
                className={cn(
                  "relative size-11 rounded-xl transition",
                  escolhida
                    ? "ring-2 ring-marca-500 ring-offset-2"
                    : "ring-1 ring-black/10 hover:scale-105",
                )}
                style={{ backgroundColor: cor }}
              >
                {escolhida && (
                  <Check
                    className="absolute inset-0 m-auto size-5"
                    strokeWidth={3}
                    style={{ color: corDeTextoSobre(cor) }}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
          <label className="flex size-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-black/20 text-xs font-medium text-tinta-400 transition hover:border-marca-400">
            Outra
            <input
              type="color"
              value={corPrimaria}
              onChange={(e) => setCorPrimaria(e.target.value.toUpperCase())}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      <div>
        <span className="rotulo">Fonte das artes</span>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {FONTES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFonte(f.id)}
              aria-pressed={f.id === fonte}
              className={cn(
                "rounded-2xl border p-3 text-left transition",
                f.id === fonte
                  ? "border-marca-500 bg-marca-50 ring-2 ring-marca-500/20"
                  : "border-black/10 bg-white hover:border-black/20",
              )}
            >
              <span
                className="block text-2xl leading-none"
                style={{ fontFamily: fonteCss(f.id) }}
              >
                Aa
              </span>
              <span className="mt-2 block text-sm font-medium">{f.nome}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <Botao
          type="submit"
          tamanho="grande"
          carregando={salvando || enviandoLogo}
          textoCarregando="Salvando..."
        >
          Salvar alterações
        </Botao>
      </div>
    </form>
  );
}
