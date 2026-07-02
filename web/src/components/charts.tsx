"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_AXIS_STYLE, CHART_GRID, CHART_TOOLTIP_STYLE } from "@/lib/chart-theme";
import { SERIES } from "@/lib/palette";

interface Datum {
  label: string;
  value: number;
}

export function BarChartCard({
  data,
  color = SERIES[0],
  horizontal = false,
  height = 260,
  multicolor = false,
}: {
  data: Datum[];
  color?: string;
  horizontal?: boolean;
  height?: number;
  multicolor?: boolean;
}) {
  const cells = multicolor
    ? data.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)
    : null;

  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid
            horizontal={false}
            stroke={CHART_GRID}
            strokeDasharray="3 3"
          />
          <XAxis
            type="number"
            tick={CHART_AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tick={{ ...CHART_AXIS_STYLE, fill: "var(--text-secondary)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: CHART_GRID, opacity: 0.4 }} />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={16}>
            {cells}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -14, right: 8 }}>
        <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tick={{ ...CHART_AXIS_STYLE, fill: "var(--text-secondary)" }}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <YAxis
          tick={CHART_AXIS_STYLE}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={40}
        />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: CHART_GRID, opacity: 0.4 }} />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} barSize={40}>
          {cells}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChartCard({
  data,
  height = 260,
}: {
  data: Datum[];
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="60%"
            outerRadius="90%"
            paddingAngle={2}
            stroke="var(--surface)"
            strokeWidth={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={SERIES[i % SERIES.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex-1 space-y-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: SERIES[i % SERIES.length] }}
            />
            <span className="text-[var(--text-secondary)]">{d.label}</span>
            <span className="ml-auto font-medium tabular-nums">
              {d.value}
              <span className="ml-1 text-xs text-[var(--text-muted)]">
                {total ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
