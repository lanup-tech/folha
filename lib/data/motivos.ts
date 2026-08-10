import type { Motivo } from "../types";
import motivosJson from "./motivos.json";

/**
 * Base de motivos — hoje mantida em planilha ("motivos" no Abono de Faltas),
 * passa a ser cadastrada pelo cliente final no front (página Motivos) e
 * persistida na tabela `absence_reasons` do Supabase.
 *
 * O JSON é a fonte única: usado pelo front (esta página) e pelo script de
 * ingestão das planilhas cruas (scripts/ingest-competencia.mjs).
 *
 * ABONADO       => conta como falta abonada (entra em ABONADA)
 * JUSTIFICADO   => conta como falta justificada (entra em JUSTIFICADA)
 * DESCONSIDERAR => não entra no cálculo de absenteísmo
 */
export const motivosBase: Motivo[] = motivosJson as Motivo[];
