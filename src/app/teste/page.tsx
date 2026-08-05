export default function PaginaTeste() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>✅ Servidor está funcionando!</h1>
      <p>DATABASE_URL configurado: {process.env.DATABASE_URL ? "SIM" : "NÃO"}</p>
      <p>NODE_ENV: {process.env.NODE_ENV}</p>
      <p>Próximo passo: verificar conexão com o banco...</p>
    </div>
  );
}
