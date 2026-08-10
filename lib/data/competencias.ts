import type { EmployeeMonth, MotivoMonthTotal } from "../types";
import { employeesMay2026, motivoTotalsMay2026 } from "./may-2026";
import july2026Json from "@/data/competencias/2026-07.json";

/**
 * Registro de competências disponíveis no painel.
 *
 * - Maio/2026: amostra transcrita das planilhas de ANÁLISE (validação visual)
 * - Julho/2026: gerado dos relatórios CRUS pelo scripts/ingest-competencia.mjs
 *
 * Quando o Supabase estiver plugado, este registro passa a ser a consulta em
 * `employee_month_summary` por competência.
 */

export interface CompetenciaData {
  key: string;
  label: string;
  employees: EmployeeMonth[];
  motivoTotals: MotivoMonthTotal[];
  /** origem da carga, exibida no painel */
  source: string;
}

const may2026: CompetenciaData = {
  key: "2026-05",
  label: "Maio 2026",
  employees: employeesMay2026,
  motivoTotals: motivoTotalsMay2026,
  source: "amostra das planilhas de análise",
};

const july2026: CompetenciaData = {
  key: "2026-07",
  label: "Julho 2026",
  employees: july2026Json.employees as EmployeeMonth[],
  motivoTotals: july2026Json.motivoTotals as MotivoMonthTotal[],
  source: "relatórios crus + API de funcionários",
};

export const competencias: CompetenciaData[] = [may2026, july2026];

export const defaultCompetenciaKey = "2026-07";

export function getCompetencia(key?: string): CompetenciaData {
  return (
    competencias.find((c) => c.key === key) ??
    competencias.find((c) => c.key === defaultCompetenciaKey)!
  );
}

export function competenciaOptions() {
  return competencias.map((c) => ({ key: c.key, label: c.label }));
}
