import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { NavAdmin } from "./nav-admin";
import { LogoVolucks } from "@/components/logo-volucks";
import { exigirAdmin, iniciais } from "@/lib/admin/sessao";

export const metadata: Metadata = {
  title: { default: "Admin Master", template: "%s · Admin Master" },
  // O painel do dono não tem o que fazer em buscador nenhum.
  robots: { index: false, follow: false },
};

export default async function LayoutAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  // Primeira coisa do layout: quem não é ADMIN_MASTER recebe 404 aqui, antes de
  // qualquer página filha renderizar. As páginas e as actions repetem a
  // checagem — ela é barata (em cache por requisição) e cada uma precisa valer
  // por si, porque uma server action não passa pelo layout.
  const admin = await exigirAdmin();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="flex flex-wrap items-center gap-2.5 border-b border-linha bg-superficie px-4 py-3.5 lg:sticky lg:top-0 lg:h-dvh lg:flex-col lg:items-stretch lg:gap-1.5 lg:border-r lg:border-b-0 lg:px-3.5 lg:py-5">
        <div className="flex items-center gap-2.5 px-2 font-titulo text-base font-bold">
          <LogoVolucks />
          <span>
            VOLUCKS <b className="text-marca-700">IA</b>
          </span>
        </div>

        <p className="ml-auto px-2 font-mono text-[10.5px] tracking-[0.08em] text-tinta-400 lg:ml-0 lg:pt-1.5 lg:pb-4">
          ADMIN MASTER
        </p>

        <NavAdmin />

        {/* Rodapé da barra: só no desktop, onde há espaço vertical sobrando. */}
        <div className="mt-auto hidden items-center gap-2.5 border-t border-linha px-2 pt-3 lg:flex">
          <span
            className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-marca-500 to-marca-700 text-xs font-bold text-white"
            aria-hidden
          >
            {iniciais(admin.nome, admin.email)}
          </span>
          <div className="min-w-0 flex-1">
            <b className="block truncate text-sm">{admin.nome ?? "Admin Master"}</b>
            <small className="block truncate text-[11.5px] text-tinta-400">
              {admin.email}
            </small>
          </div>
        </div>

        <div className="hidden gap-2 lg:flex">
          <Link
            href="/painel"
            className="flex-1 rounded-lg px-2 py-2 text-center text-xs text-tinta-500 transition hover:text-tinta-900"
          >
            Ver como usuário
          </Link>
          <form action="/auth/sair" method="post" className="flex">
            <button
              type="submit"
              className="rounded-lg px-2 py-2 text-tinta-500 transition hover:text-tinta-900"
              aria-label="Sair"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </form>
        </div>
      </aside>

      <main
        id="conteudo"
        tabIndex={-1}
        className="w-full max-w-[1240px] px-4 pt-6 pb-16 outline-none sm:px-8 lg:pt-8"
      >
        {children}
      </main>
    </div>
  );
}
