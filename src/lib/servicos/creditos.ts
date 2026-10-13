import { cache } from "react";
import { TipoTransacao } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { ROTULO_RECURSO, type Recurso } from "@/lib/planos";
import { listarPlanosAtivos, planoPadrao, type Plan } from "@/lib/servicos/catalogo";

/**
 * Saldo e assinatura de um usuário, já com o reset do ciclo aplicado.
 *
 * Duas travas diferentes moram aqui, e confundir as duas gera mensagem de erro
 * errada:
 *  - trava de PLANO   → o recurso não existe no plano do usuário (teleprompter,
 *    vídeo, banco de imagens). Ter crédito sobrando não ajuda; a saída é upgrade.
 *  - trava de CRÉDITO → o recurso existe, mas o saldo acabou. A saída é esperar
 *    o ciclo virar ou comprar um pacote avulso.
 */
export type Conta = {
  /** A linha de `plans`, não um enum: o catálogo é editável pelo admin. */
  plano: Plan;
  saldoPlano: number;
  saldoAvulso: number;
  minutosVideo: number;
  proximoReset: Date;
  cortesia: boolean;
};

/** Saldo que pode ser gasto agora, venha de onde vier. */
export function saldoTotal(conta: Conta): number {
  return conta.saldoPlano + conta.saldoAvulso;
}

/**
 * Soma meses respeitando o fim do mês.
 *
 * `new Date(2026, 0, 31)` mais um mês em JS puro vira 3 de março, porque 31 de
 * fevereiro transborda. Quem assinou dia 31 teria o ciclo andando sozinho para
 * frente todo mês. Aqui o dia é limitado ao último do mês de destino.
 */
function somarMes(data: Date, meses: number): Date {
  const alvo = new Date(data);
  const dia = alvo.getDate();
  alvo.setDate(1);
  alvo.setMonth(alvo.getMonth() + meses);
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(dia, ultimoDia));
  return alvo;
}

/**
 * Lê a conta do usuário, criando o que faltar e virando o ciclo se for a hora.
 *
 * O reset acontece na leitura, e não num cron: a Vercel no plano Hobby só
 * permite um cron por dia, e um usuário que assinou às 14h não deveria esperar
 * até as 9h do dia seguinte para recuperar o saldo. Como crédito de plano não
 * acumula, virar o ciclo tarde nunca tira nada de ninguém — só adia o ganho até
 * o momento em que o usuário volta, que é exatamente quando ele importa.
 *
 * Em `cache()`: o cabeçalho (no layout) e a página chamam isto na mesma
 * renderização. Medido nesta base: o `cache()` do React vale na renderização e
 * NÃO vale dentro de uma server action, e a renderização que vem depois de uma
 * action recebe escopo novo — então cachear aqui não corre risco de mostrar
 * saldo velho logo depois de um débito.
 */
