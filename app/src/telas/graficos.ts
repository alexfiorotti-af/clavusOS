/**
 * Gráficos dos relatórios, desenhados no servidor em HTML/CSS (e SVG só no traço da linha).
 * Sem biblioteca e sem script: o texto é texto de verdade (nítido no celular e no notebook),
 * o passar do mouse usa `title`, e todo gráfico traz "Ver os números" com a tabela.
 *
 * Regras (skill dataviz + af-interface-saas): uma cor de destaque (a do studio, `--cor`) e o
 * cinza-ameixa para contexto; barras finas com ponta arredondada saindo da base; linha de 2px;
 * grade em fio, nunca tracejada; nada de pizza/rosca; título diz o que o gráfico mostra.
 */
import { e } from "../http/resposta.ts";
import { reais } from "../dados/dinheiro.ts";

/** "R$ 1,2 mil" / "R$ 830" — para eixos e rótulos curtos. */
export function reaisCurto(centavos: number): string {
  const r = Math.round(centavos / 100);
  const s = r < 0 ? "-" : "";
  const a = Math.abs(r);
  if (a >= 1_000_000) return `${s}R$ ${(a / 1_000_000).toFixed(1).replace(".", ",").replace(",0", "")} mi`;
  if (a >= 1000) return `${s}R$ ${(a / 1000).toFixed(a >= 10_000 ? 0 : 1).replace(".", ",").replace(",0", "")} mil`;
  return `${s}R$ ${a}`;
}

/** Um teto "redondo" para o eixo: 1, 2 ou 5 × 10^k acima do maior valor. */
export function tetoRedondo(max: number): number {
  if (max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= max) return m * p;
  return 10 * p;
}

const pct = (v: number, max: number) => (max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : 0);

function tabela(cab: string[], linhas: string[][], numericas = new Set<number>([1, 2, 3, 4])): string {
  return `<details class="gr-tabela"><summary>Ver os números</summary><div class="tabela"><table>
<tr>${cab.map((c, i) => `<th${numericas.has(i) ? ' class="n"' : ""}>${e(c)}</th>`).join("")}</tr>
${linhas.map((l) => `<tr>${l.map((c, i) => `<td${numericas.has(i) ? ' class="n"' : ""}>${e(c)}</td>`).join("")}</tr>`).join("")}
</table></div></details>`;
}

// ---------------------------------------------------------------- colunas agrupadas
export type Serie = { nome: string; classe: "s1" | "s2"; valores: number[] };

/** Colunas lado a lado por período (ex.: entrou × saiu, mês a mês). `destaque` = índice do período em foco. */
export function colunas(o: { rotulos: string[]; nomes?: string[]; series: Serie[]; destaque?: number; rotuloAria: string }): string {
  const max = tetoRedondo(Math.max(0, ...o.series.flatMap((s) => s.valores)));
  const ticks = [0, max / 2, max];
  const legenda = o.series.length > 1
    ? `<div class="gr-legenda">${o.series.map((s) => `<span><i class="${s.classe}"></i>${e(s.nome)}</span>`).join("")}</div>` : "";
  const cols = o.rotulos.map((r, i) => {
    const dica = `${o.nomes?.[i] ?? r}: ` + o.series.map((s) => `${s.nome.toLowerCase()} ${reais(s.valores[i])}`).join(", ");
    const barras = o.series.map((s) => `<i class="${s.classe}" style="height:${pct(s.valores[i], max).toFixed(1)}%"></i>`).join("");
    const topo = i === o.destaque && o.series[0].valores[i] > 0
      ? `<b class="gr-cap" style="bottom:calc(${Math.max(...o.series.map((s) => pct(s.valores[i], max))).toFixed(1)}% + 4px)">${e(reaisCurto(o.series[0].valores[i]))}</b>` : "";
    return `<div class="gr-col${i === o.destaque ? " foco" : ""}" title="${e(dica)}"><div class="gr-barras">${topo}${barras}</div><span class="gr-x">${e(r)}</span></div>`;
  }).join("");
  return `<figure class="gr gr-colunas" role="img" aria-label="${e(o.rotuloAria)}">${legenda}
<div class="gr-plot">${ticks.map((t) => `<div class="gr-fio" style="bottom:${pct(t, max)}%"><span>${e(reaisCurto(t))}</span></div>`).join("")}
<div class="gr-cols">${cols}</div></div></figure>
${tabela(["Mês", ...o.series.map((s) => s.nome)], o.rotulos.map((r, i) => [o.nomes?.[i] ?? r, ...o.series.map((s) => reais(s.valores[i]))]))}`;
}

