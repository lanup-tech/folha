-- ============================================================
-- NobriPonto Analytics — schema inicial multitenant whitelabel
--
-- Hierarquia:
--   tenants   (parceiro whitelabel, ex.: Nobriponto)
--     clients (cliente final do tenant, ex.: Funchal)
--       companies (CNPJs do cliente, ex.: Negócios/Participações/Tattini)
--         sectors  (setor / centro de custo)
--           employees
--
-- Fatos por competência (YYYY-MM):
--   absenteeism_monthly  <- relatório 02 Absenteísmo (API)
--   hour_extract_monthly <- relatório 02 Extrato de Horas (API)
--   absence_records      <- relatório 02 Abono de Faltas (RPA)
--   absence_reasons      <- base de motivos (mantida no front pelo cliente)
--   import_runs          <- log de cargas API/RPA
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Estrutura organizacional ----------

create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  primary_color text not null default '#ff6600',
  dark_color text not null default '#010066',
  created_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  slug text not null,
  name text not null,
  logo_url text,
  primary_color text,
  dark_color text,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  short_name text,
  cnpj text,
  created_at timestamptz not null default now(),
  unique (client_id, name)
);

create table sectors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  cost_center_code text,
  unique (company_id, name)
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  sector_id uuid references sectors(id) on delete set null,
  registration text not null,          -- matrícula
  name text not null,
  cpf text,
  pis text,
  role text,                           -- cargo
  status text not null default 'ATIVO',
  admission_date date,
  termination_date date,
  created_at timestamptz not null default now(),
  unique (company_id, registration)
);

-- ---------- Base de motivos (front do cliente final) ----------

create table absence_reasons (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  -- ABONADO entra em ABONADA; JUSTIFICADO em JUSTIFICADA; DESCONSIDERAR sai do cálculo
  treatment text not null check (treatment in ('ABONADO', 'JUSTIFICADO', 'DESCONSIDERAR')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (client_id, name)
);

-- ---------- Fatos por competência ----------
-- Durações sempre em MINUTOS inteiros ("170:00:00" => 10200)

create table absenteeism_monthly (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  competencia char(7) not null,        -- 'YYYY-MM'
  planned_min integer not null default 0,      -- Horas Previstas (PLANEJADO)
  worked_min integer not null default 0,       -- Horas Realizadas
  tolerance_min integer not null default 0,    -- Tolerância de Atraso
  justified_min integer not null default 0,    -- Faltas Justificadas
  unjustified_min integer not null default 0,  -- Faltas Injustificadas
  imported_at timestamptz not null default now(),
  unique (employee_id, competencia)
);

create table hour_extract_monthly (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  competencia char(7) not null,
  day_min integer not null default 0,          -- Total Diurno Trabalhado
  night_min integer not null default 0,        -- Total Noturno Trabalhado
  total_min integer not null default 0,
  imported_at timestamptz not null default now(),
  unique (employee_id, competencia)
);

create table absence_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  competencia char(7) not null,
  date date not null,
  reason_id uuid references absence_reasons(id) on delete set null,
  reason_raw text not null,            -- texto original do relatório (Motivo)
  period_label text,                   -- 'O dia todo.' | '1º período.' | '2º período.'
  -- horas do dia: dia todo = 480 min, meio período = 240 min (regra hoje manual)
  granted_min integer not null default 480,
  night_min integer not null default 0,
  cid text,
  imported_at timestamptz not null default now()
);

create table import_runs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  competencia char(7) not null,
  source text not null check (source in ('API', 'RPA', 'MANUAL')),
  report text not null,                -- 'funcionarios' | 'extrato_horas' | 'absenteismo' | 'abono_faltas'
  status text not null default 'RUNNING' check (status in ('RUNNING', 'OK', 'ERROR')),
  rows_imported integer,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- ---------- Visão consolidada (aba "geral" das análises) ----------
-- ABS HORA = INJUSTIFICADA + ABONADA + JUSTIFICADA; ABS % = ABS HORA / PLANEJADO.
-- ABONADA/JUSTIFICADA saem do Abono de Faltas conforme o tratamento do motivo;
-- INJUSTIFICADA vem do relatório de absenteísmo.

