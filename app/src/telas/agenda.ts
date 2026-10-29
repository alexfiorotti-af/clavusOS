/** Telas da agenda: Hoje (painel), dia, semana, mapa, formulário e detalhe. */
import { e } from "../http/resposta.ts";
import { etiqueta, opcoes, ICONE } from "./base.ts";
import type { Studio } from "../studio/studio.ts";
import type { Agendamento } from "../agenda/agenda.ts";
import type { Slot } from "../agenda/horarios.ts";
import { reais } from "../dados/dinheiro.ts";
import { br, brCurto, diaFalado, rotuloDia, somarDias, minutos, type DiaISO } from "../dados/datas.ts";
import type { Cliente } from "../clientes/clientes.ts";
import type { Cobranca } from "../cobrancas/cobrancas.ts";

export type Prof = { id: string; nome: string; cor: string; ativo: boolean };
export type Srv = { id: string; nome: string; preco: number; duracao_min: number; cor: string; ativo: boolean };

export function cardAg(a: Agendamento, hoje: DiaISO, comData = false): string {
  const pro = a.profissional_nome ? `, com ${e(a.profissional_nome.split(" ")[0])}` : "";
  return `<a class="ag ${a.situacao}" href="/agenda/${a.id}">
    <div class="hora">${e(a.inicio)}<small>${comData ? brCurto(a.data) : a.duracao_min + " min"}</small></div>
    <div class="meio"><b>${e(a.cliente_nome)}</b><span>${e(a.servico_nome)}${pro}${a.encaixe ? ", encaixe" : ""}</span></div>
    <div class="fim"><div class="valor">${a.preco ? reais(a.preco) : "plano"}</div>${etiqueta(a.situacao)}</div>
  </a>`;
}

/** Lista de atendimentos num cartão só, com divisórias. */
export function listaAgs(ags: Agendamento[], hoje: DiaISO, vazio: string, comData = false): string {
  return ags.length ? `<div class="lista">${ags.map((a) => cardAg(a, hoje, comData)).join("")}</div>` : `<div class="cartao"><p class="mudo">${vazio}</p></div>`;
}

function tiraDias(base: string, sel: DiaISO, hoje: DiaISO, comAg: Set<DiaISO>): string {
  let h = `<div class="pilulas" role="group" aria-label="Escolher o dia">`;
  for (let i = 0; i < 14; i++) {
    const d = somarDias(hoje, i);
    h += `<a class="pill ${d === sel ? "ativa" : ""}" href="${base}?dia=${d}"${d === sel ? ' aria-current="date"' : ""}>${i === 0 ? "Hoje" : i === 1 ? "Amanhã" : rotuloDia(d)}${comAg.has(d) ? '<i class="ponto" aria-label="com atendimentos"></i>' : ""}</a>`;
  }
  return h + "</div>";
}

const tinta = (cor: string | null | undefined) => `color-mix(in oklch, ${cor && /^#[0-9a-f]{6}$/i.test(cor) ? cor : "#6B5A66"} 34%, white)`;

/** "Quinta-feira, 29 de outubro" — a data escrita como se fala. */
function diaLongo(d: DiaISO): string {
  const t = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(d + "T12:00:00Z"));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function agoraNoStudio(fuso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  } catch { return "12:00"; }
}

