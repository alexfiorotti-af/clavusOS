/**
 * Páginas legais públicas: Política de Privacidade e Termos de Uso.
 * Valem na raiz (clavusos.com.br) e em qualquer subdomínio de studio.
 * Base sólida em linha com a LGPD (Lei 13.709/2018) — não substitui revisão
 * por advogado. A data de vigência sai da constante ATUALIZADO_EM.
 */
import { e } from "../http/resposta.ts";
import type { Ambiente } from "../ambiente.ts";
import { simbolo, PALETA as P, FAVICON_SVG } from "../marca.ts";

export const ATUALIZADO_EM = "30 de outubro de 2026";

const FONTES = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,400..600,0..100&family=Instrument+Sans:wght@400;500;600&display=swap">`;

function pagina(a: Ambiente, titulo: string, corpo: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(titulo)} — ClavusOS</title>
<meta name="robots" content="index,follow">
<link rel="icon" href="data:image/svg+xml;utf8,${encodeURIComponent(FAVICON_SVG)}" type="image/svg+xml">
${FONTES}
<style>
:root{--rosa:${P.rosa};--rosa-escuro:${P.rosaEscuro};--ameixa:${P.ink};--suave:${P.inkSuave};--fundo:${P.fundo};--linha:${P.linha};--papel:#fff}
*{box-sizing:border-box}body{margin:0;background:var(--fundo);color:var(--ameixa);font:16px/1.65 "Instrument Sans",system-ui,sans-serif}
.c{max-width:780px;margin:0 auto;padding:0 clamp(18px,4vw,28px)}
a{color:var(--rosa-escuro)}
h1{font-family:Fraunces,Georgia,serif;font-variation-settings:"SOFT" 100,"opsz" 96;font-weight:500;letter-spacing:-.02em;line-height:1.1;font-size:clamp(30px,6vw,42px);margin:0 0 6px}
h2{font-family:Fraunces,Georgia,serif;font-variation-settings:"SOFT" 100,"opsz" 96;font-weight:500;letter-spacing:-.01em;font-size:22px;margin:34px 0 10px}
h3{font-size:16.5px;margin:22px 0 6px}
p,li{color:#3A2A3B}.mudo{color:var(--suave);font-size:14px}
ul{padding-left:22px}li{margin:4px 0}
header{padding:22px 0;border-bottom:1.5px solid var(--linha);margin-bottom:34px}
header .c{display:flex;align-items:center;gap:10px}
header b{color:var(--ameixa)}
.aviso{background:var(--papel);border:1.5px solid var(--linha);border-radius:16px;padding:16px 18px;font-size:14px;margin:26px 0}
footer{border-top:1.5px solid var(--linha);margin-top:44px;padding:26px 0 48px}
footer p{font-size:13px;color:var(--suave);margin:4px 0}
.links{display:flex;gap:16px;flex-wrap:wrap;font-size:14px;margin-top:8px}
</style></head><body>
<header><div class="c"><a href="/" style="display:flex;gap:10px;align-items:center;text-decoration:none">${simbolo({ tamanho: 28 })}<b>ClavusOS</b></a></div></header>
<main class="c">${corpo}
<div class="links"><a href="/privacidade">Política de Privacidade</a><a href="/termos">Termos de Uso</a><a href="/">Início</a></div>
</main>
<footer><div class="c">
<p><b style="color:var(--ameixa)">AF Tecnologia e Marketing Ltda.</b> — produtora do ClavusOS</p>
<p>Vitória/ES, Brasil · ${e(a.emailComercial)} · WhatsApp (27) 99601-5367</p>
<p class="mudo">Atualizado em ${ATUALIZADO_EM}.</p>
</div></footer>
</body></html>`;
}

export function telaPrivacidade(a: Ambiente): string {
  const corpo = `
<h1>Política de Privacidade</h1>
<p class="mudo">Vigente desde ${ATUALIZADO_EM}.</p>

<p>Esta política explica como o <b>ClavusOS</b>, produto da <b>AF Tecnologia e Marketing Ltda.</b> ("AF", "nós"),
trata dados pessoais, em linha com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).</p>

<h2>1. Dois papéis, dois tipos de dado</h2>
<p>O ClavusOS é usado por studios de unhas. Por isso existem duas situações diferentes:</p>
<ul>
<li><b>Dados do studio (a profissional e a equipe).</b> Aqui a AF é a <b>controladora</b>: decidimos como tratar
o nome, e-mail, WhatsApp e os dados de cobrança de quem assina o ClavusOS.</li>
<li><b>Dados das clientes finais do studio</b> (nome, WhatsApp, histórico de atendimento, aniversário, origem).
Aqui quem decide é o <b>studio</b>, que é o <b>controlador</b> desses dados; a AF atua como <b>operadora</b>,
tratando-os apenas para fazer o sistema funcionar, sob instrução do studio. Cada studio é responsável por ter
base legal (por exemplo, a relação de atendimento ou o consentimento da cliente) para cadastrar essas pessoas.</li>
</ul>

<h2>2. Que dados tratamos</h2>
<h3>Do studio e da equipe</h3>
<ul>
<li>Cadastro: nome, e-mail, WhatsApp e o nome do studio.</li>
<li>Acesso: senha (guardada apenas como <i>hash</i>, nunca em texto), registros de login e endereço de IP do acesso.</li>
<li>Cobrança da assinatura: processada pelo <b>Asaas</b>. Dados de cartão <b>nunca</b> passam pelo ClavusOS.</li>
<li>Chave de integração do Asaas do studio: guardada <b>cifrada</b> (AES-256-GCM) no banco.</li>
</ul>
<h3>Das clientes finais (inseridos pelo studio)</h3>
<ul>
<li>Nome, WhatsApp, data de aniversário (opcional), origem do contato e histórico de serviços e pagamentos no studio.</li>
<li>Não pedimos nem armazenamos dados sensíveis, documentos ou dados de cartão das clientes finais.</li>
</ul>

<h2>3. Para que usamos</h2>
<ul>
<li>Operar a agenda, o cadastro de clientes, o caixa, as assinaturas e as cobranças do studio.</li>
<li>Autenticar o acesso e proteger a conta contra uso indevido.</li>
<li>Cobrar a assinatura do ClavusOS e emitir avisos sobre ela.</li>
<li>Dar suporte, corrigir falhas e melhorar o serviço.</li>
<li>Cumprir obrigações legais e regulatórias.</li>
</ul>

<h2>4. Bases legais (art. 7º da LGPD)</h2>
<ul>
<li><b>Execução de contrato</b>: operar o serviço e cobrar a assinatura.</li>
<li><b>Cumprimento de obrigação legal</b>: guarda de registros e obrigações fiscais.</li>
<li><b>Legítimo interesse</b>: segurança, prevenção a fraude e melhoria do serviço, sempre respeitando os seus direitos.</li>
<li><b>Consentimento</b>, quando aplicável (por exemplo, comunicações de marketing que você pode recusar a qualquer momento).</li>
</ul>

<h2>5. Com quem compartilhamos</h2>
<p>Não vendemos dados pessoais. Compartilhamos apenas com operadores necessários ao funcionamento:</p>
<ul>
<li><b>Asaas</b> — processamento de pagamentos (assinatura do ClavusOS e cobranças do studio às suas clientes).</li>
<li><b>Provedor de hospedagem</b> — infraestrutura que roda o sistema.</li>
<li><b>Autoridades</b> — quando houver obrigação legal ou ordem judicial.</li>
</ul>
<p class="mudo">Caso algum provedor trate dados fora do Brasil, isso é feito com salvaguardas compatíveis com a LGPD.</p>

<h2>6. Como protegemos</h2>
<ul>
<li>Isolamento de dados por studio no próprio banco (um studio não enxerga o outro).</li>
<li>Senhas guardadas apenas como <i>hash</i> (scrypt); tokens de sessão também só em <i>hash</i>.</li>
<li>Chave de pagamento do studio cifrada com AES-256-GCM.</li>
<li>Conexões por HTTPS, cabeçalhos de segurança e freio contra tentativas repetidas de login.</li>
<li>Dados de cartão nunca trafegam nem são guardados pelo ClavusOS.</li>
</ul>

<h2>7. Por quanto tempo guardamos</h2>
<p>Guardamos os dados enquanto a conta estiver ativa e pelo prazo necessário às finalidades acima e a obrigações legais.
Encerrada a conta, os dados podem ser exportados e, em seguida, eliminados ou anonimizados, salvo o que a lei exigir manter.</p>

<h2>8. Seus direitos (art. 18 da LGPD)</h2>
<p>Você pode, a qualquer momento, pedir: confirmação do tratamento, acesso, correção, anonimização ou eliminação,
portabilidade, informação sobre compartilhamentos e revogação do consentimento.</p>
<p>Para exercer, fale com o nosso encarregado: <b>${e(a.emailComercial)}</b> (assunto "Privacidade").
Se os dados forem de clientes finais de um studio, encaminhamos o pedido ao studio responsável.</p>

<h2>9. Cookies</h2>
<p>Usamos apenas um cookie essencial de sessão (para manter você conectada). Ele é <i>HttpOnly</i> e não serve para
rastreamento de publicidade.</p>

<h2>10. Mudanças</h2>
<p>Podemos atualizar esta política. A data de vigência no topo indica a versão atual; mudanças relevantes serão avisadas.</p>

<div class="aviso">Este documento é uma base sólida e honesta, mas não substitui a revisão por um advogado de sua confiança
antes de campanhas de maior alcance.</div>`;
  return pagina(a, "Política de Privacidade", corpo);
}

export function telaTermos(a: Ambiente): string {
  const corpo = `
<h1>Termos de Uso</h1>
<p class="mudo">Vigente desde ${ATUALIZADO_EM}.</p>

<p>Estes termos regem o uso do <b>ClavusOS</b>, serviço de software como serviço (SaaS) oferecido pela
<b>AF Tecnologia e Marketing Ltda.</b> ("AF"). Ao criar uma conta ou usar o serviço, você concorda com eles.</p>

<h2>1. O que é o serviço</h2>
<p>O ClavusOS é um sistema de gestão para studios de unhas: agenda, cadastro de clientes, caixa, relatórios,
assinaturas e cobrança integrada ao Asaas. A AF concede a você uma licença de uso, pessoal e intransferível,
enquanto a assinatura estiver em dia.</p>

<h2>2. Conta e responsabilidades</h2>
<ul>
<li>Você mantém a senha em sigilo e responde pelo uso feito na sua conta e pela sua equipe.</li>
<li>Você é o <b>controlador</b> dos dados das suas clientes e declara ter base legal para tratá-los; a AF é a operadora,
conforme a <a href="/privacidade">Política de Privacidade</a>.</li>
<li>Os dados que você cadastra são seus. Você pode exportá-los enquanto a conta estiver ativa.</li>
</ul>

<h2>3. Preço, teste e cobrança</h2>
<ul>
<li>O serviço tem <b>${a.testeDias} dias de teste grátis</b>. Depois, a mensalidade vigente é de <b>${e(a.precoMensal)}/mês</b>,
salvo condição promocional informada no ato da contratação.</li>
<li>A cobrança é feita pelo <b>Asaas</b> (Pix, boleto ou cartão). No cartão, a assinatura renova automaticamente.</li>
<li>Promoções de lançamento valem nas condições e no prazo anunciados; o preço promocional, quando houver, vale pelo
período informado na oferta.</li>
</ul>

<h2>4. Atraso, suspensão e cancelamento</h2>
<ul>
<li>Em caso de atraso, há um período de carência antes da suspensão do acesso. <b>Nada é apagado</b> na suspensão:
seus dados ficam guardados e o acesso volta com o pagamento.</li>
<li>Você pode cancelar quando quiser. O acesso permanece até o fim do período já pago; não há fidelidade.</li>
<li>Após o cancelamento, você pode exportar seus dados antes da eliminação, conforme a Política de Privacidade.</li>
</ul>

<h2>5. Uso aceitável</h2>
<p>Você concorda em não: usar o serviço para fins ilícitos; tentar burlar a segurança, invadir, sobrecarregar ou
acessar dados de outro studio; fazer engenharia reversa; nem revender o acesso sem autorização. O descumprimento
pode levar à suspensão da conta.</p>

<h2>6. Disponibilidade e limites</h2>
<p>Trabalhamos para manter o serviço disponível e seguro, mas ele é fornecido "no estado em que se encontra".
Na máxima medida permitida em lei, a AF não responde por lucros cessantes ou danos indiretos, e a eventual
responsabilidade fica limitada ao valor pago pela assinatura nos 12 meses anteriores ao fato.</p>

<h2>7. Alterações</h2>
<p>Podemos ajustar estes termos e o preço, avisando com antecedência razoável. O uso após a mudança significa concordância;
se não concordar, você pode cancelar.</p>

<h2>8. Lei e foro</h2>
<p>Estes termos seguem a lei brasileira. Fica eleito o foro da comarca de Vitória/ES para dirimir questões, salvo
direito do consumidor de escolher o foro do seu domicílio.</p>

<p>Dúvidas: <b>${e(a.emailComercial)}</b> · WhatsApp (27) 99601-5367.</p>

<div class="aviso">Base sólida para começar com segurança; recomendamos revisão por um advogado antes de escalar a divulgação.</div>`;
  return pagina(a, "Termos de Uso", corpo);
}
