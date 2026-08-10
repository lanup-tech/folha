import clsx from "clsx";

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
    <div className="card flex flex-col gap-1 p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
        {label}
      </span>
      <span
        className={clsx(
          "text-2xl font-semibold",
          tone === "critical" && "text-[var(--status-critical)]",
          tone === "good" && "text-[#006300]"
        )}
      >
        {value}
      </span>
      {hint && <span className="text-xs text-[var(--ink-secondary)]">{hint}</span>}
    </div>
  );
}
