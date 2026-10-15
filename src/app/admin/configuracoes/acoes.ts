"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/admin/sessao";
import { registrarAuditoria } from "@/lib/admin/auditoria";
import { prisma } from "@/lib/prisma";
import { custosUnitarios, mostrarPrecosNaLanding } from "@/lib/servicos/catalogo";

export type EstadoConfig =
  | { ok: true; mensagem: string }
  | { ok: false; erro: string }
  | null;

/** Aceita "0,0723" e "0.0723" — teclado brasileiro usa vírgula. */
const numeroBr = (rotulo: string) =>
  z
    .string()
    .trim()
    .min(1, `Informe ${rotulo}.`)
    .transform((s) => Number(s.replace(",", ".")))
    .refine((n) => Number.isFinite(n) && n >= 0, `${rotulo} precisa ser 0 ou mais.`);

const esquema = z.object({
  mostrarPrecos: z.boolean(),
  custoCredito: numeroBr("o custo por crédito"),
  custoMinutoVideo: numeroBr("o custo por minuto de vídeo"),
  infraFixaMensal: numeroBr("a infraestrutura fixa"),
});

export async function salvarConfiguracoes(
  _estado: EstadoConfig,
  formData: FormData,
): Promise<EstadoConfig> {
  // Repete a checagem de papel. O middleware barra a NAVEGAÇÃO até /admin, mas
  // uma server action é um POST que chega direto aqui — sem isto, qualquer
  // usuário logado poderia invocá-la.
  const admin = await exigirAdmin();

  const validado = esquema.safeParse({
    mostrarPrecos: formData.get("mostrarPrecos") === "on",
    custoCredito: formData.get("custoCredito"),
    custoMinutoVideo: formData.get("custoMinutoVideo"),
    infraFixaMensal: formData.get("infraFixaMensal"),
  });
  if (!validado.success) {
    return { ok: false, erro: validado.error.issues[0]!.message };
  }
  const novo = validado.data;

  try {
    const [antesPrecos, antesCustos] = await Promise.all([
      mostrarPrecosNaLanding(),
      custosUnitarios(),
    ]);

    const antes = {
      mostrarPrecos: antesPrecos,
      custoCredito: antesCustos.porCredito,
      custoMinutoVideo: antesCustos.porMinutoVideo,
      infraFixaMensal: antesCustos.infraFixaMensal,
    };

    // Só grava o que mudou de verdade. Cada salvamento sem mudança criaria
    // quatro linhas novas de vigência, e o histórico — que existe justamente
    // para explicar o passado — viraria ruído.
    const mudancas: { chave: string; valorJson: object }[] = [];
    if (novo.mostrarPrecos !== antes.mostrarPrecos) {
      mudancas.push({
        chave: "mostrar_precos_landing",
        valorJson: { ativo: novo.mostrarPrecos },
      });
    }
    if (novo.custoCredito !== antes.custoCredito) {
      mudancas.push({ chave: "custo_credito", valorJson: { reais: novo.custoCredito } });
    }
    if (novo.custoMinutoVideo !== antes.custoMinutoVideo) {
      mudancas.push({
        chave: "custo_minuto_video",
        valorJson: { reais: novo.custoMinutoVideo },
      });
    }
    if (novo.infraFixaMensal !== antes.infraFixaMensal) {
      mudancas.push({
        chave: "infra_fixa_mensal",
        valorJson: { reais: novo.infraFixaMensal },
      });
    }

    if (mudancas.length === 0) {
      return { ok: true, mensagem: "Nada mudou." };
    }

    // Uma vigência só para o lote inteiro, e tudo numa transação: ou as quatro
    // chaves passam a valer juntas, ou nenhuma. Metade salva deixaria o
    // financeiro calculando com uma mistura de valores novos e velhos.
    const vigenteDesde = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.platformSetting.createMany({
        data: mudancas.map((m) => ({ ...m, vigenteDesde })),
      });
      await registrarAuditoria(
        {
          adminId: admin.id,
          acao: "salvar_configuracoes",
          alvoTipo: "configuracao",
          antes,
          depois: novo,
        },
        tx,
      );
    });

    // A landing lê os preços e o `/plano` lê o catálogo: as duas precisam
    // refletir a mudança na hora.
    revalidatePath("/");
    revalidatePath("/plano");
    revalidatePath("/admin/configuracoes");

    return {
      ok: true,
      mensagem:
        mudancas.length === 1
          ? "1 configuração atualizada."
          : `${mudancas.length} configurações atualizadas.`,
    };
  } catch (erro) {
    console.error("[salvarConfiguracoes]", erro);
    return { ok: false, erro: "Não conseguimos salvar agora. Tente de novo." };
  }
}