/** A linha do dia: atendimentos como pílulas no tom de cada profissional e a marca do agora. */
function linhaDoDia(studio: Studio, ags: Agendamento[], agora: string, ehHoje: boolean): string {
  const abre = minutos(studio.abre), fecha = minutos(studio.fecha), total = Math.max(fecha - abre, 60);
  const lst = ags.filter((a) => a.ativo).sort((x, y) => x.inicio.localeCompare(y.inicio));
  if (!lst.length) return "";
  const fins: number[] = [];
  const pilulas = lst.map((a) => {
    const ini = minutos(a.inicio), fim = ini + a.duracao_min;
    let faixa = fins.findIndex((f) => f <= ini);
    if (faixa < 0) { faixa = fins.length; fins.push(fim); } else fins[faixa] = fim;
    const esq = Math.max(0, ((ini - abre) / total) * 100), larg = Math.max(2.5, (a.duracao_min / total) * 100);
    return `<a class="p${a.encaixe ? " enc" : ""}${a.situacao === "concluido" ? " feito" : ""}" href="/agenda/${a.id}" title="${e(a.inicio)} ${e(a.cliente_nome ?? "")}" aria-label="${e(a.inicio)}, ${e(a.cliente_nome ?? "")}" style="left:${esq.toFixed(2)}%;width:${Math.min(larg, 100 - esq).toFixed(2)}%;top:${7 + Math.min(faixa, 3) * 24}px;background:${tinta(a.profissional_cor)}"></a>`;
  }).join("");
  const faixas = Math.min(Math.max(fins.length, 1), 4);
  const m = minutos(agora), agoraPct = ((m - abre) / total) * 100;
  const marca = ehHoje && agoraPct >= 0 && agoraPct <= 100 ? `<span class="ag-linha" style="left:${agoraPct.toFixed(2)}%"></span>` : "";
  const horas: string[] = [];
  for (let h = Math.ceil(abre / 60); h <= Math.floor(fecha / 60); h += 2) horas.push(`<span>${h}h</span>`);
  const profs = new Map<string, string>();
  for (const a of lst) if (a.profissional_nome) profs.set(a.profissional_nome.split(" ")[0], tinta(a.profissional_cor));
  return `<section class="dia-linha" aria-label="O seu dia">
  <div class="topo-l"><span>Seu dia</span>${ehHoje ? `<span class="agora">agora, ${e(agora)}</span>` : ""}</div>
  <div class="trilha" style="height:${14 + faixas * 24 - 4}px">${pilulas}${marca}</div>
  <div class="horas-l">${horas.join("")}</div>
  <div class="legenda">${[...profs].map(([n, c]) => `<span><i style="background:${c}"></i>${e(n)}</span>`).join("")}${lst.some((a) => a.encaixe) ? `<span><i style="outline:1.5px dashed var(--suave);outline-offset:-1.5px"></i>encaixe</span>` : ""}</div>
</section>`;
}

/** O que o botão "+" abre: tudo o que se cria no studio, num lugar só. */
export function telaCriar(o: { hoje: DiaISO; financeiro: boolean }): string {
  const it = (h: string, ic: string, t: string, sub: string) => `<a href="${h}"><span class="ic">${ic}</span><span><b>${t}</b><span>${sub}</span></span></a>`;
  return `
<h1>O que vamos lançar?</h1>
<nav class="criar-lista" aria-label="Criar">
  ${it(`/agenda/novo?dia=${o.hoje}`, ICONE.novoHorario, "Novo horário", "Cliente, serviço, quem atende e quando")}
  ${o.financeiro ? it("/caixa/venda", ICONE.sacola, "Venda de produto", "Baixa no estoque e entra no caixa") : ""}
  ${o.financeiro ? it("/caixa/lancar?tipo=despesa", ICONE.setas, "Receita ou despesa", "Aluguel, material, um serviço avulso") : ""}
  ${it("/clientes/nova", ICONE.novaCliente, "Nova cliente", "Nome, WhatsApp e de onde ela veio")}
</nav>`;
}

