/** Ferramentas de revendedor: criar, listar e mudar studios (rodam como dono do banco). */
import { comStudio, semStudio } from "../db/contexto.ts";
import { novoToken, hashDoToken, gerarHash } from "../auth/senha.ts";
import { somarDias, hojeEm } from "../dados/datas.ts";

export type NovoStudio = {
  slug: string; nome: string; cidade?: string | null; uf?: string | null;
  admin: { nome: string; email: string; senha?: string | null } | null;
  testeDias: number; cortesia?: boolean;
};

export async function criarStudio(n: NovoStudio): Promise<{ id: string; conviteToken: string | null }> {
  const slug = n.slug.toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) throw new Error("Slug inválido: use letras minúsculas, números e hífen.");
  if (["www", "app", "api", "site", "modelo-reservado"].includes(slug)) throw new Error("Esse endereço é reservado.");
  const id = await semStudio(async (db) => {
    const r = await db.query<{ id: string }>(
      `INSERT INTO studios (slug, nome, cidade, uf, plano, teste_ate, situacao, cor)
       VALUES ($1,$2,$3,$4,$5,$6,'teste','#A8174A') RETURNING id`,
      [slug, n.nome, n.cidade ?? null, n.uf ?? null, n.cortesia ? "cortesia" : "teste",
        n.cortesia ? null : somarDias(hojeEm("America/Sao_Paulo"), n.testeDias)]);
    return r.rows[0].id;
  });
  let conviteToken: string | null = null;
  if (n.admin) {
    const token = novoToken();
    const hash = n.admin.senha ? await gerarHash(n.admin.senha) : null;
    await comStudio({ studioId: id, papel: "sistema" }, (db) => db.query(
      `INSERT INTO usuarios (studio_id, nome, email, papel, senha_hash, convite_token, convite_expira)
       VALUES ($1,$2,$3,'administrador',$4,$5, now() + interval '3 days')`,
      [id, n.admin!.nome, n.admin!.email.toLowerCase(), hash, hash ? null : hashDoToken(token)]));
    if (!hash) conviteToken = token;
  }
  return { id, conviteToken };
}

export type StudioLinha = { id: string; slug: string; nome: string; situacao: string; plano: string; teste_ate: string | null; pago_ate: string | null; entrou: boolean };

export async function listarStudios(): Promise<StudioLinha[]> {
  return semStudio(async (db) => (await db.query<StudioLinha>(
    `SELECT s.id, s.slug, s.nome, s.situacao, s.plano, s.teste_ate::text AS teste_ate, s.pago_ate::text AS pago_ate,
            EXISTS (SELECT 1 FROM usuarios u WHERE u.studio_id = s.id AND u.ultimo_acesso IS NOT NULL) AS entrou
       FROM studios s ORDER BY s.criado_em`)).rows);
}

export async function mudarStudio(slug: string, mudanca: { situacao?: string; plano?: string; pago_ate?: string; teste_ate?: string }): Promise<void> {
  await semStudio(async (db) => {
    const sets: string[] = []; const vals: unknown[] = [slug.toLowerCase()];
    for (const [k, v] of Object.entries(mudanca)) { if (v !== undefined) { vals.push(v); sets.push(`${k} = $${vals.length}`); } }
    if (!sets.length) return;
    const r = await db.query(`UPDATE studios SET ${sets.join(", ")} WHERE slug = $1`, vals);
    if (!r.rowCount) throw new Error("Studio não encontrado.");
  });
}
