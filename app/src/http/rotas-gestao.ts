/** Rotas de configuração: studio, serviços, produtos, equipe, planos, Asaas, cobrança do ClavusOS, auditoria, exportar. */
import { json, type Resposta } from "./resposta.ts";
import { campo, lerFormulario, inteiro, marcado } from "./formulario.ts";
import { tentar, type Web } from "./contexto-web.ts";
import { pode, type Usuario } from "../auth/sessao.ts";
import { gerarHash, novoToken, hashDoToken, senhaAceitavel } from "../auth/senha.ts";
import { cifrar } from "../dados/cofre.ts";
import { lerReais } from "../dados/dinheiro.ts";
import { diaValido, horaValida } from "../dados/datas.ts";
import { Asaas } from "../cobrancas/asaas.ts";
import * as Pl from "../planos/planos.ts";
import * as Cli from "../clientes/clientes.ts";
import * as Ass from "../assinatura/assinatura.ts";
import { enviarRegistrando } from "../correio/correio.ts";
import { conviteDeEquipe } from "../correio/mensagens.ts";
import { exportarStudio } from "../ferramentas/exportar.ts";
import * as TG from "../telas/gestao.ts";
import { telaCobrancaClavus } from "../telas/cobranca.ts";
import type { Prof, Srv } from "../telas/agenda.ts";
import { auditar } from "../db/auditar.ts";

const soAdmin = (w: Web): Resposta | null =>
  pode(w.usuario.papel, "configurar") ? null : w.voltar("/", { tipo: "erro", texto: "Só a administradora acessa isso." });
const soTarifas = (w: Web): Resposta | null =>
  pode(w.usuario.papel, "tarifas") ? null : w.voltar("/", { tipo: "erro", texto: "Seu perfil não configura o studio." });