export const obterConta = cache(async (userId: string): Promise<Conta> => {
  const agora = new Date();

  // As duas leituras vão juntas: `$transaction` com array manda tudo numa ida
  // só ao banco. Em sequência eram dois saltos até us-west-2, e o banco fica
  // longe das funções, que rodam em São Paulo.
  const [assinaturaExistente, saldoExistente] = await prisma.$transaction([
    prisma.subscription.findUnique({ where: { userId }, include: { plan: true } }),
    prisma.creditBalance.findUnique({ where: { userId } }),
  ]);

  // O caminho comum é as duas linhas já existirem. Só quem acabou de se
  // cadastrar paga a escrita — antes eram dois upsert em TODA leitura de
  // página, ou seja, duas escritas no banco para não mudar nada.
  const assinatura =
    assinaturaExistente ??
    (await prisma.subscription.create({
      data: {
        userId,
        planId: (await planoPadrao()).id,
        inicioCiclo: agora,
        proximoReset: somarMes(agora, 1),
      },
      include: { plan: true },
    }));

  const plano = assinatura.plan;

  // Conta nova já nasce com o saldo do mês; senão a primeira geração falharia
  // por falta de crédito logo depois do cadastro.
  const saldo =
    saldoExistente ??
    (await prisma.creditBalance.create({
      data: {
        userId,
        saldoPlano: plano.creditosMensais,
        saldoAvulso: 0,
        minutosVideo: plano.minutosVideoMensais,
      },
    }));

  if (assinatura.proximoReset > agora) {
    return {
      plano,
      saldoPlano: saldo.saldoPlano,
      saldoAvulso: saldo.saldoAvulso,
      minutosVideo: saldo.minutosVideo,
      proximoReset: assinatura.proximoReset,
      cortesia: assinatura.cortesia,
    };
  }

  // Passou da virada. Quem ficou três meses fora não ganha três cotas, ganha
  // uma — o saldo do plano não acumula.
  //
  // A conta é sempre `inicioCiclo + N meses`, nunca `proximoReset + 1 mês` em
  // cima do resultado anterior. Somar em cima de si mesmo faz a data escorregar:
  // um ciclo que começou em 31/01 viraria 28/02, depois 28/03, e o dia da
  // cobrança desceria para 28 de forma permanente. Ancorando no início, 31/01
  // rende 28/02, 31/03, 30/04 — o dia volta ao 31 sempre que o mês comporta.
  let meses = 1;
  let proximo = somarMes(assinatura.inicioCiclo, meses);
  while (proximo <= agora) {
    meses += 1;
    proximo = somarMes(assinatura.inicioCiclo, meses);
  }

  // Virada de ciclo é o momento em que um downgrade agendado entra em vigor.
  // Ele fica esperando em `planoPendenteId` justamente para não tirar, no meio
  // do mês, crédito que o usuário já pagou.
  const planoNovo = assinatura.planoPendenteId
    ? ((await prisma.plan.findUnique({ where: { id: assinatura.planoPendenteId } })) ??
      plano)
    : plano;

  await prisma.$transaction([
    prisma.subscription.update({
      where: { userId },
      data: {
        proximoReset: proximo,
        planId: planoNovo.id,
        planoPendenteId: null,
      },
    }),
    prisma.creditBalance.update({
      where: { userId },
      // saldoAvulso fica de fora de propósito: foi comprado, não é cortesia
      // mensal, e sumir com ele na virada seria tomar algo que o usuário pagou.
      data: {
        saldoPlano: planoNovo.creditosMensais,
        minutosVideo: planoNovo.minutosVideoMensais,
      },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        tipo: TipoTransacao.RESET_MENSAL,
        quantidade: planoNovo.creditosMensais,
        motivo: `Renovação do plano ${planoNovo.nome}`,
      },
    }),
  ]);

  return {
    plano: planoNovo,
    saldoPlano: planoNovo.creditosMensais,
    saldoAvulso: saldo.saldoAvulso,
    minutosVideo: planoNovo.minutosVideoMensais,
    proximoReset: proximo,
    cortesia: assinatura.cortesia,
  };
});

/** O plano do usuário libera esse recurso? */
export function temRecurso(plano: Plan, recurso: Recurso): boolean {
  switch (recurso) {
    case "teleprompter":
      return plano.temTeleprompter;
    case "bancoImagens":
      return plano.temBancoImagens;
    case "video":
      return plano.temVideo;
  }
}

/**
 * Texto de bloqueio de plano, já apontando o plano mais barato que resolve.
 *
 * Fica no servidor porque precisa consultar o catálogo. A tela recebe a frase
 * pronta — assim nenhuma regra comercial viaja para o navegador, e o texto
 * acompanha o que o admin cadastrou sem precisar de deploy.
 */
