"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowRight, Info } from "lucide-react";
import clsx from "clsx";
import { formatDuration, formatPercent } from "@/lib/format";
import { dimensaoLabel, type Dimensao, type GrupoAnalise } from "@/lib/data/analise";
import type { Filtros } from "@/lib/data/dimensoes";
import { filtrosParaQuery } from "@/lib/data/dimensoes";

const DIMENSOES: Dimensao[] = ["setor", "cargo", "nivel", "empresa", "motivo"];

/**
 * Tabela de análise por dimensão — o coração do drill-down.
 *
 * Ordena por CONTRIBUIÇÃO EM HORAS, não por percentual: um setor de 3 pessoas
 * com 33% pesa menos no resultado que um de 69 pessoas com 11%. A barra de
 * participação mostra visualmente quanto cada grupo responde pelo total.
 *
 * Clicar numa linha aplica aquele valor como filtro global e leva ao nível
 * seguinte da análise.
 */
export function AnaliseDimensao({
  grupos,
  dimensao,
  filtros,
  totalAbsMin,
}: {
  grupos: GrupoAnalise[];
  dimensao: Dimensao;
  filtros: Filtros;
  totalAbsMin: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function trocarDimensao(d: Dimensao) {
    const q = new URLSearchParams(params.toString());
    q.set("dim", d);
    router.push(`${pathname}?${q.toString()}`, { scroll: false });
  }

  /** Clique numa linha: adiciona o valor ao filtro correspondente. */
  function aprofundar(g: GrupoAnalise) {
    const novos: Filtros = { ...filtros };
    if (dimensao === "setor" && !novos.setores.includes(g.chave)) {
      novos.setores = [...novos.setores, g.chave];
    } else if (dimensao === "cargo" && !novos.cargos.includes(g.chave)) {
      novos.cargos = [...novos.cargos, g.chave];
    } else if (dimensao === "nivel" && !novos.niveis.includes(g.chave as never)) {
      novos.niveis = [...novos.niveis, g.chave as never];
    } else if (dimensao === "empresa" && !novos.empresas.includes(g.chave as never)) {
      novos.empresas = [...novos.empresas, g.chave as never];
    } else if (dimensao === "motivo") {
      return; // motivo não é filtro; a linha serve só para leitura
    }

    const q = filtrosParaQuery(novos);
    for (const k of ["competencia", "parcial"]) {
      const v = params.get(k);
      if (v) q.set(k, v);
    }
    // ao aprofundar em um setor, o próximo corte natural é por cargo
    q.set("dim", dimensao === "setor" ? "cargo" : "setor");
    router.push(`${pathname}?${q.toString()}`, { scroll: false });
  }

  const maiorParticipacao = Math.max(...grupos.map((g) => g.participacao), 0.0001);

  return (
    <section className="card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Quem impacta o resultado</h2>
          <p className="mt-0.5 text-xs text-[var(--ink-secondary)]">
            Ordenado pela contribuição em horas de ausência — clique para aprofundar
          </p>
        </div>
        <div className="flex gap-0.5 rounded-lg border border-[var(--line-strong)] bg-[var(--surface-1)] p-0.5">
          {DIMENSOES.map((d) => (
            <button
              key={d}
              onClick={() => trocarDimensao(d)}
              className={clsx(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                dimensao === d
                  ? "bg-[var(--chrome)] text-white"
                  : "text-[var(--ink-secondary)] hover:bg-[var(--surface-sunken)]"
              )}
            >
              {dimensaoLabel[d]}
            </button>
          ))}
        </div>
      </header>

      {dimensao === "nivel" && (
        <p className="flex items-start gap-2 border-b border-[var(--line)] bg-[var(--status-warning-bg)] px-4 py-2 text-xs text-[var(--ink-secondary)]">
          <Info size={13} className="mt-0.5 shrink-0 text-[var(--status-warning)]" />
          Nível hierárquico derivado do cargo. O sistema de ponto não fornece organograma —
          para gerência e liderança reais, é necessário cadastrar a estrutura.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-muted)]">
              <th className="px-4 py-2.5">{dimensaoLabel[dimensao]}</th>
              <th className="px-4 py-2.5 text-right">Pessoas</th>
              <th className="px-4 py-2.5 text-right">Críticos</th>
              <th className="px-4 py-2.5 text-right">ABS Hora</th>
              <th className="px-4 py-2.5 text-right">ABS %</th>
              <th className="w-52 px-4 py-2.5">Participação no total</th>
              <th className="w-8 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => {
              const clicavel = dimensao !== "motivo";
              return (
                <tr
                  key={g.chave}
                  onClick={() => clicavel && aprofundar(g)}
                  className={clsx(
                    "group border-b border-[var(--line)] last:border-0",
                    clicavel && "cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
                  )}
                >
                  <td className="max-w-[280px] truncate px-4 py-2.5 font-medium" title={g.rotulo}>
                    {g.rotulo}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular">{g.headcount}</td>
                  <td className="px-4 py-2.5 text-right tabular">
                    {g.criticos > 0 ? (
                      <span className="font-semibold text-[var(--status-critical)]">
                        {g.criticos}
                      </span>
                    ) : (
                      <span className="text-[var(--ink-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular">
                    {formatDuration(g.absMin)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={clsx(
                        "rounded-md px-2 py-0.5 text-xs font-semibold tabular",
                        g.absPct >= 0.1 && "bg-[var(--status-critical-bg)] text-[var(--status-critical)]",
                        g.absPct >= 0.05 &&
                          g.absPct < 0.1 &&
                          "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
                        g.absPct < 0.05 && "text-[var(--ink-secondary)]"
                      )}
                    >
                      {formatPercent(g.absPct)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                        <div
                          className="h-full rounded-full bg-[var(--series-1)]"
                          style={{
                            width: `${Math.max(2, (g.participacao / maiorParticipacao) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-11 text-right text-xs tabular text-[var(--ink-secondary)]">
                        {(g.participacao * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5">
                    {clicavel && (
                      <ArrowRight
                        size={14}
                        className="text-[var(--ink-muted)] opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {grupos.length > 0 && (
        <footer className="border-t border-[var(--line)] px-4 py-2.5 text-xs text-[var(--ink-muted)]">
          {grupos.length} {dimensaoLabel[dimensao].toLowerCase()}
          {grupos.length === 1 ? "" : "s"} · total de {formatDuration(totalAbsMin)} em ausências
        </footer>
      )}
    </section>
  );
}
