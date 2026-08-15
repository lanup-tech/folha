import clsx from "clsx";

/**
 * Tile de indicador: rótulo discreto, número em destaque e uma linha de
 * contexto. O tom só é aplicado quando o número exige atenção — cor aqui é
 * informação, não decoração.
 */
export function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "critical" | "good";
}) {
  return (
    <div className="card flex flex-col gap-1.5 p-4">
      <span className="eyebrow">{label}</span>
      <span
        className={clsx(
          "text-[26px] font-semibold leading-none tracking-[-0.02em] tabular",
          tone === "critical" && "text-[var(--status-critical)]",
          tone === "good" && "text-[var(--status-good)]"
        )}
      >
        {value}
      </span>
      {hint && (
        <span className="text-xs leading-relaxed text-[var(--ink-secondary)]">{hint}</span>
      )}
    </div>
  );
}
