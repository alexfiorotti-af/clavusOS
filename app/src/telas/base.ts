/**
 * A moldura de toda página: marca do studio, navegação por papel, avisos e o
 * conteúdo. HTML gerado no servidor; CSS inline (uma requisição, abre no 4G).
 *
 * Sistema visual "Porcelana & Esmalte" (D017; skill af-interface-saas):
 * fundo de porcelana, texto em ameixa e UMA cor de esmalte — a do studio
 * (`studios.cor`), da qual os tons de apoio derivam com color-mix. Navegação em
 * um andar só: no celular, 4 abas embaixo + o botão "+" (criar qualquer coisa);
 * no notebook, menu lateral. Visões de uma área (Dia/Semana/Equipe) são um
 * seletor dentro da página.
 */
import { e } from "../http/resposta.ts";
import type { Studio } from "../studio/studio.ts";
import type { Usuario } from "../auth/sessao.ts";
import { pode } from "../auth/sessao.ts";
import { simboloCheio, PALETA, FONTES_LINK } from "../marca.ts";

export type Aviso = { tipo: "ok" | "erro" | "atencao"; texto: string; /** já é HTML seguro (gerado pelo app, nunca do usuário) */ html?: boolean };

export type Pagina = {
  titulo: string;
  studio: Studio;
  usuario: Usuario | null;
  conteudo: string;
  avisos?: Aviso[];
  ativo?: string;
  largo?: boolean;
  caminho?: string;
  /** a query da URL (sem "?"), para marcar o item certo do seletor da seção */
  busca?: string;
};

/** Ícones de traço (1.8, currentColor) — uma família só, nada de emoji. */
export const ICONE = {
  hoje: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>`,
  agenda: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8.5 3v4M15.5 3v4"/></svg>`,
  clientes: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.6 3.1 2.4 3.5 5.2"/></svg>`,
  caixa: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h12a1 1 0 0 1 1 1v2"/><path d="M3.5 7.5v10A2.5 2.5 0 0 0 6 20h13.5a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H6a2.5 2.5 0 0 1-2.5-1.5Z"/><circle cx="16.5" cy="14.5" r="1.2" fill="currentColor"/></svg>`,
  relatorios: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 20V11M10.5 20V5M16 20v-6M21 20H3"/></svg>`,
  ajustes: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>`,
  mais: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  seta: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`,
  zap: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.6-4.4A8.4 8.4 0 1 1 20.5 11.6Z"/></svg>`,
  unha: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c3 0 5 3.8 5 8.6 0 4.6-2.2 9.4-5 9.4s-5-4.8-5-9.4C7 6.8 9 3 12 3Z"/><path d="M9.6 17.4c.7-1.1 1.5-1.6 2.4-1.6s1.7.5 2.4 1.6"/></svg>`,
  bolo: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h16M5 20v-6.5A1.5 1.5 0 0 1 6.5 12h11a1.5 1.5 0 0 1 1.5 1.5V20"/><path d="M5 16c1.2 0 1.8-1 3-1s1.8 1 3 1 1.8-1 3-1 1.8 1 3 1 1.8-1 2-1"/><path d="M12 12V9.2"/></svg>`,
  sacola: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1.1 12H6.1L5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>`,
  setas: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4v14M3.5 14.5 7 18l3.5-3.5M17 20V6M13.5 9.5 17 6l3.5 3.5"/></svg>`,
  novaCliente: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.8-3.6 3.4-5.5 6.5-5.5 1.6 0 3 .5 4.2 1.4M19 14v6M16 17h6"/></svg>`,
  novoHorario: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8.5 3v4M15.5 3v4M12 13v5M9.5 15.5h5"/></svg>`,
};

