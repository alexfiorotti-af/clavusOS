/**
 * Assinatura do ClavusOS — o studio paga a AF.
 *
 *   teste (N dias) → carência (M dias, avisando) → bloqueado (só o administrador entra, e só em Cobrança)
 *   assinar: cria cliente + assinatura mensal na conta Asaas da AF (o studio escolhe Pix, boleto ou cartão na fatura)
 *   pagamento (webhook ou rotina) → confere na API → fatura registrada → `pago_ate` = próximo vencimento da assinatura
 *   cancelar: encerra a assinatura no Asaas; o acesso vale até `pago_ate`
 *   avulso: 1, 3, 6 ou 12 meses numa cobrança só
 *   cortesia: nunca bloqueia (o studio `modelo`, parcerias)
 *
 * Regra da casa: webhook não libera nada sozinho; quem libera é a consulta à API.
 */
import { Asaas, lerEvento, situacaoDoStatus, reaisParaCentavos, type Fetch, type CobrancaAsaas } from "../cobrancas/asaas.ts";
import { comStudio, semStudio, type Executor } from "../db/contexto.ts";
import { auditar } from "../db/auditar.ts";
import { somarDias, diasEntre, type DiaISO } from "../dados/datas.ts";
import type { Studio } from "../studio/studio.ts";
import type { Ambiente } from "../ambiente.ts";

export type Acesso = {
  estado: "ativo" | "teste" | "carencia" | "bloqueado";
  /** Dia em que o estado atual termina (fim do teste, da carência ou do período pago). */
  ate: DiaISO | null;
  diasRestantes: number;
};

type CamposAcesso = Pick<Studio, "plano" | "teste_ate" | "pago_ate">;

/** Função pura: do estado do studio e do dia, o que a tela pode mostrar. */
export function situacaoAcesso(s: CamposAcesso, hoje: DiaISO, carenciaDias: number): Acesso {
  if (s.plano === "cortesia") return { estado: "ativo", ate: null, diasRestantes: Infinity };
  if (s.pago_ate && s.pago_ate >= hoje) return { estado: "ativo", ate: s.pago_ate, diasRestantes: diasEntre(hoje, s.pago_ate) };
  if (!s.pago_ate && s.teste_ate && s.teste_ate >= hoje) return { estado: "teste", ate: s.teste_ate, diasRestantes: diasEntre(hoje, s.teste_ate) };
  const base = s.pago_ate ?? s.teste_ate;
  if (base) {
    const fimCarencia = somarDias(base, carenciaDias);
    if (fimCarencia >= hoje) return { estado: "carencia", ate: fimCarencia, diasRestantes: diasEntre(hoje, fimCarencia) };
  }
  return { estado: "bloqueado", ate: base, diasRestantes: 0 };
}

export function clienteAF(a: Ambiente, fetchFn?: Fetch): Asaas {
  if (!a.asaasAF) throw new Error("A cobrança do ClavusOS ainda não está ligada nesta instalação (CLAVUS_ASAAS_AF_CHAVE).");
  return new Asaas(a.asaasAF.chave, a.asaasAF.ambiente, fetchFn);
}

export type Fatura = {
  id: string; asaas_id: string; valor: number; vencimento: DiaISO;
  situacao: "pendente" | "recebida" | "vencida" | "cancelada" | "estornada";
  meio: string | null; url_fatura: string | null; recebida_em: string | null; meses: number; avulsa: boolean;
};

export async function faturasDoStudio(db: Executor): Promise<Fatura[]> {
  return (await db.query<Fatura>("SELECT id, asaas_id, valor, vencimento::text AS vencimento, situacao, meio, url_fatura, recebida_em, meses, avulsa FROM faturas_clavus ORDER BY vencimento DESC LIMIT 36")).rows;
}

/** Cliente da AF no Asaas (criado uma vez por studio). Notificações ligadas: é o Asaas quem lembra do boleto/Pix. */
async function clienteDoStudio(db: Executor, studio: Studio, asaas: Asaas): Promise<string> {
  if (studio.assinatura_cliente_id) return studio.assinatura_cliente_id;
  const c = await asaas.criarCliente({ nome: studio.razao_social || studio.nome, cpfCnpj: studio.cnpj_cpf, email: studio.email, celular: studio.telefone, referencia: `clavus:${studio.id}`, notificar: true });
  await db.query("UPDATE studios SET assinatura_cliente_id = $2 WHERE id = $1", [studio.id, c.id]);
  return c.id;
}

