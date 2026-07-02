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
import { EnvelhecimentoData } from "@/lib/types";
import { ModeloFilter } from "@/components/modelo-filter";
import { useState } from "react";

export default function EnvelhecimentoPage() {
  const [modelo, setModelo] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["envelhecimento", modelo],
    queryFn: () =>
      fetchMetric<EnvelhecimentoData>(
        "envelhecimento",
        modelo ? { modelo } : undefined,
      ),
  });

  return (
    <div>
      <PageHeader
        title="Prazo & Envelhecimento"
        subtitle="Idade da carteira por faixas de dias (meta: entrega em ~120 dias)"
        actions={<ModeloFilter value={modelo} onChange={setModelo} />}
      />
      {isLoading && <Loading />}
      {error && <ErrorState />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Tempo médio da carteira"
              value={data.tempoMedioDias}
              suffix="dias"
              accent="violet"
            />
            {data.faixas
              .filter((f) => ["121-180", "181-360", "360+"].includes(f.faixa))
              .map((f, i) => (
                <KpiCard
                  key={f.faixa}
                  label={`Faixa ${f.faixa} dias`}
                  value={f.clientes}
                  accent={(["amber", "orange", "red"] as const)[i]}
                />
              ))}
          </div>
          <Card>
            <ChartTitle>Clientes por faixa de tempo (dias desde a entrada)</ChartTitle>
            <BarChartCard
              data={data.faixas.map((f) => ({ label: f.faixa, value: f.clientes }))}
              multicolor
              height={240}
            />
          </Card>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data.porModelo.map((m) => (
              <Card key={m.modelo}>
                <ChartTitle>
                  {m.modelo} — tempo médio {m.tempoMedioDias}d
                </ChartTitle>
                <BarChartCard
                  data={m.faixas.map((f) => ({
                    label: f.faixa,
                    value: f.clientes,
                  }))}
                  color={SERIES[0]}
                  height={190}
                />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
