/**
 * Cofre: cifra segredos guardados no banco (a chave do Asaas de cada hotel)
 * com AES-256-GCM e a chave-mestra do ambiente. Quem tem o banco sem a chave
 * não lê; quem tem a chave sem o banco não tem o quê ler.
 * Formato: `v1.<iv_hex>.<tag_hex>.<cifrado_hex>`.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function chave(mestra: string | null): Buffer {
  if (!mestra || !/^[0-9a-f]{64}$/i.test(mestra)) {
    throw new Error("CLAVUS_CHAVE_MESTRA ausente ou inválida (precisa de 64 caracteres hexadecimais).");
  }
  return Buffer.from(mestra, "hex");
}

export function cifrar(texto: string, mestra: string | null): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(mestra), iv);
  const out = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return `v1.${iv.toString("hex")}.${c.getAuthTag().toString("hex")}.${out.toString("hex")}`;
}

export function decifrar(guardado: string, mestra: string | null): string {
  const [v, ivHex, tagHex, dadoHex] = guardado.split(".");
  if (v !== "v1" || !ivHex || !tagHex || !dadoHex) throw new Error("segredo em formato desconhecido");
  const d = createDecipheriv("aes-256-gcm", chave(mestra), Buffer.from(ivHex, "hex"));
  d.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([d.update(Buffer.from(dadoHex, "hex")), d.final()]).toString("utf8");
}

/** Gera uma chave-mestra nova (para o .env / painel da hospedagem). */
export function novaChaveMestra(): string {
  return randomBytes(32).toString("hex");
}
