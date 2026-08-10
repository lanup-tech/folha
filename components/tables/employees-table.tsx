"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { EmployeeRanked } from "@/lib/data/aggregate";
import type { CompanyKey } from "@/lib/types";
import { formatDuration, formatPercent } from "@/lib/format";
import clsx from "clsx";

const companyLabel: Record<CompanyKey, string> = {
  EMPREENDIMENTOS: "Negócios",
  PARTICIPACOES: "Participações",
  TATTINI: "Tattini",
};

export function EmployeesTable({ rows }: { rows: EmployeeRanked[] }) {
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState<CompanyKey | "TODAS">("TODAS");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (company === "TODAS" || r.company === company) &&
        (q === "" ||
          r.name.toLowerCase().includes(q) ||
          r.sector.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q))
    );
  }, [rows, query, company]);

  return (
    <div className="card">
      {/* filtros — uma linha acima da tabela */}
      <div className="flex flex-wrap items-center gap-3 border-b border-black/10 p-4">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--ink-muted)]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, setor ou cargo…"
            className="w-72 rounded-lg border border-black/10 bg-white py-2 pr-3 pl-9 text-sm outline-none focus:border-[var(--brand-primary)]"
          />
        </div>
        <div className="flex gap-1">
          {(["TODAS", "EMPREENDIMENTOS", "PARTICIPACOES", "TATTINI"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCompany(c)}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                company === c
                  ? "bg-[var(--brand-dark)] text-white"
                  : "text-[var(--ink-secondary)] hover:bg-black/5"
              )}
            >
              {c === "TODAS" ? "Todas" : companyLabel[c]}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-[var(--ink-muted)]">
          {filtered.length} colaborador{filtered.length === 1 ? "" : "es"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-[var(--ink-muted)]">
              <th className="px-4 py-2 font-medium">Matrícula</th>
              <th className="px-4 py-2 font-medium">Colaborador</th>
              <th className="px-4 py-2 font-medium">Empresa</th>
              <th className="px-4 py-2 font-medium">Setor</th>
              <th className="px-4 py-2 font-medium">Cargo</th>
              <th className="px-4 py-2 text-right font-medium">HE</th>
              <th className="px-4 py-2 text-right font-medium">Injust.</th>
              <th className="px-4 py-2 text-right font-medium">Abonada</th>
              <th className="px-4 py-2 text-right font-medium">Just.</th>
              <th className="px-4 py-2 text-right font-medium">ABS Hora</th>
              <th className="px-4 py-2 text-right font-medium">Planejado</th>
              <th className="px-4 py-2 text-right font-medium">ABS %</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr
                key={`${e.company}-${e.registration}`}
                className="border-b border-black/5 hover:bg-black/[0.02]"
              >
                <td className="px-4 py-2 tabular">{e.registration}</td>
                <td className="px-4 py-2 font-medium">{e.name}</td>
                <td className="px-4 py-2 text-[var(--ink-secondary)]">
                  {companyLabel[e.company]}
                </td>
                <td className="px-4 py-2 text-[var(--ink-secondary)]">{e.sector}</td>
                <td className="px-4 py-2 text-[var(--ink-secondary)]">{e.role}</td>
                <td className="px-4 py-2 text-right tabular">{formatDuration(e.heMin)}</td>
                <td className="px-4 py-2 text-right tabular">
                  {formatDuration(e.unjustifiedMin)}
                </td>
                <td className="px-4 py-2 text-right tabular">{formatDuration(e.excusedMin)}</td>
                <td className="px-4 py-2 text-right tabular">{formatDuration(e.justifiedMin)}</td>
                <td className="px-4 py-2 text-right font-medium tabular">
                  {formatDuration(e.absMin)}
                </td>
                <td className="px-4 py-2 text-right tabular">{formatDuration(e.plannedMin)}</td>
                <td
                  className={clsx(
                    "px-4 py-2 text-right font-semibold tabular",
                    e.absPct >= 0.1 && "text-[var(--status-critical)]"
                  )}
                >
                  {formatPercent(e.absPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
