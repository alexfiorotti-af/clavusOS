/** Rotas da operação: Hoje, agenda, clientes, caixa e relatórios. */
import type { Resposta } from "./resposta.ts";
import { campo, lerFormulario, marcado, inteiro } from "./formulario.ts";
import { tentar, type Web } from "./contexto-web.ts";
import { pode } from "../auth/sessao.ts";
import { somarDias, diaDaSemana, diaValido, horaValida, hojeEm, type DiaISO } from "../dados/datas.ts";
import { lerReais } from "../dados/dinheiro.ts";
import * as Ag from "../agenda/agenda.ts";
import { gradeDoDia, type Ocupado } from "../agenda/horarios.ts";
import * as Cli from "../clientes/clientes.ts";
import * as Cx from "../caixa/caixa.ts";
import * as Rel from "../caixa/relatorios.ts";
import { assinaturaDaCliente } from "../planos/planos.ts";
import { emitirCobranca, cobrancasDaCliente, lerCobranca } from "../cobrancas/cobrancas.ts";
import { enviarRegistrando } from "../correio/correio.ts";
import { confirmacaoDeHorario, sinalPendente } from "../correio/mensagens.ts";
import * as TA from "../telas/agenda.ts";
import * as TC from "../telas/clientes.ts";
import * as TX from "../telas/caixa.ts";

async function listas(w: Web): Promise<{ servicos: TA.Srv[]; profs: TA.Prof[] }> {
  return w.db(async (db) => ({
    servicos: (await db.query<TA.Srv>("SELECT id, nome, preco, duracao_min, cor, ativo FROM servicos WHERE ativo ORDER BY nome")).rows,
    profs: (await db.query<TA.Prof>("SELECT id, nome, cor, ativo FROM profissionais WHERE ativo ORDER BY nome")).rows,
  }));
}
async function diasComAg(w: Web, de: DiaISO, dias: number): Promise<Set<DiaISO>> {
  return w.db(async (db) => new Set((await db.query<{ d: string }>(
    "SELECT DISTINCT data::text AS d FROM agendamentos WHERE ativo AND data BETWEEN $1 AND $2", [de, somarDias(de, dias)])).rows.map((x) => x.d)));
}
const diaDaQuery = (w: Web): DiaISO => {
  const d = w.pedido.query.get("dia");
  return diaValido(d) ? d : w.hoje;
};

