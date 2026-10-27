-- =============================================================================
-- ClavusOS — 001_schema.sql
-- Esquema do banco. Um banco, vários studios: toda tabela carrega `studio_id`
-- e o isolamento é feito pelo próprio Postgres (002_rls.sql).
--
-- Dinheiro é sempre inteiro em centavos. Datas de agenda são `date` e horas
-- são `time` (texto na aplicação); instantes são `timestamptz` com o fuso do
-- studio aplicado na transação. Rodar como dono do banco (no Supabase:
-- editor SQL, "Run without RLS"). Idempotente onde o Postgres permite.
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- exclusão de intervalos com `=` na profissional

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'clavus_app') THEN
    CREATE ROLE clavus_app NOLOGIN;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS clavus;
SET search_path = clavus, public, extensions;

-- -----------------------------------------------------------------------------
-- Contexto da sessão: o studio e o usuário "de quem é" a transação atual.
-- O servidor faz set_config no início de cada transação; as políticas leem daqui.
-- Fora de transação: NULL, e nada é visível.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ctx_studio() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('clavus.studio_id', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION ctx_usuario() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('clavus.usuario_id', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION ctx_papel() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('clavus.papel', true), '') $$;

-- -----------------------------------------------------------------------------
-- Studios (os inquilinos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS studios (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  nome             text NOT NULL,
  razao_social     text,
  cnpj_cpf         text,
  cidade           text,
  uf               char(2),
  endereco         text,
  telefone         text,                       -- WhatsApp do studio, só dígitos com DDI
  email            text,
  fuso             text NOT NULL DEFAULT 'America/Sao_Paulo',
  -- marca (white-label)
  cor              text NOT NULL DEFAULT '#E91E8C' CHECK (cor ~ '^#[0-9A-Fa-f]{6}$'),
  logo_url         text,
  assinatura_clavus boolean NOT NULL DEFAULT true,  -- "com tecnologia ClavusOS" no rodapé
  -- agenda
  abre             time NOT NULL DEFAULT '08:00',
  fecha            time NOT NULL DEFAULT '19:00',
  slot_minutos     smallint NOT NULL DEFAULT 30 CHECK (slot_minutos IN (10,15,20,30,60)),
  dias_atendimento smallint[] NOT NULL DEFAULT '{1,2,3,4,5,6}',  -- 0=dom … 6=sáb
  ciclo_dias       smallint NOT NULL DEFAULT 25 CHECK (ciclo_dias BETWEEN 0 AND 120), -- padrão de "unha vencida"
  -- agendamento online (a cliente marca sozinha)
  agendar_online   boolean NOT NULL DEFAULT true,
  agendar_antecedencia smallint NOT NULL DEFAULT 60 CHECK (agendar_antecedencia BETWEEN 1 AND 365), -- dias
  agendar_texto    text,
  -- integrações (segredos cifrados pela aplicação; aqui só o texto cifrado)
  asaas_ambiente   text NOT NULL DEFAULT 'sandbox' CHECK (asaas_ambiente IN ('sandbox','producao')),
  asaas_chave_cifrada text,
  asaas_webhook_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  -- assinatura do ClavusOS (o studio paga a AF)
  plano            text NOT NULL DEFAULT 'teste' CHECK (plano IN ('teste','assinatura','cortesia')),
  teste_ate        date,
  pago_ate         date,
  assinatura_cliente_id   text,       -- cliente do studio no Asaas da AF
  assinatura_asaas_id     text,       -- assinatura mensal no Asaas da AF
  assinatura_forma        text,
  assinatura_cancelada_em timestamptz,
  assinatura_aviso_em     date,
  situacao         text NOT NULL DEFAULT 'teste' CHECK (situacao IN ('teste','ativo','suspenso')),
  criado_em        timestamptz NOT NULL DEFAULT now()
);

-- Resolver o studio pelo slug ANTES de haver contexto: função definer, só lê o que precisa.
CREATE OR REPLACE FUNCTION resolver_studio(p_slug text)
  RETURNS TABLE (id uuid, slug text, nome text, situacao text)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = clavus, public, extensions AS $$
  SELECT s.id, s.slug, s.nome, s.situacao FROM studios s WHERE s.slug = lower(p_slug)
$$;

-- Achar o studio pela assinatura do Asaas da AF (webhook chega sem contexto).
CREATE OR REPLACE FUNCTION studio_da_assinatura(p_asaas_id text)
  RETURNS TABLE (id uuid, slug text)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = clavus, public, extensions AS $$
  SELECT s.id, s.slug FROM studios s WHERE s.assinatura_asaas_id = p_asaas_id
$$;

-- -----------------------------------------------------------------------------
-- Usuários e sessões
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id   uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  email       text NOT NULL,
  senha_hash  text,                         -- NULL = ainda não definiu (convite pendente)
  papel       text NOT NULL CHECK (papel IN ('profissional','gerencia','administrador')),
  ativo       boolean NOT NULL DEFAULT true,
  convite_token  text,
  convite_expira timestamptz,
  ultimo_acesso  timestamptz,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (studio_id, email)
);

CREATE TABLE IF NOT EXISTS sessoes (
  token_hash  text PRIMARY KEY,
  studio_id   uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  usuario_id  uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ip          text,
  criada_em   timestamptz NOT NULL DEFAULT now(),
  expira_em   timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessoes_expira ON sessoes (expira_em);

CREATE TABLE IF NOT EXISTS tentativas_login (
  studio_id  uuid NOT NULL,
  email      text NOT NULL,
  quando     timestamptz NOT NULL DEFAULT now(),
  sucesso    boolean NOT NULL
);
CREATE INDEX IF NOT EXISTS tentativas_login_idx ON tentativas_login (studio_id, email, quando);

-- -----------------------------------------------------------------------------
-- Estrutura do studio
-- -----------------------------------------------------------------------------
-- Profissional é quem atende; pode (ou não) ter login (usuario_id).
CREATE TABLE IF NOT EXISTS profissionais (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id    uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  usuario_id   uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  nome         text NOT NULL,
  cor          text NOT NULL DEFAULT '#E91E8C' CHECK (cor ~ '^#[0-9A-Fa-f]{6}$'),
  comissao_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (comissao_pct BETWEEN 0 AND 100),
  ativo        boolean NOT NULL DEFAULT true,
  criado_em    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (studio_id, nome)
);

CREATE TABLE IF NOT EXISTS servicos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id   uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  descricao   text,
  preco       integer NOT NULL DEFAULT 0 CHECK (preco >= 0),          -- centavos
  duracao_min smallint NOT NULL DEFAULT 60 CHECK (duracao_min BETWEEN 5 AND 600),
  ciclo_dias  smallint NOT NULL DEFAULT 25 CHECK (ciclo_dias BETWEEN 0 AND 120), -- 0 = não controla vencimento
  cor         text NOT NULL DEFAULT '#E91E8C' CHECK (cor ~ '^#[0-9A-Fa-f]{6}$'),
  sinal_pct   smallint NOT NULL DEFAULT 0 CHECK (sinal_pct BETWEEN 0 AND 100),   -- sinal no agendamento online
  ativo       boolean NOT NULL DEFAULT true,
  UNIQUE (studio_id, nome)
);

CREATE TABLE IF NOT EXISTS produtos (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  nome      text NOT NULL,
  preco     integer NOT NULL CHECK (preco >= 0),      -- centavos
  custo     integer NOT NULL DEFAULT 0 CHECK (custo >= 0),
  estoque   integer NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  ativo     boolean NOT NULL DEFAULT true,
  UNIQUE (studio_id, nome)
);

-- -----------------------------------------------------------------------------
-- Clientes (o cadastro, com as suas devidas tabelas)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id     uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  nome          text NOT NULL,
  cpf           text,
  nascimento    date,                       -- aniversário (ano pode ser simbólico)
  email         text,
  telefone      text,                       -- WhatsApp, só dígitos com DDI
  cep           text,
  endereco      text,
  cidade        text,
  uf            char(2),
  origem        text NOT NULL DEFAULT 'outra'
                CHECK (origem IN ('instagram','whatsapp','indicacao','google','passante','online','outra')),
  situacao      text NOT NULL DEFAULT 'ativa' CHECK (situacao IN ('lead','ativa','inativa')),
  observacoes   text,                       -- alergias, preferências
  asaas_cliente_id text,                    -- na conta Asaas DO STUDIO
  criado_em     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clientes_nome ON clientes (studio_id, lower(nome));
CREATE INDEX IF NOT EXISTS clientes_tel  ON clientes (studio_id, telefone);

-- -----------------------------------------------------------------------------
-- Planos e assinaturas das clientes (o studio vende recorrência)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id    uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  nome         text NOT NULL,
  periodo      text NOT NULL DEFAULT 'mensal' CHECK (periodo IN ('mensal','trimestral','semestral','anual')),
  preco        integer NOT NULL CHECK (preco > 0),            -- centavos, do período inteiro
  visitas_mes  smallint NOT NULL DEFAULT 2 CHECK (visitas_mes BETWEEN 1 AND 10),
  servico_id   uuid NOT NULL REFERENCES servicos(id),
  ativo        boolean NOT NULL DEFAULT true,
  UNIQUE (studio_id, nome)
);

