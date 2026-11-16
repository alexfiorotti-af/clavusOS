/**
 * Relatórios do mês, pensados para decidir (D020). De cima para baixo:
 * 1. o resultado (cartão ameixa) e quatro números da agenda;
 * 2. "Para decidir este mês": frases com o que fazer, cada uma com o botão que resolve;
 * 3. os gráficos, cada um com uma frase que diz o que ele mostra:
 *    entrou × saiu nos últimos 6 meses · ritmo do mês contra o anterior · quando o studio enche ·
 *    de onde vem e para onde vai o dinheiro · equipe · serviços · de onde vêm as clientes.
 */
import { e } from "../http/resposta.ts";
import { ICONE } from "./base.ts";
import { reais } from "../dados/dinheiro.ts";
import { mesExtenso, somarMeses, type DiaISO } from "../dados/datas.ts";
import type { Resumo } from "../caixa/caixa.ts";
import type { Par, Producao, Mes, Indicadores } from "../caixa/relatorios.ts";
import { ORIGENS } from "../clientes/clientes.ts";
import * as G from "./graficos.ts";

export type DadosRelatorio = {
  ym: string; hoje: DiaISO; dias: number;
  resumo: Resumo; resumoAnt: Resumo;
  ind: Indicadores; indAnt: Indicadores;
  serie: Mes[];
  ritmoAtual: number[]; ritmoAnt: number[];
  ocupacao: number[][]; diasAbertos: number[]; abre: string; fecha: string;
  recCat: Par[]; despCat: Par[]; producao: Producao[]; topSrv: Par[]; origens: Par[];
  parado: { clientes: number; valor: number }; recorrente: { assinaturas: number; porMes: number };
  agendarOnline: boolean;
};

const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const nomeMes = (ym: string) => mesExtenso(ym).split(" de ")[0];
const mesCurto = (ym: string) => MES_CURTO[Number(ym.slice(5, 7)) - 1];
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const ticket = (i: Indicadores) => (i.pagos ? Math.round(i.faturado / i.pagos) : 0);

type Ideia = { icone: keyof typeof ICONE; titulo: string; texto: string; acao?: [string, string] };

/** O que o mês está pedindo, em frases. Só entra o que tem dado para sustentar. */
function ideias(d: DadosRelatorio, corrente: boolean, periodos: number[]): Ideia[] {
  const v: Ideia[] = [];
  // o que é de hoje (vencidas, recorrente) só aparece no mês corrente
  if (corrente && d.parado.clientes > 0) v.push({
    icone: "unha", titulo: `${plural(d.parado.clientes, "cliente está", "clientes estão")} com a unha vencida`,
    texto: d.parado.valor > 0 ? `Se voltarem, são cerca de ${reais(d.parado.valor)} na agenda. A mensagem já está pronta.` : "A mensagem de retorno já está pronta.",
    acao: ["/clientes?filtro=vencidas", "Chamar de volta"],
  });
  // o horário mais vazio entre os que o studio abre (só quando há agenda bastante para comparar)
  const celulas = d.diasAbertos.flatMap((dia) => periodos.map((p) => ({ dia, p, n: d.ocupacao[dia][p] })));
  const total = celulas.reduce((s, c) => s + c.n, 0);
  if (celulas.length > 1 && total >= 6) {
    // empate: manhã e tarde (períodos longos) antes da noite, e o começo da semana antes
    const vazio = [...celulas].sort((a, b) => a.n - b.n || (a.p === 2 ? 1 : 0) - (b.p === 2 ? 1 : 0))[0];
    const cheio = [...celulas].sort((a, b) => b.n - a.n)[0];
    if (cheio.n >= 3 * Math.max(1, vazio.n)) v.push({
      icone: "agenda", titulo: `${G.diaLongo(vazio.dia)[0].toUpperCase() + G.diaLongo(vazio.dia).slice(1)} de ${G.PERIODOS[vazio.p].toLowerCase()} é o horário mais vazio`,
      texto: `${vazio.n ? `Teve ${plural(vazio.n, "horário", "horários")}` : "Não teve nenhum horário"}, contra ${cheio.n} em ${G.diaLongo(cheio.dia)} de ${G.PERIODOS[cheio.p].toLowerCase()}. Bom momento para uma promoção.`,
    });
  }
  if (d.resumo.despesas > d.resumo.receitas && d.resumo.despesas > 0) {
    const maior = d.despCat[0];
    v.push({
      icone: "caixa", titulo: `As despesas passaram as receitas em ${reais(d.resumo.despesas - d.resumo.receitas)}`,
      texto: maior ? `A maior foi ${maior.rotulo.toLowerCase()} (${reais(maior.valor)}).${corrente ? " O mês ainda não fechou." : ""}` : "",
    });
  }
  if (d.ind.marcados >= 5) {
    const p = Math.round((d.ind.online / d.ind.marcados) * 100);
    if (!d.agendarOnline) v.push({ icone: "novoHorario", titulo: "O agendamento online está desligado", texto: "Com ele ligado, a cliente marca sozinha pelo link, só nos horários livres.", acao: ["/configuracoes", "Ligar"] });
    else if (p < 30) v.push({ icone: "novoHorario", titulo: p ? `Só ${p}% dos horários foram marcados pela própria cliente` : "Nenhum horário foi marcado pela própria cliente", texto: "Coloque o link de agendamento na bio e no status do WhatsApp.", acao: ["/agendar", "Ver o link"] });
  }
  if (d.ind.faltas >= 2) v.push({
    icone: "agenda", titulo: `${plural(d.ind.faltas, "falta", "faltas")} no mês`,
    texto: "Cobrar um sinal por Pix na hora de marcar segura o horário.", acao: ["/configuracoes/servicos", "Ajustar sinal"],
  });
  if (!corrente) return v.slice(0, 5);
  if (d.recorrente.assinaturas > 0) v.push({
    icone: "setas", titulo: `${reais(d.recorrente.porMes)} por mês já garantidos`,
    texto: `Vêm de ${plural(d.recorrente.assinaturas, "assinatura ativa", "assinaturas ativas")}. Cada nova assinatura soma aqui.`,
    acao: ["/configuracoes/planos", "Planos"],
  });
  else v.push({
    icone: "setas", titulo: "Nenhuma assinatura ativa",
    texto: "Um plano mensal deixa parte do mês vendido antes de começar.", acao: ["/configuracoes/planos", "Criar plano"],
  });
  return v.slice(0, 5);
}