// ---------------------------------------------------------------- linhas acumuladas
/** Duas linhas acumuladas no mês (atual × anterior). `corte` = até que dia a linha atual vai (mês em curso). */
export function ritmo(o: { atual: number[]; anterior: number[]; corte: number; nomeAtual: string; nomeAnterior: string }): string {
  const dias = Math.max(o.atual.length, o.anterior.length);
  const atual = o.atual.slice(0, o.corte);
  const max = tetoRedondo(Math.max(1, ...atual, ...o.anterior));
  const x = (i: number, n: number) => (n <= 1 ? 0 : (i / (dias - 1)) * 100);
  const y = (v: number) => 100 - pct(v, max);
  const caminho = (vs: number[]) => vs.map((v, i) => `${i ? "L" : "M"}${x(i, dias).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");
  const area = atual.length > 1 ? `${caminho(atual)} L${x(atual.length - 1, dias).toFixed(2)} 100 L0 100 Z` : "";
  const fimA = atual.length ? { x: x(atual.length - 1, dias), y: y(atual[atual.length - 1]) } : null;
  const fimB = o.anterior.length ? { x: x(o.anterior.length - 1, dias), y: y(o.anterior[o.anterior.length - 1]) } : null;
  const marcas = [1, 10, 20, dias].filter((d, i, a) => a.indexOf(d) === i);
  const tab = Array.from({ length: dias }, (_, i) => [String(i + 1), i < atual.length ? reais(atual[i]) : "—", i < o.anterior.length ? reais(o.anterior[i]) : "—"])
    .filter((_, i) => i === 0 || (i + 1) % 5 === 0 || i === dias - 1 || i === atual.length - 1);
  return `<figure class="gr gr-ritmo" role="img" aria-label="Receita acumulada dia a dia: ${e(o.nomeAtual)} comparado com ${e(o.nomeAnterior)}">
<div class="gr-legenda"><span><i class="s1"></i>${e(o.nomeAtual)}</span><span><i class="s2"></i>${e(o.nomeAnterior)}</span></div>
<div class="gr-plot">${[0, max / 2, max].map((t) => `<div class="gr-fio" style="bottom:${pct(t, max)}%"><span>${e(reaisCurto(t))}</span></div>`).join("")}
<svg class="gr-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
${o.anterior.length > 1 ? `<path class="l2" d="${caminho(o.anterior)}" vector-effect="non-scaling-stroke"/>` : ""}
${area ? `<path class="a1" d="${area}"/>` : ""}
${atual.length > 1 ? `<path class="l1" d="${caminho(atual)}" vector-effect="non-scaling-stroke"/>` : ""}
</svg>
${fimB ? `<i class="gr-ponto s2" style="left:${fimB.x}%;top:${fimB.y}%" title="${e(o.nomeAnterior)}: ${e(reais(o.anterior[o.anterior.length - 1]))}"></i>` : ""}
${fimA ? `<i class="gr-ponto s1" style="left:${fimA.x}%;top:${fimA.y}%" title="${e(o.nomeAtual)} até o dia ${atual.length}: ${e(reais(atual[atual.length - 1]))}"></i>` : ""}
</div>
<div class="gr-eixo-x">${marcas.map((d) => `<span style="left:${x(d - 1, dias)}%">${d}</span>`).join("")}</div>
</figure>
${tabela(["Dia", o.nomeAtual, o.nomeAnterior], tab)}`;
}

// ---------------------------------------------------------------- mapa de calor
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_LONGOS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const PERIODOS = ["Manhã", "Tarde", "Noite"];

/** Dias da semana × períodos, mais escuro onde a agenda encheu. Só os dias e períodos em que o studio abre. */
export function calor(o: { matriz: number[][]; dias: number[]; periodos: number[] }): string {
  const vals = o.dias.flatMap((d) => o.periodos.map((p) => o.matriz[d][p]));
  const max = Math.max(1, ...vals);
  const nivel = (v: number) => (v === 0 ? 0 : Math.min(5, Math.ceil((v / max) * 5)));
  const cab = `<span></span>${o.periodos.map((p) => `<b>${PERIODOS[p]}</b>`).join("")}`;
  const linhas = o.dias.map((d) => `<span class="gr-dia">${DIAS[d]}</span>${o.periodos.map((p) => {
    const v = o.matriz[d][p];
    return `<span class="gr-cel n${nivel(v)}" title="${DIAS_LONGOS[d]}, ${PERIODOS[p].toLowerCase()}: ${v} horário${v === 1 ? "" : "s"}">${v}</span>`;
  }).join("")}`).join("");
  return `<figure class="gr gr-calor" role="img" aria-label="Horários marcados por dia da semana e período">
<div class="gr-grade-calor" style="grid-template-columns:44px repeat(${o.periodos.length},minmax(0,1fr))">${cab}${linhas}</div>
<div class="gr-escala"><span>menos</span>${[0, 1, 2, 3, 4, 5].map((n) => `<i class="gr-cel n${n}"></i>`).join("")}<span>mais</span></div>
</figure>`;
}
export const diaLongo = (d: number) => DIAS_LONGOS[d];

// ---------------------------------------------------------------- barras ranqueadas
export type Item = { rotulo: string; valor: number; texto?: string; detalhe?: string };

/** Lista de barras: nome e valor na linha de cima, a barra fina embaixo. Uma cor só. */
export function ranking(itens: Item[], o: { vazio: string; neutra?: boolean } = { vazio: "Sem movimento no mês." }): string {
  if (!itens.length) return `<p class="mudo">${e(o.vazio)}</p>`;
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return `<div class="gr-rank${o.neutra ? " neutra" : ""}">${itens.map((i) => `<div class="gr-item" title="${e(i.rotulo)}: ${e(i.texto ?? reais(i.valor))}">
<div class="gr-topo"><span>${e(i.rotulo)}${i.detalhe ? ` <small>${e(i.detalhe)}</small>` : ""}</span><b>${e(i.texto ?? reais(i.valor))}</b></div>
<div class="gr-trilho"><i style="width:${pct(i.valor, max).toFixed(1)}%"></i></div></div>`).join("")}</div>`;
}

// ---------------------------------------------------------------- barra empilhada (equipe)
export type Parte = { rotulo: string; detalhe: string; total: number; partes: [number, number] };

/** Uma barra por pessoa, dividida em duas partes (ex.: fica no studio × comissão). */
export function empilhadas(itens: Parte[], nomes: [string, string]): string {
  if (!itens.length) return `<p class="mudo">Nenhum atendimento concluído no mês.</p>`;
  const max = Math.max(1, ...itens.map((i) => i.total));
  return `<div class="gr-legenda"><span><i class="s1"></i>${e(nomes[0])}</span><span><i class="s2"></i>${e(nomes[1])}</span></div>
<div class="gr-rank equipe">${itens.map((i) => `<div class="gr-item" title="${e(i.rotulo)}: ${e(nomes[0].toLowerCase())} ${e(reais(i.partes[0]))}, ${e(nomes[1].toLowerCase())} ${e(reais(i.partes[1]))}">
<div class="gr-topo"><span>${e(i.rotulo)} <small>${e(i.detalhe)}</small></span><b>${e(reais(i.total))}</b></div>
<div class="gr-trilho"><div class="gr-pilha" style="width:${pct(i.total, max).toFixed(1)}%">${i.partes.map((v, k) => v > 0 ? `<i class="s${k + 1}" style="flex:${v}"></i>` : "").join("")}</div></div></div>`).join("")}</div>`;
}

// ---------------------------------------------------------------- medidor
/** Uma proporção contra o todo: trilho no tom claro da cor, preenchimento na cor. */
export function medidor(parte: number, todo: number, rotulo: string): string {
  const p = todo > 0 ? Math.round((parte / todo) * 100) : 0;
  return `<div class="gr-medidor" role="img" aria-label="${e(rotulo)}: ${p}%"><div class="gr-trilho"><i style="width:${p}%"></i></div></div>`;
}

// ---------------------------------------------------------------- variação
/** "▲ 12% vs out" — a cor diz se foi bom ou ruim; a seta e o texto dizem para onde foi. */
export function variacao(atual: number, anterior: number, o: { vs: string; menorMelhor?: boolean; dinheiro?: boolean }): string {
  if (anterior === 0 && atual === 0) return `<span class="var neutra">igual a ${e(o.vs)}</span>`;
  if (anterior === 0) return `<span class="var neutra">sem base em ${e(o.vs)}</span>`;
  const d = atual - anterior;
  if (d === 0) return `<span class="var neutra">igual a ${e(o.vs)}</span>`;
  const bom = o.menorMelhor ? d < 0 : d > 0;
  const quanto = o.dinheiro ? reaisCurto(Math.abs(d)) : `${Math.round(Math.abs(d) / Math.abs(anterior) * 100)}%`;
  return `<span class="var ${bom ? "bom" : "ruim"}">${d > 0 ? "▲" : "▼"} ${e(quanto)} <small>vs ${e(o.vs)}</small></span>`;
}
