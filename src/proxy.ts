import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Roda antes de cada requisição. Faz duas coisas:
 *  - renova a sessão do Supabase (senão o usuário é deslogado do nada);
 *  - barra quem não está logado nas áreas internas.
 *
 * No Next.js 16 esse arquivo se chama `proxy.ts` (antes era `middleware.ts`).
 */

/** Rotas que exigem estar logado. */
const ROTAS_PRIVADAS = ["/painel", "/onboarding", "/conteudo", "/marca"];
/** Rotas de login/cadastro: quem já está logado não deveria ver. */
const ROTAS_DE_ENTRADA = ["/entrar", "/cadastro"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Sem as chaves configuradas não dá para validar sessão nenhuma — deixamos passar
  // para o app conseguir subir e mostrar a mensagem de configuração na tela.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGravar) {
        for (const { name, value } of cookiesParaGravar) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesParaGravar) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() valida o token no servidor do Supabase e renova a sessão se preciso.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;

  if (!user && ROTAS_PRIVADAS.some((r) => caminho.startsWith(r))) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.searchParams.set("proximo", caminho);
    return NextResponse.redirect(destino);
  }

  if (user && ROTAS_DE_ENTRADA.some((r) => caminho.startsWith(r))) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/painel";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return response;
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e imagens.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
