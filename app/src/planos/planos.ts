/**
 * Planos e assinaturas das clientes — o studio vendendo recorrência.
 *
 * O plano diz período (mensal/trimestral/semestral/anual), preço do período,
 * visitas por mês e o serviço incluído. A assinatura é a cliente num plano,
 * com os dias do mês que ELA escolheu e o horário preferido.
 *
 * Cobrança: com o Asaas do studio conectado, a assinatura vira uma assinatura
 * no Asaas (ciclo nativo) e a cliente recebe a fatura sozinha; o webhook/rotina
 * confere na API e empurra `pago_ate`. Sem Asaas, a gerência registra o
 * recebimento manualmente — o sistema funciona dos dois jeitos.
 */
import type { Executor } from "../db/contexto.ts";
import { auditar } from "../db/auditar.ts";
import type { Studio } from "../studio/studio.ts";
import { somarMeses, type DiaISO, type HoraHM } from "../dados/datas.ts";
import { datasDoMes } from "../agenda/horarios.ts";
import { criarAgendamento } from "../agenda/agenda.ts";
import { clienteAsaas, clienteAsaasId } from "../cobrancas/cobrancas.ts";
import { CICLO_DO_PERIODO, type Fetch } from "../cobrancas/asaas.ts";

export const MESES_DO_PERIODO: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };

export type Plano = {
  id: string; nome: string; periodo: "mensal" | "trimestral" | "semestral" | "anual";
  preco: number; visitas_mes: number; servico_id: string; ativo: boolean; servico_nome?: string;
};

export type AssinaturaCliente = {
  id: string; cliente_id: string; plano_id: string; preco: number; periodo: Plano["periodo"];
  dias_mes: number[]; hora: HoraHM; profissional_id: string | null; inicio: string; pago_ate: string | null;
  asaas_assinatura_id: string | null; situacao: "ativa" | "cancelada";
  cliente_nome?: string; plano_nome?: string; servico_id?: string; profissional_nome?: string | null;
};

export async function listarPlanos(db: Executor): Promise<Plano[]> {
  const r = await db.query<Plano>(
    "SELECT p.*, s.nome AS servico_nome FROM planos p JOIN servicos s ON s.id = p.servico_id ORDER BY p.nome");
  return r.rows;
}

export async function salvarPlano(db: Executor, studioId: string, p: {
  id?: string | null; nome: string; periodo: string; preco: number; visitasMes: number; servicoId: string; usuarioId: string | null;
}): Promise<void> {
  const periodo = p.periodo in MESES_DO_PERIODO ? p.periodo : "mensal";
  if (p.id) {
    await db.query("UPDATE planos SET nome=$2, periodo=$3, preco=$4, visitas_mes=$5, servico_id=$6 WHERE id=$1",
      [p.id, p.nome.trim(), periodo, p.preco, p.visitasMes, p.servicoId]);
  } else {
    await db.query("INSERT INTO planos (studio_id, nome, periodo, preco, visitas_mes, servico_id) VALUES ($1,$2,$3,$4,$5,$6)",
      [studioId, p.nome.trim(), periodo, p.preco, p.visitasMes, p.servicoId]);
  }
  await auditar(db, studioId, p.usuarioId, "plano.salvar", "planos", p.id ?? null, { nome: p.nome, preco: p.preco });
}

export async function assinaturasAtivas(db: Executor): Promise<AssinaturaCliente[]> {
  const r = await db.query<AssinaturaCliente>(
    `SELECT a.*, a.inicio::text AS inicio, a.pago_ate::text AS pago_ate, c.nome AS cliente_nome,
            p.nome AS plano_nome, p.servico_id, pr.nome AS profissional_nome
       FROM assinaturas_clientes a JOIN clientes c ON c.id = a.cliente_id JOIN planos p ON p.id = a.plano_id
       LEFT JOIN profissionais pr ON pr.id = a.profissional_id
      WHERE a.situacao = 'ativa' ORDER BY c.nome`);
  return r.rows;
}

export async function assinaturaDaCliente(db: Executor, clienteId: string): Promise<AssinaturaCliente | null> {
  const r = await db.query<AssinaturaCliente>(
    `SELECT a.*, a.inicio::text AS inicio, a.pago_ate::text AS pago_ate, p.nome AS plano_nome, p.servico_id
       FROM assinaturas_clientes a JOIN planos p ON p.id = a.plano_id
      WHERE a.cliente_id = $1 AND a.situacao = 'ativa' LIMIT 1`, [clienteId]);
  return r.rows[0] ?? null;
}