CREATE TABLE IF NOT EXISTS assinaturas_clientes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id    uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  cliente_id   uuid NOT NULL REFERENCES clientes(id),
  plano_id     uuid NOT NULL REFERENCES planos(id),
  preco        integer NOT NULL CHECK (preco > 0),            -- congelado na venda
  periodo      text NOT NULL CHECK (periodo IN ('mensal','trimestral','semestral','anual')),
  dias_mes     smallint[] NOT NULL,                           -- dias do mês que a cliente escolheu (1..28)
  hora         time NOT NULL DEFAULT '09:00',
  profissional_id uuid REFERENCES profissionais(id),
  inicio       date NOT NULL DEFAULT CURRENT_DATE,
  pago_ate     date,                                          -- até quando está coberta
  asaas_assinatura_id text,                                   -- assinatura no Asaas DO STUDIO (cobrança automática)
  situacao     text NOT NULL DEFAULT 'ativa' CHECK (situacao IN ('ativa','cancelada')),
  cancelada_em timestamptz,
  criado_por   uuid REFERENCES usuarios(id),
  criado_em    timestamptz NOT NULL DEFAULT now(),
  CHECK (array_length(dias_mes, 1) BETWEEN 1 AND 10)
);
CREATE INDEX IF NOT EXISTS assinaturas_cli ON assinaturas_clientes (studio_id, situacao);

