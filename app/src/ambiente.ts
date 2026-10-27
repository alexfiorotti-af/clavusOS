/**
 * ClavusOS — variáveis de ambiente.
 *
 * Lê `.env` (na pasta `app/` ou na raiz do repositório) só quando a variável
 * ainda não existe no processo: na hospedagem, o painel é quem manda.
 * Nenhum valor é gravado em log. Nomes, nunca valores, ficam documentados em
 * `docs/OPERACAO.md`.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function carregarEnv(): void {
  const aqui = dirname(fileURLToPath(import.meta.url));
  for (const candidato of [resolve(aqui, "../.env"), resolve(aqui, "../../.env")]) {
    if (!existsSync(candidato)) continue;
    for (const linhaBruta of readFileSync(candidato, "utf8").split(/\r?\n/)) {
      const linha = linhaBruta.trim();
      if (!linha || linha.startsWith("#")) continue;
      const i = linha.indexOf("=");
      if (i < 1) continue;
      const nome = linha.slice(0, i).trim();
      let valor = linha.slice(i + 1).trim();
      if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
        valor = valor.slice(1, -1);
      }
      if (process.env[nome] === undefined) process.env[nome] = valor;
    }
    break;
  }
}

export type Ambiente = {
  porta: number;
  bancoUrl: string;
  /** Domínio do produto: `<slug>.<dominioBase>` identifica o studio. */
  dominioBase: string;
  /** Studio usado quando o Host não traz slug (desenvolvimento, ou instalação de um studio só). */
  studioPadrao: string | null;
  /** Chave-mestra (32 bytes em hex) que cifra os segredos guardados no banco. */
  chaveMestra: string | null;
  confiaProxy: boolean;
  /** Segredo que autoriza as chamadas de rotina (Cloudflare → /rotina/diaria). */
  chaveRotina: string | null;
  resendChave: string | null;
  emailRemetente: string;
  modo: "producao" | "desenvolvimento" | "teste";
  /** Vitrine da raiz do produto. */
  whatsappComercial: string;
  emailComercial: string;
  demoSlug: string | null;
  demoSenha: string | null;
  precoMensal: string;
  /** Assinatura do ClavusOS: conta Asaas da AF. */
  precoCentavos: number;
  testeDias: number;
  carenciaDias: number;
  asaasAF: { chave: string; ambiente: "sandbox" | "producao"; webhookToken: string } | null;
};

export function lerAmbiente(): Ambiente {
  const e = process.env;
  return {
    porta: Number(e.PORT ?? e.CLAVUS_PORTA ?? 3000),
    bancoUrl: e.CLAVUS_DATABASE_URL ?? e.DATABASE_URL ?? "",
    dominioBase: (e.CLAVUS_DOMINIO_BASE ?? "clavusos.com.br").toLowerCase(),
    studioPadrao: e.CLAVUS_STUDIO_PADRAO?.toLowerCase() || null,
    chaveMestra: e.CLAVUS_CHAVE_MESTRA || null,
    confiaProxy: e.CLAVUS_CONFIA_PROXY === "true",
    chaveRotina: e.CLAVUS_CHAVE_ROTINA || null,
    resendChave: e.RESEND_API_KEY || null,
    emailRemetente: e.CLAVUS_EMAIL_REMETENTE ?? "ClavusOS <avisos@clavusos.com.br>",
    modo: (e.CLAVUS_MODO as Ambiente["modo"]) ?? (e.NODE_ENV === "production" ? "producao" : "desenvolvimento"),
    whatsappComercial: (e.CLAVUS_WHATSAPP ?? "5527996015367").replace(/\D/g, ""),
    emailComercial: e.CLAVUS_EMAIL_COMERCIAL ?? "alexfiorotti@gmail.com",
    demoSlug: e.CLAVUS_DEMO_SLUG === "" ? null : (e.CLAVUS_DEMO_SLUG ?? "modelo"),
    demoSenha: e.CLAVUS_DEMO_SENHA || null,
    precoMensal: formatarPreco(e.CLAVUS_PRECO_MENSAL),
    precoCentavos: centavosDoPreco(e.CLAVUS_PRECO_MENSAL),
    testeDias: Number(e.CLAVUS_TESTE_DIAS ?? 7) || 7,
    carenciaDias: Number(e.CLAVUS_CARENCIA_DIAS ?? 5) || 5,
    asaasAF: e.CLAVUS_ASAAS_AF_CHAVE ? { chave: e.CLAVUS_ASAAS_AF_CHAVE, ambiente: e.CLAVUS_ASAAS_AF_AMBIENTE === "producao" ? "producao" : "sandbox", webhookToken: e.CLAVUS_ASAAS_AF_WEBHOOK_TOKEN ?? "" } : null,
  };
}

/** `147`, `147,00` ou `R$ 147` → `R$ 147`. */
function formatarPreco(v: string | undefined): string {
  const t = (v ?? "").trim();
  if (!t) return "R$ 147";
  const n = /^R?\$?\s*(\d+)(?:[.,](\d{1,2}))?$/.exec(t);
  if (!n) return t;
  const centavos = n[2] && n[2] !== "0" && n[2] !== "00" ? "," + n[2].padEnd(2, "0") : "";
  return `R$ ${n[1]}${centavos}`;
}

/** `147`, `147,90`, `R$ 147` → centavos. */
export function centavosDoPreco(v: string | undefined): number {
  const n = /^R?\$?\s*(\d+)(?:[.,](\d{1,2}))?$/.exec((v ?? "").trim());
  if (!n) return 14700;
  return Number(n[1]) * 100 + Number((n[2] ?? "0").padEnd(2, "0"));
}

/** O que falta para subir em produção. Vazio = pode subir. */
export function faltasDoAmbiente(a: Ambiente): string[] {
  const faltas: string[] = [];
  if (!a.bancoUrl) faltas.push("CLAVUS_DATABASE_URL");
  if (a.modo === "producao") {
    if (!a.chaveMestra || !/^[0-9a-f]{64}$/i.test(a.chaveMestra)) faltas.push("CLAVUS_CHAVE_MESTRA (64 hex)");
    if (!a.chaveRotina) faltas.push("CLAVUS_CHAVE_ROTINA");
  }
  return faltas;
}
