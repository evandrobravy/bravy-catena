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
  SortableTable,
} from "@/components/ui";
import { fetchMetric } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { CloserData } from "@/lib/types";
import { useDrill } from "@/components/drill-drawer";

export default function CloserPage() {
  const { openDrill } = useDrill();
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
            <KpiCard
              label="Reuniões"
              value={reunioes}
              accent="blue"
              icon={Handshake}
              onClick={() =>
                openDrill({ key: "closer.reunioes", titulo: "Reuniões realizadas" })
              }
            />
            <KpiCard
              label="Fechamentos"
              value={fechamentos}
              accent="green"
              icon={Trophy}
              onClick={() =>
                openDrill({ key: "closer.fechamentos", titulo: "Fechamentos" })
              }
            />
            <KpiCard
              label="Taxa de fechamento"
              value={taxa}
              suffix="%"
              accent="amber"
              icon={Target}
              onClick={() =>
                openDrill({
                  key: "reunioes.com-fechamento",
                  titulo: "Reuniões com fechamento",
                })
              }
            />
            <KpiCard
              label="Faturamento"
              value={formatCurrency(faturamento)}
              accent="emerald"
              icon={DollarSign}
              onClick={() =>
                openDrill({ key: "closer.faturamento", titulo: "Leads com valor" })
              }
            />
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
              onItemClick={(d) =>
                openDrill({
                  key: "closer.faturamento",
                  params: { closer: d.label },
                  titulo: `Faturamento — ${d.label}`,
                })
              }
            />
          </Card>

          <Card className="overflow-x-auto p-0">
            <div className="p-5 pb-1">
              <ChartTitle>Desempenho por closer</ChartTitle>
              <p className="-mt-2 mb-3 text-xs text-[var(--text-muted)]">
                Clique em qualquer coluna para reordenar (volume, conversão,
                ticket).
              </p>
            </div>
            <SortableTable
              rows={data.porCloser}
              rowKey={(c) => c.closer}
              initialSort="faturamento"
              onRowClick={(c) =>
                openDrill({
                  key: "closer.leads",
                  params: { closer: c.closer },
                  titulo: `Leads — ${c.closer}`,
                })
              }
              columns={[
                { key: "closer", label: "Closer", text: true },
                { key: "reunioes", label: "Reuniões" },
                { key: "fechamentos", label: "Fechamentos" },
                {
                  key: "taxaFechamento",
                  label: "Taxa",
                  render: (c) => `${c.taxaFechamento}%`,
                },
                { key: "sv", label: "SV" },
                { key: "projetos", label: "Projetos" },
                { key: "holdings", label: "Holdings" },
                {
                  key: "faturamento",
                  label: "Faturamento",
                  render: (c) => formatCurrency(c.faturamento),
                },
                {
                  key: "ticketMedio",
                  label: "Ticket médio",
                  render: (c) => formatCurrency(c.ticketMedio),
                },
              ]}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
