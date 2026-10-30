/**
 * A vitrine do produto na raiz (clavusos.com.br) — a página de venda.
 * Identidade "Amêndoa & Verniz" (app/src/marca.ts): Pó de Arroz como fundo,
 * Fraunces no display, um único momento escuro (a faixa da unha vencida,
 * com a mensagem de WhatsApp que o app realmente escreve). Sem imagem de
 * banco: o que aparece de produto é a própria UI, desenhada em HTML.
 */
import { e } from "../http/resposta.ts";
import type { Ambiente } from "../ambiente.ts";
import { simbolo, logoHorizontal, PALETA as P, FAVICON_SVG } from "../marca.ts";

const FONTES = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,400..600,0..100&family=Instrument+Sans:wght@400;500;600&display=swap">`;

export function telaVitrine(a: Ambiente): string {
  const zap = (msg: string) => `https://wa.me/${a.whatsappComercial}?text=${encodeURIComponent(msg)}`;
  const ctaTeste = zap("Oi! Quero testar o ClavusOS no meu studio 💅");
  const demo = a.demoSlug ? `https://${a.demoSlug}.${a.dominioBase}` : null;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>ClavusOS — o sistema do studio de unhas</title>
<meta name="description" content="Agenda com mapa por profissional, alerta de unha vencida com mensagem pronta, caixa, assinaturas e cobrança pelo Asaas. ${e(a.precoMensal)}/mês, ${a.testeDias} dias grátis.">
<link rel="icon" href="data:image/svg+xml;utf8,${encodeURIComponent(FAVICON_SVG)}" type="image/svg+xml">
${FONTES}
<style>
:root{--rosa:${P.rosa};--rosa-escuro:${P.rosaEscuro};--petala:${P.rosaClaro};--lilas:${P.lilas};--verniz:${P.dourado};
--verniz-claro:${P.douradoClaro};--ameixa:${P.ink};--suave:${P.inkSuave};--fundo:${P.fundo};--linha:${P.linha};--ok:${P.ok}}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--fundo);color:var(--ameixa);font:16px/1.6 "Instrument Sans",system-ui,sans-serif}
.c{max-width:1080px;margin:0 auto;padding:0 clamp(18px,4vw,32px)}
a{color:var(--rosa-escuro)}
h1,h2{font-family:Fraunces,Georgia,serif;font-variation-settings:"SOFT" 100,"opsz" 96;font-weight:500;letter-spacing:-.02em;line-height:1.08;margin:0}
.botao{display:inline-block;background:var(--rosa);color:#fff;font-weight:600;
  padding:15px 28px;border-radius:999px;text-decoration:none;font-size:15.5px}
