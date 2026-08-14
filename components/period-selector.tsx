"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";

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

  function trocar(competencia: string) {
    // preserva a flag "parcial" ao mudar de mês
    const q = new URLSearchParams(params.toString());
    q.set("competencia", competencia);
    router.push(`${pathname}?${q.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-1.5 font-medium">
      <CalendarDays size={15} className="text-[var(--brand-primary)]" />
      <select
        value={value}
        onChange={(e) => trocar(e.target.value)}
        className="bg-transparent text-sm font-medium outline-none"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
