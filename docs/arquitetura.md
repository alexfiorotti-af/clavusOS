# ClavusOS — Arquitetura e decisões

> Segundo nicho do construtor de SaaS da AF (base: blueprint do CoachOS + skill `agenda-beleza-skill`).
> Fase atual: **1 — protótipo PWA** (dados no navegador). Este documento é o mapa para as Fases 2 e 3.

## 1. Visão em fases

| Fase | Entrega | Infra | O que destrava |
|---|---|---|---|
| **1 — PWA** (este repo) | App completo offline, 1 arquivo | Hostinger estático (HTTPS) | Validação com nail designers reais, custo zero |
| **2 — Backend** | API + Postgres na VPS | VPS Hostinger | Link público de agendamento, assinaturas com portal da cliente, dados fora do aparelho, multi-dispositivo |
| **3 — Multi-tenant** | White-label de verdade | mesma VPS | 1 instalação atende N studios; branding e cobrança por tenant |

## 2. Modelo de dados (Fase 1 → vira schema SQL na Fase 2)

Chaves no `localStorage`, prefixo `clavus.` — cada chave vira tabela:

```
clavus.settings        → tenants/settings (1 linha por tenant)
clavus.services        → services   {id, name, price, durationMin, cycleDays, color, active}
clavus.clients         → clients    {id, name, phone, notes, origin, birthday, status: lead|ativa, createdAt}
clavus.appointments    → appointments {id, clientId, clientName*, serviceId, serviceName*, price,
                                       date(ISO), start(HH:MM), durationMin, staffId, staffName*,
                                       status: pendente|confirmado|concluido|cancelado, notes, demo, createdAt}
clavus.transactions    → transactions {id, type: receita|despesa, category, description, amount,
                                       date, method, source: servico|produto|assinatura|manual,
                                       refId, staffId, demo, createdAt}
clavus.products        → products   {id, name, price, cost, stock, active}
clavus.staff           → staff      {id, name, color, commissionPct, active}
clavus.plans           → plans      {id, name, period: mensal|trimestral|semestral|anual,
                                     price, visitsPerMonth, serviceId, serviceName*, active}
clavus.subscriptions   → subscriptions {id, clientId, clientName*, planId, planName*, price, period,
                                        days[dias do mês], time, start, nextRenewal, status, createdAt}
clavus.version         → inteiro do schema (migrações via ensureSchema())
clavus.backup.prev     → snapshot automático antes de qualquer import (ponto de recuperação)
```

`*` = campos denormalizados para exibição rápida (padrão do blueprint: o id externo/estrangeiro
fica junto do registro, a sincronização é idempotente).

### Regras de negócio centrais

- **Datas sempre ISO local** (`YYYY-MM-DD`, `HH:MM`), nunca `Date` serializado/UTC — fonte nº 1 de bugs eliminada na origem.
- **Conflito de horário**: `aStart < bEnd && bStart < aEnd` no mesmo dia (e mesma profissional quando há equipe); avisa mas permite encaixe.
- **Unha vencida**: `última data concluída + cycleDays do serviço (ou padrão do studio)`. `overdue > 0` ⇒ alerta no header e no painel de clientes, com mensagem de WhatsApp pronta (campanha inbound de retorno).
- **Caixa automático**: `status → concluido` cria `transaction {source: servico, refId: appointment.id}` (idempotente — nunca duplica). Lead vira cliente no 1º concluído.
- **PDV**: venda cria transação `source: produto` e baixa estoque.
- **Assinaturas**: criação lança a 1ª cobrança (`source: assinatura`); "Registrar renovação" lança a próxima e avança `nextRenewal` pelo período; "Gerar horários do mês" cria agendamentos pendentes nos dias escolhidos pela cliente (pula passados e duplicados).
- **Migração aditiva**: `ensureSchema()` só adiciona campos com default; nunca remove nem transforma destrutivamente.

## 3. Fase 2 — backend (segurança primeiro)

Requisitos fixos do construtor (valem para qualquer nicho):

1. **Postgres com RLS por tenant** — `tenant_id` em toda tabela; isolamento garantido no banco, não na aplicação.
2. **Auth**: senha com hash **Argon2id**; sessões curtas; rate limit no login.
3. **Segredos criptografados em repouso** (pgcrypto/KMS): tokens de integração nunca em texto plano, nunca no frontend.
4. **TLS obrigatório**; cookies `Secure/HttpOnly/SameSite`.
5. **Auditoria** de ações sensíveis (login, alterações financeiras, exclusões).
6. **LGPD**: dados de clientes finais minimizados; export/erase por titular.

Arquitetura: `PWA (este frontend) → API própria (permissões/auditoria) → Postgres`.
Integrações externas (ex.: pagamento das assinaturas) seguem o padrão **Conector Hub** do blueprint:
token só no servidor, fila com rate limit, retries, cache do último resultado, log técnico.

**Importador**: o JSON do export da Fase 1 (botão Backup) é o contrato de entrada do
`import` da Fase 2 — cada array vira `INSERT` na tabela correspondente com o `tenant_id` do studio.

Endpoints públicos da Fase 2 (o que a Fase 1 só demonstra):
- `GET /:studio/slots?service&date` → horários livres (mesma lógica de `overlap` já implementada aqui);
- `POST /:studio/booking` → cria agendamento pendente + cliente `lead/origin:Online` (fluxo idêntico à prévia);
- portal da assinante: escolher/ajustar os dias do mês dentro da disponibilidade.

## 4. Fase 3 — multi-tenant white-label

- 1 banco, isolamento por **RLS**; branding por tenant (nome, logo, cores via os CSS vars já existentes em `:root`).
- Planos de cobrança dos studios (o produto da AF): assinatura por studio, trial, suspensão por inadimplência.
- Domínio por tenant: `studio.clavusos.com.br` ou domínio próprio (CNAME).

## 5. O que é real × demonstração na Fase 1

| Funciona de verdade | Demonstração (vira real na Fase 2) |
|---|---|
| Agenda, mapa, conflitos, WhatsApp | Link público de agendamento (a prévia roda no aparelho da dona) |
| CRM, vencidas, aniversários, leads | Portal da cliente assinante |
| Caixa, PDV, estoque, relatórios, comissão | Cobrança automática das assinaturas (hoje o lançamento é em 1 toque) |
| Planos, assinaturas, geração de horários | Multiusuário com login (hoje equipe = registro p/ produção, sem senha) |

## 6. Limitações conhecidas da Fase 1 (por desenho)

- Dados vivem no navegador: limpar dados do site = perder tudo → por isso o backup JSON é insistente e há `clavus.backup.prev` antes de importar.
- Sem login: o aparelho da dona é a "sessão". Permissões por papel (superadmin → gestora → equipe, padrão do blueprint) entram com o backend.
- `demo: true` marca os dados de exemplo; "Limpar dados de exemplo" remove agendamentos, transações e assinaturas demo.

## 7. Qualidade

- `node --check` no script extraído.
- Smoke test jsdom (47 asserções): boas-vindas, CRUD de agendamento, conflito/encaixe,
  conclusão→receita, filtros de clientes (vencidas/aniversários/leads), caixa manual, PDV com
  baixa de estoque, relatórios, equipe, plano, assinatura (1ª cobrança + geração de horários),
  agendamento online (lead/origin), mapa, persistência pós-reload, export e limpeza de demo.
