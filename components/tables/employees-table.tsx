"use client";

import { useMemo, useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import type { EmployeeRanked } from "@/lib/data/aggregate";
import type { CompanyKey } from "@/lib/types";
import { companyLabel } from "@/lib/data/companies";
import { formatDuration, formatPercent } from "@/lib/format";
import { EmployeeDrawer } from "@/components/employee-drawer";
import clsx from "clsx";

export function EmployeesTable({ rows }: { rows: EmployeeRanked[] }) {
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState<CompanyKey | "TODAS">("TODAS");
  const [selecionado, setSelecionado] = useState<EmployeeRanked | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (company === "TODAS" || r.company === company) &&
        (q === "" ||
          r.name.toLowerCase().includes(q) ||
          r.sector.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q) ||
          r.registration.includes(q))
    );
  }, [rows, query, company]);

  return (
    <>
      <div className="card overflow-hidden">
        {/* filtros */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--ink-muted)]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, matrícula, setor ou cargo…"
              className="w-80 rounded-lg border border-[var(--line-strong)] bg-[var(--surface-1)] py-2 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-[var(--ink-muted)] focus:border-[var(--brand-primary)]"
            />
          </div>
          <div className="flex gap-0.5 rounded-lg border border-[var(--line-strong)] bg-[var(--surface-1)] p-0.5">
            {(["TODAS", "EMPREENDIMENTOS", "PARTICIPACOES", "TATTINI"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCompany(c)}
                className={clsx(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  company === c
                    ? "bg-[var(--chrome)] text-white"
                    : "text-[var(--ink-secondary)] hover:bg-[var(--surface-sunken)]"
                )}
              >
                {c === "TODAS" ? "Todas" : companyLabel[c]}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-[var(--ink-muted)] tabular">
            {filtered.length} colaborador{filtered.length === 1 ? "" : "es"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                <th className="px-4 py-2.5">Matrícula</th>
                <th className="px-4 py-2.5">Colaborador</th>
                <th className="px-4 py-2.5">Empresa</th>
                <th className="px-4 py-2.5">Setor</th>
                <th className="px-4 py-2.5 text-right">HE</th>
                <th className="px-4 py-2.5 text-right">Injust.</th>
                <th className="px-4 py-2.5 text-right">Abonada</th>
                <th className="px-4 py-2.5 text-right">Just.</th>
                <th
                  className="px-4 py-2.5 text-right"
                  title="Horas de motivos DESCONSIDERAR — fora do cálculo"
                >
                  Desconsid.
                </th>
                <th className="px-4 py-2.5 text-right">ABS Hora</th>
                <th className="px-4 py-2.5 text-right">Planejado</th>
                <th className="px-4 py-2.5 text-right">ABS %</th>
                <th className="w-8 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={`${e.company}-${e.registration}-${e.name}`}
                  onClick={() => setSelecionado(e)}
                  tabIndex={0}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      setSelecionado(e);
                    }
                  }}
                  className="group cursor-pointer border-b border-[var(--line)] transition-colors last:border-0 hover:bg-[var(--surface-2)]"
                >
                  <td className="px-4 py-2.5 text-[var(--ink-secondary)] tabular">
                    {e.registration || "—"}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{e.name}</td>
                  <td className="px-4 py-2.5 text-[var(--ink-secondary)]">
                    {companyLabel[e.company]}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-2.5 text-[var(--ink-secondary)]">
                    {e.sector || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular">{formatDuration(e.heMin)}</td>
                  <td className="px-4 py-2.5 text-right tabular">
                    {formatDuration(e.unjustifiedMin)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular">{formatDuration(e.excusedMin)}</td>
                  <td className="px-4 py-2.5 text-right tabular">
                    {formatDuration(e.justifiedMin)}
                  </td>
                  <td
                    className="px-4 py-2.5 text-right text-[var(--ink-muted)] tabular"
                    title={e.mainMotivo ?? undefined}
                  >
                    {e.ignoredMin ? formatDuration(e.ignoredMin) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular">
                    {formatDuration(e.absMin)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--ink-secondary)] tabular">
                    {formatDuration(e.plannedMin)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <PctBadge pct={e.absPct} />
                  </td>
                  <td className="px-2 py-2.5">
                    <ChevronRight
                      size={15}
                      className="text-[var(--ink-muted)] opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EmployeeDrawer employee={selecionado} onClose={() => setSelecionado(null)} />
    </>
  );
}

/** Estado codificado em forma e cor, não só no número. */
function PctBadge({ pct }: { pct: number }) {
  const critico = pct >= 0.1;
  const atencao = !critico && pct >= 0.05;
  return (
    <span
      className={clsx(
        "inline-block rounded-md px-2 py-0.5 text-xs font-semibold tabular",
        critico && "bg-[var(--status-critical-bg)] text-[var(--status-critical)]",
        atencao && "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
        !critico && !atencao && "text-[var(--ink-secondary)]"
      )}
    >
      {formatPercent(pct)}
    </span>
  );
}
