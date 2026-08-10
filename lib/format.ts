/**
 * Todas as durações do domínio (planilhas do ponto) circulam como minutos
 * inteiros. "170:00:00" (HHH:MM:SS) => 10200 min. Segundos são truncados —
 * os relatórios da Nobriponto sempre trazem :00.
 */

export function parseDuration(text: string | null | undefined): number {
  if (!text) return 0;
  const m = text.trim().match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function formatDuration(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}:${String(m).padStart(2, "0")}`;
}

export function formatPercent(ratio: number, digits = 2): string {
  return `${(ratio * 100).toFixed(digits).replace(".", ",")}%`;
}

/** ABS % = ABS HORA / PLANEJADO. Planejado 0 => 0 (evita divisão por zero). */
export function absRatio(absMinutes: number, plannedMinutes: number): number {
  if (plannedMinutes <= 0) return 0;
  return absMinutes / plannedMinutes;
}
