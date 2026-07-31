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
import { marcoIdFromLabel } from "@/lib/drill";
import { SERIES } from "@/lib/palette";
import { JornadaData } from "@/lib/types";
import { ModeloFilter } from "@/components/modelo-filter";
import { useDrill } from "@/components/drill-drawer";
import { useState } from "react";

export default function JornadaPage() {
  const [modelo, setModelo] = useState<string | null>(null);
  const { openDrill } = useDrill();
  const base = modelo ? { modelo } : {};
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
              onClick={
                data.maiorConcentracao
                  ? () =>
                      openDrill({
                        key: "jornada.etapa",
                        params: {
                          ...base,
                          etapa: data.maiorConcentracao!.etapa,
                          marcoId: data.maiorConcentracao!.marco
                            ? marcoIdFromLabel(data.maiorConcentracao!.marco)
                            : 0,
                        },
                        titulo: `Tarefas abertas — ${data.maiorConcentracao!.etapa}`,
                        diasLabel: "Dias parado",
                      })
                  : undefined
              }
            />
            <KpiCard
              label="Finalizados"
              value={data.finalizados}
              accent="green"
              onClick={() =>
                openDrill({
                  key: "jornada.finalizados",
                  params: base,
                  titulo: "Etapas todas concluídas (aguard. encerramento)",
                  diasLabel: "Dias na carteira",
                })
              }
            />
            <KpiCard
              label="Sem tarefas vinculadas"
              value={data.semTarefasVinculadas}
              accent="amber"
              onClick={() =>
                openDrill({
                  key: "jornada.sem-tarefas",
                  params: base,
                  titulo: "Sem tarefas vinculadas",
                  diasLabel: "Dias na carteira",
                })
              }
            />
            {data.semEvolucao.slice(2, 3).map((s) => (
              <KpiCard
                key={s.dias}
                label={`Sem evolução ≥ ${s.dias}d`}
                value={s.clientes}
                accent="orange"
                onClick={() =>
                  openDrill({
                    key: "jornada.sem-evolucao",
                    params: { ...base, bucketDias: s.dias },
                    titulo: `Sem evolução há ${s.dias}+ dias`,
                    diasLabel: "Dias sem evolução",
                  })
                }
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
                  meta: { marcoId: e.marcoId },
                }))}
                horizontal
                height={300}
                multicolor
                onItemClick={(d) =>
                  openDrill({
                    key: "jornada.marco",
                    params: { ...base, marcoId: d.meta?.marcoId },
                    titulo: `Clientes no marco — ${d.label}`,
                    diasLabel: "Dias sem evolução",
                  })
                }
              />
            </Card>
            <Card className="lg:col-span-2">
              <ChartTitle>Sem evolução (janela de dias)</ChartTitle>
              <BarChartCard
                data={data.semEvolucao.map((s) => ({
                  label: `${s.dias}d`,
                  value: s.clientes,
                  meta: { bucketDias: s.dias },
                }))}
                color={SERIES[5]}
                height={300}
                onItemClick={(d) =>
                  openDrill({
                    key: "jornada.sem-evolucao",
                    params: { ...base, bucketDias: d.meta?.bucketDias },
                    titulo: `Sem evolução há ${d.label}+`,
                    diasLabel: "Dias sem evolução",
                  })
                }
              />
            </Card>
          </div>
          <Card>
            <ChartTitle>Detalhe: clientes com tarefa aberta por etapa (top 12)</ChartTitle>
            <BarChartCard
              data={data.porEtapa.slice(0, 12).map((e) => ({
                label: e.etapa,
                value: e.clientes,
                meta: {
                  etapa: e.etapa,
                  marcoId: e.marco ? marcoIdFromLabel(e.marco) : 0,
                },
              }))}
              horizontal
              multicolor
              height={340}
              onItemClick={(d) =>
                openDrill({
                  key: "jornada.etapa",
                  params: { ...base, etapa: d.meta?.etapa, marcoId: d.meta?.marcoId },
                  titulo: `Tarefas abertas — ${d.label}`,
                  diasLabel: "Dias parado",
                })
              }
            />
          </Card>
          <InfoNote>{data.avisos.semEvolucao}</InfoNote>
        </div>
      )}
    </div>
  );
}
