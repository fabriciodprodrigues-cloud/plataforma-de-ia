import { prisma } from "@/lib/prisma";

// Sem cache: a graça desta página é dizer como o banco está agora, não no build.
export const dynamic = "force-dynamic";

/**
 * Bate no banco de verdade. Um SELECT simples é suficiente: se o host estiver
 * inalcançável (foi o que derrubou a produção — host direto do Supabase só tem
 * IPv6 e a Vercel é IPv4), o erro aparece aqui em vez de virar um 500 genérico.
 */
async function checarBanco() {
  const inicio = Date.now();
  try {
    const usuarios = await prisma.user.count();
    return { ok: true as const, usuarios, ms: Date.now() - inicio };
  } catch (erro) {
    return {
      ok: false as const,
      ms: Date.now() - inicio,
      mensagem: erro instanceof Error ? erro.message.split("\n")[0] : String(erro),
    };
  }
}

export default async function PaginaTeste() {
  const banco = await checarBanco();
  const dbUrl = process.env.DATABASE_URL;
  const viaPooler = dbUrl?.includes("pooler.supabase.com") ?? false;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <h1>🔍 Diagnóstico da Plataforma</h1>

      <div
        style={{
          marginTop: "2rem",
          border: `2px solid ${banco.ok ? "#16a34a" : "#dc2626"}`,
          padding: "1rem",
          borderRadius: "8px",
        }}
      >
        <h2>Conexão com o banco</h2>
        {banco.ok ? (
          <p>
            <strong>✅ Conectado</strong> — {banco.usuarios} usuário(s) na tabela, resposta em{" "}
            {banco.ms}ms.
          </p>
        ) : (
          <>
            <p>
              <strong>❌ Falhou</strong> após {banco.ms}ms.
            </p>
            <p style={{ fontSize: "0.85em", color: "#b91c1c" }}>{banco.mensagem}</p>
          </>
        )}
      </div>

      <div style={{ marginTop: "2rem", border: "1px solid #ccc", padding: "1rem", borderRadius: "8px" }}>
        <h2>Variáveis de Ambiente</h2>
        <p>DATABASE_URL: <strong>{dbUrl ? "✅ Configurado" : "❌ FALTANDO"}</strong></p>
        <p>
          Rota da conexão:{" "}
          <strong>
            {viaPooler
              ? "✅ pooler (IPv4 — funciona na Vercel)"
              : "❌ host direto (IPv6 — a Vercel não alcança)"}
          </strong>
        </p>
        {dbUrl && <p style={{ fontSize: "0.8em", color: "#666" }}>Começa com: {dbUrl.substring(0, 30)}...</p>}

        <p>NEXT_PUBLIC_SUPABASE_URL: <strong>{supabaseUrl ? "✅ Configurado" : "❌ FALTANDO"}</strong></p>
        <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: <strong>{anonKey ? "✅ Configurado" : "❌ FALTANDO"}</strong></p>
        <p>SUPABASE_SERVICE_ROLE_KEY: <strong>{serviceRole ? "✅ Configurado" : "❌ FALTANDO"}</strong></p>
      </div>

      <div style={{ marginTop: "2rem", backgroundColor: "#f0f0f0", padding: "1rem", borderRadius: "8px" }}>
        <h2>O que fazer:</h2>
        <ul>
          <li>Se alguma variável tiver ❌, volta em Vercel → Environment Variables e verifica</li>
          <li>Se tudo estiver ✅, o problema é com a conexão ao banco de dados</li>
          <li>Tira um screenshot desta página e me envia</li>
        </ul>
      </div>

      <p style={{ marginTop: "2rem", color: "#666" }}>
        NODE_ENV: {process.env.NODE_ENV}
      </p>
    </div>
  );
}
