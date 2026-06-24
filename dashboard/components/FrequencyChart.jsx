/**
 * components/FrequencyChart.jsx
 * Horizontal bar chart — most frequently failing commands.
 * Uses Recharts with terminal-native styling.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-bg border border-border-bright px-3 py-2 font-mono text-xs">
      <div className="text-cream">{d.command}</div>
      <div className="text-green mt-1">{d.count}× triggered</div>
      {d.successRate != null && (
        <div className="text-muted">{d.successRate}% fix rate</div>
      )}
    </div>
  );
};

export default function FrequencyChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-muted text-xs font-mono">
        no data yet
      </div>
    );
  }

  // Truncate long command names for the axis
  const formatted = data.map((d) => ({
    ...d,
    label: d.command.length > 20 ? d.command.slice(0, 18) + "…" : d.command,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={formatted}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="2 4" horizontal={false} stroke="#1e1e22" />
        <XAxis
          type="number"
          tick={{ fill: "#6b6b78", fontSize: 10, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={110}
          tick={{ fill: "#f0e6d3", fontSize: 10, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff08" }} />
        <Bar dataKey="count" radius={0} maxBarSize={18}>
          {formatted.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.successRate >= 80 ? "#00ff9d" : entry.successRate >= 50 ? "#ffcc00" : "#ff4d6d"}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
