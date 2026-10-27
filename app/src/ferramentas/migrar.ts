/**
 * Aplica as migrações de `db/` na ordem, guardando em `clavus.migracoes` o que
 * já rodou. Uso: `npm run migrar` (lê CLAVUS_DATABASE_URL). No Supabase pode-se
 * colar os arquivos no editor SQL em vez disso — dá no mesmo.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { carregarEnv, lerAmbiente } from "../ambiente.ts";

export async function migrar(url: string, log: (s: string) => void = console.log): Promise<string[]> {
  const pasta = resolve(dirname(fileURLToPath(import.meta.url)), "../../../db");
  const arquivos = readdirSync(pasta).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort();
  const c = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false } });
  await c.connect();
  const aplicadas: string[] = [];
  try {
    await c.query("CREATE SCHEMA IF NOT EXISTS clavus");
    await c.query("CREATE TABLE IF NOT EXISTS clavus.migracoes (nome text PRIMARY KEY, aplicada_em timestamptz NOT NULL DEFAULT now())");
    const feitas = new Set((await c.query<{ nome: string }>("SELECT nome FROM clavus.migracoes")).rows.map((r) => r.nome));
    for (const a of arquivos) {
      if (feitas.has(a)) continue;
      log(`aplicando ${a}`);
      await c.query("BEGIN");
      try {
        await c.query(readFileSync(resolve(pasta, a), "utf8"));
        await c.query("INSERT INTO clavus.migracoes (nome) VALUES ($1)", [a]);
        await c.query("COMMIT");
        aplicadas.push(a);
      } catch (e) {
        await c.query("ROLLBACK");
        throw new Error(`${a}: ${(e as Error).message}`);
      }
    }
  } finally {
    await c.end();
  }
  return aplicadas;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  carregarEnv();
  const a = lerAmbiente();
  if (!a.bancoUrl) { console.error("CLAVUS_DATABASE_URL não definida."); process.exit(1); }
  migrar(a.bancoUrl).then((x) => console.log(x.length ? `${x.length} migração(ões) aplicada(s).` : "Nada a aplicar: banco em dia."))
    .catch((e) => { console.error(e.message); process.exit(1); });
}
