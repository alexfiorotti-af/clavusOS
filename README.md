# ClavusOS 💅

**Gestão completa do studio de unhas num app só** — agenda, mapa por profissional, clientes com alerta de "unha vencida", caixa com fluxo financeiro, PDV de produtos, relatórios, equipe e planos de assinatura.

Produto white-label da **AF Tecnologia e Marketing** — segundo nicho do construtor de SaaS (o primeiro é o CoachOS). *Clavus* é "unha/prego" em latim.

## O que o app faz (Fase 1 — protótipo PWA)

| Módulo | O que entrega |
|---|---|
| **Agenda** | Hoje · Amanhã · Semana · Mês + **Mapa** (colunas por profissional × horário); conflito de horário com "salvar mesmo assim" (encaixe); confirmação por WhatsApp |
| **Clientes (CRM)** | Origem do lead (Instagram, indicação, Google…), lead → cliente automático no 1º atendimento, histórico, aniversário |
| **Unha vencida** 🔔 | Cada serviço tem um ciclo (gel 21d, fibra 28d…). O app calcula pela última unha concluída e alerta no painel quantas clientes estão vencidas — com botão de WhatsApp pronto para campanha de retorno |
| **Caixa** | Atendimento concluído vira receita automaticamente; lançamentos manuais de receitas e despesas; **PDV** de venda de produtos com baixa de estoque |
| **Relatórios** | Fluxo de caixa do mês, receitas por origem, despesas por categoria, **produção e comissão por profissional**, serviços mais vendidos |
| **Equipe** | Profissionais com cor no mapa e % de comissão |
| **Planos & assinaturas** | Planos mensal/trimestral/semestral/anual; a cliente escolhe os dias do mês; 1ª cobrança e renovações entram no caixa; geração dos horários do mês em um toque |
| **Agendamento online** | Prévia do fluxo em que a cliente escolhe serviço → dia → horário livre → confirma (vira link público na Fase 2) |
| **PWA** | Instalável no celular ("Adicionar à tela inicial"), funciona offline, backup por export/import JSON |

## Como rodar

É um app estático — **zero build, zero backend**:

1. **Local:** abra `index.html` no navegador (o service worker só ativa via HTTP/HTTPS).
2. **Hostinger (ou qualquer hospedagem):** suba a pasta inteira (`index.html`, `sw.js`, `manifest.webmanifest`, `icons/`) para um domínio/subdomínio com HTTPS. Pronto: instalável como app.

Os dados vivem no `localStorage` do navegador da profissional (chaves `clavus.*`). Primeiro uso abre o cadastro de 30 segundos e semeia dados de exemplo (removíveis em **Mais → Ajustes → Limpar dados de exemplo**).

## White-label

- Marca: constante `APP_NAME` + nome do negócio em Ajustes.
- Cores: tokens CSS em `:root` (design system do repositório [`agenda-beleza-skill`](https://github.com/alexfiorotti-af/agenda-beleza-skill)).
- Idioma: todas as strings no objeto `t` no topo do script.

## Roteiro

- **Fase 1 (este repo):** PWA offline, dados no navegador — validação do produto.
- **Fase 2:** backend na VPS (Postgres com RLS por tenant, Argon2id, segredos criptografados em repouso, TLS, auditoria). Destrava o **link público de agendamento** e as **assinaturas com portal da cliente**. O export JSON da Fase 1 é o formato do importador.
- **Fase 3:** multi-tenant white-label com branding e cobrança por studio.

Detalhes em [`docs/arquitetura.md`](docs/arquitetura.md).

## Desenvolvimento

- Stack: HTML + CSS + JS vanilla, arquivo único (`index.html`), mobile-first 360–430px.
- Padrões herdados do blueprint do construtor: estado versionado com `ensureSchema()` (migração aditiva, nunca destrutiva), export/import JSON, ponto de recuperação antes de importar.
- Testes: `node --check` + smoke test em jsdom cobrindo os fluxos principais (47 asserções).

---

© AF Tecnologia e Marketing · alexfiorotti@gmail.com · WhatsApp (27) 99601-5367
Uso comercial sob licença — produto para revenda white-label.
