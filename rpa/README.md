# RPA — coleta dos relatórios sem API (roda na VPS)

Robô Playwright que loga na interface web do ponto (Nobriponto/Lanup), exporta os
relatórios que a API não entrega (hoje: **Abono de Faltas**) e grava direto no
Supabase via `service_role`.

## Provisionando a VPS

`setup-vps.sh` instala Node 22, cria o usuário de serviço `nobri` (o robô **não**
roda como root), prepara `/opt/nobri-ponto` e agenda a coleta diária:

```bash
# na VPS, como root, uma vez:
bash setup-vps.sh
```

Ele termina imprimindo o **hardening de SSH** (chave, desabilitar senha, firewall)
para você executar na ordem segura — sem risco de se trancar fora do servidor.

## Rodando o robô

```bash
cd /opt/nobri-ponto/rpa
npm install
npx playwright install chromium --with-deps
cp ../.env.example .env   # preencher NOBRIPONTO_FRONT_* e SUPABASE_*
chmod 600 .env
npm run collect           # coleta da competência corrente
```

Agendamento já criado por `setup-vps.sh` em `/etc/cron.d/nobri-rpa` (06:00 diário).

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
