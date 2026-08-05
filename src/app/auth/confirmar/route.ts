import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { garantirUsuarioLocal } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Destino do link de confirmação enviado por e-mail pelo Supabase.
 * Aceita os dois formatos que o Supabase pode mandar: `code` (fluxo PKCE) e
 * `token_hash` + `type` (links de confirmação/recuperação).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const proximo = searchParams.get("next") ?? "/painel";

  try {
    const supabase = await criarClienteServidor();

    const { data, error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && tipo
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
        : { data: null, error: new Error("Link inválido") };

    if (error || !data?.user) {
      return NextResponse.redirect(
        `${origin}/entrar?erro=${encodeURIComponent(
          "Esse link de confirmação expirou ou já foi usado. Tente entrar normalmente.",
        )}`,
      );
    }

    await garantirUsuarioLocal({
      id: data.user.id,
      email: data.user.email ?? "",
      nome: (data.user.user_metadata?.nome as string | undefined) ?? null,
    });

    return NextResponse.redirect(`${origin}${proximo}`);
  } catch (erro) {
    console.error("[confirmar]", erro);
    return NextResponse.redirect(
      `${origin}/entrar?erro=${encodeURIComponent(
        "Não conseguimos confirmar sua conta agora. Tente entrar normalmente.",
      )}`,
    );
  }
}
