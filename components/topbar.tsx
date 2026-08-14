import { Building2 } from "lucide-react";
import { Suspense } from "react";
import { activeClientBranding } from "@/lib/branding";
import { competenciaOptions, defaultCompetenciaKey } from "@/lib/data/competencias";
import { PeriodSelector } from "./period-selector";
import { PartialToggle } from "./partial-toggle";

export function Topbar({
  title,
  competencia,
  mesEmCurso,
  diaCorte,
  parcial,
}: {
  title: string;
  competencia?: string;
  /** exibe a flag de análise parcial (só faz sentido no mês em curso) */
  mesEmCurso?: boolean;
  diaCorte?: number | null;
  parcial?: boolean;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-black/10 bg-[var(--surface-1)] px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-3 text-sm">
        {mesEmCurso && diaCorte ? (
          <Suspense fallback={null}>
            <PartialToggle parcial={!!parcial} diaCorte={diaCorte} />
          </Suspense>
        ) : null}
        <span className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-1.5 text-[var(--ink-secondary)]">
          <Building2 size={15} />
          {activeClientBranding.name} · 3 empresas
        </span>
        <Suspense fallback={null}>
          <PeriodSelector
            value={competencia ?? defaultCompetenciaKey}
            options={competenciaOptions()}
          />
        </Suspense>
      </div>
    </header>
  );
}
