# NobriPonto Analytics

Painel **whitelabel multitenant** de absenteísmo. Primeiro cliente: **Funchal**
(via tenant Nobriponto), substituindo o fluxo mensal em Excel por uma visão
sistêmica alimentada por API + RPA.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS 4 + Recharts
- **Supabase** — Postgres multitenant com RLS, Auth e Storage (logos)
- **Vercel + GitHub** — deploy e versionamento
- **RPA** (Playwright, roda na VPS) — relatórios sem endpoint na API
- **API Nobriponto/Lanup** — funcionários, extrato de horas, absenteísmo

## Rodando local

```bash
npm install
npm run dev   # http://localhost:3000
```

### Carregando uma competência a partir dos relatórios crus

Coloque `Absenteismo.xlsx`, `Extrato de Horas.xlsx`, `AbonoDeFaltas.xlsx` (e o
`funcionarios_api.json` do `GET /funcionario`) em `data/raw/<AAAA-MM>/` e rode:

```bash
node scripts/ingest-competencia.mjs data/raw/2026-07 2026-07
```

Gera `data/competencias/<AAAA-MM>.json`, registre em `lib/data/competencias.ts`
e a competência aparece no seletor do painel. `data/raw/` fica fora do git
(dados pessoais).

Sem credenciais o painel roda com os dados da competência **maio/2026**
(amostra real transcrita das planilhas) em `lib/data/may-2026.ts` — o visual e
as regras de cálculo já são os definitivos; só a origem dos dados muda quando o
Supabase for plugado.

## Estrutura

| Caminho | O quê |
|---|---|
| `app/dashboard` | Visão geral, Colaboradores, Motivos, Importações |
| `components/charts` | Gráficos (paleta categórica validada/CVD-safe) |
| `lib/data` | Tipos, agregações e a amostra maio/2026 |
| `lib/branding.ts` | Config whitelabel do tenant/cliente (logo + cores) |
| `supabase/migrations` | Schema multitenant + RLS |
| `supabase/seed.sql` | Tenant Nobriponto → cliente Funchal → 3 empresas + motivos |
| `rpa/` | Robô Playwright (VPS, cron) para o Abono de Faltas |
| `docs/integracao-nobriponto.md` | Mapa API × RPA e regras de negócio |

## Hierarquia multitenant

```
Tenant (parceiro whitelabel, ex.: Nobriponto)
└─ Client (cliente final, ex.: Funchal)
   └─ Company (CNPJ: Negócios, Participações, Tattini)
      └─ Sector (setor / centro de custo)
         └─ Employee
```

Usuários entram via `memberships`: equipe do tenant enxerga todos os clientes;
usuário do cliente final enxerga só o próprio (RLS).

## Regra central

**ABS HORA** = Injustificada + Abonada + Justificada ·
**ABS %** = ABS HORA ÷ Planejado · nunca acima de 100% (vira alerta de
qualidade, nunca correção silenciosa). Detalhes em `docs/integracao-nobriponto.md`.

## Próximos passos

1. Criar projeto no Supabase, rodar `supabase/migrations/0001_init.sql` + `seed.sql`, preencher `.env.local`
2. Credenciais/documentação da API Nobriponto → implementar os importers
3. Acesso à VPS + usuário de leitura do ponto → gravar os seletores do RPA
4. Repositório GitHub + projeto Vercel → CI/CD
