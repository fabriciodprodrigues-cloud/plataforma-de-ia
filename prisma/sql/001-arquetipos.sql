-- Arquétipos de marca e gatilhos mentais (v3).
--
-- Só adiciona: dois tipos novos e quatro colunas anuláveis. Nenhuma coluna é
-- removida ou alterada, então rodar isto num banco com dados é seguro e as
-- contas criadas antes do quiz continuam funcionando (arquetipo fica NULL).
--
-- Escrito à mão em vez de gerado pelo `prisma migrate` porque este projeto
-- nasceu com `db push` e não tem histórico de migrações — deixar o Prisma criar
-- uma linha de base agora, direto na produção, é risco desnecessário.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Arquetipo') THEN
    CREATE TYPE "Arquetipo" AS ENUM (
      'INOCENTE', 'EXPLORADOR', 'SABIO',
      'HEROI', 'FORA_DA_LEI', 'MAGO',
      'CARA_COMUM', 'BOBO_DA_CORTE', 'AMANTE',
      'CUIDADOR', 'GOVERNANTE', 'CRIADOR'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GatilhoMental') THEN
    CREATE TYPE "GatilhoMental" AS ENUM (
      'NOVIDADE', 'CURIOSIDADE', 'AUTORIDADE', 'DESAFIO',
      'EXCLUSIVIDADE', 'ANTECIPACAO', 'PROVA_SOCIAL', 'RECIPROCIDADE'
    );
  END IF;
END
$$;

ALTER TABLE "brand_kits"
  ADD COLUMN IF NOT EXISTS "arquetipo" "Arquetipo",
  ADD COLUMN IF NOT EXISTS "gatilho_preferido" "GatilhoMental";

ALTER TABLE "scripts"
  ADD COLUMN IF NOT EXISTS "gatilho_usado" "GatilhoMental",
  ADD COLUMN IF NOT EXISTS "arquetipo_usado" "Arquetipo";
