/** O que toda rota recebe: pedido, studio, usuário, ambiente e os serviços externos. */
import type { Pedido } from "./pedido.ts";
import type { Studio } from "../studio/studio.ts";
import type { Usuario } from "../auth/sessao.ts";
import type { Ambiente } from "../ambiente.ts";
import type { Enviador } from "../correio/correio.ts";
import type { Fetch } from "../cobrancas/asaas.ts";
import { html, redirecionar, type Resposta } from "./resposta.ts";
import { cookieSessao, apagarCookie } from "./cookie.ts";
import { pagina, type Aviso } from "../telas/base.ts";
import { comStudio, erroDeRegra, type Executor, type Papel } from "../db/contexto.ts";
import { hojeEm, type DiaISO } from "../dados/datas.ts";

export type Servicos = { ambiente: Ambiente; enviar: Enviador; fetchFn?: Fetch; agora: () => Date };

export type Web = {
  pedido: Pedido; studio: Studio; usuario: Usuario; servicos: Servicos; hoje: DiaISO; avisos: Aviso[];
  /** Transação com o contexto do usuário logado. */
  db<T>(trabalho: (db: Executor) => Promise<T>, papel?: Papel): Promise<T>;
  tela(titulo: string, conteudo: string, opc?: { ativo?: string; largo?: boolean; status?: number }): Resposta;
  voltar(para: string, aviso?: Aviso): Resposta;
};

export const COOKIE_AVISO = "clavus_aviso";

export function montarWeb(pedido: Pedido, studio: Studio, usuario: Usuario, servicos: Servicos, avisos: Aviso[]): Web {
  const seguro = servicos.ambiente.modo === "producao";
  return {
    pedido, studio, usuario, servicos, avisos,
    hoje: hojeEm(studio.fuso, servicos.agora()),
    db: (trabalho, papel) => comStudio({ studioId: studio.id, usuarioId: usuario.id, papel: papel ?? usuario.papel, fuso: studio.fuso }, trabalho),
    tela: (titulo, conteudo, opc = {}) => html(pagina({ titulo, studio, usuario, conteudo, avisos, ativo: opc.ativo, largo: opc.largo, caminho: pedido.caminho, busca: pedido.query.toString() }), opc.status ?? 200,
      avisos.length ? { "set-cookie": apagarCookie(COOKIE_AVISO, seguro) } : {}),
    voltar: (para, aviso) => redirecionar(para, aviso ? { "set-cookie": cookieSessao(COOKIE_AVISO, `${aviso.tipo}:${aviso.texto}`, { maxAgeSeg: 60, seguro }) } : {}),
  };
}

export function lerAvisoDoCookie(valor: string | undefined): Aviso[] {
  if (!valor) return [];
  const i = valor.indexOf(":");
  const tipo = valor.slice(0, i) as Aviso["tipo"];
  if (!["ok", "erro", "atencao"].includes(tipo)) return [];
  return [{ tipo, texto: valor.slice(i + 1) }];
}

/** Executa uma ação; erro de regra vira aviso e volta à tela de origem. */
export type Destino = string | void | { para: string; aviso?: Aviso };
export async function tentar(w: Web, para: string, ok: string | null, acao: () => Promise<Destino>): Promise<Resposta> {
  try {
    const d = await acao();
    if (d && typeof d === "object") return w.voltar(d.para, d.aviso);
    return w.voltar(d || para, ok ? { tipo: "ok", texto: ok } : undefined);
  } catch (err) {
    const msg = erroDeRegra(err) ?? (err as Error).message ?? "Não deu certo.";
    if (!erroDeRegra(err) && !(err instanceof Error && /^[A-ZÀ-Úa-z]/.test(msg) && msg.length < 300)) console.error("[rota]", err);
    return w.voltar(para, { tipo: "erro", texto: msg });
  }
}
