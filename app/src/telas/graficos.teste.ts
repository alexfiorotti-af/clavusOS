/** Gráficos dos relatórios: eixos redondos, valores curtos e variação sem dividir por zero. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { tetoRedondo, reaisCurto, variacao, colunas, ritmo, calor, ranking } from "./graficos.ts";

test("teto do eixo é redondo e nunca abaixo do maior valor", () => {
  assert.equal(tetoRedondo(0), 1);
  assert.equal(tetoRedondo(83000), 100000);     // R$ 830 → eixo até R$ 1 mil
  assert.equal(tetoRedondo(126000), 200000);
  assert.equal(tetoRedondo(230000), 250000);
  for (const v of [1, 7, 99, 101, 4999, 123456]) assert.ok(tetoRedondo(v) >= v);
});

test("valores curtos em reais", () => {
  assert.equal(reaisCurto(0), "R$ 0");
  assert.equal(reaisCurto(83000), "R$ 830");
  assert.equal(reaisCurto(100000), "R$ 1 mil");
  assert.equal(reaisCurto(125000), "R$ 1,3 mil");
  assert.equal(reaisCurto(-7000), "-R$ 70");
});

test("variação: sentido pela seta, cor pelo que é bom, e sem dividir por zero", () => {
  assert.match(variacao(120, 100, { vs: "out" }), /class="var bom">▲ 20%/);
  assert.match(variacao(1, 3, { vs: "out", menorMelhor: true }), /class="var bom">▼ 67%/);   // menos faltas é bom
  assert.match(variacao(5, 0, { vs: "out" }), /sem base/);
  assert.match(variacao(0, 0, { vs: "out" }), /igual/);
  assert.match(variacao(-7000, 5000, { vs: "out", dinheiro: true }), /ruim">▼ R\$ 120/);
});

test("gráficos não quebram com mês vazio e escapam o texto", () => {
  const vazio = [0, 0, 0];
  assert.doesNotThrow(() => colunas({ rotulos: ["a", "b", "c"], series: [{ nome: "Entrou", classe: "s1", valores: vazio }], rotuloAria: "x" }));
  assert.doesNotThrow(() => ritmo({ atual: new Array(30).fill(0), anterior: new Array(31).fill(0), corte: 1, nomeAtual: "Nov", nomeAnterior: "Out" }));
  assert.doesNotThrow(() => calor({ matriz: Array.from({ length: 7 }, () => [0, 0, 0]), dias: [1, 2], periodos: [0, 1] }));
  assert.match(ranking([], { vazio: "Nada aqui." }), /Nada aqui/);
  assert.doesNotMatch(ranking([{ rotulo: "<script>", valor: 1 }]), /<script>/);
});
