# Decisões (append-only; a mais recente vale)

- **D001 · 27/10/2026** — O ClavusOS é produto da AF Tecnologia e Marketing, de autoria do Alex,
  segundo nicho do construtor de SaaS (o primeiro é o CoachOS). A **v2** segue o padrão Pousa:
  Node 22 + TypeScript direto, `node:http`, única dependência `pg`, RLS no Postgres, dinheiro em
  centavos, segredos cifrados, webhook que confere na API. O domínio (agenda por minuto, unha
  vencida, PDV, planos de cliente) foi escrito do zero; a fundação genérica segue os módulos e
  princípios da casa (precedente Pousa↔ORDO, D001 do Pousa).
- **D002 · 27/10/2026** — A Fase 1 (PWA com localStorage) **não é produto**: dado exposto, sem
  auth, regra crítica na tela (auditoria em `docs/00-AUDITORIA-FASE1.md`). Ela vive em `prototipo/`
  como demo comercial offline. O produto é o app servidor + Supabase deste repositório.
- **D003 · 27/10/2026** — **A trava de choque mora no banco** (`agendamentos.sem_choque`,
  exclusão GiST por studio × profissional × `tsrange` gerado de data+hora+duração). **Encaixe**
  é a exceção legítima do nicho: coluna `encaixe` (gerência), fora da trava, dentro da auditoria.
  Cancelado/não-compareceu têm `ativo = false` e liberam o horário. Nunca remover a trava.
- **D004 · 27/10/2026** — **Unha vencida é conta do banco** (view `clientes_ciclo`: última
  concluída + `ciclo_dias` do serviço, ou o padrão do studio; 0 desliga). O painel alerta, a
  lista de campanha sai pronta com o WhatsApp montado. É o diferencial anti-queda de faturamento.
- **D005 · 27/10/2026** — **Caixa automático e idempotente:** concluir atendimento lança a receita
  (índice único impede duplicar; o que já entrou pelo Asaas — sinal — não entra de novo: lança o
  restante). PDV baixa estoque na mesma transação. Lançamento não se apaga: anula-se (gerência),
  com rastro.
- **D006 · 27/10/2026** — **Asaas em dois níveis**, contas separadas: a AF cobra a mensalidade do
  studio (assinatura mensal ou avulso 1/3/6/12, teste 7d → carência 5d → bloqueio sem apagar nada —
  motor portado do Pousa); o studio cobra a cliente na **própria** conta Asaas (chave cifrada
  AES-256-GCM com a chave-mestra da AF), inclusive **assinaturas de plano no ciclo nativo do Asaas**
  (mensal/trimestral/semestral/anual). O dinheiro do studio nunca passa pela AF. Cartão nunca passa
  pelo sistema (sempre checkout do Asaas). Webhook nunca baixa sem conferir na API.
- **D007 · 27/10/2026** — **Planos da cliente:** preço do período, N visitas/mês, serviço incluído;
  a cliente escolhe os dias do mês (1–28) e o horário. "Gerar horários do mês" cria os pendentes
  (preço 0, origem `assinatura`) pulando passado, duplicado e choque (SAVEPOINT por dia). Sem Asaas,
  "registrar recebimento" empurra `pago_ate` e lança no caixa — o produto funciona dos dois jeitos.
- **D008 · 27/10/2026** — **Papéis:** administradora (tudo) → gerência (+ caixa, preços, encaixe) →
  profissional (agenda e clientes; o banco recusa o resto — RESTRICTIVE). Profissional-que-atende é
  registro próprio (`profissionais`, cor no mapa, comissão) com login opcional (`usuario_id`).
- **D009 · 27/10/2026** — **CRM de origem:** toda cliente carrega `origem` (instagram, whatsapp,
  indicação, google, passante, online, outra) e `situacao` lead→ativa (automático no 1º concluído).
  A página pública `/agendar` cria a cliente como lead `online` — e o relatório mensal mostra
  clientes novas por origem.
- **D010 · 27/10/2026** — **/agendar público sem login**: serviço → dia → hora livre (grade contra
  a casa inteira) → dados → pendente + e-mails (cliente e studio). Freios: campo-armadilha, 3 por
  IP/10min, antecedência máxima, `noindex`; o choque final é recusado pelo banco. Com Asaas e
  `sinal_pct` no serviço, o Pix do sinal sai na hora e o pagamento confirma o horário sozinho.
- **D011 · 27/10/2026** — Preço de tabela do ClavusOS: **R$ 147/mês tudo incluso**
  (`CLAVUS_PRECO_MENSAL` muda sem tocar no código), 7 dias de teste. Posicionado abaixo do Pousa
  (R$ 297) porque o tíquete do nicho é menor; revisar com os primeiros studios pagantes.
- **D012 · 27/10/2026** — Qualidade: `tsc --noEmit` + 27 testes puros + 8 testes contra o banco
  real (isolamento RLS, papéis, trava de choque, fluxo concluir→caixa, PDV, webhooks dos dois
  níveis com API falsa) + varredura HTTP de todas as telas e fluxos de escrita. Ritual de mudança:
  `npm run tipos && npm run teste` → registrar aqui se foi decisão → commit + push.
