// O Prisma 7 não lê mais o .env sozinho — precisamos carregar antes de qualquer comando.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DIRECT_URL primeiro: comandos de migração precisam de sessão, e o
    // DATABASE_URL aponta para o pooler em modo transação (porta 6543), que
    // não aguenta DDL. Fora das migrações essa variável nem é lida.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
