-- Troca Stripe por Asaas no modelo de dados.
--
-- O prompt original assumia Stripe. O dono escolheu Asaas, que é um gateway
-- brasileiro (Pix, boleto e cartão), e o modelo dos dois é diferente o bastante
-- para mudar o schema:
--
--  * Asaas NÃO tem Product/Price. A assinatura carrega `value` direto. Some
--    toda a mecânica de "criar Price novo e arquivar o antigo" — o preço vive
--    na nossa tabela `plans` e vai como valor na hora de criar a assinatura.
--    Por isso stripe_product_id e stripe_price_id são removidos, e não
--    renomeados: não existe o que guardar neles.
--  * O webhook do Asaas não assina o corpo. Ele manda um token estático no
--    header `asaas-access-token`. A validação vira comparação de string, não
--    verificação de assinatura.
--  * Entrega "at least once", deduplicada pelo id do evento.
--
-- Nada aqui perde dado: as colunas do Stripe nunca chegaram a ser preenchidas.
--
-- Aplicar com:  npx prisma db execute --file prisma/sql/005-asaas-no-lugar-do-stripe.sql

BEGIN;

ALTER TABLE plans        DROP COLUMN IF EXISTS stripe_product_id;
ALTER TABLE plans        DROP COLUMN IF EXISTS stripe_price_id;
ALTER TABLE credit_packs DROP COLUMN IF EXISTS stripe_product_id;
ALTER TABLE credit_packs DROP COLUMN IF EXISTS stripe_price_id;

-- Asaas exige um `customer` para criar assinatura ou cobrança. É dele que o
-- id abaixo vem, criado na primeira cobrança do usuário.
ALTER TABLE users ADD COLUMN IF NOT EXISTS asaas_cliente_id text;
CREATE UNIQUE INDEX IF NOT EXISTS users_asaas_cliente_id_key
  ON users (asaas_cliente_id) WHERE asaas_cliente_id IS NOT NULL;

ALTER TABLE user_subscriptions RENAME COLUMN stripe_subscription_id TO asaas_assinatura_id;

-- Dedupe do webhook.
ALTER TABLE payments RENAME COLUMN stripe_event_id TO asaas_evento_id;
ALTER INDEX IF EXISTS payments_stripe_event_id_key RENAME TO payments_asaas_evento_id_key;

-- Guardar também o id da COBRANÇA, não só o do evento.
--
-- Deduplicar pelo id do evento protege contra reenvio do mesmo evento. Não
-- protege contra PAYMENT_CONFIRMED e PAYMENT_RECEIVED chegarem para a MESMA
-- cobrança: são eventos diferentes, com ids diferentes, e os dois significam
-- "foi pago". Sem esta coluna, a mesma cobrança entraria duas vezes na receita.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS asaas_cobranca_id text;
CREATE INDEX IF NOT EXISTS payments_asaas_cobranca_idx ON payments (asaas_cobranca_id);

-- Uma cobrança só pode ter UMA linha de receita. O índice parcial deixa o banco
-- recusar a segunda, em vez de depender de o código lembrar de conferir.
CREATE UNIQUE INDEX IF NOT EXISTS payments_cobranca_unica
  ON payments (asaas_cobranca_id)
  WHERE asaas_cobranca_id IS NOT NULL AND status IN ('PAGO', 'PENDENTE');

COMMIT;
