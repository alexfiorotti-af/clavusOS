/** Telas do caixa (fluxo, lançamentos, PDV) e dos relatórios do mês. */
import { e } from "../http/resposta.ts";
import { opcoes } from "./base.ts";
import { reais } from "../dados/dinheiro.ts";
import { br, brCurto, mesExtenso, somarMeses, type DiaISO } from "../dados/datas.ts";
import { CATEGORIAS_DESPESA, CATEGORIAS_RECEITA, FORMAS, type Lancamento, type Resumo } from "../caixa/caixa.ts";
import type { Par, Producao } from "../caixa/relatorios.ts";
import type { Cliente } from "../clientes/clientes.ts";

export type ProdutoVenda = { id: string; nome: string; preco: number; estoque: number };

const ICONE: Record<string, string> = { servico: "💅", produto: "🛍", assinatura_cliente: "🔁", manual: "✍️" };

export function telaCaixa(o: { hoje: DiaISO; per: "hoje" | "mes"; resumo: Resumo; lst: Lancamento[]; podeAnular: boolean }): string {
  return `
<h1>Caixa</h1>
<div class="pilulas">
  <a class="pill ${o.per === "hoje" ? "ativa" : ""}" href="/caixa">Hoje</a>
  <a class="pill ${o.per === "mes" ? "ativa" : ""}" href="/caixa?per=mes">Este mês</a>
</div>
<div class="grade g3">
  <div class="cartao"><div class="num pos">${reais(o.resumo.receitas)}<small>entradas</small></div></div>
  <div class="cartao"><div class="num neg">${reais(o.resumo.despesas)}<small>saídas</small></div></div>
  <div class="cartao"><div class="num ${o.resumo.saldo >= 0 ? "gold" : "neg"}">${reais(o.resumo.saldo)}<small>saldo</small></div></div>
</div>
<div class="acoes">
  <a class="botao" href="/caixa/venda">🛍 Venda de produto</a>
  <a class="botao sec" href="/caixa/lancar?tipo=receita">➕ Receita avulsa</a>
  <a class="botao sec" href="/caixa/lancar?tipo=despesa">➖ Despesa</a>
</div>
<h2>Lançamentos</h2>
${o.lst.length ? `<div class="cartao tabela"><table>
<tr><th></th><th>Descrição</th><th>Data</th><th>Forma</th><th class="n">Valor</th>${o.podeAnular ? "<th></th>" : ""}</tr>
${o.lst.map((l) => `<tr${l.anulado_em ? ' style="opacity:.45;text-decoration:line-through"' : ""}>
<td>${l.tipo === "despesa" ? "📉" : ICONE[l.origem] ?? "✨"}</td>
<td>${e(l.descricao)}<div class="mudo">${e(l.categoria)}${l.profissional_nome ? " · " + e(l.profissional_nome) : ""}</div></td>
<td>${brCurto(l.data)}</td><td>${e(FORMAS[l.forma ?? ""] ?? l.forma ?? "")}</td>
<td class="n" style="color:${l.tipo === "despesa" ? "var(--erro)" : "var(--ok)"};font-weight:700">${l.tipo === "despesa" ? "−" : "+"} ${reais(l.valor)}</td>
${o.podeAnular ? `<td>${!l.anulado_em && l.origem !== "servico" ? `<form method="post" action="/caixa/anular"><input type="hidden" name="id" value="${l.id}"><button class="pequeno sec" data-confirmar>anular</button></form>` : ""}</td>` : ""}
</tr>`).join("")}
</table></div>` : `<div class="cartao"><p class="mudo">Nenhum lançamento ${o.per === "hoje" ? "hoje" : "neste mês"} ainda 💸</p></div>`}
<p class="mudo">💅 Atendimentos concluídos e pagamentos pelo Asaas viram receita aqui sozinhos.</p>`;
}

export function telaLancar(tipo: "receita" | "despesa", hoje: DiaISO): string {
  const cats = tipo === "despesa" ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA.filter((c) => c !== "Serviço" && c !== "Venda de produto" && c !== "Assinatura");
  return `
<h1>${tipo === "despesa" ? "Nova despesa 📉" : "Nova receita ✨"}</h1>
<form method="post" action="/caixa/lancar" class="cartao">
  <input type="hidden" name="tipo" value="${tipo}">
  <div class="linha">
    <div style="grid-column:1/-1"><label>Descrição</label><input name="descricao" required autofocus placeholder="${tipo === "despesa" ? "Ex.: compra de géis" : "Ex.: unha da vizinha"}"></div>
    <div><label>Valor (R$)</label><input name="valor" inputmode="decimal" required placeholder="0,00"></div>
    <div><label>Categoria</label><select name="categoria">${cats.map((c) => `<option>${e(c)}</option>`).join("")}</select></div>
    <div><label>Forma</label><select name="forma">${opcoes(FORMAS, "pix")}</select></div>
    <div><label>Data</label><input type="date" name="data" value="${hoje}" required></div>
  </div>
  <div class="acoes"><button>Lançar ✨</button> <a class="botao sec" href="/caixa">Voltar</a></div>
</form>`;
}

