/**
 * De quem é a requisição? Do studio cujo slug vem no Host:
 * `anaunhas.clavusos.com.br` → `anaunhas`. Sem slug (localhost, IP, domínio
 * raiz), vale `CLAVUS_STUDIO_PADRAO`. Em desenvolvimento, `?studio=slug` serve.
 */
export function slugDoHost(host: string | undefined, dominioBase: string): string | null {
  if (!host) return null;
  const h = host.toLowerCase().split(":")[0];
  if (h === dominioBase || !h.endsWith("." + dominioBase)) return null;
  const slug = h.slice(0, -(dominioBase.length + 1));
  if (slug.includes(".")) return null;            // só um nível
  if (["www", "app", "api", "site"].includes(slug)) return null;
  return /^[a-z0-9][a-z0-9-]{1,40}$/.test(slug) ? slug : null;
}
