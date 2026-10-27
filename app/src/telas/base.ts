/**
 * A moldura de toda página: cabeçalho com a marca do studio, menu por papel,
 * avisos e o conteúdo. HTML gerado no servidor; CSS inline (uma requisição,
 * abre no 4G). O design system vem da skill `agenda-beleza` (rosa/lilás/
 * dourado), aqui respondendo do celular ao notebook. O que muda por studio
 * é a cor e o logo.
 */
import { e } from "../http/resposta.ts";
import type { Studio } from "../studio/studio.ts";
import type { Usuario } from "../auth/sessao.ts";
import { pode } from "../auth/sessao.ts";
import { simbolo, PALETA } from "../marca.ts";

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
};

export const CSS = `
:root{--cor:${PALETA.rosa};--rosa:#E91E8C;--rosa-escuro:#C2185B;--rosa-claro:#FCE4F1;--lilas:#9C27B0;
--dourado:#B8860B;--ink:#2D1B2E;--suave:#7A6B7D;--fundo:#FFF7FB;--papel:#FFFFFF;--linha:#F3DCEA;
--ok:#2E9E6B;--alerta:#E6A23C;--erro:#D64550;--grad:linear-gradient(135deg,var(--cor) 0%,#9C27B0 100%)}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--fundo);color:var(--ink);font:15.5px/1.5 "Poppins","Segoe UI",system-ui,sans-serif}
a{color:var(--rosa-escuro)}h1,h2,h3{font-weight:700;line-height:1.15;margin:0 0 12px;letter-spacing:-.01em}
h1{font-size:24px}h2{font-size:18px;margin-top:28px}h3{font-size:15.5px}
header.topo{background:var(--grad);color:#fff}
header.topo .c{max-width:1140px;margin:0 auto;padding:0 clamp(14px,3vw,28px);display:flex;align-items:center;gap:14px;min-height:58px;flex-wrap:wrap}
header.topo .marca{display:flex;align-items:center;gap:9px;font-weight:700;font-size:16.5px;color:#fff;text-decoration:none;padding:8px 0;white-space:nowrap}
header.topo .marca img{height:30px;width:auto;border-radius:6px;background:#fff}
header.topo nav{display:flex;gap:2px;margin-left:auto;overflow-x:auto;scrollbar-width:none;min-width:0}
header.topo nav::-webkit-scrollbar{display:none}
header.topo nav a{color:#fff;text-decoration:none;padding:8px 10px;border-radius:8px;font-size:14px;font-weight:500;opacity:.9;white-space:nowrap}
header.topo nav a:hover,header.topo nav a.ativo{background:rgba(255,255,255,.18);opacity:1}
header.topo .quem{font-size:12.5px;opacity:.9;white-space:nowrap}header.topo .quem a{color:#fff}
@media (max-width:860px){header.topo .quem span{display:none}}
nav.sub{background:var(--papel);border-bottom:1.5px solid var(--linha)}
nav.sub .c{max-width:1140px;margin:0 auto;padding:0 clamp(14px,3vw,28px);display:flex;gap:2px;min-height:42px;overflow-x:auto;scrollbar-width:none}
nav.sub .c::-webkit-scrollbar{display:none}
nav.sub a{white-space:nowrap;text-decoration:none;color:var(--suave);font-size:13.5px;font-weight:600;padding:11px 11px;border-bottom:2.5px solid transparent}
nav.sub a:hover{color:var(--ink)}nav.sub a.ativo{color:var(--rosa-escuro);border-bottom-color:var(--rosa)}
main{max-width:1140px;margin:0 auto;padding:20px clamp(14px,3vw,28px) 64px}main.largo{max-width:none}
.aviso{padding:12px 16px;border-radius:12px;margin:0 0 14px;border-left:4px solid;font-size:14px}
.aviso.ok{background:#E7F3EC;border-color:var(--ok)}.aviso.erro{background:#FBE7E9;border-color:var(--erro)}.aviso.atencao{background:#FBF0DC;border-color:var(--alerta)}
.cartao{background:var(--papel);border:1.5px solid var(--linha);border-radius:16px;padding:18px;margin-bottom:14px;box-shadow:0 4px 16px rgba(233,30,140,.06)}
.grade{display:grid;gap:12px}.g2{grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}.g3{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}.g4{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.num{font-weight:700;font-size:26px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.num small{display:block;font-weight:500;font-size:12.5px;color:var(--suave);margin-top:4px;text-transform:uppercase;letter-spacing:.04em}
.num.pos{color:var(--ok)}.num.neg{color:var(--erro)}.num.gold{color:var(--dourado)}
table{width:100%;border-collapse:collapse;font-size:14px}
th{text-align:left;font-weight:700;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--suave);padding:8px 9px;border-bottom:2px solid var(--rosa-claro)}
td{padding:9px;border-bottom:1px solid var(--linha);vertical-align:top}tr:hover td{background:#FDF4F9}
td.n,th.n{text-align:right;white-space:nowrap}td,th,p,.mudo{font-variant-numeric:tabular-nums}
.tabela{overflow-x:auto}
label{display:block;font-weight:600;font-size:12.5px;margin:0 0 5px;color:var(--suave);text-transform:uppercase;letter-spacing:.04em}
.campo,.linha>div{margin-top:12px}
input,select,textarea{width:100%;font:15px "Poppins",system-ui,sans-serif;padding:0 12px;height:44px;border:1.5px solid var(--linha);border-radius:12px;background:#fff;color:var(--ink)}
textarea{height:auto;min-height:80px;padding:10px 12px;resize:vertical}select{padding-right:28px}
input:focus,select:focus,textarea:focus{outline:2px solid var(--rosa);outline-offset:1px;border-color:var(--rosa)}
input[type=checkbox],input[type=radio]{width:auto;height:auto;margin-right:6px;vertical-align:-1px}input[type=color]{padding:3px;width:60px}
.linha{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));align-items:end}.linha>div{margin-top:0}
.botao,button{display:inline-block;font:600 14.5px "Poppins",system-ui,sans-serif;padding:11px 16px;border-radius:12px;border:1.5px solid var(--rosa);background:var(--grad);border-color:transparent;color:#fff;cursor:pointer;text-decoration:none;line-height:1.3;min-height:44px}
.botao:hover,button:hover{filter:brightness(1.08)}
.botao.sec,button.sec{background:var(--papel);color:var(--ink);border-color:var(--linha)}
.botao.perigo,button.perigo{background:#FBE1E3;color:#B03340;border-color:transparent}
.botao.zap,button.zap{background:#DCF3E7;color:#1D7A4E;border-color:transparent}
.botao.pequeno,button.pequeno{padding:7px 11px;font-size:13px;min-height:0}
.acoes{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;align-items:center}
.etiqueta{display:inline-block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:3px 9px;border-radius:999px;white-space:nowrap}
.e-pendente{background:#FBF0DC;color:#A66B13}.e-confirmado{background:#E3D5F1;color:#6A1B9A}.e-concluido{background:#DCF3E7;color:#1D7A4E}
.e-cancelado{background:#FBE1E3;color:#B03340}.e-nao_compareceu{background:#EEE9EF;color:var(--suave)}
.e-recebida{background:#DCF3E7;color:#1D7A4E}.e-vencida{background:#FBE1E3;color:#B03340}.e-estornada,.e-cancelada{background:#EEE9EF;color:var(--suave)}
.e-lead{background:#EDE0F5;color:#6A1B9A}.e-ativa{background:#DCF3E7;color:#1D7A4E}.e-inativa{background:#EEE9EF;color:var(--suave)}
.e-vencida-unha{background:var(--erro);color:#fff}.e-niver{background:#FFF3D6;color:#8A6200}
.mudo{color:var(--suave);font-size:13.5px}.direita{text-align:right}.valor{color:var(--dourado);font-weight:700}
.pilulas{display:flex;gap:8px;overflow-x:auto;padding:2px 0;margin:0 0 14px;scrollbar-width:none}
.pilulas::-webkit-scrollbar{display:none}
.pill{flex:0 0 auto;padding:8px 16px;border-radius:999px;background:var(--papel);border:1.5px solid var(--linha);font-weight:600;font-size:13.5px;color:var(--suave);text-decoration:none;white-space:nowrap}
.pill.ativa{background:var(--grad);color:#fff;border-color:transparent}
.pill .n{display:inline-block;min-width:18px;padding:0 5px;border-radius:999px;background:var(--erro);color:#fff;font-size:11px;margin-left:5px;text-align:center}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{padding:9px 13px;border-radius:12px;background:var(--papel);border:1.5px solid var(--linha);font-size:13px;font-weight:600;cursor:pointer}
.chip input{display:none}.chip:has(input:checked){background:var(--rosa);border-color:var(--rosa);color:#fff}
.banner{background:#FBE1E3;color:#8E2733;border-radius:14px;padding:13px 16px;font-size:13.5px;font-weight:600;display:block;text-decoration:none;margin-bottom:14px}
.banner.suave{background:#FFF3D6;color:#7A5410}
.ag{background:var(--papel);border:1.5px solid var(--linha);border-left:4px solid var(--alerta);border-radius:14px;padding:11px 13px;display:flex;gap:12px;align-items:center;margin-bottom:9px;text-decoration:none;color:inherit}
.ag:hover{box-shadow:0 4px 14px rgba(233,30,140,.10)}
.ag.confirmado{border-left-color:var(--lilas)}.ag.concluido{border-left-color:var(--ok);opacity:.78}.ag.cancelado,.ag.nao_compareceu{border-left-color:var(--erro);opacity:.6}
.ag .hora{font-weight:700;min-width:48px}.ag .hora small{display:block;font-weight:500;color:var(--suave);font-size:11.5px}
.ag .meio{flex:1;min-width:0}.ag .meio b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ag .meio span{font-size:13px;color:var(--suave);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.ag .fim{text-align:right}
.mapa{overflow-x:auto;background:var(--papel);border:1.5px solid var(--linha);border-radius:16px;padding:12px}
.mapa .grid{display:flex;gap:8px;position:relative}
.mapa .horas{flex:0 0 46px;position:relative}.mapa .horas span{position:absolute;font-size:11px;font-weight:600;color:var(--suave);transform:translateY(-50%)}
.mapa .col{flex:1 1 0;min-width:130px;position:relative;background:#FDF5FA;border-radius:12px}
.mapa .col h4{margin:0;text-align:center;font-size:12.5px;padding:5px 2px;color:var(--suave)}
.mapa .slot{position:absolute;left:0;right:0;border-top:1px dashed var(--linha)}
.mapa .bloco{position:absolute;left:4px;right:4px;border-radius:10px;padding:4px 8px;font-size:11.5px;font-weight:600;color:#fff;overflow:hidden;text-decoration:none;box-shadow:0 2px 6px rgba(45,27,46,.18)}
.mapa .bloco small{display:block;font-weight:500;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.barra{display:flex;align-items:center;gap:10px;margin:7px 0}
.barra .rot{flex:0 0 120px;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.barra .trilho{flex:1;height:13px;background:#F6EAF2;border-radius:999px;overflow:hidden}
.barra .trilho i{display:block;height:100%;background:var(--grad);border-radius:999px;min-width:3px}
.barra.neg .trilho i{background:var(--erro)}
.barra .num{flex:0 0 auto;font-size:12.5px;font-weight:700}
footer{text-align:center;color:var(--suave);font-size:12px;padding:20px}footer a{color:var(--suave)}
.entrada{max-width:420px;margin:48px auto}.entrada .cartao{padding:26px}
.avatar{display:inline-flex;width:38px;height:38px;border-radius:50%;background:var(--rosa-claro);color:var(--rosa-escuro);align-items:center;justify-content:center;font-weight:700;font-size:13px;flex:0 0 auto}
details summary{cursor:pointer;font-weight:600;color:var(--rosa-escuro)}
.qr{max-width:220px;border-radius:12px;border:1.5px solid var(--linha)}
code.pix{display:block;font-size:11px;word-break:break-all;background:#FDF4F9;border-radius:10px;padding:10px;border:1.5px solid var(--linha)}
@media print{header.topo,nav.sub,footer,.acoes,.nao-imprime{display:none}body{background:#fff}main{padding:0}}
@media (max-width:640px){h1{font-size:21px}td,th{padding:7px 6px}}
`;

