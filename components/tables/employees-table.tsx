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
  // Abre filtrado por uma empresa: renderizar ~880 linhas de uma vez deixa a
  // primeira pintura lenta. "Todas" continua a um clique.
  const [company, setCompany] = useState<CompanyKey | "TODAS">("EMPREENDIMENTOS");
  const [selecionado, setSelecionado] = useState<EmployeeRanked | null>(null);

  const totaisPorEmpresa = useMemo(() => {
    const m: Record<string, number> = { TODAS: rows.length };
    for (const r of rows) m[r.company] = (m[r.company] ?? 0) + 1;
    return m;
  }, [rows]);

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
      {/* sem overflow-hidden: ele criaria contexto de rolagem e quebraria o
          `sticky` do cabeçalho da tabela */}
      <div className="card">
        {/* filtros — também fixos, logo abaixo da barra superior */}
        <div className="glass sticky top-16 z-30 flex flex-wrap items-center gap-3 rounded-t-[var(--radius)] border-b border-[var(--line)] px-4 py-3">
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
            {(["EMPREENDIMENTOS", "PARTICIPACOES", "TATTINI", "TODAS"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCompany(c)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  company === c
                    ? "bg-[var(--chrome)] text-white"
                    : "text-[var(--ink-secondary)] hover:bg-[var(--surface-sunken)]"
                )}
              >
                {c === "TODAS" ? "Todas" : companyLabel[c]}
                <span
                  className={clsx(
                    "tabular text-[10px]",
                    company === c ? "text-white/60" : "text-[var(--ink-muted)]"
                  )}
                >
                  {totaisPorEmpresa[c] ?? 0}
                </span>
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-[var(--ink-muted)] tabular">
            {filtered.length} colaborador{filtered.length === 1 ? "" : "es"}
          </span>
        </div>

        {/* sem overflow-x aqui: qualquer overflow cria contexto de rolagem e
            anula o `sticky` das colunas. A tabela cabe na largura útil. */}
        <div>
          <table className="w-full text-sm">
            {/*
              Cabeçalho fixo logo abaixo da barra superior (64px): ao rolar a
              lista, os rótulos das colunas continuam visíveis — sem eles os
              números perdem significado.
            */}
            {/*
              O `position: sticky` precisa estar em CADA <th> — aplicá-lo no
              <thead> ou <tr> não funciona de forma confiável nos navegadores.
              O topo (121px) = barra superior (64) + barra de filtros (57).
            */}
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-secondary)]">
                {[
                  ["Matrícula", ""],
                  ["Colaborador", ""],
                  ["Empresa", ""],
                  ["Setor", ""],
                  ["HE", "text-right"],
                  ["Injust.", "text-right"],
                  ["Abonada", "text-right"],
                  ["Just.", "text-right"],
                  ["Desconsid.", "text-right"],
                  ["ABS Hora", "text-right"],
                  ["Planejado", "text-right"],
                  ["ABS %", "text-right"],
                  ["", "w-8"],
                ].map(([rotulo, extra], i) => (
                  <th
                    key={i}
                    title={
                      rotulo === "Desconsid."
                        ? "Horas de motivos DESCONSIDERAR — fora do cálculo"
                        : undefined
                    }
                    className={clsx(
                      "glass sticky top-[121px] z-20 border-b border-[var(--line)] px-4 py-2.5",
                      extra
                    )}
                  >
                    {rotulo}
                  </th>
                ))}
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
