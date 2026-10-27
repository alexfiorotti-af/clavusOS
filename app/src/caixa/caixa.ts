/**
 * O caixa: lançamentos de receita e despesa, venda de produtos (PDV com baixa
 * de estoque) e o resumo do fluxo. Lançamento não se apaga; anula-se (gerência),
 * e a anulação fica na auditoria.
 */
import type { Executor } from "../db/contexto.ts";
import { auditar } from "../db/auditar.ts";
import type { DiaISO } from "../dados/datas.ts";

export const CATEGORIAS_RECEITA = ["Serviço", "Venda de produto", "Assinatura", "Gorjeta", "Outra"];
export const CATEGORIAS_DESPESA = ["Material", "Aluguel", "Contas", "Equipamento", "Pessoal", "Comissão", "Outra"];
export const FORMAS: Record<string, string> = {
  dinheiro: "Dinheiro", pix: "Pix", cartao_credito: "Cartão de crédito", cartao_debito: "Cartão de débito",
  boleto: "Boleto", asaas: "Asaas", outro: "Outro",
};

export type Lancamento = {
  id: string; tipo: "receita" | "despesa"; categoria: string; descricao: string; valor: number;
  forma: string | null; origem: string; agendamento_id: string | null; venda_id: string | null;
  assinatura_id: string | null; profissional_id: string | null; data: DiaISO;
  criado_em: string; anulado_em: string | null; profissional_nome?: string | null;
};

export async function lancar(db: Executor, studioId: string, l: {
  tipo: "receita" | "despesa"; categoria: string; descricao: string; valor: number; forma?: string | null;
  data: DiaISO; profissionalId?: string | null; usuarioId: string | null;
}): Promise<string> {
  if (l.valor <= 0) throw new Error("O valor precisa ser maior que zero.");
  const r = await db.query<{ id: string }>(
    `INSERT INTO lancamentos (studio_id, tipo, categoria, descricao, valor, forma, origem, profissional_id, data, criado_por)
     VALUES ($1,$2,$3,$4,$5,$6,'manual',$7,$8,$9) RETURNING id`,
    [studioId, l.tipo, l.categoria, l.descricao.trim(), l.valor, l.forma ?? null, l.profissionalId ?? null, l.data, l.usuarioId]);
  await auditar(db, studioId, l.usuarioId, `caixa.${l.tipo}`, "lancamentos", r.rows[0].id, { valor: l.valor, categoria: l.categoria });
  return r.rows[0].id;
}

export async function anularLancamento(db: Executor, studioId: string, id: string, motivo: string, usuarioId: string | null): Promise<void> {
  const r = await db.query(
    "UPDATE lancamentos SET anulado_em = now(), anulado_por = $2, motivo_anulacao = $3 WHERE id = $1 AND anulado_em IS NULL",
    [id, usuarioId, motivo || "sem motivo informado"]);
  if (!r.rowCount) throw new Error("Lançamento não encontrado ou já anulado.");
  await auditar(db, studioId, usuarioId, "caixa.anular", "lancamentos", id, { motivo });
}

export async function lancamentosDoPeriodo(db: Executor, de: DiaISO, ate: DiaISO): Promise<Lancamento[]> {
  const r = await db.query<Lancamento>(
    `SELECT l.*, l.data::text AS data, p.nome AS profissional_nome FROM lancamentos l
       LEFT JOIN profissionais p ON p.id = l.profissional_id
      WHERE l.data BETWEEN $1 AND $2 ORDER BY l.data DESC, l.criado_em DESC LIMIT 500`, [de, ate]);
  return r.rows;
}

export type Resumo = { receitas: number; despesas: number; saldo: number };
export async function resumoDoPeriodo(db: Executor, de: DiaISO, ate: DiaISO): Promise<Resumo> {
  const r = await db.query<{ receitas: string; despesas: string }>(
    `SELECT COALESCE(SUM(valor) FILTER (WHERE tipo = 'receita'), 0)::text AS receitas,
            COALESCE(SUM(valor) FILTER (WHERE tipo = 'despesa'), 0)::text AS despesas
       FROM lancamentos WHERE anulado_em IS NULL AND data BETWEEN $1 AND $2`, [de, ate]);
  const receitas = +r.rows[0].receitas, despesas = +r.rows[0].despesas;
  return { receitas, despesas, saldo: receitas - despesas };
}

/** PDV: registra a venda, baixa o estoque (sem ficar negativo) e lança a receita. */
export async function venderProdutos(db: Executor, studioId: string, v: {
  itens: { produtoId: string; quantidade: number }[]; clienteId?: string | null; forma: string;
  data: DiaISO; usuarioId: string | null;
}): Promise<{ vendaId: string; total: number }> {
  const itens = v.itens.filter((i) => i.quantidade > 0);
  if (!itens.length) throw new Error("Escolha pelo menos um produto.");
  let total = 0; const nomes: string[] = [];
  const linhas: { produtoId: string; quantidade: number; preco: number }[] = [];
  for (const i of itens) {
    const p = (await db.query<{ nome: string; preco: number; estoque: number }>(
      "SELECT nome, preco, estoque FROM produtos WHERE id = $1 AND ativo", [i.produtoId])).rows[0];
    if (!p) throw new Error("Produto não encontrado.");
    if (p.estoque < i.quantidade) throw new Error(`Estoque insuficiente de ${p.nome} (tem ${p.estoque}).`);
    total += p.preco * i.quantidade;
    nomes.push(i.quantidade > 1 ? `${i.quantidade}x ${p.nome}` : p.nome);
    linhas.push({ produtoId: i.produtoId, quantidade: i.quantidade, preco: p.preco });
  }
  if (total <= 0) throw new Error("Venda sem valor.");
  const venda = await db.query<{ id: string }>(
    "INSERT INTO vendas (studio_id, cliente_id, total, forma, data, criado_por) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    [studioId, v.clienteId ?? null, total, v.forma, v.data, v.usuarioId]);
  for (const l of linhas) {
    await db.query("INSERT INTO venda_itens (studio_id, venda_id, produto_id, quantidade, preco_unit) VALUES ($1,$2,$3,$4,$5)",
      [studioId, venda.rows[0].id, l.produtoId, l.quantidade, l.preco]);
    const baixa = await db.query("UPDATE produtos SET estoque = estoque - $2 WHERE id = $1 AND estoque >= $2", [l.produtoId, l.quantidade]);
    if (!baixa.rowCount) throw new Error("O estoque mudou durante a venda; tente de novo.");
  }
  let clienteNome = "";
  if (v.clienteId) clienteNome = (await db.query<{ nome: string }>("SELECT nome FROM clientes WHERE id = $1", [v.clienteId])).rows[0]?.nome ?? "";
  await db.query(
    `INSERT INTO lancamentos (studio_id, tipo, categoria, descricao, valor, forma, origem, venda_id, data, criado_por)
     VALUES ($1,'receita','Venda de produto',$2,$3,$4,'produto',$5,$6,$7)`,
    [studioId, nomes.join(" + ") + (clienteNome ? ` — ${clienteNome}` : ""), total, v.forma, venda.rows[0].id, v.data, v.usuarioId]);
  await auditar(db, studioId, v.usuarioId, "caixa.venda", "vendas", venda.rows[0].id, { total, itens: linhas.length });
  return { vendaId: venda.rows[0].id, total };
}