function menu(u: Usuario | null, ativo?: string): string {
  if (!u) return "";
  const itens: [string, string, boolean][] = [
    ["/", "Hoje", true],
    ["/agenda", "Agenda", true],
    ["/clientes", "Clientes", true],
    ["/caixa", "Caixa", pode(u.papel, "financeiro")],
    ["/relatorios", "Relatórios", pode(u.papel, "financeiro")],
    ["/configuracoes", "Configurações", pode(u.papel, "tarifas")],
  ];
  return "<nav>" + itens.filter(([, , v]) => v)
    .map(([h, t]) => `<a href="${h}"${ativo === h ? ' class="ativo"' : ""}>${t}</a>`).join("") + "</nav>";
}

const SUBMENUS: Record<string, [string, string, "operar" | "financeiro" | "tarifas" | "configurar"][]> = {
  "/": [["/", "Hoje", "operar"], ["/agenda", "Agenda", "operar"], ["/agenda/novo", "Novo horário", "operar"]],
  "/agenda": [["/agenda", "Dia", "operar"], ["/agenda/mapa", "Mapa", "operar"], ["/agenda/semana", "Semana", "operar"], ["/agenda/novo", "Novo horário", "operar"]],
  "/clientes": [["/clientes", "Todas", "operar"], ["/clientes?filtro=vencidas", "Unha vencida", "operar"], ["/clientes?filtro=aniversarios", "Aniversários", "operar"], ["/clientes?filtro=leads", "Leads", "operar"], ["/clientes/nova", "Nova cliente", "operar"]],
  "/caixa": [["/caixa", "Caixa", "financeiro"], ["/caixa/venda", "Venda de produto", "financeiro"], ["/caixa/lancar", "Receita / despesa", "financeiro"], ["/relatorios", "Relatórios", "financeiro"]],
  "/relatorios": [["/relatorios", "Mês", "financeiro"], ["/caixa", "Caixa", "financeiro"]],
  "/configuracoes": [["/configuracoes", "Studio", "tarifas"], ["/configuracoes/servicos", "Serviços", "tarifas"], ["/configuracoes/produtos", "Produtos", "tarifas"], ["/configuracoes/equipe", "Equipe", "tarifas"], ["/configuracoes/planos", "Planos e assinaturas", "tarifas"], ["/configuracoes/asaas", "Asaas do studio", "configurar"], ["/configuracoes/cobranca", "Cobrança do ClavusOS", "configurar"], ["/configuracoes/auditoria", "Auditoria", "configurar"], ["/configuracoes/exportar", "Exportar dados", "configurar"]],
};

