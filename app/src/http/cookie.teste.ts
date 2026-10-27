import { test } from "node:test"; import assert from "node:assert/strict";
import { lerCookies, cookieSessao, apagarCookie } from "./cookie.ts";
test("lê cookies", () => { assert.deepEqual(lerCookies("a=1; b=x%20y; a=2"), { a: "1", b: "x y" }); assert.deepEqual(lerCookies(undefined), {}); });
test("escreve cookie seguro", () => { const c = cookieSessao("s", "tok", { maxAgeSeg: 10, seguro: true }); assert.match(c, /HttpOnly/); assert.match(c, /Secure/); assert.match(c, /SameSite=Lax/); assert.match(c, /Max-Age=10/); assert.match(apagarCookie("s"), /Max-Age=0/); });
