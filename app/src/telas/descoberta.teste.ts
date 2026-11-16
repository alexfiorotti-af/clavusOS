/** Descoberta (D021): robots por host, sitemap, llms.txt e JSON-LD coerente com a página. */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Ambiente } from "../ambiente.ts";
import { robotsTxt, sitemapXml, llmsTxt, jsonLd, perguntas } from "./descoberta.ts";

const a = {
  dominioBase: "clavusos.com.br", precoMensal: "R$ 49,90", precoCentavos: 4990, testeDias: 7,
  whatsappComercial: "5527996015367", emailComercial: "contato@exemplo.com", demoSlug: "studio",
} as unknown as Ambiente;

test("robots: a raiz convida buscadores e IAs; subdomínio de studio fica fora", () => {
  const raiz = robotsTxt(a, true);
  assert.match(raiz, /^User-agent: \*\nAllow: \/$/m);
  assert.match(raiz, /^Sitemap: https:\/\/clavusos\.com\.br\/sitemap\.xml$/m);
  for (const bot of ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) assert.match(raiz, new RegExp(`^User-agent: ${bot}$`, "m"));
  assert.match(raiz, /^Disallow: \/rotina\/$/m);
  const studio = robotsTxt(a, false);
  assert.match(studio, /^User-agent: \*\nDisallow: \/$/m);
  assert.doesNotMatch(studio, /Sitemap/);
});

test("sitemap: só páginas públicas da raiz, URLs absolutas https", () => {
  const xml = sitemapXml(a);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, ["https://clavusos.com.br/", "https://clavusos.com.br/privacidade", "https://clavusos.com.br/termos"]);
  assert.doesNotMatch(xml, /entrar|agendar|rotina/);
});

test("llms.txt: título, resumo e os fatos que uma IA precisa (preço, teste, Asaas, links)", () => {
  const t = llmsTxt(a);
  assert.match(t, /^# ClavusOS\n\n> /);
  for (const fato of ["R$ 49,90", "7 dias", "Asaas", "unha vencida", "/agendar", "LGPD", "https://clavusos.com.br/privacidade"]) assert.ok(t.includes(fato), fato);
});

test("JSON-LD: válido, preço numérico e as mesmas perguntas da página", () => {
  const bloco = jsonLd(a);
  const dados = JSON.parse(bloco.replace(/^<script type="application\/ld\+json">/, "").replace(/<\/script>$/, ""));
  const tipos = dados["@graph"].map((n: { "@type": string }) => n["@type"]);
  assert.deepEqual(tipos, ["Organization", "WebSite", "SoftwareApplication", "FAQPage"]);
  const app = dados["@graph"][2];
  assert.equal(app.offers.price, "49.90"); assert.equal(app.offers.priceCurrency, "BRL");
  assert.equal(dados["@graph"][3].mainEntity.length, perguntas(a).length);
  // um "<" no texto nunca fecha a tag script por dentro
  const malicioso = jsonLd({ ...a, emailComercial: "</script><script>alert(1)</script>" } as Ambiente);
  assert.equal(malicioso.match(/<\/script>/g)?.length, 1);
});