-- -----------------------------------------------------------------------------
-- Agenda — AQUI mora a trava de conflito.
-- O Postgres recusa dois horários ativos da mesma profissional que se cruzem.
-- `encaixe = true` é a exceção deliberada do nicho (dois atendimentos ao mesmo
-- tempo de propósito): sai da trava, fica na auditoria. Nunca remover a trava.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agendamentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id       uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  codigo          text NOT NULL,                      -- curto, o que se fala no WhatsApp
  cliente_id      uuid NOT NULL REFERENCES clientes(id),
  servico_id      uuid NOT NULL REFERENCES servicos(id),
  profissional_id uuid REFERENCES profissionais(id),  -- NULL = studio solo / sem definição
  assinatura_id   uuid REFERENCES assinaturas_clientes(id),
  data            date NOT NULL,
  inicio          time NOT NULL,
  duracao_min     smallint NOT NULL CHECK (duracao_min BETWEEN 5 AND 600),
  preco           integer NOT NULL DEFAULT 0 CHECK (preco >= 0),   -- centavos; 0 quando coberto por assinatura
  situacao        text NOT NULL DEFAULT 'pendente'
                  CHECK (situacao IN ('pendente','confirmado','concluido','cancelado','nao_compareceu')),
  origem          text NOT NULL DEFAULT 'balcao'
                  CHECK (origem IN ('balcao','whatsapp','instagram','online','assinatura','outra')),
  encaixe         boolean NOT NULL DEFAULT false,
  ativo           boolean NOT NULL DEFAULT true,       -- false quando cancelado/não compareceu (libera o horário)
  observacoes     text,
  horario         tsrange GENERATED ALWAYS AS
                  (tsrange((data + inicio)::timestamp,
                           (data + inicio)::timestamp + make_interval(mins => duracao_min), '[)')) STORED,
  criado_por      uuid REFERENCES usuarios(id),
  criado_em       timestamptz NOT NULL DEFAULT now(),
  confirmado_em   timestamptz,
  concluido_em    timestamptz,
  cancelado_em    timestamptz,
  motivo_cancelamento text,
  CHECK ((situacao IN ('cancelado','nao_compareceu')) = (NOT ativo)),
  UNIQUE (studio_id, codigo),
  CONSTRAINT sem_choque EXCLUDE USING gist (
    studio_id WITH =,
    COALESCE(profissional_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
    horario WITH &&
  ) WHERE (ativo AND NOT encaixe)
);
CREATE INDEX IF NOT EXISTS agendamentos_dia ON agendamentos (studio_id, data);
CREATE INDEX IF NOT EXISTS agendamentos_cliente ON agendamentos (cliente_id, data DESC);
CREATE INDEX IF NOT EXISTS agendamentos_sit ON agendamentos (studio_id, situacao);

