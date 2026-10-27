/**
 * Datas de agenda são strings ISO `YYYY-MM-DD` e horas são `HH:MM`, sem fuso:
 * a unha de 12/03 às 14:00 é a mesma em qualquer servidor. Instantes
 * (conclusão real, envio de e-mail) usam Date/timestamptz e o fuso do studio.
 */
export type DiaISO = string;
export type HoraHM = string;

const RE_DIA = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_HORA = /^(\d{2}):(\d{2})(?::\d{2})?$/;

export function diaValido(s: string | null | undefined): s is DiaISO {
  if (!s || !RE_DIA.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function horaValida(s: string | null | undefined): s is HoraHM {
  if (!s) return false;
  const m = RE_HORA.exec(s);
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60;
}

export function somarDias(dia: DiaISO, n: number): DiaISO {
  const d = new Date(dia + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Soma meses com o dia "grudando" no fim do mês quando preciso (31/01 + 1 mês = 28/02). */
export function somarMeses(dia: DiaISO, n: number): DiaISO {
  const [y, m, d] = dia.split("-").map(Number);
  const alvo = new Date(Date.UTC(y, m - 1 + n, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimo));
  return alvo.toISOString().slice(0, 10);
}

/** dias entre a e b (b - a). */
export function diasEntre(a: DiaISO, b: DiaISO): number {
  const u = (x: DiaISO) => Date.UTC(+x.slice(0, 4), +x.slice(5, 7) - 1, +x.slice(8, 10));
  return Math.round((u(b) - u(a)) / 86_400_000);
}

/** 0 = domingo ... 6 = sábado. */
export function diaDaSemana(dia: DiaISO): number {
  return new Date(dia + "T00:00:00Z").getUTCDay();
}

/** Hoje no fuso do studio. */
export function hojeEm(fuso: string, agora: Date = new Date()): DiaISO {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" });
  return f.format(agora); // en-CA dá YYYY-MM-DD
}

/** "14:30" → 870 (minutos desde a meia-noite). */
export function minutos(h: HoraHM): number {
  return Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
}
/** 870 → "14:30". */
export function hora(min: number): HoraHM {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
/** Dois intervalos [a1,a2) e [b1,b2) se cruzam? */
export function cruzam(a1: number, a2: number, b1: number, b2: number): boolean {
  return a1 < b2 && b1 < a2;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const SEMANA_LONGA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** "12/03/2027" */
export function br(dia: DiaISO | null | undefined): string {
  if (!dia) return "";
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
}
/** "12/03" */
export function brCurto(dia: DiaISO): string {
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
}
/** "sex 12" */
export function rotuloDia(dia: DiaISO): string {
  return `${SEMANA[diaDaSemana(dia)]} ${Number(dia.slice(8, 10))}`;
}
/** "sexta, 12/03" */
export function diaFalado(dia: DiaISO, hoje: DiaISO): string {
  if (dia === hoje) return "hoje";
  if (dia === somarDias(hoje, 1)) return "amanhã";
  return `${SEMANA_LONGA[diaDaSemana(dia)]}, ${brCurto(dia)}`;
}
/** "12 mar 2027" */
export function brExtenso(dia: DiaISO): string {
  return `${Number(dia.slice(8, 10))} ${MESES[Number(dia.slice(5, 7)) - 1]} ${dia.slice(0, 4)}`;
}
/** "março de 2027" */
export function mesExtenso(ym: string): string {
  const nomes = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${nomes[Number(ym.slice(5, 7)) - 1]} de ${ym.slice(0, 4)}`;
}
/** Instante no fuso do studio: "12/03/2027 14:32" */
export function brInstante(d: Date | string | null | undefined, fuso = "America/Sao_Paulo"): string {
  if (!d) return "";
  const data = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    .format(data).replace(",", "");
}
