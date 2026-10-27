/**
 * A agenda: criar, confirmar, concluir, cancelar e consultar atendimentos.
 * O choque de horário é recusado pelo banco (sem_choque); `encaixe` é a
 * exceção deliberada (gerência) e fica na auditoria.
 * Concluir lança a receita no caixa — uma vez só (índice único no banco).
 */
import type { Executor } from "../db/contexto.ts";
import { auditar } from "../db/auditar.ts";
import type { DiaISO, HoraHM } from "../dados/datas.ts";

export type Agendamento = {
  id: string; codigo: string; cliente_id: string; servico_id: string; profissional_id: string | null;
  assinatura_id: string | null; data: DiaISO; inicio: HoraHM; duracao_min: number; preco: number;
  situacao: "pendente" | "confirmado" | "concluido" | "cancelado" | "nao_compareceu";
  origem: string; encaixe: boolean; ativo: boolean; observacoes: string | null;
  criado_em: string; concluido_em: string | null;
  cliente_nome?: string; cliente_telefone?: string | null; cliente_email?: string | null;
  servico_nome?: string; servico_cor?: string; profissional_nome?: string | null;
};

const CAMPOS = `a.*, a.data::text AS data, c.nome AS cliente_nome, c.telefone AS cliente_telefone, c.email AS cliente_email,
  s.nome AS servico_nome, s.cor AS servico_cor, p.nome AS profissional_nome`;
const DE = `FROM agendamentos a JOIN clientes c ON c.id = a.cliente_id JOIN servicos s ON s.id = a.servico_id
  LEFT JOIN profissionais p ON p.id = a.profissional_id`;

export async function lerAgendamento(db: Executor, id: string): Promise<Agendamento | null> {
  const r = await db.query<Agendamento>(`SELECT ${CAMPOS} ${DE} WHERE a.id = $1`, [id]);
  return r.rows[0] ?? null;
}

export async function doDia(db: Executor, dia: DiaISO): Promise<Agendamento[]> {
  const r = await db.query<Agendamento>(`SELECT ${CAMPOS} ${DE} WHERE a.data = $1 ORDER BY a.inicio, a.criado_em`, [dia]);
  return r.rows;
}

export async function doPeriodo(db: Executor, de: DiaISO, ate: DiaISO): Promise<Agendamento[]> {
  const r = await db.query<Agendamento>(`SELECT ${CAMPOS} ${DE} WHERE a.data BETWEEN $1 AND $2 ORDER BY a.data, a.inicio`, [de, ate]);
  return r.rows;
}

export async function daCliente(db: Executor, clienteId: string, limite = 12): Promise<Agendamento[]> {
  const r = await db.query<Agendamento>(`SELECT ${CAMPOS} ${DE} WHERE a.cliente_id = $1 ORDER BY a.data DESC, a.inicio DESC LIMIT $2`, [clienteId, limite]);
  return r.rows;
}

