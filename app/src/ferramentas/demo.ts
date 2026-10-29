/**
 * O studio de demonstração: apaga e recria `CLAVUS_DEMO_SLUG` com uma base
 * completa para apresentar — clientes com unha vencida, aniversariantes e
 * leads, agenda viva com encaixe, caixa com receitas e despesas do mês,
 * venda de produto, plano com assinante e horários gerados.
 *
 * Quem chama: o CLI `npm run studio-modelo` e a rota `/rotina/renovar-demo`
 * (chave da rotina) — é ela que o cron mensal usa para renovar a demonstração.
 * Todos os dados são fictícios; telefones começam com 5500 de propósito.
 */
import { comStudio, semStudio } from "../db/contexto.ts";
import { gerarHash } from "../auth/senha.ts";
import { hojeEm, somarDias } from "../dados/datas.ts";
import { criarAgendamento, concluir, cancelar } from "../agenda/agenda.ts";
import { venderProdutos, lancar } from "../caixa/caixa.ts";
import { venderAssinatura, registrarRecebimento, gerarHorariosDoMes } from "../planos/planos.ts";
import type { Studio } from "../studio/studio.ts";

export type OpcoesDemo = { slug: string; dominioBase: string; senha: string };
export type ResultadoDemo = { slug: string; clientes: number; agendamentos: number; entradas: string[] };