export const CSS = `
:root{--cor:${PALETA.cereja};--cor-f:color-mix(in oklch,var(--cor) 12%,white);--cor-m:color-mix(in oklch,var(--cor) 40%,white);
--porcelana:${PALETA.porcelana};--papel:#FFFFFF;--nude:${PALETA.nude};--ink:${PALETA.ameixa};--suave:${PALETA.ameixaSuave};--linha:${PALETA.linha};
--verniz:${PALETA.vernizTexto};--ok:${PALETA.ok};--ok-f:#E3F1EA;--alerta:${PALETA.alerta};--alerta-f:#F6ECDD;--erro:${PALETA.erro};--erro-f:#F8E3E6;
--rosa:var(--cor);--rosa-escuro:var(--cor);--rosa-claro:var(--cor-f);--lilas:var(--cor);--dourado:var(--verniz);--fundo:var(--porcelana);--grad:var(--cor);
--disp:${"\"Fraunces\",Georgia,serif"};--txt:${"\"Instrument Sans\",\"Segoe UI\",system-ui,sans-serif"}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;overflow-x:clip}
body{margin:0;background:var(--porcelana);color:var(--ink);font:15.5px/1.5 var(--txt);overflow-x:clip}
::selection{background:var(--cor-f)}
a{color:var(--cor);text-underline-offset:3px}
h1,h2,h3{line-height:1.15;margin:0 0 12px}
h1{font-family:var(--disp);font-variation-settings:"SOFT" 100,"opsz" 96;font-weight:500;font-size:32px;letter-spacing:-.02em}
h2{font-size:16.5px;font-weight:600;margin-top:28px}h3{font-size:15.5px;font-weight:600}
.disp{font-family:var(--disp);font-variation-settings:"SOFT" 100,"opsz" 96;font-weight:500;letter-spacing:-.02em}
:focus-visible{outline:2px solid var(--ink);outline-offset:2px}

/* ---------- moldura ---------- */
.lateral{display:none}
header.topo{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px clamp(16px,4vw,28px) 4px}
.marca{display:flex;align-items:center;gap:9px;font-weight:600;font-size:15.5px;color:var(--ink);text-decoration:none;min-width:0}
.marca span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.marca img{height:30px;width:auto;border-radius:8px}
details.conta{position:relative}
details.conta summary{list-style:none;cursor:pointer;width:42px;height:42px;border-radius:999px;background:var(--nude);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600}
details.conta summary::-webkit-details-marker{display:none}
details.conta .menu{position:absolute;right:0;top:50px;z-index:30;min-width:220px;background:#fff;border-radius:18px;padding:8px;box-shadow:0 12px 32px rgba(45,27,46,.16),0 1px 2px rgba(45,27,46,.08);display:flex;flex-direction:column}
details.conta .menu b{padding:8px 12px 6px;font-size:13.5px}
details.conta .menu a{display:flex;align-items:center;gap:10px;padding:0 12px;min-height:44px;border-radius:12px;color:var(--ink);text-decoration:none;font-weight:500}
details.conta .menu a:hover{background:var(--porcelana)}
main{max-width:1180px;margin:0 auto;padding:12px clamp(16px,4vw,28px) 120px}main.largo{max-width:none}
nav.abas{position:fixed;left:0;right:0;bottom:0;z-index:20;background:#fff;box-shadow:0 -1px 0 var(--linha),0 -10px 30px rgba(45,27,46,.06);display:grid;grid-auto-flow:column;grid-auto-columns:1fr;align-items:start;padding:8px 6px calc(10px + env(safe-area-inset-bottom))}
nav.abas a{display:flex;flex-direction:column;align-items:center;gap:3px;min-height:50px;padding-top:4px;color:var(--suave);text-decoration:none;font-size:11.5px;font-weight:500}
nav.abas a.ativo{color:var(--cor);font-weight:600}
nav.abas a.criar{margin-top:-26px}
nav.abas a.criar span{width:60px;height:60px;border-radius:999px;background:var(--cor);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(45,27,46,.22),0 0 0 5px #fff}
nav.secao{display:flex;gap:2px;padding:3px;border-radius:999px;background:var(--nude);width:max-content;max-width:100%;overflow-x:auto;scrollbar-width:none;margin:0 0 16px}
nav.secao::-webkit-scrollbar{display:none}
nav.secao a{flex:none;display:flex;align-items:center;height:38px;padding:0 15px;border-radius:999px;color:var(--suave);text-decoration:none;font-size:14px;font-weight:500;white-space:nowrap}
nav.secao a.ativo{background:#fff;color:var(--ink);font-weight:600;box-shadow:0 1px 2px rgba(45,27,46,.08)}
@media (min-width:900px){
  body.app{display:grid;grid-template-columns:248px minmax(0,1fr);min-height:100vh}
  body.app header.topo,nav.abas{display:none}
  .lateral{display:flex;flex-direction:column;gap:22px;background:var(--ink);color:#EADDE3;padding:22px 14px;position:sticky;top:0;height:100vh}
  .lateral .marca{color:#fff;padding:0 8px}.lateral .marca small{display:block;font-size:12px;font-weight:400;color:#BFAEB8}
  .lateral nav{display:flex;flex-direction:column;gap:2px}
  .lateral nav a{display:flex;align-items:center;gap:12px;height:44px;padding:0 12px;border-radius:12px;color:#EADDE3;text-decoration:none;font-size:14.5px;font-weight:500}
  .lateral nav a svg{width:20px;height:20px}
  .lateral nav a:hover{background:rgba(255,255,255,.06)}
  .lateral nav a.ativo{background:rgba(255,255,255,.11);color:#fff;font-weight:600}
  .lateral nav a.ativo svg{color:color-mix(in oklch,var(--cor) 55%,white)}
  .lateral .pe{margin-top:auto;display:flex;flex-direction:column;gap:6px}
  .lateral .quem{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.06);font-size:13.5px}
  .lateral .quem a{color:#BFAEB8;margin-left:auto;font-size:13px}
  body.app main{padding:32px clamp(20px,3vw,44px) 56px;margin:0;max-width:1180px;width:100%}
  h1{font-size:36px}
}

/* ---------- peças ---------- */
.aviso{padding:12px 16px;border-radius:14px;margin:0 0 14px;font-size:14px}
.aviso.ok{background:var(--ok-f);color:#1B5139}.aviso.erro{background:var(--erro-f);color:#7E2133}.aviso.atencao{background:var(--alerta-f);color:#6A440C}
.cartao{background:var(--papel);border-radius:22px;padding:18px;margin-bottom:14px}
.grade{display:grid;gap:12px}.g2{grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr))}.g3{grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr))}.g4{grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr))}
.num{font-family:var(--disp);font-variation-settings:"SOFT" 100;font-weight:500;font-size:28px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.num small{display:block;font-family:var(--txt);font-weight:400;font-size:13px;color:var(--suave);margin-top:2px;letter-spacing:0}
.num.pos{color:var(--ok)}.num.neg{color:var(--erro)}.num.gold{color:var(--verniz)}
table{width:100%;border-collapse:collapse;font-size:14px}
th{text-align:left;font-weight:500;font-size:13px;color:var(--suave);padding:9px}
td{padding:11px 9px;border-top:1px solid var(--linha);vertical-align:top}
td.n,th.n{text-align:right;white-space:nowrap}td,th,p,.mudo{font-variant-numeric:tabular-nums}
.tabela{overflow-x:auto}
label{display:block;font-weight:600;font-size:14px;margin:0 0 6px;color:var(--ink)}
.campo,.linha>div{margin-top:14px}
input,select,textarea{width:100%;font:15px var(--txt);padding:0 14px;height:48px;border:1.5px solid var(--linha);border-radius:14px;background:#fff;color:var(--ink)}
input::placeholder{color:#7D6D77}
textarea{height:auto;min-height:88px;padding:12px 14px;resize:vertical}select{padding-right:30px}
input:focus,select:focus,textarea:focus{outline:2px solid var(--cor);outline-offset:1px;border-color:transparent}
input[type=checkbox],input[type=radio]{width:auto;height:auto;margin-right:6px;vertical-align:-1px;accent-color:var(--cor)}input[type=color]{padding:3px;width:64px}
.linha{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(min(180px,100%),1fr));align-items:end}.linha>div{margin-top:0}
.botao,button{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:600 15px var(--txt);padding:0 18px;min-height:48px;border-radius:14px;border:0;background:var(--cor);color:#fff;cursor:pointer;text-decoration:none;line-height:1.2;transition:scale .15s ease-out,filter .15s ease-out}
.botao:not([aria-disabled=true]):active,button:not(:disabled):active{scale:.96}
@media (hover:hover){.botao:hover,button:hover{filter:brightness(1.07)}}
.botao.sec,button.sec{background:var(--nude);color:var(--ink)}
.botao.apoio,button.apoio{background:var(--cor-f);color:var(--cor)}
.botao.perigo,button.perigo{background:var(--erro-f);color:var(--erro)}
.botao.zap,button.zap{background:var(--ok-f);color:var(--ok)}
.botao.pequeno,button.pequeno{padding:0 12px;font-size:13.5px;min-height:38px;border-radius:12px}
.acoes{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;align-items:center}
.etiqueta{display:inline-block;width:max-content;font-size:12.5px;font-weight:500;padding:2px 10px;border-radius:999px;white-space:nowrap;vertical-align:1px}
.e-pendente{background:var(--alerta-f);color:var(--alerta)}.e-confirmado{background:var(--cor-f);color:var(--cor)}.e-concluido{background:var(--ok-f);color:var(--ok)}
.e-cancelado{background:var(--erro-f);color:var(--erro)}.e-nao_compareceu{background:var(--nude);color:var(--suave)}
.e-recebida{background:var(--ok-f);color:var(--ok)}.e-vencida{background:var(--erro-f);color:var(--erro)}.e-estornada,.e-cancelada{background:var(--nude);color:var(--suave)}
.e-lead{background:var(--nude);color:#5C4B57}.e-ativa{background:var(--ok-f);color:var(--ok)}.e-inativa{background:var(--nude);color:var(--suave)}
.e-vencida-unha{background:var(--erro-f);color:var(--erro)}.e-niver{background:#F7EEDB;color:#7A5410}
.mudo{color:var(--suave);font-size:13.5px}.direita{text-align:right}.valor{color:var(--ink);font-weight:500}
.pilulas{display:flex;gap:8px;overflow-x:auto;padding:2px 0;margin:0 0 14px;scrollbar-width:none}
.pilulas::-webkit-scrollbar{display:none}
.pill{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 15px;border-radius:999px;background:var(--papel);font-weight:600;font-size:14px;color:var(--ink);text-decoration:none;white-space:nowrap}
.pill.ativa{background:var(--ink);color:#fff}
.pill .n{font-weight:500;opacity:.75}
.pill .ponto{width:5px;height:5px;border-radius:999px;background:var(--cor)}.pill.ativa .ponto{background:#fff}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:14px;background:var(--papel);border:2px solid transparent;font-size:14px;font-weight:600;cursor:pointer}
.cartao .chip,.cartao .pill:not(.ativa){background:var(--porcelana)}
.cartao .pill.ativa{background:var(--cor-f);color:var(--ink);box-shadow:inset 0 0 0 2px var(--cor)}
.chip input{display:none}.chip:has(input:checked){background:var(--cor-f);border-color:var(--cor);color:var(--ink)}
.banner{display:flex;align-items:center;gap:12px;background:var(--papel);color:var(--ink);border-radius:18px;padding:14px 16px;font-size:14.5px;text-decoration:none;margin-bottom:10px;min-height:60px}
.banner .ic{width:38px;height:38px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;background:var(--cor-f);color:var(--cor)}
.banner.suave .ic{background:#F7EEDB;color:#8A6516}
.banner .tx{flex:1}.banner .tx small{display:block;color:var(--suave);font-size:13px}
.lista{background:var(--papel);border-radius:22px;overflow:hidden;margin-bottom:14px}
.lista .ag{border-radius:0;margin:0;border-top:1px solid var(--linha)}.lista .ag:first-child{border-top:0}
.ag{background:var(--papel);border-radius:18px;padding:12px 16px;display:flex;gap:14px;align-items:center;margin-bottom:8px;text-decoration:none;color:inherit;min-height:64px}
@media (hover:hover){.ag:hover{background:#FDFBFA}}
.ag.concluido{opacity:.62}.ag.cancelado,.ag.nao_compareceu{opacity:.5}
.ag .hora{font-weight:600;min-width:48px;font-variant-numeric:tabular-nums}.ag .hora small{display:block;font-weight:400;color:var(--suave);font-size:12px}
.ag .meio{flex:1;min-width:0}.ag .meio b{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ag .meio>span{font-size:13px;color:var(--suave);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.ag .fim{display:flex;flex-direction:column;align-items:flex-end;gap:4px}.ag .fim .valor{font-size:14px}
.mapa{overflow-x:auto;background:var(--papel);border-radius:22px;padding:12px}
.mapa .grid{display:flex;gap:8px;position:relative}
.mapa .horas{flex:0 0 46px;position:relative}.mapa .horas span{position:absolute;font-size:11.5px;color:var(--suave);transform:translateY(-50%)}
.mapa .col{flex:1 1 0;min-width:130px;position:relative;background:var(--porcelana);border-radius:14px}
.mapa .col h4{margin:0;text-align:center;font-size:13px;padding:6px 2px;color:var(--ink)}
.mapa .slot{position:absolute;left:0;right:0;border-top:1px solid var(--linha)}
.mapa .bloco{position:absolute;left:4px;right:4px;border-radius:12px;padding:4px 9px;font-size:12px;font-weight:600;color:var(--ink);overflow:hidden;text-decoration:none}
.mapa .bloco small{display:block;font-weight:400;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.barra{display:flex;align-items:center;gap:10px;margin:8px 0}
.barra .rot{flex:0 0 120px;font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.barra .trilho{flex:1;height:10px;background:var(--porcelana);border-radius:999px;overflow:hidden}
.barra .trilho i{display:block;height:100%;background:var(--cor);border-radius:999px;min-width:3px}
.barra.neg .trilho i{background:var(--erro)}
.barra .num{flex:0 0 auto;font-family:var(--txt);font-size:13px;font-weight:600}
footer{text-align:center;color:var(--suave);font-size:12.5px;padding:20px 20px 110px}footer a{color:var(--suave)}
@media (min-width:900px){footer{padding-bottom:24px}body.app footer{grid-column:2}}
.entrada{max-width:420px;margin:48px auto}.entrada .cartao{padding:28px}
.avatar{display:inline-flex;width:40px;height:40px;border-radius:50%;background:var(--nude);color:var(--ink);align-items:center;justify-content:center;font-weight:600;font-size:13px;flex:0 0 auto}
.anel{position:relative;width:48px;height:48px;flex:none;display:flex;align-items:center;justify-content:center}
.anel svg{position:absolute;inset:0;transform:rotate(-90deg)}.anel .avatar{width:38px;height:38px}
details summary{cursor:pointer;font-weight:600;color:var(--cor)}
.qr{max-width:220px;border-radius:14px}
code.pix{display:block;font-size:11px;word-break:break-all;background:var(--porcelana);border-radius:12px;padding:10px}
/* Hoje */
.resumo{display:flex;flex-wrap:wrap;gap:6px 18px;color:var(--suave);font-size:15px;margin:-4px 0 18px}.resumo b{color:var(--ink);font-weight:600}
.data{color:var(--suave);font-size:14px;margin:0 0 4px}
.dia-linha{background:var(--papel);border-radius:22px;padding:16px;margin-bottom:14px}
.dia-linha .topo-l{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;font-size:14px;font-weight:600}
.dia-linha .agora{color:var(--cor);font-size:13px}
.dia-linha .trilha{position:relative;border-radius:14px;background:var(--porcelana)}
.dia-linha .p{position:absolute;height:20px;border-radius:999px}
.dia-linha .p.enc{outline:1.5px dashed var(--suave);outline-offset:-1.5px}
.dia-linha .p.feito{opacity:.5}
.dia-linha .ag-linha{position:absolute;top:-4px;bottom:-4px;width:2px;border-radius:2px;background:var(--cor)}
.dia-linha .horas-l{display:flex;justify-content:space-between;font-size:11.5px;color:var(--suave);padding:6px 2px 0}
.dia-linha .legenda{display:flex;flex-wrap:wrap;gap:14px;font-size:12.5px;color:var(--suave);margin-top:8px}
.dia-linha .legenda i{display:inline-block;width:10px;height:10px;border-radius:999px;margin-right:6px;vertical-align:-1px}
.proxima{background:var(--papel);border-radius:22px;padding:18px;margin-bottom:14px;display:flex;flex-direction:column;gap:12px}
.proxima .quando{display:flex;justify-content:space-between;align-items:center;font-size:13.5px;font-weight:600;color:var(--cor)}
.proxima .quem b{display:block;font-size:18px}.proxima .quem span{color:var(--suave);font-size:14px}
.titulo-secao{display:flex;justify-content:space-between;align-items:baseline;margin-top:22px}.titulo-secao h2{margin:0 0 10px}.titulo-secao a{font-weight:600;font-size:14px;text-decoration:none}
.h-lado .titulo-secao{margin-top:8px}
@media (min-width:1100px){.hoje{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);grid-template-areas:"linha lado" "agenda lado";column-gap:20px;align-items:start}.h-linha{grid-area:linha}.h-lado{grid-area:lado}.h-agenda{grid-area:agenda}.h-agenda .titulo-secao{margin-top:8px}.h-lado .titulo-secao:first-child{margin-top:0}}
/* Caixa */
.saldo{background:var(--papel);border-radius:24px;padding:20px;margin-bottom:14px;display:flex;flex-direction:column;gap:14px}
.saldo .valor-grande{font-family:var(--disp);font-variation-settings:"SOFT" 100,"opsz" 96;font-weight:500;font-size:46px;line-height:1.05;letter-spacing:-.02em;color:var(--verniz);font-variant-numeric:tabular-nums}
.saldo .valor-grande.neg{color:var(--erro)}
.saldo .es{display:grid;grid-template-columns:1fr 1fr;gap:10px}.saldo .es span{display:block;font-size:13px;color:var(--suave)}.saldo .es b{font-size:18px;font-variant-numeric:tabular-nums}
.atalhos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:8px}
.atalhos a{background:var(--papel);border-radius:18px;min-height:78px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--ink);text-decoration:none;font-size:13.5px;font-weight:600;text-align:center;padding:6px}
/* Criar (+) */
.criar-lista{background:var(--papel);border-radius:24px;padding:6px;max-width:560px}
.criar-lista a{display:flex;align-items:center;gap:14px;padding:12px;min-height:72px;border-radius:18px;color:var(--ink);text-decoration:none}
@media (hover:hover){.criar-lista a:hover{background:var(--porcelana)}}
.criar-lista .ic{width:48px;height:48px;border-radius:15px;flex:none;display:flex;align-items:center;justify-content:center;background:var(--cor-f);color:var(--cor)}
.criar-lista a:first-child .ic{background:var(--cor);color:#fff}
.criar-lista b{display:block;font-size:16.5px}.criar-lista span{color:var(--suave);font-size:13.5px}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
@media print{header.topo,nav.abas,.lateral,nav.secao,footer,.acoes,.nao-imprime{display:none}body{background:#fff;display:block}main{padding:0}}
`;

