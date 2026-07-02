"use client";

import { useQuery } from "@tanstack/react-query";
import { DollarSign, Handshake, Target, Trophy } from "lucide-react";
import { BarChartCard } from "@/components/charts";
import {
  Card,
  ChartTitle,
  ErrorState,
  KpiCard,
  Loading,
  PageHeader,
} from "@/components/ui";
import { fetchMetric } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { CloserData } from "@/lib/types";

export default function CloserPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["closer"],
    queryFn: () => fetchMetric<CloserData>("closer"),
  });

  const reunioes = data?.porCloser.reduce((a, c) => a + c.reunioes, 0) ?? 0;
  const fechamentos = data?.porCloser.reduce((a, c) => a + c.fechamentos, 0) ?? 0;
  const faturamento = data?.porCloser.reduce((a, c) => a + c.faturamento, 0) ?? 0;
  const taxa = reunioes ? Math.round((fechamentos / reunioes) * 1000) / 10 : 0;

  return (
    <div>
      <PageHeader
        title="Closer"
        subtitle="Desempenho comercial individual por closer"
      />
      {isLoading && <Loading />}
      {error && <ErrorState />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Reuniões" value={reunioes} accent="blue" icon={Handshake} />
            <KpiCard label="Fechamentos" value={fechamentos} accent="green" icon={Trophy} />
            <KpiCard label="Taxa de fechamento" value={taxa} suffix="%" accent="amber" icon={Target} />
            <KpiCard label="Faturamento" value={formatCurrency(faturamento)} accent="emerald" icon={DollarSign} />
          </div>

          <Card>
            <ChartTitle>Faturamento por closer</ChartTitle>
            <BarChartCard
              data={data.porCloser.map((c) => ({
                label: c.closer,
                value: c.faturamento,
              }))}
              horizontal
              multicolor
              height={200}
            />
          </Card>

          <Card className="overflow-x-auto p-0">
            <div className="p-5 pb-0">
              <ChartTitle>Desempenho por closer</ChartTitle>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  <th className="px-5 py-2 font-medium">Closer</th>
                  <th className="px-5 py-2 font-medium">Reuniões</th>
                  <th className="px-5 py-2 font-medium">Fechamentos</th>
                  <th className="px-5 py-2 font-medium">Taxa</th>
                  <th className="px-5 py-2 font-medium">SV</th>
                  <th className="px-5 py-2 font-medium">Projetos</th>
                  <th className="px-5 py-2 font-medium">Holdings</th>
                  <th className="px-5 py-2 font-medium">Faturamento</th>
                  <th className="px-5 py-2 font-medium">Ticket médio</th>
                </tr>
              </thead>
              <tbody>
                {data.porCloser.map((c) => (
                  <tr key={c.closer} className="border-t">
                    <td className="px-5 py-3 font-medium">{c.closer}</td>
                    <td className="px-5 py-3 tabular-nums">{c.reunioes}</td>
                    <td className="px-5 py-3 tabular-nums">{c.fechamentos}</td>
                    <td className="px-5 py-3 tabular-nums">{c.taxaFechamento}%</td>
                    <td className="px-5 py-3 tabular-nums">{c.sv}</td>
                    <td className="px-5 py-3 tabular-nums">{c.projetos}</td>
                    <td className="px-5 py-3 tabular-nums">{c.holdings}</td>
                    <td className="px-5 py-3 tabular-nums">{formatCurrency(c.faturamento)}</td>
                    <td className="px-5 py-3 tabular-nums">{formatCurrency(c.ticketMedio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