export async function recriarDemo(o: OpcoesDemo): Promise<ResultadoDemo> {
  const hoje = hojeEm("America/Sao_Paulo");
  const mm = hoje.slice(5, 7);
  await semStudio((db) => db.query("DELETE FROM studios WHERE slug = $1", [o.slug]));
  const id = await semStudio(async (db) => (await db.query<{ id: string }>(
    `INSERT INTO studios (slug, nome, cidade, uf, telefone, email, plano, situacao, ciclo_dias, agendar_texto)
     VALUES ($1,'Studio Lume','Vitória','ES','5500990000000',$2,'cortesia','ativo',25,
             'Studio de demonstração do ClavusOS — marque à vontade, tudo aqui é fictício 💅') RETURNING id`,
    [o.slug, `demo@${o.dominioBase}`])).rows[0].id);

  return comStudio({ studioId: id, papel: "sistema", fuso: "America/Sao_Paulo" }, async (db) => {
    const hash = await gerarHash(o.senha);
    await db.query(
      `INSERT INTO usuarios (studio_id, nome, email, papel, senha_hash) VALUES
       ($1,'Dona do Studio',$2,'administrador',$4),
       ($1,'Gerente Demo',$3,'gerencia',$4),
       ($1,'Equipe Demo',$5,'profissional',$4)`,
      [id, `demo@${o.dominioBase}`, `gerencia@${o.dominioBase}`, hash, `equipe@${o.dominioBase}`]);

    const prof = (await db.query<{ id: string }>(
      `INSERT INTO profissionais (studio_id, nome, cor, comissao_pct) VALUES
       ($1,'Lia Martins','#E91E8C',40), ($1,'Bia Ferreira','#9C27B0',45) RETURNING id`, [id])).rows.map((x) => x.id);

    const srv = (await db.query<{ id: string }>(
      `INSERT INTO servicos (studio_id, nome, preco, duracao_min, ciclo_dias, cor, sinal_pct) VALUES
       ($1,'Esmaltação em gel',7000,60,21,'#E91E8C',30),
       ($1,'Alongamento em fibra',15000,150,28,'#9C27B0',30),
       ($1,'Manutenção de alongamento',9000,90,25,'#B8860B',0),
       ($1,'Banho de gel',8000,75,25,'#FF8A65',0),
       ($1,'Pé e mão tradicional',5500,75,15,'#2E9E6B',0),
       ($1,'Spa dos pés',6500,60,30,'#5C6BC0',0) RETURNING id`, [id])).rows.map((x) => x.id);

    const prod = (await db.query<{ id: string }>(
      `INSERT INTO produtos (studio_id, nome, preco, custo, estoque) VALUES
       ($1,'Óleo de cutícula',2500,1200,10), ($1,'Base fortalecedora',4000,2000,8),
       ($1,'Creme de mãos',3000,1500,12), ($1,'Kit lixas descartáveis',1500,600,20) RETURNING id`, [id])).rows.map((x) => x.id);

    // Clientes: origem variada, 3 com unha vencida, 2 aniversariantes do mês, 2 leads.
    const linhas: [string, string, string, string, string | null][] = [
      ["Juliana Souza",   "5500999990001", "instagram", "ativa", `1994-${mm}-28`],
      ["Camila Ferreira", "5500999990002", "indicacao", "ativa", null],
      ["Patrícia Lima",   "5500999990003", "google",    "ativa", null],
      ["Renata Alves",    "5500999990004", "whatsapp",  "ativa", null],
      ["Bruna Castro",    "5500999990005", "instagram", "lead",  null],
      ["Fernanda Dias",   "5500999990006", "online",    "lead",  null],
      ["Mariana Costa",   "5500999990007", "indicacao", "ativa", null],
      ["Aline Rocha",     "5500999990008", "passante",  "ativa", null],
      ["Carla Mendes",    "5500999990009", "instagram", "ativa", `1990-${mm}-05`],
      ["Tatiane Nunes",   "5500999990010", "google",    "ativa", null],
    ];
    const cli: string[] = [];
    for (const [nome, tel, origem, situacao, niver] of linhas) {
      cli.push((await db.query<{ id: string }>(
        "INSERT INTO clientes (studio_id, nome, telefone, origem, situacao, nascimento) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
        [id, nome, tel, origem, situacao, niver])).rows[0].id);
    }
    await db.query("UPDATE clientes SET observacoes = 'Alérgica a acrílico' WHERE id = $1", [cli[1]]);

    const marca = (c: number, s: number, data: string, inicio: string, p: number | null, extra: Record<string, unknown> = {}) =>
      criarAgendamento(db, id, { clienteId: cli[c], servicoId: srv[s], profissionalId: p == null ? null : prof[p],
        data, inicio, usuarioId: null, ...extra });
    const formas = ["pix", "cartao_credito", "dinheiro", "pix", "cartao_debito"];
    let f = 0;
    const atendido = async (c: number, s: number, atras: number, inicio: string, p: number) => {
      const a = await marca(c, s, somarDias(hoje, -atras), inicio, p);
      await concluir(db, id, a.id, { forma: formas[f++ % formas.length], usuarioId: null });
    };

    // Histórico concluído — alimenta vencidas, caixa e relatórios do mês.
    await atendido(0, 0, 30, "10:00", 0);  // Juliana · gel há 30d (ciclo 21) → vencida há 9
    await atendido(2, 1, 40, "09:00", 1);  // Patrícia · fibra há 40d (28) → vencida há 12
    await atendido(7, 5, 33, "15:00", 1);  // Aline · spa há 33d (30) → vencida há 3
    await atendido(1, 2, 20, "14:00", 0);  // Camila · manutenção há 20d (25) → vence em 5d
    await atendido(9, 4, 14, "11:00", 1);  // Tatiane · pé e mão há 14d (15) → vence amanhã
    await atendido(8, 0, 12, "16:00", 0);  // Carla · gel há 12d
    await atendido(6, 4, 10, "09:30", 1);  // Mariana · pé e mão há 10d
    await atendido(3, 3, 6,  "15:30", 0);  // Renata · banho de gel há 6d
    await atendido(1, 5, 4,  "10:30", 1);
    await atendido(8, 2, 3,  "13:00", 0);
    await atendido(9, 0, 2,  "17:00", 1);
    await atendido(3, 4, 1,  "09:00", 0);
    // Uma falta registrada (história real de studio):
    const faltou = await marca(4, 0, somarDias(hoje, -7), "11:00", 1);
    await cancelar(db, id, faltou.id, { motivo: "não veio nem avisou", faltou: true, usuarioId: null });

    // A agenda viva: hoje cheio (1 já concluído, 1 encaixe), amanhã e a semana.
    const cedo = await marca(3, 0, hoje, "09:00", 0);
    await concluir(db, id, cedo.id, { forma: "pix", usuarioId: null });
    await marca(1, 5, hoje, "11:00", 1);
    const das14 = await marca(0, 2, hoje, "14:00", 0);
    await db.query("UPDATE agendamentos SET situacao = 'confirmado', confirmado_em = now() WHERE id = $1", [das14.id]);
    await marca(8, 0, hoje, "14:00", 0, { encaixe: true, observacoes: "Encaixe combinado com a Lia" });
    await marca(2, 4, hoje, "15:30", 1);
    await marca(9, 1, somarDias(hoje, 1), "09:30", 0);
    await marca(7, 3, somarDias(hoje, 1), "13:00", 1);
    await marca(5, 0, somarDias(hoje, 1), "16:00", 1, { origem: "online", observacoes: "Agendado pela página pública" });
    await marca(1, 1, somarDias(hoje, 2), "09:00", 0);
    await marca(3, 5, somarDias(hoje, 3), "10:00", 1);
    await marca(8, 2, somarDias(hoje, 4), "14:00", 0);
    await marca(4, 0, somarDias(hoje, 5), "16:00", 1);

    // Caixa: despesas do mês e uma venda de produtos.
    await lancar(db, id, { tipo: "despesa", categoria: "Aluguel", descricao: "Aluguel do studio", valor: 60000, forma: "pix", data: hoje.slice(0, 8) + "05", usuarioId: null });
    await lancar(db, id, { tipo: "despesa", categoria: "Material", descricao: "Géis, lixas e algodão", valor: 18000, forma: "pix", data: somarDias(hoje, -5), usuarioId: null });
    await lancar(db, id, { tipo: "despesa", categoria: "Contas", descricao: "Energia do mês", valor: 12000, forma: "boleto", data: somarDias(hoje, -3), usuarioId: null });
    await venderProdutos(db, id, { itens: [{ produtoId: prod[0], quantidade: 2 }, { produtoId: prod[1], quantidade: 1 }], clienteId: cli[1], forma: "pix", data: somarDias(hoje, -2), usuarioId: null });

    // Plano + assinante (sem Asaas na demo: recebimento manual) + horários do mês.
    const plano = (await db.query<{ id: string }>(
      "INSERT INTO planos (studio_id, nome, periodo, preco, visitas_mes, servico_id) VALUES ($1,'Gel Mensal','mensal',13000,2,$2) RETURNING id",
      [id, srv[0]])).rows[0].id;
    const studio = (await db.query<Studio>("SELECT * FROM studios WHERE id = $1", [id])).rows[0];
    const { id: assId } = await venderAssinatura(db, studio, null, {
      clienteId: cli[6], planoId: plano, diasMes: [10, 25], hora: "09:00", profissionalId: prof[0],
      inicio: hoje.slice(0, 8) + "01", usuarioId: null });
    await registrarRecebimento(db, id, assId, "pix", hoje, null);
    await gerarHorariosDoMes(db, id, assId, hoje.slice(0, 7), hoje, null);

    const n = await db.query<{ c: string; a: string }>(
      "SELECT (SELECT count(*) FROM clientes)::text AS c, (SELECT count(*) FROM agendamentos)::text AS a");
    return { slug: o.slug, clientes: +n.rows[0].c, agendamentos: +n.rows[0].a,
      entradas: [`demo@${o.dominioBase} (administradora)`, `gerencia@${o.dominioBase} (gerência)`, `equipe@${o.dominioBase} (profissional)`] };
  });
}
