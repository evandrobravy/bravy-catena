"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Clock,
  DoorOpen,
  Hourglass,
  Layers,
  UserRound,
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
import { SERIES } from "@/lib/palette";
import { GargalosData } from "@/lib/types";
import { ModeloFilter } from "@/components/modelo-filter";
import { useState } from "react";

const short = (s: string) => s.replace(/^\d+\.\s*/, "");

export default function GargalosPage() {
  const [modelo, setModelo] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["gargalos", modelo],
    queryFn: () =>
      fetchMetric<GargalosData>("gargalos", modelo ? { modelo } : undefined),
  });

  const marcoTop = data?.porMarco[0];
  const atrasoTop = data?.etapaMaiorAtraso[0];
  const origem = (o: string) => data?.tempoParadoPorOrigem.find((x) => x.origem === o);
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
        actions={<ModeloFilter value={modelo} onChange={setModelo} />}
      />
      {isLoading && <Loading />}
      {error && <ErrorState />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Onboarding > 15 dias" value={data.onboarding.acima15} accent="amber" icon={DoorOpen} />
            <KpiCard label="Onboarding não concluído" value={data.onboarding.naoConcluido} accent="orange" icon={DoorOpen} />
            <KpiCard
              label="Marco mais travado"
              value={marcoTop?.tarefasAbertas ?? 0}
              hint={marcoTop ? short(marcoTop.marco) + " (tarefas abertas)" : undefined}
              accent="red"
              icon={Layers}
            />
            <KpiCard
              label="Maior atraso (dias)"
              value={atrasoTop?.diasAtrasoMax ?? 0}
              hint={atrasoTop?.etapa}
              accent="violet"
              icon={Hourglass}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <ChartTitle>Tarefas abertas por marco</ChartTitle>
              <BarChartCard
                data={data.porMarco.map((e) => ({ label: short(e.marco), value: e.tarefasAbertas }))}
                horizontal
                multicolor
                height={280}
              />
            </Card>
            <Card>
              <ChartTitle>Excedente médio sobre o SLA por marco (dias)</ChartTitle>
              <BarChartCard
                data={data.porMarco.map((e) => ({ label: short(e.marco), value: e.excedenteMedioDias ?? 0 }))}
                horizontal
                color={SERIES[5]}
                height={280}
              />
            </Card>
          </div>

          {/* Tempo parado por origem */}
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
                  const icon = o === "cliente" ? Users : o === "interno" ? UserRound : Building2;
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
                  data={data.tempoParadoPorOrigem.map((o) => ({ label: o.label, value: o.tarefas }))}
                  height={240}
                />
              </Card>
            </div>
          </div>

          {/* Histórico real */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <ChartTitle>Tempo médio real de conclusão por etapa (dias)</ChartTitle>
              <BarChartCard
                data={data.etapaQueMaisTrava.map((e) => ({ label: e.etapa, value: e.tempoMedioDias }))}
                horizontal
                color={SERIES[0]}
                height={300}
              />
            </Card>
            <Card>
              <ChartTitle>Clientes parados (&gt;30 dias) por marco</ChartTitle>
              <BarChartCard
                data={data.clientesParadosPorMarco.map((e) => ({ label: short(e.marco), value: e.clientes }))}
                horizontal
                color={SERIES[5]}
                height={300}
              />
            </Card>
          </div>

          <Card className="overflow-x-auto p-0">
            <div className="p-5 pb-0">
              <ChartTitle>Etapas com maior atraso (due date vencido)</ChartTitle>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  <th className="px-5 py-2 font-medium">Etapa</th>
                  <th className="px-5 py-2 font-medium">Atraso médio (dias)</th>
                  <th className="px-5 py-2 font-medium">Atraso máx (dias)</th>
                  <th className="px-5 py-2 font-medium">Tarefas</th>
                </tr>
              </thead>
              <tbody>
                {data.etapaMaiorAtraso.map((e) => (
                  <tr key={e.etapa} className="border-t">
                    <td className="px-5 py-3 font-medium">{e.etapa}</td>
                    <td className="px-5 py-3 tabular-nums">{e.diasAtrasoMedio}</td>
                    <td className="px-5 py-3 tabular-nums">{e.diasAtrasoMax}</td>
                    <td className="px-5 py-3 tabular-nums">{e.tarefas}</td>
                  </tr>
                ))}
                {data.etapaMaiorAtraso.length === 0 && (
                  <tr className="border-t">
                    <td className="px-5 py-3 text-[var(--text-muted)]" colSpan={4}>
                      Sem tarefas com due date vencido (cobertura melhora com a tabela de SLA).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          <Card className="overflow-x-auto p-0">
            <div className="p-5 pb-0">
              <ChartTitle>Tempo médio por lista (movimentação real)</ChartTitle>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  <th className="px-5 py-2 font-medium">Lista</th>
                  <th className="px-5 py-2 font-medium">Passagens</th>
                  <th className="px-5 py-2 font-medium">Tempo médio (dias)</th>
                </tr>
              </thead>
              <tbody>
                {data.tempoPorLista.map((l) => (
                  <tr key={l.lista} className="border-t">
                    <td className="px-5 py-3 font-medium">{l.lista}</td>
                    <td className="px-5 py-3 tabular-nums">{l.passagens}</td>
                    <td className="px-5 py-3 tabular-nums">{l.tempoMedioDias}</td>
                  </tr>
                ))}
                {data.tempoPorLista.length === 0 && (
                  <tr className="border-t">
                    <td className="px-5 py-3 text-[var(--text-muted)]" colSpan={3}>
                      Aguardando histórico de movimentação entre listas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          <InfoNote>{data.avisos.tempo}</InfoNote>
          <InfoNote>{data.avisos.atraso}</InfoNote>
          <InfoNote>{data.avisos.origem}</InfoNote>
        </div>
      )}
    </div>
  );
}