-- Última unha concluída de cada cliente + quando vence (ciclo do serviço, ou do studio).
-- É daqui que sai o alerta de "unha vencida" e a lista de campanha.
CREATE OR REPLACE VIEW clientes_ciclo AS
SELECT c.id AS cliente_id, c.studio_id, u.data AS ultima, u.servico_nome,
       CASE WHEN u.ciclo > 0 THEN (u.data + u.ciclo)::date END AS vence_em
  FROM clientes c
  JOIN LATERAL (
    SELECT a.data, s.nome AS servico_nome,
           COALESCE(NULLIF(s.ciclo_dias, 0), st.ciclo_dias) AS ciclo
      FROM agendamentos a
      JOIN servicos s ON s.id = a.servico_id
      JOIN studios st ON st.id = a.studio_id
     WHERE a.cliente_id = c.id AND a.situacao = 'concluido'
     ORDER BY a.data DESC, a.inicio DESC LIMIT 1
  ) u ON true;

-- -----------------------------------------------------------------------------
-- Caixa: lançamentos de receita e despesa (o fluxo de caixa do studio)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id  uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES clientes(id),
  total      integer NOT NULL CHECK (total > 0),
  forma      text NOT NULL DEFAULT 'pix'
             CHECK (forma IN ('dinheiro','pix','cartao_credito','cartao_debito','outro')),
  data       date NOT NULL DEFAULT CURRENT_DATE,
  criado_por uuid REFERENCES usuarios(id),
  criado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS venda_itens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id  uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  venda_id   uuid NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES produtos(id),
  quantidade smallint NOT NULL CHECK (quantidade > 0),
  preco_unit integer NOT NULL CHECK (preco_unit >= 0)
);

CREATE TABLE IF NOT EXISTS lancamentos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id      uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  tipo           text NOT NULL CHECK (tipo IN ('receita','despesa')),
  categoria      text NOT NULL DEFAULT 'geral',
  descricao      text NOT NULL,
  valor          integer NOT NULL CHECK (valor > 0),   -- centavos, sempre positivo; o sinal é o tipo
  forma          text CHECK (forma IN ('dinheiro','pix','cartao_credito','cartao_debito','boleto','asaas','outro')),
  origem         text NOT NULL DEFAULT 'manual'
                 CHECK (origem IN ('servico','produto','assinatura_cliente','manual')),
  agendamento_id uuid REFERENCES agendamentos(id),
  venda_id       uuid REFERENCES vendas(id),
  assinatura_id  uuid REFERENCES assinaturas_clientes(id),
  cobranca_id    uuid,
  profissional_id uuid REFERENCES profissionais(id),
  data           date NOT NULL DEFAULT CURRENT_DATE,
  criado_por     uuid REFERENCES usuarios(id),
  criado_em      timestamptz NOT NULL DEFAULT now(),
  anulado_em     timestamptz,
  anulado_por    uuid REFERENCES usuarios(id),
  motivo_anulacao text
);
CREATE INDEX IF NOT EXISTS lancamentos_data ON lancamentos (studio_id, data);
-- Concluir o mesmo atendimento duas vezes não duplica a receita.
-- (cobranca_id IS NULL: pagamentos pelo Asaas — sinal, por exemplo — têm linha própria.)
CREATE UNIQUE INDEX IF NOT EXISTS lanc_um_por_atendimento
  ON lancamentos (agendamento_id) WHERE agendamento_id IS NOT NULL AND origem = 'servico' AND cobranca_id IS NULL AND anulado_em IS NULL;

