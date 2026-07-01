import { useMemo } from "react";
import { Activity, Brain, Cpu, Sparkles, TrendingUp, Zap } from "lucide-react";
import { PageHeader, Panel, SectionTitle } from "../Primitives";
import { StatCard } from "../StatCard";
import { BarsCompare, DonutChart, MultiLine, TrendArea } from "../Charts";
import { Button } from "@/components/ui/button";

const months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];

const palettes = [
  ["#c4b07a", "#1a1a1a", "#a6905f", "#6b6b6b"],
  ["#a6905f", "#2a2a2a", "#c4b07a", "#888"],
  ["#1a1a1a", "#c4b07a", "#a6905f", "#444"],
];

export function GenericPage({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: string[];
}) {
  const seed = title.length % 5;

  const kpis = useMemo(() => [
    { label: "Total Value", value: `₹${(2.4 + seed * 0.3).toFixed(2)} Cr`, previous: `₹${(2.1 + seed * 0.3).toFixed(2)} Cr`, deltaPct: 12.4, highlight: true },
    { label: "MTD Activity", value: `${184 + seed * 12}`, previous: `${168 + seed * 10}`, deltaPct: 9.5 },
    { label: "Pending Items", value: `${24 - seed}`, previous: `${32 - seed}`, deltaPct: -22.1, invertGood: true },
    { label: "Auto-resolved", value: `${78 + seed}%`, previous: `${68 + seed}%`, deltaPct: 14.7 },
  ], [seed]);

  const trend = useMemo(() => months.map((m, i) => ({
    name: m,
    value: 320 + i * 22 + Math.round(Math.sin(i + seed) * 30),
    series2: Math.round((320 + i * 22) * 0.6 + Math.sin(i) * 20),
    series3: Math.round((320 + i * 22) * 0.35 + Math.cos(i) * 12),
  })), [seed]);

  const compare = useMemo(() => months.map((m, i) => ({
    name: m,
    Current: 280 + i * 18 + Math.round(Math.cos(i + seed) * 22),
    Previous: 240 + i * 14 + Math.round(Math.sin(i) * 18),
  })), [seed]);

  const mix = useMemo(() => {
    const p = palettes[seed % palettes.length];
    return [
      { name: "Category A", value: 38 + seed, color: p[0] },
      { name: "Category B", value: 26, color: p[1] },
      { name: "Category C", value: 18, color: p[2] },
      { name: "Category D", value: 18 - seed, color: p[3] },
    ];
  }, [seed]);


  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={title}
        subtitle={description}
        className="mb-2 pb-3"
        actions={
          <>
            <Button variant="outline" className="h-8 text-xs hidden sm:inline-flex">
              <Sparkles className="size-3.5 mr-1.5 text-gold" /> Ask AI
            </Button>
            <Button className="h-8 text-xs bg-gradient-gold text-black hover:opacity-90 shadow-gold">
              <Activity className="size-3.5 mr-1.5" /> Live Sync
            </Button>
          </>
        }
      />

      {/* AI status strip */}
      <Panel className="relative overflow-hidden bg-gradient-dark text-white border-transparent">
        <div className="absolute inset-0 grid-bg opacity-25 pointer-events-none" />
        <div className="absolute -right-20 -top-20 size-64 rounded-full bg-gradient-gold opacity-15 blur-md pointer-events-none" />
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Brain, label: "AI Confidence", value: "96.2%" },
            { icon: Cpu, label: "Models Active", value: "4 / 4" },
            { icon: Zap, label: "Events / hr", value: `${120 + seed * 8}` },
            { icon: TrendingUp, label: "Trend", value: "Improving" },
          ].map((s) => {
            const I = s.icon;
            return (
              <div key={s.label} className="glass-gold rounded-xl p-3">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-gold-soft">
                  <I className="size-3" /> {s.label}
                </div>
                <div className="font-display text-xl text-white mt-1">{s.value}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="animate-fade-in">
            <StatCard {...k} />
          </div>
        ))}
      </section>

      {/* Charts */}
      <section className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <Panel className="lg:col-span-2">
          <SectionTitle title="Performance Trend" subtitle="Last 6 months · ₹ Lakhs" />
          <TrendArea data={trend} dataKey="value" height={280} />
        </Panel>
        <Panel>
          <SectionTitle title="Distribution" subtitle="Share by category" />
          <DonutChart data={mix} height={220} />
          <div className="mt-3 space-y-1.5">
            {mix.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
                  {p.name}
                </span>
                <span className="font-medium font-display">{p.value}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <Panel>
          <SectionTitle title="Period Comparison" subtitle="Current vs previous" />
          <BarsCompare
            data={compare}
            series={[
              { key: "Current", color: "#c4b07a", label: "Current" },
              { key: "Previous", color: "#1a1a1a", label: "Previous" },
            ]}
            height={240}
          />
        </Panel>
        <Panel className="lg:col-span-2">
          <SectionTitle title="Multi-Series Analysis" subtitle="Key metrics over time" />
          <MultiLine
            data={trend}
            series={[
              { key: "value", color: "#c4b07a", label: "Primary" },
              { key: "series2", color: "#1a1a1a", label: "Secondary" },
              { key: "series3", color: "oklch(0.55 0.13 150)", label: "Tertiary" },
            ]}
            height={240}
          />
        </Panel>
      </section>

      {/* Module sections */}
      <section className="grid md:grid-cols-2 gap-4 sm:gap-6">
        {sections.map((s, i) => (
          <Panel key={s} className="group hover:shadow-gold transition-shadow relative overflow-hidden">
            <div className="absolute -right-8 -top-8 size-24 rounded-full bg-gradient-gold opacity-0 group-hover:opacity-15 blur-md transition-opacity" />
            <SectionTitle
              title={s}
              subtitle="Cards · Charts · Tables · Drill-down · Export"
              action={
                <span className="text-[10px] uppercase tracking-wider text-gold font-medium px-2 py-1 rounded-full bg-gold/10">
                  Module {i + 1}
                </span>
              }
            />
            <div className="relative h-32 rounded-lg bg-gradient-gold-soft border border-dashed border-gold/30 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 grid-bg opacity-40" />
              <div className="relative text-center">
                <Brain className="size-6 mx-auto text-gold mb-1" />
                <div className="text-xs text-muted-foreground">AI-powered visualization</div>
              </div>
            </div>
          </Panel>
        ))}
      </section>
    </div>
  );
}
