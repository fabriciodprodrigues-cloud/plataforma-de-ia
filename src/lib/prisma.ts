import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Em desenvolvimento o Next recarrega os módulos a cada alteração; sem esse cache
// global abriríamos uma conexão nova com o banco a cada save até estourar o limite.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function criarPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não configurada. Copie o .env.example para .env e preencha a conexão do banco.",
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma = globalForPrisma.prisma ?? criarPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
