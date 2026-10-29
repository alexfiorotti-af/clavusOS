/**
 * A marca do ClavusOS mora aqui (regra da casa): símbolo, cores, tipografia e
 * slogan. Favicon, cabeçalho, e-mails, PDFs e a vitrine importam deste arquivo —
 * nenhum desenho da marca vive em outro lugar. Assets: `node scripts/gerar-marca.mjs`.
 *
 * Identidade "Cereja & Porcelana" (D017, out/2026; manual em docs/MARCA.md).
 * O símbolo é construído em geometria, não gerado: a **unha amêndoa** — uma
 * lente de dois arcos iguais (grade 96), inclinada a −20° como a mão apoiada
 * na mesa da nail designer —, a **lúnula** (a meia-lua da base, o detalhe que o
 * nicho reconhece), um **reflexo de laca** fino e a **gota de verniz** dourada.
 * O dourado é raro e precioso: a gota e o saldo do dia, e mais nada.
 */
export const PALETA = {
  cereja: "#A8174A",       // a cor da marca e da ação (branco sobre ela: 7,3:1)
  cerejaEscura: "#8A1240", // pressionado
  cerejaClara: "#E5739A",  // o símbolo sobre ameixa
  petala: "#F6E1E8",       // cereja a 12% no branco: etiquetas e botões de apoio
  ameixa: "#2D1B2E",       // texto, menu do notebook e o único fundo escuro
  ameixaSuave: "#6B5A66",  // texto de apoio (5,8:1 na porcelana)
  porcelana: "#F7F2EF",    // o fundo da casa
  papel: "#FFFFFF",        // cartões
  nude: "#EFE7E2",         // apoio: seletores, avatares, embalagens
  linha: "#EDE4DF",
  verniz: "#B8892E",       // só a gota
  vernizTexto: "#8A620F",  // o saldo do dia, em texto
  vernizClaro: "#E3C27A",  // a gota sobre fundo escuro ou cereja
  ok: "#22684A",
  alerta: "#7E5210",
  erro: "#A92D42",
  // Nomes da identidade anterior, mantidos para quem ainda os importa (vitrine, e-mails):
  rosa: "#A8174A", rosaEscuro: "#8A1240", rosaClaro: "#F6E1E8", lilas: "#6B2A4E",
  dourado: "#B8892E", douradoClaro: "#E3C27A", ink: "#2D1B2E", inkSuave: "#6B5A66", fundo: "#F7F2EF",
};

export const NOME = "ClavusOS";
export const SLOGAN = "o sistema do studio de unhas";
export const TIPOGRAFIA = {
  display: `"Fraunces", Georgia, serif`,                               // logotipo, títulos e valores (eixo SOFT 100)
  texto: `"Instrument Sans", "Segoe UI", system-ui, sans-serif`,       // o app inteiro
};
/** O <link> das fontes da marca (Google Fonts), para qualquer página que as use. */
export const FONTES_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,400..600,0..100&family=Instrument+Sans:wght@400;500;600&display=swap">`;

const AMENDOA = "M48 12 C58 30 64 52 64 68 C64 82 57 90 48 90 C39 90 32 82 32 68 C32 52 38 30 48 12 Z";
const LUNULA_CHEIA = "M39 77.5 Q48 68.5 57 77.5 Q48 73.5 39 77.5 Z";
const REFLEXO = "M52.6 27 C56 36 58 45 58.6 53";

/**
 * O símbolo em traço (dentro do app e em tamanhos médios). `cor` = traço;
 * `gota` = o verniz (em fundo escuro, use PALETA.vernizClaro). Fundo transparente.
 */
export function simbolo(o: { tamanho?: number; cor?: string; gota?: string; attrs?: string } = {}): string {
  const t = o.tamanho ?? 26, cor = o.cor ?? PALETA.cereja, gota = o.gota ?? PALETA.verniz;
  return `<svg width="${t}" height="${t}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" ${o.attrs ?? ""} aria-hidden="true">
<g transform="rotate(-20 48 48)" stroke="${cor}" fill="none">
<path d="${AMENDOA}" stroke-width="5.5" stroke-linejoin="round"/>
<path d="M41 75.5 Q48 69 55 75.5" stroke-width="4" stroke-linecap="round"/>
</g>
<circle cx="30" cy="8" r="5.5" fill="${gota}"/>
</svg>`;
}

