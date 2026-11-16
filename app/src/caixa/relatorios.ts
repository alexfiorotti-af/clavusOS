/** Relatórios do mês: fluxo, categorias, produção e comissão por profissional, top serviços, origem das clientes. */
import type { Executor } from "../db/contexto.ts";

export type Par = { rotulo: string; valor: number; n?: number };

export async function porCategoria(db: Executor, ym: string, tipo: "receita" | "despesa"): Promise<Par[]> {
  const r = await db.query<{ rotulo: string; valor: string }>(
    `SELECT categoria AS rotulo, SUM(valor)::text AS valor FROM lancamentos
      WHERE anulado_em IS NULL AND tipo = $2 AND to_char(data,'YYYY-MM') = $1
      GROUP BY categoria ORDER BY SUM(valor) DESC`, [ym, tipo]);
  return r.rows.map((x) => ({ rotulo: x.rotulo, valor: +x.valor }));
}

export type Producao = { rotulo: string; atendimentos: number; total: number; comissao_pct: number; comissao: number };
export async function producaoPorProfissional(db: Executor, ym: string): Promise<Producao[]> {
  const r = await db.query<{ rotulo: string; n: string; total: string; pct: string | null }>(
    `SELECT COALESCE(p.nome, 'Sem profissional') AS rotulo, count(*)::text AS n,
            COALESCE(SUM(a.preco),0)::text AS total, max(p.comissao_pct)::text AS pct
       FROM agendamentos a LEFT JOIN profissionais p ON p.id = a.profissional_id
      WHERE a.situacao = 'concluido' AND to_char(a.data,'YYYY-MM') = $1
      GROUP BY COALESCE(p.nome, 'Sem profissional') ORDER BY SUM(a.preco) DESC`, [ym]);
  return r.rows.map((x) => {
    const pct = x.pct == null ? 0 : +x.pct;
    const total = +x.total;
    return { rotulo: x.rotulo, atendimentos: +x.n, total, comissao_pct: pct, comissao: Math.round(total * pct / 100) };
  });
}

export async function topServicos(db: Executor, ym: string): Promise<Par[]> {
  const r = await db.query<{ rotulo: string; n: string; valor: string }>(
    `SELECT s.nome AS rotulo, count(*)::text AS n, COALESCE(SUM(a.preco),0)::text AS valor
       FROM agendamentos a JOIN servicos s ON s.id = a.servico_id
      WHERE a.situacao = 'concluido' AND to_char(a.data,'YYYY-MM') = $1
      GROUP BY s.nome ORDER BY SUM(a.preco) DESC LIMIT 8`, [ym]);
  return r.rows.map((x) => ({ rotulo: x.rotulo, valor: +x.valor, n: +x.n }));
}

/** De onde vêm as clientes novas do mês (a origem do lead rendendo relatório). */
export async function clientesPorOrigem(db: Executor, ym: string): Promise<Par[]> {
  const r = await db.query<{ rotulo: string; n: string }>(
    `SELECT origem AS rotulo, count(*)::text AS n FROM clientes
      WHERE to_char(criado_em,'YYYY-MM') = $1 GROUP BY origem ORDER BY count(*) DESC`, [ym]);
  return r.rows.map((x) => ({ rotulo: x.rotulo, valor: +x.n, n: +x.n }));
}

// ---------------------------------------------------------------------------
// Visão de decisão (D020): tendência, ritmo, agenda, dinheiro parado e recorrente.

export type Mes = { ym: string; receitas: number; despesas: number };

/** Receitas e despesas dos `n` meses que terminam em `ymFim` (meses sem movimento vêm zerados). */
export async function serieMensal(db: Executor, ymFim: string, n = 6): Promise<Mes[]> {
  const r = await db.query<{ ym: string; receitas: string; despesas: string }>(
    `SELECT to_char(m, 'YYYY-MM') AS ym,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'receita'), 0)::text AS receitas,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'despesa'), 0)::text AS despesas
       FROM generate_series(($1 || '-01')::date - make_interval(months => $2 - 1), ($1 || '-01')::date, interval '1 month') AS m
       LEFT JOIN lancamentos l ON l.anulado_em IS NULL AND date_trunc('month', l.data) = m
      GROUP BY m ORDER BY m`, [ymFim, n]);
  return r.rows.map((x) => ({ ym: x.ym, receitas: +x.receitas, despesas: +x.despesas }));
}

