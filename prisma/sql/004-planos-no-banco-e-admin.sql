-- Planos no banco + base do painel admin.
--
-- Diferente das anteriores, esta migração NÃO é só aditiva: `user_subscriptions`
-- deixa de guardar o plano como enum e passa a apontar para a tabela `plans`.
-- A coluna antiga só é removida depois do backfill, e o backfill casa pelo slug
-- (ESSENCIAL -> 'essencial'), então nenhuma assinatura existente se perde.
--
-- Aplicar com:  npx prisma db execute --file prisma/sql/004-planos-no-banco-e-admin.sql

-- ALTER TYPE ... ADD VALUE fica FORA do bloco transacional de propósito: em
-- Postgres o valor novo de um enum não pode ser usado na mesma transação que o
-- criou, e algumas versões recusam a instrução dentro de BEGIN.
ALTER TYPE "TipoTransacao" ADD VALUE IF NOT EXISTS 'AJUSTE_ADMIN';

BEGIN;

DO $$ BEGIN
  CREATE TYPE "PapelUsuario" AS ENUM ('USER', 'ADMIN_MASTER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StatusPagamento" AS ENUM ('PAGO', 'PENDENTE', 'FALHOU', 'REEMBOLSADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- catálogo ----------

CREATE TABLE IF NOT EXISTS plans (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text NOT NULL UNIQUE,
  nome                  text NOT NULL,
  descricao             text NOT NULL,
  preco_centavos        integer NOT NULL,
  creditos_mensais      integer NOT NULL,
  minutos_video_mensais integer NOT NULL DEFAULT 0,
  max_plataformas       integer NOT NULL,
  tem_teleprompter      boolean NOT NULL DEFAULT false,
  tem_banco_imagens     boolean NOT NULL DEFAULT false,
  tem_video             boolean NOT NULL DEFAULT false,
  ativo                 boolean NOT NULL DEFAULT true,
  ordem_exibicao        integer NOT NULL DEFAULT 0,
  destaque              boolean NOT NULL DEFAULT false,
  stripe_product_id     text,
  stripe_price_id       text,
  criado_em             timestamp(3) NOT NULL DEFAULT now(),
  atualizado_em         timestamp(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plans_ativo_ordem_idx ON plans (ativo, ordem_exibicao);

ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_valores_sensatos;
ALTER TABLE plans ADD CONSTRAINT plans_valores_sensatos
  CHECK (preco_centavos >= 0 AND creditos_mensais >= 0
         AND minutos_video_mensais >= 0 AND max_plataformas >= 0);

-- Os três planos que já existiam em src/lib/planos.ts, com os mesmos valores.
-- max_plataformas = 0 significa ilimitadas (era 4 no código, que era o total de
-- redes existentes — virava mentira no dia em que entrasse a quinta).
INSERT INTO plans (slug, nome, descricao, preco_centavos, creditos_mensais,
                   minutos_video_mensais, max_plataformas, tem_teleprompter,
                   tem_banco_imagens, tem_video, ordem_exibicao, destaque)
VALUES
  ('essencial', 'Essencial', 'Texto e arte para começar a publicar com consistência.',
   4700, 40, 0, 1, false, false, false, 1, false),
  ('criador', 'Criador', 'Mais volume e as ferramentas para gravar com segurança.',
   9700, 120, 0, 3, true, true, false, 2, true),
  ('completo', 'Completo', 'Tudo da plataforma, incluindo a edição de vídeo.',
   19700, 300, 60, 0, true, true, true, 3, false)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS credit_packs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text NOT NULL UNIQUE,
  nome              text NOT NULL,
  quantidade        integer NOT NULL,
  preco_centavos    integer NOT NULL,
  tipo              text NOT NULL DEFAULT 'credito',
  ativo             boolean NOT NULL DEFAULT true,
  ordem_exibicao    integer NOT NULL DEFAULT 0,
  stripe_product_id text,
  stripe_price_id   text,
  criado_em         timestamp(3) NOT NULL DEFAULT now(),
  atualizado_em     timestamp(3) NOT NULL DEFAULT now()
);

INSERT INTO credit_packs (slug, nome, quantidade, preco_centavos, tipo, ordem_exibicao)
VALUES
  ('p', 'Pacote P', 30, 3900, 'credito', 1),
  ('m', 'Pacote M', 80, 8900, 'credito', 2),
  ('g', 'Pacote G', 200, 17900, 'credito', 3),
  ('video30', 'Vídeo extra', 30, 5900, 'minuto_video', 4)
ON CONFLICT (slug) DO NOTHING;

-- ---------- configuração com vigência ----------

CREATE TABLE IF NOT EXISTS platform_settings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave          text NOT NULL,
  valor_json     jsonb NOT NULL,
  vigente_desde  timestamp(3) NOT NULL DEFAULT now(),
  criado_em      timestamp(3) NOT NULL DEFAULT now(),
  UNIQUE (chave, vigente_desde)
);
CREATE INDEX IF NOT EXISTS platform_settings_chave_vigencia_idx
  ON platform_settings (chave, vigente_desde);

-- Custos unitários da planilha. Guardados em reais com decimais, e não em
-- centavos inteiros, porque são TAXAS (R$ 0,0723 por crédito), não quantias —
-- arredondar para 7 ou 8 centavos distorceria a estimativa em até 10%.
-- Dinheiro de verdade (preços, pagamentos) continua em centavos inteiros.
INSERT INTO platform_settings (chave, valor_json)
VALUES
  ('mostrar_precos_landing', '{"ativo": false}'::jsonb),
  ('custo_credito',          '{"reais": 0.0723}'::jsonb),
  ('custo_minuto_video',     '{"reais": 0.162}'::jsonb),
  ('infra_fixa_mensal',      '{"reais": 891}'::jsonb)
ON CONFLICT (chave, vigente_desde) DO NOTHING;

-- ---------- usuários: papel e suspensão ----------

ALTER TABLE users ADD COLUMN IF NOT EXISTS papel "PapelUsuario" NOT NULL DEFAULT 'USER';
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspenso_em timestamp(3);

-- ---------- assinatura: enum -> chave estrangeira ----------

ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS plan_id uuid;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS cortesia boolean NOT NULL DEFAULT false;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS plano_pendente_id uuid;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Backfill: ESSENCIAL -> 'essencial'. Só roda se a coluna antiga ainda existir,
-- para a migração poder ser reaplicada sem quebrar.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'user_subscriptions' AND column_name = 'plano'
  ) THEN
    UPDATE user_subscriptions s
       SET plan_id = p.id
      FROM plans p
     WHERE p.slug = lower(s.plano::text)
       AND s.plan_id IS NULL;
  END IF;
