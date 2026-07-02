"use client";

import { useQuery } from "@tanstack/react-query";
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
import { JornadaData } from "@/lib/types";

export default function JornadaPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["jornada"],
    queryFn: () => fetchMetric<JornadaData>("jornada"),
  });

  return (
    <div>
      <PageHeader
        title="Jornada do Cliente"
        subtitle="Onde os clientes estão na jornada e onde estagnam"
      />
      {isLoading && <Loading />}
      {error && <ErrorState />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Etapa com maior concentração"
              value={data.maiorConcentracao?.clientes ?? 0}
              hint={data.maiorConcentracao?.etapa}
              accent="violet"
            />
            <KpiCard label="Finalizados" value={data.finalizados} accent="green" />
            {data.semEvolucao.slice(0, 2).map((s, i) => (
              <KpiCard
                key={s.dias}
                label={`Sem evolução ≥ ${s.dias}d`}
                value={s.clientes}
                accent={i === 0 ? "amber" : "orange"}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <ChartTitle>Clientes por etapa</ChartTitle>
              <BarChartCard
                data={data.porEtapa.map((e) => ({
                  label: e.etapa.replace(/^\d+\.\s*/, ""),
                  value: e.clientes,
                }))}
                horizontal
                height={300}
                multicolor
              />
            </Card>
            <Card className="lg:col-span-2">
              <ChartTitle>Sem evolução (janela de dias)</ChartTitle>
              <BarChartCard
                data={data.semEvolucao.map((s) => ({
                  label: `${s.dias}d`,
                  value: s.clientes,
                }))}
                color={SERIES[5]}
                height={300}
              />
            </Card>
          </div>
          <InfoNote>{data.avisos.semEvolucao}</InfoNote>
        </div>
      )}
    </div>
  );
}
