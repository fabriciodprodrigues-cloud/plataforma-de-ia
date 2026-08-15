-- Remove generated_artes.url_final_png.
--
-- A coluna veio do modelo de dados do v3, que previa renderizar o PNG no
-- servidor. A implementação acabou fazendo a conversão no navegador (SVG →
-- canvas → arquivo), então nada nunca escreveu nela: conferido em produção,
-- 12 artes e 0 valores preenchidos, e nenhuma referência fora do schema.
--
-- DROP COLUMN não volta atrás. O que autoriza é a coluna estar comprovadamente
-- vazia — não há dado para perder, só a definição.

ALTER TABLE "generated_artes" DROP COLUMN IF EXISTS "url_final_png";
