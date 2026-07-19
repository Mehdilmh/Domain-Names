"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

export interface BacktestPoint {
  actual: number;
  predicted: number;
  domain: string;
}

/** Predicted-vs-actual scatter with a perfect-prediction reference line. */
export function BacktestChart({ points }: { points: BacktestPoint[] }) {
  const max = Math.max(1000, ...points.map((p) => Math.max(p.actual, p.predicted)));

  return (
    <ResponsiveContainer width="100%" height={380}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <CartesianGrid stroke="#1F2C28" />
        <XAxis
          type="number"
          dataKey="actual"
          name="Actual"
          scale="log"
          domain={[100, max]}
          tickFormatter={(v) => `$${Intl.NumberFormat("en", { notation: "compact" }).format(v)}`}
          tick={{ fill: "#8A9C96", fontSize: 11 }}
          stroke="#1F2C28"
        />
        <YAxis
          type="number"
          dataKey="predicted"
          name="Predicted"
          scale="log"
          domain={[100, max]}
          tickFormatter={(v) => `$${Intl.NumberFormat("en", { notation: "compact" }).format(v)}`}
          tick={{ fill: "#8A9C96", fontSize: 11 }}
          stroke="#1F2C28"
        />
        <ReferenceLine
          segment={[
            { x: 100, y: 100 },
            { x: max, y: max },
          ]}
          stroke="#E8B44A"
          strokeDasharray="4 4"
          ifOverflow="extendDomain"
        />
        <Tooltip
          cursor={{ stroke: "#14B87A", strokeOpacity: 0.3 }}
          contentStyle={{
            background: "#131A18",
            border: "1px solid #1F2C28",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#ECF2F0" }}
          formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name]}
        />
        <Scatter data={points} fill="#14B87A" fillOpacity={0.55} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
