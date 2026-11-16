/**
 * Como buscadores e IAs encontram e entendem o ClavusOS (D021).
 *
 * - robots.txt: a raiz (clavusos.com.br) é pública e convida buscadores e robôs de IA;
 *   os subdomínios dos studios são o app (login, agenda, clientes) e ficam fora do índice.
 * - sitemap.xml: só as páginas públicas da raiz.
 * - llms.txt: o resumo do produto em Markdown, no formato llmstxt.org, para assistentes de IA
 *   (GEO: o que um ChatGPT/Perplexity/Gemini precisa para recomendar o ClavusOS com fatos certos).
 * - JSON-LD: Organization + WebSite + SoftwareApplication (com preço) + FAQPage, a partir das
 *   mesmas perguntas que aparecem na página — uma fonte só, para nunca divergirem.
 *
 * Nada aqui expõe dado de studio: tudo vem do ambiente (preço, contato, domínio).
 */
import type { Ambiente } from "../ambiente.ts";
import { e } from "../http/resposta.ts";

/** Data da última mudança de conteúdo público (sitemap lastmod). Atualizar quando a vitrine mudar. */
export const SITE_ATUALIZADO = "2026-11-16";

const url = (a: Ambiente, caminho = "/") => `https://${a.dominioBase}${caminho}`;

/** As perguntas da vitrine. Texto puro: a vitrine e o JSON-LD usam as mesmas. */
export function perguntas(a: Ambiente): { p: string; r: string }[] {
  return [
    { p: "Quanto custa o ClavusOS?", r: `${a.precoMensal} por mês, com tudo incluso e a equipe inteira sem custo extra. Os primeiros ${a.testeDias} dias são grátis e não pedem cartão. Sem fidelidade.` },
    { p: "Preciso instalar alguma coisa?", r: `Não. O ClavusOS abre no navegador do celular e do computador, no seu endereço próprio (seustudio.${a.dominioBase}). Dá para adicionar à tela inicial e usar como app.` },
    { p: "Serve para quem atende sozinha?", r: "Serve. Funciona para a nail designer que atende sozinha e para o studio com equipe: cada profissional tem a sua agenda, e clientes e atendimentos não têm limite." },
    { p: "Como eu recebo das clientes?", r: "Pelo seu Asaas: Pix com QR na hora, link de pagamento (Pix, cartão ou boleto) e assinatura que renova sozinha. O dinheiro cai na sua conta — o ClavusOS só organiza e dá baixa." },
    { p: "Minha equipe vê o meu financeiro?", r: "Só se você quiser. Profissional vê a agenda e as clientes; gerente vê também o caixa; o financeiro completo e as configurações são só da dona." },
    { p: "E se um dia eu quiser sair?", r: "Sem multa e sem drama: você exporta tudo — clientes, agenda e caixa — em um arquivo seu, quando quiser." },
  ];
}

export function robotsTxt(a: Ambiente, raiz: boolean): string {
  if (!raiz) return [
    "# Este endereço é o sistema de um studio (área com login). Não indexar.",
    "User-agent: *",
    "Disallow: /",
    "",
  ].join("\n");
  // A raiz é a vitrine: aberta a buscadores e a robôs de IA (busca e treino).
  // Áreas técnicas ficam de fora; elas não existem na raiz, mas a regra fica explícita.
  const tecnico = ["/rotina/", "/webhooks/", "/entrar", "/senha/", "/convite/"].map((p) => `Disallow: ${p}`);
  const ia = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot"];
  return [
    "# ClavusOS — o sistema do studio de unhas",
    "# Resumo para assistentes de IA: " + url(a, "/llms.txt"),
    "",
    "User-agent: *",
    "Allow: /",
    ...tecnico,
    "",
    ...ia.flatMap((bot) => [`User-agent: ${bot}`, "Allow: /", ...tecnico, ""]),
    `Sitemap: ${url(a, "/sitemap.xml")}`,
    "",
  ].join("\n");
}

export function sitemapXml(a: Ambiente): string {
  const paginas: [string, string, string][] = [["/", "weekly", "1.0"], ["/privacidade", "yearly", "0.3"], ["/termos", "yearly", "0.3"]];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paginas.map(([p, freq, prio]) => `  <url><loc>${url(a, p)}</loc><lastmod>${SITE_ATUALIZADO}</lastmod><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`).join("\n")}
