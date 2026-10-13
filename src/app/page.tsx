import { cookies } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { AnimacaoDeEntrada } from "@/components/animacao-de-entrada";
import { MarcaVolucks } from "@/components/logo-volucks";
import { APP_DESCRICAO, APP_NAME } from "@/lib/constants";
import {
  formatarPreco,
  listarPlanosAtivos,
  mostrarPrecosNaLanding,
  rotuloPlataformas,
  type Plan,
} from "@/lib/servicos/catalogo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `${APP_NAME} — conteúdo pronto para cada rede`,
  description: APP_DESCRICAO,
  openGraph: {
    title: `${APP_NAME} — conteúdo pronto para cada rede`,
    description:
      "Você diz do que fala e onde publica. A gente pesquisa, escreve o roteiro, cria a arte com o seu logo e sugere as hashtags.",
    type: "website",
    locale: "pt_BR",
  },
};

/**
 * Já tem sessão?
 *
 * Confere só a PRESENÇA do cookie do Supabase, sem chamar a API deles. A
 * resposta só muda o rótulo de dois botões, e não vale uma ida à rede em toda
 * visita da página mais acessada do site — ainda mais depois de o Supabase já
 * ter ficado fora do ar duas vezes. Se o cookie existir mas a sessão tiver
 * expirado, o clique cai no login, que é exatamente onde a pessoa precisa ir.
 */
async function pareceLogado(): Promise<boolean> {
  const jar = await cookies();
  return jar.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

const PASSOS = [
  {
    n: "01",
    titulo: "Conte sobre o seu negócio",
    texto:
      "Nome, nicho, as redes onde você publica e o seu logo. A gente identifica as cores da sua marca e ajusta o tom de voz com um quiz rápido.",
  },
  {
    n: "02",
    titulo: "A IA pesquisa e cria",
    texto:
      "Temas que fazem sentido pro seu nicho, roteiro ou legenda pra cada rede, arte no tamanho certo e sugestões de título e hashtags.",
  },
  {
    n: "03",
    titulo: "Grave, ajuste e publique",
    texto:
      "Edite qualquer texto antes de usar, leia o roteiro no teleprompter enquanto grava e baixe as artes prontas.",
  },
];

const RECURSOS = [
  {
    titulo: "Pesquisa do seu nicho",
    texto:
      "A gente acompanha o que está em alta no seu assunto e traz ideias que fazem sentido pra você.",
    caminho: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  },
  {
    titulo: "Roteiro e legenda prontos",
    texto:
      "Cada rede recebe um texto pensado pra ela — nada de copiar e colar a mesma coisa em todo lugar.",
    caminho: <><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4M9 12h6M9 16h6" /></>,
  },
  {
    titulo: "Arte com a sua cara",
    texto: "Capas e posts no tamanho certo de cada rede, com o seu logo e as suas cores.",
    caminho: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="m21 16-5.5-5.5L6 19" />
      </>
    ),
  },
  {
    titulo: "Título e hashtags",
    texto: "Sugestões de título, descrição e hashtags pra sua publicação ser encontrada.",
    caminho: <path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" />,
  },
  {
    titulo: "Texto com o seu jeito de falar",
    texto:
      "Um quiz rápido descobre o perfil da sua marca, e o gancho e o convite final de cada roteiro seguem esse tom.",
    caminho: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
  },
  {
    titulo: "Teleprompter embutido",
    texto:
      "Leia o roteiro na tela enquanto grava, com rolagem no ritmo da duração que você escolheu.",
    caminho: (
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4M7 8h10M7 11h7" />
      </>
    ),
  },
  {
    titulo: "Editor de vídeo com IA",
    emBreve: true,
    texto: "Cortes automáticos, legendas animadas e cards de destaque no seu vídeo gravado.",
    caminho: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3z" /></>,
  },
];

