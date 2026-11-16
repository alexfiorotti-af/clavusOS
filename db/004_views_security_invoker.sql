-- D019 · Views respeitam o isolamento entre studios.
-- Uma view do Postgres roda, por padrão, com as permissões de quem a criou — e o dono passa
-- por cima do RLS. A `clientes_ciclo` devolvia, para o papel da aplicação, linhas de outros
-- studios (o app não expunha isso porque sempre a junta com `clientes`, que é isolada; mas
-- era uma brecha na trava). Com `security_invoker` a view usa as permissões de quem consulta,
-- e o RLS de `clientes`/`agendamentos`/`servicos`/`studios` vale também por dentro dela.
-- Regra daqui pra frente: toda view nova nasce com `WITH (security_invoker = true)`;
-- o `npm run verificar` reprova view sem isso.
ALTER VIEW clavus.clientes_ciclo SET (security_invoker = true);
