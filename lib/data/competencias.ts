import type { EmployeeMonth, MotivoMonthTotal } from "../types";
import { employeesMay2026, motivoTotalsMay2026 } from "./may-2026";
import june2026Json from "@/data/competencias/2026-06.json";
import july2026Json from "@/data/competencias/2026-07.json";
import august2026Json from "@/data/competencias/2026-08.json";

/**
 * Registro de competências disponíveis no painel.
 *
 * - Maio/2026: amostra transcrita das planilhas de ANÁLISE (validação visual)
 * - Junho/Julho: relatórios crus + API (scripts/ingest-competencia.mjs)
 * - Agosto/2026: mês corrente, montado por API + Abono do RPA
 *   (scripts/montar-competencia-api.mjs) — sem depender do relatório de
 *   Absenteísmo, que não gera para o quadro completo.
 *
 * Competências sem dados carregados ficam fora do seletor (ver `disponiveis`).
 *
 * Quando o painel passar a ler do Supabase, este registro vira consulta na
 * view `employee_month_summary` por competência.
 */

export interface CompetenciaData {
  key: string;
  label: string;
  employees: EmployeeMonth[];
  motivoTotals: MotivoMonthTotal[];
  /** origem da carga, exibida no painel */
  source: string;
  /** visão só com os dias já decorridos (existe apenas no mês em curso) */
  employeesParcial?: EmployeeMonth[];
  mesEmCurso?: boolean;
  diaCorte?: number | null;
}

const may2026: CompetenciaData = {
  key: "2026-05",
  label: "Maio 2026",
  employees: employeesMay2026,
  motivoTotals: motivoTotalsMay2026,
  source: "amostra das planilhas de análise",
};

const june2026: CompetenciaData = {
  key: "2026-06",
  label: "Junho 2026",
  employees: june2026Json.employees as EmployeeMonth[],
  motivoTotals: june2026Json.motivoTotals as MotivoMonthTotal[],
  source: "Abono coletado pelo RPA (mês cheio) + HE e cadastro via API EzPoint",
};

const july2026: CompetenciaData = {
  key: "2026-07",
  label: "Julho 2026",
  employees: july2026Json.employees as EmployeeMonth[],
  motivoTotals: july2026Json.motivoTotals as MotivoMonthTotal[],
  source: "relatórios crus + API de funcionários",
};

const august2026: CompetenciaData = {
  key: "2026-08",
  label: "Agosto 2026",
  employees: august2026Json.employees as EmployeeMonth[],
  employeesParcial: (august2026Json as { employeesParcial?: EmployeeMonth[] }).employeesParcial,
  mesEmCurso: (august2026Json.meta as { mesEmCurso?: boolean })?.mesEmCurso,
  diaCorte: (august2026Json.meta as { diaCorte?: number | null })?.diaCorte ?? null,
  motivoTotals: august2026Json.motivoTotals as MotivoMonthTotal[],
  source: "mês corrente · API EzPoint + Abono coletado pelo RPA na VPS",
};

/** Só entram no seletor as competências que têm dados carregados. */
export const competencias: CompetenciaData[] = [
  may2026,
  june2026,
  july2026,
  august2026,
].filter((c) => c.employees.length > 0);

export const defaultCompetenciaKey =
  competencias[competencias.length - 1]?.key ?? "2026-07";

export function getCompetencia(key?: string): CompetenciaData {
  return (
    competencias.find((c) => c.key === key) ??
    competencias.find((c) => c.key === defaultCompetenciaKey)!
  );
}

export function competenciaOptions() {
  return competencias.map((c) => ({ key: c.key, label: c.label }));
}

/** Competência corrente no fuso local (AAAA-MM). */
function competenciaCorrente(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * A análise parcial só faz sentido no mês em curso: em meses fechados todos os
 * dias já ocorreram, então "parcial" seria apenas um recorte arbitrário.
 */
export function permiteParcial(c: CompetenciaData): boolean {
  return c.key === competenciaCorrente() && !!c.employeesParcial?.length;
}

/**
 * Lista de colaboradores conforme a visão escolhida.
 * `parcial` só tem efeito onde a visão parcial é permitida.
 */
export function employeesDaVisao(c: CompetenciaData, parcial: boolean): EmployeeMonth[] {
  if (parcial && permiteParcial(c)) return c.employeesParcial!;
  return c.employees;
}
