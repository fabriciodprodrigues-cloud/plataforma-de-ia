import { prisma } from "@/lib/prisma";

/**
 * Registra uma escrita do admin, com o estado antes e depois.
 *
 * Toda ação de escrita passa por aqui, sem exceção. O painel mexe em dinheiro,
 * saldo e acesso de outras pessoas: sem esse rastro, "por que o saldo do
 * fulano mudou?" vira uma pergunta sem resposta possível.
 *
 * Grava DENTRO da transação que fez a mudança sempre que houver uma — por isso
 * aceita um cliente de transação. Auditoria registrada fora da transação pode
 * sobreviver a um rollback e passar a mentir.
 */
export type ClientePrisma = Pick<typeof prisma, "adminAuditLog">;

export async function registrarAuditoria(
  params: {
    adminId: string;
    /** Verbo no infinitivo: "alterar_plano", "ajustar_creditos", "criar_plano". */
    acao: string;
    alvoTipo: "usuario" | "plano" | "pacote" | "configuracao" | "assinatura";
    alvoId?: string | null;
    antes?: unknown;
    depois?: unknown;
  },
  cliente: ClientePrisma = prisma,
) {
  await cliente.adminAuditLog.create({
    data: {
      adminId: params.adminId,
      acao: params.acao,
      alvoTipo: params.alvoTipo,
      alvoId: params.alvoId ?? null,
      // `?? Prisma.JsonNull` não é necessário: o campo é anulável e undefined
      // simplesmente não entra no INSERT.
      antesJson: (params.antes ?? undefined) as never,
      depoisJson: (params.depois ?? undefined) as never,
    },
  });
}
