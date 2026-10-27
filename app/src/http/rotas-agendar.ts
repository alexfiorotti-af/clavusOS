/**
 * /agendar — a página pública em que a cliente marca sozinha, sem login.
 * Freios: campo-armadilha, 3 agendamentos por IP a cada 10 minutos, só
 * horários dentro da grade e da antecedência, `noindex`. Bloqueio/suspensão
 * do studio fecha a página. Com Asaas e sinal configurado no serviço, o Pix
 * do sinal sai na hora.
 */
import { html, texto, type Resposta } from "./resposta.ts";
import type { Pedido } from "./pedido.ts";
import type { Servicos } from "./contexto-web.ts";
import type { Studio } from "../studio/studio.ts";
import { comStudio } from "../db/contexto.ts";
import { lerFormulario, campo } from "./formulario.ts";
import { hojeEm, somarDias, diaValido, horaValida, diaDaSemana, diasEntre } from "../dados/datas.ts";
import { percentual } from "../dados/dinheiro.ts";
import { gradeDoDia, type Ocupado } from "../agenda/horarios.ts";
import { doDia, criarAgendamento } from "../agenda/agenda.ts";
import { acharPorContato, salvarCliente } from "../clientes/clientes.ts";
import { emitirCobranca } from "../cobrancas/cobrancas.ts";
import { enviarRegistrando } from "../correio/correio.ts";
import { avisoNovoAgendamentoOnline, confirmacaoDeHorario } from "../correio/mensagens.ts";
import * as T from "../telas/agendar.ts";
import type { Srv } from "../telas/agenda.ts";

const porIp = new Map<string, number[]>();
function freiou(ip: string | null): boolean {
  const agora = Date.now(), chave = ip ?? "?";
  const lista = (porIp.get(chave) ?? []).filter((t) => agora - t < 10 * 60_000);
  if (lista.length >= 3) { porIp.set(chave, lista); return true; }
  lista.push(agora); porIp.set(chave, lista);
  return false;
}

async function servicosOnline(studioId: string, fuso: string): Promise<(Srv & { ciclo_dias: number; sinal_pct: number })[]> {
  return comStudio({ studioId, papel: "sistema", fuso }, async (db) =>
    (await db.query<Srv & { ciclo_dias: number; sinal_pct: number }>(
      "SELECT id, nome, preco, duracao_min, ciclo_dias, cor, sinal_pct, ativo FROM servicos WHERE ativo ORDER BY nome")).rows);
}

