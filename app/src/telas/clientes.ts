/** Telas de clientes: lista com filtros (vencidas, aniversários, leads), ficha e formulário. */
import { e } from "../http/resposta.ts";
import { etiqueta, opcoes } from "./base.ts";
import { ORIGENS, type Cliente, type Contagens } from "../clientes/clientes.ts";
import type { Agendamento } from "../agenda/agenda.ts";
import type { AssinaturaCliente } from "../planos/planos.ts";
import { br, brCurto, diasEntre, type DiaISO } from "../dados/datas.ts";
import { reais } from "../dados/dinheiro.ts";
import { cardAg } from "./agenda.ts";

const fmtFone = (p: string | null) => {
  if (!p) return "";
  const d = p.replace(/\D/g, "");
  const n = d.startsWith("55") ? d.slice(2) : d;
  return n.length >= 10 ? `(${n.slice(0, 2)}) ${n.slice(2, -4)}-${n.slice(-4)}` : n;
};

function zapVencida(c: Cliente, hoje: DiaISO, studioNome: string): string {
  const dias = c.vence_em ? diasEntre(c.ultima!, hoje) : 0;
  const msg = encodeURIComponent(`Oi, ${c.nome.split(" ")[0]}! 💅 Senti sua falta por aqui — já faz ${dias} dias desde a sua última unha. Que tal garantir seu horário essa semana no ${studioNome}? Tenho encaixes ótimos te esperando ✨`);
  return c.telefone ? `https://wa.me/${c.telefone}?text=${msg}` : `https://wa.me/?text=${msg}`;
}

function subCliente(c: Cliente, hoje: DiaISO): string {
  const partes: string[] = [];
  if (c.situacao === "lead") partes.push(etiqueta("lead") + ` <span class="mudo">${e(ORIGENS[c.origem] ?? c.origem)}</span>`);
  if (c.vence_em && c.vence_em < hoje) partes.push(`<span class="etiqueta e-vencida-unha">vencida há ${diasEntre(c.vence_em, hoje)}d</span>`);
  else if (c.vence_em) partes.push(`<span class="mudo">vence ${brCurto(c.vence_em)}</span>`);
  if (c.nascimento && c.nascimento.slice(5, 7) === hoje.slice(5, 7)) partes.push(`<span class="etiqueta e-niver">🎂 ${c.nascimento.slice(8)}/${c.nascimento.slice(5, 7)}</span>`);
  return partes.length ? partes.join(" ") : `<span class="mudo">${e(fmtFone(c.telefone)) || "sem telefone"}</span>`;
}

export function telaClientes(o: { hoje: DiaISO; studioNome: string; filtro: string; q: string; lista: Cliente[]; n: Contagens }): string {
  const pills: [string, string, number][] = [
    ["todas", "Todas", o.n.total], ["vencidas", "Unha vencida", o.n.vencidas],
    ["aniversarios", "🎂 Aniversários", o.n.aniversarios], ["leads", "Leads", o.n.leads]];
  return `
<h1>Clientes</h1>
${o.n.vencidas && o.filtro !== "vencidas" ? `<a class="banner" href="/clientes?filtro=vencidas">💅 <b>${o.n.vencidas} cliente${o.n.vencidas > 1 ? "s" : ""} com unha vencida</b> — campanha de retorno pronta ›</a>` : ""}
<div class="pilulas">${pills.map(([f, t, n]) =>
  `<a class="pill ${o.filtro === f ? "ativa" : ""}" href="/clientes?filtro=${f}">${t}${n && f !== "todas" ? `<span class="n">${n}</span>` : ""}</a>`).join("")}
<a class="pill" href="/clientes/nova">+ Nova cliente</a></div>
<form method="get" action="/clientes" class="campo" style="max-width:420px">
  <input type="hidden" name="filtro" value="${e(o.filtro)}">
  <input type="search" name="q" placeholder="Buscar por nome ou telefone…" value="${e(o.q)}">
</form>
${o.lista.length ? `<div style="margin-top:12px">${o.lista.map((c) => `
<a class="ag" href="/clientes/${c.id}">
  <span class="avatar">${e(c.nome.split(" ").map((p) => p[0]).slice(0, 2).join(""))}</span>
  <div class="meio"><b>${e(c.nome)}</b><span>${subCliente(c, o.hoje)}</span></div>
  ${o.filtro === "vencidas" ? `<span class="fim"><span class="botao zap pequeno" onclick="event.preventDefault();window.open('${zapVencida(c, o.hoje, o.studioNome)}','_blank')">💬 chamar</span></span>` : `<span class="mudo">›</span>`}
</a>`).join("")}</div>` : `<div class="cartao"><p class="mudo">Ninguém por aqui ${o.q ? "com essa busca" : "ainda"} 🌸</p></div>`}`;
}

