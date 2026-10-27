/**
 * Senhas com scrypt (node:crypto), sal por senha, comparação em tempo constante.
 * Formato guardado: `scrypt$N$r$p$sal_hex$hash_hex`. Sem dependência externa.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (s: string, sal: Buffer, len: number, o: object) => Promise<Buffer>;
const N = 16384, r = 8, p = 1, LEN = 32;

export const SENHA_MINIMA = 8;

export function senhaAceitavel(s: string): string | null {
  if (s.length < SENHA_MINIMA) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (/^(.)\1+$/.test(s) || /^(0123456789|123456789?0?|senha\d*|password\d*|qwerty.*)$/i.test(s)) {
    return "Essa senha é fácil demais de adivinhar.";
  }
  return null;
}

export async function gerarHash(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const h = await scrypt(senha.normalize("NFKC"), sal, LEN, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${sal.toString("hex")}$${h.toString("hex")}`;
}

export async function conferirSenha(senha: string, guardado: string | null | undefined): Promise<boolean> {
  if (!guardado) return false;
  const partes = guardado.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;
  const [, n, rr, pp, salHex, hashHex] = partes;
  try {
    const h = await scrypt(senha.normalize("NFKC"), Buffer.from(salHex, "hex"), hashHex.length / 2,
      { N: Number(n), r: Number(rr), p: Number(pp) });
    const esperado = Buffer.from(hashHex, "hex");
    return h.length === esperado.length && timingSafeEqual(h, esperado);
  } catch {
    return false;
  }
}

/** Token aleatório para sessão, convite, webhook. */
export function novoToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** O banco guarda só o hash do token; o cookie leva o token. */
export function hashDoToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
