-- Seed inicial: tenant Nobriponto + cliente Funchal com 3 empresas.
-- Rodar após 0001_init.sql (SQL Editor do Supabase ou `supabase db reset`).

insert into tenants (slug, name, primary_color, dark_color)
values ('nobriponto', 'Nobriponto', '#ff6600', '#010066');

insert into clients (tenant_id, slug, name, logo_url, primary_color, dark_color)
select id, 'funchal', 'Funchal', '/logo_funchal.svg', '#ff6600', '#010066'
from tenants where slug = 'nobriponto';

insert into companies (client_id, name, short_name, cnpj)
select c.id, v.name, v.short_name, v.cnpj
from clients c,
  (values
    ('Funchal Negócios Empreendimentos LTDA', 'Negócios', '10.328.634/0001-21'),
    ('Funchal Participações e Empreendimentos LTDA', 'Participações', null),
    ('Tattini Sociedade de Advogados', 'Tattini', null)
  ) as v(name, short_name, cnpj)
where c.slug = 'funchal';

-- Base de motivos (aba "motivos" do Abono de Faltas)
insert into absence_reasons (client_id, name, treatment)
select c.id, v.name, v.treatment
from clients c,
  (values
    ('AFASTADA', 'DESCONSIDERAR'),
    ('ATESTADO INTERNACAO', 'ABONADO'),
    ('ATESTADO MÉDICO', 'ABONADO'),
    ('ATESTADO ÓBITO FAMILIAR', 'ABONADO'),
    ('DECLARACAO DE COMPARECIMENTO', 'ABONADO'),
    ('DECLARACAO ODONTOLOGICA', 'ABONADO'),
    ('FOLGA AUTORIZADA GESTOR', 'ABONADO'),
    ('DECLARACAO DE ACOMPANHAMENTO', 'ABONADO'),
    ('LICENÇA AMAMENTAÇÃO', 'ABONADO'),
    ('TRIBUNAL DE JUSTIÇA', 'ABONADO'),
    ('DECLARACAO ESCOLAR', 'ABONADO'),
    ('AT MED ACOMP FILHO', 'ABONADO'),
    ('ABONADO PELO GESTOR', 'ABONADO'),
    ('LICENÇA MATERNIDADE', 'DESCONSIDERAR'),
    ('AVISO PRÉVIO', 'DESCONSIDERAR'),
    ('CAMPANHA DE FOLGA', 'DESCONSIDERAR'),
    ('COMPENSAÇÃO', 'DESCONSIDERAR'),
    ('COMPENSACAO CARNAVAL', 'DESCONSIDERAR'),
    ('FOLGA COMPENSAÇÃO', 'DESCONSIDERAR'),
    ('HOME OFFICE', 'DESCONSIDERAR'),
    ('PROBLEMAS TRANSPORTE PUBLICO', 'DESCONSIDERAR'),
    ('TREINAMENTO', 'DESCONSIDERAR'),
    ('ABONADO PELA EMPRESA', 'DESCONSIDERAR'),
    ('PROBLEMA VPN', 'DESCONSIDERAR'),
    ('SERVIÇO EXTERNO', 'DESCONSIDERAR'),
    ('FOLGA MESÁRIO', 'DESCONSIDERAR'),
    ('LICENÇA MATRIMONIAL', 'DESCONSIDERAR'),
    ('DOAÇÃO DE SANGUE', 'DESCONSIDERAR')
  ) as v(name, treatment)
where c.slug = 'funchal';
