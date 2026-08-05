"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Plataforma } from "@/generated/prisma/enums";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type Resultado = { ok: true } | { ok: false; erro: string };

const esquema = z.object({
  nomeMarca: z.string().trim().min(2, "Digite o nome da sua marca."),
  nicho: z.string().trim().min(3, "Conte sobre o que você fala."),
  plataformas: z.array(z.enum(Plataforma)).min(1, "Escolha pelo menos uma rede social."),
  logoUrl: z.string().url().nullable(),
  corPrimaria: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, "Cor inválida."),
  coresExtraidas: z.array(z.string()).max(8),
  fonte: z.string().min(1),
});

export type DadosMarcaForm = z.input<typeof esquema>;

export async function salvarMarca(dados: DadosMarcaForm): Promise<Resultado> {
  const validado = esquema.safeParse(dados);
  if (!validado.success) {
    return { ok: false, erro: validado.error.issues[0].message };
  }
  const d = validado.data;

  try {
    const usuario = await exigirUsuario();

    await prisma.$transaction(async (tx) => {
      await tx.brandKit.upsert({
        where: { userId: usuario.id },
        create: {
          userId: usuario.id,
          nomeMarca: d.nomeMarca,
          logoUrl: d.logoUrl,
          corPrimaria: d.corPrimaria.toUpperCase(),
          coresExtraidas: d.coresExtraidas,
          fonte: d.fonte,
        },
        update: {
          nomeMarca: d.nomeMarca,
          logoUrl: d.logoUrl,
          corPrimaria: d.corPrimaria.toUpperCase(),
          coresExtraidas: d.coresExtraidas,
          fonte: d.fonte,
        },
      });

      const nicho = usuario.niches[0];
      if (nicho) {
        await tx.niche.update({ where: { id: nicho.id }, data: { nome: d.nicho } });
      } else {
        await tx.niche.create({ data: { userId: usuario.id, nome: d.nicho } });
      }

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
    });

    revalidatePath("/marca");
    revalidatePath("/painel");
    return { ok: true };
  } catch (erro) {
    console.error("[salvarMarca]", erro);
    return { ok: false, erro: "Não conseguimos salvar suas alterações agora." };
  }
}
