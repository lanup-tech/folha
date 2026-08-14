"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarCheck2, CalendarRange } from "lucide-react";
import clsx from "clsx";

/**
 * Alterna entre a visão do mês cheio (padrão) e a análise parcial até ontem.
 *
 * Só aparece na competência corrente — em meses fechados não faz sentido.
 */
export function PartialToggle({ parcial, diaCorte }: { parcial: boolean; diaCorte: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function alternar(novo: boolean) {
    const q = new URLSearchParams(params.toString());
    if (novo) q.set("parcial", "1");
    else q.delete("parcial");
    router.push(`${pathname}?${q.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-black/10 p-0.5">
      <button
        onClick={() => alternar(false)}
        className={clsx(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
          !parcial ? "bg-[var(--brand-dark)] text-white" : "text-[var(--ink-secondary)] hover:bg-black/5"
        )}
        title="Mês inteiro, incluindo os dias que ainda não ocorreram"
      >
        <CalendarRange size={14} />
        Mês cheio
      </button>
      <button
        onClick={() => alternar(true)}
        className={clsx(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
          parcial ? "bg-[var(--brand-dark)] text-white" : "text-[var(--ink-secondary)] hover:bg-black/5"
        )}
        title={`Considera apenas os dias 1 a ${diaCorte} (até ontem)`}
      >
        <CalendarCheck2 size={14} />
        Parcial até dia {diaCorte}
      </button>
    </div>
  );
}
