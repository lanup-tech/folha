-- Detalhe diário do espelho de pontos.
--
-- Necessário para o MÊS EM CURSO: a API devolve a cargaHoraria do mês inteiro
-- e marca como "falta" os dias que ainda não aconteceram, o que inflava o ABS%
-- (agosto até o dia 14 dava 56% contra 10,7% de julho). Com o dia a dia,
-- somamos apenas o período já decorrido.
--
-- Também serve para auditar um colaborador dia a dia no painel.
create table if not exists espelho_dias (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  competencia char(7) not null,
  dia date not null,
  planned_min integer not null default 0,      -- cargaHoraria do dia
  worked_min integer not null default 0,       -- horas trabalhadas (diurnas+noturnas)
  absence_min integer not null default 0,      -- falta
  late_min integer not null default 0,         -- atraso
  excused_min integer not null default 0,      -- horasAbonadas
  extra_min integer not null default 0,        -- extraDiurna + extraNoturna
  imported_at timestamptz not null default now(),
  unique (employee_id, dia)
);

create index if not exists espelho_dias_competencia_idx on espelho_dias (competencia);

alter table espelho_dias enable row level security;

create policy "members read espelho dias" on espelho_dias for select
  using (employee_id in (
    select e.id from employees e
    join companies co on co.id = e.company_id
    where co.client_id in (select accessible_client_ids())
  ));
