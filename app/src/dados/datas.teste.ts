import { test } from "node:test"; import assert from "node:assert/strict";
import { diaValido, horaValida, somarDias, somarMeses, diasEntre, diaDaSemana, minutos, hora, cruzam, hojeEm, br, diaFalado } from "./datas.ts";

test("dia e hora válidos", () => {
  assert.ok(diaValido("2026-10-27")); assert.ok(!diaValido("2026-02-30")); assert.ok(!diaValido("27/10/2026")); assert.ok(!diaValido(""));
  assert.ok(horaValida("09:30")); assert.ok(horaValida("23:59")); assert.ok(!horaValida("24:00")); assert.ok(!horaValida("9:30"));
});
test("aritmética de dias e meses", () => {
  assert.equal(somarDias("2026-10-31", 1), "2026-11-01");
  assert.equal(somarMeses("2026-01-31", 1), "2026-02-28", "gruda no fim do mês");
  assert.equal(somarMeses("2026-10-15", 3), "2027-01-15");
  assert.equal(diasEntre("2026-10-01", "2026-10-27"), 26);
  assert.equal(diaDaSemana("2026-10-27"), 2, "terça");
});
test("minutos e choque", () => {
  assert.equal(minutos("14:30"), 870); assert.equal(hora(870), "14:30");
  assert.ok(cruzam(540, 600, 570, 630)); assert.ok(!cruzam(540, 600, 600, 660), "fim encosta no começo não é choque");
});
test("hoje no fuso, formatos", () => {
  assert.match(hojeEm("America/Sao_Paulo"), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(br("2027-03-12"), "12/03/2027");
  assert.equal(diaFalado("2026-10-27", "2026-10-27"), "hoje");
  assert.equal(diaFalado("2026-10-28", "2026-10-27"), "amanhã");
});
