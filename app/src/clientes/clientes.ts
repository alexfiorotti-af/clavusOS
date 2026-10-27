/**
 * Clientes: o cadastro, a origem do lead, o aniversário e o ciclo da unha.
 * "Vencida" sai da view `clientes_ciclo` (última concluída + ciclo do serviço,
 * ou o padrão do studio) — a conta é do banco, a tela só mostra.
 */
import type { Executor } from "../db/contexto.ts";
import { auditar } from "../db/auditar.ts";
import type { DiaISO } from "../dados/datas.ts";

export const ORIGENS: Record<string, string> = {
  instagram: "Instagram", whatsapp: "WhatsApp", indicacao: "Indicação", google: "Google",
  passante: "Passou na porta", online: "Agendamento online", outra: "Outra",
};

export type Cliente = {
  id: string; nome: string; cpf: string | null; nascimento: string | null; email: string | null;
  telefone: string | null; cep: string | null; endereco: string | null; cidade: string | null; uf: string | null;
  origem: string; situacao: "lead" | "ativa" | "inativa"; observacoes: string | null;
  asaas_cliente_id: string | null; criado_em: string;
  ultima?: string | null; vence_em?: string | null; servico_nome?: string | null;
};

const CAMPOS = `c.*, c.nascimento::text AS nascimento, cc.ultima::text AS ultima, cc.vence_em::text AS vence_em, cc.servico_nome`;
const DE = `FROM clientes c LEFT JOIN clientes_ciclo cc ON cc.cliente_id = c.id`;

export async function lerCliente(db: Executor, id: string): Promise<Cliente | null> {
  const r = await db.query<Cliente>(`SELECT ${CAMPOS} ${DE} WHERE c.id = $1`, [id]);
  return r.rows[0] ?? null;
}

export async function buscarClientes(db: Executor, o: {
  q?: string; filtro?: "todas" | "vencidas" | "aniversarios" | "leads"; hoje: DiaISO; limite?: number;
}): Promise<Cliente[]> {
  const cond: string[] = []; const params: unknown[] = [];
  if (o.q) { params.push(`%${o.q.toLowerCase()}%`, o.q.replace(/\D/g, "") || "—"); cond.push(`(lower(c.nome) LIKE $${params.length - 1} OR c.telefone LIKE '%' || $${params.length} || '%')`); }
  const hojeP = () => { params.push(o.hoje); return `$${params.length}::date`; };
  if (o.filtro === "vencidas") cond.push(`cc.vence_em IS NOT NULL AND cc.vence_em < ${hojeP()} AND c.situacao <> 'inativa'`);
  if (o.filtro === "aniversarios") cond.push(`c.nascimento IS NOT NULL AND to_char(c.nascimento,'MM') = to_char(${hojeP()},'MM')`);
  if (o.filtro === "leads") cond.push(`c.situacao = 'lead'`);
  const ordem = o.filtro === "vencidas" ? "cc.vence_em" : o.filtro === "aniversarios" ? "to_char(c.nascimento,'DD')" : "lower(c.nome)";
  const r = await db.query<Cliente>(
    `SELECT ${CAMPOS} ${DE} ${cond.length ? "WHERE " + cond.join(" AND ") : ""} ORDER BY ${ordem} LIMIT ${Math.min(o.limite ?? 200, 500)}`, params);
  return r.rows;
}

export type Contagens = { total: number; vencidas: number; aniversarios: number; leads: number };
export async function contagens(db: Executor, hoje: DiaISO): Promise<Contagens> {
  const r = await db.query<{ total: string; vencidas: string; aniversarios: string; leads: string }>(
    `SELECT count(*)::text AS total,
       count(*) FILTER (WHERE cc.vence_em IS NOT NULL AND cc.vence_em < $1::date AND c.situacao <> 'inativa')::text AS vencidas,
       count(*) FILTER (WHERE c.nascimento IS NOT NULL AND to_char(c.nascimento,'MM') = to_char($1::date,'MM'))::text AS aniversarios,
       count(*) FILTER (WHERE c.situacao = 'lead')::text AS leads
     ${DE}`, [hoje]);
  const x = r.rows[0];
  return { total: +x.total, vencidas: +x.vencidas, aniversarios: +x.aniversarios, leads: +x.leads };
}

export async function salvarCliente(db: Executor, studioId: string, c: {
  id?: string | null; nome: string; cpf?: string; nascimento?: string; email?: string; telefone?: string;
  cep?: string; endereco?: string; cidade?: string; uf?: string;
  origem?: string; situacao?: string; observacoes?: string; usuarioId: string | null;
}): Promise<string> {
  const tel = (c.telefone ?? "").replace(/\D/g, "") || null;
  const vals = [c.nome.trim(), c.cpf?.replace(/\D/g, "") || null, c.nascimento || null, c.email?.trim().toLowerCase() || null,
    tel, c.cep || null, c.endereco || null, c.cidade || null, c.uf || null,
    c.origem && c.origem in ORIGENS ? c.origem : "outra", c.situacao === "lead" ? "lead" : c.situacao === "inativa" ? "inativa" : "ativa",
    c.observacoes || null];
  if (c.id) {
    await db.query(
      `UPDATE clientes SET nome=$2, cpf=$3, nascimento=$4, email=$5, telefone=$6, cep=$7, endereco=$8, cidade=$9, uf=$10, origem=$11, situacao=$12, observacoes=$13 WHERE id=$1`,
      [c.id, ...vals]);
    await auditar(db, studioId, c.usuarioId, "cliente.editar", "clientes", c.id, null);
    return c.id;
  }
  const r = await db.query<{ id: string }>(
    `INSERT INTO clientes (studio_id, nome, cpf, nascimento, email, telefone, cep, endereco, cidade, uf, origem, situacao, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`, [studioId, ...vals]);
  await auditar(db, studioId, c.usuarioId, "cliente.criar", "clientes", r.rows[0].id, { origem: vals[9] });
  return r.rows[0].id;
}

/** Acha pelo telefone/e-mail (agendamento online reaproveita a cliente). */
export async function acharPorContato(db: Executor, telefone: string | null, email: string | null): Promise<Cliente | null> {
  const tel = telefone?.replace(/\D/g, "") || null;
  if (!tel && !email) return null;
  const r = await db.query<Cliente>(
    `SELECT ${CAMPOS} ${DE} WHERE ($1::text IS NOT NULL AND c.telefone = $1) OR ($2::text IS NOT NULL AND lower(c.email) = lower($2)) LIMIT 1`,
    [tel, email || null]);
  return r.rows[0] ?? null;
}