-- -----------------------------------------------------------------------------
-- Cobranças (espelho do Asaas DO STUDIO: a cliente paga o studio)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cobrancas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id      uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  cliente_id     uuid NOT NULL REFERENCES clientes(id),
  agendamento_id uuid REFERENCES agendamentos(id),
  assinatura_id  uuid REFERENCES assinaturas_clientes(id),
  finalidade     text NOT NULL DEFAULT 'servico' CHECK (finalidade IN ('sinal','servico','assinatura','avulsa')),
  meio           text NOT NULL CHECK (meio IN ('pix','boleto','cartao','link')),
  valor          integer NOT NULL CHECK (valor > 0),
  vencimento     date NOT NULL,
  situacao       text NOT NULL DEFAULT 'pendente'
                 CHECK (situacao IN ('pendente','recebida','cancelada','estornada','vencida')),
  asaas_id       text UNIQUE,
  url_fatura     text,
  pix_copia_cola text,
  pix_qr_base64  text,
  recebida_em    timestamptz,
  valor_liquido  integer,
  criado_por     uuid REFERENCES usuarios(id),
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizada_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cobrancas_cliente ON cobrancas (cliente_id);
CREATE INDEX IF NOT EXISTS cobrancas_sit ON cobrancas (studio_id, situacao);

-- Avisos recebidos do Asaas (studio e AF), guardados antes de qualquer interpretação.
CREATE TABLE IF NOT EXISTS webhooks_recebidos (
  id            bigserial PRIMARY KEY,
  studio_id     uuid NOT NULL,
  evento_id     text,
  evento        text,
  corpo         jsonb NOT NULL,
  recebido_em   timestamptz NOT NULL DEFAULT now(),
  processado_em timestamptz,
  resultado     text,
  UNIQUE (studio_id, evento_id)
);

-- -----------------------------------------------------------------------------
-- Assinatura do ClavusOS (o studio paga a AF) — faturas na conta Asaas da AF
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faturas_clavus (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id     uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  asaas_id      text NOT NULL UNIQUE,
  valor         integer NOT NULL,
  vencimento    date NOT NULL,
  situacao      text NOT NULL DEFAULT 'pendente' CHECK (situacao IN ('pendente','recebida','vencida','cancelada','estornada')),
  meio          text,
  url_fatura    text,
  recebida_em   timestamptz,
  meses         smallint NOT NULL DEFAULT 1,
  avulsa        boolean NOT NULL DEFAULT false,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizada_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS faturas_clavus_studio ON faturas_clavus (studio_id, vencimento DESC);

-- -----------------------------------------------------------------------------
-- Mensagens (e-mail) e auditoria
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mensagens (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id      uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  agendamento_id uuid REFERENCES agendamentos(id) ON DELETE CASCADE,
  canal          text NOT NULL DEFAULT 'email' CHECK (canal IN ('email','whatsapp')),
  tipo           text NOT NULL,          -- confirmacao, lembrete_1, convite, senha, assinatura.*…
  destinatario   text NOT NULL,
  assunto        text,
  enviada_em     timestamptz,
  erro           text,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agendamento_id, canal, tipo)
);

CREATE TABLE IF NOT EXISTS auditoria (
  id          bigserial PRIMARY KEY,
  studio_id   uuid NOT NULL,
  usuario_id  uuid,
  acao        text NOT NULL,
  tabela      text,
  registro_id text,
  detalhes    jsonb,
  ip          text,
  criado_em   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auditoria_studio ON auditoria (studio_id, criado_em DESC);

-- -----------------------------------------------------------------------------
-- Funções de apoio
-- -----------------------------------------------------------------------------
-- Código curto do agendamento: 2 letras + 4 dígitos, por studio, sem letras ambíguas.
CREATE OR REPLACE FUNCTION novo_codigo_agendamento(p_studio uuid) RETURNS text
  LANGUAGE plpgsql AS $$
DECLARE letras text := 'ABCDEFGHJKMNPQRSTUVWXYZ'; c text; n int := 0;
BEGIN
  LOOP
    c := substr(letras, 1 + floor(random()*23)::int, 1) || substr(letras, 1 + floor(random()*23)::int, 1)
         || lpad((floor(random()*9000)+1000)::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM agendamentos WHERE studio_id = p_studio AND codigo = c);
    n := n + 1; IF n > 50 THEN RAISE EXCEPTION 'sem código livre'; END IF;
  END LOOP;
  RETURN c;
END $$;

GRANT USAGE ON SCHEMA clavus TO clavus_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA clavus TO clavus_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA clavus TO clavus_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA clavus TO clavus_app;
GRANT SELECT ON clientes_ciclo TO clavus_app;

-- O usuário que a aplicação usa para conectar assume `clavus_app` em cada transação
-- (`SET LOCAL ROLE clavus_app`), e é assim que as políticas passam a valer para ele.
DO $$ BEGIN
  EXECUTE format('GRANT clavus_app TO %I', current_user);
END $$;