type Item = [href: string, rotulo: string, icone: keyof typeof ICONE, visivel: boolean];

function itensMenu(u: Usuario): Item[] {
  return [
    ["/", "Hoje", "hoje", true],
    ["/agenda", "Agenda", "agenda", true],
    ["/clientes", "Clientes", "clientes", true],
    ["/caixa", "Caixa", "caixa", pode(u.papel, "financeiro")],
    ["/relatorios", "Relatórios", "relatorios", pode(u.papel, "financeiro")],
  ];
}

/** Abas do celular: Hoje, Agenda, [+], Clientes, Caixa (o Caixa só para quem vê o financeiro). */
function abas(u: Usuario | null, ativo?: string): string {
  if (!u) return "";
  const it = (h: string, t: string, i: keyof typeof ICONE) =>
    `<a href="${h}"${ativo === h ? ' class="ativo" aria-current="page"' : ""}>${ICONE[i]}<span>${t}</span></a>`;
  return `<nav class="abas" aria-label="Navegação principal">${it("/", "Hoje", "hoje")}${it("/agenda", "Agenda", "agenda")}
<a class="criar" href="/novo" aria-label="Criar: horário, venda, lançamento ou cliente"><span>${ICONE.mais}</span></a>
${it("/clientes", "Clientes", "clientes")}${pode(u.papel, "financeiro") ? it("/caixa", "Caixa", "caixa") : ""}</nav>`;
}

