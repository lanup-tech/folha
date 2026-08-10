# Processos de emissão dos relatórios (EzPoint Web) — spec para o RPA

Destilado dos documentos "Processo de emissão..." (NOBRITECH, 10/08/2026).
É o roteiro que o robô na VPS reproduz enquanto o relatório não tiver endpoint
de leitura na API. Hoje **só o Abono precisa de RPA em produção** (Extrato e
Absenteísmo saem da API — conciliação 30/30); os três ficam documentados para
contingência.

## 1. Abonos e Faltas Justificadas (o "Abono de Faltas")

Relatórios → **Abonos e Faltas Justificadas**

| Filtro | Valor |
|---|---|
| Período | 1º ao último dia da competência |
| Motivos | **todos selecionados** |
| Empresas | **todas selecionadas** |

Gerar → Exportar → **XLSX**.

## 2. Absenteísmo

Relatórios → **Absenteísmo**

| Filtro | Valor |
|---|---|
| Período | 1º ao último dia da competência |
| Empresas | todas |
| Opções de cálculo | **somente** ☑ Considerar Atraso · ☑ Considerar Tolerância de Atraso/Falta — todas as demais desmarcadas |

Gerar → Exportar → **XLSX**.

> As duas opções de cálculo fazem parte da definição do indicador: o relatório
> desconta a tolerância — provável explicação para o campo `falta` da API
> (espelho cru, sem essas opções) não coincidir com as Faltas Injustificadas
> do relatório em ~metade dos casos da conciliação.

## 3. Extrato de Horas

Relatórios → **Extrato de Horas**

| Filtro | Valor |
|---|---|
| Período | 1º ao último dia da competência |
| Empresas | todas |
| Opções (7) | todas **desmarcadas**: somente com extras · faltas em dia · só falta dia todo · BH zerado · somatório rodapé · exibir matrícula · exibir cargo |

Gerar → Exportar → **XLSX**.

> Sugestão para o fluxo automatizado: **marcar "Exibir matrícula do
> funcionário"** (e cargo). O processo manual deixa desmarcado, mas com a
> matrícula no arquivo o cruzamento deixa de depender do nome — hoje o join
> planilha×API é por nome normalizado. A ingestão já lê colunas pelo cabeçalho,
> então colunas extras não quebram nada.

## Validações automáticas na entrada (já implementadas na ingestão)

Os erros possíveis desse processo manual são justamente os que junho mostrou:

1. **Período errado/parcial** — o nome da aba do XLSX carrega o período
   (`01-07-2026 a 31-07-2026`); a ingestão aborta (Absenteísmo), ignora horas
   (Extrato de outro mês) ou marca parcial (Abono).
2. **Linha TOTAIS** entrando como colaborador — filtrada.
3. **Motivo fora da base** — acusado para cadastro na página Motivos.
4. **Abono valorado acima do ponto** (8h fixas × jornada real) — teto nas
   Faltas Justificadas + alerta.

No RPA esses riscos somem na origem: o período vem da competência calculada,
os filtros são fixos no código e a exportação é conferida contra o checklist
acima antes do upload.
