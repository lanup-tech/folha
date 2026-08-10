"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { axisTick, ChartTooltip, GRIDLINE, SERIES } from "./chart-bits";

export interface MotivoDatum {
  motivo: string;
  horas: number;
  treatment: "ABONADO" | "DESCONSIDERAR" | "JUSTIFICADO";
}

const colorByTreatment: Record<MotivoDatum["treatment"], string> = {
  ABONADO: SERIES[0],
  DESCONSIDERAR: SERIES[1],
  JUSTIFICADO: SERIES[2],
};

const fmtHours = (v: number) => `${Math.round(v)} h`;

export function TopMotivosChart({ data }: { data: MotivoDatum[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={30 * data.length + 40}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 56, bottom: 0, left: 8 }}
        >
          <CartesianGrid horizontal={false} stroke={GRIDLINE} />
          <XAxis
            type="number"
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmtHours}
          />
          <YAxis
            type="category"
            dataKey="motivo"
            tick={{ ...axisTick, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={196}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={<ChartTooltip format={fmtHours} />}
          />
          <Bar dataKey="horas" name="Horas" barSize={14} radius={[0, 4, 4, 0]}>
            {data.map((d) => (
              <Cell key={d.motivo} fill={colorByTreatment[d.treatment]} />
            ))}
            <LabelList
              dataKey="horas"
              position="right"
              formatter={fmtHours}
              style={{ fill: "#17171c", fontSize: 11, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-1 flex gap-4 pl-2 text-xs text-[var(--ink-secondary)]">
        {(["ABONADO", "DESCONSIDERAR", "JUSTIFICADO"] as const).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: colorByTreatment[t] }}
            />
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}