function lateral(s: Studio, u: Usuario | null, ativo: string | undefined, marca: string): string {
  if (!u) return "";
  const links = itensMenu(u).filter(([, , , v]) => v)
    .map(([h, t, i]) => `<a href="${h}"${ativo === h ? ' class="ativo" aria-current="page"' : ""}>${ICONE[i]}${t}</a>`).join("");
  return `<aside class="lateral"><a class="marca" href="/">${marca}<span>${e(s.nome)}<small>${s.assinatura_clavus ? "com ClavusOS" : ""}</small></span></a>
<nav aria-label="Navegação principal">${links}<a href="/novo"${ativo === "/novo" ? ' class="ativo"' : ""}>${ICONE.mais.replace('width="26" height="26"', 'width="20" height="20"')}Criar</a></nav>
<div class="pe"><nav>${pode(u.papel, "tarifas") ? `<a href="/configuracoes"${ativo === "/configuracoes" ? ' class="ativo"' : ""}>${ICONE.ajustes}Configurações</a>` : ""}</nav>
<div class="quem"><span class="avatar" style="background:#4A3348;color:#fff;width:34px;height:34px">${e(iniciais(u.nome))}</span><span>${e(u.nome.split(" ")[0])}</span><a href="/sair">sair</a></div></div></aside>`;
}

