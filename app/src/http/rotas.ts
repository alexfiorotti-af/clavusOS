/**
 * O roteador: de um Pedido sai uma Resposta. Ordem:
 *   1. rotas sem studio (saúde, estáticos, rotina, webhook da AF, exportar de fora);
 *   2. resolver o studio pelo Host (ou padrão); sem slug → vitrine do produto;
 *   3. rotas do studio sem login (/agendar, webhook do Asaas, entrar, convite, primeiro acesso);
 *   4. sessão; sem ela, /entrar;
 *   5. assinatura do ClavusOS (aviso/bloqueio) e as rotas logadas.
 */
import { json, redirecionar, texto, html, type Resposta, CABECALHOS_SEGUROS } from "./resposta.ts";
import { cookieSessao, apagarCookie } from "./cookie.ts";
import { lerFormulario, campo } from "./formulario.ts";
import { cabecalho, type Pedido } from "./pedido.ts";
import { slugDoHost } from "../studio/resolver.ts";
import { resolverStudio, studioPorId, type Studio } from "../studio/studio.ts";
import { COOKIE, DURACAO_SEG, entrar, sair, usuarioDaSessao } from "../auth/sessao.ts";
import { gerarHash, senhaAceitavel, novoToken, hashDoToken } from "../auth/senha.ts";
import { comStudio } from "../db/contexto.ts";
import { pagina } from "../telas/base.ts";
import { telaEntrar, telaPrimeiroAcesso, telaDefinirSenha } from "../telas/entrada.ts";
import { montarWeb, lerAvisoDoCookie, COOKIE_AVISO, type Servicos } from "./contexto-web.ts";
import { rotasApp } from "./rotas-app.ts";
import { rotasGestao } from "./rotas-gestao.ts";
import { rotasAgendar } from "./rotas-agendar.ts";
import { receberWebhook } from "../cobrancas/cobrancas.ts";
import { receberWebhookAF, situacaoAcesso } from "../assinatura/assinatura.ts";
import { rotinaGeral, studiosAtivos } from "../rotina/rotina.ts";
import { estatico } from "./estaticos.ts";
import { exportarStudio } from "../ferramentas/exportar.ts";
import { telaBloqueado } from "../telas/cobranca.ts";
import { telaVitrine, telaStudioNaoEncontrado, telaSuspenso } from "../telas/site.ts";
import { br } from "../dados/datas.ts";
import { timingSafeEqual } from "node:crypto";