/** Pagamento avulso: N meses numa cobrança só. Paga → `pago_ate` avança N meses do que já estava coberto. */
export async function pagarAvulso(db: Executor, studio: Studio, a: Ambiente, hoje: DiaISO, meses: number, usuarioId: string | null, fetchFn?: Fetch): Promise<{ urlFatura: string | null }> {
  if (studio.plano === "cortesia") throw new Error("Este studio é cortesia: não precisa pagar.");
  if (![1, 3, 6, 12].includes(meses)) throw new Error("Escolha 1, 3, 6 ou 12 meses.");
  if (studio.assinatura_asaas_id && !studio.assinatura_cancelada_em) throw new Error("Este studio tem assinatura mensal ativa; cancele-a antes de pagar avulso.");
  const pend = await db.query("SELECT 1 FROM faturas_clavus WHERE avulsa AND situacao IN ('pendente','vencida') LIMIT 1");
  if (pend.rowCount) throw new Error("Já existe uma fatura avulsa em aberto: pague-a ou cancele-a antes de gerar outra.");
  const asaas = clienteAF(a, fetchFn);
  const clienteId = await clienteDoStudio(db, studio, asaas);
  const vencimento = somarDias(hoje, 3);
  const valor = a.precoCentavos * meses;
  const c = await asaas.criarCobranca({ clienteId, meio: "link", valorCentavos: valor, vencimento, descricao: `ClavusOS — ${meses} ${meses > 1 ? "meses" : "mês"} do sistema · ${studio.nome}`, referencia: `clavus:${studio.id}:avulso:${meses}` });
  await db.query(
    "INSERT INTO faturas_clavus (studio_id, asaas_id, valor, vencimento, situacao, meio, url_fatura, meses, avulsa) VALUES ($1,$2,$3,$4,'pendente',$5,$6,$7,true)",
    [studio.id, c.id, valor, c.dueDate ?? vencimento, c.billingType?.toLowerCase() ?? null, c.invoiceUrl ?? c.bankSlipUrl ?? null, meses]);
  await db.query("UPDATE studios SET plano = CASE WHEN plano = 'teste' THEN 'assinatura' ELSE plano END WHERE id = $1", [studio.id]);
  await auditar(db, studio.id, usuarioId, "assinatura.avulso", "studios", studio.id, { cobranca: c.id, meses, valor });
  return { urlFatura: c.invoiceUrl ?? c.bankSlipUrl ?? null };
}

/** Confere no Asaas as faturas avulsas em aberto; pagou → `pago_ate` avança N meses. */
export async function sincronizarAvulsas(db: Executor, studio: Studio, a: Ambiente, fetchFn?: Fetch): Promise<void> {
  const abertas = (await db.query<{ id: string; asaas_id: string; meses: number }>("SELECT id, asaas_id, meses FROM faturas_clavus WHERE avulsa AND situacao IN ('pendente','vencida')")).rows;
  if (!abertas.length) return;
  const asaas = clienteAF(a, fetchFn);
  for (const f of abertas) {
    const c = await asaas.consultar(f.asaas_id);
    const sit = situacaoDoStatus(c.status);
    await db.query("UPDATE faturas_clavus SET situacao = $2, meio = $3, url_fatura = COALESCE($4, url_fatura), recebida_em = CASE WHEN $2 = 'recebida' THEN COALESCE(recebida_em, $5::timestamptz) ELSE recebida_em END, atualizada_em = now() WHERE id = $1",
      [f.id, sit, c.billingType?.toLowerCase() ?? null, c.invoiceUrl ?? c.bankSlipUrl ?? null, c.confirmedDate ?? c.paymentDate ?? new Date().toISOString()]);
    if (sit === "recebida") {
      await db.query(
        `UPDATE studios SET pago_ate = (GREATEST(COALESCE(pago_ate, '2000-01-01'::date), COALESCE(teste_ate, '2000-01-01'::date), current_date) + ($2 || ' months')::interval)::date,
                assinatura_forma = COALESCE($3, assinatura_forma), situacao = CASE WHEN situacao = 'suspenso' THEN situacao ELSE 'ativo' END WHERE id = $1`,
        [studio.id, String(f.meses), c.billingType?.toLowerCase() ?? null]);
    }
  }
}

