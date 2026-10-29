/** Configurações: studio, serviços, produtos, equipe, planos/assinaturas, Asaas, auditoria, exportar. */
import { e } from "../http/resposta.ts";
import { etiqueta, opcoes } from "./base.ts";
import type { Studio } from "../studio/studio.ts";
import type { Usuario } from "../auth/sessao.ts";
import { PAPEIS } from "../auth/sessao.ts";
import { reais } from "../dados/dinheiro.ts";
import { br, brInstante, type DiaISO } from "../dados/datas.ts";
import type { Prof, Srv } from "./agenda.ts";
import type { Plano, AssinaturaCliente } from "../planos/planos.ts";
import type { Cliente } from "../clientes/clientes.ts";

const CORES = ["#E91E8C", "#9C27B0", "#B8860B", "#FF8A65", "#2E9E6B", "#5C6BC0"];
const centavosBR = (v: number) => (v / 100).toFixed(2).replace(".", ",");

export function telaStudio(s: Studio, equipe: (Usuario & { ultimo_acesso: string | null })[]): string {
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return `
<h1>Configurações do studio</h1>
<form method="post" action="/configuracoes" class="cartao">
  <h3>Identidade</h3>
  <div class="linha">
    <div style="grid-column:span 2"><label>Nome do studio</label><input name="nome" value="${e(s.nome)}" required></div>
    <div><label>Cor da marca</label><input type="color" name="cor" value="${e(s.cor)}"></div>
    <div style="grid-column:span 2"><label>Logo (URL, opcional)</label><input name="logo_url" value="${e(s.logo_url ?? "")}"></div>
    <div><label>WhatsApp (com DDI)</label><input name="telefone" inputmode="numeric" value="${e(s.telefone ?? "")}"></div>
    <div><label>E-mail do studio</label><input name="email" type="email" value="${e(s.email ?? "")}"></div>
    <div><label>CNPJ/CPF <span class="mudo">(para a cobrança do ClavusOS)</span></label><input name="cnpj_cpf" value="${e(s.cnpj_cpf ?? "")}"></div>
    <div><label>Cidade</label><input name="cidade" value="${e(s.cidade ?? "")}"></div>
    <div><label>UF</label><input name="uf" maxlength="2" value="${e(s.uf ?? "")}"></div>
  </div>
  <h3>Horário de atendimento</h3>
  <div class="chips">${dias.map((d, i) => `<label class="chip"><input type="checkbox" name="dia_${i}" ${s.dias_atendimento.includes(i) ? "checked" : ""}>${d}</label>`).join("")}</div>
  <div class="linha" style="margin-top:12px">
    <div><label>Abre</label><input type="time" name="abre" value="${e(s.abre)}"></div>
    <div><label>Fecha</label><input type="time" name="fecha" value="${e(s.fecha)}"></div>
    <div><label>Grade da agenda</label><select name="slot_minutos">${opcoes([["15", "15 minutos"], ["20", "20 minutos"], ["30", "30 minutos"], ["60", "60 minutos"]], String(s.slot_minutos))}</select></div>
    <div><label>Ciclo padrão da unha (dias)</label><input type="number" name="ciclo_dias" min="0" max="120" value="${s.ciclo_dias}"></div>
  </div>
  <p class="mudo">O ciclo alimenta o alerta de "unha vencida" quando o serviço não tem um ciclo próprio. 0 = desligado.</p>
  <h3>Agendamento online (a cliente marca sozinha)</h3>
  <div class="linha">
    <div><label>Página pública /agendar</label><select name="agendar_online">${opcoes([["1", "Ligada"], ["0", "Desligada"]], s.agendar_online ? "1" : "0")}</select></div>
    <div><label>Antecedência máxima (dias)</label><input type="number" name="agendar_antecedencia" min="1" max="365" value="${s.agendar_antecedencia}"></div>
  </div>
  <div class="campo"><label>Recado no topo da página <span class="mudo">(opcional)</span></label><input name="agendar_texto" value="${e(s.agendar_texto ?? "")}"></div>
  <div class="acoes"><button>Salvar</button></div>
</form>

<h2>Equipe (quem entra no sistema)</h2>
<div class="cartao tabela"><table>
<tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Último acesso</th><th></th></tr>
${equipe.map((u) => `<tr${u.ativo ? "" : ' style="opacity:.5"'}><td>${e(u.nome)}</td><td>${e(u.email)}</td><td>${e(PAPEIS[u.papel] ?? u.papel)}</td>
<td class="mudo">${u.ultimo_acesso ? brInstante(u.ultimo_acesso, s.fuso) : "nunca entrou"}</td>
<td class="direita"><form method="post" action="/configuracoes/equipe-usuario" style="display:inline"><input type="hidden" name="id" value="${u.id}"><input type="hidden" name="acao" value="${u.ativo ? "desativar" : "ativar"}"><button class="pequeno sec">${u.ativo ? "desativar" : "ativar"}</button></form></td></tr>`).join("")}
</table>
<details style="margin-top:14px"><summary>+ Convidar pessoa para o sistema</summary>
<form method="post" action="/configuracoes/equipe-usuario">
  <input type="hidden" name="acao" value="convidar">
  <div class="linha"><div><label>Nome</label><input name="nome" required></div>
  <div><label>E-mail</label><input name="email" type="email" required></div>
  <div><label>Papel</label><select name="papel">${opcoes(PAPEIS, "profissional")}</select></div></div>
  <p class="mudo">Ela recebe um link por e-mail (vale 3 dias) para criar a própria senha. Profissional vê a agenda e as clientes; gerência vê também o caixa; administrador vê tudo.</p>
  <div class="acoes"><button>Convidar</button></div>
</form></details></div>`;
}

