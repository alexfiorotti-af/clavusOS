/**
 * Sessão: cookie com token aleatório; o banco guarda o hash. Dura 12 horas
 * de inatividade: o celular do studio passa de mão em mão e sessão eterna
 * seria o mesmo que não ter senha.
 */
import { comStudio, type Executor, type Papel } from "../db/contexto.ts";
import { conferirSenha, hashDoToken, novoToken } from "./senha.ts";

export const COOKIE = "clavus_sessao";
export const DURACAO_SEG = 12 * 3600;
const MAX_TENTATIVAS = 6;         // por e-mail, em 15 minutos
const JANELA_MIN = 15;

export type Usuario = { id: string; nome: string; email: string; papel: Papel; ativo: boolean };

export type ResultadoLogin =
  | { ok: true; token: string; usuario: Usuario }
  | { ok: false; motivo: "credenciais" | "bloqueado" | "inativo" };

export async function entrar(studioId: string, email: string, senha: string, ip: string | null): Promise<ResultadoLogin> {
  const em = email.trim().toLowerCase();
  return comStudio({ studioId, papel: "sistema" }, async (db) => {
    const t = await db.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM tentativas_login
        WHERE studio_id = $1 AND email = $2 AND NOT sucesso AND quando > now() - ($3 || ' minutes')::interval`,
      [studioId, em, String(JANELA_MIN)]);
    if (Number(t.rows[0].n) >= MAX_TENTATIVAS) return { ok: false, motivo: "bloqueado" };

    const u = await db.query<Usuario & { senha_hash: string | null }>(
      "SELECT id, nome, email, papel, ativo, senha_hash FROM usuarios WHERE email = $1", [em]);
    const usuario = u.rows[0];
    const confere = usuario ? await conferirSenha(senha, usuario.senha_hash) : await conferirSenha(senha, null);
    await db.query("INSERT INTO tentativas_login (studio_id, email, sucesso) VALUES ($1, $2, $3)", [studioId, em, confere]);
    if (!usuario || !confere) return { ok: false, motivo: "credenciais" };
    if (!usuario.ativo) return { ok: false, motivo: "inativo" };

    const token = novoToken();
    await db.query(
      "INSERT INTO sessoes (token_hash, studio_id, usuario_id, ip, expira_em) VALUES ($1, $2, $3, $4, now() + ($5 || ' seconds')::interval)",
      [hashDoToken(token), studioId, usuario.id, ip, String(DURACAO_SEG)]);
    await db.query("UPDATE usuarios SET ultimo_acesso = now() WHERE id = $1", [usuario.id]);
    const { senha_hash: _, ...pub } = usuario;
    return { ok: true, token, usuario: pub };
  });
}

export async function usuarioDaSessao(studioId: string, token: string | undefined): Promise<Usuario | null> {
  if (!token) return null;
  return comStudio({ studioId, papel: "sistema" }, async (db) => {
    const r = await db.query<Usuario>(
      `SELECT u.id, u.nome, u.email, u.papel, u.ativo FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.token_hash = $1 AND s.expira_em > now() AND u.ativo`, [hashDoToken(token)]);
    const u = r.rows[0];
    if (!u) return null;
    // renova em uso (deslizante), sem gravar a cada clique: só se passou de 1/4 da duração
    await db.query(
      `UPDATE sessoes SET expira_em = now() + ($2 || ' seconds')::interval
        WHERE token_hash = $1 AND expira_em < now() + ($3 || ' seconds')::interval`,
      [hashDoToken(token), String(DURACAO_SEG), String(DURACAO_SEG * 0.75)]);
    return u;
  });
}

export async function sair(studioId: string, token: string | undefined): Promise<void> {
  if (!token) return;
  await comStudio({ studioId, papel: "sistema" }, (db) =>
    db.query("DELETE FROM sessoes WHERE token_hash = $1", [hashDoToken(token)]));
}

export async function limparSessoesVencidas(db: Executor): Promise<void> {
  await db.query("DELETE FROM sessoes WHERE expira_em < now()");
  await db.query("DELETE FROM tentativas_login WHERE quando < now() - interval '1 day'");
}

export const PAPEIS: Record<string, string> = {
  profissional: "Profissional", gerencia: "Gerência", administrador: "Administrador",
};

/** Quem pode o quê (a tela usa para esconder; o banco recusa de todo jeito). */
export function pode(papel: Papel, acao:
  "operar" | "financeiro" | "tarifas" | "encaixe" | "configurar" | "usuarios"): boolean {
  switch (acao) {
    case "operar":     return true;                                           // agenda e clientes
    case "financeiro": return papel === "administrador" || papel === "gerencia" || papel === "sistema";
    case "tarifas":    return papel === "administrador" || papel === "gerencia" || papel === "sistema";
    case "encaixe":    return papel === "administrador" || papel === "gerencia" || papel === "sistema";
    case "configurar": return papel === "administrador" || papel === "sistema";
    case "usuarios":   return papel === "administrador" || papel === "sistema";
  }
}
