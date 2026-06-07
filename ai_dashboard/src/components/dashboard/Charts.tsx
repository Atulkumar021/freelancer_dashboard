import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axisStyle = { fontSize: 11, fill: "#9ca3af", fontFamily: "Inter, system-ui, sans-serif" };

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  fontSize: 12,
  fontFamily: "Inter, system-ui, sans-serif",
  boxShadow: "0 4px 16px -4px rgba(0,0,0,0.10)",
  padding: "8px 12px",
};

export function GoldGradientDef({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.25} />
        <stop offset="100%" stopColor="#c9a84c" stopOpacity={0.01} />
      </linearGradient>
      <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#b8960a" />
        <stop offset="50%" stopColor="#c9a84c" />
        <stop offset="100%" stopColor="#b8960a" />
      </linearGradient>
    </defs>
  );
}

export function TrendArea({
  data,
  dataKey,
  height = 240,
}: {
  data: any[];
  dataKey: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <GoldGradientDef id="trendArea" />
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke="url(#trendArea-line)"
          strokeWidth={2.5}
          fill="url(#trendArea)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MultiLine({
  data,
  series,
  height = 260,
}: {
  data: any[];
  series: { key: string; color: string; label: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2.25}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarsCompare({
  data,
  series,
  height = 280,
}: {
  data: any[];
  series: { key: string; color: string; label: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(243,244,246,0.6)" }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 240,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip contentStyle={tooltipStyle} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          stroke="white"
          strokeWidth={2}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PerformanceRadar({
  data,
  height = 280,
}: {
  data: { metric: string; value: number; benchmark: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="46%" margin={{ top: 20, right: 70, bottom: 20, left: 70 }}>
        <PolarGrid stroke="oklch(0.88 0.01 80)" />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fontSize: 11, fill: "oklch(0.35 0.01 80)", fontFamily: "Inter, system-ui, sans-serif" }}
          tickLine={false}
        />
        <PolarRadiusAxis tick={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Radar name="Benchmark" dataKey="benchmark" stroke="#1a1a1a" fill="#1a1a1a" fillOpacity={0.08} />
        <Radar name="You" dataKey="value" stroke="#a6905f" fill="#c4b07a" fillOpacity={0.45} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function GoalRadial({
  data,
  height = 220,
}: {
  data: { name: string; value: number; fill: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadialBarChart innerRadius="40%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
        <RadialBar background={{ fill: "#f3f4f6" }} dataKey="value" cornerRadius={6} />
        <Tooltip contentStyle={tooltipStyle} />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}
