"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ListTodo, UserRound, Users } from "lucide-react";
import { BarChartCard } from "@/components/charts";
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
import { SERIES } from "@/lib/palette";
import { ResponsaveisData } from "@/lib/types";

export default function ResponsaveisPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["responsaveis"],
    queryFn: () => fetchMetric<ResponsaveisData>("responsaveis"),
  });

  const totalResp = data?.porResponsavel.length ?? 0;
  const totalAbertas = data?.porResponsavel.reduce((a, r) => a + r.abertas, 0) ?? 0;
  const totalConcluidas =
    data?.porResponsavel.reduce((a, r) => a + r.concluidas, 0) ?? 0;

  return (
    <div>
      <PageHeader
        title="Responsáveis"
        subtitle="Distribuição e eficiência da carteira por responsável (tarefas operacionais)"
      />
      {isLoading && <Loading />}
      {error && <ErrorState />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Responsáveis" value={totalResp} accent="blue" icon={Users} />
            <KpiCard label="Tarefas abertas" value={totalAbertas} accent="amber" icon={ListTodo} />
            <KpiCard label="Concluídas" value={totalConcluidas} accent="green" icon={CheckCircle2} />
            <KpiCard label="Sem responsável" value={data.semResponsavel} accent="red" icon={UserRound} />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <ChartTitle>Tarefas abertas por responsável</ChartTitle>
              <BarChartCard
                data={data.porResponsavel.map((r) => ({
                  label: r.responsavel,
                  value: r.abertas,
                }))}
                horizontal
                multicolor
                height={260}
              />
            </Card>
            <Card>
              <ChartTitle>Tempo médio parado por responsável (dias)</ChartTitle>
              <BarChartCard
                data={data.porResponsavel.map((r) => ({
                  label: r.responsavel,
                  value: r.tempoMedioParadoDias,
                }))}
                horizontal
                color={SERIES[5]}
                height={260}
              />
            </Card>
          </div>

          <Card className="overflow-x-auto p-0">
            <div className="p-5 pb-0">
              <ChartTitle>Desempenho por responsável</ChartTitle>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  <th className="px-5 py-2 font-medium">Responsável</th>
                  <th className="px-5 py-2 font-medium">Total</th>
                  <th className="px-5 py-2 font-medium">Abertas</th>
                  <th className="px-5 py-2 font-medium">Concluídas</th>
                  <th className="px-5 py-2 font-medium">% Concluídas</th>
                  <th className="px-5 py-2 font-medium">Clientes</th>
                  <th className="px-5 py-2 font-medium">Tempo médio parado</th>
                </tr>
              </thead>
              <tbody>
                {data.porResponsavel.map((r) => (
                  <tr key={r.responsavel} className="border-t">
                    <td className="px-5 py-3 font-medium">{r.responsavel}</td>
                    <td className="px-5 py-3 tabular-nums">{r.total}</td>
                    <td className="px-5 py-3 tabular-nums">{r.abertas}</td>
                    <td className="px-5 py-3 tabular-nums">{r.concluidas}</td>
                    <td className="px-5 py-3 tabular-nums">{r.pctConcluidas}%</td>
                    <td className="px-5 py-3 tabular-nums">{r.clientes}</td>
                    <td className="px-5 py-3 tabular-nums">{r.tempoMedioParadoDias}d</td>
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