/**
 * Assina: cria (ou reaproveita) o cliente na conta da AF e a assinatura mensal.
 * Primeiro vencimento = hoje se o teste já acabou; senão, o fim do teste.
 * Devolve a URL da primeira fatura, para o studio pagar na hora.
 */
export async function assinar(db: Executor, studio: Studio, a: Ambiente, hoje: DiaISO, usuarioId: string | null, fetchFn?: Fetch): Promise<{ urlFatura: string | null }> {
  if (studio.plano === "cortesia") throw new Error("Este studio é cortesia: não precisa assinar.");
  if (studio.assinatura_asaas_id && !studio.assinatura_cancelada_em) throw new Error("Este studio já tem uma assinatura ativa.");
  const asaas = clienteAF(a, fetchFn);
  const clienteId = await clienteDoStudio(db, studio, asaas);
  const primeiro = studio.teste_ate && studio.teste_ate > hoje ? studio.teste_ate : hoje;
  const ass = await asaas.criarAssinatura({
    clienteId, valorCentavos: a.precoCentavos, primeiroVencimento: primeiro,
    descricao: `ClavusOS — mensalidade do sistema do studio · ${studio.nome}`, referencia: `clavus:${studio.id}`,
  });
  await db.query(
    "UPDATE studios SET plano = 'assinatura', assinatura_cliente_id = $2, assinatura_asaas_id = $3, assinatura_cancelada_em = NULL, situacao = CASE WHEN situacao = 'teste' THEN 'ativo' ELSE situacao END WHERE id = $1",
    [studio.id, clienteId, ass.id]);
  await auditar(db, studio.id, usuarioId, "assinatura.criar", "studios", studio.id, { assinatura: ass.id, valor: a.precoCentavos, primeiro_vencimento: primeiro });
  // A primeira fatura nasce junto com a assinatura; tenta já registrar e devolver o link, sem derrubar a assinatura se o Asaas demorar.
  try {
    const faturas = await sincronizarAssinatura(db, { ...studio, assinatura_asaas_id: ass.id, assinatura_cliente_id: clienteId }, a, fetchFn);
    const primeira = faturas.find((f) => f.situacao === "pendente") ?? faturas[0];
    return { urlFatura: primeira?.url_fatura ?? null };
  } catch (e) {
    console.error("[assinatura] assinada, mas a primeira fatura ainda não veio:", (e as Error).message);
    return { urlFatura: null };
  }
}

export async function cancelarAssinatura(db: Executor, studio: Studio, a: Ambiente, usuarioId: string | null, fetchFn?: Fetch): Promise<void> {
  if (!studio.assinatura_asaas_id || studio.assinatura_cancelada_em) throw new Error("Não há assinatura ativa para cancelar.");
  const asaas = clienteAF(a, fetchFn);
  try { await asaas.cancelarAssinatura(studio.assinatura_asaas_id); }
  catch (e) { if (!/404|não encontrad|not found/i.test((e as Error).message)) throw e; }
  await db.query("UPDATE studios SET assinatura_cancelada_em = now() WHERE id = $1", [studio.id]);
  await auditar(db, studio.id, usuarioId, "assinatura.cancelar", "studios", studio.id, { assinatura: studio.assinatura_asaas_id, acesso_ate: studio.pago_ate });
}

/**
 * Confere na API as cobranças da assinatura, grava/atualiza as faturas e, se houve
 * pagamento, empurra `pago_ate` para o próximo vencimento informado pelo Asaas.
 * Idempotente: rodar de novo não muda nada.
 */