/** Receita acumulada dia a dia no mês: índice 0 = dia 1. */
export async function receitaAcumulada(db: Executor, ym: string, dias: number): Promise<number[]> {
  const r = await db.query<{ d: number; v: string }>(
    `SELECT extract(day FROM data)::int AS d, SUM(valor)::text AS v FROM lancamentos
      WHERE anulado_em IS NULL AND tipo = 'receita' AND to_char(data, 'YYYY-MM') = $1 GROUP BY 1`, [ym]);
  const porDia = new Array<number>(dias).fill(0);
  for (const x of r.rows) if (x.d >= 1 && x.d <= dias) porDia[x.d - 1] = +x.v;
  let soma = 0;
  return porDia.map((v) => (soma += v));
}

export type Indicadores = {
  atendimentos: number; pagos: number; faturado: number; clientes: number;
  faltas: number; cancelados: number; marcados: number; online: number;
};
/** O mês da agenda em números: atendimentos, ticket, faltas e quanto a cliente marcou sozinha. */
export async function indicadores(db: Executor, ym: string): Promise<Indicadores> {
  const r = await db.query<Record<keyof Indicadores, string>>(
    `SELECT count(*) FILTER (WHERE situacao = 'concluido')::text AS atendimentos,
            count(*) FILTER (WHERE situacao = 'concluido' AND preco > 0)::text AS pagos,
            COALESCE(SUM(preco) FILTER (WHERE situacao = 'concluido'), 0)::text AS faturado,
            count(DISTINCT cliente_id) FILTER (WHERE situacao = 'concluido')::text AS clientes,
            count(*) FILTER (WHERE situacao = 'nao_compareceu')::text AS faltas,
            count(*) FILTER (WHERE situacao = 'cancelado')::text AS cancelados,
            count(*) FILTER (WHERE situacao <> 'cancelado')::text AS marcados,
            count(*) FILTER (WHERE situacao <> 'cancelado' AND origem = 'online')::text AS online
       FROM agendamentos WHERE to_char(data, 'YYYY-MM') = $1`, [ym]);
  const x = r.rows[0];
  return {
    atendimentos: +x.atendimentos, pagos: +x.pagos, faturado: +x.faturado, clientes: +x.clientes,
    faltas: +x.faltas, cancelados: +x.cancelados, marcados: +x.marcados, online: +x.online,
  };
}

/** Horários marcados no mês por dia da semana (0=dom … 6=sáb) × período (0 manhã, 1 tarde, 2 noite). */
export async function ocupacao(db: Executor, ym: string): Promise<number[][]> {
  const r = await db.query<{ dow: number; p: number; n: string }>(
    `SELECT extract(dow FROM data)::int AS dow,
            CASE WHEN inicio < '12:00' THEN 0 WHEN inicio < '17:00' THEN 1 ELSE 2 END AS p,
            count(*)::text AS n
       FROM agendamentos
      WHERE situacao IN ('pendente', 'confirmado', 'concluido') AND to_char(data, 'YYYY-MM') = $1
      GROUP BY 1, 2`, [ym]);
  const m = Array.from({ length: 7 }, () => [0, 0, 0]);
  for (const x of r.rows) m[x.dow][x.p] = +x.n;
  return m;
}

/** Clientes com a unha vencida hoje e quanto valeria a volta delas (preço do último serviço). */
export async function dinheiroParado(db: Executor, hoje: string): Promise<{ clientes: number; valor: number }> {
  const r = await db.query<{ n: string; v: string }>(
    `SELECT count(*)::text AS n, COALESCE(SUM(s.preco), 0)::text AS v
       FROM clientes c JOIN clientes_ciclo cc ON cc.cliente_id = c.id
       LEFT JOIN servicos s ON s.studio_id = c.studio_id AND s.nome = cc.servico_nome
      WHERE cc.vence_em IS NOT NULL AND cc.vence_em < $1::date AND c.situacao <> 'inativa'`, [hoje]);
  return { clientes: +r.rows[0].n, valor: +r.rows[0].v };
}

/** Assinaturas ativas e o quanto elas garantem por mês (plano trimestral conta 1/3 por mês etc.). */
export async function recorrente(db: Executor): Promise<{ assinaturas: number; porMes: number }> {
  const r = await db.query<{ n: string; v: string }>(
    `SELECT count(*)::text AS n,
            COALESCE(round(SUM(preco::numeric / CASE periodo WHEN 'mensal' THEN 1 WHEN 'trimestral' THEN 3
                                                             WHEN 'semestral' THEN 6 ELSE 12 END)), 0)::text AS v
       FROM assinaturas_clientes WHERE situacao = 'ativa'`);
  return { assinaturas: +r.rows[0].n, porMes: +r.rows[0].v };
}
