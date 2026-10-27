/**
 * Cobranças: espelho local do Asaas DO STUDIO (a cliente paga o studio).
 * Regra de ouro do webhook: o aviso só diz "vá conferir"; a baixa acontece
 * depois de consultar a cobrança na API com a chave do studio. Aviso forjado
 * não baixa conta. Pagamento recebido entra no caixa como receita (Asaas).
 */
import type { Executor } from "../db/contexto.ts";
import { decifrar } from "../dados/cofre.ts";
import type { DiaISO } from "../dados/datas.ts";
import type { Studio } from "../studio/studio.ts";
import { auditar } from "../db/auditar.ts";
import { Asaas, lerEvento, reaisParaCentavos, situacaoDoStatus, type Fetch } from "./asaas.ts";

export type Cobranca = {
  id: string; cliente_id: string; agendamento_id: string | null; assinatura_id: string | null;
  finalidade: "sinal" | "servico" | "assinatura" | "avulsa"; meio: "pix" | "boleto" | "cartao" | "link";
  valor: number; vencimento: string; situacao: "pendente" | "recebida" | "cancelada" | "estornada" | "vencida";
  asaas_id: string | null; url_fatura: string | null; pix_copia_cola: string | null; pix_qr_base64: string | null;
  recebida_em: string | null; valor_liquido: number | null; criado_em: string; cliente_nome?: string;
};

export function clienteAsaas(studio: Studio, chaveMestra: string | null, fetchFn?: Fetch): Asaas {
  if (!studio.asaas_chave_cifrada) throw new Error("O Asaas ainda não foi conectado nas configurações do studio.");
  return new Asaas(decifrar(studio.asaas_chave_cifrada, chaveMestra), studio.asaas_ambiente, fetchFn);
}

export async function lerCobranca(db: Executor, id: string): Promise<Cobranca | null> {
  const r = await db.query<Cobranca>("SELECT *, vencimento::text AS vencimento FROM cobrancas WHERE id = $1", [id]);
  return r.rows[0] ?? null;
}

export async function cobrancasPendentes(db: Executor, limite = 100): Promise<Cobranca[]> {
  const r = await db.query<Cobranca>(
    `SELECT c.*, c.vencimento::text AS vencimento, cl.nome AS cliente_nome FROM cobrancas c JOIN clientes cl ON cl.id = c.cliente_id
      WHERE c.situacao IN ('pendente','vencida') ORDER BY c.vencimento LIMIT $1`, [limite]);
  return r.rows;
}

export async function cobrancasDaCliente(db: Executor, clienteId: string): Promise<Cobranca[]> {
  const r = await db.query<Cobranca>("SELECT *, vencimento::text AS vencimento FROM cobrancas WHERE cliente_id = $1 ORDER BY criado_em DESC LIMIT 24", [clienteId]);
  return r.rows;
}

/** Garante a cliente no Asaas do studio (criada uma vez). */
export async function clienteAsaasId(db: Executor, asaas: Asaas, clienteId: string): Promise<string> {
  const c = (await db.query<{ id: string; nome: string; cpf: string | null; email: string | null; telefone: string | null; asaas_cliente_id: string | null }>(
    "SELECT id, nome, cpf, email, telefone, asaas_cliente_id FROM clientes WHERE id = $1", [clienteId])).rows[0];
  if (!c) throw new Error("Cliente não encontrada.");
  if (c.asaas_cliente_id) return c.asaas_cliente_id;
  const novo = await asaas.criarCliente({ nome: c.nome, cpfCnpj: c.cpf, email: c.email, celular: c.telefone, referencia: `cliente:${c.id}`, notificar: true });
  await db.query("UPDATE clientes SET asaas_cliente_id = $2 WHERE id = $1", [c.id, novo.id]);
  return novo.id;
}

