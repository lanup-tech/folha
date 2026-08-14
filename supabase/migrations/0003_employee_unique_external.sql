-- A matrícula não é confiável como chave: o ponto permite duas pessoas com a
-- mesma matrícula na mesma empresa (ex.: 6053 na Tattini — LUIZ CARLOS DA SILVA
-- e PABLO CABALLE NASCIMENTO DA SILVA). O id da API (external_id) é o único
-- identificador confiável, então passa a ser a chave de upsert das cargas.
--
-- 1) Derruba a unicidade por matrícula (era o que impedia os dois de coexistir)
alter table employees drop constraint if exists employees_company_id_registration_key;

-- 2) Chave real: (company_id, external_id). Índice TOTAL, sem WHERE — ON CONFLICT
--    não infere índice parcial. Linhas sem external_id (cadastro manual, fora da
--    API) não colidem entre si: NULL nunca é igual a NULL em índice único.
drop index if exists employees_company_external_id_key;
create unique index employees_company_external_id_key
  on employees (company_id, external_id);

-- 3) Matrícula continua indexada para busca, mas sem exigir unicidade
create index if not exists employees_company_registration_idx
  on employees (company_id, registration);