const DUVIDAS = [
  {
    p: "Preciso entender de edição ou design?",
    r: "Não. As artes saem prontas com o seu logo e as suas cores, e todo texto gerado pode ser editado por você antes de usar.",
  },
  {
    p: "As artes são geradas por IA?",
    r: "A IA monta o layout da arte (texto, cores e posição do logo), e você pode usar uma foto sua ou de um banco de imagens. A gente não cria imagens realistas do zero — isso mantém a arte sempre com a cara da sua marca.",
  },
  {
    p: "O que são créditos?",
    r: "Cada roteiro ou arte gerada usa créditos da cota do seu plano. Se acabarem antes do fim do mês, você pode comprar um pacote avulso, sem precisar trocar de plano.",
  },
  {
    p: "A pesquisa do meu nicho é compartilhada com outras pessoas?",
    r: "Não. A pesquisa e o histórico do seu nicho ficam ligados só à sua conta, mesmo que outra pessoa trabalhe com o mesmo assunto que você.",
  },
];

/**
 * Os itens de cada plano, derivados do que está no banco.
 *
 * O protótipo trazia as listas escritas à mão ("Tudo do Essencial"). Aqui elas
 * nascem dos campos do próprio plano: quando o dono mexe numa chave no admin, a
 * landing conta a verdade sozinha, em vez de virar propaganda desatualizada.
 */
function itensDoPlano(p: Plan): { texto: string; incluso: boolean }[] {
  return [
    { texto: "Roteiros e legendas por rede", incluso: true },
    { texto: "Artes com o seu logo e cores", incluso: true },
    { texto: "Título e hashtags automáticos", incluso: true },
    { texto: `${p.creditosMensais} créditos por mês`, incluso: true },
    { texto: rotuloPlataformas(p.maxPlataformas), incluso: true },
    { texto: "Teleprompter embutido", incluso: p.temTeleprompter },
    { texto: "Banco de imagens para as artes", incluso: p.temBancoImagens },
    {
      texto: p.minutosVideoMensais
        ? `Editor de vídeo (${p.minutosVideoMensais} min/mês)`
        : "Editor de vídeo com IA",
      incluso: p.temVideo,
    },
  ];
}

function Visto() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0"
      aria-hidden
    >
      <path d="m5 12 4 4 10-10" />
    </svg>
  );
}

function Traco() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      className="mt-0.5 shrink-0 opacity-60"
      aria-hidden
    >
      <path d="M6 12h12" />
    </svg>
  );
}

