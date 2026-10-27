/**
 * Lógica pura de horários: a grade de slots do dia e o que está livre.
 * Sem banco e sem relógio — tudo entra por parâmetro, tudo é testável.
 * A trava de verdade mora no banco (sem_choque); aqui é só a tela.
 */
import { minutos, hora, cruzam, type HoraHM } from "../dados/datas.ts";

export type Ocupado = { inicio: HoraHM; duracaoMin: number; profissionalId: string | null; rotulo?: string };

export type Slot = { hora: HoraHM; livre: boolean; rotulo?: string };

/**
 * Grade de slots entre abre e fecha, no passo do studio, marcando os ocupados
 * da profissional (ou de todas, quando `profissionalId === null` num studio solo).
 * Um slot está livre quando o serviço inteiro (duração) cabe a partir dele.
 */
export function gradeDoDia(o: {
  abre: HoraHM; fecha: HoraHM; passoMin: number; duracaoMin: number;
  ocupados: Ocupado[]; profissionalId: string | null;
}): Slot[] {
  const ini = minutos(o.abre), fim = minutos(o.fecha);
  const relevantes = o.ocupados.filter((x) =>
    o.profissionalId === null ? true : (x.profissionalId === o.profissionalId || x.profissionalId === null));
  const slots: Slot[] = [];
  for (let m = ini; m + o.duracaoMin <= fim; m += o.passoMin) {
    const choque = relevantes.find((x) => cruzam(m, m + o.duracaoMin, minutos(x.inicio), minutos(x.inicio) + x.duracaoMin));
    slots.push({ hora: hora(m), livre: !choque, rotulo: choque?.rotulo });
  }
  return slots;
}

/** Há choque para este começo? (checagem da tela; o banco decide de verdade) */
export function temChoque(o: { inicio: HoraHM; duracaoMin: number; ocupados: Ocupado[]; profissionalId: string | null }): Ocupado | null {
  const a1 = minutos(o.inicio), a2 = a1 + o.duracaoMin;
  return o.ocupados.find((x) =>
    (o.profissionalId === null || x.profissionalId === o.profissionalId || x.profissionalId === null) &&
    cruzam(a1, a2, minutos(x.inicio), minutos(x.inicio) + x.duracaoMin)) ?? null;
}

/** Dias do mês de uma assinatura → datas ISO do mês dado (pula o 29/30/31 que o mês não tem). */
export function datasDoMes(ym: string, diasMes: number[]): string[] {
  const [y, m] = ym.split("-").map(Number);
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [...new Set(diasMes)].filter((d) => d >= 1 && d <= ultimo).sort((a, b) => a - b)
    .map((d) => `${ym}-${String(d).padStart(2, "0")}`);
}
