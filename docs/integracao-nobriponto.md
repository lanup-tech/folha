# Integração de dados — API EzPoint Web × RPA

A base do ponto (Nobriponto/Lanup) expõe a **API EzPoint Web**
(`https://api.ezpointweb.com.br/ezweb-ws` — doc v1.5, 2026). Autenticação:
`POST /login` com empresa/usuário/senha de API (cadastrados no módulo Admin do
EzPoint Web) → Bearer token no header das demais chamadas.
**Limite: 30 requisições/minuto** (o client em `lib/ezpoint/client.ts` aplica
throttle automático).

## O que a API JÁ entrega (sem depender dos relatórios da tela)

| Relatório do fluxo Excel | Endpoint | O que vem |
|---|---|---|
| **03 Funcionários ativos** | `GET /funcionario` | id, matrícula, nome, CPF, PIS, cargo, setor, departamento, admissão e **cnpjCpfEmpresa** (resolve a empresa/CNPJ automaticamente); filtro `ocultarDemitidos` |
| **02 Extrato de Horas** (HE) | `GET /espelhoDePontos` | `extraDiurna` / `extraNoturna` do total do período |
| **02 Absenteísmo** | `GET /espelhoDePontos` | `cargaHoraria` (= planejado), `horasTrabalhadasDiurnas/Noturnas` (= realizadas), `falta`, `atraso`, `horasAbonadas`, `bancoDeHoras` — total e dia a dia |
| Marcações cruas (auditoria) | `GET /batida` | batidas com REP, paginado, janela máx. 6 meses |

Restrições: `espelhoDePontos` é **por funcionário** (1 chamada cada, janela máx.
2 meses). Com ~600 colaboradores e 30 req/min, uma carga completa leva ~20–25
min — por isso a carga roda via cron (VPS), não em serverless.

## O que continua precisando de RPA

| Relatório | Por quê | O que o robô extrai |
|---|---|---|
| **02 Abono de Faltas** | A v1.5 só tem `POST /abonoDeFalta` (escrita) — **não existe GET** | Motivo, período abonado, data, CID por lançamento |

O espelho traz o **total** de `horasAbonadas`, mas não o **motivo** — e é o
motivo que decide ABONADA × JUSTIFICADA × DESCONSIDERAR na base de motivos.
Evolução futura: se os lançamentos passarem a ser feitos pelo nosso painel
(via `POST /abonoDeFalta`, que aceita descrição, CID, período, médico/CRM),
o sistema vira a fonte da verdade e o RPA pode ser desligado.

## Pipeline implementado

`POST /api/import` com `{ "competencia": "2026-05" }` executa:

1. `GET /funcionario` → upsert em `employees`; empresa resolvida por
   `cnpjCpfEmpresa` (CNPJ novo cria a empresa automaticamente para renomear
   no painel)
2. `GET /espelhoDePontos` por funcionário → `absenteeism_monthly`
   (planejado/realizado/falta/atraso) e `hour_extract_monthly` (HE)
3. Registro em `import_runs` (status, linhas importadas, erro)

```
API EzPoint ──► /funcionario ───────────► employees
             └► /espelhoDePontos ──────► absenteeism_monthly + hour_extract_monthly
                                                                │
VPS (RPA cron) ──► Abono de Faltas ────► absence_records ───────┤
                                                                ▼
                        absence_reasons (front) ──► employee_month_summary ──► Dashboard
```

## Regras de negócio (reproduzidas do fluxo Excel)

1. **ABS HORA** = INJUSTIFICADA + ABONADA + JUSTIFICADA
   - ABONADA / JUSTIFICADA: lançamentos do Abono de Faltas classificados pelo
     **tratamento do motivo** em `absence_reasons` (editável na página Motivos)
   - Conciliação jul/2026 (30 amostras): Horas Previstas = `cargaHoraria`
     (30/30) e Horas Realizadas = `horasTrabalhadas` (30/30) — API é fonte
     confiável. O `falta` da API coincide com FI em ~metade dos casos; a fonte
     de FI/FJ segue sendo o relatório de Absenteísmo até mapearmos a diferença.
     Hipótese (dos processos de emissão): o relatório é gerado com
     "Considerar Atraso" + "Considerar Tolerância de Atraso/Falta", e o
     espelho da API não aplica essas opções — ver docs/processos-relatorios.md.
2. **PLANEJADO** = `cargaHoraria` do espelho (era "Horas Previstas")
3. **ABS %** = ABS HORA ÷ PLANEJADO
4. Período abonado → horas: `O dia todo.` = 8:00 · `1º/2º período.` = 4:00
   (a API usa códigos S/1/2/3/4 no POST — mesmo conceito).
   **Correção validada na conciliação com a API (jul/2026)**: a valoração 8h
   fixa inflava a ABONADA de quem tem jornada menor (ex.: 5:20/dia) e de
   afastados (o relatório lista fins de semana), gerando ABS > 100%. Regra
   vigente: **ABONADA ≤ Faltas Justificadas do ponto** (excesso vira alerta),
   de modo que ABS HORA = FI + FJ, sempre coerente com o ponto. A valoração
   exata por jornada diária (`dias[].cargaHoraria` do espelho) entra com a
   carga via API.
5. **ABS % nunca pode passar de 100%** — acima disso é erro de carga e vira
   alerta de qualidade no dashboard (nunca correção silenciosa)
6. PLANEJADO = 0 (admitido após fechamento, afastado sem escala) fica fora do
   denominador
