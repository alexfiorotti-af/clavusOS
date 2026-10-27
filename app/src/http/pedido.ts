export type Pedido = {
  metodo: string;
  caminho: string;              // sem query
  query: URLSearchParams;
  cabecalhos: Record<string, string | string[] | undefined>;
  corpo: string | null;
  cookies: Record<string, string>;
  ip: string | null;
  host: string | undefined;
};

export function cabecalho(p: Pedido, nome: string): string | undefined {
  const v = p.cabecalhos[nome.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}