export async function rotasGestao(w: Web): Promise<Resposta | null> {
  const p = w.pedido;
  if (!p.caminho.startsWith("/configuracoes")) return null;

  if (p.caminho === "/configuracoes") {
    const bloq = soTarifas(w); if (bloq) return bloq;
    if (p.metodo === "POST") {
      const bloq2 = soAdmin(w); if (bloq2) return bloq2;
      const f = lerFormulario(p.corpo);
      return tentar(w, "/configuracoes", "Studio salvo ✨", () => w.db(async (db) => {
        const dias = Array.from({ length: 7 }, (_, i) => i).filter((i) => marcado(f, `dia_${i}`));
        await db.query(
          `UPDATE studios SET nome=$2, cor=$3, logo_url=$4, telefone=$5, email=$6, cnpj_cpf=$7, cidade=$8, uf=$9,
             dias_atendimento=$10, abre=$11, fecha=$12, slot_minutos=$13, ciclo_dias=$14,
             agendar_online=$15, agendar_antecedencia=$16, agendar_texto=$17 WHERE id=$1`,
          [w.studio.id, campo(f, "nome") || w.studio.nome,
            /^#[0-9A-Fa-f]{6}$/.test(campo(f, "cor")) ? campo(f, "cor") : w.studio.cor,
            campo(f, "logo_url") || null, campo(f, "telefone").replace(/\D/g, "") || null,
            campo(f, "email") || null, campo(f, "cnpj_cpf") || null, campo(f, "cidade") || null, campo(f, "uf") || null,
            dias.length ? dias : w.studio.dias_atendimento,
            horaValida(campo(f, "abre")) ? campo(f, "abre") : w.studio.abre,
            horaValida(campo(f, "fecha")) ? campo(f, "fecha") : w.studio.fecha,
            [15, 20, 30, 60].includes(inteiro(f, "slot_minutos", 30)) ? inteiro(f, "slot_minutos", 30) : 30,
            Math.min(Math.max(inteiro(f, "ciclo_dias", w.studio.ciclo_dias), 0), 120),
            campo(f, "agendar_online") === "1", Math.min(Math.max(inteiro(f, "agendar_antecedencia", 60), 1), 365),
            campo(f, "agendar_texto") || null]);
        await auditar(db, w.studio.id, w.usuario.id, "studio.configurar", "studios", w.studio.id, null);
      }));
    }
    const equipe = await w.db(async (db) => (await db.query<Usuario & { ultimo_acesso: string | null }>(
      "SELECT id, nome, email, papel, ativo, ultimo_acesso FROM usuarios ORDER BY nome")).rows);
    return w.tela("Configurações", TG.telaStudio(w.studio, equipe), { ativo: "/configuracoes" });
  }

  if (p.caminho === "/configuracoes/equipe-usuario" && p.metodo === "POST") {
    const bloq = soAdmin(w); if (bloq) return bloq;
    const f = lerFormulario(p.corpo);
    const acao = campo(f, "acao");
    return tentar(w, "/configuracoes", null, async () => {
      if (acao === "convidar") {
        const email = campo(f, "email").toLowerCase(), nome = campo(f, "nome");
        if (!nome || !email) throw new Error("Preencha nome e e-mail.");
        const papel = ["profissional", "gerencia", "administrador"].includes(campo(f, "papel")) ? campo(f, "papel") : "profissional";
        const token = novoToken();
        await w.db(async (db) => {
          await db.query(
            `INSERT INTO usuarios (studio_id, nome, email, papel, convite_token, convite_expira)
             VALUES ($1,$2,$3,$4,$5, now() + interval '3 days')
             ON CONFLICT (studio_id, email) DO UPDATE SET nome = EXCLUDED.nome, papel = EXCLUDED.papel,
               convite_token = EXCLUDED.convite_token, convite_expira = EXCLUDED.convite_expira, ativo = true`,
            [w.studio.id, nome, email, papel, hashDoToken(token)]);
          const url = `${w.servicos.ambiente.modo === "producao" ? "https" : "http"}://${w.pedido.host}/convite/${token}`;
          await enviarRegistrando(db, w.studio, w.servicos.enviar, w.servicos.ambiente.emailRemetente,
            { agendamentoId: null, tipo: "convite", mensagem: conviteDeEquipe(w.studio, nome, url, email) });
          await auditar(db, w.studio.id, w.usuario.id, "usuario.convidar", "usuarios", null, { email, papel });
        });
        return { para: "/configuracoes", aviso: { tipo: "ok" as const, texto: `Convite enviado para ${email} ✨ (vale 3 dias)` } };
      }
      const id = campo(f, "id");
      if (id === w.usuario.id && acao === "desativar") throw new Error("Você não pode desativar a si mesma.");
      await w.db(async (db) => {
        await db.query("UPDATE usuarios SET ativo = $2 WHERE id = $1", [id, acao === "ativar"]);
        if (acao === "desativar") await db.query("DELETE FROM sessoes WHERE usuario_id = $1", [id]);
        await auditar(db, w.studio.id, w.usuario.id, `usuario.${acao}`, "usuarios", id, null);
      });
      return { para: "/configuracoes", aviso: { tipo: "ok" as const, texto: acao === "ativar" ? "Usuária reativada" : "Usuária desativada" } };
    });
  }

  if (p.caminho === "/configuracoes/servicos") {
    const bloq = soTarifas(w); if (bloq) return bloq;
    if (p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      return tentar(w, "/configuracoes/servicos", "Serviço salvo ✨", () => w.db(async (db) => {
        const toggle = campo(f, "toggle");
        if (toggle) { await db.query("UPDATE servicos SET ativo = NOT ativo WHERE id = $1", [toggle]); return; }
        const preco = lerReais(campo(f, "preco"));
        if (!campo(f, "nome") || preco == null) throw new Error("Preencha nome e preço.");
        const vals = [campo(f, "nome"), preco, Math.max(inteiro(f, "duracao", 60), 5),
          Math.min(Math.max(inteiro(f, "ciclo", w.studio.ciclo_dias), 0), 120),
          /^#[0-9A-Fa-f]{6}$/.test(campo(f, "cor")) ? campo(f, "cor") : "#E91E8C",
          Math.min(Math.max(inteiro(f, "sinal", 0), 0), 100)];
        const id = campo(f, "id");
        if (id) await db.query("UPDATE servicos SET nome=$2, preco=$3, duracao_min=$4, ciclo_dias=$5, cor=$6, sinal_pct=$7 WHERE id=$1", [id, ...vals]);
        else await db.query("INSERT INTO servicos (studio_id, nome, preco, duracao_min, ciclo_dias, cor, sinal_pct) VALUES ($1,$2,$3,$4,$5,$6,$7)", [w.studio.id, ...vals]);
        await auditar(db, w.studio.id, w.usuario.id, "servico.salvar", "servicos", id || null, { nome: vals[0], preco });
      }));
    }
    const lista = await w.db(async (db) => (await db.query<Srv & { ciclo_dias: number; sinal_pct: number }>(
      "SELECT id, nome, preco, duracao_min, ciclo_dias, cor, sinal_pct, ativo FROM servicos ORDER BY nome")).rows);
    const editar = lista.find((s) => s.id === p.query.get("editar")) ?? null;
    return w.tela("Serviços", TG.telaServicos(lista) + TG.telaServicoForm(editar, w.studio.ciclo_dias), { ativo: "/configuracoes" });
  }

  if (p.caminho === "/configuracoes/produtos") {
    const bloq = soTarifas(w); if (bloq) return bloq;
    if (p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      return tentar(w, "/configuracoes/produtos", "Produto salvo 🛍", () => w.db(async (db) => {
        const toggle = campo(f, "toggle");
        if (toggle) { await db.query("UPDATE produtos SET ativo = NOT ativo WHERE id = $1", [toggle]); return; }
        const preco = lerReais(campo(f, "preco"));
        if (!campo(f, "nome") || preco == null) throw new Error("Preencha nome e preço.");
        const vals = [campo(f, "nome"), preco, lerReais(campo(f, "custo")) ?? 0, Math.max(inteiro(f, "estoque", 0), 0)];
        const id = campo(f, "id");
        if (id) await db.query("UPDATE produtos SET nome=$2, preco=$3, custo=$4, estoque=$5 WHERE id=$1", [id, ...vals]);
        else await db.query("INSERT INTO produtos (studio_id, nome, preco, custo, estoque) VALUES ($1,$2,$3,$4,$5)", [w.studio.id, ...vals]);
        await auditar(db, w.studio.id, w.usuario.id, "produto.salvar", "produtos", id || null, { nome: vals[0] });
      }));
    }
    const lista = await w.db(async (db) => (await db.query<{ id: string; nome: string; preco: number; custo: number; estoque: number; ativo: boolean }>(
      "SELECT id, nome, preco, custo, estoque, ativo FROM produtos ORDER BY nome")).rows);
    return w.tela("Produtos", TG.telaProdutos(lista, lista.find((x) => x.id === p.query.get("editar")) ?? null), { ativo: "/configuracoes" });
  }

  if (p.caminho === "/configuracoes/equipe") {
    const bloq = soTarifas(w); if (bloq) return bloq;
    if (p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      return tentar(w, "/configuracoes/equipe", "Profissional salva 👩‍🎨", () => w.db(async (db) => {
        const toggle = campo(f, "toggle");
        if (toggle) { await db.query("UPDATE profissionais SET ativo = NOT ativo WHERE id = $1", [toggle]); return; }
        if (!campo(f, "nome")) throw new Error("Dê um nome pra ela 🌸");
        const vals = [campo(f, "nome"), Math.min(Math.max(Number(campo(f, "comissao").replace(",", ".")) || 0, 0), 100),
          /^#[0-9A-Fa-f]{6}$/.test(campo(f, "cor")) ? campo(f, "cor") : "#E91E8C", campo(f, "usuario_id") || null];
        const id = campo(f, "id");
        if (id) await db.query("UPDATE profissionais SET nome=$2, comissao_pct=$3, cor=$4, usuario_id=$5 WHERE id=$1", [id, ...vals]);
        else await db.query("INSERT INTO profissionais (studio_id, nome, comissao_pct, cor, usuario_id) VALUES ($1,$2,$3,$4,$5)", [w.studio.id, ...vals]);
        await auditar(db, w.studio.id, w.usuario.id, "profissional.salvar", "profissionais", id || null, { nome: vals[0] });
      }));
    }
    const [lista, usuarios] = await w.db(async (db) => [
      (await db.query<Prof & { comissao_pct: number; usuario_id: string | null }>("SELECT id, nome, cor, comissao_pct, usuario_id, ativo FROM profissionais ORDER BY nome")).rows,
      (await db.query<Usuario>("SELECT id, nome, email, papel, ativo FROM usuarios WHERE ativo ORDER BY nome")).rows] as const);
    return w.tela("Equipe", TG.telaEquipe(lista, lista.find((x) => x.id === p.query.get("editar")) ?? null, usuarios), { ativo: "/configuracoes" });
  }

  if (p.caminho.startsWith("/configuracoes/planos")) {
    const bloq = soTarifas(w); if (bloq) return bloq;
    const volta = "/configuracoes/planos";
    if (p.caminho === "/configuracoes/planos" && p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      return tentar(w, volta, "Plano salvo 🔁", () => w.db(async (db) => {
        const toggle = campo(f, "toggle");
        if (toggle) { await db.query("UPDATE planos SET ativo = NOT ativo WHERE id = $1", [toggle]); return; }
        const preco = lerReais(campo(f, "preco"));
        if (!campo(f, "nome") || !preco || !campo(f, "servico_id")) throw new Error("Preencha nome, preço e o serviço incluído.");
        await Pl.salvarPlano(db, w.studio.id, {
          id: campo(f, "id") || null, nome: campo(f, "nome"), periodo: campo(f, "periodo"),
          preco, visitasMes: Math.min(Math.max(inteiro(f, "visitas", 2), 1), 10),
          servicoId: campo(f, "servico_id"), usuarioId: w.usuario.id,
        });
      }));
    }
    if (p.caminho === "/configuracoes/planos/vender" && p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      return tentar(w, volta, null, async () => {
        const dias = Array.from({ length: 28 }, (_, i) => i + 1).filter((d) => marcado(f, `dia_${d}`));
        const inicio = campo(f, "inicio");
        const r = await w.db((db) => Pl.venderAssinatura(db, w.studio, w.servicos.ambiente.chaveMestra, {
          clienteId: campo(f, "cliente_id"), planoId: campo(f, "plano_id"), diasMes: dias,
          hora: horaValida(campo(f, "hora")) ? campo(f, "hora") : "09:00",
          profissionalId: campo(f, "profissional_id") || null,
          inicio: diaValido(inicio) ? inicio : w.hoje, usuarioId: w.usuario.id,
        }, w.servicos.fetchFn));
        return { para: volta, aviso: { tipo: "ok" as const, texto: r.urlFatura
          ? `Assinatura ativa ✨ 1ª fatura pelo Asaas: <a href="${r.urlFatura}" target="_blank" rel="noopener">abrir</a>`
          : "Assinatura ativa ✨" , ...(r.urlFatura ? {} : {}) }, };
      });
    }
    if (p.caminho === "/configuracoes/planos/receber" && p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      return tentar(w, volta, "Recebimento lançado no caixa 💖", () =>
        w.db((db) => Pl.registrarRecebimento(db, w.studio.id, campo(f, "id"), "pix", w.hoje, w.usuario.id)).then(() => undefined));
    }
    if (p.caminho === "/configuracoes/planos/gerar" && p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      return tentar(w, volta, null, async () => {
        const r = await w.db((db) => Pl.gerarHorariosDoMes(db, w.studio.id, campo(f, "id"), w.hoje.slice(0, 7), w.hoje, w.usuario.id));
        return { para: volta, aviso: { tipo: "ok" as const, texto: r.criados ? `${r.criados} horário(s) criado(s) 📅${r.pulados ? ` (${r.pulados} pulado(s))` : ""}` : "Nenhum horário novo — dias já passaram, já marcados ou em choque" } };
      });
    }
    if (p.caminho === "/configuracoes/planos/cancelar" && p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      return tentar(w, volta, "Assinatura cancelada", () =>
        w.db((db) => Pl.cancelarAssinaturaCliente(db, w.studio, w.servicos.ambiente.chaveMestra, campo(f, "id"), w.usuario.id, w.servicos.fetchFn)));
    }
    const dados = await w.db(async (db) => ({
      planos: await Pl.listarPlanos(db),
      assinaturas: await Pl.assinaturasAtivas(db),
      servicos: (await db.query<Srv>("SELECT id, nome, preco, duracao_min, cor, ativo FROM servicos WHERE ativo ORDER BY nome")).rows,
      profs: (await db.query<Prof>("SELECT id, nome, cor, ativo FROM profissionais WHERE ativo ORDER BY nome")).rows,
      clientes: await Cli.buscarClientes(db, { hoje: w.hoje, limite: 400 }),
    }));
    return w.tela("Planos", TG.telaPlanos({
      hoje: w.hoje, ...dados, clientePre: p.query.get("cliente"),
      editar: dados.planos.find((x) => x.id === p.query.get("editar")) ?? null,
      temAsaas: !!w.studio.asaas_chave_cifrada,
    }), { ativo: "/configuracoes" });
  }

  if (p.caminho === "/configuracoes/asaas") {
    const bloq = soAdmin(w); if (bloq) return bloq;
    if (p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      return tentar(w, "/configuracoes/asaas", null, async () => {
        if (campo(f, "desconectar")) {
          await w.db(async (db) => {
            await db.query("UPDATE studios SET asaas_chave_cifrada = NULL WHERE id = $1", [w.studio.id]);
            await auditar(db, w.studio.id, w.usuario.id, "asaas.desconectar", "studios", w.studio.id, null);
          });
          return { para: "/configuracoes/asaas", aviso: { tipo: "ok" as const, texto: "Asaas desconectado." } };
        }
        const chave = campo(f, "chave");
        const ambiente = campo(f, "ambiente") === "producao" ? "producao" as const : "sandbox" as const;
        if (!chave) {
          await w.db((db) => db.query("UPDATE studios SET asaas_ambiente = $2 WHERE id = $1", [w.studio.id, ambiente]));
          return { para: "/configuracoes/asaas", aviso: { tipo: "ok" as const, texto: "Ambiente salvo." } };
        }
        await new Asaas(chave, ambiente, w.servicos.fetchFn).testar();   // chave errada não entra
        const cifrada = cifrar(chave, w.servicos.ambiente.chaveMestra);
        await w.db(async (db) => {
          await db.query("UPDATE studios SET asaas_chave_cifrada = $2, asaas_ambiente = $3 WHERE id = $1", [w.studio.id, cifrada, ambiente]);
          await auditar(db, w.studio.id, w.usuario.id, "asaas.conectar", "studios", w.studio.id, { ambiente });
        });
        return { para: "/configuracoes/asaas", aviso: { tipo: "ok" as const, texto: "Asaas conectado e testado ✨ Agora cadastre o webhook (abaixo)." } };
      });
    }
    return w.tela("Asaas", TG.telaAsaasStudio(w.studio, p.host ?? `${w.studio.slug}.${w.servicos.ambiente.dominioBase}`), { ativo: "/configuracoes" });
  }

  if (p.caminho.startsWith("/configuracoes/cobranca")) {
    const admin = pode(w.usuario.papel, "configurar");
    if (!admin) return w.voltar("/", { tipo: "erro", texto: "Só a administradora vê a cobrança." });
    const amb = w.servicos.ambiente;
    const volta = "/configuracoes/cobranca";
    if (p.caminho === "/configuracoes/cobranca/assinar" && p.metodo === "POST") {
      return tentar(w, volta, null, async () => {
        const r = await w.db((db) => Ass.assinar(db, w.studio, amb, w.hoje, w.usuario.id, w.servicos.fetchFn), "sistema");
        return { para: volta, aviso: { tipo: "ok" as const, texto: r.urlFatura ? "Assinatura criada ✨ A 1ª fatura está na lista — pague para ativar." : "Assinatura criada ✨ A 1ª fatura chega em instantes (use “conferir agora”)." } };
      });
    }
    if (p.caminho === "/configuracoes/cobranca/avulso" && p.metodo === "POST") {
      const f = lerFormulario(p.corpo);
      return tentar(w, volta, null, async () => {
        const r = await w.db((db) => Ass.pagarAvulso(db, w.studio, amb, w.hoje, inteiro(f, "meses", 1), w.usuario.id, w.servicos.fetchFn), "sistema");
        return { para: volta, aviso: { tipo: "ok" as const, texto: r.urlFatura ? "Fatura gerada ✨ Está na lista para pagar." : "Fatura gerada ✨" } };
      });
    }
    if (p.caminho === "/configuracoes/cobranca/cancelar" && p.metodo === "POST") {
      return tentar(w, volta, "Assinatura cancelada — o acesso vale até o fim do período pago.", () =>
        w.db((db) => Ass.cancelarAssinatura(db, w.studio, amb, w.usuario.id, w.servicos.fetchFn), "sistema"));
    }
    if (p.caminho === "/configuracoes/cobranca/conferir" && p.metodo === "POST") {
      return tentar(w, volta, "Conferido com o Asaas ✨", () =>
        w.db((db) => Ass.sincronizarAssinatura(db, w.studio, amb, w.servicos.fetchFn), "sistema").then(() => undefined));
    }
    const [faturas, studio] = await w.db(async (db) => [await Ass.faturasDoStudio(db),
      (await db.query<typeof w.studio>("SELECT * FROM studios WHERE id = $1", [w.studio.id])).rows[0]] as const, "sistema");
    const acesso = Ass.situacaoAcesso(studio, w.hoje, amb.carenciaDias);
    return w.tela("Cobrança do ClavusOS", telaCobrancaClavus({
      studio, acesso, faturas, precoMensal: amb.precoMensal, temAsaasAF: !!amb.asaasAF, whats: amb.whatsappComercial,
    }), { ativo: "/configuracoes" });
  }

  if (p.caminho === "/configuracoes/auditoria" && p.metodo === "GET") {
    const bloq = soAdmin(w); if (bloq) return bloq;
    const linhas = await w.db(async (db) => (await db.query<{ acao: string; tabela: string | null; detalhes: unknown; usuario_nome: string | null; criado_em: string }>(
      `SELECT a.acao, a.tabela, a.detalhes, u.nome AS usuario_nome, a.criado_em FROM auditoria a
         LEFT JOIN usuarios u ON u.id = a.usuario_id ORDER BY a.id DESC LIMIT 200`)).rows);
    return w.tela("Auditoria", TG.telaAuditoria(linhas, w.studio.fuso), { ativo: "/configuracoes" });
  }

  if (p.caminho === "/configuracoes/exportar" && p.metodo === "GET") {
    const bloq = soAdmin(w); if (bloq) return bloq;
    const dados = await exportarStudio(w.studio.id);
    await w.db((db) => auditar(db, w.studio.id, w.usuario.id, "studio.exportar", "studios", w.studio.id, null));
    return { ...json(dados), cabecalhos: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="clavusos-${w.studio.slug}-${w.hoje}.json"` } };
  }

  return null;
}

export { senhaAceitavel, gerarHash };