export async function mensagemUpgrade(recurso: Recurso): Promise<string> {
  const ativos = await listarPlanosAtivos();
  const necessario = ativos.find((p) => temRecurso(p, recurso));
  if (!necessario) {
    return `${ROTULO_RECURSO[recurso]} não está disponível em nenhum plano no momento.`;
  }
  return `${ROTULO_RECURSO[recurso]} faz parte do plano ${necessario.nome}.`;
}

/** Mensagem de saldo insuficiente, com a data em que o saldo volta. */
export function mensagemSemCredito(conta: Conta, custo: number): string {
  const quando = conta.proximoReset.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });
  const tem = saldoTotal(conta);
  const unidade = custo === 1 ? "crédito" : "créditos";
  return `Esta ação custa ${custo} ${unidade} e você tem ${tem}. Seu saldo volta em ${quando}, ou você pode comprar um pacote avulso.`;
}

/**
 * Confere o saldo ANTES de chamar a IA, para não gastar dinheiro de API numa
 * requisição que seria recusada no fim.
 *
 * Isto é uma checagem otimista, não uma reserva: entre a conferência e o débito
 * o saldo pode ter mudado. Quem garante a corretude é `debitar()`, que trabalha
 * com a linha travada. Aqui é só cortesia com o usuário — e economia de API.
 */
export function temSaldo(conta: Conta, custo: number): boolean {
  return saldoTotal(conta) >= custo;
}

export type ResultadoDebito =
  | { ok: true; saldoRestante: number }
  | { ok: false; erro: "sem_saldo" };

/**
 * Debita créditos DEPOIS que a ação deu certo.
 *
 * Regra de ordem: gasta primeiro o crédito do plano, que expira na virada do
 * ciclo, e só depois o avulso, que não expira. O contrário faria o usuário
 * perder o crédito comprado enquanto o da assinatura evaporava sem uso.
 *
 * O `FOR UPDATE` trava a linha do saldo até o fim da transação. Sem isso, duas
 * gerações disparadas ao mesmo tempo — o que acontece de verdade, já que o
 * estúdio gera todas as plataformas em paralelo — leriam o mesmo saldo e
 * debitariam as duas, furando a cota.
 */
export async function debitar(params: {
  userId: string;
  custo: number;
  motivo: string;
}): Promise<ResultadoDebito> {
  if (params.custo <= 0) {
    return { ok: true, saldoRestante: Number.POSITIVE_INFINITY };
  }

  return prisma.$transaction(async (tx) => {
    const linhas = await tx.$queryRaw<
      { saldo_plano: number; saldo_avulso: number }[]
    >`SELECT saldo_plano, saldo_avulso
        FROM credit_balances
       WHERE user_id = ${params.userId}::uuid
         FOR UPDATE`;

    const atual = linhas[0];
    if (!atual) return { ok: false as const, erro: "sem_saldo" as const };

    const disponivel = atual.saldo_plano + atual.saldo_avulso;
    if (disponivel < params.custo) {
      return { ok: false as const, erro: "sem_saldo" as const };
    }

    const doPlano = Math.min(atual.saldo_plano, params.custo);
    const doAvulso = params.custo - doPlano;

    await tx.creditBalance.update({
      where: { userId: params.userId },
      data: {
        saldoPlano: atual.saldo_plano - doPlano,
        saldoAvulso: atual.saldo_avulso - doAvulso,
      },
    });

    // Uma linha por origem: o extrato precisa mostrar de qual bolso saiu, senão
    // não dá para explicar ao usuário por que o avulso encolheu.
    const movimentos = [
      { quantidade: doPlano, origemAvulso: false },
      { quantidade: doAvulso, origemAvulso: true },
    ].filter((m) => m.quantidade > 0);

    await tx.creditTransaction.createMany({
      data: movimentos.map((m) => ({
        userId: params.userId,
        tipo: TipoTransacao.CONSUMO,
        origemAvulso: m.origemAvulso,
        quantidade: -m.quantidade,
        motivo: params.motivo,
      })),
    });

    return { ok: true as const, saldoRestante: disponivel - params.custo };
  });
}
