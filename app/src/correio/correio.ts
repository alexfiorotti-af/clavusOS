/**
 * E-mail pela API da Resend. Sem chave, nada sai — e o sistema diz isso na
 * tela em vez de fingir. O remetente é o domínio do produto; o nome visível
 * é o do studio e a resposta vai para o e-mail do studio.
 */
import type { Executor } from "../db/contexto.ts";
import type { Studio } from "../studio/studio.ts";

export type Mensagem = { para: string; assunto: string; html: string; texto: string };
export type Enviador = (m: Mensagem & { de: string; responderPara?: string }) => Promise<{ ok: true; id: string } | { ok: false; erro: string }>;

export function enviadorResend(chave: string, fetchFn: typeof fetch = fetch): Enviador {
  return async (m) => {
    try {
      const r = await fetchFn("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${chave}`, "content-type": "application/json" },
        body: JSON.stringify({ from: m.de, to: [m.para], subject: m.assunto, html: m.html, text: m.texto, reply_to: m.responderPara }),
        signal: AbortSignal.timeout(15_000),
      });
      const j = await r.json().catch(() => ({})) as { id?: string; message?: string };
      if (!r.ok) return { ok: false, erro: `Resend ${r.status}: ${j.message ?? "erro"}` };
      return { ok: true, id: j.id ?? "" };
    } catch (e) {
      return { ok: false, erro: (e as Error).message };
    }
  };
}

/** Em desenvolvimento, só registra no console. */
export const enviadorDeMentira: Enviador = async (m) => {
  console.log(`[correio] (não enviado) para ${m.para}: ${m.assunto}`);
  return { ok: true, id: "mentira" };
};

export function remetenteDoStudio(studio: Studio, remetenteBase: string): { de: string; responderPara?: string } {
  const endereco = remetenteBase.match(/<([^>]+)>/)?.[1] ?? remetenteBase;
  const nome = studio.nome.replace(/["<>]/g, "");
  return { de: `${nome} via ClavusOS <${endereco}>`, responderPara: studio.email ?? undefined };
}

/**
 * Envia e registra, uma vez por (agendamento, canal, tipo). Se já foi enviada,
 * não repete. Erro fica gravado para a tela mostrar.
 */
export async function enviarRegistrando(db: Executor, studio: Studio, enviar: Enviador, remetenteBase: string, m: {
  agendamentoId: string | null; tipo: string; mensagem: Mensagem;
}): Promise<"enviada" | "ja_enviada" | "erro"> {
  if (m.agendamentoId) {
    const ja = await db.query("SELECT 1 FROM mensagens WHERE agendamento_id = $1 AND canal = 'email' AND tipo = $2 AND enviada_em IS NOT NULL", [m.agendamentoId, m.tipo]);
    if (ja.rowCount) return "ja_enviada";
  }
  const r = await enviar({ ...m.mensagem, ...remetenteDoStudio(studio, remetenteBase) });
  await db.query(
    `INSERT INTO mensagens (studio_id, agendamento_id, canal, tipo, destinatario, assunto, enviada_em, erro) VALUES ($1,$2,'email',$3,$4,$5,$6,$7)
     ON CONFLICT (agendamento_id, canal, tipo) DO UPDATE SET destinatario = EXCLUDED.destinatario, enviada_em = EXCLUDED.enviada_em, erro = EXCLUDED.erro`,
    [studio.id, m.agendamentoId, m.tipo, m.mensagem.para, m.mensagem.assunto, r.ok ? new Date() : null, r.ok ? null : r.erro]);
  return r.ok ? "enviada" : "erro";
}
