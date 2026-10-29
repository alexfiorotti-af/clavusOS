/**
 * Gera os arquivos da marca em docs/marca/ a partir de app/src/marca.ts
 * (a única fonte do desenho). SVGs sempre; PNGs e a prancha via Chromium.
 * Uso: node scripts/gerar-marca.mjs   (da raiz do repositório)
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const M = await import(resolve(raiz, "app/src/marca.ts"));
const pasta = resolve(raiz, "docs/marca");
mkdirSync(pasta, { recursive: true });

const P = M.PALETA;
const svgs = {
  "simbolo.svg": M.simboloCheio({ tamanho: 512 }),
  "simbolo-traco.svg": M.simbolo({ tamanho: 512 }),
  "simbolo-noturno.svg": M.simboloCheio({ tamanho: 512, cor: P.cerejaClara, lunula: P.ameixa, gota: P.vernizClaro }),
  "simbolo-cheio.svg": M.simboloCheio({ tamanho: 512 }),
  "logo-horizontal.svg": M.logoHorizontal({ altura: 240 }),
  "logo-horizontal-noturno.svg": M.logoHorizontal({ altura: 240, cor: P.porcelana, os: P.cerejaClara, simboloCor: P.cerejaClara }),
  "selo.svg": M.selo({ tamanho: 512 }),
  "favicon.svg": M.FAVICON_SVG,
};
for (const [nome, corpo] of Object.entries(svgs)) writeFileSync(resolve(pasta, nome), corpo);
console.log(`SVGs: ${Object.keys(svgs).join(", ")}`);

// Prancha da identidade + PNGs (precisa de Chromium/Playwright)
const fontes = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,400..600,0..100&family=Instrument+Sans:wght@400;500;600&display=swap">`;
// Sem internet (CI, sandbox)? FONTES_CSS aponta um CSS com as fontes embutidas (@font-face em data-URI).
const fontesLocais = process.env.FONTES_CSS ? `<style>${readFileSync(process.env.FONTES_CSS, "utf8")}</style>` : "";

const sw = (hex, nome, uso) => `<div style="flex:1;min-width:120px"><div style="height:84px;border-radius:14px;background:${hex};border:1.5px solid ${P.linha}"></div>
<p style="margin:8px 0 0;font:600 13px 'Instrument Sans'">${nome}</p><p style="margin:0;font:400 11.5px 'Instrument Sans';color:${P.inkSuave}">${hex} · ${uso}</p></div>`;
const prancha = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">${fontes}<style>
body{margin:0;background:${P.fundo};color:${P.ink};font-family:'Instrument Sans';width:1200px}
.q{padding:40px 56px;border-bottom:1.5px solid ${P.linha}}
h1{font:500 34px Fraunces;margin:0 0 4px}h2{font:500 20px Fraunces;margin:0 0 16px}
p.m{color:${P.inkSuave};font-size:13.5px;margin:0 0 20px}
</style></head><body>
<div class="q" style="display:flex;justify-content:space-between;align-items:center">
  <div><h1>ClavusOS — identidade visual</h1><p class="m" style="margin:0">"Cereja &amp; Porcelana" · AF Tecnologia e Marketing · out/2026</p></div>
  ${M.selo({ tamanho: 96 })}
</div>
<div class="q" style="display:flex;gap:56px;align-items:center">
  <div style="flex:1;display:flex;flex-direction:column;gap:24px;align-items:flex-start">${M.logoHorizontal({ altura: 64 })}${M.simboloCheio({ tamanho: 88 })}</div>
  <div style="flex:1;background:${P.ink};border-radius:20px;padding:36px;display:flex;flex-direction:column;gap:24px;align-items:flex-start">
    ${M.logoHorizontal({ altura: 64, cor: P.porcelana, os: P.cerejaClara, simboloCor: P.cerejaClara })}${M.simboloCheio({ tamanho: 88, cor: P.cerejaClara, lunula: P.ameixa, gota: P.vernizClaro })}
  </div>
</div>
<div class="q"><h2>Cores</h2><div style="display:flex;gap:18px;flex-wrap:wrap">
  ${sw(P.cereja, "Cereja", "marca e ação")}${sw(P.ameixa, "Ameixa", "texto e fundo escuro")}${sw(P.porcelana, "Porcelana", "fundo da casa")}
  ${sw(P.nude, "Nude", "apoio")}${sw(P.petala, "Pétala", "etiquetas")}${sw(P.verniz, "Verniz", "só a gota")}
</div></div>
<div class="q" style="display:flex;gap:56px">
  <div style="flex:1"><h2>Tipografia</h2>
    <p style="font:600 40px Fraunces;margin:0">Fraunces</p><p class="m">display: títulos, wordmark e materiais</p>
    <p style="font:500 32px 'Instrument Sans';margin:0">Instrument Sans</p><p class="m" style="margin:0">texto: o app inteiro, botões e corpo</p></div>
  <div style="flex:1"><h2>Regras</h2><p class="m" style="line-height:1.7;margin:0">
    O desenho mora em <b>app/src/marca.ts</b> — nada é redesenhado à mão.<br>
    O dourado é raro: só a gota e o saldo do dia.<br>
    Sobre ameixa, o símbolo vira cereja clara e a gota verniz claro.<br>
    No app, a cor é a do studio; a ClavusOS fica no rodapé.<br>
    Não esticar, não girar além dos −20°, não recolorir fora da paleta.</p></div>
</div>
</body></html>`;
writeFileSync(resolve(pasta, "prancha.html"), prancha);

try {
  const mod = await import(process.env.PLAYWRIGHT_DIR ?? "playwright"); const { chromium } = mod.chromium ? mod : mod.default;
  const b = await chromium.launch();
  const png = async (html, nome, w, h, escuro = false) => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(`<!doctype html>${fontes}${fontesLocais}<body style="margin:0;display:grid;place-items:center;width:${w}px;height:${h}px;background:${escuro ? P.ink : P.fundo}">${html}</body>`, { waitUntil: "networkidle" });
    await p.screenshot({ path: resolve(pasta, nome) });
    await p.close();
  };
  await png(M.simboloCheio({ tamanho: 400 }), "simbolo-512.png", 512, 512);
  await png(M.logoHorizontal({ altura: 150 }), "logo-horizontal.png", 1200, 400);
  await png(M.logoHorizontal({ altura: 150, cor: P.porcelana, os: P.cerejaClara, simboloCor: P.cerejaClara }), "logo-horizontal-noturno.png", 1200, 400, true);
  const p = await b.newPage({ viewport: { width: 1200, height: 10 } });
  await p.setContent(prancha.replace("</head>", fontesLocais + "</head>"), { waitUntil: "networkidle" });
  await p.screenshot({ path: resolve(pasta, "prancha.png"), fullPage: true });
  await b.close();
  console.log("PNGs: simbolo-512, logo-horizontal (claro e noturno), prancha");
} catch (e) {
  console.log("PNGs pulados (sem Chromium aqui):", e.message);
}
