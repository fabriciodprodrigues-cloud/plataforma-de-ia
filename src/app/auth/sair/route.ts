import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await criarClienteServidor();
    await supabase.auth.signOut();
  } catch (erro) {
    console.error("[sair]", erro);
  }
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
