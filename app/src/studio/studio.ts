import { comStudio, semStudio, type Executor } from "../db/contexto.ts";

export type Studio = {
  id: string; slug: string; nome: string; razao_social: string | null; cnpj_cpf: string | null;
  cidade: string | null; uf: string | null; endereco: string | null; telefone: string | null; email: string | null;
  fuso: string; cor: string; logo_url: string | null; assinatura_clavus: boolean;
  abre: string; fecha: string; slot_minutos: number; dias_atendimento: number[]; ciclo_dias: number;
  agendar_online: boolean; agendar_antecedencia: number; agendar_texto: string | null;
  asaas_ambiente: "sandbox" | "producao"; asaas_chave_cifrada: string | null; asaas_webhook_token: string;
  plano: "teste" | "assinatura" | "cortesia"; teste_ate: string | null; pago_ate: string | null;
  assinatura_cliente_id: string | null; assinatura_asaas_id: string | null; assinatura_forma: string | null;
  assinatura_cancelada_em: string | null; assinatura_aviso_em: string | null;
  situacao: "teste" | "ativo" | "suspenso";
  criado_em: string;
};

export type StudioResumo = { id: string; slug: string; nome: string; situacao: string };

export async function resolverStudio(slug: string): Promise<StudioResumo | null> {
  return semStudio(async (db) => {
    const r = await db.query<StudioResumo>("SELECT id, slug, nome, situacao FROM resolver_studio($1)", [slug]);
    return r.rows[0] ?? null;
  });
}

export async function lerStudio(db: Executor, id: string): Promise<Studio> {
  const r = await db.query<Studio>("SELECT * FROM studios WHERE id = $1", [id]);
  if (!r.rows[0]) throw new Error("studio não encontrado no contexto");
  return r.rows[0];
}

export async function studioPorId(id: string): Promise<Studio> {
  return comStudio({ studioId: id, papel: "sistema" }, (db) => lerStudio(db, id));
}