function submenu(u: Usuario | null, ativo: string | undefined, caminho: string | undefined): string {
  if (!u) return "";
  const itens = (ativo && SUBMENUS[ativo] ? SUBMENUS[ativo] : []).filter(([, , p]) => pode(u.papel, p));
  if (itens.length < 2) return "";
  const atual = caminho ?? ativo ?? "";
  const ativoItem = [...itens].sort((a, b) => b[0].length - a[0].length)
    .find(([h]) => atual === h.split("?")[0] || (h !== "/" && atual.startsWith(h.split("?")[0] + "/")))?.[0] ?? "";
  return `<nav class="sub" aria-label="Seção"><div class="c">${itens.map(([h, t]) => `<a href="${h}"${h === ativoItem ? ' class="ativo"' : ""}>${t}</a>`).join("")}</div></nav>`;
}

export function pagina(p: Pagina): string {
  const s = p.studio;
  const avisos = (p.avisos ?? []).map((a) => `<div class="aviso ${a.tipo}">${a.html ? a.texto : e(a.texto)}</div>`).join("");
  const marca = s.logo_url
    ? `<img src="${e(s.logo_url)}" alt=""> ${e(s.nome)}`
    : `${simbolo({ tamanho: 24, cor: "#fff", gota: "#FFE082" })} ${e(s.nome)}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${e(p.titulo)} · ${e(s.nome)}</title>
<meta name="theme-color" content="${e(s.cor)}"><link rel="icon" href="/assets/icone.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap">
<style>${CSS}:root{--cor:${e(s.cor)}}</style></head>
<body><header class="topo"><div class="c"><a class="marca" href="/">${marca}</a>${menu(p.usuario, p.ativo)}
${p.usuario ? `<span class="quem"><span>${e(p.usuario.nome)} · </span><a href="/sair">sair</a></span>` : ""}</div></header>${submenu(p.usuario, p.ativo, p.caminho)}
<main${p.largo ? ' class="largo"' : ""}>${avisos}${p.conteudo}</main>
<footer>${s.assinatura_clavus ? `${e(s.nome)} · com tecnologia <b>ClavusOS</b> — AF Tecnologia` : e(s.nome)}</footer>
<script src="/assets/app.js" defer></script></body></html>`;
}

/** Rótulos amigáveis das situações. */
export const SITUACAO: Record<string, string> = {
  pendente: "Pendente", confirmado: "Confirmado", concluido: "Concluído", cancelado: "Cancelado", nao_compareceu: "Faltou",
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
