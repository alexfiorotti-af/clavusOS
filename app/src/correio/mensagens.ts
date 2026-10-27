/** Os textos dos e-mails. Simples, no tom do nicho, sem jargão. */
import type { Studio } from "../studio/studio.ts";
import type { Mensagem } from "./correio.ts";
import { br } from "../dados/datas.ts";
import { reais } from "../dados/dinheiro.ts";

const rodape = (s: Studio) =>
  `<p style="color:#7A6B7D;font-size:12px;margin-top:24px">${s.nome}${s.telefone ? ` · WhatsApp ${s.telefone}` : ""}<br>Com tecnologia ClavusOS</p>`;

export function confirmacaoDeHorario(s: Studio, p: { clienteNome: string; servico: string; data: string; inicio: string; para: string; codigo: string }): Mensagem {
  const quando = `${br(p.data)} às ${p.inicio}`;
  return {
    para: p.para,
    assunto: `Seu horário no ${s.nome}: ${quando}`,
    texto: `Oi, ${p.clienteNome.split(" ")[0]}! Seu horário de ${p.servico} está marcado para ${quando} no ${s.nome}. Código: ${p.codigo}. Qualquer coisa, responda este e-mail ou chame no WhatsApp.`,
    html: `<p>Oi, ${p.clienteNome.split(" ")[0]}! 💖</p><p>Seu horário de <b>${p.servico}</b> está marcado para <b>${quando}</b> no ${s.nome}.</p><p>Código: <b>${p.codigo}</b></p>${rodape(s)}`,
  };
}

export function lembreteDeAmanha(s: Studio, p: { clienteNome: string; servico: string; data: string; inicio: string; para: string }): Mensagem {
  return {
    para: p.para,
    assunto: `Amanhã às ${p.inicio}: ${p.servico} no ${s.nome}`,
    texto: `Oi, ${p.clienteNome.split(" ")[0]}! Lembrando do seu horário de ${p.servico} amanhã (${br(p.data)}) às ${p.inicio}. Até lá!`,
    html: `<p>Oi, ${p.clienteNome.split(" ")[0]}! 💅</p><p>Lembrando do seu horário de <b>${p.servico}</b> amanhã (${br(p.data)}) às <b>${p.inicio}</b>. Até lá!</p>${rodape(s)}`,
  };
}

export function sinalPendente(s: Studio, p: { clienteNome: string; servico: string; data: string; inicio: string; para: string; valor: number; url: string | null; pix: string | null }): Mensagem {
  const quando = `${br(p.data)} às ${p.inicio}`;
  return {
    para: p.para,
    assunto: `Garanta seu horário no ${s.nome}: sinal de ${reais(p.valor)}`,
    texto: `Oi, ${p.clienteNome.split(" ")[0]}! Para garantir ${p.servico} em ${quando}, o sinal é ${reais(p.valor)}.${p.url ? ` Pague em: ${p.url}` : ""}${p.pix ? `\nPix copia e cola:\n${p.pix}` : ""}`,
    html: `<p>Oi, ${p.clienteNome.split(" ")[0]}! 💖</p><p>Para garantir <b>${p.servico}</b> em <b>${quando}</b>, o sinal é <b>${reais(p.valor)}</b>.</p>${p.url ? `<p><a href="${p.url}">Pagar agora</a></p>` : ""}${p.pix ? `<p>Pix copia e cola:<br><code style="font-size:12px;word-break:break-all">${p.pix}</code></p>` : ""}${rodape(s)}`,
  };
}

export function conviteDeEquipe(s: Studio, nome: string, url: string, para: string): Mensagem {
  return {
    para,
    assunto: `Você foi convidada para o ${s.nome} no ClavusOS`,
    texto: `Oi, ${nome}! Crie sua senha para acessar o sistema do ${s.nome}: ${url} (o link vale por 3 dias).`,
    html: `<p>Oi, ${nome}!</p><p>Você foi convidada para o sistema do <b>${s.nome}</b>.</p><p><a href="${url}">Criar minha senha</a> (o link vale por 3 dias)</p>${rodape(s)}`,
  };
}

export function recuperacaoDeSenha(s: Studio, nome: string, url: string): Omit<Mensagem, "para"> {
  return {
    assunto: `Trocar a senha · ${s.nome}`,
    texto: `Oi, ${nome}. Para trocar sua senha, abra: ${url} (vale por 1 hora). Se não foi você, ignore este e-mail.`,
    html: `<p>Oi, ${nome}.</p><p><a href="${url}">Trocar minha senha</a> (o link vale por 1 hora)</p><p>Se não foi você quem pediu, ignore este e-mail.</p>${rodape(s)}`,
  };
}

export function avisoNovoAgendamentoOnline(s: Studio, p: { clienteNome: string; servico: string; data: string; inicio: string; para: string; codigo: string }): Mensagem {
  return {
    para: p.para,
    assunto: `[${s.nome}] Novo agendamento online: ${p.clienteNome} · ${br(p.data)} ${p.inicio}`,
    texto: `${p.clienteNome} agendou ${p.servico} para ${br(p.data)} às ${p.inicio} pelo site (código ${p.codigo}). Está pendente na agenda.`,
    html: `<p><b>${p.clienteNome}</b> agendou <b>${p.servico}</b> para <b>${br(p.data)} às ${p.inicio}</b> pelo site (código ${p.codigo}).</p><p>O horário está <b>pendente</b> na agenda.</p>${rodape(s)}`,
  };
}
