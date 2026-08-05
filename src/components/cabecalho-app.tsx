import Image from "next/image";
import Link from "next/link";
import { LogOut, Palette } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import type { UsuarioCompleto } from "@/lib/auth";

export function CabecalhoApp({ usuario }: { usuario: UsuarioCompleto }) {
  const marca = usuario.brandKit;

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/painel" className="flex min-w-0 items-center gap-2.5">
          {marca?.logoUrl ? (
            <Image
              src={marca.logoUrl}
              alt=""
              width={28}
              height={28}
              className="size-7 shrink-0 rounded-lg object-contain"
            />
          ) : (
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: marca?.corPrimaria ?? "#6d4aff" }}
              aria-hidden
            >
              {(marca?.nomeMarca ?? APP_NAME).charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate font-semibold tracking-tight">
            {marca?.nomeMarca ?? APP_NAME}
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/marca"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-tinta-700 transition hover:bg-black/5"
          >
            <Palette className="size-4" aria-hidden />
            <span className="hidden sm:inline">Minha marca</span>
          </Link>

          <form action="/auth/sair" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-tinta-500 transition hover:bg-black/5 hover:text-tinta-700"
            >
              <LogOut className="size-4" aria-hidden />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
