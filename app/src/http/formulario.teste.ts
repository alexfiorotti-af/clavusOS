import { test } from "node:test"; import assert from "node:assert/strict";
import { lerFormulario, campo, lista, inteiro, marcado } from "./formulario.ts";
test("campos simples e repetidos", () => { const f = lerFormulario("nome=Ana+Paula&q=1&q=2&ok=on&n=12"); assert.equal(campo(f, "nome"), "Ana Paula"); assert.deepEqual(lista(f, "q"), ["1", "2"]); assert.ok(marcado(f, "ok")); assert.equal(inteiro(f, "n"), 12); assert.equal(inteiro(f, "x", 7), 7); assert.equal(campo(f, "nada"), ""); });
