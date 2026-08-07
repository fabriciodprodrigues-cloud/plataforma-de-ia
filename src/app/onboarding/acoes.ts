"use server";

import { z } from "zod";
import { Arquetipo, Plataforma } from "@/generated/prisma/enums";
import { ARQUETIPOS } from "@/lib/arquetipos";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const esquema = z.object({
  nomeMarca: z.string().trim().min(2, "Digite o nome da sua marca."),
  nicho: z.string().trim().min(3, "Conte um pouco sobre o que você fala."),
  plataformas: z
    .array(z.enum(Plataforma))
    .min(1, "Escolha pelo menos uma rede social."),
  logoUrl: z.string().url().nullable().optional(),
  corPrimaria: z
    .string()
    .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, "Cor inválida."),
  coresExtraidas: z.array(z.string()).max(8).default([]),
  fonte: z.string().min(1),
  // Opcional para não invalidar quem já tinha conta antes do quiz existir.
  arquetipo: z.enum(Arquetipo).nullable().optional(),
});

export type DadosOnboarding = z.input<typeof esquema>;

export async function concluirOnboarding(
  dados: DadosOnboarding,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const validado = esquema.safeParse(dados);
  if (!validado.success) {
    return { ok: false, erro: validado.error.issues[0]?.message ?? "Confira os dados." };
  }
  const d = validado.data;

  // O gatilho nasce do arquétipo. Fica gravado numa coluna própria porque depois
  // o usuário pode trocar só o gatilho, mantendo o arquétipo.
  const arquetipo = d.arquetipo ?? null;
  const gatilhoPreferido = arquetipo ? ARQUETIPOS[arquetipo].gatilho : null;

  try {
    const usuario = await exigirUsuario();

    await prisma.$transaction(async (tx) => {
      const campos = {
        nomeMarca: d.nomeMarca,
        logoUrl: d.logoUrl ?? null,
        corPrimaria: d.corPrimaria.toUpperCase(),
        coresExtraidas: d.coresExtraidas,
        fonte: d.fonte,
        ...(arquetipo ? { arquetipo, gatilhoPreferido } : {}),
      };

      await tx.brandKit.upsert({
        where: { userId: usuario.id },
        create: { userId: usuario.id, ...campos },
        update: campos,
      });

      // O usuário só tem um nicho no MVP: atualiza o existente em vez de duplicar.
      const nichoAtual = await tx.niche.findFirst({
        where: { userId: usuario.id },
        orderBy: { criadoEm: "asc" },
      });
      if (nichoAtual) {
        await tx.niche.update({ where: { id: nichoAtual.id }, data: { nome: d.nicho } });
      } else {
        await tx.niche.create({ data: { userId: usuario.id, nome: d.nicho } });
      }

      // Regrava as plataformas escolhidas (some com as desmarcadas).
      await tx.platformPreference.deleteMany({
        where: { userId: usuario.id, plataforma: { notIn: d.plataformas } },
      });
      for (const plataforma of d.plataformas) {
        await tx.platformPreference.upsert({
          where: { userId_plataforma: { userId: usuario.id, plataforma } },
          create: { userId: usuario.id, plataforma },
          update: {},
        });
      }

      await tx.user.update({
        where: { id: usuario.id },
        data: { onboardingConcluido: true },
      });
    });

    return { ok: true };
  } catch (erro) {
    console.error("[onboarding]", erro);
    const mensagem =
      erro instanceof Error && erro.message.includes(".env")
        ? erro.message
        : "Não conseguimos salvar suas informações agora. Tente de novo em instantes.";
    return { ok: false, erro: mensagem };
  }
}
