"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";
import type { EmployeeRanked } from "@/lib/data/aggregate";
import { companyLabel } from "@/lib/data/companies";
import { formatDuration, formatPercent } from "@/lib/format";
import { EmployeeDrawer } from "@/components/employee-drawer";

/**
 * Ranking de colaboradores do recorte atual. Cada linha abre o detalhe — é o
 * último nível do aprofundamento: consolidado → dimensão → pessoa.
 */
export function TopColaboradores({
  rows,
  competenciaKey,
}: {
  rows: EmployeeRanked[];
  competenciaKey?: string;
}) {
  const [selecionado, setSelecionado] = useState<EmployeeRanked | null>(null);

  return (
    <>
      <div className="card flex flex-col">
        <header className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Colaboradores com maior ABS %</h2>
            <p className="mt-0.5 text-xs text-[var(--ink-secondary)]">
              Clique para ver o detalhe da pessoa
            </p>
          </div>
          <Link
            href="/dashboard/colaboradores"
            className="flex items-center gap-1 text-xs font-medium text-[var(--ink-secondary)] transition-colors hover:text-[var(--brand-primary)]"
          >
            Ver todos
            <ArrowRight size={13} />
          </Link>
        </header>

        <div className="flex-1">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((e) => (
                <tr
                  key={`${e.company}-${e.registration}-${e.name}`}
                  onClick={() => setSelecionado(e)}
                  className="group cursor-pointer border-b border-[var(--line)] transition-colors last:border-0 hover:bg-[var(--surface-2)]"
                >
                  <td className="max-w-[220px] px-4 py-2">
                    <p className="truncate font-medium">{e.name}</p>
                    <p className="truncate text-[11px] text-[var(--ink-muted)]">
                      {companyLabel[e.company]} · {e.sector || "sem setor"}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-right text-xs tabular text-[var(--ink-secondary)]">
                    {formatDuration(e.absMin)}
                  </td>
                  <td className="w-28 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, e.absPct * 100)}%`,
                            background:
                              e.absPct >= 0.1 ? "var(--status-critical)" : "var(--series-1)",
                          }}
                        />
                      </div>
                      <span
                        className={clsx(
                          "w-12 text-right text-xs font-semibold tabular",
                          e.absPct >= 0.1 && "text-[var(--status-critical)]"
                        )}
                      >
                        {formatPercent(e.absPct, 1)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EmployeeDrawer
        employee={selecionado}
        onClose={() => setSelecionado(null)}
        competencia={competenciaKey}
      />
    </>
  );
}
