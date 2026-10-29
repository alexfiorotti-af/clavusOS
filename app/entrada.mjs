/**
 * Arquivo de entrada para hospedagens que iniciam o app com `node <arquivo>`
 * (na Hostinger: Diretório raiz = app, Arquivo de entrada = entrada.mjs).
 * O `listen()` precisa acontecer neste mesmo processo — a hospedagem vigia a
 * porta —, por isso o servidor é importado aqui, e não lançado em filho.
 *
 * O servidor é TypeScript executado direto pelo Node, o que exige Node 22.18+
 * (type stripping ligado por padrão). Em Node mais antigo, rode
 * `node --experimental-strip-types entrada.mjs`.
 */
try {
  const { iniciar } = await import("./src/servidor.ts");
  iniciar();
} catch (erro) {
  if (erro && (erro.code === "ERR_UNKNOWN_FILE_EXTENSION" || /strip-types|TypeScript/.test(String(erro.message)))) {
    console.error("Este Node não executa TypeScript direto. Use Node 22.18 ou mais novo, ou inicie com: node --experimental-strip-types entrada.mjs");
  }
  throw erro;
}
