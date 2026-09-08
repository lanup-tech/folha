import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { KpiCard } from "@/components/kpi-card";
import { FiltrosGlobais } from "@/components/filtros-globais";
import { TrilhaFiltros } from "@/components/trilha-filtros";
import { AnaliseDimensao } from "@/components/analise-dimensao";
import { AbsByCompanyChart } from "@/components/charts/abs-by-company";
import { AbsenceCompositionChart } from "@/components/charts/absence-composition";
import { TopMotivosChart } from "@/components/charts/top-motivos";
import { TopColaboradores } from "@/components/top-colaboradores";
import { companySummaries, qualityAlerts, rankedEmployees } from "@/lib/data/aggregate";
import { employeesDaVisao, estaDesatualizada, getCompetencia, permiteParcial } from "@/lib/data/competencias";
import { aplicarFiltros, filtrosDaQuery, temFiltroAtivo } from "@/lib/data/dimensoes";
import { agruparPor, agruparPorNivelOrdenado, opcoesDeFiltro, totais, type Dimensao } from "@/lib/data/analise";
import { formatDuration, formatPercent } from "@/lib/format";

const MAX_ALERTAS = 6;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const comp = getCompetencia(params.competencia);
  const parcial = params.parcial === "1";
  const universo = employeesDaVisao(comp, parcial);

  const filtros = filtrosDaQuery(params);
  const employees = aplicarFiltros(universo, filtros);
  const filtrando = temFiltroAtivo(filtros);

  const dimensao = (params.dim as Dimensao) ?? "setor";
  const grupos =
    dimensao === "nivel" ? agruparPorNivelOrdenado(employees) : agruparPor(employees, dimensao);

  const kpis = totais(employees);
  const byCompany = companySummaries(employees);
  const alerts = qualityAlerts(employees);
  const top = rankedEmployees(employees)
    .filter((e) => e.absPct > 0 && e.absPct <= 1)
    .slice(0, 12);
  const opcoes = opcoesDeFiltro(universo);
  const motivos = comp.motivoTotals.slice(0, 10);

  return (
    <>
      <Topbar
        title="Visão geral do absenteísmo"
        competencia={comp.key}
        mesEmCurso={permiteParcial(comp)}
        diaCorte={comp.diaCorte}
        parcial={parcial}
      />
      <main className="flex flex-col gap-4 p-6">
        {/* barra de exploração */}
        <div className="card flex flex-col gap-3 p-4">
          <Suspense fallback={<div className="h-9" />}>
            <FiltrosGlobais
              filtros={filtros}
              setores={opcoes.setores}
              cargos={opcoes.cargos}
              niveis={opcoes.niveis}
              resultado={employees.length}
              universo={universo.length}
            />
          </Suspense>
          <Suspense fallback={null}>
            <TrilhaFiltros filtros={filtros} />
          </Suspense>
        </div>

        {estaDesatualizada(comp) && !parcial && (
          <div className="card flex items-start gap-2.5 border-l-4 border-l-[var(--status-warning)] p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--status-warning)]" />
            <div className="text-sm">
              <p className="font-medium">
                Dados desta competência cobrem apenas até o dia {comp.diaCorte}
              </p>
              <p className="mt-0.5 text-xs text-[var(--ink-secondary)]">
                Os dias seguintes aparecem como falta porque ainda não foram carregados —
                o indicador está superestimado. Use <strong>Parcial até dia {comp.diaCorte}</strong> para
                ver o número real do período coberto, ou aguarde a próxima carga.
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-[var(--ink-muted)]">
          Competência {comp.label} · fonte: {comp.source}
          {permiteParcial(comp) && (
            <span className="ml-2 font-medium text-[var(--brand-primary)]">
              {parcial
                ? `· análise parcial: dias 1 a ${comp.diaCorte}`
                : "· visão cheia (inclui dias sem dados carregados)"}
            </span>
          )}
        </p>

        {employees.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-12 text-center">
            <p className="text-sm font-medium">Nenhum colaborador neste recorte</p>
            <p className="text-xs text-[var(--ink-secondary)]">
              Remova algum filtro na trilha acima para ampliar a seleção.
            </p>
          </div>
        ) : (
          <>
            {/* indicadores — clicáveis, levam ao recorte correspondente */}
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <KpiCard
                label="ABS % geral"
                value={formatPercent(kpis.absPct)}
                hint={`${kpis.headcount} colaborador${kpis.headcount === 1 ? "" : "es"} no recorte`}
              />
              <KpiCard
                label="Horas de ausência"
                value={formatDuration(kpis.absMin)}
                hint={`Injust. ${formatDuration(kpis.unjustifiedMin)} · Abon. ${formatDuration(kpis.excusedMin)} · Just. ${formatDuration(kpis.justifiedMin)}`}
              />
              <KpiCard
                label="Horas planejadas"
                value={formatDuration(kpis.plannedMin)}
                hint="soma do quadro no recorte"
              />
              <KpiCard
                label="Fora do cálculo"
                value={formatDuration(kpis.ignoredMin)}
                hint="motivos DESCONSIDERAR"
              />
              <KpiCard
                label="Colaboradores ≥ 10%"
                value={String(kpis.criticos)}
                hint={
                  filtros.faixas.includes("CRITICO")
                    ? "filtro aplicado — clique para remover"
                    : "clique para ver apenas estes"
                }
                tone={kpis.criticos > 0 ? "critical" : "good"}
                filtro={{ fx: filtros.faixas.includes("CRITICO") ? "" : "CRITICO" }}
                titleAcao="Filtrar somente quem está acima de 10%"
              />
            </section>

            {/* análise por dimensão — o drill-down */}
            <Suspense fallback={<div className="card h-64" />}>
              <AnaliseDimensao
                grupos={grupos}
                dimensao={dimensao}
                filtros={filtros}
                totalAbsMin={kpis.absMin}
              />
            </Suspense>

            {alerts.length > 0 && (
              <section className="card border-l-4 border-l-[var(--status-critical)] p-4">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle size={16} className="text-[var(--status-critical)]" />
                  Alertas de qualidade ({alerts.length})
                </h2>
                <ul className="flex flex-col gap-1 text-sm text-[var(--ink-secondary)]">
                  {alerts.slice(0, MAX_ALERTAS).map((a, i) => (
                    <li key={i}>
                      <span className="font-medium text-[var(--ink-primary)]">
                        {a.employee.name}
                      </span>{" "}
                      — {a.message}
                    </li>
                  ))}
                </ul>
                {alerts.length > MAX_ALERTAS && (
                  <p className="mt-2 text-xs text-[var(--ink-muted)]">
                    + {alerts.length - MAX_ALERTAS} outros
                  </p>
                )}
              </section>
            )}

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="card p-4">
                <h2 className="mb-3 text-sm font-semibold">ABS % por empresa</h2>
                <AbsByCompanyChart
                  data={byCompany
                    .filter((c) => c.headcount > 0)
                    .map((c) => ({ name: c.shortName, absPct: c.absPct * 100 }))}
                />
              </div>
              <div className="card p-4">
                <h2 className="mb-3 text-sm font-semibold">
                  Composição da ausência por empresa (horas)
                </h2>
                <AbsenceCompositionChart
                  data={byCompany
                    .filter((c) => c.headcount > 0)
                    .map((c) => ({
                      name: c.shortName,
                      injustificada: c.unjustifiedMin / 60,
                      abonada: c.excusedMin / 60,
                      justificada: c.justifiedMin / 60,
                    }))}
                />
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="card p-4">
                <h2 className="mb-3 text-sm font-semibold">
                  Horas por motivo (Abono de Faltas) — top {motivos.length}
                </h2>
                <TopMotivosChart
                  data={motivos.map((m) => ({
                    motivo: m.motivo,
                    horas: m.totalMin / 60,
                    treatment: m.treatment,
                  }))}
                />
                {filtrando && (
                  <p className="mt-2 text-[11px] text-[var(--ink-muted)]">
                    Motivos referem-se à competência inteira, não ao recorte filtrado.
                  </p>
                )}
              </div>

              <Suspense fallback={<div className="card" />}>
                <TopColaboradores rows={top} competenciaKey={comp.key} />
              </Suspense>
            </section>
          </>
        )}
      </main>
    </>
  );
}