export function telaHoje(o: { studio: Studio; hoje: DiaISO; ags: Agendamento[]; totalDia: number; vencidas: number; aniversarios: number }): string {
  const ativos = o.ags.filter((a) => a.ativo);
  const agora = agoraNoStudio(o.studio.fuso);
  const abertos = ativos.filter((a) => a.situacao === "pendente" || a.situacao === "confirmado");
  const prox = abertos.find((a) => a.inicio >= agora) ?? null;
  const dia = diaFalado(o.hoje, o.hoje);
  const n = ativos.length, feitos = ativos.filter((a) => a.situacao === "concluido").length;
  const proxima = prox ? `<section class="proxima" aria-label="Próximo atendimento">
  <div class="quando"><span>Próxima, às ${e(prox.inicio)}</span>${etiqueta(prox.situacao)}</div>
  <div class="quem"><b>${e(prox.cliente_nome)}</b><span>${e(prox.servico_nome)}, ${prox.duracao_min} min${prox.profissional_nome ? `, com ${e(prox.profissional_nome.split(" ")[0])}` : ""}</span></div>
  <a class="botao" href="/agenda/${prox.id}">${prox.situacao === "pendente" ? `${ICONE.zap} Confirmar` : "Abrir atendimento"}</a>
</section>` : "";
  const avisos = [
    o.vencidas ? `<a class="banner" href="/clientes?filtro=vencidas"><span class="ic">${ICONE.unha}</span><span class="tx"><b>${o.vencidas} cliente${o.vencidas > 1 ? "s" : ""} com unha vencida</b><small>A mensagem de retorno já está pronta</small></span>${ICONE.seta}</a>` : "",
    o.aniversarios ? `<a class="banner suave" href="/clientes?filtro=aniversarios"><span class="ic">${ICONE.bolo}</span><span class="tx"><b>${o.aniversarios} aniversariante${o.aniversarios > 1 ? "s" : ""} no mês</b><small>Mande um carinho com um mimo</small></span>${ICONE.seta}</a>` : "",
  ].join("");
  return `
<p class="data">${diaLongo(o.hoje)}</p>
<h1>${n ? `${n} atendimento${n > 1 ? "s" : ""} hoje` : "Dia livre hoje"}</h1>
<p class="resumo"><span><b>${reais(o.totalDia)}</b> previstos</span><span><b>${feitos}</b> concluído${feitos === 1 ? "" : "s"}</span></p>
<div class="hoje">
  <div class="h-linha">${linhaDoDia(o.studio, o.ags, agora, true)}</div>
  <div class="h-lado">
    ${proxima}
    ${avisos ? `<div class="titulo-secao"><h2>Para hoje</h2></div>${avisos}` : ""}
  </div>
  <div class="h-agenda">
    <div class="titulo-secao"><h2>Agenda de hoje</h2><a href="/agenda">Ver agenda</a></div>
    ${listaAgs(o.ags, o.hoje, `Ninguém marcado hoje ainda. <a href="/agenda/novo?dia=${o.hoje}">Marcar o primeiro horário</a>`)}
  </div>
</div>`;
}

export function telaDia(o: { hoje: DiaISO; dia: DiaISO; ags: Agendamento[]; total: number; comAg: Set<DiaISO> }): string {
  const n = o.ags.filter((a) => a.ativo).length;
  return `
<h1>Agenda</h1>
${tiraDias("/agenda", o.dia, o.hoje, o.comAg)}
<p class="resumo"><span>${diaFalado(o.dia, o.hoje)}</span><span><b>${n}</b> atendimento${n === 1 ? "" : "s"}</span><span><b>${reais(o.total)}</b> previstos</span></p>
${listaAgs(o.ags, o.hoje, `Dia livre. <a href="/agenda/novo?dia=${o.dia}">Marcar um horário</a>`)}
<div class="acoes nao-imprime"><a class="botao apoio" href="/agenda/novo?dia=${o.dia}">Novo horário em ${brCurto(o.dia)}</a></div>`;
}

