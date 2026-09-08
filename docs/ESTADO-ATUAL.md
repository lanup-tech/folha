# Estado do projeto — 08/09/2026

Documento de retomada: o que está pronto, o que está rodando e o que falta.
Escrito para que qualquer pessoa (ou uma nova sessão) continue sem depender de
histórico de conversa.

## O painel

Next.js em `localhost:3000` (`npm run dev`). Lê os JSONs de
`data/competencias/`, **não** o Supabase direto — o banco alimenta os scripts,
que geram os arquivos.

Telas: Visão geral (filtros globais, drill-down por dimensão, KPIs clicáveis),
Colaboradores (tabela + drawer com dia a dia), Motivos, Usuários,
Configurações, Importações (saúde das cargas) e Ajuda.

## Fluxo de dados

```
API EzPoint ──► load-competencia-api.mjs ──► Supabase
RPA (VPS)   ──► collect-abono.ts        ──► data/raw/<comp>/AbonoDeFaltas.xlsx
                          │
                          ▼
              montar-competencia-api.mjs ──► data/competencias/<comp>.json ──► painel
```

Ordem para carregar uma competência:

```bash
cd rpa && npx tsx src/collect-abono.ts 2026-06   # Abono (motivos)
cd .. && node scripts/load-competencia-api.mjs 2026-06   # espelho -> banco (~36 min)
node scripts/carregar-dias.mjs 2026-06           # OPCIONAL: detalhe diário (+36 min)
node scripts/exportar-dias.mjs 2026-06           # se carregou os dias
node scripts/montar-competencia-api.mjs 2026-06  # gera o JSON do painel
node scripts/validar-competencia.mjs 2026-06     # confere
```

**Restrição importante**: a API limita **30 chamadas/minuto no total**. Duas
cargas simultâneas disputam a mesma cota e ambas ficam lentas — rode uma por vez.

## Estado das competências (08/09/2026)

| Competência | Espelho | Abono | JSON do painel | Detalhe diário |
|---|---|---|---|---|
| 2026-09 | carregando | ✅ | parcial | ❌ |
| 2026-08 | ✅ 967 | ✅ 1.735 | ✅ ABS 12,17% | ✅ |
| 2026-07 | ✅ 881 (14/08) | ✅ | ✅ ABS 10,70% | ❌ |
| 2026-06 | ✅ 878 (14/08) | ✅ 2.284 | ✅ | ❌ |
| 2026-05 a 2026-01 | ❌ | ❌ | ❌ | ❌ |

## Pendências

### Carga retroativa (jan a jun/2026) — EM ANDAMENTO
Comando: `node scripts/fila-retroativa.mjs 2026-06 2026-05 2026-04 2026-03 2026-02 2026-01`
Tempo: ~36 min por mês (~3,6h no total, sem detalhe diário).
A fila espera cargas em andamento antes de iniciar cada competência.

### Depende de decisão do responsável
- **Hardening da VPS**: `rpa/hardening-vps.sh --verificar` já rodou; root tem
  4 chaves SSH, então é seguro aplicar. NÃO aplicado porque a VPS hospeda
  Lanup e Licitai — confirmar que nenhum depende de senha.
- **Rotação de credenciais**: senhas do Supabase e do usuário `consulta`
  passaram pelo chat. Trocar quebra o cron até atualizar `rpa/.env` na VPS.
- **Deploy no Vercel**: projeto `nobri-ponto-analytics` criado e vinculado ao
  repositório, mas a publicação exige permissão da conta. Falta cadastrar as
  variáveis do Supabase e clicar em Redeploy.

### Melhorias identificadas
- **Alerta ativo de falha do cron**: hoje a página Importações mostra o estado,
  mas ninguém é notificado. Um e-mail quando o ciclo falhar fecharia a lacuna
  que deixou o dado 25 dias velho.
- **Painel lendo do Supabase**: hoje depende de commit para publicar uma
  competência nova. Lendo do banco, o ciclo diário atualizaria a produção
  sozinho.
- **Organograma**: o cliente pediu filtro por gerência/liderança. A API não
  fornece hierarquia (departamento = setor em 701 de 866 cadastros). O nível
  atual é derivado do cargo. Depende de a Funchal fornecer a estrutura.

## Armadilhas conhecidas (não repetir)

1. **Nunca rodar `npm run build` com o servidor de dev ligado** — o build
   sobrescreve `.next` e o servidor passa a servir 404/500.
2. **Nunca apagar `.next` com o servidor rodando** — mesmo efeito.
3. **Verificar se há servidor duplicado** antes de diagnosticar problema de
   tela: `netstat -ano | grep :300` — já houve 4 rodando ao mesmo tempo, em
   portas diferentes, e eu testava um enquanto o usuário via outro.
4. **Detectar fim de processo pelo banco, não por `pgrep`** — no Windows a
   verificação de processo falha e duas cargas acabam em paralelo.
5. **A carga nunca grava zero** de resposta vazia da API (que falha ~7% das
   vezes de forma intermitente). Não remover as 3 tentativas.
6. **Credenciais**: `scripts/_env.mjs` procura em vários caminhos porque na VPS
   o arquivo é `rpa/.env`, não `.env.local`. Foi o que quebrou o cron por 25
   dias, em silêncio.

## Regras de cálculo

Ver `docs/integracao-nobriponto.md`. Em resumo:
- `ABS HORA = INJUSTIFICADA + ABONADA + JUSTIFICADA` (DESCONSIDERAR fica fora)
- `Faltas Injustificadas = falta + atraso` do espelho
- Motivos DESCONSIDERAR (afastamento, licença) não entram no ABS, mas o
  planejado é mantido — decisão do cliente
- Mês em curso ou carga incompleta: usar a visão **parcial**, senão os dias
  sem dados entram como falta e inflam o indicador
