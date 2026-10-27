/**
 * ClavusOS — o servidor. `node:http` e mais nada: sobe em qualquer lugar com Node 22,
 * sem dependência para auditar. Este arquivo só lê o pedido (com teto de
 * tamanho), descobre o endereço de quem chamou, escreve a resposta e desliga
 * direito. As decisões estão em `http/rotas.ts`.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { carregarEnv, lerAmbiente, faltasDoAmbiente } from "./ambiente.ts";
import { abrirPool, fecharPool } from "./db/contexto.ts";
import { atender } from "./http/rotas.ts";
import { lerCookies } from "./http/cookie.ts";
import type { Pedido } from "./http/pedido.ts";
import { enviadorResend, enviadorDeMentira } from "./correio/correio.ts";
import type { Servicos } from "./http/contexto-web.ts";

const TETO_CORPO = 256 * 1024;

function lerCorpo(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolver) => {
    const pedacos: Buffer[] = [];
    let total = 0, terminou = false;
    const fim = (v: string | null) => { if (!terminou) { terminou = true; resolver(v); } };
    req.on("data", (p: Buffer) => { total += p.length; if (total > TETO_CORPO) { req.destroy(); fim(null); return; } pedacos.push(p); });
    req.on("end", () => fim(Buffer.concat(pedacos).toString("utf8")));
    req.on("error", () => fim(null));
    req.on("aborted", () => fim(null));
  });
}

function endereco(req: IncomingMessage, confiaProxy: boolean): string | null {
  if (confiaProxy) {
    const cf = req.headers["cf-connecting-ip"];
    if (typeof cf === "string" && cf) return cf;
    const xf = req.headers["x-forwarded-for"];
    if (typeof xf === "string" && xf) return xf.split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? null;
}

export function montarServicos(): Servicos {
  const ambiente = lerAmbiente();
  return {
    ambiente,
    enviar: ambiente.resendChave ? enviadorResend(ambiente.resendChave) : enviadorDeMentira,
    agora: () => new Date(),
  };
}

export function criarServidorHttp(servicos: Servicos) {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const inicio = Date.now();
    try {
      const url = new URL(req.url ?? "/", "http://x");
      const corpo = req.method === "POST" || req.method === "PUT" ? await lerCorpo(req) : null;
      const pedido: Pedido = {
        metodo: req.method ?? "GET", caminho: url.pathname.replace(/\/+$/, "") || "/", query: url.searchParams,
        cabecalhos: req.headers, corpo, cookies: lerCookies(req.headers.cookie), ip: endereco(req, servicos.ambiente.confiaProxy),
        host: typeof req.headers["x-forwarded-host"] === "string" && servicos.ambiente.confiaProxy ? req.headers["x-forwarded-host"] : req.headers.host,
      };
      const r = await atender(pedido, servicos);
      res.writeHead(r.status, r.cabecalhos);
      res.end(r.corpo);
      if (servicos.ambiente.modo !== "producao" || r.status >= 500) console.log(`${pedido.metodo} ${pedido.caminho} ${r.status} ${Date.now() - inicio}ms`);
    } catch (err) {
      console.error("[servidor]", err);
      if (!res.headersSent) res.writeHead(500, { "content-type": "text/html; charset=utf-8" });
      res.end("<!doctype html><meta charset=utf-8><p style='font-family:system-ui;padding:40px'>Deu um erro inesperado. Já ficou registrado; tente de novo em instantes.</p>");
    }
  });
}

/** Sobe o servidor. Chamado daqui (npm start em app/) ou por `entrada.mjs` na raiz (Hostinger). */
export function iniciar(): void {
  carregarEnv();
  const servicos = montarServicos();
  const faltas = faltasDoAmbiente(servicos.ambiente);
  if (faltas.length) { console.error("Faltam variáveis de ambiente: " + faltas.join(", ")); process.exit(1); }
  abrirPool(servicos.ambiente.bancoUrl);
  const servidor = criarServidorHttp(servicos);
  servidor.listen(servicos.ambiente.porta, () => console.log(`ClavusOS no ar na porta ${servicos.ambiente.porta} (${servicos.ambiente.modo}); studio padrão: ${servicos.ambiente.studioPadrao ?? "nenhum — pelo subdomínio"}`));
  const desligar = () => { console.log("desligando..."); servidor.close(() => fecharPool().then(() => process.exit(0))); setTimeout(() => process.exit(0), 5000).unref(); };
  process.on("SIGTERM", desligar);
  process.on("SIGINT", desligar);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").slice(-2).join("/"))) {
  iniciar();
}