.botao.claro{background:#fff;color:var(--ameixa);border:1.5px solid var(--linha)}
.botao:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid var(--rosa);outline-offset:2px}
header{padding:20px 0}
header .c{display:flex;align-items:center;justify-content:space-between;gap:16px}
header nav{display:flex;gap:10px;align-items:center}
header nav a.entrar{text-decoration:none;font-weight:600;font-size:14.5px;color:var(--ameixa);padding:10px 6px}
header .botao{padding:11px 20px;font-size:14px}
/* herói */
.heroi{padding:clamp(28px,6vw,72px) 0 clamp(40px,7vw,84px);position:relative;overflow:hidden}
.heroi .c{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(28px,5vw,64px);align-items:center;position:relative}
.heroi h1{font-size:clamp(34px,5.2vw,58px)}
.heroi p.sub{font-size:clamp(15.5px,1.8vw,18px);color:var(--suave);margin:20px 0 28px;max-width:34em}
.heroi .acoes{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.heroi p.nota{font-size:13.5px;color:var(--suave);margin:16px 0 0}
/* os recortes da UI de verdade */
.palco{display:flex;flex-direction:column;gap:14px;min-width:0}
.ui{background:#fff;border:1.5px solid var(--linha);border-radius:16px;box-shadow:0 18px 40px rgba(233,30,140,.13);padding:14px 16px}
.ui.alerta{background:#FBE1E3;color:#8E2733;font-weight:600;font-size:14px;border-color:transparent;transform:rotate(-1.6deg)}
.ui.card{display:flex;gap:14px;align-items:center;transform:rotate(1.2deg)}
.ui.card .hora{font-weight:700;font-size:15px}.ui.card .hora small{display:block;font-weight:500;color:var(--suave);font-size:11.5px}
.ui.card b{display:block;font-size:15px}.ui.card span.srv{font-size:13px;color:var(--suave)}
.ui.card .dir{margin-left:auto;text-align:right}
.preco-mini{color:var(--verniz);font-weight:700}
.tag{display:inline-block;font-size:12px;font-weight:500;padding:2px 10px;border-radius:999px}
.tag.conf{background:#E3D5F1;color:#6A1B9A}.tag.pend{background:#FBF0DC;color:#A66B13}
.ui.caixa{display:flex;gap:22px;transform:rotate(-1deg);width:max-content}
.ui.caixa div b{font-size:19px;display:block}.ui.caixa div span{font-size:12px;color:var(--suave)}
/* recursos */
.recursos{padding:clamp(36px,6vw,72px) 0}
.recursos h2{font-size:clamp(26px,3.4vw,38px);max-width:18em}
.recursos .grade{display:grid;grid-template-columns:1fr 1fr;gap:0 clamp(28px,5vw,72px);margin-top:16px}
.rec{border-top:1.5px solid var(--linha);padding:22px 0}
.rec h3{font:600 16.5px "Instrument Sans";margin:0 0 6px;display:flex;gap:10px;align-items:center}
.rec p{margin:0;font-size:14.5px;color:var(--suave)}
.gota{width:9px;height:9px;border-radius:50%;background:var(--rosa);flex:0 0 auto}
/* a faixa escura: unha vencida */
.vencida{background:var(--ameixa);color:var(--fundo);padding:clamp(44px,7vw,88px) 0}
.vencida .c{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,72px);align-items:center}
.vencida h2{font-size:clamp(28px,3.8vw,42px);color:#fff}
.vencida p{color:#CBBFCB;font-size:15.5px}
.vencida .destaque{color:var(--verniz-claro)}
.bolha{background:#1F5134;color:#EAF7EF;border-radius:18px 18px 18px 4px;padding:18px 20px;font-size:14.5px;line-height:1.65;
  box-shadow:0 18px 44px rgba(0,0,0,.35);max-width:30em}
.bolha small{display:block;text-align:right;color:#9CC9AC;margin-top:8px;font-size:11px}
.legenda-bolha{font-size:13px;color:#A894A8;margin-top:14px}
/* asaas + demo + preço */
.faixa{padding:clamp(36px,6vw,72px) 0;border-top:1.5px solid var(--linha)}
.faixa h2{font-size:clamp(24px,3vw,34px)}
.faixa p.m{color:var(--suave);max-width:38em}
.demo-cartao{background:#fff;border:1.5px solid var(--linha);border-radius:20px;padding:26px 28px;display:flex;gap:28px;flex-wrap:wrap;align-items:center;margin-top:20px}
.demo-cartao code{font-size:14px;background:var(--petala);border-radius:8px;padding:3px 9px}
.preco{text-align:center;padding:clamp(44px,7vw,80px) 0}
.preco .valor{font-family:Fraunces,Georgia,serif;font-variation-settings:"SOFT" 100;font-weight:500;font-size:clamp(52px,8vw,84px);color:var(--verniz);letter-spacing:-.02em}
.preco .valor small{font-size:.35em;color:var(--suave);font-weight:400;font-family:"Instrument Sans"}
.preco ul{list-style:none;padding:0;margin:18px auto 30px;color:var(--suave);font-size:15px;max-width:30em}
.preco li{padding:4px 0}
/* faq + rodapé */
.faq details{border-top:1.5px solid var(--linha);padding:16px 0}
.faq summary{cursor:pointer;font-weight:600;font-size:16px;list-style:none;display:flex;justify-content:space-between;gap:12px}
.faq summary::after{content:"+";color:var(--rosa);font-size:22px;line-height:1}
.faq details[open] summary::after{content:"–"}
.faq details p{color:var(--suave);font-size:14.5px;margin:10px 0 0;max-width:46em}
footer{border-top:1.5px solid var(--linha);padding:34px 0 44px;margin-top:20px}
footer .c{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;align-items:center}
footer p{margin:0;font-size:13px;color:var(--suave)}
@media (max-width:860px){.heroi .c,.vencida .c{grid-template-columns:1fr}.recursos .grade{grid-template-columns:1fr}
  .palco{max-width:440px}.ui.caixa{width:auto}}
@media (prefers-reduced-motion:no-preference){.ui{transition:transform .25s ease}.ui:hover{transform:rotate(0) translateY(-3px)}}
</style></head><body>

<header><div class="c">
  ${logoHorizontal({ altura: 36 })}
  <nav>${demo ? `<a class="entrar" href="${e(demo)}/entrar">Ver demonstração</a>` : ""}
  <a class="botao" href="${ctaTeste}">Testar ${a.testeDias} dias grátis</a></nav>
</div></header>

<section class="heroi"><div class="c">
  <div>
    <h1>Agenda cheia, caixa fechado e nenhuma cliente sumida.</h1>
    <p class="sub">O ClavusOS organiza a agenda, as clientes, o caixa e as assinaturas do seu studio de unhas —
    e avisa quem está com a unha vencida, com a mensagem de WhatsApp pronta para chamar de volta.</p>
    <div class="acoes">
      <a class="botao" href="${ctaTeste}">Começar meus ${a.testeDias} dias grátis</a>
      ${demo ? `<a class="botao claro" href="${e(demo)}/entrar">Entrar na demonstração</a>` : ""}
    </div>
    <p class="nota">${e(a.precoMensal)}/mês depois do teste · tudo incluso · sem fidelidade</p>
  </div>
  <div class="palco" aria-hidden="true">
    <div class="ui alerta"> 3 clientes com unha vencida — campanha pronta para enviar</div>
    <div class="ui card">
      <div class="hora">14:00<small>60 min</small></div>
      <div><b>Juliana Souza</b><span class="srv">Esmaltação em gel · Lia</span></div>
      <div class="dir"><span class="preco-mini">R$ 70</span><br><span class="tag conf">Confirmado</span></div>
    </div>
    <div class="ui card" style="transform:rotate(-0.8deg)">
      <div class="hora">15:30<small>75 min</small></div>
      <div><b>Renata Alves</b><span class="srv">Pé e mão · Bia</span></div>
      <div class="dir"><span class="preco-mini">R$ 55</span><br><span class="tag pend">A confirmar</span></div>
    </div>
    <div class="ui caixa">
      <div><b>R$ 380</b><span>previsto hoje</span></div>
      <div><b>6</b><span>atendimentos</span></div>
      <div><b style="color:var(--ok)">R$ 1.240</b><span>na semana</span></div>
    </div>
  </div>
</div></section>

<section class="recursos"><div class="c">
  <h2>Tudo que acontece no studio, num lugar só.</h2>
  <div class="grade">
    <div class="rec"><h3><span class="gota"></span>Agenda que não fura</h3>
      <p>Mapa por profissional, horário em choque travado pelo próprio sistema — e encaixe quando você quiser, do seu jeito.</p></div>
    <div class="rec"><h3><span class="gota"></span>Cliente de volta na cadeira</h3>
      <p>Cada serviço tem um ciclo (gel 21 dias, fibra 28…). Venceu, o painel avisa e a mensagem sai pronta.</p></div>
    <div class="rec"><h3><span class="gota"></span>Caixa que se preenche sozinho</h3>
      <p>Atendimento concluído vira receita na hora. Despesas, venda de produto com estoque e fluxo do mês.</p></div>
    <div class="rec"><h3><span class="gota"></span>Comissão sem planilha</h3>
      <p>Produção por profissional calculada no relatório — atendimentos, total e a comissão de cada uma.</p></div>
    <div class="rec"><h3><span class="gota"></span>Assinatura que renova sozinha</h3>
      <p>Planos mensal, trimestral, semestral ou anual. A cliente escolhe os dias do mês; o Asaas cobra e o sistema dá baixa.</p></div>
    <div class="rec"><h3><span class="gota"></span>Sua página de agendamento</h3>
      <p>Um endereço só seu, onde a cliente marca sozinha nos horários livres — com sinal por Pix para garantir.</p></div>
  </div>
</div></section>

<section class="vencida"><div class="c">
  <div>
    <h2>A cliente sumiu?<br>O ClavusOS percebe antes de você.</h2>
    <p>Unha tem prazo de validade — e agenda vazia daqui a três semanas começa hoje. O sistema conta os dias
    desde a última unha de cada cliente e separa quem já passou do ciclo. Você abre a lista, toca em uma,
    e a mensagem já está escrita.</p>
  </div>
  <div>
    <div class="bolha">Oi, Juliana! 💅 Senti sua falta por aqui — já faz 32 dias desde a sua última unha.
    Que tal garantir seu horário essa semana? Tenho encaixes ótimos te esperando<small>21:47 ✓✓</small></div>
    <p class="legenda-bolha">A mensagem que o painel deixa pronta — um toque e foi pro WhatsApp dela.</p>
  </div>
</div></section>

<section class="faixa"><div class="c">
  <h2>O dinheiro cai direto na sua conta.</h2>
  <p class="m">O ClavusOS se conecta à <b>sua</b> conta Asaas: sinal por Pix que confirma o horário sozinho,
  cobrança por link (Pix, cartão ou boleto) e as assinaturas renovando sem você cobrar ninguém.
  Nada passa por intermediário — e a baixa no caixa é automática.</p>
</div></section>

${demo && a.demoSenha ? `<section class="faixa" style="padding-top:0;border:0"><div class="c">
  <h2>Veja funcionando agora.</h2>
  <p class="m">O Studio Lume é a nossa demonstração, com agenda, clientes e caixa de verdade (tudo fictício).
  Entre como gerente e mexa à vontade — ela se arruma sozinha todo mês.</p>
  <div class="demo-cartao">
    <div><p style="margin:0 0 6px;font-weight:600">Entrar como gerente</p>
    <p style="margin:0;font-size:14.5px;color:var(--suave)">usuária <code>gerencia@${e(a.dominioBase)}</code> · senha <code>${e(a.demoSenha)}</code></p></div>
    <a class="botao" href="${e(demo)}/entrar">Entrar na demonstração</a>
  </div>
</div></section>` : ""}

<section class="preco"><div class="c">
  <div class="valor">${e(a.precoMensal)}<small>/mês</small></div>
  <ul>
    <li>Tudo incluso — agenda, clientes, caixa, assinaturas e a página de agendamento</li>
    <li>Clientes e atendimentos sem limite</li>
    <li>${a.testeDias} dias grátis, sem cartão para começar</li>
    <li>Sem fidelidade — e seus dados são seus, exporte quando quiser</li>
  </ul>
  <a class="botao" href="${ctaTeste}">Quero no meu studio</a>
</div></section>

<section class="faixa faq" style="padding-top:0;border:0"><div class="c">
  <h2 style="margin-bottom:14px">Perguntas de quem está chegando</h2>
  <details><summary>Preciso instalar alguma coisa?</summary>
    <p>Não. O ClavusOS abre no navegador do celular e do computador, no seu endereço próprio
    (seustudio.${e(a.dominioBase)}). Dá para adicionar à tela inicial e usar como app.</p></details>
  <details><summary>Como eu recebo das clientes?</summary>
    <p>Pelo seu Asaas: Pix com QR na hora, link de pagamento (Pix, cartão ou boleto) e assinatura que renova sozinha.
    O dinheiro cai na sua conta — o ClavusOS só organiza e dá baixa.</p></details>
  <details><summary>Minha equipe vê o meu financeiro?</summary>
    <p>Só se você quiser. Profissional vê a agenda e as clientes; gerente vê também o caixa; o financeiro
    completo e as configurações são só da dona.</p></details>
  <details><summary>E se um dia eu quiser sair?</summary>
    <p>Sem multa e sem drama: você exporta tudo — clientes, agenda e caixa — em um arquivo seu, quando quiser.</p></details>
</div></section>

<footer><div class="c">
  <div style="display:flex;gap:12px;align-items:center">${simbolo({ tamanho: 28 })}<p><b style="color:var(--ameixa)">ClavusOS</b> · o sistema do studio de unhas</p></div>
  <p>AF Tecnologia e Marketing · <a href="${zap("Oi! Vim pelo site do ClavusOS")}">WhatsApp (27) 99601-5367</a> · ${e(a.emailComercial)}</p>
</div>
<div class="c" style="margin-top:14px"><p style="font-size:13px"><a href="/privacidade">Política de Privacidade</a> · <a href="/termos">Termos de Uso</a></p></div>
</footer>
</body></html>`;
}

export function telaStudioNaoEncontrado(slug: string, a: Ambiente): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Studio não encontrado</title>${FONTES}<style>body{font-family:"Instrument Sans",system-ui;background:${P.fundo};color:${P.ink};display:grid;place-items:center;min-height:100vh;margin:0}
div{max-width:460px;padding:24px;text-align:center}h1{font-family:Fraunces,Georgia,serif;font-weight:600}</style></head>
<body><div>${simbolo({ tamanho: 44 })}<h1>Hmm… “${e(slug)}” não existe por aqui</h1>
<p style="color:${P.inkSuave}">Confira o endereço com o studio, ou conheça o <a href="https://${e(a.dominioBase)}" style="color:${P.rosaEscuro}">ClavusOS</a>.</p></div></body></html>`;
}

export function telaSuspenso(nome: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(nome)}</title>${FONTES}<style>body{font-family:"Instrument Sans",system-ui;background:${P.fundo};color:${P.ink};display:grid;place-items:center;min-height:100vh;margin:0}
div{max-width:460px;padding:24px;text-align:center}h1{font-family:Fraunces,Georgia,serif;font-weight:600}</style></head>
<body><div>${simbolo({ tamanho: 44 })}<h1>${e(nome)}</h1>
<p style="color:${P.inkSuave}">O acesso a este sistema está temporariamente suspenso. Fale com quem administra o contrato para reativar.
Seus dados estão guardados e podem ser exportados a qualquer momento.</p></div></body></html>`;
}
