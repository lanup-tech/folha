# RPA — coleta dos relatórios sem API (roda na VPS)

Robô Playwright que loga na interface web do ponto (Nobriponto/Lanup), exporta os
relatórios que a API não entrega (hoje: **Abono de Faltas**) e grava direto no
Supabase via `service_role`.

## Rodando na VPS

```bash
cd rpa
npm install
npx playwright install chromium --with-deps
cp ../.env.example .env   # preencher RPA_* e SUPABASE_*
npm run collect           # executa uma coleta da competência corrente
```

Agendamento (crontab, diário às 06:00):

```cron
0 6 * * * cd /opt/nobri-ponto/rpa && npm run collect >> /var/log/nobri-rpa.log 2>&1
```

## O que o robô faz

1. Login na interface web do ponto com `RPA_PONTO_USER`/`RPA_PONTO_PASSWORD`
2. Navega até o relatório Abono de Faltas e exporta o período (competência)
3. Normaliza as linhas (motivo, data, período abonado, CID)
   - `O dia todo.` => 480 min · `1º período.`/`2º período.` => 240 min
     (automatiza o lançamento que hoje é feito à mão na planilha)
4. Resolve o motivo contra `absence_reasons` (base cadastrada no front)
5. Upsert em `absence_records` + registro em `import_runs`

> Os seletores em `src/collect-abono.ts` são um esqueleto: precisam ser gravados
> contra a tela real do ponto (peça acesso de leitura ao ambiente do cliente).
> O roteiro de navegação e filtros de cada relatório está em
> `docs/processos-relatorios.md` (destilado dos processos oficiais NOBRITECH).
