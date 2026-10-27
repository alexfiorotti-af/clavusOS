/**
 * A rotina que o relógio de fora dispara (Cloudflare/cron → GET /rotina/diaria?chave=…),
 * a cada hora — idempotente:
 *   1. cobranças pendentes do studio → sincronizadas com o Asaas (vencidas marcadas);
 *   2. lembrete de amanhã por e-mail para quem tem horário confirmado/pendente;
 *   3. assinatura do ClavusOS: confere faturas e avisa vencimento (3 dias, no dia, carência);
 *   4. sessões vencidas apagadas.
 */
import { comStudio, semStudio, type Executor } from "../db/contexto.ts";
import { hojeEm, somarDias, br } from "../dados/datas.ts";
import { lerStudio, studioPorId, type Studio } from "../studio/studio.ts";
import { enviarRegistrando, type Enviador } from "../correio/correio.ts";
import { lembreteDeAmanha } from "../correio/mensagens.ts";
import { cobrancasPendentes, sincronizarCobranca } from "../cobrancas/cobrancas.ts";
import { limparSessoesVencidas } from "../auth/sessao.ts";
import type { Fetch } from "../cobrancas/asaas.ts";
import type { Ambiente } from "../ambiente.ts";
import { sincronizarAssinatura, situacaoAcesso } from "../assinatura/assinatura.ts";

export type RelatorioRotina = Record<string, Record<string, number | string>>;

export async function studiosAtivos(): Promise<{ id: string; slug: string }[]> {
  // Lista sem contexto: só o dono do banco vê (ferramentas e rotina).
  return semStudio(async (db) => (await db.query<{ id: string; slug: string }>("SELECT id, slug FROM studios WHERE situacao <> 'suspenso'")).rows);
}

export async function rotinaDoStudio(studioId: string, enviar: Enviador, remetente: string, chaveMestra: string | null, fetchFn?: Fetch, agora = new Date()): Promise<Record<string, number | string>> {
  const fuso = (await studioPorId(studioId)).fuso;
  return comStudio({ studioId, papel: "sistema", fuso }, async (db) => {
    const studio = await lerStudio(db, studioId);
    const hoje = hojeEm(studio.fuso, agora);
    const r: Record<string, number | string> = { hoje };

    // 1. cobranças pendentes: sincroniza as com Asaas; marca vencidas
    r.cobrancas_sincronizadas = 0; r.cobrancas_erro = 0;
    if (studio.asaas_chave_cifrada) {
      for (const c of await cobrancasPendentes(db, 50)) {
        try { await sincronizarCobranca(db, studio, chaveMestra, c.id, fetchFn); r.cobrancas_sincronizadas = (r.cobrancas_sincronizadas as number) + 1; }
        catch { r.cobrancas_erro = (r.cobrancas_erro as number) + 1; }
      }
    }
    await db.query("UPDATE cobrancas SET situacao = 'vencida', atualizada_em = now() WHERE situacao = 'pendente' AND vencimento < $1::date", [hoje]);

    // 2. lembrete de amanhã (uma vez por agendamento)
    r.lembretes = 0;
    const amanha = somarDias(hoje, 1);
    const ags = await db.query<{ id: string; inicio: string; data: string; cliente_nome: string; email: string; servico: string }>(
      `SELECT a.id, a.inicio, a.data::text AS data, c.nome AS cliente_nome, c.email, s.nome AS servico
         FROM agendamentos a JOIN clientes c ON c.id = a.cliente_id JOIN servicos s ON s.id = a.servico_id
        WHERE a.data = $1 AND a.situacao IN ('pendente','confirmado') AND c.email IS NOT NULL`, [amanha]);
    for (const a of ags.rows) {
      const ok = await enviarRegistrando(db, studio, enviar, remetente, {
        agendamentoId: a.id, tipo: "lembrete_1",
        mensagem: lembreteDeAmanha(studio, { clienteNome: a.cliente_nome, servico: a.servico, data: a.data, inicio: a.inicio, para: a.email }),
      });
      if (ok === "enviada") r.lembretes = (r.lembretes as number) + 1;
    }

    // 4. limpeza
    await limparSessoesVencidas(db);
    return r;
  });
}

export async function rotinaGeral(enviar: Enviador, remetente: string, chaveMestra: string | null, fetchFn?: Fetch, ambiente?: Ambiente): Promise<RelatorioRotina> {
  const out: RelatorioRotina = {};
  for (const s of await studiosAtivos()) {
    try {
      out[s.slug] = await rotinaDoStudio(s.id, enviar, remetente, chaveMestra, fetchFn);
      if (ambiente?.asaasAF) out[s.slug].assinatura = await rotinaAssinatura(s.id, ambiente, fetchFn);
      if (ambiente) out[s.slug].aviso_assinatura = await avisoDeVencimento(s.id, ambiente, enviar, remetente);
    } catch (e) { out[s.slug] = { erro: (e as Error).message }; }
  }
  return out;
}

