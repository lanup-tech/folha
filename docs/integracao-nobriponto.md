# Integração de dados — API Nobriponto × RPA

Mapeamento entre os 4 relatórios usados hoje no fluxo Excel, o que esperamos da
API do ponto (base Lanup/Nobriponto) e o que fica para o RPA na VPS.

## Os 4 relatórios da competência

| # | Relatório | Colunas-chave (planilhas de maio) | Origem prevista | Destino no Supabase |
|---|-----------|-----------------------------------|-----------------|---------------------|
| 1 | **Funcionários ativos** | Nome, CPF, PIS, Matrícula, Empresa, Departamento/Setor, Cargo, Admissão | **API** | `employees` (+ `sectors`) |
| 2 | **Extrato de Horas** | Funcionário, Empresa, Total Diurno (HtEx), Total Noturno (HnEn), Total | **API** | `hour_extract_monthly` |
| 3 | **Absenteísmo** | Horas Previstas, Realizadas, Tolerância de Atraso, Faltas Justificadas, Injustificadas | **API** | `absenteeism_monthly` |
| 4 | **Abono de Faltas** | Funcionário, Empresa, Motivo, Período Abonado, Data, CID, Horas | **RPA** (sem endpoint conhecido) | `absence_records` |

> Pendência: confirmar na documentação da API quais endpoints existem de fato.
> Tudo que a API não cobrir migra para o RPA (`rpa/`).

## Regras de negócio (reproduzidas do fluxo Excel)

1. **ABS HORA** = INJUSTIFICADA + ABONADA + JUSTIFICADA
   - INJUSTIFICADA vem do relatório de Absenteísmo (Faltas Injustificadas)
   - ABONADA / JUSTIFICADA vêm do Abono de Faltas, conforme o **tratamento do
     motivo** na base de motivos (`absence_reasons`, editável no front)
2. **PLANEJADO** = Horas Previstas do relatório de Absenteísmo
3. **ABS %** = ABS HORA ÷ PLANEJADO
4. **Período abonado** → horas: `O dia todo.` = 8:00 · `1º/2º período.` = 4:00
   (hoje lançado manualmente na planilha — o pipeline automatiza)
5. **ABS % nunca pode passar de 100%** — acima disso é erro de carga e vira
   alerta de qualidade no dashboard (nunca correção silenciosa)
6. Colaboradores com PLANEJADO = 0 (admitidos após o fechamento, afastados sem
   escala) não entram no denominador

## Fluxo por competência

```
API Nobriponto ──► funcionários / extrato de horas / absenteísmo ─┐
                                                                  ├─► Supabase ─► employee_month_summary ─► Dashboard
VPS (RPA cron) ──► abono de faltas ───────────────────────────────┘
                       │
                       └── motivos resolvidos contra absence_reasons (front do cliente)
```

Cada execução grava em `import_runs` (origem, relatório, status, linhas) — é o
que alimenta a página **Importações** do painel.
