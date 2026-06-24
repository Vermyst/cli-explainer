/**
 * components/DailyChart.jsx
 * Area chart — errors per day over the last 7 days.
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg border border-border-bright px-3 py-2 font-mono text-xs">
      <div className="text-muted">{label}</div>
      <div className="text-green mt-1">{payload[0].value} errors</div>
    </div>
  );
};

export default function DailyChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-muted text-xs font-mono">
        no data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00ff9d" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#00ff9d" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#1e1e22" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#6b6b78", fontSize: 10, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6b6b78", fontSize: 10, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#2e2e35" }} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#00ff9d"
          strokeWidth={1.5}
          fill="url(#greenGrad)"
          dot={{ fill: "#00ff9d", r: 2, strokeWidth: 0 }}
          activeDot={{ fill: "#00ff9d", r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
