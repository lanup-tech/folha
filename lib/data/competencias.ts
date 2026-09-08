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
  diaCorte: (august2026Json.meta as { diaCorte?: number | null })?.diaCorte ?? null,
  motivoTotals: august2026Json.motivoTotals as MotivoMonthTotal[],
  source: "API EzPoint + Abono coletado pelo RPA na VPS",
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
 * A análise parcial faz sentido enquanto os dados não cobrem o mês inteiro —
 * seja porque o mês está em curso, seja porque a carga parou antes do
 * fechamento (foi o caso de agosto: última carga em 14/08 e o mês seguiu).
 *
 * Decidir isso pela DATA, e não por um valor gravado no arquivo, evita que o
 * painel fique preso a um estado antigo: agosto tinha `mesEmCurso: true` de
 * 14/08 e, em setembro, a flag sumia — deixando o usuário só com a visão
 * inflada, sem caminho para o número real.
 */
export function permiteParcial(c: CompetenciaData): boolean {
  return !!c.employeesParcial?.length && (c.key === competenciaCorrente() || estaDesatualizada(c));
}

/**
 * Competência de mês já encerrado cuja carga parou antes do fim do mês.
 * Nesse estado os dias posteriores ao corte entram como falta e inflam o
 * indicador — o painel precisa avisar, não apresentar como número final.
 */
export function estaDesatualizada(c: CompetenciaData): boolean {
  if (!c.diaCorte) return false;
  if (c.key === competenciaCorrente()) return false; // ainda em curso: normal
  const [ano, mes] = c.key.split("-").map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return c.diaCorte < ultimoDia;
}

/** Último dia coberto pela carga, para exibição. */
export function diaCoberto(c: CompetenciaData): number | null {
  return c.diaCorte ?? null;
}

/**
 * Lista de colaboradores conforme a visão escolhida.
 * `parcial` só tem efeito onde a visão parcial é permitida.
 */
export function employeesDaVisao(c: CompetenciaData, parcial: boolean): EmployeeMonth[] {
  if (parcial && permiteParcial(c)) return c.employeesParcial!;
  return c.employees;
}