/** Cria a cobrança no Asaas do studio e o espelho local. */
export async function emitirCobranca(db: Executor, studio: Studio, chaveMestra: string | null, c: {
  clienteId: string; agendamentoId?: string | null; assinaturaId?: string | null;
  finalidade: Cobranca["finalidade"]; meio: Cobranca["meio"]; valor: number; vencimento: DiaISO;
  descricao: string; usuarioId: string | null;
}, fetchFn?: Fetch): Promise<Cobranca> {
  if (c.valor <= 0) throw new Error("O valor da cobrança precisa ser maior que zero.");
  const asaas = clienteAsaas(studio, chaveMestra, fetchFn);
  const clienteId = await clienteAsaasId(db, asaas, c.clienteId);
  const ref = c.agendamentoId ? `agendamento:${c.agendamentoId}` : c.assinaturaId ? `assinatura:${c.assinaturaId}` : `cliente:${c.clienteId}`;
  const pag = await asaas.criarCobranca({ clienteId, meio: c.meio, valorCentavos: c.valor, vencimento: c.vencimento, descricao: `${c.descricao} · ${studio.nome}`, referencia: ref });
  let pix: { encodedImage: string; payload: string } | null = null;
  if (c.meio === "pix") { try { pix = await asaas.qrPix(pag.id); } catch { /* o link da fatura ainda serve */ } }
  const r = await db.query<Cobranca>(
    `INSERT INTO cobrancas (studio_id, cliente_id, agendamento_id, assinatura_id, finalidade, meio, valor, vencimento, situacao, asaas_id, url_fatura, pix_copia_cola, pix_qr_base64, criado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *, vencimento::text AS vencimento`,
    [studio.id, c.clienteId, c.agendamentoId ?? null, c.assinaturaId ?? null, c.finalidade, c.meio, c.valor,
      c.vencimento, situacaoDoStatus(pag.status), pag.id, pag.invoiceUrl ?? pag.bankSlipUrl ?? null,
      pix?.payload ?? null, pix?.encodedImage ?? null, c.usuarioId]);
  await auditar(db, studio.id, c.usuarioId, "cobranca.emitir", "cobrancas", r.rows[0].id, { meio: c.meio, valor: c.valor, asaas: pag.id });
  return r.rows[0];
}

/** Sincroniza uma cobrança com o Asaas e dá os efeitos se foi paga. Idempotente. */
export async function sincronizarCobranca(db: Executor, studio: Studio, chaveMestra: string | null, cobrancaId: string, fetchFn?: Fetch): Promise<Cobranca> {
  const c = await lerCobranca(db, cobrancaId);
  if (!c || !c.asaas_id) throw new Error("Cobrança não encontrada.");
  const asaas = clienteAsaas(studio, chaveMestra, fetchFn);
  const remoto = await asaas.consultar(c.asaas_id);
  const nova = situacaoDoStatus(remoto.status);
  const liquido = remoto.netValue != null ? reaisParaCentavos(remoto.netValue) : null;
  if (nova !== c.situacao || liquido !== c.valor_liquido) {
    await db.query(
      `UPDATE cobrancas SET situacao = $2, valor_liquido = $3, atualizada_em = now(),
              recebida_em = CASE WHEN $2 = 'recebida' THEN COALESCE(recebida_em, now()) ELSE recebida_em END WHERE id = $1`,
      [c.id, nova, liquido]);
  }
  if (nova === "recebida" && c.situacao !== "recebida") {
    const cli = (await db.query<{ nome: string }>("SELECT nome FROM clientes WHERE id = $1", [c.cliente_id])).rows[0];
    const rotulo = { sinal: "Sinal", servico: "Serviço", assinatura: "Assinatura", avulsa: "Cobrança" }[c.finalidade];
    await db.query(
      `INSERT INTO lancamentos (studio_id, tipo, categoria, descricao, valor, forma, origem, agendamento_id, assinatura_id, cobranca_id, data)
       VALUES ($1,'receita',$2,$3,$4,'asaas',$5,$6,$7,$8, CURRENT_DATE)`,
      [studio.id, c.finalidade === "assinatura" ? "Assinatura" : "Serviço",
        `${rotulo} pelo Asaas — ${cli?.nome ?? "cliente"}`, c.valor,
        c.finalidade === "assinatura" ? "assinatura_cliente" : "servico",
        c.finalidade === "assinatura" ? null : c.agendamento_id, c.assinatura_id, c.id]);
    if (c.finalidade === "sinal" && c.agendamento_id) {
      await db.query("UPDATE agendamentos SET situacao = 'confirmado', confirmado_em = now() WHERE id = $1 AND situacao = 'pendente'", [c.agendamento_id]);
    }
    if (c.finalidade === "assinatura" && c.assinatura_id) {
      // A cliente pagou o período: empurra a cobertura da assinatura.
      await db.query(
        `UPDATE assinaturas_clientes SET pago_ate =
           (GREATEST(COALESCE(pago_ate, '2000-01-01'::date), CURRENT_DATE) +
            (CASE periodo WHEN 'mensal' THEN 1 WHEN 'trimestral' THEN 3 WHEN 'semestral' THEN 6 ELSE 12 END || ' months')::interval)::date
         WHERE id = $1`, [c.assinatura_id]);
    }
    await auditar(db, studio.id, null, "cobranca.recebida", "cobrancas", c.id, { valor: c.valor, liquido });
  }
  if (nova === "estornada" && c.situacao === "recebida") {
    await db.query("UPDATE lancamentos SET anulado_em = now(), motivo_anulacao = 'estorno no Asaas' WHERE cobranca_id = $1 AND anulado_em IS NULL", [c.id]);
    await auditar(db, studio.id, null, "cobranca.estornada", "cobrancas", c.id, null);
  }
  return (await lerCobranca(db, c.id))!;
}

