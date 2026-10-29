/**
 * A marca do ClavusOS mora aqui (regra da casa): símbolo, cores, tipografia e
 * slogan. Favicon, cabeçalho, e-mails, PDFs e a vitrine importam deste arquivo —
 * nenhum desenho da marca vive em outro lugar. Assets: `node scripts/gerar-marca.mjs`.
 *
 * O símbolo é construído em geometria, não gerado: a **unha amêndoa** — uma
 * lente de dois arcos iguais (grade 96, traço 5.5 de pontas redondas),
 * inclinada a −22° como a mão apoiada na mesa da nail designer —, a **lúnula**
 * (a meia-lua da base da unha, o detalhe que o nicho reconhece) e a **gota de
 * brilho** dourada na ponta. O dourado é raro e precioso: aparece na gota,
 * nos preços e em mais nada.
 */
export const PALETA = {
  rosa: "#E91E8C",        // Esmalte — a primária, magenta vibrante do nicho
  rosaEscuro: "#C2185B",  // Esmalte profundo — pressed/ênfase
  rosaClaro: "#FCE4F1",   // Pétala — fundos de chip
  lilas: "#9C27B0",       // Orquídea — secundária, par do gradiente
  dourado: "#B8860B",     // Verniz — preços, totais e a gota (fundos claros)
  douradoClaro: "#FFE082",// Verniz sobre escuro — a gota em fundo ameixa/gradiente
  ink: "#2D1B2E",         // Ameixa — texto, o "preto" da marca
  inkSuave: "#7A6B7D",    // Ameixa suave — texto secundário
  fundo: "#FFF7FB",       // Pó de Arroz — o fundo da casa
  papel: "#FFFFFF",
  linha: "#F3DCEA",
  ok: "#2E9E6B",
  alerta: "#E6A23C",
  erro: "#D64550",
};

export const NOME = "ClavusOS";
export const SLOGAN = "o sistema do studio de unhas";
export const TIPOGRAFIA = {
  display: `"Fraunces", Georgia, serif`,     // wordmark, títulos da vitrine e materiais
  texto: `"Poppins", "Segoe UI", system-ui, sans-serif`,  // o app inteiro
};

/**
 * O símbolo: unha amêndoa + lúnula + gota. `cor` = traço; `gota` = o dourado
 * (em fundo escuro, use PALETA.douradoClaro). Fundo transparente.
 */
export function simbolo(o: { tamanho?: number; cor?: string; gota?: string; attrs?: string } = {}): string {
  const t = o.tamanho ?? 26, cor = o.cor ?? PALETA.rosa, gota = o.gota ?? PALETA.dourado;
  return `<svg width="${t}" height="${t}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" ${o.attrs ?? ""} aria-hidden="true">
<g transform="rotate(-20 48 48)" stroke="${cor}" fill="none">
<path d="M48 12 C58 30 64 52 64 68 C64 82 57 90 48 90 C39 90 32 82 32 68 C32 52 38 30 48 12 Z" stroke-width="5.5" stroke-linejoin="round"/>
<path d="M41 75.5 Q48 69 55 75.5" stroke-width="4" stroke-linecap="round"/>
</g>
<circle cx="30" cy="8" r="5.5" fill="${gota}"/>
</svg>`;
}

/** O símbolo preenchido (favicons, avatares, tamanhos muito pequenos). */
export function simboloCheio(o: { tamanho?: number; cor?: string; lunula?: string; gota?: string; attrs?: string } = {}): string {
  const t = o.tamanho ?? 26, cor = o.cor ?? PALETA.rosa, lun = o.lunula ?? PALETA.rosaClaro, gota = o.gota ?? PALETA.douradoClaro;
  return `<svg width="${t}" height="${t}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" ${o.attrs ?? ""} aria-hidden="true">
<g transform="rotate(-20 48 48)">
<path d="M48 12 C58 30 64 52 64 68 C64 82 57 90 48 90 C39 90 32 82 32 68 C32 52 38 30 48 12 Z" fill="${cor}"/>
<path d="M39 77.5 Q48 68.5 57 77.5 Q48 73.5 39 77.5 Z" fill="${lun}"/>
</g>
<circle cx="30" cy="8" r="6" fill="${gota}"/>
</svg>`;
}

/**
 * O logotipo horizontal: símbolo + "ClavusOS" em Fraunces. Para contextos que
 * carregam a fonte (vitrine, PNGs gerados); onde a Fraunces não existe, cai em Georgia.
 */
export function logoHorizontal(o: { altura?: number; cor?: string; traco?: string; gota?: string } = {}): string {
  const h = o.altura ?? 44, cor = o.cor ?? PALETA.ink, traco = o.traco ?? PALETA.rosa, gota = o.gota ?? PALETA.dourado;
  const w = Math.round(h * 4.9);
  return `<svg width="${w}" height="${h}" viewBox="0 0 470 96" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ClavusOS">
<g transform="rotate(-20 48 48)" stroke="${traco}" fill="none">
<path d="M48 12 C58 30 64 52 64 68 C64 82 57 90 48 90 C39 90 32 82 32 68 C32 52 38 30 48 12 Z" stroke-width="5.5" stroke-linejoin="round"/>
<path d="M41 75.5 Q48 69 55 75.5" stroke-width="4" stroke-linecap="round"/>
</g>
<circle cx="30" cy="8" r="5.5" fill="${gota}"/>
<text x="104" y="64" font-family='"Fraunces", Georgia, serif' font-weight="600" font-size="52" letter-spacing="-1" fill="${cor}">ClavusOS</text>
</svg>`;
}

/** O selo: símbolo dentro de um anel fino (carimbo, etiqueta, foto de perfil). */
export function selo(o: { tamanho?: number; cor?: string; gota?: string } = {}): string {
  const t = o.tamanho ?? 96, cor = o.cor ?? PALETA.rosa, gota = o.gota ?? PALETA.dourado;
  return `<svg width="${t}" height="${t}" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<circle cx="60" cy="60" r="56" stroke="${cor}" stroke-width="3"/>
<g transform="translate(12 12) scale(0.8)">
<g transform="rotate(-20 48 48)" stroke="${cor}" fill="none">
<path d="M48 12 C58 30 64 52 64 68 C64 82 57 90 48 90 C39 90 32 82 32 68 C32 52 38 30 48 12 Z" stroke-width="6" stroke-linejoin="round"/>
<path d="M41 75.5 Q48 69 55 75.5" stroke-width="4.5" stroke-linecap="round"/>
</g>
<circle cx="30" cy="8" r="6" fill="${gota}"/>
</g>
</svg>`;
}

/** Favicon em data-URI: quadrado Pó de Arroz com a amêndoa cheia — legível a 16px. */
export const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="${PALETA.fundo}"/><g transform="rotate(-20 48 48)"><path d="M48 12 C58 30 64 52 64 68 C64 82 57 90 48 90 C39 90 32 82 32 68 C32 52 38 30 48 12 Z" fill="${PALETA.rosa}"/><path d="M39 77.5 Q48 68.5 57 77.5 Q48 73.5 39 77.5 Z" fill="${PALETA.rosaClaro}"/></g><circle cx="30" cy="9" r="7" fill="${PALETA.dourado}"/></svg>`;
