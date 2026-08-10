import { Building2 } from "lucide-react";
import { activeClientBranding } from "@/lib/branding";
import { competenciaOptions, defaultCompetenciaKey } from "@/lib/data/competencias";
import { PeriodSelector } from "./period-selector";

export function Topbar({ title, competencia }: { title: string; competencia?: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-black/10 bg-[var(--surface-1)] px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-1.5 text-[var(--ink-secondary)]">
          <Building2 size={15} />
          {activeClientBranding.name} · 3 empresas
        </span>
        <PeriodSelector
          value={competencia ?? defaultCompetenciaKey}
          options={competenciaOptions()}
        />
      </div>
    </header>
  );
}
