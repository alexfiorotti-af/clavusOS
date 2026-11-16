#!/usr/bin/env node
/**
 * Gera as imagens públicas do site em app/publico/ a partir de app/src/marca.ts (D021):
 *   og.png   — 1200×630, a prévia do link no WhatsApp/Instagram/Facebook/X
 *   logo.png — 512×512, o símbolo para o Google (JSON-LD Organization)
 * Uso: node scripts/gerar-og.mjs   (Playwright: PLAYWRIGHT_DIR=/caminho/playwright/index.mjs se não estiver no projeto)
 * Sem acesso ao Google Fonts? FONTES_DIR=/caminho/node_modules/@fontsource-variable embute
 * Fraunces (eixos completos, com SOFT) e Instrument Sans locais — fora do repositório.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const M = await import(resolve(raiz, "app/src/marca.ts"));
const { chromium } = await import(process.env.PLAYWRIGHT_DIR ?? "playwright");
const P = M.PALETA;
const fd = process.env.FONTES_DIR;
const b64 = (f) => readFileSync(resolve(fd, f)).toString("base64");
const FONTES = fd ? `<style>
@font-face{font-family:"Fraunces";font-style:normal;font-weight:100 900;src:url(data:font/woff2;base64,${b64("fraunces/files/fraunces-latin-full-normal.woff2")}) format("woff2")}
@font-face{font-family:"Instrument Sans";font-style:normal;font-weight:400 700;src:url(data:font/woff2;base64,${b64("instrument-sans/files/instrument-sans-latin-wdth-normal.woff2")}) format("woff2")}
</style>` : M.FONTES_LINK;
const saida = resolve(raiz, "app/publico");
mkdirSync(saida, { recursive: true });

const og = `<!doctype html><html><head><meta charset="utf-8">${FONTES}<style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:${P.porcelana};color:${P.ameixa};font-family:"Instrument Sans",system-ui,sans-serif;
  display:flex;flex-direction:column;justify-content:space-between;padding:68px 80px}
h1{font-family:"Fraunces",Georgia,serif;font-variation-settings:"SOFT" 100,"opsz" 96;font-weight:500;font-size:68px;line-height:1.06;letter-spacing:-.02em;max-width:900px}
p{font-size:28px;color:${P.ameixaSuave}}
.pe{display:flex;justify-content:space-between;align-items:center;font-size:24px;color:${P.ameixaSuave}}
.pe b{color:${P.cereja};font-weight:600}
</style></head><body>
<div>${M.logoHorizontal({ altura: 54 })}</div>
<div><h1>Agenda cheia, caixa fechado e nenhuma cliente sumida.</h1>
<p style="margin-top:18px">O sistema do studio de unhas e da nail designer.</p></div>
<div class="pe"><span>Agenda · unha vencida · caixa · assinaturas</span><b>clavusos.com.br</b></div>
</body></html>`;

const logo = `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0}body{width:512px;height:512px;background:${P.porcelana};display:grid;place-items:center}</style></head>
<body>${M.simboloCheio({ tamanho: 380 })}</body></html>`;

const nav = await chromium.launch();
for (const [nome, html, w, h] of [["og.png", og, 1200, 630], ["logo.png", logo, 512, 512]]) {
  const p = await nav.newPage({ viewport: { width: w, height: h } });
  await p.setContent(html, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  const ok = await p.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family));
  if (nome === "og.png" && !ok.includes("Fraunces")) throw new Error("Fraunces não carregou: use FONTES_DIR (ver o cabeçalho do script)");
  await p.screenshot({ path: resolve(saida, nome) });
  console.log("ok", `app/publico/${nome}`);
}
await nav.close();
