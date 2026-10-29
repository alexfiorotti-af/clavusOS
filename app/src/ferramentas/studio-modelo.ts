/**
 * Recria o studio de demonstração pela linha de comando.
 * npm run studio-modelo [-- --senha minhasenha] — slug vem de CLAVUS_DEMO_SLUG (padrão `modelo`).
 * Em produção o mesmo trabalho é feito pela rota /rotina/renovar-demo (cron mensal).
 */
import { carregarEnv, lerAmbiente } from "../ambiente.ts";
import { abrirPool, fecharPool } from "../db/contexto.ts";
import { recriarDemo } from "./demo.ts";

carregarEnv();
const a = lerAmbiente();
if (!a.bancoUrl) { console.error("CLAVUS_DATABASE_URL não definida."); process.exit(1); }
if (!a.demoSlug) { console.error("CLAVUS_DEMO_SLUG vazio: demonstração desligada."); process.exit(1); }
abrirPool(a.bancoUrl);
const senha = (() => { const i = process.argv.indexOf("--senha"); return i >= 0 ? process.argv[i + 1] : a.demoSenha ?? "demonstracao"; })();

recriarDemo({ slug: a.demoSlug, dominioBase: a.dominioBase, senha: senha! })
  .then((r) => {
    console.log(`Studio de demonstração recriado ✨  https://${r.slug}.${a.dominioBase}`);
    console.log(`${r.clientes} clientes · ${r.agendamentos} agendamentos`);
    for (const e of r.entradas) console.log(`  ${e}  (senha: a definida em CLAVUS_DEMO_SENHA${senha === "demonstracao" ? " — padrão 'demonstracao'" : ""})`);
  })
  .catch((e) => { console.error(e.message); process.exitCode = 1; })
  .finally(fecharPool);
