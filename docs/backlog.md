# Backlog — decisões adiadas conscientemente

Itens que **não** são esquecimento: foram avaliados e adiados por estarmos em
fase de validação. Revisar antes de colocar o painel em produção.

## Segurança da VPS (adiado em 14/08/2026)

Estado atual: VPS `13.140.175.124` com SSH aberto e login de **root por senha**
(`Lanup2026` — senha fraca, que circulou em texto claro no chat do projeto).

Antes de produção, executar o roteiro já pronto no fim de `rpa/setup-vps.sh`:

1. `passwd` — trocar a senha do root por uma longa e aleatória
2. `ssh-copy-id nobri@13.140.175.124` — chave SSH para o usuário de serviço
3. testar o login por chave em **outro terminal** antes do passo 4
4. `PermitRootLogin prohibit-password` + `PasswordAuthentication no` → `systemctl restart ssh`
5. `ufw allow OpenSSH && ufw --force enable`

Risco enquanto não for feito: servidores com SSH exposto sofrem varredura
automática constante; senha fraca de root é comprometida em questão de dias.
Aceitável em validação, **não** com dados de folha em produção.

## Rotação de credenciais antes da produção

Tudo que passou pelo chat/`.env.local` durante o desenvolvimento deve ser
rotacionado ao virar produção:

- senha do banco Supabase e `service_role` key
- senha do usuário `consulta` do NobriPonto (usuário do robô)
- senha do root da VPS (ver acima)

## Dados

- **Junho/2026 incompleto**: reexportar Abono de Faltas do mês cheio
  (01/06–30/06; o arquivo atual tem só o dia 30). Extrato e Absenteísmo de
  junho não precisam — a API cobre.
- **Matrícula duplicada no ponto**: 6053 na Tattini pertence a duas pessoas
  (LUIZ CARLOS DA SILVA e PABLO CABALLE NASCIMENTO DA SILVA). O painel já
  tolera (chave = id da API), mas vale corrigir no cadastro do ponto.
- **DENISE TRINDADE DE SOUZA (jul/2026)**: mês integralmente ausente sem
  nenhum lançamento no Abono de Faltas — verificar com o RH.
- ~~**`falta` da API × Faltas Injustificadas**~~ **RESOLVIDO (14/08/2026)**:
  FI = `falta` + `atraso` do espelho. Conferência subiu de 157/704 para
  688/704. Ver docs/integracao-nobriponto.md.

- **Divergências residuais de julho a investigar** (conferência banco×planilha):
  - **HE: 88 casos** — a maior lacuna restante. Hipótese: o relatório usa
    "Extra Diurna Trabalhada (EX¹)" e a API expõe `extraDiurna`; podem ser
    definições diferentes (com/sem compensação). Verificar caso a caso antes
    de trocar a fonte da HE.
  - **Abonos: 38 casos** — provável efeito da valoração 8h/dia da planilha
    (a API usa a jornada real). Tende a sumir quando a ABONADA passar a vir
    da API + motivo do RPA.
  - **Planejado: 8 casos** — funcionários demitidos no meio do mês (a API só
    lista ativos, o relatório inclui quem saiu). Ex.: ARTHUR MÁRIO
    NAKANDAKARI RODRIGUES, SOPHIA ISIDORO FERRO DE LARA GALVAO.
  - **177 pessoas só no banco**: admitidas depois da exportação da planilha
    (o quadro cresceu de 866 para 884 em 4 dias). Esperado.

- **Instabilidade da API EzPoint**: o `espelhoDePontos` devolve resposta vazia
  de forma intermitente (~7% das chamadas na carga de 14/08). A carga já trata
  com 3 tentativas e **nunca grava zero** de resposta vazia — mas vale monitorar
  a taxa a cada competência.