create view employee_month_summary as
select
  e.id as employee_id,
  e.company_id,
  c.client_id,
  ab.competencia,
  e.registration,
  e.name,
  e.role,
  s.name as sector,
  coalesce(he.total_min, 0) as he_min,
  ab.unjustified_min,
  coalesce(gr.excused_min, 0) as excused_min,
  coalesce(gr.justified_min, 0) as justified_min,
  ab.unjustified_min + coalesce(gr.excused_min, 0) + coalesce(gr.justified_min, 0) as abs_hora_min,
  ab.planned_min,
  case when ab.planned_min > 0
    then round((ab.unjustified_min + coalesce(gr.excused_min, 0) + coalesce(gr.justified_min, 0))::numeric
               / ab.planned_min, 4)
    else 0
  end as abs_pct
from absenteeism_monthly ab
join employees e on e.id = ab.employee_id
join companies c on c.id = e.company_id
left join sectors s on s.id = e.sector_id
left join hour_extract_monthly he
  on he.employee_id = ab.employee_id and he.competencia = ab.competencia
left join lateral (
  select
    sum(ar.granted_min) filter (where r.treatment = 'ABONADO') as excused_min,
    sum(ar.granted_min) filter (where r.treatment = 'JUSTIFICADO') as justified_min
  from absence_records ar
  left join absence_reasons r on r.id = ar.reason_id
  where ar.employee_id = ab.employee_id and ar.competencia = ab.competencia
) gr on true;

-- ---------- Acesso e RLS ----------

create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  -- null = acesso a todos os clientes do tenant (equipe do parceiro);
  -- preenchido = usuário do cliente final, enxerga só o próprio cliente
  client_id uuid references clients(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'viewer')),
  unique (user_id, tenant_id, client_id)
);

create or replace function accessible_client_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select c.id
  from clients c
  join memberships m on m.tenant_id = c.tenant_id
  where m.user_id = auth.uid()
    and (m.client_id is null or m.client_id = c.id);
$$;

alter table tenants enable row level security;
alter table clients enable row level security;
alter table companies enable row level security;
alter table sectors enable row level security;
alter table employees enable row level security;
alter table absence_reasons enable row level security;
alter table absenteeism_monthly enable row level security;
alter table hour_extract_monthly enable row level security;
alter table absence_records enable row level security;
alter table import_runs enable row level security;
alter table memberships enable row level security;

create policy "tenant members read tenant" on tenants for select
  using (id in (select tenant_id from memberships where user_id = auth.uid()));

create policy "members read clients" on clients for select
  using (id in (select accessible_client_ids()));

create policy "members read companies" on companies for select
  using (client_id in (select accessible_client_ids()));

create policy "members read sectors" on sectors for select
  using (company_id in (select id from companies where client_id in (select accessible_client_ids())));

create policy "members read employees" on employees for select
  using (company_id in (select id from companies where client_id in (select accessible_client_ids())));

create policy "members read reasons" on absence_reasons for select
  using (client_id in (select accessible_client_ids()));

create policy "admins manage reasons" on absence_reasons for all
  using (client_id in (
    select c.id from clients c
    join memberships m on m.tenant_id = c.tenant_id
    where m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
      and (m.client_id is null or m.client_id = c.id)
  ));

create policy "members read absenteeism" on absenteeism_monthly for select
  using (employee_id in (
    select e.id from employees e
    join companies co on co.id = e.company_id
    where co.client_id in (select accessible_client_ids())
  ));

create policy "members read hour extract" on hour_extract_monthly for select
  using (employee_id in (
    select e.id from employees e
    join companies co on co.id = e.company_id
    where co.client_id in (select accessible_client_ids())
  ));

create policy "members read absence records" on absence_records for select
  using (employee_id in (
    select e.id from employees e
    join companies co on co.id = e.company_id
    where co.client_id in (select accessible_client_ids())
  ));

create policy "members read import runs" on import_runs for select
  using (client_id in (select accessible_client_ids()));

create policy "users read own memberships" on memberships for select
  using (user_id = auth.uid());

-- Escrita de dados de carga (API/RPA) acontece via service_role, que ignora RLS.
