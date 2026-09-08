import type { EmployeeMonth, MotivoMonthTotal } from "../types";
import jan2026 from "@/data/competencias/2026-01.json";
import fev2026 from "@/data/competencias/2026-02.json";
import mar2026 from "@/data/competencias/2026-03.json";
import abr2026 from "@/data/competencias/2026-04.json";
import mai2026 from "@/data/competencias/2026-05.json";
import jun2026 from "@/data/competencias/2026-06.json";
import jul2026 from "@/data/competencias/2026-07.json";
import ago2026 from "@/data/competencias/2026-08.json";
import set2026 from "@/data/competencias/2026-09.json";

/**
 * Competências disponíveis no painel.
 *
 * Cada arquivo é gerado por scripts/montar-competencia-api.mjs (API EzPoint +
 * Abono coletado pelo RPA). Competências sem dados carregados são filtradas e
 * não aparecem no seletor.
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
  /** visão só com os dias já decorridos (mês em curso ou carga incompleta) */
  employeesParcial?: EmployeeMonth[];
  diaCorte?: number | null;
}

/** Formato bruto dos arquivos gerados pelos scripts de carga. */
interface ArquivoCompetencia {
  competencia?: string;
  employees?: unknown[];
  employeesParcial?: unknown[];
  motivoTotals?: unknown[];
  meta?: { origem?: string; diaCorte?: number | null };
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function paraCompetencia(chave: string, arquivo: unknown): CompetenciaData {
  const a = arquivo as ArquivoCompetencia;
  const [ano, mes] = chave.split("-").map(Number);
  return {
    key: chave,
    label: `${MESES[mes - 1]} ${ano}`,
    employees: (a.employees ?? []) as EmployeeMonth[],
    employeesParcial: a.employeesParcial as EmployeeMonth[] | undefined,
    motivoTotals: (a.motivoTotals ?? []) as MotivoMonthTotal[],
    diaCorte: a.meta?.diaCorte ?? null,
    source: a.meta?.origem ?? "API EzPoint + Abono coletado pelo RPA",
  };
}

const todas: CompetenciaData[] = [
  paraCompetencia("2026-01", jan2026),
  paraCompetencia("2026-02", fev2026),
  paraCompetencia("2026-03", mar2026),
  paraCompetencia("2026-04", abr2026),
  paraCompetencia("2026-05", mai2026),
  paraCompetencia("2026-06", jun2026),
  paraCompetencia("2026-07", jul2026),
  paraCompetencia("2026-08", ago2026),
  paraCompetencia("2026-09", set2026),
];

/** Só entram no seletor as competências que têm dados carregados. */
export const competencias: CompetenciaData[] = todas.filter(
  (c) => c.employees.length > 0
);

export const defaultCompetenciaKey =
  competencias[competencias.length - 1]?.key ?? "2026-08";

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
 * painel fique preso a um estado antigo.
 */
export function permiteParcial(c: CompetenciaData): boolean {
  return (
    !!c.employeesParcial?.length &&
    (c.key === competenciaCorrente() || estaDesatualizada(c))
  );
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

/**
 * Lista de colaboradores conforme a visão escolhida.
 * `parcial` só tem efeito onde a visão parcial é permitida.
 */
export function employeesDaVisao(c: CompetenciaData, parcial: boolean): EmployeeMonth[] {
  if (parcial && permiteParcial(c)) return c.employeesParcial!;
  return c.employees;
}
