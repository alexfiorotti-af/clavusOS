/**
 * Recria o studio fictício `modelo` (Studio Lume, Vitória/ES) para demonstração.
 * npm run studio-modelo [-- --senha minhasenha]
 * Entradas: demo@<domínio> (admin) e equipe@<domínio> (profissional), senha `demonstracao` por padrão.
 * Todos os dados são inventados; nenhum dado real entra aqui.
 */
import { carregarEnv, lerAmbiente } from "../ambiente.ts";
import { abrirPool, fecharPool, comStudio, semStudio } from "../db/contexto.ts";
import { gerarHash } from "../auth/senha.ts";
import { hojeEm, somarDias } from "../dados/datas.ts";
import { criarAgendamento, concluir } from "../agenda/agenda.ts";

carregarEnv();
const a = lerAmbiente();
if (!a.bancoUrl) { console.error("CLAVUS_DATABASE_URL não definida."); process.exit(1); }
abrirPool(a.bancoUrl);
const senha = (() => { const i = process.argv.indexOf("--senha"); return i >= 0 ? process.argv[i + 1] : a.demoSenha ?? "demonstracao"; })();

(async () => {
  const hoje = hojeEm("America/Sao_Paulo");
  await semStudio((db) => db.query("DELETE FROM studios WHERE slug = 'modelo'"));
  const id = await semStudio(async (db) => (await db.query<{ id: string }>(
    `INSERT INTO studios (slug, nome, cidade, uf, telefone, email, plano, situacao, ciclo_dias)
     VALUES ('modelo','Studio Lume','Vitória','ES','5527900000000',$1,'cortesia','ativo',25) RETURNING id`,
    [`demo@${a.dominioBase}`])).rows[0].id);

  await comStudio({ studioId: id, papel: "sistema" }, async (db) => {
    const hash = await gerarHash(senha!);
    await db.query("INSERT INTO usuarios (studio_id, nome, email, papel, senha_hash) VALUES ($1,'Dona Demo',$2,'administrador',$3), ($1,'Equipe Demo',$4,'profissional',$3)",
      [id, `demo@${a.dominioBase}`, hash, `equipe@${a.dominioBase}`]);
    const profs = (await db.query<{ id: string }>(
      `INSERT INTO profissionais (studio_id, nome, cor, comissao_pct) VALUES
       ($1,'Lia Exemplo','#E91E8C',40), ($1,'Bia Exemplo','#9C27B0',40) RETURNING id`, [id])).rows;
    const srv = (await db.query<{ id: string; preco: number }>(
      `INSERT INTO servicos (studio_id, nome, preco, duracao_min, ciclo_dias, cor, sinal_pct) VALUES
       ($1,'Esmaltação em gel',7000,60,21,'#E91E8C',30),
       ($1,'Alongamento fibra',15000,150,28,'#9C27B0',30),
       ($1,'Manutenção',9000,90,25,'#B8860B',0),
       ($1,'Banho de gel',8000,75,25,'#FF8A65',0),
       ($1,'Pé e mão tradicional',5500,75,15,'#2E9E6B',0),
       ($1,'Spa dos pés',6500,60,30,'#5C6BC0',0) RETURNING id, preco`, [id])).rows;
    await db.query(
      `INSERT INTO produtos (studio_id, nome, preco, custo, estoque) VALUES
       ($1,'Óleo de cutícula',2500,1200,10), ($1,'Base fortalecedora',4000,2000,8),
       ($1,'Creme de mãos',3000,1500,12), ($1,'Kit lixas descartáveis',1500,600,20)`, [id]);
    const mm = hoje.slice(5, 7);
    const cli = (await db.query<{ id: string }>(
      `INSERT INTO clientes (studio_id, nome, telefone, origem, situacao, nascimento) VALUES
       ($1,'Juliana Exemplo','5500999990001','instagram','ativa',('2000-' || $2 || '-28')::date),
       ($1,'Camila Exemplo','5500999990002','indicacao','ativa',NULL),
       ($1,'Patrícia Exemplo','5500999990003','google','ativa',('1995-' || $2 || '-03')::date),
       ($1,'Renata Exemplo','5500999990004','whatsapp','ativa',NULL),
       ($1,'Bruna Exemplo','5500999990005','instagram','lead',NULL) RETURNING id`, [id, mm])).rows;

    const marca = (ci: number, si: number, data: string, hora: string, pi: number | null) =>
      criarAgendamento(db, id, { clienteId: cli[ci].id, servicoId: srv[si].id, profissionalId: pi == null ? null : profs[pi].id, data, inicio: hora, usuarioId: null });
    // Histórico concluído — alimenta "unha vencida", caixa e relatórios:
    for (const [ci, si, atras, hora, pi] of [[0, 0, 30, "10:00", 0], [1, 2, 20, "14:00", 1], [2, 1, 40, "09:00", 0], [3, 3, 6, "15:00", 1]] as const) {
      const ag = await marca(ci, si, somarDias(hoje, -atras), hora, pi);
      await concluir(db, id, ag.id, { forma: "pix", usuarioId: null });
    }
    // Agenda viva:
    for (const [ci, si, em, hora, pi] of [[3, 0, 0, "09:00", 0], [1, 5, 0, "11:00", 1], [0, 2, 0, "14:00", 0],
      [2, 4, 0, "15:30", 1], [3, 1, 1, "09:30", 0], [0, 3, 1, "13:00", 1], [1, 1, 2, "09:00", 0],
      [2, 5, 3, "10:00", 1], [4, 0, 4, "14:00", 0]] as const) {
      await marca(ci, si, somarDias(hoje, em), hora, pi);
    }
    await db.query(
      `INSERT INTO lancamentos (studio_id, tipo, categoria, descricao, valor, forma, origem, data) VALUES
       ($1,'despesa','Material','Géis e lixas do mês',18000,'pix','manual',$2),
       ($1,'despesa','Aluguel','Aluguel do studio',60000,'pix','manual',$3)`,
      [id, somarDias(hoje, -5), hoje.slice(0, 8) + "05"]);
  });
  console.log(`Studio modelo recriado ✨  https://modelo.${a.dominioBase}  — demo@${a.dominioBase} / ${senha}`);
})().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(fecharPool);