export function telaSemana(o: { hoje: DiaISO; ini: DiaISO; porDia: Map<DiaISO, Agendamento[]> }): string {
  let corpo = "";
  for (let i = 0; i < 7; i++) {
    const d = somarDias(o.ini, i);
    const l = o.porDia.get(d) ?? [];
    const n = l.filter((a) => a.ativo).length;
    corpo += `<div class="titulo-secao"><h2>${diaFalado(d, o.hoje)}, ${br(d)}</h2><span class="mudo">${n ? `${n} atendimento${n > 1 ? "s" : ""}` : "livre"}</span></div>`;
    corpo += l.length ? listaAgs(l, o.hoje, "") : "";
  }
  return `
<h1>Semana</h1>
<div class="acoes" style="margin-top:0"><a class="botao sec pequeno" href="/agenda/semana?dia=${somarDias(o.ini, -7)}" aria-label="Semana anterior">‹</a>
<b>${brCurto(o.ini)} a ${brCurto(somarDias(o.ini, 6))}</b>
<a class="botao sec pequeno" href="/agenda/semana?dia=${somarDias(o.ini, 7)}" aria-label="Próxima semana">›</a></div>${corpo}`;
}

export function telaMapa(o: { studio: Studio; hoje: DiaISO; dia: DiaISO; ags: Agendamento[]; profs: Prof[]; comAg: Set<DiaISO> }): string {
  const abre = minutos(o.studio.abre), fecha = minutos(o.studio.fecha);
  const pxMin = 1.5, altura = (fecha - abre) * pxMin + 34;
  const lst = o.ags.filter((a) => a.ativo);
  const cols: { id: string | null; nome: string; cor: string }[] = o.profs.length
    ? [...o.profs.map((p) => ({ id: p.id as string | null, nome: p.nome.split(" ")[0], cor: p.cor })),
       ...(lst.some((a) => !a.profissional_id) ? [{ id: null, nome: "Sem profissional", cor: "#7A6B7D" }] : [])]
    : [{ id: "*", nome: "Agenda", cor: o.studio.cor }];
  let horas = "";
  for (let m = abre; m <= fecha; m += 60) horas += `<span style="top:${34 + (m - abre) * pxMin}px">${String(Math.floor(m / 60)).padStart(2, "0")}:00</span>`;
  const colHtml = cols.map((c) => {
    const meus = lst.filter((a) => c.id === "*" || a.profissional_id === c.id);
    let slots = "";
    for (let m = abre; m <= fecha; m += 60) slots += `<div class="slot" style="top:${34 + (m - abre) * pxMin}px"></div>`;
    const blocos = meus.map((a) => {
      const top = 34 + (minutos(a.inicio) - abre) * pxMin, h = Math.max(a.duracao_min * pxMin, 26);
      return `<a class="bloco" style="top:${top}px;height:${h}px;background:${tinta(c.cor)}" href="/agenda/${a.id}">
        ${e(a.inicio)} ${e((a.cliente_nome ?? "").split(" ")[0])}<small>${e(a.servico_nome)}</small></a>`;
    }).join("");
    return `<div class="col" style="height:${altura}px"><h4>${e(c.nome)}</h4>${slots}${blocos}</div>`;
  }).join("");
  return `
<h1>Equipe, ${diaFalado(o.dia, o.hoje)}</h1>
${tiraDias("/agenda/mapa", o.dia, o.hoje, o.comAg)}
<div class="mapa"><div class="grid"><div class="horas" style="height:${altura}px">${horas}</div>${colHtml}</div></div>
<div class="acoes"><a class="botao" href="/agenda/novo?dia=${o.dia}">+ Novo horário</a></div>`;
}