export function telaVenda(o: { produtos: ProdutoVenda[]; clientes: Cliente[] }): string {
  return `
<h1>Venda no studio 🛍</h1>
<form method="post" action="/caixa/venda" class="cartao">
  ${o.produtos.length ? `<table>
  <tr><th>Produto</th><th class="n">Preço</th><th class="n">Estoque</th><th class="n" style="width:110px">Quantidade</th></tr>
  ${o.produtos.map((p) => `<tr><td>${e(p.nome)}</td><td class="n valor">${reais(p.preco)}</td><td class="n mudo">${p.estoque}</td>
    <td class="n"><input type="number" name="q_${p.id}" min="0" max="${p.estoque}" value="0" style="text-align:right"></td></tr>`).join("")}
  </table>` : `<p class="mudo">Cadastre produtos em <a href="/configuracoes/produtos">Configurações → Produtos</a> primeiro.</p>`}
  <div class="linha" style="margin-top:14px">
    <div><label>Cliente (opcional)</label><select name="cliente_id"><option value="">—</option>
      ${o.clientes.map((c) => `<option value="${c.id}">${e(c.nome)}</option>`).join("")}</select></div>
    <div><label>Forma de pagamento</label><select name="forma">${opcoes({ pix: "Pix", dinheiro: "Dinheiro", cartao_credito: "Cartão de crédito", cartao_debito: "Cartão de débito", outro: "Outro" }, "pix")}</select></div>
  </div>
  <div class="acoes"><button>Registrar venda ✨</button> <a class="botao sec" href="/caixa">Voltar</a></div>
</form>`;
}

function barras(pares: Par[], neg = false): string {
  if (!pares.length) return `<p class="mudo">Sem dados no período.</p>`;
  const max = Math.max(...pares.map((p) => p.valor), 1);
  return pares.map((p) => `<div class="barra ${neg ? "neg" : ""}">
    <span class="rot">${e(p.rotulo)}${p.n !== undefined && p.n !== p.valor ? ` <span class="mudo">(${p.n})</span>` : ""}</span>
    <span class="trilho"><i style="width:${Math.round(p.valor / max * 100)}%"></i></span>
    <span class="num">${p.n !== undefined && p.n === p.valor ? p.n : reais(p.valor)}</span></div>`).join("");
}

export function telaRelatorios(o: {
  ym: string; resumo: Resumo; recCat: Par[]; despCat: Par[]; producao: Producao[]; topSrv: Par[]; origens: Par[];
}): string {
  return `
<h1>Relatórios</h1>
<div class="acoes"><a class="botao sec" href="/relatorios?mes=${somarMeses(o.ym + "-01", -1).slice(0, 7)}">‹</a>
<b style="text-transform:capitalize">${mesExtenso(o.ym)}</b>
<a class="botao sec" href="/relatorios?mes=${somarMeses(o.ym + "-01", 1).slice(0, 7)}">›</a></div>
<div class="grade g3">
  <div class="cartao"><div class="num pos">${reais(o.resumo.receitas)}<small>receitas</small></div></div>
  <div class="cartao"><div class="num neg">${reais(o.resumo.despesas)}<small>despesas</small></div></div>
  <div class="cartao"><div class="num ${o.resumo.saldo >= 0 ? "gold" : "neg"}">${reais(o.resumo.saldo)}<small>resultado</small></div></div>
</div>
<div class="grade g2">
  <div class="cartao"><h3>Receitas por categoria</h3>${barras(o.recCat)}</div>
  <div class="cartao"><h3>Despesas por categoria</h3>${barras(o.despCat, true)}</div>
</div>
<div class="cartao"><h3>Produção por profissional</h3>
${o.producao.length ? `<div class="tabela"><table>
<tr><th>Profissional</th><th class="n">Atend.</th><th class="n">Total</th><th class="n">Comissão</th></tr>
${o.producao.map((p) => `<tr><td>${e(p.rotulo)}</td><td class="n">${p.atendimentos}</td><td class="n valor">${reais(p.total)}</td>
<td class="n">${p.comissao_pct ? `${reais(p.comissao)} <span class="mudo">(${p.comissao_pct}%)</span>` : "—"}</td></tr>`).join("")}
</table></div>` : `<p class="mudo">Nenhum atendimento concluído no mês.</p>`}</div>
<div class="grade g2">
  <div class="cartao"><h3>Serviços mais vendidos</h3>${barras(o.topSrv)}</div>
  <div class="cartao"><h3>Clientes novas por origem</h3>${barras(o.origens)}</div>
</div>`;
}
