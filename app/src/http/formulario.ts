/** Lê `application/x-www-form-urlencoded`. Campos repetidos viram lista. */
export type Campos = Record<string, string | string[]>;

export function lerFormulario(corpo: string | null): Campos {
  const r: Campos = {};
  if (!corpo) return r;
  const p = new URLSearchParams(corpo);
  for (const [k, v] of p) {
    const atual = r[k];
    if (atual === undefined) r[k] = v;
    else if (Array.isArray(atual)) atual.push(v);
    else r[k] = [atual, v];
  }
  return r;
}

export function campo(c: Campos, nome: string): string {
  const v = c[nome];
  return (Array.isArray(v) ? v[0] : v ?? "").trim();
}
export function lista(c: Campos, nome: string): string[] {
  const v = c[nome];
  if (v === undefined) return [];
  return (Array.isArray(v) ? v : [v]).map((s) => s.trim()).filter(Boolean);
}
export function inteiro(c: Campos, nome: string, padrao = 0): number {
  const v = campo(c, nome);
  if (!/^-?\d+$/.test(v)) return padrao;
  return Number(v);
}
export function marcado(c: Campos, nome: string): boolean {
  const v = campo(c, nome);
  return v === "on" || v === "1" || v === "true" || v === "sim";
}
