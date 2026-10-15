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
const ROTAS_PRIVADAS = ["/painel", "/onboarding", "/conteudo", "/marca", "/plano"];
/** Rotas de login/cadastro: quem já está logado não deveria ver. */
const ROTAS_DE_ENTRADA = ["/entrar", "/cadastro"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const caminho = request.nextUrl.pathname;
  const ehPrivada = ROTAS_PRIVADAS.some((r) => caminho.startsWith(r));
  const ehEntrada = ROTAS_DE_ENTRADA.some((r) => caminho.startsWith(r));
  const ehAdmin = caminho === "/admin" || caminho.startsWith("/admin/");

  // Em rota que não é privada nem de entrada, saber quem está logado não muda
  // nada — e `getUser()` é uma chamada de rede ao Supabase. A página inicial é
  // estática e pagava esse salto à toa em cada visita.
  if (!ehPrivada && !ehEntrada && !ehAdmin) return response;

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

  // O painel do dono responde 404 a quem não está logado, em vez de mandar
  // para o login. Redirecionar confirmaria que /admin existe; o 404 não conta
  // nada a quem está só tentando a sorte.
  //
  // Esta é a primeira de duas camadas: quem o papel é, só o banco sabe, e isso
  // é verificado na página e em cada server action (ver lib/admin/sessao.ts).
  // Server action é um POST que não passa por aqui — middleware sozinho nunca
  // seria proteção suficiente.
  if (!user && ehAdmin) {
    return new NextResponse(null, { status: 404 });
  }

  if (!user && ehPrivada) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.searchParams.set("proximo", caminho);
    return NextResponse.redirect(destino);
  }

  if (user && ehEntrada) {
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
