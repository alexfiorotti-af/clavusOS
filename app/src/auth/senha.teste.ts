import { test } from "node:test"; import assert from "node:assert/strict";
import { gerarHash, conferirSenha, senhaAceitavel, novoToken, hashDoToken } from "./senha.ts";
test("hash e conferência", async () => { const h = await gerarHash("minha senha 123"); assert.ok(h.startsWith("scrypt$")); assert.ok(await conferirSenha("minha senha 123", h)); assert.ok(!(await conferirSenha("outra", h))); assert.ok(!(await conferirSenha("x", null))); assert.ok(!(await conferirSenha("x", "lixo"))); });
test("sal diferente a cada vez", async () => { assert.notEqual(await gerarHash("a1b2c3d4"), await gerarHash("a1b2c3d4")); });
test("senha fraca é recusada", () => { assert.ok(senhaAceitavel("1234567")); assert.ok(senhaAceitavel("12345678")); assert.ok(senhaAceitavel("aaaaaaaa")); assert.equal(senhaAceitavel("clavusda-lua-2027"), null); });
test("token e hash", () => { const t = novoToken(); assert.ok(t.length >= 40); assert.equal(hashDoToken(t), hashDoToken(t)); assert.notEqual(hashDoToken(t), hashDoToken(novoToken())); });