export async function rotasApp(w: Web): Promise<Resposta | null> {
  const p = w.pedido;

  if (p.caminho === "/" && p.metodo === "GET") {
    const { ags, total, n } = await w.db(async (db) => ({
      ags: await Ag.doDia(db, w.hoje),
      total: +(await db.query<{ s: string }>("SELECT COALESCE(SUM(preco),0)::text AS s FROM agendamentos WHERE data = $1 AND ativo", [w.hoje])).rows[0].s,
      n: await Cli.contagens(db, w.hoje),
    }));
    return w.tela("Hoje", TA.telaHoje({ studio: w.studio, hoje: w.hoje, ags, totalDia: total, vencidas: n.vencidas, aniversarios: n.aniversarios }), { ativo: "/" });
  }

  /* ---------- o botão "+": criar qualquer coisa ---------- */
  if (p.caminho === "/novo" && p.metodo === "GET") {
    return w.tela("Criar", TA.telaCriar({ hoje: w.hoje, financeiro: pode(w.usuario.papel, "financeiro") }), { ativo: "/novo" });
  }

  /* ---------- agenda ---------- */
  if (p.caminho === "/agenda" && p.metodo === "GET") {
    const dia = diaDaQuery(w);
    const [ags, comAg] = [await w.db((db) => Ag.doDia(db, dia)), await diasComAg(w, w.hoje, 14)];
    const total = ags.filter((a) => a.ativo).reduce((s, a) => s + a.preco, 0);
    return w.tela("Agenda", TA.telaDia({ hoje: w.hoje, dia, ags, total, comAg }), { ativo: "/agenda" });
  }
  if (p.caminho === "/agenda/semana" && p.metodo === "GET") {
    const base = diaDaQuery(w);
    const ini = somarDias(base, -((diaDaSemana(base) + 6) % 7));
    const lst = await w.db((db) => Ag.doPeriodo(db, ini, somarDias(ini, 6)));
    const porDia = new Map<DiaISO, Ag.Agendamento[]>();
    for (const a of lst) { (porDia.get(a.data) ?? porDia.set(a.data, []).get(a.data)!).push(a); }
    return w.tela("Semana", TA.telaSemana({ hoje: w.hoje, ini, porDia }), { ativo: "/agenda" });
  }
  if (p.caminho === "/agenda/mapa" && p.metodo === "GET") {
    const dia = diaDaQuery(w);
    const [{ profs }, ags, comAg] = [await listas(w), await w.db((db) => Ag.doDia(db, dia)), await diasComAg(w, w.hoje, 14)];
    return w.tela("Mapa", TA.telaMapa({ studio: w.studio, hoje: w.hoje, dia, ags, profs, comAg }), { ativo: "/agenda", largo: true });
  }

  if (p.caminho === "/agenda/novo") {
    const { servicos, profs } = await listas(w);
    if (p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      const dia = campo(f, "dia"), inicio = campo(f, "inicio");
      return tentar(w, p.caminho + "?dia=" + (diaValido(dia) ? dia : w.hoje), "Horário salvo ✨", async () => {
        if (!diaValido(dia) || !horaValida(inicio)) throw new Error("Preencha data e horário.");
        const servicoId = campo(f, "servico_id"), clienteId = campo(f, "cliente_id");
        if (!servicoId) throw new Error("Escolha o serviço.");
        const encaixe = marcado(f, "encaixe") && pode(w.usuario.papel, "encaixe");
        const preco = lerReais(campo(f, "preco"));
        const duracao = inteiro(f, "duracao", 0) || undefined;
        const editar = campo(f, "editar");
        if (editar) {
          await w.db((db) => Ag.remarcar(db, w.studio.id, editar, {
            data: dia, inicio, profissionalId: campo(f, "profissional_id") || null,
            duracaoMin: duracao ?? null, encaixe, usuarioId: w.usuario.id,
          }));
          return { para: `/agenda/${editar}`, aviso: { tipo: "ok" as const, texto: "Horário remarcado ✨" } };
        }
        if (!clienteId) throw new Error("Escolha a cliente.");
        const a = await w.db((db) => Ag.criarAgendamento(db, w.studio.id, {
          clienteId, servicoId, profissionalId: campo(f, "profissional_id") || null,
          data: dia, inicio, duracaoMin: duracao, preco: preco ?? undefined,
          encaixe, observacoes: campo(f, "observacoes"), usuarioId: w.usuario.id,
        }));
        if (a.cliente_email) {
          await w.db((db) => enviarRegistrando(db, w.studio, w.servicos.enviar, w.servicos.ambiente.emailRemetente, {
            agendamentoId: a.id, tipo: "confirmacao",
            mensagem: confirmacaoDeHorario(w.studio, { clienteNome: a.cliente_nome!, servico: a.servico_nome!, data: a.data, inicio: a.inicio, para: a.cliente_email!, codigo: a.codigo }),
          }));
        }
        return { para: `/agenda?dia=${dia}`, aviso: { tipo: "ok" as const, texto: `Horário ${a.codigo} salvo ✨` } };
      });
    }
    const dia = diaDaQuery(w);
    const editarId = p.query.get("editar");
    const editando = editarId ? await w.db((db) => Ag.lerAgendamento(db, editarId)) : null;
    const f = {
      clienteId: p.query.get("cliente") ?? editando?.cliente_id ?? undefined,
      servicoId: p.query.get("servico") ?? undefined,
      profissionalId: p.query.get("prof") ?? undefined,
      dia, inicio: p.query.get("inicio") ?? undefined,
    };
    const srv = servicos.find((s) => s.id === f.servicoId);
    const ocupados: Ocupado[] = srv ? (await w.db((db) => Ag.doDia(db, dia)))
      .filter((a) => a.ativo && a.id !== editando?.id)
      .map((a) => ({ inicio: a.inicio, duracaoMin: a.duracao_min, profissionalId: a.profissional_id, rotulo: (a.cliente_nome ?? "").split(" ")[0] })) : [];
    const slots = srv ? gradeDoDia({ abre: w.studio.abre, fecha: w.studio.fecha, passoMin: w.studio.slot_minutos, duracaoMin: srv.duracao_min, ocupados, profissionalId: f.profissionalId ?? null }) : [];
    const clientes = await w.db((db) => Cli.buscarClientes(db, { hoje: w.hoje, limite: 400 }));
    return w.tela(editando ? "Remarcar" : "Novo horário", TA.telaNovo({
      hoje: w.hoje, f, servicos, profs, slots, clientes, podeEncaixe: pode(w.usuario.papel, "encaixe"), editando,
    }), { ativo: "/agenda" });
  }

  const mAg = /^\/agenda\/([0-9a-f-]{36})(\/(confirmar|concluir|cancelar|cobrar))?$/.exec(p.caminho);
  if (mAg) {
    const id = mAg[1], acao = mAg[3];
    const a = await w.db((db) => Ag.lerAgendamento(db, id));
    if (!a) return w.voltar("/agenda", { tipo: "erro", texto: "Atendimento não encontrado." });
    if (!acao && p.metodo === "GET") {
      const cobrancas = pode(w.usuario.papel, "financeiro")
        ? await w.db(async (db) => (await db.query<import("../cobrancas/cobrancas.ts").Cobranca>(
            "SELECT *, vencimento::text AS vencimento FROM cobrancas WHERE agendamento_id = $1 ORDER BY criado_em DESC", [id])).rows)
        : [];
      return w.tela(a.codigo, TA.telaDetalhe({ a, hoje: w.hoje, cobrancas, temAsaas: !!w.studio.asaas_chave_cifrada, podeFinanceiro: pode(w.usuario.papel, "financeiro"), whats: w.studio.telefone }), { ativo: "/agenda" });
    }
    if (acao === "confirmar" && p.metodo === "POST") {
      return tentar(w, `/agenda/${id}`, "Confirmado! 💖", () => w.db((db) => Ag.confirmar(db, w.studio.id, id, w.usuario.id)));
    }
    if (acao === "concluir") {
      if (p.metodo === "GET") return w.tela("Concluir", TA.telaConcluir(a, Cx.FORMAS), { ativo: "/agenda" });
      const f = lerFormulario(p.corpo);
      return tentar(w, `/agenda/${id}`, "Atendimento concluído ✨ Receita no caixa", () =>
        w.db((db) => Ag.concluir(db, w.studio.id, id, { forma: campo(f, "forma") || null, precoFinal: lerReais(campo(f, "preco")), usuarioId: w.usuario.id })));
    }
    if (acao === "cancelar" && p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      return tentar(w, `/agenda/${id}`, "Horário cancelado", () =>
        w.db((db) => Ag.cancelar(db, w.studio.id, id, { motivo: campo(f, "motivo") || null, faltou: marcado(f, "faltou"), usuarioId: w.usuario.id })));
    }
    if (acao === "cobrar") {
      if (!pode(w.usuario.papel, "financeiro")) return w.voltar(`/agenda/${id}`, { tipo: "erro", texto: "Seu perfil não emite cobrança." });
      if (p.metodo === "GET") return w.tela("Cobrar", TA.telaCobrar(a, w.hoje), { ativo: "/agenda" });
      const f = lerFormulario(p.corpo);
      return tentar(w, `/agenda/${id}/cobrar`, null, async () => {
        const valor = lerReais(campo(f, "valor"));
        if (!valor) throw new Error("Informe o valor.");
        const venc = campo(f, "vencimento");
        const c = await w.db((db) => emitirCobranca(db, w.studio, w.servicos.ambiente.chaveMestra, {
          clienteId: a.cliente_id, agendamentoId: a.id,
          finalidade: campo(f, "finalidade") === "servico" ? "servico" : "sinal",
          meio: campo(f, "meio") === "link" ? "link" : "pix", valor,
          vencimento: diaValido(venc) ? venc : somarDias(w.hoje, 1),
          descricao: `${campo(f, "finalidade") === "servico" ? "Pagamento" : "Sinal"} do horário ${a.codigo} — ${a.servico_nome}`,
          usuarioId: w.usuario.id,
        }, w.servicos.fetchFn));
        if (a.cliente_email) {
          await w.db((db) => enviarRegistrando(db, w.studio, w.servicos.enviar, w.servicos.ambiente.emailRemetente, {
            agendamentoId: a.id, tipo: `cobranca_${c.finalidade}`,
            mensagem: sinalPendente(w.studio, { clienteNome: a.cliente_nome!, servico: a.servico_nome!, data: a.data, inicio: a.inicio, para: a.cliente_email!, valor: c.valor, url: c.url_fatura, pix: c.pix_copia_cola }),
          }));
        }
        return { para: `/agenda/${id}/cobranca/${c.id}` };
      });
    }
  }
  const mCob = /^\/agenda\/([0-9a-f-]{36})\/cobranca\/([0-9a-f-]{36})$/.exec(p.caminho);
  if (mCob && p.metodo === "GET") {
    const [a, c] = await w.db(async (db) => [await Ag.lerAgendamento(db, mCob[1]), await lerCobranca(db, mCob[2])] as const);
    if (!a || !c) return w.voltar("/agenda", { tipo: "erro", texto: "Cobrança não encontrada." });
    return w.tela("Cobrança criada", TA.telaCobrancaPronta(a, c), { ativo: "/agenda" });
  }

  /* ---------- clientes ---------- */
  if (p.caminho === "/clientes" && p.metodo === "GET") {
    const filtro = (p.query.get("filtro") ?? "todas") as "todas" | "vencidas" | "aniversarios" | "leads";
    const q = p.query.get("q") ?? "";
    const [lista, n] = await w.db(async (db) => [
      await Cli.buscarClientes(db, { q, filtro: ["vencidas", "aniversarios", "leads"].includes(filtro) ? filtro : "todas", hoje: w.hoje }),
      await Cli.contagens(db, w.hoje)] as const);
    return w.tela("Clientes", TC.telaClientes({ hoje: w.hoje, studioNome: w.studio.nome, filtro, q, lista, n }), { ativo: "/clientes" });
  }
  if (p.caminho === "/clientes/nova") {
    if (p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      const voltar = campo(f, "voltar");
      return tentar(w, "/clientes", "Cliente salva 💕", async () => {
        if (!campo(f, "nome")) throw new Error("Dê um nome pra ela 🌸");
        const id = await w.db((db) => Cli.salvarCliente(db, w.studio.id, {
          nome: campo(f, "nome"), cpf: campo(f, "cpf"), nascimento: diaValido(campo(f, "nascimento")) ? campo(f, "nascimento") : "",
          email: campo(f, "email"), telefone: campo(f, "telefone"), cep: campo(f, "cep"), endereco: campo(f, "endereco"),
          cidade: campo(f, "cidade"), uf: campo(f, "uf"), origem: campo(f, "origem"), situacao: campo(f, "situacao"),
          observacoes: campo(f, "observacoes"), usuarioId: w.usuario.id,
        }));
        return { para: voltar && voltar.startsWith("/") ? voltar : `/clientes/${id}`, aviso: { tipo: "ok" as const, texto: "Cliente salva 💕" } };
      });
    }
    return w.tela("Nova cliente", TC.telaClienteForm({ voltar: p.query.get("voltar") ?? undefined }), { ativo: "/clientes" });
  }
  const mCli = /^\/clientes\/([0-9a-f-]{36})(\/editar)?$/.exec(p.caminho);
  if (mCli) {
    const c = await w.db((db) => Cli.lerCliente(db, mCli[1]));
    if (!c) return w.voltar("/clientes", { tipo: "erro", texto: "Cliente não encontrada." });
    if (mCli[2] && p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      return tentar(w, `/clientes/${c.id}`, "Cliente salva 💕", () => w.db((db) => Cli.salvarCliente(db, w.studio.id, {
        id: c.id, nome: campo(f, "nome") || c.nome, cpf: campo(f, "cpf"), nascimento: diaValido(campo(f, "nascimento")) ? campo(f, "nascimento") : "",
        email: campo(f, "email"), telefone: campo(f, "telefone"), cep: campo(f, "cep"), endereco: campo(f, "endereco"),
        cidade: campo(f, "cidade"), uf: campo(f, "uf"), origem: campo(f, "origem"), situacao: campo(f, "situacao"),
        observacoes: campo(f, "observacoes"), usuarioId: w.usuario.id,
      })));
    }
    if (mCli[2]) return w.tela("Editar cliente", TC.telaClienteForm({ c }), { ativo: "/clientes" });
    const [hist, assinatura] = await w.db(async (db) => [await Ag.daCliente(db, c.id), await assinaturaDaCliente(db, c.id)] as const);
    return w.tela(c.nome, TC.telaCliente({ c, hoje: w.hoje, studioNome: w.studio.nome, hist, assinatura }), { ativo: "/clientes" });
  }

  /* ---------- caixa ---------- */
  if (p.caminho === "/caixa" && p.metodo === "GET") {
    if (!pode(w.usuario.papel, "financeiro")) return w.voltar("/", { tipo: "erro", texto: "Seu perfil não vê o caixa." });
    const per = p.query.get("per") === "mes" ? "mes" as const : "hoje" as const;
    const de = per === "hoje" ? w.hoje : w.hoje.slice(0, 8) + "01";
    const [resumo, lst] = await w.db(async (db) => [await Cx.resumoDoPeriodo(db, de, w.hoje), await Cx.lancamentosDoPeriodo(db, de, w.hoje)] as const);
    return w.tela("Caixa", TX.telaCaixa({ hoje: w.hoje, per, resumo, lst, podeAnular: pode(w.usuario.papel, "financeiro") }), { ativo: "/caixa" });
  }
  if (p.caminho === "/caixa/lancar") {
    if (!pode(w.usuario.papel, "financeiro")) return w.voltar("/", { tipo: "erro", texto: "Seu perfil não lança no caixa." });
    if (p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      const tipo = campo(f, "tipo") === "despesa" ? "despesa" as const : "receita" as const;
      return tentar(w, "/caixa", tipo === "despesa" ? "Despesa lançada 📉" : "Receita lançada ✨", async () => {
        const valor = lerReais(campo(f, "valor"));
        if (!campo(f, "descricao") || !valor) throw new Error("Preencha descrição e valor 🌸");
        const dia = campo(f, "data");
        await w.db((db) => Cx.lancar(db, w.studio.id, {
          tipo, categoria: campo(f, "categoria") || "Outra", descricao: campo(f, "descricao"),
          valor, forma: campo(f, "forma") || null, data: diaValido(dia) ? dia : w.hoje, usuarioId: w.usuario.id,
        }));
      });
    }
    return w.tela("Lançar", TX.telaLancar(p.query.get("tipo") === "despesa" ? "despesa" : "receita", w.hoje), { ativo: "/caixa" });
  }
  if (p.caminho === "/caixa/anular" && p.metodo === "POST") {
    const f = lerFormulario(p.corpo);
    return tentar(w, "/caixa", "Lançamento anulado", () =>
      w.db((db) => Cx.anularLancamento(db, w.studio.id, campo(f, "id"), campo(f, "motivo"), w.usuario.id)));
  }
  if (p.caminho === "/caixa/venda") {
    if (!pode(w.usuario.papel, "financeiro")) return w.voltar("/", { tipo: "erro", texto: "Seu perfil não registra venda." });
    const produtos = await w.db(async (db) => (await db.query<TX.ProdutoVenda>("SELECT id, nome, preco, estoque FROM produtos WHERE ativo ORDER BY nome")).rows);
    if (p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      return tentar(w, "/caixa/venda", null, async () => {
        const itens = produtos.map((pr) => ({ produtoId: pr.id, quantidade: inteiro(f, `q_${pr.id}`, 0) })).filter((i) => i.quantidade > 0);
        const { total } = await w.db((db) => Cx.venderProdutos(db, w.studio.id, {
          itens, clienteId: campo(f, "cliente_id") || null, forma: campo(f, "forma") || "pix", data: w.hoje, usuarioId: w.usuario.id,
        }));
        return { para: "/caixa", aviso: { tipo: "ok" as const, texto: `Venda registrada 🛍 (${(total / 100).toFixed(2).replace(".", ",")} reais)` } };
      });
    }
    const clientes = await w.db((db) => Cli.buscarClientes(db, { hoje: w.hoje, limite: 400 }));
    return w.tela("Venda", TX.telaVenda({ produtos, clientes }), { ativo: "/caixa" });
  }

  if (p.caminho === "/relatorios" && p.metodo === "GET") {
    if (!pode(w.usuario.papel, "financeiro")) return w.voltar("/", { tipo: "erro", texto: "Seu perfil não vê relatórios." });
    const ym = /^\d{4}-\d{2}$/.test(p.query.get("mes") ?? "") ? p.query.get("mes")! : w.hoje.slice(0, 7);
    const dados = await w.db(async (db) => ({
      resumo: await Cx.resumoDoPeriodo(db, ym + "-01", ym + "-31"),
      recCat: await Rel.porCategoria(db, ym, "receita"),
      despCat: await Rel.porCategoria(db, ym, "despesa"),
      producao: await Rel.producaoPorProfissional(db, ym),
      topSrv: await Rel.topServicos(db, ym),
      origens: await Rel.clientesPorOrigem(db, ym),
    }));
    return w.tela("Relatórios", TX.telaRelatorios({ ym, ...dados }), { ativo: "/relatorios" });
  }

  return null;
}
