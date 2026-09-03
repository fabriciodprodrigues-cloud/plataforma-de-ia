"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { concluirOnboarding } from "./acoes";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { IconePlataforma } from "@/components/icone-plataforma";
import type { Arquetipo, Plataforma } from "@/generated/prisma/enums";
import {
  ARQUETIPOS,
  PERGUNTA_ARQUETIPO,
  PERGUNTA_MOTIVACAO,
  QUIZ_ARQUETIPO,
  QUIZ_MOTIVACAO,
  type Motivacao,
} from "@/lib/arquetipos";
import { FONTES, ORDEM_PLATAFORMAS, PLATAFORMAS, fonteCss } from "@/lib/constants";
import { corDeTextoSobre, ehHexValido, extrairPaleta } from "@/lib/cores";
import { cn } from "@/lib/utils";

const TOTAL_PASSOS = 4;

const EXEMPLOS_NICHO = [
  "Confeitaria artesanal",
  "Marketing digital",
  "Treino em casa",
  "Finanças pessoais",
  "Moda sustentável",
  "Barbearia",
];

/** Cores de reserva para quem não enviar logo — nada de tela sem opção. */
const PALETA_PADRAO = ["#6D4AFF", "#1F5A4A", "#E0533D", "#1D4ED8", "#B45309"];