/**
 * O símbolo cheio — a versão principal da marca: amêndoa em laca, lúnula
 * vazada, reflexo e gota. `reflexo: false` abaixo de 32 px.
 */
export function simboloCheio(o: { tamanho?: number; cor?: string; lunula?: string; gota?: string; reflexo?: boolean; attrs?: string } = {}): string {
  const t = o.tamanho ?? 26, cor = o.cor ?? PALETA.cereja, lun = o.lunula ?? PALETA.porcelana, gota = o.gota ?? PALETA.verniz;
  const reflexo = o.reflexo ?? t >= 32;
  return `<svg width="${t}" height="${t}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" ${o.attrs ?? ""} aria-hidden="true">
<g transform="rotate(-20 48 48)">
<path d="${AMENDOA}" fill="${cor}"/>
<path d="${LUNULA_CHEIA}" fill="${lun}"/>${reflexo ? `
<path d="${REFLEXO}" stroke="#FFFFFF" stroke-opacity=".5" stroke-width="2.4" stroke-linecap="round" fill="none"/>` : ""}
</g>
<circle cx="30" cy="8" r="6" fill="${gota}"/>
</svg>`;
}

/**
 * O logotipo horizontal: símbolo cheio + "Clavus" na Fraunces macia + "OS" em
 * cereja na letra do app. Onde as fontes não carregam, cai em Georgia/system-ui.
 * Em fundo escuro: cor = porcelana, os = PALETA.cerejaClara, simboloCor = cerejaClara.
 */
export function logoHorizontal(o: { altura?: number; cor?: string; os?: string; simboloCor?: string; lunula?: string; gota?: string; traco?: string } = {}): string {
  const h = o.altura ?? 44, cor = o.cor ?? PALETA.ameixa, os = o.os ?? PALETA.cereja;
  const sc = o.simboloCor ?? o.traco ?? PALETA.cereja, lun = o.lunula ?? (cor === PALETA.ameixa ? PALETA.porcelana : PALETA.ameixa);
  const gota = o.gota ?? (cor === PALETA.ameixa ? PALETA.verniz : PALETA.vernizClaro);
  const w = Math.round(h * 4.17);
  return `<svg width="${w}" height="${h}" viewBox="0 0 400 96" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ClavusOS">
<g transform="rotate(-20 48 48)"><path d="${AMENDOA}" fill="${sc}"/><path d="${LUNULA_CHEIA}" fill="${lun}"/></g>
<circle cx="30" cy="8" r="6" fill="${gota}"/>
<text x="100" y="70" font-family='"Fraunces", Georgia, serif' font-weight="500" font-size="64" letter-spacing="-2.2" fill="${cor}" style="font-variation-settings:'SOFT' 100,'opsz' 144">Clavus<tspan dx="5" font-family='"Instrument Sans", system-ui, sans-serif' font-weight="600" font-size="27" letter-spacing="0.4" fill="${os}" style="font-variation-settings:normal">OS</tspan></text>
</svg>`;
}

/** O selo: símbolo cheio dentro de um círculo cereja (perfil de WhatsApp/Instagram, carimbo). */
export function selo(o: { tamanho?: number; cor?: string; gota?: string } = {}): string {
  const t = o.tamanho ?? 96, cor = o.cor ?? PALETA.cereja, gota = o.gota ?? PALETA.vernizClaro;
  return `<svg width="${t}" height="${t}" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<circle cx="60" cy="60" r="60" fill="${cor}"/>
<g transform="translate(20 20) scale(0.84)">
<g transform="rotate(-20 48 48)"><path d="${AMENDOA}" fill="${PALETA.porcelana}"/><path d="${LUNULA_CHEIA}" fill="${cor}"/></g>
<circle cx="30" cy="8" r="6.5" fill="${gota}"/>
</g>
</svg>`;
}

/** Favicon / ícone do app: quadrado cereja com a amêndoa em porcelana — legível a 16 px. */
export const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="${PALETA.cereja}"/><g transform="translate(14 14) scale(.72)"><g transform="rotate(-20 48 48)"><path d="${AMENDOA}" fill="${PALETA.porcelana}"/><path d="${LUNULA_CHEIA}" fill="${PALETA.cereja}"/></g><circle cx="30" cy="9" r="7" fill="${PALETA.vernizClaro}"/></g></svg>`;
