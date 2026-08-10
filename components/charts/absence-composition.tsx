"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { axisTick, ChartTooltip, GRIDLINE, SERIES, SURFACE } from "./chart-bits";

export interface CompositionDatum {
  name: string;
  injustificada: number; // horas
  abonada: number;
  justificada: number;
}

const fmtHours = (v: number) => `${Math.round(v)} h`;

export function AbsenceCompositionChart({ data }: { data: CompositionDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
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
          dataKey="name"
          tick={{ ...axisTick, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={104}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          content={<ChartTooltip format={fmtHours} />}
        />
        <Legend
          iconType="square"
          iconSize={10}
          wrapperStyle={{ fontSize: 12, color: "#52514e" }}
        />
        <Bar dataKey="injustificada" name="Injustificada" stackId="a" fill={SERIES[0]} barSize={18} stroke={SURFACE} strokeWidth={2} />
        <Bar dataKey="abonada" name="Abonada" stackId="a" fill={SERIES[1]} barSize={18} stroke={SURFACE} strokeWidth={2} />
        <Bar dataKey="justificada" name="Justificada" stackId="a" fill={SERIES[2]} barSize={18} stroke={SURFACE} strokeWidth={2} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
