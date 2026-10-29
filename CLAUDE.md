# CLAUDE.md — ClavusOS

Sistema de gestão para studios de unhas (nail designers), white-label (um app, vários studios).
Produto da **AF Tecnologia e Marketing Ltda.** Autoria do Alex Fiorotti. Segundo nicho do
construtor de SaaS da casa (o primeiro é o CoachOS; o padrão de engenharia é o do Pousa).

## Leitura obrigatória no início da sessão
1. `docs/OPERACAO.md` — variáveis, comandos, studio novo, rotina, Asaas, checklist de deploy.
2. `docs/DECISOES.md` — log append-only; a mais recente vale.
3. `docs/00-AUDITORIA-FASE1.md` — por que a Fase 1 (em `prototipo/`) não é o produto.

## Regras que não se negociam
- **O choque de horário é impedido pelo banco** (`agendamentos.sem_choque`), não pela tela.
  `encaixe` é a exceção deliberada (gerência) e auditada. Nunca remover a trava.
- **Isolamento entre studios é RLS** (`db/002_rls.sql`). Toda tabela nova tem `studio_id` e
  política. Toda consulta passa por `comStudio(...)`. Nunca filtrar por studio "na mão".
- **Dinheiro em centavos inteiros.** Datas de agenda em `YYYY-MM-DD` e horas `HH:MM` (texto),
  nunca `Date`; fuso do studio na transação.
- **Webhook não baixa conta**; só manda conferir na API do Asaas (vale para o nível do studio
  e para o da AF).
- **Chave Asaas do studio fica cifrada** (AES-256-GCM, `dados/cofre.ts`, `CLAVUS_CHAVE_MESTRA`).
  Cartão nunca passa pelo sistema.
- **Nada de dado real no repositório**: nem `.env`, nem chave, nem cliente. O studio `modelo`
  é fictício.
- Sem framework e sem dependência nova sem decisão registrada. Hoje só `pg`.
- Linguagem da interface: português simples, tom do nicho (sem jargão de software). Botões dizem
  o que fazem.
- **Visual: seguir `docs/MARCA.md` e a skill da casa `af-interface-saas`** (navegação em um andar,
  porcelana + ameixa + a cor do studio, nada de emoji como ícone, borda colorida ou caixa alta).
- **A marca mora em `app/src/marca.ts`**: símbolo, paleta e slogan. Favicon, cabeçalho, e-mails e
  vitrine importam de lá; nenhum desenho da marca vive em outro arquivo.

## Ao terminar uma mudança
`cd app && npm run tipos && npm run teste` → registrar em `docs/DECISOES.md` se foi decisão →
commit + push. Os testes de banco recriam o esquema em `CLAVUS_TESTE_DATABASE_URL`
(padrão `postgres://localhost/clavus_teste`).
