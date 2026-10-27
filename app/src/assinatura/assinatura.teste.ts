import { test } from "node:test";
import assert from "node:assert/strict";
import { situacaoAcesso } from "./assinatura.ts";

const base = { plano: "teste" as const, teste_ate: "2026-10-17", pago_ate: null };

test("teste gratuito: dias restantes e fim", () => {
  assert.deepEqual(situacaoAcesso(base, "2026-10-10", 5), { estado: "teste", ate: "2026-10-17", diasRestantes: 7 });
  assert.equal(situacaoAcesso(base, "2026-10-17", 5).estado, "teste", "último dia ainda é teste");
});

test("carência depois do teste, depois bloqueio", () => {
  assert.deepEqual(situacaoAcesso(base, "2026-10-18", 5), { estado: "carencia", ate: "2026-10-22", diasRestantes: 4 });
  assert.equal(situacaoAcesso(base, "2026-10-22", 5).estado, "carencia");
  assert.deepEqual(situacaoAcesso(base, "2026-10-23", 5), { estado: "bloqueado", ate: "2026-10-17", diasRestantes: 0 });
});

test("pago: ativo até pago_ate, carência, bloqueio; cortesia nunca bloqueia", () => {
  const pago = { ...base, plano: "assinatura" as const, pago_ate: "2026-11-17" };
  assert.deepEqual(situacaoAcesso(pago, "2026-11-01", 5), { estado: "ativo", ate: "2026-11-17", diasRestantes: 16 });
  assert.equal(situacaoAcesso(pago, "2026-11-20", 5).estado, "carencia");
  assert.equal(situacaoAcesso(pago, "2026-11-23", 5).estado, "bloqueado");
  assert.equal(situacaoAcesso({ plano: "cortesia", teste_ate: "2020-01-01", pago_ate: null }, "2026-11-23", 5).estado, "ativo");
});

test("sem datas nenhumas (studio antigo sem migração aplicada direito) bloqueia, não quebra", () => {
  assert.equal(situacaoAcesso({ plano: "teste", teste_ate: null, pago_ate: null }, "2026-10-10", 5).estado, "bloqueado");
});
