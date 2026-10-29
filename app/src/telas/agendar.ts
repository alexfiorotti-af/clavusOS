/** A página pública /agendar: a cliente escolhe serviço → dia → horário → dados → confirma. */
import { e } from "../http/resposta.ts";
import type { Studio } from "../studio/studio.ts";
import { reais } from "../dados/dinheiro.ts";
import { diaFalado, rotuloDia, somarDias, diaDaSemana, type DiaISO } from "../dados/datas.ts";
import type { Slot } from "../agenda/horarios.ts";
import type { Srv } from "./agenda.ts";
import { CSS } from "./base.ts";
import { simboloCheio, FONTES_LINK } from "../marca.ts";

function moldura(s: Studio, titulo: string, conteudo: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${e(titulo)} · ${e(s.nome)}</title>
<meta name="robots" content="noindex"><meta name="theme-color" content="#F7F2EF">
<link rel="icon" href="/assets/icone.svg" type="image/svg+xml">
${FONTES_LINK}
<style>${CSS}:root{--cor:${e(s.cor)}}main{max-width:620px}</style></head>
<body><header class="topo"><div class="c"><span class="marca">${s.logo_url ? `<img src="${e(s.logo_url)}" alt="">` : simboloCheio({ tamanho: 26, cor: s.cor, reflexo: false })} ${e(s.nome)}</span></div></header>
<main>${conteudo}</main>
<footer>${e(s.nome)}${s.telefone ? ` · <a href="https://wa.me/${e(s.telefone)}">WhatsApp</a>` : ""}${s.assinatura_clavus ? " · com tecnologia <b>ClavusOS</b>" : ""}</footer>
</body></html>`;
}

export function telaAgendarServico(s: Studio, servicos: Srv[], erro?: string): string {
  return moldura(s, "Agendar", `
<h1>Agende seu horário</h1>
${s.agendar_texto ? `<p class="mudo">${e(s.agendar_texto)}</p>` : ""}
${erro ? `<div class="aviso erro">${e(erro)}</div>` : ""}
<p class="mudo">Escolha o serviço</p>
${servicos.map((sv) => `<a class="ag" href="/agendar?servico=${sv.id}">
  <span class="avatar" style="background:${e(sv.cor)}22;color:${e(sv.cor)}">${e(sv.nome.slice(0, 1).toUpperCase())}</span>
  <div class="meio"><b>${e(sv.nome)}</b><span>${sv.duracao_min} min</span></div>
  <div class="fim"><span class="valor">${reais(sv.preco)}</span></div>
</a>`).join("")}`);
}

export function telaAgendarDia(s: Studio, srv: Srv, hoje: DiaISO): string {
  let dias = "";
  for (let i = 0; i < Math.min(s.agendar_antecedencia, 21); i++) {
    const d = somarDias(hoje, i);
    const abre = s.dias_atendimento.includes(diaDaSemana(d));
    dias += abre
      ? `<a class="pill" href="/agendar?servico=${srv.id}&dia=${d}">${i === 0 ? "Hoje" : i === 1 ? "Amanhã" : rotuloDia(d)}</a>`
      : `<span class="pill" style="opacity:.35">${rotuloDia(d)}</span>`;
  }
  return moldura(s, "Agendar", `
<h1>${e(srv.nome)} · ${reais(srv.preco)}</h1>
<p class="mudo">Escolha o dia</p>
<div class="pilulas" style="flex-wrap:wrap">${dias}</div>
<p><a class="mudo" href="/agendar">‹ trocar o serviço</a></p>`);
}

export function telaAgendarHora(s: Studio, srv: Srv, dia: DiaISO, hoje: DiaISO, slots: Slot[]): string {
  const livres = slots.filter((x) => x.livre);
  return moldura(s, "Agendar", `
<h1>${e(srv.nome)} · ${diaFalado(dia, hoje)}</h1>
<p class="mudo">Horários livres</p>
${livres.length ? `<div class="chips">${livres.map((x) =>
    `<a class="pill" href="/agendar?servico=${srv.id}&dia=${dia}&hora=${x.hora}">${x.hora}</a>`).join("")}</div>`
    : `<p class="mudo">Nenhum horário livre nesse dia</p>`}
<p><a class="mudo" href="/agendar?servico=${srv.id}">‹ escolher outro dia</a></p>`);
}

export function telaAgendarDados(s: Studio, srv: Srv, dia: DiaISO, hora: string, hoje: DiaISO, erro?: string): string {
  return moldura(s, "Agendar", `
<h1>Quase lá</h1>
<p> <b>${e(srv.nome)}</b> · ${diaFalado(dia, hoje)} às <b>${e(hora)}</b> · ${reais(srv.preco)}</p>
${erro ? `<div class="aviso erro">${e(erro)}</div>` : ""}
<form method="post" action="/agendar" class="cartao">
  <input type="hidden" name="servico" value="${srv.id}"><input type="hidden" name="dia" value="${e(dia)}"><input type="hidden" name="hora" value="${e(hora)}">
  <div style="position:absolute;left:-5000px" aria-hidden="true"><input name="site" tabindex="-1" autocomplete="off"></div>
  <div class="campo"><label>Seu nome</label><input name="nome" required autofocus></div>
  <div class="campo"><label>Seu WhatsApp</label><input name="telefone" inputmode="numeric" placeholder="27999999999" required></div>
  <div class="campo"><label>E-mail <span class="mudo">(para a confirmação)</span></label><input name="email" type="email"></div>
  <div class="acoes"><button>Confirmar agendamento</button></div>
</form>
<p><a class="mudo" href="/agendar?servico=${srv.id}&dia=${dia}">‹ voltar</a></p>`);
}

export function telaAgendarPronto(s: Studio, o: { srvNome: string; dia: DiaISO; hora: string; hoje: DiaISO; codigo: string; sinal?: { valor: number; url: string | null; pix: string | null; qr: string | null } }): string {
  return moldura(s, "Horário recebido", `
<h1>Prontinho!</h1>
<div class="cartao">
  <p>Seu horário de <b>${e(o.srvNome)}</b> ${diaFalado(o.dia, o.hoje)} às <b>${e(o.hora)}</b> foi recebido.
  Código: <b>${e(o.codigo)}</b>.</p>
  ${o.sinal ? `<h3>Garanta com o sinal de ${reais(o.sinal.valor)}</h3>
    ${o.sinal.qr ? `<p><img class="qr" alt="QR do Pix" src="data:image/png;base64,${e(o.sinal.qr)}"></p>` : ""}
    ${o.sinal.pix ? `<label>Pix copia e cola</label><code class="pix">${e(o.sinal.pix)}</code>` : ""}
    ${o.sinal.url ? `<p><a class="botao" href="${e(o.sinal.url)}" target="_blank" rel="noopener">Pagar o sinal</a></p>` : ""}
    <p class="mudo">Pagou, confirmou: o sistema reconhece sozinho.</p>`
    : `<p class="mudo">O studio confirma com você em breve${s.telefone ? ` — ou chame no <a href="https://wa.me/${e(s.telefone)}">WhatsApp</a>` : ""}.</p>`}
</div>`);
}

export function telaAgendarFechado(s: Studio): string {
  return moldura(s, "Agendamento", `
<h1>Agendamento online pausado</h1>
<p class="mudo">No momento os horários são marcados direto com o studio${s.telefone ? `: <a href="https://wa.me/${e(s.telefone)}">chamar no WhatsApp</a>` : "."}</p>`);
}