function topo(s: Studio, u: Usuario | null, marca: string): string {
  const conta = u ? `<details class="conta"><summary aria-label="Sua conta e ajustes">${e(iniciais(u.nome))}</summary><div class="menu">
<b>${e(u.nome)}</b>
${pode(u.papel, "financeiro") ? `<a href="/relatorios">${ICONE.relatorios}Relatórios</a>` : ""}
${pode(u.papel, "tarifas") ? `<a href="/configuracoes">${ICONE.ajustes}Configurações</a>` : ""}
<a href="/sair">Sair</a></div></details>` : "";
  return `<header class="topo"><a class="marca" href="/">${marca}<span>${e(s.nome)}</span></a>${conta}</header>`;
}

const iniciais = (nome: string) => nome.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

/** Seletor de visões dentro de cada área (sem itens de "criar": isso é o botão +). */
const SECOES: Record<string, [string, string, "operar" | "financeiro" | "tarifas" | "configurar"][]> = {
  "/agenda": [["/agenda", "Dia", "operar"], ["/agenda/semana", "Semana", "operar"], ["/agenda/mapa", "Equipe", "operar"]],
  "/caixa": [["/caixa", "Caixa", "financeiro"], ["/relatorios", "Relatórios", "financeiro"]],
  "/relatorios": [["/caixa", "Caixa", "financeiro"], ["/relatorios", "Relatórios", "financeiro"]],
  "/configuracoes": [["/configuracoes", "Studio", "tarifas"], ["/configuracoes/servicos", "Serviços", "tarifas"], ["/configuracoes/produtos", "Produtos", "tarifas"], ["/configuracoes/equipe", "Equipe", "tarifas"], ["/configuracoes/planos", "Planos", "tarifas"], ["/configuracoes/asaas", "Asaas", "configurar"], ["/configuracoes/cobranca", "Assinatura ClavusOS", "configurar"], ["/configuracoes/auditoria", "Auditoria", "configurar"], ["/configuracoes/exportar", "Exportar", "configurar"]],
};