export async function rotasAgendar(p: Pedido, s: Servicos, studio: Studio): Promise<Resposta> {
  if (!studio.agendar_online) return html(T.telaAgendarFechado(studio), 404);
  const hoje = hojeEm(studio.fuso, s.agora());
  const servicos = await servicosOnline(studio.id, studio.fuso);

  if (p.metodo === "POST") {
    const f = lerFormulario(p.corpo);
    if (campo(f, "site")) return texto("ok");              // armadilha para robô
    const srv = servicos.find((x) => x.id === campo(f, "servico"));
    const dia = campo(f, "dia"), hora = campo(f, "hora");
    const erroDados = (msg: string) => srv && diaValido(dia) && horaValida(hora)
      ? html(T.telaAgendarDados(studio, srv, dia, hora, hoje, msg), 400)
      : html(T.telaAgendarServico(studio, servicos, msg), 400);
    if (!srv || !diaValido(dia) || !horaValida(hora)) return html(T.telaAgendarServico(studio, servicos, "Começe de novo — algo se perdeu no caminho. 🌸"), 400);
    if (dia < hoje || diasEntre(hoje, dia) > studio.agendar_antecedencia || !studio.dias_atendimento.includes(diaDaSemana(dia)))
      return erroDados("Esse dia não está disponível.");
    const nome = campo(f, "nome"), telefone = campo(f, "telefone").replace(/\D/g, ""), email = campo(f, "email");
    if (!nome || telefone.length < 10) return erroDados("Preencha seu nome e um WhatsApp válido.");
    if (freiou(p.ip)) return erroDados("Muitos agendamentos seguidos daqui. Espere alguns minutos ou chame no WhatsApp. 💖");

    try {
      const resultado = await comStudio({ studioId: studio.id, papel: "sistema", fuso: studio.fuso }, async (db) => {
        let cliente = await acharPorContato(db, telefone, email || null);
        if (!cliente) {
          const id = await salvarCliente(db, studio.id, { nome, telefone, email, origem: "online", situacao: "lead", usuarioId: null });
          cliente = { id } as typeof cliente & { id: string };
        }
        const a = await criarAgendamento(db, studio.id, {
          clienteId: cliente!.id, servicoId: srv.id, profissionalId: null, data: dia, inicio: hora,
          origem: "online", observacoes: "Agendado pela página pública", usuarioId: null,
        });
        let sinal: { valor: number; url: string | null; pix: string | null; qr: string | null } | undefined;
        if (studio.asaas_chave_cifrada && srv.sinal_pct > 0) {
          try {
            const valor = percentual(srv.preco, srv.sinal_pct);
            const c = await emitirCobranca(db, studio, s.ambiente.chaveMestra, {
              clienteId: cliente!.id, agendamentoId: a.id, finalidade: "sinal", meio: "pix",
              valor, vencimento: somarDias(hoje, 1), descricao: `Sinal do horário ${a.codigo} — ${srv.nome}`, usuarioId: null,
            }, s.fetchFn);
            sinal = { valor: c.valor, url: c.url_fatura, pix: c.pix_copia_cola, qr: c.pix_qr_base64 };
          } catch (e) { console.error("[agendar] sinal não saiu:", (e as Error).message); }
        }
        if (email) {
          await enviarRegistrando(db, studio, s.enviar, s.ambiente.emailRemetente, {
            agendamentoId: a.id, tipo: "confirmacao",
            mensagem: confirmacaoDeHorario(studio, { clienteNome: nome, servico: srv.nome, data: dia, inicio: hora, para: email, codigo: a.codigo }),
          });
        }
        if (studio.email) {
          await enviarRegistrando(db, studio, s.enviar, s.ambiente.emailRemetente, {
            agendamentoId: a.id, tipo: "aviso_online",
            mensagem: avisoNovoAgendamentoOnline(studio, { clienteNome: nome, servico: srv.nome, data: dia, inicio: hora, para: studio.email, codigo: a.codigo }),
          });
        }
        return { codigo: a.codigo, sinal };
      });
      return html(T.telaAgendarPronto(studio, { srvNome: srv.nome, dia, hora, hoje, codigo: resultado.codigo, sinal: resultado.sinal }));
    } catch (err) {
      const choque = (err as { constraint?: string }).constraint === "sem_choque" || /nesse horário/.test((err as Error).message);
      if (choque) return html(T.telaAgendarHora(studio, srv, dia, hoje, await slotsDe(studio, srv, dia)), 409);
      console.error("[agendar]", err);
      return html(T.telaAgendarDados(studio, srv, dia, hora, hoje, "Não deu certo — tente de novo ou chame no WhatsApp."), 500);
    }
  }

  const srv = servicos.find((x) => x.id === p.query.get("servico"));
  if (!srv) return html(T.telaAgendarServico(studio, servicos));
  const dia = p.query.get("dia");
  if (!diaValido(dia) || dia < hoje || diasEntre(hoje, dia) > studio.agendar_antecedencia) return html(T.telaAgendarDia(studio, srv, hoje));
  const hora = p.query.get("hora");
  if (!horaValida(hora)) return html(T.telaAgendarHora(studio, srv, dia, hoje, await slotsDe(studio, srv, dia)));
  return html(T.telaAgendarDados(studio, srv, dia, hora, hoje));
}

async function slotsDe(studio: Studio, srv: Srv, dia: string) {
  const ocupados: Ocupado[] = await comStudio({ studioId: studio.id, papel: "sistema", fuso: studio.fuso }, async (db) =>
    (await doDia(db, dia)).filter((a) => a.ativo).map((a) => ({ inicio: a.inicio, duracaoMin: a.duracao_min, profissionalId: a.profissional_id })));
  // Na página pública o choque vale contra TODA a casa (profissionalId null = qualquer uma):
  return gradeDoDia({ abre: studio.abre, fecha: studio.fecha, passoMin: studio.slot_minutos, duracaoMin: srv.duracao_min, ocupados, profissionalId: null });
}
