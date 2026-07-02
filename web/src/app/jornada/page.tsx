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
import { ModeloFilter } from "@/components/modelo-filter";
import { useState } from "react";

export default function JornadaPage() {
  const [modelo, setModelo] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["jornada", modelo],
    queryFn: () =>
      fetchMetric<JornadaData>("jornada", modelo ? { modelo } : undefined),
  });

  return (
    <div>
      <PageHeader
        title="Jornada do Cliente"
        subtitle="Onde os clientes estão na jornada e onde estagnam"
        actions={<ModeloFilter value={modelo} onChange={setModelo} />}
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
            <KpiCard label="Sem tarefas vinculadas" value={data.semTarefasVinculadas} accent="amber" />
            {data.semEvolucao.slice(2, 3).map((s) => (
              <KpiCard
                key={s.dias}
                label={`Sem evolução ≥ ${s.dias}d`}
                value={s.clientes}
                accent="orange"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <ChartTitle>Clientes por marco (visão macro)</ChartTitle>
              <BarChartCard
                data={data.porMarco.map((e) => ({
                  label: e.marco.replace(/^\d+\.\s*/, ""),
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
          <Card>
            <ChartTitle>Detalhe: clientes com tarefa aberta por etapa (top 12)</ChartTitle>
            <BarChartCard
              data={data.porEtapa.slice(0, 12).map((e) => ({
                label: e.etapa,
                value: e.clientes,
              }))}
              horizontal
              multicolor
              height={340}
            />
          </Card>
          <InfoNote>{data.avisos.semEvolucao}</InfoNote>
        </div>
      )}
    </div>
  );
}
