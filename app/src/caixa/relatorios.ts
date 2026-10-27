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