export function telaServicos(lista: (Srv & { ciclo_dias: number; sinal_pct: number })[]): string {
  return `
<h1>Serviços</h1>
${lista.map((s) => `<div class="ag" style="cursor:default">
  <span class="avatar" style="background:${e(s.cor)}22;color:${e(s.cor)}">${e(s.nome.slice(0, 1).toUpperCase())}</span>
  <div class="meio"><b>${e(s.nome)}</b><span>${s.duracao_min} min${s.ciclo_dias ? ` · vence em ${s.ciclo_dias}d` : ""}${s.sinal_pct ? ` · sinal ${s.sinal_pct}%` : ""}</span></div>
  <div class="fim"><span class="valor">${reais(s.preco)}</span><br>
  <a class="botao pequeno sec" href="/configuracoes/servicos?editar=${s.id}">editar</a>
  <form method="post" action="/configuracoes/servicos" style="display:inline"><input type="hidden" name="toggle" value="${s.id}"><button class="pequeno ${s.ativo ? "sec" : ""}">${s.ativo ? "desativar" : "ativar"}</button></form></div>
</div>`).join("")}
<p class="mudo" style="margin-top:4px">Serviço desativado some do agendamento, mas mantém o histórico.</p>`;
}

export function telaServicoForm(s: (Srv & { ciclo_dias: number; sinal_pct: number }) | null, cicloPadrao: number): string {
  return `
<form method="post" action="/configuracoes/servicos" class="cartao" style="margin-top:14px">
  <h3>${s ? "Editar serviço" : "Novo serviço"}</h3>
  ${s ? `<input type="hidden" name="id" value="${s.id}">` : ""}
  <div class="linha">
    <div style="grid-column:span 2"><label>Nome</label><input name="nome" value="${e(s?.nome ?? "")}" required></div>
    <div><label>Preço (R$)</label><input name="preco" inputmode="decimal" value="${s ? centavosBR(s.preco) : ""}" required></div>
    <div><label>Duração (min)</label><input type="number" name="duracao" min="5" step="5" value="${s?.duracao_min ?? 60}" required></div>
    <div><label>Vencimento da unha (dias)</label><input type="number" name="ciclo" min="0" max="120" value="${s?.ciclo_dias ?? cicloPadrao}"></div>
    <div><label>Sinal no agendamento online (%)</label><input type="number" name="sinal" min="0" max="100" value="${s?.sinal_pct ?? 0}"></div>
  </div>
  <div class="campo"><label>Cor</label><div class="chips">${CORES.map((c) => `<label class="chip"><input type="radio" name="cor" value="${c}" ${(s?.cor ?? CORES[0]) === c ? "checked" : ""}><span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${c};vertical-align:-3px"></span></label>`).join("")}</div></div>
  <div class="acoes"><button>Salvar</button>${s ? ` <a class="botao sec" href="/configuracoes/servicos">cancelar</a>` : ""}</div>
</form>`;
}

export function telaProdutos(lista: { id: string; nome: string; preco: number; custo: number; estoque: number; ativo: boolean }[], editar: typeof lista[0] | null): string {
  return `
<h1>Produtos</h1>
<p class="mudo">Vendas entram no caixa pelo botão “Venda de produto” — com baixa de estoque.</p>
${lista.map((p) => `<div class="ag" style="cursor:default">
  <span class="avatar">${e(p.nome.slice(0, 1).toUpperCase())}</span>
  <div class="meio"><b>${e(p.nome)}</b><span>estoque: ${p.estoque} · custo ${reais(p.custo)}</span></div>
  <div class="fim"><span class="valor">${reais(p.preco)}</span><br>
  <a class="botao pequeno sec" href="/configuracoes/produtos?editar=${p.id}">editar</a>
  <form method="post" action="/configuracoes/produtos" style="display:inline"><input type="hidden" name="toggle" value="${p.id}"><button class="pequeno ${p.ativo ? "sec" : ""}">${p.ativo ? "desativar" : "ativar"}</button></form></div>
</div>`).join("") || `<div class="cartao"><p class="mudo">Nenhum produto ainda</p></div>`}
<form method="post" action="/configuracoes/produtos" class="cartao" style="margin-top:14px">
  <h3>${editar ? "Editar produto" : "Novo produto"}</h3>
  ${editar ? `<input type="hidden" name="id" value="${editar.id}">` : ""}
  <div class="linha">
    <div style="grid-column:span 2"><label>Nome</label><input name="nome" value="${e(editar?.nome ?? "")}" required></div>
    <div><label>Preço de venda (R$)</label><input name="preco" inputmode="decimal" value="${editar ? centavosBR(editar.preco) : ""}" required></div>
    <div><label>Custo (R$)</label><input name="custo" inputmode="decimal" value="${editar ? centavosBR(editar.custo) : ""}"></div>
    <div><label>Estoque</label><input type="number" name="estoque" min="0" value="${editar?.estoque ?? 0}"></div>
  </div>
  <div class="acoes"><button>Salvar</button>${editar ? ` <a class="botao sec" href="/configuracoes/produtos">cancelar</a>` : ""}</div>
</form>`;
}

export function telaEquipe(lista: Prof[], editar: (Prof & { comissao_pct: number; usuario_id: string | null }) | null, usuarios: Usuario[]): string {
  return `
<h1>Profissionais</h1>
<p class="mudo">Cada atendimento pode ter uma profissional; a produção e a comissão aparecem em Relatórios. O acesso ao sistema (login) é à parte, em Configurações → Studio → Equipe.</p>
${lista.map((p) => `<div class="ag" style="cursor:default">
  <span class="avatar" style="background:${e(p.cor)}22;color:${e(p.cor)}">${e(p.nome.split(" ").map((x) => x[0]).slice(0, 2).join(""))}</span>
  <div class="meio"><b>${e(p.nome)}</b><span>comissão ${(p as Prof & { comissao_pct?: number }).comissao_pct ?? 0}%</span></div>
  <div class="fim"><a class="botao pequeno sec" href="/configuracoes/equipe?editar=${p.id}">editar</a>
  <form method="post" action="/configuracoes/equipe" style="display:inline"><input type="hidden" name="toggle" value="${p.id}"><button class="pequeno ${p.ativo ? "sec" : ""}">${p.ativo ? "desativar" : "ativar"}</button></form></div>
</div>`).join("") || `<div class="cartao"><p class="mudo">Só você por enquanto — adicione quando a equipe crescer.</p></div>`}
<form method="post" action="/configuracoes/equipe" class="cartao" style="margin-top:14px">
  <h3>${editar ? "Editar profissional" : "Nova profissional"}</h3>
  ${editar ? `<input type="hidden" name="id" value="${editar.id}">` : ""}
  <div class="linha">
    <div style="grid-column:span 2"><label>Nome</label><input name="nome" value="${e(editar?.nome ?? "")}" required></div>
    <div><label>Comissão sobre serviços (%)</label><input type="number" name="comissao" min="0" max="100" step="0.5" value="${editar?.comissao_pct ?? 0}"></div>
    <div><label>Login dela <span class="mudo">(opcional)</span></label><select name="usuario_id"><option value="">— sem login —</option>
      ${usuarios.map((u) => `<option value="${u.id}"${editar?.usuario_id === u.id ? " selected" : ""}>${e(u.nome)} (${e(u.email)})</option>`).join("")}</select></div>
  </div>
  <div class="campo"><label>Cor dela no mapa</label><div class="chips">${CORES.map((c) => `<label class="chip"><input type="radio" name="cor" value="${c}" ${(editar?.cor ?? CORES[0]) === c ? "checked" : ""}><span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${c};vertical-align:-3px"></span></label>`).join("")}</div></div>
  <div class="acoes"><button>Salvar</button>${editar ? ` <a class="botao sec" href="/configuracoes/equipe">cancelar</a>` : ""}</div>
</form>`;
}

export function telaPlanos(o: {
  hoje: DiaISO; planos: Plano[]; assinaturas: AssinaturaCliente[]; servicos: Srv[]; profs: Prof[];
  clientes: Cliente[]; clientePre: string | null; editar: Plano | null; temAsaas: boolean;
}): string {
  return `
<h1>Planos e assinaturas</h1>
<div class="grade g2">
${o.planos.map((p) => `<div class="cartao">
  <h3>${e(p.nome)} ${p.ativo ? "" : etiqueta("inativa")}</h3>
  <p><span class="valor">${reais(p.preco)}</span>/${e(p.periodo)} · ${p.visitas_mes}x por mês · ${e(p.servico_nome ?? "")}</p>
  <div class="acoes"><a class="botao pequeno sec" href="/configuracoes/planos?editar=${p.id}">editar</a>
  <form method="post" action="/configuracoes/planos"><input type="hidden" name="toggle" value="${p.id}"><button class="pequeno sec">${p.ativo ? "desativar" : "ativar"}</button></form></div>
</div>`).join("") || `<div class="cartao"><p class="mudo">Crie planos mensais, trimestrais, semestrais ou anuais e venda recorrência</p></div>`}
</div>
<form method="post" action="/configuracoes/planos" class="cartao">
  <h3>${o.editar ? "Editar plano" : "Novo plano"}</h3>
  ${o.editar ? `<input type="hidden" name="id" value="${o.editar.id}">` : ""}
  <div class="linha">
    <div style="grid-column:span 2"><label>Nome</label><input name="nome" value="${e(o.editar?.nome ?? "")}" placeholder="Plano Gel Mensal" required></div>
    <div><label>Período de cobrança</label><select name="periodo">${opcoes({ mensal: "Mensal", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual" }, o.editar?.periodo ?? "mensal")}</select></div>
    <div><label>Preço do período (R$)</label><input name="preco" inputmode="decimal" value="${o.editar ? centavosBR(o.editar.preco) : ""}" required></div>
    <div><label>Visitas por mês</label><input type="number" name="visitas" min="1" max="10" value="${o.editar?.visitas_mes ?? 2}" required></div>
    <div><label>Serviço incluído</label><select name="servico_id" required>${o.servicos.map((s) => `<option value="${s.id}"${o.editar?.servico_id === s.id ? " selected" : ""}>${e(s.nome)}</option>`).join("")}</select></div>
  </div>
  <div class="acoes"><button>Salvar plano</button>${o.editar ? ` <a class="botao sec" href="/configuracoes/planos">cancelar</a>` : ""}</div>
</form>

<h2>Vender assinatura</h2>
<form method="post" action="/configuracoes/planos/vender" class="cartao">
  <div class="linha">
    <div><label>Cliente</label><select name="cliente_id" required><option value="">— escolher —</option>
      ${o.clientes.map((c) => `<option value="${c.id}"${o.clientePre === c.id ? " selected" : ""}>${e(c.nome)}</option>`).join("")}</select></div>
    <div><label>Plano</label><select name="plano_id" required>${o.planos.filter((p) => p.ativo).map((p) => `<option value="${p.id}">${e(p.nome)} · ${reais(p.preco)}/${e(p.periodo)}</option>`).join("")}</select></div>
    <div><label>Horário preferido</label><input type="time" name="hora" value="09:00" required></div>
    ${o.profs.length ? `<div><label>Profissional</label><select name="profissional_id"><option value="">—</option>${o.profs.map((p) => `<option value="${p.id}">${e(p.nome)}</option>`).join("")}</select></div>` : ""}
    <div><label>Início</label><input type="date" name="inicio" value="${o.hoje}" required></div>
  </div>
  <div class="campo"><label>Dias do mês que ela prefere (até o nº de visitas do plano)</label>
    <div class="chips">${Array.from({ length: 28 }, (_, i) => i + 1).map((d) => `<label class="chip"><input type="checkbox" name="dia_${d}">${d}</label>`).join("")}</div></div>
  <p class="mudo">${o.temAsaas
    ? "Com o Asaas conectado, a cobrança nasce automática: o Asaas fatura a cliente no ciclo do plano e o sistema dá baixa sozinho."
    : "Sem o Asaas conectado, a cobrança é manual: use “Registrar recebimento” a cada período (conecte o Asaas em Configurações → Asaas do studio para automatizar)."}</p>
  <div class="acoes"><button>Ativar assinatura</button></div>
</form>

<h2>Assinaturas ativas</h2>
${o.assinaturas.length ? o.assinaturas.map((a) => {
    const atrasada = a.pago_ate && a.pago_ate < o.hoje;
    return `<div class="cartao">
  <h3>${e(a.cliente_nome)} · ${e(a.plano_nome)}</h3>
  <p>Dias ${a.dias_mes.join(", ")} às ${e(a.hora)}${a.profissional_nome ? ` · ${e(a.profissional_nome)}` : ""} · <span class="valor">${reais(a.preco)}</span>/${e(a.periodo)}<br>
  ${a.pago_ate ? `Paga até <b>${br(a.pago_ate)}</b> ${atrasada ? etiqueta("vencida") : ""}` : `<span class="mudo">Nenhum pagamento registrado ainda</span>`}
  ${a.asaas_assinatura_id ? ` · <span class="mudo">cobrança automática pelo Asaas</span>` : ""}</p>
  <div class="acoes">
    <form method="post" action="/configuracoes/planos/gerar"><input type="hidden" name="id" value="${a.id}"><button class="sec">Gerar horários deste mês</button></form>
    ${!a.asaas_assinatura_id ? `<form method="post" action="/configuracoes/planos/receber"><input type="hidden" name="id" value="${a.id}">
      <button>Registrar recebimento ${reais(a.preco)}</button></form>` : ""}
    <form method="post" action="/configuracoes/planos/cancelar"><input type="hidden" name="id" value="${a.id}"><button class="perigo" data-confirmar>Cancelar assinatura</button></form>
  </div>
</div>`;
  }).join("") : `<p class="mudo">Nenhuma assinatura ativa ainda.</p>`}`;
}

export function telaAsaasStudio(s: Studio, host: string): string {
  return `
<h1>Asaas do studio</h1>
<div class="cartao">
  <p>Com o Asaas conectado, você cobra as clientes por Pix, cartão, boleto ou link — sinal de horário, serviço e as assinaturas dos planos — e a baixa é automática. O dinheiro cai direto na <b>sua</b> conta Asaas; ele nunca passa pelo ClavusOS.</p>
  <p class="mudo">A chave fica guardada <b>cifrada</b> (AES-256) no banco. Cartão nunca passa pelo sistema: a cliente paga no checkout do próprio Asaas.</p>
  <form method="post" action="/configuracoes/asaas">
    <div class="linha">
      <div style="grid-column:span 2"><label>Chave da API do Asaas ${s.asaas_chave_cifrada ? '<span class="mudo">(já conectada — cole outra para trocar)</span>' : ""}</label>
        <input name="chave" type="password" placeholder="${s.asaas_chave_cifrada ? "••••••••••••" : "$aact_..."}" autocomplete="off"></div>
      <div><label>Ambiente</label><select name="ambiente">${opcoes({ sandbox: "Sandbox (testes)", producao: "Produção (dinheiro de verdade)" }, s.asaas_ambiente)}</select></div>
    </div>
    <div class="acoes"><button>${s.asaas_chave_cifrada ? "Salvar e testar" : "Conectar e testar"}</button>
    ${s.asaas_chave_cifrada ? `<button name="desconectar" value="1" class="perigo" data-confirmar>Desconectar</button>` : ""}</div>
  </form>
</div>
<div class="cartao">
  <h3>Webhook (a baixa automática)</h3>
  <p>No painel do Asaas → Integrações → Webhooks, cadastre:</p>
  <p><code class="pix">https://${e(host)}/webhooks/asaas/${e(s.asaas_webhook_token)}</code></p>
  <p class="mudo">Eventos: <b>PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE, PAYMENT_REFUNDED, PAYMENT_DELETED</b>.
  O aviso do Asaas nunca dá baixa sozinho: o sistema confere a cobrança na API antes — aviso forjado não baixa conta.</p>
</div>`;
}

export function telaAuditoria(linhas: { acao: string; tabela: string | null; detalhes: unknown; usuario_nome: string | null; criado_em: string }[], fuso: string): string {
  return `
<h1>Auditoria</h1>
<p class="mudo">Toda ação sensível deixa rastro. Só o administrador vê esta tela.</p>
<div class="cartao tabela"><table>
<tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Detalhes</th></tr>
${linhas.map((l) => `<tr><td class="mudo">${brInstante(l.criado_em, fuso)}</td><td>${e(l.usuario_nome ?? "sistema")}</td>
<td><b>${e(l.acao)}</b></td><td class="mudo" style="max-width:380px;word-break:break-word">${e(l.detalhes ? JSON.stringify(l.detalhes) : "")}</td></tr>`).join("")}
</table></div>`;
}