export async function criarAgendamento(db: Executor, studioId: string, a: {
  clienteId: string; servicoId: string; profissionalId: string | null; data: DiaISO; inicio: HoraHM;
  duracaoMin?: number; preco?: number; origem?: string; encaixe?: boolean; observacoes?: string;
  assinaturaId?: string | null; usuarioId: string | null;
}): Promise<Agendamento> {
  const srv = (await db.query<{ preco: number; duracao_min: number }>("SELECT preco, duracao_min FROM servicos WHERE id = $1", [a.servicoId])).rows[0];
  if (!srv) throw new Error("Serviço não encontrado.");
  const r = await db.query<{ id: string }>(
    `INSERT INTO agendamentos (studio_id, codigo, cliente_id, servico_id, profissional_id, assinatura_id,
       data, inicio, duracao_min, preco, origem, encaixe, observacoes, criado_por)
     VALUES ($1, novo_codigo_agendamento($1), $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [studioId, a.clienteId, a.servicoId, a.profissionalId, a.assinaturaId ?? null, a.data, a.inicio,
      a.duracaoMin ?? srv.duracao_min, a.preco ?? srv.preco, a.origem ?? "balcao", a.encaixe ?? false,
      a.observacoes || null, a.usuarioId]);
  await auditar(db, studioId, a.usuarioId, "agendamento.criar", "agendamentos", r.rows[0].id,
    { data: a.data, inicio: a.inicio, encaixe: a.encaixe ?? false, origem: a.origem ?? "balcao" });
  return (await lerAgendamento(db, r.rows[0].id))!;
}

export async function remarcar(db: Executor, studioId: string, id: string, m: {
  data: DiaISO; inicio: HoraHM; profissionalId: string | null; duracaoMin?: number | null; encaixe?: boolean; usuarioId: string | null;
}): Promise<void> {
  const r = await db.query(
    `UPDATE agendamentos SET data = $2, inicio = $3, profissional_id = $4, duracao_min = COALESCE($5, duracao_min), encaixe = COALESCE($6, encaixe)
      WHERE id = $1 AND situacao IN ('pendente','confirmado')`,
    [id, m.data, m.inicio, m.profissionalId, m.duracaoMin ?? null, m.encaixe ?? null]);
  if (!r.rowCount) throw new Error("Esse atendimento não pode mais ser remarcado.");
  await auditar(db, studioId, m.usuarioId, "agendamento.remarcar", "agendamentos", id, { data: m.data, inicio: m.inicio });
}

export async function confirmar(db: Executor, studioId: string, id: string, usuarioId: string | null): Promise<void> {
  const r = await db.query("UPDATE agendamentos SET situacao = 'confirmado', confirmado_em = now() WHERE id = $1 AND situacao = 'pendente'", [id]);
  if (!r.rowCount) throw new Error("Só horário pendente se confirma.");
  await auditar(db, studioId, usuarioId, "agendamento.confirmar", "agendamentos", id, null);
}

/**
 * Concluir: muda a situação, lança a receita (uma vez — índice único cuida),
 * promove a cliente lead → ativa. A forma de pagamento entra no lançamento.
 */
export async function concluir(db: Executor, studioId: string, id: string, o: {
  forma: string | null; precoFinal?: number | null; usuarioId: string | null;
}): Promise<void> {
  const a = await lerAgendamento(db, id);
  if (!a) throw new Error("Atendimento não encontrado.");
  if (a.situacao === "concluido") throw new Error("Esse atendimento já foi concluído.");
  if (!a.ativo) throw new Error("Atendimento cancelado não se conclui.");
  const preco = o.precoFinal ?? a.preco;
  await db.query("UPDATE agendamentos SET situacao = 'concluido', concluido_em = now(), preco = $2 WHERE id = $1", [id, preco]);
  // O que já entrou pelo Asaas (sinal, por exemplo) não entra de novo: lança só a diferença.
  const jaPago = +(await db.query<{ s: string }>(
    "SELECT COALESCE(SUM(valor),0)::text AS s FROM lancamentos WHERE agendamento_id = $1 AND cobranca_id IS NOT NULL AND anulado_em IS NULL", [id])).rows[0].s;
  const restante = Math.max(preco - jaPago, 0);
  if (restante > 0) {
    await db.query(
      `INSERT INTO lancamentos (studio_id, tipo, categoria, descricao, valor, forma, origem, agendamento_id, profissional_id, data, criado_por)
       VALUES ($1,'receita','Serviço',$2,$3,$4,'servico',$5,$6,$7,$8)`,
      [studioId, `${a.servico_nome} — ${a.cliente_nome}${jaPago ? " (restante)" : ""}`, restante, o.forma, id, a.profissional_id, a.data, o.usuarioId]);
  }
  await db.query("UPDATE clientes SET situacao = 'ativa' WHERE id = $1 AND situacao = 'lead'", [a.cliente_id]);
  await auditar(db, studioId, o.usuarioId, "agendamento.concluir", "agendamentos", id, { preco, forma: o.forma });
}

export async function cancelar(db: Executor, studioId: string, id: string, o: {
  motivo: string | null; faltou?: boolean; usuarioId: string | null;
}): Promise<void> {
  const r = await db.query(
    `UPDATE agendamentos SET situacao = $2, ativo = false, cancelado_em = now(), motivo_cancelamento = $3
      WHERE id = $1 AND situacao IN ('pendente','confirmado')`,
    [id, o.faltou ? "nao_compareceu" : "cancelado", o.motivo]);
  if (!r.rowCount) throw new Error("Esse atendimento não pode mais ser cancelado.");
  await auditar(db, studioId, o.usuarioId, o.faltou ? "agendamento.faltou" : "agendamento.cancelar", "agendamentos", id, { motivo: o.motivo });
}