/** O item ativo compara caminho E query: "/clientes?filtro=x" só acende no filtro x. */
export function itemAtivo(hrefs: string[], caminho: string, busca = ""): string {
  const atual = new URLSearchParams(busca);
  const casa = (h: string) => {
    const [p, q] = h.split("?");
    if (!(caminho === p || (p !== "/" && caminho.startsWith(p + "/")))) return -1;
    const pq = new URLSearchParams(q ?? "");
    for (const [k, v] of pq) if (atual.get(k) !== v) return -1;
    return p.length * 10 + [...pq].length;
  };
  let melhor = "", nota = -1;
  for (const h of hrefs) { const n = casa(h); if (n > nota) { nota = n; melhor = h; } }
  return melhor;
}

function secao(u: Usuario | null, ativo: string | undefined, caminho: string | undefined, busca?: string): string {
  if (!u || !ativo || !SECOES[ativo]) return "";
  const itens = SECOES[ativo].filter(([, , p]) => pode(u.papel, p));
  if (itens.length < 2) return "";
  const at = itemAtivo(itens.map(([h]) => h), caminho ?? ativo, busca);
  return `<nav class="secao" aria-label="Visões">${itens.map(([h, t]) => `<a href="${h}"${h === at ? ' class="ativo" aria-current="page"' : ""}>${t}</a>`).join("")}</nav>`;
}

