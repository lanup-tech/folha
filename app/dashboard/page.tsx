import { Topbar } from "@/components/topbar";
import { KpiCard } from "@/components/kpi-card";
import { AbsByCompanyChart } from "@/components/charts/abs-by-company";
import { AbsenceCompositionChart } from "@/components/charts/absence-composition";
import { TopMotivosChart } from "@/components/charts/top-motivos";
import {
  companySummaries,
  overallKpis,
  qualityAlerts,
  rankedEmployees,
  sectorSummaries,
} from "@/lib/data/aggregate";
import { motivoTotalsMay2026 } from "@/lib/data/may-2026";
import { formatDuration, formatPercent } from "@/lib/format";
import { AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  const kpis = overallKpis();
  const byCompany = companySummaries();
  const alerts = qualityAlerts();
  const top = rankedEmployees().filter((e) => e.absPct > 0 && e.absPct <= 1).slice(0, 10);
  const sectors = sectorSummaries(6);

  return (
    <>
      <Topbar title="Visão geral do absenteísmo" />
      <main className="flex flex-col gap-4 p-6">
        {/* KPIs */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard
            label="ABS % geral"
            value={formatPercent(kpis.absPct)}
            hint="ABS HORA ÷ horas planejadas"
          />
          <KpiCard
            label="Horas de ausência"
            value={formatDuration(kpis.absMin)}
            hint={`Injust. ${formatDuration(kpis.unjustifiedMin)} · Abon. ${formatDuration(kpis.excusedMin)} · Just. ${formatDuration(kpis.justifiedMin)}`}
          />
          <KpiCard
            label="Horas planejadas"
            value={formatDuration(kpis.plannedMin)}
            hint="soma do quadro ativo"
          />
          <KpiCard label="Horas extras" value={formatDuration(kpis.heMin)} hint="extrato de horas" />
          <KpiCard
            label="Colaboradores ≥ 10%"
            value={String(kpis.critical)}
            hint={`de ${kpis.headcount} no quadro`}
            tone={kpis.critical > 0 ? "critical" : "good"}
          />
        </section>

        {/* Alertas de qualidade */}
        {alerts.length > 0 && (
          <section className="card border-l-4 border-l-[var(--status-critical)] p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle size={16} className="text-[var(--status-critical)]" />
              Alertas de qualidade ({alerts.length})
            </h2>
            <ul className="flex flex-col gap-1 text-sm text-[var(--ink-secondary)]">
              {alerts.map((a, i) => (
                <li key={i}>
                  <span className="font-medium text-[var(--ink-primary)]">
                    {a.employee.name}
                  </span>{" "}
                  — {a.message}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Gráficos linha 1 */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">ABS % por empresa</h2>
            <AbsByCompanyChart
              data={byCompany.map((c) => ({ name: c.shortName, absPct: c.absPct * 100 }))}
            />
          </div>
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">
              Composição da ausência por empresa (horas)
            </h2>
            <AbsenceCompositionChart
              data={byCompany.map((c) => ({
                name: c.shortName,
                injustificada: c.unjustifiedMin / 60,
                abonada: c.excusedMin / 60,
                justificada: c.justifiedMin / 60,
              }))}
            />
          </div>
        </section>

        {/* Gráficos linha 2 */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">Horas por motivo (Abono de Faltas)</h2>
            <TopMotivosChart
              data={motivoTotalsMay2026.map((m) => ({
                motivo: m.motivo,
                horas: m.totalMin / 60,
                treatment: m.treatment,
              }))}
            />
          </div>
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">Setores com maior ABS %</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                  <th className="py-2 font-medium">Setor</th>
                  <th className="py-2 text-right font-medium">Pessoas</th>
                  <th className="py-2 text-right font-medium">ABS Hora</th>
                  <th className="py-2 text-right font-medium">ABS %</th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((s) => (
                  <tr key={`${s.company}-${s.sector}`} className="border-b border-black/5">
                    <td className="py-2">{s.sector}</td>
                    <td className="py-2 text-right tabular">{s.headcount}</td>
                    <td className="py-2 text-right tabular">{formatDuration(s.absMin)}</td>
                    <td className="py-2 text-right font-semibold tabular">
                      {formatPercent(s.absPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top colaboradores */}
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Top 10 colaboradores por ABS %</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                <th className="py-2 font-medium">Colaborador</th>
                <th className="py-2 font-medium">Empresa</th>
                <th className="py-2 font-medium">Setor</th>
                <th className="py-2 text-right font-medium">Injust.</th>
                <th className="py-2 text-right font-medium">Abonada</th>
                <th className="py-2 text-right font-medium">Just.</th>
                <th className="py-2 text-right font-medium">ABS Hora</th>
                <th className="w-44 py-2 pl-4 font-medium">ABS %</th>
              </tr>
            </thead>
            <tbody>
              {top.map((e) => (
                <tr key={`${e.company}-${e.registration}`} className="border-b border-black/5">
                  <td className="py-2 font-medium">{e.name}</td>
                  <td className="py-2 text-[var(--ink-secondary)]">
                    {e.company === "EMPREENDIMENTOS"
                      ? "Negócios"
                      : e.company === "PARTICIPACOES"
                        ? "Participações"
                        : "Tattini"}
                  </td>
                  <td className="py-2 text-[var(--ink-secondary)]">{e.sector}</td>
                  <td className="py-2 text-right tabular">{formatDuration(e.unjustifiedMin)}</td>
                  <td className="py-2 text-right tabular">{formatDuration(e.excusedMin)}</td>
                  <td className="py-2 text-right tabular">{formatDuration(e.justifiedMin)}</td>
                  <td className="py-2 text-right font-medium tabular">
                    {formatDuration(e.absMin)}
                  </td>
                  <td className="py-2 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, e.absPct * 100)}%`,
                            background: "var(--series-1)",
                          }}
                        />
                      </div>
                      <span className="w-14 text-right text-xs font-semibold tabular">
                        {formatPercent(e.absPct)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