export async function sincronizarAssinatura(db: Executor, studio: Studio, a: Ambiente, fetchFn?: Fetch): Promise<Fatura[]> {
  await sincronizarAvulsas(db, studio, a, fetchFn);
  if (!studio.assinatura_asaas_id) return faturasDoStudio(db);
  const asaas = clienteAF(a, fetchFn);
  const cobs = await asaas.cobrancasDaAssinatura(studio.assinatura_asaas_id);
  let houvePagamento = false;
  for (const c of cobs) {
    const sit = situacaoDoStatus(c.status);
    if (sit === "recebida") houvePagamento = true;
    await db.query(
      `INSERT INTO faturas_clavus (studio_id, asaas_id, valor, vencimento, situacao, meio, url_fatura, recebida_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (asaas_id) DO UPDATE SET situacao = EXCLUDED.situacao, meio = EXCLUDED.meio, url_fatura = EXCLUDED.url_fatura,
         recebida_em = COALESCE(faturas_clavus.recebida_em, EXCLUDED.recebida_em), valor = EXCLUDED.valor, vencimento = EXCLUDED.vencimento, atualizada_em = now()`,
      [studio.id, c.id, reaisParaCentavos(c.value), c.dueDate, sit, c.billingType?.toLowerCase() ?? null, c.invoiceUrl ?? c.bankSlipUrl ?? null,
        sit === "recebida" ? (c.confirmedDate ?? c.paymentDate ?? new Date().toISOString().slice(0, 10)) : null]);
  }
  if (houvePagamento) {
    // pago_ate = o próximo vencimento que o Asaas calculou; nunca anda para trás.
    const ass = await asaas.consultarAssinatura(studio.assinatura_asaas_id);
    const forma = cobs.filter((c) => situacaoDoStatus(c.status) === "recebida").sort((x, y) => (y.dueDate > x.dueDate ? 1 : -1))[0]?.billingType?.toLowerCase() ?? null;
    await db.query(
      "UPDATE studios SET pago_ate = GREATEST(COALESCE(pago_ate, '2000-01-01'::date), $2::date), assinatura_forma = COALESCE($3, assinatura_forma), situacao = CASE WHEN situacao = 'suspenso' THEN situacao ELSE 'ativo' END WHERE id = $1",
      [studio.id, ass.nextDueDate, forma]);
  }
  return faturasDoStudio(db);
}

/** Webhook da conta da AF: acha o studio pela assinatura (ou pela referência) e manda conferir na API. */
export async function receberWebhookAF(corpo: string, a: Ambiente, fetchFn?: Fetch): Promise<string> {
  const ev = lerEvento(corpo);
  if (!ev) return "corpo ilegível";
  const pagamento = ev.payment as (CobrancaAsaas & { subscription?: string | null }) | undefined;
  if (!pagamento || !(ev.event ?? "").startsWith("PAYMENT_")) return "ignorado";
  const ref = /^clavus:([0-9a-f-]{36})/.exec(pagamento.externalReference ?? "")?.[1] ?? null;
  const alvo = pagamento.subscription
    ? await semStudio(async (db) => (await db.query<{ id: string; slug: string }>("SELECT id, slug FROM studio_da_assinatura($1)", [pagamento.subscription])).rows[0])
    : ref ? await semStudio(async (db) => (await db.query<{ id: string; slug: string }>("SELECT id, slug FROM studios WHERE id = $1", [ref])).rows[0]) : null;
  if (!alvo) return pagamento.subscription ? "assinatura desconhecida" : "cobrança sem referência do ClavusOS";
  return comStudio({ studioId: alvo.id, papel: "sistema" }, async (db) => {
    const ins = await db.query<{ id: number }>(
      "INSERT INTO webhooks_recebidos (studio_id, evento_id, evento, corpo) VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT (studio_id, evento_id) DO NOTHING RETURNING id",
      [alvo.id, ev.id ?? null, ev.event, corpo]);
    if (ins.rowCount === 0 && ev.id) return "evento já processado";
    const studio = (await db.query<Studio>("SELECT * FROM studios WHERE id = $1", [alvo.id])).rows[0];
    const faturas = await sincronizarAssinatura(db, studio, a, fetchFn);
    const resultado = `${alvo.slug}: ${faturas.filter((f) => f.situacao === "recebida").length} fatura(s) paga(s)`;
    if (ins.rows[0]) await db.query("UPDATE webhooks_recebidos SET processado_em = now(), resultado = $2 WHERE id = $1", [ins.rows[0].id, resultado]);
    return resultado;
  });
}

/** Rótulos para a tela. */
export const ESTADOS: Record<Acesso["estado"], string> = {
  ativo: "Assinatura em dia", teste: "Período de teste", carencia: "Pagamento pendente", bloqueado: "Acesso bloqueado",
};