</urlset>
`;
}

export function llmsTxt(a: Ambiente): string {
  const demo = a.demoSlug ? `https://${a.demoSlug}.${a.dominioBase}` : null;
  return `# ClavusOS

> ClavusOS é um sistema de gestão online para nail designers e studios de unhas no Brasil: agenda por profissional, cadastro de clientes com alerta de "unha vencida", caixa, relatórios, planos de assinatura e cobrança integrada ao Asaas. Funciona no navegador do celular e do computador, com a marca do próprio studio. Custa ${a.precoMensal} por mês, com ${a.testeDias} dias grátis.

Produto da AF Tecnologia e Marketing Ltda. (Vitória/ES, Brasil). Idioma: português do Brasil.

## Para quem é

- Nail designers que atendem sozinhas e studios de unhas com equipe (manicures, nail designers, gerente).
- Quem marca horários pelo WhatsApp/Instagram e quer parar de responder agenda no direct.
- Quem quer receita recorrente com planos mensais de unha.

## O que faz

- **Agenda por profissional**: o próprio banco de dados impede dois horários no mesmo lugar (encaixe só quando a gerência decide).
- **Agendamento online pela cliente**: cada studio tem um endereço próprio (seustudio.${a.dominioBase}/agendar) onde a cliente escolhe serviço, dia e horário, só entre os horários livres. Pode exigir sinal por Pix, que confirma o horário sozinho.
- **Unha vencida**: cada serviço tem um ciclo (ex.: gel 21 dias, fibra 28 dias). Quando a cliente passa do ciclo sem voltar, ela aparece numa lista com a mensagem de retorno pronta para o WhatsApp.
- **Clientes**: cadastro com origem (indicação, Instagram etc.), aniversariantes do mês e histórico.
- **Planos de assinatura**: mensal, trimestral, semestral ou anual; a cliente escolhe os dias fixos do mês, a cobrança recorrente sai pelo Asaas e os horários do mês são gerados de uma vez.
- **Caixa e PDV**: atendimento concluído vira receita automaticamente; venda de produtos com baixa de estoque; despesas e receitas avulsas.
- **Relatórios para decidir**: resultado do mês, comparação com o mês anterior, últimos 6 meses, ritmo do mês, mapa dos dias e horários mais cheios, produção e comissão por profissional, serviços que mais faturam e origem das clientes.
- **Equipe e permissões**: dona, gerente e profissional veem coisas diferentes (profissional não vê o financeiro).

## Pagamentos

- O studio conecta a própria conta Asaas: Pix com QR, link de pagamento (Pix, cartão ou boleto) e assinatura recorrente.
- O dinheiro cai direto na conta do studio; o ClavusOS não intermedia nem cobra porcentagem das vendas.
- Dados de cartão nunca passam pelo ClavusOS.

## Preço

- ${a.precoMensal} por mês por studio, com tudo incluso e equipe sem custo extra.
- ${a.testeDias} dias de teste grátis, sem cartão.
- Sem fidelidade; os dados podem ser exportados a qualquer momento.

## Segurança e privacidade

- Cada studio tem seus dados isolados no banco de dados (Row Level Security no PostgreSQL).
- Senhas guardadas só como hash (scrypt); chave de pagamento do studio cifrada (AES-256-GCM).
- Em conformidade com a LGPD: o studio é controlador dos dados das suas clientes; a AF é operadora.

## Links

- [Site](${url(a)}): apresentação, preço e perguntas frequentes
${demo ? `- [Demonstração](${demo}/entrar): studio fictício para testar, com login de gerente informado no site\n` : ""}- [Política de Privacidade](${url(a, "/privacidade")})
- [Termos de Uso](${url(a, "/termos")})
- [Contato pelo WhatsApp](https://wa.me/${a.whatsappComercial}): falar com a AF Tecnologia e Marketing
`;
}

/** JSON-LD da vitrine. Escapa "<" para nunca fechar a tag script por dentro. */
export function jsonLd(a: Ambiente): string {
  const org = url(a, "/#organizacao");
  const dados = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization", "@id": org, name: "AF Tecnologia e Marketing Ltda.",
        url: url(a), logo: url(a, "/assets/logo.png"), email: a.emailComercial,
        telephone: "+" + a.whatsappComercial,
        address: { "@type": "PostalAddress", addressLocality: "Vitória", addressRegion: "ES", addressCountry: "BR" },
      },
      { "@type": "WebSite", "@id": url(a, "/#site"), url: url(a), name: "ClavusOS", inLanguage: "pt-BR", publisher: { "@id": org } },
      {
        "@type": "SoftwareApplication", "@id": url(a, "/#app"), name: "ClavusOS",
        description: "Sistema de gestão para studios de unhas e nail designers: agenda por profissional, agendamento online pela cliente, alerta de unha vencida, caixa, relatórios, planos de assinatura e cobrança pelo Asaas.",
        applicationCategory: "BusinessApplication", applicationSubCategory: "Gestão de salão de beleza",
        operatingSystem: "Web (navegador do celular e do computador)", inLanguage: "pt-BR", url: url(a),
        image: url(a, "/assets/og.png"), publisher: { "@id": org },
        offers: {
          "@type": "Offer", price: (a.precoCentavos / 100).toFixed(2), priceCurrency: "BRL", url: url(a),
          availability: "https://schema.org/InStock",
          description: `Mensalidade por studio, ${a.testeDias} dias grátis, sem fidelidade.`,
        },
      },
      {
        "@type": "FAQPage", "@id": url(a, "/#perguntas"),
        mainEntity: perguntas(a).map((q) => ({ "@type": "Question", name: q.p, acceptedAnswer: { "@type": "Answer", text: q.r } })),
      },
    ],
  };
  return `<script type="application/ld+json">${JSON.stringify(dados).replace(/</g, "\\u003c")}</script>`;
}

/** Metas da vitrine: canônica, Open Graph (WhatsApp/Instagram/Facebook) e cartão do X. */
export function metasVitrine(a: Ambiente, titulo: string, descricao: string): string {
  const img = url(a, "/assets/og.png");
  return `<link rel="canonical" href="${url(a)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="ClavusOS">
<meta property="og:url" content="${url(a)}"><meta property="og:title" content="${e(titulo)}"><meta property="og:description" content="${e(descricao)}">
<meta property="og:image" content="${img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="ClavusOS, o sistema do studio de unhas">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(titulo)}"><meta name="twitter:description" content="${e(descricao)}"><meta name="twitter:image" content="${img}">
<link rel="alternate" type="text/markdown" href="${url(a, "/llms.txt")}" title="Resumo do ClavusOS para assistentes de IA">`;
}