export default async function PaginaInicial() {
  const [logado, planos, mostrarPrecos] = await Promise.all([
    pareceLogado(),
    listarPlanosAtivos(),
    mostrarPrecosNaLanding(),
  ]);

  return (
    <>
      <AnimacaoDeEntrada />

      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-marca-700 focus:px-4 focus:py-2 focus:font-semibold focus:text-fundo"
      >
        Pular para o conteúdo
      </a>

      {/* Anéis decorativos do protótipo. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <svg
          className="absolute -top-44 -right-44 opacity-70"
          width="560"
          height="560"
          viewBox="0 0 560 560"
          fill="none"
        >
          <circle cx="280" cy="280" r="230" stroke="rgba(76,201,240,0.10)" />
          <circle cx="280" cy="280" r="160" stroke="rgba(76,201,240,0.14)" />
          <circle cx="280" cy="280" r="90" stroke="rgba(38,71,255,0.18)" />
        </svg>
        <svg
          className="absolute top-[900px] -left-60 opacity-70"
          width="480"
          height="480"
          viewBox="0 0 480 480"
          fill="none"
        >
          <circle cx="240" cy="240" r="200" stroke="rgba(38,71,255,0.10)" />
          <circle cx="240" cy="240" r="130" stroke="rgba(76,201,240,0.08)" />
        </svg>
      </div>

      <header className="sticky top-0 z-50 border-b border-linha bg-fundo/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center gap-7 px-5">
          <Link href="/" aria-label={`${APP_NAME} — início`}>
            <MarcaVolucks />
          </Link>
          <nav className="ml-3 hidden gap-6 md:flex" aria-label="Seções da página">
            {[
              ["#como-funciona", "Como funciona"],
              ["#recursos", "Recursos"],
              ["#planos", "Planos"],
              ["#faq", "Dúvidas"],
            ].map(([href, rotulo]) => (
              <a
                key={href}
                href={href}
                className="text-sm text-tinta-500 transition hover:text-tinta-900"
              >
                {rotulo}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            {logado ? (
              <Link href="/painel" className="botao-primario botao-sm">
                Ir para o painel
              </Link>
            ) : (
              <>
                <Link href="/entrar" className="botao-fantasma botao-sm hidden sm:inline-flex">
                  Entrar
                </Link>
                <Link href="/cadastro" className="botao-primario botao-sm">
                  Começar agora
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="conteudo" className="relative z-[1]">
        {/* ---------- HERO ---------- */}
        <section className="px-5 pt-16 pb-10 lg:pt-24 lg:pb-14">
          <div className="mx-auto grid w-full max-w-[1120px] items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
            <div data-revelar="">
              <p className="mb-5 inline-flex items-center gap-2 font-mono text-xs tracking-[0.08em] text-marca-700 uppercase">
                <span className="text-tinta-400">//</span>
                Feito pra quem não tem tempo de criar conteúdo
              </p>
              <h1 className="font-titulo text-[clamp(36px,5.4vw,60px)] leading-[1.12] font-bold tracking-[-0.4px]">
                Conteúdo pronto para publicar,{" "}
                <span className="bg-gradient-to-r from-marca-700 to-[#7c93ff] bg-clip-text text-transparent">
                  adaptado para cada rede social.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-[clamp(16px,1.6vw,19px)] text-tinta-500">
                Você diz do que fala e onde publica. A gente pesquisa o assunto, escreve o
                roteiro, cria a arte com o seu logo e sugere as hashtags. Em poucos minutos.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/cadastro" className="botao-primario">
                  Começar agora
                </Link>
                <Link href="/entrar" className="botao-fantasma">
                  Já tenho conta
                </Link>
              </div>
              <div className="mt-9 flex flex-wrap items-center gap-2">
                <span className="mr-1.5 text-[13px] text-tinta-400">Para</span>
                {["Instagram", "YouTube", "TikTok", "LinkedIn"].map((rede) => (
                  <span
                    key={rede}
                    className="rounded-full border border-linha bg-superficie px-3 py-1.5 text-[13px] text-tinta-500"
                  >
                    {rede}
                  </span>
                ))}
              </div>
            </div>

            <div data-revelar="" aria-hidden>
              <MockDoProduto />
            </div>
          </div>
        </section>

        {/* ---------- COMO FUNCIONA ---------- */}
        <section id="como-funciona" className="scroll-mt-20 px-5 py-16 lg:py-21">
          <div className="mx-auto w-full max-w-[1120px]">
            <div className="mb-11 max-w-[640px]" data-revelar="">
              <Kicker>Como funciona</Kicker>
              <h2 className="font-titulo text-[clamp(28px,3.6vw,42px)] leading-[1.12] font-bold">
                Do zero ao conteúdo pronto em três passos.
              </h2>
              <p className="mt-4 text-[17px] text-tinta-500">
                Sem precisar de designer, roteirista ou editor. Você só conta sobre o seu
                negócio uma vez.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {PASSOS.map((passo) => (
                <article key={passo.n} className="cartao p-7" data-revelar="">
                  <div className="mb-4 flex items-center gap-2.5 font-mono text-[13px] text-marca-700">
                    {passo.n}
                    <span className="h-px flex-1 bg-linha" />
                  </div>
                  <h3 className="mb-2.5 font-titulo text-xl font-semibold">{passo.titulo}</h3>
                  <p className="text-[15px] text-tinta-500">{passo.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- RECURSOS ---------- */}
        <section id="recursos" className="scroll-mt-20 px-5 py-16 lg:py-21">
          <div className="mx-auto w-full max-w-[1120px]">
            <div className="mb-11 max-w-[640px]" data-revelar="">
              <Kicker>Recursos</Kicker>
              <h2 className="font-titulo text-[clamp(28px,3.6vw,42px)] leading-[1.12] font-bold">
                Tudo que um conteúdo precisa, no mesmo lugar.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {RECURSOS.map((r) => (
                <article
                  key={r.titulo}
                  data-revelar=""
                  className="cartao p-6 transition hover:-translate-y-0.5 hover:border-marca-700/35"
                >
                  <div className="mb-4 flex size-[42px] items-center justify-center rounded-xl border border-marca-700/35 bg-marca-700/10 text-marca-700">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      {r.caminho}
                    </svg>
                  </div>
                  <h3 className="mb-2 flex flex-wrap items-center gap-2.5 font-titulo text-lg font-semibold">
                    {r.titulo}
                    {r.emBreve && <EmBreve />}
                  </h3>
                  <p className="text-[14.5px] text-tinta-500">{r.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- PLANOS ---------- */}
        <section id="planos" className="scroll-mt-20 px-5 py-16 lg:py-21">
          <div className="mx-auto w-full max-w-[1120px]">
            <div className="mb-11 max-w-[640px]" data-revelar="">
              <Kicker>Planos</Kicker>
              <h2 className="font-titulo text-[clamp(28px,3.6vw,42px)] leading-[1.12] font-bold">
                Comece simples. Evolua quando precisar.
              </h2>
              <p className="mt-4 text-[17px] text-tinta-500">
                Cada módulo tem a sua cota de créditos. Acabou o saldo do mês? Compre um
                pacote avulso, sem trocar de plano.
              </p>
            </div>

            {planos.length === 0 ? (
              <p className="cartao p-7 text-tinta-500">
                Os planos estão sendo atualizados. Volte em instantes.
              </p>
            ) : (
              <div
                className={cn(
                  "grid items-stretch gap-4",
                  planos.length >= 3
                    ? "md:grid-cols-2 lg:grid-cols-3"
                    : "md:grid-cols-2",
                )}
              >
                {planos.map((p) => (
                  <article
                    key={p.id}
                    data-revelar=""
                    className={cn(
                      "flex flex-col rounded-2xl border bg-cartao p-7",
                      p.destaque
                        ? "border-marca-700/35 shadow-[0_0_0_1px_rgba(76,201,240,0.35),0_30px_70px_-40px_rgba(38,71,255,0.9)]"
                        : "border-linha",
                    )}
                  >
                    <h3 className="font-titulo text-2xl font-bold">{p.nome}</h3>
                    <p className="mt-2 min-h-11 text-[14.5px] text-tinta-500">
                      {p.descricao}
                    </p>

                    {mostrarPrecos && (
                      <div className="mt-5 mb-1 font-titulo text-4xl font-bold">
                        {formatarPreco(p.precoCentavos)}
                        <small className="font-sans text-sm font-normal text-tinta-400">
                          /mês
                        </small>
                      </div>
                    )}

                    <ul className="mt-5 grid flex-1 gap-3 border-t border-linha pt-5">
                      {itensDoPlano(p).map((item) => (
                        <li
                          key={item.texto}
                          className={cn(
                            "flex items-start gap-3 text-[14.5px]",
                            item.incluso ? "text-tinta-900" : "text-tinta-400",
                          )}
                        >
                          <span className={item.incluso ? "text-marca-700" : undefined}>
                            {item.incluso ? <Visto /> : <Traco />}
                          </span>
                          {item.texto}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={`/cadastro?plano=${p.slug}`}
                      className={cn(
                        "mt-7 w-full",
                        p.destaque ? "botao-primario" : "botao-fantasma",
                      )}
                    >
                      Escolher {p.nome}
                    </Link>
                  </article>
                ))}
              </div>
            )}

            <p className="mt-6 text-center text-[13.5px] text-tinta-400">
              Você escolhe o plano ao criar a conta e pode trocar depois.
            </p>
          </div>
        </section>

        {/* ---------- DÚVIDAS ---------- */}
        <section id="faq" className="scroll-mt-20 px-5 py-16 lg:py-21">
          <div className="mx-auto w-full max-w-[1120px]">
            <div className="mb-11 max-w-[640px]" data-revelar="">
              <Kicker>Dúvidas</Kicker>
              <h2 className="font-titulo text-[clamp(28px,3.6vw,42px)] leading-[1.12] font-bold">
                Perguntas frequentes.
              </h2>
            </div>
            {/* <details> nativo: abre e fecha sem uma linha de JS, e o leitor de
                tela já sabe narrar o estado. */}
            <div className="grid max-w-[760px] gap-3" data-revelar="">
              {DUVIDAS.map((d) => (
                <details
                  key={d.p}
                  className="group rounded-2xl border border-linha bg-cartao transition open:border-marca-700/35"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-titulo text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                    {d.p}
                    <span
                      className="shrink-0 font-mono text-xl text-marca-700 transition group-open:rotate-45"
                      aria-hidden
                    >
                      +
                    </span>
                  </summary>
                  <p className="max-w-[640px] px-6 pb-5 text-[15px] text-tinta-500">{d.r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- CTA FINAL ---------- */}
        <section className="px-5 pt-5 pb-16">
          <div className="mx-auto w-full max-w-[1120px]">
            <div
              data-revelar=""
              className="rounded-3xl border border-marca-700/35 bg-cartao bg-[radial-gradient(600px_260px_at_50%_0%,rgba(38,71,255,0.28),transparent_70%)] px-6 py-16 text-center"
            >
              <h2 className="mx-auto max-w-[620px] font-titulo text-[clamp(28px,3.6vw,42px)] leading-[1.12] font-bold">
                Comece a criar conteúdo hoje.
              </h2>
              <p className="mx-auto mt-5 mb-8 max-w-[480px] text-[17px] text-tinta-500">
                Crie sua conta em poucos minutos e gere o primeiro tema do seu nicho.
              </p>
              <Link href="/cadastro" className="botao-primario">
                Criar minha conta
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-[1] mt-16 border-t border-linha px-5 py-9 pb-12">
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-5 text-sm text-tinta-400">
          <div>© {new Date().getFullYear()} Volucks. Todos os direitos reservados.</div>
          <nav className="flex gap-6" aria-label="Rodapé">
            <Link href="/entrar" className="text-tinta-500 transition hover:text-tinta-900">
              Entrar
            </Link>
            <Link href="/cadastro" className="text-tinta-500 transition hover:text-tinta-900">
              Criar conta
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3.5 font-mono text-xs tracking-[0.08em] text-marca-700 uppercase">
      <span className="text-tinta-400">// </span>
      {children}
    </p>
  );
}

function EmBreve() {
  return (
    <span className="rounded-full border border-aviso/40 bg-aviso/10 px-2 py-0.5 font-mono text-[10px] tracking-[0.06em] text-aviso uppercase">
      em breve
    </span>
  );
}

/** A janelinha do produto no hero. Puramente ilustrativa. */
function MockDoProduto() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-linha bg-cartao shadow-[0_40px_90px_-40px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-[7px] border-b border-linha bg-superficie px-4 py-3">
        <i className="size-2.5 rounded-full bg-linha-forte" />
        <i className="size-2.5 rounded-full bg-linha-forte" />
        <i className="size-2.5 rounded-full bg-linha-forte" />
        <span className="ml-2.5 font-mono text-[11px] text-tinta-400">
          exemplo · Doceria da Ana · confeitaria artesanal
        </span>
      </div>

      <div className="grid gap-5 p-5">
        <div>
          <div className="mb-2.5 flex items-center gap-2 font-mono text-[10.5px] tracking-[0.08em] text-marca-700">
            ROTEIRO · YOUTUBE
            <span className="rounded-full border border-marca-700/35 bg-marca-700/10 px-2.5 py-0.5">
              gancho: desafio
            </span>
          </div>
          <div className="grid gap-2.5">
            <i className="mb-1 block h-[11px] w-[62%] rounded bg-white/25" />
            {["96%", "88%", "92%", "54%"].map((w, i) => (
              <i
                key={i}
                className="block h-2 rounded bg-gradient-to-r from-white/15 to-white/5"
                style={{ width: w }}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["#confeitaria", "#doces", "#empreendedorismo"].map((h) => (
              <span
                key={h}
                className="rounded-full bg-marca-700/10 px-2.5 py-1 font-mono text-[11px] text-marca-700"
              >
                {h}
              </span>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2.5 text-xs text-tinta-500">
            <span>SEO</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded bg-linha">
              <i className="block h-full w-[82%] bg-gradient-to-r from-marca-500 to-marca-700" />
            </div>
            <span className="font-mono">82</span>
          </div>
        </div>

        <div>
          <div className="mb-2.5 font-mono text-[10.5px] tracking-[0.08em] text-marca-700">
            ARTES NO TAMANHO DE CADA REDE
          </div>
          <div className="flex items-end gap-3.5">
            <svg viewBox="0 0 320 180" className="h-auto min-w-0 flex-[1.6] rounded-xl">
              <rect width="320" height="180" rx="12" fill="#C65D3B" />
              <rect x="10" y="10" width="300" height="160" rx="8" fill="none" stroke="#fff" strokeOpacity=".35" />
              <text x="22" y="78" fill="#fff" fontSize="27" fontWeight="700" fontFamily="Space Grotesk,sans-serif">
                <tspan fill="#FFD166">3</tspan> erros que
              </text>
              <text x="22" y="110" fill="#fff" fontSize="27" fontWeight="700" fontFamily="Space Grotesk,sans-serif">
                iniciantes cometem
              </text>
              <text x="22" y="158" fill="#fff" fillOpacity=".85" fontSize="10" fontFamily="Inter,sans-serif">
                Doceria da Ana · YouTube
              </text>
              <circle cx="288" cy="32" r="14" fill="#fff" fillOpacity=".92" />
              <text x="288" y="37" textAnchor="middle" fill="#C65D3B" fontSize="14" fontWeight="700" fontFamily="Space Grotesk,sans-serif">
                D
              </text>
            </svg>
            <svg viewBox="0 0 200 250" className="h-auto min-w-0 flex-1 rounded-xl">
              <rect width="200" height="250" rx="12" fill="#2C4A7C" />
              <rect x="9" y="9" width="182" height="232" rx="8" fill="none" stroke="#fff" strokeOpacity=".35" />
              <rect x="18" y="18" width="72" height="18" rx="9" fill="#fff" fillOpacity=".16" />
              <text x="54" y="31" textAnchor="middle" fill="#fff" fontSize="8.5" fontFamily="JetBrains Mono,monospace">
                INSTAGRAM
              </text>
              <text x="18" y="188" fill="#fff" fontSize="17" fontWeight="600" fontFamily="Space Grotesk,sans-serif">
                O que ninguém
              </text>
              <text x="18" y="210" fill="#fff" fontSize="17" fontWeight="600" fontFamily="Space Grotesk,sans-serif">
                te conta sobre
              </text>
              <text x="18" y="231" fill="#fff" fillOpacity=".85" fontSize="9" fontFamily="Inter,sans-serif">
                Doceria da Ana
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
