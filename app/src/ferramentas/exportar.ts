/**
 * Exportação do studio em JSON (`clavusos-exportacao/1`): o direito do studio de
 * levar os dados, e o formato do backup de fora. Sem senhas, sem chave Asaas,
 * sem tokens, sem sessões e sem corpo de webhook.
 */
import { comStudio } from "../db/contexto.ts";

export async function exportarStudio(studioId: string): Promise<Record<string, unknown>> {
  return comStudio({ studioId, papel: "sistema" }, async (db) => {
    const uma = async (sql: string) => (await db.query(sql)).rows;
    const studio = (await db.query(
      `SELECT slug, nome, razao_social, cnpj_cpf, cidade, uf, endereco, telefone, email, fuso, cor,
              abre, fecha, slot_minutos, dias_atendimento, ciclo_dias, agendar_online, agendar_antecedencia, situacao, plano, criado_em
         FROM studios`)).rows[0];
    return {
      formato: "clavusos-exportacao/1",
      gerado_em: new Date().toISOString(),
      studio,
      usuarios: await uma("SELECT nome, email, papel, ativo, criado_em FROM usuarios"),
      profissionais: await uma("SELECT nome, cor, comissao_pct, ativo FROM profissionais"),
      servicos: await uma("SELECT nome, descricao, preco, duracao_min, ciclo_dias, cor, sinal_pct, ativo FROM servicos"),
      produtos: await uma("SELECT nome, preco, custo, estoque, ativo FROM produtos"),
      clientes: await uma("SELECT nome, cpf, nascimento::text AS nascimento, email, telefone, cep, endereco, cidade, uf, origem, situacao, observacoes, criado_em FROM clientes"),
      planos: await uma("SELECT nome, periodo, preco, visitas_mes, ativo FROM planos"),
      assinaturas_clientes: await uma(`SELECT c.nome AS cliente, p.nome AS plano, a.preco, a.periodo, a.dias_mes, a.hora, a.inicio::text AS inicio, a.pago_ate::text AS pago_ate, a.situacao
        FROM assinaturas_clientes a JOIN clientes c ON c.id = a.cliente_id JOIN planos p ON p.id = a.plano_id`),
      agendamentos: await uma(`SELECT a.codigo, c.nome AS cliente, s.nome AS servico, pr.nome AS profissional,
          a.data::text AS data, a.inicio, a.duracao_min, a.preco, a.situacao, a.origem, a.encaixe, a.observacoes, a.criado_em
        FROM agendamentos a JOIN clientes c ON c.id = a.cliente_id JOIN servicos s ON s.id = a.servico_id
        LEFT JOIN profissionais pr ON pr.id = a.profissional_id ORDER BY a.data, a.inicio`),
      lancamentos: await uma(`SELECT tipo, categoria, descricao, valor, forma, origem, data::text AS data, criado_em, anulado_em FROM lancamentos ORDER BY data`),
      vendas: await uma("SELECT total, forma, data::text AS data, criado_em FROM vendas ORDER BY data"),
      cobrancas: await uma("SELECT finalidade, meio, valor, vencimento::text AS vencimento, situacao, recebida_em, valor_liquido FROM cobrancas ORDER BY criado_em"),
    };
  });
}
