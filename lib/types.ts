/**
 * Modelo de domínio — espelha o schema Supabase (supabase/migrations).
 *
 * Hierarquia multitenant:
 *   Tenant (parceiro whitelabel, ex.: Nobriponto)
 *     └─ Client (cliente final, ex.: Funchal)
 *          └─ Company (CNPJ, ex.: Funchal Negócios / Participações / Tattini)
 *               └─ Sector (setor / centro de custo)
 *                    └─ Employee
 */

export interface TenantBranding {
  name: string;
  logoUrl: string;
  primaryColor: string;
  darkColor: string;
}

export type CompanyKey = "EMPREENDIMENTOS" | "PARTICIPACOES" | "TATTINI";

export interface Company {
  key: CompanyKey;
  name: string;
  shortName: string;
  cnpj: string | null;
}

/** Linha consolidada por colaborador na competência (aba "geral" das análises). */
export interface EmployeeMonth {
  company: CompanyKey;
  sector: string;
  registration: string; // matrícula
  name: string;
  role: string; // cargo
  admissionDate: string; // dd/mm/aaaa
  heMin: number; // horas extras (extrato de horas)
  unjustifiedMin: number; // INJUSTIFICA
  excusedMin: number; // ABONADA
  justifiedMin: number; // JUSTIFICADA
  /** Horas de motivos DESCONSIDERAR (afastamento, licença…) — FORA do ABS HORA */
  ignoredMin?: number;
  plannedMin: number; // PLANEJADO (horas previstas do relatório de absenteísmo)
  /** Motivo com mais horas de abono no mês — explica afastamentos nos alertas */
  mainMotivo?: string | null;
  mainMotivoTreatment?: MotivoTreatment | null;
}

/** ABS HORA = INJUSTIFICADA + ABONADA + JUSTIFICADA */
export function absHoraMin(e: EmployeeMonth): number {
  return e.unjustifiedMin + e.excusedMin + e.justifiedMin;
}

export type MotivoTreatment = "ABONADO" | "DESCONSIDERAR" | "JUSTIFICADO";

/** Base de motivos — cadastrada pelo cliente final (front de motivos). */
export interface Motivo {
  name: string;
  treatment: MotivoTreatment;
  active: boolean;
}

/** Total de horas abonadas/desconsideradas por motivo na competência. */
export interface MotivoMonthTotal {
  motivo: string;
  treatment: MotivoTreatment;
  totalMin: number;
  occurrences: number;
}