export function Assistente({ nomeUsuario }: { nomeUsuario: string | null }) {
  const router = useRouter();
  const [passo, setPasso] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciarSalvamento] = useTransition();

  // Passo 1
  const [nomeMarca, setNomeMarca] = useState("");
  const [nicho, setNicho] = useState("");

  // Passo 2
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);

  // Passo 3
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [paleta, setPaleta] = useState<string[]>(PALETA_PADRAO);
  const [coresDoLogo, setCoresDoLogo] = useState<string[]>([]);
  const [corPrimaria, setCorPrimaria] = useState(PALETA_PADRAO[0]);
  const [fonte, setFonte] = useState<string>(FONTES[0].id);
  const inputArquivo = useRef<HTMLInputElement>(null);

  // Passo 4 — o quiz tem duas perguntas dentro do mesmo passo: a primeira acha a
  // motivação, a segunda o arquétipo dentro dela. Guardamos qual está na tela
  // para o botão "Voltar" recuar uma pergunta antes de voltar um passo.
  const [perguntaQuiz, setPerguntaQuiz] = useState<1 | 2>(1);
  const [motivacao, setMotivacao] = useState<Motivacao | null>(null);

  function alternarPlataforma(p: Plataforma) {
    setErro(null);
    setPlataformas((atual) =>
      atual.includes(p) ? atual.filter((x) => x !== p) : [...atual, p],
    );
  }

  async function aoEscolherLogo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    setErro(null);
    setEnviandoLogo(true);
    setLogoPreview(URL.createObjectURL(arquivo));

    // 1) A paleta sai na hora, aqui no navegador — não depende do upload terminar.
    try {
      const cores = await extrairPaleta(arquivo);
      if (cores.length > 0) {
        setCoresDoLogo(cores);
        setPaleta([...cores, ...PALETA_PADRAO].slice(0, 8));
        setCorPrimaria(cores[0]);
      }
    } catch {
      // Se não der para ler as cores (SVG estranho, por exemplo), seguimos com a
      // paleta padrão em vez de travar o cadastro.
      setCoresDoLogo([]);
    }

    // 2) Envia o arquivo para o armazenamento.
    try {
      const form = new FormData();
      form.append("arquivo", arquivo);
      form.append("pasta", "logos");
      const resposta = await fetch("/api/upload", { method: "POST", body: form });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro ?? "Falha no envio.");
      setLogoUrl(dados.url);
    } catch (e) {
      setErro(
        e instanceof Error
          ? `${e.message} Você pode continuar sem o logo e adicionar depois em "Minha marca".`
          : "Não conseguimos enviar seu logo agora.",
      );
      setLogoUrl(null);
    } finally {
      setEnviandoLogo(false);
    }
  }

  function removerLogo() {
    setLogoUrl(null);
    setLogoPreview(null);
    setCoresDoLogo([]);
    setPaleta(PALETA_PADRAO);
    setCorPrimaria(PALETA_PADRAO[0]);
    if (inputArquivo.current) inputArquivo.current.value = "";
  }

  function avancar() {
    setErro(null);
    if (passo === 1) {
      if (nomeMarca.trim().length < 2) return setErro("Digite o nome da sua marca ou negócio.");
      if (nicho.trim().length < 3) return setErro("Conte, em poucas palavras, sobre o que você fala.");
    }
    if (passo === 2 && plataformas.length === 0) {
      return setErro("Escolha pelo menos uma rede social para a gente criar o conteúdo.");
    }
    if (passo === 3 && !ehHexValido(corPrimaria)) {
      return setErro("Escolha uma cor válida para a marca.");
    }
    setPasso((p) => Math.min(TOTAL_PASSOS, p + 1));
  }

  /**
   * Fecha o cadastro. Recebe o arquétipo por parâmetro em vez de ler do estado
   * porque quem chama é o clique na última opção do quiz — nesse instante o
   * `setState` ainda não foi aplicado.
   */
  function finalizar(arquetipoEscolhido: Arquetipo) {
    setErro(null);
    if (!ehHexValido(corPrimaria)) return setErro("Escolha uma cor válida para a marca.");

    iniciarSalvamento(async () => {
      const resultado = await concluirOnboarding({
        nomeMarca: nomeMarca.trim(),
        nicho: nicho.trim(),
        plataformas,
        logoUrl,
        corPrimaria,
        coresExtraidas: coresDoLogo,
        fonte,
        arquetipo: arquetipoEscolhido,
      });

      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      // O painel é quem dispara a pesquisa do nicho e mostra "Estudando seu nicho...".
      router.push("/painel");
    });
  }

  const progresso = (passo / TOTAL_PASSOS) * 100;

  return (
    <div className="w-full max-w-lg">
      {/* Barra de progresso — o usuário sempre sabe onde está e quanto falta. */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-tinta-700">
            Passo {passo} de {TOTAL_PASSOS}
          </span>
          <span className="text-tinta-400">
            {passo === 1 && "Sobre você"}
            {passo === 2 && "Onde você publica"}
            {passo === 3 && "Sua identidade visual"}
            {passo === 4 && "Seu jeito de falar"}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={passo}
          aria-valuemin={1}
          aria-valuemax={TOTAL_PASSOS}
          aria-label="Progresso do cadastro"
        >
          <div
            className="h-full rounded-full bg-marca-500 transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {erro && (
        <div className="mb-5">
          <Alerta tom="erro">{erro}</Alerta>
        </div>
      )}

      {passo === 1 && (
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">
            {nomeUsuario ? `Prazer, ${nomeUsuario}!` : "Vamos nos conhecer"}
          </h1>
          <p className="mt-2 text-tinta-500">
            Duas perguntinhas para a gente entender o que criar pra você.
          </p>

          <div className="mt-7 space-y-5">
            <Campo
              rotulo="Qual o nome do seu negócio ou marca?"
              value={nomeMarca}
              onChange={(e) => setNomeMarca(e.target.value)}
              placeholder="Doceria da Ana"
              autoFocus
              maxLength={60}
            />

            <div>
              <Campo
                rotulo="Sobre o que você fala?"
                value={nicho}
                onChange={(e) => setNicho(e.target.value)}
                placeholder="Confeitaria artesanal para festas"
                dica="Pode escrever do seu jeito. É isso que a gente vai pesquisar pra você."
                maxLength={120}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {EXEMPLOS_NICHO.map((exemplo) => (
                  <button
                    key={exemplo}
                    type="button"
                    onClick={() => setNicho(exemplo)}
                    className="rounded-full border border-linha bg-cartao px-3 py-1.5 text-sm text-tinta-500 transition hover:border-marca-300 hover:text-marca-700"
                  >
                    {exemplo}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {passo === 2 && (
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Onde você publica?</h1>
          <p className="mt-2 text-tinta-500">
            Pode marcar quantas quiser. Cada rede recebe um conteúdo feito pra ela.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {ORDEM_PLATAFORMAS.map((id) => {
              const meta = PLATAFORMAS[id];
              const marcada = plataformas.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => alternarPlataforma(id)}
                  aria-pressed={marcada}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-4 text-left transition",
                    marcada
                      ? "border-marca-500 bg-marca-50 ring-2 ring-marca-500/20"
                      : "border-linha bg-cartao hover:border-linha",
                  )}
                >
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: meta.cor }}
                  >
                    <IconePlataforma plataforma={id} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{meta.nome}</span>
                    <span className="block text-sm text-tinta-400">
                      {meta.tipoConteudo === "ROTEIRO_VIDEO"
                        ? "Roteiro de vídeo + capa"
                        : "Legenda + arte do post"}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border transition",
                      marcada
                        ? "border-marca-500 bg-marca-500 text-white"
                        : "border-linha bg-cartao",
                    )}
                    aria-hidden
                  >
                    {marcada && <Check className="size-4" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {passo === 3 && (
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Sua identidade visual</h1>
          <p className="mt-2 text-tinta-500">
            Envie seu logo que a gente já descobre as suas cores sozinho.
          </p>

          <div className="mt-7 space-y-7">
            {/* --- Logo --- */}
            <div>
              <span className="rotulo">Seu logo</span>
              {logoPreview ? (
                <div className="flex items-center gap-4 rounded-2xl border border-linha bg-cartao p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreview}
                    alt="Prévia do seu logo"
                    className="size-16 rounded-xl object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    {enviandoLogo ? (
                      <p className="flex items-center gap-2 text-sm text-tinta-500">
                        <LoaderCircle className="size-4 animate-spin" aria-hidden />
                        Enviando seu logo...
                      </p>
                    ) : logoUrl ? (
                      <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-300">
                        <Check className="size-4" aria-hidden />
                        Logo salvo
                      </p>
                    ) : (
                      <p className="text-sm text-tinta-400">Logo não enviado</p>
                    )}
                    {coresDoLogo.length > 0 && (
                      <p className="mt-0.5 text-sm text-tinta-400">
                        Encontramos {coresDoLogo.length}{" "}
                        {coresDoLogo.length === 1 ? "cor" : "cores"} no seu logo.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={removerLogo}
                    className="rounded-full p-2 text-tinta-400 transition hover:bg-white/5 hover:text-red-300"
                    aria-label="Remover logo"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-linha bg-cartao px-4 py-8 text-center transition hover:border-marca-400 hover:bg-marca-50/40">
                  <ImagePlus className="size-7 text-marca-500" aria-hidden />
                  <span className="font-medium text-tinta-700">
                    Toque para escolher seu logo
                  </span>
                  <span className="text-sm text-tinta-400">
                    PNG, JPG ou SVG até 5 MB · dá para pular e enviar depois
                  </span>
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

            {/* --- Cor --- */}
            <div>
              <span className="rotulo">
                {coresDoLogo.length > 0
                  ? "A cor principal da sua marca"
                  : "Escolha a cor principal da sua marca"}
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                {paleta.map((cor, indice) => {
                  const escolhida = cor.toUpperCase() === corPrimaria.toUpperCase();
                  const doLogo = indice < coresDoLogo.length;
                  return (
                    <button
                      key={`${cor}-${indice}`}
                      type="button"
                      onClick={() => setCorPrimaria(cor)}
                      aria-label={`Usar a cor ${cor}${doLogo ? ", encontrada no seu logo" : ""}`}
                      aria-pressed={escolhida}
                      className={cn(
                        "relative size-11 rounded-xl transition",
                        escolhida
                          ? "ring-2 ring-marca-500 ring-offset-2"
                          : "ring-1 ring-linha hover:scale-105",
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

                <label className="flex size-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-linha text-xs font-medium text-tinta-400 transition hover:border-marca-400 hover:text-marca-700">
                  Outra
                  <input
                    type="color"
                    value={corPrimaria}
                    onChange={(e) => {
                      const nova = e.target.value.toUpperCase();
                      setCorPrimaria(nova);
                      setPaleta((atual) =>
                        atual.includes(nova) ? atual : [...atual, nova].slice(0, 9),
                      );
                    }}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* --- Fonte --- */}
            <div>
              <span className="rotulo">A fonte dos seus textos nas artes</span>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {FONTES.map((f) => {
                  const escolhida = f.id === fonte;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFonte(f.id)}
                      aria-pressed={escolhida}
                      className={cn(
                        "rounded-2xl border p-3 text-left transition",
                        escolhida
                          ? "border-marca-500 bg-marca-50 ring-2 ring-marca-500/20"
                          : "border-linha bg-cartao hover:border-linha",
                      )}
                    >
                      <span
                        className="block text-2xl leading-none"
                        style={{ fontFamily: fonteCss(f.id) }}
                      >
                        Aa
                      </span>
                      <span className="mt-2 block text-sm font-medium">{f.nome}</span>
                      <span className="block text-xs text-tinta-400">{f.vibe}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* --- Prévia --- */}
            <div>
              <span className="rotulo">Como vai ficar</span>
              <div
                className="flex h-32 flex-col justify-between rounded-2xl p-4"
                style={{ backgroundColor: corPrimaria }}
              >
                <div className="flex justify-end">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoPreview}
                      alt=""
                      className="size-9 rounded-full bg-cartao/90 object-contain p-1"
                    />
                  ) : (
                    <span
                      className="flex size-9 items-center justify-center rounded-full bg-cartao/90 text-sm font-bold"
                      style={{ color: corPrimaria, fontFamily: fonteCss(fonte) }}
                    >
                      {(nomeMarca || "M").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ color: corDeTextoSobre(corPrimaria) }}>
                  <p
                    className="text-xl leading-tight font-bold"
                    style={{ fontFamily: fonteCss(fonte) }}
                  >
                    {nicho || "Seu conteúdo aqui"}
                  </p>
                  <p className="mt-1 text-xs opacity-80">{nomeMarca || "Sua marca"}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {passo === 4 && (
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">
            {perguntaQuiz === 1 ? PERGUNTA_MOTIVACAO : PERGUNTA_ARQUETIPO}
          </h1>
          <p className="mt-2 text-tinta-500">
            {perguntaQuiz === 1
              ? "Não existe resposta certa. Isso define o tom de voz que a gente vai usar nos seus textos."
              : "Última pergunta — é ela que ajusta o jeito de abrir e de encerrar seus conteúdos."}
          </p>

          <div className="mt-7 flex flex-col gap-3">
            {perguntaQuiz === 1
              ? QUIZ_MOTIVACAO.map((opcao) => (
                  <button
                    key={opcao.motivacao}
                    type="button"
                    disabled={salvando}
                    onClick={() => {
                      setMotivacao(opcao.motivacao);
                      setPerguntaQuiz(2);
                    }}
                    className="rounded-2xl border border-linha bg-cartao p-4 text-left transition hover:border-marca-500 hover:bg-marca-50 disabled:opacity-60"
                  >
                    <span className="block font-medium text-tinta-700">{opcao.texto}</span>
                  </button>
                ))
              : motivacao &&
                QUIZ_ARQUETIPO[motivacao].map((opcao) => {
                  const info = ARQUETIPOS[opcao.arquetipo];
                  return (
                    <button
                      key={opcao.arquetipo}
                      type="button"
                      disabled={salvando}
                      onClick={() => finalizar(opcao.arquetipo)}
                      className="rounded-2xl border border-linha bg-cartao p-4 text-left transition hover:border-marca-500 hover:bg-marca-50 disabled:opacity-60"
                    >
                      <span className="block font-medium text-tinta-700">{opcao.texto}</span>
                      {/* O nome do arquétipo aparece discreto: quem se importa
                          entende a estratégia, quem não se importa só lê a frase. */}
                      <span className="mt-1 block text-sm text-tinta-400">
                        Perfil {info.nome} · tom {info.tom}
                      </span>
                    </button>
                  );
                })}
          </div>

          {salvando && (
            <p className="mt-5 flex items-center justify-center gap-2 text-sm text-tinta-500">
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Preparando tudo pra você...
            </p>
          )}
        </section>
      )}

      {/* --- Navegação --- */}
      <div className="mt-8 flex items-center gap-3">
        {passo > 1 && (
          <Botao
            variante="secundario"
            tamanho="grande"
            larguraTotal={passo === TOTAL_PASSOS}
            onClick={() => {
              setErro(null);
              // Dentro do quiz, voltar recua uma pergunta antes de recuar o passo.
              if (passo === 4 && perguntaQuiz === 2) {
                setPerguntaQuiz(1);
                return;
              }
              setPasso((p) => p - 1);
            }}
            disabled={salvando}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Voltar
          </Botao>
        )}

        {/* No passo 4 não existe botão de avançar: escolher a opção já é a ação. */}
        {passo < TOTAL_PASSOS && (
          <Botao
            tamanho="grande"
            larguraTotal
            onClick={avancar}
            carregando={passo === 3 && enviandoLogo}
            textoCarregando="Enviando logo..."
          >
            Continuar
            <ArrowRight className="size-4" aria-hidden />
          </Botao>
        )}
      </div>
    </div>
  );
}