/**
 * Vende a assinatura. Com Asaas do studio: cria a assinatura lá (ciclo nativo,
 * fatura em que a cliente escolhe Pix/boleto/cartão) e devolve a URL da 1ª fatura.
 * Sem Asaas: nasce para cobrança manual (botão "registrar recebimento").
 */
export async function venderAssinatura(db: Executor, studio: Studio, chaveMestra: string | null, v: {
  clienteId: string; planoId: string; diasMes: number[]; hora: HoraHM; profissionalId?: string | null;
  inicio: DiaISO; usuarioId: string | null;
}, fetchFn?: Fetch): Promise<{ id: string; urlFatura: string | null }> {
  const plano = (await db.query<Plano>("SELECT * FROM planos WHERE id = $1 AND ativo", [v.planoId])).rows[0];
  if (!plano) throw new Error("Plano não encontrado.");
  const dias = [...new Set(v.diasMes)].filter((d) => d >= 1 && d <= 28).sort((a, b) => a - b);
  if (!dias.length) throw new Error("Escolha pelo menos um dia do mês.");
  if (dias.length > plano.visitas_mes) throw new Error(`Esse plano inclui ${plano.visitas_mes} visita${plano.visitas_mes > 1 ? "s" : ""} por mês.`);
  const ja = await db.query("SELECT 1 FROM assinaturas_clientes WHERE cliente_id = $1 AND situacao = 'ativa'", [v.clienteId]);
  if (ja.rowCount) throw new Error("Essa cliente já tem uma assinatura ativa.");

  let asaasId: string | null = null, urlFatura: string | null = null;
  if (studio.asaas_chave_cifrada) {
    const asaas = clienteAsaas(studio, chaveMestra, fetchFn);
    const clienteAsaasRef = await clienteAsaasId(db, asaas, v.clienteId);
    const ass = await asaas.criarAssinatura({
      clienteId: clienteAsaasRef, valorCentavos: plano.preco, primeiroVencimento: v.inicio,
      descricao: `${plano.nome} · ${studio.nome}`, referencia: `assinatura-plano:${v.clienteId}`,
      ciclo: CICLO_DO_PERIODO[plano.periodo],
    });
    asaasId = ass.id;
  }
  const r = await db.query<{ id: string }>(
    `INSERT INTO assinaturas_clientes (studio_id, cliente_id, plano_id, preco, periodo, dias_mes, hora, profissional_id, inicio, asaas_assinatura_id, criado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [studio.id, v.clienteId, plano.id, plano.preco, plano.periodo, dias, v.hora, v.profissionalId ?? null, v.inicio, asaasId, v.usuarioId]);
  const id = r.rows[0].id;

  if (asaasId) {
    // Espelha a 1ª fatura para a tela (e para o webhook achar depois).
    try {
      const asaas = clienteAsaas(studio, chaveMestra, fetchFn);
      const cobs = await asaas.cobrancasDaAssinatura(asaasId);
      for (const cob of cobs) {
        await db.query(
          `INSERT INTO cobrancas (studio_id, cliente_id, assinatura_id, finalidade, meio, valor, vencimento, situacao, asaas_id, url_fatura)
           VALUES ($1,$2,$3,'assinatura','link',$4,$5,'pendente',$6,$7) ON CONFLICT (asaas_id) DO NOTHING`,
          [studio.id, v.clienteId, id, Math.round(cob.value * 100), cob.dueDate, cob.id, cob.invoiceUrl ?? cob.bankSlipUrl ?? null]);
        urlFatura = urlFatura ?? cob.invoiceUrl ?? cob.bankSlipUrl ?? null;
      }
    } catch (e) { console.error("[assinatura-cliente] criada, 1ª fatura ainda não veio:", (e as Error).message); }
  }
  await auditar(db, studio.id, v.usuarioId, "assinatura_cliente.vender", "assinaturas_clientes", id,
    { plano: plano.nome, preco: plano.preco, dias, asaas: asaasId });
  return { id, urlFatura };
}

/** Recebimento manual (sem Asaas, ou pago por fora): entra no caixa e empurra `pago_ate`. */
export async function registrarRecebimento(db: Executor, studioId: string, assinaturaId: string, forma: string, hoje: DiaISO, usuarioId: string | null): Promise<DiaISO> {
  const a = (await db.query<AssinaturaCliente & { cliente_nome: string; plano_nome: string }>(
    `SELECT a.*, a.pago_ate::text AS pago_ate, c.nome AS cliente_nome, p.nome AS plano_nome
       FROM assinaturas_clientes a JOIN clientes c ON c.id = a.cliente_id JOIN planos p ON p.id = a.plano_id
      WHERE a.id = $1 AND a.situacao = 'ativa'`, [assinaturaId])).rows[0];
  if (!a) throw new Error("Assinatura não encontrada.");
  const base = a.pago_ate && a.pago_ate > hoje ? a.pago_ate : hoje;
  const novo = somarMeses(base, MESES_DO_PERIODO[a.periodo]);
  await db.query("UPDATE assinaturas_clientes SET pago_ate = $2 WHERE id = $1", [assinaturaId, novo]);
  await db.query(
    `INSERT INTO lancamentos (studio_id, tipo, categoria, descricao, valor, forma, origem, assinatura_id, data, criado_por)
     VALUES ($1,'receita','Assinatura',$2,$3,$4,'assinatura_cliente',$5,$6,$7)`,
    [studioId, `${a.plano_nome} — ${a.cliente_nome}`, a.preco, forma, assinaturaId, hoje, usuarioId]);
  await auditar(db, studioId, usuarioId, "assinatura_cliente.receber", "assinaturas_clientes", assinaturaId, { valor: a.preco, pago_ate: novo });
  return novo;
}

export async function cancelarAssinaturaCliente(db: Executor, studio: Studio, chaveMestra: string | null, assinaturaId: string, usuarioId: string | null, fetchFn?: Fetch): Promise<void> {
  const a = (await db.query<{ asaas_assinatura_id: string | null }>(
    "SELECT asaas_assinatura_id FROM assinaturas_clientes WHERE id = $1 AND situacao = 'ativa'", [assinaturaId])).rows[0];
  if (!a) throw new Error("Assinatura não encontrada.");
  if (a.asaas_assinatura_id && studio.asaas_chave_cifrada) {
    try { await clienteAsaas(studio, chaveMestra, fetchFn).cancelarAssinatura(a.asaas_assinatura_id); }
    catch (e) { if (!/404|não encontrad|not found/i.test((e as Error).message)) throw e; }
  }
  await db.query("UPDATE assinaturas_clientes SET situacao = 'cancelada', cancelada_em = now() WHERE id = $1", [assinaturaId]);
  await auditar(db, studio.id, usuarioId, "assinatura_cliente.cancelar", "assinaturas_clientes", assinaturaId, null);
}

/**
 * Gera na agenda os horários do mês da assinatura (dias escolhidos pela cliente,
 * no horário preferido, preço 0 — coberto pelo plano). Pula dia passado e dia em
 * que a cliente já tem horário ativo; choque com outra cliente é recusado pelo
 * banco e o dia é pulado com contagem.
 */
export async function gerarHorariosDoMes(db: Executor, studioId: string, assinaturaId: string, ym: string, hoje: DiaISO, usuarioId: string | null): Promise<{ criados: number; pulados: number }> {
  const a = (await db.query<AssinaturaCliente & { servico_id: string }>(
    `SELECT a.*, p.servico_id FROM assinaturas_clientes a JOIN planos p ON p.id = a.plano_id
      WHERE a.id = $1 AND a.situacao = 'ativa'`, [assinaturaId])).rows[0];
  if (!a) throw new Error("Assinatura não encontrada.");
  let criados = 0, pulados = 0;
  for (const data of datasDoMes(ym, a.dias_mes)) {
    if (data < hoje) { pulados++; continue; }
    const ja = await db.query("SELECT 1 FROM agendamentos WHERE cliente_id = $1 AND data = $2 AND ativo", [a.cliente_id, data]);
    if (ja.rowCount) { pulados++; continue; }
    await db.query("SAVEPOINT gera_dia");   // o choque recusado pelo banco não derruba os outros dias
    try {
      await criarAgendamento(db, studioId, {
        clienteId: a.cliente_id, servicoId: a.servico_id, profissionalId: a.profissional_id,
        data, inicio: a.hora, preco: 0, origem: "assinatura", assinaturaId: a.id, usuarioId,
        observacoes: "Horário da assinatura",
      });
      await db.query("RELEASE SAVEPOINT gera_dia");
      criados++;
    } catch { await db.query("ROLLBACK TO SAVEPOINT gera_dia"); pulados++; }
  }
  await auditar(db, studioId, usuarioId, "assinatura_cliente.gerar_mes", "assinaturas_clientes", assinaturaId, { ym, criados, pulados });
  return { criados, pulados };
}
