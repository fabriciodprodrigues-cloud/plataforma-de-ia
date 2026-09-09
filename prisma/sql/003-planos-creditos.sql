-- Módulo de planos e créditos.
--
-- Escrito à mão, como os anteriores: este projeto nasceu de `db push` e não tem
-- histórico de migração, então `prisma migrate` pode propor um reset do banco de
-- produção. Tudo aqui é ADITIVO — nenhuma tabela ou coluna existente é tocada.
--
-- Aplicar com:  psql "$DIRECT_URL" -f prisma/sql/003-planos-creditos.sql

BEGIN;

DO $$ BEGIN
  CREATE TYPE "NomePlano" AS ENUM ('ESSENCIAL', 'CRIADOR', 'COMPLETO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StatusAssinatura" AS ENUM ('ATIVA', 'CANCELADA', 'INADIMPLENTE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TipoTransacao" AS ENUM ('CONSUMO', 'RESET_MENSAL', 'COMPRA_AVULSA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plano         "NomePlano" NOT NULL DEFAULT 'ESSENCIAL',
  status        "StatusAssinatura" NOT NULL DEFAULT 'ATIVA',
  inicio_ciclo  timestamp(3) NOT NULL DEFAULT now(),
  proximo_reset timestamp(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_balances (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  saldo_plano   integer NOT NULL DEFAULT 0,
  saldo_avulso  integer NOT NULL DEFAULT 0,
  minutos_video integer NOT NULL DEFAULT 0,
  atualizado_em timestamp(3) NOT NULL DEFAULT now()
);

-- Saldo negativo nunca é estado válido: se aparecer, é bug de débito, e é
-- melhor a transação estourar aqui do que o número errado virar cobrança.
ALTER TABLE credit_balances
  DROP CONSTRAINT IF EXISTS credit_balances_nao_negativo;
ALTER TABLE credit_balances
  ADD CONSTRAINT credit_balances_nao_negativo
  CHECK (saldo_plano >= 0 AND saldo_avulso >= 0 AND minutos_video >= 0);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo          "TipoTransacao" NOT NULL,
  origem_avulso boolean NOT NULL DEFAULT false,
  quantidade    integer NOT NULL,
  motivo        text NOT NULL,
  criado_em     timestamp(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_transactions_user_id_criado_em_idx
  ON credit_transactions (user_id, criado_em);

COMMIT;
