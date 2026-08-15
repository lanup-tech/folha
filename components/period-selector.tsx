"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import clsx from "clsx";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/**
 * Seleção de competência em dois campos (ano e mês) em vez de uma lista única —
 * a lista cresceria a cada mês fechado e ficaria impraticável em poucos anos.
 *
 * Meses sem dados aparecem desabilitados, então o seletor também comunica o
 * que já foi carregado.
 */
export function PeriodSelector({
  value,
  options,
}: {
  value: string;
  options: { key: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const disponiveis = new Set(options.map((o) => o.key));
  const anos = [...new Set(options.map((o) => o.key.slice(0, 4)))].sort().reverse();
  const [anoAtual, mesAtual] = value.split("-");

  function ir(competencia: string) {
    const q = new URLSearchParams(params.toString());
    q.set("competencia", competencia);
    router.push(`${pathname}?${q.toString()}`);
  }

  /** Ao trocar o ano, mantém o mês se houver dado; senão vai para o mais recente do ano. */
  function trocarAno(ano: string) {
    const alvo = `${ano}-${mesAtual}`;
    if (disponiveis.has(alvo)) return ir(alvo);
    const doAno = options.filter((o) => o.key.startsWith(ano)).map((o) => o.key).sort();
    if (doAno.length) ir(doAno[doAno.length - 1]);
  }

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-1)] py-1 pr-1 pl-2.5">
      <CalendarDays size={15} className="shrink-0 text-[var(--brand-primary)]" />

      <select
        value={mesAtual}
        onChange={(e) => ir(`${anoAtual}-${e.target.value}`)}
        aria-label="Mês"
        className="cursor-pointer rounded-md bg-transparent py-1 pr-1 text-sm font-medium outline-none hover:bg-[var(--surface-sunken)]"
      >
        {MESES.map((nome, i) => {
          const mm = String(i + 1).padStart(2, "0");
          const existe = disponiveis.has(`${anoAtual}-${mm}`);
          return (
            <option key={mm} value={mm} disabled={!existe}>
              {nome}
              {!existe ? " —" : ""}
            </option>
          );
        })}
      </select>

      <span className="text-[var(--line-strong)]">|</span>

      <select
        value={anoAtual}
        onChange={(e) => trocarAno(e.target.value)}
        aria-label="Ano"
        className={clsx(
          "cursor-pointer rounded-md bg-transparent py-1 pr-1 text-sm font-medium outline-none hover:bg-[var(--surface-sunken)]",
          "tabular"
        )}
      >
        {anos.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
  );
}