function bloco(titulo: string, frase: string, corpo: string, classe = ""): string {
  return `<section class="cartao rel-bloco ${classe}"><h3>${e(titulo)}</h3>${frase ? `<p class="frase">${frase}</p>` : ""}${corpo}</section>`;
}

export function telaRelatorios(d: DadosRelatorio): string {
  const ymAnt = somarMeses((d.ym + "-01") as DiaISO, -1).slice(0, 7);
  const corrente = d.hoje.slice(0, 7) === d.ym;
  const futuro = d.ym > d.hoje.slice(0, 7);
  const corte = corrente ? Number(d.hoje.slice(8, 10)) : d.dias;
  const mes = nomeMes(d.ym), mesAnt = nomeMes(ymAnt);
  const abreMin = Number(d.abre.slice(0, 2)) * 60 + Number(d.abre.slice(3, 5));
  const fechaMin = Number(d.fecha.slice(0, 2)) * 60 + Number(d.fecha.slice(3, 5));
  const periodos = [0, 1, 2].filter((p) => (p === 0 ? abreMin < 720 : p === 1 ? abreMin < 1020 && fechaMin > 720 : fechaMin > 1020));

  // ---- cabeçalho do mês
  const navMes = `<div class="rel-mes"><a class="botao sec pequeno" href="/relatorios?mes=${ymAnt}" aria-label="Mês anterior">‹</a>
<b>${e(mesExtenso(d.ym).charAt(0).toUpperCase() + mesExtenso(d.ym).slice(1))}</b>
<a class="botao sec pequeno" href="/relatorios?mes=${somarMeses((d.ym + "-01") as DiaISO, 1).slice(0, 7)}" aria-label="Próximo mês">›</a></div>`;

  // ---- resultado (cartão ameixa)
  const recAteHoje = d.ritmoAtual[corte - 1] ?? 0, recAntMesmoDia = d.ritmoAnt[Math.min(corte, d.ritmoAnt.length) - 1] ?? 0;
  const comparacao = corrente
    ? G.variacao(recAteHoje, recAntMesmoDia, { vs: `${mesAnt} no mesmo dia`, dinheiro: true }).replace("</small>", " (receita)</small>")
    : G.variacao(d.resumo.saldo, d.resumoAnt.saldo, { vs: mesAnt, dinheiro: true });
  const resultado = `<section class="cofre">
<span class="rot">${corrente ? `Resultado de ${mes} até hoje` : futuro ? `${mes[0].toUpperCase() + mes.slice(1)} ainda não começou` : `Resultado de ${mes}`}</span>
<div class="valor${d.resumo.saldo < 0 ? " neg" : ""}">${e(reais(d.resumo.saldo))}</div>
<div class="es"><span>Entrou <b>${e(reais(d.resumo.receitas))}</b></span><span>Saiu <b>${e(reais(d.resumo.despesas))}</b></span></div>
${futuro ? "" : `<div class="cmp">${comparacao}</div>`}
</section>`;

  // ---- quatro números da agenda
  const tile = (rot: string, val: string, atual: number, ant: number, o: { menorMelhor?: boolean; dinheiro?: boolean; fmtAnt?: string } = {}) =>
    `<div class="numero"><span>${e(rot)}</span><b>${e(val)}</b>${corrente || futuro
      ? `<small class="mudo">em ${e(mesAnt)}: ${e(o.fmtAnt ?? String(ant))}</small>`
      : G.variacao(atual, ant, { vs: mesCurto(ymAnt), menorMelhor: o.menorMelhor })}</div>`;
  const tk = ticket(d.ind), tkAnt = ticket(d.indAnt);
  const numeros = `<div class="numeros">
${tile("Atendimentos", String(d.ind.atendimentos), d.ind.atendimentos, d.indAnt.atendimentos)}
${tile("Ticket médio", tk ? reais(tk) : "—", tk, tkAnt, { fmtAnt: tkAnt ? reais(tkAnt) : "—" })}
${tile("Clientes atendidas", String(d.ind.clientes), d.ind.clientes, d.indAnt.clientes)}
${tile("Faltas", String(d.ind.faltas), d.ind.faltas, d.indAnt.faltas, { menorMelhor: true })}
</div>`;

  // ---- para decidir
  const lista = ideias(d, corrente, periodos);
  const decidir = lista.length ? `<section class="cartao decidir"><h3>${corrente ? "Para decidir este mês" : `O que ${e(mes)} mostrou`}</h3><ul>
${lista.map((i) => `<li><span class="ic">${ICONE[i.icone]}</span><div class="tx"><b>${e(i.titulo)}</b><small>${e(i.texto)}</small></div>${i.acao ? `<a class="botao apoio pequeno" href="${e(i.acao[0])}">${e(i.acao[1])}</a>` : ""}</li>`).join("")}
</ul></section>` : "";

  // ---- 6 meses
  const fechados = d.serie.filter((m) => m.ym < d.hoje.slice(0, 7) && (m.receitas > 0 || m.despesas > 0));
  const media = fechados.length ? Math.round(fechados.reduce((s, m) => s + m.receitas, 0) / fechados.length) : 0;
  const melhor = [...fechados].sort((a, b) => b.receitas - a.receitas)[0];
  const fraseSerie = fechados.length >= 2
    ? `Média de <b>${e(reais(media))}</b> de receita por mês nos últimos ${fechados.length} meses fechados. O melhor foi ${e(nomeMes(melhor.ym))}, com ${e(reais(melhor.receitas))}.`
    : "Com mais meses de uso, aqui aparece a sua média e o seu melhor mês.";
  const graficoSerie = G.colunas({
    rotulos: d.serie.map((m) => mesCurto(m.ym)), nomes: d.serie.map((m) => nomeMes(m.ym)),
    series: [{ nome: "Entrou", classe: "s1", valores: d.serie.map((m) => m.receitas) }, { nome: "Saiu", classe: "s2", valores: d.serie.map((m) => m.despesas) }],
    destaque: d.serie.findIndex((m) => m.ym === d.ym), rotuloAria: "Receitas e despesas dos últimos 6 meses",
  });

  // ---- ritmo
  const fimAnt = d.ritmoAnt[d.ritmoAnt.length - 1] ?? 0;
  const fraseRitmo = futuro ? "" : corrente
    ? `Até o dia ${corte}, <b>${e(reais(recAteHoje))}</b> de receita. No mesmo dia, ${e(mesAnt)} tinha ${e(reais(recAntMesmoDia))} e fechou em ${e(reais(fimAnt))}.`
    : `${e(mes[0].toUpperCase() + mes.slice(1))} fechou com <b>${e(reais(d.ritmoAtual[d.ritmoAtual.length - 1] ?? 0))}</b> de receita; ${e(mesAnt)}, com ${e(reais(fimAnt))}.`;
  const graficoRitmo = G.ritmo({ atual: d.ritmoAtual, anterior: d.ritmoAnt, corte, nomeAtual: mes[0].toUpperCase() + mes.slice(1), nomeAnterior: mesAnt[0].toUpperCase() + mesAnt.slice(1) });

  // ---- quando enche
  const cels = d.diasAbertos.flatMap((dia) => periodos.map((p) => ({ dia, p, n: d.ocupacao[dia][p] })));
  const cheio = [...cels].sort((a, b) => b.n - a.n)[0];
  const fraseCalor = cheio && cheio.n > 0
    ? `O mais cheio é <b>${e(G.diaLongo(cheio.dia))} de ${e(G.PERIODOS[cheio.p].toLowerCase())}</b> (${plural(cheio.n, "horário", "horários")}). Os tons claros são onde cabe mais cliente.`
    : "Ainda não há horários marcados neste mês.";
  const graficoCalor = d.diasAbertos.length && periodos.length ? G.calor({ matriz: d.ocupacao, dias: d.diasAbertos, periodos }) : "";

  // ---- dinheiro
  const rec = G.ranking(d.recCat.map((p) => ({ rotulo: p.rotulo, valor: p.valor })), { vazio: "Nenhuma receita no mês." });
  const desp = G.ranking(d.despCat.map((p) => ({ rotulo: p.rotulo, valor: p.valor })), { vazio: "Nenhuma despesa no mês.", neutra: true });
  const totRec = d.recCat.reduce((s, p) => s + p.valor, 0);
  const fraseRec = d.recCat[0] && totRec ? `${e(d.recCat[0].rotulo)} responde por <b>${Math.round(d.recCat[0].valor / totRec * 100)}%</b> do que entrou.` : "";
  const fraseDesp = d.despCat[0] ? `A maior despesa é ${e(d.despCat[0].rotulo.toLowerCase())}: <b>${e(reais(d.despCat[0].valor))}</b>.` : "";

  // ---- equipe
  const equipe = G.empilhadas(d.producao.map((p) => ({
    rotulo: p.rotulo, detalhe: `${plural(p.atendimentos, "atendimento", "atendimentos")}${p.comissao_pct ? ` · comissão ${String(p.comissao_pct).replace(".", ",")}%` : ""}`,
    total: p.total, partes: [p.total - p.comissao, p.comissao],
  })), ["Fica no studio", "Comissão"]);
  const totCom = d.producao.reduce((s, p) => s + p.comissao, 0);
  const fraseEquipe = d.producao.length ? `Comissões do mês: <b>${e(reais(totCom))}</b>.` : "";

  // ---- serviços e clientes
  const srv = G.ranking(d.topSrv.map((p) => ({ rotulo: p.rotulo, valor: p.valor, detalhe: p.n ? `${p.n}×` : undefined })), { vazio: "Nenhum atendimento concluído no mês." });
  const fraseSrv = d.topSrv[0] ? `O que mais faturou: <b>${e(d.topSrv[0].rotulo)}</b>.` : "";
  const totNovas = d.origens.reduce((s, p) => s + p.valor, 0);
  const orig = G.ranking(d.origens.map((p) => ({ rotulo: ORIGENS[p.rotulo] ?? p.rotulo, valor: p.valor, texto: String(p.valor) })), { vazio: "Nenhuma cliente nova no mês." });
  const pOnline = d.ind.marcados ? Math.round((d.ind.online / d.ind.marcados) * 100) : 0;
  const online = d.ind.marcados ? `<div class="rel-online"><p class="frase"><b>${pOnline}%</b> dos horários do mês foram marcados pela própria cliente, pelo link.</p>
${G.medidor(d.ind.online, d.ind.marcados, "Horários marcados pela cliente")}</div>` : "";
  const fraseOrig = totNovas ? `<b>${plural(totNovas, "cliente nova", "clientes novas")}</b> no mês.` : "";

  return `<h1>Relatórios</h1>${navMes}
<div class="rel-topo">${resultado}${numeros}</div>
${decidir}
<div class="grade g2 rel-grade">
${bloco("Entrou e saiu, mês a mês", fraseSerie, graficoSerie)}
${futuro ? "" : bloco("Ritmo do mês", fraseRitmo, graficoRitmo)}
</div>
<div class="grade g2 rel-grade">
${graficoCalor ? bloco("Quando o studio enche", fraseCalor, graficoCalor) : ""}
${bloco("A equipe no mês", fraseEquipe, equipe)}
</div>
<div class="grade g2 rel-grade">
${bloco("De onde vem o dinheiro", fraseRec, rec)}
${bloco("Para onde vai", fraseDesp, desp)}
</div>
<div class="grade g2 rel-grade">
${bloco("Serviços que mais faturam", fraseSrv, srv)}
${bloco("De onde vêm as clientes", fraseOrig, orig + online)}
</div>`;
}
