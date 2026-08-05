/**
 * Leitura das variáveis de ambiente com mensagem de erro em português.
 * A ideia é que, se faltar alguma chave, o erro diga exatamente o que fazer
 * em vez de aparecer um "undefined" no meio do código.
 */

function obrigatoria(nome: string, valor: string | undefined, onde: string): string {
  if (!valor || valor.trim() === "") {
    throw new Error(
      `Falta configurar ${nome} no arquivo .env. Onde pegar: ${onde}. Veja o README.md.`,
    );
  }
  return valor;
}

export function supabaseUrl() {
  return obrigatoria(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Supabase → Project Settings → API → Project URL",
  );
}

export function supabaseAnonKey() {
  return obrigatoria(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "Supabase → Project Settings → API → chave 'anon public'",
  );
}

export function supabaseServiceRoleKey() {
  return obrigatoria(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Supabase → Project Settings → API → chave 'service_role'",
  );
}

export function anthropicApiKey() {
  return obrigatoria(
    "ANTHROPIC_API_KEY",
    process.env.ANTHROPIC_API_KEY,
    "console.anthropic.com → API Keys",
  );
}

export function pexelsApiKey() {
  return obrigatoria(
    "PEXELS_API_KEY",
    process.env.PEXELS_API_KEY,
    "pexels.com/api → Get Started",
  );
}

export function storageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";
}

/**
 * Modo demonstração: entrega conteúdo de exemplo em vez de chamar a IA.
 *
 * Liga sozinho quando a ANTHROPIC_API_KEY está vazia, para dar para testar a
 * experiência inteira sem chave e sem custo. Para forçar (mesmo com a chave
 * preenchida), coloque MODO_DEMONSTRACAO=1 no .env.
 */
export function modoDemonstracao(): boolean {
  if (process.env.MODO_DEMONSTRACAO === "1") return true;
  const chave = process.env.ANTHROPIC_API_KEY;
  return !chave || chave.trim() === "";
}

/**
 * Lista o que ainda falta preencher no .env, em linguagem de gente.
 * A aplicação usa isso para avisar na tela em vez de quebrar com erro técnico.
 */
export function configuracoesPendentes(): { chave: string; oQueE: string }[] {
  const necessarias: { chave: string; valor: string | undefined; oQueE: string }[] = [
    {
      chave: "ANTHROPIC_API_KEY",
      valor: process.env.ANTHROPIC_API_KEY,
      oQueE: "a chave da IA (console.anthropic.com → API Keys)",
    },
    {
      chave: "DATABASE_URL",
      valor: process.env.DATABASE_URL?.includes("SENHA")
        ? undefined
        : process.env.DATABASE_URL,
      oQueE: "a conexão do banco (Supabase → Project Settings → Database)",
    },
    {
      chave: "NEXT_PUBLIC_SUPABASE_URL",
      valor: process.env.NEXT_PUBLIC_SUPABASE_URL,
      oQueE: "o endereço do Supabase (Project Settings → API)",
    },
    {
      chave: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      valor: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      oQueE: "a chave pública do Supabase (Project Settings → API)",
    },
    {
      chave: "SUPABASE_SERVICE_ROLE_KEY",
      valor: process.env.SUPABASE_SERVICE_ROLE_KEY,
      oQueE: "a chave secreta do Supabase (Project Settings → API)",
    },
    {
      chave: "PEXELS_API_KEY",
      valor: process.env.PEXELS_API_KEY,
      oQueE: "a chave do banco de imagens (pexels.com/api)",
    },
  ];

  return necessarias
    .filter((n) => !n.valor || n.valor.trim() === "")
    .map(({ chave, oQueE }) => ({ chave, oQueE }));
}
