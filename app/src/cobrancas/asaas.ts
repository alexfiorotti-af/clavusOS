/**
 * Cliente da API do Asaas (v3). Só o que o ClavusOS usa: cliente, cobrança,
 * QR do Pix, linha do boleto, consulta, cancelamento e estorno.
 * Cada studio tem a própria chave — nada aqui é global. `fetch` é injetável
 * para teste. Valores entram em centavos e saem em centavos; a API fala em
 * reais com decimais, a conversão fica aqui dentro.
 */
export type AmbienteAsaas = "sandbox" | "producao";

export const BASES: Record<AmbienteAsaas, string> = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  producao: "https://api.asaas.com/v3",
};

export type Fetch = typeof fetch;

export type ClienteAsaas = { id: string };
export type CicloAsaas = "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";
/** Período dos planos do studio → ciclo do Asaas. */
export const CICLO_DO_PERIODO: Record<"mensal" | "trimestral" | "semestral" | "anual", CicloAsaas> = {
  mensal: "MONTHLY", trimestral: "QUARTERLY", semestral: "SEMIANNUALLY", anual: "YEARLY",
};
export type AssinaturaAsaas = { id: string; status: string; value: number; nextDueDate: string; cycle: string; billingType: string; deleted?: boolean };
export type CobrancaAsaas = {
  id: string; status: string; value: number; netValue?: number; billingType: string; dueDate: string;
  invoiceUrl?: string; bankSlipUrl?: string; externalReference?: string; paymentDate?: string | null; confirmedDate?: string | null;
  subscription?: string | null;
};

export class ErroAsaas extends Error {
  status: number; detalhe: string;
  constructor(status: number, detalhe: string) { super(`Asaas respondeu ${status}: ${detalhe}`); this.status = status; this.detalhe = detalhe; }
}

export function reaisParaCentavos(v: number): number { return Math.round(v * 100); }
export function centavosParaReais(c: number): number { return Math.round(c) / 100; }

/** Traduz o status do Asaas para o nosso. */
export function situacaoDoStatus(status: string): "pendente" | "recebida" | "cancelada" | "estornada" | "vencida" {
  switch (status) {
    case "RECEIVED": case "CONFIRMED": case "RECEIVED_IN_CASH": return "recebida";
    case "REFUNDED": case "REFUND_REQUESTED": case "REFUND_IN_PROGRESS": case "CHARGEBACK_REQUESTED": case "CHARGEBACK_DISPUTE": return "estornada";
    case "OVERDUE": return "vencida";
    case "DELETED": return "cancelada";
    default: return "pendente";
  }
}

export class Asaas {
  private chave: string; private ambiente: AmbienteAsaas; private fetchFn: Fetch;
  constructor(chave: string, ambiente: AmbienteAsaas, fetchFn: Fetch = fetch) { this.chave = chave; this.ambiente = ambiente; this.fetchFn = fetchFn; }

  private async chamar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
    const r = await this.fetchFn(BASES[this.ambiente] + caminho, {
      method: metodo,
      headers: { "access_token": this.chave, "content-type": "application/json", "user-agent": "ClavusOS/1.0" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: AbortSignal.timeout(20_000),
    });
    const texto = await r.text();
    if (!r.ok) {
      let detalhe = texto.slice(0, 300);
      try { const j = JSON.parse(texto); detalhe = j.errors?.map((e: { description: string }) => e.description).join("; ") ?? detalhe; } catch { /* texto cru */ }
      throw new ErroAsaas(r.status, detalhe);
    }
    return texto ? JSON.parse(texto) as T : ({} as T);
  }

  /** Confere a chave: lista 1 cliente. */
  async testar(): Promise<boolean> {
    await this.chamar("GET", "/customers?limit=1");
    return true;
  }

  async criarCliente(c: { nome: string; cpfCnpj?: string | null; email?: string | null; celular?: string | null; referencia: string; notificar?: boolean }): Promise<ClienteAsaas> {
    return this.chamar("POST", "/customers", {
      name: c.nome, cpfCnpj: c.cpfCnpj || undefined, email: c.email || undefined, mobilePhone: c.celular ? c.celular.replace(/\D/g, "") : undefined,
      externalReference: c.referencia, notificationDisabled: !c.notificar,
    });
  }

  async criarCobranca(c: { clienteId: string; meio: "pix" | "boleto" | "cartao" | "link"; valorCentavos: number; vencimento: string; descricao: string; referencia: string }): Promise<CobrancaAsaas> {
    const billingType = { pix: "PIX", boleto: "BOLETO", cartao: "CREDIT_CARD", link: "UNDEFINED" }[c.meio];
    return this.chamar("POST", "/payments", {
      customer: c.clienteId, billingType, value: centavosParaReais(c.valorCentavos), dueDate: c.vencimento,
      description: c.descricao.slice(0, 500), externalReference: c.referencia,
    });
  }

  async qrPix(id: string): Promise<{ encodedImage: string; payload: string; expirationDate?: string }> {
    return this.chamar("GET", `/payments/${id}/pixQrCode`);
  }

  async linhaDigitavel(id: string): Promise<{ identificationField: string }> {
    return this.chamar("GET", `/payments/${id}/identificationField`);
  }

  async consultar(id: string): Promise<CobrancaAsaas> {
    return this.chamar("GET", `/payments/${id}`);
  }

  async cancelar(id: string): Promise<void> {
    await this.chamar("DELETE", `/payments/${id}`);
  }

  // ---- assinaturas: a da AF cobra a mensalidade do ClavusOS (MONTHLY);
  // a do studio cobra os planos das clientes nos ciclos que o Asaas oferece.
  async criarAssinatura(a: { clienteId: string; valorCentavos: number; primeiroVencimento: string; descricao: string; referencia: string; ciclo?: CicloAsaas }): Promise<AssinaturaAsaas> {
    return this.chamar("POST", "/subscriptions", {
      customer: a.clienteId, billingType: "UNDEFINED", value: centavosParaReais(a.valorCentavos), nextDueDate: a.primeiroVencimento,
      cycle: a.ciclo ?? "MONTHLY", description: a.descricao.slice(0, 500), externalReference: a.referencia,
    });
  }
  async consultarAssinatura(id: string): Promise<AssinaturaAsaas> { return this.chamar("GET", `/subscriptions/${id}`); }
  async cancelarAssinatura(id: string): Promise<void> { await this.chamar("DELETE", `/subscriptions/${id}`); }
  async cobrancasDaAssinatura(id: string): Promise<CobrancaAsaas[]> {
    const r = await this.chamar<{ data: CobrancaAsaas[] }>("GET", `/subscriptions/${id}/payments?limit=100`);
    return r.data ?? [];
  }

  async estornar(id: string, valorCentavos?: number, descricao?: string): Promise<CobrancaAsaas> {
    return this.chamar("POST", `/payments/${id}/refund`, {
      value: valorCentavos === undefined ? undefined : centavosParaReais(valorCentavos), description: descricao,
    });
  }
}

/** Corpo de webhook do Asaas, só o que lemos. */
export type EventoWebhook = { id?: string; event?: string; payment?: CobrancaAsaas };

export function lerEvento(corpo: string): EventoWebhook | null {
  try {
    const j = JSON.parse(corpo);
    if (!j || typeof j !== "object" || typeof j.event !== "string") return null;
    return j as EventoWebhook;
  } catch { return null; }
}
