"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  Handshake,
  Trophy,
  Users,
} from "lucide-react";
import { BarChartCard, DonutChartCard } from "@/components/charts";
import {
  Card,
  ChartTitle,
  ErrorState,
  InfoNote,
  KpiCard,
  Loading,
  PageHeader,
} from "@/components/ui";
import { fetchMetric } from "@/lib/api";
import { ComercialData } from "@/lib/types";

export default function ComercialPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["comercial"],
    queryFn: () => fetchMetric<ComercialData>("comercial"),
  });

  const sum = (k: "leads" | "agendamentos" | "reunioes" | "sv" | "projetos" | "holdings") =>
    data?.porSeminario.reduce((acc, s) => acc + s[k], 0) ?? 0;

  const vendas = sum("sv") + sum("projetos") + sum("holdings");

  return (
    <div>
      <PageHeader
        title="Comercial por Seminário"
        subtitle="Volume e conversão do funil por origem de seminário"
      />
      {isLoading && <Loading />}
      {error && <ErrorState />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Leads" value={sum("leads")} accent="blue" icon={Users} />
            <KpiCard label="Agendamentos" value={sum("agendamentos")} accent="violet" icon={CalendarCheck} />
            <KpiCard label="Reuniões" value={sum("reunioes")} accent="amber" icon={Handshake} />
            <KpiCard label="Vendas (SV+Proj+Hold)" value={vendas} accent="green" icon={Trophy} />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <ChartTitle>Leads por seminário</ChartTitle>
              <BarChartCard
                data={data.porSeminario.map((s) => ({
                  label: s.seminario,
                  value: s.leads,
                }))}
                multicolor
                height={240}
              />
            </Card>
            <Card>
              <ChartTitle>Mix de vendas por produto</ChartTitle>
              <DonutChartCard
                data={[
                  { label: "SV", value: sum("sv") },
                  { label: "Projetos", value: sum("projetos") },
                  { label: "Holdings", value: sum("holdings") },
                ]}
                height={240}
              />
            </Card>
          </div>

          <Card className="overflow-x-auto p-0">
            <div className="p-5 pb-0">
              <ChartTitle>Funil por seminário</ChartTitle>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  <th className="px-5 py-2 font-medium">Seminário</th>
                  <th className="px-5 py-2 font-medium">Leads</th>
                  <th className="px-5 py-2 font-medium">Agend.</th>
                  <th className="px-5 py-2 font-medium">Reuniões</th>
                  <th className="px-5 py-2 font-medium">SV</th>
                  <th className="px-5 py-2 font-medium">Projetos</th>
                  <th className="px-5 py-2 font-medium">Holdings</th>
                  <th className="px-5 py-2 font-medium">Conv. total</th>
                </tr>
              </thead>
              <tbody>
                {data.porSeminario.map((s) => (
                  <tr key={s.seminario} className="border-t">
                    <td className="px-5 py-3 font-medium">{s.seminario}</td>
                    <td className="px-5 py-3 tabular-nums">{s.leads}</td>
                    <td className="px-5 py-3 tabular-nums">{s.agendamentos}</td>
                    <td className="px-5 py-3 tabular-nums">{s.reunioes}</td>
                    <td className="px-5 py-3 tabular-nums">{s.sv}</td>
                    <td className="px-5 py-3 tabular-nums">{s.projetos}</td>
                    <td className="px-5 py-3 tabular-nums">{s.holdings}</td>
                    <td className="px-5 py-3 tabular-nums">
                      {s.conversoes.totalAteHolding}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <InfoNote>{data.avisos.dados}</InfoNote>
        </div>
      )}
    </div>
  );
}
