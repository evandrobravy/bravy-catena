"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Clock, DoorOpen, Layers, UserRound, Users } from "lucide-react";
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
import { SERIES } from "@/lib/palette";
import { GargalosData } from "@/lib/types";

export default function GargalosPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["gargalos"],
    queryFn: () => fetchMetric<GargalosData>("gargalos"),
  });

  const etapaTop = data?.porEtapa[0];
  const tarefaTop = data?.porTarefa[0];
  const origem = (o: string) =>
    data?.tempoParadoPorOrigem.find((x) => x.origem === o);
  const ACCENT_ORIGEM: Record<string, "amber" | "blue" | "violet"> = {
    cliente: "amber",
    interno: "blue",
    orgao_cartorio: "violet",
  };

  return (
    <div>
      <PageHeader
        title="Gargalos"
        subtitle="Onde a operação trava — etapas e tarefas com mais atraso"
      />
      {isLoading && <Loading />}
      {error && <ErrorState />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Onboarding > 15 dias" value={data.onboarding.acima15} accent="amber" icon={DoorOpen} />
            <KpiCard label="Onboarding > 30 dias" value={data.onboarding.acima30} accent="orange" icon={DoorOpen} />
            <KpiCard
              label="Etapa mais travada"
              value={etapaTop?.tarefasAbertas ?? 0}
              hint={etapaTop?.etapa}
              accent="red"
              icon={Layers}
            />
            <KpiCard
              label="Tarefa mais lenta (dias)"
              value={tarefaTop?.tempoMedioParadoDias ?? 0}
              hint={tarefaTop?.tarefa}
              accent="violet"
              icon={Clock}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <ChartTitle>Tarefas abertas por etapa</ChartTitle>
              <BarChartCard
                data={data.porEtapa.map((e) => ({
                  label: e.etapa.replace(/^\d+\.\s*/, ""),
                  value: e.tarefasAbertas,
                }))}
                horizontal
                multicolor
                height={280}
              />
            </Card>
            <Card>
              <ChartTitle>Excedente médio sobre o SLA por etapa (dias)</ChartTitle>
              <BarChartCard
                data={data.porEtapa.map((e) => ({
                  label: e.etapa.replace(/^\d+\.\s*/, ""),
                  value: e.excedenteMedioDias ?? 0,
                }))}
                horizontal
                color={SERIES[5]}
                height={280}
              />
            </Card>
          </div>

          <div>
            <h2 className="mb-1 text-base font-semibold tracking-tight">
              Tempo parado por origem
            </h2>
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              De quem depende o atraso: cliente, equipe interna ou órgão/cartório
            </p>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {(["cliente", "interno", "orgao_cartorio"] as const).map((o) => {
                  const d = origem(o);
                  const icon =
                    o === "cliente" ? Users : o === "interno" ? UserRound : Building2;
                  return (
                    <KpiCard
                      key={o}
                      label={`${d?.label ?? o} — tempo médio`}
                      value={d?.tempoMedioDias ?? 0}
                      suffix="dias"
                      hint={`${d?.tarefas ?? 0} tarefas paradas`}
                      accent={ACCENT_ORIGEM[o]}
                      icon={icon}
                    />
                  );
                })}
              </div>
              <Card>
                <ChartTitle>Distribuição das tarefas paradas por origem</ChartTitle>
                <DonutChartCard
                  data={data.tempoParadoPorOrigem.map((o) => ({
                    label: o.label,
                    value: o.tarefas,
                  }))}
                  height={240}
                />
              </Card>
            </div>
          </div>

          <Card className="overflow-x-auto p-0">
            <div className="p-5 pb-0">
              <ChartTitle>Tarefas que mais travam (por tempo parado)</ChartTitle>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  <th className="px-5 py-2 font-medium">Tarefa / Lista</th>
                  <th className="px-5 py-2 font-medium">Abertas</th>
                  <th className="px-5 py-2 font-medium">Tempo médio parado (dias)</th>
                </tr>
              </thead>
              <tbody>
                {data.porTarefa.map((t) => (
                  <tr key={t.tarefa} className="border-t">
                    <td className="px-5 py-3 font-medium">{t.tarefa}</td>
                    <td className="px-5 py-3 tabular-nums">{t.abertas}</td>
                    <td className="px-5 py-3 tabular-nums">{t.tempoMedioParadoDias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <InfoNote>{data.avisos.tempo}</InfoNote>
          <InfoNote>{data.avisos.origem}</InfoNote>
        </div>
      )}
    </div>
  );
}
