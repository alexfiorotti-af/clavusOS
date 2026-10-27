import { test } from "node:test"; import assert from "node:assert/strict";
import { reais, lerReais, percentual } from "./dinheiro.ts";
test("formata", () => { assert.equal(reais(123456), "R$ 1.234,56"); assert.equal(reais(-500), "-R$ 5,00"); assert.equal(reais(0), "R$ 0,00"); });
test("lê pt-BR e en", () => { assert.equal(lerReais("1.234,56"), 123456); assert.equal(lerReais("R$ 12,5"), 1250); assert.equal(lerReais("1234.56"), 123456); assert.equal(lerReais("1234"), 123400); assert.equal(lerReais("abc"), null); assert.equal(lerReais(""), null); assert.equal(lerReais("-10,00"), -1000); });
test("percentual arredonda", () => { assert.equal(percentual(33333, 30), 10000); });
