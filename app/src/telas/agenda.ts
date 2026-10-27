/** Telas da agenda: Hoje (painel), dia, semana, mapa, formulário e detalhe. */
import { e } from "../http/resposta.ts";
import { etiqueta, opcoes } from "./base.ts";
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
  const pro = a.profissional_nome ? ` · ${e(a.profissional_nome.split(" ")[0])}` : "";
  return `<a class="ag ${a.situacao}" href="/agenda/${a.id}">
    <div class="hora">${e(a.inicio)}<small>${comData ? brCurto(a.data) : a.duracao_min + "min"}</small></div>
    <div class="meio"><b>${e(a.cliente_nome)}</b><span>${e(a.servico_nome)}${pro}${a.encaixe ? " · encaixe" : ""}</span></div>
    <div class="fim"><div class="valor">${a.preco ? reais(a.preco) : "plano"}</div>${etiqueta(a.situacao)}</div>
  </a>`;
}

function tiraDias(base: string, sel: DiaISO, hoje: DiaISO, comAg: Set<DiaISO>): string {
  let h = `<div class="pilulas">`;
  for (let i = 0; i < 14; i++) {
    const d = somarDias(hoje, i);
    h += `<a class="pill ${d === sel ? "ativa" : ""}" href="${base}?dia=${d}">${i === 0 ? "Hoje" : i === 1 ? "Amanhã" : rotuloDia(d)}${comAg.has(d) ? " ·" : ""}</a>`;
  }
  return h + "</div>";
}

export function telaHoje(o: { studio: Studio; hoje: DiaISO; ags: Agendamento[]; totalDia: number; vencidas: number; aniversarios: number }): string {
  const ativos = o.ags.filter((a) => a.ativo);
  return `
<h1>${diaFalado(o.hoje, o.hoje)[0].toUpperCase() + diaFalado(o.hoje, o.hoje).slice(1)} · ${br(o.hoje)}</h1>
${o.vencidas ? `<a class="banner" href="/clientes?filtro=vencidas">💅 <b>${o.vencidas} cliente${o.vencidas > 1 ? "s" : ""} com unha vencida</b> — toque para ver e chamar de volta ›</a>` : ""}
${o.aniversarios ? `<a class="banner suave" href="/clientes?filtro=aniversarios">🎂 ${o.aniversarios} aniversariante${o.aniversarios > 1 ? "s" : ""} este mês ›</a>` : ""}
<div class="grade g3">
  <div class="cartao"><div class="num">${ativos.length}<small>atendimentos hoje</small></div></div>
  <div class="cartao"><div class="num gold">${reais(o.totalDia)}<small>previsto hoje</small></div></div>
  <div class="cartao"><div class="num">${ativos.filter((a) => a.situacao === "concluido").length}<small>já concluídos</small></div></div>
</div>
<div class="acoes"><a class="botao" href="/agenda/novo?dia=${o.hoje}">+ Novo horário</a><a class="botao sec" href="/agenda/mapa">Ver o mapa</a></div>
<h2>A agenda de hoje</h2>
${o.ags.length ? o.ags.map((a) => cardAg(a, o.hoje)).join("") : `<div class="cartao"><p class="mudo">Nenhum horário por aqui ainda 🌸 <a href="/agenda/novo?dia=${o.hoje}">Marcar o primeiro</a></p></div>`}`;
}

export function telaDia(o: { hoje: DiaISO; dia: DiaISO; ags: Agendamento[]; total: number; comAg: Set<DiaISO> }): string {
  return `
<h1>Agenda</h1>
${tiraDias("/agenda", o.dia, o.hoje, o.comAg)}
<p class="mudo">${diaFalado(o.dia, o.hoje)} · ${o.ags.filter((a) => a.ativo).length} atendimento(s) · <span class="valor">${reais(o.total)}</span> previstos</p>
<div class="acoes nao-imprime"><a class="botao" href="/agenda/novo?dia=${o.dia}">+ Novo horário em ${brCurto(o.dia)}</a></div>
${o.ags.length ? o.ags.map((a) => cardAg(a, o.hoje)).join("") : `<div class="cartao"><p class="mudo">Dia livre 🌿</p></div>`}`;
}