export async function cancelarCobranca(db: Executor, studio: Studio, chaveMestra: string | null, cobrancaId: string, usuarioId: string | null, fetchFn?: Fetch): Promise<void> {
  const c = await lerCobranca(db, cobrancaId);
  if (!c || !c.asaas_id) throw new Error("Cobrança não encontrada.");
  if (c.situacao === "recebida") throw new Error("Cobrança paga não se cancela; faça o estorno no Asaas.");
  await clienteAsaas(studio, chaveMestra, fetchFn).cancelar(c.asaas_id);
  await db.query("UPDATE cobrancas SET situacao = 'cancelada', atualizada_em = now() WHERE id = $1", [c.id]);
  await auditar(db, studio.id, usuarioId, "cobranca.cancelar", "cobrancas", c.id, null);
}

/**
 * Webhook do studio: guarda o aviso, acha a cobrança pelo id do Asaas e
 * sincroniza (ou seja: confere na API). Responde "ok" mesmo sem conhecer a
 * cobrança — o Asaas reenvia e pausa a fila se receber erro repetido.
 */
export async function receberWebhook(db: Executor, studio: Studio, chaveMestra: string | null, corpo: string, fetchFn?: Fetch): Promise<string> {
  const ev = lerEvento(corpo);
  if (!ev) return "corpo ilegível";
  const ins = await db.query<{ id: number }>(
    `INSERT INTO webhooks_recebidos (studio_id, evento_id, evento, corpo) VALUES ($1,$2,$3,$4::jsonb)
     ON CONFLICT (studio_id, evento_id) DO NOTHING RETURNING id`, [studio.id, ev.id ?? null, ev.event, corpo]);
  if (ins.rowCount === 0 && ev.id) return "evento já processado";
  let resultado = "ignorado";
  if (ev.payment?.id && (ev.event ?? "").startsWith("PAYMENT_")) {
    const c = await db.query<{ id: string }>("SELECT id FROM cobrancas WHERE asaas_id = $1", [ev.payment.id]);
    if (c.rows[0]) {
      const s = await sincronizarCobranca(db, studio, chaveMestra, c.rows[0].id, fetchFn);
      resultado = `cobrança ${s.id} → ${s.situacao}`;
    } else resultado = "cobrança desconhecida";
  }
  if (ins.rows[0]) await db.query("UPDATE webhooks_recebidos SET processado_em = now(), resultado = $2 WHERE id = $1", [ins.rows[0].id, resultado]);
  return resultado;
}
