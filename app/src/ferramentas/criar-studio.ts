/**
 * npm run criar-studio -- --slug anaunhas --nome "Ana Unhas" --admin-nome "Ana" --admin-email ana@gmail.com [--senha ...]
 * Sem --senha, imprime o link de convite para a administradora definir a senha.
 */
import { carregarEnv, lerAmbiente } from "../ambiente.ts";
import { abrirPool, fecharPool } from "../db/contexto.ts";
import { criarStudio } from "./studios-admin.ts";

function arg(nome: string): string | null {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] ?? null : null;
}

carregarEnv();
const a = lerAmbiente();
if (!a.bancoUrl) { console.error("CLAVUS_DATABASE_URL não definida."); process.exit(1); }
const slug = arg("slug"), nome = arg("nome");
if (!slug || !nome) { console.error("Uso: --slug <slug> --nome <nome> [--admin-nome <n> --admin-email <e>] [--senha <s>] [--cidade] [--uf] [--teste-dias 30] [--cortesia]"); process.exit(1); }
abrirPool(a.bancoUrl);
const adminNome = arg("admin-nome"), adminEmail = arg("admin-email");
criarStudio({
  slug, nome, cidade: arg("cidade"), uf: arg("uf"),
  admin: adminNome && adminEmail ? { nome: adminNome, email: adminEmail, senha: arg("senha") } : null,
  testeDias: arg("teste-dias") ? Number(arg("teste-dias")) : a.testeDias, cortesia: process.argv.includes("--cortesia"),
}).then((r) => {
  console.log(`Studio criado: ${slug} (${r.id})`);
  console.log(`Endereço: https://${slug}.${a.dominioBase}`);
  if (r.conviteToken) console.log(`Convite da administradora (vale 3 dias): https://${slug}.${a.dominioBase}/convite/${r.conviteToken}`);
  else if (!adminNome) console.log("Sem administradora: a tela de primeiro acesso vai criar uma.");
}).catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(fecharPool);
