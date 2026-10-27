import { test } from "node:test"; import assert from "node:assert/strict";
import { gradeDoDia, temChoque, datasDoMes, type Ocupado } from "./horarios.ts";

const ocupados: Ocupado[] = [
  { inicio: "10:00", duracaoMin: 60, profissionalId: "lia" },
  { inicio: "14:00", duracaoMin: 90, profissionalId: "bia", rotulo: "Camila" },
  { inicio: "16:00", duracaoMin: 30, profissionalId: null },      // sem profissional trava todo mundo
];

test("grade por profissional: ocupa o dela, o sem-profissional, e respeita a duração", () => {
  const g = gradeDoDia({ abre: "09:00", fecha: "18:00", passoMin: 30, duracaoMin: 60, ocupados, profissionalId: "lia" });
  const de = (h: string) => g.find((s) => s.hora === h)!;
  assert.equal(de("09:00").livre, true);
  assert.equal(de("09:30").livre, false, "serviço de 60min às 09:30 invade o 10:00 dela");
  assert.equal(de("10:00").livre, false);
  assert.equal(de("11:00").livre, true);
  assert.equal(de("14:00").livre, true, "o 14:00 é da Bia, não da Lia");
  assert.equal(de("15:30").livre, false, "16:00 sem profissional trava a casa");
  assert.equal(g.at(-1)!.hora, "17:00", "último começo em que 60min cabem até as 18:00");
});

test("studio solo (profissionalId null) considera tudo ocupado", () => {
  const g = gradeDoDia({ abre: "09:00", fecha: "18:00", passoMin: 30, duracaoMin: 30, ocupados, profissionalId: null });
  assert.equal(g.find((s) => s.hora === "14:30")!.livre, false);
  assert.equal(g.find((s) => s.hora === "14:30")!.rotulo, "Camila");
});

test("temChoque: encosta não é choque; invade é", () => {
  assert.equal(temChoque({ inicio: "11:00", duracaoMin: 60, ocupados, profissionalId: "lia" }), null, "11:00 começa onde o dela acabou");
  assert.ok(temChoque({ inicio: "10:30", duracaoMin: 30, ocupados, profissionalId: "lia" }));
  assert.equal(temChoque({ inicio: "10:30", duracaoMin: 30, ocupados, profissionalId: "bia" }), null);
});

test("datasDoMes: ordena, tira repetido e pula dia que o mês não tem", () => {
  assert.deepEqual(datasDoMes("2026-02", [28, 5, 5, 31]), ["2026-02-05", "2026-02-28"]);
  assert.deepEqual(datasDoMes("2026-10", [10, 25]), ["2026-10-10", "2026-10-25"]);
});
