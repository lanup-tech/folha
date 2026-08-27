"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X, SlidersHorizontal, Check, ChevronDown } from "lucide-react";
import clsx from "clsx";
import type { CompanyKey } from "@/lib/types";
import { companies, companyLabel } from "@/lib/data/companies";
import {
  faixaLabel,
  nivelLabel,
  contarFiltrosAtivos,
  filtrosParaQuery,
  type Filtros,
  type FaixaAbs,
  type NivelHierarquico,
} from "@/lib/data/dimensoes";

interface Opcao {
  valor: string;
  total: number;
}

/**
 * Barra de filtros que vale para todo o painel. O estado vive na URL, então
 * qualquer recorte é compartilhável por link e sobrevive ao recarregar.
 */
export function FiltrosGlobais({
  filtros,
  setores,
  cargos,
  niveis,
  resultado,
  universo,
}: {
  filtros: Filtros;
  setores: Opcao[];
  cargos: Opcao[];
  /** só os níveis presentes no quadro — ver opcoesDeFiltro */
  niveis: { valor: string; total: number }[];
  resultado: number;
  universo: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [busca, setBusca] = useState(filtros.busca);

  useEffect(() => setBusca(filtros.busca), [filtros.busca]);

  function navegar(novos: Filtros) {
    const q = filtrosParaQuery(novos);
    // preserva competência, visão parcial e dimensão escolhida
    for (const k of ["competencia", "parcial", "dim"]) {
      const v = params.get(k);
      if (v) q.set(k, v);
    }
    router.push(`${pathname}?${q.toString()}`, { scroll: false });
  }

  function alternar<T extends string>(lista: T[], valor: T): T[] {
    return lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor];
  }

  const ativos = contarFiltrosAtivos(filtros);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navegar({ ...filtros, busca });
        }}
        className="relative"
      >
        <Search
          size={15}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--ink-muted)]"
        />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onBlur={() => busca !== filtros.busca && navegar({ ...filtros, busca })}
          placeholder="Buscar pessoa, setor ou cargo…"
          className="w-64 rounded-lg border border-[var(--line-strong)] bg-[var(--surface-1)] py-2 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-[var(--ink-muted)] focus:border-[var(--brand-primary)]"
        />
      </form>

      <Multi
        rotulo="Empresa"
        selecionados={filtros.empresas}
        opcoes={companies.map((c) => ({ valor: c.key, rotulo: companyLabel[c.key] }))}
        onToggle={(v) =>
          navegar({ ...filtros, empresas: alternar(filtros.empresas, v as CompanyKey) })
        }
      />

      <Multi
        rotulo="Setor"
        busca
        selecionados={filtros.setores}
        opcoes={setores.map((s) => ({ valor: s.valor, rotulo: s.valor, sufixo: String(s.total) }))}
        onToggle={(v) => navegar({ ...filtros, setores: alternar(filtros.setores, v) })}
      />

      <Multi
        rotulo="Cargo"
        busca
        selecionados={filtros.cargos}
        opcoes={cargos.map((c) => ({ valor: c.valor, rotulo: c.valor, sufixo: String(c.total) }))}
        onToggle={(v) => navegar({ ...filtros, cargos: alternar(filtros.cargos, v) })}
      />

      <Multi
        rotulo="Nível"
        selecionados={filtros.niveis}
        opcoes={niveis.map((n) => ({
          valor: n.valor,
          rotulo: nivelLabel[n.valor as NivelHierarquico],
          sufixo: String(n.total),
        }))}
        onToggle={(v) =>
          navegar({ ...filtros, niveis: alternar(filtros.niveis, v as NivelHierarquico) })
        }
        nota="Derivado do cargo — o sistema de ponto não fornece organograma"
      />

      <Multi
        rotulo="Faixa"
        selecionados={filtros.faixas}
        opcoes={(["OK", "ATENCAO", "CRITICO"] as FaixaAbs[]).map((f) => ({
          valor: f,
          rotulo: faixaLabel[f],
        }))}
        onToggle={(v) => navegar({ ...filtros, faixas: alternar(filtros.faixas, v as FaixaAbs) })}
      />

      {ativos > 0 && (
        <button
          onClick={() =>
            navegar({ empresas: [], setores: [], cargos: [], niveis: [], faixas: [], busca: "" })
          }
          className="flex items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-2.5 py-2 text-xs font-medium text-[var(--ink-secondary)] transition-colors hover:bg-[var(--surface-sunken)]"
        >
          <X size={13} />
          Limpar {ativos}
        </button>
      )}

      <span className="ml-auto flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
        <SlidersHorizontal size={13} />
        <strong className="tabular font-semibold text-[var(--ink-primary)]">{resultado}</strong>
        {resultado !== universo && <span className="tabular">de {universo}</span>}
        colaboradores
      </span>
    </div>
  );
}

function Multi({
  rotulo,
  opcoes,
  selecionados,
  onToggle,
  busca,
  nota,
}: {
  rotulo: string;
  opcoes: { valor: string; rotulo: string; sufixo?: string }[];
  selecionados: string[];
  onToggle: (v: string) => void;
  busca?: boolean;
  nota?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  const visiveis = termo
    ? opcoes.filter((o) => o.rotulo.toLowerCase().includes(termo.toLowerCase()))
    : opcoes;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAberto((a) => !a)}
        className={clsx(
          "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
          selecionados.length
            ? "border-[var(--brand-primary)] bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] font-medium text-[var(--ink-primary)]"
            : "border-[var(--line-strong)] text-[var(--ink-secondary)] hover:bg-[var(--surface-sunken)]"
        )}
      >
        {rotulo}
        {selecionados.length > 0 && (
          <span className="rounded bg-[var(--brand-primary)] px-1.5 text-[10px] font-bold text-white tabular">
            {selecionados.length}
          </span>
        )}
        <ChevronDown size={13} className={clsx("transition-transform", aberto && "rotate-180")} />
      </button>

      {aberto && (
        <div className="glass-strong absolute top-full left-0 z-50 mt-1 w-72 overflow-hidden rounded-[var(--radius)] border border-[var(--line)] shadow-[var(--shadow-lg)]">
          {busca && (
            <div className="border-b border-[var(--line)] p-2">
              <input
                autoFocus
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Filtrar…"
                className="w-full rounded-md border border-[var(--line-strong)] bg-[var(--surface-1)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
          )}
          <div className="scroll-slim max-h-56 overflow-y-auto p-1">
            {visiveis.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-[var(--ink-muted)]">
                Nada encontrado
              </p>
            )}
            {visiveis.map((o) => {
              const marcado = selecionados.includes(o.valor);
              return (
                <button
                  key={o.valor}
                  onClick={() => onToggle(o.valor)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--surface-sunken)]"
                >
                  <span
                    className={clsx(
                      "grid h-4 w-4 shrink-0 place-items-center rounded border",
                      marcado
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                        : "border-[var(--line-strong)]"
                    )}
                  >
                    {marcado && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{o.rotulo}</span>
                  {o.sufixo && (
                    <span className="shrink-0 text-[10px] text-[var(--ink-muted)] tabular">
                      {o.sufixo}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {nota && (
            <p className="border-t border-[var(--line)] px-3 py-2 text-[11px] leading-snug text-[var(--ink-muted)]">
              {nota}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
