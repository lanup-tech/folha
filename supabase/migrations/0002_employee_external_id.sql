-- id do funcionário na API EzPoint (GET /funcionario -> id), usado pelas
-- cargas para chamar espelhoDePontos sem depender de matrícula/nome
alter table employees add column if not exists external_id text;
create index if not exists employees_external_id_idx on employees (company_id, external_id);

-- motivo que apareceu nos relatórios após o seed inicial
insert into absence_reasons (client_id, name, treatment)
select c.id, 'LICENÇA GALA', 'DESCONSIDERAR' from clients c where c.slug = 'funchal'
on conflict (client_id, name) do nothing;
