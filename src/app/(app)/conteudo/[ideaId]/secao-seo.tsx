"use client";

import { useState } from "react";
import { Check, Copy, Plus, X } from "lucide-react";
import { salvarSeo } from "./acoes";
import type { DadosPlataforma } from "./tipos";
import { Alerta } from "@/components/ui/alerta";
import { PLATAFORMAS } from "@/lib/constants";
import { useAutoSalvar } from "@/lib/hooks/use-auto-salvar";
import { cn } from "@/lib/utils";

/** Cada rede chama essas coisas de um jeito — a interface fala a língua dela. */
function rotulos(plataforma: DadosPlataforma["plataforma"]) {
  switch (plataforma) {
    case "YOUTUBE":
      return {
        titulo: "Título do vídeo",
        dicaTitulo: "Até 60 caracteres funciona melhor na busca do YouTube.",
        descricao: "Descrição do vídeo",
        tags: "Tags de busca",
        dicaTags: "Palavras que as pessoas digitam para achar esse assunto.",
        prefixo: "",
      };
    case "INSTAGRAM":
      return {
        titulo: "Chamada do post",
        dicaTitulo: "Aparece como resumo. Até 60 caracteres.",
        descricao: "Resumo",
        tags: "Hashtags",
        dicaTags: "Misture hashtags grandes com hashtags do seu nicho.",
        prefixo: "#",
      };
    case "TIKTOK":
      return {
        titulo: "Legenda do vídeo",
        dicaTitulo: "Curta e chamativa. Até 80 caracteres.",
        descricao: "Resumo",
        tags: "Hashtags",
        dicaTags: "No TikTok, poucas e populares funcionam melhor.",
        prefixo: "#",
      };
    case "LINKEDIN":
      return {
        titulo: "Primeira linha",
        dicaTitulo: "É o que aparece antes do 'ver mais'.",
        descricao: "Resumo",
        tags: "Hashtags",
        dicaTags: "No LinkedIn, 3 a 5 hashtags já bastam.",
        prefixo: "#",
      };
  }
}

export function SecaoSeo({
  ideaId,
  dados,
  aoAtualizar,
}: {
  ideaId: string;
  dados: DadosPlataforma;
  aoAtualizar: (mudanca: Partial<DadosPlataforma>) => void;
}) {
  const meta = PLATAFORMAS[dados.plataforma];
  const r = rotulos(dados.plataforma);
  const [novaTag, setNovaTag] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);

  const { estado, erro } = useAutoSalvar(JSON.stringify(dados.seo), () =>
    salvarSeo({
      ideaId,
      plataforma: dados.plataforma,
      titulo: dados.seo.titulo,
      descricao: dados.seo.descricao,
      tags: dados.seo.tags,
    }),
  );

  function atualizarSeo(mudanca: Partial<DadosPlataforma["seo"]>) {
    aoAtualizar({ seo: { ...dados.seo, ...mudanca } });
  }

  function adicionarTag() {
    const limpa = novaTag.replace(/^#+/, "").trim();
    if (!limpa) return;
    if (dados.seo.tags.some((t) => t.toLowerCase() === limpa.toLowerCase())) {
      setNovaTag("");
      return;
    }
    atualizarSeo({ tags: [...dados.seo.tags, limpa] });
    setNovaTag("");
  }

  function removerTag(tag: string) {
    atualizarSeo({ tags: dados.seo.tags.filter((t) => t !== tag) });
  }

  async function copiar(texto: string, id: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(id);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Sem clipboard disponível o usuário ainda pode selecionar e copiar.
    }
  }

  const tagsComPrefixo = dados.seo.tags.map((t) => `${r.prefixo}${t}`).join(" ");

  return (
    <section>
      <div>
        <h2 className="text-lg font-semibold">SEO para {meta.nome}</h2>
        <p className="text-sm text-tinta-400">
          Ajuda as pessoas a encontrarem seu conteúdo. Tudo editável.
        </p>
      </div>

      {erro && (
        <div className="mt-4">
          <Alerta tom="erro">{erro}</Alerta>
        </div>
      )}

      <div className="mt-5 space-y-5">
        {/* Título */}
        <div>
          <div className="flex items-end justify-between gap-2">
            <label htmlFor="seo-titulo" className="rotulo mb-0">
              {r.titulo}
            </label>
            <BotaoCopiar
              copiado={copiado === "titulo"}
              onClick={() => copiar(dados.seo.titulo, "titulo")}
            />
          </div>
          <input
            id="seo-titulo"
            value={dados.seo.titulo}
            onChange={(e) => atualizarSeo({ titulo: e.target.value })}
            maxLength={200}
            className="campo mt-2"
          />
          <p className="mt-1.5 flex items-center justify-between text-sm text-tinta-400">
            <span>{r.dicaTitulo}</span>
            <span>{dados.seo.titulo.length}</span>
          </p>
        </div>

        {/* Descrição */}
        <div>
          <div className="flex items-end justify-between gap-2">
            <label htmlFor="seo-descricao" className="rotulo mb-0">
              {r.descricao}
            </label>
            <BotaoCopiar
              copiado={copiado === "descricao"}
              onClick={() => copiar(dados.seo.descricao, "descricao")}
            />
          </div>
          <textarea
            id="seo-descricao"
            value={dados.seo.descricao}
            onChange={(e) => atualizarSeo({ descricao: e.target.value })}
            rows={5}
            className="campo mt-2 resize-y leading-relaxed"
          />
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-end justify-between gap-2">
            <span className="rotulo mb-0">
              {r.tags}{" "}
              <span className="font-normal text-tinta-400">
                ({dados.seo.tags.length})
              </span>
            </span>
            <BotaoCopiar
              copiado={copiado === "tags"}
              onClick={() => copiar(tagsComPrefixo, "tags")}
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {dados.seo.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white py-1 pr-1 pl-3 text-sm"
              >
                {r.prefixo}
                {tag}
                <button
                  type="button"
                  onClick={() => removerTag(tag)}
                  aria-label={`Remover ${tag}`}
                  className="rounded-full p-1 text-tinta-400 transition hover:bg-black/5 hover:text-red-600"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </span>
            ))}
            {dados.seo.tags.length === 0 && (
              <p className="text-sm text-tinta-400">
                Nenhuma ainda. Adicione abaixo.
              </p>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={novaTag}
              onChange={(e) => setNovaTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionarTag();
                }
              }}
              placeholder={`Adicionar ${r.tags.toLowerCase()}`}
              maxLength={60}
              aria-label={`Adicionar ${r.tags.toLowerCase()}`}
              className="campo flex-1"
            />
            <button
              type="button"
              onClick={adicionarTag}
              disabled={!novaTag.trim()}
              className="rounded-xl border border-black/10 bg-white px-4 text-tinta-700 transition hover:bg-black/[0.03] disabled:opacity-40"
              aria-label="Adicionar"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
          <p className="mt-1.5 text-sm text-tinta-400">{r.dicaTags}</p>
        </div>
      </div>

      <p className="mt-4 h-5 text-sm text-tinta-400" aria-live="polite">
        {estado === "salvando" && "Salvando..."}
        {estado === "salvo" && "Alterações salvas"}
      </p>
    </section>
  );
}

function BotaoCopiar({ copiado, onClick }: { copiado: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium transition",
        copiado ? "text-emerald-600" : "text-tinta-500 hover:bg-black/5",
      )}
    >
      {copiado ? (
        <>
          <Check className="size-3.5" aria-hidden />
          Copiado
        </>
      ) : (
        <>
          <Copy className="size-3.5" aria-hidden />
          Copiar
        </>
      )}
    </button>
  );
}
