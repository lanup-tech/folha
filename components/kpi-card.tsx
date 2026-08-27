"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import clsx from "clsx";

/**
 * Tile de indicador. Quando recebe `filtro`, vira porta de entrada: clicar
 * aplica aquele recorte ao painel inteiro — é o "expandir o resultado" que o
 * consolidado sozinho não permite.
 */
export function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
  filtro,
  titleAcao,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "critical" | "good";
  /** pares chave=valor aplicados à URL ao clicar */
  filtro?: Record<string, string>;
  titleAcao?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const clicavel = !!filtro;

  function aplicar() {
    if (!filtro) return;
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(filtro)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    router.push(`${pathname}?${q.toString()}`, { scroll: false });
  }

  const conteudo = (
    <>
      <span className="eyebrow flex items-center gap-1">
        {label}
        {clicavel && (
          <ArrowUpRight
            size={12}
            className="text-[var(--ink-muted)] opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}
      </span>
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
    </>
  );

  if (!clicavel) {
    return (
      <div className="card flex flex-col gap-1.5 p-4 shadow-[var(--shadow-sm),var(--glass-highlight)]">
        {conteudo}
      </div>
    );
  }

  return (
    <button
      onClick={aplicar}
      title={titleAcao}
      className="card group flex flex-col gap-1.5 p-4 text-left shadow-[var(--shadow-sm),var(--glass-highlight)] transition-all hover:border-[var(--brand-primary)] hover:shadow-[var(--shadow-md)]"
    >
      {conteudo}
    </button>
  );
}
