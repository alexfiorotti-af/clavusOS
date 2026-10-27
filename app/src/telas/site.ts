/** A vitrine da raiz do produto (clavusos.com.br) — carta de apresentação até o site de vendas definitivo. */
import { e } from "../http/resposta.ts";
import type { Ambiente } from "../ambiente.ts";
import { simbolo, PALETA, SLOGAN } from "../marca.ts";

export function telaVitrine(a: Ambiente): string {
  const zap = `https://wa.me/${a.whatsappComercial}?text=${encodeURIComponent("Oi! Quero saber mais sobre o ClavusOS para o meu studio 💅")}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>ClavusOS — ${SLOGAN}</title>
<meta name="description" content="Agenda com mapa por profissional, alerta de unha vencida, caixa, assinaturas e cobrança pelo Asaas. ${e(a.precoMensal)}/mês, tudo incluso.">
<link rel="icon" href="/assets/icone.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap">
<style>
:root{--rosa:${PALETA.rosa};--lilas:${PALETA.lilas};--ink:${PALETA.ink};--fundo:${PALETA.fundo};--linha:${PALETA.linha};--dourado:${PALETA.dourado}}
*{box-sizing:border-box}body{margin:0;font:16px/1.55 "Poppins",system-ui,sans-serif;background:var(--fundo);color:var(--ink)}
header{background:linear-gradient(135deg,var(--rosa),var(--lilas));color:#fff;padding:52px 20px 60px;text-align:center}
header .marca{display:inline-flex;align-items:center;gap:10px;font-weight:700;font-size:20px}
h1{font-size:clamp(26px,5vw,40px);margin:18px auto 10px;max-width:720px;letter-spacing:-.02em;line-height:1.15}
header p{max-width:620px;margin:0 auto 24px;opacity:.95}
.cta{display:inline-block;background:#fff;color:var(--rosa);font-weight:700;padding:14px 26px;border-radius:999px;text-decoration:none;font-size:16px}
main{max-width:980px;margin:0 auto;padding:36px 20px 70px}
.grade{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.cartao{background:#fff;border:1.5px solid var(--linha);border-radius:16px;padding:20px;box-shadow:0 4px 16px rgba(233,30,140,.06)}
.cartao h3{margin:0 0 8px;font-size:16px}.cartao p{margin:0;color:#7A6B7D;font-size:14.5px}
.preco{text-align:center;margin:44px 0 10px}
.preco b{font-size:40px;color:var(--dourado)}
footer{text-align:center;color:#7A6B7D;font-size:13px;padding:26px 20px;border-top:1.5px solid var(--linha)}
</style></head><body>
<header>
  <span class="marca">${simbolo({ tamanho: 30, cor: "#fff", gota: "#FFE082" })} ClavusOS</span>
  <h1>Tudo que acontece no seu studio de unhas, num lugar só.</h1>
  <p>Agenda com mapa por profissional, clientes com alerta de <b>unha vencida</b>, caixa e relatórios,
  venda de produtos, planos de assinatura e cobrança automática pelo Asaas — no celular e no computador.</p>
  <a class="cta" href="${zap}">Quero testar grátis 💅</a>
</header>
<main>
  <div class="grade">
    <div class="cartao"><h3>📅 Agenda que não fura</h3><p>Mapa por profissional, horário de choque travado pelo próprio sistema (encaixe só quando você quiser) e a cliente marcando sozinha pelo seu link.</p></div>
    <div class="cartao"><h3>🔔 Unha vencida = cliente de volta</h3><p>Cada serviço tem um ciclo. O sistema avisa quem já passou do prazo e deixa a mensagem de WhatsApp pronta — faturamento que não escorre.</p></div>
    <div class="cartao"><h3>💰 Caixa de verdade</h3><p>Atendimento concluído vira receita sozinho. Despesas, venda de produto com estoque, comissão por profissional, relatórios do mês.</p></div>
    <div class="cartao"><h3>🔁 Recorrência com Asaas</h3><p>Venda planos mensal, trimestral, semestral ou anual. A cliente escolhe os dias do mês; o Asaas cobra e o sistema dá baixa — direto na sua conta.</p></div>
    <div class="cartao"><h3>👩‍🎨 Equipe com papéis</h3><p>Profissional vê a agenda; gerência vê o caixa; só a dona configura. Quem decide é o sistema, não a boa vontade.</p></div>
    <div class="cartao"><h3>🔒 Seus dados, protegidos</h3><p>Banco PostgreSQL com isolamento por studio, senhas com criptografia forte, chaves guardadas cifradas e trilha de auditoria. Exporte tudo quando quiser.</p></div>
  </div>
  <div class="preco"><div><b>${e(a.precoMensal)}</b><span style="color:#7A6B7D">/mês</span></div>
  <p style="color:#7A6B7D">Tudo incluso · ${a.testeDias} dias de teste grátis · sem fidelidade</p>
  <a class="cta" style="background:linear-gradient(135deg,var(--rosa),var(--lilas));color:#fff" href="${zap}">Falar com a gente no WhatsApp</a></div>
</main>
<footer>ClavusOS é um produto da <b>AF Tecnologia e Marketing</b> · ${e(a.emailComercial)} · WhatsApp (27) 99601-5367</footer>
</body></html>`;
}

export function telaStudioNaoEncontrado(slug: string, a: Ambiente): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Studio não encontrado</title><style>body{font-family:"Poppins",system-ui;background:#FFF7FB;color:#2D1B2E;display:grid;place-items:center;min-height:100vh;margin:0}div{max-width:460px;padding:24px;text-align:center;border-top:3px solid #E91E8C}</style></head>
<body><div><h1>Hmm… “${e(slug)}” não existe por aqui 💅</h1><p>Confira o endereço com o studio, ou conheça o <a href="https://${e(a.dominioBase)}">ClavusOS</a>.</p></div></body></html>`;
}

export function telaSuspenso(nome: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(nome)}</title><style>body{font-family:"Poppins",system-ui;background:#FFF7FB;color:#2D1B2E;display:grid;place-items:center;min-height:100vh;margin:0}div{max-width:460px;padding:24px;text-align:center;border-top:3px solid #E91E8C}</style></head>
<body><div><h1>${e(nome)}</h1><p>O acesso a este sistema está temporariamente suspenso. Fale com quem administra o contrato para reativar. Seus dados estão guardados e podem ser exportados a qualquer momento.</p></div></body></html>`;
}
