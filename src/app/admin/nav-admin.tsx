"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITENS: { href: string; rotulo: string; icone: LucideIcon }[] = [
  { href: "/admin", rotulo: "Visão geral", icone: LayoutDashboard },
  { href: "/admin/usuarios", rotulo: "Usuários", icone: Users },
  { href: "/admin/planos", rotulo: "Planos", icone: Layers },
  { href: "/admin/financeiro", rotulo: "Financeiro", icone: Wallet },
  { href: "/admin/configuracoes", rotulo: "Configurações", icone: Settings },
];

export function NavAdmin() {
  const caminho = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="order-3 flex w-full gap-1.5 overflow-x-auto pb-0.5 lg:order-none lg:grid lg:w-auto lg:gap-0.5 lg:overflow-visible lg:pb-0"
    >
      {ITENS.map(({ href, rotulo, icone: Icone }) => {
        // `/admin` casa exato; o resto casa por prefixo, para uma subpágina
        // como /admin/usuarios/123 manter o item certo aceso.
        const ativo =
          href === "/admin" ? caminho === "/admin" : caminho.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm whitespace-nowrap transition",
              "lg:rounded-none lg:rounded-r-lg lg:border-l-2 lg:border-transparent",
              "border-b-2 border-transparent lg:border-b-0",
              ativo
                ? "border-marca-700 bg-marca-500/15 font-semibold text-tinta-900 lg:border-l-marca-700"
                : "text-tinta-500 hover:text-tinta-900",
            )}
          >
            <Icone
              className={cn("size-[17px] shrink-0", ativo ? "text-marca-700" : "opacity-80")}
              aria-hidden
            />
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
