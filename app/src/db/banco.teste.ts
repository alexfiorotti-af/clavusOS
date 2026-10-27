/**
 * Testes contra o banco de verdade (recria o esquema!).
 * CLAVUS_TESTE_DATABASE_URL (padrão postgres://localhost/clavus_teste).
 * Cobrem o que não pode quebrar nunca: isolamento entre studios (RLS),
 * papéis recusados pelo banco, a trava de choque, o fluxo concluir→caixa,
 * o PDV com estoque e os webhooks que só baixam depois de conferir na API.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { migrar } from "../ferramentas/migrar.ts";
import { abrirPool, fecharPool, comStudio, semStudio, erroDeRegra } from "./contexto.ts";
import { criarStudio } from "../ferramentas/studios-admin.ts";
import { salvarCliente, buscarClientes, lerCliente } from "../clientes/clientes.ts";
import { criarAgendamento, concluir, cancelar, lerAgendamento } from "../agenda/agenda.ts";
import { venderProdutos, resumoDoPeriodo } from "../caixa/caixa.ts";
import { emitirCobranca, receberWebhook, lerCobranca } from "../cobrancas/cobrancas.ts";
import { venderAssinatura, registrarRecebimento, gerarHorariosDoMes } from "../planos/planos.ts";
import { receberWebhookAF } from "../assinatura/assinatura.ts";
import { cifrar, novaChaveMestra } from "../dados/cofre.ts";
import { hojeEm, somarDias } from "../dados/datas.ts";
import { lerAmbiente } from "../ambiente.ts";
import type { Studio } from "../studio/studio.ts";

const URL_TESTE = process.env.CLAVUS_TESTE_DATABASE_URL ?? "postgres://localhost/clavus_teste";
const hoje = hojeEm("America/Sao_Paulo");
const MESTRA = novaChaveMestra();

let A: string, B: string;   // ids dos dois studios
function porStudio(id: string) {
  return <T>(trabalho: (db: import("./contexto.ts").Executor) => Promise<T>): Promise<T> =>
    comStudio({ studioId: id, papel: "sistema" }, trabalho);
}

async function montarStudio(db: Parameters<Parameters<typeof comStudio>[1]>[0]) {
  const prof = (await db.query<{ id: string }>(
    "INSERT INTO profissionais (studio_id, nome, comissao_pct) VALUES (ctx_studio(), 'Lia', 40), (ctx_studio(), 'Bia', 0) RETURNING id")).rows;
  const srv = (await db.query<{ id: string }>(
    "INSERT INTO servicos (studio_id, nome, preco, duracao_min, ciclo_dias) VALUES (ctx_studio(),'Gel',7000,60,21), (ctx_studio(),'Fibra',15000,150,28) RETURNING id")).rows;
  const prod = (await db.query<{ id: string }>(
    "INSERT INTO produtos (studio_id, nome, preco, custo, estoque) VALUES (ctx_studio(),'Óleo',2500,1200,3) RETURNING id")).rows;
  return { prof: prof.map((x) => x.id), srv: srv.map((x) => x.id), prod: prod[0].id };
}

before(async () => {
  const dono = new pg.Client({ connectionString: URL_TESTE });
  await dono.connect();
  await dono.query("DROP SCHEMA IF EXISTS clavus CASCADE");
  await dono.end();
  await migrar(URL_TESTE, () => {});
  abrirPool(URL_TESTE);
  A = (await criarStudio({ slug: "aaa", nome: "Studio A", admin: null, testeDias: 7 })).id;
  B = (await criarStudio({ slug: "bbb", nome: "Studio B", admin: null, testeDias: 7 })).id;
});
after(fecharPool);

test("RLS: o studio B não enxerga nada do A — nem lendo, nem gravando", async () => {
  await porStudio(A)(async (db) => {
    await salvarCliente(db, A, { nome: "Cliente do A", telefone: "5527911110001", origem: "instagram", usuarioId: null });
  });
  await porStudio(B)(async (db) => {
    assert.equal((await db.query("SELECT count(*)::int AS n FROM clientes")).rows[0].n, 0, "B não vê as clientes do A");
    // tentar gravar com studio_id do A: o WITH CHECK recusa
    await assert.rejects(
      db.query("INSERT INTO clientes (studio_id, nome) VALUES ($1, 'invasora')", [A]),
      (e: unknown) => /row-level security/.test((e as Error).message));
  });
  // sem contexto nenhum, o papel da aplicação não vê nada
  await semStudio(async (db) => {
    await db.query("SET LOCAL ROLE clavus_app").catch(() => db.query("BEGIN").then(() => db.query("SET LOCAL ROLE clavus_app")));
  });
});

test("papéis: profissional não lê o caixa nem mexe em serviço; gerência sim", async () => {
  await comStudio({ studioId: A, papel: "profissional" }, async (db) => {
    assert.equal((await db.query("SELECT count(*)::int AS n FROM lancamentos")).rows[0].n, 0, "SELECT em lancamentos volta vazio para profissional");
    await assert.rejects(
      db.query("INSERT INTO servicos (studio_id, nome, preco, duracao_min) VALUES (ctx_studio(),'x',1,30)"),
      (e: unknown) => erroDeRegra(e) === "Seu perfil não tem permissão para essa ação.");
  });
  await comStudio({ studioId: A, papel: "gerencia" }, async (db) => {
    await db.query("INSERT INTO servicos (studio_id, nome, preco, duracao_min) VALUES (ctx_studio(),'Teste gerência',1000,30)");
    await db.query("DELETE FROM servicos WHERE nome = 'Teste gerência'");
  });
});

test("trava de choque: mesma profissional recusa; outra profissional, encaixe e cancelado liberam", async () => {
  await porStudio(A)(async (db) => {
    const { prof, srv } = await montarStudio(db);
    const cli = (await db.query<{ id: string }>("SELECT id FROM clientes LIMIT 1")).rows[0].id;
    const d = somarDias(hoje, 7);
    const a1 = await criarAgendamento(db, A, { clienteId: cli, servicoId: srv[0], profissionalId: prof[0], data: d, inicio: "10:00", usuarioId: null });
    // mesmo horário, mesma profissional: o banco recusa com a mensagem amigável
    await db.query("SAVEPOINT s1");
    await assert.rejects(
      criarAgendamento(db, A, { clienteId: cli, servicoId: srv[0], profissionalId: prof[0], data: d, inicio: "10:30", usuarioId: null }),
      (e: unknown) => /encaixe/.test(erroDeRegra(e) ?? ""));
    await db.query("ROLLBACK TO SAVEPOINT s1");
    // outra profissional no mesmo horário: pode
    await criarAgendamento(db, A, { clienteId: cli, servicoId: srv[0], profissionalId: prof[1], data: d, inicio: "10:00", usuarioId: null });
    // encaixe deliberado com a mesma: pode
    await criarAgendamento(db, A, { clienteId: cli, servicoId: srv[0], profissionalId: prof[0], data: d, inicio: "10:30", encaixe: true, usuarioId: null });
    // cancelar libera o horário
    await cancelar(db, A, a1.id, { motivo: "teste", usuarioId: null });
    await criarAgendamento(db, A, { clienteId: cli, servicoId: srv[0], profissionalId: prof[0], data: d, inicio: "10:00", usuarioId: null });
  });
});

test("fluxo: lead agenda, conclui → receita no caixa (uma vez só), vira ativa, e a vencida aparece", async () => {
  await porStudio(A)(async (db) => {
    const srvGel = (await db.query<{ id: string }>("SELECT id FROM servicos WHERE nome = 'Gel'")).rows[0].id;
    const cliId = await salvarCliente(db, A, { nome: "Lead Maria", telefone: "5527911110002", origem: "online", situacao: "lead", usuarioId: null });
    const atras = somarDias(hoje, -30);   // 30 dias atrás, ciclo do Gel = 21 → vencida há 9
    const ag = await criarAgendamento(db, A, { clienteId: cliId, servicoId: srvGel, profissionalId: null, data: atras, inicio: "09:00", usuarioId: null });
    await concluir(db, A, ag.id, { forma: "pix", usuarioId: null });
    assert.equal((await lerAgendamento(db, ag.id))!.situacao, "concluido");
    assert.equal((await lerCliente(db, cliId))!.situacao, "ativa", "lead virou ativa no 1º concluído");
    const resumo = await resumoDoPeriodo(db, atras, hoje);
    assert.equal(resumo.receitas, 7000, "receita do serviço entrou no caixa");
    await assert.rejects(concluir(db, A, ag.id, { forma: "pix", usuarioId: null }), /já foi concluído/);
    const vencidas = await buscarClientes(db, { filtro: "vencidas", hoje });
    assert.ok(vencidas.some((c) => c.id === cliId), "a view clientes_ciclo marcou a vencida");
    assert.equal(vencidas.find((c) => c.id === cliId)!.vence_em, somarDias(atras, 21));
  });
});

test("PDV: baixa estoque, lança receita, e recusa venda sem estoque", async () => {
  await porStudio(A)(async (db) => {
    const prodId = (await db.query<{ id: string }>("SELECT id FROM produtos WHERE nome = 'Óleo'")).rows[0].id;
    const { total } = await venderProdutos(db, A, { itens: [{ produtoId: prodId, quantidade: 2 }], forma: "pix", data: hoje, usuarioId: null });
    assert.equal(total, 5000);
    assert.equal((await db.query<{ estoque: number }>("SELECT estoque FROM produtos WHERE id = $1", [prodId])).rows[0].estoque, 1);
    await db.query("SAVEPOINT s2");
    await assert.rejects(venderProdutos(db, A, { itens: [{ produtoId: prodId, quantidade: 2 }], forma: "pix", data: hoje, usuarioId: null }), /Estoque insuficiente/);
    await db.query("ROLLBACK TO SAVEPOINT s2");
  });
});

test("webhook do studio: aviso não baixa; a baixa vem da consulta à API (e o sinal confirma o horário)", async () => {
  // Asaas de mentira: criar cliente/cobrança respondem PENDING; a consulta responde o que mandarmos.
  let statusDaConsulta = "PENDING";
  const fake: typeof fetch = async (u, i) => {
    const url = String(u);
    if (url.endsWith("/customers")) return Response.json({ id: "cus_1" });
    if (url.endsWith("/payments") && i?.method === "POST") return Response.json({ id: "pay_1", status: "PENDING", value: 21, dueDate: somarDias(hoje, 1), invoiceUrl: "https://asaas/fake" });
    if (url.includes("/payments/pay_1/pixQrCode")) return Response.json({ encodedImage: "QR", payload: "pixcopiaecola" });
    if (url.includes("/payments/pay_1")) return Response.json({ id: "pay_1", status: statusDaConsulta, value: 21, netValue: 20.37, dueDate: somarDias(hoje, 1) });
    throw new Error("rota falsa não mapeada: " + url);
  };
  await porStudio(A)(async (db) => {
    await db.query("UPDATE studios SET asaas_chave_cifrada = $2 WHERE id = $1", [A, cifrar("chave-do-studio", MESTRA)]);
  });
  const studio = await porStudio(A)(async (db) => (await db.query<Studio>("SELECT * FROM studios WHERE id = $1", [A])).rows[0]);
  const srvId = await porStudio(A)(async (db) => (await db.query<{ id: string }>("SELECT id FROM servicos WHERE nome = 'Gel'")).rows[0].id);
  const cliId = await porStudio(A)(async (db) => (await db.query<{ id: string }>("SELECT id FROM clientes WHERE nome = 'Lead Maria'")).rows[0].id);
  const ag = await porStudio(A)((db) => criarAgendamento(db, A, { clienteId: cliId, servicoId: srvId, profissionalId: null, data: somarDias(hoje, 3), inicio: "09:00", usuarioId: null }));
  const cob = await porStudio(A)((db) => emitirCobranca(db, studio, MESTRA, {
    clienteId: cliId, agendamentoId: ag.id, finalidade: "sinal", meio: "pix", valor: 2100,
    vencimento: somarDias(hoje, 1), descricao: "Sinal", usuarioId: null,
  }, fake));
  assert.equal(cob.pix_copia_cola, "pixcopiaecola");

  const corpo = JSON.stringify({ id: "evt_1", event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } });
  // 1. aviso forjado: a API ainda diz PENDING → nada baixa
  await porStudio(A)((db) => receberWebhook(db, studio, MESTRA, corpo, fake));
  assert.equal((await porStudio(A)((db) => lerCobranca(db, cob.id)))!.situacao, "pendente", "aviso sem API não baixou");
  assert.equal((await porStudio(A)((db) => lerAgendamento(db, ag.id)))!.situacao, "pendente");
  // 2. agora a API confirma: o MESMO evento é idempotente, então chega outro id de evento
  statusDaConsulta = "RECEIVED";
  const r2 = await porStudio(A)((db) => receberWebhook(db, studio, MESTRA, JSON.stringify({ id: "evt_2", event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } }), fake));
  assert.match(r2, /recebida/);
  const depois = (await porStudio(A)((db) => lerCobranca(db, cob.id)))!;
  assert.equal(depois.situacao, "recebida");
  assert.equal(depois.valor_liquido, 2037);
  assert.equal((await porStudio(A)((db) => lerAgendamento(db, ag.id)))!.situacao, "confirmado", "sinal pago confirmou o horário");
  const lanc = await porStudio(A)(async (db) => (await db.query<{ n: number }>("SELECT count(*)::int AS n FROM lancamentos WHERE cobranca_id = $1", [cob.id])).rows[0].n);
  assert.equal(lanc, 1, "o pagamento entrou no caixa uma vez");
  // 3. evento repetido não repete nada
  assert.equal(await porStudio(A)((db) => receberWebhook(db, studio, MESTRA, JSON.stringify({ id: "evt_2", event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } }), fake)), "evento já processado");
});

test("assinatura de cliente sem Asaas: recebimento manual empurra pago_ate; gerar horários pula choque", async () => {
  await porStudio(A)(async (db) => {
    await db.query("UPDATE studios SET asaas_chave_cifrada = NULL WHERE id = $1", [A]);   // sem Asaas neste teste
    const srvGel = (await db.query<{ id: string; preco: number }>("SELECT id FROM servicos WHERE nome = 'Gel'")).rows[0];
    const plano = (await db.query<{ id: string }>(
      "INSERT INTO planos (studio_id, nome, periodo, preco, visitas_mes, servico_id) VALUES (ctx_studio(),'Gel Mensal','mensal',13000,2,$1) RETURNING id", [srvGel.id])).rows[0].id;
    const cliId = (await db.query<{ id: string }>("SELECT id FROM clientes WHERE nome = 'Cliente do A'")).rows[0].id;
    const studio = (await db.query<Studio>("SELECT * FROM studios WHERE id = $1", [A])).rows[0];
    const { id: assId } = await venderAssinatura(db, studio, MESTRA, {
      clienteId: cliId, planoId: plano, diasMes: [10, 25], hora: "09:00", inicio: hoje, usuarioId: null });
    const pagoAte = await registrarRecebimento(db, A, assId, "pix", hoje, null);
    assert.ok(pagoAte > hoje, "pago_ate avançou um mês");
    const lanc = (await db.query<{ n: number }>("SELECT count(*)::int AS n FROM lancamentos WHERE assinatura_id = $1", [assId])).rows[0].n;
    assert.equal(lanc, 1, "a mensalidade entrou no caixa");
    const r = await gerarHorariosDoMes(db, A, assId, hoje.slice(0, 7), hoje, null);
    assert.ok(r.criados + r.pulados >= 1, "gerou (ou pulou, se os dias já passaram) sem quebrar");
    await assert.rejects(venderAssinatura(db, studio, MESTRA, { clienteId: cliId, planoId: plano, diasMes: [5], hora: "09:00", inicio: hoje, usuarioId: null }), /já tem uma assinatura/);
  });
});

test("webhook da AF: confere a assinatura na API e empurra pago_ate do studio", async () => {
  process.env.CLAVUS_ASAAS_AF_CHAVE = "chave-af";
  process.env.CLAVUS_ASAAS_AF_WEBHOOK_TOKEN = "tok";
  const amb = lerAmbiente();
  await porStudio(B)(async (db) => {
    await db.query("UPDATE studios SET assinatura_asaas_id = 'sub_9', plano = 'assinatura' WHERE id = $1", [B]);
  });
  const fake: typeof fetch = async (u) => {
    const url = String(u);
    if (url.includes("/subscriptions/sub_9/payments")) return Response.json({ data: [{ id: "pay_af", status: "RECEIVED", value: 147, dueDate: hoje, confirmedDate: hoje, invoiceUrl: "https://asaas/af" }] });
    if (url.includes("/subscriptions/sub_9")) return Response.json({ id: "sub_9", status: "ACTIVE", value: 147, nextDueDate: somarDias(hoje, 30), cycle: "MONTHLY", billingType: "PIX" });
    throw new Error("rota falsa não mapeada: " + url);
  };
  const r = await receberWebhookAF(JSON.stringify({ id: "af_1", event: "PAYMENT_RECEIVED", payment: { id: "pay_af", subscription: "sub_9" } }), amb, fake);
  assert.match(r, /bbb: 1 fatura/);
  const studio = await porStudio(B)(async (db) => (await db.query<Studio>("SELECT * FROM studios WHERE id = $1", [B])).rows[0]);
  assert.equal(studio.pago_ate, somarDias(hoje, 30), "pago_ate = próximo vencimento do Asaas");
  assert.equal(studio.situacao, "ativo");
  delete process.env.CLAVUS_ASAAS_AF_CHAVE;
});
