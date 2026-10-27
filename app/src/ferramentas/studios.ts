/** npm run studios — lista; `-- --suspender x` / `--ativar x` / `--cortesia x` / `--pago-ate x AAAA-MM-DD` / `--teste-ate x AAAA-MM-DD`. */
import { carregarEnv, lerAmbiente } from "../ambiente.ts";
import { abrirPool, fecharPool } from "../db/contexto.ts";
import { listarStudios, mudarStudio } from "./studios-admin.ts";

carregarEnv();
const a = lerAmbiente();
if (!a.bancoUrl) { console.error("CLAVUS_DATABASE_URL não definida."); process.exit(1); }
abrirPool(a.bancoUrl);

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] ?? null : null; };

(async () => {
  const acoes: [string, (s: string) => Promise<void>][] = [
    ["suspender", (s) => mudarStudio(s, { situacao: "suspenso" })],
    ["ativar", (s) => mudarStudio(s, { situacao: "ativo" })],
    ["cortesia", (s) => mudarStudio(s, { plano: "cortesia" })],
  ];
  for (const [n, f] of acoes) { const s = arg(n); if (s) { await f(s); console.log(`${n}: ${s} ✓`); } }
  const pagoAte = arg("pago-ate"); if (pagoAte) { await mudarStudio(pagoAte, { pago_ate: process.argv[process.argv.indexOf("--pago-ate") + 2] }); console.log("pago-ate ✓"); }
  const testeAte = arg("teste-ate"); if (testeAte) { await mudarStudio(testeAte, { teste_ate: process.argv[process.argv.indexOf("--teste-ate") + 2] }); console.log("teste-ate ✓"); }
  for (const s of await listarStudios()) {
    console.log(`${s.slug.padEnd(22)} ${s.situacao.padEnd(9)} ${s.plano.padEnd(11)} teste:${s.teste_ate ?? "-"}  pago:${s.pago_ate ?? "-"}  ${s.entrou ? "" : "(nunca entrou)"} — ${s.nome}`);
  }
})().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(fecharPool);