export function telaNovo(o: {
  hoje: DiaISO; f: { clienteId?: string; clienteNome?: string; servicoId?: string; profissionalId?: string; dia: DiaISO; inicio?: string; encaixe?: boolean };
  servicos: Srv[]; profs: Prof[]; slots: Slot[]; clientes: Cliente[]; podeEncaixe: boolean; editando?: Agendamento | null;
}): string {
  const f = o.f;
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    if (o.editando) p.set("editar", o.editando.id);
    if (f.clienteId) p.set("cliente", f.clienteId);
    if (f.servicoId) p.set("servico", f.servicoId);
    if (f.profissionalId) p.set("prof", f.profissionalId);
    p.set("dia", f.dia);
    for (const [k, v] of Object.entries(patch)) v ? p.set(k, v) : p.delete(k);
    return "/agenda/novo?" + p.toString();
  };
  const srvSel = o.servicos.find((s) => s.id === f.servicoId);
  return `
<h1>${o.editando ? `Remarcar ${e(o.editando.codigo)}` : "Novo horário"}</h1>
<form method="post" action="/agenda/novo" class="cartao">
  ${o.editando ? `<input type="hidden" name="editar" value="${e(o.editando.id)}">` : ""}
  <div class="campo"><label>Cliente</label>
  ${o.editando ? `<p><b>${e(o.editando.cliente_nome)}</b><input type="hidden" name="cliente_id" value="${e(o.editando.cliente_id)}"></p>`
    : `<select name="cliente_id" required>
      <option value="">— escolher —</option>
      ${o.clientes.map((c) => `<option value="${e(c.id)}"${c.id === f.clienteId ? " selected" : ""}>${e(c.nome)}</option>`).join("")}
    </select>
    <p class="mudo" style="margin:6px 0 0">Cliente nova? <a href="/clientes/nova?voltar=${encodeURIComponent(qs({}))}">cadastre em 20 segundos</a>.</p>`}
  </div>
  <div class="campo"><label>Serviço</label>
    <div class="chips">${o.servicos.map((s) =>
      `<a class="pill ${s.id === f.servicoId ? "ativa" : ""}" href="${qs({ servico: s.id, inicio: "" })}">${e(s.nome)} · ${reais(s.preco)}</a>`).join("")}</div>
    <input type="hidden" name="servico_id" value="${e(f.servicoId ?? "")}">
  </div>
  ${o.profs.length ? `<div class="campo"><label>Profissional</label>
    <div class="chips">${o.profs.map((p) =>
      `<a class="pill ${p.id === f.profissionalId ? "ativa" : ""}" href="${qs({ prof: p.id === f.profissionalId ? "" : p.id, inicio: "" })}">${e(p.nome.split(" ")[0])}</a>`).join("")}</div>
    <input type="hidden" name="profissional_id" value="${e(f.profissionalId ?? "")}"></div>` : ""}
  <div class="linha">
    <div><label>Data</label><input type="date" name="dia" value="${e(f.dia)}" min="${somarDias(o.hoje, -30)}" onchange="location=this.form.action.replace('/agenda/novo','${qs({}).replace(/dia=[^&]*/, "dia=") }')+this.value"></div>
    <div><label>Começa às</label><input type="time" name="inicio" value="${e(f.inicio ?? "")}" required></div>
    <div><label>Duração (min)</label><input type="number" name="duracao" min="5" step="5" value="${srvSel?.duracao_min ?? o.editando?.duracao_min ?? ""}"></div>
    <div><label>Preço (R$)</label><input name="preco" inputmode="decimal" value="${srvSel ? (srvSel.preco / 100).toFixed(2).replace(".", ",") : ""}"></div>
  </div>
  ${f.servicoId ? `<div class="campo"><label>Horários livres em ${brCurto(f.dia)}</label>
    <div class="chips">${o.slots.length ? o.slots.map((s) => s.livre
      ? `<a class="pill ${f.inicio === s.hora ? "ativa" : ""}" href="${qs({ inicio: s.hora })}">${s.hora}</a>`
      : `<span class="pill" style="opacity:.4">${s.hora}${s.rotulo ? `<small> ${e(s.rotulo)}</small>` : ""}</span>`).join("")
      : `<span class="mudo">Nenhum horário livre nesse dia para essa duração.</span>`}</div></div>` : ""}
  <div class="campo"><label>Observações</label><textarea name="observacoes" rows="2">${e(o.editando?.observacoes ?? "")}</textarea></div>
  ${o.podeEncaixe ? `<p><label style="display:inline-flex;align-items:center;text-transform:none;letter-spacing:0"><input type="checkbox" name="encaixe" ${f.encaixe ? "checked" : ""}> Encaixe (de propósito, junto com outro atendimento)</label></p>` : ""}
  <div class="acoes"><button>Salvar horário</button> <a class="botao sec" href="/agenda?dia=${e(f.dia)}">Voltar</a></div>
</form>`;
}

