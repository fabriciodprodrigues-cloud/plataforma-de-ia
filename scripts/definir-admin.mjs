/**
 * Promove uma conta existente a ADMIN_MASTER.
 *
 * Não existe tela pública para virar admin — é de propósito. O papel só é dado
 * por aqui, com acesso ao servidor e às variáveis de ambiente.
 *
 * A conta precisa EXISTIR antes: crie pelo cadastro normal da plataforma e só
 * então rode isto. O script não cria usuário nem mexe em senha; quem cuida de
 * senha é o Supabase Auth, e este script nunca a vê.
 *
 * Uso:
 *   node --env-file=.env scripts/definir-admin.mjs
 *   node --env-file=.env scripts/definir-admin.mjs outro@email.com
 *
 * Sem argumento, usa ADMIN_MASTER_EMAIL do ambiente.
 */
import pg from "pg";

const email = (process.argv[2] ?? process.env.ADMIN_MASTER_EMAIL ?? "").trim().toLowerCase();

if (!email) {
  console.error(
    "Falta o e-mail. Defina ADMIN_MASTER_EMAIL no .env ou passe como argumento:\n" +
      "  node --env-file=.env scripts/definir-admin.mjs voce@exemplo.com",
  );
  process.exit(1);
}

const conexao = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!conexao) {
  console.error("DATABASE_URL não configurada.");
  process.exit(1);
}

const cliente = new pg.Client({ connectionString: conexao });
await cliente.connect();

try {
  const { rows } = await cliente.query(
    "SELECT id, email, papel FROM users WHERE lower(email) = $1",
    [email],
  );

  if (rows.length === 0) {
    console.error(
      `Nenhuma conta com o e-mail ${email}.\n` +
        "Crie a conta pelo cadastro da plataforma primeiro e rode de novo.",
    );
    process.exit(1);
  }

  const usuario = rows[0];
  if (usuario.papel === "ADMIN_MASTER") {
    console.log(`${usuario.email} já é ADMIN_MASTER. Nada a fazer.`);
    process.exit(0);
  }

  // Promoção e auditoria na MESMA transação. Separados, uma falha no registro
  // deixaria alguém com poder de dono e sem rastro de quando ganhou — que foi
  // exatamente o que aconteceu na primeira versão deste script.
  await cliente.query("BEGIN");
  try {
    await cliente.query("UPDATE users SET papel = 'ADMIN_MASTER' WHERE id = $1", [
      usuario.id,
    ]);

    // `admin_id` é uuid e `alvo_id` é text. Passar o mesmo $1 nos dois faz o
    // Postgres recusar com "inconsistent types deduced for parameter $1" —
    // por isso o id vai duas vezes, cada uma com o seu tipo.
    await cliente.query(
      `INSERT INTO admin_audit_log (admin_id, acao, alvo_tipo, alvo_id, antes_json, depois_json)
       VALUES ($1::uuid, 'promover_admin_master', 'usuario', $2::text, $3::jsonb, $4::jsonb)`,
      [
        usuario.id,
        usuario.id,
        JSON.stringify({ papel: usuario.papel }),
        JSON.stringify({ papel: "ADMIN_MASTER", via: "scripts/definir-admin.mjs" }),
      ],
    );

    await cliente.query("COMMIT");
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  }

  console.log(`${usuario.email} agora é ADMIN_MASTER. Acesse /admin.`);
} finally {
  await cliente.end();
}
