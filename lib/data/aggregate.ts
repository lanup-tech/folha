import { absHoraMin, type CompanyKey, type EmployeeMonth } from "../types";
import { absRatio } from "../format";
import { companies } from "./companies";

export interface CompanySummary {
  key: CompanyKey;
  shortName: string;
  headcount: number;
  plannedMin: number;
  absMin: number;
  unjustifiedMin: number;
  excusedMin: number;
  justifiedMin: number;
  heMin: number;
  absPct: number; // 0..1
}

export interface SectorSummary {
  company: CompanyKey;
  sector: string;
  headcount: number;
  plannedMin: number;
  absMin: number;
  absPct: number;
}

export interface EmployeeRanked extends EmployeeMonth {
  absMin: number;
  absPct: number;
}

export interface QualityAlert {
  employee: EmployeeMonth;
  message: string;
}

export function companySummaries(all: EmployeeMonth[]): CompanySummary[] {
  return companies.map((c) => {
    const rows = all.filter((e) => e.company === c.key);
    const plannedMin = sum(rows, (e) => e.plannedMin);
    const absMin = sum(rows, absHoraMin);
    return {
      key: c.key,
      shortName: c.shortName,
      headcount: rows.length,
      plannedMin,
      absMin,
      unjustifiedMin: sum(rows, (e) => e.unjustifiedMin),
      excusedMin: sum(rows, (e) => e.excusedMin),
      justifiedMin: sum(rows, (e) => e.justifiedMin),
      heMin: sum(rows, (e) => e.heMin),
      absPct: absRatio(absMin, plannedMin),
    };
  });
}

export function overallKpis(all: EmployeeMonth[]) {
  const plannedMin = sum(all, (e) => e.plannedMin);
  const absMin = sum(all, absHoraMin);
  return {
    headcount: all.length,
    plannedMin,
    absMin,
    heMin: sum(all, (e) => e.heMin),
    unjustifiedMin: sum(all, (e) => e.unjustifiedMin),
    excusedMin: sum(all, (e) => e.excusedMin),
    justifiedMin: sum(all, (e) => e.justifiedMin),
    absPct: absRatio(absMin, plannedMin),
    critical: rankedEmployees(all).filter((e) => e.absPct >= 0.1).length,
  };
}

export function sectorSummaries(all: EmployeeMonth[], top = 8): SectorSummary[] {
  const map = new Map<string, SectorSummary>();
  for (const e of all) {
    if (!e.sector) continue;
    const key = `${e.company}|${e.sector}`;
    const cur =
      map.get(key) ??
      { company: e.company, sector: e.sector, headcount: 0, plannedMin: 0, absMin: 0, absPct: 0 };
    cur.headcount += 1;
    cur.plannedMin += e.plannedMin;
    cur.absMin += absHoraMin(e);
    map.set(key, cur);
  }
  return [...map.values()]
    .map((s) => ({ ...s, absPct: absRatio(s.absMin, s.plannedMin) }))
    .filter((s) => s.absMin > 0)
    .sort((a, b) => b.absPct - a.absPct)
    .slice(0, top);
}

export function rankedEmployees(all: EmployeeMonth[]): EmployeeRanked[] {
  return all
    .map((e) => {
      const absMin = absHoraMin(e);
      return { ...e, absMin, absPct: absRatio(absMin, e.plannedMin) };
    })
    .sort((a, b) => b.absPct - a.absPct);
}

/**
 * Regra do negócio: ABS % nunca pode passar de 100% — acima disso é erro de carga.
 *
 * Quando o mês inteiro é ausência, o alerta explica o porquê usando o motivo
 * predominante do Abono de Faltas (a API traz as horas abonadas, mas não o
 * motivo) — assim o painel informa em vez de apenas sinalizar.
 */
export function qualityAlerts(all: EmployeeMonth[]): QualityAlert[] {
  const alerts: QualityAlert[] = [];
  for (const e of rankedEmployees(all)) {
    if (e.absPct > 1) {
      alerts.push({ employee: e, message: "ABS % acima de 100% — revisar carga de dados" });
    } else if (e.absPct === 1 && e.plannedMin > 0) {
      alerts.push({ employee: e, message: fullMonthMessage(e) });
    } else if (e.plannedMin === 0 && e.absMin > 0) {
      alerts.push({ employee: e, message: "Horas de ausência sem planejado — revisar escala" });
    }
  }
  return alerts;
}

function fullMonthMessage(e: EmployeeMonth): string {
  if (!e.mainMotivo) {
    return "Mês integralmente ausente — sem lançamento no Abono de Faltas, revisar";
  }
  const efeito =
    e.mainMotivoTreatment === "DESCONSIDERAR"
      ? "não conta no absenteísmo"
      : e.mainMotivoTreatment === "ABONADO"
        ? "abonado"
        : "justificado";
  return `Mês integralmente ausente — ${e.mainMotivo} (${efeito})`;
}

function sum<T>(rows: T[], f: (r: T) => number): number {
  return rows.reduce((acc, r) => acc + f(r), 0);
}