export function telaDetalhe(o: { a: Agendamento; hoje: DiaISO; cobrancas: Cobranca[]; temAsaas: boolean; podeFinanceiro: boolean; whats: string | null }): string {
  const a = o.a;
  const zapMsg = encodeURIComponent(`Oi, ${(a.cliente_nome ?? "").split(" ")[0]}! 💖 Confirmando seu horário de ${a.servico_nome} ${diaFalado(a.data, o.hoje)} às ${a.inicio} aqui no studio. Qualquer coisa me avisa. Até lá! ✨`);
  const zap = a.cliente_telefone ? `https://wa.me/${a.cliente_telefone}?text=${zapMsg}` : `https://wa.me/?text=${zapMsg}`;
  const aberto = a.situacao === "pendente" || a.situacao === "confirmado";
  return `
<h1>${e(a.cliente_nome)} <span class="mudo">· ${e(a.codigo)}</span></h1>
<div class="cartao">
  <p>${e(a.servico_nome)} · <b>${diaFalado(a.data, o.hoje)} às ${e(a.inicio)}</b> · ${a.duracao_min} min
  ${a.profissional_nome ? ` · ${e(a.profissional_nome)}` : ""}${a.encaixe ? " · <b>encaixe</b>" : ""}<br>
  <span class="valor">${a.preco ? reais(a.preco) : "coberto pela assinatura"}</span> · ${etiqueta(a.situacao)} · origem: ${e(a.origem)}</p>
  ${a.observacoes ? `<p class="mudo"> ${e(a.observacoes)}</p>` : ""}
  <div class="acoes">
    ${a.situacao === "pendente" ? `<form method="post" action="/agenda/${a.id}/confirmar"><button>Confirmar</button></form>` : ""}
    <a class="botao zap" href="${zap}" target="_blank" rel="noopener">WhatsApp</a>
    ${aberto ? `<a class="botao sec" href="/agenda/${a.id}/concluir">Concluir</a>
    <a class="botao sec" href="/agenda/novo?editar=${a.id}&dia=${a.data}&servico=${a.servico_id}${a.profissional_id ? `&prof=${a.profissional_id}` : ""}&inicio=${a.inicio}">Remarcar</a>
    ${o.temAsaas && o.podeFinanceiro && a.preco > 0 ? `<a class="botao sec" href="/agenda/${a.id}/cobrar">Cobrar pelo Asaas</a>` : ""}
    <form method="post" action="/agenda/${a.id}/cancelar"><button class="perigo" data-confirmar>Cancelar horário</button></form>
    <form method="post" action="/agenda/${a.id}/cancelar"><input type="hidden" name="faltou" value="1"><button class="sec" data-confirmar>Não compareceu</button></form>` : ""}
    <a class="botao sec" href="/clientes/${a.cliente_id}">Ficha da cliente</a>
  </div>
</div>
${o.cobrancas.length ? `<h2>Cobranças pelo Asaas</h2><div class="cartao tabela"><table>
<tr><th>Vencimento</th><th>Finalidade</th><th class="n">Valor</th><th>Situação</th><th></th></tr>
${o.cobrancas.map((c) => `<tr><td>${br(c.vencimento)}</td><td>${e(c.finalidade)}</td><td class="n valor">${reais(c.valor)}</td><td>${etiqueta(c.situacao)}</td>
<td>${c.url_fatura ? `<a href="${e(c.url_fatura)}" target="_blank" rel="noopener">fatura</a>` : ""}</td></tr>`).join("")}
</table></div>` : ""}`;
}

