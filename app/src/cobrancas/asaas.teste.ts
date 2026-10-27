import { test } from "node:test"; import assert from "node:assert/strict";
import { Asaas, situacaoDoStatus, lerEvento, reaisParaCentavos, centavosParaReais, ErroAsaas } from "./asaas.ts";
test("status → situação", () => { assert.equal(situacaoDoStatus("RECEIVED"), "recebida"); assert.equal(situacaoDoStatus("CONFIRMED"), "recebida"); assert.equal(situacaoDoStatus("OVERDUE"), "vencida"); assert.equal(situacaoDoStatus("REFUNDED"), "estornada"); assert.equal(situacaoDoStatus("PENDING"), "pendente"); assert.equal(situacaoDoStatus("DELETED"), "cancelada"); });
test("centavos ↔ reais sem erro de ponto flutuante", () => { assert.equal(reaisParaCentavos(19.99), 1999); assert.equal(centavosParaReais(1999), 19.99); assert.equal(reaisParaCentavos(0.1 + 0.2), 30); });
test("evento", () => { assert.equal(lerEvento("{"), null); assert.equal(lerEvento('{"x":1}'), null); assert.equal(lerEvento('{"event":"PAYMENT_RECEIVED","payment":{"id":"p"}}')?.payment?.id, "p"); });
test("cliente manda chave, base do ambiente e valor em reais; erro vira ErroAsaas", async () => {
  const chamadas: { url: string; body: string }[] = [];
  const f: typeof fetch = async (u, i) => { chamadas.push({ url: String(u), body: String(i?.body ?? "") }); assert.equal((i?.headers as Record<string, string>).access_token, "k"); return new Response(JSON.stringify({ id: "pay_1", status: "PENDING" }), { status: 200 }); };
  const a = new Asaas("k", "sandbox", f);
  await a.criarCobranca({ clienteId: "c", meio: "pix", valorCentavos: 15050, vencimento: "2027-01-01", descricao: "x", referencia: "r" });
  assert.ok(chamadas[0].url.startsWith("https://api-sandbox.asaas.com/v3/payments")); assert.match(chamadas[0].body, /"value":150.5/); assert.match(chamadas[0].body, /"billingType":"PIX"/);
  const ruim = new Asaas("k", "producao", async () => new Response(JSON.stringify({ errors: [{ description: "chave inválida" }] }), { status: 401 }));
  await assert.rejects(ruim.testar(), (e: unknown) => e instanceof ErroAsaas && e.status === 401 && /chave inválida/.test(e.detalhe));
});
