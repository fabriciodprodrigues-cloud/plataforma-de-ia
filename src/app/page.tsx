import Link from "next/link";
import { ArrowRight, Image as ImageIcon, Search, Sparkles, Tags } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

const beneficios = [
  {
    icone: Search,
    titulo: "Pesquisa do seu nicho",
    texto: "A gente acompanha o que está em alta no seu assunto e traz ideias que fazem sentido pra você.",
  },
  {
    icone: Sparkles,
    titulo: "Roteiro e legenda prontos",
    texto: "Cada rede recebe um texto pensado pra ela — nada de copiar e colar a mesma coisa em todo lugar.",
  },
  {
    icone: ImageIcon,
    titulo: "Arte com a sua cara",
    texto: "Capas e posts no tamanho certo de cada rede, com o seu logo e as suas cores.",
  },
  {
    icone: Tags,
    titulo: "Título e hashtags",
    texto: "Sugestões de título, descrição e hashtags pra sua publicação ser encontrada.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        <Link
          href="/entrar"
          className="rounded-full px-4 py-2 text-sm font-medium text-tinta-700 transition hover:bg-white/5"
        >
          Entrar
        </Link>
      </header>

      <section className="flex flex-1 flex-col justify-center py-12 sm:py-20">
        <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-marca-50 px-3 py-1 text-sm font-medium text-marca-700">
          <Sparkles className="size-4" aria-hidden />
          Feito pra quem não tem tempo de criar conteúdo
        </p>
        <h1 className="max-w-2xl text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
          Conteúdo pronto para publicar, adaptado para cada rede social.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-tinta-500">
          Você diz do que fala e onde publica. A gente pesquisa o assunto, escreve o
          roteiro, cria a arte com o seu logo e sugere as hashtags. Em poucos minutos.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/cadastro"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-marca-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-marca-500/25 transition hover:bg-marca-600 active:scale-[0.99]"
          >
            Começar agora, é grátis
            <ArrowRight className="size-5" aria-hidden />
          </Link>
          <Link
            href="/entrar"
            className="inline-flex items-center justify-center rounded-full border border-linha bg-cartao px-6 py-3.5 text-base font-semibold text-tinta-700 transition hover:bg-white/5"
          >
            Já tenho conta
          </Link>
        </div>
      </section>

      <section className="grid gap-4 pb-12 sm:grid-cols-2">
        {beneficios.map(({ icone: Icone, titulo, texto }) => (
          <div key={titulo} className="cartao p-5">
            <Icone className="size-6 text-marca-500" aria-hidden />
            <h2 className="mt-3 font-semibold">{titulo}</h2>
            <p className="mt-1 text-sm leading-relaxed text-tinta-500">{texto}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
