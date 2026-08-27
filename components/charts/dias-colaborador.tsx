"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { axisTick, GRIDLINE, SERIES, SURFACE } from "./chart-bits";
import { formatDuration } from "@/lib/format";

export interface DiaEspelho {
  dia: string;
  planejado: number;
  trabalhado: number;
  falta: number;
  atraso: number;
  abonado: number;
  extra: number;
}

/**
 * Dia a dia do colaborador na competência — o último nível do aprofundamento.
 *
 * Mostra quanto foi cumprido de cada jornada: a barra é a fração trabalhada e a
 * cor sinaliza o que aconteceu no dia (cheio, atraso, ausência). Assim o gestor
 * enxerga o padrão: falta concentrada num período, atrasos recorrentes ou
 * afastamento contínuo.
 */
export function DiasColaborador({ dias }: { dias: DiaEspelho[] }) {
  if (!dias.length) {
    return (
      <p className="rounded-[var(--radius)] bg-[var(--surface-sunken)] px-4 py-6 text-center text-xs text-[var(--ink-muted)]">
        Sem detalhe diário para esta competência.
      </p>
    );
  }

  const dados = dias.map((d) => {
    const cumprido = d.planejado > 0 ? d.trabalhado / d.planejado : 0;
    return {
      ...d,
      rotulo: d.dia.slice(8, 10),
      cumpridoPct: Math.round(cumprido * 100),
      cor:
        cumprido >= 0.98
          ? SERIES[2] // dia cheio
          : cumprido <= 0.02
            ? "var(--status-critical)" // ausência integral
            : SERIES[1], // parcial
    };
  });

  return (
    <div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={dados} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
          <CartesianGrid vertical={false} stroke={GRIDLINE} />
          <XAxis
            dataKey="rotulo"
            tick={{ ...axisTick, fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            interval={dados.length > 22 ? 1 : 0}
          />
          <YAxis
            tick={{ ...axisTick, fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof dados)[number];
              const [ano, mes, dia] = d.dia.split("-");
              return (
                <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-sm">
                  <p className="mb-1 font-semibold">
                    {dia}/{mes}/{ano}
                  </p>
                  <Linha rotulo="Previsto" valor={formatDuration(d.planejado)} />
                  <Linha rotulo="Trabalhado" valor={formatDuration(d.trabalhado)} />
                  {d.falta > 0 && <Linha rotulo="Falta" valor={formatDuration(d.falta)} />}
                  {d.atraso > 0 && <Linha rotulo="Atraso" valor={formatDuration(d.atraso)} />}
                  {d.abonado > 0 && <Linha rotulo="Abonado" valor={formatDuration(d.abonado)} />}
                  {d.extra > 0 && <Linha rotulo="Extra" valor={formatDuration(d.extra)} />}
                </div>
              );
            }}
          />
          <Bar dataKey="cumpridoPct" radius={[3, 3, 0, 0]} stroke={SURFACE} strokeWidth={1}>
            {dados.map((d) => (
              <Cell key={d.dia} fill={d.cor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-[var(--ink-secondary)]">
        <Legenda cor={SERIES[2]} texto="Jornada cumprida" />
        <Legenda cor={SERIES[1]} texto="Parcial" />
        <Legenda cor="var(--status-critical)" texto="Ausência integral" />
      </div>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <span className="text-[var(--ink-secondary)]">{rotulo}</span>
      <span className="font-medium tabular">{valor}</span>
    </div>
  );
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-sm" style={{ background: cor }} />
      {texto}
    </span>
  );
}