export function pagina(p: Pagina): string {
  const s = p.studio;
  const avisos = (p.avisos ?? []).map((a) => `<div class="aviso ${a.tipo}">${a.html ? a.texto : e(a.texto)}</div>`).join("");
  const marca = s.logo_url ? `<img src="${e(s.logo_url)}" alt="">` : simboloCheio({ tamanho: 26, cor: s.cor, reflexo: false });
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${e(p.titulo)} · ${e(s.nome)}</title>
<meta name="theme-color" content="${e(PALETA.porcelana)}"><link rel="icon" href="/assets/icone.svg" type="image/svg+xml">
${FONTES_LINK}
<style>${CSS}:root{--cor:${e(s.cor)}}</style></head>
<body${p.usuario ? ' class="app"' : ""}>${lateral(s, p.usuario, p.ativo, marca)}${topo(s, p.usuario, marca)}
<main${p.largo ? ' class="largo"' : ""}>${secao(p.usuario, p.ativo, p.caminho, p.busca)}${avisos}${p.conteudo}</main>
<footer>${s.assinatura_clavus ? `${e(s.nome)} · com tecnologia <b>ClavusOS</b>` : e(s.nome)}</footer>
${abas(p.usuario, p.ativo)}
<script src="/assets/app.js" defer></script></body></html>`;
}

/** Rótulos amigáveis das situações. */
export const SITUACAO: Record<string, string> = {
  pendente: "A confirmar", confirmado: "Confirmado", concluido: "Concluído", cancelado: "Cancelado", nao_compareceu: "Faltou",
  recebida: "Paga", vencida: "Vencida", estornada: "Estornada", cancelada: "Cancelada",
  lead: "Lead", ativa: "Ativa", inativa: "Inativa",
};
export function etiqueta(s: string): string {
  return `<span class="etiqueta e-${e(s)}">${e(SITUACAO[s] ?? s)}</span>`;
}

export function opcoes(lista: Record<string, string> | [string, string][], atual?: string | null): string {
  const pares = Array.isArray(lista) ? lista : Object.entries(lista);
  return pares.map(([v, t]) => `<option value="${e(v)}"${v === atual ? " selected" : ""}>${e(t)}</option>`).join("");
}

/** O anel do ciclo da unha em volta do avatar: enche até a data de voltar; vermelho = vencida. */
export function anelCiclo(nome: string, decorridos: number | null, ciclo: number | null): string {
  const ini = iniciais(nome);
  if (!ciclo || decorridos === null) return `<span class="avatar">${e(ini)}</span>`;
  const pct = Math.max(0, Math.min(decorridos / ciclo, 1)), C = 2 * Math.PI * 21;
  const cor = pct >= 1 ? "var(--erro)" : pct >= 0.8 ? "var(--alerta)" : "var(--cor)";
  return `<span class="anel" title="${decorridos} de ${ciclo} dias"><svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
<circle cx="24" cy="24" r="21" fill="none" stroke="var(--linha)" stroke-width="3"/>
<circle cx="24" cy="24" r="21" fill="none" stroke="${cor}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(pct * C).toFixed(1)} ${C.toFixed(1)}"/></svg>
<span class="avatar">${e(ini)}</span></span>`;
}
