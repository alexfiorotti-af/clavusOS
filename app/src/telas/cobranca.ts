/** A cobrança do ClavusOS (studio → AF): assinar, avulso, faturas; e a tela de bloqueio. */
import { e } from "../http/resposta.ts";
import { etiqueta } from "./base.ts";
import type { Studio } from "../studio/studio.ts";
import type { Acesso, Fatura } from "../assinatura/assinatura.ts";
import { ESTADOS } from "../assinatura/assinatura.ts";
import { reais } from "../dados/dinheiro.ts";
import { br } from "../dados/datas.ts";

export function telaCobrancaClavus(o: {
  studio: Studio; acesso: Acesso; faturas: Fatura[]; precoMensal: string; temAsaasAF: boolean; whats: string;
}): string {
  const s = o.studio;
  const renova = !!s.assinatura_asaas_id && !s.assinatura_cancelada_em;
  const topo = `<div class="cartao"><h3>${ESTADOS[o.acesso.estado]}</h3>
    <p>${o.acesso.estado === "teste" ? `Teste gratuito até <b>${br(o.acesso.ate!)}</b> (${o.acesso.diasRestantes} dia${o.acesso.diasRestantes === 1 ? "" : "s"}).`
      : o.acesso.estado === "ativo" ? (s.plano === "cortesia" ? "Este studio é cortesia — nada a pagar." : `Acesso pago até <b>${br(o.acesso.ate!)}</b>.${renova ? " A assinatura renova sozinha." : ""}`)
      : o.acesso.estado === "carencia" ? `Pagamento pendente: o sistema bloqueia em <b>${br(o.acesso.ate!)}</b>. Nada é apagado.`
      : `Acesso bloqueado desde ${br(o.acesso.ate!)}. Pague para voltar — está tudo guardado.`}</p></div>`;
  const acoes = s.plano === "cortesia" ? "" : o.temAsaasAF ? `
<div class="grade g2">
  <div class="cartao"><h3>Assinatura mensal · ${e(o.precoMensal)}/mês</h3>
    <p class="mudo">Fatura todo mês pelo Asaas — você escolhe Pix, boleto ou cartão (no cartão, renova sozinha). Cancele quando quiser: vale até o fim do período pago.</p>
    ${renova ? `<form method="post" action="/configuracoes/cobranca/cancelar"><button class="perigo" data-confirmar>Cancelar assinatura</button></form>`
      : `<form method="post" action="/configuracoes/cobranca/assinar"><button>Assinar o ClavusOS</button></form>`}
  </div>
  <div class="cartao"><h3>Pagamento avulso</h3>
    <p class="mudo">Sem renovação automática: pague 1, 3, 6 ou 12 meses numa cobrança só.</p>
    <form method="post" action="/configuracoes/cobranca/avulso" class="acoes">
      ${[1, 3, 6, 12].map((m) => `<button name="meses" value="${m}" class="sec">${m} ${m > 1 ? "meses" : "mês"}</button>`).join("")}
    </form>
  </div>
</div>` : `<div class="cartao"><p>Para assinar, fale com a AF Tecnologia: <a href="https://wa.me/${e(o.whats)}" target="_blank" rel="noopener">WhatsApp</a>.</p></div>`;
  const faturas = o.faturas.length ? `<h2>Faturas</h2><div class="cartao tabela"><table>
<tr><th>Vencimento</th><th class="n">Valor</th><th>Situação</th><th>Forma</th><th></th></tr>
${o.faturas.map((f) => `<tr><td>${br(f.vencimento)}${f.avulsa ? ` <span class="mudo">(${f.meses}m avulso)</span>` : ""}</td>
<td class="n valor">${reais(f.valor)}</td><td>${etiqueta(f.situacao)}</td><td>${e(f.meio ?? "")}</td>
<td>${f.url_fatura && (f.situacao === "pendente" || f.situacao === "vencida") ? `<a class="botao pequeno" href="${e(f.url_fatura)}" target="_blank" rel="noopener">pagar</a>` : ""}</td></tr>`).join("")}
</table>
<form method="post" action="/configuracoes/cobranca/conferir" class="acoes"><button class="sec pequeno">Já paguei — conferir agora</button></form></div>` : "";
  return `<h1>Cobrança do ClavusOS</h1>${topo}${acoes}${faturas}
<p class="mudo">Dúvidas? AF Tecnologia e Marketing · <a href="https://wa.me/${e(o.whats)}" target="_blank" rel="noopener">WhatsApp (27) 99601-5367</a></p>`;
}

export function telaBloqueado(s: Studio, acesso: Acesso, admin: boolean): string {
  return `<div class="entrada"><div class="cartao">
  <h1>Acesso bloqueado</h1>
  <p>O pagamento do ClavusOS do <b>${e(s.nome)}</b> está pendente${acesso.ate ? ` desde ${br(acesso.ate)}` : ""}.
  <b>Nada foi apagado</b>: agenda, clientes e caixa continuam guardados.</p>
  ${admin ? `<div class="acoes"><a class="botao" href="/configuracoes/cobranca">Ver a cobrança e reativar</a>
  <a class="botao sec" href="/configuracoes/exportar">Exportar meus dados</a></div>`
    : `<p class="mudo">Avise a responsável pelo studio para reativar.</p>`}
</div></div>`;
}
