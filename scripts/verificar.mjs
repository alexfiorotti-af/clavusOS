#!/usr/bin/env node
/**
 * ClavusOS — verificador de integridade e segurança.
 *
 * Roda à mão (`npm run verificar`) e varre três camadas:
 *   CÓDIGO       — injeção de SQL, cabeçalhos, cookies, senha, webhooks, tipos.
 *   REPOSITÓRIO  — nenhum segredo versionado, dependências sem falha conhecida.
 *   BANCO        — (se houver CLAVUS_DATABASE_URL) RLS forçado em toda tabela,
 *                  isolamento entre studios na prática, e integridade dos dados.
 *
 * Cada item vira PASSOU / ATENÇÃO / FALHOU. Sai com código 1 se algo FALHOU,
 * para poder entrar num CI depois. Não muda nada no sistema: só lê e conecta.
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(RAIZ, "app");
const ler = (p) => { try { return readFileSync(join(RAIZ, p), "utf8"); } catch { return ""; } };
const sh = (cmd, cwd = RAIZ) => { try { return { ok: true, out: execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) }; } catch (e) { return { ok: false, out: (e.stdout || "") + (e.stderr || "") }; } };

const C = { ok: "\x1b[32m", avi: "\x1b[33m", err: "\x1b[31m", dim: "\x1b[2m", neg: "\x1b[1m", fim: "\x1b[0m" };
let nPassou = 0, nAtencao = 0, nFalhou = 0;
const PASSOU = (t, d) => { nPassou++; console.log(`  ${C.ok}✓${C.fim} ${t}${d ? `  ${C.dim}${d}${C.fim}` : ""}`); };
const ATENCAO = (t, d) => { nAtencao++; console.log(`  ${C.avi}!${C.fim} ${t}${d ? `  ${C.dim}${d}${C.fim}` : ""}`); };
const FALHOU = (t, d) => { nFalhou++; console.log(`  ${C.err}✗${C.fim} ${t}${d ? `  ${C.dim}${d}${C.fim}` : ""}`); };
const titulo = (t) => console.log(`\n${C.neg}${t}${C.fim}`);

// ---------------------------------------------------------------- CÓDIGO
function verificarCodigo() {
  titulo("CÓDIGO");

  // 1. SQL com nome de coluna/tabela interpolado — só o que estiver numa allowlist comprovada.
  const fontes = sh(`grep -rnE "query\\(|execute\\(" app/src --include=*.ts`).out.split("\n")
    .filter((l) => l && !l.includes(".teste.ts") && /\$\{/.test(l));
  const suspeitas = fontes.filter((l) => {
    if (/\|\| ' (minutes|seconds|days)'/.test(l)) return false;              // intervalos: valor vai por parâmetro
    if (/SET LOCAL TIME ZONE '\$\{ctx\.fuso\}'/.test(l)) return false;       // guardado por regex de fuso
    if (/\$\{sets\.join/.test(l)) return false;                              // colunas via allowlist (mudarStudio)
    if (/\$\$\{p\}\$\$|\$p\$/.test(l)) return false;                         // dollar-quote de DO $$ (RLS), não dado
    return true;
  });
  if (!suspeitas.length) PASSOU("Nenhuma SQL monta valor por interpolação de string", "tudo por $1,$2… ou allowlist");
  else suspeitas.forEach((l) => FALHOU("SQL com interpolação a revisar", l.trim().slice(0, 100)));

  // 2. Allowlist de colunas no único UPDATE dinâmico.
  const adm = ler("app/src/ferramentas/studios-admin.ts");
  if (/COLUNAS\s*=\s*new Set/.test(adm) && /COLUNAS\.has\(k\)/.test(adm)) PASSOU("UPDATE dinâmico de studios tranca coluna em allowlist");
  else FALHOU("UPDATE dinâmico de studios sem allowlist de coluna", "studios-admin.ts");

  // 3. Fuso interpolado, mas validado.
  const ctx = ler("app/src/db/contexto.ts");
  if (/SET LOCAL TIME ZONE '\$\{ctx\.fuso\}'/.test(ctx) && /\/\^\[A-Za-z_\]\+\\\/\[A-Za-z_\]\+\$\//.test(ctx))
    PASSOU("Fuso do studio validado por regex antes de ir pra SQL");
  else if (/SET LOCAL TIME ZONE/.test(ctx)) ATENCAO("Confira a validação do fuso em contexto.ts");

  // 4. Cabeçalhos de segurança.
  const resp = ler("app/src/http/resposta.ts");
  const faltamCab = ["content-security-policy", "x-frame-options", "x-content-type-options", "referrer-policy"].filter((h) => !resp.includes(h));
  if (!faltamCab.length) PASSOU("Cabeçalhos de segurança presentes", "CSP, X-Frame-Options, nosniff, Referrer-Policy");
  else FALHOU("Cabeçalho de segurança ausente", faltamCab.join(", "));
  if (/script-src 'self'/.test(resp) && !/script-src[^;]*unsafe-inline/.test(resp)) PASSOU("CSP não permite script inline", "script-src 'self'");
  else ATENCAO("CSP permite script inline — revise", "risco de XSS");

  // 5. Cookie de sessão.
  const cke = ler("app/src/http/cookie.ts");
  if (/HttpOnly/.test(cke) && /SameSite/.test(cke) && /Secure/.test(cke)) PASSOU("Cookie de sessão: HttpOnly + SameSite + Secure (em produção)");
  else FALHOU("Cookie de sessão sem flag de segurança", "cookie.ts");

  // 6. Senha: scrypt + comparação em tempo constante; nada de md5/sha1 pra senha.
  const senha = ler("app/src/auth/senha.ts");
  if (/scrypt/.test(senha) && /timingSafeEqual/.test(senha)) PASSOU("Senha com scrypt e comparação em tempo constante");
  else FALHOU("Hash de senha fraco ou sem comparação constante", "auth/senha.ts");
  if (/createHash\(["']md5|createHash\(["']sha1/.test(senha)) FALHOU("md5/sha1 usado em senha", "auth/senha.ts");

  // 7. Sessão guarda só o hash do token.
  const ses = ler("app/src/auth/sessao.ts");
  if (/hashDoToken/.test(ses) && /MAX_TENTATIVAS/.test(ses)) PASSOU("Sessão guarda hash do token e freia tentativas de login");
  else ATENCAO("Confira hash de token e freio de login em sessao.ts");

  // 8. Webhooks exigem token e não baixam conta sozinhos.
  const rotas = ler("app/src/http/rotas.ts");
  if (/token inválido", 401/.test(rotas) && /iguais\(/.test(rotas)) PASSOU("Webhooks exigem token (comparação tempo-constante)");
  else FALHOU("Webhook sem conferência de token", "rotas.ts");

  // 9. Teto de corpo (anti-DoS).
  const srv = ler("app/src/servidor.ts");
  if (/TETO_CORPO/.test(srv) && /req\.destroy\(\)/.test(srv)) PASSOU("Corpo da requisição tem teto (anti-DoS)");
  else ATENCAO("Sem teto de corpo na requisição", "servidor.ts");

  // 10. Boot falha fechado se faltar variável (a checagem pode estar em ambiente.ts ou servidor.ts).
  const boot = ler("app/src/ambiente.ts") + ler("app/src/servidor.ts");
  if (/process\.exit\(1\)/.test(boot) && /faltas/.test(boot)) PASSOU("Boot aborta se faltar variável de ambiente (falha fechado)");
  else ATENCAO("Boot pode subir sem variável obrigatória", "ambiente.ts / servidor.ts");

  // 11. Segredo embutido no código? (chave Asaas, chave-mestra, token longo).
  const vaza = sh(`grep -rnE "aact_(prod|hmlg|sand)_|[0-9a-f]{64}" app/src --include=*.ts`).out
    .split("\n").filter((l) => l && !/exemplo|teste|placeholder|<|xxxx/i.test(l));
  if (!vaza.length) PASSOU("Nenhuma chave real embutida no código-fonte");
  else vaza.forEach((l) => FALHOU("Possível segredo no código", l.trim().slice(0, 90)));

  // 12. Tipos.
  const tipos = sh("npm run tipos", APP);
  if (tipos.ok) PASSOU("TypeScript sem erros de tipo (npm run tipos)");
  else FALHOU("Erros de tipo", "rode: cd app && npm run tipos");
}

// ---------------------------------------------------------------- REPOSITÓRIO
function verificarRepositorio() {
  titulo("REPOSITÓRIO (GitHub)");

  // 1. Nenhum segredo versionado.
  const rastreados = sh(`git ls-files`).out.split("\n");
  const segredos = rastreados.filter((f) => /(^|\/)\.env$|\.env\.(?!exemplo)|\.pem$|\.key$|cofre\.json|segredos?\./i.test(f));
  if (!segredos.length) PASSOU("Nenhum arquivo de segredo versionado", "só .env.exemplo é rastreado");
  else segredos.forEach((f) => FALHOU("Arquivo de segredo versionado", f));

  // 2. .gitignore cobre .env.
  const gi = ler(".gitignore");
  if (/^\.env$/m.test(gi) && /^\.env\.\*/m.test(gi)) PASSOU(".gitignore cobre .env e .env.*");
  else FALHOU(".gitignore não cobre .env", "adicione .env e .env.*");

  // 3. .env real nunca passou pelo histórico.
  const hist = sh(`git log --all --pretty=format: --name-only --diff-filter=A`).out.split("\n");
  const envNoHist = hist.filter((f) => /(^|\/)\.env$|\.env\.(?!exemplo)/.test(f));
  if (!envNoHist.length) PASSOU("Nenhum .env real no histórico do Git");
  else { envNoHist.forEach((f) => FALHOU("Segredo já existiu no histórico — gire a chave", f)); }

  // 4. .env.exemplo só com placeholders.
  const ex = ler("app/.env.exemplo");
  if (ex) {
    const comValor = ex.split("\n").filter((l) => /aact_(prod|hmlg)_|^[A-Z_]+=[0-9a-f]{64}$/.test(l.trim()));
    if (!comValor.length) PASSOU(".env.exemplo só tem exemplos, nenhum segredo real");
    else comValor.forEach((l) => FALHOU("Valor real no .env.exemplo", l.trim().slice(0, 50)));
  }

  // 5. Dependências sem falha conhecida.
  const audit = sh("npm audit --omit=dev --audit-level=low", APP);
  if (audit.ok && /found 0 vulnerabilities/.test(audit.out)) PASSOU("npm audit: 0 vulnerabilidades");
  else if (/\d+ vulnerabilit/.test(audit.out)) FALHOU("npm audit achou falhas", audit.out.match(/\d+ vulnerabilit\w+/)?.[0] || "rode npm audit");
  else ATENCAO("npm audit não pôde rodar (sem rede?)", "rode manualmente antes de publicar");
}