export function telaConcluir(a: Agendamento, formas: Record<string, string>): string {
  return `
<h1>Concluir atendimento</h1>
<form method="post" action="/agenda/${a.id}/concluir" class="cartao">
  <p><b>${e(a.cliente_nome)}</b> · ${e(a.servico_nome)} · ${br(a.data)} às ${e(a.inicio)}</p>
  <div class="linha">
    <div><label>Valor cobrado (R$)</label><input name="preco" inputmode="decimal" value="${(a.preco / 100).toFixed(2).replace(".", ",")}"></div>
    <div><label>Forma de pagamento</label><select name="forma">${opcoes(formas, "pix")}</select></div>
  </div>
  <p class="mudo">A receita entra no caixa na hora (o que já foi pago pelo Asaas não entra de novo).</p>
  <div class="acoes"><button>Concluir e lançar no caixa</button> <a class="botao sec" href="/agenda/${a.id}">Voltar</a></div>
</form>`;
}

export function telaCobrar(a: Agendamento, hoje: DiaISO): string {
  return `
<h1>Cobrar pelo Asaas</h1>
<form method="post" action="/agenda/${a.id}/cobrar" class="cartao">
  <p><b>${e(a.cliente_nome)}</b> · ${e(a.servico_nome)} · ${br(a.data)} às ${e(a.inicio)}</p>
  <div class="linha">
    <div><label>Finalidade</label><select name="finalidade">${opcoes({ sinal: "Sinal (garante o horário)", servico: "Serviço completo" }, "sinal")}</select></div>
    <div><label>Valor (R$)</label><input name="valor" inputmode="decimal" value="${(a.preco / 100).toFixed(2).replace(".", ",")}" required></div>
    <div><label>Como ela paga</label><select name="meio">${opcoes({ pix: "Pix (QR na hora)", link: "Link (Pix, cartão ou boleto)" }, "pix")}</select></div>
    <div><label>Vencimento</label><input type="date" name="vencimento" value="${somarDias(hoje, 1)}" min="${hoje}" required></div>
  </div>
  <p class="mudo">Sinal pago confirma o horário sozinho (o Asaas avisa e o sistema confere na API).</p>
  <div class="acoes"><button>Gerar cobrança</button> <a class="botao sec" href="/agenda/${a.id}">Voltar</a></div>
</form>`;
}

export function telaCobrancaPronta(a: Agendamento, c: Cobranca): string {
  return `
<h1>Cobrança criada</h1>
<div class="cartao">
  <p><b>${e(a.cliente_nome)}</b> · ${reais(c.valor)} · vence ${br(c.vencimento)}</p>
  ${c.pix_qr_base64 ? `<p><img class="qr" alt="QR do Pix" src="data:image/png;base64,${e(c.pix_qr_base64)}"></p>` : ""}
  ${c.pix_copia_cola ? `<label>Pix copia e cola</label><code class="pix">${e(c.pix_copia_cola)}</code>` : ""}
  ${c.url_fatura ? `<p><a class="botao" href="${e(c.url_fatura)}" target="_blank" rel="noopener">Abrir a fatura</a></p>` : ""}
  ${a.cliente_telefone ? `<p><a class="botao zap" target="_blank" rel="noopener" href="https://wa.me/${e(a.cliente_telefone)}?text=${encodeURIComponent(`Oi, ${(a.cliente_nome ?? "").split(" ")[0]}! 💖 Aqui está ${c.finalidade === "sinal" ? "o sinal para garantir seu horário" : "o pagamento do seu horário"}: ${c.url_fatura ?? "(Pix copia e cola na mensagem seguinte)"}`)}">Mandar no WhatsApp 💬</a></p>` : ""}
  <div class="acoes"><a class="botao sec" href="/agenda/${a.id}">Voltar ao atendimento</a></div>
</div>`;
}
