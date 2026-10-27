import type { Executor } from "./contexto.ts";

/** Toda ação sensível deixa rastro. Quem lê é só o administrador (002_rls.sql). */
export async function auditar(db: Executor, studioId: string, usuarioId: string | null | undefined,
  acao: string, tabela: string | null, registroId: string | null, detalhes: unknown): Promise<void> {
  await db.query(
    "INSERT INTO auditoria (studio_id, usuario_id, acao, tabela, registro_id, detalhes) VALUES ($1,$2,$3,$4,$5,$6::jsonb)",
    [studioId, usuarioId ?? null, acao, tabela, registroId, detalhes == null ? null : JSON.stringify(detalhes)]);
}
