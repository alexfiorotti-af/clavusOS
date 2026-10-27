/** Dinheiro é inteiro em centavos. Estas funções só formatam e leem. */

export function reais(centavos: number): string {
  const neg = centavos < 0;
  const v = Math.abs(Math.round(centavos));
  const inteiro = Math.floor(v / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const dec = (v % 100).toString().padStart(2, "0");
  return `${neg ? "-" : ""}R$ ${inteiro},${dec}`;
}

/** "1.234,56" | "1234.56" | "1234" | "R$ 12,00" → centavos. Inválido → null. */
export function lerReais(texto: string | null | undefined): number | null {
  if (texto == null) return null;
  let t = texto.replace(/R\$|\s/g, "").trim();
  if (!t) return null;
  const neg = t.startsWith("-");
  if (neg) t = t.slice(1);
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if ((t.match(/\./g) ?? []).length > 1) t = t.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [i, d = ""] = t.split(".");
  const c = Number(i) * 100 + Number((d + "00").slice(0, 2));
  return neg ? -c : c;
}

export function percentual(centavos: number, pct: number): number {
  return Math.round((centavos * pct) / 100);
}