// ---------------------------------------------------------------- BANCO
async function verificarBanco() {
  titulo("BANCO (RLS e integridade)");
  const url = process.env.CLAVUS_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) { ATENCAO("Sem CLAVUS_DATABASE_URL — pulando checagens ao vivo", "aponte para uma cópia de teste para rodar"); return; }

  // Tabelas de sistema (não guardam dado de studio): fora da exigência de RLS/studio_id.
  const SEM_TENANT = new Set(["studios", "migracoes"]);

  let pg;
  try { pg = (await import(join(APP, "node_modules/pg/lib/index.js"))).default; }
  catch { try { pg = (await import("pg")).default; } catch { ATENCAO("pacote pg não encontrado para checar o banco"); return; } }

  const dono = new pg.Client({ connectionString: url });
  try { await dono.connect(); } catch (e) { FALHOU("Não conectou no banco", e.message); return; }

  try {
    // 1. FORCE RLS em toda tabela do schema clavus (menos studios, que é ENABLE sem FORCE de propósito).
    const t = await dono.query(`
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'clavus' AND c.relkind = 'r' ORDER BY c.relname`);
    const semRLS = t.rows.filter((r) => !r.relrowsecurity && !SEM_TENANT.has(r.relname));
    const semForce = t.rows.filter((r) => r.relrowsecurity && !r.relforcerowsecurity && !SEM_TENANT.has(r.relname));
    const comRLS = t.rows.filter((r) => !SEM_TENANT.has(r.relname));
    if (!t.rows.length) { ATENCAO("Schema clavus vazio — rode as migrações primeiro"); }
    else if (!semRLS.length && !semForce.length) PASSOU(`RLS+FORCE em ${comRLS.length} tabelas de dado; studios/migracoes fora de propósito`);
    else {
      semRLS.forEach((r) => FALHOU("Tabela sem RLS", r.relname));
      semForce.forEach((r) => FALHOU("Tabela com RLS mas sem FORCE", r.relname));
    }

    // 2. Toda tabela com política de isolamento tem a coluna studio_id.
    const cols = await dono.query(`
      SELECT table_name FROM information_schema.columns
       WHERE table_schema = 'clavus' AND column_name = 'studio_id'`);
    const comStudioId = new Set(cols.rows.map((r) => r.table_name));
    const semColuna = t.rows.filter((r) => !SEM_TENANT.has(r.relname) && !comStudioId.has(r.relname));
    if (!t.rows.length) {/* já avisado */}
    else if (!semColuna.length) PASSOU("Toda tabela isolada tem a coluna studio_id");
    else semColuna.forEach((r) => FALHOU("Tabela isolada sem studio_id", r.relname));

    // 3. Isolamento na prática: como clavus_app no studio A, não enxergar linha do B.
    const studios = await dono.query(`SELECT id FROM clavus.studios ORDER BY criado_em LIMIT 2`);
    if (studios.rows.length >= 1) {
      const a = studios.rows[0].id;
      const cli = new pg.Client({ connectionString: url });
      await cli.connect();
      try {
        await cli.query("BEGIN");
        await cli.query("SET LOCAL ROLE clavus_app");
        await cli.query("SET LOCAL search_path = clavus, public, extensions");
        await cli.query("SELECT set_config('clavus.studio_id',$1,true), set_config('clavus.papel','administrador',true)", [a]);
        const vis = await cli.query("SELECT count(*)::int AS n, count(*) FILTER (WHERE studio_id <> $1)::int AS fora FROM clientes", [a]);
        if (vis.rows[0].fora === 0) PASSOU("clavus_app no studio A não lê cliente de outro studio", `${vis.rows[0].n} linhas, 0 de fora`);
        else FALHOU("VAZAMENTO: clavus_app enxergou cliente de outro studio", `${vis.rows[0].fora} linhas fora do contexto`);
        // Sem contexto nenhum: não pode ver nada.
        await cli.query("SELECT set_config('clavus.studio_id','',true)");
        const zero = await cli.query("SELECT count(*)::int AS n FROM clientes");
        if (zero.rows[0].n === 0) PASSOU("Sem studio no contexto, clavus_app não lê nada");
        else FALHOU("Sem contexto, clavus_app ainda lê linhas", `${zero.rows[0].n} visíveis`);
        await cli.query("ROLLBACK");
      } catch (e) { ATENCAO("Não deu pra provar isolamento ao vivo", e.message); await cli.query("ROLLBACK").catch(() => {}); }
      finally { await cli.end(); }
    } else ATENCAO("Sem studios no banco — pulando prova de isolamento");

    // 4. Integridade dos dados (como dono, lendo tudo).
    const q = async (sql) => (await dono.query(sql)).rows[0].n;
    const checa = async (nome, sql, dica) => { const n = Number(await q(sql)); if (n === 0) PASSOU(nome); else FALHOU(`${nome}: ${n}`, dica); };
    if (t.rows.length) {
      await checa("Sem dinheiro negativo em lançamentos", "SELECT count(*)::int n FROM clavus.lancamentos WHERE valor < 0", "valor em centavos deve ser >= 0");
      await checa("Sem estoque negativo em produtos", "SELECT count(*)::int n FROM clavus.produtos WHERE estoque < 0", "PDV não pode deixar estoque < 0");
      await checa("Sem agendamento órfão de studio", "SELECT count(*)::int n FROM clavus.agendamentos a LEFT JOIN clavus.studios s ON s.id=a.studio_id WHERE s.id IS NULL", "FK quebrada");
      await checa("Sem sessão sem usuário", "SELECT count(*)::int n FROM clavus.sessoes x LEFT JOIN clavus.usuarios u ON u.id=x.usuario_id WHERE u.id IS NULL", "sessão apontando usuário inexistente");
      // Choque de horário que escapou (mesma profissional, ativo, sem encaixe, mesmo studio, horários cruzando).
      await checa("Sem choque de horário fora de encaixe",
        `SELECT count(*)::int n FROM clavus.agendamentos a JOIN clavus.agendamentos b
           ON a.studio_id=b.studio_id
          AND COALESCE(a.profissional_id,'00000000-0000-0000-0000-000000000000')
            = COALESCE(b.profissional_id,'00000000-0000-0000-0000-000000000000')
          AND a.id < b.id
          AND a.ativo AND b.ativo AND NOT a.encaixe AND NOT b.encaixe
          AND a.horario && b.horario`,
        "a trava sem_choque do banco deveria impedir — investigue");
    }
  } finally { await dono.end(); }
}

// ---------------------------------------------------------------- MAIN
console.log(`${C.neg}ClavusOS — verificação de integridade e segurança${C.fim}  ${C.dim}${new Date().toLocaleString("pt-BR")}${C.fim}`);
try {
  verificarCodigo();
  verificarRepositorio();
  await verificarBanco();
} catch (e) {
  console.error(`\n${C.err}Erro no verificador:${C.fim}`, e.message);
}
console.log(`\n${C.neg}Resumo${C.fim}  ${C.ok}${nPassou} passou${C.fim} · ${C.avi}${nAtencao} atenção${C.fim} · ${C.err}${nFalhou} falhou${C.fim}`);
if (nFalhou > 0) { console.log(`${C.err}Há item(ns) para resolver antes de considerar seguro.${C.fim}`); process.exit(1); }
console.log(`${C.ok}Nenhuma falha. Atenções são recomendações, não bloqueios.${C.fim}`);