- **D013 · 29/10/2026** — **Demonstração em produção = slug `studio`** (studio.clavusos.com.br,
  alias estacionado; o "curinga" da Hostinger é o alias por slug, lição D010 do Pousa). A demo é
  recriada pela rota `GET /rotina/renovar-demo?chave=<rotina>` — mesmo trabalho do CLI
  `studio-modelo`, agora server-side, sem depender do PC do Alex — e o cron mensal a renova
  (D009 do Pousa, sem a tarefa do Windows). Base de apresentação: 10 clientes (3 vencidas, 2
  aniversariantes, 2 leads), 2 profissionais com comissão, agenda viva com encaixe e falta,
  caixa com despesas e venda, plano com assinante paga e horários gerados. Entradas demo@/
  gerencia@/equipe@; a vitrine divulga só a gerência; a senha da demo é pública de propósito.
- **D014 · 29/10/2026** — **Identidade "Amêndoa & Verniz"**: símbolo construído em geometria
  (unha amêndoa a −20° com lúnula e gota de verniz dourada), Fraunces no display + Poppins no
  texto, paleta nomeada (Esmalte/Orquídea/Verniz/Ameixa/Pó de Arroz). O desenho mora em
  `app/src/marca.ts`; assets por `scripts/gerar-marca.mjs` em `docs/marca/`; manual em
  `docs/MARCA.md`. A vitrine da raiz virou página de venda completa na identidade (hero com a
  UI real em recortes, faixa escura da unha vencida com a bolha de WhatsApp verdadeira, seção
  Asaas, demonstração com credenciais, preço, FAQ). Geração por IA de imagem descartada — a
  marca é código, como manda a casa (D018 do Pousa).
- **D015 · 29/10/2026** — Hostinger: Diretório raiz `app` + Arquivo de entrada `entrada.mjs`
  (importa o servidor no mesmo processo; Node 22.18+ faz o type stripping por padrão).
- **D016 · 29/10/2026** — **Preço de lançamento: R$ 49,90/mês**, tudo incluso, 7 dias de teste.
  Decisão do Alex após pesquisa de mercado: é o valor-base dos apps do nicho nail no Brasil.
  Substitui os R$ 147 da D011 (que fica como histórico/teto para revisão futura, quando houver
  base de pagantes). O valor vive em `CLAVUS_PRECO_MENSAL` — é o que a vitrine mostra E o que a
  assinatura cobra no Asaas da AF; mudar preço = mudar a variável e reiniciar o app (studios já
  assinados mantêm o valor da assinatura criada no Asaas).
- **D017 · 29/10/2026** — **Redesign "Porcelana & Esmalte" + identidade "Cereja & Porcelana"**
  (substitui o visual da D014). O Alex não gostou do visual (rosa/roxo do Material Design de
  2014, degradê no topo, três andares de menu no celular) e aprovou o protótipo navegável.
  Navegação em um andar: no celular, 4 abas embaixo (Hoje, Agenda, Clientes, Caixa) + botão "+"
  central que abre `/novo` (criar horário, venda, lançamento ou cliente); no notebook, menu
  lateral em ameixa. Visões de cada área (Dia/Semana/Equipe, Caixa/Relatórios, abas de
  configuração) viram seletor dentro da página. Paleta: porcelana #F7F2EF, ameixa #2D1B2E e uma
  cor de esmalte — a do studio (`studios.cor`), da qual os tons derivam com `color-mix`; a da
  ClavusOS é a **Cereja #A8174A** (escolha do Alex). Fraunces macia (eixo SOFT) nos títulos e
  valores + Instrument Sans no texto (sai a Poppins). Peças próprias do produto: a linha do dia
  por profissional e o anel do ciclo da unha no avatar da cliente. Saem emoji como ícone,
  borda colorida, caixa alta nos rótulos e contador de passos. Corrigidos: etiqueta esticada na
  lista de clientes, item errado aceso no submenu com `?filtro=`, botão quebrando no caixa e o
  ponto sobrando nas pílulas de dia. Migração `003_cor_cereja.sql`: padrão novo e studios no
  padrão antigo acompanham a marca. Método registrado na skill da casa `af-interface-saas`
  (github.com/alexfiorotti-af/af-interface-saas); manual de marca em `docs/MARCA.md`.

- **D018 · 30/10/2026** — **Verificador de segurança (`npm run verificar`) + páginas legais + correção dos relatórios.**
  (1) Bug: `/relatorios` montava o fim do mês como `ym + "-31"`, data inexistente em meses de 30
  dias e em fevereiro, derrubando a tela (foi o "erro inesperado" em nov/2026). Agora usa o último
  dia real do mês (`somarDias(somarMeses(primeiro,1),-1)`), com teste de regressão. (2) `scripts/verificar.mjs`:
  varre código (injeção de SQL, cabeçalhos, cookie, senha, webhook, tipos), repositório (segredo
  versionado, histórico, `npm audit`) e banco ao vivo (RLS FORCE em toda tabela, isolamento entre
  studios provado, integridade dos dados). Sai com erro se algo falhar; serve de CI depois.
  (3) Endurecido o único `UPDATE` com coluna dinâmica (`studios-admin`) com allowlist de coluna.
  (4) Páginas públicas `/privacidade` e `/termos` (`app/src/telas/legal.ts`) em linha com a LGPD —
  AF controladora dos dados do studio, operadora dos dados das clientes finais; links no rodapé da
  vitrine. (5) `docs/SEGURANCA.md`: posture, vetores de invasão testados e checklist da Hostinger.
  Auditoria de 30/10: 27 checagens, 0 falhas; `npm audit` 0; dependência única `pg`.
