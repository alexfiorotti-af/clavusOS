/** Respostas como valores: o roteador decide, o servidor escreve. */
export type Resposta = {
  status: number;
  cabecalhos: Record<string, string | string[]>;
  corpo: string | Buffer;
};

export function html(corpo: string, status = 200, extra: Record<string, string | string[]> = {}): Resposta {
  return { status, cabecalhos: { "content-type": "text/html; charset=utf-8", ...extra }, corpo };
}
export function texto(corpo: string, status = 200): Resposta {
  return { status, cabecalhos: { "content-type": "text/plain; charset=utf-8" }, corpo };
}
export function json(obj: unknown, status = 200): Resposta {
  return { status, cabecalhos: { "content-type": "application/json; charset=utf-8" }, corpo: JSON.stringify(obj) };
}
export function redirecionar(para: string, extra: Record<string, string | string[]> = {}): Resposta {
  return { status: 303, cabecalhos: { location: para, ...extra }, corpo: "" };
}
export function arquivo(corpo: Buffer | string, tipo: string, nome?: string): Resposta {
  const c: Record<string, string> = { "content-type": tipo };
  if (nome) c["content-disposition"] = `attachment; filename="${nome}"`;
  return { status: 200, cabecalhos: c, corpo };
}

/** Escapa texto para HTML. Tudo o que vem do usuário passa por aqui. */
export function e(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Cabeçalhos de segurança que toda página leva. */
export const CABECALHOS_SEGUROS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "same-origin",
  "content-security-policy":
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; script-src 'self'; form-action 'self'; frame-ancestors 'none'",
};
