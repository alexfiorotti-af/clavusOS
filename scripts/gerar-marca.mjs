/**
 * Gera os arquivos da marca em docs/marca/ a partir de app/src/marca.ts
 * (a única fonte do desenho). SVGs sempre; PNGs e a prancha via Chromium.
 * Uso: node scripts/gerar-marca.mjs   (da raiz do repositório)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const M = await import(resolve(raiz, "app/src/marca.ts"));
const pasta = resolve(raiz, "docs/marca");
mkdirSync(pasta, { recursive: true });

const P = M.PALETA;
const svgs = {
  "simbolo.svg": M.simbolo({ tamanho: 512 }),
  "simbolo-noturno.svg": M.simbolo({ tamanho: 512, cor: P.fundo, gota: P.douradoClaro }),
  "simbolo-cheio.svg": M.simboloCheio({ tamanho: 512 }),
  "logo-horizontal.svg": M.logoHorizontal({ altura: 240 }),
  "logo-horizontal-noturno.svg": M.logoHorizontal({ altura: 240, cor: P.fundo, traco: P.rosa, gota: P.douradoClaro }),
  "selo.svg": M.selo({ tamanho: 512 }),
  "favicon.svg": M.FAVICON_SVG,
};
for (const [nome, corpo] of Object.entries(svgs)) writeFileSync(resolve(pasta, nome), corpo);
console.log(`SVGs: ${Object.keys(svgs).join(", ")}`);

// Prancha da identidade + PNGs (precisa de Chromium/Playwright)
const fontes = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Poppins:wght@400;500;600;700&display=swap">`;
const sw = (hex, nome, uso) => `<div style="flex:1;min-width:120px"><div style="height:84px;border-radius:14px;background:${hex};border:1.5px solid ${P.linha}"></div>
<p style="margin:8px 0 0;font:600 13px Poppins">${nome}</p><p style="margin:0;font:400 11.5px Poppins;color:${P.inkSuave}">${hex} · ${uso}</p></div>`;
const prancha = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">${fontes}<style>
body{margin:0;background:${P.fundo};color:${P.ink};font-family:Poppins;width:1200px}
.q{padding:40px 56px;border-bottom:1.5px solid ${P.linha}}
h1{font:600 34px Fraunces;margin:0 0 4px}h2{font:600 20px Fraunces;margin:0 0 16px}
p.m{color:${P.inkSuave};font-size:13.5px;margin:0 0 20px}
</style></head><body>
<div class="q" style="display:flex;justify-content:space-between;align-items:center">
  <div><h1>ClavusOS — identidade visual</h1><p class="m" style="margin:0">"Amêndoa &amp; Verniz" · AF Tecnologia e Marketing · out/2026</p></div>
  ${M.selo({ tamanho: 96 })}
</div>
<div class="q" style="display:flex;gap:56px;align-items:center">
  <div style="flex:1;display:flex;flex-direction:column;gap:24px;align-items:flex-start">${M.logoHorizontal({ altura: 64 })}${M.simbolo({ tamanho: 88 })}</div>
  <div style="flex:1;background:${P.ink};border-radius:20px;padding:36px;display:flex;flex-direction:column;gap:24px;align-items:flex-start">
    ${M.logoHorizontal({ altura: 64, cor: P.fundo, traco: P.rosa, gota: P.douradoClaro })}${M.simbolo({ tamanho: 88, cor: P.fundo, gota: P.douradoClaro })}
  </div>
</div>
<div class="q"><h2>Cores</h2><div style="display:flex;gap:18px;flex-wrap:wrap">
  ${sw(P.rosa, "Esmalte", "primária")}${sw(P.lilas, "Orquídea", "par do gradiente")}${sw(P.dourado, "Verniz", "gota e preços")}
  ${sw(P.ink, "Ameixa", "texto e fundo escuro")}${sw(P.fundo, "Pó de Arroz", "fundo da casa")}${sw(P.rosaClaro, "Pétala", "chips e lúnula")}
</div></div>
<div class="q" style="display:flex;gap:56px">
  <div style="flex:1"><h2>Tipografia</h2>
    <p style="font:600 40px Fraunces;margin:0">Fraunces</p><p class="m">display: títulos, wordmark e materiais</p>
    <p style="font:600 32px Poppins;margin:0">Poppins</p><p class="m" style="margin:0">texto: o app inteiro, botões e corpo</p></div>
  <div style="flex:1"><h2>Regras</h2><p class="m" style="line-height:1.7;margin:0">
    O desenho mora em <b>app/src/marca.ts</b> — nada é redesenhado à mão.<br>
    O dourado é raro: só a gota, preços e totais.<br>
    Sobre fundo escuro, a gota vira Verniz claro (#FFE082).<br>
    Não esticar, não girar além dos −20°, não recolorir fora da paleta.</p></div>
</div>
</body></html>`;
writeFileSync(resolve(pasta, "prancha.html"), prancha);

try {
  const { chromium } = await import(process.env.PLAYWRIGHT_DIR ?? "playwright");
  const b = await chromium.launch();
  const png = async (html, nome, w, h, escuro = false) => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(`<!doctype html>${fontes}<body style="margin:0;display:grid;place-items:center;width:${w}px;height:${h}px;background:${escuro ? P.ink : P.fundo}">${html}</body>`, { waitUntil: "networkidle" });
    await p.screenshot({ path: resolve(pasta, nome) });
    await p.close();
  };
  await png(M.simbolo({ tamanho: 400 }), "simbolo-512.png", 512, 512);
  await png(M.logoHorizontal({ altura: 150 }), "logo-horizontal.png", 1200, 400);
  await png(M.logoHorizontal({ altura: 150, cor: P.fundo, traco: P.rosa, gota: P.douradoClaro }), "logo-horizontal-noturno.png", 1200, 400, true);
  const p = await b.newPage({ viewport: { width: 1200, height: 10 } });
  await p.goto("file://" + resolve(pasta, "prancha.html"), { waitUntil: "networkidle" });
  await p.screenshot({ path: resolve(pasta, "prancha.png"), fullPage: true });
  await b.close();
  console.log("PNGs: simbolo-512, logo-horizontal (claro e noturno), prancha");
} catch (e) {
  console.log("PNGs pulados (sem Chromium aqui):", e.message);
}