function iguais(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function atender(p: Pedido, s: Servicos): Promise<Resposta> {
  const r = await despachar(p, s);
  return { ...r, cabecalhos: { ...CABECALHOS_SEGUROS, ...r.cabecalhos } };
}

async function despachar(p: Pedido, s: Servicos): Promise<Resposta> {
  const { ambiente } = s;
  // 1. sem studio
  if (p.caminho === "/saude") return json({ ok: true, hora: s.agora().toISOString() });
  if (p.caminho.startsWith("/assets/")) return estatico(p.caminho.slice(8)) ?? texto("não encontrado", 404);
  if (p.caminho === "/rotina/diaria") {
    const chave = p.query.get("chave") ?? cabecalho(p, "x-chave");
    if (!ambiente.chaveRotina || !iguais(chave, ambiente.chaveRotina)) return texto("chave inválida", 401);
    return json(await rotinaGeral(s.enviar, ambiente.emailRemetente, ambiente.chaveMestra, s.fetchFn, ambiente));
  }
  if (p.caminho.startsWith("/webhooks/asaas-af/")) {
    // Conta da AF (assinatura do ClavusOS). O token vem de CLAVUS_ASAAS_AF_WEBHOOK_TOKEN.
    if (p.metodo !== "POST") return texto("método", 405);
    const token = p.caminho.slice("/webhooks/asaas-af/".length);
    const esperado = ambiente.asaasAF?.webhookToken;
    if (!esperado || !(iguais(token, esperado) || iguais(cabecalho(p, "asaas-access-token"), esperado))) return texto("token inválido", 401);
    try { return json({ ok: true, resultado: await receberWebhookAF(p.corpo ?? "", ambiente, s.fetchFn) }); }
    catch (err) { console.error("[webhook asaas-af]", (err as Error).message); return json({ ok: false }, 500); }
  }
  if (p.caminho === "/rotina/exportar") {
    // Backup de fora: JSON completo de um studio (`?slug=x`) ou a lista de slugs. Mesma chave da rotina.
    const chave = p.query.get("chave") ?? cabecalho(p, "x-chave");
    if (!ambiente.chaveRotina || !iguais(chave, ambiente.chaveRotina)) return texto("chave inválida", 401);
    const alvo = p.query.get("slug");
    if (!alvo) return json({ studios: (await studiosAtivos()).map((x) => x.slug) });
    const st = await resolverStudio(alvo);
    if (!st) return texto("studio não encontrado", 404);
    return json(await exportarStudio(st.id));
  }

  // 2. studio pelo Host
  const slug = slugDoHost(p.host, ambiente.dominioBase) ?? (ambiente.modo !== "producao" ? p.query.get("studio") : null) ?? ambiente.studioPadrao;
  if (!slug) return html(telaVitrine(ambiente));
  const resumo = await resolverStudio(slug);
  if (!resumo) return html(telaStudioNaoEncontrado(slug, ambiente), 404);
  if (resumo.situacao === "suspenso" && !p.caminho.startsWith("/webhooks/")) return html(telaSuspenso(resumo.nome), 402);
  const studio = await studioPorId(resumo.id);
  const seguro = ambiente.modo === "producao";

  // 3. sem login
  if (p.caminho === "/agendar") return rotasAgendar(p, s, studio);
  if (p.caminho.startsWith("/webhooks/asaas/")) {
    if (p.metodo !== "POST") return texto("método", 405);
    const token = p.caminho.slice("/webhooks/asaas/".length);
    if (!iguais(token, studio.asaas_webhook_token)) return texto("token inválido", 401);
    try {
      const res = await comStudio({ studioId: studio.id, papel: "sistema" }, (db) => receberWebhook(db, studio, ambiente.chaveMestra, p.corpo ?? "", s.fetchFn));
      return json({ ok: true, resultado: res });
    } catch (err) {
      console.error("[webhook asaas]", (err as Error).message);
      return json({ ok: false }, 500);
    }
  }
  const temAdmin = await comStudio({ studioId: studio.id, papel: "sistema" }, async (db) =>
    (await db.query("SELECT 1 FROM usuarios WHERE papel = 'administrador' AND senha_hash IS NOT NULL LIMIT 1")).rowCount! > 0);
  const avisosCookie = lerAvisoDoCookie(p.cookies[COOKIE_AVISO]);

  if (p.caminho === "/primeiro-acesso" || (!temAdmin && p.caminho === "/entrar")) {
    if (temAdmin) return redirecionar("/entrar");
    if (p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      const problema = senhaAceitavel(campo(f, "senha"));
      if (!campo(f, "nome") || !campo(f, "email") || problema) return html(telaPrimeiroAcesso(studio, [{ tipo: "erro", texto: problema ?? "Preencha nome, e-mail e senha." }]), 400);
      const hash = await gerarHash(campo(f, "senha"));
      await comStudio({ studioId: studio.id, papel: "sistema" }, (db) => db.query(
        "INSERT INTO usuarios (studio_id, nome, email, senha_hash, papel) VALUES ($1,$2,$3,$4,'administrador') ON CONFLICT (studio_id, email) DO UPDATE SET senha_hash = EXCLUDED.senha_hash, papel = 'administrador', ativo = true",
        [studio.id, campo(f, "nome"), campo(f, "email").toLowerCase(), hash]));
      return entrarEIr(studio, campo(f, "email"), campo(f, "senha"), p.ip, seguro, "/configuracoes/servicos");
    }
    return html(telaPrimeiroAcesso(studio, avisosCookie));
  }
  if (p.caminho === "/entrar") {
    if (p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      return entrarEIr(studio, campo(f, "email"), campo(f, "senha"), p.ip, seguro, p.query.get("ir")?.startsWith("/") ? p.query.get("ir")! : "/");
    }
    return html(telaEntrar(studio, avisosCookie), 200, avisosCookie.length ? { "set-cookie": apagarCookie(COOKIE_AVISO, seguro) } : {});
  }
  if (p.caminho === "/sair") {
    await sair(studio.id, p.cookies[COOKIE]);
    return redirecionar("/entrar", { "set-cookie": apagarCookie(COOKIE, seguro) });
  }
  if (p.caminho.startsWith("/convite/")) return convite(p, studio, seguro);
  if (p.caminho === "/senha/esqueci") return esqueci(p, studio, s);
  if (p.caminho.startsWith("/senha/redefinir/")) return convite(p, studio, seguro);

  // 4. sessão
  const usuario = await usuarioDaSessao(studio.id, p.cookies[COOKIE]);
  if (!usuario) return redirecionar("/entrar" + (p.caminho !== "/" && p.metodo === "GET" ? `?ir=${encodeURIComponent(p.caminho)}` : ""));
  const w = montarWeb(p, studio, usuario, s, avisosCookie);

  // 5. assinatura do ClavusOS: faixa de aviso ou bloqueio
  const acesso = situacaoAcesso(studio, w.hoje, ambiente.carenciaDias);
  const admin = usuario.papel === "administrador";
  if (acesso.estado === "bloqueado") {
    const livre = p.caminho.startsWith("/configuracoes/cobranca") || p.caminho === "/configuracoes/exportar";
    if (!(admin && livre)) return html(pagina({ titulo: "Acesso bloqueado", studio, usuario: null, conteudo: telaBloqueado(studio, acesso, admin) }), 402);
  } else if (acesso.estado === "teste" && admin && !p.caminho.startsWith("/configuracoes/cobranca")) {
    w.avisos.push({ tipo: "atencao", texto: `Teste gratuito do ClavusOS até ${br(acesso.ate!)} (${acesso.diasRestantes} dia${acesso.diasRestantes === 1 ? "" : "s"}). <a href="/configuracoes/cobranca">Assinar</a>`, html: true });
  } else if (acesso.estado === "ativo" && studio.plano !== "cortesia" && acesso.diasRestantes <= 3 && admin && !p.caminho.startsWith("/configuracoes/cobranca")) {
    const renova = !!studio.assinatura_asaas_id && !studio.assinatura_cancelada_em;
    w.avisos.push({ tipo: "atencao", texto: `${renova ? "Mensalidade do ClavusOS vence" : "Acesso ao ClavusOS termina"} em ${br(acesso.ate!)}: <a href="/configuracoes/cobranca">Cobrança</a>`, html: true });
  } else if (acesso.estado === "carencia" && !p.caminho.startsWith("/configuracoes/cobranca")) {
    w.avisos.push({ tipo: "erro", texto: `Pagamento do ClavusOS pendente: o sistema bloqueia em ${br(acesso.ate!)}.${admin ? ' <a href="/configuracoes/cobranca">Ver cobrança</a>' : " Avise a responsável pelo studio."}`, html: true });
  }

  return (await rotasApp(w)) ?? (await rotasGestao(w)) ?? w.tela("Não encontrado", `<h1>Página não encontrada</h1><p><a href="/">Voltar ao início</a></p>`, { status: 404 });
}

async function entrarEIr(studio: Studio, email: string, senha: string, ip: string | null, seguro: boolean, ir: string): Promise<Resposta> {
  const r = await entrar(studio.id, email, senha, ip);
  if (!r.ok) {
    const msg = r.motivo === "bloqueado" ? "Muitas tentativas. Espere 15 minutos e tente de novo." : r.motivo === "inativo" ? "Este usuário foi desativado." : "E-mail ou senha não conferem.";
    return html(telaEntrar(studio, [{ tipo: "erro", texto: msg }], email), 401);
  }
  return redirecionar(ir, { "set-cookie": cookieSessao(COOKIE, r.token, { maxAgeSeg: DURACAO_SEG, seguro }) });
}

/** /convite/<token> (3 dias) e /senha/redefinir/<token> (1 hora) — mesmo mecanismo. */
async function convite(p: Pedido, studio: Studio, seguro: boolean): Promise<Resposta> {
  const token = p.caminho.split("/").pop() ?? "";
  const u = await comStudio({ studioId: studio.id, papel: "sistema" }, async (db) =>
    (await db.query<{ id: string; nome: string; email: string }>("SELECT id, nome, email FROM usuarios WHERE convite_token = $1 AND convite_expira > now() AND ativo", [hashDoToken(token)])).rows[0]);
  if (!u) return html(telaEntrar(studio, [{ tipo: "erro", texto: "Este link não vale mais. Peça um novo à administradora." }]), 410);
  if (p.metodo === "POST") {
    const f = lerFormulario(p.corpo);
    const problema = senhaAceitavel(campo(f, "senha")) ?? (campo(f, "senha") !== campo(f, "senha2") ? "As senhas não são iguais." : null);
    if (problema) return html(telaDefinirSenha(studio, token, u.nome, [{ tipo: "erro", texto: problema }]), 400);
    const hash = await gerarHash(campo(f, "senha"));
    await comStudio({ studioId: studio.id, papel: "sistema" }, (db) => db.query("UPDATE usuarios SET senha_hash = $2, convite_token = NULL, convite_expira = NULL WHERE id = $1", [u.id, hash]));
    return entrarEIr(studio, u.email, campo(f, "senha"), p.ip, seguro, "/");
  }
  return html(telaDefinirSenha(studio, token, u.nome));
}

async function esqueci(p: Pedido, studio: Studio, s: Servicos): Promise<Resposta> {
  const form = (avisos = [] as { tipo: "ok" | "erro" | "atencao"; texto: string }[]) => html(pagina({ titulo: "Esqueci a senha", studio, usuario: null, avisos,
    conteudo: `<div class="entrada"><div class="cartao"><h1>Esqueci a senha</h1><p class="mudo">Digite seu e-mail. Se ele estiver cadastrado, mandamos um link para trocar a senha.</p><form method="post" action="/senha/esqueci"><div class="campo"><label>E-mail</label><input name="email" type="email" required></div><div class="acoes"><button>Enviar link</button> <a class="mudo" href="/entrar">voltar</a></div></form></div></div>` }));
  if (p.metodo !== "POST") return form();
  const email = campo(lerFormulario(p.corpo), "email").toLowerCase();
  const { recuperacaoDeSenha } = await import("../correio/mensagens.ts");
  const { enviarRegistrando } = await import("../correio/correio.ts");
  await comStudio({ studioId: studio.id, papel: "sistema" }, async (db) => {
    const u = (await db.query<{ id: string; nome: string }>("SELECT id, nome FROM usuarios WHERE email = $1 AND ativo", [email])).rows[0];
    if (!u) return;
    const token = novoToken();
    await db.query("UPDATE usuarios SET convite_token = $2, convite_expira = now() + interval '1 hour' WHERE id = $1", [u.id, hashDoToken(token)]);
    const url = `${s.ambiente.modo === "producao" ? "https" : "http"}://${p.host}/senha/redefinir/${token}`;
    await enviarRegistrando(db, studio, s.enviar, s.ambiente.emailRemetente, { agendamentoId: null, tipo: "senha", mensagem: { ...recuperacaoDeSenha(studio, u.nome, url), para: email } });
  });
  return form([{ tipo: "ok", texto: "Se o e-mail estiver cadastrado, o link chega em instantes." }]);
}