export function telaCliente(o: { c: Cliente; hoje: DiaISO; studioNome: string; hist: Agendamento[]; assinatura: AssinaturaCliente | null }): string {
  const c = o.c;
  const vencida = c.vence_em && c.vence_em < o.hoje;
  return `
<h1>${e(c.nome)} ${c.situacao !== "ativa" ? etiqueta(c.situacao) : ""}</h1>
<div class="cartao">
  <p class="mudo">${e(fmtFone(c.telefone)) || "sem telefone"}${c.email ? ` · ${e(c.email)}` : ""} · origem: ${e(ORIGENS[c.origem] ?? c.origem)}
  ${c.nascimento ? ` · 🎂 ${c.nascimento.slice(8)}/${c.nascimento.slice(5, 7)}` : ""}${c.cpf ? ` · CPF ${e(c.cpf)}` : ""}</p>
  ${c.observacoes ? `<p class="mudo">📝 ${e(c.observacoes)}</p>` : ""}
  ${c.ultima ? (vencida
    ? `<p class="banner" style="margin:10px 0 0">💅 Unha <b>vencida há ${diasEntre(c.vence_em!, o.hoje)} dia(s)</b> — última (${e(c.servico_nome ?? "")}) em ${br(c.ultima)}</p>`
    : c.vence_em ? `<p class="banner suave" style="margin:10px 0 0">💅 Última unha em ${br(c.ultima)} · vence em ${br(c.vence_em)}</p>` : `<p class="mudo">Última unha em ${br(c.ultima)}</p>`) : ""}
  ${o.assinatura ? `<p>🔁 Assinatura ativa: <b>${e(o.assinatura.plano_nome)}</b> · ${reais(o.assinatura.preco)}/${e(o.assinatura.periodo)} · dias ${o.assinatura.dias_mes.join(", ")} às ${e(o.assinatura.hora)}${o.assinatura.pago_ate ? ` · paga até ${br(o.assinatura.pago_ate)}` : ""} — <a href="/configuracoes/planos">gerenciar</a></p>` : ""}
  <div class="acoes">
    <a class="botao" href="/agenda/novo?cliente=${c.id}">Agendar horário ✨</a>
    ${vencida ? `<a class="botao zap" target="_blank" rel="noopener" href="${zapVencida(c, o.hoje, o.studioNome)}">Chamar de volta 💅💬</a>`
      : c.telefone ? `<a class="botao zap" target="_blank" rel="noopener" href="https://wa.me/${e(c.telefone)}?text=${encodeURIComponent(`Oi, ${c.nome.split(" ")[0]}! 💖`)}">WhatsApp 💬</a>` : ""}
    ${!o.assinatura ? `<a class="botao sec" href="/configuracoes/planos?cliente=${c.id}">Vender plano 🔁</a>` : ""}
    <a class="botao sec" href="/clientes/${c.id}/editar">Editar</a>
  </div>
</div>
<h2>Histórico</h2>
${o.hist.length ? o.hist.map((a) => cardAg(a, o.hoje, true)).join("") : `<p class="mudo">Nenhum atendimento ainda.</p>`}`;
}

export function telaClienteForm(o: { c?: Cliente | null; voltar?: string }): string {
  const c = o.c ?? null;
  return `
<h1>${c ? "Editar cliente" : "Nova cliente"} 💕</h1>
<form method="post" action="${c ? `/clientes/${c.id}/editar` : "/clientes/nova"}" class="cartao">
  ${o.voltar ? `<input type="hidden" name="voltar" value="${e(o.voltar)}">` : ""}
  <div class="linha">
    <div style="grid-column:1/-1"><label>Nome</label><input name="nome" value="${e(c?.nome ?? "")}" required autofocus></div>
    <div><label>WhatsApp (com DDI)</label><input name="telefone" inputmode="numeric" placeholder="5527999999999" value="${e(c?.telefone ?? "")}"></div>
    <div><label>E-mail</label><input name="email" type="email" value="${e(c?.email ?? "")}"></div>
    <div><label>CPF <span class="mudo">(para cobrar pelo Asaas)</span></label><input name="cpf" inputmode="numeric" value="${e(c?.cpf ?? "")}"></div>
    <div><label>Aniversário</label><input type="date" name="nascimento" value="${e(c?.nascimento ?? "")}"></div>
    <div><label>Como ela chegou? (origem do lead)</label><select name="origem">${opcoes(ORIGENS, c?.origem ?? "instagram")}</select></div>
    <div><label>Situação</label><select name="situacao">${opcoes({ ativa: "Cliente", lead: "Lead (ainda não atendeu)", inativa: "Inativa" }, c?.situacao ?? "ativa")}</select></div>
  </div>
  <div class="campo"><label>Observações <span class="mudo">(alergias, preferências)</span></label><textarea name="observacoes" rows="2">${e(c?.observacoes ?? "")}</textarea></div>
  <details class="campo"><summary>Endereço (opcional)</summary>
    <div class="linha">
      <div><label>CEP</label><input name="cep" value="${e(c?.cep ?? "")}"></div>
      <div style="grid-column:span 2"><label>Endereço</label><input name="endereco" value="${e(c?.endereco ?? "")}"></div>
      <div><label>Cidade</label><input name="cidade" value="${e(c?.cidade ?? "")}"></div>
      <div><label>UF</label><input name="uf" maxlength="2" value="${e(c?.uf ?? "")}"></div>
    </div>
  </details>
  <div class="acoes"><button>Salvar ✨</button> <a class="botao sec" href="${c ? `/clientes/${c.id}` : "/clientes"}">Voltar</a></div>
</form>`;
}
