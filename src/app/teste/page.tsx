export default function PaginaTeste() {
  const dbUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <h1>🔍 Diagnóstico da Plataforma</h1>

      <div style={{ marginTop: "2rem", border: "1px solid #ccc", padding: "1rem", borderRadius: "8px" }}>
        <h2>Variáveis de Ambiente</h2>
        <p>DATABASE_URL: <strong>{dbUrl ? "✅ Configurado" : "❌ FALTANDO"}</strong></p>
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
