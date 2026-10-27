/**
 * A marca do ClavusOS mora aqui (regra da casa, D018 do Pousa): símbolo, cores
 * e fontes. Favicon, cabeçalho, e-mails e a vitrine importam deste arquivo —
 * nenhum desenho da marca vive em outro lugar.
 *
 * O símbolo é construído em geometria, não gerado: um frasco de esmalte em
 * traço contínuo (grade 96, traço 7 de pontas redondas) com a "gota" dourada —
 * o detalhe precioso, mesma função do âmbar no Pousa.
 */
export const PALETA = {
  rosa: "#E91E8C",        // primária — magenta vibrante do nicho
  rosaEscuro: "#C2185B",
  rosaClaro: "#FCE4F1",
  lilas: "#9C27B0",       // secundária
  dourado: "#B8860B",     // raro e precioso: preços, totais, a gota do símbolo
  ink: "#2D1B2E",         // texto — roxo quase preto
  inkSuave: "#7A6B7D",
  fundo: "#FFF7FB",       // branco rosado
  papel: "#FFFFFF",
  linha: "#F3DCEA",
  ok: "#2E9E6B",
  alerta: "#E6A23C",
  erro: "#D64550",
};

/** O símbolo: frasco (pincel + bojo) e a gota dourada. `cor` = traço; fundo transparente. */
export function simbolo(o: { tamanho?: number; cor?: string; gota?: string; attrs?: string } = {}): string {
  const t = o.tamanho ?? 26, cor = o.cor ?? PALETA.rosa, gota = o.gota ?? PALETA.dourado;
  return `<svg width="${t}" height="${t}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" ${o.attrs ?? ""} aria-hidden="true">
<rect x="34" y="40" width="28" height="40" rx="12" stroke="${cor}" stroke-width="7"/>
<rect x="41" y="14" width="14" height="22" rx="6" stroke="${cor}" stroke-width="7"/>
<path d="M41 25h14" stroke="${cor}" stroke-width="7" stroke-linecap="round"/>
<circle cx="74" cy="30" r="7" fill="${gota}"/>
</svg>`;
}

/** Favicon em data-URI (fundo rosa, frasco claro). */
export const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="${PALETA.rosa}"/><rect x="34" y="40" width="28" height="40" rx="12" fill="${PALETA.rosaClaro}"/><rect x="41" y="14" width="14" height="24" rx="6" fill="#fff"/><circle cx="74" cy="30" r="7" fill="#FFE082"/></svg>`;

export const NOME = "ClavusOS";
export const SLOGAN = "o sistema do seu studio de unhas";
