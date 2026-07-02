"use client";

import { useQuery } from "@tanstack/react-query";
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
import { SERIES } from "@/lib/palette";
import { ProgressoData } from "@/lib/types";
import { ModeloFilter } from "@/components/modelo-filter";
import { useState } from "react";

export default function ProgressoPage() {
  const [modelo, setModelo] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["progresso", modelo],
    queryFn: () =>
      fetchMetric<ProgressoData>("progresso", modelo ? { modelo } : undefined),
  });

  return (
    <div>
      <PageHeader
        title="Progresso"
        subtitle="Distribuição do progresso (% do checklist da holding)"
        actions={<ModeloFilter value={modelo} onChange={setModelo} />}
      />
      {isLoading && <Loading />}
      {error && <ErrorState />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {data.faixas.map((f, i) => (
              <KpiCard
                key={f.faixa}
                label={`Progresso ${f.faixa}%`}
                value={f.clientes}
                accent={(["red", "orange", "amber", "green"] as const)[i]}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <ChartTitle>Clientes por faixa de progresso</ChartTitle>
              <BarChartCard
                data={data.faixas.map((f) => ({ label: `${f.faixa}%`, value: f.clientes }))}
                multicolor
                height={240}
              />
            </Card>
            <Card>
              <ChartTitle>Progresso médio por modelo</ChartTitle>
              <BarChartCard
                data={data.progressoMedioPorModelo.map((m) => ({
                  label: m.modelo,
                  value: m.progressoMedio,
                }))}
                color={SERIES[1]}
                height={240}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
