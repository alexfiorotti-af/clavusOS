# ClavusOS 💅

**Gestão completa do studio de unhas, white-label** — um sistema, vários studios: agenda com mapa
por profissional e trava de choque no banco, clientes com alerta de **unha vencida** e origem do
lead, caixa com fluxo financeiro e PDV, relatórios com comissão por profissional, planos de
assinatura, página pública em que a cliente agenda sozinha, e cobrança pelo **Asaas** em dois
níveis — a AF cobra a mensalidade do studio; o studio cobra as clientes na própria conta.

> Produto da **AF Tecnologia e Marketing Ltda.**, autoria de Alex Fiorotti. Segundo nicho do
> construtor de SaaS (o primeiro é o CoachOS); engenharia no padrão Pousa. *Clavus* = unha, em latim.

## O código

| Pasta | O que é |
|---|---|
| `app/` | o web app — Node 22, TypeScript direto, `node:http`, `pg`. Única dependência: o driver do Postgres |
| `db/` | `001_schema.sql` (tabelas, trava de choque, view de vencidas) · `002_rls.sql` (isolamento entre studios e papéis) |
| `docs/` | `OPERACAO.md` (ficha de bancada + checklist de deploy) · `DECISOES.md` · `00-AUDITORIA-FASE1.md` |
| `prototipo/` | a Fase 1 (PWA offline) — **demo comercial**, não é o produto (ver a auditoria) |
| `CLAUDE.md` | instruções para qualquer CLI de IA que abrir o repositório |

**Rodar local:** Postgres rodando → `cd app && cp .env.exemplo .env` (ajustar) → `npm install` →
`npm run migrar` → `npm run studio-modelo` → `npm start` → `http://localhost:3000` com
`demo@clavusos.com.br` / `demonstracao` (admin) e `equipe@clavusos.com.br` (profissional).

**Testar:** `npm run tipos && npm run teste` (35 testes: 27 puros + 8 contra o banco, inclusive
isolamento RLS, papéis, trava de choque, concluir→caixa, PDV e os webhooks dos dois níveis).

## O que já funciona

Login com freio a força bruta, convite por link e esqueci-a-senha · painel do dia com alerta de
vencidas e aniversariantes · agenda por dia, semana e **mapa por profissional** · novo horário com
grade de livres, conflito recusado pelo banco e **encaixe** deliberado (gerência) · confirmação e
lembrete por e-mail e WhatsApp com mensagem pronta · concluir → **receita no caixa** (idempotente)
· cobrança pelo Asaas do studio (Pix com QR, link) com **baixa só depois de conferir na API** e
sinal pago confirmando o horário sozinho · clientes com origem do lead, lead→ativa automático,
aniversários e **unha vencida** calculada no banco, com campanha de retorno pronta · caixa com
receitas/despesas manuais, anulação auditada e **PDV com baixa de estoque** · relatórios do mês
(categorias, produção e **comissão por profissional**, top serviços, clientes novas por origem) ·
**planos e assinaturas** das clientes com dias do mês escolhidos por ela, cobrança automática no
ciclo nativo do Asaas ou recebimento manual, e geração dos horários do mês · página pública
`/agendar` com sinal por Pix na hora · configurações completas (studio, serviços com ciclo de
vencimento, produtos, profissionais, equipe com papéis, Asaas cifrado) · **cobrança do ClavusOS**
(teste 7 dias → carência → bloqueio sem apagar nada; assinatura mensal ou avulso 1/3/6/12 no Asaas
da AF) · auditoria · exportação dos dados do studio em JSON · vitrine do produto na raiz ·
studio de demonstração.

## Segurança (o resumo do que o banco garante)

- **RLS forçado**: um studio nunca enxerga o outro — nem com bug na aplicação.
- **Papéis no banco**: profissional não lê o caixa; só gerência anula; só a administradora configura.
- **Senhas scrypt**, sessões com hash no banco (12 h deslizantes), freio a força bruta.
- **Chave do Asaas do studio cifrada** (AES-256-GCM) com chave-mestra fora do banco.
- **Dinheiro em centavos**, trilha de **auditoria**, lançamento nunca apagado (anulado com motivo).
- Cabeçalhos de segurança + CSP em toda página; cartão nunca passa pelo sistema.

## Publicar

O passo a passo (Supabase SP + hospedagem Node + domínio com curinga + Resend + Asaas + rotina)
está em **`docs/OPERACAO.md` §8**.

---

© AF Tecnologia e Marketing Ltda. · alexfiorotti@gmail.com · WhatsApp (27) 99601-5367
Não é software livre: uso por studios se dá por licença de assinatura, que não transfere o
código-fonte. Os dados de cada studio pertencem ao studio e podem ser exportados a qualquer momento.
