# Deploy no Vercel

O painel é um app Next.js — o Vercel detecta e configura sozinho. O que exige
atenção são as variáveis de ambiente e o que **não** deve rodar lá.

## Conectando (uma vez)

1. https://vercel.com/new → importar `lanup-tech/folha`
2. Framework: **Next.js** (detectado automaticamente)
3. Em **Environment Variables**, adicionar:

| Variável | Onde usar | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | pública, protegida por RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **Production apenas** | ignora RLS — nunca em Preview |

4. Deploy.

As credenciais do ponto (`NOBRIPONTO_API_*`, `NOBRIPONTO_FRONT_*`) **não vão
para o Vercel**: quem as usa é a carga e o robô, que rodam na VPS.

## O que roda onde

| Processo | Onde | Por quê |
|---|---|---|
| Painel (páginas, gráficos) | **Vercel** | é só leitura, escala bem |
| Coleta do Abono (RPA) | **VPS** | precisa de navegador e de sessão longa |
| Carga da API EzPoint | **VPS** | ~35 min por competência; excede o limite de execução do Vercel |
| Consolidação da competência | **VPS** | roda junto com a carga, no ciclo diário |

Ou seja: o Vercel **serve** o painel; a VPS **alimenta** o banco. A rota
`/api/import` existe para testes pontuais e não deve ser usada para a carga
completa em produção.

## Dados

Hoje o painel lê os JSONs versionados em `data/competencias/`. Isso funciona
para publicar, mas significa que **uma competência nova só aparece após um
commit**. O passo seguinte é o painel ler direto do Supabase — aí o ciclo
diário da VPS atualiza a produção sem deploy.

## Domínio

Padrão: `folha-*.vercel.app`. Para domínio próprio (ex.:
`absenteismo.nobriponto.com.br`), adicionar em Settings → Domains e apontar o
DNS conforme as instruções exibidas lá.
