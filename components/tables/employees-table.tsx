"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Download, ArrowUpDown } from "lucide-react";
import type { EmployeeRanked } from "@/lib/data/aggregate";
import { companyLabel } from "@/lib/data/companies";
import { nivelDoCargo, nivelLabel } from "@/lib/data/dimensoes";
import { formatDuration, formatPercent } from "@/lib/format";
import { EmployeeDrawer } from "@/components/employee-drawer";
import clsx from "clsx";

type Coluna =
  | "name"
  | "sector"
  | "heMin"
  | "unjustifiedMin"
  | "excusedMin"
  | "justifiedMin"
  | "absMin"
  | "plannedMin"
  | "absPct";

export function EmployeesTable({
  rows,
  competencia,
}: {
  rows: EmployeeRanked[];
  competencia?: string;
}) {
  const [selecionado, setSelecionado] = useState<EmployeeRanked | null>(null);
  // ordenação por qualquer coluna — parte do "explorar" que o cliente pediu
  const [ordem, setOrdem] = useState<{ col: Coluna; desc: boolean }>({
    col: "absPct",
    desc: true,
  });

  // A barra de filtros muda de altura conforme a largura da janela (os
  // controles quebram em duas linhas). Medimos para posicionar o cabeçalho das
  // colunas exatamente abaixo dela, sem sobreposição nem folga.
  const barraFiltrosRef = useRef<HTMLDivElement>(null);
  const [topoColunas, setTopoColunas] = useState(64 + 63);

  useEffect(() => {
    const el = barraFiltrosRef.current;
    if (!el) return;
    const medir = () => setTopoColunas(64 + el.offsetHeight);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A filtragem agora é global (barra acima da tabela); aqui só ordenamos.
  const filtered = useMemo(() => {
    const dir = ordem.desc ? -1 : 1;
    return [...rows].sort((a, b) => {
      const va = a[ordem.col];
      const vb = b[ordem.col];
      if (typeof va === "string" && typeof vb === "string") {
        return va.localeCompare(vb, "pt-BR") * dir;
      }
      return ((va as number) - (vb as number)) * dir;
    });
  }, [rows, ordem]);

  function ordenarPor(col: Coluna) {
    setOrdem((o) => (o.col === col ? { col, desc: !o.desc } : { col, desc: true }));
  }

  /** Exporta exatamente o que está na tela — o recorte investigado. */
  function exportarCsv() {
    const cab = [
      "Matrícula",
      "Colaborador",
      "Empresa",
      "Setor",
      "Cargo",
      "Nível",
      "HE",
      "Injustificada",
      "Abonada",
      "Justificada",
      "Desconsiderada",
      "ABS Hora",
      "Planejado",
      "ABS %",
      "Motivo predominante",
    ];
    const linhas = filtered.map((e) =>
      [
        e.registration,
        e.name,
        companyLabel[e.company],
        e.sector,
        e.role,
        nivelLabel[nivelDoCargo(e.role)],
        formatDuration(e.heMin),
        formatDuration(e.unjustifiedMin),
        formatDuration(e.excusedMin),
        formatDuration(e.justifiedMin),
        formatDuration(e.ignoredMin ?? 0),
        formatDuration(e.absMin),
        formatDuration(e.plannedMin),
        formatPercent(e.absPct),
        e.mainMotivo ?? "",
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(";")
    );
    // BOM para o Excel abrir os acentos corretamente
    const csv = "﻿" + [cab.join(";"), ...linhas].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `colaboradores-${(competencia ?? "").replace(/\s+/g, "-").toLowerCase() || "recorte"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* sem overflow-hidden: ele criaria contexto de rolagem e quebraria o
          `sticky` do cabeçalho da tabela */}
      <div className="card">
        {/* Filtros fixos logo abaixo da barra superior (64px). A altura real
            desta barra é medida e repassada ao cabeçalho das colunas, para os
            dois encostarem sem sobrepor. */}
        <div
          ref={barraFiltrosRef}
          className="glass sticky top-16 z-30 flex flex-wrap items-center gap-3 rounded-t-[var(--radius)] border-b border-[var(--line)] px-4 py-3"
        >
          <span className="text-xs text-[var(--ink-secondary)]">
            <strong className="tabular font-semibold text-[var(--ink-primary)]">
              {filtered.length}
            </strong>{" "}
            colaborador{filtered.length === 1 ? "" : "es"} · clique numa linha para o detalhe
          </span>
          <button
            onClick={exportarCsv}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--ink-secondary)] transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--ink-primary)]"
            title="Baixar o recorte atual em CSV"
          >
            <Download size={13} />
            Exportar CSV
          </button>
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
                {(
                  [
                    ["Matrícula", "", null],
                    ["Colaborador", "", "name"],
                    ["Empresa", "", null],
                    ["Setor", "", "sector"],
                    ["HE", "text-right", "heMin"],
                    ["Injust.", "text-right", "unjustifiedMin"],
                    ["Abonada", "text-right", "excusedMin"],
                    ["Just.", "text-right", "justifiedMin"],
                    ["Desconsid.", "text-right", null],
                    ["ABS Hora", "text-right", "absMin"],
                    ["Planejado", "text-right", "plannedMin"],
                    ["ABS %", "text-right", "absPct"],
                    ["", "w-8", null],
                  ] as [string, string, Coluna | null][]
                ).map(([rotulo, extra, col], i) => (
                  <th
                    key={i}
                    title={
                      rotulo === "Desconsid."
                        ? "Horas de motivos DESCONSIDERAR — fora do cálculo"
                        : col
                          ? `Ordenar por ${rotulo}`
                          : undefined
                    }
                    onClick={() => col && ordenarPor(col)}
                    style={{ top: topoColunas }}
                    className={clsx(
                      "glass sticky z-20 border-b border-[var(--line)] px-4 py-2.5",
                      extra,
                      col && "cursor-pointer select-none hover:text-[var(--ink-primary)]",
                      ordem.col === col && "text-[var(--brand-primary)]"
                    )}
                  >
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1",
                        extra === "text-right" && "flex-row-reverse"
                      )}
                    >
                      {rotulo}
                      {col && ordem.col === col && (
                        <ArrowUpDown size={11} className="shrink-0" />
                      )}
                    </span>
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
                  <td className="whitespace-nowrap px-4 py-2.5 text-[var(--ink-secondary)] tabular">
                    {e.registration || "—"}
                  </td>
                  <td className="max-w-[260px] truncate px-4 py-2.5 font-medium" title={e.name}>
                    {e.name}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--ink-secondary)]">
                    {companyLabel[e.company]}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-2.5 text-[var(--ink-secondary)]">
                    {e.sector || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular">{formatDuration(e.heMin)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular">
                    {formatDuration(e.unjustifiedMin)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular">{formatDuration(e.excusedMin)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular">
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
