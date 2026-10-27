export function lerCookies(cabecalho: string | undefined): Record<string, string> {
  const r: Record<string, string> = {};
  if (!cabecalho) return r;
  for (const parte of cabecalho.split(";")) {
    const i = parte.indexOf("=");
    if (i < 1) continue;
    const nome = parte.slice(0, i).trim();
    const valor = parte.slice(i + 1).trim();
    if (nome && !(nome in r)) {
      try { r[nome] = decodeURIComponent(valor); } catch { r[nome] = valor; }
    }
  }
  return r;
}

export type OpcoesCookie = { maxAgeSeg?: number; seguro?: boolean; caminho?: string };

export function cookieSessao(nome: string, valor: string, o: OpcoesCookie = {}): string {
  const partes = [`${nome}=${encodeURIComponent(valor)}`, `Path=${o.caminho ?? "/"}`, "HttpOnly", "SameSite=Lax"];
  if (o.seguro) partes.push("Secure");
  if (o.maxAgeSeg !== undefined) partes.push(`Max-Age=${Math.max(0, Math.floor(o.maxAgeSeg))}`);
  return partes.join("; ");
}

export function apagarCookie(nome: string, seguro = false): string {
  return cookieSessao(nome, "", { maxAgeSeg: 0, seguro });
}