END $$;

-- Rede de segurança: qualquer assinatura que tenha escapado do backfill cai no
-- Essencial em vez de travar o NOT NULL. Melhor um plano errado e visível que
-- uma migração pela metade.
UPDATE user_subscriptions
   SET plan_id = (SELECT id FROM plans WHERE slug = 'essencial')
 WHERE plan_id IS NULL;

ALTER TABLE user_subscriptions ALTER COLUMN plan_id SET NOT NULL;

ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_plan_id_fkey;
ALTER TABLE user_subscriptions
  ADD CONSTRAINT user_subscriptions_plan_id_fkey
  FOREIGN KEY (plan_id) REFERENCES plans(id);

CREATE INDEX IF NOT EXISTS user_subscriptions_plan_status_idx
  ON user_subscriptions (plan_id, status);

ALTER TABLE user_subscriptions DROP COLUMN IF EXISTS plano;
DROP TYPE IF EXISTS "NomePlano";

-- ---------- ledger: quem ajustou ----------

ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS criado_por_admin_id uuid;
CREATE INDEX IF NOT EXISTS credit_transactions_criado_em_tipo_idx
  ON credit_transactions (criado_em, tipo);

-- ---------- auditoria e pagamentos ----------

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acao        text NOT NULL,
  alvo_tipo   text NOT NULL,
  alvo_id     text,
  antes_json  jsonb,
  depois_json jsonb,
  criado_em   timestamp(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_criado_em_idx ON admin_audit_log (criado_em);

CREATE TABLE IF NOT EXISTS payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_event_id text NOT NULL UNIQUE,
  tipo            text NOT NULL,
  descricao       text NOT NULL,
  valor_centavos  integer NOT NULL,
  moeda           text NOT NULL DEFAULT 'BRL',
  status          "StatusPagamento" NOT NULL,
  criado_em       timestamp(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_criado_em_status_idx ON payments (criado_em, status);

COMMIT;
