"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { axisTick, ChartTooltip, GRIDLINE, SERIES } from "./chart-bits";

export interface CompanyAbsDatum {
  name: string;
  absPct: number; // 0..100
}

export function AbsByCompanyChart({ data }: { data: CompanyAbsDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 8 }}>
        <CartesianGrid horizontal={false} stroke={GRIDLINE} />
        <XAxis
          type="number"
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
          domain={[0, (max: number) => Math.max(5, Math.ceil(max))]}
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
          content={<ChartTooltip format={(v) => `${v.toFixed(2).replace(".", ",")}%`} />}
        />
        <Bar
          dataKey="absPct"
          name="ABS %"
          fill={SERIES[0]}
          barSize={18}
          radius={[0, 4, 4, 0]}
        >
          <LabelList
            dataKey="absPct"
            position="right"
            formatter={(v: number) => `${v.toFixed(2).replace(".", ",")}%`}
            style={{ fill: "#17171c", fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
