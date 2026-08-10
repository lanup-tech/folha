"use client";

/** Tokens compartilhados dos gráficos — paleta categórica validada (ordem fixa). */
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a"] as const;
export const INK_MUTED = "#898781";
export const GRIDLINE = "#e1e0d9";
export const SURFACE = "#fcfcfb";

export const axisTick = { fill: INK_MUTED, fontSize: 11 } as const;

export function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string;
  format: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-sm">
      {label && <div className="mb-1 font-semibold">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          {p.color && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: p.color }}
            />
          )}
          <span className="text-[var(--ink-secondary)]">{p.name}</span>
          <span className="ml-auto pl-3 font-medium tabular">
            {format(Number(p.value ?? 0))}
          </span>
        </div>
      ))}
    </div>
  );
}
