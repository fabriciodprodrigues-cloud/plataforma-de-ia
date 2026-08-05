import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Cliente do Supabase para uso no servidor (Server Components, Server Actions,
 * Route Handlers). Lê e grava a sessão nos cookies da requisição.
 */
export async function criarClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaGravar) {
        try {
          for (const { name, value, options } of cookiesParaGravar) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components não podem gravar cookies. Tudo bem: quem renova a
          // sessão nesse caso é o middleware, que roda antes.
        }
      },
    },
  });
}