/** Lembrete da mensalidade do ClavusOS aos administradores: 3 dias antes, no dia, e ao entrar na carência. Uma vez por dia. */
async function avisoDeVencimento(studioId: string, ambiente: Ambiente, enviar: Enviador, remetente: string): Promise<string> {
  return comStudio({ studioId, papel: "sistema" }, async (db) => {
    const studio = await lerStudio(db, studioId);
    if (studio.plano === "cortesia") return "cortesia";
    const hoje = hojeEm(studio.fuso);
    const acesso = situacaoAcesso(studio, hoje, ambiente.carenciaDias);
    const renova = !!studio.assinatura_asaas_id && !studio.assinatura_cancelada_em;
    const gatilho = (acesso.estado === "ativo" || acesso.estado === "teste") && (acesso.diasRestantes === 3 || acesso.diasRestantes === 0)
      || acesso.estado === "carencia" && acesso.diasRestantes === ambiente.carenciaDias;
    if (!gatilho || studio.assinatura_aviso_em === hoje) return "nada a avisar";
    const admins = (await db.query<{ nome: string; email: string }>("SELECT nome, email FROM usuarios WHERE papel = 'administrador' AND ativo AND email IS NOT NULL")).rows;
    const url = `https://${studio.slug}.${ambiente.dominioBase}/configuracoes/cobranca`;
    const assunto = acesso.estado === "carencia" ? `ClavusOS: pagamento pendente — o sistema bloqueia em ${br(acesso.ate!)}`
      : acesso.estado === "teste" ? `ClavusOS: seu teste gratuito termina em ${br(acesso.ate!)}`
      : renova ? `ClavusOS: mensalidade vence em ${br(acesso.ate!)}` : `ClavusOS: seu acesso termina em ${br(acesso.ate!)}`;
    const corpo = acesso.estado === "carencia" ? `O pagamento do ClavusOS do ${studio.nome} está pendente. O sistema continua liberado até ${br(acesso.ate!)}; depois disso só a tela de cobrança abre. Nada é apagado.`
      : acesso.estado === "teste" ? `O período de teste do ${studio.nome} termina em ${br(acesso.ate!)}. Para continuar sem interrupção, assine ou pague um período avulso.`
      : renova ? `A próxima mensalidade do ${studio.nome} vence em ${br(acesso.ate!)}. No cartão é automático; no Pix ou boleto, a fatura está no painel.`
      : `O período pago do ${studio.nome} termina em ${br(acesso.ate!)}. Renove por assinatura ou pague outro período avulso.`;
    let enviados = 0;
    for (const adm of admins) {
      const r = await enviarRegistrando(db, studio, enviar, remetente, { agendamentoId: null, tipo: `assinatura.${acesso.estado}`, mensagem: {
        para: adm.email, assunto, texto: `${corpo}\n\nCobrança: ${url}`,
        html: `<p>Olá, ${adm.nome}.</p><p>${corpo}</p><p><a href="${url}">Abrir a cobrança do ClavusOS</a></p><p style="color:#666;font-size:12px">AF Tecnologia e Marketing · WhatsApp (27) 99601-5367</p>`,
      } });
      if (r === "enviada") enviados++;
    }
    await db.query("UPDATE studios SET assinatura_aviso_em = $2 WHERE id = $1", [studioId, hoje]);
    return `${acesso.estado}: ${enviados} aviso(s)`;
  });
}

/** Assinatura do ClavusOS: confere faturas pendentes com o Asaas da AF (o webhook pode ter falhado). */
async function rotinaAssinatura(studioId: string, ambiente: Ambiente, fetchFn?: Fetch): Promise<string> {
  return comStudio({ studioId, papel: "sistema" }, async (db) => {
    const studio = await lerStudio(db, studioId);
    if (!studio.assinatura_asaas_id || studio.plano === "cortesia") {
      // Mesmo sem assinatura mensal, pode haver fatura avulsa aberta.
      const pendAv = await db.query("SELECT 1 FROM faturas_clavus WHERE avulsa AND situacao IN ('pendente','vencida') LIMIT 1");
      if (!pendAv.rowCount) return "sem assinatura";
    }
    const pend = await db.query("SELECT 1 FROM faturas_clavus WHERE situacao IN ('pendente','vencida') AND vencimento <= current_date + 3 LIMIT 1");
    const vence = studio.pago_ate && studio.pago_ate <= somarDias(hojeEm(studio.fuso), 3);
    if (!pend.rowCount && !vence) return "em dia";
    const fs = await sincronizarAssinatura(db, studio, ambiente, fetchFn);
    return `conferida: ${fs.filter((f) => f.situacao === "recebida").length} paga(s), ${fs.filter((f) => f.situacao !== "recebida").length} aberta(s)`;
  });
}

export type { Studio };
