import diasAgosto from "@/data/competencias/2026-08-dias.json";
import type { DiaEspelho } from "@/components/charts/dias-colaborador";

/**
 * Detalhe diário por competência, indexado pela matrícula.
 * Gerado por scripts/exportar-dias.mjs a partir da tabela `espelho_dias`.
 *
 * Só existe a partir de agosto/2026: a tabela de dias foi criada nessa
 * competência, e as anteriores foram carregadas apenas com os totais mensais.
 * Recarregá-las é possível (scripts/carregar-dias.mjs), mas leva ~35 min por
 * mês — feito sob demanda, não retroativamente por padrão.
 */
const porCompetencia: Record<string, Record<string, DiaEspelho[]>> = {
  "2026-08": diasAgosto as Record<string, DiaEspelho[]>,
};

export function diasDoColaborador(
  competencia: string | undefined,
  matricula: string | undefined
): DiaEspelho[] {
  if (!competencia || !matricula) return [];
  return porCompetencia[competencia]?.[matricula] ?? [];
}

/** Se a competência tem detalhe diário carregado. */
export function temDetalheDiario(competencia: string | undefined): boolean {
  return !!competencia && !!porCompetencia[competencia];
}
