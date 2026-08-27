"use client";

import { useEffect } from "react";
import { X, Building2, Briefcase, CalendarDays, Hash } from "lucide-react";
import clsx from "clsx";
import type { EmployeeRanked } from "@/lib/data/aggregate";
import { companyLabel } from "@/lib/data/companies";
import { formatDuration, formatPercent } from "@/lib/format";
import { diasDoColaborador } from "@/lib/data/dias";
import { DiasColaborador } from "@/components/charts/dias-colaborador";

/**
 * Painel lateral com o detalhe do colaborador.
 *
 * Mostra a composição da ausência (o "porquê" do ABS%) e o cadastro — o que
 * o gestor precisa para decidir se aquele número exige ação.
 */
export function EmployeeDrawer({
  employee,
  onClose,
  competencia,
}: {
  employee: EmployeeRanked | null;
  onClose: () => void;
  /** competência corrente, para buscar o dia a dia da pessoa */
  competencia?: string;
}) {
  const dias = diasDoColaborador(competencia, employee?.registration);
  useEffect(() => {
    if (!employee) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [employee, onClose]);

  const aberto = !!employee;

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={clsx(
          "fixed inset-0 z-40 bg-[rgba(12,27,42,0.28)] backdrop-blur-[2px] transition-opacity duration-200",
          aberto ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={employee ? `Detalhes de ${employee.name}` : undefined}
        className={clsx(
          "glass-strong fixed right-0 top-0 z-50 flex h-full w-full max-w-[460px] flex-col border-l border-[var(--glass-border)] shadow-[var(--shadow-lg)] transition-transform duration-300",
          aberto ? "translate-x-0" : "translate-x-full"
        )}
      >
        {employee && (
          <>
            <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-5">
              <div className="min-w-0">
                <p className="eyebrow mb-1">Colaborador</p>
                <h2 className="text-lg font-semibold leading-snug tracking-[-0.01em]">
                  {employee.name}
                </h2>
                <p className="mt-0.5 text-sm text-[var(--ink-secondary)]">
                  {employee.role || "cargo não informado"}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--ink-primary)]"
              >
                <X size={18} />
              </button>
            </header>

            <div className="scroll-slim flex-1 overflow-y-auto px-6 py-5">
              {/* indicador principal */}
              <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)] p-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="eyebrow mb-1">Absenteísmo no período</p>
                    <p
                      className={clsx(
                        "text-[32px] font-semibold leading-none tracking-[-0.02em] tabular",
                        employee.absPct >= 0.1
                          ? "text-[var(--status-critical)]"
                          : "text-[var(--ink-primary)]"
                      )}
                    >
                      {formatPercent(employee.absPct)}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="tabular font-medium">{formatDuration(employee.absMin)}</p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      de {formatDuration(employee.plannedMin)} planejadas
                    </p>
                  </div>
                </div>
                {/* barra proporcional */}
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{
                      width: `${Math.min(100, employee.absPct * 100)}%`,
                      background:
                        employee.absPct >= 0.1
                          ? "var(--status-critical)"
                          : "var(--series-1)",
                    }}
                  />
                </div>
              </div>

              {/* composição */}
              <p className="eyebrow mb-2 mt-6">Composição das horas</p>
              <dl className="flex flex-col divide-y divide-[var(--line)] rounded-[var(--radius)] border border-[var(--line)]">
                <Linha rotulo="Injustificada" valor={formatDuration(employee.unjustifiedMin)} destaque />
                <Linha rotulo="Abonada" valor={formatDuration(employee.excusedMin)} />
                <Linha rotulo="Justificada" valor={formatDuration(employee.justifiedMin)} />
                <Linha
                  rotulo="Desconsiderada"
                  valor={employee.ignoredMin ? formatDuration(employee.ignoredMin) : "—"}
                  hint={employee.mainMotivo ?? undefined}
                />
                <Linha rotulo="Horas extras" valor={formatDuration(employee.heMin)} />
              </dl>

              {employee.mainMotivo && (
                <div className="mt-4 rounded-[var(--radius)] bg-[var(--surface-sunken)] px-4 py-3">
                  <p className="eyebrow mb-1">Motivo predominante</p>
                  <p className="text-sm font-medium">{employee.mainMotivo}</p>
                  <p className="mt-0.5 text-xs text-[var(--ink-secondary)]">
                    {employee.mainMotivoTreatment === "DESCONSIDERAR"
                      ? "Não entra no cálculo do absenteísmo"
                      : employee.mainMotivoTreatment === "ABONADO"
                        ? "Contabilizado como falta abonada"
                        : "Contabilizado como falta justificada"}
                  </p>
                </div>
              )}

              {/* dia a dia — último nível do aprofundamento */}
              {dias.length > 0 && (
                <>
                  <p className="eyebrow mb-2 mt-6">
                    Dia a dia · {dias.length} dia{dias.length === 1 ? "" : "s"} com jornada
                  </p>
                  <DiasColaborador dias={dias} />
                </>
              )}

              {/* cadastro */}
              <p className="eyebrow mb-2 mt-6">Cadastro</p>
              <dl className="flex flex-col gap-3">
                <Dado icone={<Hash size={15} />} rotulo="Matrícula" valor={employee.registration || "—"} />
                <Dado
                  icone={<Building2 size={15} />}
                  rotulo="Empresa"
                  valor={companyLabel[employee.company]}
                />
                <Dado icone={<Briefcase size={15} />} rotulo="Setor" valor={employee.sector || "—"} />
                <Dado
                  icone={<CalendarDays size={15} />}
                  rotulo="Admissão"
                  valor={employee.admissionDate || "—"}
                />
              </dl>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function Linha({
  rotulo,
  valor,
  destaque,
  hint,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="text-sm text-[var(--ink-secondary)]">
        {rotulo}
        {hint && <span className="ml-1.5 text-xs text-[var(--ink-muted)]">({hint})</span>}
      </dt>
      <dd className={clsx("text-sm tabular", destaque ? "font-semibold" : "font-medium")}>
        {valor}
      </dd>
    </div>
  );
}

function Dado({
  icone,
  rotulo,
  valor,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--surface-sunken)] text-[var(--ink-muted)]">
        {icone}
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-[var(--ink-muted)]">{rotulo}</dt>
        <dd className="truncate text-sm font-medium">{valor}</dd>
      </div>
    </div>
  );
}
