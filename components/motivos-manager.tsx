"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import clsx from "clsx";
import type { Motivo, MotivoTreatment } from "@/lib/types";

const treatments: MotivoTreatment[] = ["ABONADO", "JUSTIFICADO", "DESCONSIDERAR"];

const treatmentStyle: Record<MotivoTreatment, string> = {
  ABONADO: "bg-[#e8f1fb] text-[#1c5cab]",
  JUSTIFICADO: "bg-[#e4f5ee] text-[#0b6e4d]",
  DESCONSIDERAR: "bg-black/5 text-[var(--ink-secondary)]",
};

export function MotivosManager({ initial }: { initial: Motivo[] }) {
  const [motivos, setMotivos] = useState<Motivo[]>(initial);
  const [newName, setNewName] = useState("");
  const [newTreatment, setNewTreatment] = useState<MotivoTreatment>("ABONADO");

  function addMotivo() {
    const name = newName.trim().toUpperCase();
    if (!name || motivos.some((m) => m.name === name)) return;
    setMotivos([{ name, treatment: newTreatment, active: true }, ...motivos]);
    setNewName("");
  }

  function setTreatment(name: string, treatment: MotivoTreatment) {
    setMotivos((ms) => ms.map((m) => (m.name === name ? { ...m, treatment } : m)));
  }

  function toggleActive(name: string) {
    setMotivos((ms) => ms.map((m) => (m.name === name ? { ...m, active: !m.active } : m)));
  }

  return (
    <div className="card max-w-4xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-black/10 p-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addMotivo()}
          placeholder="Novo motivo (ex.: ATESTADO PSICOLÓGICO)"
          className="w-80 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-primary)]"
        />
        <select
          value={newTreatment}
          onChange={(e) => setNewTreatment(e.target.value as MotivoTreatment)}
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
        >
          {treatments.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <button
          onClick={addMotivo}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={15} /> Adicionar
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-[var(--ink-muted)]">
            <th className="px-4 py-2 font-medium">Motivo</th>
            <th className="px-4 py-2 font-medium">Tratamento no cálculo</th>
            <th className="px-4 py-2 text-right font-medium">Ativo</th>
          </tr>
        </thead>
        <tbody>
          {motivos.map((m) => (
            <tr
              key={m.name}
              className={clsx("border-b border-black/5", !m.active && "opacity-45")}
            >
              <td className="px-4 py-2 font-medium">{m.name}</td>
              <td className="px-4 py-2">
                <div className="flex gap-1">
                  {treatments.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTreatment(m.name, t)}
                      className={clsx(
                        "rounded-md px-2 py-1 text-[11px] font-semibold transition-opacity",
                        treatmentStyle[t],
                        m.treatment === t ? "ring-1 ring-current" : "opacity-40 hover:opacity-80"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </td>
              <td className="px-4 py-2 text-right">
                <input
                  type="checkbox"
                  checked={m.active}
                  onChange={() => toggleActive(m.name)}
                  className="h-4 w-4 accent-[var(--brand-primary)]"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
