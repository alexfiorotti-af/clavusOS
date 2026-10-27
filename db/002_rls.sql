-- =============================================================================
-- ClavusOS — 002_rls.sql
-- Políticas de linha. O papel `clavus_app` (o da aplicação) só enxerga o studio
-- do contexto. Sem contexto, não enxerga nada. FORCE vale até para o dono.
-- Papéis da equipe: a tela esconde, mas é o banco que recusa.
-- =============================================================================
SET search_path = clavus, public, extensions;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'usuarios','sessoes','tentativas_login','profissionais','servicos','produtos','clientes',
    'planos','assinaturas_clientes','agendamentos','vendas','venda_itens','lancamentos',
    'cobrancas','webhooks_recebidos','faturas_clavus','mensagens','auditoria']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS isolamento ON %I', t);
    EXECUTE format($p$CREATE POLICY isolamento ON %I AS PERMISSIVE FOR ALL TO PUBLIC
                      USING (studio_id = (SELECT ctx_studio()))
                      WITH CHECK (studio_id = (SELECT ctx_studio()))$p$, t);
  END LOOP;
END $$;

-- studios: RLS ligado mas NÃO forçado — o dono do banco (ferramentas, rotina) precisa
-- listar e criar studios; a aplicação (clavus_app) continua presa ao studio do contexto.
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolamento ON studios;
CREATE POLICY isolamento ON studios FOR ALL TO PUBLIC
  USING (id = (SELECT ctx_studio())) WITH CHECK (id = (SELECT ctx_studio()));

-- Regras de papel (RESTRICTIVE soma com AND à regra de isolamento).
-- Dados do studio e usuários: só administrador (e o sistema).
DROP POLICY IF EXISTS so_admin ON studios;
CREATE POLICY so_admin ON studios AS RESTRICTIVE FOR UPDATE TO clavus_app
  USING ((SELECT ctx_papel()) IN ('administrador','sistema')) WITH CHECK ((SELECT ctx_papel()) IN ('administrador','sistema'));

DROP POLICY IF EXISTS so_admin_grava ON usuarios;
CREATE POLICY so_admin_grava ON usuarios AS RESTRICTIVE FOR INSERT TO clavus_app
  WITH CHECK ((SELECT ctx_papel()) IN ('administrador','sistema'));
DROP POLICY IF EXISTS so_admin_altera ON usuarios;
CREATE POLICY so_admin_altera ON usuarios AS RESTRICTIVE FOR UPDATE TO clavus_app
  USING ((SELECT ctx_papel()) IN ('administrador','sistema') OR id = (SELECT ctx_usuario()));

-- Estrutura e preços: administrador e gerência.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profissionais','servicos','produtos','planos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS so_gerencia ON %I', t);
    EXECUTE format($p$CREATE POLICY so_gerencia ON %I AS RESTRICTIVE FOR INSERT TO clavus_app
                      WITH CHECK ((SELECT ctx_papel()) IN ('administrador','gerencia','sistema'))$p$, t);
    EXECUTE format('DROP POLICY IF EXISTS so_gerencia_upd ON %I', t);
    EXECUTE format($p$CREATE POLICY so_gerencia_upd ON %I AS RESTRICTIVE FOR UPDATE TO clavus_app
                      USING ((SELECT ctx_papel()) IN ('administrador','gerencia','sistema'))$p$, t);
    EXECUTE format('DROP POLICY IF EXISTS so_gerencia_del ON %I', t);
    EXECUTE format($p$CREATE POLICY so_gerencia_del ON %I AS RESTRICTIVE FOR DELETE TO clavus_app
                      USING ((SELECT ctx_papel()) IN ('administrador','gerencia','sistema'))$p$, t);
  END LOOP;
END $$;

-- Financeiro consolidado: a profissional opera a agenda, mas não lê o caixa do studio.
-- (O INSERT de lançamento continua liberado: concluir um atendimento gera a receita.)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['lancamentos','vendas','venda_itens','cobrancas','faturas_clavus'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS so_financeiro_le ON %I', t);
    EXECUTE format($p$CREATE POLICY so_financeiro_le ON %I AS RESTRICTIVE FOR SELECT TO clavus_app
                      USING ((SELECT ctx_papel()) IN ('administrador','gerencia','sistema'))$p$, t);
    EXECUTE format('DROP POLICY IF EXISTS so_financeiro_upd ON %I', t);
    EXECUTE format($p$CREATE POLICY so_financeiro_upd ON %I AS RESTRICTIVE FOR UPDATE TO clavus_app
                      USING ((SELECT ctx_papel()) IN ('administrador','gerencia','sistema'))$p$, t);
  END LOOP;
END $$;

-- Lançamento anulado nunca é apagado; anulação só gerência (a UPDATE acima já cobre).
DROP POLICY IF EXISTS sem_delete ON lancamentos;
CREATE POLICY sem_delete ON lancamentos AS RESTRICTIVE FOR DELETE TO clavus_app USING (false);

-- Assinatura do ClavusOS: só o sistema grava faturas; o administrador lê (SELECT acima).
DROP POLICY IF EXISTS so_sistema_grava ON faturas_clavus;
CREATE POLICY so_sistema_grava ON faturas_clavus AS RESTRICTIVE FOR INSERT TO clavus_app
  WITH CHECK ((SELECT ctx_papel()) = 'sistema');

-- Auditoria: qualquer papel grava; só administrador lê.
DROP POLICY IF EXISTS so_admin_le ON auditoria;
CREATE POLICY so_admin_le ON auditoria AS RESTRICTIVE FOR SELECT TO clavus_app
  USING ((SELECT ctx_papel()) IN ('administrador','sistema'));
