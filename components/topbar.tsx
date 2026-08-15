"use client";

import { Building2 } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import clsx from "clsx";
import { activeClientBranding } from "@/lib/branding";
import { competenciaOptions, defaultCompetenciaKey } from "@/lib/data/competencias";
import { PeriodSelector } from "./period-selector";
import { PartialToggle } from "./partial-toggle";

/**
 * Cabeçalho fixo: permanece visível ao rolar a página e ganha sombra quando
 * há conteúdo acima — o usuário nunca perde o contexto (cliente, competência)
 * nem os controles de filtro.
 */
export function Topbar({
  title,
  subtitle,
  competencia,
  mesEmCurso,
  diaCorte,
  parcial,
}: {
  title: string;
  subtitle?: string;
  competencia?: string;
  mesEmCurso?: boolean;
  diaCorte?: number | null;
  parcial?: boolean;
}) {
  const [rolou, setRolou] = useState(false);

  // O scroll é do container de conteúdo (ver app/dashboard/layout.tsx), não da
  // janela — por isso observamos o elemento pai que realmente rola.
  useEffect(() => {
    const alvo = document.querySelector<HTMLElement>("[data-scroll-container]");
    if (!alvo) return;
    const onScroll = () => setRolou(alvo.scrollTop > 4);
    onScroll();
    alvo.addEventListener("scroll", onScroll, { passive: true });
    return () => alvo.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={clsx(
        "glass-strong sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b px-6 transition-shadow",
        rolou ? "border-[var(--glass-border)] shadow-[var(--shadow-md)]" : "border-[var(--line)]"
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-[17px] font-semibold tracking-[-0.01em]">{title}</h1>
        {subtitle && (
          <p className="truncate text-xs text-[var(--ink-muted)]">{subtitle}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2.5 text-sm">
        {mesEmCurso && diaCorte ? (
          <Suspense fallback={null}>
            <PartialToggle parcial={!!parcial} diaCorte={diaCorte} />
          </Suspense>
        ) : null}
        <span className="hidden items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-[var(--ink-secondary)] lg:flex">
          <Building2 size={15} className="text-[var(--ink-muted)]" />
          {activeClientBranding.name}
          <span className="text-[var(--ink-muted)]">· 3 empresas</span>
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
