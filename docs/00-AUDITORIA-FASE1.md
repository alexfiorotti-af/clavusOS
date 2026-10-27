# Auditoria — ClavusOS Fase 1 × padrão Pousa

> Avaliação pedida pelo Alex em 27/10/2026: comparar o protótipo ClavusOS (PWA, commit `b925e16`)
> com o Pousa Travel e decidir o caminho para algo "mais profundo, mais profissional e mais seguro".
> Veredito no fim. A resposta ao veredito é a **v2 deste repositório** (pasta `app/` + `db/`).

## 1. O que são as duas coisas

| | ClavusOS Fase 1 (protótipo) | Pousa Travel |
|---|---|---|
| Natureza | PWA de arquivo único; dados no navegador | Produto multi-tenant em produção-piloto |
| Onde os dados vivem | `localStorage` do aparelho da dona | PostgreSQL (Supabase SP) com RLS |
| Servidor | nenhum | Node 22 + TypeScript, `node:http`, só `pg` |
| Login | nenhum (o aparelho é a sessão) | scrypt + sessão por cookie com hash no banco, freio a força bruta, convite por link |
| Isolamento entre clientes (white-label) | um arquivo por studio (cópia) | **RLS forçado no banco**: um app, N inquilinos, vazamento impossível por esquecimento de filtro |
| Regra crítica (conflito/overbooking) | checada na tela (JS) | **imposta pelo banco** (exclusão GiST) — a tela pode falhar, o banco não |
| Cobrança | lançamento manual | Asaas em dois níveis: a AF cobra a mensalidade do inquilino; o inquilino cobra o cliente final (chave cifrada AES-GCM, webhook que **nunca** dá baixa sem conferir na API) |
| Dinheiro | número JS (float em potência) | **inteiro em centavos**, sempre |
| Auditoria | nenhuma | tabela `auditoria` para toda ação sensível |
| Backup | export JSON manual | export JSON por rotina + `pg_dump` + (Supabase Pro) backup diário |
| Testes | 47 asserções jsdom | 32 testes, incluindo isolamento RLS e overbooking **contra o banco real** |

## 2. Fragilidades reais da Fase 1 (a crítica do Alex procede)

1. **"Banco de dados em HTML"** — `localStorage` não é banco: é texto plano no perfil do navegador.
   - Qualquer pessoa com o aparelho (ou um XSS, ou uma extensão maliciosa) **lê tudo**: clientes,
     telefones, aniversários, faturamento.
   - Limpar dados do site = perder o negócio inteiro. Backup depende de disciplina humana.
   - Não existe multi-dispositivo, nem equipe real, nem cliente agendando de fora.
2. **Sem autenticação** → sem papéis → a funcionária vê o financeiro da dona.
3. **Sem servidor** → agendamento online e assinatura eram prévia, não produto.
4. **Regra de conflito na tela** → dois aparelhos (ou duas abas) furam a agenda.
5. **Sem trilha de auditoria** → "quem cancelou esse horário?" não tem resposta.
6. **LGPD**: dados pessoais de clientes finais num armazenamento sem controle de acesso,
   sem cifra e sem titularidade clara é passivo, não produto.

**Valor que a Fase 1 preservou:** o domínio (vencida, mapa, PDV, planos), o design system da
skill `agenda-beleza`, e o papel de **demo comercial offline** — ela permanece em `prototipo/`
como material de venda e referência de UX, não como produto.

## 3. O que o padrão Pousa resolve — e a v2 herda, item a item

| Regra da casa (Pousa) | Na v2 do ClavusOS |
|---|---|
| Isolamento é RLS, `FORCE`, toda tabela com `tenant_id`, toda consulta via `comStudio(...)` | `db/002_rls.sql` + `comStudio()`; papel `clavus_app` assumido por transação |
| A regra que mata o produto mora no banco | `agendamentos.sem_choque` (EXCLUDE GiST por profissional × horário); **encaixe** é coluna deliberada e auditada, não furo |
| Dinheiro em centavos; datas de agenda como texto ISO; fuso do studio na transação | idem (`dados/dinheiro.ts`, `dados/datas.ts`, `SET LOCAL TIME ZONE`) |
| Webhook não baixa conta; só manda conferir na API | `cobrancas.receberWebhook` e `assinatura.receberWebhookAF` conferem no Asaas antes de qualquer baixa; eventos idempotentes em `webhooks_recebidos` |
| Segredo de inquilino cifrado (AES-256-GCM) com chave-mestra do ambiente | chave Asaas do studio em `asaas_chave_cifrada` via `dados/cofre.ts` |
| Cartão nunca passa pelo sistema | sempre link/checkout do Asaas |
| Senha scrypt, sessão com hash no banco, freio a força bruta, convite por link | `auth/` idem (sessão de 12 h deslizante) |
| Nada de dado real no repositório; studio `modelo` fictício | idem; `.env` fora do Git; `studio-modelo` |
| Sem framework; dependência única: `pg` | idem |
| Decisões em log append-only; OPERACAO como ficha de bancada | `docs/DECISOES.md`, `docs/OPERACAO.md` |

## 4. Diferenças de domínio (onde o ClavusOS NÃO é um Pousa renomeado)

- A unidade que "lota" não é o quarto×noite, é a **profissional×horário** (minutos, não diárias) —
  a trava usa `tsrange` gerado de `data + inicio + duração`, e **encaixe** é prática legítima do
  nicho: existe como exceção explícita (gerência), nunca como ausência de trava.
- O ativo comercial é a **recorrência da cliente**: ciclo de vencimento por serviço, alerta de
  "unha vencida" calculado no banco, campanha de retorno — isso não existe em hotelaria.
- **Assinatura em dois sentidos**: o studio assina o ClavusOS (Asaas da AF) *e* vende planos às
  clientes (Asaas do studio, ciclos mensal/trimestral/semestral/anual nativos do Asaas, com a
  cliente escolhendo os dias do mês).
- PDV com estoque e comissão por profissional entram no caixa; hotel não tem esse desenho.

## 5. Propriedade e reaproveitamento

O Pousa é propriedade integral da AF (LICENSE.md; decisão D001: autoria do Alex, escrito do zero).
A v2 do ClavusOS segue o **mesmo precedente do Pousa em relação ao ORDO**: fundação genérica nos
mesmos princípios e módulos de infraestrutura da casa (banco/RLS, auth, cofre, dinheiro, datas,
cliente Asaas, motor de assinatura, http), com o **domínio escrito do zero** para o nicho nail.
Nota de prudência: a ficha do Pousa no cofre registra "parceria" com o Dr. Marcell no plano
*comercial* (1º cliente); como a licença e a D001 colocam o código 100% na AF, não há impedimento —
mas vale uma linha por escrito com ele confirmando que a parceria é comercial do Pousa, não sobre
o código, antes de o ClavusOS faturar alto. Custo: uma mensagem. Risco evitado: discussão futura.

## 6. Veredito

A Fase 1 cumpriu o papel (validar o domínio em 1 dia, custo zero) e **não serve como produto**:
dado exposto, sem auth, sem servidor, regra crítica na tela. O caminho pedido — Supabase, Asaas
nos dois níveis, cadastro relacional de clientes, domínio próprio — é exatamente o padrão Pousa,
já provado nesta casa com testes de isolamento e de trava no banco. A v2 implementa isso neste
repositório; a Fase 1 vai para `prototipo/` como demo. Checklist de publicação: `docs/OPERACAO.md`.
