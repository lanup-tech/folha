"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X, Filter } from "lucide-react";
import { companyLabel } from "@/lib/data/companies";
import {
  faixaLabel,
  nivelLabel,
  filtrosParaQuery,
  type Filtros,
  type FaixaAbs,
  type NivelHierarquico,
} from "@/lib/data/dimensoes";
import type { CompanyKey } from "@/lib/types";

/**
 * Trilha do recorte atual: mostra cada filtro aplicado como uma etiqueta
 * removível. Sem isso o usuário aprofunda e perde a noção de onde está — o
 * caminho de volta precisa ser sempre visível.
 */
export function TrilhaFiltros({ filtros }: { filtros: Filtros }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const etiquetas: { grupo: string; rotulo: string; remover: () => Filtros }[] = [];

  for (const v of filtros.empresas) {
    etiquetas.push({
      grupo: "Empresa",
      rotulo: companyLabel[v as CompanyKey],
      remover: () => ({ ...filtros, empresas: filtros.empresas.filter((x) => x !== v) }),
    });
  }
  for (const v of filtros.setores) {
    etiquetas.push({
      grupo: "Setor",
      rotulo: v,
      remover: () => ({ ...filtros, setores: filtros.setores.filter((x) => x !== v) }),
    });
  }
  for (const v of filtros.cargos) {
    etiquetas.push({
      grupo: "Cargo",
      rotulo: v,
      remover: () => ({ ...filtros, cargos: filtros.cargos.filter((x) => x !== v) }),
    });
  }
  for (const v of filtros.niveis) {
    etiquetas.push({
      grupo: "Nível",
      rotulo: nivelLabel[v as NivelHierarquico],
      remover: () => ({ ...filtros, niveis: filtros.niveis.filter((x) => x !== v) }),
    });
  }
  for (const v of filtros.faixas) {
    etiquetas.push({
      grupo: "Faixa",
      rotulo: faixaLabel[v as FaixaAbs],
      remover: () => ({ ...filtros, faixas: filtros.faixas.filter((x) => x !== v) }),
    });
  }
  if (filtros.busca.trim()) {
    etiquetas.push({
      grupo: "Busca",
      rotulo: filtros.busca,
      remover: () => ({ ...filtros, busca: "" }),
    });
  }

  if (etiquetas.length === 0) return null;

  function navegar(novos: Filtros) {
    const q = filtrosParaQuery(novos);
    for (const k of ["competencia", "parcial", "dim"]) {
      const v = params.get(k);
      if (v) q.set(k, v);
    }
    router.push(`${pathname}?${q.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Filter size={13} className="text-[var(--ink-muted)]" />
      <span className="text-xs text-[var(--ink-muted)]">Analisando:</span>
      {etiquetas.map((e, i) => (
        <button
          key={`${e.grupo}-${e.rotulo}-${i}`}
          onClick={() => navegar(e.remover())}
          className="group flex max-w-[280px] items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-[var(--surface-1)] py-1 pr-1.5 pl-2.5 text-xs transition-colors hover:border-[var(--status-critical)]"
          title={`Remover filtro ${e.grupo}: ${e.rotulo}`}
        >
          <span className="text-[var(--ink-muted)]">{e.grupo}</span>
          <span className="min-w-0 truncate font-medium">{e.rotulo}</span>
          <X
            size={12}
            className="shrink-0 text-[var(--ink-muted)] transition-colors group-hover:text-[var(--status-critical)]"
          />
        </button>
      ))}
    </div>
  );
}
