/**
 * Banco: um pool do `pg` e a transação com contexto.
 *
 * Toda leitura ou gravação de dados de studio passa por `comStudio(...)`: abre
 * uma transação, assume o papel `clavus_app`, declara o studio/usuário/papel
 * em variáveis de sessão e só então roda o trabalho. As políticas de linha
 * do Postgres (db/002_rls.sql) fazem o resto — a aplicação não filtra por
 * studio em lugar nenhum, porque não precisa e porque esquecer um filtro
 * seria um vazamento.
 */
import pg from "pg";

export type Papel = "profissional" | "gerencia" | "administrador" | "sistema";

export type Contexto = {
  studioId: string;
  usuarioId?: string | null;
  papel: Papel;
  /** Fuso do studio: CURRENT_DATE e now()::date passam a ser o "hoje" do studio, não o do servidor. */
  fuso?: string;
};

export type Executor = {
  query<T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, params?: unknown[]): Promise<pg.QueryResult<T>>;
};

let pool: pg.Pool | null = null;

// `date` do Postgres chega como texto `YYYY-MM-DD`, nunca como Date com fuso;
// `time` chega como "HH:MM:SS" — cortamos para "HH:MM".
pg.types.setTypeParser(1082, (v: string) => v);
pg.types.setTypeParser(1083, (v: string) => v.slice(0, 5));
// smallint[] (dias do mês / da semana) → number[]
(pg.types.setTypeParser as (oid: number, p: (v: string) => unknown) => void)(1005, (v: string) =>
  v === "{}" ? [] : v.slice(1, -1).split(",").map(Number));

export function abrirPool(url: string): pg.Pool {
  if (pool) return pool;
  pool = new pg.Pool({
    connectionString: url,
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? undefined : { rejectUnauthorized: false },
  });
  pool.on("error", (err) => console.error("[banco] conexão ociosa caiu:", err.message));
  return pool;
}

export async function fecharPool(): Promise<void> {
  if (pool) { await pool.end(); pool = null; }
}

export function poolAtual(): pg.Pool {
  if (!pool) throw new Error("banco não aberto");
  return pool;
}

/** Transação com contexto de studio. Erro → ROLLBACK e o erro sobe. */
export async function comStudio<T>(ctx: Contexto, trabalho: (db: Executor) => Promise<T>): Promise<T> {
  const cliente = await poolAtual().connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query("SET LOCAL ROLE clavus_app");
    await cliente.query("SET LOCAL search_path = clavus, public, extensions");
    if (ctx.fuso && /^[A-Za-z_]+\/[A-Za-z_]+$/.test(ctx.fuso)) await cliente.query(`SET LOCAL TIME ZONE '${ctx.fuso}'`);
    await cliente.query("SELECT set_config('clavus.studio_id', $1, true), set_config('clavus.usuario_id', $2, true), set_config('clavus.papel', $3, true)",
      [ctx.studioId, ctx.usuarioId ?? "", ctx.papel]);
    const r = await trabalho(cliente);
    await cliente.query("COMMIT");
    return r;
  } catch (err) {
    try { await cliente.query("ROLLBACK"); } catch { /* já caiu */ }
    throw err;
  } finally {
    cliente.release();
  }
}

/** Sem contexto de studio: só o que é definer (resolver slug) ou de administração. */
export async function semStudio<T>(trabalho: (db: Executor) => Promise<T>): Promise<T> {
  const cliente = await poolAtual().connect();
  try {
    await cliente.query("SET search_path = clavus, public, extensions");
    return await trabalho(cliente);
  } finally {
    cliente.release();
  }
}

/** Erros do Postgres que viram mensagem para a tela, não 500. */
export function erroDeRegra(err: unknown): string | null {
  const e = err as { code?: string; constraint?: string; message?: string };
  if (e?.code === "23P01" && e.constraint === "sem_choque") {
    return "Essa profissional já tem atendimento nesse horário. Escolha outro horário — ou marque como encaixe (gerência).";
  }
  if (e?.code === "23505") {
    if (e.constraint?.includes("lanc_um_por_atendimento")) return "Esse atendimento já tem a receita lançada.";
    if (e.constraint?.includes("usuarios_studio_id_email")) return "Já existe um usuário com esse e-mail.";
    if (e.constraint?.includes("servicos_studio_id_nome")) return "Já existe um serviço com esse nome.";
    if (e.constraint?.includes("produtos_studio_id_nome")) return "Já existe um produto com esse nome.";
    if (e.constraint?.includes("profissionais_studio_id_nome")) return "Já existe uma profissional com esse nome.";
    if (e.constraint?.includes("planos_studio_id_nome")) return "Já existe um plano com esse nome.";
    return "Já existe um registro igual a esse.";
  }
  if (e?.code === "42501" || /row-level security/.test(e?.message ?? "")) {
    return "Seu perfil não tem permissão para essa ação.";
  }
  if (e?.code === "23514") return "Um dos valores informados está fora do permitido.";
  if (e?.code === "P0001") return e.message ?? "Operação recusada pelo banco.";
  return null;
}