export function telaSemana(o: { hoje: DiaISO; ini: DiaISO; porDia: Map<DiaISO, Agendamento[]> }): string {
  let corpo = "";
  for (let i = 0; i < 7; i++) {
    const d = somarDias(o.ini, i);
    const l = o.porDia.get(d) ?? [];
    corpo += `<h3 style="margin-top:18px">${diaFalado(d, o.hoje)} <span class="mudo">· ${br(d)}${l.length ? ` — ${l.filter((a) => a.ativo).length} atendimento(s)` : ""}</span></h3>`;
    corpo += l.length ? l.map((a) => cardAg(a, o.hoje)).join("") : `<p class="mudo">Livre 🌿</p>`;
  }
  return `
<h1>Semana</h1>
<div class="acoes"><a class="botao sec" href="/agenda/semana?dia=${somarDias(o.ini, -7)}">‹ anterior</a>
<b>${brCurto(o.ini)} – ${brCurto(somarDias(o.ini, 6))}</b>
<a class="botao sec" href="/agenda/semana?dia=${somarDias(o.ini, 7)}">próxima ›</a></div>${corpo}`;
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
      return `<a class="bloco" style="top:${top}px;height:${h}px;background:${e(c.cor)}" href="/agenda/${a.id}">
        ${e(a.inicio)} ${e((a.cliente_nome ?? "").split(" ")[0])}<small>${e(a.servico_nome)}</small></a>`;
    }).join("");
    return `<div class="col" style="height:${altura}px"><h4>${e(c.nome)}</h4>${slots}${blocos}</div>`;
  }).join("");
  return `
<h1>Mapa — ${diaFalado(o.dia, o.hoje)}</h1>
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
<h1>${o.editando ? `Remarcar ${e(o.editando.codigo)}` : "Novo horário"} ✨</h1>
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
  <div class="acoes"><button>Salvar horário ✨</button> <a class="botao sec" href="/agenda?dia=${e(f.dia)}">Voltar</a></div>
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
  ${a.observacoes ? `<p class="mudo">📝 ${e(a.observacoes)}</p>` : ""}
  <div class="acoes">
    ${a.situacao === "pendente" ? `<form method="post" action="/agenda/${a.id}/confirmar"><button>Confirmar 💖</button></form>` : ""}
    <a class="botao zap" href="${zap}" target="_blank" rel="noopener">WhatsApp 💬</a>
    ${aberto ? `<a class="botao sec" href="/agenda/${a.id}/concluir">Concluir ✔</a>
    <a class="botao sec" href="/agenda/novo?editar=${a.id}&dia=${a.data}&servico=${a.servico_id}${a.profissional_id ? `&prof=${a.profissional_id}` : ""}&inicio=${a.inicio}">Remarcar</a>
    ${o.temAsaas && o.podeFinanceiro && a.preco > 0 ? `<a class="botao sec" href="/agenda/${a.id}/cobrar">Cobrar pelo Asaas 💳</a>` : ""}
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
<h1>Concluir atendimento ✔</h1>
<form method="post" action="/agenda/${a.id}/concluir" class="cartao">
  <p><b>${e(a.cliente_nome)}</b> · ${e(a.servico_nome)} · ${br(a.data)} às ${e(a.inicio)}</p>
  <div class="linha">
    <div><label>Valor cobrado (R$)</label><input name="preco" inputmode="decimal" value="${(a.preco / 100).toFixed(2).replace(".", ",")}"></div>
    <div><label>Forma de pagamento</label><select name="forma">${opcoes(formas, "pix")}</select></div>
  </div>
  <p class="mudo">A receita entra no caixa na hora (o que já foi pago pelo Asaas não entra de novo).</p>
  <div class="acoes"><button>Concluir e lançar no caixa ✨</button> <a class="botao sec" href="/agenda/${a.id}">Voltar</a></div>
</form>`;
}

export function telaCobrar(a: Agendamento, hoje: DiaISO): string {
  return `
<h1>Cobrar pelo Asaas 💳</h1>
<form method="post" action="/agenda/${a.id}/cobrar" class="cartao">
  <p><b>${e(a.cliente_nome)}</b> · ${e(a.servico_nome)} · ${br(a.data)} às ${e(a.inicio)}</p>
  <div class="linha">
    <div><label>Finalidade</label><select name="finalidade">${opcoes({ sinal: "Sinal (garante o horário)", servico: "Serviço completo" }, "sinal")}</select></div>
    <div><label>Valor (R$)</label><input name="valor" inputmode="decimal" value="${(a.preco / 100).toFixed(2).replace(".", ",")}" required></div>
    <div><label>Como ela paga</label><select name="meio">${opcoes({ pix: "Pix (QR na hora)", link: "Link (Pix, cartão ou boleto)" }, "pix")}</select></div>
    <div><label>Vencimento</label><input type="date" name="vencimento" value="${somarDias(hoje, 1)}" min="${hoje}" required></div>
  </div>
  <p class="mudo">Sinal pago confirma o horário sozinho (o Asaas avisa e o sistema confere na API).</p>
  <div class="acoes"><button>Gerar cobrança ✨</button> <a class="botao sec" href="/agenda/${a.id}">Voltar</a></div>
</form>`;
}

export function telaCobrancaPronta(a: Agendamento, c: Cobranca): string {
  return `
<h1>Cobrança criada ✨</h1>
<div class="cartao">
  <p><b>${e(a.cliente_nome)}</b> · ${reais(c.valor)} · vence ${br(c.vencimento)}</p>
  ${c.pix_qr_base64 ? `<p><img class="qr" alt="QR do Pix" src="data:image/png;base64,${e(c.pix_qr_base64)}"></p>` : ""}
  ${c.pix_copia_cola ? `<label>Pix copia e cola</label><code class="pix">${e(c.pix_copia_cola)}</code>` : ""}
  ${c.url_fatura ? `<p><a class="botao" href="${e(c.url_fatura)}" target="_blank" rel="noopener">Abrir a fatura</a></p>` : ""}
  ${a.cliente_telefone ? `<p><a class="botao zap" target="_blank" rel="noopener" href="https://wa.me/${e(a.cliente_telefone)}?text=${encodeURIComponent(`Oi, ${(a.cliente_nome ?? "").split(" ")[0]}! 💖 Aqui está ${c.finalidade === "sinal" ? "o sinal para garantir seu horário" : "o pagamento do seu horário"}: ${c.url_fatura ?? "(Pix copia e cola na mensagem seguinte)"}`)}">Mandar no WhatsApp 💬</a></p>` : ""}
  <div class="acoes"><a class="botao sec" href="/agenda/${a.id}">Voltar ao atendimento</a></div>
</div>`;
}
