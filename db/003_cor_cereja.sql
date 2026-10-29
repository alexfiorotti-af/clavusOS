-- D017 · Identidade "Cereja & Porcelana": a cor padrão do studio passa a ser a Cereja.
-- Studios que nunca trocaram a cor (ainda no padrão antigo #E91E8C) acompanham a marca;
-- quem escolheu uma cor própria não é tocado.
ALTER TABLE clavus.studios ALTER COLUMN cor SET DEFAULT '#A8174A';
UPDATE clavus.studios SET cor = '#A8174A' WHERE upper(cor) = '#E91E8C';
